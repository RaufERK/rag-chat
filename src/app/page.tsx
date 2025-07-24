'use client'

import { useState } from 'react'
import { AskResponse, Document } from '@/lib/types'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasContext, setHasContext] = useState(false)
  const [sourcesCount, setSourcesCount] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim()) return

    setIsLoading(true)
    setError('')
    setAnswer('')
    setSources([])
    setHasContext(false)
    setSourcesCount(0)

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
      setHasContext(data.hasContext)
      setSourcesCount(data.sourcesCount)
      if (data.sources) {
        setSources(data.sources)
      } else {
        setSources([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-900 flex flex-col'>
      {/* Header */}
      <header className='border-b border-gray-700 bg-gray-800'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <h1 className='text-xl font-semibold text-white'>🤖 RAG Chat</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1 flex flex-col'>
        {/* Messages Area */}
        <div className='flex-1 overflow-y-auto px-4 py-8'>
          <div className='max-w-4xl mx-auto space-y-6'>
            {/* Welcome Message with Centered Input */}
            {!answer && !isLoading && !error && (
              <div className='flex flex-col items-center justify-center min-h-[60vh]'>
                <div className='text-center mb-12'>
                  <div className='text-6xl mb-6'>🤖</div>
                  <h2 className='text-2xl font-semibold text-white mb-4'>
                    Добро пожаловать в RAG Chat
                  </h2>
                  <p className='text-gray-400 text-lg max-w-2xl mx-auto'>
                    Задайте вопрос, и я найду релевантную информацию в базе
                    знаний, чтобы дать вам точный и обоснованный ответ.
                  </p>
                </div>

                {/* Centered Input */}
                <div className='w-full max-w-2xl'>
                  <form onSubmit={handleSubmit} className='relative'>
                    <div className='relative'>
                      <input
                        type='text'
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder='Задайте ваш вопрос...'
                        className='w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white placeholder-gray-400'
                        disabled={isLoading}
                      />
                      <button
                        type='submit'
                        disabled={isLoading || !question.trim()}
                        className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors'
                      >
                        {isLoading ? (
                          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        ) : (
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className='bg-red-900/20 border border-red-700 rounded-lg p-4'>
                <p className='text-red-400'>❌ {error}</p>
              </div>
            )}

            {/* Answer */}
            {answer && (
              <div
                className={`rounded-lg p-6 border ${
                  hasContext
                    ? 'bg-blue-900/30 border-blue-700'
                    : 'bg-green-900/30 border-green-700'
                }`}
              >
                <div className='flex items-start gap-3 mb-4'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      hasContext ? 'bg-blue-600' : 'bg-green-600'
                    }`}
                  >
                    <span className='text-white text-sm font-medium'>AI</span>
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-2'>
                      <h3 className='text-white font-medium'>Ответ:</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          hasContext
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                            : 'bg-green-600/20 text-green-300 border border-green-600/30'
                        }`}
                      >
                        {hasContext
                          ? `📚 RAG (${sourcesCount} источников)`
                          : '🤖 GPT Only'}
                      </span>
                    </div>
                    <div className='text-gray-300 leading-relaxed whitespace-pre-wrap'>
                      {answer}
                    </div>
                  </div>
                </div>

                {/* Sources */}
                {hasContext && sources.length > 0 && (
                  <div className='mt-6 pt-6 border-t border-gray-700'>
                    <h4 className='text-white font-medium mb-3'>Источники:</h4>
                    <div className='space-y-3'>
                      {sources.map((source, index) => (
                        <div
                          key={source.id}
                          className='bg-gray-700 rounded-lg p-4 border border-gray-600'
                        >
                          <div className='flex items-start gap-3'>
                            <span className='flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium'>
                              {index + 1}
                            </span>
                            <div className='flex-1'>
                              <p className='text-gray-300 text-sm leading-relaxed'>
                                {source.content}
                              </p>
                              {source.metadata && (
                                <div className='mt-3 flex gap-2'>
                                  {source.metadata.category && (
                                    <span className='px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded border border-blue-600/30'>
                                      {source.metadata.category}
                                    </span>
                                  )}
                                  {source.metadata.topic && (
                                    <span className='px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30'>
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
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
                <div className='flex items-start gap-3'>
                  <div className='w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0'>
                    <span className='text-white text-sm font-medium'>AI</span>
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 text-gray-300'>
                      <div className='w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
                      Ищу информацию и генерирую ответ...
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Only show when there are messages */}
        {(answer || isLoading || error) && (
          <div className='border-t border-gray-700 bg-gray-800 p-4'>
            <div className='max-w-4xl mx-auto'>
              <form onSubmit={handleSubmit} className='relative'>
                <div className='relative'>
                  <input
                    type='text'
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder='Задайте ваш вопрос...'
                    className='w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white placeholder-gray-400'
                    disabled={isLoading}
                  />
                  <button
                    type='submit'
                    disabled={isLoading || !question.trim()}
                    className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors'
                  >
                    {isLoading ? (
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    ) : (
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
