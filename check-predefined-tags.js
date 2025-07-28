// 事前定義タグの確認スクリプト
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPredefinedTags() {
  console.log('🔍 事前定義タグの確認開始...')
  
  // 全タグ数
  const { data: allTags, error: allError } = await supabase
    .from('article_tags')
    .select('*', { count: 'exact', head: true })
  
  console.log('📊 総タグ数:', allTags?.length || 0)
  
  // 事前定義タグ数
  const { data: predefinedTags, error: predefinedError } = await supabase
    .from('article_tags')
    .select('*', { count: 'exact' })
    .eq('is_auto_generated', false)
  
  console.log('📌 事前定義タグ数:', predefinedTags?.length || 0)
  
  // 自動生成タグ数
  const { data: autoTags, error: autoError } = await supabase
    .from('article_tags')
    .select('*', { count: 'exact' })
    .eq('is_auto_generated', true)
  
  console.log('🔄 自動生成タグ数:', autoTags?.length || 0)
  
  // 事前定義タグのサンプル表示
  if (predefinedTags && predefinedTags.length > 0) {
    console.log('📌 事前定義タグのサンプル:')
    predefinedTags.slice(0, 5).forEach(tag => {
      console.log(`  - ${tag.tag_name} (${tag.category})`)
    })
  } else {
    console.log('⚠️ 事前定義タグが見つかりませんでした')
  }
}

checkPredefinedTags().catch(console.error)