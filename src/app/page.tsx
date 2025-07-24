import Link from 'next/link'

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
      <div className='max-w-2xl mx-auto text-center px-6'>
        <div className='mb-8'>
          <h1 className='text-5xl font-bold text-gray-900 mb-4'>🤖 RAG Chat</h1>
          <p className='text-xl text-gray-600 leading-relaxed'>
            Интеллектуальный чат-бот с использованием Retrieval-Augmented
            Generation
          </p>
        </div>

        <div className='bg-white rounded-2xl shadow-xl p-8 mb-8'>
          <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
            Как это работает?
          </h2>
          <div className='grid md:grid-cols-3 gap-6 text-left'>
            <div className='text-center'>
              <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-blue-600 text-xl'>1</span>
              </div>
              <h3 className='font-medium text-gray-900 mb-2'>Задайте вопрос</h3>
              <p className='text-sm text-gray-600'>
                Введите ваш вопрос в простом интерфейсе
              </p>
            </div>
            <div className='text-center'>
              <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-green-600 text-xl'>2</span>
              </div>
              <h3 className='font-medium text-gray-900 mb-2'>
                Поиск контекста
              </h3>
              <p className='text-sm text-gray-600'>
                Система найдет релевантные документы в базе знаний
              </p>
            </div>
            <div className='text-center'>
              <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                <span className='text-purple-600 text-xl'>3</span>
              </div>
              <h3 className='font-medium text-gray-900 mb-2'>Получите ответ</h3>
              <p className='text-sm text-gray-600'>
                AI сгенерирует ответ на основе найденной информации
              </p>
            </div>
          </div>
        </div>

        <Link
          href='/chat'
          className='inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg'
        >
          🚀 Начать чат
          <svg
            className='ml-2 w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 7l5 5m0 0l-5 5m5-5H6'
            />
          </svg>
        </Link>

        <div className='mt-8 text-sm text-gray-500'>
          <p>
            Технологии: Next.js • TypeScript • OpenAI • Qdrant • Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  )
}
