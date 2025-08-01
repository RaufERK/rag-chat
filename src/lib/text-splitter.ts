import { FILE_CONFIG } from './file-config'

export interface TextChunk {
  content: string
  index: number
  start: number
  end: number
}

export class TextSplitter {
  /**
   * Разбивает текст на чанки с перекрытием - MEMORY PROTECTED
   */
  static splitText(text: string): TextChunk[] {
    // Memory protection: limit text size
    if (text.length > FILE_CONFIG.MAX_TEXT_LENGTH) {
      console.warn(
        `🚨 CRITICAL: Text too large (${text.length} chars), truncating to ${FILE_CONFIG.MAX_TEXT_LENGTH}`
      )
      text =
        text.substring(0, FILE_CONFIG.MAX_TEXT_LENGTH) +
        '\n\n[... текст обрезан для стабильной работы системы ...]'
    }

    const chunks: TextChunk[] = []
    const chunkSize = FILE_CONFIG.CHUNK_SIZE
    const overlap = FILE_CONFIG.CHUNK_OVERLAP

    let start = 0
    let index = 0

    while (
      start < text.length &&
      chunks.length < FILE_CONFIG.MAX_CHUNKS_PER_FILE
    ) {
      const end = Math.min(start + chunkSize, text.length)
      const content = text.slice(start, end)

      chunks.push({
        content,
        index,
        start,
        end,
      })

      start = end - overlap
      index++

      // Избегаем бесконечного цикла
      if (start >= text.length) break
    }

    console.log(`📝 TextSplitter created ${chunks.length} chunks`)
    return chunks
  }

  /**
   * Разбивает текст по предложениям с учетом максимального размера
   */
  static splitBySentences(text: string): TextChunk[] {
    const chunks: TextChunk[] = []
    const maxChunkSize = FILE_CONFIG.CHUNK_SIZE

    // Разбиваем на предложения
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    let currentChunk = ''
    let start = 0
    let index = 0

    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence + '.'

      // Если добавление предложения превысит лимит
      if (
        currentChunk.length + sentenceWithPunctuation.length > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          content: currentChunk.trim(),
          index,
          start,
          end: start + currentChunk.length,
        })

        currentChunk = sentenceWithPunctuation
        start += currentChunk.length
        index++
      } else {
        currentChunk += sentenceWithPunctuation
      }
    }

    // Добавляем последний чанк
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index,
        start,
        end: start + currentChunk.length,
      })
    }

    return chunks
  }

  /**
   * Разбивает текст по абзацам
   */
  static splitByParagraphs(text: string): TextChunk[] {
    const chunks: TextChunk[] = []
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

    let start = 0

    paragraphs.forEach((paragraph, index) => {
      const trimmedParagraph = paragraph.trim()

      chunks.push({
        content: trimmedParagraph,
        index,
        start,
        end: start + paragraph.length,
      })

      start += paragraph.length + 2 // +2 для \n\n
    })

    return chunks
  }

  /**
   * Умная разбивка текста (комбинирует разные методы)
   */
  static smartSplit(text: string): TextChunk[] {
    // Если текст короткий, возвращаем как есть
    if (text.length <= FILE_CONFIG.CHUNK_SIZE) {
      return [
        {
          content: text,
          index: 0,
          start: 0,
          end: text.length,
        },
      ]
    }

    // Сначала пробуем разбить по предложениям
    const sentenceChunks = this.splitBySentences(text)

    // Если получилось слишком много маленьких чанков, объединяем их
    const mergedChunks: TextChunk[] = []
    let currentChunk = ''
    let currentStart = 0
    let index = 0

    for (const chunk of sentenceChunks) {
      if (
        currentChunk.length + chunk.content.length <=
        FILE_CONFIG.CHUNK_SIZE
      ) {
        currentChunk += (currentChunk ? ' ' : '') + chunk.content
      } else {
        if (currentChunk) {
          mergedChunks.push({
            content: currentChunk,
            index,
            start: currentStart,
            end: currentStart + currentChunk.length,
          })
          index++
        }
        currentChunk = chunk.content
        currentStart = chunk.start
      }
    }

    // Добавляем последний чанк
    if (currentChunk) {
      mergedChunks.push({
        content: currentChunk,
        index,
        start: currentStart,
        end: currentStart + currentChunk.length,
      })
    }

    return mergedChunks
  }

  /**
   * Очищает текст от лишних пробелов и символов
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .replace(/\n\s*\n/g, '\n\n') // Нормализуем переносы строк
      .trim()
  }
}
