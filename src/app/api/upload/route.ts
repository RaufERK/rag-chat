import { NextRequest, NextResponse } from 'next/server'
import { writeFile, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { documentProcessorFactory } from '@/lib/document-processors-clean'
import { FileRepository } from '@/lib/file-repository'
import { getEmbeddingVectors } from '@/lib/langchain/embeddings'
import { addDocuments } from '@/lib/langchain/vectorstore'
import { Document } from '@langchain/core/documents'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [UPLOAD] Processing file upload request')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const testMode = formData.get('testMode') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(
      `📁 [UPLOAD] File: ${file.name} (${file.size} bytes, ${file.type})`
    )

    // Get processor
    const processor = documentProcessorFactory.getProcessor(
      file.name,
      file.type
    )
    if (!processor) {
      const supportedExtensions =
        documentProcessorFactory.getSupportedExtensions()
      return NextResponse.json(
        {
          error: `Unsupported file format. Supported: ${supportedExtensions.join(
            ', '
          )}`,
        },
        { status: 400 }
      )
    }

    console.log(`🔧 [UPLOAD] Using processor: ${processor.constructor.name}`)

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate file
    if (!processor.validateFile(buffer)) {
      return NextResponse.json(
        { error: 'File validation failed' },
        { status: 400 }
      )
    }

    // Calculate file hash for deduplication
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    // Check if file already exists in database
    const existingFile = await FileRepository.findByHash(fileHash)

    if (existingFile) {
      console.log(`📋 [UPLOAD] File already exists: ${existingFile.filename}`)
      return NextResponse.json({
        success: true,
        message: 'File already exists in database',
        fileId: existingFile.id,
        filename: existingFile.filename,
        existing: true,
      })
    }

    // Extract text
    const text = await processor.extractText('', buffer)
    console.log(`📝 [UPLOAD] Extracted ${text.length} characters`)

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from file' },
        { status: 400 }
      )
    }

    // If in test mode, just return the extracted text
    if (testMode === 'true') {
      return NextResponse.json({
        success: true,
        filename: file.name,
        size: file.size,
        type: file.type,
        processor: processor.constructor.name,
        textLength: text.length,
        preview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        testMode: true,
        hash: fileHash,
      })
    }

    // Save file to database
    const fileId = await FileRepository.createFile({
      filename: file.name,
      original_name: file.name,
      file_hash: fileHash,
      file_size: file.size,
      mime_type: file.type,
      metadata: {
        textContent: text,
        status: 'processing',
      },
    })

    console.log(`💾 [UPLOAD] Saved file to database: ID ${fileId}`)

    try {
      // Generate embeddings
      console.log(`🔗 [UPLOAD] Generating embeddings...`)
      const embeddings = await getEmbeddingVectors(text)
      console.log(`✅ [UPLOAD] Generated ${embeddings.length} embeddings`)

      // Create document for vector store
      const document = new Document({
        pageContent: text,
        metadata: {
          fileId: fileId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          hash: fileHash,
          uploadedAt: new Date().toISOString(),
        },
      })

      // Add to vector store
      await addDocuments([document])
      console.log(`🗄️ [UPLOAD] Added document to vector store`)

      // Note: FileRepository doesn't have update method, so we skip status update for now

      return NextResponse.json({
        success: true,
        message: 'File uploaded and processed successfully',
        fileId: fileId,
        filename: file.name,
        size: file.size,
        textLength: text.length,
        embeddingsCount: embeddings.length,
        processor: processor.constructor.name,
      })
    } catch (embeddingError) {
      console.error('❌ [UPLOAD] Embedding error:', embeddingError)

      // Note: FileRepository doesn't have update method, so we skip status update for now

      return NextResponse.json(
        {
          error: 'File uploaded but embedding failed',
          details: embeddingError.message,
          fileId: fileId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ [UPLOAD] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
