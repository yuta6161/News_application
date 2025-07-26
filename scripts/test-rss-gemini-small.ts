// 小規模テスト用のRSS収集スクリプト（5記事限定）
import 'dotenv/config';
import Parser from 'rss-parser';
import { supabase } from '../lib/supabase';
import { analyzeArticleWithGemini, saveArticleAnalysis } from '../lib/ai/article-analyzer';

const parser = new Parser();

async function testSmallRSSCollection() {
  console.log('🧪 小規模テスト：RSS収集 + Gemini分析（5記事限定）\n');
  
  try {
    // 1. Gemini接続テスト
    console.log('🔗 Gemini API接続テスト...');
    const { getGeminiFlash } = await import('../lib/ai/gemini');
    const model = getGeminiFlash();
    const testResult = await model.generateContent('Hello, respond with "OK"');
    console.log('   ✅ Gemini API接続成功\n');

    // 2. 少数のRSS記事を取得
    console.log('📡 テスト用RSS記事を取得中...');
    const feed = await parser.parseURL('https://feeds.feedburner.com/oreilly/radar/atom');
    const articles = feed.items.slice(0, 5).map(item => ({
      title: item.title || 'No title',
      summary: (item.contentSnippet || item.description || 'No summary').substring(0, 200),
      source_url: item.link || '',
      published_at: item.pubDate || new Date().toISOString(),
      source_name: 'O\'Reilly Radar',
      category: 'Tech',
      original_language: 'en',
      importance_score: 6.0,
      ai_summary: null
    }));
    
    console.log(`   📄 ${articles.length} 件の記事を取得\n`);
    
    // 3. 各記事を処理
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i+1}/${articles.length}] 処理中: ${article.title.substring(0, 50)}...`);
      
      try {
        // 3-1. 記事をデータベースに保存
        const { data: savedArticle, error: saveError } = await supabase
          .from('news_articles')
          .insert(article)
          .select('id')
          .single();
        
        if (saveError) {
          console.error(`   ❌ 保存失敗: ${saveError.message}`);
          continue;
        }
        
        console.log(`   ✅ 記事保存完了 (ID: ${savedArticle.id})`);
        
        // 3-2. Gemini分析
        console.log(`   🤖 Gemini分析中...`);
        const analysisResult = await analyzeArticleWithGemini(
          article.title,
          article.summary,
          article.source_url,
          article.source_name
        );
        
        console.log(`   📊 分析結果: 重要度=${analysisResult.importance_score}, タグ数=${analysisResult.tags.length}`);
        
        // 3-3. 分析結果を保存
        await saveArticleAnalysis(savedArticle.id, analysisResult);
        
        console.log(`   ✅ 分析結果保存完了\n`);
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ 処理エラー:`, error);
      }
    }
    
    // 4. 結果確認
    console.log('📊 テスト結果確認...');
    
    const { data: savedArticles, error } = await supabase
      .from('news_articles')
      .select('id, title, ai_summary, importance_score')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && savedArticles) {
      console.log(`   📄 保存された記事: ${savedArticles.length} 件`);
      savedArticles.forEach((article, index) => {
        const hasAI = article.ai_summary ? '🤖' : '❌';
        console.log(`   ${index+1}. ${hasAI} ${article.title.substring(0, 50)}... (重要度: ${article.importance_score})`);
      });
    }
    
    // 5. タグ確認
    const { data: tags, error: tagError } = await supabase
      .from('article_tags')
      .select('tag_name, category, is_auto_generated, confidence_score')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!tagError && tags) {
      console.log(`\n   🏷️  最新タグ: ${tags.length} 件`);
      tags.forEach((tag, index) => {
        const type = tag.is_auto_generated ? '🔄自動' : '📌事前';
        console.log(`   ${index+1}. ${type} ${tag.tag_name} (${tag.category}, 信頼度: ${tag.confidence_score})`);
      });
    }
    
    console.log('\n🎉 小規模テスト完了！');
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

testSmallRSSCollection();