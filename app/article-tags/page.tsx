'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface ArticleWithTags {
  id: string
  title: string
  source_name: string
  importance_score: number
  ai_summary: string | null
  published_at: string
  tags: Array<{
    tag_name: string
    category: string
    confidence_score: number
    is_auto_generated: boolean
  }>
}

interface TagSummary {
  tag_name: string
  total_usage: number
  is_auto_generated: boolean
  category: string
  avg_confidence: number
}

export default function ArticleTagsPage() {
  const [articles, setArticles] = useState<ArticleWithTags[]>([])
  const [tagSummaries, setTagSummaries] = useState<TagSummary[]>([])
  const [activeTab, setActiveTab] = useState<'articles' | 'tags'>('articles')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const fetchArticlesWithTagsInternal = async () => {
      try {
        setIsLoading(true)
        console.log('🔍 データ取得開始...')
        
        // 1. AI分析済み記事を取得
        const { data: articlesData, error: articlesError } = await supabase
          .from('news_articles')
          .select('id, title, source_name, importance_score, ai_summary, published_at')
          .not('ai_summary', 'is', null)
          .order('published_at', { ascending: false })

        console.log('📰 記事データ:', articlesData?.length, '件')

        if (articlesError) {
          console.error('記事取得エラー:', articlesError)
          throw articlesError
        }

        if (!articlesData || articlesData.length === 0) {
          console.log('⚠️ AI分析済み記事なし')
          setArticles([])
          return
        }

        // 2. 各記事のタグを取得
        const articleIds = articlesData.map(article => article.id)
        console.log('🔍 タグ取得対象記事ID:', articleIds.length, '件')

        const { data: allTags, error: tagsError } = await supabase
          .from('article_tags')
          .select('article_id, tag_name, category, confidence_score, is_auto_generated')
          .in('article_id', articleIds)
          .order('confidence_score', { ascending: false })

        console.log('🏷️ 取得タグ数:', allTags?.length, '個')

        if (tagsError) {
          console.error('タグ取得エラー:', tagsError)
          // タグエラーでも記事は表示
        }

        // 3. 記事ごとにタグをグループ化
        const articlesWithTags: ArticleWithTags[] = articlesData.map(article => {
          const articleTags = allTags?.filter(tag => tag.article_id === article.id) || []
          console.log(`📄 "${article.title.substring(0, 30)}..." - タグ: ${articleTags.length}個`)
          
          return {
            ...article,
            tags: articleTags.map(tag => ({
              tag_name: tag.tag_name,
              category: tag.category,
              confidence_score: tag.confidence_score,
              is_auto_generated: tag.is_auto_generated
            }))
          }
        })

        console.log('✅ 処理完了:', articlesWithTags.length, '件')
        setArticles(articlesWithTags)
      } catch (err) {
        console.error('❌ データ取得エラー:', err)
        setError(err instanceof Error ? err.message : '不明なエラー')
      }
    }

    const fetchTagSummariesInternal = async () => {
      try {
        console.log('🏷️ タグサマリー取得開始...')
        
        const { data: allTags, error: tagsError } = await supabase
          .from('article_tags')
          .select('tag_name, category, confidence_score, is_auto_generated')
          .limit(5000)  // 1000件制限を5000件に拡張
        
        if (tagsError) {
          console.error('タグ取得エラー:', tagsError)
          throw tagsError
        }

        if (!allTags || allTags.length === 0) {
          console.log('⚠️ タグなし')
          setTagSummaries([])
          return
        }

        // タグごとに統計を計算
        const tagStats: Record<string, TagSummary> = {}
        
        allTags.forEach(tag => {
          if (!tagStats[tag.tag_name]) {
            tagStats[tag.tag_name] = {
              tag_name: tag.tag_name,
              total_usage: 0,
              is_auto_generated: tag.is_auto_generated,
              category: tag.category,
              avg_confidence: 0
            }
          }
          
          tagStats[tag.tag_name].total_usage++
          tagStats[tag.tag_name].avg_confidence += tag.confidence_score
        })

        // 平均信頼度を算出し、配列に変換
        const summaries = Object.values(tagStats).map(stat => ({
          ...stat,
          avg_confidence: stat.avg_confidence / stat.total_usage
        }))

        // 事前定義タグ優先、その後使用頻度順でソート
        summaries.sort((a, b) => {
          if (a.is_auto_generated !== b.is_auto_generated) {
            return a.is_auto_generated ? 1 : -1 // 事前定義を上位に
          }
          return b.total_usage - a.total_usage // 使用頻度順
        })

        const totalRecords = summaries.reduce((sum, tag) => sum + tag.total_usage, 0)
        console.log('✅ タグサマリー処理完了:', summaries.length, '種類')
        console.log('📊 総タグレコード数:', totalRecords, '個')
        setTagSummaries(summaries)
      } catch (err) {
        console.error('❌ タグサマリー取得エラー:', err)
        setError(err instanceof Error ? err.message : '不明なエラー')
      } finally {
        setIsLoading(false)
      }
    }

    await Promise.all([
      fetchArticlesWithTagsInternal(),
      fetchTagSummariesInternal()
    ])
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchArticlesWithTags = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 データ取得開始...')
      
      // 1. AI分析済み記事を取得
      const { data: articlesData, error: articlesError } = await supabase
        .from('news_articles')
        .select('id, title, source_name, importance_score, ai_summary, published_at')
        .not('ai_summary', 'is', null)
        .order('published_at', { ascending: false })

      console.log('📰 記事データ:', articlesData?.length, '件')

      if (articlesError) {
        console.error('記事取得エラー:', articlesError)
        throw articlesError
      }

      if (!articlesData || articlesData.length === 0) {
        console.log('⚠️ AI分析済み記事なし')
        setArticles([])
        return
      }

      // 2. 各記事のタグを一括取得（効率化）
      const articleIds = articlesData.map(article => article.id)
      console.log('🔍 タグ取得対象記事ID:', articleIds.length, '件')

      const { data: allTags, error: tagsError } = await supabase
        .from('article_tags')
        .select('article_id, tag_name, category, confidence_score, is_auto_generated')
        .in('article_id', articleIds)
        .order('confidence_score', { ascending: false })

      console.log('🏷️ 取得タグ数:', allTags?.length, '個')

      if (tagsError) {
        console.error('タグ取得エラー:', tagsError)
        // タグエラーでも記事は表示
      }

      // 3. 記事ごとにタグをグループ化
      const articlesWithTags: ArticleWithTags[] = articlesData.map(article => {
        const articleTags = allTags?.filter(tag => tag.article_id === article.id) || []
        console.log(`📄 "${article.title.substring(0, 30)}..." - タグ: ${articleTags.length}個`)
        
        return {
          ...article,
          tags: articleTags.map(tag => ({
            tag_name: tag.tag_name,
            category: tag.category,
            confidence_score: tag.confidence_score,
            is_auto_generated: tag.is_auto_generated
          }))
        }
      })

      console.log('✅ 処理完了:', articlesWithTags.length, '件')
      setArticles(articlesWithTags)
    } catch (err) {
      console.error('❌ データ取得エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    }
  }

  const fetchTagSummaries = async () => {
    try {
      console.log('🏷️ タグサマリー取得開始...')
      
      const { data: allTags, error: tagsError } = await supabase
        .from('article_tags')
        .select('tag_name, category, confidence_score, is_auto_generated')
        .limit(5000)  // 1000件制限を5000件に拡張
      
      if (tagsError) {
        console.error('タグ取得エラー:', tagsError)
        throw tagsError
      }

      console.log('📊 取得タグ数:', allTags?.length, '個')

      if (!allTags || allTags.length === 0) {
        setTagSummaries([])
        return
      }

      // タグごとに集計
      const tagStats: { [key: string]: TagSummary } = {}
      
      allTags.forEach(tag => {
        if (!tagStats[tag.tag_name]) {
          tagStats[tag.tag_name] = {
            tag_name: tag.tag_name,
            total_usage: 0,
            is_auto_generated: tag.is_auto_generated,
            category: tag.category,
            avg_confidence: 0
          }
        }
        
        tagStats[tag.tag_name].total_usage++
        tagStats[tag.tag_name].avg_confidence += tag.confidence_score
      })

      // 平均信頼度を算出し、配列に変換
      const summaries = Object.values(tagStats).map(stat => ({
        ...stat,
        avg_confidence: stat.avg_confidence / stat.total_usage
      }))

      // 事前定義タグ優先、その後使用頻度順でソート
      summaries.sort((a, b) => {
        if (a.is_auto_generated !== b.is_auto_generated) {
          return a.is_auto_generated ? 1 : -1 // 事前定義を上位に
        }
        return b.total_usage - a.total_usage // 使用頻度順
      })

      const totalRecords = summaries.reduce((sum, tag) => sum + tag.total_usage, 0)
      console.log('✅ タグサマリー処理完了:', summaries.length, '種類')
      console.log('📊 総タグレコード数:', totalRecords, '個')
      setTagSummaries(summaries)
    } catch (err) {
      console.error('❌ タグサマリー取得エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setIsLoading(false)
    }
  }

  const getTagTypeIcon = (isAutoGenerated: boolean) => {
    return isAutoGenerated ? '🔄' : '📌'
  }

  const getTagTypeLabel = (isAutoGenerated: boolean) => {
    return isAutoGenerated ? '自動生成' : '事前定義'
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50'
    if (score >= 0.7) return 'text-blue-600 bg-blue-50'
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="flex space-x-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-6 w-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
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
                📰 記事タグビューアー
              </h1>
              <p className="text-gray-600">
                AI分析済み記事のタグを詳細表示・タグ管理
              </p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← ニュース一覧に戻る
            </Link>
          </div>

          {/* タブナビゲーション */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('articles')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'articles'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📰 記事別タグ表示 ({articles.length}件)
                </button>
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tags'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🏷️ タグ管理画面 ({tagSummaries.length}種類)
                </button>
              </nav>
            </div>
          </div>
          
          {/* 統計情報 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{articles.length}</div>
              <div className="text-sm text-gray-600">AI分析済み記事</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {tagSummaries.reduce((sum, tag) => sum + tag.total_usage, 0)}
              </div>
              <div className="text-sm text-gray-600">総タグ数（レコード）</div>
              <div className="text-xs text-gray-400 mt-1">
                計算: {tagSummaries.length}種類のタグ集計
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {tagSummaries.filter(tag => !tag.is_auto_generated).length}
              </div>
              <div className="text-sm text-gray-600">📌 事前定義タグ種類</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">
                {tagSummaries.filter(tag => tag.is_auto_generated).length}
              </div>
              <div className="text-sm text-gray-600">🔄 自動生成タグ種類</div>
            </div>
          </div>
        </div>

        {/* コンテンツエリア */}
        {activeTab === 'articles' && (
          <>
            {/* 記事一覧 */}
            {articles.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI分析済みの記事が見つかりません
                </h3>
                <p className="text-gray-500">
                  RSS収集を実行してAI分析を行ってください
                </p>
              </div>
            ) : (
          <div className="space-y-6">
            {articles.map((article, index) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 記事ヘッダー */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <span className="mr-2">#{index + 1}</span>
                        <span className="mr-4">📺 {article.source_name}</span>
                        <span className="mr-4">⭐ 重要度: {article.importance_score}</span>
                        <span>📅 {new Date(article.published_at).toLocaleDateString('ja-JP')}</span>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {article.title}
                      </h2>
                      {article.ai_summary && (
                        <p className="text-gray-700 text-sm bg-white p-3 rounded border">
                          📝 AI要約: {article.ai_summary.substring(0, 200)}
                          {article.ai_summary.length > 200 && '...'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* タグセクション */}
                <div className="px-6 py-4">
                  {article.tags.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      🏷️ タグはありません
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          🏷️ タグ ({article.tags.length}個)
                        </h3>
                        <div className="text-sm text-gray-500">
                          信頼度順に表示
                        </div>
                      </div>
                      <div className="space-y-2">
                        {article.tags.map((tag, tagIndex) => (
                          <div
                            key={tagIndex}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{getTagTypeIcon(tag.is_auto_generated)}</span>
                              <div>
                                <span className="font-medium text-gray-900">{tag.tag_name}</span>
                                <div className="text-sm text-gray-500">
                                  <span className="mr-3">[{tag.category}]</span>
                                  <span>{getTagTypeLabel(tag.is_auto_generated)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(tag.confidence_score)}`}>
                                {(tag.confidence_score * 100).toFixed(0)}%
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                信頼度
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}

        {activeTab === 'tags' && (
          <>
            {/* タグ管理画面 */}
            {tagSummaries.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏷️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  タグが見つかりません
                </h3>
                <p className="text-gray-500">
                  まずは記事のAI分析を実行してタグを生成してください
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 事前定義タグセクション */}
                <div className="bg-white rounded-lg shadow-md">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <span className="text-2xl mr-3">📌</span>
                      事前定義タグ ({tagSummaries.filter(tag => !tag.is_auto_generated).length}種類)
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      システムで事前に定義されたタグ（高信頼度・手動管理）
                    </p>
                  </div>
                  <div className="p-6">
                    {tagSummaries.filter(tag => !tag.is_auto_generated).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📝</div>
                        <p>事前定義タグはまだありません</p>
                        <p className="text-sm">自動生成タグから候補を選んで事前定義化を検討してください</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tagSummaries
                          .filter(tag => !tag.is_auto_generated)
                          .map((tag, index) => (
                            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-lg">📌</span>
                                    <span className="font-semibold text-gray-900">{tag.tag_name}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>カテゴリ: [{tag.category}]</div>
                                    <div>使用回数: {tag.total_usage}回</div>
                                    <div>平均信頼度: {(tag.avg_confidence * 100).toFixed(0)}%</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                                    事前定義
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 自動生成タグセクション */}
                <div className="bg-white rounded-lg shadow-md">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <span className="text-2xl mr-3">🔄</span>
                      自動生成タグ ({tagSummaries.filter(tag => tag.is_auto_generated).length}種類)
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Gemini 2.5 Flash AIによって自動生成されたタグ（使用頻度順）
                    </p>
                  </div>
                  <div className="p-6">
                    {tagSummaries.filter(tag => tag.is_auto_generated).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">🤖</div>
                        <p>自動生成タグはまだありません</p>
                        <p className="text-sm">記事のAI分析を実行してタグを生成してください</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tagSummaries
                          .filter(tag => tag.is_auto_generated)
                          .slice(0, 50) // 最初の50個のみ表示
                          .map((tag, index) => (
                            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-lg">🔄</span>
                                    <span className="font-semibold text-gray-900">{tag.tag_name}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>カテゴリ: [{tag.category}]</div>
                                    <div>使用回数: {tag.total_usage}回</div>
                                    <div>平均信頼度: {(tag.avg_confidence * 100).toFixed(0)}%</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`px-2 py-1 rounded text-sm font-medium ${
                                    tag.total_usage >= 3 && tag.avg_confidence >= 0.8
                                      ? 'bg-green-100 text-green-800'
                                      : tag.total_usage >= 2 && tag.avg_confidence >= 0.7
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {tag.total_usage >= 3 && tag.avg_confidence >= 0.8
                                      ? '推奨'
                                      : tag.total_usage >= 2 && tag.avg_confidence >= 0.7
                                      ? '検討'
                                      : '自動生成'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    {tagSummaries.filter(tag => tag.is_auto_generated).length > 50 && (
                      <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                          他 {tagSummaries.filter(tag => tag.is_auto_generated).length - 50} 個のタグがあります
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>最終更新: {new Date().toLocaleString('ja-JP')}</p>
          <p className="mt-1">
            <span className="mr-4">🔄 自動生成タグ: Gemini 2.5 Flash による分析</span>
            <span>📌 事前定義タグ: システム定義済み</span>
          </p>
        </div>
      </div>
    </div>
  )
}