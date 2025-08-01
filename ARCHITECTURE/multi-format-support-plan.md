# 📄 Multi-Format File Support Plan

## 🎯 Цель: Поддержка основных форматов документов

Расширить RAG систему для работы с основными форматами файлов: **PDF, TXT, DOC, DOCX**.

## 🔍 Текущее состояние

### **✅ Что поддерживается сейчас:**
- ✅ **PDF** - через `pdf-parse` библиотеку
- ✅ **DOCX** - через `mammoth` библиотеку
- ✅ **TXT** - простой UTF-8 процессор
- ⚠️ **DOC** - требует безопасного решения
- ❌ **FB2** - отложено на потом
- ❌ **EPUB** - отложено на потом

### **🚨 Отказ от textract - КРИТИЧЕСКИ ВАЖНО**

**Принято решение об отказе от `textract`** по следующим критическим причинам:

- ❌ **Критические уязвимости** в зависимостях (14 vulnerabilities: 4 moderate, 9 high, 1 critical)
- ❌ **Несовместимость с Next.js** - динамические импорты не поддерживаются
- ❌ **Проблемы с Turbopack** - паника в runtime, AliasMap ошибки
- ❌ **Сложная архитектура** - много конфликтующих зависимостей
- ❌ **Проблемы с модулями** - server relative imports не реализованы

### **✅ Архитектурное решение: Специализированные библиотеки**

**Принято решение о использовании специализированных безопасных библиотек:**

| Формат | Библиотека | Статус | Причина выбора |
|--------|------------|--------|----------------|
| **.docx** | `mammoth` | ✅ Безопасная, свежая | Активная разработка, нет уязвимостей |
| **.pdf** | `pdf-parse` | ✅ Простая и активная | Стабильная, хорошо поддерживается |
| **.txt** | Нативный Node.js | ✅ Встроенная поддержка | Никаких зависимостей |
| **.doc** | `mammoth` или конвертация | ⚠️ Требует решения | Проблемный формат |

### **📁 Тестовые файлы доступны:**
```
test-data/
├── pdf/ (5 файлов) - духовная литература
├── docx/ (4 файла) - документы Word
├── doc/ (5 файлов) - старые документы Word ⭐ ПРИОРИТЕТ
├── txt/ (12 файлов) - текстовые файлы
├── epub/ (6 файлов) - отложено
├── fb2/ (1 файл) - отложено
└── pptx/ (1 файл) - отложено
```

**Полный индекс тестовых файлов:** `test-data/FILE_INDEX.md`

### **🎯 Приоритет тестирования:**
1. **DOC файлы** - основной приоритет (5 файлов доступно)
2. **DOCX файлы** - работает, но нужно протестировать (4 файла)
3. **PDF файлы** - работает, но нужно протестировать (5 файлов)
4. **TXT файлы** - базовая поддержка (12 файлов)

## 📚 Реализация основных парсеров

### **🔄 Безопасные специализированные процессоры**

```typescript
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

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

export class DOCXProcessor implements DocumentProcessor {
  supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  supportedExtensions = ['.docx']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  
  validateFile(buffer: Buffer): boolean {
    return buffer.subarray(0, 4).toString('hex') === '504b0304'
  }
}

export class TXTProcessor implements DocumentProcessor {
  supportedMimeTypes = ['text/plain']
  supportedExtensions = ['.txt']
  
  async extractText(filePath: string, buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8')
  }
  
  validateFile(buffer: Buffer): boolean {
    try {
      buffer.toString('utf-8')
      return true
    } catch {
      return false
    }
  }
}
```

## 📋 План реализации

### **Phase 1: Удаление textract и установка безопасных библиотек ✅ ЗАВЕРШЕН**

#### 1.1 Удаление textract ✅
```bash
npm uninstall textract @types/textract
```

#### 1.2 Установка безопасных библиотек ✅
```bash
npm install pdf-parse mammoth
```

#### 1.3 Создание специализированных процессоров ✅
```typescript
// src/lib/document-processors.ts - СОЗДАН
export class PDFProcessor implements DocumentProcessor { }
export class DOCXProcessor implements DocumentProcessor { }
export class TXTProcessor implements DocumentProcessor { }
```

### **Phase 2: Решение проблемы с DOC файлами 🎯 ТЕКУЩИЙ ЭТАП**

#### 2.1 Варианты решения DOC файлов:
- **Вариант A:** Конвертация DOC → DOCX через LibreOffice
- **Вариант B:** Использование `mammoth` с дополнительными опциями
- **Вариант C:** Рекомендация пользователям конвертировать в DOCX
- **Вариант D:** Поиск безопасной альтернативы для DOC

#### 2.2 Тестовые файлы доступны:
```
test-data/
├── pdf/ (5 файлов)
├── docx/ (4 файла)
├── doc/ (5 файлов) ⭐
└── txt/ (12 файлов)
```

#### 2.3 Тестирование основных форматов:
```bash
# Тест всех файлов
npx tsx scripts/test-upload-api.ts test

# Тест только основных форматов
npx tsx scripts/test-upload-api.ts test | grep -E "(pdf|docx|txt|doc)"
```

### **Phase 3: Обновление UI и валидации (1-2 дня)**

#### 3.1 Обновление компонента загрузки файлов
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
                PDF, TXT, DOCX до 50MB
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

#### 3.2 Статистика по форматам файлов
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

## 📊 Ожидаемые результаты

### **📚 Расширение контента:**
- **+300% форматов** - поддержка 4 основных типов файлов
- **📄 Офисные документы** - DOCX для деловой документации
- **📝 Простые тексты** - TXT файлы для заметок и выписок
- **📄 PDF документы** - для сканированных документов

### **🔧 Техническая надежность:**
- **Безопасные библиотеки** - нет уязвимостей
- **Специализированные парсеры** - лучшая производительность
- **Совместимость с Next.js** - стабильная работа
- **Детальная аналитика** - статистика по форматам

### **👤 Пользовательский опыт:**
- **Drag & Drop** для всех форматов
- **Визуальная индикация** поддерживаемых типов
- **Понятные ошибки** при загрузке неподдерживаемых файлов
- **Прогресс обработки** для каждого формата

## ✅ Критерии готовности

- [x] Удален textract с уязвимостями
- [x] Установлены безопасные специализированные библиотеки
- [x] Созданы специализированные процессоры для основных форматов
- [ ] Решение проблемы с DOC файлами
- [ ] Тестирование основных форматов из test-data
- [ ] UI показывает поддерживаемые форматы
- [ ] Статистика доступна по каждому формату
- [ ] LangChain.js интегрирован с специализированными парсерами
- [ ] Производительность оптимизирована для больших файлов

## 🔮 Будущие расширения

### **Планируемые форматы (отложены):**
- **FB2** - FictionBook (когда понадобится)
- **EPUB** - электронные книги (когда понадобится)
- **RTF** - Rich Text Format (когда понадобится)
- **ODT** - OpenDocument Text (когда понадобится)

### **Улучшения обработки:**
- **OCR для сканированных PDF** - извлечение текста из изображений
- **Обработка таблиц** - сохранение структуры данных
- **Извлечение метаданных** - автор, дата создания, теги
- **Многоязычная поддержка** - определение языка документа

---
*Multi-format support с безопасными специализированными библиотеками для основных форматов превращает RAG систему в надежный инструмент для работы с повседневными документами.*
