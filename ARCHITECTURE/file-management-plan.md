# 🗃️ File Management Rework Plan

## 🎯 Цель: Умная работа с файлами без локального хранения

Перейти от хранения файлов к системе хеширования с автоматическим удалением после обработки.

## 🔍 Текущее состояние

### **Что сейчас происходит:**
```
📁 Upload → 💾 Store locally → 🔄 Process → 🗄️ Keep forever
```

**Проблемы:**
- ❌ Файлы накапливаются бесконечно (`uploads/` растет)
- ❌ Дублирование: один файл можно загрузить много раз
- ❌ Трата дискового пространства
- ❌ Сложность очистки и maintenance

### **Текущая структура:**
```
uploads/
├── 2025/07/30/           # Папки по датам
│   ├── file1.pdf
│   └── file2.pdf
├── temp/processing/      # Временные файлы
│   └── [uuid]/
└── backups/             # Резервные копии
```

## 🎯 Новая система: Hash-Based Deduplication

### **Новый flow:**
```
📁 Upload → 🔐 Hash → ❓ Exists? → 🔄 Process → 🗑️ Delete → 💾 Store hash only
```

### **Преимущества:**
- ✅ Нулевое дисковое пространство для файлов
- ✅ Автоматическая дедупликация
- ✅ Быстрая проверка дубликатов
- ✅ Простота обслуживания

## 📋 План реализации

### **Phase 1: Схема базы данных (1 день)**

#### 1.1 Новая таблица для хешей файлов
```sql
-- Таблица для отслеживания обработанных файлов
CREATE TABLE processed_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_hash TEXT UNIQUE NOT NULL,           -- SHA-256 хеш файла
  original_filename TEXT NOT NULL,          -- Оригинальное имя файла
  file_size INTEGER NOT NULL,               -- Размер в байтах
  mime_type TEXT NOT NULL,                  -- MIME тип файла
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- Метаданные обработки
  chunks_created INTEGER DEFAULT 0,         -- Количество созданных chunks
  embeddings_created INTEGER DEFAULT 0,     -- Количество эмбеддингов
  processing_time_ms INTEGER,               -- Время обработки в миллисекундах
  error_message TEXT,                       -- Сообщение об ошибке, если есть
  
  -- Аудит
  uploaded_by INTEGER REFERENCES users(id), -- Кто загрузил
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,                    -- Когда завершена обработка
  
  -- Дополнительные метаданные
  metadata_json TEXT,                       -- JSON с дополнительными данными
  
  UNIQUE(file_hash)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_processed_files_hash ON processed_files(file_hash);
CREATE INDEX idx_processed_files_status ON processed_files(processing_status);
CREATE INDEX idx_processed_files_uploaded_by ON processed_files(uploaded_by);
```

#### 1.2 Связанная таблица для chunks
```sql
-- Связь между файлами и их chunks в Qdrant
CREATE TABLE file_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  processed_file_id INTEGER REFERENCES processed_files(id) ON DELETE CASCADE,
  qdrant_point_id TEXT NOT NULL,            -- ID точки в Qdrant
  chunk_index INTEGER NOT NULL,             -- Порядковый номер chunk'а в файле
  chunk_text TEXT NOT NULL,                 -- Текст chunk'а
  chunk_size INTEGER NOT NULL,              -- Размер chunk'а в символах
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(processed_file_id, chunk_index)
);

CREATE INDEX idx_file_chunks_file_id ON file_chunks(processed_file_id);
CREATE INDEX idx_file_chunks_qdrant_id ON file_chunks(qdrant_point_id);
```

### **Phase 2: Новая логика обработки файлов (2-3 дня)**

#### 2.1 Утилиты для хеширования
```typescript
// src/lib/file-hash.ts
import crypto from 'crypto'

export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function checkFileExists(hash: string): Promise<boolean> {
  const db = await database
  const result = await db.get(
    'SELECT id FROM processed_files WHERE file_hash = ?',
    [hash]
  )
  return !!result
}

export async function getFileByHash(hash: string) {
  const db = await database
  return await db.get(`
    SELECT * FROM processed_files 
    WHERE file_hash = ? AND processing_status = 'completed'
  `, [hash])
}
```

#### 2.2 Обновленный процессор файлов
```typescript
// src/lib/file-processor-v2.ts
import { calculateFileHash, checkFileExists } from './file-hash'

export async function processUploadedFile(
  file: File, 
  uploadedBy: number
): Promise<{ 
  isDuplicate: boolean, 
  fileHash: string, 
  processedFileId?: number 
}> {
  
  // 1. Конвертируем в buffer и считаем хеш
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileHash = calculateFileHash(buffer)
  
  // 2. Проверяем, обрабатывался ли уже этот файл
  const existingFile = await getFileByHash(fileHash)
  if (existingFile) {
    return {
      isDuplicate: true,
      fileHash,
      processedFileId: existingFile.id
    }
  }
  
  // 3. Записываем новый файл в БД
  const db = await database
  const result = await db.run(`
    INSERT INTO processed_files (
      file_hash, original_filename, file_size, mime_type, 
      processing_status, uploaded_by
    ) VALUES (?, ?, ?, ?, 'processing', ?)
  `, [fileHash, file.name, buffer.length, file.type, uploadedBy])
  
  const processedFileId = result.lastID as number
  
  try {
    // 4. Создаем временный файл для обработки
    const tempDir = path.join(process.cwd(), 'temp', 'processing', crypto.randomUUID())
    await fs.mkdir(tempDir, { recursive: true })
    const tempFilePath = path.join(tempDir, file.name)
    await fs.writeFile(tempFilePath, buffer)
    
    // 5. Обрабатываем файл (извлекаем текст, создаем chunks)
    const startTime = Date.now()
    const chunks = await extractAndChunkText(tempFilePath)
    
    // 6. Создаем эмбеддинги и сохраняем в Qdrant
    const embedResults = await createEmbeddingsForChunks(chunks, processedFileId)
    
    const processingTime = Date.now() - startTime
    
    // 7. Обновляем статус в БД
    await db.run(`
      UPDATE processed_files 
      SET processing_status = 'completed',
          chunks_created = ?,
          embeddings_created = ?,
          processing_time_ms = ?,
          processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [chunks.length, embedResults.length, processingTime, processedFileId])
    
    // 8. 🗑️ УДАЛЯЕМ временный файл и папку
    await fs.rm(tempDir, { recursive: true, force: true })
    
    return {
      isDuplicate: false,
      fileHash,
      processedFileId
    }
    
  } catch (error) {
    // В случае ошибки - отмечаем как failed и также удаляем временные файлы
    await db.run(`
      UPDATE processed_files 
      SET processing_status = 'failed',
          error_message = ?,
          processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [error.message, processedFileId])
    
    // Удаляем временные файлы даже при ошибке
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError)
    }
    
    throw error
  }
}

async function createEmbeddingsForChunks(chunks: string[], fileId: number) {
  const results = []
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    // Создаем эмбеддинг
    const embedding = await getEmbedding(chunk)
    
    // Сохраняем в Qdrant
    const pointId = `${fileId}_chunk_${i}`
    await upsertPoints([{
      id: pointId,
      vector: embedding,
      payload: {
        content: chunk,
        fileId,
        chunkIndex: i,
        metadata: { /* дополнительные метаданные */ }
      }
    }])
    
    // Сохраняем связь в БД
    await database.run(`
      INSERT INTO file_chunks (
        processed_file_id, qdrant_point_id, chunk_index, 
        chunk_text, chunk_size
      ) VALUES (?, ?, ?, ?, ?)
    `, [fileId, pointId, i, chunk, chunk.length])
    
    results.push({ pointId, chunkIndex: i })
  }
  
  return results
}
```

### **Phase 3: Обновление API endpoints (1-2 дня)**

#### 3.1 Новый `/api/upload/route.ts`
```typescript
export async function POST(request: Request) {
  // ... авторизация ...
  
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  
  try {
    const result = await processUploadedFile(file, userId)
    
    if (result.isDuplicate) {
      return NextResponse.json({
        success: true,
        message: 'File already exists and has been processed',
        isDuplicate: true,
        fileHash: result.fileHash,
        processedFileId: result.processedFileId
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'File processed successfully',
      isDuplicate: false,
      fileHash: result.fileHash,
      processedFileId: result.processedFileId
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'File processing failed', details: error.message },
      { status: 500 }
    )
  }
}
```

#### 3.2 Новый endpoint для статистики файлов
```typescript
// src/app/api/admin/files/stats/route.ts
export async function GET() {
  const db = await database
  
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_files,
      COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_files,
      COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_files,
      COUNT(CASE WHEN processing_status = 'processing' THEN 1 END) as processing_files,
      SUM(file_size) as total_size_bytes,
      SUM(chunks_created) as total_chunks,
      AVG(processing_time_ms) as avg_processing_time_ms
    FROM processed_files
  `)
  
  return NextResponse.json({
    ...stats,
    total_size_mb: Math.round(stats.total_size_bytes / 1024 / 1024 * 100) / 100
  })
}
```

### **Phase 4: Миграция существующих файлов (1-2 дня)**

#### 4.1 Скрипт миграции
```typescript
// scripts/migrate-existing-files.ts
export async function migrateExistingFiles() {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const existingFiles = await findAllPdfFiles(uploadsDir)
  
  console.log(`Found ${existingFiles.length} files to migrate`)
  
  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0
  
  for (const filePath of existingFiles) {
    try {
      const buffer = await fs.readFile(filePath)
      const fileHash = calculateFileHash(buffer)
      
      // Проверяем, не мигрирован ли уже
      if (await checkFileExists(fileHash)) {
        console.log(`Skipping ${filePath} - already exists`)
        skippedCount++
        continue
      }
      
      // Мигрируем файл
      await migrateFile(filePath, buffer, fileHash)
      migratedCount++
      
    } catch (error) {
      console.error(`Error migrating ${filePath}:`, error)
      errorCount++
    }
  }
  
  console.log(`Migration completed: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`)
  
  // После успешной миграции можно удалить папку uploads
  if (errorCount === 0) {
    console.log('All files migrated successfully. Consider removing uploads/ directory.')
  }
}
```

### **Phase 5: Cleanup и мониторинг (1 день)**

#### 5.1 Периодическая очистка временных файлов
```typescript
// src/lib/cleanup.ts
export async function cleanupTempFiles() {
  const tempDir = path.join(process.cwd(), 'temp', 'processing')
  
  try {
    const entries = await fs.readdir(tempDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(tempDir, entry.name)
        const stats = await fs.stat(dirPath)
        
        // Удаляем папки старше 1 часа
        const hourAgo = Date.now() - (60 * 60 * 1000)
        if (stats.mtime.getTime() < hourAgo) {
          await fs.rm(dirPath, { recursive: true, force: true })
          console.log(`Cleaned up old temp directory: ${entry.name}`)
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// Запускать каждый час
setInterval(cleanupTempFiles, 60 * 60 * 1000)
```

#### 5.2 Dashboard для мониторинга
```typescript
// src/app/admin/files/page.tsx - админ-страница для просмотра статистики
export default async function FilesAdminPage() {
  const stats = await fetch('/api/admin/files/stats').then(r => r.json())
  
  return (
    <div className="space-y-6">
      <h1>File Management Dashboard</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Files" value={stats.total_files} />
        <StatCard title="Total Size" value={`${stats.total_size_mb} MB`} />
        <StatCard title="Total Chunks" value={stats.total_chunks} />
        <StatCard title="Avg Processing Time" value={`${Math.round(stats.avg_processing_time_ms)}ms`} />
      </div>
      
      {/* Таблица с файлами, статистика ошибок и т.д. */}
    </div>
  )
}
```

## 📊 Ожидаемые результаты

### **Экономия ресурсов:**
- 📉 **-100% дискового пространства** для файлов (только БД)
- 📉 **-90% времени на дедупликацию** (instant hash lookup)
- 📉 **-80% сложности maintenance** (no file cleanup needed)

### **Улучшения системы:**
- ⚡ **Мгновенная проверка дубликатов** через хеш
- 📊 **Детальная статистика** обработки файлов  
- 🔄 **Надежность** - нет "осиротевших" файлов
- 🗄️ **Аудит** - полная история загрузок

### **Безопасность:**
- 🔐 **Дедупликация по хешу** - один файл = одна обработка
- 🧹 **Автоочистка** временных файлов
- 📝 **Аудит логи** всех операций

## ✅ Критерии готовности

- [ ] Все новые файлы обрабатываются по новой схеме
- [ ] Дубликаты определяются по хешу за < 100ms
- [ ] Временные файлы удаляются автоматически
- [ ] Статистика доступна в админ-панели
- [ ] Миграция существующих файлов завершена
- [ ] Папка `uploads/` больше не используется

---
*Smart file management - foundation для масштабируемой системы.*