// OpenAI Blog統合テスト（新しい記事で）
import 'dotenv/config';
import Parser from 'rss-parser';
import { supabase } from '../lib/supabase';
import { analyzeArticleWithGemini, saveArticleAnalysis } from '../lib/ai/article-analyzer';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
});

async function testOpenAIBlogIntegration() {
  console.log('🔍 OpenAI Blog統合テスト開始\n');
  
  try {
    // 1. OpenAI BlogのRSS取得
    console.log('📡 OpenAI Blog RSS取得中...');
    const feed = await parser.parseURL('https://openai.com/blog/rss.xml');
    
    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('❌ OpenAI Blogのフィードが取得できません');
      return;
    }
    
    console.log(`✅ フィード取得成功: ${feed.items.length} 件の記事`);
    
    // 既存記事をチェックして、新しい記事を探す
    console.log('\n🔍 新しい記事を検索中...');
    let newArticle = null;
    
    for (const item of feed.items) {
      const { data: existing } = await supabase
        .from('news_articles')
        .select('id')
        .eq('source_url', item.link)
        .single();
      
      if (!existing) {
        newArticle = {
          title: item.title || 'No title',
          summary: (item.contentSnippet || (item as any).description || 'No summary').substring(0, 300),
          source_url: item.link || '',
          published_at: item.pubDate || new Date().toISOString(),
          source_name: 'OpenAI Blog',
          category: 'Tech',
          original_language: 'en',
          importance_score: 8.0, // OpenAI Blogは高重要度
          ai_summary: null
        };
        break;
      }
    }
    
    if (!newArticle) {
      console.log('⚠️ 新しい記事が見つかりません（全て処理済み）');
      console.log('✅ これは正常な状態です - OpenAI Blogの記事は既に処理されています');
      return;
    }
    
    console.log('\n📄 新しい記事を発見:');
    console.log(`   タイトル: ${newArticle.title}`);
    console.log(`   URL: ${newArticle.source_url}`);
    console.log(`   要約: ${newArticle.summary.substring(0, 100)}...\n`);
    
    // 2. 記事保存
    console.log('💾 記事保存中...');
    const { data: savedArticle, error: saveError } = await supabase
      .from('news_articles')
      .insert(newArticle)
      .select('id')
      .single();
    
    if (saveError) {
      console.error('❌ 保存エラー:', saveError);
      return;
    }
    
    console.log(`✅ 記事保存完了 (ID: ${savedArticle.id})`);
    
    // 3. AI分析（修正版Gemini）
    console.log('🤖 Gemini分析開始（修正版）...');
    const analysisResult = await analyzeArticleWithGemini(
      newArticle.title,
      newArticle.summary,
      newArticle.source_url,
      newArticle.source_name
    );
    
    console.log(`✅ AI分析完了`);
    console.log(`   重要度: ${analysisResult.importance_score}`);
    console.log(`   タグ数: ${analysisResult.tags.length}`);
    console.log(`   日本語タイトル: ${analysisResult.title_ja || 'なし'}`);
    
    // 4. 分析結果保存
    console.log('📊 分析結果保存中...');
    await saveArticleAnalysis(savedArticle.id, analysisResult);
    console.log('✅ 分析結果保存完了');
    
    // 5. 最終確認
    console.log('\n📋 最終確認...');
    const { data: finalCheck } = await supabase
      .from('news_articles')
      .select('*')
      .eq('id', savedArticle.id)
      .single();
    
    if (finalCheck) {
      console.log('🎉 OpenAI Blog記事の完全処理が成功しました！');
      console.log(`   タイトル: ${finalCheck.title}`);
      console.log(`   重要度: ${finalCheck.importance_score}`);
      console.log(`   AI要約有無: ${finalCheck.ai_summary ? 'あり' : 'なし'}`);
    }
    
    console.log('\n📈 OpenAI Blog記事数確認...');
    const { data: countData } = await supabase
      .from('news_articles')
      .select('id')
      .eq('source_name', 'OpenAI Blog');
    
    console.log(`🎯 OpenAI Blog総記事数: ${countData?.length || 0} 件`);
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

testOpenAIBlogIntegration();