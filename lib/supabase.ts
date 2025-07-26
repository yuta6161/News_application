import { createClient } from '@supabase/supabase-js'
import { NewsArticle, UserPreferences } from '@/types'

// Node.js環境での環境変数読み込み
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

// Supabaseクライアントの設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型定義の拡張（Supabase用）
export interface Database {
  public: {
    Tables: {
      news_articles: {
        Row: NewsArticle
        Insert: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<NewsArticle, 'id' | 'created_at'>>
      }
      user_preferences: {
        Row: UserPreferences
        Insert: Omit<UserPreferences, 'id' | 'created_at'>
        Update: Partial<Omit<UserPreferences, 'id' | 'created_at'>>
      }
      article_interactions: {
        Row: {
          id: string
          article_id: string
          user_id: string
          interaction_type: 'read' | 'helpful' | 'share'
          created_at: string
        }
        Insert: {
          article_id: string
          user_id: string
          interaction_type: 'read' | 'helpful' | 'share'
        }
        Update: {
          interaction_type?: 'read' | 'helpful' | 'share'
        }
      }
    }
    Views: {
      popular_articles: {
        Row: NewsArticle & {
          read_count: number
          helpful_count: number
        }
      }
    }
    Functions: {
      get_category_counts: {
        Returns: {
          category: string
          count: number
        }[]
      }
      get_personalized_articles: {
        Args: {
          p_user_id: string
          p_limit?: number
        }
        Returns: NewsArticle[]
      }
    }
  }
}

// 型付きクライアント
export const typedSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// ユーティリティ関数
export const supabaseUtils = {
  // ニュース記事の取得
  async getArticles(category?: string, limit = 20) {
    let query = typedSupabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (category && category !== 'All') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('記事取得エラー:', error)
      throw error
    }

    return data
  },

  // 記事の詳細取得
  async getArticleById(id: string) {
    const { data, error } = await typedSupabase
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('記事詳細取得エラー:', error)
      throw error
    }

    return data
  },

  // ユーザー設定の取得
  async getUserPreferences(userId: string) {
    const { data, error } = await typedSupabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // レコードが見つからない場合以外のエラー
      console.error('ユーザー設定取得エラー:', error)
      throw error
    }

    return data
  },

  // ユーザー設定の更新/作成
  async upsertUserPreferences(preferences: Omit<UserPreferences, 'id' | 'created_at'>) {
    const { data, error } = await typedSupabase
      .from('user_preferences')
      .upsert(preferences, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('ユーザー設定更新エラー:', error)
      throw error
    }

    return data
  },

  // 記事への反応を記録
  async recordInteraction(articleId: string, userId: string, type: 'read' | 'helpful' | 'share') {
    const { data, error } = await typedSupabase
      .from('article_interactions')
      .upsert({
        article_id: articleId,
        user_id: userId,
        interaction_type: type
      }, {
        onConflict: 'article_id,user_id,interaction_type'
      })

    if (error) {
      console.error('インタラクション記録エラー:', error)
      throw error
    }

    return data
  },

  // カテゴリー別記事数の取得
  async getCategoryCounts() {
    const { data, error } = await typedSupabase
      .rpc('get_category_counts')

    if (error) {
      console.error('カテゴリー集計取得エラー:', error)
      throw error
    }

    return data
  },

  // パーソナライズされた記事の取得
  async getPersonalizedArticles(userId: string, limit = 20) {
    const { data, error } = await typedSupabase
      .rpc('get_personalized_articles', {
        p_user_id: userId,
        p_limit: limit
      })

    if (error) {
      console.error('パーソナライズ記事取得エラー:', error)
      throw error
    }

    return data
  }
}