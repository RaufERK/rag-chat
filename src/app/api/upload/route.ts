import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import { FileUtils } from '@/lib/file-utils'
import { FileProcessor } from '@/lib/file-processor'
import { FileRepository } from '@/lib/file-repository'
import { TextSplitter } from '@/lib/text-splitter'
import { getEmbedding } from '@/lib/openai'
import { upsertPoints } from '@/lib/qdrant'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('[UPLOAD] Получен запрос на загрузку файла')
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.log('[UPLOAD] Файл не найден в formData')
      return NextResponse.json(
        { step: 'file_check', error: 'Файл не найден' },
        { status: 400 }
      )
    }
    console.log(
      `[UPLOAD] Получен файл: name=${file.name}, size=${file.size}, type=${file.type}`
    )

    // Валидация файла
    const validation = FileUtils.validateFile({
      size: file.size,
      mimetype: file.type,
      originalname: file.name,
    })

    if (!validation.valid) {
      console.log(`[UPLOAD] Ошибка валидации: ${validation.error}`)
      return NextResponse.json(
        { step: 'validation', error: validation.error },
        { status: 400 }
      )
    }

    // Проверяем поддержку типа файла
    if (!FileProcessor.isSupportedFileType(file.type)) {
      console.log(`[UPLOAD] Неподдерживаемый тип файла: ${file.type}`)
      return NextResponse.json(
        { step: 'type_check', error: 'Неподдерживаемый тип файла' },
        { status: 400 }
      )
    }

    // Читаем содержимое файла
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log(`[UPLOAD] Прочитано ${buffer.length} байт из файла`)

    // Создаем временную папку
    const tempFolder = await FileUtils.createTempFolder()
    const tempFilePath = join(tempFolder, file.name)
    console.log(`[UPLOAD] Временный путь для файла: ${tempFilePath}`)

    // Сохраняем файл во временную папку
    await writeFile(tempFilePath, buffer)
    console.log(`[UPLOAD] Файл сохранен во временную папку: ${tempFilePath}`)

    // Вычисляем хеш файла
    const fileHash = createHash('md5').update(buffer).digest('hex')
    console.log(`[UPLOAD] Хеш файла: ${fileHash}`)

    // Проверяем, не загружен ли уже такой файл
    const existingFile = await FileRepository.findByHash(fileHash)
    if (existingFile) {
      console.log(
        `[UPLOAD] Файл с таким хешем уже существует: id=${existingFile.id}`
      )
      return NextResponse.json(
        { step: 'hash_check', error: 'Файл уже загружен' },
        { status: 409 }
      )
    }

    // Обрабатываем файл
    try {
      console.log(`[UPLOAD] Начинаем обработку файла: ${tempFilePath}`)
      const processedFile = await FileProcessor.processFile(
        tempFilePath,
        file.type
      )
      console.log(
        `[UPLOAD] Файл обработан. Метаданные:`,
        processedFile.metadata
      )
      // Создаем запись в базе данных
      const fileId = await FileRepository.createFile({
        filename: file.name,
        original_name: file.name,
        file_hash: fileHash,
        file_size: file.size,
        mime_type: file.type,
        metadata: processedFile.metadata,
      })
      console.log(`[UPLOAD] Запись о файле создана в базе данных: id=${fileId}`)
      // Обновляем статус на "processing"
      await FileRepository.updateStatus(fileId, 'processing')
      // Разбиваем на чанки
      const chunks = TextSplitter.smartSplit(processedFile.text)
      console.log(`[UPLOAD] Файл разбит на ${chunks.length} чанков`)
      // Обновляем количество чанков
      await FileRepository.updateChunksCount(fileId, chunks.length)
      // Создаем эмбеддинги и сохраняем в Qdrant
      const qdrantPoints: any[] = []
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        try {
          const embedding = await getEmbedding(chunk.content)
          qdrantPoints.push({
            id: randomUUID(),
            vector: embedding,
            payload: {
              content: chunk.content,
              metadata: {
                file_id: fileId,
                file_name: file.name,
                chunk_index: i,
                ...processedFile.metadata,
              },
            },
          })
        } catch (error) {
          console.error(
            `[UPLOAD] Ошибка создания эмбеддинга для чанка ${i}:`,
            error
          )
        }
      }
      if (qdrantPoints.length > 0) {
        try {
          await upsertPoints(qdrantPoints)
          console.log(
            `[UPLOAD] ${qdrantPoints.length} точек успешно сохранены в Qdrant`
          )
          const pointIds = qdrantPoints.map((p) => p.id)
          await FileRepository.updateQdrantPoints(fileId, pointIds)
          console.log(`[UPLOAD] ID точек обновлены в базе данных`)
        } catch (error) {
          console.error(`[UPLOAD] Ошибка сохранения точек в Qdrant:`, error)
        }
      } else {
        console.log(`[UPLOAD] Нет точек для сохранения в Qdrant`)
      }
      // Перемещаем файл в финальную папку
      const finalPath = FileUtils.getFilePath(file.name)
      await FileUtils.moveToFinalLocation(tempFilePath, finalPath)
      console.log(`[UPLOAD] Файл перемещен в финальную папку: ${finalPath}`)
      return NextResponse.json(
        {
          step: 'success',
          fileId,
          fileName: file.name,
          meta: processedFile.metadata,
          chunks: chunks.length,
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('[UPLOAD] Ошибка обработки файла:', error)
      return NextResponse.json(
        {
          step: 'processing',
          error: error instanceof Error ? error.message : error,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)

    return NextResponse.json(
      { error: 'Ошибка обработки файла' },
      { status: 500 }
    )
  }
}
