import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [MINIMAL UPLOAD] Processing file upload request')

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.log('❌ [MINIMAL UPLOAD] No file found in formData')
      return NextResponse.json(
        { step: 'file_check', error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(
      `📁 [MINIMAL UPLOAD] Received file: ${file.name} (${file.size} bytes, ${file.type})`
    )

    // Simple success response without file processing
    return NextResponse.json({
      success: true,
      step: 'completed',
      message: 'File received successfully (minimal version)',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    console.error('❌ [MINIMAL UPLOAD] Error:', error)
    return NextResponse.json(
      {
        success: false,
        step: 'error',
        error: 'Upload failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
