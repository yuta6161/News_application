'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { rssSources } from '@/lib/rss-sources'
import { supabase } from '@/lib/supabase'
import { RSSHealthStatus } from '@/lib/rss-health-checker'

interface RSSSourceWithStats {
  name: string
  url: string
  category: string
  language: string
  source_reliability: number
  articles_count: number
  latest_article?: string
  status: 'active' | 'inactive' | 'error' | 'blocked'
  health_check?: RSSHealthStatus
  diagnosis?: string
}

export default function RSSSourcesPage() {
  const [sourcesWithStats, setSourcesWithStats] = useState<RSSSourceWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHealthChecking, setIsHealthChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    fetchSourcesWithStats()
  }, [])

  const fetchSourcesWithStats = async () => {
    try {
      setIsLoading(true)
      console.log('📡 RSS取得元統計データ取得開始...')

      // 各ソースの記事数を取得
      const sourcesWithStats: RSSSourceWithStats[] = []

      for (const source of rssSources) {
        console.log(`📊 ${source.name} の統計取得中...`)

        // 記事数を取得
        const { data: articles, error: articlesError } = await supabase
          .from('news_articles')
          .select('id, title, created_at')
          .eq('source_name', source.name)
          .order('created_at', { ascending: false })

        if (articlesError) {
          console.error(`❌ ${source.name} の記事取得エラー:`, articlesError)
        }

        const articlesCount = articles?.length || 0
        const latestArticle = articles?.[0]?.title

        // 簡易ステータス判定（詳細診断は別ボタン）
        let status: 'active' | 'inactive' | 'error' | 'blocked' = 'inactive'
        let diagnosis = 'データベース記事の日付のみでの簡易判定'
        
        if (articlesCount > 0 && articles && articles.length > 0) {
          const latestDate = new Date(articles[0].created_at)
          const daysSinceLatest = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysSinceLatest <= 7) {
            status = 'active'
            diagnosis = `正常稼働中（${daysSinceLatest}日前に記事取得済み） - 詳細診断で確認推奨`
          } else if (daysSinceLatest <= 30) {
            status = 'inactive'
            diagnosis = `更新停滞（${daysSinceLatest}日間記事なし） - 詳細診断で原因特定を推奨`
          } else {
            status = 'error'
            diagnosis = `長期停止（${daysSinceLatest}日間記事なし） - 詳細診断で原因特定が必要`
          }
        } else {
          diagnosis = '記事未取得 - 詳細診断で原因特定が必要'
        }

        sourcesWithStats.push({
          ...source,
          articles_count: articlesCount,
          latest_article: latestArticle,
          status,
          diagnosis
        })
      }

      console.log('✅ RSS取得元統計データ取得完了')
      setSourcesWithStats(sourcesWithStats)

    } catch (err) {
      console.error('❌ データ取得エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setIsLoading(false)
    }
  }

  const performHealthCheck = async (sourceName: string) => {
    setIsHealthChecking(true)
    try {
      // sourcesWithStatsから対象のソースを名前で検索
      const sourceIndex = sourcesWithStats.findIndex(s => s.name === sourceName)
      if (sourceIndex === -1) {
        throw new Error(`ソースが見つかりません: ${sourceName}`)
      }
      
      const source = sourcesWithStats[sourceIndex]
      console.log(`🏥 ${source.name} の詳細ヘルスチェック開始...`)

      // APIエンドポイント経由でヘルスチェック（CORS回避）
      const response = await fetch('/api/rss-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            name: source.name,
            url: source.url
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const healthStatus = await response.json()

      // 結果を更新（正しいインデックスを使用）
      const updatedSources = [...sourcesWithStats]
      updatedSources[sourceIndex] = {
        ...updatedSources[sourceIndex],
        status: healthStatus.status,
        health_check: healthStatus,
        diagnosis: healthStatus.diagnosis
      }
      setSourcesWithStats(updatedSources)

      console.log(`✅ ${source.name} 詳細ヘルスチェック完了`)
    } catch (error) {
      console.error('❌ ヘルスチェックエラー:', error)
      
      // エラー時の更新（正しいインデックスを使用）
      const sourceIndex = sourcesWithStats.findIndex(s => s.name === sourceName)
      if (sourceIndex !== -1) {
        const updatedSources = [...sourcesWithStats]
        updatedSources[sourceIndex] = {
          ...updatedSources[sourceIndex],
          diagnosis: `クライアントエラー: ${error instanceof Error ? error.message : '不明なエラー'}`
        }
        setSourcesWithStats(updatedSources)
      }
    } finally {
      setIsHealthChecking(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢'
      case 'inactive': return '🟡'
      case 'error': return '🔴'
      case 'blocked': return '⚫'
      default: return '❓'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '正常稼働'
      case 'inactive': return '更新停滞'
      case 'error': return 'エラー/長期停止'
      case 'blocked': return 'アクセス拒否'
      default: return '不明'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'inactive': return 'text-yellow-600 bg-yellow-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'blocked': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getLanguageIcon = (language: string) => {
    return language === 'ja' ? '🇯🇵' : '🇺🇸'
  }

  const getLanguageLabel = (language: string) => {
    return language === 'ja' ? '日本語' : '英語'
  }

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Tech': '💻',
      'Business': '💼',
      'World': '🌍',
      'Sports': '⚽',
      'Entertainment': '🎬',
      'Conspiracy': '🔍'
    }
    return icons[category] || '📰'
  }

  const categories = ['All', ...Array.from(new Set(rssSources.map(s => s.category)))]
  const filteredSources = selectedCategory === 'All' 
    ? sourcesWithStats 
    : sourcesWithStats.filter(s => s.category === selectedCategory)

  const totalSources = sourcesWithStats.length
  const activeSources = sourcesWithStats.filter(s => s.status === 'active').length
  const totalArticles = sourcesWithStats.reduce((sum, s) => sum + s.articles_count, 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <div>
                <h3 className="text-lg font-medium text-red-800">エラーが発生しました</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📡 RSS取得元管理
              </h1>
              <p className="text-gray-600">
                現在設定されているRSSフィードの一覧と統計情報
              </p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← ニュース一覧に戻る
            </Link>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{totalSources}</div>
            <div className="text-sm text-gray-600">総RSS取得元</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{activeSources}</div>
            <div className="text-sm text-gray-600">🟢 正常稼働中</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{totalArticles}</div>
            <div className="text-sm text-gray-600">総取得記事数</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(activeSources / totalSources * 100)}%
            </div>
            <div className="text-sm text-gray-600">稼働率</div>
          </div>
        </div>

        {/* カテゴリフィルター */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border'
                }`}
              >
                {category === 'All' ? '🌐 全て' : `${getCategoryIcon(category)} ${category}`}
                <span className="ml-2 text-xs">
                  ({category === 'All' ? totalSources : sourcesWithStats.filter(s => s.category === category).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* RSS取得元一覧 */}
        <div className="space-y-4">
          {filteredSources.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📡</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                該当するRSS取得元が見つかりません
              </h3>
            </div>
          ) : (
            filteredSources.map((source, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* ソースヘッダー */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xl mr-3">{getCategoryIcon(source.category)}</span>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {source.name}
                        </h2>
                        <div className={`ml-3 px-2 py-1 rounded text-sm font-medium ${getStatusColor(source.status)}`}>
                          {getStatusIcon(source.status)} {getStatusLabel(source.status)}
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span>🔗 <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {source.url.length > 50 ? source.url.substring(0, 50) + '...' : source.url}
                        </a></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ソース詳細 */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* カテゴリ */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">カテゴリ:</span>
                      <div className="flex items-center space-x-1">
                        <span>{getCategoryIcon(source.category)}</span>
                        <span className="text-sm font-medium">{source.category}</span>
                      </div>
                    </div>

                    {/* 言語 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">言語:</span>
                      <div className="flex items-center space-x-1">
                        <span>{getLanguageIcon(source.language)}</span>
                        <span className="text-sm font-medium">{getLanguageLabel(source.language)}</span>
                      </div>
                    </div>

                    {/* 信頼度 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">信頼度:</span>
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {Array.from({ length: 10 }, (_, i) => (
                            <span
                              key={i}
                              className={i < source.source_reliability ? 'text-yellow-400' : 'text-gray-300'}
                            >
                              ⭐
                            </span>
                          ))}
                        </div>
                        <span className="text-sm font-medium">{source.source_reliability}/10</span>
                      </div>
                    </div>

                    {/* 記事数 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">記事数:</span>
                      <span className="text-sm font-bold text-blue-600">{source.articles_count}件</span>
                    </div>
                  </div>

                  {/* 診断情報 */}
                  {source.diagnosis && (
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-blue-700 mb-1">
                            🔍 ステータス診断:
                          </div>
                          <div className="text-sm text-blue-600">
                            {source.diagnosis}
                          </div>
                        </div>
                        <button
                          onClick={() => performHealthCheck(source.name)}
                          disabled={isHealthChecking}
                          className={`ml-3 px-3 py-1 text-xs font-medium rounded transition-colors ${
                            isHealthChecking
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isHealthChecking ? '🔄 チェック中...' : '🏥 詳細診断'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 詳細ヘルスチェック結果 */}
                  {source.health_check && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                      <div className="text-sm font-medium text-green-700 mb-2">
                        🏥 詳細診断結果:
                      </div>
                      <div className="space-y-1 text-sm text-green-600">
                        <div>• RSS フィード: {source.health_check.feed_items_count}件の記事</div>
                        {source.health_check.feed_last_updated && (
                          <div>• フィード更新: {new Date(source.health_check.feed_last_updated).toLocaleDateString('ja-JP')}</div>
                        )}
                        <div>• データベース: {source.health_check.database_articles_count}件保存済み</div>
                        {source.health_check.error_message && (
                          <div className="text-red-600">• エラー: {source.health_check.error_message}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 最新記事 */}
                  {source.latest_article && (
                    <div className="mt-4 p-3 bg-gray-50 rounded border">
                      <div className="text-sm font-medium text-gray-700 mb-1">📰 最新記事:</div>
                      <div className="text-sm text-gray-600">
                        {source.latest_article.length > 100 
                          ? source.latest_article.substring(0, 100) + '...'
                          : source.latest_article
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>最終更新: {new Date().toLocaleString('ja-JP')}</p>
          <p className="mt-1">
            🟢 正常稼働: 7日以内に記事取得 | 🟡 更新停滞: 7-30日前 | 🔴 エラー: 30日以上または記事なし | ⚫ アクセス拒否: 403エラー等
          </p>
          <p className="mt-1 text-xs">
            ⚠️ 初期表示は簡易判定（データベース記事日付のみ）| 🏥 詳細診断ボタンで実際のRSSフィード状況を確認
          </p>
        </div>
      </div>
    </div>
  )
}