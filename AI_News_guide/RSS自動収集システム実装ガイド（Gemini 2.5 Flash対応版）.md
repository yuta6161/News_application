# RSS自動収集システム実装ガイド（Gemini 2.5 Flash対応版）

## 概要
このガイドでは、Gemini 2.5 Flash APIを使用してRSS記事を自動収集・分析・タグ付けするシステムの実装手順を説明します。

## 実装手順

### Step 1: 必要なパッケージのインストール

```bash
npm install rss-parser node-cron @google/generative-ai
npm install --save-dev @types/node-cron
```

### Step 2: Gemini Flash APIの設定

`.env.local` に追加：
```
GEMINI_API_KEY=your-gemini-api-key-here
```

`lib/ai/gemini.ts` を作成：

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

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
    const result = await geminiFlash.generateContent(prompt);
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
```

### Step 3: RSS収集対象の定義（更新版）

`lib/rss-sources.ts`：

```typescript
export interface RSSSource {
  name: string;
  url: string;
  category: 'Tech' | 'Business' | 'AI' | 'Startup' | 'General' | 'Game';
  language: 'ja' | 'en';
  source_reliability: number; // 1-10の情報源信頼度
}

export const rssSources: RSSSource[] = [
  // 日本語Tech系
  {
    name: 'はてなブックマーク - テクノロジー',
    url: 'https://b.hatena.ne.jp/hotentry/it.rss',
    category: 'Tech',
    language: 'ja',
    source_reliability: 8
  },
  {
    name: 'Publickey',
    url: 'https://www.publickey1.jp/atom.xml',
    category: 'Tech',
    language: 'ja',
    source_reliability: 7
  },
  {
    name: 'TechCrunch Japan',
    url: 'https://jp.techcrunch.com/feed/',
    category: 'Tech',
    language: 'ja',
    source_reliability: 8
  },
  
  // 英語Tech系
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Tech',
    language: 'en',
    source_reliability: 9
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'Tech',
    language: 'en',
    source_reliability: 8
  },
  
  // AI特化
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    category: 'AI',
    language: 'en',
    source_reliability: 10
  },
  {
    name: 'Google AI Blog',
    url: 'https://blog.google/technology/ai/rss/',
    category: 'AI',
    language: 'en',
    source_reliability: 9
  },
  
  // ゲーム系（新規追加）
  {
    name: 'Steam News',
    url: 'https://store.steampowered.com/feeds/news.xml',
    category: 'Game',
    language: 'en',
    source_reliability: 8
  },
  {
    name: '4Gamer.net',
    url: 'https://www.4gamer.net/rss/index.xml',
    category: 'Game',
    language: 'ja',
    source_reliability: 7
  },
  
  // スタートアップ
  {
    name: 'Y Combinator',
    url: 'https://news.ycombinator.com/rss',
    category: 'Startup',
    language: 'en',
    source_reliability: 8
  }
];
```

### Step 4: タグマスターの初期化

`lib/tag-master.ts` を作成：

```typescript
export const initialTags = [
  // AI・テクノロジー系
  { tag_name: 'OpenAI', category: 'company', parent_category: 'ai_tech', base_reliability: 10 },
  { tag_name: 'Google', category: 'company', parent_category: 'ai_tech', base_reliability: 9 },
  { tag_name: 'Microsoft', category: 'company', parent_category: 'ai_tech', base_reliability: 9 },
  { tag_name: 'Apple', category: 'company', parent_category: 'ai_tech', base_reliability: 9 },
  
  { tag_name: '言語AI', category: 'technology', parent_category: 'ai_tech', base_reliability: 8 },
  { tag_name: '画像生成AI', category: 'technology', parent_category: 'ai_tech', base_reliability: 8 },
  { tag_name: '音声認識', category: 'technology', parent_category: 'ai_tech', base_reliability: 7 },
  { tag_name: '機械学習', category: 'technology', parent_category: 'ai_tech', base_reliability: 8 },
  
  { tag_name: '新製品発表', category: 'announcement_type', parent_category: 'general', base_reliability: 8 },
  { tag_name: '研究論文', category: 'announcement_type', parent_category: 'general', base_reliability: 7 },
  { tag_name: 'アップデート', category: 'announcement_type', parent_category: 'general', base_reliability: 6 },
  
  { tag_name: '革新的', category: 'importance', parent_category: 'general', base_reliability: 9 },
  { tag_name: '重要', category: 'importance', parent_category: 'general', base_reliability: 8 },
  { tag_name: '注目', category: 'importance', parent_category: 'general', base_reliability: 7 },
  
  // ゲーム系
  { tag_name: 'Steam', category: 'platform', parent_category: 'game', base_reliability: 8 },
  { tag_name: 'Switch', category: 'platform', parent_category: 'game', base_reliability: 8 },
  { tag_name: 'PlayStation', category: 'platform', parent_category: 'game', base_reliability: 8 },
  
  { tag_name: 'アクション', category: 'genre', parent_category: 'game', base_reliability: 7 },
  { tag_name: 'RPG', category: 'genre', parent_category: 'game', base_reliability: 7 },
  { tag_name: 'インディー', category: 'genre', parent_category: 'game', base_reliability: 7 },
  
  { tag_name: '無料', category: 'price_range', parent_category: 'game', base_reliability: 8 },
  { tag_name: '〜1000円', category: 'price_range', parent_category: 'game', base_reliability: 8 },
  { tag_name: '1000-3000円', category: 'price_range', parent_category: 'game', base_reliability: 8 },
  
  { tag_name: '圧倒的に好評', category: 'rating', parent_category: 'game', base_reliability: 9 },
  { tag_name: '非常に好評', category: 'rating', parent_category: 'game', base_reliability: 8 },
  { tag_name: '好評', category: 'rating', parent_category: 'game', base_reliability: 7 },
];
```

### Step 5: RSS収集ロジックの実装（Gemini Flash統合版）

`lib/rss-collector.ts` を更新：

```typescript
import Parser from 'rss-parser';
import { rssSources } from './rss-sources';
import { supabase } from './supabase';
import { analyzeArticle } from './ai/gemini';
import { initialTags } from './tag-master';

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
  ai_summary: string;
  quality_level: string;
  analyzed_at: string;
  analysis_version: string;
}

// タグマスターの初期化（初回実行時のみ）
export async function initializeTagMaster() {
  const { data: existingTags } = await supabase
    .from('tag_master')
    .select('tag_name');
  
  if (!existingTags || existingTags.length === 0) {
    const { error } = await supabase
      .from('tag_master')
      .insert(initialTags);
    
    if (error) {
      console.error('タグマスター初期化エラー:', error);
    } else {
      console.log('タグマスターを初期化しました');
    }
  }
}

// タグ名からタグIDを取得
async function getTagIds(tagNames: string[]): Promise<Map<string, string>> {
  const { data: tags } = await supabase
    .from('tag_master')
    .select('id, tag_name')
    .in('tag_name', tagNames);
  
  const tagMap = new Map<string, string>();
  tags?.forEach(tag => {
    tagMap.set(tag.tag_name, tag.id);
  });
  
  return tagMap;
}

export async function collectRSSFeeds(): Promise<Article[]> {
  console.log('RSS収集を開始します...');
  const allArticles: Article[] = [];
  
  // タグマスターの初期化確認
  await initializeTagMaster();
  
  for (const source of rssSources) {
    try {
      console.log(`${source.name} から取得中...`);
      const feed = await parser.parseURL(source.url);
      
      for (const item of feed.items.slice(0, 5)) { // 開発時は5記事まで
        // RSS要約の取得
        const rssContent = item.contentSnippet || 
                         item.description || 
                         item.content || 
                         'No summary available';
        
        // HTMLタグを除去
        const cleanContent = rssContent
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Gemini Flashで分析
        console.log(`分析中: ${item.title}`);
        const analysis = await analyzeArticle(
          item.title || 'No title',
          cleanContent,
          source.name,
          source.source_reliability
        );
        
        const article: Article = {
          title: item.title || 'No title',
          summary: cleanContent.substring(0, 200) + '...',
          source_url: item.link || '',
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source.name,
          category: source.category,
          original_language: source.language,
          importance_score: analysis.importance_score,
          ai_summary: analysis.summary,
          quality_level: analysis.needs_enhancement ? 'pending_enhancement' : 'basic',
          analyzed_at: new Date().toISOString(),
          analysis_version: '1.0'
        };
        
        // 記事を保存
        const { data: savedArticle, error } = await supabase
          .from('news_articles')
          .insert(article)
          .select()
          .single();
        
        if (!error && savedArticle) {
          // タグを保存
          await saveArticleTags(savedArticle.id, analysis.tags);
          allArticles.push(article);
        }
        
        // API制限対策のため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`${source.name} から ${allArticles.length} 件の記事を処理`);
      
    } catch (error) {
      console.error(`${source.name} の取得中にエラー:`, error);
    }
  }
  
  console.log(`合計 ${allArticles.length} 件の記事を収集・分析しました`);
  return allArticles;
}

// 記事タグを保存
async function saveArticleTags(
  articleId: string, 
  tags: Array<{tag_name: string; confidence: number}>
) {
  if (tags.length === 0) return;
  
  // タグ名からIDを取得
  const tagNames = tags.map(t => t.tag_name);
  const tagIdMap = await getTagIds(tagNames);
  
  // 存在しないタグは新規作成
  for (const tag of tags) {
    if (!tagIdMap.has(tag.tag_name)) {
      const { data: newTag } = await supabase
        .from('tag_master')
        .insert({
          tag_name: tag.tag_name,
          category: 'auto_generated',
          parent_category: 'general',
          description: 'Gemini Flashにより自動生成',
          base_reliability: 5.0
        })
        .select()
        .single();
      
      if (newTag) {
        tagIdMap.set(tag.tag_name, newTag.id);
      }
    }
  }
  
  // article_tagsに保存
  const articleTags = tags
    .filter(tag => tagIdMap.has(tag.tag_name))
    .map(tag => ({
      article_id: articleId,
      tag_id: tagIdMap.get(tag.tag_name)!,
      confidence_score: tag.confidence,
      assigned_by: 'gemini_flash'
    }));
  
  if (articleTags.length > 0) {
    const { error } = await supabase
      .from('article_tags')
      .insert(articleTags);
    
    if (error) {
      console.error('タグ保存エラー:', error);
    }
  }
}

// メイン収集関数
export async function runRSSCollection() {
  try {
    const articles = await collectRSSFeeds();
    return { success: true, count: articles.length };
  } catch (error) {
    console.error('RSS収集エラー:', error);
    return { success: false, error };
  }
}
```

### Step 6: 開発用バッチスクリプトの更新

`scripts/collect-rss.ts`：

```typescript
import { runRSSCollection } from '../lib/rss-collector';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('RSS収集バッチを開始します...');
  console.log('Gemini Flash APIを使用した分析を実行します');
  
  const startTime = Date.now();
  const result = await runRSSCollection();
  const endTime = Date.now();
  
  if (result.success) {
    console.log(`✅ 成功: ${result.count} 件の記事を処理しました`);
    console.log(`処理時間: ${(endTime - startTime) / 1000}秒`);
  } else {
    console.error('❌ エラーが発生しました:', result.error);
  }
  
  process.exit(0);
}

main().catch(console.error);
```

## 注意事項

### 開発時の制限
- 1回の実行で各ソース5記事まで（API制限対策）
- 記事間に1秒の待機時間を設定
- エラーが発生してもスキップして継続

### APIキーの管理
- 本番環境では環境変数を必ず設定
- GitHubにAPIキーをコミットしない
- Vercelデプロイ時は環境変数を設定

### コスト管理
- 開発時：1日100記事まで（約$1）
- 本番時：1日1000記事まで（約$10）
- 重要度8.0以上は検索強化対象として別途処理

## トラブルシューティング

### Gemini Flash APIエラー
- APIキーが正しいか確認
- クォータ制限に達していないか確認
- JSON形式のレスポンスが正しく返されているか確認

### タグ保存エラー
- tag_masterテーブルが正しく作成されているか確認
- article_tagsテーブルの外部キー制約を確認
- 重複タグの処理を確認

## 次のステップ

1. セマンティック検索の実装
2. ユーザー行動の記録と分析
3. 検索強化型要約の実装（importance_score 8.0以上）
4. パーソナライゼーション機能の追加