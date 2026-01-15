import { Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import axios from 'axios'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import { logEvent } from '../services/analytics.service'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '120000', 10) // 2 minutes for AI generation

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

    const { topics, subject, gradeLevel, chapter, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Validate topics is an array
    const topicsArray = Array.isArray(topics) ? topics : [topics]

    // Calculate number of slides: 5 per topic + 1 summary
    // Per topic: Definition, Details, Basic Q, Hard Q, Olympiad Q
    const numSlides = topicsArray.length * 5 + 1

    // 1. Check for existing deck (Smart Caching) - match by source_chapter
    if (!forceRegenerate && chapter) {
      const existingDeck = await query(
        'SELECT * FROM decks WHERE created_by = $1 AND subject = $2 AND grade_level = $3 AND source_chapter = $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, gradeLevel, chapter]
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

    // Validate AI service is configured
    if (!AI_SERVICE_URL) {
      throw new AppError(
        'AI service is not configured. Please contact administrator.',
        500,
        'AI_SERVICE_NOT_CONFIGURED'
      )
    }

    // Call AI service with structured prompt for topics
    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/deck/generate-deck`, {
        topics: topicsArray,
        subject,
        gradeLevel,
        chapter,
        numSlides,
        structuredFormat: true, // Signal to use new structured format
      }, {
        timeout: AI_SERVICE_TIMEOUT
      })
    } catch (aiError: any) {
      console.error('AI service error:', aiError.response?.data || aiError.message)
      throw new AppError(
        aiError.response?.data?.detail || 'AI service temporarily unavailable. Please try again later.',
        503,
        'AI_SERVICE_ERROR'
      )
    }

    const { title, slides } = aiResponse.data

    // Save to database with source tracking
    const deckResult = await query(
      'INSERT INTO decks (title, subject, grade_level, created_by, school_id, source_topics, source_chapter) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, subject, gradeLevel, userId, schoolId, topicsArray, chapter]
    )

    const deck = deckResult.rows[0]

    // Save slides
    for (const slide of slides) {
      await query(
        `INSERT INTO slides (deck_id, title, content, slide_order) VALUES ($1, $2, $3, $4)`,
        [
          deck.id,
          slide.title,
          slide.content,
          slide.order
        ]
      )
    }

    await logEvent(userId, schoolId, 'teacher_generate_deck', {
      topics: topicsArray,
      subject,
      gradeLevel,
      chapter,
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
    // Handle NULL school_id properly
    const result = schoolId
      ? await query(
        'SELECT * FROM decks WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
        [userId, schoolId]
      )
      : await query(
        'SELECT * FROM decks WHERE created_by = $1 AND school_id IS NULL ORDER BY created_at DESC',
        [userId]
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
    const result = await query(
      'SELECT * FROM decks WHERE id = $1 AND (school_id = $2 OR (school_id IS NULL AND $2 IS NULL))',
      [id, schoolId]
    )

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
    const deckResult = await query(
      'SELECT * FROM decks WHERE id = $1 AND (school_id = $2 OR (school_id IS NULL AND $2 IS NULL))',
      [id, schoolId]
    )
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

    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/modify-deck`, {
        currentDeck: fullDeckContext,
        feedback,
        subject: currentDeck.subject,
        gradeLevel: currentDeck.grade_level
      })
    } catch (aiError: any) {
      console.error('AI service error:', aiError.response?.data || aiError.message)
      throw new AppError(
        aiError.response?.data?.detail || 'AI service failed to modify deck',
        500,
        'AI_SERVICE_ERROR'
      )
    }

    const { title: newTitle, slides: newSlides } = aiResponse.data

    // 4. Overwrite in DB
    // Update Title
    await query('UPDATE decks SET title = $1, updated_at = NOW() WHERE id = $2', [newTitle, id])

    // Delete old slides
    await query('DELETE FROM slides WHERE deck_id = $1', [id])

    // Insert new slides (basic columns only - visual metadata columns may not exist in DB)
    for (const slide of newSlides) {
      await query(
        `INSERT INTO slides (deck_id, title, content, slide_order) VALUES ($1, $2, $3, $4)`,
        [
          id,
          slide.title,
          slide.content,
          slide.order
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

    const { topic, subject, duration, activityType, gradeLevel, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Smart Caching: Check for existing activity
    if (!forceRegenerate) {
      const existingActivity = await query(
        'SELECT * FROM activities WHERE created_by = $1 AND subject = $2 AND activity_type = $3 AND source_topic = $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, activityType, topic]
      )

      if (existingActivity.rows.length > 0) {
        const dbActivity = existingActivity.rows[0]

        // Safe JSON parse
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
          description: parseJsonField(dbActivity.learning_outcomes)?.[0] || `Activity for ${topic}`,
          instructions: parseJsonField(dbActivity.steps),
          materials: parseJsonField(dbActivity.materials),
          duration: `${dbActivity.duration} minutes`,
          subject: dbActivity.subject,
          gradeLevel: gradeLevel,
        }

        return res.json(formattedActivity)
      }
    }

    // Validate AI service is configured
    if (!AI_SERVICE_URL) {
      throw new AppError(
        'AI service is not configured. Please contact administrator.',
        500,
        'AI_SERVICE_NOT_CONFIGURED'
      )
    }

    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/activity/generate-activity`, {
        topic,
        subject,
        duration,
        activityType,
        gradeLevel,
      }, {
        timeout: AI_SERVICE_TIMEOUT
      })
    } catch (aiError: any) {
      console.error('AI service error:', aiError.response?.data || aiError.message)
      throw new AppError(
        aiError.response?.data?.detail || 'AI service temporarily unavailable. Please try again later.',
        503,
        'AI_SERVICE_ERROR'
      )
    }

    const activity = aiResponse.data

    const result = await query(
      'INSERT INTO activities (title, subject, activity_type, duration, materials, steps, learning_outcomes, created_by, school_id, source_topic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
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
        topic,
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

    // Handle NULL school_id properly
    const result = schoolId
      ? await query(
        'SELECT * FROM activities WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
        [userId, schoolId]
      )
      : await query(
        'SELECT * FROM activities WHERE created_by = $1 AND school_id IS NULL ORDER BY created_at DESC',
        [userId]
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

    // Smart Caching: Check for existing lesson plan with matching source_topics
    if (!forceRegenerate) {
      const topicsArray = Array.isArray(topics) ? topics : [topics]
      const existingPlan = await query(
        'SELECT * FROM lesson_plans WHERE created_by = $1 AND subject = $2 AND grade_level = $3 AND source_topics = $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, gradeLevel, topicsArray]
      )

      if (existingPlan.rows.length > 0) {
        // Return cached lesson plan
        return res.json(existingPlan.rows[0])
      }
    }

    // Validate AI service is configured
    if (!AI_SERVICE_URL) {
      throw new AppError(
        'AI service is not configured. Please contact administrator.',
        500,
        'AI_SERVICE_NOT_CONFIGURED'
      )
    }

    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/lesson-plan/generate-lesson-plan`, {
        topics,
        subject,
        gradeLevel,
        totalDuration,
      }, {
        timeout: AI_SERVICE_TIMEOUT
      })
    } catch (aiError: any) {
      console.error('AI service error:', aiError.response?.data || aiError.message)
      throw new AppError(
        aiError.response?.data?.detail || 'AI service temporarily unavailable. Please try again later.',
        503,
        'AI_SERVICE_ERROR'
      )
    }

    const lessonPlan = aiResponse.data

    const topicsArray = Array.isArray(topics) ? topics : [topics]
    const result = await query(
      'INSERT INTO lesson_plans (title, subject, grade_level, duration, objectives, concepts, sequence, assessments, resources, created_by, school_id, source_topics) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
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
        topicsArray,
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

export const generateCurriculumPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { gradeLevel, subject, chapter } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Import curriculum helper (inline to avoid circular deps)
    const { getChaptersBySubject } = await import('../services/curriculum')

    // Fetch curriculum data for this class/subject
    const allChapters = getChaptersBySubject(parseInt(gradeLevel), subject)

    if (!allChapters || allChapters.length === 0) {
      return res.status(404).json({
        message: `No curriculum found for Class ${gradeLevel} ${subject}`
      })
    }

    // If chapter is specified, filter to just that chapter
    let chaptersToSend = allChapters
    if (chapter) {
      const selectedChapter = allChapters.find((c: any) => c.name === chapter)
      if (!selectedChapter) {
        return res.status(404).json({
          message: `Chapter "${chapter}" not found in Class ${gradeLevel} ${subject}`
        })
      }
      chaptersToSend = [selectedChapter]
    }

    // Call AI service with curriculum data
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/lesson-plan/generate-curriculum-plan`, {
      gradeLevel,
      subject,
      chapter: chapter || null,
      chapters: chaptersToSend
    })

    await logEvent(userId, schoolId, 'teacher_generate_curriculum_plan', {
      subject,
      gradeLevel,
      chapter: chapter || 'all',
      chaptersCount: chaptersToSend.length
    })

    res.json(aiResponse.data)
  } catch (error) {
    next(error)
  }
}

export const getLessonPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Handle NULL school_id properly
    const result = schoolId
      ? await query(
        'SELECT * FROM lesson_plans WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
        [userId, schoolId]
      )
      : await query(
        'SELECT * FROM lesson_plans WHERE created_by = $1 AND school_id IS NULL ORDER BY created_at DESC',
        [userId]
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

    // Handle NULL school_id properly
    const result = schoolId
      ? await query('SELECT * FROM lesson_plans WHERE id = $1 AND school_id = $2', [id, schoolId])
      : await query('SELECT * FROM lesson_plans WHERE id = $1 AND school_id IS NULL', [id])

    if (result.rows.length === 0) {
      throw new AppError('Lesson plan not found', 404, 'LESSON_PLAN_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

export const deleteLessonPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null

    const deleteQuery = schoolId
      ? 'DELETE FROM lesson_plans WHERE id = $1 AND school_id = $2'
      : 'DELETE FROM lesson_plans WHERE id = $1 AND school_id IS NULL'

    await query(deleteQuery, schoolId ? [id, schoolId] : [id])
    res.json({ message: 'Lesson plan deleted successfully' })
  } catch (error) {
    next(error)
  }
}

// Question Sets - saved question papers
export const getQuestionSets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Handle NULL school_id properly
    const result = schoolId
      ? await query(
        'SELECT * FROM question_sets WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
        [userId, schoolId]
      )
      : await query(
        'SELECT * FROM question_sets WHERE created_by = $1 AND school_id IS NULL ORDER BY created_at DESC',
        [userId]
      )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

export const getQuestionSetById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null

    const result = schoolId
      ? await query('SELECT * FROM question_sets WHERE id = $1 AND school_id = $2', [id, schoolId])
      : await query('SELECT * FROM question_sets WHERE id = $1 AND school_id IS NULL', [id])

    if (result.rows.length === 0) {
      throw new AppError('Question set not found', 404, 'QUESTION_SET_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

export const deleteQuestionSet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null

    const deleteQuery = schoolId
      ? 'DELETE FROM question_sets WHERE id = $1 AND school_id = $2'
      : 'DELETE FROM question_sets WHERE id = $1 AND school_id IS NULL'

    await query(deleteQuery, schoolId ? [id, schoolId] : [id])
    res.json({ message: 'Question set deleted successfully' })
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

// ============================================
// TOPIC GENERATOR (Replica of Deck Generator)
// ============================================

export const generateTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { topic, subject, gradeLevel, classDuration = 40, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Calculate number of items based on class duration
    const numSlides = Math.max(5, Math.min(20, Math.ceil(classDuration / 4)))

    // 1. Check for existing topic (Smart Caching) - match by source_topic
    if (!forceRegenerate) {
      const existingTopic = await query(
        'SELECT * FROM topics WHERE created_by = $1 AND subject = $2 AND grade_level = $3 AND source_topic = $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, gradeLevel, topic]
      )

      if (existingTopic.rows.length > 0) {
        const topicData = existingTopic.rows[0]
        const itemsResult = await query('SELECT * FROM topic_items WHERE topic_id = $1 ORDER BY item_order', [topicData.id])

        return res.json({
          ...topicData,
          slides: itemsResult.rows
        })
      }
    }

    // Call AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/topic/generate-topic`, {
      topic,
      subject,
      gradeLevel,
      numSlides,
      classDuration,
    })

    const { title, slides } = aiResponse.data

    // Save to database with source tracking
    const topicResult = await query(
      'INSERT INTO topics (title, subject, grade_level, created_by, school_id, source_topic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, subject, gradeLevel, userId, schoolId, topic]
    )

    const topicData = topicResult.rows[0]

    // Save items
    for (const slide of slides) {
      await query(
        `INSERT INTO topic_items (topic_id, title, content, item_order) VALUES ($1, $2, $3, $4)`,
        [
          topicData.id,
          slide.title,
          slide.content,
          slide.order
        ]
      )
    }

    await logEvent(userId, schoolId, 'teacher_generate_topic', {
      topic,
      subject,
      gradeLevel,
      classDuration,
      numSlides,
    })

    res.json({
      ...topicData,
      slides,
    })
  } catch (error) {
    next(error)
  }
}

export const getTopics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Handle NULL school_id properly
    const result = schoolId
      ? await query(
        'SELECT * FROM topics WHERE created_by = $1 AND school_id = $2 ORDER BY created_at DESC',
        [userId, schoolId]
      )
      : await query(
        'SELECT * FROM topics WHERE created_by = $1 AND school_id IS NULL ORDER BY created_at DESC',
        [userId]
      )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

export const getTopicById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    const result = await query(
      'SELECT * FROM topics WHERE id = $1 AND (school_id = $2 OR (school_id IS NULL AND $2 IS NULL))',
      [id, schoolId]
    )

    if (result.rows.length === 0) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND')
    }

    const itemsResult = await query(
      'SELECT * FROM topic_items WHERE topic_id = $1 ORDER BY item_order',
      [id]
    )

    res.json({
      ...result.rows[0],
      slides: itemsResult.rows,
    })
  } catch (error) {
    next(error)
  }
}

export const updateTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { title, slides } = req.body
    const schoolId = req.user!.school_id || null

    await query('UPDATE topics SET title = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3', [title, id, schoolId])

    if (slides) {
      for (const slide of slides) {
        await query(
          'UPDATE topic_items SET title = $1, content = $2 WHERE id = $3',
          [slide.title, slide.content, slide.id]
        )
      }
    }

    res.json({ message: 'Topic updated successfully' })
  } catch (error) {
    next(error)
  }
}

export const updateTopicWithAI = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { feedback } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // 1. Fetch current topic
    const topicResult = await query(
      'SELECT * FROM topics WHERE id = $1 AND (school_id = $2 OR (school_id IS NULL AND $2 IS NULL))',
      [id, schoolId]
    )
    if (topicResult.rows.length === 0) {
      throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND')
    }
    const currentTopic = topicResult.rows[0]

    // 2. Fetch current items
    const itemsResult = await query('SELECT * FROM topic_items WHERE topic_id = $1 ORDER BY item_order', [id])
    const currentSlides = itemsResult.rows.map(s => ({
      title: s.title,
      content: s.content,
      order: s.item_order
    }))

    // 3. Call AI to modify
    const fullTopicContext = {
      title: currentTopic.title,
      slides: currentSlides
    }

    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/modify-topic`, {
        currentDeck: fullTopicContext,
        feedback,
        subject: currentTopic.subject,
        gradeLevel: currentTopic.grade_level
      })
    } catch (aiError: any) {
      console.error('AI service error:', aiError.response?.data || aiError.message)
      throw new AppError(
        aiError.response?.data?.detail || 'AI service failed to modify topic',
        500,
        'AI_SERVICE_ERROR'
      )
    }

    const { title: newTitle, slides: newSlides } = aiResponse.data

    // 4. Overwrite in DB
    await query('UPDATE topics SET title = $1, updated_at = NOW() WHERE id = $2', [newTitle, id])

    // Delete old items
    await query('DELETE FROM topic_items WHERE topic_id = $1', [id])

    // Insert new items
    for (const slide of newSlides) {
      await query(
        `INSERT INTO topic_items (topic_id, title, content, item_order) VALUES ($1, $2, $3, $4)`,
        [
          id,
          slide.title,
          slide.content,
          slide.order
        ]
      )
    }

    res.json({ message: 'Topic updated with AI successfully' })

  } catch (error) {
    next(error)
  }
}

export const deleteTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = req.user!.school_id || null
    await query('DELETE FROM topics WHERE id = $1 AND school_id = $2', [id, schoolId])
    res.json({ message: 'Topic deleted successfully' })
  } catch (error) {
    next(error)
  }
}

