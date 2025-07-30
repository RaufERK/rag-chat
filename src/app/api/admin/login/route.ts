import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Проверяем учетные данные
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (email === adminEmail && password === adminPassword) {
      // Создаем простой токен (в продакшене используйте JWT)
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')
      
      // Устанавливаем cookie
      const cookieStore = cookies()
      cookieStore.set('admin-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 часа
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Авторизация успешна' 
      })
    } else {
      return NextResponse.json(
        { success: false, message: 'Неверный email или пароль' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Выход из системы
  const cookieStore = cookies()
  cookieStore.delete('admin-token')
  
  return NextResponse.json({ 
    success: true, 
    message: 'Выход выполнен' 
  })
} 