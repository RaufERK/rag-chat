# 📁 План файловой системы: Локальное хранение

## 🎯 Цель

Создать эффективную систему локального хранения файлов с организацией по датам, валидацией и управлением жизненным циклом файлов.

## 📋 Требования

### Функциональные требования
- [ ] Организованное хранение файлов по датам
- [ ] Валидация типов файлов
- [ ] Ограничение размера файлов
- [ ] Очистка старых файлов
- [ ] Безопасное удаление файлов
- [ ] Резервное копирование

### Технические требования
- [ ] Структурированная папка uploads/
- [ ] Временная папка для обработки
- [ ] Логирование операций
- [ ] Проверка свободного места
- [ ] Обработка ошибок

## 🗂️ Структура папок

```
uploads/
├── 2024/
│   ├── 01/                    # Январь
│   │   ├── 15/               # 15 января
│   │   │   ├── file1.pdf
│   │   │   └── file2.docx
│   │   └── 20/
│   │       └── file3.pdf
│   ├── 02/                    # Февраль
│   └── 03/
├── temp/                      # Временные файлы
│   ├── processing/           # Файлы в обработке
│   └── cleanup/              # Файлы для удаления
├── backups/                   # Резервные копии
│   ├── 2024-01-15/
│   └── 2024-01-20/
└── logs/                      # Логи операций
    ├── uploads.log
    ├── errors.log
    └── cleanup.log
```

## 🔧 Утилиты для работы с файлами

### 1. Конфигурация файловой системы (`src/lib/file-config.ts`)

```typescript
export const FILE_CONFIG = {
  // Пути
  UPLOADS_DIR: 'uploads',
  TEMP_DIR: 'uploads/temp',
  PROCESSING_DIR: 'uploads/temp/processing',
  CLEANUP_DIR: 'uploads/temp/cleanup',
  BACKUPS_DIR: 'uploads/backups',
  LOGS_DIR: 'uploads/logs',

  // Ограничения
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_DAY: 100,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/epub+zip',
    'application/x-fictionbook+xml'
  ],

  // Настройки чанкинга
  CHUNK_SIZE: 1000, // символов
  CHUNK_OVERLAP: 200, // символов

  // Очистка
  CLEANUP_DAYS: 30, // Удалять файлы старше 30 дней
  BACKUP_DAYS: 7,   // Хранить бэкапы 7 дней

  // Валидация
  MIN_FILE_SIZE: 1024, // 1KB
  MAX_FILENAME_LENGTH: 255
} as const

export type AllowedMimeType = typeof FILE_CONFIG.ALLOWED_MIME_TYPES[number]
```

### 2. Утилиты для работы с файлами (`src/lib/file-utils.ts`)

```typescript
import fs from 'fs/promises'
import path from 'path'
import { FILE_CONFIG } from './file-config'
import { randomUUID } from 'crypto'

export class FileUtils {
  /**
   * Создает структуру папок для даты
   */
  static async createDateFolders(date: Date = new Date()): Promise<string> {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    const datePath = path.join(FILE_CONFIG.UPLOADS_DIR, String(year), month, day)
    
    await fs.mkdir(datePath, { recursive: true })
    return datePath
  }

  /**
   * Генерирует уникальное имя файла
   */
  static generateFilename(originalName: string): string {
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)
    const uuid = randomUUID()
    
    // Ограничиваем длину имени файла
    const maxBaseLength = FILE_CONFIG.MAX_FILENAME_LENGTH - ext.length - uuid.length - 2
    const truncatedBase = baseName.length > maxBaseLength 
      ? baseName.substring(0, maxBaseLength) 
      : baseName
    
    return `${truncatedBase}_${uuid}${ext}`
  }

  /**
   * Получает путь для файла по дате
   */
  static getFilePath(filename: string, date: Date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return path.join(FILE_CONFIG.UPLOADS_DIR, String(year), month, day, filename)
  }

  /**
   * Проверяет свободное место на диске
   */
  static async checkDiskSpace(): Promise<{
    free: number
    total: number
    used: number
    percentage: number
  }> {
    // Для Node.js нужно использовать внешнюю библиотеку
    // Например: diskusage или node-disk-info
    // Пока возвращаем заглушку
    return {
      free: 1024 * 1024 * 1024 * 10, // 10GB
      total: 1024 * 1024 * 1024 * 100, // 100GB
      used: 1024 * 1024 * 1024 * 90, // 90GB
      percentage: 90
    }
  }

  /**
   * Валидирует файл
   */
  static validateFile(file: {
    size: number
    mimetype: string
    originalname: string
  }): { valid: boolean; error?: string } {
    // Проверка размера
    if (file.size < FILE_CONFIG.MIN_FILE_SIZE) {
      return { valid: false, error: 'Файл слишком маленький' }
    }

    if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
      return { valid: false, error: 'Файл слишком большой' }
    }

    // Проверка типа
    if (!FILE_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      return { valid: false, error: 'Неподдерживаемый тип файла' }
    }

    // Проверка имени файла
    if (file.originalname.length > FILE_CONFIG.MAX_FILENAME_LENGTH) {
      return { valid: false, error: 'Имя файла слишком длинное' }
    }

    return { valid: true }
  }

  /**
   * Создает временную папку для обработки
   */
  static async createTempFolder(): Promise<string> {
    const tempId = randomUUID()
    const tempPath = path.join(FILE_CONFIG.PROCESSING_DIR, tempId)
    
    await fs.mkdir(tempPath, { recursive: true })
    return tempPath
  }

  /**
   * Перемещает файл в финальную папку
   */
  static async moveToFinalLocation(
    tempPath: string, 
    finalPath: string
  ): Promise<void> {
    await fs.mkdir(path.dirname(finalPath), { recursive: true })
    await fs.rename(tempPath, finalPath)
  }

  /**
   * Безопасно удаляет файл
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Логируем ошибку, но не падаем
      console.error(`Error deleting file ${filePath}:`, error)
    }
  }

  /**
   * Получает размер папки
   */
  static async getFolderSize(folderPath: string): Promise<number> {
    let totalSize = 0
    
    const files = await fs.readdir(folderPath, { withFileTypes: true })
    
    for (const file of files) {
      const filePath = path.join(folderPath, file.name)
      
      if (file.isDirectory()) {
        totalSize += await this.getFolderSize(filePath)
      } else {
        const stats = await fs.stat(filePath)
        totalSize += stats.size
      }
    }
    
    return totalSize
  }
}
```

### 3. Менеджер файлов (`src/lib/file-manager.ts`)

```typescript
import { FileUtils } from './file-utils'
import { FILE_CONFIG } from './file-config'
import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'

export class FileManager {
  /**
   * Сохраняет загруженный файл
   */
  static async saveUploadedFile(
    tempPath: string,
    originalName: string,
    mimetype: string
  ): Promise<{
    filename: string
    filePath: string
    fileHash: string
    fileSize: number
  }> {
    // Проверяем свободное место
    const diskSpace = await FileUtils.checkDiskSpace()
    if (diskSpace.percentage > 95) {
      throw new Error('Недостаточно места на диске')
    }

    // Создаем папки для даты
    const dateFolder = await FileUtils.createDateFolders()
    
    // Генерируем имя файла
    const filename = FileUtils.generateFilename(originalName)
    const finalPath = path.join(dateFolder, filename)
    
    // Перемещаем файл
    await FileUtils.moveToFinalLocation(tempPath, finalPath)
    
    // Получаем информацию о файле
    const stats = await fs.stat(finalPath)
    const fileHash = await this.calculateFileHash(finalPath)
    
    return {
      filename,
      filePath: finalPath,
      fileHash,
      fileSize: stats.size
    }
  }

  /**
   * Вычисляет хеш файла
   */
  static async calculateFileHash(filePath: string): Promise<string> {
    const hash = createHash('md5')
    const fileBuffer = await fs.readFile(filePath)
    hash.update(fileBuffer)
    return hash.digest('hex')
  }

  /**
   * Очищает старые файлы
   */
  static async cleanupOldFiles(): Promise<{
    deletedFiles: number
    freedSpace: number
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - FILE_CONFIG.CLEANUP_DAYS)
    
    let deletedFiles = 0
    let freedSpace = 0
    
    // Проходим по всем папкам в uploads
    const uploadsPath = FILE_CONFIG.UPLOADS_DIR
    const years = await fs.readdir(uploadsPath)
    
    for (const year of years) {
      if (year === 'temp' || year === 'backups' || year === 'logs') continue
      
      const yearPath = path.join(uploadsPath, year)
      const months = await fs.readdir(yearPath)
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month)
        const days = await fs.readdir(monthPath)
        
        for (const day of days) {
          const dayPath = path.join(monthPath, day)
          const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          
          if (dayDate < cutoffDate) {
            // Удаляем всю папку дня
            const folderSize = await FileUtils.getFolderSize(dayPath)
            await fs.rmdir(dayPath, { recursive: true })
            
            deletedFiles++
            freedSpace += folderSize
          }
        }
      }
    }
    
    return { deletedFiles, freedSpace }
  }

  /**
   * Создает резервную копию файла
   */
  static async backupFile(filePath: string): Promise<string> {
    const backupDate = new Date()
    const backupFolder = path.join(
      FILE_CONFIG.BACKUPS_DIR,
      backupDate.toISOString().split('T')[0]
    )
    
    await fs.mkdir(backupFolder, { recursive: true })
    
    const filename = path.basename(filePath)
    const backupPath = path.join(backupFolder, filename)
    
    await fs.copyFile(filePath, backupPath)
    
    return backupPath
  }

  /**
   * Получает статистику файловой системы
   */
  static async getFileSystemStats(): Promise<{
    totalFiles: number
    totalSize: number
    byType: Record<string, { count: number; size: number }>
    byDate: Record<string, { count: number; size: number }>
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {} as Record<string, { count: number; size: number }>,
      byDate: {} as Record<string, { count: number; size: number }>
    }
    
    // Рекурсивно проходим по всем файлам
    await this.scanDirectory(FILE_CONFIG.UPLOADS_DIR, stats)
    
    return stats
  }

  /**
   * Рекурсивно сканирует директорию
   */
  private static async scanDirectory(
    dirPath: string, 
    stats: any
  ): Promise<void> {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name)
        
        if (item.isDirectory()) {
          await this.scanDirectory(itemPath, stats)
        } else if (item.isFile()) {
          const fileStats = await fs.stat(itemPath)
          const ext = path.extname(item.name).toLowerCase()
          
          stats.totalFiles++
          stats.totalSize += fileStats.size
          
          // Статистика по типам
          if (!stats.byType[ext]) {
            stats.byType[ext] = { count: 0, size: 0 }
          }
          stats.byType[ext].count++
          stats.byType[ext].size += fileStats.size
          
          // Статистика по датам
          const dateStr = fileStats.mtime.toISOString().split('T')[0]
          if (!stats.byDate[dateStr]) {
            stats.byDate[dateStr] = { count: 0, size: 0 }
          }
          stats.byDate[dateStr].count++
          stats.byDate[dateStr].size += fileStats.size
        }
      }
    } catch (error) {
      // Игнорируем ошибки доступа
      console.warn(`Cannot scan directory ${dirPath}:`, error)
    }
  }
}
```

## 🔄 Процесс обработки файла

### 1. Загрузка файла
```typescript
// 1. Файл загружается во временную папку
const tempPath = await FileUtils.createTempFolder()

// 2. Валидация файла
const validation = FileUtils.validateFile(uploadedFile)
if (!validation.valid) {
  throw new Error(validation.error)
}

// 3. Сохранение в финальную папку
const fileInfo = await FileManager.saveUploadedFile(
  tempPath,
  uploadedFile.originalname,
  uploadedFile.mimetype
)
```

### 2. Обработка файла
```typescript
// 1. Извлечение текста
const text = await extractTextFromFile(fileInfo.filePath)

// 2. Разбивка на чанки
const chunks = splitTextIntoChunks(text)

// 3. Создание эмбеддингов
const embeddings = await Promise.all(
  chunks.map(chunk => getEmbedding(chunk.content))
)

// 4. Сохранение в Qdrant
const qdrantPoints = await saveToQdrant(chunks, embeddings)
```

### 3. Очистка
```typescript
// 1. Удаление временных файлов
await FileUtils.deleteFile(tempPath)

// 2. Периодическая очистка старых файлов
const cleanup = await FileManager.cleanupOldFiles()
console.log(`Cleaned up ${cleanup.deletedFiles} files, freed ${cleanup.freedSpace} bytes`)
```

## 🧪 Тестирование

### 1. Тесты файловой системы
```typescript
describe('FileManager', () => {
  test('should save uploaded file', async () => {
    const tempPath = '/tmp/test.pdf'
    const result = await FileManager.saveUploadedFile(
      tempPath,
      'test.pdf',
      'application/pdf'
    )
    
    expect(result.filename).toMatch(/test_.*\.pdf/)
    expect(result.fileHash).toBeDefined()
  })
})
```

## 📊 Мониторинг

### 1. Логирование операций
```typescript
export class FileLogger {
  static async logUpload(fileInfo: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'upload',
      fileId: fileInfo.id,
      filename: fileInfo.filename,
      size: fileInfo.fileSize
    }
    
    await fs.appendFile(
      path.join(FILE_CONFIG.LOGS_DIR, 'uploads.log'),
      JSON.stringify(logEntry) + '\n'
    )
  }
}
```

## 🚀 Развертывание

### 1. Production настройки
```bash
# Создание необходимых папок
mkdir -p uploads/{temp/{processing,cleanup},backups,logs}

# Установка прав доступа
chmod 755 uploads
chmod 755 uploads/temp
chmod 755 uploads/backups
chmod 755 uploads/logs
```

### 2. Cron задачи для очистки
```bash
# Очистка старых файлов каждый день в 2:00
0 2 * * * /usr/bin/node /path/to/cleanup-script.js

# Резервное копирование каждый день в 1:00
0 1 * * * /usr/bin/node /path/to/backup-script.js
```

## 📋 Чек-лист реализации

- [ ] Создать структуру папок
- [ ] Реализовать FileUtils
- [ ] Реализовать FileManager
- [ ] Добавить валидацию файлов
- [ ] Настроить логирование
- [ ] Создать систему очистки
- [ ] Добавить мониторинг
- [ ] Написать тесты
- [ ] Настроить cron задачи 
