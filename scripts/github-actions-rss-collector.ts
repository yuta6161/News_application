// GitHub Actions専用RSS収集スクリプト
// CI環境最適化版（通知機能なし、エラーハンドリング強化）

import { runRSSCollectionWithAI } from '../lib/rss-collector-gemini'

async function githubActionsRSSCollection() {
  console.log('🚀 GitHub Actions RSS自動収集開始...')
  console.log(`⏰ 実行時刻: ${new Date().toISOString()}`)
  console.log(`🌍 タイムゾーン: UTC`)
  console.log(`📍 実行環境: GitHub Actions`)
  
  const startTime = Date.now()
  
  try {
    // 環境変数の確認
    console.log('\n🔧 環境変数チェック...')
    const requiredEnvs = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 
      'GEMINI_API_KEY'
    ]
    
    const missingEnvs = requiredEnvs.filter(env => !process.env[env])
    if (missingEnvs.length > 0) {
      throw new Error(`❌ 必要な環境変数が設定されていません: ${missingEnvs.join(', ')}`)
    }
    console.log('✅ 環境変数OK')
    
    // RSS収集とAI分析を実行
    console.log('\n📡 RSS収集とGemini AI分析を開始...')
    const result = await runRSSCollectionWithAI()
    
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    if (result.success && result.stats) {
      console.log('\n🎉 GitHub Actions RSS収集完了!')
      console.log('='.repeat(60))
      console.log(`📊 処理結果サマリー:`)
      console.log(`   📰 収集記事数: ${result.stats.totalCollected}件`)
      console.log(`   ✨ 新規記事数: ${result.stats.newArticles}件`)
      console.log(`   🔄 重複記事数: ${result.stats.duplicates}件`)
      console.log(`   🤖 AI分析完了: ${result.stats.aiAnalyzed}件`)
      console.log(`   ❌ エラー数: ${result.stats.errors}件`)
      console.log(`   ⏱️ 処理時間: ${duration}秒`)
      console.log('='.repeat(60))
      
      // GitHub Actionsの環境変数に結果を設定
      if (process.env.GITHUB_ENV) {
        require('fs').appendFileSync(process.env.GITHUB_ENV, `RSS_NEW_ARTICLES=${result.stats.newArticles}\n`)
        require('fs').appendFileSync(process.env.GITHUB_ENV, `RSS_TOTAL_COLLECTED=${result.stats.totalCollected}\n`)
        require('fs').appendFileSync(process.env.GITHUB_ENV, `RSS_AI_ANALYZED=${result.stats.aiAnalyzed}\n`)
      }
      
      // データベース統計を表示
      await printDatabaseStats()
      
      // 成功ログの出力
      console.log(`\n✅ RSS自動収集が正常に完了しました`)
      console.log(`📈 新着記事: ${result.stats.newArticles}件`)
      console.log(`🔍 AI分析: ${result.stats.aiAnalyzed}件`)
      
      // GitHub Actions向けサマリー
      if (process.env.GITHUB_STEP_SUMMARY) {
        const summary = `
## 📡 RSS収集結果 (${new Date().toISOString()})

| 項目 | 件数 |
|------|------|
| 📰 収集記事数 | ${result.stats.totalCollected} |
| ✨ 新規記事数 | ${result.stats.newArticles} |
| 🔄 重複記事数 | ${result.stats.duplicates} |
| 🤖 AI分析完了 | ${result.stats.aiAnalyzed} |
| ❌ エラー数 | ${result.stats.errors} |
| ⏱️ 処理時間 | ${duration}秒 |

${result.stats.newArticles > 0 ? '🎉 新着記事が正常に収集されました！' : '📰 新着記事はありませんでした。'}
        `
        require('fs').writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
      }
      
      // 正常終了
      process.exit(0)
      
    } else {
      console.error('\n❌ RSS収集に失敗しました:')
      console.error(result.error)
      
      // GitHub Actions向けエラー出力
      if (process.env.GITHUB_ENV) {
        require('fs').appendFileSync(process.env.GITHUB_ENV, `RSS_COLLECTION_FAILED=true\n`)
      }
      
      process.exit(1)
    }
    
  } catch (error) {
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    console.error('\n❌ GitHub Actions RSS収集エラー:')
    console.error(error)
    console.error(`⏱️ エラーまでの処理時間: ${duration}秒`)
    
    // GitHub Actions向けエラー出力
    if (process.env.GITHUB_ENV) {
      require('fs').appendFileSync(process.env.GITHUB_ENV, `RSS_COLLECTION_ERROR=true\n`)
    }
    
    if (process.env.GITHUB_STEP_SUMMARY) {
      const errorSummary = `
## ❌ RSS収集エラー (${new Date().toISOString()})

**エラー内容:**
\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`

**処理時間:** ${duration}秒

エラーの詳細については、GitHub ActionsのログからJob Summaryを確認してください。
      `
      require('fs').writeFileSync(process.env.GITHUB_STEP_SUMMARY, errorSummary)
    }
    
    process.exit(1)
  }
}

async function printDatabaseStats() {
  try {
    console.log('\n📊 データベース統計情報:')
    
    const { supabase } = await import('../lib/supabase')
    
    // 全記事数
    const { data: allArticles, error: articlesError } = await supabase
      .from('news_articles')
      .select('id, category, created_at, source_name')
    
    if (articlesError) {
      console.error('   ❌ 記事データ取得エラー:', articlesError.message)
      return
    }
    
    console.log(`   📰 総記事数: ${allArticles?.length || 0}件`)
    
    // カテゴリ別統計
    const categoryStats: { [key: string]: number } = {}
    allArticles?.forEach(article => {
      categoryStats[article.category] = (categoryStats[article.category] || 0) + 1
    })
    
    console.log('   📂 カテゴリ別統計:')
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`      ${category}: ${count}件`)
      })
    
    // ソース別統計（上位5つ）
    const sourceStats: { [key: string]: number } = {}
    allArticles?.forEach(article => {
      sourceStats[article.source_name] = (sourceStats[article.source_name] || 0) + 1
    })
    
    console.log('   🌐 ソース別統計（上位5つ）:')
    Object.entries(sourceStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([source, count]) => {
        console.log(`      ${source}: ${count}件`)
      })
    
    // 今日追加された記事数
    const today = new Date().toISOString().split('T')[0]
    const todayArticles = allArticles?.filter(article => 
      article.created_at.startsWith(today)
    )
    console.log(`   📅 今日追加: ${todayArticles?.length || 0}件`)
    
  } catch (error) {
    console.error('   ❌ 統計取得エラー:', error)
  }
}

// GitHub Actions環境でのみ実行
if (process.env.GITHUB_ACTIONS) {
  console.log('🔄 GitHub Actions環境を検出しました')
  githubActionsRSSCollection()
} else {
  console.log('⚠️ GitHub Actions環境以外では実行できません')
  console.log('ローカル実行には scripts/automated-rss-collector.ts を使用してください')
  process.exit(1)
}