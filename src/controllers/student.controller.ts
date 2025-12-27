import { Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import axios from 'axios'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import fs from 'fs/promises'
import path from 'path'
import { logEvent } from '../services/analytics.service'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '15000', 10)

// Create centralized axios client - DO NOT HARDCODE localhost!
const aiClient = AI_SERVICE_URL ? axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT
}) : null

// Text doubt submission
export const submitTextDoubt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { question, subject } = req.body
    const studentId = req.user!.id
    const schoolId = req.user!.school_id || null
    const studentGrade = req.user!.grade_level || null

    // Call AI service to solve doubt (include grade for age-appropriate answer)
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/solve-doubt/text`, {
      question,
      subject,
      gradeLevel: studentGrade,
    })

    const { solution, relatedConcepts, similarProblems } = aiResponse.data

    // Save doubt to database (now includes student_grade)
    const result = await query(
      'INSERT INTO doubts (student_id, school_id, question, question_type, subject, solution, status, related_concepts, student_grade) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [studentId, schoolId, question, 'text', subject, solution, 'resolved', JSON.stringify(relatedConcepts), studentGrade]
    )

    await logEvent(studentId, schoolId, 'student_doubt_text', {
      subject,
      grade: studentGrade,
    })

    // Map response to match frontend expectations
    const doubt = result.rows[0]

    // Safely parse related_concepts from database
    let parsedRelatedConcepts = []
    try {
      if (typeof doubt.related_concepts === 'string') {
        parsedRelatedConcepts = JSON.parse(doubt.related_concepts)
      } else if (Array.isArray(doubt.related_concepts)) {
        parsedRelatedConcepts = doubt.related_concepts
      }
    } catch (e) {
      console.error('Error parsing related_concepts:', e)
      parsedRelatedConcepts = []
    }

    res.json({
      id: doubt.id,
      question: doubt.question,
      answer: doubt.solution,
      subject: doubt.subject,
      relatedConcepts: parsedRelatedConcepts,
      confidence: 0.85,
      createdAt: doubt.created_at,
    })
  } catch (error) {
    next(error)
  }
}

// Image doubt submission
export const submitImageDoubt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('Image file is required', 400, 'NO_FILE')
    }

    const studentId = req.user!.id
    const schoolId = req.user!.school_id || null
    const imagePath = req.file.path

    const imageUrl = imagePath

    const result = await query(
      'INSERT INTO doubts (student_id, school_id, question, question_type, image_url, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [studentId, schoolId, 'Image-based question', 'image', imageUrl, 'pending']
    )

    await logEvent(studentId, schoolId, 'student_doubt_image', {})

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

// Voice doubt submission
export const submitVoiceDoubt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('Audio file is required', 400, 'NO_FILE')
    }

    const studentId = req.user!.id
    const schoolId = req.user!.school_id || null
    const audioPath = req.file.path

    const audioUrl = audioPath

    const result = await query(
      'INSERT INTO doubts (student_id, school_id, question, question_type, audio_url, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [studentId, schoolId, 'Voice-based question', 'voice', audioUrl, 'pending']
    )

    await logEvent(studentId, schoolId, 'student_doubt_voice', {})

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

// Get doubt history
export const getDoubtHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id
    const { page = 1, limit = 20 } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    const result = await query(
      'SELECT * FROM doubts WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [studentId, limitNum, offset]
    )

    const countResult = await query(
      'SELECT COUNT(*) FROM doubts WHERE student_id = $1',
      [studentId]
    )

    res.json({
      doubts: result.rows,
      totalCount: parseInt(countResult.rows[0].count),
      page: pageNum,
      limit: limitNum,
    })
  } catch (error) {
    next(error)
  }
}

// Get specific doubt
export const getDoubtById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const studentId = req.user!.id

    const result = await query(
      'SELECT * FROM doubts WHERE id = $1 AND student_id = $2',
      [id, studentId]
    )

    if (result.rows.length === 0) {
      throw new AppError('Doubt not found', 404, 'DOUBT_NOT_FOUND')
    }

    const followUpsResult = await query(
      'SELECT * FROM follow_ups WHERE doubt_id = $1 ORDER BY created_at',
      [id]
    )

    res.json({
      ...result.rows[0],
      followUps: followUpsResult.rows,
    })
  } catch (error) {
    next(error)
  }
}

// Submit follow-up question
export const submitFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { id } = req.params
    const { question } = req.body
    const studentId = req.user!.id

    const doubtResult = await query(
      'SELECT * FROM doubts WHERE id = $1 AND student_id = $2',
      [id, studentId]
    )

    if (doubtResult.rows.length === 0) {
      throw new AppError('Doubt not found', 404, 'DOUBT_NOT_FOUND')
    }

    const originalDoubt = doubtResult.rows[0]

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/doubt/follow-up`, {
      originalQuestion: originalDoubt.question,
      followUpQuestion: question,
      previousContext: originalDoubt.solution,
    })

    const { answer } = aiResponse.data

    const result = await query(
      'INSERT INTO follow_ups (doubt_id, question, answer) VALUES ($1, $2, $3) RETURNING *',
      [id, question, answer]
    )

    await logEvent(studentId, null, 'student_doubt_follow_up', {})

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

// Get weak areas
export const getWeakAreas = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id

    const result = await query(
      `SELECT subject, COUNT(*) as frequency 
       FROM doubts 
       WHERE student_id = $1
       GROUP BY subject 
       ORDER BY frequency DESC 
       LIMIT 10`,
      [studentId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

// Get similar problems
export const getSimilarProblems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const studentId = req.user!.id

    const doubtResult = await query(
      'SELECT * FROM doubts WHERE id = $1 AND student_id = $2',
      [id, studentId]
    )

    if (doubtResult.rows.length === 0) {
      throw new AppError('Doubt not found', 404, 'DOUBT_NOT_FOUND')
    }

    const doubt = doubtResult.rows[0]

    const result = await query(
      'SELECT * FROM doubts WHERE subject = $1 AND student_id = $2 AND id != $3 ORDER BY created_at DESC LIMIT 5',
      [doubt.subject, studentId, id]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}
