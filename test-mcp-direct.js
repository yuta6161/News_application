// Claude Code環境でのMCP関数直接テスト

async function testMCPDirect() {
  console.log('🔍 Claude Code環境でのMCP関数テスト\n');
  
  // テスト用の簡単なSQL
  const testQuery = `
    SELECT source_url 
    FROM news_articles 
    WHERE source_url LIKE '%attackmagazine%'
    LIMIT 3
  `;
  
  try {
    console.log('📡 MCP Supabase直接実行テスト...');
    
    // この関数はClaude Code環境でのみ利用可能
    if (typeof mcp__supabase__execute_sql === 'function') {
      console.log('✅ MCP関数が利用可能です');
      
      const result = await mcp__supabase__execute_sql({ query: testQuery });
      
      console.log('📊 クエリ結果:');
      console.log('   結果タイプ:', typeof result);
      console.log('   結果内容:', result);
      
      if (Array.isArray(result)) {
        console.log(`   📈 取得件数: ${result.length}件`);
        result.forEach((row, i) => {
          console.log(`   ${i+1}. ${row.source_url}`);
        });
      }
      
    } else {
      console.log('❌ MCP関数が利用できません');
      console.log('💡 この環境ではClaude Code MCPツールが使用できない可能性があります');
    }
    
  } catch (error) {
    console.log('❌ MCP実行エラー:', error.message);
  }
}

// MCP関数のアクセス方法をテスト
console.log('🔧 MCP関数の確認:');
console.log('   mcp__supabase__execute_sql:', typeof mcp__supabase__execute_sql);
console.log('   globalThis.mcp__supabase__execute_sql:', typeof globalThis.mcp__supabase__execute_sql);

testMCPDirect().catch(console.error);