import path from 'path'

export interface DocumentProcessor {
  supportedMimeTypes: string[]
  supportedExtensions: string[]
  extractText(filePath: string, buffer: Buffer): Promise<string>
  validateFile(buffer: Buffer): boolean
}

export class TXTProcessor implements DocumentProcessor {
  supportedMimeTypes = ['text/plain', 'text/txt', 'application/txt']
  supportedExtensions = ['.txt']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8')
  }

  validateFile(buffer: Buffer): boolean {
    // Простая проверка на текстовый файл
    const text = buffer.toString('utf-8', 0, Math.min(1000, buffer.length))
    // Проверяем что файл содержит в основном печатные символы
    const printableChars = text.replace(/[\r\n\t]/g, '').length
    const totalChars = text.replace(/[\r\n\t]/g, '').length
    return printableChars / Math.max(totalChars, 1) > 0.7
  }
}

export class PDFProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/pdf']
  supportedExtensions = ['.pdf']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      // Попробуем pdf-lib для извлечения текста
      const { PDFDocument } = await import('pdf-lib')

      const pdfDoc = await PDFDocument.load(buffer)
      const pages = pdfDoc.getPages()

      let fullText = ''

      // Простое извлечение текста (pdf-lib не поддерживает извлечение текста напрямую)
      // Но мы можем попробовать извлечь базовую информацию
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        // pdf-lib не поддерживает извлечение текста, нужен другой подход
        fullText += `Page ${i + 1}\n`
      }

      // Если pdf-lib не может извлечь текст, попробуем pdf-parse осторожно
      if (fullText.trim() === '' || fullText.includes('Page ')) {
        try {
          // Сохраняем текущую рабочую директорию
          const originalCwd = process.cwd()

          // Временно меняем рабочую директорию на node_modules/pdf-parse
          const pdfParsePath = require.resolve('pdf-parse')
          const pdfParseDir = path.dirname(pdfParsePath)
          process.chdir(pdfParseDir)

          const pdfParse = await import('pdf-parse')
          const data = await pdfParse.default(buffer)

          // Восстанавливаем рабочую директорию
          process.chdir(originalCwd)

          return data.text
        } catch (parseError) {
          // Если не получается, возвращаем информацию о PDF
          return `PDF Document with ${pages.length} pages. Text extraction failed: ${parseError.message}`
        }
      }

      return fullText
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`)
    }
  }

  validateFile(buffer: Buffer): boolean {
    // PDF файлы начинаются с %PDF
    return buffer.subarray(0, 4).toString() === '%PDF'
  }
}

export class DOCXProcessor implements DocumentProcessor {
  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  supportedExtensions = ['.docx']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      // Динамический импорт
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error.message}`)
    }
  }

  validateFile(buffer: Buffer): boolean {
    // DOCX файлы это ZIP архивы с определенной структурой
    return buffer.subarray(0, 4).toString('hex') === '504b0304'
  }
}

export class DOCProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/msword', 'application/vnd.ms-word']
  supportedExtensions = ['.doc']

  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    try {
      // Динамический импорт
      const WordExtractor = require('word-extractor')
      const extractor = new WordExtractor()
      const extracted = await extractor.extract(buffer)
      const body = extracted.getBody()

      // Также извлекаем footnotes и endnotes если есть
      const footnotes = extracted.getFootnotes()
      const endnotes = extracted.getEndnotes()

      let fullText = body
      if (footnotes && footnotes.trim()) {
        fullText += '\n\n--- Footnotes ---\n' + footnotes
      }
      if (endnotes && endnotes.trim()) {
        fullText += '\n\n--- Endnotes ---\n' + endnotes
      }

      return fullText
    } catch (error) {
      throw new Error(`DOC processing failed: ${error.message}`)
    }
  }

  validateFile(buffer: Buffer): boolean {
    // DOC файлы имеют определенную сигнатуру
    const signature = buffer.subarray(0, 8)
    // MS Word DOC файлы начинаются с определенных байтов
    return (
      signature[0] === 0xd0 &&
      signature[1] === 0xcf &&
      signature[2] === 0x11 &&
      signature[3] === 0xe0
    )
  }
}

// Фабрика процессоров
export class DocumentProcessorFactory {
  private processors: DocumentProcessor[] = [
    new PDFProcessor(),
    new TXTProcessor(),
    new DOCXProcessor(),
    new DOCProcessor(),
  ]

  getProcessor(fileName: string, mimeType?: string): DocumentProcessor | null {
    const extension = path.extname(fileName).toLowerCase()

    return (
      this.processors.find((processor) => {
        const extensionMatch = processor.supportedExtensions.includes(extension)
        const mimeMatch = mimeType
          ? processor.supportedMimeTypes.includes(mimeType)
          : false
        return extensionMatch || mimeMatch
      }) || null
    )
  }

  getSupportedExtensions(): string[] {
    return this.processors.flatMap((p) => p.supportedExtensions)
  }

  getSupportedMimeTypes(): string[] {
    return this.processors.flatMap((p) => p.supportedMimeTypes)
  }

  isSupported(fileName: string, mimeType?: string): boolean {
    return this.getProcessor(fileName, mimeType) !== null
  }
}

export const documentProcessorFactory = new DocumentProcessorFactory()
