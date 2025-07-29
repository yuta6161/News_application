// GitHub Actions専用RSS収集スクリプト
// CI環境最適化版（通知機能なし、エラーハンドリング強化）

import Parser from 'rss-parser'
import { rssSources } from '../lib/rss-sources'
import { calculateImportanceScore } from '../lib/importance-calculator'
// AI分析を直接実装（GitHub Actions専用）
async function analyzeArticleWithGemini(title: string, summary: string, url: string, source: string): Promise<any> {
  try {
    const { getGeminiFlash } = await import('../lib/ai/gemini')
    const model = getGeminiFlash()
    
    const prompt = `この記事を分析してください：
タイトル: ${title}
要約: ${summary}
ソース: ${source}

以下のJSON形式で回答してください。categoryは必ず以下の8つから選んでください：
- company: 企業、会社、クラブ、チーム、組織
- person: 人物、選手、CEO、政治家、著名人
- technology: 技術、AI、ソフトウェア、ハードウェア、IT関連
- platform: サービス、プラットフォーム、リーグ、大会、SNS
- genre: 分野、スポーツ、エンタメ、音楽、映画、地域、災害、健康
- announcement_type: 発表、リリース、更新、移籍、ニュース
- importance: 重要度、緊急、警告、注意
- event: イベント、会議、開催、発売、リリース

{
  "title_ja": "日本語のタイトル（英語の場合のみ）",
  "summary": "150文字以内の要約",
  "importance_score": 8.5,
  "sentiment": "positive",
  "tags": [
    {"tag_name": "AI", "confidence_score": 0.9, "category": "technology"},
    {"tag_name": "OpenAI", "confidence_score": 0.8, "category": "company"}
  ],
  "key_points": ["重要なポイント1", "重要なポイント2"]
}`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // JSONパース
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // フォールバック
    return {
      title_ja: undefined,
      summary: summary.substring(0, 150),
      importance_score: 5.0,
      sentiment: 'neutral',
      tags: [],
      key_points: []
    }
  } catch (error) {
    console.error('Gemini分析エラー:', error)
    return {
      title_ja: undefined,
      summary: summary.substring(0, 150),
      importance_score: 5.0,
      sentiment: 'neutral',
      tags: [],
      key_points: []
    }
  }
}

// Geminiのカテゴリをデータベース制約に合うようにマッピング
function mapToValidCategory(geminiCategory: string): string {
  // カテゴリを小文字に統一して判定
  const category = (geminiCategory || '').toLowerCase()
  
  // 8つの有効なカテゴリをそのまま受け入れる
  const validCategories = ['company', 'person', 'technology', 'platform', 
                          'genre', 'announcement_type', 'importance', 'event']
  
  if (validCategories.includes(category)) {
    return category  // そのまま返す
  }
  
  // 以下は有効でないカテゴリのマッピング
  // 技術関連
  if (category.includes('technology') || category.includes('tech') || 
      category.includes('ai') || category.includes('software') ||
      category.includes('hardware') || category.includes('programming') ||
      category.includes('データ') || category.includes('システム') ||
      category.includes('アプリ') || category.includes('クラウド')) {
    return 'technology'
  }
  
  // 会社・企業・クラブ関連
  if (category.includes('company') || category.includes('business') ||
      category.includes('enterprise') || category.includes('corporation') ||
      category.includes('startup') || category.includes('企業') ||
      category.includes('会社') || category.includes('ビジネス') ||
      category.includes('football_club') || category.includes('soccer_club') ||
      category.includes('club') || category.includes('team') ||
      category.includes('チーム') || category.includes('クラブ')) {
    return 'company'
  }
  
  // 人物関連
  if (category.includes('person') || category.includes('people') ||
      category.includes('celebrity') || category.includes('politician') ||
      category.includes('人物') || category.includes('政治家') ||
      category.includes('著名人') || category.includes('ceo') ||
      category.includes('founder') || category.includes('player') ||
      category.includes('athlete') || category.includes('選手') ||
      category.includes('football_player') || category.includes('soccer_player')) {
    return 'person'
  }
  
  // プラットフォーム・リーグ関連
  if (category.includes('platform') || category.includes('service') ||
      category.includes('sns') || category.includes('social') ||
      category.includes('web') || category.includes('サービス') ||
      category.includes('プラットフォーム') || category.includes('league') ||
      category.includes('football_league') || category.includes('soccer_league') ||
      category.includes('リーグ') || category.includes('大会')) {
    return 'platform'
  }
  
  // イベント関連
  if (category.includes('event') || category.includes('conference') ||
      category.includes('summit') || category.includes('launch') ||
      category.includes('release') || category.includes('イベント') ||
      category.includes('発売') || category.includes('リリース') ||
      category.includes('開催')) {
    return 'event'
  }
  
  // 発表・アナウンス関連
  if (category.includes('announcement') || category.includes('news') ||
      category.includes('update') || category.includes('発表') ||
      category.includes('アナウンス') || category.includes('報告') ||
      category.includes('更新')) {
    return 'announcement_type'
  }
  
  // 重要度関連
  if (category.includes('importance') || category.includes('priority') ||
      category.includes('urgent') || category.includes('重要') ||
      category.includes('緊急')) {
    return 'importance'
  }
  
  // スポーツやエンタメなどはジャンルとして扱う
  if (category.includes('sport') || category.includes('entertainment') ||
      category.includes('game') || category.includes('music') ||
      category.includes('movie') || category.includes('スポーツ') ||
      category.includes('エンタメ') || category.includes('ゲーム') ||
      category.includes('音楽') || category.includes('映画') ||
      category.includes('サッカー') || category.includes('野球') ||
      category.includes('natural_phenomenon') || category.includes('disaster') ||
      category.includes('weather_phenomenon') || category.includes('geography') ||
      category.includes('地域') || category.includes('災害') ||
      category.includes('天気') || category.includes('気象') ||
      category.includes('現象') || category.includes('position') ||
      category.includes('football_position') || category.includes('soccer_position') ||
      category.includes('ポジション') || category.includes('役職')) {
    return 'genre'
  }
  
  // 警告・注意関連は重要度として扱う
  if (category.includes('warning') || category.includes('alert') ||
      category.includes('danger') || category.includes('警告') ||
      category.includes('注意') || category.includes('危険')) {
    return 'importance'
  }
  
  // 健康・医療関連はジャンルとして扱う
  if (category.includes('health') || category.includes('medical') ||
      category.includes('disease') || category.includes('健康') ||
      category.includes('医療') || category.includes('病気') ||
      category.includes('健康問題')) {
    return 'genre'
  }
  
  // 国・地域・歴史関連はジャンルとして扱う
  if (category.includes('country') || category.includes('history') ||
      category.includes('nation') || category.includes('地域') ||
      category.includes('国') || category.includes('歴史') ||
      category.includes('国家')) {
    return 'genre'
  }
  
  // デフォルトは技術カテゴリ
  console.log(`   ⚠️ 未知のカテゴリ "${geminiCategory}" を技術カテゴリにマッピング`)
  return 'technology'
}

async function saveArticleAnalysis(supabase: any, articleId: number, analysis: any): Promise<void> {
  try {
    // ai_summary更新
    await supabase
      .from('news_articles')
      .update({ ai_summary: analysis.summary })
      .eq('id', articleId)
    
    // タグ保存機能を実装
    if (analysis.tags && analysis.tags.length > 0) {
      console.log(`   🏷️ ${analysis.tags.length}個のタグを保存中...`)
      
      for (const tag of analysis.tags) {
        try {
          // カテゴリを事前にマッピング（1回のみ）
          const validCategory = mapToValidCategory(tag.category)
          const validReliability = Math.max(1.0, Math.min(10.0, (tag.confidence_score || 0.8) * 10))
          
          // タグマスターに存在するか確認・作成
          let { data: existingTag, error: checkError } = await supabase
            .from('tag_master')
            .select('id')
            .eq('tag_name', tag.tag_name)
            .single()
          
          let tagId
          if (!existingTag) {
            console.log(`   🆕 新規タグ作成: "${tag.tag_name}" (${validCategory})`)
            // 新しいタグを作成
            const { data: newTag, error: tagError } = await supabase
              .from('tag_master')
              .insert({
                tag_name: tag.tag_name,
                category: validCategory,
                parent_category: 'auto_generated',
                description: `自動生成されたタグ: ${tag.tag_name}`,
                base_reliability: validReliability
              })
              .select('id')
              .single()
            
            if (tagError) {
              console.error(`   ⚠️ タグ作成エラー (${tag.tag_name}):`, tagError.message)
              continue
            }
            tagId = newTag.id
          } else {
            console.log(`   ♻️  既存タグ使用: "${tag.tag_name}" (ID: ${existingTag.id})`)
            tagId = existingTag.id
          }
          
          // 記事とタグの関連付け
          await supabase
            .from('article_tags')
            .insert({
              article_id: articleId,
              tag_id: tagId,
              tag_name: tag.tag_name,      // フロントエンド表示用
              category: validCategory,     // フロントエンド表示用  
              confidence_score: tag.confidence_score || 0.8,
              is_auto_generated: true
            })
          
        } catch (tagSaveError) {
          console.error(`   ⚠️ タグ保存エラー (${tag.tag_name}):`, tagSaveError instanceof Error ? tagSaveError.message : tagSaveError)
        }
      }
      console.log(`   ✅ タグ保存完了`)
    }
    
    console.log(`   📝 AI分析結果保存完了 (ID: ${articleId})`)
  } catch (error) {
    console.error('AI分析結果保存エラー:', error)
  }
}
// checkDuplicateUrls を直接実装（GitHub Actions専用）
async function checkDuplicateUrls(supabase: any, urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set()
  
  try {
    const { data: existingArticles } = await supabase
      .from('news_articles')
      .select('source_url')
      .in('source_url', urls)
    
    return new Set(existingArticles?.map((a: any) => a.source_url) || [])
  } catch (error) {
    console.error('重複チェックエラー:', error)
    return new Set() // エラー時は空のSetを返す
  }
}

// GitHub Actions専用のRSS収集関数
async function runGitHubActionsRSSCollection(supabase: any) {
  console.log('🌐 RSS収集を開始します...')
  const allArticles: any[] = []
  const MAX_ARTICLES_TOTAL = 200 // タイムアウト対策で最大200記事に制限
  
  const parser = new Parser({
    customFields: {
      item: ['media:content', 'content:encoded', 'dc:creator']
    }
  })
  
  for (const source of rssSources) {
    // 既に制限数に達している場合はスキップ
    if (allArticles.length >= MAX_ARTICLES_TOTAL) {
      console.log(`   ⚠️ 記事数上限(${MAX_ARTICLES_TOTAL}件)に達したため、残りのRSSはスキップします`)
      break
    }
    
    try {
      console.log(`📡 ${source.name} から取得中... (${source.url})`)
      const feed = await parser.parseURL(source.url)
      
      if (!feed || !feed.items) {
        console.log(`   ⚠️ ${source.name}: フィードまたは記事が見つかりません`)
        continue
      }
      
      // 各RSSから取得する記事数を動的に調整
      const remainingSlots = MAX_ARTICLES_TOTAL - allArticles.length
      const articlesPerFeed = Math.min(10, remainingSlots)
      
      const articles = feed.items.slice(0, articlesPerFeed).map(item => {
        const summary = item.contentSnippet || 
                       (item as any).description || 
                       (item as any).content || 
                       'No summary available'
        
        const cleanSummary = summary
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 300)
        
        const articleTitle = item.title || 'No title'
        const finalSummary = cleanSummary + (cleanSummary.length >= 300 ? '...' : '')
        
        const importanceScore = calculateImportanceScore(
          articleTitle,
          cleanSummary,
          source
        )
        
        return {
          title: articleTitle,
          summary: finalSummary,
          source_url: item.link || '',
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source.name,
          category: source.category,
          original_language: source.language,
          importance_score: importanceScore,
          ai_summary: undefined
        }
      })
      
      allArticles.push(...articles)
      console.log(`   ✅ ${articles.length} 件の記事を取得 (累計: ${allArticles.length}/${MAX_ARTICLES_TOTAL})`)
      
    } catch (error) {
      console.error(`   ❌ ${source.name} の取得中にエラー:`, error)
    }
  }
  
  console.log(`📊 合計 ${allArticles.length} 件の記事を収集しました (上限: ${MAX_ARTICLES_TOTAL}件)`)
  
  // 記事を保存してAI分析
  return await saveArticlesWithAI(supabase, allArticles)
}

// GitHub Actions専用の記事保存+AI分析関数
async function saveArticlesWithAI(supabase: any, articles: any[]) {
  console.log('💾 記事の保存とAI分析を開始...')
  
  const stats = {
    totalCollected: articles.length,
    newArticles: 0,
    duplicates: 0,
    aiAnalyzed: 0,
    errors: 0
  }
  
  if (articles.length === 0) {
    return { success: true, stats }
  }
  
  // 重複チェック
  const articleUrls = articles.map(a => a.source_url).filter(url => url && url.trim() !== '')
  const existingLinks = await checkDuplicateUrls(supabase, articleUrls)
  console.log(`📊 既存記事数: ${existingLinks.size} 件`)
  
  const newArticles = articles.filter(article => {
    if (!article.source_url || article.source_url.trim() === '') {
      stats.errors++
      return false
    }
    
    if (existingLinks.has(article.source_url)) {
      stats.duplicates++
      return false
    }
    return true
  })
  
  if (newArticles.length === 0) {
    console.log('🔄 新しい記事はありません（全て重複）')
    return { success: true, stats }
  }
  
  console.log(`📝 ${newArticles.length} 件の新記事を処理中...`)
  stats.newArticles = newArticles.length
  
  // 各記事を個別に処理
  for (let i = 0; i < newArticles.length; i++) {
    const article = newArticles[i]
    const progress = `[${i + 1}/${newArticles.length}]`
    
    try {
      console.log(`${progress} 処理中: ${article.title.substring(0, 50)}...`)
      
      // 記事をデータベースに保存
      const { data: savedArticle, error: saveError } = await supabase
        .from('news_articles')
        .insert(article)
        .select('id')
        .single()
      
      if (saveError) {
        if (saveError.message.includes('duplicate key value violates unique constraint')) {
          stats.duplicates++
        } else {
          console.error(`   ❌ 保存失敗: ${saveError.message}`)
          stats.errors++
        }
        continue
      }
      
      const articleId = savedArticle.id
      console.log(`   ✅ 記事保存完了 (ID: ${articleId})`)
      
      // Geminiによる記事分析
      try {
        console.log(`   🤖 Gemini分析中...`)
        
        const analysisResult = await analyzeArticleWithGemini(
          article.title,
          article.summary,
          article.source_url,
          article.source_name
        )
        
        await saveArticleAnalysis(supabase, articleId, analysisResult)
        
        if (analysisResult.title_ja && article.original_language !== 'ja') {
          await supabase
            .from('news_articles')
            .update({ title: analysisResult.title_ja })
            .eq('id', articleId)
          
          console.log(`   ✅ タイトルを日本語に更新: ${analysisResult.title_ja.substring(0, 40)}...`)
        }
        
        stats.aiAnalyzed++
        console.log(`   ✅ AI分析完了 (重要度: ${analysisResult.importance_score})`)
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (analysisError) {
        console.error(`   ⚠️ AI分析エラー:`, analysisError)
      }
      
    } catch (error) {
      console.error(`${progress} 記事処理エラー:`, error)
      stats.errors++
    }
  }
  
  return { success: true, stats }
}

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
    
    console.log('📋 環境変数の状態:')
    requiredEnvs.forEach(env => {
      const value = process.env[env]
      if (value) {
        console.log(`   ✅ ${env}: ${value.substring(0, 10)}...`)
      } else {
        console.log(`   ❌ ${env}: 未設定`)
      }
    })
    
    const missingEnvs = requiredEnvs.filter(env => !process.env[env])
    if (missingEnvs.length > 0) {
      console.error(`❌ 必要な環境変数が設定されていません: ${missingEnvs.join(', ')}`)
      console.error('GitHub SecretsでREPOSITORY SECRETSが正しく設定されているか確認してください')
      throw new Error(`環境変数エラー: ${missingEnvs.join(', ')}`)
    }
    console.log('✅ 環境変数OK')
    
    // GitHub Actions用のSupabase初期化
    console.log('\n📡 GitHub Actions用Supabase初期化...')
    
    // 環境変数から動的にSupabaseクライアントを作成
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    
    const dynamicSupabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabaseクライアント初期化完了')
    
    // RSS収集とAI分析を実行
    console.log('\n📡 RSS収集とGemini AI分析を開始...')
    const result = await runGitHubActionsRSSCollection(dynamicSupabase)
    
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
      await printDatabaseStats(dynamicSupabase)
      
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
      console.error('収集処理でエラーが発生しました')
      
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

async function printDatabaseStats(supabase: any) {
  try {
    console.log('\n📊 データベース統計情報:')
    
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
    allArticles?.forEach((article: any) => {
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
    allArticles?.forEach((article: any) => {
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
    const todayArticles = allArticles?.filter((article: any) => 
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