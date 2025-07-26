'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import CategoryTabs from '@/components/CategoryTabs'
import SimpleNewsCard from '@/components/SimpleNewsCard'
import { NewsCategory } from '@/types'

interface Article {
  id: string
  title: string
  ai_summary: string | null
  source_name: string
  importance_score: number
  published_at: string
  category: string
}

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'All'>('All')

  const fetchLatestArticles = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Supabaseから直接AI分析済み記事を取得（カテゴリフィルター対応）
      const categoryParam = activeCategory !== 'All' ? `?category=${activeCategory}` : ''
      const response = await fetch(`/api/articles-simple${categoryParam}`)
      
      if (!response.ok) {
        throw new Error('記事の取得に失敗しました')
      }
      
      const data = await response.json()
      setArticles(data.articles || [])
      
    } catch (err) {
      console.error('記事取得エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setIsLoading(false)
    }
  }, [activeCategory])

  useEffect(() => {
    fetchLatestArticles()
  }, [activeCategory, fetchLatestArticles])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              🗞️ AIニュースアプリ
            </h1>
            <p className="text-gray-600">記事を読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              🗞️ AIニュースアプリ
            </h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">エラー: {error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🗞️ AIニュースアプリ
          </h1>
          <p className="text-gray-600 mb-6">
            Gemini 2.5 Flash で分析された最新ニュース
          </p>
          
          {/* ナビゲーション */}
          <div className="flex justify-center space-x-4 mb-6">
            <Link 
              href="/search"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔮 セマンティック検索
            </Link>
            <Link 
              href="/article-tags"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📊 記事タグ分析
            </Link>
            <Link 
              href="/rss-sources"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              📡 RSS管理
            </Link>
            <button
              onClick={fetchLatestArticles}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 更新
            </button>
          </div>
          
          {/* カテゴリタブ */}
          <CategoryTabs 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* 記事一覧 */}
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI分析済み記事が見つかりません
            </h3>
            <p className="text-gray-500 mb-6">
              RSS収集を実行してAI分析を行ってください
            </p>
            <Link
              href="/article-tags"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              記事タグページで確認 →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <SimpleNewsCard 
                key={article.id} 
                article={article}
                onHelpful={(articleId) => console.log('役立った:', articleId)}
              />
            ))}
          </div>
        )}

        {/* フッター */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            <span className="mr-4">🤖 Gemini 2.5 Flash による AI分析</span>
            <span>📊 {articles.length} 件の記事</span>
          </p>
          <p className="mt-2">
            最終更新: {new Date().toLocaleString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}