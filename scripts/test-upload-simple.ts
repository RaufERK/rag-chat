#!/usr/bin/env tsx

import fs from 'fs/promises'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

/**
 * Простой тест загрузки одного файла
 */

async function testSimpleUpload() {
  try {
    console.log('🧪 Testing simple TXT file upload...')

    // Test with the smallest file
    const filePath = path.join(process.cwd(), 'test-data/txt/sample.txt')
    const fileBuffer = await fs.readFile(filePath)

    console.log(`📁 File size: ${fileBuffer.length} bytes`)

    // Create form data
    const formData = new FormData()
    formData.append('file', fileBuffer, {
      filename: 'sample.txt',
      contentType: 'text/plain',
    })
    formData.append('testMode', 'true')

    // Upload file
    console.log('📤 Uploading to http://localhost:3001/api/upload...')
    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
    })

    console.log(`📊 Response status: ${response.status}`)

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Upload successful!')
      console.log('📋 Response:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ Upload failed!')
      console.log('📋 Error:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

if (require.main === module) {
  testSimpleUpload()
}
