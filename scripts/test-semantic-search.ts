import { performSemanticSearch } from '@/lib/search/semantic-search'

async function testSemanticSearch() {
  console.log('🧪 セマンティック検索テスト開始...\n')
  
  const testQueries = [
    '最新のAI関連ニュース',
    'Googleの新しいサービスで重要なもの',
    'OpenAIに関連する記事',
    '陰謀論系の記事を除外してテック系ニュース',
    '重要度が高い記事を5件',
  ]
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i]
    console.log(`\n📋 テスト ${i + 1}: "${query}"`)
    console.log('=' .repeat(50))
    
    try {
      const startTime = Date.now()
      const result = await performSemanticSearch(query)
      const endTime = Date.now()
      
      console.log(`⏱️  実行時間: ${endTime - startTime}ms`)
      console.log(`📊 検索結果: ${result.articles.length}件`)
      console.log(`🎯 検索意図:`)
      console.log(`   必須タグ: [${result.search_intent.required_tags.join(', ')}]`)
      console.log(`   推奨タグ: [${result.search_intent.preferred_tags.join(', ')}]`)
      console.log(`   除外タグ: [${result.search_intent.excluded_tags.join(', ')}]`)
      
      if (result.articles.length > 0) {
        console.log(`\n📰 トップ3記事:`)
        result.articles.slice(0, 3).forEach((article, index) => {
          const relevanceScore = result.relevance_scores[article.id] || 0
          console.log(`   ${index + 1}. ${article.title}`)
          console.log(`      関連度: ${Math.round(relevanceScore * 10) / 10} | 重要度: ${article.importance_score}`)
          console.log(`      カテゴリ: ${article.category} | ソース: ${article.source_name}`)
        })
      } else {
        console.log('   ❌ 検索結果なし')
      }
      
    } catch (error) {
      console.error(`   ❌ エラー: ${error}`)
    }
    
    // 次のテストまで少し待機
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n🎉 セマンティック検索テスト完了!')
}

// テスト実行
testSemanticSearch().catch(console.error)