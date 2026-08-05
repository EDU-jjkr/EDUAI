jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}))

jest.mock('../services/deck-lesson.service', () => ({
  fetchDeckWithSlides: jest.fn(),
  normalizeLessonDeck: jest.fn(),
  resolveDeckTheme: jest.fn((theme) => theme || 'default'),
}))

import axios from 'axios'
import {
  fetchDeckWithSlides,
  normalizeLessonDeck,
  resolveDeckTheme,
} from '../services/deck-lesson.service'

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedFetchDeckWithSlides = fetchDeckWithSlides as jest.MockedFunction<typeof fetchDeckWithSlides>
const mockedNormalizeLessonDeck = normalizeLessonDeck as jest.MockedFunction<typeof normalizeLessonDeck>
const mockedResolveDeckTheme = resolveDeckTheme as jest.MockedFunction<typeof resolveDeckTheme>

describe('export.controller exportToPowerPoint', () => {
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

  it('resolves a structured inline deck payload and forwards lesson plus theme to the renderer endpoint', async () => {
    const req = {
      body: {
        deck: {
          title: 'Newton',
          theme: 'blueprint',
          lesson: {
            meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
            structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
            slides: [{ title: 'Concept 1', content: 'Force changes motion.', order: 1 }],
          },
        },
      },
      query: {},
      user: {
        school_id: null,
      },
    } as any
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any

    const lesson = {
      meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [{ title: 'Concept 1', content: 'Force changes motion.', order: 1 }],
    } as any

    mockedNormalizeLessonDeck.mockReturnValue(lesson)
    mockedResolveDeckTheme.mockReturnValue('blueprint')
    mockedAxios.post.mockResolvedValue({
      data: Buffer.from('pptx'),
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'content-disposition': 'attachment; filename="newton.pptx"',
      },
    } as any)

    const { exportToPowerPoint } = await import('./export.controller')
    await exportToPowerPoint(req, res)

    expect(mockedNormalizeLessonDeck).toHaveBeenCalledWith(
      req.body.deck,
      expect.objectContaining({
        title: 'Newton',
        theme: 'blueprint',
      })
    )
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/deck/render-pptx',
      { lesson, theme: 'blueprint' },
      expect.objectContaining({
        responseType: 'arraybuffer',
      })
    )
    expect(res.send).toHaveBeenCalled()
  })

  it('prefers an inline structured payload over id-based deck lookup when both are present', async () => {
    const req = {
      body: {
        id: 'saved_deck',
        title: 'Inline Newton',
        theme: 'blueprint',
        lesson: {
          meta: { topic: 'Inline Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
          structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
          slides: [{ title: 'Inline Slide', content: 'Inline content', order: 1 }],
        },
      },
      query: {},
      user: {
        school_id: null,
      },
    } as any
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any

    const inlineLesson = {
      meta: { topic: 'Inline Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
      structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
      slides: [{ title: 'Inline Slide', content: 'Inline content', order: 1 }],
    } as any

    mockedNormalizeLessonDeck.mockReturnValue(inlineLesson)
    mockedResolveDeckTheme.mockReturnValue('blueprint')
    mockedAxios.post.mockResolvedValue({
      data: Buffer.from('pptx'),
      headers: {},
    } as any)

    const { exportToPowerPoint } = await import('./export.controller')
    await exportToPowerPoint(req, res)

    expect(mockedFetchDeckWithSlides).not.toHaveBeenCalled()
    expect(mockedNormalizeLessonDeck).toHaveBeenCalledWith(
      req.body,
      expect.objectContaining({
        title: 'Inline Newton',
        theme: 'blueprint',
      })
    )
  })
})
