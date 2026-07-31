jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => [],
  })),
}))

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({ post: jest.fn() })),
    post: jest.fn(),
  },
}))

jest.mock('../services/analytics.service', () => ({
  logEvent: jest.fn(),
}))

jest.mock('../config/database', () => ({
  query: jest.fn(),
}))

jest.mock('../services/deck-lesson.service', () => ({
  buildCanonicalDeckResponse: jest.fn(),
  fetchDeckWithSlides: jest.fn(),
  insertStructuredDeck: jest.fn(),
  normalizeLessonDeck: jest.fn(),
  replaceDeckSlides: jest.fn(),
  resolveDeckTheme: jest.fn((theme) => theme || 'default'),
  updateStructuredDeck: jest.fn(),
}))

import axios from 'axios'
import { query } from '../config/database'
import {
  buildCanonicalDeckResponse,
  fetchDeckWithSlides,
  normalizeLessonDeck,
  updateStructuredDeck,
} from '../services/deck-lesson.service'

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedQuery = query as jest.MockedFunction<typeof query>
const mockedFetchDeckWithSlides = fetchDeckWithSlides as jest.MockedFunction<typeof fetchDeckWithSlides>
const mockedNormalizeLessonDeck = normalizeLessonDeck as jest.MockedFunction<typeof normalizeLessonDeck>
const mockedUpdateStructuredDeck = updateStructuredDeck as jest.MockedFunction<typeof updateStructuredDeck>
const mockedBuildCanonicalDeckResponse = buildCanonicalDeckResponse as jest.MockedFunction<typeof buildCanonicalDeckResponse>

describe('teacher.controller regenerateDeckCluster', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      AI_SERVICE_URL: 'http://localhost:8000',
      AI_SERVICE_TIMEOUT: '15000',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('calls the dedicated AI regenerate-cluster route, normalizes the result, persists it, and returns the canonical response', async () => {
    const req = {
      body: {
        deckId: 'deck_1',
        clusterId: 'explain_1',
        pedagogicalRole: 'explain_deepen',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    const currentDeck = {
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [{
        id: 'slide_1',
        title: 'Concept 1',
        content: 'Force changes motion.',
        order: 1,
        slideType: 'CONCEPT',
        bloom_level: 'UNDERSTAND',
      }],
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [{
          id: 'slide_1',
          title: 'Concept 1',
          content: 'Force changes motion.',
          order: 1,
          slideType: 'CONCEPT',
          bloom_level: 'UNDERSTAND',
          clusterId: 'explain_1',
          pedagogicalRole: 'explain_core',
          instructionalGoal: 'Explain',
          layoutCandidates: ['concept-with-image'],
        }],
      },
    } as any

    const normalizedLesson = {
      meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [{
        id: 'slide_1',
        title: 'Concept 1',
        content: 'Force changes motion.',
        order: 1,
        slideType: 'CONCEPT',
        bloom_level: 'UNDERSTAND',
        clusterId: 'explain_1',
        pedagogicalRole: 'explain_core',
        layoutCandidates: ['concept-with-image'],
      }, {
        id: 'slide_2',
        title: 'Concept 1 Explain More',
        content: 'More explanation.',
        order: 2,
        slideType: 'CONCEPT',
        bloom_level: 'UNDERSTAND',
        clusterId: 'explain_1',
        pedagogicalRole: 'explain_deepen',
        layoutCandidates: ['two-column-explain'],
      }],
    } as any

    const persistedDeck = { id: 'deck_1', title: 'Newton' } as any
    const canonicalResponse = { id: 'deck_1', lesson: normalizedLesson } as any

    mockedFetchDeckWithSlides.mockResolvedValue(currentDeck)
    mockedAxios.post.mockResolvedValue({
      data: {
        lesson: normalizedLesson,
      },
    } as any)
    mockedNormalizeLessonDeck.mockReturnValue(normalizedLesson)
    mockedUpdateStructuredDeck.mockResolvedValue(persistedDeck)
    mockedBuildCanonicalDeckResponse.mockReturnValue(canonicalResponse)

    const { regenerateDeckCluster } = await import('./teacher.controller')
    await regenerateDeckCluster(req, res, next)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/deck/regenerate-cluster',
      expect.objectContaining({
        deckId: 'deck_1',
        clusterId: 'explain_1',
        pedagogicalRole: 'explain_deepen',
        currentDeck: expect.objectContaining({
          title: 'Newton',
          lesson: currentDeck.lesson,
        }),
        subject: 'Physics',
        gradeLevel: '9',
      })
    )
    expect(mockedNormalizeLessonDeck).toHaveBeenCalledWith(
      { lesson: normalizedLesson },
      expect.objectContaining({
        subject: 'Physics',
        gradeLevel: '9',
        topic: 'Newton',
        title: 'Newton',
        theme: 'blueprint',
      })
    )
    expect(mockedUpdateStructuredDeck).toHaveBeenCalledWith({
      deckId: 'deck_1',
      title: 'Newton',
      lesson: normalizedLesson,
    })
    expect(res.json).toHaveBeenCalledWith(canonicalResponse)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects malformed regeneration output before persistence', async () => {
    const req = {
      body: {
        deckId: 'deck_1',
        clusterId: 'explain_1',
        pedagogicalRole: 'explain_deepen',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    const currentDeck = {
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [],
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [{
          id: 'slide_1',
          title: 'Concept 1',
          content: 'Force changes motion.',
          order: 1,
          slideType: 'CONCEPT',
          bloom_level: 'UNDERSTAND',
          clusterId: 'explain_1',
          pedagogicalRole: 'explain_core',
          layoutCandidates: ['concept-with-image'],
        }],
      },
    } as any

    const malformedLesson = {
      meta: currentDeck.lesson.meta,
      structure: currentDeck.lesson.structure,
      slides: [...currentDeck.lesson.slides],
    } as any

    mockedFetchDeckWithSlides.mockResolvedValue(currentDeck)
    mockedAxios.post.mockResolvedValue({
      data: {
        lesson: malformedLesson,
      },
    } as any)
    mockedNormalizeLessonDeck.mockReturnValue(malformedLesson)

    const { regenerateDeckCluster } = await import('./teacher.controller')
    await regenerateDeckCluster(req, res, next)

    expect(mockedUpdateStructuredDeck).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 502,
      code: 'DECK_CLUSTER_REGEN_INVALID',
    }))
  })

  it('rejects regeneration output that mutates an unrelated slide while adding a valid target slide', async () => {
    const req = {
      body: {
        deckId: 'deck_1',
        clusterId: 'explain_1',
        pedagogicalRole: 'explain_deepen',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    const currentDeck = {
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [],
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [
          {
            id: 'slide_1',
            title: 'Concept 1',
            content: 'Force changes motion.',
            order: 1,
            slideType: 'CONCEPT',
            bloom_level: 'UNDERSTAND',
            clusterId: 'explain_1',
            pedagogicalRole: 'explain_core',
            layoutCandidates: ['concept-with-image'],
          },
          {
            id: 'slide_2',
            title: 'Summary',
            content: 'Recap the law.',
            order: 2,
            slideType: 'SUMMARY',
            bloom_level: 'UNDERSTAND',
            clusterId: 'summary_1',
            pedagogicalRole: 'summary',
            layoutCandidates: ['summary-grid'],
          },
        ],
      },
    } as any

    const mutatedLesson = {
      meta: currentDeck.lesson.meta,
      structure: currentDeck.lesson.structure,
      slides: [
        currentDeck.lesson.slides[0],
        {
          ...currentDeck.lesson.slides[0],
          id: 'slide_3',
          title: 'Concept 1 Explain More',
          content: 'More explanation.',
          order: 2,
          pedagogicalRole: 'explain_deepen',
          layoutCandidates: ['two-column-explain'],
        },
        {
          ...currentDeck.lesson.slides[1],
          title: 'Summary changed',
          order: 3,
        },
      ],
    } as any

    mockedFetchDeckWithSlides.mockResolvedValue(currentDeck)
    mockedAxios.post.mockResolvedValue({
      data: {
        lesson: mutatedLesson,
      },
    } as any)
    mockedNormalizeLessonDeck.mockReturnValue(mutatedLesson)

    const { regenerateDeckCluster } = await import('./teacher.controller')
    await regenerateDeckCluster(req, res, next)

    expect(mockedUpdateStructuredDeck).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 502,
      code: 'DECK_CLUSTER_REGEN_INVALID',
    }))
  })
})

describe('teacher.controller switchDeckSlideLayout', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      AI_SERVICE_URL: 'http://localhost:8000',
      AI_SERVICE_TIMEOUT: '15000',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('reorders layout candidates, persists the deck, and returns the canonical response', async () => {
    const req = {
      body: {
        deckId: 'deck_1',
        slideId: 'slide_1',
        layoutId: 'two-column-explain',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    const currentDeck = {
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [{
          id: 'slide_1',
          title: 'Worked Example',
          content: 'Apply F = ma.',
          order: 1,
          slideType: 'ACTIVITY',
          bloom_level: 'APPLY',
          clusterId: 'practice_1',
          layoutCandidates: ['guided-practice', 'two-column-explain'],
          visualMetadata: {
            visualConfig: {
              existing: true,
            },
          },
        }],
      },
    } as any

    const normalizedLesson = {
      meta: currentDeck.lesson.meta,
      structure: currentDeck.lesson.structure,
      slides: [{
        ...currentDeck.lesson.slides[0],
        layoutCandidates: ['two-column-explain', 'guided-practice'],
        visualMetadata: {
          visualConfig: {
            existing: true,
            selectedLayout: 'two-column-explain',
          },
        },
      }],
    } as any

    const persistedDeck = { id: 'deck_1', title: 'Newton' } as any
    const canonicalResponse = { id: 'deck_1', lesson: normalizedLesson } as any

    mockedFetchDeckWithSlides.mockResolvedValue(currentDeck)
    mockedNormalizeLessonDeck.mockReturnValue(normalizedLesson)
    mockedUpdateStructuredDeck.mockResolvedValue(persistedDeck)
    mockedBuildCanonicalDeckResponse.mockReturnValue(canonicalResponse)

    const { switchDeckSlideLayout } = await import('./teacher.controller')
    await switchDeckSlideLayout(req, res, next)

    expect(mockedNormalizeLessonDeck).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson: expect.objectContaining({
          slides: [
            expect.objectContaining({
              layoutCandidates: ['two-column-explain', 'guided-practice'],
              visualMetadata: expect.objectContaining({
                visualConfig: expect.objectContaining({
                  selectedLayout: 'two-column-explain',
                }),
              }),
            }),
          ],
        }),
      }),
      expect.any(Object)
    )
    expect(mockedUpdateStructuredDeck).toHaveBeenCalledWith({
      deckId: 'deck_1',
      title: 'Newton',
      lesson: normalizedLesson,
    })
    expect(res.json).toHaveBeenCalledWith(canonicalResponse)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects layout ids that are not in the slide layout candidates', async () => {
    const req = {
      body: {
        deckId: 'deck_1',
        slideId: 'slide_1',
        layoutId: 'invalid-layout',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    mockedFetchDeckWithSlides.mockResolvedValue({
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [{
          id: 'slide_1',
          title: 'Worked Example',
          content: 'Apply F = ma.',
          order: 1,
          slideType: 'ACTIVITY',
          bloom_level: 'APPLY',
          layoutCandidates: ['guided-practice', 'two-column-explain'],
        }],
      },
    } as any)

    const { switchDeckSlideLayout } = await import('./teacher.controller')
    await switchDeckSlideLayout(req, res, next)

    expect(mockedNormalizeLessonDeck).not.toHaveBeenCalled()
    expect(mockedUpdateStructuredDeck).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      code: 'DECK_LAYOUT_NOT_ALLOWED',
    }))
  })

  it('does not synthesize visual metadata for text-only slides when switching layout', async () => {
    const req = {
      body: {
        deckId: 'deck_1',
        slideId: 'slide_1',
        layoutId: 'two-column-explain',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    const currentDeck = {
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [{
          id: 'slide_1',
          title: 'Worked Example',
          content: 'Apply F = ma.',
          order: 1,
          slideType: 'ACTIVITY',
          bloom_level: 'APPLY',
          layoutCandidates: ['guided-practice', 'two-column-explain'],
        }],
      },
    } as any

    mockedFetchDeckWithSlides.mockResolvedValue(currentDeck)
    mockedNormalizeLessonDeck.mockReturnValue({
      meta: currentDeck.lesson.meta,
      structure: currentDeck.lesson.structure,
      slides: [{
        ...currentDeck.lesson.slides[0],
        layoutCandidates: ['two-column-explain', 'guided-practice'],
      }],
    } as any)
    mockedUpdateStructuredDeck.mockResolvedValue({ id: 'deck_1', title: 'Newton' } as any)
    mockedBuildCanonicalDeckResponse.mockReturnValue({ id: 'deck_1' } as any)

    const { switchDeckSlideLayout } = await import('./teacher.controller')
    await switchDeckSlideLayout(req, res, next)

    const normalizeArg = mockedNormalizeLessonDeck.mock.calls[0][0] as any
    expect(normalizeArg.lesson.slides[0]).not.toHaveProperty('visualMetadata')
    expect(next).not.toHaveBeenCalled()
  })
})

describe('teacher.controller updateDeckWithAI', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      AI_SERVICE_URL: 'http://localhost:8000',
      AI_SERVICE_TIMEOUT: '15000',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('calls the deck-prefixed AI modify route', async () => {
    const req = {
      params: {
        id: 'deck_1',
      },
      body: {
        feedback: 'Shorten slide 2.',
      },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    const currentDeck = {
      id: 'deck_1',
      title: 'Newton',
      subject: 'Physics',
      grade_level: '9',
      meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [{ id: 'slide_1', title: 'Concept 1', content: 'Force changes motion.', order: 1 }],
      lesson: {
        meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
        structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        slides: [{ id: 'slide_1', title: 'Concept 1', content: 'Force changes motion.', order: 1 }],
      },
    } as any
    const normalizedLesson = currentDeck.lesson as any
    const updatedDeck = { id: 'deck_1', title: 'Newton' } as any
    const canonicalResponse = { id: 'deck_1', lesson: normalizedLesson } as any

    mockedFetchDeckWithSlides.mockResolvedValue(currentDeck)
    mockedAxios.post.mockResolvedValue({ data: { lesson: normalizedLesson } } as any)
    mockedNormalizeLessonDeck.mockReturnValue(normalizedLesson)
    mockedUpdateStructuredDeck.mockResolvedValue(updatedDeck)
    mockedBuildCanonicalDeckResponse.mockReturnValue(canonicalResponse)

    const { updateDeckWithAI } = await import('./teacher.controller')
    await updateDeckWithAI(req, res, next)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/deck/modify-deck',
      expect.objectContaining({
        currentDeck: expect.objectContaining({
          title: 'Newton',
          lesson: currentDeck.lesson,
        }),
        feedback: 'Shorten slide 2.',
        subject: 'Physics',
        gradeLevel: '9',
      })
    )
    expect(next).not.toHaveBeenCalled()
  })
})

describe('teacher.controller delete handlers', () => {
  it('deletes a null-school deck and returns success only when a row is removed', async () => {
    const req = {
      params: { id: 'deck_1' },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = { json: jest.fn() } as any
    const next = jest.fn()

    mockedQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'deck_1' }],
    } as any)

    const { deleteDeck } = await import('./teacher.controller')
    await deleteDeck(req, res, next)

    expect(mockedQuery).toHaveBeenCalledWith(
      'DELETE FROM decks WHERE id = $1 AND created_by = $2 AND school_id IS NULL RETURNING id',
      ['deck_1', 'teacher_1']
    )
    expect(res.json).toHaveBeenCalledWith({ message: 'Deck deleted successfully' })
    expect(next).not.toHaveBeenCalled()
  })

  it('deletes a null-school activity and returns success only when a row is removed', async () => {
    const req = {
      params: { id: 'activity_1' },
      user: {
        id: 'teacher_1',
        school_id: null,
      },
    } as any
    const res = { json: jest.fn() } as any
    const next = jest.fn()

    mockedQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 'activity_1' }],
    } as any)

    const { deleteActivity } = await import('./teacher.controller')
    await deleteActivity(req, res, next)

    expect(mockedQuery).toHaveBeenCalledWith(
      'DELETE FROM activities WHERE id = $1 AND created_by = $2 AND school_id IS NULL RETURNING id',
      ['activity_1', 'teacher_1']
    )
    expect(res.json).toHaveBeenCalledWith({ message: 'Activity deleted successfully' })
    expect(next).not.toHaveBeenCalled()
  })

  it('passes a not found error to next when the lesson plan delete removes no rows', async () => {
    const req = {
      params: { id: 'plan_1' },
      user: {
        id: 'teacher_1',
        school_id: 'school_1',
      },
    } as any
    const res = { json: jest.fn() } as any
    const next = jest.fn()

    mockedQuery.mockResolvedValue({
      rowCount: 0,
      rows: [],
    } as any)

    const { deleteLessonPlan } = await import('./teacher.controller')
    await deleteLessonPlan(req, res, next)

    expect(mockedQuery).toHaveBeenCalledWith(
      'DELETE FROM lesson_plans WHERE id = $1 AND created_by = $2 AND school_id = $3 RETURNING id',
      ['plan_1', 'teacher_1', 'school_1']
    )
    expect(res.json).not.toHaveBeenCalled()
    const error = next.mock.calls[0][0]
    expect(error).toEqual(expect.objectContaining({
      message: 'Lesson plan not found',
      status: 404,
      code: 'LESSON_PLAN_NOT_FOUND',
    }))
  })
})
