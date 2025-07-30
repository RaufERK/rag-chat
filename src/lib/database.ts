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