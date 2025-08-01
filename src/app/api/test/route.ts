import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Test API is working',
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test API: Processing POST request')

    // Test 1: Check if we can read the request
    const contentType = request.headers.get('content-type')
    console.log('📋 Content-Type:', contentType)

    // Test 2: Try to parse form data
    if (contentType?.includes('multipart/form-data')) {
      console.log('📤 Attempting to parse FormData...')
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (file) {
        console.log(`📁 File received: ${file.name} (${file.size} bytes)`)
        return NextResponse.json({
          success: true,
          message: 'FormData parsed successfully',
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
        })
      } else {
        console.log('❌ No file found in FormData')
        return NextResponse.json({
          success: false,
          message: 'No file found in FormData',
        })
      }
    } else {
      console.log('📝 Not FormData, trying to read as text...')
      const text = await request.text()
      console.log(`📄 Text received: ${text.length} characters`)

      return NextResponse.json({
        success: true,
        message: 'Text received successfully',
        textLength: text.length,
      })
    }
  } catch (error) {
    console.error('❌ Test API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
