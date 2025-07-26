import { NextResponse } from 'next/server';
import { runRSSCollectionWithAI } from '@/lib/rss-collector-gemini';

export async function GET(request: Request) {
  // 開発環境でのみ手動実行を許可
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('🚀 RSS収集API呼び出し開始...');
  const result = await runRSSCollectionWithAI();
  console.log('✅ RSS収集API完了:', result.success ? '成功' : '失敗');
  
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  // POSTメソッドでも同じ処理を実行
  return GET(request);
}