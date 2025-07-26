import { supabase } from '@/lib/supabase'

async function checkAvailableCategories() {
  try {
    console.log('📊 カテゴリ一覧を確認中...')
    
    // 1. Supabaseから直接カテゴリを確認
    const { data: articles, error } = await supabase
      .from('news_articles')
      .select('category')
      .not('ai_summary', 'is', null)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ エラー:', error)
      return
    }
    
    // カテゴリの重複を削除してカウント
    const categoryMap = new Map<string, number>()
    
    articles?.forEach(article => {
      const count = categoryMap.get(article.category) || 0
      categoryMap.set(article.category, count + 1)
    })
    
    console.log('\n📈 利用可能なカテゴリ一覧:')
    console.log('========================')
    
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1]) // 記事数の多い順
    
    sortedCategories.forEach(([category, count]) => {
      console.log(`📂 ${category}: ${count}件`)
    })
    
    console.log('\n✅ 確認完了')
    console.log(`📊 総カテゴリ数: ${categoryMap.size}`)
    console.log(`📰 総記事数: ${articles?.length}`)
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
checkAvailableCategories()