'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Проверяем, авторизован ли пользователь
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth')
      const data = await response.json()

      if (data.authenticated) {
        router.push('/admin')
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/admin')
      } else {
        setError(data.message || 'Ошибка авторизации')
      }
    } catch (error) {
      setError('Ошибка соединения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-900'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='text-center text-3xl font-bold text-white'>
            Вход в админ-панель
          </h2>
          <p className='mt-2 text-center text-gray-400'>
            RAG Chat Administration
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          {error && (
            <div className='bg-red-900/20 border border-red-700 rounded-lg p-4'>
              <p className='text-red-400'>{error}</p>
            </div>
          )}
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-300'
              >
                Email
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='admin@example.com'
                className='mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                required
              />
            </div>
            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-gray-300'
              >
                Пароль
              </label>
              <input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
                className='mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                required
              />
            </div>
          </div>
          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors'
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
