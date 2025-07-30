'use client'

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('Ошибка выхода:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className='text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium'
    >
      Выйти
    </button>
  )
}
