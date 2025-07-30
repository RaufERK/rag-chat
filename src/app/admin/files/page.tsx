import Link from 'next/link'
import { FileRepository } from '@/lib/file-repository'

export default async function FilesPage() {
  const files = await FileRepository.getAllFiles()
  const stats = await FileRepository.getStats()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'processing':
        return 'text-yellow-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершено'
      case 'processing':
        return 'Обрабатывается'
      case 'error':
        return 'Ошибка'
      default:
        return 'Неизвестно'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  return (
    <div className='space-y-6'>
      {/* Заголовок */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white'>Управление файлами</h1>
          <p className='text-gray-400'>
            Просмотр и управление загруженными документами
          </p>
        </div>
        <Link
          href='/admin/upload'
          className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          Загрузить новый файл
        </Link>
      </div>

      {/* Статистика */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-gray-800 rounded-lg p-4'>
          <div className='flex items-center'>
            <div className='p-2 bg-blue-500 text-white rounded-lg'>
              <span className='text-xl'>📄</span>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-gray-400'>Всего файлов</p>
              <p className='text-lg font-semibold text-white'>
                {stats.totalFiles}
              </p>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-4'>
          <div className='flex items-center'>
            <div className='p-2 bg-green-500 text-white rounded-lg'>
              <span className='text-xl'>💾</span>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-gray-400'>Общий размер</p>
              <p className='text-lg font-semibold text-white'>
                {formatFileSize(stats.totalSize)}
              </p>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-4'>
          <div className='flex items-center'>
            <div className='p-2 bg-yellow-500 text-white rounded-lg'>
              <span className='text-xl'>⏳</span>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-gray-400'>В обработке</p>
              <p className='text-lg font-semibold text-white'>
                {stats.byStatus.processing || 0}
              </p>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-4'>
          <div className='flex items-center'>
            <div className='p-2 bg-red-500 text-white rounded-lg'>
              <span className='text-xl'>❌</span>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-gray-400'>Ошибки</p>
              <p className='text-lg font-semibold text-white'>
                {stats.byStatus.error || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Список файлов */}
      <div className='bg-gray-800 rounded-lg shadow'>
        <div className='px-6 py-4 border-b border-gray-700'>
          <h2 className='text-lg font-semibold text-white'>
            Загруженные файлы
          </h2>
        </div>

        {files.length === 0 ? (
          <div className='p-6 text-center'>
            <div className='text-6xl mb-4'>📁</div>
            <p className='text-gray-400 mb-4'>Файлы не загружены</p>
            <Link
              href='/admin/upload'
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              Загрузить первый файл
            </Link>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-700'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                    Файл
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                    Размер
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                    Статус
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                    Чанки
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                    Дата загрузки
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-700'>
                {files.map((file) => (
                  <tr key={file.id} className='hover:bg-gray-700'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <span className='text-2xl mr-3'>
                          {file.mime_type === 'application/pdf' ? '📄' : '📝'}
                        </span>
                        <div>
                          <p className='text-sm font-medium text-white'>
                            {file.original_name}
                          </p>
                          <p className='text-xs text-gray-400'>
                            {file.mime_type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`text-sm ${getStatusColor(file.status)}`}
                      >
                        {getStatusText(file.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                      {file.chunks_count}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                      {formatDate(file.upload_date)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <button className='text-red-400 hover:text-red-300 mr-3'>
                        Удалить
                      </button>
                      <button className='text-blue-400 hover:text-blue-300'>
                        Просмотр
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
