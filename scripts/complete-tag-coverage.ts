import { supabase } from '@/lib/supabase'
import { analyzeArticleWithGemini, saveArticleAnalysis } from '@/lib/ai/article-analyzer'

interface RetryConfig {
  maxRetries: number
  retryDelay: number // ミリ秒
  targetCoverage: number // パーセント（100 = 100%）
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 5, // 最大5回まで再試行
  retryDelay: 2000, // 2秒待機（API制限対策）
  targetCoverage: 100 // 100%を目指す
}

async function completeTagCoverage(config: RetryConfig = DEFAULT_CONFIG) {
  console.log('🎯 100%タグカバレッジ達成システム開始...')
  console.log(`⚙️ 設定: 最大${config.maxRetries}回リトライ, 目標${config.targetCoverage}%`)
  console.log('='.repeat(60))
  
  let attemptCount = 0
  let currentCoverage = 0
  
  while (attemptCount < config.maxRetries && currentCoverage < config.targetCoverage) {
    attemptCount++
    console.log(`\n🔄 第${attemptCount}回目の処理を開始...`)
    
    try {
      // 1. 現在のカバレッジを確認
      const coverageInfo = await getCurrentCoverage()
      currentCoverage = coverageInfo.coverage
      
      console.log(`📊 現在のカバレッジ: ${currentCoverage}% (${coverageInfo.tagged}/${coverageInfo.total}件)`)
      
      if (currentCoverage >= config.targetCoverage) {
        console.log(`🎉 目標達成！${currentCoverage}%のカバレッジを達成しました！`)
        break
      }
      
      if (coverageInfo.untagged.length === 0) {
        console.log(`✅ タグなし記事がありません（${currentCoverage}%達成）`)
        break
      }
      
      console.log(`🎯 残り${coverageInfo.untagged.length}件の記事にタグ付けを実行...`)
      
      // 2. タグなし記事を処理
      const results = await processUntaggedArticles(coverageInfo.untagged, config.retryDelay)
      
      console.log(`\n📊 第${attemptCount}回目の結果:`)
      console.log(`   ✅ 成功: ${results.success}件`)
      console.log(`   ❌ 失敗: ${results.failed}件`)
      console.log(`   📈 成功率: ${Math.round(results.success / (results.success + results.failed) * 100)}%`)
      
      // 3. 少し待機してから次のサイクル
      if (attemptCount < config.maxRetries && results.failed > 0) {
        console.log(`⏳ ${config.retryDelay / 1000}秒待機後、次のサイクルを開始...`)
        await new Promise(resolve => setTimeout(resolve, config.retryDelay))
      }
      
    } catch (error) {
      console.error(`❌ 第${attemptCount}回目でエラー:`, error)
      await new Promise(resolve => setTimeout(resolve, config.retryDelay))
    }
  }
  
  // 最終結果
  const finalCoverage = await getCurrentCoverage()
  
  console.log('\n' + '='.repeat(60))
  console.log('🏁 100%カバレッジ達成システム完了!')
  console.log('='.repeat(60))
  console.log(`📊 最終結果:`)
  console.log(`   📈 達成カバレッジ: ${finalCoverage.coverage}%`)
  console.log(`   📰 総記事数: ${finalCoverage.total}件`)
  console.log(`   ✅ タグ付き: ${finalCoverage.tagged}件`)
  console.log(`   ❌ タグなし: ${finalCoverage.untagged.length}件`)
  console.log(`   🔄 実行回数: ${attemptCount}回`)
  
  if (finalCoverage.coverage >= config.targetCoverage) {
    console.log(`🎯 目標達成！${config.targetCoverage}%のカバレッジを達成しました！`)
    
    // 成功通知
    try {
      const { execSync } = require('child_process')
      execSync(`powershell.exe -Command "Import-Module BurntToast; New-BurntToastNotification -Text '🎯 100%カバレッジ達成！', '全${finalCoverage.total}件の記事にタグ付け完了' -Sound 'Default'"`)
    } catch (notificationError) {
      console.log('⚠️ 通知送信に失敗しましたが、処理は正常に完了しました')
    }
  } else {
    console.log(`⚠️ 目標未達成。${config.maxRetries}回の試行後、${finalCoverage.coverage}%で終了`)
    console.log(`💡 残り${finalCoverage.untagged.length}件の記事は手動確認が必要かもしれません`)
    
    // 失敗した記事の詳細
    if (finalCoverage.untagged.length > 0) {
      console.log(`\n❌ タグ付けに失敗した記事:`)
      finalCoverage.untagged.slice(0, 5).forEach((article, index) => {
        console.log(`   ${index + 1}. [${article.category}] ${article.title.substring(0, 50)}...`)
        console.log(`      ソース: ${article.source_name}`)
      })
      if (finalCoverage.untagged.length > 5) {
        console.log(`   ... 他${finalCoverage.untagged.length - 5}件`)
      }
    }
  }
  
  return {
    finalCoverage: finalCoverage.coverage,
    totalArticles: finalCoverage.total,
    taggedArticles: finalCoverage.tagged,
    untaggedArticles: finalCoverage.untagged.length,
    attempts: attemptCount,
    success: finalCoverage.coverage >= config.targetCoverage
  }
}

async function getCurrentCoverage() {
  // 全記事数の取得
  const { data: allArticles, error: allError } = await supabase
    .from('news_articles')
    .select('id, title, category, source_name, summary, source_url')
    .order('created_at', { ascending: false })
  
  if (allError) {
    throw new Error(`全記事取得エラー: ${allError.message}`)
  }
  
  // タグ付き記事数の取得
  const { data: taggedArticles, error: taggedError } = await supabase
    .from('news_articles')
    .select('id, article_tags(id)')
    .not('article_tags', 'is', null)
  
  if (taggedError) {
    throw new Error(`タグ付き記事取得エラー: ${taggedError.message}`)
  }
  
  // タグなし記事の特定
  const taggedArticleIds = new Set(taggedArticles?.map(a => a.id) || [])
  const untaggedArticles = allArticles?.filter(article => 
    !taggedArticleIds.has(article.id)
  ) || []
  
  const total = allArticles?.length || 0
  const tagged = taggedArticles?.length || 0
  const coverage = total > 0 ? Math.round(tagged / total * 100) : 0
  
  return {
    total,
    tagged,
    coverage,
    untagged: untaggedArticles
  }
}

async function processUntaggedArticles(untaggedArticles: any[], retryDelay: number) {
  let successCount = 0
  let failedCount = 0
  
  for (let i = 0; i < untaggedArticles.length; i++) {
    const article = untaggedArticles[i]
    const progress = `[${i + 1}/${untaggedArticles.length}]`
    
    try {
      console.log(`\n${progress} 分析中: ${article.title.substring(0, 40)}...`)
      console.log(`   📂 カテゴリ: ${article.category} | 🌐 ソース: ${article.source_name}`)
      
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
        failedCount++
        continue
      }
      
      // 分析結果を保存（タグ付け）
      await saveArticleAnalysis(article.id, analysisResult)
      
      console.log(`   ✅ 成功: 重要度${analysisResult.importance_score}, ${analysisResult.tags.length}個のタグ`)
      console.log(`   🏷️  タグ: ${analysisResult.tags.map(t => t.tag_name).slice(0, 3).join(', ')}${analysisResult.tags.length > 3 ? '...' : ''}`)
      
      successCount++
      
      // API制限対策
      if (i < untaggedArticles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
    } catch (error) {
      console.error(`${progress} 分析エラー:`, error)
      failedCount++
      
      // エラー時も少し待機
      await new Promise(resolve => setTimeout(resolve, retryDelay / 2))
    }
  }
  
  return { success: successCount, failed: failedCount }
}

// カスタム設定での実行例
export async function runCompleteTagCoverageCustom(
  maxRetries: number = 5, 
  retryDelay: number = 2000, 
  targetCoverage: number = 100
) {
  return await completeTagCoverage({
    maxRetries,
    retryDelay,
    targetCoverage
  })
}

// 実行
if (require.main === module) {
  console.log('🚀 100%カバレッジ達成システムを開始します...')
  console.log(`⏰ 実行時刻: ${new Date().toLocaleString('ja-JP')}`)
  
  completeTagCoverage()
    .then(result => {
      console.log('\n🎊 システム実行完了!')
      console.log(`最終カバレッジ: ${result.finalCoverage}%`)
      if (result.success) {
        console.log('🏆 目標達成おめでとうございます！')
      }
    })
    .catch(error => {
      console.error('💥 システム実行エラー:', error)
    })
}