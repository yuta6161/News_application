const Parser = require('rss-parser');
const { rssSources } = require('./lib/rss-sources.ts');

async function testMusicRSS() {
  const parser = new Parser();
  
  console.log('🎵 音楽系RSS収集テスト開始...\n');
  
  const musicSources = rssSources.filter(source => source.category === 'Music');
  
  for (const source of musicSources) {
    console.log(`📡 テスト中: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    
    try {
      const feed = await parser.parseURL(source.url);
      console.log(`   ✅ RSS取得成功: ${feed.items?.length || 0}記事`);
      
      // 最初の記事タイトルを表示
      if (feed.items && feed.items.length > 0) {
        console.log(`   📰 最新記事: ${feed.items[0].title?.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ RSS取得失敗: ${error.message}`);
    }
    
    console.log('');
  }
}

testMusicRSS().catch(console.error);