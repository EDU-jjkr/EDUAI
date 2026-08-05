import { Response } from 'express'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import type { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error-handler'
import {
  fetchDeckWithSlides,
  normalizeLessonDeck,
  resolveDeckTheme,
  type LessonDeck,
} from '../services/deck-lesson.service'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '120000', 10)

async function resolveLessonFromRequest(req: AuthRequest): Promise<LessonDeck> {
  const deckPayload = req.body?.deck
  const inlineSource = deckPayload ?? req.body
  const hasInlineDeck = inlineSource?.lesson || inlineSource?.slides || inlineSource?.meta || inlineSource?.structure
  if (hasInlineDeck) {
    return normalizeLessonDeck(inlineSource, {
      subject: inlineSource?.subject,
      gradeLevel: inlineSource?.gradeLevel,
      topic: inlineSource?.title,
      title: inlineSource?.title,
      theme: inlineSource?.theme ?? req.body?.theme,
    })
  }

  const deckId = req.body?.deckId || req.body?.id || deckPayload?.id
  if (!deckId) {
    throw new AppError('Deck payload or deckId is required', 400, 'DECK_PAYLOAD_REQUIRED')
  }

  const savedDeck = await fetchDeckWithSlides(String(deckId), req.user?.school_id || null)
  if (!savedDeck) {
    throw new AppError('Deck not found', 404, 'DECK_NOT_FOUND')
  }

  return savedDeck.lesson
}

export const exportToPowerPoint = async (req: AuthRequest, res: Response) => {
  try {
    if (!AI_SERVICE_URL) {
      throw new AppError('AI service is not configured', 500, 'AI_SERVICE_NOT_CONFIGURED')
    }

    const lesson = await resolveLessonFromRequest(req)
    const theme = resolveDeckTheme(req.query.theme || lesson.meta.theme || req.body?.theme, lesson.meta.subject)

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/deck/render-pptx`,
      { lesson, theme },
      {
        timeout: AI_SERVICE_TIMEOUT,
        responseType: 'arraybuffer',
      }
    )

    res.setHeader(
      'Content-Type',
      response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
    res.setHeader(
      'Content-Disposition',
      response.headers['content-disposition'] || `attachment; filename="${lesson.meta.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx"`
    )
    res.send(Buffer.from(response.data))
  } catch (error: any) {
    console.error('PowerPoint export error:', error.response?.data || error.message)
    const status = error instanceof AppError ? error.status : error.response?.status || 500
    const message = error instanceof AppError
      ? error.message
      : error.response?.data?.detail || 'Failed to generate PowerPoint file'
    res.status(status).json({ message })
  }
}

export const exportToPDF = async (req: AuthRequest, res: Response) => {
  try {
    const lesson = await resolveLessonFromRequest(req)
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 16
    const contentWidth = pageWidth - margin * 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.text(lesson.meta.topic, margin, 28, { maxWidth: contentWidth })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(
      `${lesson.meta.subject} | Grade ${lesson.meta.grade} | Theme ${lesson.meta.theme || 'default'}`,
      margin,
      38,
      { maxWidth: contentWidth }
    )

    for (const [index, slide] of lesson.slides.entries()) {
      doc.addPage('a4', 'landscape')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text(`${index + 1}. ${slide.title}`, margin, 22, { maxWidth: contentWidth })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(
        `${slide.slideType} | Bloom: ${slide.bloom_level}`,
        margin,
        30,
        { maxWidth: contentWidth }
      )

      const bodyLines = doc.splitTextToSize(slide.content || '', contentWidth)
      doc.setFontSize(12)
      doc.text(bodyLines, margin, 42)

      let cursorY = 42 + bodyLines.length * 6

      if (slide.objective) {
        cursorY += 6
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text('Objective:', margin, cursorY)
        doc.setFont('helvetica', 'normal')
        doc.text(doc.splitTextToSize(slide.objective, contentWidth - 24), margin + 24, cursorY)
      }

      if (slide.speakerNotes) {
        cursorY += 16
        doc.setDrawColor(220, 220, 220)
        doc.rect(margin, cursorY - 6, contentWidth, 28)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('Speaker Notes', margin + 4, cursorY)
        doc.setFont('helvetica', 'italic')
        doc.text(doc.splitTextToSize(slide.speakerNotes, contentWidth - 8), margin + 4, cursorY + 6)
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Slide ${index + 1} of ${lesson.slides.length}`, pageWidth - margin, pageHeight - 10, {
        align: 'right',
      })
    }

    const filename = `${lesson.meta.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_deck.pdf`
    const buffer = Buffer.from(doc.output('arraybuffer'))

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (error: any) {
    console.error('PDF export error:', error.message)
    const status = error instanceof AppError ? error.status : 500
    const message = error instanceof AppError ? error.message : 'Failed to generate PDF file'
    res.status(status).json({ message })
  }
}
