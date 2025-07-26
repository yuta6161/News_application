import { supabase } from '@/lib/supabase'

async function countAllArticles() {
  try {
    console.log('📊 全記事数カウント開始...')
    
    // 1. 全記事数をカウント
    const { count: totalCount, error: totalError } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) {
      console.error('❌ 総記事数取得エラー:', totalError)
      return
    }
    
    // 2. AI分析済み記事数をカウント
    const { count: aiAnalyzedCount, error: aiError } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true })
      .not('ai_summary', 'is', null)
    
    if (aiError) {
      console.error('❌ AI分析済み記事数取得エラー:', aiError)
      return
    }
    
    // 3. カテゴリ別記事数を取得
    const { data: articles, error: categoryError } = await supabase
      .from('news_articles')
      .select('category')
    
    if (categoryError) {
      console.error('❌ カテゴリ別取得エラー:', categoryError)
      return
    }
    
    // カテゴリ別集計
    const categoryMap = new Map<string, number>()
    articles?.forEach(article => {
      const count = categoryMap.get(article.category) || 0
      categoryMap.set(article.category, count + 1)
    })
    
    // 4. タグ付き記事数をカウント
    const { count: taggedCount, error: tagError } = await supabase
      .from('article_tags')
      .select('article_id', { count: 'exact', head: true })
    
    if (tagError) {
      console.error('❌ タグ付き記事数取得エラー:', tagError)
    }
    
    // 結果表示
    console.log('\n📈 記事統計情報')
    console.log('========================')
    console.log(`📰 総記事数: ${totalCount}件`)
    console.log(`🤖 AI分析済み: ${aiAnalyzedCount}件 (${totalCount ? Math.round((aiAnalyzedCount || 0) / totalCount * 100) : 0}%)`)
    console.log(`🏷️ タグ付き記事: ${taggedCount}件`)
    
    console.log('\n📂 カテゴリ別記事数:')
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
    
    sortedCategories.forEach(([category, count]) => {
      const percentage = totalCount ? Math.round(count / totalCount * 100) : 0
      console.log(`  📁 ${category}: ${count}件 (${percentage}%)`)
    })
    
    console.log('\n✅ カウント完了')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
countAllArticles()