import { query } from '../config/database'

export interface VisualMetadata {
  visualType?: string | null
  visualConfig?: Record<string, any> | null
  confidence?: number | null
  generatedBy?: string | null
  reasoning?: string | null
}

export interface ContentBlock {
  type: string
  text?: string | null
  items?: string[]
  value?: string | null
}

export interface VisualIntent {
  purpose: string
  assetType: string
  priority: 'required' | 'optional'
  sourceStrategy: 'stock' | 'generated' | 'diagrammatic' | 'renderer_native'
}

export interface EditingHints {
  locked?: boolean
  canAddBlocks?: string[]
  canRemoveBlocks?: string[]
}

export interface PracticeMetadata {
  difficulty?: string | null
  answerMode?: string | null
  stepCount?: number | null
  misconception?: string | null
}

export interface LessonSlide {
  id?: string
  title: string
  content: string
  order: number
  slideType: string
  bloom_level: string
  objective?: string | null
  speakerNotes?: string | null
  imageQuery?: string | null
  visualMetadata?: VisualMetadata | null
  clusterId?: string | null
  pedagogicalRole?: 'hook' | 'explain_core' | 'explain_deepen' | 'worked_example' | 'compare_example' | 'guided_practice' | 'independent_practice' | 'summary' | null
  instructionalGoal?: string | null
  contentMode?: 'text_only' | 'image_support' | 'diagram' | 'chart' | 'equation' | 'comparison' | 'question' | null
  contentBlocks?: ContentBlock[]
  layoutCandidates?: string[]
  density?: 'low' | 'medium' | 'high' | null
  importance?: 'primary' | 'secondary' | null
  visualIntent?: VisualIntent | null
  editingHints?: EditingHints | null
  practiceMetadata?: PracticeMetadata | null
}

export interface LessonMetadata {
  lesson_id?: string
  topic: string
  subject: string
  grade: string
  standards?: string[]
  theme?: string
  pedagogical_model?: string
  created_at?: string
}

export interface LearningStructure {
  learning_objectives: Array<{ objective: string; bloom_level: string }>
  vocabulary: Array<{ term: string; definition: string; grade_appropriate?: boolean }>
  prerequisites: string[]
  bloom_progression: string[]
}

export interface LessonDeck {
  meta: LessonMetadata
  structure: LearningStructure
  slides: LessonSlide[]
}

export interface CanonicalDeckResponse {
  id: string
  title: string
  subject?: string
  grade_level?: string
  created_by?: string
  school_id?: string | null
  source_topics?: string[]
  source_chapter?: string | null
  created_at?: string
  updated_at?: string
  lesson: LessonDeck
  meta: LessonMetadata
  structure: LearningStructure
  slides: LessonSlide[]
}

const DEFAULT_THEME = 'default'
const STRUCTURED_SLIDE_METADATA_KEY = '__structuredSlide'

const SUBJECT_THEME_MAP: Record<string, string> = {
  mathematics: 'mathematics',
  math: 'mathematics',
  science: 'science_nature',
  biology: 'science_nature',
  chemistry: 'science_nature',
  physics: 'blueprint',
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export function resolveDeckTheme(requestedTheme?: unknown, subject?: string): string {
  if (typeof requestedTheme === 'string' && requestedTheme.trim()) {
    return requestedTheme.trim()
  }

  if (subject) {
    const subjectKey = subject.toLowerCase().trim()
    if (SUBJECT_THEME_MAP[subjectKey]) {
      return SUBJECT_THEME_MAP[subjectKey]
    }
  }

  return DEFAULT_THEME
}

function normalizeVisualMetadata(rawVisualMetadata: any, fallbackRow?: any): VisualMetadata | null {
  const visualType = rawVisualMetadata?.visualType ?? fallbackRow?.visual_type ?? null
  const visualConfig = rawVisualMetadata?.visualConfig ?? extractVisualConfig(fallbackRow?.visual_config)
  const confidence = rawVisualMetadata?.confidence ?? fallbackRow?.visual_confidence ?? null
  const generatedBy = rawVisualMetadata?.generatedBy ?? fallbackRow?.generated_by ?? null
  const reasoning = rawVisualMetadata?.reasoning ?? null

  if (!visualType && !visualConfig && confidence == null && !generatedBy && !reasoning) {
    return null
  }

  return {
    visualType,
    visualConfig,
    confidence: confidence == null ? null : Number(confidence),
    generatedBy,
    reasoning,
  }
}

function normalizeSlideContent(rawContent: unknown, fallbackContent: unknown): string {
  const resolvedContent = rawContent ?? fallbackContent ?? ''

  if (typeof resolvedContent === 'string') {
    return resolvedContent
  }

  if (Array.isArray(resolvedContent)) {
    return resolvedContent.join('\n')
  }

  return JSON.stringify(resolvedContent)
}

function normalizeJsonObject(value: unknown): Record<string, any> | null {
  if (value == null) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null
}

function extractStructuredSlideMetadata(rawVisualConfig: unknown): Record<string, any> | null {
  const normalizedVisualConfig = normalizeJsonObject(rawVisualConfig)
  const structuredMetadata = normalizedVisualConfig?.[STRUCTURED_SLIDE_METADATA_KEY]

  return structuredMetadata && typeof structuredMetadata === 'object' && !Array.isArray(structuredMetadata)
    ? structuredMetadata as Record<string, any>
    : null
}

function extractVisualConfig(rawVisualConfig: unknown): Record<string, any> | null {
  const normalizedVisualConfig = normalizeJsonObject(rawVisualConfig)
  if (!normalizedVisualConfig) {
    return null
  }

  const { [STRUCTURED_SLIDE_METADATA_KEY]: _structuredSlide, ...rawConsumerVisualConfig } = normalizedVisualConfig
  return Object.keys(rawConsumerVisualConfig).length > 0 ? rawConsumerVisualConfig : null
}

function buildStructuredSlideMetadata(slide: LessonSlide): Record<string, any> | null {
  const structuredMetadata = {
    clusterId: slide.clusterId ?? null,
    pedagogicalRole: slide.pedagogicalRole ?? null,
    instructionalGoal: slide.instructionalGoal ?? null,
    contentMode: slide.contentMode ?? null,
    contentBlocks: slide.contentBlocks?.length ? slide.contentBlocks : null,
    layoutCandidates: slide.layoutCandidates?.length ? slide.layoutCandidates : null,
    density: slide.density ?? null,
    importance: slide.importance ?? null,
    visualIntent: slide.visualIntent ?? null,
    editingHints: slide.editingHints ?? null,
    practiceMetadata: slide.practiceMetadata ?? null,
  }

  return Object.values(structuredMetadata).some((value) => value != null)
    ? structuredMetadata
    : null
}

function buildPersistedVisualConfig(slide: LessonSlide): Record<string, any> | null {
  const rawVisualConfig = slide.visualMetadata?.visualConfig && typeof slide.visualMetadata.visualConfig === 'object'
    ? { ...slide.visualMetadata.visualConfig }
    : {}
  const structuredMetadata = buildStructuredSlideMetadata(slide)

  if (structuredMetadata) {
    rawVisualConfig[STRUCTURED_SLIDE_METADATA_KEY] = structuredMetadata
  }

  return Object.keys(rawVisualConfig).length > 0 ? rawVisualConfig : null
}

function normalizeContentBlocks(rawContentBlocks: any): ContentBlock[] {
  if (!Array.isArray(rawContentBlocks)) {
    return []
  }

  return rawContentBlocks
    .filter((block) => block && typeof block === 'object' && typeof block.type === 'string')
    .map((block) => ({
      type: String(block.type),
      text: block.text == null ? undefined : String(block.text),
      items: Array.isArray(block.items) ? block.items.map((item: unknown) => String(item)) : undefined,
      value: block.value == null ? undefined : String(block.value),
    }))
}

function normalizeSlide(rawSlide: any, index: number, fallbackRow?: any): LessonSlide {
  const order = Number(rawSlide?.order ?? rawSlide?.slide_order ?? fallbackRow?.slide_order ?? index + 1)
  const structuredMetadata = extractStructuredSlideMetadata(fallbackRow?.visual_config)

  return {
    id: rawSlide?.id ?? fallbackRow?.id,
    title: String(rawSlide?.title ?? fallbackRow?.title ?? `Slide ${order}`),
    content: normalizeSlideContent(rawSlide?.content, fallbackRow?.content),
    order,
    slideType: String(rawSlide?.slideType ?? rawSlide?.slide_type ?? fallbackRow?.slide_type ?? 'CONCEPT'),
    bloom_level: String(rawSlide?.bloom_level ?? rawSlide?.bloomLevel ?? fallbackRow?.bloom_level ?? 'UNDERSTAND'),
    objective: rawSlide?.objective ?? fallbackRow?.objective ?? null,
    speakerNotes: rawSlide?.speakerNotes ?? rawSlide?.speaker_notes ?? fallbackRow?.speaker_notes ?? null,
    imageQuery: rawSlide?.imageQuery ?? rawSlide?.image_query ?? fallbackRow?.image_query ?? null,
    visualMetadata: normalizeVisualMetadata(rawSlide?.visualMetadata, fallbackRow),
    clusterId: rawSlide?.clusterId ?? fallbackRow?.cluster_id ?? structuredMetadata?.clusterId ?? null,
    pedagogicalRole: rawSlide?.pedagogicalRole ?? fallbackRow?.pedagogical_role ?? structuredMetadata?.pedagogicalRole ?? null,
    instructionalGoal: rawSlide?.instructionalGoal ?? fallbackRow?.instructional_goal ?? structuredMetadata?.instructionalGoal ?? null,
    contentMode: rawSlide?.contentMode ?? fallbackRow?.content_mode ?? structuredMetadata?.contentMode ?? null,
    contentBlocks: normalizeContentBlocks(rawSlide?.contentBlocks ?? fallbackRow?.content_blocks ?? structuredMetadata?.contentBlocks),
    layoutCandidates: asArray<string>(rawSlide?.layoutCandidates ?? fallbackRow?.layout_candidates ?? structuredMetadata?.layoutCandidates),
    density: rawSlide?.density ?? fallbackRow?.density ?? structuredMetadata?.density ?? null,
    importance: rawSlide?.importance ?? fallbackRow?.importance ?? structuredMetadata?.importance ?? null,
    visualIntent: rawSlide?.visualIntent ?? fallbackRow?.visual_intent ?? structuredMetadata?.visualIntent ?? null,
    editingHints: rawSlide?.editingHints ?? fallbackRow?.editing_hints ?? structuredMetadata?.editingHints ?? null,
    practiceMetadata: rawSlide?.practiceMetadata ?? fallbackRow?.practice_metadata ?? structuredMetadata?.practiceMetadata ?? null,
  }
}

function defaultLessonStructure(slides: LessonSlide[]): LearningStructure {
  return {
    learning_objectives: slides.slice(0, 3).map((slide) => ({
      objective: slide.objective || slide.title,
      bloom_level: slide.bloom_level || 'UNDERSTAND',
    })),
    vocabulary: [],
    prerequisites: [],
    bloom_progression: slides.map((slide) => slide.bloom_level || 'UNDERSTAND'),
  }
}

export function normalizeLessonDeck(input: any, fallback?: Partial<LessonDeck & { subject?: string; gradeLevel?: string; topic?: string; title?: string; theme?: string }>): LessonDeck {
  const lesson = input?.lesson ?? input
  const rawSlides = asArray<any>(lesson?.slides ?? input?.slides)
  const slides = rawSlides.map((slide, index) => normalizeSlide(slide, index))
  const topic = lesson?.meta?.topic
    ?? input?.meta?.topic
    ?? fallback?.meta?.topic
    ?? fallback?.topic
    ?? input?.title
    ?? fallback?.title
    ?? 'Teaching Deck'
  const subject = lesson?.meta?.subject
    ?? input?.meta?.subject
    ?? fallback?.meta?.subject
    ?? fallback?.subject
    ?? ''
  const grade = lesson?.meta?.grade
    ?? input?.meta?.grade
    ?? fallback?.meta?.grade
    ?? fallback?.gradeLevel
    ?? ''
  const theme = resolveDeckTheme(
    lesson?.meta?.theme ?? input?.meta?.theme ?? fallback?.meta?.theme ?? fallback?.theme,
    subject
  )

  const meta: LessonMetadata = {
    lesson_id: lesson?.meta?.lesson_id ?? input?.meta?.lesson_id ?? fallback?.meta?.lesson_id,
    topic,
    subject,
    grade,
    standards: asArray<string>(lesson?.meta?.standards ?? input?.meta?.standards ?? fallback?.meta?.standards),
    theme,
    pedagogical_model: lesson?.meta?.pedagogical_model
      ?? input?.meta?.pedagogical_model
      ?? fallback?.meta?.pedagogical_model
      ?? 'I_DO_WE_DO_YOU_DO',
    created_at: lesson?.meta?.created_at
      ?? input?.meta?.created_at
      ?? fallback?.meta?.created_at
      ?? new Date().toISOString(),
  }

  const structure: LearningStructure = {
    learning_objectives: asArray<any>(
      lesson?.structure?.learning_objectives
      ?? input?.structure?.learning_objectives
      ?? fallback?.structure?.learning_objectives
    ).map((objective) => ({
      objective: String(objective?.objective ?? ''),
      bloom_level: String(objective?.bloom_level ?? 'UNDERSTAND'),
    })).filter((objective) => objective.objective),
    vocabulary: asArray<any>(
      lesson?.structure?.vocabulary
      ?? input?.structure?.vocabulary
      ?? fallback?.structure?.vocabulary
    ).map((term) => ({
      term: String(term?.term ?? ''),
      definition: String(term?.definition ?? ''),
      grade_appropriate: term?.grade_appropriate !== false,
    })).filter((term) => term.term || term.definition),
    prerequisites: asArray<string>(
      lesson?.structure?.prerequisites
      ?? input?.structure?.prerequisites
      ?? fallback?.structure?.prerequisites
    ),
    bloom_progression: asArray<string>(
      lesson?.structure?.bloom_progression
      ?? input?.structure?.bloom_progression
      ?? fallback?.structure?.bloom_progression
    ),
  }

  const normalizedStructure = {
    ...defaultLessonStructure(slides),
    ...structure,
  }

  if (!normalizedStructure.learning_objectives.length) {
    normalizedStructure.learning_objectives = defaultLessonStructure(slides).learning_objectives
  }

  if (!normalizedStructure.bloom_progression.length) {
    normalizedStructure.bloom_progression = slides.map((slide) => slide.bloom_level || 'UNDERSTAND')
  }

  return {
    meta,
    structure: normalizedStructure,
    slides,
  }
}

export function buildCanonicalDeckResponse(deckRow: any, lesson: LessonDeck): CanonicalDeckResponse {
  return {
    ...deckRow,
    lesson,
    meta: lesson.meta,
    structure: lesson.structure,
    slides: lesson.slides,
  }
}

export async function insertStructuredDeck(params: {
  title: string
  subject: string
  gradeLevel: string
  userId: string
  schoolId: string | null
  sourceTopics: string[]
  sourceChapter?: string | null
  lesson: LessonDeck
}) {
  const {
    title,
    subject,
    gradeLevel,
    userId,
    schoolId,
    sourceTopics,
    sourceChapter,
    lesson,
  } = params

  const deckResult = await query(
    `INSERT INTO decks (title, subject, grade_level, created_by, school_id, source_topics, source_chapter, meta, structure)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
     RETURNING *`,
    [
      title,
      subject,
      gradeLevel,
      userId,
      schoolId,
      sourceTopics,
      sourceChapter || null,
      JSON.stringify(lesson.meta),
      JSON.stringify(lesson.structure),
    ]
  )

  const deck = deckResult.rows[0]
  await replaceDeckSlides(deck.id, lesson.slides)
  return deck
}

export async function replaceDeckSlides(deckId: string, slides: LessonSlide[]) {
  await query('DELETE FROM slides WHERE deck_id = $1', [deckId])

  for (const [index, slide] of slides.entries()) {
    const persistedVisualConfig = buildPersistedVisualConfig(slide)

    await query(
      `INSERT INTO slides (
        deck_id, title, content, slide_order, slide_type, bloom_level, speaker_notes,
        image_query, visual_type, visual_config, visual_confidence, generated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)`,
      [
        deckId,
        slide.title,
        slide.content,
        slide.order || index + 1,
        slide.slideType || 'CONCEPT',
        slide.bloom_level || 'UNDERSTAND',
        slide.speakerNotes || null,
        slide.imageQuery || null,
        slide.visualMetadata?.visualType || null,
        persistedVisualConfig ? JSON.stringify(persistedVisualConfig) : null,
        slide.visualMetadata?.confidence ?? null,
        slide.visualMetadata?.generatedBy || null,
      ]
    )
  }
}

export async function updateStructuredDeck(params: {
  deckId: string
  title: string
  lesson: LessonDeck
}) {
  const deckResult = await query(
    `UPDATE decks
     SET title = $1, meta = $2::jsonb, structure = $3::jsonb, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [
      params.title,
      JSON.stringify(params.lesson.meta),
      JSON.stringify(params.lesson.structure),
      params.deckId,
    ]
  )

  await replaceDeckSlides(params.deckId, params.lesson.slides)
  return deckResult.rows[0]
}

export async function fetchDeckWithSlides(deckId: string, schoolId: string | null) {
  const result = await query(
    'SELECT * FROM decks WHERE id = $1 AND (school_id = $2 OR (school_id IS NULL AND $2 IS NULL))',
    [deckId, schoolId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const deck = result.rows[0]
  const slidesResult = await query(
    `SELECT id, deck_id, title, content, slide_order, slide_type, bloom_level, speaker_notes,
            image_query, visual_type, visual_config, visual_confidence, generated_by
     FROM slides
     WHERE deck_id = $1
     ORDER BY slide_order`,
    [deckId]
  )

  const slides = slidesResult.rows.map((slideRow, index) => normalizeSlide({}, index, slideRow))
  const lesson = normalizeLessonDeck({
    meta: deck.meta,
    structure: deck.structure,
    slides,
  }, {
    subject: deck.subject,
    gradeLevel: deck.grade_level,
    topic: deck.title,
    title: deck.title,
  })

  return buildCanonicalDeckResponse(deck, lesson)
}
