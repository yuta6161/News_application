import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
})

export interface RSSHealthStatus {
  source_name: string
  url: string
  status: 'active' | 'inactive' | 'error' | 'blocked'
  last_check: string
  error_message?: string
  feed_last_updated?: string
  feed_items_count?: number
  database_last_article?: string
  database_articles_count: number
  diagnosis: string
}

export async function checkRSSHealth(source: {
  name: string
  url: string
}, dbArticlesCount: number, dbLatestDate?: string): Promise<RSSHealthStatus> {
  
  console.log(`🔍 ${source.name} のヘルスチェック開始...`)
  
  const healthStatus: RSSHealthStatus = {
    source_name: source.name,
    url: source.url,
    status: 'error',
    last_check: new Date().toISOString(),
    database_articles_count: dbArticlesCount,
    database_last_article: dbLatestDate,
    diagnosis: ''
  }

  try {
    // 1. RSS フィードへの実際のアクセステスト
    console.log(`📡 ${source.name} へのRSSアクセステスト...`)
    
    const feed = await parser.parseURL(source.url)
    
    healthStatus.feed_items_count = feed.items?.length || 0
    healthStatus.feed_last_updated = feed.lastBuildDate || feed.items?.[0]?.pubDate || feed.items?.[0]?.isoDate
    
    console.log(`✅ ${source.name} RSS取得成功: ${healthStatus.feed_items_count}件`)
    console.log(`🔍 フィード詳細:`, {
      lastBuildDate: feed.lastBuildDate,
      firstItemPubDate: feed.items?.[0]?.pubDate,
      firstItemTitle: feed.items?.[0]?.title?.substring(0, 50)
    })
    
    
    // 2. フィードの健全性チェック
    if (healthStatus.feed_items_count === 0) {
      healthStatus.status = 'inactive'
      healthStatus.diagnosis = 'RSSフィードにアイテムがありません（サイト更新停止の可能性）'
      return healthStatus
    }

    // 3. フィードとデータベースの比較分析
    const feedLatestDate = feed.items?.[0]?.pubDate 
      ? new Date(feed.items[0].pubDate) 
      : feed.items?.[0]?.isoDate 
        ? new Date(feed.items[0].isoDate)
        : null
    const dbLatestDateParsed = dbLatestDate ? new Date(dbLatestDate) : null
    
    console.log(`🔍 日付解析:`, {
      feedLatestDateRaw: feed.items?.[0]?.pubDate || feed.items?.[0]?.isoDate,
      feedLatestDateParsed: feedLatestDate,
      dbLatestDateRaw: dbLatestDate,
      dbLatestDateParsed: dbLatestDateParsed
    })
    
    if (feedLatestDate && dbLatestDateParsed) {
      const daysDiff = Math.floor((feedLatestDate.getTime() - dbLatestDateParsed.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 1) {
        healthStatus.status = 'error'
        healthStatus.diagnosis = `RSS取得システムの問題: フィードには新しい記事があるがDB未反映（${daysDiff}日分の遅れ）`
      } else if (dbLatestDateParsed) {
        const daysSinceLatest = Math.floor((Date.now() - dbLatestDateParsed.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceLatest <= 7) {
          healthStatus.status = 'active'
          healthStatus.diagnosis = '正常稼働中: RSS取得・DB保存ともに正常'
        } else if (daysSinceLatest <= 30) {
          healthStatus.status = 'inactive'
          healthStatus.diagnosis = `更新停滞: ${daysSinceLatest}日間新しい記事がありません（サイト側の更新停止）`
        } else {
          healthStatus.status = 'error'
          healthStatus.diagnosis = `長期停止: ${daysSinceLatest}日間更新なし（サイト問題またはシステム障害）`
        }
      }
    } else if (feedLatestDate && !dbLatestDateParsed) {
      // より詳細なチェック：過去24時間以内に記事が保存されているかチェック
      const { supabase } = await import('@/lib/supabase')
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      const { data: recentArticles } = await supabase
        .from('news_articles')
        .select('id')
        .eq('source_name', source.name)
        .gte('created_at', oneDayAgo.toISOString())
        .limit(1)
      
      if (!recentArticles || recentArticles.length === 0) {
        healthStatus.status = 'error'
        healthStatus.diagnosis = 'RSS取得システムの問題: フィードに記事があるがDBに保存されていません'
      } else {
        healthStatus.status = 'active'
        healthStatus.diagnosis = '正常稼働中: RSS取得・DB保存ともに正常（最新記事は24時間以内に保存済み）'
      }
    } else if (!feedLatestDate && dbLatestDateParsed) {
      healthStatus.status = 'inactive'
      healthStatus.diagnosis = '元サイト更新停止: データベースには記事があるがRSSフィードが空です'
    } else {
      healthStatus.status = 'error'
      healthStatus.diagnosis = '完全停止: RSSフィード・データベース共に記事がありません'
    }

  } catch (error) {
    console.error(`❌ ${source.name} RSSアクセスエラー:`, error)
    
    healthStatus.error_message = error instanceof Error ? error.message : String(error)
    
    // エラーの種類に応じた診断
    if (healthStatus.error_message.includes('403')) {
      healthStatus.status = 'blocked'
      healthStatus.diagnosis = 'アクセス拒否: サイトがRSSアクセスをブロックしています（403エラー）'
    } else if (healthStatus.error_message.includes('404')) {
      healthStatus.status = 'error'
      healthStatus.diagnosis = 'RSS URL無効: フィードが見つかりません（404エラー）'
    } else if (healthStatus.error_message.includes('timeout')) {
      healthStatus.status = 'error'
      healthStatus.diagnosis = 'タイムアウト: サイトの応答が遅すぎます'
    } else if (healthStatus.error_message.includes('ENOTFOUND')) {
      healthStatus.status = 'error'
      healthStatus.diagnosis = 'DNS解決失敗: ドメイン名が解決できません'
    } else {
      healthStatus.status = 'error'
      healthStatus.diagnosis = `不明なエラー: ${healthStatus.error_message}`
    }

    // データベースに記事があれば過去の状況を反映
    if (dbArticlesCount > 0) {
      healthStatus.diagnosis += ` (過去${dbArticlesCount}件の記事は取得済み)`
    }
  }

  console.log(`📋 ${source.name} 診断結果: ${healthStatus.status} - ${healthStatus.diagnosis}`)
  return healthStatus
}

export async function performBulkRSSHealthCheck(): Promise<RSSHealthStatus[]> {
  const { rssSources } = await import('@/lib/rss-sources')
  const { supabase } = await import('@/lib/supabase')
  
  console.log('🏥 RSS一括ヘルスチェック開始...')
  
  const results: RSSHealthStatus[] = []
  
  for (const source of rssSources) {
    try {
      // データベースの記事情報を取得
      const { data: articles } = await supabase
        .from('news_articles')
        .select('created_at')
        .eq('source_name', source.name)
        .order('created_at', { ascending: false })
        .limit(1)
      
      const dbArticlesCount = await supabase
        .from('news_articles')
        .select('id', { count: 'exact' })
        .eq('source_name', source.name)
      
      const healthStatus = await checkRSSHealth(
        source,
        dbArticlesCount.count || 0,
        articles?.[0]?.created_at
      )
      
      results.push(healthStatus)
      
      // API制限対策
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ ${source.name} ヘルスチェックエラー:`, error)
    }
  }
  
  console.log('✅ RSS一括ヘルスチェック完了')
  return results
}