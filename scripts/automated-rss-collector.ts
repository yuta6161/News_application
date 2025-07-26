import { runRSSCollectionWithAI } from '@/lib/rss-collector-gemini'

async function automatedRSSCollection() {
  console.log('🚀 自動RSS収集システム開始...')
  console.log(`⏰ 実行時刻: ${new Date().toLocaleString('ja-JP')}`)
  
  try {
    // RSS収集とAI分析を実行
    const result = await runRSSCollectionWithAI()
    
    if (result.success && result.stats) {
      console.log('\n🎉 自動収集完了!')
      console.log('='.repeat(50))
      console.log(`📊 処理結果サマリー:`)
      console.log(`   📰 収集記事数: ${result.stats.totalCollected}件`)
      console.log(`   ✨ 新規記事数: ${result.stats.newArticles}件`)
      console.log(`   🔄 重複記事数: ${result.stats.duplicates}件`)
      console.log(`   🤖 AI分析完了: ${result.stats.aiAnalyzed}件`)
      console.log(`   ❌ エラー数: ${result.stats.errors}件`)
      console.log('='.repeat(50))
      
      // 通知送信
      if (result.stats.newArticles > 0) {
        try {
          const { execSync } = require('child_process')
          execSync(`powershell.exe -Command "Import-Module BurntToast; New-BurntToastNotification -Text '🚀 RSS自動収集完了', '新着記事${result.stats.newArticles}件を分析しました' -Sound 'Default'"`)
        } catch (notificationError) {
          console.log('⚠️ 通知送信に失敗しましたが、処理は正常に完了しました')
        }
      }
      
      // 統計情報取得
      await printDatabaseStats()
      
    } else {
      console.error('❌ RSS収集に失敗:', result.error)
      
      // エラー通知
      try {
        const { execSync } = require('child_process')
        execSync(`powershell.exe -Command "Import-Module BurntToast; New-BurntToastNotification -Text '❌ RSS収集エラー', '自動収集に失敗しました' -Sound 'Default'"`)
      } catch (notificationError) {
        console.log('⚠️ エラー通知送信に失敗')
      }
    }
    
  } catch (error) {
    console.error('❌ 自動RSS収集エラー:', error)
    
    // エラー通知
    try {
      const { execSync } = require('child_process')
      execSync(`powershell.exe -Command "Import-Module BurntToast; New-BurntToastNotification -Text '⚠️ 自動収集システムエラー', '予期しないエラーが発生しました' -Sound 'Default'"`)
    } catch (notificationError) {
      console.log('⚠️ エラー通知送信に失敗')
    }
  }
}

async function printDatabaseStats() {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    console.log('\n📊 データベース統計:')
    
    // 全記事数
    const { data: allArticles } = await supabase
      .from('news_articles')
      .select('id, category, created_at')
    
    console.log(`   📰 総記事数: ${allArticles?.length || 0}件`)
    
    // カテゴリ別統計
    const categoryStats: { [key: string]: number } = {}
    allArticles?.forEach(article => {
      categoryStats[article.category] = (categoryStats[article.category] || 0) + 1
    })
    
    console.log('   📂 カテゴリ別:')
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`      ${category}: ${count}件`)
      })
    
    // タグ付きカバレッジ
    const { data: taggedArticles } = await supabase
      .from('news_articles')
      .select('id, article_tags(id)')
      .not('article_tags', 'is', null)
    
    const coverage = Math.round((taggedArticles?.length || 0) / (allArticles?.length || 1) * 100)
    console.log(`   🏷️ タグカバレッジ: ${coverage}%`)
    
    // 最新記事
    const latestArticles = allArticles
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      ?.slice(0, 3)
    
    if (latestArticles?.length) {
      console.log('   📅 最新記事（3件）:')
      latestArticles.forEach((article, index) => {
        const date = new Date(article.created_at).toLocaleDateString('ja-JP')
        console.log(`      ${index + 1}. [${article.category}] ${date}`)
      })
    }
    
  } catch (error) {
    console.error('   ❌ 統計取得エラー:', error)
  }
}

// 実行
automatedRSSCollection()