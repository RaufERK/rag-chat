# 🗃️ File Management Rework Plan

## 🎯 Цель: Умная работа с файлами без локального хранения

Перейти от хранения файлов к системе хеширования с автоматическим удалением после обработки.

## 🧠 ДОКТРИНА УПРАВЛЕНИЯ ФАЙЛАМИ

### **Основные принципы:**

1. **📄 Парсинг в TXT формат** - все файлы (PDF, DOCX, EPUB, FB2, DOC) парсятся в TXT и сохраняются только в TXT формате
2. **🔐 Дедупликация по хешу** - проверка дубликатов по SHA-256 хешу файла перед обработкой
3. **🗑️ Удаление оригиналов** - оригинальные файлы удаляются сразу после успешного парсинга в TXT
4. **💾 Хранение только TXT** - на сервере остаются только TXT файлы для скачивания и ссылок
5. **❌ Отказ при ошибках** - если парсинг или эмбеддинг не удался, файл не сохраняется в БД

### **Flow обработки файлов:**

```
📁 Upload → 🔐 Hash Check → ❓ Exists? → 🔄 Parse to TXT → 💾 Save TXT → 🗑️ Delete Original → 🔗 Embed → 💾 Store in DB
```

**Детальный процесс:**
1. **Загрузка файла** - получение файла от пользователя
2. **Вычисление хеша** - SHA-256 хеш для дедупликации
3. **Проверка дубликата** - поиск в БД по хешу
4. **Парсинг в TXT** - конвертация в текстовый формат
5. **Сохранение TXT** - запись TXT файла на сервер
6. **Удаление оригинала** - удаление исходного файла
7. **Создание эмбеддингов** - добавление в Qdrant
8. **Запись в БД** - сохранение метаданных в SQLite

### **Обработка ошибок:**
- **Ошибка парсинга** → файл не сохраняется, оригинал удаляется
- **Ошибка эмбеддинга** → TXT файл удаляется, запись в БД не создается
- **Дубликат найден** → файл не обрабатывается, возвращается информация о существующем

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

### **Phase 2: Обновление структуры папок (1 день)**

#### 2.1 Новая структура папок
```
uploads/
├── txt/                    # Только TXT файлы
│   ├── [hash_prefix]/      # Группировка по первым 2 символам хеша
│   │   ├── [full_hash].txt # TXT файл с полным хешем
│   │   └── [full_hash].meta.json # Метаданные файла
│   └── ...
├── temp/processing/        # Временные файлы (удаляются после обработки)
│   └── [uuid]/
└── logs/                  # Логи обработки
```

#### 2.2 Метаданные файла
```json
{
  "hash": "a1b2c3d4e5f6...",
  "originalName": "document.pdf",
  "originalFormat": "pdf",
  "originalSize": 1024000,
  "txtSize": 50000,
  "title": "Название документа",
  "author": "Автор",
  "pages": 10,
  "uploadedAt": "2025-08-01T12:00:00Z",
  "uploadedBy": "user_id",
  "chunksCount": 15,
  "embeddingsCount": 15
}
```

### **Phase 3: Обновление API загрузки (2 дня)**

#### 3.1 Новый flow загрузки
```typescript
async function uploadFile(file: File) {
  // 1. Вычисление хеша
  const hash = await calculateFileHash(file)
  
  // 2. Проверка дубликата
  const existing = await checkDuplicate(hash)
  if (existing) {
    return { success: true, isDuplicate: true, existingFile: existing }
  }
  
  // 3. Парсинг в TXT
  const txtContent = await parseToTxt(file)
  
  // 4. Сохранение TXT файла
  const txtPath = await saveTxtFile(hash, txtContent)
  
  // 5. Удаление оригинала
  await deleteOriginalFile(file)
  
  // 6. Создание эмбеддингов
  const embeddings = await createEmbeddings(txtContent)
  
  // 7. Сохранение в БД
  await saveToDatabase(hash, file.name, txtPath, embeddings)
  
  return { success: true, fileId: hash }
}
```

#### 3.2 Обработка ошибок
```typescript
try {
  // Обработка файла
} catch (error) {
  // Очистка временных файлов
  await cleanupTempFiles()
  
  // Не сохраняем в БД при ошибке
  return { success: false, error: error.message }
}
```

### **Phase 4: Обновление UI (1 день)**

#### 4.1 Показ статуса файлов
- ✅ **Загружен** - файл успешно обработан и сохранен
- ⚠️ **Дубликат** - файл уже существует в системе
- ❌ **Ошибка** - файл не удалось обработать
- 🔄 **Обработка** - файл в процессе обработки

#### 4.2 Ссылки на файлы
```typescript
// Генерация ссылки для скачивания TXT файла
const downloadUrl = `/api/files/${fileHash}/download`

// Ссылка в результатах RAG
const sourceUrl = `/api/files/${fileHash}/view`
```

### **Phase 5: Миграция существующих данных (1 день)**

#### 5.1 Скрипт миграции
```typescript
async function migrateExistingFiles() {
  const files = await getAllExistingFiles()
  
  for (const file of files) {
    // 1. Парсинг в TXT
    const txtContent = await parseExistingFile(file)
    
    // 2. Вычисление хеша
    const hash = await calculateHash(file.buffer)
    
    // 3. Сохранение в новой структуре
    await saveTxtFile(hash, txtContent)
    
    // 4. Обновление БД
    await updateFileRecord(file.id, hash)
    
    // 5. Удаление оригинала
    await deleteOriginalFile(file.path)
  }
}
```

## 🎯 Критерии успеха

### **Функциональные требования:**
- [ ] Все файлы парсятся в TXT формат
- [ ] Оригинальные файлы удаляются после успешного парсинга
- [ ] Дедупликация работает по хешу файла
- [ ] TXT файлы доступны для скачивания
- [ ] Ссылки на файлы работают в RAG ответах

### **Технические требования:**
- [ ] Нулевое хранение оригинальных файлов
- [ ] Быстрая проверка дубликатов (O(1))
- [ ] Автоматическая очистка временных файлов
- [ ] Логирование всех операций
- [ ] Обработка ошибок без потери данных

## 🔄 Миграционный путь

1. **Phase 1:** Создание новых таблиц БД
2. **Phase 2:** Обновление структуры папок
3. **Phase 3:** Реализация нового API загрузки
4. **Phase 4:** Обновление UI
5. **Phase 5:** Миграция существующих данных
6. **Phase 6:** Тестирование и оптимизация

---
*Обновлено: август 2025 - новая доктрина управления файлами*
