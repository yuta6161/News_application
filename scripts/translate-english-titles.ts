import { supabase } from '@/lib/supabase'
import { getGeminiFlash } from '@/lib/ai/gemini'

async function translateEnglishTitles() {
  try {
    console.log('🌐 英語タイトルの日本語翻訳を開始...')
    
    // 1. 英語タイトルの記事を取得
    const { data: englishArticles, error: fetchError } = await supabase
      .from('news_articles')
      .select('id, title, source_name, summary, original_language')
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
    
    console.log(`📊 英語記事数: ${englishArticles.length}件`)
    
    // 2. タイトルが日本語に見えない記事を特定
    const needsTranslation = englishArticles.filter(article => {
      // 日本語文字（ひらがな、カタカナ、漢字）が含まれていない場合
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(article.title)
      return !hasJapanese
    })
    
    console.log(`🔄 翻訳対象記事: ${needsTranslation.length}件`)
    
    if (needsTranslation.length === 0) {
      console.log('✅ すべて翻訳済みです')
      return
    }
    
    // 3. Geminiを使って翻訳
    const model = getGeminiFlash()
    let successCount = 0
    let errorCount = 0
    
    for (const article of needsTranslation) {
      try {
        console.log(`\n[${successCount + errorCount + 1}/${needsTranslation.length}] 翻訳中: ${article.title.substring(0, 60)}...`)
        
        const prompt = `
以下の英語ニュースタイトルを、自然な日本語に翻訳してください。

**英語タイトル:** ${article.title}
**記事要約:** ${article.summary}
**ソース:** ${article.source_name}

**指示:**
1. ニュースタイトルとして自然な日本語に翻訳
2. 専門用語は適切に日本語化（ただし企業名等の固有名詞は原則そのまま）
3. 長すぎる場合は要点を損なわない範囲で短縮可能

翻訳した日本語タイトルのみを出力してください（説明不要）。
`;
        
        const result = await model.generateContent(prompt)
        const translatedTitle = result.response.text().trim()
        
        // 4. データベースを更新
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({ title: translatedTitle })
          .eq('id', article.id)
        
        if (updateError) {
          console.error(`   ❌ 更新エラー:`, updateError.message)
          errorCount++
        } else {
          console.log(`   ✅ 翻訳完了: ${translatedTitle.substring(0, 60)}...`)
          successCount++
        }
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`   ❌ 翻訳エラー:`, error)
        errorCount++
      }
    }
    
    console.log('\n📊 翻訳完了サマリー:')
    console.log(`   ✅ 成功: ${successCount}件`)
    console.log(`   ❌ エラー: ${errorCount}件`)
    console.log(`   📊 翻訳率: ${Math.round(successCount / needsTranslation.length * 100)}%`)
    
    console.log('\n🎉 英語タイトルの日本語翻訳が完了しました！')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
translateEnglishTitles()