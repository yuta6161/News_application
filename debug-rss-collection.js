require('dotenv').config({ path: '.env.local' });

async function debugRSSCollection() {
  console.log('🔍 RSS収集システムデバッグ開始...\n');
  
  try {
    console.log('1️⃣ TypeScript モジュール読み込みテスト...');
    const { collectRSSFeeds } = await import('./lib/rss-collector-gemini.ts');
    console.log('   ✅ モジュール読み込み成功');
    
    console.log('\\n2️⃣ RSS収集関数実行テスト...');
    const startTime = Date.now();
    const articles = await collectRSSFeeds();
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ RSS収集完了 (${duration}ms)`);
    console.log(`   📊 収集した記事数: ${articles.length}`);
    
    // カテゴリ別集計
    const categoryCount = {};
    articles.forEach(article => {
      categoryCount[article.category] = (categoryCount[article.category] || 0) + 1;
    });
    
    console.log('\\n📊 カテゴリ別収集結果:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}記事`);
    });
    
    // 音楽系記事の詳細確認
    const musicArticles = articles.filter(a => a.category === 'Music');
    if (musicArticles.length > 0) {
      console.log('\\n🎵 音楽系記事サンプル:');
      musicArticles.slice(0, 3).forEach((article, i) => {
        console.log(`   ${i+1}. [${article.source_name}] ${article.title.substring(0, 50)}...`);
      });
    } else {
      console.log('\\n❌ 音楽系記事が0件収集されました');
    }
    
  } catch (error) {
    console.log('\\n❌ RSS収集システムエラー:');
    console.log('   エラータイプ:', error.constructor.name);
    console.log('   エラーメッセージ:', error.message);
    console.log('   スタックトレース:', error.stack?.split('\\n').slice(0, 5).join('\\n'));
  }
}

debugRSSCollection().catch(console.error);