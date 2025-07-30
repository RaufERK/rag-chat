import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Проверяем админские роуты
  if (pathname.startsWith('/admin')) {
    // Если пользователь уже на странице логина - пропускаем
    if (pathname === '/admin/login') {
      // Если авторизован - редирект в админку
      if (session?.user?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      // Если не авторизован - показываем страницу логина
      return NextResponse.next()
    }

    // Для всех остальных админских страниц - проверяем авторизацию
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
