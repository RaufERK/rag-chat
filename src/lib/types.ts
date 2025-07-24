export interface DocumentMetadata {
  category?: string
  topic?: string
}

export interface Document {
  id: string | number
  content: string
  metadata?: DocumentMetadata
}

export interface QdrantPoint {
  id: string | number
  vector: number[]
  payload: {
    content: string
    metadata?: DocumentMetadata
  }
}

export interface QdrantSearchResponse {
  result: Array<{
    id: string
    score: number
    payload: {
      content: string
      metadata?: DocumentMetadata
    }
  }>
  status: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AskRequest {
  question: string
}

export interface AskResponse {
  answer: string
  sources?: Document[]
  hasContext: boolean
  sourcesCount: number
  searchScore?: number
}
