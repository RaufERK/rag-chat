import Link from 'next/link'
import { FileRepository } from '@/lib/file-repository'

export default async function AdminPage() {
  const stats = await FileRepository.getStats()

  const cards = [
    {
      title: 'Всего файлов',
      value: stats.totalFiles,
      icon: '📄',
      color: 'bg-blue-500',
      href: '/admin/files'
    },
    {
      title: 'Общий размер',
      value: `${(stats.totalSize / 1024 / 1024).toFixed(1)} MB`,
      icon: '💾',
      color: 'bg-green-500',
      href: '/admin/files'
    },
    {
      title: 'В обработке',
      value: stats.byStatus.processing || 0,
      icon: '⏳',
      color: 'bg-yellow-500',
      href: '/admin/files'
    },
    {
      title: 'Ошибки',
      value: stats.byStatus.error || 0,
      icon: '❌',
      color: 'bg-red-500',
      href: '/admin/files'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-white">Дашборд</h1>
        <p className="text-gray-400">Обзор системы RAG Chat</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
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
          </Link>
        ))}
      </div>

      {/* Быстрые действия */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Быстрые действия
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/upload"
            className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="p-2 bg-blue-500 text-white rounded-lg">
              <span className="text-xl">📤</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Загрузить файл
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Добавить новый документ
              </p>
            </div>
          </Link>

          <Link
            href="/admin/files"
            className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <div className="p-2 bg-green-500 text-white rounded-lg">
              <span className="text-xl">📁</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Управление файлами
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Просмотр и управление
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="p-2 bg-purple-500 text-white rounded-lg">
              <span className="text-xl">💬</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Тестировать чат
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Проверить RAG систему
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Статистика по типам файлов */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Файлы по типам
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div
              key={type}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {type}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {count} файлов
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 