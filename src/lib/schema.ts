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