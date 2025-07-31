import { NextRequest, NextResponse } from 'next/server'
import { createEnhancedRAGChain } from '@/lib/langchain/rag-chain'
import { AskRequest, AskResponse, Document } from '@/lib/types'

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

    console.log('🦜 Using LangChain Enhanced RAG Chain for query:', question)

    // 1. Create enhanced RAG chain instance
    const ragChain = createEnhancedRAGChain()

    // 2. Process query through LangChain RAG pipeline
    let ragResult: {
      text: string
      sourceDocuments: any[]
      relevanceScores: number[]
    }

    let hasQdrantError = false

    try {
      console.log('🔍 Processing query with LangChain RAG...')
      ragResult = await ragChain.call({ query: question })
      console.log(
        `📊 Found ${ragResult.sourceDocuments.length} relevant documents`
      )
    } catch (chainError) {
      console.error('❌ RAG Chain error:', chainError)
      hasQdrantError = true

      // Fallback to GPT-only response
      ragResult = {
        text: 'Извините, произошла ошибка при поиске в базе знаний. Попробуйте переформулировать вопрос.',
        sourceDocuments: [],
        relevanceScores: [],
      }
    }

    // 3. Convert LangChain documents to our format for compatibility
    const sources: Document[] = ragResult.sourceDocuments.map((doc, index) => ({
      id: doc.metadata?.id || `doc_${index}`,
      content: doc.content || doc.pageContent || '',
      metadata: {
        ...doc.metadata,
        score: ragResult.relevanceScores[index] || doc.score || 0,
        relevanceScore: ragResult.relevanceScores[index] || doc.score || 0,
      },
    }))

    if (sources.length > 0) {
      console.log('📝 ✅ LangChain RAG generated response with context')
    } else {
      if (hasQdrantError) {
        console.log('⚠️ Qdrant/LangChain unavailable, using fallback response')
      } else {
        console.log('⚠️ No relevant documents found, using GPT-only response')
      }
    }

    // 4. Format response to match existing API contract
    const response: AskResponse = {
      answer: ragResult.text,
      sources: sources.length > 0 ? sources : undefined,
      hasContext: sources.length > 0,
      sourcesCount: sources.length,
      searchScore:
        sources.length > 0
          ? Math.max(...ragResult.relevanceScores, 0.85) // Higher score due to LangChain enhancement
          : undefined,
      qdrantStatus: hasQdrantError ? 'error' : 'ok',
    }

    console.log('🎉 LangChain RAG response ready:', {
      hasContext: response.hasContext,
      sourcesCount: response.sourcesCount,
      answerLength: response.answer.length,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error in /api/ask (LangChain):', error)

    // Enhanced error handling for LangChain specific issues
    if (error instanceof Error) {
      if (
        error.message.includes('QDRANT_URL') ||
        error.message.includes('vector store')
      ) {
        return NextResponse.json(
          {
            error: 'Vector database is not configured. Please set up Qdrant.',
            details: 'LangChain Qdrant connection failed',
          },
          { status: 503 }
        )
      }

      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          {
            error: 'OpenAI API key is not configured.',
            details: 'LangChain OpenAI connection failed',
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'LangChain RAG pipeline failed',
      },
      { status: 500 }
    )
  }
}
