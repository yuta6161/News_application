require('dotenv').config({ path: '.env.local' });
const Parser = require('rss-parser');

const musicSources = [
  { name: 'Musicman', url: 'https://www.musicman.co.jp/feed' },
  { name: 'Bedroom Producers Blog', url: 'https://bedroomproducersblog.com/feed/' },
  { name: 'EDMProd', url: 'https://www.edmprod.com/feed/' },
  { name: 'Pitchfork', url: 'https://pitchfork.com/feed/feed-news/rss' },
  { name: 'XLR8R', url: 'https://xlr8r.com/feed' }
];

async function testSpecificMusicRSS() {
  const parser = new Parser();
  
  console.log('🎵 Attack Magazine以外の音楽RSS個別テスト\n');
  
  for (const source of musicSources) {
    console.log(`📡 テスト中: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    
    try {
      const startTime = Date.now();
      const feed = await parser.parseURL(source.url);
      const duration = Date.now() - startTime;
      
      if (feed && feed.items) {
        console.log(`   ✅ RSS取得成功: ${feed.items.length}記事 (${duration}ms)`);
        if (feed.items.length > 0) {
          console.log(`   📰 最新記事: ${feed.items[0].title?.substring(0, 60)}...`);
        }
      } else {
        console.log(`   ⚠️ フィードまたは記事が空`);
      }
      
    } catch (error) {
      console.log(`   ❌ RSS取得失敗: ${error.message}`);
      console.log(`   🔍 エラー詳細: ${error.constructor.name}`);
    }
    
    console.log('');
  }
}

testSpecificMusicRSS().catch(console.error);