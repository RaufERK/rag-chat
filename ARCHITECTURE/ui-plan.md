# 🎨 План UI/UX: Админ-панель

## 🎯 Цель

Создать интуитивный и функциональный интерфейс админ-панели для управления загрузкой файлов, мониторинга процесса обработки и управления базой знаний.

## 📋 Требования

### Функциональные требования
- [ ] Страница авторизации
- [ ] Главная админ-панель с дашбордом
- [ ] Загрузка файлов с drag & drop
- [ ] Список загруженных файлов
- [ ] Статус обработки файлов
- [ ] Управление файлами (удаление, перезагрузка)
- [ ] Статистика и аналитика

### UI/UX требования
- [ ] Современный дизайн в стиле проекта
- [ ] Адаптивный интерфейс
- [ ] Интуитивная навигация
- [ ] Прогресс-бары и индикаторы
- [ ] Обработка ошибок
- [ ] Уведомления

## 🎨 Дизайн-система

### 1. Цветовая палитра
```css
/* Основные цвета */
--primary: #3B82F6;      /* Синий */
--primary-dark: #2563EB;
--success: #10B981;      /* Зеленый */
--warning: #F59E0B;      /* Оранжевый */
--error: #EF4444;        /* Красный */
--info: #06B6D4;         /* Голубой */

/* Нейтральные цвета */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
```

### 2. Типографика
```css
/* Заголовки */
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;

/* Размеры */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
```

### 3. Компоненты
```typescript
// Базовые компоненты
- Button (Primary, Secondary, Danger)
- Input (Text, File, Select)
- Card
- Badge (Status, Type)
- Progress
- Modal
- Notification
- Table
- Pagination
```

## 📱 Структура страниц

### 1. Страница авторизации (`/admin/login`)
```typescript
// Компоненты:
- LoginForm
- Logo
- ErrorMessage
- LoadingSpinner

// Функции:
- Валидация формы
- Обработка ошибок
- Перенаправление после входа
```

### 2. Главная админ-панель (`/admin`)
```typescript
// Компоненты:
- AdminHeader
- Sidebar
- Dashboard
- QuickStats
- RecentFiles
- SystemStatus

// Функции:
- Обзор статистики
- Быстрый доступ к функциям
- Мониторинг системы
```

### 3. Загрузка файлов (`/admin/upload`)
```typescript
// Компоненты:
- FileUploadZone
- FileList
- UploadProgress
- FileValidation
- ErrorDisplay

// Функции:
- Drag & Drop загрузка
- Валидация файлов
- Прогресс загрузки
- Обработка ошибок
```

### 4. Управление файлами (`/admin/files`)
```typescript
// Компоненты:
- FileTable
- FileFilters
- FileActions
- FileDetails
- BulkActions

// Функции:
- Просмотр всех файлов
- Фильтрация и поиск
- Действия с файлами
- Детальная информация
```

## 🧩 Компоненты

### 1. AdminHeader (`src/components/admin/AdminHeader.tsx`)
```typescript
'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AdminHeader() {
  const { data: session } = useSession()

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/admin" className="text-xl font-semibold text-white">
              RAG Chat Admin
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
```

### 2. Sidebar (`src/components/admin/Sidebar.tsx`)
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  CloudArrowUpIcon, 
  DocumentTextIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Дашборд', href: '/admin', icon: HomeIcon },
  { name: 'Загрузка файлов', href: '/admin/upload', icon: CloudArrowUpIcon },
  { name: 'Управление файлами', href: '/admin/files', icon: DocumentTextIcon },
  { name: 'Статистика', href: '/admin/stats', icon: ChartBarIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="bg-gray-900 w-64 min-h-screen p-4">
      <div className="space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

### 3. FileUploadZone (`src/components/admin/FileUploadZone.tsx`)
```typescript
'use client'

import { useState, useCallback } from 'react'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void
  isUploading: boolean
}

export default function FileUploadZone({ onFileSelect, isUploading }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    onFileSelect(files)
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onFileSelect(files)
  }, [onFileSelect])

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 dark:border-gray-600'
        }
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
      <div className="mt-4">
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="text-lg font-medium text-gray-900 dark:text-white">
            Перетащите файлы сюда или
          </span>
          <span className="text-blue-600 hover:text-blue-500 ml-1">
            выберите файлы
          </span>
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.epub,.fb2"
          className="sr-only"
          onChange={handleFileInput}
          disabled={isUploading}
        />
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Поддерживаются PDF, DOCX, TXT, EPUB, FB2 файлы до 50MB
      </p>
    </div>
  )
}
```

### 4. FileTable (`src/components/admin/FileTable.tsx`)
```typescript
'use client'

import { useState } from 'react'
import { FileRecord } from '@/types/database'
import { 
  TrashIcon, 
  ArrowPathIcon,
  EyeIcon 
} from '@heroicons/react/24/outline'

interface FileTableProps {
  files: FileRecord[]
  onDelete: (fileId: string) => void
  onRetry: (fileId: string) => void
  onView: (fileId: string) => void
}

export default function FileTable({ files, onDelete, onRetry, onView }: FileTableProps) {
  const [sortBy, setSortBy] = useState<'upload_date' | 'original_name' | 'status'>('upload_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedFiles = [...files].sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]
    
    if (sortBy === 'upload_date') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processing: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', text: 'Обработка' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', text: 'Готово' },
      error: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', text: 'Ошибка' },
      deleted: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300', text: 'Удален' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Файл
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Размер
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Статус
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Чанки
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Дата загрузки
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedFiles.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {file.original_name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {file.filename}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {(file.file_size / 1024 / 1024).toFixed(2)} MB
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(file.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {file.chunks_count}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(file.upload_date).toLocaleDateString('ru-RU')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => onView(file.id)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {file.status === 'error' && (
                    <button
                      onClick={() => onRetry(file.id)}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(file.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 5. ProgressBar (`src/components/ui/ProgressBar.tsx`)
```typescript
interface ProgressBarProps {
  progress: number
  status: string
  showPercentage?: boolean
}

export default function ProgressBar({ progress, status, showPercentage = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {status}
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
```

## 📊 Дашборд

### 1. QuickStats (`src/components/admin/QuickStats.tsx`)
```typescript
interface QuickStatsProps {
  stats: {
    totalFiles: number
    totalSize: number
    processingFiles: number
    completedFiles: number
    errorFiles: number
  }
}

export default function QuickStats({ stats }: QuickStatsProps) {
  const cards = [
    {
      title: 'Всего файлов',
      value: stats.totalFiles,
      icon: '📄',
      color: 'bg-blue-500'
    },
    {
      title: 'Общий размер',
      value: `${(stats.totalSize / 1024 / 1024).toFixed(1)} MB`,
      icon: '💾',
      color: 'bg-green-500'
    },
    {
      title: 'В обработке',
      value: stats.processingFiles,
      icon: '⏳',
      color: 'bg-yellow-500'
    },
    {
      title: 'Ошибки',
      value: stats.errorFiles,
      icon: '❌',
      color: 'bg-red-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.title} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${card.color} text-white`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 🔔 Уведомления

### 1. NotificationSystem (`src/components/ui/NotificationSystem.tsx`)
```typescript
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    
    setNotifications(prev => [...prev, newNotification])
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

function NotificationContainer() {
  const { notifications, removeNotification } = useContext(NotificationContext)!

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto
            ring-1 ring-black ring-opacity-5 overflow-hidden
          `}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' && <span className="text-green-400">✅</span>}
                {notification.type === 'error' && <span className="text-red-400">❌</span>}
                {notification.type === 'warning' && <span className="text-yellow-400">⚠️</span>}
                {notification.type === 'info' && <span className="text-blue-400">ℹ️</span>}
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex flex-shrink-0">
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
```

## 📱 Адаптивность

### 1. Responsive Design
```css
/* Мобильные устройства */
@media (max-width: 640px) {
  .sidebar {
    @apply fixed inset-y-0 left-0 z-50 w-64 transform -translate-x-full transition-transform duration-300 ease-in-out;
  }
  
  .sidebar.open {
    @apply translate-x-0;
  }
  
  .main-content {
    @apply ml-0;
  }
}

/* Планшеты */
@media (min-width: 641px) and (max-width: 1024px) {
  .sidebar {
    @apply w-48;
  }
  
  .main-content {
    @apply ml-48;
  }
}

/* Десктоп */
@media (min-width: 1025px) {
  .sidebar {
    @apply w-64;
  }
  
  .main-content {
    @apply ml-64;
  }
}
```

## 🧪 Тестирование

### 1. Тесты компонентов
```typescript
// src/tests/components/FileUploadZone.test.tsx
import { render, fireEvent, screen } from '@testing-library/react'
import FileUploadZone from '@/components/admin/FileUploadZone'

describe('FileUploadZone', () => {
  test('should handle file selection', () => {
    const onFileSelect = jest.fn()
    render(<FileUploadZone onFileSelect={onFileSelect} isUploading={false} />)
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/выберите файлы/i)
    
    fireEvent.change(input, { target: { files: [file] } })
    
    expect(onFileSelect).toHaveBeenCalledWith([file])
  })
})
```

## 📋 Чек-лист реализации

- [ ] Создать базовые компоненты UI
- [ ] Реализовать страницу авторизации
- [ ] Создать админ-панель с дашбордом
- [ ] Реализовать загрузку файлов
- [ ] Создать таблицу файлов
- [ ] Добавить уведомления
- [ ] Настроить адаптивность
- [ ] Написать тесты
- [ ] Оптимизировать производительность 
