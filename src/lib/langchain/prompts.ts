import { PromptTemplate } from '@langchain/core/prompts'

/**
 * Spiritual Assistant System Prompt
 * Defines the AI personality and behavior for spiritual guidance
 */
export const SPIRITUAL_SYSTEM_PROMPT = `Ты — мудрый и сочувствующий духовный ассистент, специализирующийся на вопросах духовности, саморазвития и метафизики.

Твои принципы:
• Отвечай с глубоким пониманием и состраданием
• Уважай все духовные традиции и пути
• Если информации недостаточно — честно скажи об этом
• Не навязывай свои убеждения, а предлагай размышления
• Помогай людям находить собственные ответы через вопросы
• Поощряй самостоятельное духовное исследование

{context}

Вопрос: {question}
Ответ:`

/**
 * Create spiritual assistant prompt template
 * @param includeContext - Whether to include context from documents
 * @returns PromptTemplate instance
 */
export function createSpiritualPrompt(
  includeContext: boolean = true
): PromptTemplate {
  if (includeContext) {
    return PromptTemplate.fromTemplate(`${SPIRITUAL_SYSTEM_PROMPT}

--- КОНТЕКСТ ИЗ ДУХОВНЫХ ИСТОЧНИКОВ ---

{context}

--- КОНЕЦ КОНТЕКСТА ---

Отвечай на основе предоставленной информации. Если информации недостаточно, скажи об этом. Не выдумывай и не добавляй от себя.

Вопрос: {question}
Ответ:`)
  } else {
    return PromptTemplate.fromTemplate(`${SPIRITUAL_SYSTEM_PROMPT}

Вопрос: {question}
Ответ:`)
  }
}

/**
 * Generic assistant prompt for non-spiritual queries
 */
export const GENERIC_SYSTEM_PROMPT = `Ты — полезный ассистент. Отвечай точно и информативно на основе предоставленного контекста.

{context}

Вопрос: {question}
Ответ:`

/**
 * Create generic prompt template
 * @returns PromptTemplate instance
 */
export function createGenericPrompt(): PromptTemplate {
  return PromptTemplate.fromTemplate(GENERIC_SYSTEM_PROMPT)
}

/**
 * Context formatting function
 * Formats retrieved documents into a coherent context string
 * @param documents - Array of documents with content and metadata
 * @returns Formatted context string
 */
export function formatContextForPrompt(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return 'Контекст не найден.'
  }

  return documents
    .map((doc, index) => {
      const content = doc.content || doc.pageContent || ''
      const metadata = doc.metadata || {}

      let formattedDoc = `[Источник ${index + 1}]`

      // Add metadata if available
      if (metadata.source) {
        formattedDoc += ` (${metadata.source})`
      }
      if (metadata.category) {
        formattedDoc += ` - ${metadata.category}`
      }

      formattedDoc += `:\n${content}`

      return formattedDoc
    })
    .join('\n\n')
}

/**
 * Enhanced context formatting with relevance scores
 * @param documents - Documents with scores
 * @returns Enhanced formatted context
 */
export function formatEnhancedContextForPrompt(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return 'Релевантная информация не найдена.'
  }

  let context = '=== НАЙДЕННАЯ ИНФОРМАЦИЯ ===\n\n'

  documents.forEach((doc, index) => {
    const content = doc.content || doc.pageContent || ''
    const metadata = doc.metadata || {}
    const score = doc.score
      ? ` (релевантность: ${Math.round(doc.score * 100)}%)`
      : ''

    context += `📖 Источник ${index + 1}${score}\n`

    if (metadata.source) {
      context += `📁 Файл: ${metadata.source}\n`
    }
    if (metadata.category) {
      context += `🏷️ Категория: ${metadata.category}\n`
    }
    if (metadata.topic) {
      context += `🎯 Тема: ${metadata.topic}\n`
    }

    context += `📄 Содержание:\n${content}\n\n---\n\n`
  })

  return context
}
