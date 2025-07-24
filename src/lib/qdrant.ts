import { QdrantClient } from '@qdrant/js-client-rest'
import { QdrantPoint, Document, DocumentMetadata } from './types'

const QDRANT_URL = process.env.QDRANT_URL
const QDRANT_API_KEY = process.env.QDRANT_API_KEY
const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || 'documents'

if (!QDRANT_URL) {
  throw new Error('QDRANT_URL is not set in environment variables')
}

const client = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
})

export async function createCollection(): Promise<void> {
  try {
    await client.createCollection(QDRANT_COLLECTION_NAME, {
      vectors: {
        size: 1536, // OpenAI ada-002 embedding size
        distance: 'Cosine',
      },
    })
    console.log('Collection created successfully')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already exists')) {
      console.log('Collection already exists')
    } else {
      throw error
    }
  }
}

export async function upsertPoints(points: QdrantPoint[]): Promise<void> {
  for (const point of points) {
    await client.upsert(QDRANT_COLLECTION_NAME, {
      points: [
        {
          id: point.id,
          vector: point.vector,
          payload: {
            content: point.payload.content,
            metadata: point.payload.metadata,
          },
        },
      ],
    })
  }
}

export async function searchSimilar(
  vector: number[],
  limit: number = 5,
  scoreThreshold: number = 0.7
): Promise<Document[]> {
  const response = await client.search(QDRANT_COLLECTION_NAME, {
    vector: vector,
    limit: limit,
    score_threshold: scoreThreshold,
    with_payload: true,
  })

  return response.map((item) => ({
    id: String(item.id),
    content: String(item.payload?.content || ''),
    metadata: item.payload?.metadata as DocumentMetadata | undefined,
  }))
}

export async function deleteCollection(): Promise<void> {
  try {
    await client.deleteCollection(QDRANT_COLLECTION_NAME)
    console.log('Collection deleted successfully')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('not found')) {
      console.log('Collection does not exist')
    } else {
      throw error
    }
  }
}
