const Parser = require('rss-parser');
const { rssSources } = require('./lib/rss-sources.ts');

async function simpleRSSCollection() {
  const parser = new Parser();
  
  console.log('🎵 シンプルRSS収集テスト（AI分析なし）\n');
  
  // 音楽系のみテスト
  const musicSources = rssSources.filter(source => source.category === 'Music');
  
  let totalArticles = 0;
  
  for (const source of musicSources) {
    console.log(`📡 収集中: ${source.name}`);
    
    try {
      const feed = await parser.parseURL(source.url);
      const articles = feed.items || [];
      
      console.log(`   ✅ ${articles.length}記事を収集`);
      
      if (articles.length > 0) {
        console.log(`   📰 最新: ${articles[0].title?.substring(0, 60)}...`);
        console.log(`   🔗 URL: ${articles[0].link}`);
        totalArticles += articles.length;
      }
      
    } catch (error) {
      console.log(`   ❌ エラー: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log(`\n🎯 収集完了: 音楽系RSSから合計 ${totalArticles} 記事`);
}

simpleRSSCollection().catch(console.error);