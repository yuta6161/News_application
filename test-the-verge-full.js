// The Verge専用統合テスト（実際の保存まで）
const { collectRSSFeeds, saveArticlesWithAIAnalysis } = require('./lib/rss-collector-gemini.ts');

async function testTheVergeFull() {
  console.log('🔍 The Verge統合テスト開始（RSS取得→DB保存→AI分析）...\n');
  
  try {
    // 1. 環境変数読み込み
    require('dotenv').config({ path: '.env.local' });
    
    // 2. RSS取得テスト
    console.log('📡 RSS取得テスト...');
    const articles = await collectRSSFeeds();
    
    const vergeArticles = articles.filter(a => a.source_name === 'The Verge');
    console.log(`✅ The Verge記事取得数: ${vergeArticles.length} 件\n`);
    
    if (vergeArticles.length === 0) {
      console.log('❌ The Vergeの記事が取得できませんでした');
      return;
    }
    
    // 最初の1件だけでテスト
    const testArticle = vergeArticles[0];
    console.log('📄 テスト記事:');
    console.log(`   タイトル: ${testArticle.title}`);
    console.log(`   URL: ${testArticle.source_url}`);
    console.log(`   要約: ${testArticle.summary.substring(0, 100)}...\n`);
    
    // 3. AI分析付き保存テスト
    console.log('💾 AI分析付き保存テスト...');
    const stats = await saveArticlesWithAIAnalysis([testArticle]);
    
    console.log('\n📊 結果:');
    console.log(`   新規記事: ${stats.newArticles} 件`);
    console.log(`   重複記事: ${stats.duplicates} 件`);
    console.log(`   AI分析完了: ${stats.aiAnalyzed} 件`);
    console.log(`   エラー: ${stats.errors} 件`);
    
    console.log('\n🎉 The Verge統合テスト完了！');
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

testTheVergeFull();