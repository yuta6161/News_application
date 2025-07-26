import { supabase } from '@/lib/supabase'
import { analyzeArticleWithGemini, saveArticleAnalysis } from '@/lib/ai/article-analyzer'

async function retroactiveTagArticles() {
  console.log('🔄 遡及記事タグ付け開始...\n')
  
  try {
    // 1. タグなし記事を取得
    const { data: untaggedArticles, error: fetchError } = await supabase
      .from('news_articles')
      .select(`
        id, 
        title, 
        summary, 
        source_url, 
        source_name,
        category,
        created_at,
        article_tags(id)
      `)
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ 記事取得エラー:', fetchError)
      return
    }
    
    // タグがない記事をフィルタリング
    const articlesNeedingTags = untaggedArticles?.filter(article => 
      !article.article_tags || article.article_tags.length === 0
    ) || []
    
    console.log(`📊 タグ付け対象記事: ${articlesNeedingTags.length}件`)
    
    if (articlesNeedingTags.length === 0) {
      console.log('✅ 全ての記事にタグが付いています')
      return
    }
    
    console.log('\n🤖 AI分析とタグ付けを開始...')
    
    let successCount = 0
    let errorCount = 0
    
    // 2. 各記事を分析してタグ付け
    for (let i = 0; i < articlesNeedingTags.length; i++) {
      const article = articlesNeedingTags[i]
      const progress = `[${i + 1}/${articlesNeedingTags.length}]`
      
      try {
        console.log(`\n${progress} 分析中...`)
        console.log(`   📝 タイトル: ${article.title.substring(0, 60)}...`)
        console.log(`   📂 カテゴリ: ${article.category}`)
        console.log(`   🌐 ソース: ${article.source_name}`)
        
        // Gemini AI分析
        const analysisResult = await analyzeArticleWithGemini(
          article.title,
          article.summary || 'No summary available',
          article.source_url,
          article.source_name
        )
        
        // 重要度とAI要約をデータベースに反映
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({
            importance_score: analysisResult.importance_score,
            ai_summary: analysisResult.summary
          })
          .eq('id', article.id)
        
        if (updateError) {
          console.error(`   ❌ 記事更新エラー:`, updateError)
        }
        
        // 分析結果を保存（タグ付け）
        await saveArticleAnalysis(article.id, analysisResult)
        
        console.log(`   ✅ 完了: 重要度${analysisResult.importance_score}, ${analysisResult.tags.length}個のタグ`)
        console.log(`   🏷️  タグ: ${analysisResult.tags.map(t => t.tag_name).slice(0, 5).join(', ')}`)
        
        successCount++
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`${progress} 分析エラー:`, error)
        errorCount++
      }
    }
    
    // 3. 完了サマリー
    console.log('\n🎉 遡及タグ付け完了!')
    console.log('='.repeat(50))
    console.log(`📊 処理結果:`)
    console.log(`   ✅ 成功: ${successCount}件`)
    console.log(`   ❌ エラー: ${errorCount}件`)
    console.log(`   📊 成功率: ${Math.round(successCount / articlesNeedingTags.length * 100)}%`)
    console.log('='.repeat(50))
    
    // 4. 更新後の統計
    console.log('\n📊 更新後のタグカバレッジ確認...')
    
    const { data: allArticlesAfter } = await supabase
      .from('news_articles')
      .select('id')
    
    const { data: taggedArticlesAfter } = await supabase
      .from('news_articles')
      .select('id, article_tags(id)')
      .not('article_tags', 'is', null)
    
    const newCoverage = Math.round((taggedArticlesAfter?.length || 0) / (allArticlesAfter?.length || 1) * 100)
    console.log(`📈 新しいタグカバレッジ: ${newCoverage}%`)
    
    if (newCoverage >= 80) {
      console.log('🎯 目標の80%カバレッジを達成しました！')
    } else {
      console.log(`⚠️ まだ${80 - newCoverage}%の改善が必要です`)
    }
    
  } catch (error) {
    console.error('❌ 遡及タグ付けエラー:', error)
  }
}

// 実行
retroactiveTagArticles()