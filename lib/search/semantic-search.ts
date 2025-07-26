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
 * ユーザーの自然言語クエリをセマンティック検索意図に変換
 */
export async function analyzeSearchIntent(query: string): Promise<SearchIntent> {
  try {
    console.log('🔍 セマンティック検索意図分析開始:', query)
    
    const model = getGeminiFlash()
    
    const prompt = `
ユーザーの検索クエリを分析し、記事検索に最適化された条件を生成してください。

**検索クエリ:** ${query}

**出力形式（JSON）:**
{
  "required_tags": ["必須で含むべきタグ"],
  "preferred_tags": ["あると良いタグ"],
  "excluded_tags": ["除外すべきタグ"],
  "date_range": {
    "from": "YYYY-MM-DD",
    "to": "YYYY-MM-DD"
  },
  "trust_level": 7,
  "importance_threshold": 6.0,
  "limit": 20,
  "special_conditions": ["その他の条件"]
}

**利用可能なタグ例:**
- 企業名: "Google", "Apple", "Microsoft", "OpenAI", "Tesla"
- 技術: "AI", "機械学習", "言語AI", "画像生成AI", "自動運転"
- カテゴリ: "テック", "ビジネス", "エンターテイメント", "陰謀論"
- 重要度: "重要", "速報", "注目"

**分析ルール:**
1. 具体的な企業名・技術名は required_tags に
2. 関連分野は preferred_tags に
3. 明示的に除外したい内容は excluded_tags に
4. 時間的制約があれば date_range に
5. 重要性・信頼性の要求があれば数値で設定
6. 件数指定があれば limit に反映

**例:**
- "最新のOpenAI関連ニュース" → required_tags: ["OpenAI"], date_range: 最近1週間
- "Googleの新サービスで重要なもの" → required_tags: ["Google"], importance_threshold: 8.0
- "AI関連だけど陰謀論は除外" → preferred_tags: ["AI"], excluded_tags: ["陰謀論"]

JSONのみ出力してください。説明不要。`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    try {
      const cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const searchIntent = JSON.parse(cleanedResponse) as SearchIntent
      
      // デフォルト値設定
      searchIntent.required_tags = searchIntent.required_tags || []
      searchIntent.preferred_tags = searchIntent.preferred_tags || []
      searchIntent.excluded_tags = searchIntent.excluded_tags || []
      searchIntent.limit = searchIntent.limit || 10
      
      console.log('✅ 検索意図分析完了:', searchIntent)
      return searchIntent
      
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
 * 検索意図に基づいて記事を検索
 */
export async function executeSemanticSearch(intent: SearchIntent): Promise<SearchResult> {
  const startTime = Date.now()
  
  try {
    console.log('📊 セマンティック検索実行開始:', intent)
    
    // 1. タグベースでの記事検索
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
    
    // 必須タグの条件
    if (intent.required_tags.length > 0) {
      for (const tag of intent.required_tags) {
        query = query.filter('article_tags.tag_name', 'ilike', `%${tag}%`)
      }
    }
    
    // 重要度閾値
    if (intent.importance_threshold) {
      query = query.gte('importance_score', intent.importance_threshold)
    }
    
    // 信頼度レベル（今後の拡張用）
    if (intent.trust_level) {
      // 今回は重要度で代用
      query = query.gte('importance_score', intent.trust_level * 0.8)
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
    
    // 結果件数制限
    query = query.limit(intent.limit || 10)
    
    // 重要度順でソート
    query = query.order('importance_score', { ascending: false })
    
    const { data: articles, error } = await query
    
    if (error) {
      throw new Error(`Database query error: ${error.message}`)
    }
    
    // 2. 関連度スコア計算
    const relevanceScores: { [articleId: string]: number } = {}
    const processedArticles: Article[] = []
    
    for (const article of articles || []) {
      // タグ情報を統合
      const tags = article.article_tags?.map((at: any) => at.tag_name) || []
      
      // 関連度スコア計算
      let relevanceScore = article.importance_score * 0.3 // ベーススコア
      
      // 必須タグマッチボーナス
      for (const requiredTag of intent.required_tags) {
        if (tags.some(tag => tag.toLowerCase().includes(requiredTag.toLowerCase()))) {
          relevanceScore += 3.0
        }
      }
      
      // 推奨タグマッチボーナス
      for (const preferredTag of intent.preferred_tags) {
        if (tags.some(tag => tag.toLowerCase().includes(preferredTag.toLowerCase()))) {
          relevanceScore += 1.5
        }
      }
      
      // 除外タグペナルティ
      for (const excludedTag of intent.excluded_tags) {
        if (tags.some(tag => tag.toLowerCase().includes(excludedTag.toLowerCase()))) {
          relevanceScore -= 5.0
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
    
    // 3. 関連度スコア順でソート
    processedArticles.sort((a, b) => 
      (relevanceScores[b.id] || 0) - (relevanceScores[a.id] || 0)
    )
    
    const executionTime = Date.now() - startTime
    
    const result: SearchResult = {
      articles: processedArticles,
      search_intent: intent,
      total_count: processedArticles.length,
      execution_time: executionTime,
      relevance_scores: relevanceScores
    }
    
    console.log(`✅ セマンティック検索完了: ${result.total_count}件 (${executionTime}ms)`)
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