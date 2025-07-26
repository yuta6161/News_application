require('dotenv').config({ path: '.env.local' });

async function debugSupabaseQuery() {
  console.log('🔍 Supabase重複チェッククエリのデバッグ...\n');
  
  try {
    const { supabase } = await import('./lib/supabase.ts');
    
    // テスト用のURLリスト（音楽系記事のURL）
    const testUrls = [
      'https://www.musicman.co.jp/test1',
      'https://bedroomproducersblog.com/test2', 
      'https://www.edmprod.com/test3'
    ];
    
    console.log('📡 テストクエリ実行...');
    console.log('対象URL数:', testUrls.length);
    
    const { data, error } = await supabase
      .from('news_articles')
      .select('source_url')
      .in('source_url', testUrls);
      
    if (error) {
      console.log('❌ クエリエラー発生:');
      console.log('   エラーコード:', error.code);
      console.log('   エラーメッセージ:', error.message);
      console.log('   エラー詳細:', error.details);
      console.log('   エラーヒント:', error.hint);
      
      // エラーの種類を判定
      if (error.message === 'Bad Request') {
        console.log('\n💡 Bad Requestの原因候補:');
        console.log('   - URL配列のサイズ制限超過');
        console.log('   - SQLクエリの構文問題');
        console.log('   - Supabase接続設定問題');
      }
    } else {
      console.log('✅ クエリ成功');
      console.log('   取得データ数:', data?.length || 0);
    }
    
    // 大量URLでの制限テスト
    console.log('\n📊 大量URL制限テスト...');
    const largeUrlList = Array.from({length: 500}, (_, i) => `https://test${i}.com`);
    
    const { data: largeData, error: largeError } = await supabase
      .from('news_articles')
      .select('source_url')
      .in('source_url', largeUrlList);
      
    if (largeError) {
      console.log('❌ 大量URL制限エラー:', largeError.message);
    } else {
      console.log('✅ 大量URLテスト成功');
    }
    
  } catch (error) {
    console.log('❌ スクリプト実行エラー:', error.message);
  }
}

debugSupabaseQuery().catch(console.error);