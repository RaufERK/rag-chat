#!/usr/bin/env tsx

import fs from 'fs/promises'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

async function testUploadDebug() {
  try {
    console.log('🔍 Debug upload test...')

    // Test with the smallest file
    const filePath = path.join(process.cwd(), 'test-data/txt/sample.txt')
    const fileBuffer = await fs.readFile(filePath)

    console.log(`📁 File: ${filePath}`)
    console.log(`📊 Size: ${fileBuffer.length} bytes`)
    console.log(
      `📝 Content preview: "${fileBuffer.toString('utf8', 0, 100)}..."`
    )

    // Create form data
    const formData = new FormData()
    formData.append('file', fileBuffer, {
      filename: 'sample.txt',
      contentType: 'text/plain',
    })
    formData.append('testMode', 'true')

    console.log('📤 Uploading...')

    const response = await fetch('http://localhost:3000/api/upload-clean', {
      method: 'POST',
      body: formData,
    })

    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`📄 Raw response (first 500 chars):`)
    console.log(responseText.substring(0, 500))

    // Try to parse as JSON if possible
    try {
      const json = JSON.parse(responseText)
      console.log('✅ Parsed JSON:', json)
    } catch (parseError) {
      console.log('❌ Not valid JSON, probably HTML error page')
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

if (require.main === module) {
  testUploadDebug()
}
