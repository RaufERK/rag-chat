import { QdrantVectorStore } from '@langchain/qdrant'
import { embeddings } from './embeddings'

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

    vectorStoreInstance = new QdrantVectorStore(embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION_NAME || 'rag-chat-collection',
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
    const vectorStore = getVectorStore()
    const ids = await vectorStore.addDocuments(documents)
    console.log(`✅ Added ${documents.length} documents to vector store`)
    return ids
  } catch (error) {
    console.error('❌ Error adding documents:', error)
    throw new Error(`Failed to add documents: ${error.message}`)
  }
}

/**
 * Create retriever instance for RAG chains
 * @param options - Retrieval options
 * @returns VectorStoreRetriever instance
 */
export function createRetriever(
  options: {
    k?: number
    scoreThreshold?: number
  } = {}
) {
  const vectorStore = getVectorStore()
  return vectorStore.asRetriever({
    k: options.k || 8,
    scoreThreshold: options.scoreThreshold || 0.3,
    searchType: 'similarity_score_threshold',
  })
}
