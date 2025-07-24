import 'dotenv/config'
import { createCollection, upsertPoints } from '../src/lib/qdrant'
import { QdrantPoint } from '../src/lib/types'

// Демонстрационные документы
const documents = [
  {
    id: '1',
    content:
      'Next.js — это React-фреймворк для создания веб-приложений. Он предоставляет серверный рендеринг, статическую генерацию, API роуты и многое другое. Next.js оптимизирован для производительности и SEO.',
    metadata: { category: 'framework', topic: 'nextjs' },
  },
  {
    id: '2',
    content:
      'TypeScript — это типизированное надмножество JavaScript. Он добавляет статическую типизацию, что помогает избежать ошибок на этапе разработки и улучшает качество кода.',
    metadata: { category: 'language', topic: 'typescript' },
  },
  {
    id: '3',
    content:
      'Tailwind CSS — это utility-first CSS фреймворк. Он позволяет быстро создавать пользовательские интерфейсы, используя предопределенные классы утилит.',
    metadata: { category: 'styling', topic: 'tailwind' },
  },
  {
    id: '4',
    content:
      'OpenAI API предоставляет доступ к мощным языковым моделям, включая GPT-3.5-turbo и GPT-4. API поддерживает чат-комплектации, эмбеддинги и другие возможности.',
    metadata: { category: 'ai', topic: 'openai' },
  },
  {
    id: '5',
    content:
      'Qdrant — это векторная база данных для поиска по сходству. Она оптимизирована для машинного обучения и позволяет эффективно хранить и искать векторные эмбеддинги.',
    metadata: { category: 'database', topic: 'qdrant' },
  },
  {
    id: '6',
    content:
      'RAG (Retrieval-Augmented Generation) — это техника, которая сочетает поиск информации с генерацией текста. Сначала система находит релевантные документы, затем использует их как контекст для генерации ответа.',
    metadata: { category: 'ai', topic: 'rag' },
  },
  {
    id: '7',
    content:
      'React — это JavaScript библиотека для создания пользовательских интерфейсов. Она использует компонентный подход и виртуальный DOM для эффективного обновления UI.',
    metadata: { category: 'library', topic: 'react' },
  },
  {
    id: '8',
    content:
      'API роуты в Next.js позволяют создавать серверные эндпоинты прямо в приложении. Они поддерживают различные HTTP методы и могут обрабатывать запросы и ответы.',
    metadata: { category: 'framework', topic: 'api-routes' },
  },
]

async function seedWithMockData() {
  try {
    console.log('🚀 Starting database seeding with mock data...')

    // 1. Создаем коллекцию (если не существует)
    console.log('📦 Creating collection...')
    try {
      await createCollection()
      console.log('✅ Collection created successfully')
    } catch (error: any) {
      if (
        error.message?.includes('already exists') ||
        error.data?.status?.error?.includes('already exists')
      ) {
        console.log('✅ Collection already exists, continuing...')
      } else {
        throw error
      }
    }

    // 2. Создаем мок-эмбеддинги для всех документов
    console.log('🔍 Generating mock embeddings...')
    const points: QdrantPoint[] = []

    for (const doc of documents) {
      console.log(`Processing document ${doc.id}...`)
      // Создаем детерминированный эмбеддинг на основе контента
      const hash = doc.content.toLowerCase().split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0)
      }, 0)
      
      const mockEmbedding = Array.from({ length: 1536 }, (_, i) => {
        const seed = (hash + i * 31) % 1000
        return (Math.sin(seed) * 0.5) // Значения от -0.5 до 0.5
      })

      points.push({
        id: parseInt(doc.id),
        vector: mockEmbedding,
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
    console.log(`📊 Loaded ${documents.length} documents with mock embeddings`)
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

async function main() {
  try {
    await seedWithMockData()
    console.log('Seeding completed')
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

main()
