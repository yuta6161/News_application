import { supabase } from '@/lib/supabase'
import { getGeminiFlash } from '@/lib/ai/gemini'

async function debugTranslation() {
  try {
    console.log('🔍 翻訳デバッグ開始...')
    
    // 1. 1件の英語記事を取得
    const { data: articles, error: fetchError } = await supabase
      .from('news_articles')
      .select('id, title, original_language')
      .eq('original_language', 'en')
      .limit(1)
    
    if (fetchError || !articles || articles.length === 0) {
      console.error('❌ 記事取得失敗:', fetchError)
      return
    }
    
    const article = articles[0]
    console.log('📝 テスト対象記事:')
    console.log(`ID: ${article.id}`)
    console.log(`元タイトル: ${article.title}`)
    
    // 2. Geminiで翻訳
    console.log('🤖 Gemini翻訳実行中...')
    const model = getGeminiFlash()
    
    const prompt = `以下の英語ニュースタイトルを自然な日本語に翻訳してください。
    
英語タイトル: ${article.title}

翻訳した日本語タイトルのみを出力してください（説明不要）。`
    
    const result = await model.generateContent(prompt)
    const translatedTitle = result.response.text().trim()
    
    console.log(`✅ 翻訳結果: ${translatedTitle}`)
    
    // 3. データベース更新（デバッグ付き）
    console.log('💾 データベース更新中...')
    const { error: updateError } = await supabase
      .from('news_articles')
      .update({ title: translatedTitle })
      .eq('id', article.id)
    
    if (updateError) {
      console.error('❌ 更新エラー:', updateError)
      return
    }
    
    console.log('✅ 更新完了')
    
    // 4. 更新確認
    console.log('🔍 更新確認中...')
    const { data: updatedArticle, error: checkError } = await supabase
      .from('news_articles')
      .select('id, title')
      .eq('id', article.id)
      .single()
    
    if (checkError) {
      console.error('❌ 確認エラー:', checkError)
      return
    }
    
    console.log('📊 最終確認:')
    console.log(`ID: ${updatedArticle.id}`)
    console.log(`現在のタイトル: ${updatedArticle.title}`)
    
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(updatedArticle.title)
    console.log(`日本語判定: ${hasJapanese ? '✅ 日本語' : '❌ 英語のまま'}`)
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error)
  }
}

// 実行
debugTranslation()