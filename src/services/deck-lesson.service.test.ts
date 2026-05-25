jest.mock('../config/database', () => ({
  query: jest.fn(),
}))

import { query } from '../config/database'
import { fetchDeckWithSlides, insertStructuredDeck, normalizeLessonDeck } from './deck-lesson.service'

const mockQuery = query as jest.MockedFunction<typeof query>

describe('normalizeLessonDeck', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('normalizes structured slide fields without dropping legacy content', () => {
    const lesson = normalizeLessonDeck({
      lesson: {
        meta: {
          topic: 'Newton',
          subject: 'Physics',
          grade: '9',
          theme: 'blueprint',
        },
        structure: {
          learning_objectives: [],
          vocabulary: [],
          prerequisites: [],
          bloom_progression: [],
        },
        slides: [{
          title: 'Try It Together',
          content: 'Legacy content',
          order: 1,
          slideType: 'ACTIVITY',
          bloom_level: 'APPLY',
          clusterId: 'guided_practice_1',
          pedagogicalRole: 'guided_practice',
          instructionalGoal: 'Apply Newtonian motion to a simple example.',
          contentMode: 'question',
          layoutCandidates: ['guided-practice'],
          density: 'medium',
          importance: 'primary',
          contentBlocks: [{ type: 'question', text: 'What is force?' }],
          visualIntent: {
            purpose: 'clarify',
            assetType: 'none',
            priority: 'optional',
            sourceStrategy: 'renderer_native',
          },
          editingHints: {
            locked: false,
            canAddBlocks: ['hint'],
            canRemoveBlocks: ['answer'],
          },
          practiceMetadata: {
            difficulty: 'medium',
            answerMode: 'hidden_by_default',
            stepCount: 3,
            misconception: 'Motion always requires a sustaining force.',
          },
        }],
      },
    })

    expect(lesson.slides[0].content).toBe('Legacy content')
    expect(lesson.slides[0].clusterId).toBe('guided_practice_1')
    expect(lesson.slides[0].pedagogicalRole).toBe('guided_practice')
    expect(lesson.slides[0].instructionalGoal).toBe('Apply Newtonian motion to a simple example.')
    expect(lesson.slides[0].contentMode).toBe('question')
    expect(lesson.slides[0].layoutCandidates).toEqual(['guided-practice'])
    expect(lesson.slides[0].density).toBe('medium')
    expect(lesson.slides[0].importance).toBe('primary')
    expect(lesson.slides[0].contentBlocks?.[0]).toEqual({
      type: 'question',
      text: 'What is force?',
      items: undefined,
      value: undefined,
    })
    expect(lesson.slides[0].visualIntent).toEqual({
      purpose: 'clarify',
      assetType: 'none',
      priority: 'optional',
      sourceStrategy: 'renderer_native',
    })
    expect(lesson.slides[0].editingHints).toEqual({
      locked: false,
      canAddBlocks: ['hint'],
      canRemoveBlocks: ['answer'],
    })
    expect(lesson.slides[0].practiceMetadata).toEqual({
      difficulty: 'medium',
      answerMode: 'hidden_by_default',
      stepCount: 3,
      misconception: 'Motion always requires a sustaining force.',
    })
  })

  it('stores structured slide metadata inside visual_config without overwriting raw visual config', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'deck-1' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)

    await insertStructuredDeck({
      title: 'Newton',
      subject: 'Physics',
      gradeLevel: '9',
      userId: 'user-1',
      schoolId: null,
      sourceTopics: ['Newton'],
      lesson: {
        meta: {
          topic: 'Newton',
          subject: 'Physics',
          grade: '9',
        },
        structure: {
          learning_objectives: [],
          vocabulary: [],
          prerequisites: [],
          bloom_progression: [],
        },
        slides: [{
          title: 'Try It Together',
          content: 'Legacy content',
          order: 1,
          slideType: 'ACTIVITY',
          bloom_level: 'APPLY',
          visualMetadata: {
            visualType: 'diagram',
            visualConfig: {
              chartType: 'force-map',
            },
            confidence: 0.9,
            generatedBy: 'renderer',
          },
          clusterId: 'guided_practice_1',
          pedagogicalRole: 'guided_practice',
          instructionalGoal: 'Apply Newtonian motion to a simple example.',
          contentMode: 'question',
          contentBlocks: [{ type: 'question', text: 'What is force?' }],
          layoutCandidates: ['guided-practice'],
          density: 'medium',
          importance: 'primary',
          visualIntent: {
            purpose: 'clarify',
            assetType: 'none',
            priority: 'optional',
            sourceStrategy: 'renderer_native',
          },
          editingHints: {
            locked: false,
            canAddBlocks: ['hint'],
            canRemoveBlocks: ['answer'],
          },
          practiceMetadata: {
            difficulty: 'medium',
            answerMode: 'hidden_by_default',
            stepCount: 3,
            misconception: 'Motion always requires a sustaining force.',
          },
        }],
      },
    })

    const slideInsertCall = mockQuery.mock.calls[2]
    const persistedVisualConfig = JSON.parse(slideInsertCall[1]?.[9] as string)

    expect(persistedVisualConfig).toEqual({
      chartType: 'force-map',
      __structuredSlide: {
        clusterId: 'guided_practice_1',
        pedagogicalRole: 'guided_practice',
        instructionalGoal: 'Apply Newtonian motion to a simple example.',
        contentMode: 'question',
        contentBlocks: [{ type: 'question', text: 'What is force?' }],
        layoutCandidates: ['guided-practice'],
        density: 'medium',
        importance: 'primary',
        visualIntent: {
          purpose: 'clarify',
          assetType: 'none',
          priority: 'optional',
          sourceStrategy: 'renderer_native',
        },
        editingHints: {
          locked: false,
          canAddBlocks: ['hint'],
          canRemoveBlocks: ['answer'],
        },
        practiceMetadata: {
          difficulty: 'medium',
          answerMode: 'hidden_by_default',
          stepCount: 3,
          misconception: 'Motion always requires a sustaining force.',
        },
      },
    })
  })

  it('rehydrates structured slide metadata from visual_config and preserves plain string content', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'deck-1',
          title: 'Newton',
          subject: 'Physics',
          grade_level: '9',
          school_id: null,
          meta: { topic: 'Newton', subject: 'Physics', grade: '9', theme: 'blueprint' },
          structure: { learning_objectives: [], vocabulary: [], prerequisites: [], bloom_progression: [] },
        }],
      } as any)
      .mockResolvedValueOnce({
        rows: [{
          id: 'slide-1',
          title: 'Try It Together',
          content: 'Legacy content',
          slide_order: 1,
          slide_type: 'ACTIVITY',
          bloom_level: 'APPLY',
          visual_type: 'diagram',
          visual_config: {
            chartType: 'force-map',
            __structuredSlide: {
              clusterId: 'guided_practice_1',
              pedagogicalRole: 'guided_practice',
              instructionalGoal: 'Apply Newtonian motion to a simple example.',
              contentMode: 'question',
              contentBlocks: [{ type: 'question', text: 'What is force?' }],
              layoutCandidates: ['guided-practice'],
              density: 'medium',
              importance: 'primary',
              visualIntent: {
                purpose: 'clarify',
                assetType: 'none',
                priority: 'optional',
                sourceStrategy: 'renderer_native',
              },
              editingHints: {
                locked: false,
                canAddBlocks: ['hint'],
                canRemoveBlocks: ['answer'],
              },
              practiceMetadata: {
                difficulty: 'medium',
                answerMode: 'hidden_by_default',
                stepCount: 3,
                misconception: 'Motion always requires a sustaining force.',
              },
            },
          },
          visual_confidence: 0.9,
          generated_by: 'renderer',
        }],
      } as any)

    const deck = await fetchDeckWithSlides('deck-1', null)
    const slide = deck?.lesson.slides[0]

    expect(slide?.content).toBe('Legacy content')
    expect(slide?.visualMetadata?.visualConfig).toEqual({
      chartType: 'force-map',
    })
    expect(slide?.clusterId).toBe('guided_practice_1')
    expect(slide?.pedagogicalRole).toBe('guided_practice')
    expect(slide?.instructionalGoal).toBe('Apply Newtonian motion to a simple example.')
    expect(slide?.contentMode).toBe('question')
    expect(slide?.contentBlocks).toEqual([
      {
        type: 'question',
        text: 'What is force?',
        items: undefined,
        value: undefined,
      },
    ])
    expect(slide?.layoutCandidates).toEqual(['guided-practice'])
    expect(slide?.density).toBe('medium')
    expect(slide?.importance).toBe('primary')
    expect(slide?.visualIntent).toEqual({
      purpose: 'clarify',
      assetType: 'none',
      priority: 'optional',
      sourceStrategy: 'renderer_native',
    })
    expect(slide?.editingHints).toEqual({
      locked: false,
      canAddBlocks: ['hint'],
      canRemoveBlocks: ['answer'],
    })
    expect(slide?.practiceMetadata).toEqual({
      difficulty: 'medium',
      answerMode: 'hidden_by_default',
      stepCount: 3,
      misconception: 'Motion always requires a sustaining force.',
    })
  })
})
