export const FILE_CONFIG = {
  // Пути
  UPLOADS_DIR: 'uploads',
  TEMP_DIR: 'uploads/temp',
  PROCESSING_DIR: 'uploads/temp/processing',
  CLEANUP_DIR: 'uploads/temp/cleanup',
  BACKUPS_DIR: 'uploads/backups',
  LOGS_DIR: 'uploads/logs',

  // Ограничения
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB - reduced for stability
  MAX_FILES_PER_DAY: 50, // Reduced for stability
  ALLOWED_MIME_TYPES: [
    'application/pdf', // ✅ Улучшен обработчик ошибок
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'text/plain', // ✅ TXT - простой UTF-8 процессор
    'application/epub+zip', // ✅ EPUB
    'application/x-fictionbook+xml', // ✅ FB2
    'text/xml', // ✅ XML для FB2
    'application/xml', // ✅ XML для FB2
    'application/msword', // ⚠️ DOC - старый формат Word
  ],

  // Настройки чанкинга - УМЕНЬШЕНЫ для стабильности
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '400'), // символов - уменьшено для embeddings
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP || '50'), // символов - уменьшено
  chunkSize: parseInt(process.env.CHUNK_SIZE || '400'), // для совместимости
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50'), // для совместимости

  // Очистка
  CLEANUP_DAYS: 7, // Удалять файлы старше 7 дней - уменьшено
  BACKUP_DAYS: 3, // Хранить бэкапы 3 дня - уменьшено

  // Валидация
  MIN_FILE_SIZE: 1024, // 1KB
  MAX_FILENAME_LENGTH: 255,

  // Новые ограничения для стабильности
  MAX_CHUNKS_PER_FILE: 20, // Максимум чанков на файл
  MAX_TEXT_LENGTH: 50000, // Максимум символов в тексте
} as const

export type AllowedMimeType = (typeof FILE_CONFIG.ALLOWED_MIME_TYPES)[number]
