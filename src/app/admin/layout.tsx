import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-screen bg-gray-900/60 relative z-10'>
      <nav className='bg-indigo-900 border-b border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16'>
            <div className='flex items-center'>
              <h1 className='text-xl font-semibold text-white'>
                RAG Chat Admin
              </h1>
            </div>
            <div className='flex items-center space-x-4'>
              <span className='text-gray-300'>admin@example.com</span>
              <Link
                href='/'
                className='text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium'
              >
                На главную
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>{children}</main>
    </div>
  )
}
