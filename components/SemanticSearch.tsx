'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline'

interface SearchResult {
  id: string
  title: string
  ai_summary: string | null
  source_name: string
  importance_score: number
  published_at: string
  category: string
  tags?: string[]
}

interface SearchMetadata {
  total_count: number
  execution_time: number
  api_time: number
  search_intent: {
    required_tags: string[]
    preferred_tags: string[]
    excluded_tags: string[]
    importance_threshold?: number
  }
  relevance_scores: { [articleId: string]: number }
}

interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  metadata: SearchMetadata
  timestamp: string
}

export default function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔍 セマンティック検索開始:', searchQuery)
      
      const response = await fetch(`/api/search/semantic?q=${encodeURIComponent(searchQuery)}`)
      const data: SearchResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'セマンティック検索に失敗しました')
      }
      
      if (data.success) {
        setResults(data.results)
        setMetadata(data.metadata)
        
        // 検索履歴に追加（重複除去）
        setSearchHistory(prev => {
          const newHistory = [searchQuery, ...prev.filter(q => q !== searchQuery)]
          return newHistory.slice(0, 5) // 最新5件まで保持
        })
        
        console.log(`✅ セマンティック検索完了: ${data.results.length}件`)
      } else {
        throw new Error(data.error || '検索結果の取得に失敗しました')
      }
      
    } catch (err) {
      console.error('❌ セマンティック検索エラー:', err)
      setError(err instanceof Error ? err.message : '検索中にエラーが発生しました')
      setResults([])
      setMetadata(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery)
    handleSearch(historyQuery)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelevanceScore = (score: number) => {
    return Math.round(score * 10) / 10
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 検索ヘッダー */}
      <div className="text-center mb-8">
        <div className="flex justify-center items-center mb-4">
          <SparklesIcon className="w-8 h-8 text-purple-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">
            🔮 セマンティック検索
          </h1>
        </div>
        <p className="text-gray-600">
          自然な言葉で記事を検索 - AIがあなたの意図を理解します
        </p>
      </div>

      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
          <strong>Debug:</strong> Query state = &quot;{query}&quot; (length: {query.length})
        </div>
      )}

      {/* 検索フォーム */}
      <form onSubmit={handleSubmit} className="mb-6">
        <label htmlFor="semantic-search-input" className="sr-only">
          セマンティック検索クエリ
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="semantic-search-input"
            name="searchQuery"
            type="text"
            value={query}
            onChange={(e) => {
              console.log('Input changed:', e.target.value)
              setQuery(e.target.value)
            }}
            placeholder="例: 最新のAI関連ニュースで重要なもの"
            className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 disabled:text-gray-500 disabled:bg-gray-50 text-lg"
            disabled={isLoading}
            autoComplete="search"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-purple-600 text-white px-6 py-2 rounded-r-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '検索中...' : '検索'}
            </button>
          </div>
        </div>
      </form>

      {/* 検索履歴 */}
      {searchHistory.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">最近の検索:</p>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => handleHistoryClick(historyQuery)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                {historyQuery}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ローディング状態 */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
            <span className="text-gray-600">AIが検索意図を分析中...</span>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* 検索結果メタデータ */}
      {metadata && !isLoading && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-purple-900">検索結果概要</h3>
            <div className="flex items-center text-sm text-purple-700">
              <ClockIcon className="w-4 h-4 mr-1" />
              {metadata.execution_time}ms
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-purple-800">件数:</span>
              <span className="ml-2 text-purple-700">{metadata.total_count}件</span>
            </div>
            
            {metadata.search_intent.required_tags.length > 0 && (
              <div>
                <span className="font-medium text-purple-800">必須タグ:</span>
                <span className="ml-2 text-purple-700">
                  {metadata.search_intent.required_tags.join(', ')}
                </span>
              </div>
            )}
            
            {metadata.search_intent.preferred_tags.length > 0 && (
              <div>
                <span className="font-medium text-purple-800">推奨タグ:</span>
                <span className="ml-2 text-purple-700">
                  {metadata.search_intent.preferred_tags.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && !isLoading && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            検索結果 ({results.length}件)
          </h2>
          
          {results.map((article) => (
            <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {article.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {article.source_name}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatDate(article.published_at)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-purple-600 font-medium">
                    関連度: {formatRelevanceScore(metadata?.relevance_scores[article.id] || 0)}
                  </span>
                  <span className="text-xs text-orange-600 font-medium">
                    重要度: {article.importance_score}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {article.title}
              </h3>
              
              {article.ai_summary && (
                <p className="text-gray-600 mb-3 leading-relaxed">
                  {article.ai_summary}
                </p>
              )}
              
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {article.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                  {article.tags.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      +{article.tags.length - 5}個
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 結果なし */}
      {results.length === 0 && metadata && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            検索結果が見つかりませんでした
          </h3>
          <p className="text-gray-500 mb-4">
            検索条件を変更してもう一度お試しください
          </p>
          <div className="text-sm text-gray-400">
            検索意図: {metadata.search_intent.required_tags.length > 0 
              ? `必須タグ「${metadata.search_intent.required_tags.join(', ')}」` 
              : '条件に一致する記事がありません'}
          </div>
        </div>
      )}
    </div>
  )
}