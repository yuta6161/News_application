import Parser from 'rss-parser';
import { rssSources } from './rss-sources';
import { supabase } from './supabase';
import { calculateImportanceScore } from './importance-calculator';
import { analyzeArticleWithGemini, saveArticleAnalysis } from './ai/article-analyzer';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
});

export interface Article {
  title: string;
  summary: string;
  source_url: string;
  published_at: string;
  source_name: string;
  category: string;
  original_language: string;
  importance_score: number;
  ai_summary?: string;
}

export interface CollectionStats {
  totalCollected: number;
  newArticles: number;
  duplicates: number;
  aiAnalyzed: number;
  errors: number;
}

export async function collectRSSFeeds(): Promise<Article[]> {
  console.log('🌐 RSS収集を開始します...');
  const allArticles: Article[] = [];
  
  for (const source of rssSources) {
    try {
      console.log(`📡 ${source.name} から取得中...`);
      const feed = await parser.parseURL(source.url);
      
      const articles = feed.items.slice(0, 10).map(item => {
        // RSS要約の取得（優先順位: contentSnippet > description > content）
        const summary = item.contentSnippet || 
                       item.description || 
                       item.content || 
                       'No summary available';
        
        // HTMLタグを除去して最初の300文字を取得（Gemini分析用に長めに）
        const cleanSummary = summary
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 300);
        
        const articleTitle = item.title || 'No title';
        const finalSummary = cleanSummary + (cleanSummary.length >= 300 ? '...' : '');
        
        // 基本的な重要度計算（Geminiで再計算される）
        const importanceScore = calculateImportanceScore(
          articleTitle,
          cleanSummary,
          source
        );
        
        return {
          title: articleTitle,
          summary: finalSummary,
          source_url: item.link || '',
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source.name,
          category: source.category,
          original_language: source.language,
          importance_score: importanceScore,
          ai_summary: null
        };
      });
      
      allArticles.push(...articles);
      console.log(`   ✅ ${articles.length} 件の記事を取得`);
      
    } catch (error) {
      console.error(`   ❌ ${source.name} の取得中にエラー:`, error);
    }
  }
  
  console.log(`📊 合計 ${allArticles.length} 件の記事を収集しました`);
  return allArticles;
}

/**
 * Supabaseに記事を保存し、AI分析を実行
 */
export async function saveArticlesWithAIAnalysis(articles: Article[]): Promise<CollectionStats> {
  console.log('💾 記事の保存とAI分析を開始...');
  
  const stats: CollectionStats = {
    totalCollected: articles.length,
    newArticles: 0,
    duplicates: 0,
    aiAnalyzed: 0,
    errors: 0
  };
  
  // 重複チェック用に既存のURLを取得
  const { data: existingArticles } = await supabase
    .from('news_articles')
    .select('source_url')
    .in('source_url', articles.map(a => a.source_url));
  
  const existingLinks = new Set(existingArticles?.map(a => a.source_url) || []);
  
  // 新しい記事のみフィルタリング
  const newArticles = articles.filter(article => {
    if (existingLinks.has(article.source_url)) {
      stats.duplicates++;
      return false;
    }
    return true;
  });
  
  if (newArticles.length === 0) {
    console.log('🔄 新しい記事はありません（全て重複）');
    return stats;
  }
  
  console.log(`📝 ${newArticles.length} 件の新記事を処理中...`);
  stats.newArticles = newArticles.length;
  
  // 各記事を個別に処理
  for (let i = 0; i < newArticles.length; i++) {
    const article = newArticles[i];
    const progress = `[${i + 1}/${newArticles.length}]`;
    
    try {
      console.log(`${progress} 処理中: ${article.title.substring(0, 50)}...`);
      
      // 1. 記事をデータベースに保存
      const { data: savedArticle, error: saveError } = await supabase
        .from('news_articles')
        .insert(article)
        .select('id')
        .single();
      
      if (saveError) {
        console.error(`   ❌ 保存失敗: ${saveError.message}`);
        stats.errors++;
        continue;
      }
      
      const articleId = savedArticle.id;
      console.log(`   ✅ 記事保存完了 (ID: ${articleId})`);
      
      // 2. Geminiによる記事分析
      try {
        console.log(`   🤖 Gemini分析中...`);
        
        const analysisResult = await analyzeArticleWithGemini(
          article.title,
          article.summary,
          article.source_url,
          article.source_name
        );
        
        // 3. 分析結果を保存
        await saveArticleAnalysis(articleId, analysisResult);
        
        // 4. 日本語タイトルがある場合は記事タイトルを更新
        if (analysisResult.title_ja && article.original_language !== 'ja') {
          const { error: titleUpdateError } = await supabase
            .from('news_articles')
            .update({ title: analysisResult.title_ja })
            .eq('id', articleId);
          
          if (titleUpdateError) {
            console.error(`   ⚠️ タイトル更新エラー:`, titleUpdateError);
          } else {
            console.log(`   ✅ タイトルを日本語に更新: ${analysisResult.title_ja.substring(0, 40)}...`);
          }
        }
        
        stats.aiAnalyzed++;
        console.log(`   ✅ AI分析完了 (重要度: ${analysisResult.importance_score}, タグ: ${analysisResult.tags.length}個)`);
        
        // API制限対策：少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (analysisError) {
        console.error(`   ⚠️  AI分析エラー:`, analysisError);
        // 記事は保存されているので、分析エラーは継続
      }
      
    } catch (error) {
      console.error(`${progress} 記事処理エラー:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

/**
 * メイン収集関数（Gemini対応版）
 */
export async function runRSSCollectionWithAI(): Promise<{
  success: boolean;
  stats?: CollectionStats;
  error?: any;
}> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 RSS収集（Gemini AI対応版）を開始...\n');
    
    // Gemini API接続テスト
    console.log('🔗 Gemini API接続テスト...');
    try {
      const { getGeminiFlash } = await import('./ai/gemini');
      const model = getGeminiFlash();
      const testResult = await model.generateContent('Hello, respond with "OK"');
      const response = testResult.response.text();
      if (response.toLowerCase().includes('ok')) {
        console.log('   ✅ Gemini API接続成功\n');
      } else {
        throw new Error('Unexpected response');
      }
    } catch (geminiError) {
      console.error('   ❌ Gemini API接続失敗:', geminiError);
      throw new Error('Gemini API接続に失敗しました');
    }
    
    // RSS収集
    const articles = await collectRSSFeeds();
    
    if (articles.length === 0) {
      console.log('⚠️  収集された記事がありません');
      return { 
        success: true, 
        stats: {
          totalCollected: 0,
          newArticles: 0,
          duplicates: 0,
          aiAnalyzed: 0,
          errors: 0
        }
      };
    }
    
    // AI分析付き保存
    const stats = await saveArticlesWithAIAnalysis(articles);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // 結果サマリー
    console.log('\n🎉 RSS収集完了！');
    console.log('='.repeat(50));
    console.log(`📊 処理結果:`);
    console.log(`   収集記事数: ${stats.totalCollected} 件`);
    console.log(`   新規記事数: ${stats.newArticles} 件`);
    console.log(`   重複記事数: ${stats.duplicates} 件`);
    console.log(`   AI分析完了: ${stats.aiAnalyzed} 件`);
    console.log(`   エラー数: ${stats.errors} 件`);
    console.log(`   処理時間: ${duration} 秒`);
    console.log('='.repeat(50));
    
    if (stats.errors > 0) {
      console.log('⚠️  一部の記事でエラーが発生しましたが、処理は完了しました');
    }
    
    return { success: true, stats };
    
  } catch (error) {
    console.error('❌ RSS収集エラー:', error);
    return { success: false, error };
  }
}

/**
 * 既存記事への遡及分析（オプション）
 */
export async function retroactiveAnalyzeArticles(limit: number = 10): Promise<void> {
  console.log(`🔄 既存記事の遡及AI分析を開始 (最大${limit}件)...`);
  
  try {
    // AI分析されていない記事を取得
    const { data: unanalyzedArticles, error } = await supabase
      .from('news_articles')
      .select('id, title, summary, source_url, source_name')
      .is('ai_summary', null)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('未分析記事取得エラー:', error);
      return;
    }
    
    if (!unanalyzedArticles || unanalyzedArticles.length === 0) {
      console.log('✅ 全ての記事がAI分析済みです');
      return;
    }
    
    console.log(`📝 ${unanalyzedArticles.length} 件の未分析記事を処理中...`);
    
    for (let i = 0; i < unanalyzedArticles.length; i++) {
      const article = unanalyzedArticles[i];
      const progress = `[${i + 1}/${unanalyzedArticles.length}]`;
      
      try {
        console.log(`${progress} 分析中: ${article.title.substring(0, 50)}...`);
        
        const analysisResult = await analyzeArticleWithGemini(
          article.title,
          article.summary,
          article.source_url,
          article.source_name
        );
        
        await saveArticleAnalysis(article.id, analysisResult);
        
        console.log(`   ✅ 完了 (重要度: ${analysisResult.importance_score})`);
        
        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`${progress} 分析エラー:`, error);
      }
    }
    
    console.log('🎉 遡及分析完了！');
    
  } catch (error) {
    console.error('遡及分析エラー:', error);
  }
}