import { OpenAIEmbeddings } from '@langchain/openai'

/**
 * OpenAI Embeddings configuration for RAG system
 * Using text-embedding-ada-002 model for consistent results
 */
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: 'text-embedding-ada-002',
  batchSize: 512, // Process multiple texts at once for efficiency
  stripNewLines: true, // Clean up text formatting
})

/**
 * Get embedding for a single text
 * @param text - Text to embed
 * @returns Promise<number[]> - Embedding vector
 */
export async function getEmbeddingVector(text: string): Promise<number[]> {
  const result = await embeddings.embedQuery(text)
  return result
}

/**
 * Get embeddings for multiple texts
 * @param texts - Array of texts to embed
 * @returns Promise<number[][]> - Array of embedding vectors
 */
export async function getEmbeddingVectors(
  texts: string[]
): Promise<number[][]> {
  const results = await embeddings.embedDocuments(texts)
  return results
}
