# 🗄️ План базы данных: SQLite

## 🎯 Цель

Создать SQLite базу данных для хранения метаданных загруженных файлов, их статуса обработки и связи с векторной базой данных Qdrant.

## 📋 Требования

### Функциональные требования
- [ ] Хранение метаданных файлов
- [ ] Отслеживание статуса обработки
- [ ] Предотвращение дубликатов
- [ ] Логирование операций
- [ ] Связь с Qdrant точками

### Технические требования
- [ ] SQLite3 для локального хранения
- [ ] TypeScript типизация
- [ ] Миграции схемы
- [ ] Индексы для производительности
- [ ] Резервное копирование

## 🗂️ Схема базы данных

### 1. Таблица `files` - Основная информация о файлах

```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,                    -- UUID файла (crypto.randomUUID())
  filename TEXT NOT NULL,                 -- Имя файла на диске
  original_name TEXT NOT NULL,            -- Оригинальное имя файла
  file_hash TEXT UNIQUE NOT NULL,         -- MD5 хеш файла для дубликатов
  file_size INTEGER NOT NULL,             -- Размер файла в байтах
  mime_type TEXT NOT NULL,                -- MIME тип файла
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'processing',       -- processing, completed, error
  chunks_count INTEGER DEFAULT 0,         -- Количество созданных чанков
  qdrant_points TEXT,                     -- JSON массив ID точек в Qdrant
  metadata TEXT,                          -- JSON с дополнительными данными
  error_message TEXT,                     -- Сообщение об ошибке
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Таблица `uploads_log` - Лог операций

```sql
CREATE TABLE uploads_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT NOT NULL,                  -- Ссылка на файл
  action TEXT NOT NULL,                   -- upload, process, error, delete, update
  status TEXT NOT NULL,                   -- success, error, warning
  message TEXT,                           -- Описание действия
  details TEXT,                           -- JSON с деталями
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

### 3. Таблица `chunks` - Информация о чанках

```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,                    -- UUID чанка
  file_id TEXT NOT NULL,                  -- Ссылка на файл
  chunk_index INTEGER NOT NULL,           -- Индекс чанка в файле
  content TEXT NOT NULL,                  -- Текст чанка
  qdrant_point_id TEXT,                   -- ID точки в Qdrant
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

### 4. Индексы для производительности

```sql
-- Индексы для таблицы files
CREATE INDEX idx_files_hash ON files(file_hash);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_upload_date ON files(upload_date);
CREATE INDEX idx_files_mime_type ON files(mime_type);

-- Индексы для таблицы uploads_log
CREATE INDEX idx_uploads_log_file_id ON uploads_log(file_id);
CREATE INDEX idx_uploads_log_timestamp ON uploads_log(timestamp);
CREATE INDEX idx_uploads_log_action ON uploads_log(action);

-- Индексы для таблицы chunks
CREATE INDEX idx_chunks_file_id ON chunks(file_id);
CREATE INDEX idx_chunks_qdrant_point_id ON chunks(qdrant_point_id);
```

## 🔧 TypeScript типы

### 1. Основные типы (`src/types/database.ts`)

```typescript
export interface FileRecord {
  id: string
  filename: string
  original_name: string
  file_hash: string
  file_size: number
  mime_type: string
  upload_date: string
  status: FileStatus
  chunks_count: number
  qdrant_points: string[] | null
  metadata: FileMetadata | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type FileStatus = 'processing' | 'completed' | 'error' | 'deleted'

export interface FileMetadata {
  title?: string
  author?: string
  pages?: number
  language?: string
  category?: string
  tags?: string[]
  description?: string
}

export interface UploadLog {
  id: number
  file_id: string
  action: LogAction
  status: LogStatus
  message: string | null
  details: any | null
  timestamp: string
}

export type LogAction = 'upload' | 'process' | 'error' | 'delete' | 'update'
export type LogStatus = 'success' | 'error' | 'warning'

export interface ChunkRecord {
  id: string
  file_id: string
  chunk_index: number
  content: string
  qdrant_point_id: string | null
  created_at: string
}
```

## 🛠️ Утилиты для работы с БД

### 1. Подключение к БД (`src/lib/database.ts`)

```typescript
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'

let db: Database | null = null

export async function getDatabase(): Promise<Database> {
  if (db) {
    return db
  }

  const dbPath = path.join(process.cwd(), 'data', 'rag-chat.db')
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  // Включаем foreign keys
  await db.exec('PRAGMA foreign_keys = ON')
  
  return db
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close()
    db = null
  }
}
```

### 2. Инициализация схемы (`src/lib/schema.ts`)

```typescript
import { getDatabase } from './database'

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase()

  // Создание таблиц
  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_hash TEXT UNIQUE NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'processing',
      chunks_count INTEGER DEFAULT 0,
      qdrant_points TEXT,
      metadata TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uploads_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      qdrant_point_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );
  `)

  // Создание индексов
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);
    CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
    CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
    CREATE INDEX IF NOT EXISTS idx_uploads_log_file_id ON uploads_log(file_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
  `)
}
```

### 3. Операции с файлами (`src/lib/file-repository.ts`)

```typescript
import { getDatabase } from './database'
import { FileRecord, FileStatus, FileMetadata } from '@/types/database'
import { randomUUID } from 'crypto'

export class FileRepository {
  static async createFile(data: {
    filename: string
    original_name: string
    file_hash: string
    file_size: number
    mime_type: string
    metadata?: FileMetadata
  }): Promise<string> {
    const db = await getDatabase()
    const id = randomUUID()

    await db.run(`
      INSERT INTO files (
        id, filename, original_name, file_hash, file_size, 
        mime_type, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.filename,
      data.original_name,
      data.file_hash,
      data.file_size,
      data.mime_type,
      data.metadata ? JSON.stringify(data.metadata) : null
    ])

    return id
  }

  static async findByHash(fileHash: string): Promise<FileRecord | null> {
    const db = await getDatabase()
    
    const file = await db.get<FileRecord>(
      'SELECT * FROM files WHERE file_hash = ?',
      [fileHash]
    )

    if (file) {
      return {
        ...file,
        qdrant_points: file.qdrant_points ? JSON.parse(file.qdrant_points) : null,
        metadata: file.metadata ? JSON.parse(file.metadata) : null
      }
    }

    return null
  }

  static async updateStatus(
    fileId: string, 
    status: FileStatus, 
    errorMessage?: string
  ): Promise<void> {
    const db = await getDatabase()
    
    await db.run(`
      UPDATE files 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, errorMessage || null, fileId])
  }

  static async updateQdrantPoints(
    fileId: string, 
    qdrantPoints: string[]
  ): Promise<void> {
    const db = await getDatabase()
    
    await db.run(`
      UPDATE files 
      SET qdrant_points = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(qdrantPoints), fileId])
  }

  static async getAllFiles(): Promise<FileRecord[]> {
    const db = await getDatabase()
    
    const files = await db.all<FileRecord[]>(
      'SELECT * FROM files ORDER BY upload_date DESC'
    )

    return files.map(file => ({
      ...file,
      qdrant_points: file.qdrant_points ? JSON.parse(file.qdrant_points) : null,
      metadata: file.metadata ? JSON.parse(file.metadata) : null
    }))
  }

  static async deleteFile(fileId: string): Promise<void> {
    const db = await getDatabase()
    
    await db.run('DELETE FROM files WHERE id = ?', [fileId])
  }
}
```

## 🔄 Миграции

### 1. Система миграций (`src/lib/migrations.ts`)

```typescript
import { getDatabase } from './database'

interface Migration {
  version: number
  name: string
  up: string
  down: string
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial schema',
    up: `
      CREATE TABLE files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_hash TEXT UNIQUE NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'processing',
        chunks_count INTEGER DEFAULT 0,
        qdrant_points TEXT,
        metadata TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: 'DROP TABLE files;'
  }
  // Добавлять новые миграции здесь
]

export async function runMigrations(): Promise<void> {
  const db = await getDatabase()

  // Создаем таблицу для отслеживания миграций
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Получаем примененные миграции
  const applied = await db.all<{ version: number }[]>(
    'SELECT version FROM migrations ORDER BY version'
  )
  const appliedVersions = applied.map(m => m.version)

  // Применяем новые миграции
  for (const migration of migrations) {
    if (!appliedVersions.includes(migration.version)) {
      console.log(`Applying migration: ${migration.name}`)
      
      await db.exec(migration.up)
      await db.run(
        'INSERT INTO migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      )
    }
  }
}
```

## 🧪 Тестирование

### 1. Тесты базы данных

```typescript
// src/tests/database.test.ts
import { FileRepository } from '@/lib/file-repository'
import { initializeDatabase } from '@/lib/schema'

describe('FileRepository', () => {
  beforeAll(async () => {
    await initializeDatabase()
  })

  test('should create and find file', async () => {
    const fileData = {
      filename: 'test.pdf',
      original_name: 'test.pdf',
      file_hash: 'abc123',
      file_size: 1024,
      mime_type: 'application/pdf'
    }

    const id = await FileRepository.createFile(fileData)
    const file = await FileRepository.findByHash('abc123')

    expect(file).toBeTruthy()
    expect(file?.id).toBe(id)
  })
})
```

## 📊 Мониторинг и аналитика

### 1. Статистика файлов

```typescript
export class FileAnalytics {
  static async getStats(): Promise<{
    totalFiles: number
    totalSize: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  }> {
    const db = await getDatabase()
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as totalFiles,
        SUM(file_size) as totalSize
      FROM files
    `)

    const byStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM files
      GROUP BY status
    `)

    const byType = await db.all(`
      SELECT mime_type, COUNT(*) as count
      FROM files
      GROUP BY mime_type
    `)

    return {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s.count])),
      byType: Object.fromEntries(byType.map(t => [t.mime_type, t.count]))
    }
  }
}
```

## 🚀 Развертывание

### 1. Production настройки

```typescript
// data/rag-chat.db - основная база
// data/backups/ - резервные копии
// data/logs/ - логи операций
```

### 2. Резервное копирование

```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp data/rag-chat.db "data/backups/rag-chat_$DATE.db"
```

## 📋 Чек-лист реализации

- [ ] Установить sqlite3 и @types/sqlite3
- [ ] Создать схему базы данных
- [ ] Реализовать миграции
- [ ] Создать репозиторий для файлов
- [ ] Добавить индексы
- [ ] Написать тесты
- [ ] Настроить резервное копирование
- [ ] Добавить мониторинг 
