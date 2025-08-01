import { QdrantVectorStore } from '@langchain/qdrant'
import { getEmbeddingVectors } from './embeddings'
import { randomUUID } from 'crypto'

/**
 * Lazy-loaded Qdrant Vector Store
 * Created only when needed to avoid env issues during import
 */
let vectorStoreInstance: QdrantVectorStore | null = null

/**
 * Get or create Qdrant Vector Store instance
 */
export function getVectorStore(): QdrantVectorStore {
  if (!vectorStoreInstance) {
    if (!process.env.QDRANT_URL) {
      throw new Error('QDRANT_URL environment variable is not set')
    }
    if (!process.env.QDRANT_API_KEY) {
      throw new Error('QDRANT_API_KEY environment variable is not set')
    }

    // Create a custom embeddings object that uses our direct OpenAI implementation
    const customEmbeddings = {
      embedQuery: async (text: string) => {
        const { getEmbeddingVector } = await import('./embeddings')
        return getEmbeddingVector(text)
      },
      embedDocuments: async (texts: string[]) => {
        return getEmbeddingVectors(texts)
      },
    }

    vectorStoreInstance = new QdrantVectorStore(customEmbeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName:
        process.env.QDRANT_COLLECTION_NAME || 'rag-chat-collection',
      collectionConfig: {
        vectors: {
          size: 1536, // OpenAI ada-002 embedding dimension
          distance: 'Cosine', // Cosine similarity for semantic search
        },
      },
    })
  }

  return vectorStoreInstance
}

/**
 * Search for similar documents using semantic similarity
 * @param query - Search query text
 * @param k - Number of documents to return
 * @param scoreThreshold - Minimum similarity score (0-1)
 * @returns Promise with documents and scores
 */
export async function searchSimilarDocuments(
  query: string,
  k: number = 8,
  scoreThreshold: number = 0.3
) {
  try {
    const vectorStore = getVectorStore()
    const results = await vectorStore.similaritySearchWithScore(query, k, {
      scoreThreshold,
    })

    return results.map(([document, score]) => ({
      document,
      score,
      content: document.pageContent,
      metadata: document.metadata,
    }))
  } catch (error) {
    console.error('❌ Error searching documents:', error)
    throw new Error(`Vector search failed: ${error.message}`)
  }
}

/**
 * Add documents to the vector store
 * @param documents - Array of LangChain Document objects
 * @returns Promise<string[]> - Array of document IDs
 */
export async function addDocuments(documents: any[]) {
  try {
    console.log(`🔗 [QDRANT] Starting to add ${documents.length} documents...`)
    const vectorStore = getVectorStore()

    console.log(`🔗 [QDRANT] Vector store initialized, adding documents...`)

    // Generate our own IDs since LangChain Qdrant doesn't return them
    const generatedIds = documents.map(() => randomUUID())

    // Add IDs to documents metadata
    const documentsWithIds = documents.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        id: generatedIds[index],
      },
    }))

    await vectorStore.addDocuments(documentsWithIds)

    console.log(
      `✅ [QDRANT] Added ${documents.length} documents to vector store`
    )
    console.log(`🔍 [QDRANT] Generated IDs:`, generatedIds)

    return generatedIds
  } catch (error) {
    console.error('❌ [QDRANT] Error adding documents:', error)
    console.error('❌ [QDRANT] Error details:', error.message)
    console.error('❌ [QDRANT] Error stack:', error.stack)
    throw new Error(`Failed to add documents: ${error.message}`)
  }
}

import { RAGSettings } from '@/lib/settings-service'

/**
 * Create retriever instance for RAG chains
 * @param options - Retrieval options
 * @returns VectorStoreRetriever instance
 */
export async function createRetriever(
  options: {
    k?: number
    scoreThreshold?: number
  } = {}
) {
  const vectorStore = getVectorStore()

  // Use database settings if not provided
  const k = options.k ?? (await RAGSettings.getRetrievalK())
  const scoreThreshold =
    options.scoreThreshold ?? (await RAGSettings.getScoreThreshold())

  return vectorStore.asRetriever({
    k,
    scoreThreshold,
    searchType: 'similarity_score_threshold',
  })
}
