import 'dotenv/config';
import { runRSSCollectionWithAI, retroactiveAnalyzeArticles } from '../lib/rss-collector-gemini';

async function main() {
  console.log('🚀 RSS収集バッチ（Gemini AI対応版）を開始します...\n');
  
  // 環境変数の確認
  console.log('🔧 環境変数確認:');
  console.log('   Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定');
  console.log('   Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '✅ 設定済み' : '❌ 未設定');
  console.log('   Gemini API Key:', process.env.GEMINI_API_KEY ? '✅ 設定済み' : '❌ 未設定');
  console.log('');
  
  // 必須環境変数の確認
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
      !process.env.GEMINI_API_KEY) {
    console.error('❌ 必須環境変数が不足しています');
    console.log('💡 .env.localファイルを確認してください');
    process.exit(1);
  }
  
  try {
    // メインのRSS収集とAI分析
    const result = await runRSSCollectionWithAI();
    
    if (result.success && result.stats) {
      const { stats } = result;
      
      console.log('\n📈 処理完了サマリー:');
      console.log(`   ✅ 成功: ${stats.newArticles} 件の新記事を処理`);
      console.log(`   🤖 AI分析: ${stats.aiAnalyzed} 件完了`);
      
      if (stats.errors > 0) {
        console.log(`   ⚠️  エラー: ${stats.errors} 件`);
      }
      
      // 遡及分析のオプション（コメントアウト状態）
      /*
      if (stats.newArticles === 0) {
        console.log('\n🔄 新記事がないため、既存記事の遡及分析を実行...');
        await retroactiveAnalyzeArticles(5);
      }
      */
      
    } else {
      console.error('❌ RSS収集でエラーが発生しました:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  }
  
  console.log('\n✅ RSS収集バッチが正常に完了しました');
  process.exit(0);
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.includes('--retroactive')) {
  // 遡及分析モード
  const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '10');
  
  console.log(`🔄 遡及分析モード: 最大${limit}件の既存記事を分析します...`);
  
  retroactiveAnalyzeArticles(limit)
    .then(() => {
      console.log('✅ 遡及分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 遡及分析エラー:', error);
      process.exit(1);
    });
} else {
  // 通常モード
  main().catch(console.error);
}

// 使用方法の表示
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 使用方法:

🔸 通常のRSS収集 + AI分析:
   npm run collect-rss-gemini

🔸 既存記事の遡及分析:
   npm run collect-rss-gemini -- --retroactive
   npm run collect-rss-gemini -- --retroactive --limit=20

🔸 このヘルプ:
   npm run collect-rss-gemini -- --help

📝 説明:
- 通常モード: 新しいRSS記事を収集し、Geminiで分析・タグ付け
- 遡及モード: 既存のAI未分析記事を遡及的に分析
- limit: 遡及分析する記事数の上限（デフォルト: 10）
`);
  process.exit(0);
}