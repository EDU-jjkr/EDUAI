import { Request, Response } from 'express'
import PptxGenJS from 'pptxgenjs'
import { jsPDF } from 'jspdf'
import axios from 'axios'

interface VisualMetadata {
    visualType?: string
    visualConfig?: any
    confidence?: number
    generatedBy?: string
    reasoning?: string
}

interface Slide {
    id: string
    title: string
    content: string
    notes?: string
    visualMetadata?: VisualMetadata
}

interface Deck {
    id: string
    title: string
    subject?: string
    gradeLevel?: string
    slides: Slide[]
}

// Theme definitions
const THEMES = {
    professional: {
        name: 'Professional',
        colors: {
            primary: '2C3E50',
            secondary: '3498DB',
            accent: 'ECF0F1',
            text: '2C3E50',
            background: 'FFFFFF',
        },
        fonts: {
            title: 'Calibri',
            body: 'Calibri',
        },
    },
    creative: {
        name: 'Creative',
        colors: {
            primary: '9B59B6',
            secondary: 'E74C3C',
            accent: 'F39C12',
            text: '2C3E50',
            background: 'FFFFFF',
        },
        fonts: {
            title: 'Arial',
            body: 'Arial',
        },
    },
    minimal: {
        name: 'Minimal',
        colors: {
            primary: '000000',
            secondary: '666666',
            accent: 'E0E0E0',
            text: '333333',
            background: 'FFFFFF',
        },
        fonts: {
            title: 'Helvetica',
            body: 'Helvetica',
        },
    },
    colorful: {
        name: 'Colorful',
        colors: {
            primary: 'FF6B6B',
            secondary: '4ECDC4',
            accent: 'FFE66D',
            text: '2C3E50',
            background: 'FFFFFF',
        },
        fonts: {
            title: 'Arial',
            body: 'Arial',
        },
    },
    academic: {
        name: 'Academic',
        colors: {
            primary: '1A237E',
            secondary: '5C6BC0',
            accent: 'C5CAE9',
            text: '263238',
            background: 'FAFAFA',
        },
        fonts: {
            title: 'Times New Roman',
            body: 'Georgia',
        },
    },
}

// Subject-based color overrides
const SUBJECT_COLORS: Record<string, { primary: string; secondary: string }> = {
    mathematics: { primary: '1976D2', secondary: '42A5F5' },
    math: { primary: '1976D2', secondary: '42A5F5' },
    science: { primary: '388E3C', secondary: '66BB6A' },
    physics: { primary: '5E35B1', secondary: '9575CD' },
    chemistry: { primary: '00897B', secondary: '4DB6AC' },
    biology: { primary: '43A047', secondary: '81C784' },
    english: { primary: '7B1FA2', secondary: 'BA68C8' },
    history: { primary: 'F57C00', secondary: 'FFB74D' },
    geography: { primary: '0097A7', secondary: '4DD0E1' },
    computer_science: { primary: '455A64', secondary: '78909C' },
    economics: { primary: 'C62828', secondary: 'E57373' },
}

// Grade-level brightness adjustments
const GRADE_ADJUSTMENTS: Record<string, number> = {
    '1': 1.2, '2': 1.2, '3': 1.2, '4': 1.15, '5': 1.15,
    '6': 1.1, '7': 1.05, '8': 1.0,
    '9': 0.95, '10': 0.95, '11': 0.9, '12': 0.9,
    'college': 0.85,
}

function getThemeColors(themeName: string, subject?: string, gradeLevel?: string) {
    const theme = THEMES[themeName as keyof typeof THEMES] || THEMES.professional
    let colors = { ...theme.colors }

    // Apply subject-based colors if available
    if (subject) {
        const subjectKey = subject.toLowerCase().replace(/\s+/g, '_')
        const subjectColors = SUBJECT_COLORS[subjectKey]
        if (subjectColors) {
            colors.primary = subjectColors.primary
            colors.secondary = subjectColors.secondary
        }
    }

    return colors
}

// Helper function to download images and convert to data URLs (100% reliable)
async function downloadAndConvertImages(slides: Slide[]): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>()
    const imageUrls: string[] = []

    // Collect all image URLs from slides
    slides.forEach(slide => {
        if (slide.visualMetadata?.visualConfig?.generatedData?.quickChartUrl) {
            const url = slide.visualMetadata.visualConfig.generatedData.quickChartUrl
            if (!imageMap.has(url)) {
                imageUrls.push(url)
            }
        }
    })

    if (imageUrls.length === 0) return imageMap

    console.log(`Downloading ${imageUrls.length} chart images for embedding...`)

    // Download images as base64 data URLs
    for (const url of imageUrls) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: { 'Accept': 'image/png' }
            })

            const base64 = Buffer.from(response.data, 'binary').toString('base64')
            const dataUrl = `data:image/png;base64,${base64}`
            imageMap.set(url, dataUrl)
            console.log(`✓ Downloaded: ${url.substring(0, 50)}...`)
        } catch (error: any) {
            console.error(`✗ Failed to download: ${url.substring(0, 50)}...`, error.message)
            // Don't add to map - will trigger fallback in rendering
        }
    }

    console.log(`Successfully downloaded ${imageMap.size}/${imageUrls.length} images`)
    return imageMap
}

export const exportToPowerPoint = async (req: Request, res: Response) => {
    try {
        const deck: Deck = req.body
        const theme = (req.query.theme as string) || 'professional'

        const pres = new PptxGenJS()
        pres.layout = 'LAYOUT_WIDE'
        pres.author = 'EDU Platform'
        pres.subject = deck.subject || ''
        pres.title = deck.title

        const themeConfig = THEMES[theme as keyof typeof THEMES] || THEMES.professional
        const colors = getThemeColors(theme, deck.subject, deck.gradeLevel)

        console.log(`Using theme: ${theme}, colors:`, colors)

        // Download all images as data URLs for reliable embedding
        const imageDataUrls = await downloadAndConvertImages(deck.slides)

        // Title slide with gradient background
        const titleSlide = pres.addSlide()
        titleSlide.background = {
            fill: `${colors.primary}`,
        }

        // Add gradient overlay effect
        titleSlide.addShape('rect', {
            x: 0, y: 0, w: '100%', h: '100%',
            fill: { type: 'solid', color: colors.primary, transparency: 20 },
        })

        titleSlide.addText(deck.title, {
            x: 0.5,
            y: '35%',
            w: '90%',
            h: 2,
            fontSize: 44,
            bold: true,
            color: 'FFFFFF',
            align: 'center',
            fontFace: themeConfig.fonts.title,
        })

        if (deck.subject) {
            titleSlide.addText(deck.subject.toUpperCase(), {
                x: 0.5,
                y: '55%',
                w: '90%',
                h: 0.5,
                fontSize: 20,
                color: 'FFFFFF',
                align: 'center',
                fontFace: themeConfig.fonts.body,
                transparency: 30,
            })
        }

        titleSlide.addText(
            `${deck.slides.length} Slides`,
            {
                x: 0.5,
                y: '85%',
                w: '90%',
                h: 0.3,
                fontSize: 14,
                color: 'FFFFFF',
                align: 'center',
                fontFace: themeConfig.fonts.body,
                transparency: 40,
            }
        )

        // Content slides with smart layouts
        deck.slides.forEach((slide, index) => {
            const contentSlide = pres.addSlide()
            contentSlide.background = { fill: colors.background }

            // Header bar with accent color
            contentSlide.addShape('rect', {
                x: 0, y: 0, w: '100%', h: 0.8,
                fill: { type: 'solid', color: colors.primary },
            })

            // Slide number indicator
            contentSlide.addShape('rect', {
                x: 0, y: 0, w: 0.15, h: 0.8,
                fill: { type: 'solid', color: colors.secondary },
            })

            contentSlide.addText(`${index + 1}`, {
                x: 0,
                y: 0.15,
                w: 0.15,
                h: 0.5,
                fontSize: 24,
                bold: true,
                color: 'FFFFFF',
                align: 'center',
                fontFace: themeConfig.fonts.title,
            })

            // Slide title
            contentSlide.addText(slide.title, {
                x: 0.3,
                y: 0.15,
                w: '85%',
                h: 0.5,
                fontSize: 32,
                bold: true,
                color: 'FFFFFF',
                valign: 'middle',
                fontFace: themeConfig.fonts.title,
            })

            // Check if slide has visual content
            const hasVisual = slide.visualMetadata && slide.visualMetadata.visualType
            let visualHeight = 0

            // Add visual content if present
            if (hasVisual) {
                const visualData = slide.visualMetadata!.visualConfig?.generatedData || {}
                const visualType = slide.visualMetadata!.visualType
                const generatedBy = slide.visualMetadata!.generatedBy

                if (visualType === 'chart' && visualData.quickChartUrl) {
                    // Use downloaded data URL for 100% reliability
                    const imageData = imageDataUrls.get(visualData.quickChartUrl)

                    if (imageData) {
                        try {
                            contentSlide.addImage({
                                data: imageData,  // Use data URL instead of path
                                x: 0.5,
                                y: 1.5,
                                w: 6,
                                h: 4,
                                sizing: {
                                    type: 'contain',
                                    w: 6,
                                    h: 4
                                }
                            })
                            visualHeight = 4.5
                        } catch (error) {
                            console.error('Failed to embed chart image:', error)
                            // This should never happen with data URLs
                            visualHeight = 0
                        }
                    } else {
                        // Fallback: Image download failed
                        contentSlide.addText('📊 Chart (Download Failed)', {
                            x: 0.5,
                            y: 1.5,
                            w: '92%',
                            h: 0.5,
                            fontSize: 16,
                            color: '666666',
                            italic: true,
                        })
                        visualHeight = 1
                    }
                } else if (visualType === 'diagram' && generatedBy === 'mermaid') {
                    // Convert Mermaid diagram to image using mermaid.ink
                    const mermaidCode = visualData.code || ''
                    if (mermaidCode) {
                        try {
                            // Encode Mermaid code for URL
                            const encodedMermaid = Buffer.from(mermaidCode).toString('base64')
                            const mermaidImageUrl = `https://mermaid.ink/img/${encodedMermaid}`

                            contentSlide.addImage({
                                path: mermaidImageUrl,
                                x: 0.5,
                                y: 1.5,
                                w: 6,
                                h: 3.5,
                            })
                            visualHeight = 4
                        } catch (error) {
                            console.error('Failed to add mermaid image:', error)
                            // Fallback to formatted code block
                            contentSlide.addShape('rect', {
                                x: 0.5,
                                y: 1.5,
                                w: '92%',
                                h: 2.5,
                                fill: { type: 'solid', color: 'F5F5F5' },
                            })
                            contentSlide.addText('🔷 Diagram (Mermaid)\n\n' + mermaidCode.substring(0, 250), {
                                x: 0.7,
                                y: 1.7,
                                w: '88%',
                                h: 2.1,
                                fontSize: 11,
                                color: '333333',
                                fontFace: 'Courier New',
                            })
                            visualHeight = 3
                        }
                    }
                } else if (visualType === 'math' && generatedBy === 'latex') {
                    // Add LaTeX equations as formatted text
                    const equations = visualData.equations || []
                    const equationText = equations.join('\n\n')
                    contentSlide.addShape('rect', {
                        x: 0.5,
                        y: 1.5,
                        w: '92%',
                        h: 2,
                        fill: { type: 'solid', color: 'E3F2FD' },
                    })
                    contentSlide.addText('🔢 Mathematical Equations\n\n' + equationText, {
                        x: 0.7,
                        y: 1.7,
                        w: '88%',
                        h: 1.6,
                        fontSize: 16,
                        color: '1565C0',
                        fontFace: 'Cambria Math',
                    })
                    visualHeight = 2.5
                }
            }

            // Content area with proper spacing (adjusted for visual content)
            // ALWAYS show the slide content text
            const contentY = hasVisual ? 1.5 + visualHeight + 0.3 : 1.5
            const contentHeight = hasVisual ? Math.max(1.5, 5.5 - visualHeight) : 4
            const contentLines = slide.content.split('\n').filter(line => line.trim())
            const hasMultipleParagraphs = contentLines.length > 3

            if (hasMultipleParagraphs && contentHeight > 1.5) {
                // Two-column layout for lots of content
                const midPoint = Math.ceil(contentLines.length / 2)
                const leftContent = contentLines.slice(0, midPoint).join('\n')
                const rightContent = contentLines.slice(midPoint).join('\n')

                contentSlide.addText(leftContent, {
                    x: 0.5,
                    y: contentY,
                    w: '45%',
                    h: contentHeight,
                    fontSize: Math.min(18, 18 * (4 / contentHeight)),
                    color: colors.text,
                    valign: 'top',
                    fontFace: themeConfig.fonts.body,
                })

                contentSlide.addText(rightContent, {
                    x: '52%',
                    y: contentY,
                    w: '45%',
                    h: contentHeight,
                    fontSize: Math.min(18, 18 * (4 / contentHeight)),
                    color: colors.text,
                    valign: 'top',
                    fontFace: themeConfig.fonts.body,
                })
            } else {
                // Single column for simple content
                contentSlide.addText(slide.content, {
                    x: 0.5,
                    y: contentY,
                    w: '92%',
                    h: contentHeight,
                    fontSize: Math.min(20, 20 * (4 / contentHeight)),
                    color: colors.text,
                    valign: 'top',
                    fontFace: themeConfig.fonts.body,
                    lineSpacing: 28,
                })
            }


            // Speaker notes with styled box
            if (slide.notes) {
                contentSlide.addNotes(slide.notes)

                contentSlide.addShape('rect', {
                    x: 0.5,
                    y: 5.8,
                    w: '92%',
                    h: 1,
                    fill: { type: 'solid', color: colors.accent },
                })

                contentSlide.addText('💡 ' + slide.notes, {
                    x: 0.7,
                    y: 5.95,
                    w: '90%',
                    h: 0.7,
                    fontSize: 14,
                    color: colors.text,
                    fontFace: themeConfig.fonts.body,
                    italic: true,
                })
            }

            // Footer with slide count
            contentSlide.addText(
                `${index + 1} / ${deck.slides.length}`,
                {
                    x: '90%',
                    y: '95%',
                    w: '8%',
                    h: 0.3,
                    fontSize: 12,
                    color: colors.secondary,
                    align: 'right',
                    fontFace: themeConfig.fonts.body,
                }
            )
        })

        // Generate file buffer
        const fileName = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`
        const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        res.send(buffer)
    } catch (error) {
        console.error('PowerPoint export error:', error)
        res.status(500).json({ message: 'Failed to generate PowerPoint file' })
    }
}

export const exportToPDF = async (req: Request, res: Response) => {
    try {
        const deck: Deck = req.body

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 20
        const maxWidth = pageWidth - 2 * margin

        // Title page
        doc.setFontSize(28)
        doc.setFont('helvetica', 'bold')
        doc.text(deck.title, pageWidth / 2, pageHeight / 2, { align: 'center' })

        // Content pages
        deck.slides.forEach((slide, index) => {
            doc.addPage()

            // Slide title
            doc.setFontSize(20)
            doc.setFont('helvetica', 'bold')
            doc.text(slide.title, margin, 30, { maxWidth })

            // Slide content
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            const contentLines = doc.splitTextToSize(slide.content, maxWidth)
            doc.text(contentLines, margin, 50)

            // Speaker notes
            if (slide.notes) {
                const notesY = 50 + (contentLines.length * 7) + 10
                doc.setFontSize(10)
                doc.setFont('helvetica', 'italic')
                doc.setTextColor(100, 100, 100)
                doc.text('Speaker Notes:', margin, notesY)
                const notesLines = doc.splitTextToSize(slide.notes, maxWidth)
                doc.text(notesLines, margin, notesY + 6)
                doc.setTextColor(0, 0, 0)
            }

            // Page number
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(
                `Slide ${index + 1} of ${deck.slides.length}`,
                pageWidth - margin,
                pageHeight - 10,
                { align: 'right' }
            )
        })

        const fileName = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_deck.pdf`
        const buffer = Buffer.from(doc.output('arraybuffer'))

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        res.send(buffer)
    } catch (error) {
        console.error('PDF export error:', error)
        res.status(500).json({ message: 'Failed to generate PDF file' })
    }
}
