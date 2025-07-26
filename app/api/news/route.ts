import { NextRequest, NextResponse } from 'next/server'
import { supabaseUtils, typedSupabase } from '@/lib/supabase'

// GET /api/news - ニュース記事の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = searchParams.get('userId')

    // パーソナライズされた記事を取得するか、通常の記事を取得するか
    let articles
    if (userId && userId !== 'anonymous') {
      articles = await supabaseUtils.getPersonalizedArticles(userId, limit)
    } else {
      articles = await supabaseUtils.getArticles(category || undefined, limit)
    }

    return NextResponse.json({
      success: true,
      data: articles,
      count: articles.length
    })

  } catch (error) {
    console.error('記事取得API エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'ニュース記事の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    })
  }
}

// POST /api/news - 新しい記事の追加（管理者用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 必須フィールドの検証
    const requiredFields = ['title', 'summary', 'source_url', 'source_name', 'category', 'published_at']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `必須フィールドが不足しています: ${field}`
        }, { 
          status: 400 
        })
      }
    }

    // カテゴリーの検証
    const validCategories = ['Tech', 'Business', 'World', 'Sports', 'Entertainment']
    if (!validCategories.includes(body.category)) {
      return NextResponse.json({
        success: false,
        error: `無効なカテゴリーです。有効な値: ${validCategories.join(', ')}`
      }, { 
        status: 400 
      })
    }

    // 重要度スコアの検証
    if (body.importance_score && (body.importance_score < 1 || body.importance_score > 5)) {
      return NextResponse.json({
        success: false,
        error: '重要度スコアは1〜5の範囲で指定してください'
      }, { 
        status: 400 
      })
    }

    // 記事をデータベースに挿入
    const { data, error } = await typedSupabase
      .from('news_articles')
      .insert({
        title: body.title,
        summary: body.summary,
        source_url: body.source_url,
        source_name: body.source_name,
        category: body.category,
        tags: body.tags || [],
        image_url: body.image_url,
        published_at: body.published_at,
        original_language: body.original_language || 'ja',
        is_translated: body.is_translated || false,
        source_country: body.source_country || 'JP',
        importance_score: body.importance_score || 3
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: '記事が正常に追加されました'
    }, { 
      status: 201 
    })

  } catch (error) {
    console.error('記事追加API エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: '記事の追加に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    })
  }
}