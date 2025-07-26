// app/api/auth/route.ts
// 基本認証API

import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return new Response('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}