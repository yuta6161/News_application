'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  console.log('🎬 ArticleTagsPageコンポーネント開始')
  const [articles, setArticles] = useState<ArticleWithTags[]>([])
  const [tagSummaries, setTagSummaries] = useState<TagSummary[]>([])
  const [activeTab, setActiveTab] = useState<'articles' | 'tags'>('articles')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 検索・ページネーション用の新しい状態
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredArticles, setFilteredArticles] = useState<ArticleWithTags[]>([])
  const articlesPerPage = 100

  console.log('🚀 データロード開始（即座実行）')
  
  // 初期化フラグ
  const [initialized, setInitialized] = useState(false)
  
  // ページごとのデータロード関数
  const loadPageData = async (page: number) => {
    try {
      setIsLoading(true)
      console.log(`🔍 ページ${page}のデータ取得開始...`)
      
      const offset = (page - 1) * articlesPerPage
      
      // ページ分の記事のみ取得
      const { data: articlesData, error, count } = await supabase
        .from('news_articles')
        .select('id, title, source_name, importance_score, ai_summary, published_at', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(offset, offset + articlesPerPage - 1)

      console.log(`📰 ページ${page}取得完了:`, articlesData?.length, '件')
      console.log('📊 総記事数:', count, '件')

      if (error) {
        console.error('❌ エラー:', error)
        setError(error.message)
        return
      }

      if (articlesData && articlesData.length > 0) {
        // このページの記事IDのタグのみ取得
        const articleIds = articlesData.map(article => article.id)
        
        console.log(`🏷️ ページ${page}のタグデータ取得開始...`, articleIds.length, '記事')
        
        const { data: tagData, error: tagError } = await supabase
          .from('article_tags')
          .select('article_id, tag_name, category, confidence_score, is_auto_generated')
          .in('article_id', articleIds)
          .order('confidence_score', { ascending: false })
        
        console.log(`🏷️ ページ${page}タグデータ取得完了:`, tagData?.length, '件')
        
        if (tagError) {
          console.error('❌ タグエラー:', tagError)
        }
        
        // 記事にタグを関連付け
        const processedArticles = articlesData.map(article => {
          const articleTags = tagData?.filter(tag => tag.article_id === article.id) || []
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

        console.log(`✅ ページ${page}データ設定完了:`, processedArticles.length, '件（タグ付き）')
        
        // 状態更新
        setArticles(processedArticles)
        setFilteredArticles(processedArticles)
        
        // 総ページ数を計算
        const totalPages = Math.ceil((count || 0) / articlesPerPage)
        console.log('📄 総ページ数:', totalPages)
        
      } else {
        setArticles([])
        setFilteredArticles([])
      }
    } catch (err) {
      console.error('❌ 例外エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setIsLoading(false)
    }
  }

  // コンポーネントマウント時に最初のページを読み込み
  if (!initialized) {
    console.log('🔥 初期化実行開始！')
    setInitialized(true)
    loadPageData(1)
  }

  // ページ変更時の処理
  const handlePageChange = (newPage: number) => {
    console.log(`🔄 ページ変更: ${currentPage} → ${newPage}`)
    setCurrentPage(newPage)
    loadPageData(newPage)
  }

  // タグサマリー用に全記事の全タグを取得（統計表示用）
  const loadTagSummariesOnly = async () => {
    try {
      console.log('🏷️ 統計表示用：全記事の全タグサマリー取得開始...')
      
      // まず全記事数を取得
      const { count: totalArticles } = await supabase
        .from('news_articles')
        .select('id', { count: 'exact' })
      
      console.log('📊 統計対象全記事数:', totalArticles, '件')
      
      // 全タグを直接取得（バッチ処理で制限なし）
      let allTags: any[] = []
      let hasMore = true
      let offset = 0
      const limit = 1000
      
      while (hasMore) {
        const { data: tagBatch, error } = await supabase
          .from('article_tags')
          .select('tag_name, category, confidence_score, is_auto_generated')
          .range(offset, offset + limit - 1)
        
        if (error) {
          console.error('❌ タグ取得エラー:', error)
          break
        }
        
        if (tagBatch && tagBatch.length > 0) {
          allTags = [...allTags, ...tagBatch]
          offset += limit
          hasMore = tagBatch.length === limit
          console.log(`🏷️ タグバッチ取得: ${tagBatch.length}件 (累計: ${allTags.length}件)`)
        } else {
          hasMore = false
        }
      }
      
      if (!allTags || allTags.length === 0) {
        console.log('⚠️ 全記事の全タグなし')
        setTagSummaries([])
        return
      }

      console.log('📊 全記事の全タグから統計計算開始:', allTags.length, '件のタグレコードから集計')
      const tagSummaryMap: { [tagName: string]: any } = {}
      
      allTags.forEach(tag => {
        if (!tagSummaryMap[tag.tag_name]) {
          tagSummaryMap[tag.tag_name] = {
            tag_name: tag.tag_name,
            category: tag.category,
            total_usage: 0,
            avg_confidence: 0,
            is_auto_generated: tag.is_auto_generated,
            confidences: []
          }
        } else {
          // 既存エントリがある場合、事前定義タグを優先
          if (!tag.is_auto_generated) {
            tagSummaryMap[tag.tag_name].is_auto_generated = false
          }
        }
        tagSummaryMap[tag.tag_name].total_usage++
        tagSummaryMap[tag.tag_name].confidences.push(tag.confidence_score)
      })

      // 平均信頼度を計算
      const tagSummaries = Object.values(tagSummaryMap).map((tag: any) => ({
        ...tag,
        avg_confidence: tag.confidences.reduce((sum: number, conf: number) => sum + conf, 0) / tag.confidences.length
      }))

      // 事前定義タグ優先、その後使用頻度順でソート
      tagSummaries.sort((a, b) => {
        if (a.is_auto_generated !== b.is_auto_generated) {
          return a.is_auto_generated ? 1 : -1 // 事前定義を上位に
        }
        return b.total_usage - a.total_usage // 使用頻度順
      })

      console.log('✅ 全記事全タグサマリー処理完了:', tagSummaries.length, '種類')
      console.log('📌 事前定義タグ種類数:', tagSummaries.filter(t => !t.is_auto_generated).length)
      console.log('🔄 自動生成タグ種類数:', tagSummaries.filter(t => t.is_auto_generated).length)
      console.log('🏷️ 全タグレコード数:', allTags.length)
      
      setTagSummaries(tagSummaries)
    } catch (err) {
      console.error('❌ 全記事全タグサマリー取得エラー:', err)
    }
  }

  // 初回のみタグサマリーを読み込み
  if (initialized && tagSummaries.length === 0) {
    loadTagSummariesOnly()
  }

  const fetchData = useCallback(async () => {
    console.log('🔥 fetchData関数実行開始')
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

        // 2. 各記事のタグを取得（バッチ処理）
        const articleIds = articlesData.map(article => article.id)
        console.log('🔍 タグ取得対象記事ID:', articleIds.length, '件')
        
        // IDを50個ずつのバッチに分割
        const batchSize = 50
        const batches = []
        for (let i = 0; i < articleIds.length; i += batchSize) {
          batches.push(articleIds.slice(i, i + batchSize))
        }
        console.log(`📦 ${batches.length}個のバッチに分割`)
        
        // 各バッチでタグを取得
        let allTags: any[] = []
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          const { data: batchTags, error: batchError } = await supabase
            .from('article_tags')
            .select('article_id, tag_name, category, confidence_score, is_auto_generated')
            .in('article_id', batch)
            .order('confidence_score', { ascending: false })
          
          if (batchError) {
            console.error(`❌ バッチ${i + 1}エラー:`, batchError.message)
            continue
          }
          
          if (batchTags) {
            allTags = [...allTags, ...batchTags]
          }
        }
        
        console.log('🏷️ 取得タグ数:', allTags.length, '個')

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
        // 初期フィルタリング状態を設定
        setFilteredArticles(articlesWithTags)
      } catch (err) {
        console.error('❌ データ取得エラー:', err)
        setError(err instanceof Error ? err.message : '不明なエラー')
      }
    }

    const fetchTagSummariesInternal = async () => {
      try {
        console.log('🏷️ タグサマリー取得開始...')
        
        // バッチ処理でタグを取得（制限回避）
        let allTags: any[] = []
        const limit = 1000
        let offset = 0
        let hasMore = true
        
        while (hasMore) {
          const { data: batch, error: tagsError } = await supabase
            .from('article_tags')
            .select('tag_name, category, confidence_score, is_auto_generated')
            .range(offset, offset + limit - 1)
          
          if (tagsError) {
            console.error('タグ取得エラー:', tagsError)
            break
          }
          
          if (batch) {
            allTags = [...allTags, ...batch]
            offset += limit
            hasMore = batch.length === limit
          } else {
            hasMore = false
          }
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
  
  // 検索モード管理
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [allArticlesForSearch, setAllArticlesForSearch] = useState<ArticleWithTags[]>([])
  
  // 検索用に全記事をロード
  const loadAllArticlesForSearch = async () => {
    if (allArticlesForSearch.length > 0) return // 既にロード済み
    
    try {
      setIsLoading(true)
      console.log('🔍 検索用全記事ロード開始...')
      
      // 全記事を取得（バッチ処理）
      let allArticles: any[] = []
      let hasMore = true
      let offset = 0
      const limit = 1000
      
      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from('news_articles')
          .select('id, title, source_name, importance_score, ai_summary, published_at')
          .order('published_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (batchError) {
          console.error('❌ 記事取得エラー:', batchError)
          break
        }
        
        if (batch && batch.length > 0) {
          allArticles = [...allArticles, ...batch]
          offset += limit
          hasMore = batch.length === limit
          console.log(`📰 検索用記事バッチ取得: ${batch.length}件 (累計: ${allArticles.length}件)`)
        } else {
          hasMore = false
        }
      }
      
      // 全記事のタグを取得
      const articleIds = allArticles.map(a => a.id)
      let allTags: any[] = []
      const batchSize = 100
      const batches = []
      for (let i = 0; i < articleIds.length; i += batchSize) {
        batches.push(articleIds.slice(i, i + batchSize))
      }
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const { data: batchTags } = await supabase
          .from('article_tags')
          .select('article_id, tag_name, category, confidence_score, is_auto_generated')
          .in('article_id', batch)
        
        if (batchTags) {
          allTags = [...allTags, ...batchTags]
        }
      }
      
      // 記事にタグを関連付け
      const processedArticles = allArticles.map(article => {
        const articleTags = allTags?.filter(tag => tag.article_id === article.id) || []
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
      
      setAllArticlesForSearch(processedArticles)
      console.log('✅ 検索用全記事ロード完了:', processedArticles.length, '件')
    } catch (err) {
      console.error('❌ 検索用記事ロードエラー:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 検索フィルタリング処理
  useEffect(() => {
    if (!searchQuery) {
      // 検索なし：ページネーションモード
      setIsSearchMode(false)
      setFilteredArticles([])
    } else {
      // 検索あり：検索モード
      setIsSearchMode(true)
      if (allArticlesForSearch.length === 0) {
        loadAllArticlesForSearch() // 初回のみ全記事ロード
      } else {
        // 検索実行
        const query = searchQuery.toLowerCase()
        const filtered = allArticlesForSearch.filter(article => {
          const titleMatch = article.title.toLowerCase().includes(query)
          const sourceMatch = article.source_name.toLowerCase().includes(query)
          const summaryMatch = article.ai_summary?.toLowerCase().includes(query) || false
          const tagMatch = article.tags.some(tag => 
            tag.tag_name.toLowerCase().includes(query) ||
            tag.category.toLowerCase().includes(query)
          )
          return titleMatch || sourceMatch || summaryMatch || tagMatch
        })
        setFilteredArticles(filtered)
        setCurrentPage(1) // 検索時はページをリセット
      }
    }
  }, [searchQuery, allArticlesForSearch])
  
  // 総記事数とページ数（記事タブ表示用）
  const [totalArticleCount, setTotalArticleCount] = useState(0)
  const totalPages = Math.ceil(totalArticleCount / articlesPerPage)
  
  // 初回に総記事数を取得
  if (initialized && totalArticleCount === 0) {
    supabase
      .from('news_articles')
      .select('id', { count: 'exact' })
      .then(({ count }) => {
        if (count) {
          setTotalArticleCount(count)
          console.log('📊 総記事数設定:', count)
        }
      })
  }

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

      // 2. 各記事のタグを取得（バッチ処理）
      const articleIds = articlesData.map(article => article.id)
      console.log('🔍 タグ取得対象記事ID:', articleIds.length, '件')
      
      // IDを50個ずつのバッチに分割
      const batchSize = 50
      const batches = []
      for (let i = 0; i < articleIds.length; i += batchSize) {
        batches.push(articleIds.slice(i, i + batchSize))
      }
      console.log(`📦 ${batches.length}個のバッチに分割`)
      
      // 各バッチでタグを取得
      let allTags: any[] = []
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const { data: batchTags, error: batchError } = await supabase
          .from('article_tags')
          .select('article_id, tag_name, category, confidence_score, is_auto_generated')
          .in('article_id', batch)
          .order('confidence_score', { ascending: false })
        
        if (batchError) {
          console.error(`❌ バッチ${i + 1}エラー:`, batchError.message)
          continue
        }
        
        if (batchTags) {
          allTags = [...allTags, ...batchTags]
        }
      }
      
      console.log('🏷️ 取得タグ数:', allTags.length, '個')

      // 3. 記事ごとにタグをグループ化
      const articlesWithTags: ArticleWithTags[] = articlesData.map(article => {
        const articleTags = allTags?.filter(tag => tag.article_id === article.id) || []
        console.log(`📄 "${article.title.substring(0, 30)}..." - タグ: ${articleTags.length}個`)
        
        // デバッグ: 最初の記事のタグ詳細を表示
        if (articlesData.indexOf(article) === 0 && articleTags.length > 0) {
          console.log('🔍 最初の記事のタグ詳細:', articleTags.slice(0, 3))
        }
        
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
      // 初期フィルタリング状態を設定
      setFilteredArticles(articlesWithTags)
    } catch (err) {
      console.error('❌ データ取得エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    }
  }

  const fetchTagSummaries = async () => {
    try {
      console.log('🏷️ タグサマリー取得開始...')
      
      // バッチ処理でタグを取得（制限回避）
      let allTags: any[] = []
      const limit = 1000
      let offset = 0
      let hasMore = true
      
      while (hasMore) {
        const { data: batch, error: tagsError } = await supabase
          .from('article_tags')
          .select('tag_name, category, confidence_score, is_auto_generated')
          .range(offset, offset + limit - 1)
        
        if (tagsError) {
          console.error('タグ取得エラー:', tagsError)
          break
        }
        
        if (batch) {
          allTags = [...allTags, ...batch]
          offset += limit
          hasMore = batch.length === limit
        } else {
          hasMore = false
        }
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
    <div className="min-h-screen bg-gray-50 py-8 text-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">
                📰 記事タグビューアー <span className="text-lg text-gray-600">(ページ{currentPage})</span>
              </h1>
              <p className="text-gray-800">
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

          {/* 検索ボックス（記事タブの時のみ表示） */}
          {activeTab === 'articles' && (
            <div className="mt-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="記事タイトル、タグ、ソース名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchQuery && isSearchMode && (
                <p className="mt-2 text-sm text-gray-600">
                  「{searchQuery}」の検索結果: {filteredArticles.length}件
                </p>
              )}
              {!searchQuery && (
                <p className="mt-2 text-sm text-gray-500">
                  💡 検索なし：高速ページネーション / 検索あり：全記事から検索
                </p>
              )}
            </div>
          )}
          
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
                  📰 記事別タグ表示 ({totalArticleCount}件)
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
              <div className="text-2xl font-bold text-blue-600">{totalArticleCount}</div>
              <div className="text-sm text-gray-800">全記事数</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {tagSummaries.reduce((sum, tag) => sum + tag.total_usage, 0)}
              </div>
              <div className="text-sm text-gray-800">総タグ数（レコード）</div>
              <div className="text-xs text-gray-400 mt-1">
                計算: {tagSummaries.length}種類のタグ集計
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">
                {tagSummaries.filter(tag => !tag.is_auto_generated).length}
              </div>
              <div className="text-sm text-gray-800">📌 事前定義タグ種類</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">
                {tagSummaries.filter(tag => tag.is_auto_generated).length}
              </div>
              <div className="text-sm text-gray-800">🔄 自動生成タグ種類</div>
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
              <div>
                {/* ページネーション上部（検索モードでは非表示） */}
                {!isSearchMode && totalPages > 1 && (
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      全{totalArticleCount}件中 {(currentPage - 1) * articlesPerPage + 1}-{Math.min(currentPage * articlesPerPage, totalArticleCount)}件を表示
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← 前へ
                      </button>
                      <span className="px-3 py-1">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        次へ →
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* 検索モード時は filteredArticles、ページネーションモード時は articles を表示 */}
                  {(isSearchMode ? filteredArticles : articles).map((article, index) => (
                    <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 記事ヘッダー */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <span className="mr-2">#{isSearchMode ? index + 1 : (currentPage - 1) * articlesPerPage + index + 1}</span>
                        <span className="mr-4">📺 {article.source_name}</span>
                        <span className="mr-4">⭐ 重要度: {article.importance_score}</span>
                        <span>📅 {new Date(article.published_at).toLocaleDateString('ja-JP')}</span>
                      </div>
                      <h2 className="text-xl font-semibold text-black mb-2">
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
                
                {/* ページネーション下部（検索モードでは非表示） */}
                {!isSearchMode && totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← 前へ
                      </button>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        次へ →
                      </button>
                    </div>
                  </div>
                )}
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