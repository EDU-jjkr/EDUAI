import { Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import axios from 'axios'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import { logEvent } from '../services/analytics.service'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '15000', 10)

// Create centralized axios client - DO NOT HARDCODE localhost!
const aiClient = AI_SERVICE_URL ? axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT
}) : null

export const generateDeck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { topic, subject, gradeLevel, numSlides = 10, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // 1. Check for existing deck (Smart Caching)
    if (!forceRegenerate) {
      // Simple heuristic: match topic title roughly
      // Ideally we would have a 'topic_original_query' column, but filtering title by ILIKE is a decent proxy
      const existingDeck = await query(
        'SELECT * FROM decks WHERE created_by = $1 AND subject = $2 AND grade_level = $3 AND title ILIKE $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, gradeLevel, `%${topic}%`]
      )

      if (existingDeck.rows.length > 0) {
        const deck = existingDeck.rows[0]
        const slidesResult = await query('SELECT * FROM slides WHERE deck_id = $1 ORDER BY slide_order', [deck.id])

        // Return existing deck
        return res.json({
          ...deck,
          slides: slidesResult.rows
        })
      }
    }

    // Call AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/generate-deck`, {
      topic,
      subject,
      gradeLevel,
      numSlides,
    })

    const { title, slides } = aiResponse.data

    // Save to database
    const deckResult = await query(
      'INSERT INTO decks (title, subject, grade_level, created_by, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, subject, gradeLevel, userId, schoolId]
    )

    const deck = deckResult.rows[0]

    // Save slides with visual metadata (if present)
    for (const slide of slides) {
      const visualMetadata = slide.visualMetadata || {}

      await query(
        `INSERT INTO slides (
          deck_id, title, content, slide_order,
          visual_type, visual_config, visual_confidence, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          deck.id,
          slide.title,
          slide.content,
          slide.order,
          visualMetadata.visualType || null,
          visualMetadata.visualConfig ? JSON.stringify(visualMetadata.visualConfig) : null,
          visualMetadata.confidence || null,
          visualMetadata.generatedBy || null
        ]
      )
    }

    await logEvent(userId, schoolId, 'teacher_generate_deck', {
      topic,
      subject,
      gradeLevel,
      numSlides,
    })

    res.json({
      ...deck,
      slides,
    })
  } catch (error) {
    next(error)
  }
}

export const getDecks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null
    const result = await query(
      'SELECT * FROM decks WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
      [userId, schoolId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

export const getDeckById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    const result = await query('SELECT * FROM decks WHERE id = $1 AND school_id = $2', [id, schoolId])

    if (result.rows.length === 0) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

    const slidesResult = await query(
      'SELECT * FROM slides WHERE deck_id = $1 ORDER BY slide_order',
      [id]
    )

    res.json({
      ...result.rows[0],
      slides: slidesResult.rows,
    })
  } catch (error) {
    next(error)
  }
}

export const updateDeck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { title, slides } = req.body
    const schoolId = req.user!.school_id || null

    await query('UPDATE decks SET title = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', [title, id, schoolId])

    if (slides) {
      for (const slide of slides) {
        await query(
          'UPDATE slides SET title = $1, content = $2 WHERE id = $3',
          [slide.title, slide.content, slide.id]
        )
      }
    }

    res.json({ message: 'Deck updated successfully' })
  } catch (error) {
    next(error)
  }
}

export const updateDeckWithAI = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { feedback } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // 1. Fetch current deck
    const deckResult = await query('SELECT * FROM decks WHERE id = $1 AND school_id = $2', [id, schoolId])
    if (deckResult.rows.length === 0) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }
    const currentDeck = deckResult.rows[0]

    // 2. Fetch current slides
    const slidesResult = await query('SELECT * FROM slides WHERE deck_id = $1 ORDER BY slide_order', [id])
    const currentSlides = slidesResult.rows.map(s => ({
      title: s.title,
      content: s.content,
      order: s.slide_order
    }))

    // 3. Call AI to modify
    const fullDeckContext = {
      title: currentDeck.title,
      slides: currentSlides
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/modify-deck`, {
      currentDeck: fullDeckContext,
      feedback,
      subject: currentDeck.subject,
      gradeLevel: currentDeck.grade_level
    })

    const { title: newTitle, slides: newSlides } = aiResponse.data

    // 4. Overwrite in DB
    // Update Title
    await query('UPDATE decks SET title = $1, updated_at = NOW() WHERE id = $2', [newTitle, id])

    // Delete old slides
    await query('DELETE FROM slides WHERE deck_id = $1', [id])

    // Insert new slides
    for (const slide of newSlides) {
      const visualMetadata = slide.visualMetadata || {}
      await query(
        `INSERT INTO slides (
          deck_id, title, content, slide_order,
          visual_type, visual_config, visual_confidence, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          slide.title,
          slide.content,
          slide.order,
          visualMetadata.visualType || null,
          visualMetadata.visualConfig ? JSON.stringify(visualMetadata.visualConfig) : null,
          visualMetadata.confidence || null,
          visualMetadata.generatedBy || null
        ]
      )
    }

    res.json({ message: 'Deck updated with AI successfully' })

  } catch (error) {
    next(error)
  }
}

export const deleteDeck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    await query('DELETE FROM decks WHERE id = $1 AND school_id = $2', [id, schoolId])
    res.json({ message: 'Deck deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const generateActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { topic, subject, duration, activityType, gradeLevel } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/generate-activity`, {
      topic,
      subject,
      duration,
      activityType,
      gradeLevel,
    })

    const activity = aiResponse.data

    const result = await query(
      'INSERT INTO activities (title, subject, activity_type, duration, materials, steps, learning_outcomes, created_by, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        activity.title,
        subject,
        activityType,
        duration,
        JSON.stringify(activity.materials),
        JSON.stringify(activity.steps),
        JSON.stringify(activity.learningOutcomes),
        userId,
        schoolId,
      ]
    )

    await logEvent(userId, schoolId, 'teacher_generate_activity', {
      topic,
      subject,
      gradeLevel,
      duration,
      activityType,
    })

    // Transform database response to match frontend expectations
    const dbActivity = result.rows[0]

    // Safe JSON parse - handle both stringified JSON and already-parsed objects
    const parseJsonField = (field: any) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field)
        } catch (e) {
          return []
        }
      }
      return Array.isArray(field) ? field : []
    }

    const formattedActivity = {
      title: dbActivity.title,
      description: activity.learningOutcomes?.[0] || `Activity for ${topic}`,
      instructions: parseJsonField(dbActivity.steps),
      materials: parseJsonField(dbActivity.materials),
      duration: `${dbActivity.duration} minutes`,
      subject: dbActivity.subject,
      gradeLevel: gradeLevel,
    }

    res.json(formattedActivity)
  } catch (error) {
    next(error)
  }
}

export const getActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null
    const result = await query(
      'SELECT * FROM activities WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
      [userId, schoolId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

export const getActivityById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    const result = await query('SELECT * FROM activities WHERE id = $1 AND school_id = $2', [id, schoolId])

    if (result.rows.length === 0) {
      throw new AppError('Activity not found', 404, 'ACTIVITY_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

export const updateActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { title, materials, steps, learningOutcomes } = req.body
    const schoolId = req.user!.school_id || null

    await query(
      'UPDATE activities SET title = $1, materials = $2, steps = $3, learning_outcomes = $4, updated_at = NOW() WHERE id = $5 AND school_id = $6',
      [title, JSON.stringify(materials), JSON.stringify(steps), JSON.stringify(learningOutcomes), id, schoolId]
    )

    res.json({ message: 'Activity updated successfully' })
  } catch (error) {
    next(error)
  }
}

export const deleteActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    await query('DELETE FROM activities WHERE id = $1 AND school_id = $2', [id, schoolId])
    res.json({ message: 'Activity deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const generateLessonPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { topics, subject, gradeLevel, totalDuration, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Smart Caching: Check for existing lesson plan with matching subject/grade/topics
    if (!forceRegenerate) {
      // For single topic, do a simple title match
      const primaryTopic = Array.isArray(topics) ? topics[0] : topics
      const existingPlan = await query(
        'SELECT * FROM lesson_plans WHERE created_by = $1 AND subject = $2 AND grade_level = $3 AND title ILIKE $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, gradeLevel, `%${primaryTopic}%`]
      )

      if (existingPlan.rows.length > 0) {
        // Return cached lesson plan
        return res.json(existingPlan.rows[0])
      }
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/generate-lesson-plan`, {
      topics,
      subject,
      gradeLevel,
      totalDuration,
    })

    const lessonPlan = aiResponse.data

    const result = await query(
      'INSERT INTO lesson_plans (title, subject, grade_level, duration, objectives, concepts, sequence, assessments, resources, created_by, school_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [
        lessonPlan.title,
        subject,
        gradeLevel,
        totalDuration,
        JSON.stringify(lessonPlan.objectives),
        JSON.stringify(lessonPlan.concepts),
        JSON.stringify(lessonPlan.sequence),
        JSON.stringify(lessonPlan.assessments),
        JSON.stringify(lessonPlan.resources),
        userId,
        schoolId,
      ]
    )

    await logEvent(userId, schoolId, 'teacher_generate_lesson_plan', {
      subject,
      gradeLevel,
      totalDuration,
      topicsCount: Array.isArray(topics) ? topics.length : 0,
    })

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

export const getLessonPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null
    const result = await query(
      'SELECT * FROM lesson_plans WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
      [userId, schoolId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

export const getLessonPlanById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    const result = await query('SELECT * FROM lesson_plans WHERE id = $1 AND school_id = $2', [id, schoolId])

    if (result.rows.length === 0) {
      throw new AppError('Lesson plan not found', 404, 'LESSON_PLAN_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

export const updateLessonPlanWithAI = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { feedback } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // 1. Fetch current plan
    const lpResult = await query('SELECT * FROM lesson_plans WHERE id = $1 AND school_id = $2', [id, schoolId])
    if (lpResult.rows.length === 0) {
      throw new AppError('Lesson plan not found', 404, 'LESSON_PLAN_NOT_FOUND')
    }
    const currentPlan = lpResult.rows[0]

    // Construct JSON context (parse DB columns back to object)
    const currentPlanContext = {
      title: currentPlan.title,
      objectives: currentPlan.objectives,
      concepts: currentPlan.concepts,
      sequence: currentPlan.sequence,
      assessments: currentPlan.assessments,
      resources: currentPlan.resources
    }

    // 2. Call AI
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/modify-lesson-plan`, {
      currentPlan: currentPlanContext,
      feedback,
      subject: currentPlan.subject,
      gradeLevel: currentPlan.grade_level
    })

    const newPlan = aiResponse.data

    // 3. Overwrite in DB
    const result = await query(
      'UPDATE lesson_plans SET title=$1, objectives=$2, concepts=$3, sequence=$4, assessments=$5, resources=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [
        newPlan.title,
        JSON.stringify(newPlan.objectives),
        JSON.stringify(newPlan.concepts),
        JSON.stringify(newPlan.sequence),
        JSON.stringify(newPlan.assessments),
        JSON.stringify(newPlan.resources),
        id
      ]
    )

    res.json(result.rows[0])

  } catch (error) {
    next(error)
  }
}

export const getConceptLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subject, gradeLevel } = req.query

    let queryText = 'SELECT * FROM concepts WHERE 1=1'
    const params: any[] = []
    let paramCount = 1

    if (subject) {
      queryText += ` AND subject = $${paramCount}`
      params.push(subject)
      paramCount++
    }

    if (gradeLevel) {
      queryText += ` AND grade_level = $${paramCount}`
      params.push(gradeLevel)
      paramCount++
    }

    const result = await query(queryText, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

export const getConceptById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM concepts WHERE id = $1', [id])

    if (result.rows.length === 0) {
      throw new AppError('Concept not found', 404, 'CONCEPT_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

export const searchConcepts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { searchTerm } = req.body
    const result = await query(
      'SELECT * FROM concepts WHERE name ILIKE $1 OR description ILIKE $1',
      [`%${searchTerm}%`]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}
