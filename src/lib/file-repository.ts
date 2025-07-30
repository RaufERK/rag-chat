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

  static async updateChunksCount(
    fileId: string, 
    chunksCount: number
  ): Promise<void> {
    const db = await getDatabase()
    
    await db.run(`
      UPDATE files 
      SET chunks_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [chunksCount, fileId])
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

  static async getFileById(fileId: string): Promise<FileRecord | null> {
    const db = await getDatabase()
    
    const file = await db.get<FileRecord>(
      'SELECT * FROM files WHERE id = ?',
      [fileId]
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

  static async deleteFile(fileId: string): Promise<void> {
    const db = await getDatabase()
    
    await db.run('DELETE FROM files WHERE id = ?', [fileId])
  }

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
      totalFiles: stats.totalFiles || 0,
      totalSize: stats.totalSize || 0,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s.count])),
      byType: Object.fromEntries(byType.map(t => [t.mime_type, t.count]))
    }
  }
} 