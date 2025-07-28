import { getGeminiFlash } from '../ai/gemini'
import { supabase } from '../supabase'

export interface SearchIntent {
  required_tags: string[]      // 必須タグ
  preferred_tags: string[]     // 推奨タグ
  excluded_tags: string[]      // 除外タグ
  date_range?: {
    from: string
    to: string
  }
  trust_level?: number         // 必要な信頼度レベル（1-10）
  importance_threshold?: number // 重要度の閾値
  limit?: number               // 取得件数
  special_conditions?: string[] // その他の特殊条件
}

export interface SearchResult {
  articles: Article[]
  search_intent: SearchIntent
  total_count: number
  execution_time: number
  relevance_scores: { [articleId: string]: number }
  search_type?: string  // 検索タイプ（必須タグマッチ、推奨タグマッチ、重要度ベース）
  quality_stats?: {     // 品質統計
    high_quality_tags_used: number
    medium_quality_tags_used: number
    fallback_search: boolean
  }
}

export interface Article {
  id: string
  title: string
  ai_summary: string | null
  source_name: string
  importance_score: number
  published_at: string
  category: string
  tags?: string[]
}

/**
 * 品質ベースタグ取得：高品質・中品質タグを分類取得
 */
async function getQualityBasedTags(): Promise<{ highQualityTags: string[], mediumQualityTags: string[] }> {
  try {
    console.log('📊 品質ベースタグ取得開始...')
    
    // 高品質タグ取得（必須タグ候補）- 基準緩和
    const { data: highQualityData } = await supabase
      .from('article_tags')
      .select('tag_name, confidence_score')
      .gte('confidence_score', 0.7) // 信頼度70%以上（緩和：80%→70%）
    
    // 中品質タグ取得（推奨タグ候補）- 基準緩和  
    const { data: mediumQualityData } = await supabase
      .from('article_tags')
      .select('tag_name, confidence_score')
      .gte('confidence_score', 0.5) // 信頼度50%以上（緩和：60%→50%）
      .lt('confidence_score', 0.7)  // 70%未満（調整：80%→70%）
    
    // タグごとに使用回数を集計
    const countTags = (data: any[]) => {
      const tagCount: Record<string, number> = {}
      data?.forEach(item => {
        tagCount[item.tag_name] = (tagCount[item.tag_name] || 0) + 1
      })
      return tagCount
    }
    
    const highTagCounts = countTags(highQualityData || [])
    const mediumTagCounts = countTags(mediumQualityData || [])
    
    // 高品質タグ：2回以上使用（緩和：3回→2回）
    const highQualityTags = Object.entries(highTagCounts)
      .filter(([_, count]) => count >= 2)
      .map(([tag, _]) => tag)
      .sort()
    
    // 中品質タグ：1回以上使用（緩和：2回→1回）
    const mediumQualityTags = Object.entries(mediumTagCounts)
      .filter(([_, count]) => count >= 1)
      .map(([tag, _]) => tag)
      .sort()
    
    console.log(`✨ 高品質タグ: ${highQualityTags.length}個`)
    console.log(`💎 中品質タグ: ${mediumQualityTags.length}個`)
    
    return { highQualityTags, mediumQualityTags }
  } catch (error) {
    console.error('❌ 品質ベースタグ取得エラー:', error)
    return { highQualityTags: [], mediumQualityTags: [] }
  }
}

/**
 * ユーザーの自然言語クエリをセマンティック検索意図に変換（品質ベース改良版）
 */
export async function analyzeSearchIntent(query: string): Promise<SearchIntent> {
  try {
    console.log('🔍 セマンティック検索意図分析開始:', query)
    
    // 1. 品質ベースタグを取得
    const { highQualityTags, mediumQualityTags } = await getQualityBasedTags()
    
    const model = getGeminiFlash()
    
    const prompt = `
検索クエリを分析し、既存のタグから適切なものを選択してください。
該当するタグがない場合は空配列を返してください。

**検索クエリ:** ${query}

**必須タグ候補（高品質・${highQualityTags.length}個）:**
${highQualityTags.slice(0, 100).join(', ')}${highQualityTags.length > 100 ? '...' : ''}

**推奨タグ候補（関連拡張・${mediumQualityTags.length}個）:**
${mediumQualityTags.slice(0, 100).join(', ')}${mediumQualityTags.length > 100 ? '...' : ''}

**ルール:**
1. required_tags: 検索クエリに直接関連する高品質タグのみ（該当なしなら[]）
2. preferred_tags: 関連性のある中品質タグで検索範囲を広げる（該当なしなら[]）
3. excluded_tags: 明示的に除外したいタグ（該当なしなら[]）
4. 存在しないタグは絶対に使用禁止
5. 空配列を恐れない - 該当なしなら空配列が正解

**出力形式（JSON）:**
{
  "required_tags": ["直接関連する高品質タグのみ"],
  "preferred_tags": ["関連する中品質タグ"],
  "excluded_tags": ["除外したいタグ"],
  "importance_threshold": 6.0,
  "limit": 20
}

該当なしの場合は空配列[]を返してください。JSONのみ出力、説明不要。`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    try {
      const cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const searchIntent = JSON.parse(cleanedResponse) as SearchIntent
      
      // タグ存在チェック・フィルタリング
      const allAvailableTags = [...highQualityTags, ...mediumQualityTags]
      
      const validatedIntent: SearchIntent = {
        required_tags: (searchIntent.required_tags || []).filter(tag => allAvailableTags.includes(tag)),
        preferred_tags: (searchIntent.preferred_tags || []).filter(tag => allAvailableTags.includes(tag)),
        excluded_tags: (searchIntent.excluded_tags || []).filter(tag => allAvailableTags.includes(tag)),
        importance_threshold: searchIntent.importance_threshold || 6.0,
        limit: searchIntent.limit || 20
      }
      
      console.log('✅ 検索意図分析完了:', validatedIntent)
      console.log(`🎯 必須タグ: ${validatedIntent.required_tags.length}個`)
      console.log(`💡 推奨タグ: ${validatedIntent.preferred_tags.length}個`)
      console.log(`❌ 除外タグ: ${validatedIntent.excluded_tags.length}個`)
      
      return validatedIntent
      
    } catch (parseError) {
      console.error('❌ JSON解析エラー:', parseError)
      console.log('生の応答:', responseText)
      
      // フォールバック: 基本的な検索意図を返す
      return createFallbackIntent(query)
    }
    
  } catch (error) {
    console.error('❌ 検索意図分析エラー:', error)
    return createFallbackIntent(query)
  }
}

/**
 * フォールバック用の基本検索意図生成
 */
function createFallbackIntent(query: string): SearchIntent {
  const keywords = query.toLowerCase().split(/\\s+/)
  
  return {
    required_tags: [],
    preferred_tags: keywords.filter(word => word.length > 2),
    excluded_tags: [],
    limit: 10,
    importance_threshold: 5.0
  }
}

/**
 * 段階的検索：必須タグ→推奨タグ→部分一致の順で検索
 */
async function executeSearchWithFallback(intent: SearchIntent): Promise<{ articles: any[], searchType: string }> {
  // Stage 1: 必須タグ検索
  if (intent.required_tags.length > 0) {
    console.log('🎯 Stage 1: 必須タグ検索')
    const results = await executeSearchByTags(intent.required_tags, intent, 'exact')
    if (results.length > 0) {
      return { articles: results, searchType: '必須タグマッチ' }
    }
  }
  
  // Stage 2: 推奨タグ検索
  if (intent.preferred_tags.length > 0) {
    console.log('💡 Stage 2: 推奨タグ検索')
    const results = await executeSearchByTags(intent.preferred_tags, intent, 'partial')
    if (results.length > 0) {
      return { articles: results, searchType: '推奨タグマッチ' }
    }
  }
  
  // Stage 3: 全体から重要度で検索（最終手段）
  console.log('🔍 Stage 3: 重要度ベース検索')
  const results = await executeSearchByImportance(intent)
  return { articles: results, searchType: '重要度ベース' }
}

/**
 * 指定タグでの記事検索
 */
async function executeSearchByTags(tags: string[], intent: SearchIntent, matchType: 'exact' | 'partial'): Promise<any[]> {
  try {
    let query = supabase
      .from('news_articles')
      .select(`
        id,
        title,
        ai_summary,
        source_name,
        importance_score,
        published_at,
        category,
        article_tags!inner(
          tag_name,
          confidence_score
        )
      `)
    
    // タグ条件
    if (matchType === 'exact') {
      // 完全一致（必須タグ用）- AND条件からOR条件に変更
      if (tags.length === 1) {
        query = query.filter('article_tags.tag_name', 'eq', tags[0])
      } else {
        // 複数の必須タグはORで検索（いずれかを含む記事）
        const orConditions = tags.map(tag => `tag_name.eq.${tag}`).join(',')
        query = query.or(orConditions, { foreignTable: 'article_tags' })
      }
    } else {
      // 部分一致（推奨タグ用）- クエリ構文修正
      if (tags.length === 1) {
        query = query.filter('article_tags.tag_name', 'ilike', `%${tags[0]}%`)
      } else {
        // 複数タグの場合はORクエリを正しい構文で作成
        const orConditions = tags.map(tag => `tag_name.ilike.%${tag}%`).join(',')
        query = query.or(orConditions, { foreignTable: 'article_tags' })
      }
    }
    
    // 重要度閾値
    if (intent.importance_threshold) {
      query = query.gte('importance_score', intent.importance_threshold)
    }
    
    // 日付範囲
    if (intent.date_range) {
      if (intent.date_range.from) {
        query = query.gte('published_at', intent.date_range.from)
      }
      if (intent.date_range.to) {
        query = query.lte('published_at', intent.date_range.to)
      }
    }
    
    // 除外タグ対応（後でフィルタリング）
    query = query.limit(intent.limit || 20)
    query = query.order('importance_score', { ascending: false })
    
    const { data: articles, error } = await query
    
    if (error) {
      console.error('検索エラー:', error)
      return []
    }
    
    return articles || []
  } catch (error) {
    console.error('❌ タグ検索エラー:', error)
    return []
  }
}

/**
 * 重要度ベース検索（最終手段）
 */
async function executeSearchByImportance(intent: SearchIntent): Promise<any[]> {
  try {
    let query = supabase
      .from('news_articles')
      .select(`
        id,
        title,
        ai_summary,
        source_name,
        importance_score,
        published_at,
        category,
        article_tags(
          tag_name,
          confidence_score
        )
      `)
      .gte('importance_score', intent.importance_threshold || 7.0) // 高重要度のみ
      .not('ai_summary', 'is', null) // AI分析済みのみ
    
    // 日付範囲
    if (intent.date_range) {
      if (intent.date_range.from) {
        query = query.gte('published_at', intent.date_range.from)
      }
      if (intent.date_range.to) {
        query = query.lte('published_at', intent.date_range.to)
      }
    }
    
    query = query.limit(Math.min(intent.limit || 10, 10)) // 最終手段は最大10件
    query = query.order('importance_score', { ascending: false })
    
    const { data: articles, error } = await query
    
    if (error) {
      console.error('重要度検索エラー:', error)
      return []
    }
    
    return articles || []
  } catch (error) {
    console.error('❌ 重要度検索エラー:', error)
    return []
  }
}

/**
 * 検索意図に基づいて記事を検索（段階的検索戦略）
 */
export async function executeSemanticSearch(intent: SearchIntent): Promise<SearchResult> {
  const startTime = Date.now()
  
  try {
    console.log('📊 セマンティック検索実行開始:', intent)
    
    // 1. 段階的検索実行
    const { articles, searchType } = await executeSearchWithFallback(intent)
    
    // 2. 除外タグでフィルタリング
    let filteredArticles = articles
    if (intent.excluded_tags.length > 0) {
      filteredArticles = articles.filter(article => {
        const tags = article.article_tags?.map((at: any) => at.tag_name) || []
        return !intent.excluded_tags.some(excludedTag => 
          tags.some(tag => tag.toLowerCase().includes(excludedTag.toLowerCase()))
        )
      })
      console.log(`🚫 除外タグフィルタ: ${articles.length}件 → ${filteredArticles.length}件`)
    }
    
    // 3. 関連度スコア計算
    const relevanceScores: { [articleId: string]: number } = {}
    const processedArticles: Article[] = []
    
    for (const article of filteredArticles) {
      // タグ情報を統合
      const tags = article.article_tags?.map((at: any) => at.tag_name) || []
      
      // 関連度スコア計算
      let relevanceScore = article.importance_score * 0.3 // ベーススコア
      
      // 必須タグマッチボーナス
      for (const requiredTag of intent.required_tags) {
        if (tags.some(tag => tag.toLowerCase().includes(requiredTag.toLowerCase()))) {
          relevanceScore += 5.0 // 必須タグは高スコア
        }
      }
      
      // 推奨タグマッチボーナス
      for (const preferredTag of intent.preferred_tags) {
        if (tags.some(tag => tag.toLowerCase().includes(preferredTag.toLowerCase()))) {
          relevanceScore += 2.0 // 推奨タグは中スコア
        }
      }
      
      relevanceScores[article.id] = Math.max(0, relevanceScore)
      
      processedArticles.push({
        id: article.id,
        title: article.title,
        ai_summary: article.ai_summary,
        source_name: article.source_name,
        importance_score: article.importance_score,
        published_at: article.published_at,
        category: article.category,
        tags: tags
      })
    }
    
    // 4. 関連度スコア順でソート
    processedArticles.sort((a, b) => 
      (relevanceScores[b.id] || 0) - (relevanceScores[a.id] || 0)
    )
    
    const executionTime = Date.now() - startTime
    
    const result: SearchResult = {
      articles: processedArticles,
      search_intent: intent,
      total_count: processedArticles.length,
      execution_time: executionTime,
      relevance_scores: relevanceScores,
      search_type: searchType,
      quality_stats: {
        high_quality_tags_used: intent.required_tags.length,
        medium_quality_tags_used: intent.preferred_tags.length,
        fallback_search: searchType === '重要度ベース'
      }
    }
    
    console.log(`✅ セマンティック検索完了: ${result.total_count}件 (${executionTime}ms)`)
    console.log(`🔍 検索タイプ: ${searchType}`)
    console.log(`📊 品質統計: 高品質${intent.required_tags.length}個, 中品質${intent.preferred_tags.length}個`)
    return result
    
  } catch (error) {
    console.error('❌ セマンティック検索エラー:', error)
    
    const executionTime = Date.now() - startTime
    return {
      articles: [],
      search_intent: intent,
      total_count: 0,
      execution_time: executionTime,
      relevance_scores: {}
    }
  }
}

/**
 * メイン検索関数：自然言語クエリから結果まで一貫処理
 */
export async function performSemanticSearch(query: string): Promise<SearchResult> {
  try {
    console.log('🚀 セマンティック検索開始:', query)
    
    // 1. 検索意図分析
    const intent = await analyzeSearchIntent(query)
    
    // 2. 検索実行
    const result = await executeSemanticSearch(intent)
    
    console.log('🎉 セマンティック検索全体完了')
    return result
    
  } catch (error) {
    console.error('❌ セマンティック検索全体エラー:', error)
    throw error
  }
}