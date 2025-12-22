import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import bcrypt from 'bcrypt'
import { parse } from 'csv-parse/sync'

const DEFAULT_PASSWORD = 'welcome@123'

interface CSVUser {
    name: string
    email: string
    role: string
    grade_level?: string
    section?: string
    subjects_teaching?: string
    department?: string
}

interface ImportResult {
    success: number
    failed: number
    errors: Array<{ row: number; email: string; error: string }>
    users: any[]
}

export const bulkImport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.body.csvData) {
            throw new AppError('No CSV data provided', 400, 'NO_CSV_DATA')
        }

        const csvData = req.body.csvData
        let records: CSVUser[]

        try {
            records = parse(csvData, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            })
        } catch (error) {
            throw new AppError('Invalid CSV format', 400, 'INVALID_CSV')
        }

        const result: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
            users: [],
        }

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

        for (let i = 0; i < records.length; i++) {
            const record = records[i]
            const rowNumber = i + 2 // +2 because index starts at 0 and row 1 is headers

            try {
                // Validation
                if (!record.name || !record.email || !record.role) {
                    throw new Error('Missing required fields (name, email, role)')
                }

                const email = record.email.trim().toLowerCase()
                const role = record.role.trim().toLowerCase()

                // Validate role
                if (!['student', 'teacher', 'admin'].includes(role)) {
                    throw new Error(`Invalid role: ${role}`)
                }

                // Student validation
                if (role === 'student' && !record.grade_level) {
                    throw new Error('Grade level is required for students')
                }

                // Check if user exists
                const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])
                if (existingUser.rows.length > 0) {
                    throw new Error('User with this email already exists')
                }

                // Parse subjects
                let subjectsArray = null
                if (role === 'teacher' && record.subjects_teaching) {
                    subjectsArray = record.subjects_teaching.split(';').map(s => s.trim())
                }

                // Insert user
                const insertResult = await query(
                    `INSERT INTO users (email, password, name, role, grade_level, subjects_teaching, section, department, profile_completed) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           RETURNING id, email, name, role, created_at`,
                    [
                        email,
                        hashedPassword,
                        record.name.trim(),
                        role,
                        role === 'student' ? record.grade_level : null,
                        role === 'teacher' && subjectsArray ? JSON.stringify(subjectsArray) : null,
                        role === 'student' ? record.section : null,
                        null, // department deprecated
                        true,
                    ]
                )

                result.success++
                result.users.push(insertResult.rows[0])
            } catch (error: any) {
                result.failed++
                result.errors.push({
                    row: rowNumber,
                    email: record.email || 'unknown',
                    error: error.message,
                })
            }
        }

        res.json({
            message: `Import completed: ${result.success} successful, ${result.failed} failed`,
            ...result,
        })
    } catch (error) {
        next(error)
    }
}

export const downloadTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const template = `name,email,role,grade_level,section,subjects_teaching,department
John Doe,john.doe@example.com,student,Class 10,A,,
Jane Smith,jane.smith@example.com,teacher,,,Mathematics;Physics,
Alice Johnson,alice.j@example.com,admin,,,,`

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="user_import_template.csv"')
        res.send(template)
    } catch (error) {
        next(error)
    }
}
