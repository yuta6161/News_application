import { NextRequest, NextResponse } from 'next/server'
import { supabaseUtils } from '@/lib/supabase'

// POST /api/interactions - ユーザーの記事への反応を記録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleId, userId, type } = body

    // 必須フィールドの検証
    if (!articleId || !userId || !type) {
      return NextResponse.json({
        success: false,
        error: '必須フィールドが不足しています: articleId, userId, type'
      }, { 
        status: 400 
      })
    }

    // インタラクションタイプの検証
    const validTypes = ['read', 'helpful', 'share']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `無効なインタラクションタイプです。有効な値: ${validTypes.join(', ')}`
      }, { 
        status: 400 
      })
    }

    // インタラクションを記録
    const data = await supabaseUtils.recordInteraction(articleId, userId, type)

    return NextResponse.json({
      success: true,
      data: data,
      message: `${type} インタラクションが記録されました`
    })

  } catch (error) {
    console.error('インタラクション記録API エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'インタラクションの記録に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    })
  }
}