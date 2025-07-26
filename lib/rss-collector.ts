import Parser from 'rss-parser';
import { rssSources } from './rss-sources';
import { supabase } from './supabase';
import { calculateImportanceScore } from './importance-calculator';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator']
  }
});

export interface Article {
  title: string;
  summary: string;
  source_url: string; // 既存カラム名に合わせる
  published_at: string;
  source_name: string;
  category: string;
  original_language: string; // 既存カラム名に合わせる
  importance_score: number; // DECIMAL(3,1) 1.0-10.0
  ai_summary?: string; // 将来のAI要約用（現在は空）
}

export async function collectRSSFeeds(): Promise<Article[]> {
  console.log('RSS収集を開始します...');
  const allArticles: Article[] = [];
  
  for (const source of rssSources) {
    try {
      console.log(`${source.name} から取得中...`);
      const feed = await parser.parseURL(source.url);
      
      const articles = feed.items.slice(0, 10).map(item => {
        // RSS要約の取得（優先順位: contentSnippet > description > content）
        const summary = item.contentSnippet || 
                       (item as any).description || 
                       (item as any).content || 
                       'No summary available';
        
        // HTMLタグを除去して最初の200文字を取得
        const cleanSummary = summary
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200);
        
        const articleTitle = item.title || 'No title';
        const finalSummary = cleanSummary + (cleanSummary.length >= 200 ? '...' : '');
        
        // 新しい重要度計算ロジックを使用
        const importanceScore = calculateImportanceScore(
          articleTitle,
          cleanSummary,
          source
        );
        
        return {
          title: articleTitle,
          summary: finalSummary, // 既存のsummaryカラムを使用
          source_url: item.link || '', // 既存のsource_urlカラムを使用
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source.name,
          category: source.category,
          original_language: source.language, // 既存のoriginal_languageカラムを使用
          importance_score: importanceScore, // 計算された重要度スコア
          ai_summary: null // 将来AI要約を追加する場所
        };
      });
      
      allArticles.push(...articles);
      console.log(`${source.name} から ${articles.length} 件の記事を取得`);
      
    } catch (error) {
      console.error(`${source.name} の取得中にエラー:`, error);
    }
  }
  
  console.log(`合計 ${allArticles.length} 件の記事を収集しました`);
  return allArticles;
}

// Supabaseに記事を保存
export async function saveArticlesToDatabase(articles: Article[]) {
  // 重複チェック用に既存のURLを取得
  const { data: existingArticles } = await supabase
    .from('news_articles')
    .select('source_url')
    .in('source_url', articles.map(a => a.source_url));
  
  const existingLinks = new Set(existingArticles?.map(a => a.source_url) || []);
  
  // 新しい記事のみフィルタリング
  const newArticles = articles.filter(article => !existingLinks.has(article.source_url));
  
  if (newArticles.length === 0) {
    console.log('新しい記事はありません');
    return;
  }
  
  // 個別挿入（エラー時でも他の記事は保存される）
  let savedCount = 0;
  let errorCount = 0;
  
  for (const article of newArticles) {
    try {
      const { error } = await supabase
        .from('news_articles')
        .insert(article);
      
      if (error) {
        console.error(`記事の保存に失敗: ${article.title}`, error.message);
        errorCount++;
      } else {
        savedCount++;
      }
    } catch (error) {
      console.error(`記事の保存中に例外: ${article.title}`, error);
      errorCount++;
    }
  }
  
  console.log(`保存結果: 成功 ${savedCount} 件、失敗 ${errorCount} 件`);
  
  if (errorCount > 0) {
    console.error('記事の保存中にエラー: 一部の記事が保存できませんでした');
  }
}

// メイン収集関数
export async function runRSSCollection() {
  try {
    const articles = await collectRSSFeeds();
    await saveArticlesToDatabase(articles);
    return { success: true, count: articles.length };
  } catch (error) {
    console.error('RSS収集エラー:', error);
    return { success: false, error };
  }
}