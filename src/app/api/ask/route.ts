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
    let similarDocuments: any[] = []
    let hasQdrantError = false
    
    try {
      console.log('🔍 Searching for similar documents...')
      similarDocuments = await searchSimilar(questionEmbedding, 3, 0.05)
      console.log(`📊 Found ${similarDocuments.length} similar documents`)
    } catch (qdrantError) {
      console.error('❌ Qdrant error:', qdrantError)
      hasQdrantError = true
      similarDocuments = []
    }

    // 3. Формируем контекст из найденных документов
    const context =
      similarDocuments.length > 0
        ? similarDocuments.map((doc) => doc.content).join('\n\n')
        : undefined

    if (context) {
      console.log('📝 Using RAG context for answer generation')
    } else {
      if (hasQdrantError) {
        console.log('⚠️ Qdrant unavailable, using GPT only')
      } else {
        console.log('⚠️ No relevant documents found, using GPT only')
      }
    }

    // 4. Создаем сообщение пользователя
    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
    }

    // 5. Получаем ответ от OpenAI
    const answer = await getChatCompletion([userMessage], context)

    // 6. Формируем ответ с дополнительной информацией
    const response: AskResponse = {
      answer,
      sources: similarDocuments.length > 0 ? similarDocuments : undefined,
      hasContext: similarDocuments.length > 0,
      sourcesCount: similarDocuments.length,
      searchScore: similarDocuments.length > 0 ? 0.8 : undefined,
      qdrantStatus: hasQdrantError ? 'error' : 'ok'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/ask:', error)

    // Проверяем, является ли ошибка связанной с Qdrant
    if (error instanceof Error && error.message.includes('QDRANT_URL')) {
      return NextResponse.json(
        { 
          error: 'Vector database is not configured. Please set up Qdrant or use mock mode.',
          details: 'Qdrant configuration is missing or invalid'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
