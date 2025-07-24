'use client'

import { useState } from 'react'
import { AskResponse, Document } from '@/lib/types'

export default function ChatPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim()) return

    setIsLoading(true)
    setError('')
    setAnswer('')
    setSources([])

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AskResponse = await response.json()
      setAnswer(data.answer)
      if (data.sources) {
        setSources(data.sources)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-4xl mx-auto px-4'>
        <div className='bg-white rounded-lg shadow-lg p-6'>
          <h1 className='text-3xl font-bold text-gray-900 mb-8 text-center'>
            🤖 RAG Chat
          </h1>

          <form onSubmit={handleSubmit} className='mb-8'>
            <div className='flex gap-4'>
              <input
                type='text'
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='Задайте ваш вопрос...'
                className='flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 placeholder-gray-500'
                disabled={isLoading}
              />
              <button
                type='submit'
                disabled={isLoading || !question.trim()}
                className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
              >
                {isLoading ? (
                  <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Загрузка...
                  </div>
                ) : (
                  'Задать'
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-700'>❌ {error}</p>
            </div>
          )}

          {answer && (
            <div className='mb-6'>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                Ответ:
              </h2>
              <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <p className='text-gray-800 whitespace-pre-wrap'>{answer}</p>
              </div>
            </div>
          )}

          {sources.length > 0 && (
            <div>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                Источники:
              </h2>
              <div className='space-y-3'>
                {sources.map((source, index) => (
                  <div
                    key={source.id}
                    className='p-4 bg-gray-50 border border-gray-200 rounded-lg'
                  >
                    <div className='flex items-start gap-3'>
                      <span className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium'>
                        {index + 1}
                      </span>
                      <div className='flex-1'>
                        <p className='text-gray-800 text-sm'>
                          {source.content}
                        </p>
                        {source.metadata && (
                          <div className='mt-2 flex gap-2'>
                            {source.metadata.category && (
                              <span className='px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded'>
                                {source.metadata.category}
                              </span>
                            )}
                            {source.metadata.topic && (
                              <span className='px-2 py-1 bg-green-100 text-green-700 text-xs rounded'>
                                {source.metadata.topic}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!answer && !isLoading && !error && (
            <div className='text-center text-gray-500 py-12'>
              <div className='text-6xl mb-4'>🤔</div>
              <p className='text-lg'>
                Задайте вопрос, чтобы начать общение с RAG-системой
              </p>
              <p className='text-sm mt-2'>
                Система найдет релевантную информацию и даст ответ на основе
                найденных документов
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
