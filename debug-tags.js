// 事前定義タグの詳細調査スクリプト
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

async function debugTags() {
  console.log('🔍 1571件記事の事前定義タグ詳細調査...')
  
  // 全記事IDを取得（バッチ処理）
  let allArticles = []
  let hasMore = true
  let offset = 0
  const limit = 1000
  
  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('news_articles')
      .select('id')
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('記事取得エラー:', error)
      break
    }
    
    if (batch && batch.length > 0) {
      allArticles = [...allArticles, ...batch]
      offset += limit
      hasMore = batch.length === limit
      console.log(`📰 記事バッチ取得: ${batch.length}件 (累計: ${allArticles.length}件)`)
    } else {
      hasMore = false
    }
  }
  
  console.log('📊 取得記事数:', allArticles.length)
  const articleIds = allArticles.map(a => a.id)
  
  // 全タグを取得（バッチ処理）
  let allTags = []
  const batchSize = 100
  const batches = []
  for (let i = 0; i < articleIds.length; i += batchSize) {
    batches.push(articleIds.slice(i, i + batchSize))
  }
  
  console.log(`📦 ${batches.length}個のタグ取得バッチに分割`)
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const { data: batchTags, error } = await supabase
      .from('article_tags')
      .select('article_id, tag_name, is_auto_generated')
      .in('article_id', batch)
    
    if (error) {
      console.error(`バッチ${i + 1}エラー:`, error.message)
      continue
    }
    
    if (batchTags) {
      allTags = [...allTags, ...batchTags]
    }
  }
  
  const tags = allTags
  
  console.log('🏷️ 全タグ数:', tags?.length)
  
  const predefinedTags = tags?.filter(t => !t.is_auto_generated) || []
  const autoTags = tags?.filter(t => t.is_auto_generated) || []
  
  console.log('📌 事前定義タグレコード数:', predefinedTags.length)
  console.log('🔄 自動生成タグレコード数:', autoTags.length)
  
  const uniquePredefined = new Set(predefinedTags.map(t => t.tag_name))
  const uniqueAuto = new Set(autoTags.map(t => t.tag_name))
  
  console.log('📌 事前定義タグ種類数:', uniquePredefined.size)
  console.log('🔄 自動生成タグ種類数:', uniqueAuto.size)
  console.log('📌 事前定義タグ種類:', Array.from(uniquePredefined))
}

debugTags().catch(console.error)