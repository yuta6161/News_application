import { NextRequest, NextResponse } from 'next/server'
import { performSemanticSearch } from '@/lib/search/semantic-search'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 セマンティック検索API呼び出し開始')
    
    // クエリパラメータから検索語を取得
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = searchParams.get('limit')
    
    if (!query) {
      return NextResponse.json(
        { 
          error: '検索クエリが指定されていません',
          message: 'クエリパラメータ "q" を指定してください' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 検索クエリ: "${query}"`)
    if (limit) console.log(`📊 件数制限: ${limit}`)
    
    // セマンティック検索実行
    const searchResult = await performSemanticSearch(query)
    
    // 件数制限の適用（URL パラメータでの上書き）
    if (limit && !isNaN(parseInt(limit))) {
      const limitNum = parseInt(limit)
      searchResult.articles = searchResult.articles.slice(0, limitNum)
      searchResult.total_count = Math.min(searchResult.total_count, limitNum)
    }
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    console.log(`✅ セマンティック検索API完了: ${searchResult.articles.length}件 (${totalTime}ms)`)
    
    // レスポンス生成
    return NextResponse.json({
      success: true,
      query: query,
      results: searchResult.articles,
      metadata: {
        total_count: searchResult.total_count,
        search_intent: searchResult.search_intent,
        execution_time: searchResult.execution_time,
        api_time: totalTime,
        relevance_scores: searchResult.relevance_scores,
        search_type: searchResult.search_type,
        quality_stats: searchResult.quality_stats
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ セマンティック検索APIエラー:', error)
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    return NextResponse.json(
      {
        success: false,
        error: 'セマンティック検索でエラーが発生しました',
        message: error instanceof Error ? error.message : '不明なエラー',
        execution_time: totalTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 セマンティック検索API（POST）呼び出し開始')
    
    const body = await request.json()
    const { query, limit } = body
    
    if (!query) {
      return NextResponse.json(
        { 
          error: '検索クエリが指定されていません',
          message: 'リクエストボディに "query" を指定してください' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 検索クエリ: "${query}"`)
    if (limit) console.log(`📊 件数制限: ${limit}`)
    
    // セマンティック検索実行
    const searchResult = await performSemanticSearch(query)
    
    // 件数制限の適用
    if (limit && !isNaN(parseInt(limit))) {
      const limitNum = parseInt(limit)
      searchResult.articles = searchResult.articles.slice(0, limitNum)
      searchResult.total_count = Math.min(searchResult.total_count, limitNum)
    }
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    console.log(`✅ セマンティック検索API（POST）完了: ${searchResult.articles.length}件 (${totalTime}ms)`)
    
    return NextResponse.json({
      success: true,
      query: query,
      results: searchResult.articles,
      metadata: {
        total_count: searchResult.total_count,
        search_intent: searchResult.search_intent,
        execution_time: searchResult.execution_time,
        api_time: totalTime,
        relevance_scores: searchResult.relevance_scores,
        search_type: searchResult.search_type,
        quality_stats: searchResult.quality_stats
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ セマンティック検索API（POST）エラー:', error)
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    return NextResponse.json(
      {
        success: false,
        error: 'セマンティック検索でエラーが発生しました',
        message: error instanceof Error ? error.message : '不明なエラー',
        execution_time: totalTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}