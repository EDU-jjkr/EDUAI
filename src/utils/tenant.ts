import { Request } from 'express'
import { AppError } from '../middleware/error-handler'

export function getTenantId(req: Request): string {
    // Check for custom keycloak user property first
    const anyReq = req as any
    if (anyReq.user && anyReq.user.tenantId) {
        return anyReq.user.tenantId
    }

    // Fallback or error
    // For now, if we are in a transition phase, we might want to return a default or throw
    // But per the "pragmatic" plan, we fail fast if context is missing.
    throw new AppError('Tenant context missing', 400, 'TENANT_REQUIRED')
}
