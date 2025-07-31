import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { TextSplitter } from './text-splitter'
import { FILE_CONFIG } from './file-config'
import {
  processDocumentFile,
  documentProcessorFactory,
} from './document-processors'

export interface ProcessedFileV2 {
  text: string
  chunks: Array<{
    content: string
    index: number
  }>
  metadata: {
    format: string
    processor: string
    originalSize: number
    pages?: number
    title?: string
    author?: string
    subject?: string
    keywords?: string[]
  }
  hash: string
}

/**
 * Enhanced File Processor with Multi-Format Support
 * Supports PDF, TXT, FB2, EPUB, DOC, DOCX
 */
export class MultiFormatFileProcessor {
  constructor() {
    // TextSplitter использует статические методы, конфигурация берется из FILE_CONFIG
  }

  /**
   * Process any supported file format
   * @param filePath - Path to the file
   * @param fileName - Original file name
   * @param mimeType - MIME type (optional)
   * @returns ProcessedFileV2 with text, chunks, and metadata
   */
  async processFile(
    filePath: string,
    fileName: string,
    mimeType?: string
  ): Promise<ProcessedFileV2> {
    try {
      console.log(`🔄 Processing file: ${fileName}`)

      // Check if file format is supported
      if (!documentProcessorFactory.isSupported(fileName, mimeType)) {
        const supportedFormats =
          documentProcessorFactory.getSupportedExtensions()
        throw new Error(
          `Unsupported file format: ${fileName}. Supported formats: ${supportedFormats.join(
            ', '
          )}`
        )
      }

      // Check if file exists and is accessible
      try {
        await fs.access(filePath)
        console.log(`✅ File accessible: ${fileName}`)
      } catch (accessError) {
        throw new Error(`File not found or inaccessible: ${filePath}`)
      }

      // Read file buffer
      const buffer = await fs.readFile(filePath)
      console.log(`📖 File read: ${buffer.length} bytes`)

      // Calculate file hash
      const hash = this.calculateFileHash(buffer)
      console.log(`🔐 File hash: ${hash}`)

      // Process document based on format
      const { text, processor, format } = await processDocumentFile(
        filePath,
        buffer,
        fileName,
        mimeType
      )

      console.log(
        `✅ Text extracted: ${text.length} characters using ${processor}`
      )

      if (!text.trim()) {
        throw new Error(`No text content extracted from file: ${fileName}`)
      }

      // Create chunks using smart chunking strategy
      const chunks = await this.createSmartChunks(text, format)
      console.log(`📝 Created ${chunks.length} chunks`)

      // Build metadata
      const metadata = {
        format,
        processor,
        originalSize: buffer.length,
        title: this.extractTitle(text, format),
        // Add more metadata extraction based on format
        ...(format === 'pdf' && { pages: this.estimatePages(text) }),
      }

      return {
        text,
        chunks,
        metadata,
        hash,
      }
    } catch (error) {
      console.error(`❌ Error processing file ${fileName}:`, error)
      throw new Error(`File processing failed: ${error.message}`)
    }
  }

  /**
   * Smart chunking strategy based on file format
   * Different strategies for different document types
   */
  private async createSmartChunks(
    text: string,
    format: string
  ): Promise<Array<{ content: string; index: number }>> {
    switch (format) {
      case 'fb2':
      case 'epub':
        // For books, try to split by chapters/sections
        return this.chunkByChapters(text)

      case 'docx':
      case 'doc':
        // For documents, split by paragraphs
        return this.chunkByParagraphs(text)

      case 'pdf':
      case 'txt':
      default:
        // Standard splitting for PDF and TXT
        return this.chunkByTokens(text)
    }
  }

  /**
   * Split text by chapters for books (FB2, EPUB) - MEMORY OPTIMIZED
   */
  private chunkByChapters(
    text: string
  ): Array<{ content: string; index: number }> {
    // AGGRESSIVE: For EPUB/FB2 always use token-based chunking with hard limits
    if (text.length > 30000) {
      // 30KB limit - very conservative
      console.warn(
        `⚠️ Large EPUB/FB2 file (${text.length} chars), using token-based chunking to prevent OpenAI token limit issues`
      )

      // AGGRESSIVE TRUNCATION: Hard limit at 80KB to prevent crashes
      if (text.length > 80000) {
        // 80KB absolute limit
        console.warn(
          `🚨 CRITICAL: File too large (${text.length} chars), truncating to 80KB to prevent server crash`
        )
        text =
          text.substring(0, 80000) +
          '\n\n[... файл обрезан из-за большого размера для стабильной работы ...]'
      }

      return this.chunkByTokens(text)
    }

    // Look for chapter markers
    const chapterMarkers = [
      /\n\s*Глава\s+\d+/gi,
      /\n\s*ГЛАВА\s+\d+/gi,
      /\n\s*Chapter\s+\d+/gi,
      /\n\s*\d+\.\s*\n/gm,
    ]

    let chapters = [text]

    // Try to split by chapter markers (optimized)
    for (const marker of chapterMarkers) {
      const newChapters = []
      for (const chapter of chapters) {
        // More efficient splitting
        const matches = Array.from(chapter.matchAll(marker))
        if (matches.length > 0) {
          let lastIndex = 0
          for (const match of matches) {
            // Add text before the match
            if (match.index > lastIndex) {
              const beforeText = chapter.substring(lastIndex, match.index)
              if (beforeText.trim().length > 100) {
                newChapters.push(beforeText)
              }
            }
            lastIndex = match.index
          }
          // Add remaining text after last match
          const remainingText = chapter.substring(lastIndex)
          if (remainingText.trim().length > 100) {
            newChapters.push(remainingText)
          }
        } else {
          newChapters.push(chapter)
        }
      }
      chapters = newChapters.filter((c) => c.trim().length > 100) // Minimum 100 chars
    }

    // If chapters are too large, split them more carefully
    const finalChunks = []
    let chunkIndex = 0

    for (const chapter of chapters) {
      if (chapter.length > FILE_CONFIG.chunkSize * 3) {
        // Very large chapter - use paragraph splitting first
        const paragraphs = chapter
          .split(/\n\s*\n/)
          .filter((p) => p.trim().length > 50)
        let currentChunk = ''

        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length > FILE_CONFIG.chunkSize) {
            if (currentChunk.trim()) {
              finalChunks.push({
                content: currentChunk.trim(),
                index: chunkIndex++,
              })
            }
            currentChunk = paragraph
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph
          }
        }

        if (currentChunk.trim()) {
          finalChunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
          })
        }
      } else {
        finalChunks.push({ content: chapter.trim(), index: chunkIndex++ })
      }
    }

    return finalChunks.length > 0 ? finalChunks : this.chunkByTokens(text)
  }

  /**
   * Split text by paragraphs for documents (DOCX, DOC)
   */
  private chunkByParagraphs(
    text: string
  ): Array<{ content: string; index: number }> {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 50) // Minimum 50 chars per paragraph

    const chunks = []
    let currentChunk = ''

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > FILE_CONFIG.chunkSize) {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunks.length,
          })
        }
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunks.length,
      })
    }

    return chunks.length > 0 ? chunks : this.chunkByTokens(text)
  }

  /**
   * Standard token-based splitting for PDF and TXT
   */
  private chunkByTokens(
    text: string
  ): Array<{ content: string; index: number }> {
    const chunks = TextSplitter.splitText(text)
    return chunks.map((chunk) => ({
      content: chunk.content.trim(),
      index: chunk.index,
    }))
  }

  /**
   * Calculate SHA-256 hash of file content
   */
  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Extract title from document text based on format
   */
  private extractTitle(text: string, format: string): string | undefined {
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length === 0) return undefined

    // For books, first non-empty line is often the title
    if (format === 'fb2' || format === 'epub') {
      // Look for "Название:" pattern first
      for (const line of lines.slice(0, 10)) {
        if (line.includes('Название:')) {
          return line.replace('Название:', '').trim()
        }
      }
      // Fallback to first substantial line
      return lines.find((line) => line.length > 5 && line.length < 100)
    }

    // For documents, first line is usually title
    if (format === 'docx' || format === 'doc') {
      return lines[0]?.length < 100 ? lines[0] : undefined
    }

    // For PDF and TXT, try to find a title-like line
    for (const line of lines.slice(0, 5)) {
      if (line.length > 5 && line.length < 100 && !line.includes('.')) {
        return line
      }
    }

    return undefined
  }

  /**
   * Estimate number of pages for PDF-like content
   */
  private estimatePages(text: string): number {
    // Rough estimate: 500 words per page
    const words = text.split(/\s+/).length
    return Math.ceil(words / 500)
  }

  /**
   * Get supported file formats
   */
  static getSupportedFormats(): {
    extensions: string[]
    mimeTypes: string[]
  } {
    return {
      extensions: documentProcessorFactory.getSupportedExtensions(),
      mimeTypes: documentProcessorFactory.getSupportedMimeTypes(),
    }
  }

  /**
   * Check if file format is supported
   */
  static isFormatSupported(fileName: string, mimeType?: string): boolean {
    return documentProcessorFactory.isSupported(fileName, mimeType)
  }
}

// Export singleton instance
export const multiFormatProcessor = new MultiFormatFileProcessor()

/**
 * Helper function to process file with error handling
 */
export async function processMultiFormatFile(
  filePath: string,
  fileName: string,
  mimeType?: string
): Promise<ProcessedFileV2> {
  return await multiFormatProcessor.processFile(filePath, fileName, mimeType)
}
