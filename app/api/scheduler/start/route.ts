// app/api/scheduler/start/route.ts
// RSS収集スケジューラーの開始エンドポイント

import { NextResponse } from 'next/server';
import { startRSSScheduler, startTestScheduler } from '@/lib/scheduler';

let activeScheduler: any = null;

export async function POST(request: Request) {
  try {
    const { mode } = await request.json();
    
    if (activeScheduler) {
      return NextResponse.json(
        { error: 'スケジューラーは既に実行中です' },
        { status: 400 }
      );
    }

    // テストモード（5分間隔）か本番モード（1時間間隔）を選択
    if (mode === 'test') {
      activeScheduler = startTestScheduler();
      activeScheduler.start();
      
      console.log('🧪 テストスケジューラー開始（5分間隔）');
      return NextResponse.json({
        success: true,
        message: 'テストスケジューラーを開始しました（5分間隔）',
        mode: 'test'
      });
    } else {
      activeScheduler = startRSSScheduler();
      activeScheduler.start();
      
      console.log('🕐 本番スケジューラー開始（1時間間隔）');
      return NextResponse.json({
        success: true,
        message: 'RSS収集スケジューラーを開始しました（1時間間隔）',
        mode: 'production'
      });
    }
    
  } catch (error) {
    console.error('スケジューラー開始エラー:', error);
    return NextResponse.json(
      { error: 'スケジューラーの開始に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    running: activeScheduler !== null,
    status: activeScheduler ? 'スケジューラー実行中' : 'スケジューラー停止中'
  });
}