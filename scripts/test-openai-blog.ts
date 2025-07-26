// OpenAI Blog専用テスト
import 'dotenv/config';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
});

async function testOpenAIBlog() {
  console.log('🔍 OpenAI Blog RSS個別テスト開始...\n');
  
  try {
    console.log('📡 OpenAI Blog RSSフィード取得中...');
    console.log('🔗 URL: https://openai.com/blog/rss.xml');
    
    const feed = await parser.parseURL('https://openai.com/blog/rss.xml');
    
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
      console.log(`   📝 要約: ${(item.contentSnippet || (item as any).description || 'なし').substring(0, 100)}...`);
    }
    
    console.log('\n✅ OpenAI Blog RSS取得テスト完了！');
    
  } catch (error) {
    console.error('❌ OpenAI Blog RSS取得エラー:', error);
    
    // エラーの詳細情報
    if (error && typeof error === 'object') {
      if ('code' in error) {
        console.error(`   📊 エラーコード: ${error.code}`);
      }
      if ('message' in error) {
        console.error(`   📊 エラーメッセージ: ${error.message}`);
      }
      if ('response' in error && error.response) {
        console.error(`   📊 HTTPステータス: ${(error.response as any)?.statusCode || 'unknown'}`);
      }
    }
    
    // 追加デバッグ情報
    console.log('\n🔍 追加調査...');
    
    // curl テスト
    console.log('   📡 curl でのアクセステスト:');
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      const { stdout, stderr } = await execPromise('curl -I "https://openai.com/blog/rss.xml"');
      console.log('   ✅ curl結果:', stdout.split('\n')[0]);
    } catch (curlError) {
      console.log('   ❌ curl失敗:', (curlError as any).message);
    }
  }
}

testOpenAIBlog();