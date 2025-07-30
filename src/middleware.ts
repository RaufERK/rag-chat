import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Пока ничего не делаем - просто пропускаем все запросы
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Пока не используем никаких роутов
    // '/admin/:path*'
  ]
}
