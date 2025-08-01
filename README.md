# 🤖 RAG Chat

Интеллектуальный чат-бот с использованием Retrieval-Augmented Generation (RAG) на Next.js, TypeScript, OpenAI и Qdrant.

## 🚀 Технологии

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-3.5-turbo, OpenAI Embeddings API
- **Vector Database**: Qdrant Cloud
- **Styling**: Tailwind CSS

## 📋 Требования

- Node.js 18+ 
- OpenAI API ключ (или VPN для региональных ограничений)
- Qdrant Cloud аккаунт

## 🛠️ Установка

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd rag-chat
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Создайте файл `.env.local`:**
```bash
cp env.example .env.local
```

4. **Настройте переменные окружения в `.env.local`:**
```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_CHAT_MODEL=gpt-3.5-turbo

# Qdrant Configuration
QDRANT_URL=your_qdrant_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION_NAME=documents

# Development Settings
USE_MOCK=true  # Включить мок-режим для тестирования
```

## 🔧 Настройка Qdrant

1. Создайте аккаунт на [Qdrant Cloud](https://cloud.qdrant.io/)
2. Создайте новый кластер
3. Получите URL и API ключ
4. Добавьте их в `.env.local`

## 🌱 Загрузка данных

### Вариант 1: Полная загрузка с OpenAI (требует API ключ)
```bash
npm run seed
```

### Вариант 2: Загрузка с мок-данными (для тестирования)
```bash
npx tsx scripts/seed-mock.ts
```

### Вариант 3: Только создание коллекции
```bash
npx tsx scripts/seed-simple.ts
```

## 🚀 Запуск

1. **Запустите сервер разработки:**
```bash
npm run dev
```

2. **Откройте браузер:**
```
http://localhost:3000
```

3. **Перейдите к чату:**
```
http://localhost:3000/chat
```

## 🔄 Режимы работы

### Режим разработки (USE_MOCK=true)
- Использует фиктивные эмбеддинги и ответы
- Позволяет тестировать интерфейс без API ключей
- Показывает полный процесс RAG с поиском в Qdrant

### Продакшн режим (USE_MOCK=false)
- Использует реальные OpenAI API
- Требует валидный API ключ
- Полная функциональность RAG

## 📁 Структура проекта

```
src/
├── app/
│   ├── api/ask/route.ts    # API роут для обработки вопросов
│   ├── chat/page.tsx       # Страница чата
│   ├── layout.tsx          # Корневой layout
│   ├── page.tsx            # Главная страница
│   └── globals.css         # Глобальные стили
├── lib/
│   ├── types.ts            # TypeScript типы
│   ├── openai.ts           # Утилиты для OpenAI API
│   └── qdrant.ts           # Утилиты для Qdrant API
├── data/
│   └── seed.ts             # Seed-скрипт для загрузки данных
└── scripts/
    ├── seed.ts             # Основной seed-скрипт
    ├── seed-mock.ts        # Seed с мок-данными
    └── seed-simple.ts      # Только создание коллекции
```

## 🔄 Как это работает

1. **Пользователь задает вопрос** в интерфейсе
2. **Вопрос отправляется** на `/api/ask`
3. **Сервер получает эмбеддинг** вопроса через OpenAI Embeddings API (или мок)
4. **Ищет похожие документы** в Qdrant по векторному сходству
5. **Формирует контекст** из найденных документов
6. **Генерирует ответ** через OpenAI Chat API (или мок)
7. **Возвращает ответ** пользователю с источниками

## 🎯 Примеры вопросов

Попробуйте задать эти вопросы в чате:

- "Что такое Next.js?"
- "Как работает TypeScript?"
- "Объясни RAG технологию"
- "Что такое Qdrant?"
- "Как использовать Tailwind CSS?"

## 🔧 API Endpoints

### POST /api/ask

Обрабатывает вопросы пользователя.

**Request:**
```json
{
  "question": "Что такое Next.js?"
}
```

**Response:**
```json
{
  "answer": "Next.js — это React-фреймворк для создания веб-приложений...",
  "sources": [
    {
      "id": "1",
      "content": "Next.js — это React-фреймворк...",
      "metadata": {
        "category": "framework",
        "topic": "nextjs"
      }
    }
  ]
}
```

## 🚨 Решение проблем

### OpenAI API недоступен в регионе
**Ошибка:** `"Country, region, or territory not supported"`
**Решение:** 
- Включите VPN (США/Европа)
- Используйте `USE_MOCK=true` для тестирования

### Превышен лимит OpenAI API
**Ошибка:** `"insufficient_quota"`
**Решение:**
- Пополните баланс OpenAI
- Используйте `USE_MOCK=true` для тестирования

### Qdrant коллекция не найдена
**Ошибка:** `"Collection not found"`
**Решение:**
```bash
npx tsx scripts/seed-simple.ts
```

### Переменные окружения не загружаются
**Решение:**
- Убедитесь, что файл `.env.local` существует
- Перезапустите сервер: `npm run dev`

## 🚀 Деплой

### Vercel

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения в настройках проекта
3. Запустите деплой

### Другие платформы

Проект совместим с любыми платформами, поддерживающими Next.js.

## 🔍 Отладка

- Проверьте консоль браузера для ошибок фронтенда
- Проверьте логи сервера для ошибок API
- Убедитесь, что все переменные окружения настроены
- Проверьте подключение к Qdrant и OpenAI

## 📝 Лицензия

MIT

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 🏗️ Архитектура и планы развития

**📋 Для разработчиков и AI-ассистентов:**
- **[ARCHITECTURE/](./ARCHITECTURE/)** - Полная архитектурная документация
- **[ARCHITECTURE/MASTER-PLAN.md](./ARCHITECTURE/MASTER-PLAN.md)** - 🔥 Главный план развития проекта
- **[ARCHITECTURE/CRITICAL-README.md](./ARCHITECTURE/CRITICAL-README.md)** - ⚠️ Критически важная информация

**Текущий этап**: Поддержка файлов (PDF, DOCX, TXT, DOC)

## 📞 Поддержка

Если у вас есть вопросы или проблемы, создайте Issue в репозитории.
