'use client'

import { useState } from 'react'

interface SimpleArticle {
  id: string
  title: string
  ai_summary: string | null
  source_name: string
  importance_score: number
  published_at: string
  category: string
}

interface SimpleNewsCardProps {
  article: SimpleArticle
  onRead?: (articleId: string) => void
  onHelpful?: (articleId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'Tech': 'bg-blue-100 text-blue-800',
  'Game': 'bg-green-100 text-green-800',
  'Music': 'bg-pink-100 text-pink-800',
  'Business': 'bg-yellow-100 text-yellow-800',
  'World': 'bg-indigo-100 text-indigo-800',
  'Sports': 'bg-orange-100 text-orange-800',
  'Entertainment': 'bg-red-100 text-red-800',
  'Conspiracy': 'bg-purple-100 text-purple-800',
  'All': 'bg-gray-100 text-gray-800'
}

export default function SimpleNewsCard({ article, onRead, onHelpful }: SimpleNewsCardProps) {
  const [isHelpful, setIsHelpful] = useState(false)

  const handleHelpfulClick = () => {
    setIsHelpful(!isHelpful)
    if (onHelpful) onHelpful(article.id)
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const published = new Date(dateString)
    const diffInMs = now.getTime() - published.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInSeconds < 60) {
      return `${diffInSeconds}秒前`
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`
    } else {
      // 1週間以上前の場合は時間前表示なし
      return null
    }
  }

  const formatDate = (dateString: string) => {
    const published = new Date(dateString)
    return published.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getImportanceIcon = (score: number) => {
    if (score >= 8) return '🔥'
    if (score >= 6) return '⭐'
    if (score >= 4) return '📰'
    return '📄'
  }

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, string> = {
      'Tech': '💻',
      'Game': '🎮',
      'Music': '🎵',
      'Business': '💼',
      'World': '🌍',
      'Sports': '⚽',
      'Entertainment': '🎭',
      'Conspiracy': '🔍',
      'All': '📰'
    }
    return iconMap[category] || '📰'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
            {article.title}
          </h2>
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <span className="flex items-center space-x-1">
              <span>{getCategoryIcon(article.category)}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-800'}`}>
                {article.category}
              </span>
            </span>
            <span>📺 {article.source_name}</span>
            <span className="flex items-center space-x-1">
              <span>{getImportanceIcon(article.importance_score)}</span>
              <span>重要度: {article.importance_score}</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="flex items-center space-x-1">
                <span>📅</span>
                <span>{formatDate(article.published_at)}</span>
              </span>
              {formatTimeAgo(article.published_at) && (
                <span className="flex items-center space-x-1 text-green-600 font-medium">
                  <span>⏰</span>
                  <span>{formatTimeAgo(article.published_at)}</span>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      {/* AI要約 */}
      {article.ai_summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
            <span>🤖</span>
            <span>AI要約</span>
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            {article.ai_summary}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleHelpfulClick}
            className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
              isHelpful
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            <span className="flex items-center space-x-1">
              <span>{isHelpful ? '⭐' : '☆'}</span>
              <span>役立った</span>
            </span>
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          記事ID: {article.id.substring(0, 8)}...
        </div>
      </div>
    </div>
  )
}