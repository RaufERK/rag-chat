import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [SIMPLE UPLOAD] Processing file upload request')

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.log('❌ [SIMPLE UPLOAD] No file found in formData')
      return NextResponse.json(
        { step: 'file_check', error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(
      `📁 [SIMPLE UPLOAD] Received file: ${file.name} (${file.size} bytes, ${file.type})`
    )

    // Create temporary directory for processing
    const processId = randomUUID()
    const uploadDir = join(
      process.cwd(),
      'uploads',
      'temp',
      'processing',
      processId
    )
    const filePath = join(uploadDir, file.name)

    // Create processing directory
    await mkdir(uploadDir, { recursive: true })
    console.log(`📁 [SIMPLE UPLOAD] Created temporary directory: ${uploadDir}`)

    // Save file to temporary location
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    console.log(`💾 [SIMPLE UPLOAD] File saved to: ${filePath}`)

    // Simple success response
    return NextResponse.json({
      success: true,
      step: 'completed',
      message: 'File uploaded successfully (simple version)',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        savedPath: filePath,
        processId: processId,
      },
    })
  } catch (error) {
    console.error('❌ [SIMPLE UPLOAD] Error:', error)
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
