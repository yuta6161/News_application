import { supabase } from '@/lib/supabase'

interface TagAnalysis {
  tag_name: string
  frequency: number
  confidence_avg: number
  articles_covered: number
  recommendation: 'promote' | 'consider' | 'ignore'
  reason: string
}

async function analyzeTagOptimization() {
  console.log('🔍 タグ最適化分析システム開始...')
  console.log(`⏰ 実行時刻: ${new Date().toLocaleString('ja-JP')}`)
  console.log('='.repeat(60))
  
  try {
    // 1. 現在のタグ統計を取得
    const { data: allTags, error: tagsError } = await supabase
      .from('article_tags')
      .select('tag_name, confidence_score, is_auto_generated, article_id')
    
    if (tagsError) {
      throw new Error(`タグ取得エラー: ${tagsError.message}`)
    }
    
    // 2. 記事総数を取得
    const { data: allArticles, error: articlesError } = await supabase
      .from('news_articles')
      .select('id')
    
    if (articlesError) {
      throw new Error(`記事取得エラー: ${articlesError.message}`)
    }
    
    const totalArticles = allArticles?.length || 0
    console.log(`📊 分析対象: ${totalArticles}記事, ${allTags?.length || 0}タグ`)
    
    // 3. 自動生成タグの統計分析
    const autoTags = allTags?.filter(t => t.is_auto_generated) || []
    const predefinedTags = allTags?.filter(t => !t.is_auto_generated) || []
    
    console.log(`\n📋 現在の構成:`)
    console.log(`   🤖 自動生成タグ: ${autoTags.length}個`)
    console.log(`   🏷️  事前定義タグ: ${predefinedTags.length}個`)
    
    // 4. 自動生成タグの頻度・信頼度分析
    const tagStats: { [key: string]: TagAnalysis } = {}
    
    autoTags.forEach(tag => {
      if (!tagStats[tag.tag_name]) {
        tagStats[tag.tag_name] = {
          tag_name: tag.tag_name,
          frequency: 0,
          confidence_avg: 0,
          articles_covered: 0,
          recommendation: 'ignore',
          reason: ''
        }
      }
      
      tagStats[tag.tag_name].frequency++
      tagStats[tag.tag_name].confidence_avg += tag.confidence_score
    })
    
    // 平均信頼度計算とユニーク記事数
    Object.values(tagStats).forEach(stat => {
      stat.confidence_avg = stat.confidence_avg / stat.frequency
      
      // このタグが付いているユニーク記事数
      const uniqueArticles = new Set(
        autoTags
          .filter(t => t.tag_name === stat.tag_name)
          .map(t => t.article_id)
      )
      stat.articles_covered = uniqueArticles.size
      
      // 推奨度判定ロジック
      if (stat.frequency >= 3 && stat.confidence_avg >= 0.8) {
        stat.recommendation = 'promote'
        stat.reason = `高頻度(${stat.frequency}回)・高信頼度(${stat.confidence_avg.toFixed(2)})`
      } else if (stat.frequency >= 2 && stat.confidence_avg >= 0.7) {
        stat.recommendation = 'consider'
        stat.reason = `中頻度(${stat.frequency}回)・中信頼度(${stat.confidence_avg.toFixed(2)})`
      } else {
        stat.recommendation = 'ignore'
        stat.reason = `低頻度(${stat.frequency}回)または低信頼度(${stat.confidence_avg.toFixed(2)})`
      }
    })
    
    // 5. 推奨分析結果
    const promoteResults = Object.values(tagStats)
      .filter(s => s.recommendation === 'promote')
      .sort((a, b) => b.frequency - a.frequency)
    
    const considerResults = Object.values(tagStats)
      .filter(s => s.recommendation === 'consider')
      .sort((a, b) => b.frequency - a.frequency)
    
    console.log(`\n🚀 事前定義タグ化推奨 (${promoteResults.length}個):`)
    promoteResults.forEach((result, index) => {
      const coverage = Math.round(result.articles_covered / totalArticles * 100)
      console.log(`   ${index + 1}. ${result.tag_name}`)
      console.log(`      頻度: ${result.frequency}回, 信頼度: ${result.confidence_avg.toFixed(2)}, カバレッジ: ${coverage}%`)
      console.log(`      理由: ${result.reason}`)
    })
    
    console.log(`\n🤔 検討候補タグ (${considerResults.length}個):`)
    considerResults.slice(0, 10).forEach((result, index) => {
      const coverage = Math.round(result.articles_covered / totalArticles * 100)
      console.log(`   ${index + 1}. ${result.tag_name}`)
      console.log(`      頻度: ${result.frequency}回, 信頼度: ${result.confidence_avg.toFixed(2)}, カバレッジ: ${coverage}%`)
    })
    
    // 6. データ充実度の評価
    console.log(`\n📈 データ充実度評価:`)
    
    const uniqueAutoTags = Object.keys(tagStats).length
    const avgTagsPerArticle = autoTags.length / totalArticles
    
    console.log(`   📊 ユニーク自動生成タグ数: ${uniqueAutoTags}種類`)
    console.log(`   📊 1記事あたり平均タグ数: ${avgTagsPerArticle.toFixed(1)}個`)
    
    // データ分析推奨タイミング
    let analysisRecommendation = ''
    let dataStatus = ''
    
    if (totalArticles < 50) {
      dataStatus = '不十分'
      analysisRecommendation = '100記事以上蓄積後に分析推奨'
    } else if (totalArticles < 100) {
      dataStatus = '最低限'
      analysisRecommendation = '200記事蓄積で精度向上'
    } else if (totalArticles < 200) {
      dataStatus = '良好'
      analysisRecommendation = '分析開始に適した段階'
    } else {
      dataStatus = '十分'
      analysisRecommendation = '詳細分析・最適化実行推奨'
    }
    
    console.log(`   📊 データ状況: ${dataStatus} (${totalArticles}記事)`)
    console.log(`   💡 推奨: ${analysisRecommendation}`)
    
    // 7. 最適化実行提案
    console.log(`\n💡 最適化提案:`)
    
    if (promoteResults.length > 0) {
      console.log(`   🚀 即座に事前定義化推奨: ${promoteResults.length}個`)
      console.log(`      → ${promoteResults.slice(0, 5).map(r => r.tag_name).join(', ')}など`)
    }
    
    if (totalArticles >= 100) {
      console.log(`   📊 カテゴリ別分析実行可能`)
      console.log(`   🔄 定期的な見直し（月1回）を推奨`)
    }
    
    if (totalArticles >= 200) {
      console.log(`   🎯 高精度な事前定義タグシステム構築可能`)
      console.log(`   📈 機械学習による自動最適化検討可能`)
    }
    
    return {
      totalArticles,
      totalTags: allTags?.length || 0,
      uniqueAutoTags,
      promoteCount: promoteResults.length,
      considerCount: considerResults.length,
      promoteResults,
      considerResults,
      dataStatus,
      analysisRecommendation
    }
    
  } catch (error) {
    console.error('❌ 分析エラー:', error)
    throw error
  }
}

// 実行
if (require.main === module) {
  analyzeTagOptimization()
    .then(result => {
      console.log('\n🎉 タグ最適化分析完了!')
      console.log(`📊 推奨事前定義タグ: ${result.promoteCount}個`)
      console.log(`📊 検討候補タグ: ${result.considerCount}個`)
    })
    .catch(error => {
      console.error('💥 分析システムエラー:', error)
    })
}