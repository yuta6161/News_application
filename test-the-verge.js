// The Verge専用テストスクリプト
const Parser = require('rss-parser');

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
});

async function testTheVerge() {
  console.log('🔍 The Verge RSS個別テスト開始...\n');
  
  try {
    console.log('📡 The Verge RSSフィード取得中...');
    const feed = await parser.parseURL('https://www.theverge.com/rss/index.xml');
    
    console.log(`✅ フィード取得成功！`);
    console.log(`   📰 フィードタイトル: ${feed.title}`);
    console.log(`   📄 記事数: ${feed.items.length} 件`);
    console.log(`   🕒 最終更新: ${feed.lastBuildDate}\n`);
    
    // 最初の3記事を詳細表示
    console.log('📄 最新記事（3件）:');
    for (let i = 0; i < Math.min(3, feed.items.length); i++) {
      const item = feed.items[i];
      console.log(`\n${i+1}. ${item.title}`);
      console.log(`   🔗 URL: ${item.link}`);
      console.log(`   📅 公開日: ${item.pubDate}`);
      console.log(`   📝 要約: ${(item.contentSnippet || item.description || 'なし').substring(0, 100)}...`);
    }
    
    console.log('\n✅ The Verge RSS取得テスト完了！');
    
  } catch (error) {
    console.error('❌ The Verge RSS取得エラー:', error);
    
    // エラーの詳細情報
    if (error.code) {
      console.error(`   エラーコード: ${error.code}`);
    }
    if (error.message) {
      console.error(`   エラーメッセージ: ${error.message}`);
    }
    if (error.response) {
      console.error(`   HTTPステータス: ${error.response.statusCode}`);
    }
  }
}

testTheVerge();