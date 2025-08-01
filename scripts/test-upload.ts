import fs from 'fs'
import path from 'path'
import FormData from 'form-data'

const BASE_URL = 'http://localhost:3000'

async function testFileUpload() {
  console.log('🧪 Testing file upload functionality...')

  try {
    // Test 1: Simple TXT file
    console.log('\n📄 Test 1: Uploading simple TXT file...')
    const txtPath = path.join(process.cwd(), 'test-simple.txt')

    if (!fs.existsSync(txtPath)) {
      console.error('❌ Test file not found:', txtPath)
      return
    }

    const formData = new FormData()
    formData.append('file', fs.createReadStream(txtPath), {
      filename: 'test-simple.txt',
      contentType: 'text/plain',
    })

    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
      },
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ TXT upload successful:', {
        success: result.success,
        chunks: result.fileInfo?.chunks,
        vectorsCreated: result.fileInfo?.vectorsCreated,
        hash: result.fileInfo?.hash?.substring(0, 8) + '...',
      })
    } else {
      console.error('❌ TXT upload failed:', result)
    }

    // Test 2: Check if server is responsive
    console.log('\n🔍 Test 2: Checking server responsiveness...')
    const healthResponse = await fetch(`${BASE_URL}/api/auth/session`)
    if (healthResponse.ok) {
      console.log('✅ Server is responsive')
    } else {
      console.error('❌ Server not responding')
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testFileUpload()
  .then(() => {
    console.log('\n🏁 Testing completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error)
    process.exit(1)
  })
