import { ChatMessage } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo'

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

// Временная заглушка для тестирования
function shouldUseMock(): boolean {
  return (
    process.env.NODE_ENV === 'development' && process.env.USE_MOCK === 'true'
  )
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (shouldUseMock()) {
    // Возвращаем детерминированный эмбеддинг для тестирования
    console.log('Using mock embedding for:', text)
    
    // Создаем детерминированный эмбеддинг на основе текста
    const hash = text.toLowerCase().split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    
    return Array.from({ length: 1536 }, (_, i) => {
      const seed = (hash + i * 31) % 1000
      return (Math.sin(seed) * 0.5) // Значения от -0.5 до 0.5
    })
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: OPENAI_EMBEDDING_MODEL,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    })
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  const data = await response.json()
  return data.data[0].embedding
}

export async function getChatCompletion(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  if (shouldUseMock()) {
    // Возвращаем фиктивный ответ для тестирования
    const lastMessage = messages[messages.length - 1]
    console.log('Using mock chat completion for:', lastMessage.content)
    
    if (context) {
      return `Отличный вопрос! "${lastMessage.content}"\n\nНа основе найденной информации:\n\n${context}\n\nЭто демонстрационный ответ в мок-режиме. В реальном режиме здесь был бы ответ от OpenAI GPT.`
    } else {
      return `Вопрос: "${lastMessage.content}"\n\nК сожалению, в базе знаний не найдено релевантной информации для ответа на этот вопрос. Попробуйте переформулировать вопрос или задать другой.\n\nЭто демонстрационный ответ в мок-режиме.`
    }
  }

  const systemMessage: ChatMessage = {
    role: 'assistant',
    content: context
      ? `Ты — полезный ассистент. Используй следующую информацию для ответа на вопрос пользователя:\n\n${context}\n\nОтвечай на основе предоставленной информации. Если информации недостаточно, скажи об этом.`
      : 'Ты — полезный ассистент. Отвечай на вопросы пользователя.',
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      messages: [systemMessage, ...messages],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    })
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  const data = await response.json()
  return data.choices[0].message.content
}
