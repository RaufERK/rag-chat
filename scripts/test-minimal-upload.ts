import fs from 'fs'
import path from 'path'

async function runTests() {
  // Test 1: Check if all required modules can be imported
  console.log('🧪 Testing module imports...')

  try {
    console.log('📦 Testing database import...')
    const { getDatabase } = require('../src/lib/database')
    console.log('✅ Database module imported')

    console.log('📦 Testing file processor import...')
    const { MultiFormatFileProcessor } = require('../src/lib/file-processor-v2')
    console.log('✅ File processor module imported')

    console.log('📦 Testing document processors import...')
    const {
      documentProcessorFactory,
    } = require('../src/lib/document-processors')
    console.log('✅ Document processors module imported')

    console.log('📦 Testing file repository import...')
    const { FileRepository } = require('../src/lib/file-repository')
    console.log('✅ File repository module imported')

    console.log('📦 Testing file utils import...')
    const { FileUtils } = require('../src/lib/file-utils')
    console.log('✅ File utils module imported')
  } catch (error) {
    console.error('❌ Import error:', error)
    process.exit(1)
  }

  // Test 2: Check if test file exists and is readable
  console.log('\n📄 Testing file access...')
  const testFilePath = path.join(process.cwd(), 'test-simple.txt')

  try {
    if (fs.existsSync(testFilePath)) {
      console.log('✅ Test file exists')
      const stats = fs.statSync(testFilePath)
      console.log(`📊 File size: ${stats.size} bytes`)

      const content = fs.readFileSync(testFilePath, 'utf-8')
      console.log(`📝 File content length: ${content.length} characters`)
    } else {
      console.error('❌ Test file not found')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ File access error:', error)
    process.exit(1)
  }

  // Test 3: Test database connection
  console.log('\n🗄️ Testing database connection...')
  try {
    const { getDatabase } = require('../src/lib/database')
    const db = await getDatabase()
    console.log('✅ Database connected')

    // Test simple query
    const result = db.prepare('SELECT COUNT(*) as count FROM files').get()
    console.log(`📊 Files in database: ${result.count}`)
  } catch (error) {
    console.error('❌ Database error:', error)
    process.exit(1)
  }

  console.log('\n✅ All basic tests passed!')
}

// Run the tests
runTests()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error)
    process.exit(1)
  })
