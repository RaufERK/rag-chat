# 🏗️ RAG Chat - Архитектурная документация

## 🎯 НАЧНИТЕ ЗДЕСЬ

**Для новых разработчиков и AI-ассистентов:**

1. **[MASTER-PLAN.md](./MASTER-PLAN.md)** - 🔥 **ГЛАВНЫЙ ДОКУМЕНТ** - Глобальный план развития проекта
2. **[CRITICAL-README.md](./CRITICAL-README.md)** - ⚠️ **ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ** - Критически важная информация

---

## 📋 Детальные планы по этапам

### 🔥 ЭТАП 1: Поддержка файлов (ТЕКУЩИЙ)
- **[multi-format-support-plan.md](./multi-format-support-plan.md)** - Поддержка PDF, DOCX, TXT, DOC
- **[file-management-plan.md](./file-management-plan.md)** - Система управления файлами и конвертации в TXT

### 🧠 ЭТАП 2: Контекстные диалоги (СЛЕДУЮЩИЙ)
- **[langchain-integration-plan.md](./langchain-integration-plan.md)** - LangChain интеграция и memory chains

### ⚙️ ЭТАП 3: Админ настройки
- **[admin-dashboard-plan.md](./admin-dashboard-plan.md)** - Административная панель с настройками

### 🚀 ЭТАП 4: Масштабирование
- **[user-system-plan.md](./user-system-plan.md)** - Система пользователей
- **[migration-plan.md](./migration-plan.md)** - План миграций и обновлений

---

## 📊 Специализированные планы

- **[rag-source-oriented-plan.md](./rag-source-oriented-plan.md)** - RAG архитектура и поиск

---

## 🎯 Текущий статус проекта

**Этап**: 1 - Поддержка файлов  
**Приоритет**: Реализация поддержки DOC файлов  
**Тестовые данные**: `../test-data/FILE_INDEX.md`

### ✅ Готово
- PDF, DOCX, TXT поддержка
- Базовая RAG система
- Админ-панель
- LangChain интеграция

### 🔄 В работе
- DOC файлы поддержка
- Конвертация всех файлов в TXT
- Дедупликация по хешу

---

## 🚨 Критически важно

- **Коммиты только с разрешения пользователя!**
- **OpenAI API требует VPN в некоторых регионах**
- **Все файлы должны конвертироваться в TXT формат**

---

## 🔧 Технический стек

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT, LangChain, Qdrant
- **Backend**: Next.js API, Better-SQLite3
- **Auth**: NextAuth.js
