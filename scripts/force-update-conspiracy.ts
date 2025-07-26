import { supabase } from '@/lib/supabase'

async function forceUpdateConspiracyCategory() {
  try {
    console.log('🔧 陰謀論記事のカテゴリを強制更新中...')
    
    // 1. 陰謀論系ソースの記事を特定
    const conspiracySources = ['Zero Hedge', 'The Vigilant Citizen', 'Global Research']
    const conspiracyKeywords = [
      'Federal Reserve',
      'World Economic Forum', 
      'Mainstream Media',
      'Symbolism',
      'Digital Currency'
    ]
    
    // 2. ソースベースで記事を取得
    const { data: sourceArticles, error: sourceError } = await supabase
      .from('news_articles')
      .select('id, title, category, source_name')
      .in('source_name', conspiracySources)
    
    if (sourceError) {
      console.error('❌ ソース記事取得エラー:', sourceError)
      return
    }
    
    console.log(`📊 陰謀論ソース記事: ${sourceArticles?.length || 0}件`)
    
    // 3. キーワードベースで記事を取得  
    let keywordArticles: any[] = []
    for (const keyword of conspiracyKeywords) {
      const { data, error } = await supabase
        .from('news_articles')
        .select('id, title, category, source_name')
        .ilike('title', `%${keyword}%`)
      
      if (!error && data) {
        keywordArticles = [...keywordArticles, ...data]
      }
    }
    
    console.log(`📊 キーワード記事: ${keywordArticles.length}件`)
    
    // 4. 重複を除去して統合
    const allConspiracyArticles = [...sourceArticles || [], ...keywordArticles]
    const uniqueArticles = allConspiracyArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.id === article.id)
    )
    
    console.log(`📊 更新対象記事: ${uniqueArticles.length}件`)
    
    // 5. 各記事のカテゴリを個別に更新
    let successCount = 0
    for (const article of uniqueArticles) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .update({ category: 'Conspiracy' })
          .eq('id', article.id)
          .select()
        
        if (error) {
          console.error(`❌ 更新失敗 [${article.id}]: ${error.message}`)
        } else {
          console.log(`✅ 更新成功: ${article.title.substring(0, 50)}...`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ 予期しないエラー [${article.id}]:`, err)
      }
    }
    
    console.log(`\n📊 結果: ${successCount}/${uniqueArticles.length} 件を更新`)
    
    // 6. 更新結果を確認
    const { data: updatedArticles, error: checkError } = await supabase
      .from('news_articles')
      .select('id, title, category, source_name, created_at')
      .eq('category', 'Conspiracy')
      .order('created_at', { ascending: false })
    
    if (checkError) {
      console.error('❌ 更新確認エラー:', checkError)
    } else {
      console.log(`\n🎉 Conspiracyカテゴリ記事: ${updatedArticles?.length || 0}件`)
      updatedArticles?.forEach((article, index) => {
        console.log(`  ${index + 1}. [${article.source_name}] ${article.title.substring(0, 60)}...`)
      })
    }
    
    console.log('\n✅ 強制更新完了！')
    console.log('🌐 ブラウザで陰謀論タブを確認してください')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
forceUpdateConspiracyCategory()