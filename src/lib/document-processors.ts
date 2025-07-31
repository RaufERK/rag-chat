import path from 'path'
import fs from 'fs/promises'
// Полностью динамический импорт pdf-parse для избежания проблем с Next.js
import xml2js from 'xml2js'
import EPub from 'epub2'
import mammoth from 'mammoth'
// import textract from 'textract' // Временно отключено из-за проблем с Next.js

/**
 * Universal Document Processor Interface
 * Each file format implements this interface
 */
export interface DocumentProcessor {
  supportedMimeTypes: string[]
  supportedExtensions: string[]
  extractText(filePath: string, buffer: Buffer): Promise<string>
  validateFile(buffer: Buffer): boolean
}

/**
 * PDF Document Processor
 * Uses pdf-parse for text extraction
 */
export class PDFProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/pdf']
  supportedExtensions = ['.pdf']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      // Полностью динамический импорт без кэширования для избежания проблем с Next.js
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      return pdfData.text.trim()
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`)
    }
  }

  validateFile(buffer: Buffer): boolean {
    // PDF files start with %PDF
    return buffer.subarray(0, 4).toString() === '%PDF'
  }
}

/**
 * Plain Text Document Processor
 * Simple UTF-8 text processing
 */
export class TXTProcessor implements DocumentProcessor {
  supportedMimeTypes = ['text/plain']
  supportedExtensions = ['.txt']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      return buffer.toString('utf-8').trim()
    } catch (error) {
      throw new Error(`Text file reading failed: ${error.message}`)
    }
  }

  validateFile(buffer: Buffer): boolean {
    try {
      // Try to decode as UTF-8
      buffer.toString('utf-8')
      return true
    } catch {
      return false
    }
  }
}

/**
 * FB2 (FictionBook) Document Processor
 * Uses xml2js for XML parsing
 */
export class FB2Processor implements DocumentProcessor {
  supportedMimeTypes = [
    'application/x-fictionbook+xml',
    'text/xml',
    'application/xml',
  ]
  supportedExtensions = ['.fb2']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      const xml = buffer.toString('utf-8')
      const parser = new xml2js.Parser()
      const result = await parser.parseStringPromise(xml)

      if (!result.FictionBook) {
        throw new Error(
          'Invalid FB2 format: FictionBook root element not found'
        )
      }

      // Extract metadata
      const titleInfo =
        result.FictionBook?.description?.[0]?.['title-info']?.[0]
      const title = titleInfo?.['book-title']?.[0] || ''
      const authors = titleInfo?.author || []

      let metadata = ''
      if (title) {
        metadata += `Название: ${title}\n`
      }

      if (authors.length > 0) {
        const authorNames = authors
          .map((author: any) => {
            const firstName = author['first-name']?.[0] || ''
            const lastName = author['last-name']?.[0] || ''
            return `${firstName} ${lastName}`.trim()
          })
          .filter(Boolean)

        if (authorNames.length > 0) {
          metadata += `Автор: ${authorNames.join(', ')}\n`
        }
      }

      // Extract main text content
      const bodyText = this.extractTextFromNode(result.FictionBook?.body)

      return metadata + (metadata ? '\n\n' : '') + bodyText
    } catch (error) {
      throw new Error(`FB2 parsing failed: ${error.message}`)
    }
  }

  private extractTextFromNode(node: any): string {
    if (typeof node === 'string') {
      return node.trim()
    }

    if (Array.isArray(node)) {
      return node.map((n) => this.extractTextFromNode(n)).join(' ')
    }

    if (typeof node === 'object' && node !== null) {
      let text = ''

      // Handle different FB2 elements
      if (node.p) {
        text += this.extractTextFromNode(node.p) + '\n'
      }
      if (node.section) {
        text += this.extractTextFromNode(node.section) + '\n\n'
      }
      if (node.title) {
        text += this.extractTextFromNode(node.title) + '\n'
      }
      if (node.subtitle) {
        text += this.extractTextFromNode(node.subtitle) + '\n'
      }

      // If none of the specific elements, try to extract text from all properties
      if (!node.p && !node.section && !node.title && !node.subtitle) {
        for (const key in node) {
          if (key !== '$' && node.hasOwnProperty(key)) {
            // Skip XML attributes
            text += this.extractTextFromNode(node[key]) + ' '
          }
        }
      }

      return text.trim()
    }

    return ''
  }

  validateFile(buffer: Buffer): boolean {
    const content = buffer.toString('utf-8', 0, 1000) // Check first 1000 bytes
    return (
      content.includes('<FictionBook') ||
      (content.includes('<?xml') && content.includes('FictionBook'))
    )
  }
}

/**
 * EPUB Document Processor
 * Uses epub2 library for EPUB extraction
 */
export class EPUBProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/epub+zip']
  supportedExtensions = ['.epub']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const epub = new EPub(filePath)

        epub.on('end', () => {
          try {
            const chapters = epub.flow.map((chapter) => chapter.id)
            let fullText = ''
            let processedChapters = 0

            if (chapters.length === 0) {
              resolve('')
              return
            }

            chapters.forEach((chapterId) => {
              epub.getChapter(chapterId, (error, text) => {
                if (error) {
                  console.warn(`Failed to extract chapter ${chapterId}:`, error)
                  text = '' // Continue with empty text for this chapter
                }

                if (text) {
                  // Remove HTML tags and clean up
                  const cleanText = text
                    .replace(/<[^>]*>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\n\s*\n/g, '\n\n')
                    .trim()

                  if (cleanText) {
                    fullText += cleanText + '\n\n'
                  }
                }

                processedChapters++
                if (processedChapters === chapters.length) {
                  resolve(fullText.trim())
                }
              })
            })
          } catch (error) {
            reject(new Error(`EPUB processing failed: ${error.message}`))
          }
        })

        epub.on('error', (error) => {
          reject(new Error(`EPUB parsing failed: ${error.message}`))
        })

        epub.parse()
      } catch (error) {
        reject(new Error(`EPUB initialization failed: ${error.message}`))
      }
    })
  }

  validateFile(buffer: Buffer): boolean {
    // EPUB files are ZIP archives, check ZIP signature
    const zipSignature = buffer.subarray(0, 4)
    return zipSignature.toString('hex') === '504b0304'
  }
}

/**
 * DOCX Document Processor (Modern Word format)
 * Uses mammoth library for DOCX extraction
 */
export class DOCXProcessor implements DocumentProcessor {
  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  supportedExtensions = ['.docx']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim()
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`)
    }
  }

  validateFile(buffer: Buffer): boolean {
    // DOCX files are ZIP archives with specific structure
    const zipSignature = buffer.subarray(0, 4)
    return zipSignature.toString('hex') === '504b0304'
  }
}

/**
 * DOC Document Processor (Legacy Word format)
 * Uses textract library for DOC extraction
 */
export class DOCProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/msword']
  supportedExtensions = ['.doc']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    // Временно отключено из-за проблем с textract в Next.js
    throw new Error(
      'DOC format is temporarily disabled due to compatibility issues with Next.js'
    )
  }

  validateFile(buffer: Buffer): boolean {
    // DOC files start with OLE signature
    const signature = buffer.subarray(0, 8).toString('hex')
    return signature === 'd0cf11e0a1b11ae1'
  }
}

/**
 * Document Processor Factory
 * Creates appropriate processor based on file type
 */
export class DocumentProcessorFactory {
  private processors: DocumentProcessor[] = [
    new PDFProcessor(), // ✅ Включён обратно с фиксом динамического импорта
    new TXTProcessor(), // ✅ Включён обратно - простой UTF-8 декодинг
    new FB2Processor(),
    new EPUBProcessor(),
    new DOCXProcessor(),
    // new DOCProcessor(), // Временно отключено из-за проблем с textract в Next.js
  ]

  /**
   * Get processor for a specific file
   * @param fileName - Name of the file
   * @param mimeType - MIME type (optional)
   * @returns DocumentProcessor or null if not supported
   */
  getProcessor(fileName: string, mimeType?: string): DocumentProcessor | null {
    const extension = path.extname(fileName).toLowerCase()

    // First try MIME type matching
    if (mimeType) {
      const processor = this.processors.find((p) =>
        p.supportedMimeTypes.includes(mimeType)
      )
      if (processor) return processor
    }

    // Then try extension matching
    const processor = this.processors.find((p) =>
      p.supportedExtensions.includes(extension)
    )

    return processor || null
  }

  /**
   * Get all supported file extensions
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    return this.processors.flatMap((p) => p.supportedExtensions)
  }

  /**
   * Get all supported MIME types
   * @returns Array of supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return this.processors.flatMap((p) => p.supportedMimeTypes)
  }

  /**
   * Check if file format is supported
   * @param fileName - Name of the file
   * @param mimeType - MIME type (optional)
   * @returns True if supported
   */
  isSupported(fileName: string, mimeType?: string): boolean {
    return this.getProcessor(fileName, mimeType) !== null
  }
}

// Export singleton instance
export const documentProcessorFactory = new DocumentProcessorFactory()

/**
 * Helper function to process a file with appropriate processor
 * @param filePath - Path to the file
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type (optional)
 * @returns Extracted text content
 */
export async function processDocumentFile(
  filePath: string,
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<{
  text: string
  processor: string
  format: string
}> {
  const processor = documentProcessorFactory.getProcessor(fileName, mimeType)

  if (!processor) {
    throw new Error(
      `Unsupported file format: ${fileName}. Supported formats: ${documentProcessorFactory
        .getSupportedExtensions()
        .join(', ')}`
    )
  }

  // Validate file
  if (!processor.validateFile(buffer)) {
    throw new Error(`Invalid or corrupted file: ${fileName}`)
  }

  // Extract text
  const text = await processor.extractText(filePath, buffer)

  if (!text.trim()) {
    throw new Error(`No text content found in file: ${fileName}`)
  }

  const format = path.extname(fileName).toLowerCase().substring(1)

  return {
    text: text.trim(),
    processor: processor.constructor.name,
    format,
  }
}
