// The Verge専用テスト（TypeScript版）
import 'dotenv/config';
import Parser from 'rss-parser';
import { supabase } from '../lib/supabase';
import { analyzeArticleWithGemini, saveArticleAnalysis } from '../lib/ai/article-analyzer';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
});

async function testTheVergeSpecific() {
  console.log('🔍 The Verge専用統合テスト開始\n');
  
  try {
    // 1. The VergeのRSS取得
    console.log('📡 The Verge RSS取得中...');
    const feed = await parser.parseURL('https://www.theverge.com/rss/index.xml');
    
    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('❌ The Vergeのフィードが取得できません');
      return;
    }
    
    console.log(`✅ フィード取得成功: ${feed.items.length} 件の記事`);
    
    // 最初の記事だけテスト
    const item = feed.items[0];
    const article = {
      title: item.title || 'No title',
      summary: (item.contentSnippet || item.description || 'No summary').substring(0, 300),
      source_url: item.link || '',
      published_at: item.pubDate || new Date().toISOString(),
      source_name: 'The Verge',
      category: 'Tech',
      original_language: 'en',
      importance_score: 6.0,
      ai_summary: null
    };
    
    console.log('\n📄 テスト記事情報:');
    console.log(`   タイトル: ${article.title}`);
    console.log(`   URL: ${article.source_url}`);
    console.log(`   要約: ${article.summary.substring(0, 100)}...\n`);
    
    // 2. 重複チェック
    console.log('🔍 重複チェック...');
    const { data: existing } = await supabase
      .from('news_articles')
      .select('id')
      .eq('source_url', article.source_url)
      .single();
    
    if (existing) {
      console.log('🔄 この記事は既に存在します。');
      console.log('✅ 重複チェック機能は正常に動作しています！');
      return;
    }
    
    // 3. 記事保存
    console.log('💾 記事保存中...');
    const { data: savedArticle, error: saveError } = await supabase
      .from('news_articles')
      .insert(article)
      .select('id')
      .single();
    
    if (saveError) {
      console.error('❌ 保存エラー:', saveError);
      return;
    }
    
    console.log(`✅ 記事保存完了 (ID: ${savedArticle.id})`);
    
    // 4. AI分析
    console.log('🤖 Gemini分析開始...');
    const analysisResult = await analyzeArticleWithGemini(
      article.title,
      article.summary,
      article.source_url,
      article.source_name
    );
    
    console.log(`✅ AI分析完了`);
    console.log(`   重要度: ${analysisResult.importance_score}`);
    console.log(`   タグ数: ${analysisResult.tags.length}`);
    
    // 5. 分析結果保存
    console.log('📊 分析結果保存中...');
    await saveArticleAnalysis(savedArticle.id, analysisResult);
    console.log('✅ 分析結果保存完了');
    
    // 6. 結果確認
    console.log('\n📋 最終確認...');
    const { data: finalCheck } = await supabase
      .from('news_articles')
      .select('*')
      .eq('id', savedArticle.id)
      .single();
    
    if (finalCheck) {
      console.log('🎉 The Verge記事の完全処理が成功しました！');
      console.log(`   タイトル: ${finalCheck.title}`);
      console.log(`   重要度: ${finalCheck.importance_score}`);
      console.log(`   AI要約有無: ${finalCheck.ai_summary ? 'あり' : 'なし'}`);
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

testTheVergeSpecific();