import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini APIクライアントの遅延初期化
let genAI: GoogleGenerativeAI | null = null;
let geminiFlashInstance: any = null;

// Gemini 2.5 Flashモデルを取得
export function getGeminiFlash() {
  if (!genAI || !geminiFlashInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiFlashInstance = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });
  }
  return geminiFlashInstance;
}

// 互換性のためのエクスポート
export const geminiFlash = {
  generateContent: async (prompt: string) => {
    const model = getGeminiFlash();
    return model.generateContent(prompt);
  }
};

// 記事分析の結果インターフェース
export interface ArticleAnalysis {
  importance_score: number;
  tags: Array<{
    tag_name: string;
    category: string;
    confidence: number;
  }>;
  summary: string;
  needs_enhancement: boolean;
  suggested_searches?: string[];
}

// 記事を分析する関数
export async function analyzeArticle(
  title: string,
  content: string,
  source: string,
  sourceReliability: number
): Promise<ArticleAnalysis> {
  const prompt = `
記事を分析して、以下の形式でJSONを返してください。

記事情報:
- タイトル: ${title}
- 内容: ${content}
- ソース: ${source}
- ソース信頼度: ${sourceReliability}/10

返すべきJSON形式:
{
  "importance_score": 数値（1.0-10.0、小数点1位まで）,
  "tags": [
    {
      "tag_name": "タグ名",
      "category": "カテゴリ（company/technology/announcement_type/importance/platform/genre/price_range/rating）",
      "confidence": 信頼度（0.1-1.0）
    }
  ],
  "summary": "200字程度の要約",
  "needs_enhancement": boolean（検索強化が必要か）,
  "suggested_searches": ["追加検索キーワード1", "追加検索キーワード2"]
}

重要度スコアの基準:
- 1.0-3.9: 低重要度（一般的なニュース）
- 4.0-5.9: 中重要度（業界ニュース）
- 6.0-7.9: 高重要度（重要な発表）
- 8.0-10.0: 最重要（革新的・画期的な発表、検索強化対象）

タグ付けの基準:
- 企業名（OpenAI、Google、Microsoft等）は必ず抽出
- 技術カテゴリ（AI、機械学習、Web開発等）を識別
- 発表タイプ（新製品、アップデート、研究論文等）を分類
- ゲーム関連なら価格帯やプラットフォームも抽出
`;

  try {
    const model = getGeminiFlash();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答が見つかりません');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini Flash分析エラー:', error);
    // フォールバック処理
    return {
      importance_score: 5.0,
      tags: [],
      summary: content.substring(0, 200) + '...',
      needs_enhancement: false
    };
  }
}

// テスト用関数
export async function testGeminiConnection() {
  try {
    const prompt = "こんにちは！Gemini 2.5 Flashのテストです。正常に動作していますか？";
    const model = getGeminiFlash();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini接続テスト成功！');
    console.log('応答:', text);
    return true;
  } catch (error) {
    console.error('Gemini接続テスト失敗:', error);
    return false;
  }
}