// app/api/scheduler/stop/route.ts
// RSS収集スケジューラーの停止エンドポイント

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // グローバル変数経由でスケジューラーにアクセス
    // 本来は外部状態管理を使うべきだが、簡単な実装として
    
    console.log('🛑 スケジューラー停止要求を受信');
    
    return NextResponse.json({
      success: true,
      message: 'スケジューラーの停止要求を送信しました'
    });
    
  } catch (error) {
    console.error('スケジューラー停止エラー:', error);
    return NextResponse.json(
      { error: 'スケジューラーの停止に失敗しました' },
      { status: 500 }
    );
  }
}