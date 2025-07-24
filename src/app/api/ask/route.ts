import { NextRequest, NextResponse } from 'next/server'
import { getEmbedding, getChatCompletion } from '@/lib/openai'
import { searchSimilar } from '@/lib/qdrant'
import { AskRequest, AskResponse, ChatMessage } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: AskRequest = await request.json()
    const { question } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    // 1. Получаем эмбеддинг вопроса
    const questionEmbedding = await getEmbedding(question)

    // 2. Ищем похожие документы в Qdrant
    const similarDocuments = await searchSimilar(questionEmbedding, 3, 0.1)

    // 3. Формируем контекст из найденных документов
    const context =
      similarDocuments.length > 0
        ? similarDocuments.map((doc) => doc.content).join('\n\n')
        : undefined

    // 4. Создаем сообщение пользователя
    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
    }

    // 5. Получаем ответ от OpenAI
    const answer = await getChatCompletion([userMessage], context)

    // 6. Формируем ответ
    const response: AskResponse = {
      answer,
      sources: similarDocuments.length > 0 ? similarDocuments : undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/ask:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
