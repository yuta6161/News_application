interface LoadingSkeletonProps {
  variant?: 'article' | 'category' | 'list'
  count?: number
}

export default function LoadingSkeleton({ variant = 'article', count = 1 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'article':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
            {/* カテゴリーとソース */}
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
            
            {/* タイトル */}
            <div className="space-y-2 mb-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            
            {/* 要約 */}
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
            
            {/* フッター */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
            </div>
          </div>
        )
      
      case 'category':
        return (
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full px-6 animate-pulse shrink-0"
                style={{
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </div>
        )
      
      case 'list':
        return (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                </div>
              </div>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  )
}

// シマーエフェクト用のCSS（globals.cssに追加済み）
export function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-200 dark:bg-gray-700 animate-pulse relative overflow-hidden ${className || ''}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-600/20 to-transparent animate-shimmer"></div>
    </div>
  )
}