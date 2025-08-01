import dotenv from 'dotenv'
import { getVectorStore, addDocuments } from '../src/lib/langchain/vectorstore'

// Load environment variables
dotenv.config()

async function testQdrant() {
  console.log('🧪 Testing Qdrant connectivity...')

  try {
    // Test vector store initialization
    console.log('🔗 Testing vector store initialization...')
    const vectorStore = getVectorStore()
    console.log('✅ Vector store initialized successfully')

    // Test adding a simple document
    console.log('📝 Testing document addition...')
    const testDocuments = [
      {
        pageContent: 'This is a test document for Qdrant.',
        metadata: { source: 'test', type: 'txt' },
      },
    ]

    const ids = await addDocuments(testDocuments)
    console.log(`✅ Documents added successfully: ${ids?.length || 0} IDs`)

    console.log('🎉 All Qdrant tests passed!')
  } catch (error) {
    console.error('❌ Qdrant test failed:', error)
  }
}

testQdrant()
