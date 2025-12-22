import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

export interface KeycloakUser {
    sub: string
    email?: string
    preferred_username?: string
    realm_access?: {
        roles: string[]
    }
    resource_access?: {
        [clientId: string]: { roles: string[] }
    }
}

export interface KeycloakAuthRequest extends Request {
    user?: {
        id: string
        email: string
        role: string
        tenantId: string
        tenantKey: string
        products: string[]
    }
    keycloakUser?: any
}

const KEYCLOAK_REALM_URL = process.env.KEYCLOAK_REALM_URL || ''

const client = jwksClient({
    jwksUri: `${KEYCLOAK_REALM_URL}/protocol/openid-connect/certs`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000 // 10 minutes
})

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err)
        const signingKey = key?.getPublicKey()
        callback(null, signingKey)
    })
}

export const verifyKeycloakToken = (
    req: KeycloakAuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)

    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            console.error('Keycloak token verification failed:', err.message)
            return res.status(401).json({ error: 'Invalid or expired token' })
        }

        const decodedToken = decoded as any
        req.keycloakUser = decodedToken

        req.user = {
            id: decodedToken.sub,
            email: decodedToken.email || decodedToken.preferred_username || '',
            role: decodedToken.role,                 // FROM TOKEN
            tenantId: decodedToken.tenantId,         // FROM TOKEN
            tenantKey: decodedToken.tenantKey,       // FROM TOKEN
            products: typeof decodedToken.products === 'string'
                ? decodedToken.products.split(',')
                : (Array.isArray(decodedToken.products) ? decodedToken.products : [])
        }

        console.log('KC USER:', req.user)

        next()
    })
}
