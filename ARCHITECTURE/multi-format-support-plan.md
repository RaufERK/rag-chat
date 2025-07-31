# 📄 Multi-Format File Support Plan

## 🎯 Цель: Поддержка множественных форматов документов

Расширить RAG систему для работы с различными форматами файлов: PDF, TXT, FB2, EPUB, DOC, DOCX.

## 🔍 Текущее состояние

### **Что поддерживается сейчас:**
- ✅ **PDF** - через `pdf-parse` библиотеку
- ❌ **TXT** - не обрабатывается как отдельный формат
- ❌ **FB2** - не поддерживается 
- ❌ **EPUB** - не поддерживается
- ❌ **DOC** - не поддерживается
- ❌ **DOCX** - не поддерживается

### **Проблемы:**
- Ограниченность только PDF форматом
- Много духовной литературы в FB2/EPUB форматах
- Пользователи хотят загружать Word документы
- Простые TXT файлы не обрабатываются оптимально

## 📚 Анализ форматов и библиотеки

### **📄 PDF (уже работает)**
```typescript
import pdfParse from 'pdf-parse'
// Текущая реализация остается
```

### **📝 TXT - Plain Text**
```typescript
// Простое чтение файла
const content = await fs.readFile(filePath, 'utf-8')
// Требует улучшенного chunking для больших файлов
```

### **📖 FB2 - FictionBook Format**
```bash
npm install xml2js
```
```typescript
import xml2js from 'xml2js'

// FB2 - это XML формат для электронных книг
// Структура: <FictionBook><body><section><p>text</p></section></body></FictionBook>
const extractTextFromFB2 = async (buffer: Buffer): Promise<string> => {
  const xml = buffer.toString('utf-8')
  const parser = new xml2js.Parser()
  const result = await parser.parseStringPromise(xml)
  
  // Извлекаем текст из всех параграфов
  const extractTextFromNode = (node: any): string => {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(extractTextFromNode).join(' ')
    if (node.p) return extractTextFromNode(node.p)
    if (node.section) return extractTextFromNode(node.section)
    return ''
  }
  
  return extractTextFromNode(result.FictionBook?.body)
}
```

### **📚 EPUB - Electronic Publication**
```bash
npm install epub2
```
```typescript
import EPub from 'epub2'

const extractTextFromEPUB = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath)
    epub.on('end', () => {
      const chapters = epub.flow.map(chapter => chapter.id)
      let fullText = ''
      
      let processedChapters = 0
      chapters.forEach(chapterId => {
        epub.getChapter(chapterId, (error, text) => {
          if (error) return reject(error)
          
          // Удаляем HTML теги
          const cleanText = text.replace(/<[^>]*>/g, '').trim()
          fullText += cleanText + '\n\n'
          
          processedChapters++
          if (processedChapters === chapters.length) {
            resolve(fullText)
          }
        })
      })
    })
    
    epub.on('error', reject)
    epub.parse()
  })
}
```

### **📄 DOCX - Microsoft Word (новый формат)**
```bash
npm install mammoth
```
```typescript
import mammoth from 'mammoth'

const extractTextFromDOCX = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
```

### **📄 DOC - Microsoft Word (старый формат)**
```bash
npm install textract
```
```typescript
import textract from 'textract'

const extractTextFromDOC = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, (error, text) => {
      if (error) return reject(error)
      resolve(text)
    })
  })
}
```

## 📋 План реализации

### **Phase 1: Универсальный Document Processor (2-3 дня)**

#### 1.1 Установка зависимостей
```bash
npm install xml2js epub2 mammoth textract
npm install @types/xml2js @types/textract
```

#### 1.2 Создание универсального экстрактора
```typescript
// src/lib/document-processors.ts
export interface DocumentProcessor {
  supportedMimeTypes: string[]
  supportedExtensions: string[]
  extractText(filePath: string, buffer: Buffer): Promise<string>
  validateFile(buffer: Buffer): boolean
}

export class PDFProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/pdf']
  supportedExtensions = ['.pdf']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    const pdfData = await pdfParse(buffer)
    return pdfData.text
  }
  
  validateFile(buffer: Buffer): boolean {
    return buffer.subarray(0, 4).toString() === '%PDF'
  }
}

export class TXTProcessor implements DocumentProcessor {
  supportedMimeTypes = ['text/plain']
  supportedExtensions = ['.txt']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8')
  }
  
  validateFile(buffer: Buffer): boolean {
    // Проверяем, что это валидный UTF-8 текст
    try {
      buffer.toString('utf-8')
      return true
    } catch {
      return false
    }
  }
}

export class FB2Processor implements DocumentProcessor {
  supportedMimeTypes = ['application/x-fictionbook+xml', 'text/xml']
  supportedExtensions = ['.fb2']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    const xml = buffer.toString('utf-8')
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(xml)
    
    // Извлекаем метаданные
    const title = result.FictionBook?.description?.[0]?.['title-info']?.[0]?.['book-title']?.[0]
    const author = result.FictionBook?.description?.[0]?.['title-info']?.[0]?.author?.[0]
    
    // Извлекаем основной текст
    const bodyText = this.extractTextFromNode(result.FictionBook?.body)
    
    return `${title ? `Название: ${title}\n` : ''}${author ? `Автор: ${author['first-name']} ${author['last-name']}\n\n` : ''}${bodyText}`
  }
  
  private extractTextFromNode(node: any): string {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) return node.map(n => this.extractTextFromNode(n)).join(' ')
    if (node?.p) return this.extractTextFromNode(node.p)
    if (node?.section) return this.extractTextFromNode(node.section)
    if (node?.title) return this.extractTextFromNode(node.title) + '\n'
    return ''
  }
  
  validateFile(buffer: Buffer): boolean {
    const content = buffer.toString('utf-8', 0, 1000) // Проверяем первые 1000 байт
    return content.includes('<FictionBook') || content.includes('<?xml')
  }
}

export class EPUBProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/epub+zip']
  supportedExtensions = ['.epub']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    // EPUB - это ZIP архив, поэтому работаем с файлом напрямую
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath)
      
      epub.on('end', () => {
        const chapters = epub.flow.map(chapter => chapter.id)
        let fullText = ''
        let processedChapters = 0
        
        if (chapters.length === 0) {
          return resolve('')
        }
        
        chapters.forEach(chapterId => {
          epub.getChapter(chapterId, (error, text) => {
            if (error) {
              console.warn(`Failed to extract chapter ${chapterId}:`, error)
            } else {
              const cleanText = text.replace(/<[^>]*>/g, '').trim()
              if (cleanText) {
                fullText += cleanText + '\n\n'
              }
            }
            
            processedChapters++
            if (processedChapters === chapters.length) {
              resolve(fullText)
            }
          })
        })
      })
      
      epub.on('error', reject)
      epub.parse()
    })
  }
  
  validateFile(buffer: Buffer): boolean {
    // EPUB файлы начинаются с ZIP сигнатуры
    return buffer.subarray(0, 4).toString('hex') === '504b0304'
  }
}

export class DOCXProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  supportedExtensions = ['.docx']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  
  validateFile(buffer: Buffer): boolean {
    // DOCX файлы это ZIP архивы с определенной структурой
    return buffer.subarray(0, 4).toString('hex') === '504b0304'
  }
}

export class DOCProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/msword']
  supportedExtensions = ['.doc']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, (error, text) => {
        if (error) return reject(error)
        resolve(text || '')
      })
    })
  }
  
  validateFile(buffer: Buffer): boolean {
    // DOC файлы начинаются с OLE сигнатуры
    const signature = buffer.subarray(0, 8).toString('hex')
    return signature === 'd0cf11e0a1b11ae1'
  }
}

// Фабрика процессоров
export class DocumentProcessorFactory {
  private processors: DocumentProcessor[] = [
    new PDFProcessor(),
    new TXTProcessor(),
    new FB2Processor(),
    new EPUBProcessor(),
    new DOCXProcessor(),
    new DOCProcessor(),
  ]
  
  getProcessor(fileName: string, mimeType?: string): DocumentProcessor | null {
    const extension = path.extname(fileName).toLowerCase()
    
    // Сначала ищем по MIME типу
    if (mimeType) {
      const processor = this.processors.find(p => 
        p.supportedMimeTypes.includes(mimeType)
      )
      if (processor) return processor
    }
    
    // Затем по расширению файла
    const processor = this.processors.find(p => 
      p.supportedExtensions.includes(extension)
    )
    
    return processor || null
  }
  
  getSupportedExtensions(): string[] {
    return this.processors.flatMap(p => p.supportedExtensions)
  }
  
  getSupportedMimeTypes(): string[] {
    return this.processors.flatMap(p => p.supportedMimeTypes)
  }
}

export const documentProcessorFactory = new DocumentProcessorFactory()
```

#### 1.3 Обновленный file-processor
```typescript
// src/lib/file-processor-v3.ts (обновленная версия)
import { documentProcessorFactory } from './document-processors'
import { calculateFileHash, checkFileExists } from './file-hash'

export async function processUploadedFile(
  file: File, 
  uploadedBy: number
): Promise<{ 
  isDuplicate: boolean, 
  fileHash: string, 
  processedFileId?: number,
  format: string
}> {
  
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileHash = calculateFileHash(buffer)
  
  // Проверяем дубликат
  const existingFile = await getFileByHash(fileHash)
  if (existingFile) {
    return {
      isDuplicate: true,
      fileHash,
      processedFileId: existingFile.id,
      format: existingFile.format
    }
  }
  
  // Определяем процессор для файла
  const processor = documentProcessorFactory.getProcessor(file.name, file.type)
  if (!processor) {
    throw new Error(`Unsupported file format: ${file.name}`)
  }
  
  // Валидируем файл
  if (!processor.validateFile(buffer)) {
    throw new Error(`Invalid file format or corrupted file: ${file.name}`)
  }
  
  const format = path.extname(file.name).toLowerCase().substring(1)
  
  // Записываем в БД
  const db = await database
  const result = await db.run(`
    INSERT INTO processed_files (
      file_hash, original_filename, file_size, mime_type, 
      processing_status, uploaded_by, format, metadata_json
    ) VALUES (?, ?, ?, ?, 'processing', ?, ?, ?)
  `, [
    fileHash, 
    file.name, 
    buffer.length, 
    file.type, 
    uploadedBy, 
    format,
    JSON.stringify({ processor: processor.constructor.name })
  ])
  
  const processedFileId = result.lastID as number
  
  try {
    // Создаем временный файл
    const tempDir = path.join(process.cwd(), 'temp', 'processing', crypto.randomUUID())
    await fs.mkdir(tempDir, { recursive: true })
    const tempFilePath = path.join(tempDir, file.name)
    await fs.writeFile(tempFilePath, buffer)
    
    const startTime = Date.now()
    
    // Извлекаем текст используя соответствующий процессор
    const extractedText = await processor.extractText(tempFilePath, buffer)
    
    if (!extractedText.trim()) {
      throw new Error('No text content extracted from file')
    }
    
    // Создаем chunks
    const chunks = await createTextChunks(extractedText, {
      chunkSize: 1000,
      chunkOverlap: 200,
      format: format
    })
    
    // Создаем эмбеддинги
    const embedResults = await createEmbeddingsForChunks(chunks, processedFileId, {
      format,
      originalFileName: file.name
    })
    
    const processingTime = Date.now() - startTime
    
    // Обновляем статус
    await db.run(`
      UPDATE processed_files 
      SET processing_status = 'completed',
          chunks_created = ?,
          embeddings_created = ?,
          processing_time_ms = ?,
          processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [chunks.length, embedResults.length, processingTime, processedFileId])
    
    // Удаляем временный файл
    await fs.rm(tempDir, { recursive: true, force: true })
    
    return {
      isDuplicate: false,
      fileHash,
      processedFileId,
      format
    }
    
  } catch (error) {
    // Обработка ошибок и очистка
    await db.run(`
      UPDATE processed_files 
      SET processing_status = 'failed',
          error_message = ?
      WHERE id = ?
    `, [error.message, processedFileId])
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {}
    
    throw error
  }
}

// Улучшенная функция создания chunks с учетом формата
async function createTextChunks(text: string, options: {
  chunkSize: number,
  chunkOverlap: number,
  format: string
}): Promise<string[]> {
  
  // Для разных форматов используем разные стратегии разбивки
  switch (options.format) {
    case 'fb2':
    case 'epub':
      // Для книг разбиваем по главам/разделам
      return splitByChapters(text, options)
      
    case 'docx':
    case 'doc':
      // Для документов разбиваем по параграфам
      return splitByParagraphs(text, options)
      
    default:
      // Стандартная разбивка для PDF и TXT
      return splitByTokens(text, options)
  }
}

function splitByChapters(text: string, options: any): string[] {
  // Ищем разделители глав
  const chapterMarkers = [
    /\n\s*Глава\s+\d+/gi,
    /\n\s*ГЛАВА\s+\d+/gi,
    /\n\s*Chapter\s+\d+/gi,
    /\n\s*\d+\.\s*$/gm
  ]
  
  let chapters = [text]
  
  for (const marker of chapterMarkers) {
    const newChapters = []
    for (const chapter of chapters) {
      newChapters.push(...chapter.split(marker))
    }
    chapters = newChapters.filter(c => c.trim().length > 100) // Минимум 100 символов
  }
  
  // Если главы слишком большие, дополнительно разбиваем
  return chapters.flatMap(chapter => 
    chapter.length > options.chunkSize * 2 
      ? splitByTokens(chapter, options)
      : [chapter]
  )
}

function splitByParagraphs(text: string, options: any): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50)
  const chunks = []
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > options.chunkSize) {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function splitByTokens(text: string, options: any): string[] {
  // Существующая логика разбивки
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > options.chunkSize) {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence
    }
  }
  
  if (currentChunk) chunks.push(currentChunk)
  return chunks
}
```

### **Phase 2: Обновление UI и валидации (1-2 дня)**

#### 2.1 Обновление компонента загрузки файлов
```typescript
// src/components/admin/FileUploadForm.tsx
'use client'

import { useState } from 'react'
import { documentProcessorFactory } from '@/lib/document-processors'

export function FileUploadForm() {
  const [dragActive, setDragActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  
  const supportedExtensions = documentProcessorFactory.getSupportedExtensions()
  const supportedMimeTypes = documentProcessorFactory.getSupportedMimeTypes()

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!supportedExtensions.includes(extension)) {
      return `Неподдерживаемый формат файла. Поддерживаются: ${supportedExtensions.join(', ')}`
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB лимит
      return 'Файл слишком большой. Максимальный размер: 50MB'
    }
    
    return null
  }

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      alert(validationError)
      return
    }
    
    setUploadStatus('uploading')
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setUploadStatus('success')
        if (result.isDuplicate) {
          alert(`Файл уже был загружен ранее (формат: ${result.format})`)
        } else {
          alert(`Файл успешно обработан (формат: ${result.format})`)
        }
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      setUploadStatus('error')
      alert(`Ошибка загрузки: ${error.message}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <p><strong>Поддерживаемые форматы:</strong></p>
        <div className="flex flex-wrap gap-2 mt-2">
          {supportedExtensions.map(ext => (
            <span key={ext} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {ext.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFileUpload(file)
        }}
      >
        <input
          type="file"
          accept={supportedMimeTypes.join(',')}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            <div>
              <p className="text-lg font-medium">Перетащите файл сюда или нажмите для выбора</p>
              <p className="text-sm text-gray-500">
                PDF, TXT, FB2, EPUB, DOC, DOCX до 50MB
              </p>
            </div>
          </div>
        </label>
        
        {uploadStatus === 'uploading' && (
          <div className="mt-4">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Обработка файла...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

#### 2.2 Статистика по форматам файлов
```typescript
// src/app/api/admin/files/stats-by-format/route.ts
export async function GET() {
  const db = await database
  
  const formatStats = await db.all(`
    SELECT 
      format,
      COUNT(*) as count,
      SUM(file_size) as total_size,
      AVG(processing_time_ms) as avg_processing_time,
      SUM(chunks_created) as total_chunks,
      COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as successful,
      COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed
    FROM processed_files 
    GROUP BY format
    ORDER BY count DESC
  `)
  
  return NextResponse.json({
    formats: formatStats.map(stat => ({
      ...stat,
      total_size_mb: Math.round(stat.total_size / 1024 / 1024 * 100) / 100,
      success_rate: stat.count > 0 ? Math.round(stat.successful / stat.count * 100) : 0
    }))
  })
}
```

### **Phase 3: LangChain.js интеграция с мульти-форматом (1-2 дня)**

#### 3.1 Document Loaders для LangChain
```typescript
// src/lib/langchain/document-loaders.ts
import { Document } from "langchain/document"
import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { documentProcessorFactory } from '../document-processors'

export class MultiFormatLoader extends BaseDocumentLoader {
  constructor(
    private filePath: string,
    private buffer: Buffer,
    private fileName: string,
    private mimeType?: string
  ) {
    super()
  }

  async load(): Promise<Document[]> {
    const processor = documentProcessorFactory.getProcessor(this.fileName, this.mimeType)
    
    if (!processor) {
      throw new Error(`Unsupported file format: ${this.fileName}`)
    }

    const text = await processor.extractText(this.filePath, this.buffer)
    
    const format = path.extname(this.fileName).toLowerCase().substring(1)
    
    return [
      new Document({
        pageContent: text,
        metadata: {
          source: this.fileName,
          format: format,
          size: this.buffer.length,
          processor: processor.constructor.name,
          extractedAt: new Date().toISOString()
        }
      })
    ]
  }
}

// Использование в обработке файлов
export async function createDocumentFromFile(
  filePath: string, 
  buffer: Buffer, 
  fileName: string, 
  mimeType?: string
): Promise<Document[]> {
  const loader = new MultiFormatLoader(filePath, buffer, fileName, mimeType)
  return await loader.load()
}
```

## 📊 Ожидаемые результаты

### **📚 Расширение контента:**
- **+500% форматов** - поддержка 6 типов файлов вместо 1
- **📖 Духовная литература** - FB2/EPUB форматы популярны в этой области
- **📄 Офисные документы** - DOC/DOCX для деловой документации
- **📝 Простые тексты** - TXT файлы для заметок и выписок

### **🔧 Техническая надежность:**
- **Валидация форматов** - проверка целостности файлов
- **Универсальная архитектура** - легко добавить новые форматы
- **Оптимизированный chunking** - разные стратегии для разных типов
- **Детальная аналитика** - статистика по форматам

### **👤 Пользовательский опыт:**
- **Drag & Drop** для всех форматов
- **Визуальная индикация** поддерживаемых типов
- **Понятные ошибки** при загрузке неподдерживаемых файлов
- **Прогресс обработки** для каждого формата

## ✅ Критерии готовности

- [ ] Все 6 форматов корректно обрабатываются
- [ ] Валидация предотвращает загрузку некорректных файлов
- [ ] UI показывает поддерживаемые форматы
- [ ] Статистика доступна по каждому формату
- [ ] LangChain.js интегрирован с мульти-форматными загрузчиками
- [ ] Производительность оптимизирована для больших файлов

## 🔮 Будущие расширения

### **Планируемые форматы:**
- **RTF** - Rich Text Format
- **ODT** - OpenDocument Text
- **HTML** - веб-страницы
- **MD** - Markdown файлы
- **CSV/XLSX** - табличные данные с текстовыми колонками

### **Улучшения обработки:**
- **OCR для сканированных PDF** - извлечение текста из изображений
- **Обработка таблиц** - сохранение структуры данных
- **Извлечение метаданных** - автор, дата создания, теги
- **Многоязычная поддержка** - определение языка документа

---
*Multi-format support превращает RAG систему в универсальный инструмент для работы с любым контентом.*