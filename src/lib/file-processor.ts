import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { TextSplitter } from './text-splitter'
import { FILE_CONFIG } from './file-config'

export interface ProcessedFile {
  text: string
  chunks: Array<{
    content: string
    index: number
  }>
  metadata: {
    pages?: number
    title?: string
    author?: string
    subject?: string
    keywords?: string[]
  }
}

export class FileProcessor {
  /**
   * Обрабатывает PDF файл
   */
  static async processPDF(filePath: string): Promise<ProcessedFile> {
    try {
      console.log(`[PDF] Начинаем обработку PDF файла: ${filePath}`)

      // Проверяем существование файла
      try {
        await fs.access(filePath)
        console.log(`[PDF] Файл существует и доступен для чтения`)
      } catch (accessError) {
        throw new Error(`Файл не найден или недоступен: ${filePath}`)
      }

      // Импортируем pdf2json
      const PDFParser = (await import('pdf2json')).default
      console.log(`[PDF] pdf2json успешно импортирован`)

      // Читаем файл
      console.log(`[PDF] Читаем файл...`)
      const dataBuffer = await fs.readFile(filePath)
      console.log(
        `[PDF] Файл прочитан, размер буфера: ${dataBuffer.length} байт`
      )

      // Создаем парсер
      const pdfParser = new PDFParser()
      console.log(`[PDF] Создан парсер pdf2json`)

      // Парсим PDF
      console.log(`[PDF] Начинаем парсинг PDF...`)
      const pdfData = (await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          console.log(`[PDF] PDF успешно распарсен`)
          resolve(pdfData)
        })

        pdfParser.on('pdfParser_dataError', (errData) => {
          console.error(`[PDF] Ошибка парсинга:`, errData)
          reject(new Error(`Ошибка парсинга PDF: ${errData.parserError}`))
        })

        pdfParser.parseBuffer(dataBuffer)
      })) as any

      console.log(`[PDF] PDF содержит ${pdfData.Pages.length} страниц`)

      // Извлекаем текст со всех страниц
      let fullText = ''
      const metadata: any = {
        pages: pdfData.Pages.length,
      }

      console.log(`[PDF] Извлекаем текст со всех страниц...`)

      for (let pageIndex = 0; pageIndex < pdfData.Pages.length; pageIndex++) {
        const page = pdfData.Pages[pageIndex]
        console.log(
          `[PDF] Обрабатываем страницу ${pageIndex + 1}/${pdfData.Pages.length}`
        )

        // Извлекаем текст со страницы
        const pageText = page.Texts.map((text: any) => {
          // Декодируем текст (pdf2json использует специальное кодирование)
          return decodeURIComponent(text.R[0].T)
        }).join(' ')

        fullText += pageText + '\n'
      }

      console.log(`[PDF] Текст извлечен, длина: ${fullText.length} символов`)

      // Очищаем текст
      const cleanText = TextSplitter.cleanText(fullText)
      console.log(`[PDF] Текст очищен, длина: ${cleanText.length} символов`)

      // Разбиваем на чанки
      const chunks = TextSplitter.smartSplit(cleanText)
      console.log(`[PDF] Текст разбит на ${chunks.length} чанков`)

      // Пытаемся получить метаданные
      if (pdfData.Meta) {
        metadata.title = pdfData.Meta.Title
        metadata.author = pdfData.Meta.Author
        metadata.subject = pdfData.Meta.Subject
        metadata.keywords = pdfData.Meta.Keywords
      }

      console.log(`[PDF] Метаданные извлечены:`, metadata)

      return {
        text: cleanText,
        chunks: chunks.map((chunk) => ({
          content: chunk.content,
          index: chunk.index,
        })),
        metadata,
      }
    } catch (error) {
      console.error(`[PDF] Ошибка при обработке PDF:`, error)
      throw new Error(
        `Ошибка обработки PDF файла: ${
          error instanceof Error ? error.message : 'Неизвестная ошибка'
        }`
      )
    }
  }

  /**
   * Обрабатывает текстовый файл
   */
  static async processTextFile(filePath: string): Promise<ProcessedFile> {
    try {
      // Читаем файл
      const text = await fs.readFile(filePath, 'utf-8')

      // Очищаем текст
      const cleanText = TextSplitter.cleanText(text)

      // Разбиваем на чанки
      const chunks = TextSplitter.smartSplit(cleanText)

      return {
        text: cleanText,
        chunks: chunks.map((chunk) => ({
          content: chunk.content,
          index: chunk.index,
        })),
        metadata: {},
      }
    } catch (error) {
      throw new Error(
        `Ошибка обработки текстового файла: ${
          error instanceof Error ? error.message : 'Неизвестная ошибка'
        }`
      )
    }
  }

  /**
   * Обрабатывает файл в зависимости от его типа
   */
  static async processFile(
    filePath: string,
    mimeType: string
  ): Promise<ProcessedFile> {
    switch (mimeType) {
      case 'application/pdf':
        return await this.processPDF(filePath)

      case 'text/plain':
        return await this.processTextFile(filePath)

      // TODO: Добавить поддержку других форматов
      // case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      //   return await this.processDOCX(filePath)

      default:
        throw new Error(`Неподдерживаемый тип файла: ${mimeType}`)
    }
  }

  /**
   * Проверяет, поддерживается ли тип файла
   */
  static isSupportedFileType(mimeType: string): boolean {
    return FILE_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any)
  }

  /**
   * Получает расширение файла по MIME типу
   */
  static getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/epub+zip': '.epub',
      'application/x-fictionbook+xml': '.fb2',
    }

    return extensions[mimeType] || ''
  }

  /**
   * Валидирует содержимое файла
   */
  static validateFileContent(
    filePath: string,
    mimeType: string
  ): { valid: boolean; error?: string } {
    try {
      // Проверяем размер файла
      const stats = fsSync.statSync(filePath)

      if (stats.size === 0) {
        return { valid: false, error: 'Файл пустой' }
      }

      // Дополнительные проверки для PDF
      if (mimeType === 'application/pdf') {
        const buffer = fsSync.readFileSync(filePath)
        if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
          return { valid: false, error: 'Файл не является корректным PDF' }
        }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Ошибка валидации файла' }
    }
  }
}
