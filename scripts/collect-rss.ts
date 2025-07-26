import 'dotenv/config';
import { runRSSCollection } from '../lib/rss-collector';

async function main() {
  console.log('RSS収集バッチを開始します...');
  
  // 環境変数の確認
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定');
  console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '✅ 設定済み' : '❌ 未設定');
  console.log('実際のURL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('実際のKey:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...' : 'undefined');
  
  const result = await runRSSCollection();
  
  if (result.success) {
    console.log(`✅ 成功: ${result.count} 件の記事を処理しました`);
  } else {
    console.error('❌ エラーが発生しました:', result.error);
  }
  
  process.exit(0);
}

main().catch(console.error);