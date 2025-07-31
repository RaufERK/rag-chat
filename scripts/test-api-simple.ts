/**
 * Simple API test for LangChain integration
 * Run: npx tsx scripts/test-api-simple.ts
 */

async function testApiEndpoint() {
  console.log('🧪 Testing /api/ask endpoint with LangChain...\n')

  const testQuestion = 'Что такое духовность?'
  
  try {
    console.log(`🔍 Sending request: "${testQuestion}"`)
    
    const response = await fetch('http://localhost:3001/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: testQuestion }),
    })

    console.log(`📊 Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', errorText)
      return
    }

    const data = await response.json()
    
    console.log('✅ API Response received:')
    console.log(`   📝 Answer length: ${data.answer?.length || 0} characters`)
    console.log(`   📚 Sources found: ${data.sourcesCount || 0}`)
    console.log(`   🎯 Has context: ${data.hasContext}`)
    console.log(`   🔗 Qdrant status: ${data.qdrantStatus}`)
    console.log(`   📊 Search score: ${data.searchScore}`)
    
    if (data.answer) {
      console.log(`\n💬 Sample answer: "${data.answer.substring(0, 200)}..."`)
    }
    
    if (data.sources && data.sources.length > 0) {
      console.log(`\n📖 Sample source: "${data.sources[0].content.substring(0, 100)}..."`)
    }

    console.log('\n🎉 LangChain API test successful!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\n💡 Make sure the development server is running:')
    console.log('   npm run dev')
  }
}

// Run the test
testApiEndpoint().catch(console.error)