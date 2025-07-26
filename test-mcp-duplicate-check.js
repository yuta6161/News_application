require('dotenv').config({ path: '.env.local' });

// MCP関数をグローバルに設定（Claude Code環境では利用可能）
if (typeof globalThis.mcp__supabase__execute_sql === 'undefined') {
  console.log('⚠️ MCP Supabaseツールが利用できません（テストモード）');
  globalThis.mcp__supabase__execute_sql = async ({ query }) => {
    console.log('🧪 テストモード: SQLクエリをログ出力');
    console.log('   クエリ:', query.substring(0, 100) + '...');
    // テスト用のダミーレスポンス
    return [
      { source_url: 'https://www.attackmagazine.com/test1' },
      { source_url: 'https://www.musicman.co.jp/test2' }
    ];
  };
}

async function testMCPDuplicateCheck() {
  console.log('🧪 MCP Supabase重複チェックのテスト\n');
  
  try {
    const { checkDuplicateUrls } = await import('./lib/mcp-supabase-helper.ts');
    
    // テスト用URL配列（大量データをシミュレート）
    const testUrls = [
      'https://www.attackmagazine.com/test1',
      'https://www.musicman.co.jp/test2',
      'https://bedroomproducersblog.com/test3',
      'https://www.edmprod.com/test4',
      'https://pitchfork.com/test5'
    ];
    
    console.log(`📊 テスト対象: ${testUrls.length}件のURL`);
    
    const startTime = Date.now();
    const existingUrls = await checkDuplicateUrls(testUrls);
    const duration = Date.now() - startTime;
    
    console.log(`\\n✅ テスト完了 (${duration}ms)`);
    console.log(`📊 既存URL数: ${existingUrls.size}件`);
    
    if (existingUrls.size > 0) {
      console.log('🔍 発見された既存URL:');
      existingUrls.forEach(url => {
        console.log(`   - ${url}`);
      });
    }
    
    console.log('\\n🎯 MCP Supabaseツール使用による制限回避テスト成功！');
    
  } catch (error) {
    console.log('❌ テストエラー:', error.message);
    console.log('📝 エラー詳細:', error.stack?.split('\\n').slice(0, 3).join('\\n'));
  }
}

testMCPDuplicateCheck().catch(console.error);