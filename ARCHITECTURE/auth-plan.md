# 🔐 План авторизации: NextAuth.js

## 🎯 Цель

Реализовать простую и безопасную авторизацию для админ-панели с использованием NextAuth.js v5 (App Router).

## 📋 Требования

### Функциональные требования
- [ ] Один админ-аккаунт (email/password)
- [ ] Защищенные роуты `/admin/*`
- [ ] Автоматическое перенаправление неавторизованных пользователей
- [ ] Безопасное хранение пароля
- [ ] Сессии с JWT токенами

### Технические требования
- [ ] NextAuth.js v5 (App Router)
- [ ] Credentials provider
- [ ] Middleware для защиты роутов
- [ ] Переменные окружения для конфигурации
- [ ] TypeScript типизация

## 🛠️ Установка и настройка

### 1. Установка зависимостей
```bash
npm install next-auth@beta
```

### 2. Переменные окружения
```env
# .env.local
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

### 3. Структура файлов
```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # NextAuth API route
│   └── admin/
│       ├── layout.tsx            # Защищенный layout
│       └── page.tsx              # Админ-страница
├── lib/
│   └── auth.ts                   # NextAuth конфигурация
└── middleware.ts                 # Middleware для защиты роутов
```

## 🔧 Конфигурация NextAuth.js

### 1. Основная конфигурация (`src/lib/auth.ts`)
```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const adminEmail = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD

        if (credentials.email === adminEmail && 
            credentials.password === adminPassword) {
          return {
            id: '1',
            email: adminEmail,
            name: 'Admin',
            role: 'admin'
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role
      }
      return session
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  }
})
```

### 2. API Route (`src/app/api/auth/[...nextauth]/route.ts`)
```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

### 3. Middleware (`src/middleware.ts`)
```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*']
}
```

## 🎨 UI компоненты

### 1. Страница входа (`src/app/admin/login/page.tsx`)
```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })

    if (result?.error) {
      setError('Неверный email или пароль')
    } else {
      router.push('/admin')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-white">
            Вход в админ-панель
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### 2. Защищенный Layout (`src/app/admin/layout.tsx`)
```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">
                RAG Chat Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                {session.user?.email}
              </span>
              <a
                href="/api/auth/signout"
                className="text-gray-300 hover:text-white"
              >
                Выйти
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
```

## 🔒 Безопасность

### 1. Пароли
- [ ] Хеширование паролей (bcrypt)
- [ ] Минимальная длина пароля
- [ ] Сложность пароля
- [ ] Регулярная смена пароля

### 2. Сессии
- [ ] JWT токены с коротким временем жизни
- [ ] Автоматический выход при неактивности
- [ ] Защита от CSRF атак

### 3. Роуты
- [ ] Middleware для защиты всех админ-роутов
- [ ] Проверка ролей пользователей
- [ ] Логирование попыток входа

## 🧪 Тестирование

### 1. Тесты авторизации
- [ ] Успешный вход с правильными данными
- [ ] Ошибка входа с неправильными данными
- [ ] Перенаправление неавторизованных пользователей
- [ ] Защита админ-роутов

### 2. Тесты безопасности
- [ ] Попытки брутфорса
- [ ] CSRF защита
- [ ] XSS защита
- [ ] SQL инъекции

## 🚀 Развертывание

### 1. Production переменные
```env
NEXTAUTH_SECRET=your-production-secret-key
NEXTAUTH_URL=https://your-domain.com
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=your-secure-production-password
```

### 2. Vercel настройки
- [ ] Добавить переменные окружения в Vercel
- [ ] Настроить домен
- [ ] Проверить HTTPS

## 📋 Чек-лист реализации

- [ ] Установить NextAuth.js
- [ ] Настроить переменные окружения
- [ ] Создать конфигурацию NextAuth
- [ ] Создать API route
- [ ] Настроить middleware
- [ ] Создать страницу входа
- [ ] Создать защищенный layout
- [ ] Протестировать авторизацию
- [ ] Настроить production переменные 
