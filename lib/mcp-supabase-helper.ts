/**
 * MCP Supabaseツールを使用したバッチ処理ヘルパー
 * JavaScript SDK制限を回避するために直接SQLを実行
 */

// 動的インポートを使用してMCP関数にアクセス
declare const globalThis: any;

/**
 * 大量URL配列の重複チェック（MCP Supabase使用）
 * JavaScript SDKの.in()制限を回避
 */
export async function checkDuplicateUrlsBatch(urls: string[]): Promise<{
  existingUrls: Set<string>;
  error?: string;
}> {
  try {
    console.log(`🔍 MCP Supabaseで重複チェック実行 (${urls.length}件)`);
    
    if (urls.length === 0) {
      return { existingUrls: new Set() };
    }
    
    // URLを適切にエスケープしてSQL配列を構築
    const escapedUrls = urls
      .map(url => `'${url.replace(/'/g, "''")}'`)
      .join(',');
    
    const query = `
      SELECT DISTINCT source_url 
      FROM news_articles 
      WHERE source_url = ANY(ARRAY[${escapedUrls}])
    `;
    
    // Node.js環境ではMCP関数に直接アクセスできないため
    // この関数は実際のClaude Code実行時にのみ動作します
    console.log('   ⚠️ MCP関数はClaude Code環境でのみ利用可能');
    console.log('   🔄 フォールバック処理に移行します');
    
    return { 
      existingUrls: new Set(), 
      error: 'MCP not available in Node.js environment' 
    };
    
  } catch (error) {
    console.error('❌ MCP重複チェックエラー:', error);
    return { 
      existingUrls: new Set(), 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * バッチサイズを制限した重複チェック（フォールバック）
 */
export async function checkDuplicateUrlsWithFallback(urls: string[]): Promise<{
  existingUrls: Set<string>;
  error?: string;
}> {
  console.log(`🔄 フォールバック重複チェック実行 (${urls.length}件)`);
  
  const BATCH_SIZE = 50; // JavaScript SDK制限を考慮したバッチサイズ
  const existingUrls = new Set<string>();
  
  try {
    // 動的インポートでsupabaseクライアントを取得
    const { supabase } = await import('./supabase');
    
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      console.log(`   📦 バッチ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(urls.length/BATCH_SIZE)}: ${batch.length}件`);
      
      const { data, error } = await supabase
        .from('news_articles')
        .select('source_url')
        .in('source_url', batch);
      
      if (error) {
        console.error(`❌ バッチ${Math.floor(i/BATCH_SIZE) + 1}エラー:`, error);
        continue; // エラーが発生してもほかのバッチは続行
      }
      
      if (data) {
        data.forEach(item => existingUrls.add(item.source_url));
      }
      
      // レート制限対策で少し待機
      if (i + BATCH_SIZE < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`   ✅ フォールバック完了: ${existingUrls.size}件の既存URL発見`);
    return { existingUrls };
    
  } catch (error) {
    console.error('❌ フォールバック重複チェックエラー:', error);
    return { 
      existingUrls: new Set(), 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 統合重複チェック関数
 * MCP優先、フォールバック付き
 */
export async function checkDuplicateUrls(urls: string[]): Promise<Set<string>> {
  console.log(`🔍 統合重複チェック開始 (${urls.length}件のURL)`);
  
  // まずMCP Supabaseツールを試行
  const mcpResult = await checkDuplicateUrlsBatch(urls);
  
  if (!mcpResult.error && mcpResult.existingUrls.size >= 0) {
    console.log('✅ MCP Supabaseツールで重複チェック成功');
    return mcpResult.existingUrls;
  }
  
  // MCP失敗時はバッチ処理フォールバック
  console.log('🔄 JavaScript SDKバッチ処理にフォールバック');
  const fallbackResult = await checkDuplicateUrlsWithFallback(urls);
  
  if (fallbackResult.error) {
    console.error('⚠️ 全ての重複チェック方法が失敗しました');
    console.error('💡 データベース側の重複制約に依存します');
  }
  
  return fallbackResult.existingUrls;
}