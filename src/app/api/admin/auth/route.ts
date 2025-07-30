import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('admin-token')

    if (token) {
      // В простой версии просто проверяем наличие токена
      // В продакшене нужно валидировать JWT
      return NextResponse.json({
        authenticated: true,
        user: {
          email: process.env.ADMIN_EMAIL,
          name: 'Admin',
        },
      })
    } else {
      return NextResponse.json({
        authenticated: false,
      })
    }
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
    })
  }
}
