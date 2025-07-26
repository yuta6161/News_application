import { supabase } from '@/lib/supabase'
import { getGeminiFlash } from '@/lib/ai/gemini'

async function translateAllEnglishTitles() {
  try {
    console.log('🌐 英語タイトルの日本語翻訳を開始（修正版）...')
    
    // 1. 英語タイトルの記事を取得
    const { data: englishArticles, error: fetchError } = await supabase
      .from('news_articles')
      .select('id, title, source_name, original_language')
      .eq('original_language', 'en')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ 記事取得エラー:', fetchError)
      return
    }
    
    if (!englishArticles || englishArticles.length === 0) {
      console.log('📭 英語タイトルの記事が見つかりません')
      return
    }
    
    console.log(`📊 対象記事数: ${englishArticles.length}件`)
    
    // 2. 日本語文字が含まれていない記事のみフィルタリング
    const needsTranslation = englishArticles.filter(article => {
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(article.title)
      return !hasJapanese
    })
    
    console.log(`🔄 翻訳対象記事: ${needsTranslation.length}件`)
    
    if (needsTranslation.length === 0) {
      console.log('✅ すべて翻訳済みです')
      return
    }
    
    // 3. Geminiモデル初期化
    const model = getGeminiFlash()
    let successCount = 0
    let errorCount = 0
    
    // 4. 記事を1件ずつ翻訳
    for (let i = 0; i < needsTranslation.length; i++) {
      const article = needsTranslation[i]
      const progress = `[${i + 1}/${needsTranslation.length}]`
      
      try {
        console.log(`\\n${progress} 翻訳中...`)
        console.log(`   タイトル: ${article.title.substring(0, 60)}...`)
        console.log(`   ソース: ${article.source_name}`)
        
        // Gemini翻訳
        const prompt = `以下の英語ニュースタイトルを、自然な日本語に翻訳してください。

英語タイトル: ${article.title}

**指示:**
1. ニュースタイトルとして自然な日本語に翻訳
2. 専門用語は適切に日本語化（企業名等の固有名詞は原則そのまま）
3. 長すぎる場合は要点を損なわない範囲で短縮可能

翻訳した日本語タイトルのみを出力してください（説明不要）。`
        
        const result = await model.generateContent(prompt)
        const translatedTitle = result.response.text().trim()
        
        console.log(`   🤖 翻訳結果: ${translatedTitle}`)
        
        // データベース更新
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({ title: translatedTitle })
          .eq('id', article.id)
        
        if (updateError) {
          console.error(`   ❌ 更新エラー:`, updateError.message)
          errorCount++
        } else {
          console.log(`   ✅ 更新完了`)
          successCount++
        }
        
        // API制限対策（少し短めに）
        await new Promise(resolve => setTimeout(resolve, 800))
        
      } catch (error) {
        console.error(`${progress} 翻訳エラー:`, error)
        errorCount++
      }
    }
    
    console.log('\\n📊 翻訳完了サマリー:')
    console.log(`   ✅ 成功: ${successCount}件`)
    console.log(`   ❌ エラー: ${errorCount}件`)
    console.log(`   📊 翻訳率: ${Math.round(successCount / needsTranslation.length * 100)}%`)
    
    console.log('\\n🎉 英語タイトルの日本語翻訳が完了しました！')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
translateAllEnglishTitles()