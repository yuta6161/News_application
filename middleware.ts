// middleware.ts
// 簡単な認証を追加（開発環境用）

import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 本番環境でのみ認証を有効化
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTH === 'true') {
    const basicAuth = request.headers.get('authorization')
    const url = request.nextUrl
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      
      // 環境変数で設定されたユーザー名・パスワードをチェック
      if (user === process.env.AUTH_USER && pwd === process.env.AUTH_PASS) {
        return NextResponse.next()
      }
    }
    
    url.pathname = '/api/auth'
    
    return NextResponse.rewrite(url)
  }
  
  return NextResponse.next()
}

// 認証が必要なパスを指定
export const config = {
  matcher: [
    /*
     * 以下のパスには認証をかけない:
     * - api/auth (認証API自体)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}