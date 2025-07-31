import { NextRequest, NextResponse } from 'next/server'
import { writeFile, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { FileUtils } from '@/lib/file-utils'
import {
  processMultiFormatFile,
  MultiFormatFileProcessor,
} from '@/lib/file-processor-v2'
import { FileRepository } from '@/lib/file-repository'
import { getEmbeddingVectors } from '@/lib/langchain/embeddings'
import { addDocuments } from '@/lib/langchain/vectorstore'
import { Document } from '@langchain/core/documents'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [MULTI-FORMAT UPLOAD] Processing file upload request')
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.log('❌ [UPLOAD] No file found in formData')
      return NextResponse.json(
        { step: 'file_check', error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(
      `📁 [UPLOAD] Received file: ${file.name} (${file.size} bytes, ${file.type})`
    )

    // Enhanced validation with multi-format support
    const validation = FileUtils.validateFile({
      size: file.size,
      mimetype: file.type,
      originalname: file.name,
    })

    if (!validation.valid) {
      console.log(`❌ [UPLOAD] Validation failed: ${validation.error}`)
      return NextResponse.json(
        { step: 'validation', error: validation.error },
        { status: 400 }
      )
    }

    // Check if file format is supported by new multi-format system
    if (!MultiFormatFileProcessor.isFormatSupported(file.name, file.type)) {
      const supportedFormats = MultiFormatFileProcessor.getSupportedFormats()
      console.log(`❌ [UPLOAD] Unsupported file format: ${file.name}`)
      return NextResponse.json(
        {
          step: 'format_check',
          error: `Unsupported file format. Supported formats: ${supportedFormats.extensions.join(
            ', '
          )}`,
        },
        { status: 400 }
      )
    }

    console.log('✅ [UPLOAD] File format supported by multi-format processor')

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
    console.log(`📁 [UPLOAD] Created temporary directory: ${uploadDir}`)

    // Save file to temporary location
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    console.log(`💾 [UPLOAD] File saved to: ${filePath}`)

    let processedFile
    try {
      // Process file with new multi-format system
      console.log(
        '🔄 [MULTI-FORMAT] Processing file with enhanced processor...'
      )
      processedFile = await processMultiFormatFile(
        filePath,
        file.name,
        file.type
      )

      console.log(
        `✅ [MULTI-FORMAT] File processed successfully:
        - Format: ${processedFile.metadata.format}
        - Processor: ${processedFile.metadata.processor}
        - Chunks: ${processedFile.chunks.length}
        - Hash: ${processedFile.hash.substring(0, 8)}...`
      )

      // Check for duplicates using file hash
      try {
        const existingFile = await FileRepository.findByHash(processedFile.hash)
        if (existingFile) {
          console.log('⚠️ [UPLOAD] Duplicate file detected, cleaning up...')
          await rm(uploadDir, { recursive: true, force: true })

          return NextResponse.json({
            success: true,
            step: 'duplicate_check',
            message: 'File was already uploaded previously',
            isDuplicate: true,
            fileInfo: {
              name: file.name,
              hash: processedFile.hash,
              format: processedFile.metadata.format,
              existingData: existingFile,
            },
          })
        }
      } catch (dbError) {
        console.log(
          '⚠️ [UPLOAD] Database error during duplicate check:',
          dbError
        )
        // Continue processing even if DB is unavailable
      }

      console.log('🚀 [UPLOAD] Processing new file - no duplicates found')
      // Create LangChain Documents from chunks for vector storage
      console.log('📄 [LANGCHAIN] Creating LangChain documents from chunks...')
      const documents = processedFile.chunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk.content,
          metadata: {
            chunkIndex: index,
            fileName: file.name,
            fileHash: processedFile.hash,
            format: processedFile.metadata.format,
            processor: processedFile.metadata.processor,
            uploadDate: new Date().toISOString(),
            ...processedFile.metadata,
          },
        })
      })

      console.log(
        `📊 [LANGCHAIN] Created ${documents.length} LangChain documents`
      )

      // Safety check: limit number of chunks to prevent API overload
      if (documents.length > 200) {
        console.warn(
          `🚨 CRITICAL: Too many chunks (${documents.length}), limiting to 200 to prevent API overload`
        )
        documents.splice(200) // Keep only first 200 chunks
      }

      // Add documents to vector store using LangChain (batch processing for large files)
      let vectorIds: string[] = []
      try {
        console.log(
          `🔗 [QDRANT] Adding ${documents.length} documents to vector store...`
        )
        
        // Process in batches of 50 to prevent API overload
        const batchSize = 50
        const allVectorIds: string[] = []
        
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize)
          console.log(`📦 [QDRANT] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} (${batch.length} documents)`)
          
          const batchVectorIds = await addDocuments(batch)
          allVectorIds.push(...(batchVectorIds || []))
          
          // Small delay between batches to prevent rate limiting
          if (i + batchSize < documents.length) {
            await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
          }
        }
        
        vectorIds = allVectorIds
        console.log(
          `✅ [QDRANT] Successfully added ${
            vectorIds?.length || 0
          } vectors to Qdrant`
        )
      } catch (qdrantError) {
        console.error(
          '❌ [QDRANT] Error adding documents to vector store:',
          qdrantError
        )
        vectorIds = [] // Устанавливаем пустой массив при ошибке
        // Continue execution - we can still save file metadata
      }

      // Save file record to database
      try {
        const fileId = await FileRepository.createFile({
          filename: file.name,
          original_name: file.name,
          file_hash: processedFile.hash, // Use proper hash from processor
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          metadata: {
            ...processedFile.metadata,
            vectorIds:
              vectorIds && vectorIds.length > 0 ? vectorIds : undefined,
            chunksCount: processedFile.chunks.length,
          },
        })
        console.log(`💾 [DATABASE] File record created with ID: ${fileId}`)

        // Update status to completed
        await FileRepository.updateStatus(fileId, 'completed')
        console.log(`✅ [DATABASE] File processing status updated to completed`)
      } catch (dbError) {
        console.error('❌ [DATABASE] Error saving file record:', dbError)
        // Continue - vector data is already saved
      }

      // Clean up temporary files
      try {
        await rm(uploadDir, { recursive: true, force: true })
        console.log('🧹 [CLEANUP] Temporary files removed successfully')
      } catch (cleanupError) {
        console.warn(
          '⚠️ [CLEANUP] Error removing temporary files:',
          cleanupError
        )
        // Not critical, continue
      }

      // Return success response
      return NextResponse.json({
        success: true,
        step: 'completed',
        message: 'File processed and uploaded successfully',
        fileInfo: {
          name: file.name,
          hash: processedFile.hash,
          format: processedFile.metadata.format,
          processor: processedFile.metadata.processor,
          size: file.size,
          chunks: processedFile.chunks.length,
          vectorsCreated: vectorIds?.length || 0,
          title: processedFile.metadata.title,
        },
      })
    } catch (processingError) {
      console.error('❌ [PROCESSING] File processing failed:', processingError)

      // Clean up temporary files on error
      try {
        await rm(uploadDir, { recursive: true, force: true })
        console.log('🧹 [CLEANUP] Temporary files cleaned up after error')
      } catch (cleanupError) {
        console.warn(
          '⚠️ [CLEANUP] Failed to clean up temporary files:',
          cleanupError
        )
      }

      return NextResponse.json(
        {
          success: false,
          step: 'processing_error',
          error: 'File processing failed',
          details:
            processingError instanceof Error
              ? processingError.message
              : String(processingError),
          supportedFormats:
            MultiFormatFileProcessor.getSupportedFormats().extensions,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ [UPLOAD] General upload error:', error)

    return NextResponse.json(
      {
        success: false,
        step: 'general_error',
        error: 'Internal server error during file upload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
