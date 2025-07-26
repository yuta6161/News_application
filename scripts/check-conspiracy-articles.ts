import { supabase } from '@/lib/supabase'

async function checkConspiracyArticles() {
  try {
    console.log('🔍 陰謀論記事の確認開始...')
    
    // 1. 全カテゴリの記事数確認
    const { data: allArticles, error: allError } = await supabase
      .from('news_articles')
      .select('category, source_name, title')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ 全記事取得エラー:', allError)
      return
    }
    
    // カテゴリ別集計
    const categoryMap = new Map<string, number>()
    const sourceMap = new Map<string, number>()
    
    allArticles?.forEach(article => {
      // カテゴリ別
      const catCount = categoryMap.get(article.category) || 0
      categoryMap.set(article.category, catCount + 1)
      
      // ソース別
      const srcCount = sourceMap.get(article.source_name) || 0
      sourceMap.set(article.source_name, srcCount + 1)
    })
    
    console.log('\n📊 カテゴリ別記事数:')
    Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`  📁 ${category}: ${count}件`)
      })
    
    console.log('\n📺 ソース別記事数:')
    Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`  📡 ${source}: ${count}件`)
      })
    
    // 2. 陰謀論系ソースからの記事を特定
    const conspiracySources = [
      'InfoWars',
      'Natural News', 
      'Zero Hedge',
      'Global Research',
      'The Vigilant Citizen'
    ]
    
    console.log('\n🔍 陰謀論系ソース記事の確認:')
    
    for (const source of conspiracySources) {
      const { data: sourceArticles, error: sourceError } = await supabase
        .from('news_articles')
        .select('id, title, category, source_name, created_at')
        .eq('source_name', source)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (sourceError) {
        console.error(`❌ ${source} 記事取得エラー:`, sourceError)
        continue
      }
      
      if (sourceArticles && sourceArticles.length > 0) {
        console.log(`\n📡 ${source}: ${sourceArticles.length}件`)
        sourceArticles.forEach(article => {
          console.log(`    📄 [${article.category}] ${article.title.substring(0, 60)}...`)
        })
      } else {
        console.log(`\n📡 ${source}: 記事なし`)
      }
    }
    
    // 3. Conspiracy カテゴリの記事確認
    const { data: conspiracyArticles, error: conspiracyError } = await supabase
      .from('news_articles')
      .select('id, title, source_name, created_at')
      .eq('category', 'Conspiracy')
      .order('created_at', { ascending: false })
    
    if (conspiracyError) {
      console.error('❌ Conspiracy カテゴリ記事取得エラー:', conspiracyError)
    } else {
      console.log(`\n🔍 Conspiracyカテゴリ記事: ${conspiracyArticles?.length || 0}件`)
      conspiracyArticles?.forEach(article => {
        console.log(`    📄 [${article.source_name}] ${article.title.substring(0, 60)}...`)
      })
    }
    
    console.log('\n✅ 確認完了')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
checkConspiracyArticles()