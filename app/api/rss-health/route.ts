import { NextRequest, NextResponse } from 'next/server'
import { checkRSSHealth } from '@/lib/rss-health-checker'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { source } = await request.json()
    
    if (!source || !source.name || !source.url) {
      return NextResponse.json(
        { error: 'Invalid source data' },
        { status: 400 }
      )
    }

    console.log(`🏥 [API] ${source.name} のヘルスチェック開始...`)

    // データベースから記事情報を取得
    const { data: articles } = await supabase
      .from('news_articles')
      .select('created_at')
      .eq('source_name', source.name)
      .order('created_at', { ascending: false })
      .limit(1)

    const { count } = await supabase
      .from('news_articles')
      .select('id', { count: 'exact' })
      .eq('source_name', source.name)

    // ヘルスチェック実行
    const healthStatus = await checkRSSHealth(
      source,
      count || 0,
      articles?.[0]?.created_at
    )

    console.log(`✅ [API] ${source.name} ヘルスチェック完了`)

    return NextResponse.json(healthStatus)
  } catch (error) {
    console.error('❌ [API] ヘルスチェックエラー:', error)
    
    return NextResponse.json(
      { 
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}