// ゲーム系RSS専用収集スクリプト
import Parser from 'rss-parser'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { gameRssSources, calculateGameImportanceScore } from '../lib/game-rss-sources'

// 共通設定を使用（../lib/game-rss-sources.tsから）

// Supabase初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase環境変数が設定されていません')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Gemini初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ゲーム記事専用のGemini分析
async function analyzeGameArticleWithGemini(title: string, summary: string, url: string, source: string): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // 言語に応じてプロンプトを調整
    const isEnglish = source.includes('Steam') || source.includes('Indie') || source.includes('IGN')
    
    const prompt = `${isEnglish ? 'Analyze this game article in detail' : 'ゲーム記事を詳細に分析してください'}：
タイトル/Title: ${title}
要約/Summary: ${summary}
ソース/Source: ${source}
URL: ${url}

${isEnglish ? 'Return in JSON format with Japanese translations' : '以下のJSON形式で返してください'}：
{
  "title_ja": "日本語タイトル（既に日本語の場合は同じ）",
  "summary": "詳細な日本語要約（150文字程度）",
  "importance_score": 重要度（1-10の数値）,
  "sentiment": "positive/neutral/negative",
  "tags": [
    {
      "tag_name": "タグ名",
      "category": "company/person/technology/platform/genre/announcement_type/importance/event",
      "confidence_score": 信頼度（0.0-1.0）
    }
  ],
  "game_specific": {
    "platforms": ["PS5", "Switch", "PC", etc],
    "genres": ["RPG", "アクション", "FPS", etc],
    "developers": ["開発会社名"],
    "publishers": ["パブリッシャー名"],
    "release_date": "発売日（わかる場合）",
    "is_indie": true/false,
    "is_esports": true/false
  },
  "key_points": ["重要ポイント1", "重要ポイント2", "重要ポイント3"]
}

特に以下の観点で詳細にタグを生成してください：
- ゲームジャンル（RPG、FPS、アクション、シミュレーション等）
- プラットフォーム（PS5、PS4、Switch、Xbox、PC、Steam等）
- 開発会社・パブリッシャー名
- ゲームタイトル・シリーズ名
- ゲームシステム・機能（オンラインマルチ、VR対応等）
- イベント（E3、TGS、Nintendo Direct等）
- eスポーツ関連`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    try {
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleanJson)
    } catch (e) {
      console.error('JSONパースエラー:', e)
      return {
        title_ja: title,
        summary: summary.substring(0, 150),
        importance_score: 5.0,
        sentiment: 'neutral',
        tags: [],
        game_specific: {
          platforms: [],
          genres: [],
          developers: [],
          publishers: [],
          is_indie: false,
          is_esports: false
        },
        key_points: []
      }
    }
  } catch (error) {
    console.error('Gemini分析エラー:', error)
    return {
      title_ja: title,
      summary: summary.substring(0, 150),
      importance_score: 5.0,
      sentiment: 'neutral',
      tags: [],
      game_specific: {
        platforms: [],
        genres: [],
        developers: [],
        publishers: [],
        is_indie: false,
        is_esports: false
      },
      key_points: []
    }
  }
}

// 重複チェック関数
async function checkDuplicateUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set()
  
  try {
    const { data: existingArticles } = await supabase
      .from('news_articles')
      .select('source_url')
      .in('source_url', urls)
    
    return new Set(existingArticles?.map((a: any) => a.source_url) || [])
  } catch (error) {
    console.error('重複チェックエラー:', error)
    return new Set()
  }
}

// 重要度計算は共通関数を使用（../lib/game-rss-sources.tsから）

// ゲーム系RSS収集メイン関数
async function collectGameRSS() {
  console.log('🎮 ゲーム系RSS収集を開始します...')
  const allArticles: any[] = []
  const MAX_ARTICLES_TOTAL = 200 // タイムアウト対策
  
  const parser = new Parser({
    customFields: {
      item: ['media:content', 'content:encoded', 'dc:creator', 'enclosure']
    }
  })
  
  for (const source of gameRssSources) {
    if (allArticles.length >= MAX_ARTICLES_TOTAL) {
      console.log(`   ⚠️ 記事数上限(${MAX_ARTICLES_TOTAL}件)に達したため、残りのRSSはスキップします`)
      break
    }
    
    try {
      console.log(`🎮 ${source.name} から取得中... (${source.url})`)
      const feed = await parser.parseURL(source.url)
      
      if (!feed || !feed.items) {
        console.log(`   ⚠️ ${source.name}: フィードまたは記事が見つかりません`)
        continue
      }
      
      const remainingSlots = MAX_ARTICLES_TOTAL - allArticles.length
      // RSS数が増えたので各サイトの取得数を調整（10サイト×15記事=150記事想定）
      const articlesPerFeed = Math.min(15, remainingSlots)
      
      const articles = feed.items.slice(0, articlesPerFeed).map(item => {
        const summary = item.contentSnippet || 
                       (item as any).description || 
                       (item as any).content || 
                       'No summary available'
        
        const cleanSummary = summary
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 500) // ゲーム記事は詳細が重要なので500文字まで
        
        const articleTitle = item.title || 'No title'
        const finalSummary = cleanSummary + (cleanSummary.length >= 500 ? '...' : '')
        
        const importanceScore = calculateGameImportanceScore(
          articleTitle,
          cleanSummary,
          source
        )
        
        // 画像URLの取得（ゲーム記事は画像が重要）
        let imageUrl = null
        if ((item as any).enclosure?.url) {
          imageUrl = (item as any).enclosure.url
        } else if ((item as any)['media:content']?.$.url) {
          imageUrl = (item as any)['media:content'].$.url
        }
        
        return {
          title: articleTitle,
          summary: finalSummary,
          source_url: item.link || '',
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source.name,
          category: 'Game', // データベース制約に合わせてGameに統一
          original_language: source.language,
          importance_score: importanceScore,
          image_url: imageUrl,
          ai_summary: undefined
        }
      })
      
      allArticles.push(...articles)
      console.log(`   ✅ ${articles.length} 件のゲーム記事を取得 (累計: ${allArticles.length}/${MAX_ARTICLES_TOTAL})`)
      
    } catch (error) {
      console.error(`   ❌ ${source.name} の取得中にエラー:`, error)
    }
  }
  
  console.log(`🎮 合計 ${allArticles.length} 件のゲーム記事を収集しました`)
  
  // 記事を保存してAI分析
  return await saveGameArticlesWithAI(allArticles)
}

// ゲーム記事保存とAI分析
async function saveGameArticlesWithAI(articles: any[]) {
  console.log('💾 ゲーム記事の保存とAI分析を開始...')
  
  const stats = {
    totalCollected: articles.length,
    newArticles: 0,
    duplicates: 0,
    aiAnalyzed: 0,
    errors: 0,
    gameSpecificTags: 0
  }
  
  if (articles.length === 0) {
    return { success: true, stats }
  }
  
  // 重複チェック
  const articleUrls = articles.map(a => a.source_url).filter(url => url && url.trim() !== '')
  const existingLinks = await checkDuplicateUrls(articleUrls)
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
    console.log('🔄 新しいゲーム記事はありません（全て重複）')
    return { success: true, stats }
  }
  
  console.log(`🎮 ${newArticles.length} 件の新規ゲーム記事を処理中...`)
  stats.newArticles = newArticles.length
  
  // 各記事を個別に処理
  for (let i = 0; i < newArticles.length; i++) {
    const article = newArticles[i]
    const progress = `[${i + 1}/${newArticles.length}]`
    
    try {
      console.log(`${progress} 処理中: "${article.title.substring(0, 50)}...`)
      
      // 記事を保存
      const { data: savedArticle, error: saveError } = await supabase
        .from('news_articles')
        .insert(article)
        .select()
        .single()
      
      if (saveError) {
        if (saveError.message.includes('duplicate')) {
          stats.duplicates++
        } else {
          console.error(`   ❌ 保存失敗: ${saveError.message}`)
          stats.errors++
        }
        continue
      }
      
      const articleId = savedArticle.id
      console.log(`   ✅ 記事保存完了 (ID: ${articleId})`)
      
      // Geminiによるゲーム記事分析
      try {
        console.log(`   🎮 Geminiゲーム記事分析中...`)
        
        const analysisResult = await analyzeGameArticleWithGemini(
          article.title,
          article.summary,
          article.source_url,
          article.source_name
        )
        
        // AI分析結果を保存
        const { error: analysisError } = await supabase
          .from('news_articles')
          .update({
            ai_summary: analysisResult.summary,
            importance_score: analysisResult.importance_score,
            analyzed_at: new Date().toISOString(),
            analysis_version: 'game-v1.0'
          })
          .eq('id', articleId)
        
        if (analysisError) {
          console.error(`   ❌ AI分析保存エラー:`, analysisError)
        } else {
          console.log(`   ✅ AI分析結果保存完了 (ID: ${articleId})`)
        }
        
        // タグを保存（ゲーム特化タグ含む）
        if (analysisResult.tags && analysisResult.tags.length > 0) {
          for (const tag of analysisResult.tags) {
            try {
              await supabase
                .from('article_tags')
                .insert({
                  article_id: articleId,
                  tag_name: tag.tag_name,
                  category: tag.category || 'technology',
                  confidence_score: tag.confidence_score || 0.8,
                  is_auto_generated: true
                })
              console.log(`   ✅ タグ保存: "${tag.tag_name}"`)
              stats.gameSpecificTags++
            } catch (tagError) {
              console.error(`   ⚠️ タグ保存エラー:`, tagError)
            }
          }
        }
        
        // ゲーム固有情報からタグを生成
        if (analysisResult.game_specific) {
          const gameData = analysisResult.game_specific
          
          // プラットフォームタグ
          for (const platform of gameData.platforms || []) {
            await supabase
              .from('article_tags')
              .insert({
                article_id: articleId,
                tag_name: platform,
                category: 'platform',
                confidence_score: 0.95,
                is_auto_generated: true
              })
            stats.gameSpecificTags++
          }
          
          // ジャンルタグ
          for (const genre of gameData.genres || []) {
            await supabase
              .from('article_tags')
              .insert({
                article_id: articleId,
                tag_name: genre,
                category: 'genre',
                confidence_score: 0.9,
                is_auto_generated: true
              })
            stats.gameSpecificTags++
          }
        }
        
        // 日本語タイトルに更新
        if (analysisResult.title_ja && article.original_language !== 'ja') {
          await supabase
            .from('news_articles')
            .update({ title: analysisResult.title_ja })
            .eq('id', articleId)
          
          console.log(`   ✅ タイトルを日本語に更新: ${analysisResult.title_ja.substring(0, 40)}...`)
        }
        
        stats.aiAnalyzed++
        console.log(`   ✅ ゲーム記事AI分析完了 (重要度: ${analysisResult.importance_score})`)
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 1000)) // ゲーム記事は詳細分析のため少し長めに
        
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

// GitHub Actions用エントリーポイント
async function main() {
  console.log('🎮 ゲーム系RSS自動収集開始...')
  console.log(`⏰ 実行時刻: ${new Date().toISOString()}`)
  console.log(`🌍 タイムゾーン: UTC`)
  console.log(`📍 実行環境: GitHub Actions (Game RSS)`)
  
  const startTime = Date.now()
  
  try {
    const result = await collectGameRSS()
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    console.log('=' .repeat(60))
    console.log('🎮 ゲーム系RSS収集完了')
    console.log('=' .repeat(60))
    console.log(`   📊 収集記事数: ${result.stats.totalCollected}件`)
    console.log(`   🆕 新規記事数: ${result.stats.newArticles}件`)
    console.log(`   🔄 重複記事数: ${result.stats.duplicates}件`)
    console.log(`   🤖 AI分析完了: ${result.stats.aiAnalyzed}件`)
    console.log(`   🎮 ゲーム特化タグ: ${result.stats.gameSpecificTags}個`)
    console.log(`   ❌ エラー数: ${result.stats.errors}件`)
    console.log(`   ⏱️ 処理時間: ${duration}秒`)
    console.log('=' .repeat(60))
    
    // GitHub Actionsのサマリー生成
    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = `# 🎮 ゲーム系RSS収集結果

| 項目 | 数値 |
|------|------|
| 📊 収集記事数 | ${result.stats.totalCollected} |
| 🆕 新規記事数 | ${result.stats.newArticles} |
| 🔄 重複記事数 | ${result.stats.duplicates} |
| 🤖 AI分析完了 | ${result.stats.aiAnalyzed} |
| 🎮 ゲーム特化タグ | ${result.stats.gameSpecificTags} |
| ❌ エラー数 | ${result.stats.errors} |
| ⏱️ 処理時間 | ${duration}秒 |

${result.stats.newArticles > 0 ? '🎉 新着ゲーム記事が正常に収集されました！' : '📰 新着ゲーム記事はありませんでした。'}
`
      require('fs').writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ 致命的エラー:', error)
    process.exit(1)
  }
}

// 実行
if (require.main === module) {
  main()
}