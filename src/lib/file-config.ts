export const FILE_CONFIG = {
  // Пути
  UPLOADS_DIR: 'uploads',
  TEMP_DIR: 'uploads/temp',
  PROCESSING_DIR: 'uploads/temp/processing',
  CLEANUP_DIR: 'uploads/temp/cleanup',
  BACKUPS_DIR: 'uploads/backups',
  LOGS_DIR: 'uploads/logs',

  // Ограничения
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
  MAX_FILES_PER_DAY: 100,
  ALLOWED_MIME_TYPES: [
    'application/pdf', // ⚠️ Может крашиться на некоторых файлах - улучшен обработчик ошибок
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', // ✅ Включён обратно - простой UTF-8 процессор без утечек памяти
    'application/epub+zip',
    'application/x-fictionbook+xml',
    'application/msword', // ⚠️ DOC - старый формат Word (процессор временно отключен)
  ],

  // Настройки чанкинга
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '800'), // символов - уменьшено для embeddings
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP || '150'), // символов
  chunkSize: parseInt(process.env.CHUNK_SIZE || '800'), // для совместимости
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '150'), // для совместимости

  // Очистка
  CLEANUP_DAYS: 30, // Удалять файлы старше 30 дней
  BACKUP_DAYS: 7, // Хранить бэкапы 7 дней

  // Валидация
  MIN_FILE_SIZE: 1024, // 1KB
  MAX_FILENAME_LENGTH: 255,
} as const

export type AllowedMimeType = (typeof FILE_CONFIG.ALLOWED_MIME_TYPES)[number]
