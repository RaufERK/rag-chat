#!/usr/bin/env tsx

import fs from 'fs/promises'
import path from 'path'

async function testWordExtractor() {
  try {
    console.log('🧪 Testing word-extractor import...')

    // Try to import word-extractor
    const WordExtractor = await import('word-extractor')
    console.log('✅ word-extractor imported successfully')
    console.log('📋 WordExtractor:', typeof WordExtractor.default)

    // Try to create an instance
    const extractor = new WordExtractor.default()
    console.log('✅ WordExtractor instance created')

    // Try to extract from a DOC file
    const filePath = path.join(process.cwd(), 'test-data/doc/test_file_doc.doc')
    const buffer = await fs.readFile(filePath)
    console.log(`📁 File loaded: ${buffer.length} bytes`)

    const extracted = await extractor.extract(buffer)
    const body = extracted.getBody()
    console.log(`📝 Text extracted: ${body.length} characters`)
    console.log(`📖 Preview: "${body.substring(0, 100)}..."`)

    console.log('🎉 word-extractor test successful!')
  } catch (error) {
    console.error('❌ word-extractor test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

if (require.main === module) {
  testWordExtractor()
}
