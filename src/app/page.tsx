'use client'

import { useState } from 'react'
import { AskResponse, Document } from '@/lib/types'

interface Message {
  id: string
  question: string
  answer: string
  sources: Document[]
  hasContext: boolean
  sourcesCount: number
  timestamp: Date
}

export default function Home() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [collapsedSources, setCollapsedSources] = useState<Set<string>>(
    new Set() // По умолчанию все источники свёрнуты
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!question.trim()) return

    const currentQuestion = question.trim()
    setQuestion('') // Очищаем инпут сразу после отправки
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: currentQuestion }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AskResponse = await response.json()

      const newMessage: Message = {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: data.answer,
        sources: data.sources || [],
        hasContext: data.hasContext,
        sourcesCount: data.sourcesCount,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, newMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSourceCollapse = (messageId: string) => {
    setCollapsedSources((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId) // Разворачиваем
      } else {
        newSet.add(messageId) // Сворачиваем
      }
      return newSet
    })
  }

  return (
    <div className='min-h-screen bg-gray-900/60 flex flex-col relative z-10'>
      {/* Header */}
      <header className='border-b border-gray-700 bg-indigo-900'>
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
            {messages.length === 0 && !isLoading && !error && (
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
                        className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors'
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

            {/* Messages History */}
            {messages.map((message) => (
              <div key={message.id} className='space-y-4'>
                {/* Question */}
                <div className='flex justify-end'>
                  <div className='max-w-[80%] bg-gray-700 text-white rounded-lg px-4 py-3'>
                    <p className='text-sm'>{message.question}</p>
                  </div>
                </div>

                {/* Answer */}
                <div
                  className={`rounded-lg p-6 border ${
                    message.hasContext
                      ? 'bg-purple-900/70 border-purple-700'
                      : 'bg-indigo-900/70 border-indigo-700'
                  }`}
                >
                  <div className='flex items-start gap-3 mb-4'>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.hasContext ? 'bg-purple-600' : 'bg-indigo-600'
                      }`}
                    >
                      <span className='text-white text-sm font-medium'>AI</span>
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        <h3 className='text-white font-medium'>Ответ:</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            message.hasContext
                              ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                              : 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                          }`}
                        >
                          {message.hasContext
                            ? `📚 RAG (${message.sourcesCount} источников)`
                            : '🤖 GPT Only'}
                        </span>
                      </div>
                      <div className='text-gray-300 leading-relaxed whitespace-pre-wrap'>
                        {message.answer}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Sources */}
                  {message.hasContext && message.sources.length > 0 && (
                    <div className='mt-6 pt-6 border-t border-gray-700'>
                      <button
                        onClick={() => toggleSourceCollapse(message.id)}
                        className='flex items-center gap-2 text-white font-medium mb-3 hover:text-blue-300 transition-colors'
                      >
                        <span>Источники ({message.sources.length}):</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            !collapsedSources.has(message.id)
                              ? 'rotate-180'
                              : ''
                          }`}
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 9l-7 7-7-7'
                          />
                        </svg>
                      </button>

                      {!collapsedSources.has(message.id) && (
                        <div className='space-y-3'>
                          {message.sources.map((source, index) => (
                            <div
                              key={source.id}
                              className='bg-gray-700/90 rounded-lg p-4 border border-gray-600'
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Error Message */}
            {error && (
              <div className='bg-red-900/60 border border-red-700 rounded-lg p-4'>
                <p className='text-red-400'>❌ {error}</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className='bg-gray-800/90 rounded-lg p-6 border border-gray-700'>
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

        {/* Input Area - Always show when there are messages or loading */}
        {(messages.length > 0 || isLoading || error) && (
          <div className='border-t border-gray-700 bg-indigo-900 p-4'>
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
                    className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors'
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
