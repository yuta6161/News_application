import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rssSources } from '@/lib/rss-sources'

// 動的ルートにする（静的ビルドを無効化）
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 シンプル記事API呼び出し開始')

    // URLパラメータからカテゴリを取得
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    
    console.log('📂 指定カテゴリ:', category || 'All')

    // display_on_site=true のソースのみを抽出
    const displaySources = rssSources
      .filter(source => source.display_on_site !== false)
      .map(source => source.name)
    
    console.log('👁️ 表示対象ソース数:', displaySources.length)

    // AI分析済み記事を取得（カテゴリ + 表示対象ソースフィルター対応）
    let query = supabase
      .from('news_articles')
      .select('id, title, ai_summary, source_name, importance_score, published_at, category')
      .not('ai_summary', 'is', null)
      .in('source_name', displaySources) // 表示対象ソースのみ
      .order('published_at', { ascending: false })
      .limit(500)

    // カテゴリフィルターを適用
    if (category && category !== 'All') {
      query = query.eq('category', category)
    }

    const { data: articles, error } = await query

    if (error) {
      console.error('❌ Supabaseエラー:', error)
      return NextResponse.json(
        { error: 'データベースエラー', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 記事取得成功:', articles?.length || 0, '件')

    return NextResponse.json({
      success: true,
      articles: articles || [],
      count: articles?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ API実行エラー:', error)
    return NextResponse.json(
      { 
        error: '予期しないエラー', 
        details: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    )
  }
}