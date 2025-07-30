import fs from 'fs/promises'
import path from 'path'
import pdf from 'pdf-parse'
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
      // Читаем файл
      const dataBuffer = await fs.readFile(filePath)
      
      // Парсим PDF
      const pdfData = await pdf(dataBuffer)
      
      // Очищаем текст
      const cleanText = TextSplitter.cleanText(pdfData.text)
      
      // Разбиваем на чанки
      const chunks = TextSplitter.smartSplit(cleanText)
      
      // Извлекаем метаданные
      const metadata = {
        pages: pdfData.numpages,
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        subject: pdfData.info?.Subject,
        keywords: pdfData.info?.Keywords ? pdfData.info.Keywords.split(',').map(k => k.trim()) : undefined
      }
      
      return {
        text: cleanText,
        chunks: chunks.map(chunk => ({
          content: chunk.content,
          index: chunk.index
        })),
        metadata
      }
    } catch (error) {
      throw new Error(`Ошибка обработки PDF файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
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
        chunks: chunks.map(chunk => ({
          content: chunk.content,
          index: chunk.index
        })),
        metadata: {}
      }
    } catch (error) {
      throw new Error(`Ошибка обработки текстового файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  /**
   * Обрабатывает файл в зависимости от его типа
   */
  static async processFile(filePath: string, mimeType: string): Promise<ProcessedFile> {
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/epub+zip': '.epub',
      'application/x-fictionbook+xml': '.fb2'
    }
    
    return extensions[mimeType] || ''
  }

  /**
   * Валидирует содержимое файла
   */
  static validateFileContent(filePath: string, mimeType: string): { valid: boolean; error?: string } {
    try {
      // Проверяем размер файла
      const stats = fs.statSync(filePath)
      
      if (stats.size === 0) {
        return { valid: false, error: 'Файл пустой' }
      }
      
      // Дополнительные проверки для PDF
      if (mimeType === 'application/pdf') {
        const buffer = fs.readFileSync(filePath)
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