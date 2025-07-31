# ⚙️ Admin Dashboard Plan

## 🎯 Цель: Конфигурируемая админ-панель с настройками в БД

Создать удобный интерфейс для управления всеми параметрами RAG системы с сохранением настроек в базе данных.

## 🔍 Текущее состояние

### **Что сейчас хардкодено:**
```typescript
// src/lib/openai.ts
const OPENAI_CHAT_MODEL = 'gpt-4o'
const temperature = 0.4
const max_tokens = 4000

// src/app/api/ask/route.ts  
const similarDocuments = await searchSimilar(questionEmbedding, 8, 0.3)
// k=8, threshold=0.3 - захардкожены
```

### **Проблемы:**
- ❌ Настройки разбросаны по коду
- ❌ Изменения требуют редеплоя
- ❌ Нет A/B тестирования параметров
- ❌ Нет истории изменений настроек

## 🎯 Новая система: Database-Driven Configuration

### **Что будет конфигурируемо:**

#### **🤖 AI Model Settings**
- `openai_chat_model` - модель для ответов (gpt-4o, gpt-3.5-turbo)
- `temperature` - креативность ответов (0.0-2.0)
- `max_tokens` - максимальная длина ответа (100-8000)
- `top_p` - nucleus sampling (0.0-1.0)
- `frequency_penalty` - штраф за повторения (-2.0-2.0)

#### **🔍 Search & Retrieval Settings**
- `retrieval_k` - количество документов для поиска (1-20)
- `score_threshold` - минимальный порог сходства (0.0-1.0)
- `rerank_enabled` - включить ли re-ranking (boolean)
- `rerank_boost_spiritual` - бустер для духовных терминов (1.0-5.0)
- `chunk_overlap` - перекрытие чанков (0-500)

#### **📝 Content Settings**
- `spiritual_prompt_enabled` - использовать духовный промпт (boolean)
- `context_max_length` - максимальная длина контекста (1000-10000)
- `sources_display_limit` - сколько источников показывать (1-10)
- `response_language` - язык ответов (ru, en)

#### **🚦 Rate Limiting & Security**
- `requests_per_minute` - лимит запросов в минуту (1-100)
- `max_file_size_mb` - максимальный размер файла (1-100)
- `allowed_file_types` - разрешенные типы файлов (json array)
- `session_timeout_hours` - таймаут сессии (1-168)

## 📋 План реализации

### **Phase 1: Схема конфигураций (1 день)**

#### 1.1 Расширенная таблица настроек
```sql
-- Расширяем существующую таблицу rag_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Основные поля
  category TEXT NOT NULL,                    -- 'ai', 'search', 'content', 'security'  
  parameter_name TEXT NOT NULL,
  parameter_value TEXT NOT NULL,
  default_value TEXT NOT NULL,
  
  -- Метаданные параметра
  parameter_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  validation_rule TEXT,                      -- JSON с правилами валидации
  display_name TEXT NOT NULL,                -- Человеко-читаемое название
  description TEXT,                          -- Описание параметра
  help_text TEXT,                           -- Подсказка для админа
  
  -- UI отображение
  ui_component TEXT DEFAULT 'input',         -- 'input', 'select', 'slider', 'toggle', 'textarea'
  ui_options TEXT,                          -- JSON с опциями для select/slider
  ui_order INTEGER DEFAULT 0,               -- Порядок отображения в группе
  
  -- Управление изменениями
  requires_restart BOOLEAN DEFAULT FALSE,    -- Требует ли перезапуск системы
  is_sensitive BOOLEAN DEFAULT FALSE,        -- Чувствительный параметр (пароли, ключи)
  is_readonly BOOLEAN DEFAULT FALSE,         -- Только для чтения
  
  -- Аудит
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  
  UNIQUE(category, parameter_name)
);

-- История изменений настроек
CREATE TABLE setting_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_id INTEGER REFERENCES system_settings(id) ON DELETE CASCADE,
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_setting_changes_setting ON setting_changes(setting_id);
CREATE INDEX idx_setting_changes_date ON setting_changes(created_at);
```

#### 1.2 Заполнение базовых настроек
```sql
-- AI Model Settings  
INSERT INTO system_settings (category, parameter_name, parameter_value, default_value, parameter_type, display_name, description, ui_component, ui_options, ui_order) VALUES
('ai', 'openai_chat_model', 'gpt-4o', 'gpt-4o', 'string', 'OpenAI Chat Model', 'Модель для генерации ответов', 'select', '["gpt-4o", "gpt-3.5-turbo", "gpt-4-turbo"]', 1),
('ai', 'temperature', '0.4', '0.4', 'number', 'Temperature', 'Креативность ответов (0.0 = точные, 2.0 = креативные)', 'slider', '{"min": 0, "max": 2, "step": 0.1}', 2),
('ai', 'max_tokens', '4000', '4000', 'number', 'Max Tokens', 'Максимальная длина ответа', 'slider', '{"min": 100, "max": 8000, "step": 100}', 3),
('ai', 'top_p', '1.0', '1.0', 'number', 'Top P', 'Nucleus sampling параметр', 'slider', '{"min": 0, "max": 1, "step": 0.05}', 4),
('ai', 'frequency_penalty', '0.0', '0.0', 'number', 'Frequency Penalty', 'Штраф за повторения в тексте', 'slider', '{"min": -2, "max": 2, "step": 0.1}', 5);

-- Search & Retrieval Settings
INSERT INTO system_settings (category, parameter_name, parameter_value, default_value, parameter_type, display_name, description, ui_component, ui_options, ui_order) VALUES
('search', 'retrieval_k', '8', '8', 'number', 'Retrieval K', 'Количество документов для поиска', 'slider', '{"min": 1, "max": 20, "step": 1}', 1),
('search', 'score_threshold', '0.3', '0.3', 'number', 'Score Threshold', 'Минимальный порог сходства', 'slider', '{"min": 0, "max": 1, "step": 0.05}', 2),
('search', 'rerank_enabled', 'true', 'true', 'boolean', 'Enable Re-ranking', 'Включить дополнительное ранжирование результатов', 'toggle', null, 3),
('search', 'rerank_boost_spiritual', '2.0', '2.0', 'number', 'Spiritual Terms Boost', 'Бустер для духовных терминов при ранжировании', 'slider', '{"min": 1, "max": 5, "step": 0.1}', 4);

-- Content Settings  
INSERT INTO system_settings (category, parameter_name, parameter_value, default_value, parameter_type, display_name, description, ui_component, ui_options, ui_order) VALUES
('content', 'spiritual_prompt_enabled', 'true', 'true', 'boolean', 'Spiritual Prompt', 'Использовать специализированный духовный промпт', 'toggle', null, 1),
('content', 'context_max_length', '6000', '6000', 'number', 'Max Context Length', 'Максимальная длина контекста для модели', 'slider', '{"min": 1000, "max": 15000, "step": 500}', 2),
('content', 'sources_display_limit', '5', '5', 'number', 'Sources Display Limit', 'Количество источников для отображения пользователю', 'slider', '{"min": 1, "max": 10, "step": 1}', 3),
('content', 'response_language', 'ru', 'ru', 'string', 'Response Language', 'Язык ответов системы', 'select', '["ru", "en"]', 4);

-- Security & Limits
INSERT INTO system_settings (category, parameter_name, parameter_value, default_value, parameter_type, display_name, description, ui_component, ui_options, ui_order) VALUES
('security', 'requests_per_minute', '20', '20', 'number', 'Requests Per Minute', 'Лимит запросов в минуту на пользователя', 'slider', '{"min": 1, "max": 100, "step": 1}', 1),
('security', 'max_file_size_mb', '10', '10', 'number', 'Max File Size (MB)', 'Максимальный размер загружаемого файла', 'slider', '{"min": 1, "max": 100, "step": 1}', 2),
('security', 'allowed_file_types', '["pdf", "txt", "docx"]', '["pdf", "txt", "docx"]', 'json', 'Allowed File Types', 'Разрешенные типы файлов для загрузки', 'textarea', null, 3),
('security', 'session_timeout_hours', '24', '24', 'number', 'Session Timeout (Hours)', 'Время жизни сессии пользователя', 'slider', '{"min": 1, "max": 168, "step": 1}', 4);
```

### **Phase 2: Configuration Service (1-2 дня)**

#### 2.1 Сервис конфигурации
```typescript
// src/lib/config-service.ts
import { database } from './database'

interface SystemSetting {
  id: number
  category: string
  parameter_name: string
  parameter_value: string
  default_value: string
  parameter_type: 'string' | 'number' | 'boolean' | 'json'
  display_name: string
  description?: string
  ui_component: string
  ui_options?: string
  requires_restart: boolean
}

class ConfigService {
  private cache: Map<string, any> = new Map()
  private cacheExpiry: number = 5 * 60 * 1000 // 5 минут

  // Получение значения настройки
  async get<T = any>(category: string, parameterName: string): Promise<T> {
    const cacheKey = `${category}.${parameterName}`
    
    // Проверяем кеш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.value
      }
    }

    // Загружаем из БД
    const db = await database
    const setting = await db.get(`
      SELECT parameter_value, parameter_type, default_value 
      FROM system_settings 
      WHERE category = ? AND parameter_name = ?
    `, [category, parameterName])

    if (!setting) {
      throw new Error(`Setting ${category}.${parameterName} not found`)
    }

    let value = setting.parameter_value || setting.default_value
    
    // Конвертируем тип
    if (setting.parameter_type === 'number') {
      value = parseFloat(value)
    } else if (setting.parameter_type === 'boolean') {
      value = value === 'true' || value === true
    } else if (setting.parameter_type === 'json') {
      value = JSON.parse(value)
    }

    // Кешируем
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now()
    })

    return value
  }

  // Получение всех настроек категории
  async getCategory(category: string): Promise<Record<string, any>> {
    const db = await database
    const settings = await db.all(`
      SELECT parameter_name, parameter_value, parameter_type, default_value
      FROM system_settings 
      WHERE category = ?
      ORDER BY ui_order
    `, [category])

    const result: Record<string, any> = {}
    
    for (const setting of settings) {
      let value = setting.parameter_value || setting.default_value
      
      if (setting.parameter_type === 'number') {
        value = parseFloat(value)
      } else if (setting.parameter_type === 'boolean') {
        value = value === 'true' || value === true
      } else if (setting.parameter_type === 'json') {
        value = JSON.parse(value)
      }
      
      result[setting.parameter_name] = value
    }

    return result
  }

  // Обновление настройки
  async update(
    category: string, 
    parameterName: string, 
    newValue: any, 
    updatedBy: number, 
    reason?: string
  ): Promise<void> {
    const db = await database
    
    // Получаем текущую настройку
    const currentSetting = await db.get(`
      SELECT id, parameter_value, parameter_type, requires_restart
      FROM system_settings 
      WHERE category = ? AND parameter_name = ?
    `, [category, parameterName])

    if (!currentSetting) {
      throw new Error(`Setting ${category}.${parameterName} not found`)
    }

    // Валидируем новое значение
    const validatedValue = this.validateValue(newValue, currentSetting.parameter_type)
    const stringValue = typeof validatedValue === 'object' 
      ? JSON.stringify(validatedValue) 
      : String(validatedValue)

    // Сохраняем историю изменений
    await db.run(`
      INSERT INTO setting_changes (
        setting_id, old_value, new_value, changed_by, change_reason
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      currentSetting.id,
      currentSetting.parameter_value,
      stringValue,
      updatedBy,
      reason
    ])

    // Обновляем настройку
    await db.run(`
      UPDATE system_settings 
      SET parameter_value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE category = ? AND parameter_name = ?
    `, [stringValue, updatedBy, category, parameterName])

    // Очищаем кеш
    this.cache.delete(`${category}.${parameterName}`)

    // Если требуется перезапуск - логируем предупреждение
    if (currentSetting.requires_restart) {
      console.warn(`⚠️ Setting ${category}.${parameterName} requires system restart to take effect`)
    }
  }

  // Сброс настройки к значению по умолчанию
  async reset(category: string, parameterName: string, updatedBy: number): Promise<void> {
    const db = await database
    
    const setting = await db.get(`
      SELECT default_value FROM system_settings 
      WHERE category = ? AND parameter_name = ?
    `, [category, parameterName])

    if (setting) {
      await this.update(category, parameterName, setting.default_value, updatedBy, 'Reset to default')
    }
  }

  // Получение UI конфигурации для админ-панели
  async getUIConfig(): Promise<Record<string, SystemSetting[]>> {
    const db = await database
    const settings = await db.all(`
      SELECT * FROM system_settings 
      WHERE is_readonly = FALSE
      ORDER BY category, ui_order
    `)

    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = []
      }
      acc[setting.category].push(setting)
      return acc
    }, {} as Record<string, SystemSetting[]>)

    return grouped
  }

  private validateValue(value: any, type: string): any {
    switch (type) {
      case 'number':
        const num = parseFloat(value)
        if (isNaN(num)) throw new Error('Invalid number value')
        return num
      
      case 'boolean':
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') return value === 'true'
        throw new Error('Invalid boolean value')
      
      case 'json':
        if (typeof value === 'object') return value
        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch {
            throw new Error('Invalid JSON value')
          }
        }
        throw new Error('Invalid JSON value')
      
      default:
        return String(value)
    }
  }

  // Очистка кеша (для тестирования или принудительного обновления)
  clearCache(): void {
    this.cache.clear()
  }
}

export const configService = new ConfigService()

// Хелпер функции для быстрого доступа к частым настройкам
export async function getAISettings() {
  return await configService.getCategory('ai')
}

export async function getSearchSettings() {
  return await configService.getCategory('search')
}

export async function getContentSettings() {
  return await configService.getCategory('content')
}

export async function getSecuritySettings() {
  return await configService.getCategory('security')
}
```

#### 2.2 Интеграция с RAG системой
```typescript
// src/lib/langchain/dynamic-chain.ts
import { configService } from '@/lib/config-service'
import { ChatOpenAI } from "@langchain/openai"
import { RetrievalQAChain } from "langchain/chains"

export async function createDynamicRagChain() {
  // Получаем актуальные настройки из БД
  const aiSettings = await configService.getCategory('ai')
  const searchSettings = await configService.getCategory('search')
  const contentSettings = await configService.getCategory('content')

  // Создаем LLM с динамическими параметрами
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: aiSettings.openai_chat_model,
    temperature: aiSettings.temperature,
    maxTokens: aiSettings.max_tokens,
    topP: aiSettings.top_p,
    frequencyPenalty: aiSettings.frequency_penalty,
  })

  // Создаем retriever с динамическими параметрами
  const retriever = vectorStore.asRetriever({
    k: searchSettings.retrieval_k,
    scoreThreshold: searchSettings.score_threshold,
  })

  // Выбираем промпт на основе настроек
  const prompt = contentSettings.spiritual_prompt_enabled 
    ? createSpiritualPrompt() 
    : createGenericPrompt()

  return RetrievalQAChain.fromLLM(llm, retriever, {
    prompt,
    returnSourceDocuments: true,
  })
}

// Обновленный API endpoint
// src/app/api/ask/route.ts
export async function POST(request: Request) {
  const { question } = await request.json()
  
  try {
    // Создаем цепочку с актуальными настройками
    const ragChain = await createDynamicRagChain()
    
    const result = await ragChain.call({
      query: question,
    })
    
    // Лимитируем количество источников на основе настроек
    const contentSettings = await configService.getCategory('content')
    const sources = result.sourceDocuments.slice(0, contentSettings.sources_display_limit)
    
    return NextResponse.json({
      answer: result.text,
      sources: sources.map(doc => ({
        id: doc.metadata.id,
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
      hasContext: sources.length > 0,
      sourcesCount: sources.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Query processing failed', details: error.message },
      { status: 500 }
    )
  }
}
```

### **Phase 3: Admin UI Components (2-3 дня)**

#### 3.1 Главная страница настроек
```typescript
// src/app/admin/settings/page.tsx
import { configService } from '@/lib/config-service'
import { SettingsCategory } from '@/components/admin/SettingsCategory'
import { SettingsHeader } from '@/components/admin/SettingsHeader'

export default async function SettingsPage() {
  const uiConfig = await configService.getUIConfig()
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <SettingsHeader />
      
      {Object.entries(uiConfig).map(([category, settings]) => (
        <SettingsCategory 
          key={category}
          category={category}
          settings={settings}
        />
      ))}
    </div>
  )
}
```

#### 3.2 Компонент категории настроек
```typescript
// src/components/admin/SettingsCategory.tsx
'use client'

import { useState } from 'react'
import { SettingControl } from './SettingControl'
import { SaveButton } from './SaveButton'

const CATEGORY_TITLES = {
  ai: '🤖 AI Model Settings',
  search: '🔍 Search & Retrieval',
  content: '📝 Content Settings', 
  security: '🚦 Security & Limits'
}

const CATEGORY_DESCRIPTIONS = {
  ai: 'Настройки OpenAI модели и параметров генерации ответов',
  search: 'Параметры поиска и ранжирования документов',
  content: 'Настройки контента и отображения ответов',
  security: 'Лимиты безопасности и ограничения системы'
}

export function SettingsCategory({ category, settings }) {
  const [values, setValues] = useState(() => {
    const initial = {}
    settings.forEach(setting => {
      let value = setting.parameter_value || setting.default_value
      if (setting.parameter_type === 'number') value = parseFloat(value)
      if (setting.parameter_type === 'boolean') value = value === 'true'
      if (setting.parameter_type === 'json') value = JSON.parse(value)
      initial[setting.parameter_name] = value
    })
    return initial
  })
  
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleValueChange = (parameterName: string, newValue: any) => {
    setValues(prev => ({ ...prev, [parameterName]: newValue }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Сохраняем все изменения
      const updates = []
      for (const setting of settings) {
        const currentValue = values[setting.parameter_name]
        const originalValue = setting.parameter_value || setting.default_value
        
        if (currentValue !== originalValue) {
          updates.push({
            category,
            parameter_name: setting.parameter_name,
            new_value: currentValue
          })
        }
      }

      if (updates.length > 0) {
        const response = await fetch('/api/admin/settings/bulk-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        })

        if (response.ok) {
          setHasChanges(false)
          // Показываем уведомление об успехе
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const resetValues = {}
    settings.forEach(setting => {
      let value = setting.default_value
      if (setting.parameter_type === 'number') value = parseFloat(value)
      if (setting.parameter_type === 'boolean') value = value === 'true'  
      if (setting.parameter_type === 'json') value = JSON.parse(value)
      resetValues[setting.parameter_name] = value
    })
    setValues(resetValues)
    setHasChanges(true)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {CATEGORY_TITLES[category] || category}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {CATEGORY_DESCRIPTIONS[category]}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset to Defaults
            </button>
            
            <SaveButton 
              onClick={handleSave}
              hasChanges={hasChanges}
              saving={saving}
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {settings.map(setting => (
          <SettingControl
            key={setting.parameter_name}
            setting={setting}
            value={values[setting.parameter_name]}
            onChange={(value) => handleValueChange(setting.parameter_name, value)}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 3.3 Универсальный контрол настроек
```typescript
// src/components/admin/SettingControl.tsx
'use client'

interface SettingControlProps {
  setting: SystemSetting
  value: any
  onChange: (value: any) => void
}

export function SettingControl({ setting, value, onChange }) {
  const renderControl = () => {
    switch (setting.ui_component) {
      case 'slider':
        const options = JSON.parse(setting.ui_options || '{}')
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={options.min || 0}
              max={options.max || 100}
              step={options.step || 1}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{options.min || 0}</span>
              <span className="font-medium text-gray-900">{value}</span>
              <span>{options.max || 100}</span>
            </div>
          </div>
        )

      case 'select':
        const selectOptions = JSON.parse(setting.ui_options || '[]')
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {selectOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'toggle':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative w-11 h-6 rounded-full transition-colors ${
              value ? 'bg-blue-600' : 'bg-gray-300'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
            <span className="ml-3 text-sm text-gray-700">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        )

      case 'textarea':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onChange(parsed)
              } catch {
                onChange(e.target.value)
              }
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Enter JSON or text..."
          />
        )

      default: // input
        return (
          <input
            type={setting.parameter_type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => {
              const newValue = setting.parameter_type === 'number' 
                ? parseFloat(e.target.value) 
                : e.target.value
              onChange(newValue)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900">
          {setting.display_name}
        </label>
        {setting.requires_restart && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Requires restart
          </span>
        )}
      </div>
      
      {setting.description && (
        <p className="text-sm text-gray-600">{setting.description}</p>
      )}
      
      {renderControl()}
      
      {setting.help_text && (
        <p className="text-xs text-gray-500">{setting.help_text}</p>
      )}
    </div>
  )
}
```

### **Phase 4: API endpoints для управления настройками (1 день)**

#### 4.1 Bulk update endpoint
```typescript
// src/app/api/admin/settings/bulk-update/route.ts
import { auth } from '@/lib/auth'
import { configService } from '@/lib/config-service'

export async function POST(request: Request) {
  const session = await auth()
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const { updates } = await request.json()
    
    // Валидируем запрос
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 })
    }

    const results = []
    
    for (const update of updates) {
      try {
        await configService.update(
          update.category,
          update.parameter_name,
          update.new_value,
          parseInt(session.user.id),
          'Bulk update from admin panel'
        )
        
        results.push({
          parameter: `${update.category}.${update.parameter_name}`,
          status: 'success'
        })
      } catch (error) {
        results.push({
          parameter: `${update.category}.${update.parameter_name}`,
          status: 'error',
          message: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      updated_count: results.filter(r => r.status === 'success').length
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Bulk update failed', details: error.message },
      { status: 500 }
    )
  }
}
```

#### 4.2 Settings history endpoint
```typescript
// src/app/api/admin/settings/history/route.ts
export async function GET(request: Request) {
  const session = await auth()
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const db = await database
    const history = await db.all(`
      SELECT 
        sc.*,
        ss.category,
        ss.parameter_name,
        ss.display_name,
        u.email as changed_by_email
      FROM setting_changes sc
      JOIN system_settings ss ON sc.setting_id = ss.id
      LEFT JOIN users u ON sc.changed_by = u.id
      ORDER BY sc.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset])

    const total = await db.get(`
      SELECT COUNT(*) as count FROM setting_changes
    `)

    return NextResponse.json({
      history,
      pagination: {
        total: total.count,
        limit,
        offset,
        has_more: total.count > offset + limit
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    )
  }
}
```

## 📊 Ожидаемые результаты

### **Операционные преимущества:**
- ⚡ **Instant configuration** - изменения без редеплоя
- 📊 **A/B testing** возможность для параметров RAG
- 📝 **Full audit trail** всех изменений настроек
- 🎯 **Fine-tuning** качества ответов в реальном времени

### **Пользовательский опыт:**
- 🖱️ **Intuitive UI** - слайдеры, переключатели, селекты
- 💡 **Context help** для каждого параметра
- ⚠️ **Smart warnings** о параметрах требующих рестарта
- 🔄 **One-click reset** к значениям по умолчанию

### **Техническая надежность:**
- 🏆 **Validation** входящих значений
- 💾 **Caching** для производительности
- 📊 **Monitoring** изменений конфигурации
- 🔒 **Role-based access** к критическим настройкам

## ✅ Критерии готовности

- [ ] Все RAG параметры управляемы через админку
- [ ] UI интуитивно понятен и отзывчив
- [ ] Валидация предотвращает некорректные значения
- [ ] Аудит логи фиксируют все изменения
- [ ] Кеширование обеспечивает производительность
- [ ] Система работает без редеплоя при изменении настроек

---
*Конфигурируемая админ-панель - последний штрих продакшн-системы.*