// lib/ai/article-analyzer.ts
// Geminiを使った記事分析とタグ付けサービス

import { getGeminiFlash } from './gemini';
import { supabase } from '../supabase';

export interface ArticleAnalysisResult {
  title_ja?: string; // 日本語翻訳されたタイトル
  summary: string;
  tags: Array<{
    tag_name: string;
    confidence_score: number; // 0.1-1.0
    category: string;
    is_auto_generated: boolean;
  }>;
  importance_score: number; // 1.0-10.0
  sentiment: 'positive' | 'neutral' | 'negative';
  key_points: string[];
}

export interface TagMatchResult {
  existingTags: Array<{
    id: string;
    tag_name: string;
    category: string;
    base_reliability: number;
  }>;
  suggestedNewTags: Array<{
    tag_name: string;
    category: string;
    confidence_score: number;
  }>;
}

/**
 * 事前定義タグマスターから関連タグを検索
 */
export async function findRelevantPredefinedTags(content: string): Promise<TagMatchResult> {
  try {
    // 全事前定義タグを取得
    const { data: allTags, error } = await supabase
      .from('tag_master')
      .select('id, tag_name, category, base_reliability')
      .order('base_reliability', { ascending: false });

    if (error) {
      console.error('事前定義タグ取得エラー:', error);
      return { existingTags: [], suggestedNewTags: [] };
    }

    if (!allTags || allTags.length === 0) {
      console.log('事前定義タグが見つかりません');
      return { existingTags: [], suggestedNewTags: [] };
    }

    // コンテンツを小文字にして検索しやすくする
    const contentLower = content.toLowerCase();
    const titleAndSummary = contentLower;

    // マッチするタグを検索
    const matchedTags = allTags.filter(tag => {
      const tagLower = tag.tag_name.toLowerCase();
      
      // 直接一致
      if (titleAndSummary.includes(tagLower)) {
        return true;
      }
      
      // 部分一致（企業名など）
      if (tag.category === 'company' && titleAndSummary.includes(tagLower)) {
        return true;
      }
      
      // 技術用語の検索
      if (tag.category === 'technology') {
        const techKeywords = {
          '言語AI': ['gpt', 'llm', 'claude', 'gemini', 'chatgpt', '言語モデル', '言語ai', 'large language'],
          '画像生成AI': ['dall-e', 'midjourney', 'stable diffusion', '画像生成', 'image generation'],
          '音声認識': ['whisper', '音声認識', 'speech recognition', 'voice'],
          '機械学習': ['machine learning', 'ml', '機械学習', 'neural network'],
          'マルチモーダル': ['multimodal', 'マルチモーダル', 'vision', 'image understanding'],
          'LLM': ['llm', 'large language model', '大規模言語モデル']
        };
        
        const keywords = techKeywords[tag.tag_name as keyof typeof techKeywords];
        if (keywords && keywords.some(keyword => titleAndSummary.includes(keyword))) {
          return true;
        }
      }
      
      return false;
    });

    return {
      existingTags: matchedTags.slice(0, 10), // 最大10個
      suggestedNewTags: [] // 後でGeminiが生成
    };

  } catch (error) {
    console.error('タグマッチング処理エラー:', error);
    return { existingTags: [], suggestedNewTags: [] };
  }
}

/**
 * Geminiを使って記事を分析し、タグ付けを行う
 */
export async function analyzeArticleWithGemini(
  title: string,
  summary: string,
  sourceUrl: string,
  sourceName: string
): Promise<ArticleAnalysisResult> {
  try {
    const model = getGeminiFlash();
    
    // 事前定義タグとの照合
    const tagMatch = await findRelevantPredefinedTags(`${title} ${summary}`);
    const predefinedTagsList = tagMatch.existingTags.map(t => 
      `- ${t.tag_name} (${t.category}, 信頼度: ${t.base_reliability})`
    ).join('\n');

    const prompt = `
記事分析とタグ付けを行ってください。

**記事情報:**
タイトル: ${title}
要約: ${summary}
ソース: ${sourceName}
URL: ${sourceUrl}

**事前定義タグ（該当する場合は優先使用）:**
${predefinedTagsList || '（該当する事前定義タグなし）'}

**出力形式（JSON）:**
{
  "title_ja": "日本語に翻訳されたタイトル",
  "summary": "記事の簡潔な要約（100-150文字）",
  "tags": [
    {
      "tag_name": "タグ名",
      "confidence_score": 0.9,
      "category": "company|technology|announcement_type|importance|platform|genre|price_range|rating",
      "is_auto_generated": false
    }
  ],
  "importance_score": 7.5,
  "sentiment": "positive|neutral|negative",
  "key_points": ["要点1", "要点2", "要点3"]
}

**指示:**
1. **タイトル翻訳（必須）**: 英語タイトルは必ず自然な日本語に翻訳し、"title_ja"に含める
2. **事前定義タグを優先**: 上記リストにあるタグが該当する場合は必ず使用し、is_auto_generated: false に設定
3. **新規タグの作成**: 事前定義タグで表現できない重要な概念がある場合のみ新規作成し、is_auto_generated: true に設定
4. **信頼度スコア**: 0.1-1.0の範囲で、タグの適用確信度を設定
5. **重要度スコア**: 1.0-10.0の範囲で、ニュースの重要度を評価（速報性、影響度、革新性を考慮）
6. **カテゴリ**: 既存の8カテゴリのいずれかに分類
7. **タグ数制限**: 最大8個まで

**重要度基準:**
- 9.0-10.0: 業界を変える革新的発表
- 8.0-8.9: 重要な製品発表・重大ニュース
- 7.0-7.9: 注目すべきアップデート・発表
- 6.0-6.9: 一般的なニュース
- 5.0-5.9: 軽微なアップデート
- 1.0-4.9: その他

JSONのみを出力してください。説明文は不要です。
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      // Geminiが```json```で囲む場合があるので、それを除去
      const cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const analysisResult = JSON.parse(cleanedResponse) as ArticleAnalysisResult;
      
      // バリデーション
      if (!analysisResult.summary || !Array.isArray(analysisResult.tags)) {
        throw new Error('Invalid response format');
      }
      
      // スコアの範囲チェック
      analysisResult.importance_score = Math.max(1.0, Math.min(10.0, analysisResult.importance_score));
      analysisResult.tags = analysisResult.tags.map(tag => ({
        ...tag,
        confidence_score: Math.max(0.1, Math.min(1.0, tag.confidence_score))
      }));
      
      console.log(`✅ Gemini分析完了: ${title} (重要度: ${analysisResult.importance_score}, タグ数: ${analysisResult.tags.length})`);
      return analysisResult;
      
    } catch (parseError) {
      console.error('Gemini応答のパース失敗:', parseError);
      console.log('生の応答:', responseText);
      
      // フォールバック: 基本的な分析結果を返す
      return createFallbackAnalysis(title, summary, tagMatch.existingTags);
    }
    
  } catch (error) {
    console.error('Gemini記事分析エラー:', error);
    
    // エラー時のフォールバック
    const tagMatch = await findRelevantPredefinedTags(`${title} ${summary}`);
    return createFallbackAnalysis(title, summary, tagMatch.existingTags);
  }
}

/**
 * Gemini分析が失敗した場合のフォールバック
 */
function createFallbackAnalysis(
  title: string, 
  summary: string, 
  predefinedTags: any[]
): ArticleAnalysisResult {
  return {
    summary: summary.substring(0, 150) + (summary.length > 150 ? '...' : ''),
    tags: predefinedTags.slice(0, 5).map(tag => ({
      tag_name: tag.tag_name,
      confidence_score: 0.7,
      category: tag.category,
      is_auto_generated: false
    })),
    importance_score: 6.0, // デフォルト重要度
    sentiment: 'neutral',
    key_points: [title]
  };
}

/**
 * 分析結果をデータベースに保存
 */
export async function saveArticleAnalysis(
  articleId: string,
  analysisResult: ArticleAnalysisResult
): Promise<void> {
  try {
    // 1. 記事の重要度とAI要約を更新
    const { error: updateError } = await supabase
      .from('news_articles')
      .update({
        importance_score: analysisResult.importance_score,
        ai_summary: analysisResult.summary
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('記事更新エラー:', updateError);
      return;
    }

    // 2. タグを保存
    for (const tag of analysisResult.tags) {
      try {
        // 事前定義タグの場合はtag_masterから取得
        let tagMasterId = null;
        
        if (!tag.is_auto_generated) {
          const { data: existingTag } = await supabase
            .from('tag_master')
            .select('id')
            .eq('tag_name', tag.tag_name)
            .single();
          
          tagMasterId = existingTag?.id || null;
        }

        // 修正されたデータベーススキーマに合わせて保存
        let tagError;
        if (tag.is_auto_generated) {
          // 自動生成タグの場合：tag_nameとcategoryを直接保存
          const result = await supabase
            .from('article_tags')
            .insert({
              article_id: articleId,
              tag_id: null, // 自動生成タグはtag_masterに存在しない
              tag_name: tag.tag_name,
              category: tag.category,
              is_auto_generated: true,
              confidence_score: tag.confidence_score,
              assigned_by: 'gemini_flash'
            });
          tagError = result.error;
        } else {
          // 事前定義タグの場合：tag_master_idを使用
          const result = await supabase
            .from('article_tags')
            .insert({
              article_id: articleId,
              tag_id: tagMasterId,
              tag_name: tag.tag_name, // 検索用に名前も保存
              category: tag.category,
              is_auto_generated: false,
              confidence_score: tag.confidence_score,
              assigned_by: 'gemini_flash'
            });
          tagError = result.error;
        }

        if (tagError) {
          console.error(`タグ保存エラー (${tag.tag_name}):`, tagError);
        }
        
      } catch (tagSaveError) {
        console.error(`タグ保存中の例外 (${tag.tag_name}):`, tagSaveError);
      }
    }

    console.log(`✅ 分析結果保存完了: ${analysisResult.tags.length}個のタグ`);
    
  } catch (error) {
    console.error('分析結果保存エラー:', error);
  }
}