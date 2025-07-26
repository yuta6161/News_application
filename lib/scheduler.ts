// lib/scheduler.ts
// RSS収集の自動スケジューラー

import * as cron from 'node-cron';
import { runRSSCollectionWithAI } from './rss-collector-gemini';

let isRunning = false;

export function startRSSScheduler() {
  // 1時間に1回実行（毎時0分）
  const scheduler = cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      console.log('⏳ RSS収集が既に実行中のため、スキップします');
      return;
    }

    try {
      isRunning = true;
      console.log('🕐 定期RSS収集を開始します...');
      
      const result = await runRSSCollectionWithAI();
      
      if (result.success) {
        console.log('✅ 定期RSS収集完了:', {
          新記事: result.stats?.newArticles || 0,
          重複: result.stats?.duplicates || 0,
          AI分析: result.stats?.aiAnalyzed || 0
        });
      } else {
        console.error('❌ 定期RSS収集失敗:', result.error);
      }
      
    } catch (error) {
      console.error('❌ RSS収集スケジューラーエラー:', error);
    } finally {
      isRunning = false;
    }
  });

  return scheduler;
}

export function stopRSSScheduler(scheduler: any) {
  scheduler.destroy();
  console.log('🛑 RSS収集スケジューラーを停止しました');
}

// 開発環境でのテスト用（5分に1回）
export function startTestScheduler() {
  return cron.schedule('*/5 * * * *', async () => {
    if (isRunning) return;
    
    try {
      isRunning = true;
      console.log('🧪 テストRSS収集開始...');
      const result = await runRSSCollectionWithAI();
      console.log('🧪 テスト完了:', result.success ? '成功' : '失敗');
    } catch (error) {
      console.error('🧪 テストエラー:', error);
    } finally {
      isRunning = false;
    }
  });
}