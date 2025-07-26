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
  Tech: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  Business: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  World: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  Sports: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  Entertainment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300'
}

const COUNTRY_FLAGS: Record<string, string> = {
  JP: '🇯🇵',
  US: '🇺🇸',
  UK: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  CN: '🇨🇳',
  KR: '🇰🇷'
}

export default function NewsCard({ article, onRead, onHelpful }: SimpleNewsCardProps) {
  const [isHelpful, setIsHelpful] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleReadClick = () => {
    console.log('🔵 読むボタンがクリックされました！', article.id, article.title)
    if (onRead) onRead(article.id)
    window.open(article.source_url, '_blank', 'noopener,noreferrer')
  }

  const handleHelpfulClick = () => {
    console.log('⭐ 役立ったボタンがクリックされました！', article.id, article.title)
    setIsHelpful(!isHelpful)
    if (onHelpful) onHelpful(article.id)
  }

  const renderImportanceStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < score
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ))
  }

  const formatPublishTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ja
      })
    } catch {
      return '不明'
    }
  }

  return (
    <article className="bg-[#FFF8E1] dark:bg-[#5D4037] rounded-xl p-4 border border-[#D2691E] dark:border-[#8B6914] hover:shadow-lg hover:shadow-[#D2691E]/20 dark:hover:shadow-[#8B6914]/20 transition-all duration-200 animate-fade-in">
      {/* ヘッダー：カテゴリー、ソース、時間 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
            {article.category}
          </span>
          {article.is_translated && (
            <span className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
              <Globe className="w-3 h-3" />
              <span>翻訳</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-[#5D4037] dark:text-[#D2B48C]">
          <span>{COUNTRY_FLAGS[article.source_country] || '🌐'}</span>
          <span className="truncate max-w-20 sm:max-w-none">{article.source_name}</span>
          <Clock className="w-3 h-3" />
          <span>{formatPublishTime(article.published_at)}</span>
        </div>
      </div>

      {/* タイトル */}
      <h2 className="text-lg font-bold text-[#3E2723] dark:text-[#F5E6D3] mb-3 line-clamp-2 leading-tight">
        {article.title}
      </h2>

      {/* 要約 */}
      <div className="mb-4">
        <p className={`text-[#5D4037] dark:text-[#D2B48C] leading-relaxed ${
          isExpanded ? '' : 'line-clamp-3'
        }`}>
          {article.summary}
        </p>
        {article.summary.length > 150 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#D2691E] dark:text-[#FFD700] text-sm mt-1 hover:underline"
          >
            {isExpanded ? '折りたたむ' : '続きを読む'}
          </button>
        )}
      </div>

      {/* タグ */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {article.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-[#FAEBD7] dark:bg-[#6D4C41] text-[#5D4037] dark:text-[#F5E6D3] text-xs rounded"
            >
              #{tag}
            </span>
          ))}
          {article.tags.length > 3 && (
            <span className="text-xs text-[#8B6914] dark:text-[#D2B48C]">
              +{article.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* フッター：重要度、アクション */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* 重要度スコア */}
          <div className="flex items-center space-x-1">
            {renderImportanceStars(article.importance_score)}
          </div>
          
          {/* 読了時間の目安 */}
          <span className="text-xs text-[#5D4037] dark:text-[#D2B48C]">
            約{Math.max(1, Math.ceil(article.summary.length / 200))}分
          </span>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleHelpfulClick}
            className={`p-2 rounded-full transition-all duration-200 ${
              isHelpful
                ? 'bg-[#FFE4B5] text-[#D2691E] dark:bg-[#8B6914]/20 dark:text-[#FFD700]'
                : 'bg-[#FAEBD7] text-[#5D4037] dark:bg-[#6D4C41] dark:text-[#D2B48C] hover:bg-[#F5DEB3] dark:hover:bg-[#8B6914]'
            }`}
            title="役立った"
          >
            <Star className={`w-4 h-4 ${isHelpful ? 'fill-current' : ''}`} />
          </button>
          
          <button
            onClick={handleReadClick}
            className="flex items-center space-x-1 px-4 py-2 bg-[#2F4F2F] hover:bg-[#228B22] text-white rounded-full transition-colors duration-200 text-sm font-medium active:scale-95"
          >
            <span>読む</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  )
}