import { getEmbedding } from '@/lib/openai'
import { createCollection, upsertPoints } from '@/lib/qdrant'
import { QdrantPoint } from '@/lib/types'

// Демонстрационные документы
const documents = [
  {
    id: 1,
    content:
      'Next.js — это React-фреймворк для создания веб-приложений. Он предоставляет серверный рендеринг, статическую генерацию, API роуты и многое другое. Next.js оптимизирован для производительности и SEO.',
    metadata: { category: 'framework', topic: 'nextjs' },
  },
  {
    id: 2,
    content:
      'TypeScript — это типизированное надмножество JavaScript. Он добавляет статическую типизацию, что помогает избежать ошибок на этапе разработки и улучшает качество кода.',
    metadata: { category: 'language', topic: 'typescript' },
  },
  {
    id: 3,
    content:
      'Tailwind CSS — это utility-first CSS фреймворк. Он позволяет быстро создавать пользовательские интерфейсы, используя предопределенные классы утилит.',
    metadata: { category: 'styling', topic: 'tailwind' },
  },
  {
    id: 4,
    content:
      'OpenAI API предоставляет доступ к мощным языковым моделям, включая GPT-3.5-turbo и GPT-4. API поддерживает чат-комплектации, эмбеддинги и другие возможности.',
    metadata: { category: 'ai', topic: 'openai' },
  },
  {
    id: 5,
    content:
      'Qdrant — это векторная база данных для поиска по сходству. Она оптимизирована для машинного обучения и позволяет эффективно хранить и искать векторные эмбеддинги.',
    metadata: { category: 'database', topic: 'qdrant' },
  },
  {
    id: 6,
    content:
      'RAG (Retrieval-Augmented Generation) — это техника, которая сочетает поиск информации с генерацией текста. Сначала система находит релевантные документы, затем использует их как контекст для генерации ответа.',
    metadata: { category: 'ai', topic: 'rag' },
  },
  {
    id: 7,
    content:
      'React — это JavaScript библиотека для создания пользовательских интерфейсов. Она использует компонентный подход и виртуальный DOM для эффективного обновления UI.',
    metadata: { category: 'library', topic: 'react' },
  },
  {
    id: 8,
    content:
      'API роуты в Next.js позволяют создавать серверные эндпоинты прямо в приложении. Они поддерживают различные HTTP методы и могут обрабатывать запросы и ответы.',
    metadata: { category: 'framework', topic: 'api-routes' },
  },
]

export async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...')

    // 1. Создаем коллекцию (если не существует)
    console.log('📦 Creating collection...')
    try {
      await createCollection()
      console.log('✅ Collection created successfully')
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const errorData = (error as { data?: { status?: { error?: string } } })
        ?.data?.status?.error

      if (
        errorMessage?.includes('already exists') ||
        errorData?.includes('already exists')
      ) {
        console.log('✅ Collection already exists, continuing...')
      } else {
        throw error
      }
    }

    // 2. Получаем эмбеддинги для всех документов
    console.log('🔍 Generating embeddings...')
    const points: QdrantPoint[] = []

    for (const doc of documents) {
      console.log(`Processing document ${doc.id}...`)
      const embedding = await getEmbedding(doc.content)

      points.push({
        id: doc.id,
        vector: embedding,
        payload: {
          content: doc.content,
          metadata: doc.metadata,
        },
      })
    }

    // 3. Загружаем точки в Qdrant
    console.log('💾 Uploading points to Qdrant...')
    await upsertPoints(points)
    console.log('✅ Points uploaded successfully')

    console.log('🎉 Database seeding completed successfully!')
    console.log(`📊 Loaded ${documents.length} documents`)
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

// Если скрипт запущен напрямую
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}
