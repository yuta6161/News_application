import { supabase } from '@/lib/supabase'

async function checkTranslationStatus() {
  try {
    console.log('🔍 翻訳状況を確認中...')
    
    // 英語記事の翻訳状況をチェック
    const { data: englishArticles, error } = await supabase
      .from('news_articles')
      .select('id, title, original_language, source_name, created_at')
      .eq('original_language', 'en')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ データ取得エラー:', error)
      return
    }
    
    if (!englishArticles || englishArticles.length === 0) {
      console.log('📭 英語記事が見つかりません')
      return
    }
    
    console.log(`📊 英語記事数: ${englishArticles.length}件`)
    console.log('\n📝 記事タイトル確認:')
    
    englishArticles.forEach((article, index) => {
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(article.title)
      const status = hasJapanese ? '✅ 日本語' : '❌ 英語のまま'
      
      console.log(`\n[${index + 1}] ${status}`)
      console.log(`ID: ${article.id}`)
      console.log(`タイトル: ${article.title}`)
      console.log(`ソース: ${article.source_name}`)
      console.log(`作成日: ${new Date(article.created_at).toLocaleString()}`)
    })
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
checkTranslationStatus()