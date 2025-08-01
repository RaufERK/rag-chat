import dotenv from 'dotenv'
import {
  getEmbeddingVector,
  getEmbeddingVectors,
} from '../src/lib/langchain/embeddings'

// Load environment variables
dotenv.config()

async function testEmbeddings() {
  console.log('🧪 Testing embeddings functionality...')

  try {
    // Test single embedding
    console.log('📝 Testing single embedding...')
    const singleEmbedding = await getEmbeddingVector('This is a test sentence.')
    console.log(
      `✅ Single embedding created: ${singleEmbedding.length} dimensions`
    )

    // Test batch embeddings
    console.log('📦 Testing batch embeddings...')
    const texts = [
      'First test sentence.',
      'Second test sentence.',
      'Third test sentence.',
    ]
    const batchEmbeddings = await getEmbeddingVectors(texts)
    console.log(
      `✅ Batch embeddings created: ${batchEmbeddings.length} embeddings`
    )

    console.log('🎉 All embedding tests passed!')
  } catch (error) {
    console.error('❌ Embedding test failed:', error)
  }
}

testEmbeddings()
