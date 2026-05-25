import { Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import axios from 'axios'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import { logEvent } from '../services/analytics.service'
import {
  buildCanonicalDeckResponse,
  fetchDeckWithSlides,
  insertStructuredDeck,
  normalizeLessonDeck,
  replaceDeckSlides,
  resolveDeckTheme,
  updateStructuredDeck,
} from '../services/deck-lesson.service'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '120000', 10) // 2 minutes for AI generation

// Create centralized axios client - DO NOT HARDCODE localhost!
const aiClient = AI_SERVICE_URL ? axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT
}) : null

function countClusterSlidesByRole(
  slides: Array<{ clusterId?: string | null; pedagogicalRole?: string | null }>,
  clusterId: string,
  pedagogicalRole: string
) {
  return slides.filter((slide) => slide.clusterId === clusterId && slide.pedagogicalRole === pedagogicalRole).length
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeComparableValue)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeComparableValue((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }

  return value ?? null
}

function buildComparableSlideSnapshot(slide: any) {
  return normalizeComparableValue({
    id: slide.id ?? null,
    title: slide.title ?? null,
    content: slide.content ?? null,
    order: slide.order ?? null,
    clusterId: slide.clusterId ?? null,
    pedagogicalRole: slide.pedagogicalRole ?? null,
    layoutCandidates: slide.layoutCandidates ?? [],
    editingHints: slide.editingHints ?? null,
    visualIntent: slide.visualIntent ?? null,
    visualMetadata: slide.visualMetadata ?? null,
  })
}

function assertOriginalSlidesPreserved(
  originalSlides: any[],
  nextSlides: any[],
  clusterId: string,
  requestedRole: string
) {
  if (nextSlides.length !== originalSlides.length + 1) {
    throw new AppError(
      'AI regeneration returned an invalid cluster expansion',
      502,
      'DECK_CLUSTER_REGEN_INVALID'
    )
  }

  const originalTargetSlides = originalSlides.filter((slide) => slide.clusterId === clusterId)
  const nextTargetSlides = nextSlides.filter((slide) => slide.clusterId === clusterId)
  if (nextTargetSlides.length !== originalTargetSlides.length + 1) {
    throw new AppError(
      'AI regeneration returned an invalid cluster expansion',
      502,
      'DECK_CLUSTER_REGEN_INVALID'
    )
  }

  const originalTargetComparable = originalTargetSlides.map(buildComparableSlideSnapshot)
  const nextTargetComparable = nextTargetSlides.map(buildComparableSlideSnapshot)
  const appendedComparable = nextTargetComparable.slice(0, originalTargetComparable.length)

  if (JSON.stringify(appendedComparable) !== JSON.stringify(originalTargetComparable)) {
    throw new AppError(
      'AI regeneration mutated existing target-cluster slides',
      502,
      'DECK_CLUSTER_REGEN_INVALID'
    )
  }

  const newTargetSlide = nextTargetSlides[originalTargetSlides.length]
  if (!newTargetSlide || newTargetSlide.pedagogicalRole !== requestedRole) {
    throw new AppError(
      'AI regeneration did not add the requested target-cluster slide',
      502,
      'DECK_CLUSTER_REGEN_INVALID'
    )
  }

  const originalNonTargetSlides = originalSlides.filter((slide) => slide.clusterId !== clusterId)
  const nextNonTargetSlides = nextSlides.filter((slide) => slide.clusterId !== clusterId)

  if (originalNonTargetSlides.length !== nextNonTargetSlides.length) {
    throw new AppError(
      'AI regeneration changed unrelated slides',
      502,
      'DECK_CLUSTER_REGEN_INVALID'
    )
  }

  const originalNonTargetComparable = originalNonTargetSlides.map(buildComparableSlideSnapshot)
  const nextNonTargetComparable = nextNonTargetSlides.map(buildComparableSlideSnapshot)

  if (JSON.stringify(originalNonTargetComparable) !== JSON.stringify(nextNonTargetComparable)) {
    throw new AppError(
      'AI regeneration changed unrelated slides',
      502,
      'DECK_CLUSTER_REGEN_INVALID'
    )
  }
}

export const generateDeck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Validation errors:', JSON.stringify(errors.array(), null, 2))
      console.error('Request body:', JSON.stringify(req.body, null, 2))
      return res.status(400).json({ errors: errors.array() })
    }

    const { topics, topic, subject, gradeLevel, chapter, level, theme, additionalInstructions, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null
    const resolvedTheme = resolveDeckTheme(theme, subject)

    // Handle both formats: topics array (new) or single topic (legacy)
    // Validate topics is an array
    const topicsArray = topics && Array.isArray(topics)
      ? topics
      : topic
        ? [topic]  // Convert single topic to array
        : []

    if (topicsArray.length === 0) {
      return res.status(400).json({
        message: 'Either topics array or topic is required'
      })
    }

    // Calculate number of slides: 5 per topic + 1 summary
    // Per topic: Definition, Details, Basic Q, Hard Q, Olympiad Q
    const numSlides = topicsArray.length * 5 + 1

    // 1. Check for existing deck (Smart Caching) - match by source_chapter
    // Skip caching for differentiated levels (SUPPORT, EXTENSION) - only cache CORE
    const shouldUseCache = !forceRegenerate && chapter && (!level || level === 'CORE')

    if (shouldUseCache) {
      const existingDeck = await query(
        'SELECT * FROM decks WHERE created_by = $1 AND subject = $2 AND grade_level = $3 AND source_chapter = $4 ORDER BY created_at DESC LIMIT 1',
        [userId, subject, gradeLevel, chapter]
      )

      if (existingDeck.rows.length > 0) {
        const cachedDeck = await fetchDeckWithSlides(existingDeck.rows[0].id, schoolId)
        if (cachedDeck) {
          return res.json(cachedDeck)
        }
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
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/deck/generate-complete`, {
        topics: topicsArray,
        subject,
        gradeLevel,
        chapter,
        numSlides,
        level: level || 'CORE', // Pass differentiation level (SUPPORT, CORE, EXTENSION)
        theme: resolvedTheme,
        additionalInstructions,
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

    // Debug: Log the full response to see what we're getting
    console.log('AI Response received:', JSON.stringify(aiResponse.data, null, 2))

    const lesson = normalizeLessonDeck(aiResponse.data, {
      subject,
      gradeLevel,
      topic: topicsArray.join(', '),
      title: aiResponse.data?.title || topicsArray.join(', '),
      theme: resolvedTheme,
    })
    const deckTitle = aiResponse.data?.title || lesson.meta.topic

    const deck = await insertStructuredDeck({
      title: deckTitle,
      subject,
      gradeLevel,
      userId,
      schoolId,
      sourceTopics: topicsArray,
      sourceChapter: chapter,
      lesson,
    })

    await logEvent(userId, schoolId, 'teacher_generate_deck', {
      topics: topicsArray,
      subject,
      gradeLevel,
      chapter,
      numSlides,
    })

    res.json(buildCanonicalDeckResponse(deck, lesson))
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
    const deck = await fetchDeckWithSlides(id, schoolId)

    if (!deck) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

    res.json(deck)
  } catch (error) {
    next(error)
  }
}

export const updateDeck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { title, slides, lesson, meta, structure } = req.body
    const schoolId = req.user!.school_id || null
    const existingDeck = await fetchDeckWithSlides(id, schoolId)

    if (!existingDeck) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

    const lessonPayload = lesson ?? (meta || structure || slides ? { meta, structure, slides } : null)
    const normalizedLesson = normalizeLessonDeck(
      lessonPayload ? { lesson: lessonPayload } : { title: title || existingDeck.title, slides },
      {
        ...existingDeck.lesson,
        subject: existingDeck.subject,
        gradeLevel: existingDeck.grade_level,
        topic: existingDeck.lesson.meta.topic,
        title: title || existingDeck.title,
      }
    )
    const deckTitle = title || normalizedLesson.meta.topic || existingDeck.title

    const updatedDeck = await updateStructuredDeck({
      deckId: id,
      title: deckTitle,
      lesson: normalizedLesson,
    })

    res.json(buildCanonicalDeckResponse(updatedDeck, normalizedLesson))
  } catch (error) {
    next(error)
  }
}

export const regenerateDeckCluster = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { deckId, clusterId, pedagogicalRole, theme } = req.body
    const schoolId = req.user!.school_id || null
    const currentDeck = await fetchDeckWithSlides(String(deckId), schoolId)

    if (!currentDeck) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

    const clusterSlides = currentDeck.lesson.slides.filter((slide) => slide.clusterId === clusterId)
    if (!clusterSlides.length) {
      throw new AppError('Deck cluster not found', 404, 'DECK_CLUSTER_NOT_FOUND')
    }

    if (!AI_SERVICE_URL) {
      throw new AppError(
        'AI service is not configured. Please contact administrator.',
        500,
        'AI_SERVICE_NOT_CONFIGURED'
      )
    }

    const requestedRole = typeof pedagogicalRole === 'string' && pedagogicalRole.trim()
      ? pedagogicalRole.trim()
      : 'explain_deepen'
    const originalSlideCount = currentDeck.lesson.slides.length
    const originalTargetRoleCount = countClusterSlidesByRole(currentDeck.lesson.slides, clusterId, requestedRole)

    const fullDeckContext = {
      lesson: currentDeck.lesson,
      title: currentDeck.title,
      slides: currentDeck.slides,
      meta: currentDeck.meta,
      structure: currentDeck.structure,
    }

    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/deck/regenerate-cluster`, {
        deckId: String(deckId),
        clusterId: String(clusterId),
        pedagogicalRole: requestedRole,
        theme: theme || currentDeck.lesson.meta.theme,
        currentDeck: fullDeckContext,
        subject: currentDeck.subject,
        gradeLevel: currentDeck.grade_level,
      })
    } catch (aiError: any) {
      console.error('AI service error:', aiError.response?.data || aiError.message)
      throw new AppError(
        aiError.response?.data?.detail || 'AI service failed to regenerate deck cluster',
        500,
        'AI_SERVICE_ERROR'
      )
    }

    const normalizedLesson = normalizeLessonDeck(aiResponse.data, {
      ...currentDeck.lesson,
      subject: currentDeck.subject,
      gradeLevel: currentDeck.grade_level,
      topic: currentDeck.lesson.meta.topic,
      title: currentDeck.title,
      theme: resolveDeckTheme(theme || currentDeck.lesson.meta.theme, currentDeck.subject),
    })

    const normalizedClusterSlides = normalizedLesson.slides.filter((slide) => slide.clusterId === clusterId)

    if (!normalizedClusterSlides.length) {
      throw new AppError(
        'AI regeneration returned a deck without the target cluster',
        502,
        'DECK_CLUSTER_REGEN_INVALID'
      )
    }

    if (normalizedLesson.slides.length !== originalSlideCount + 1) {
      throw new AppError(
        'AI regeneration returned an invalid cluster expansion',
        502,
        'DECK_CLUSTER_REGEN_INVALID'
      )
    }

    if (countClusterSlidesByRole(normalizedLesson.slides, clusterId, requestedRole) !== originalTargetRoleCount + 1) {
      throw new AppError(
        'AI regeneration returned an invalid cluster expansion',
        502,
        'DECK_CLUSTER_REGEN_INVALID'
      )
    }

    assertOriginalSlidesPreserved(currentDeck.lesson.slides, normalizedLesson.slides, clusterId, requestedRole)

    const updatedDeck = await updateStructuredDeck({
      deckId: String(deckId),
      title: currentDeck.title,
      lesson: normalizedLesson,
    })

    res.json(buildCanonicalDeckResponse(updatedDeck, normalizedLesson))
  } catch (error) {
    next(error)
  }
}

export const switchDeckSlideLayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { deckId, slideId, layoutId } = req.body
    const schoolId = req.user!.school_id || null
    const currentDeck = await fetchDeckWithSlides(String(deckId), schoolId)

    if (!currentDeck) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

    const targetSlide = currentDeck.lesson.slides.find((slide) => slide.id === slideId)
    if (!targetSlide) {
      throw new AppError('Slide not found', 404, 'DECK_SLIDE_NOT_FOUND')
    }

    const normalizedLayoutId = typeof layoutId === 'string' && layoutId.trim()
      ? layoutId.trim()
      : null
    if (!normalizedLayoutId) {
      throw new AppError('layoutId is required', 400, 'DECK_LAYOUT_REQUIRED')
    }

    const allowedLayouts = targetSlide.layoutCandidates || []
    if (!allowedLayouts.includes(normalizedLayoutId)) {
      throw new AppError('Layout not allowed for this slide', 400, 'DECK_LAYOUT_NOT_ALLOWED')
    }

    const nextSlides = currentDeck.lesson.slides.map((slide) => {
      if (slide.id !== slideId) {
        return slide
      }

      const existingLayouts = slide.layoutCandidates || []
      return {
        ...slide,
        layoutCandidates: [
          normalizedLayoutId,
          ...existingLayouts.filter((candidate) => candidate !== normalizedLayoutId),
        ],
        ...(slide.visualMetadata
          ? {
            visualMetadata: {
              ...slide.visualMetadata,
              visualConfig: {
                ...(slide.visualMetadata.visualConfig || {}),
                selectedLayout: normalizedLayoutId,
              },
            },
          }
          : {}),
      }
    })

    const normalizedLesson = normalizeLessonDeck({
      lesson: {
        meta: currentDeck.lesson.meta,
        structure: currentDeck.lesson.structure,
        slides: nextSlides,
      },
    }, {
      subject: currentDeck.subject,
      gradeLevel: currentDeck.grade_level,
      topic: currentDeck.lesson.meta.topic,
      title: currentDeck.title,
      theme: currentDeck.lesson.meta.theme,
    })

    const updatedDeck = await updateStructuredDeck({
      deckId: String(deckId),
      title: currentDeck.title,
      lesson: normalizedLesson,
    })

    res.json(buildCanonicalDeckResponse(updatedDeck, normalizedLesson))
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
    const currentDeck = await fetchDeckWithSlides(id, schoolId)
    if (!currentDeck) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

    // 3. Call AI to modify
    const fullDeckContext = {
      lesson: currentDeck.lesson,
      title: currentDeck.title,
      slides: currentDeck.slides,
      meta: currentDeck.meta,
      structure: currentDeck.structure,
    }

    let aiResponse
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/deck/modify-deck`, {
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

    const updatedLesson = normalizeLessonDeck(aiResponse.data, {
      ...currentDeck.lesson,
      subject: currentDeck.subject,
      gradeLevel: currentDeck.grade_level,
      topic: currentDeck.lesson.meta.topic,
      title: aiResponse.data?.title || currentDeck.title,
      theme: currentDeck.lesson.meta.theme,
    })
    const newTitle = aiResponse.data?.title || updatedLesson.meta.topic || currentDeck.title

    const updatedDeck = await updateStructuredDeck({
      deckId: id,
      title: newTitle,
      lesson: updatedLesson,
    })

    res.json(buildCanonicalDeckResponse(updatedDeck, updatedLesson))

  } catch (error) {
    next(error)
  }
}

export const deleteDeck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    const deleteResult = schoolId
      ? await query(
        'DELETE FROM decks WHERE id = $1 AND created_by = $2 AND school_id = $3 RETURNING id',
        [id, userId, schoolId]
      )
      : await query(
        'DELETE FROM decks WHERE id = $1 AND created_by = $2 AND school_id IS NULL RETURNING id',
        [id, userId]
      )

    if (deleteResult.rowCount === 0) {
      throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
    }

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

    const { classLevel, subject, chapter, topic, count = 5 } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

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
        classLevel,
        subject,
        chapter,
        topic,
        count
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

    const { questions } = aiResponse.data

    // Persist to DB in the new generated_questions table
    const savedQuestions = []
    for (const q of questions) {
      const result = await query(
        `INSERT INTO generated_questions 
        (subject, chapter, difficulty, type, content, answer, explanation, options, class_level, created_by, school_id, metadata) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        RETURNING id`,
        [
          subject,
          chapter,
          q.difficulty || 'medium',
          q.type || 'multiple-choice',
          q.content,
          q.answer,
          q.explanation || '',
          JSON.stringify(q.options || []),
          classLevel,
          userId,
          schoolId,
          JSON.stringify({ topic }) // Save topic in metadata
        ]
      )
      savedQuestions.push({ ...q, id: result.rows[0].id })
    }

    // Return format expected by frontend
    res.json({ questions: savedQuestions })

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
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    const deleteResult = schoolId
      ? await query(
        'DELETE FROM activities WHERE id = $1 AND created_by = $2 AND school_id = $3 RETURNING id',
        [id, userId, schoolId]
      )
      : await query(
        'DELETE FROM activities WHERE id = $1 AND created_by = $2 AND school_id IS NULL RETURNING id',
        [id, userId]
      )

    if (deleteResult.rowCount === 0) {
      throw new AppError('Activity not found', 404, 'ACTIVITY_NOT_FOUND')
    }

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

    const { topics, subject, gradeLevel, classDuration = 45, forceRegenerate = false } = req.body
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    // Smart Caching: Check for existing lesson plan with matching source_topics and classDuration
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
      // AI will determine number of sessions based on topic count
      aiResponse = await axios.post(`${AI_SERVICE_URL}/api/lesson-plan/generate-lesson-plan`, {
        topics,
        subject,
        gradeLevel,
        classDuration,
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

    // Store using the new schema with sessions instead of sequence
    const result = await query(
      `INSERT INTO lesson_plans (
        title, subject, grade_level, duration, objectives, concepts, 
        sequence, assessments, resources, created_by, school_id, source_topics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        lessonPlan.title,
        subject,
        gradeLevel,
        lessonPlan.totalDuration, // AI calculates total duration
        JSON.stringify(lessonPlan.objectives),
        JSON.stringify(lessonPlan.concepts),
        JSON.stringify(lessonPlan.sessions), // Store sessions in sequence column
        JSON.stringify(lessonPlan.assessments),
        JSON.stringify({
          resources: lessonPlan.resources,
          prerequisites: lessonPlan.prerequisites,
          differentiation: lessonPlan.differentiation,
          standards: lessonPlan.standards,
          totalSessions: lessonPlan.totalSessions
        }),
        userId,
        schoolId,
        topicsArray,
      ]
    )

    await logEvent(userId, schoolId, 'teacher_generate_lesson_plan', {
      subject,
      gradeLevel,
      totalDuration: lessonPlan.totalDuration, // From AI response
      classDuration,
      totalSessions: lessonPlan.totalSessions,
      topicsCount: Array.isArray(topics) ? topics.length : 0,
    })

    // Return AI response directly (has full structure) instead of DB row
    res.json(lessonPlan)
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
    const userId = req.user!.id
    const schoolId = req.user!.school_id || null

    const deleteResult = schoolId
      ? await query(
        'DELETE FROM lesson_plans WHERE id = $1 AND created_by = $2 AND school_id = $3 RETURNING id',
        [id, userId, schoolId]
      )
      : await query(
        'DELETE FROM lesson_plans WHERE id = $1 AND created_by = $2 AND school_id IS NULL RETURNING id',
        [id, userId]
      )

    if (deleteResult.rowCount === 0) {
      throw new AppError('Lesson plan not found', 404, 'LESSON_PLAN_NOT_FOUND')
    }

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
