'use client'

import { useState } from 'react'
import { NewsCategory } from '@/types'

// 表示対象の3カテゴリのみ
const CATEGORIES: Array<NewsCategory | 'All'> = ['All', 'Tech', 'Music', 'Conspiracy']

const CATEGORY_LABELS: Record<NewsCategory | 'All', string> = {
  All: '全て',
  Tech: 'テック',
  Music: '音楽',
  Business: 'ビジネス',
  AI: 'AI',
  Startup: 'スタートアップ',
  General: '一般',
  Game: 'ゲーム',
  World: '世界',
  Sports: 'スポーツ',
  Entertainment: 'エンタメ',
  Conspiracy: '陰謀論'
}

const CATEGORY_ICONS: Record<NewsCategory | 'All', string> = {
  All: '📰',
  Tech: '💻',
  Music: '🎵',
  Business: '💼',
  AI: '🤖',
  Startup: '🚀',
  General: '📝',
  Game: '🎮',
  World: '🌍',
  Sports: '⚽',
  Entertainment: '🎬',
  Conspiracy: '🔍'
}

interface CategoryTabsProps {
  activeCategory: NewsCategory | 'All'
  onCategoryChange: (category: NewsCategory | 'All') => void
  className?: string
}

export default function CategoryTabs({ 
  activeCategory, 
  onCategoryChange,
  className = ''
}: CategoryTabsProps) {
  return (
    <div className={`${className}`}>
      {/* スクロール可能なカテゴリータブ */}
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 px-4 sm:px-6">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium
              whitespace-nowrap transition-all duration-200 shrink-0
              ${activeCategory === category
                ? 'bg-[#D2691E] text-white shadow-lg shadow-[#D2691E]/25 scale-105'
                : 'bg-[#FFF8E1] dark:bg-[#5D4037] text-[#3E2723] dark:text-[#F5E6D3] hover:bg-[#FAEBD7] dark:hover:bg-[#6D4C41] border border-[#D2691E] dark:border-[#8B6914]'
              }
              active:scale-95
            `}
          >
            <span className="text-base">{CATEGORY_ICONS[category]}</span>
            <span>{CATEGORY_LABELS[category]}</span>
          </button>
        ))}
      </div>
      
      {/* カテゴリー切り替えの視覚的フィードバック */}
      <div className="mt-4 px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent"></div>
      </div>
    </div>
  )
}

// モバイル向けスワイプ対応版（将来的に実装）
export function SwipeableCategoryTabs({ 
  activeCategory, 
  onCategoryChange 
}: CategoryTabsProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = CATEGORIES.indexOf(activeCategory)
      
      if (isLeftSwipe && currentIndex < CATEGORIES.length - 1) {
        onCategoryChange(CATEGORIES[currentIndex + 1])
      } else if (isRightSwipe && currentIndex > 0) {
        onCategoryChange(CATEGORIES[currentIndex - 1])
      }
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="touch-manipulation"
    >
      <CategoryTabs 
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />
    </div>
  )
}