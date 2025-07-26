# RSS自動収集システム実装ガイド

## 概要
このガイドでは、Claude APIを使用せずにRSS自動収集システムを実装する手順を説明します。開発段階では、RSS要約をそのまま表示してダミーアプリとして動作させます。

## 実装手順

### Step 1: 必要なパッケージのインストール

```bash
npm install rss-parser node-cron
npm install --save-dev @types/node-cron
```

### Step 2: RSS収集対象の定義

`lib/rss-sources.ts` を作成してください：

```typescript
export interface RSSSource {
  name: string;
  url: string;
  category: 'Tech' | 'Business' | 'AI' | 'Startup' | 'General';
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
  
  // 英語Tech系（将来のAI翻訳対象）
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
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'Tech',
    language: 'en',
    source_reliability: 7
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

### Step 3: RSS収集ロジックの実装

`lib/rss-collector.ts` を作成してください：

```typescript
import Parser from 'rss-parser';
import { rssSources } from './rss-sources';
import { supabase } from './supabase';

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
  importance_score: number; // NUMERIC(3,1) 1.0-10.0
  ai_summary?: string; // 将来のAI要約用（現在は空）
}

// 重要度計算関数
function calculateImportanceScore(
  title: string,
  summary: string,
  source: RSSSource
): number {
  let score = 5.0; // 基準値
  
  // ソース信頼度の反映（1-10を±2.0に変換）
  score += (source.source_reliability - 5) * 0.4;
  
  // カテゴリによる加点
  if (source.category === 'AI') score += 2.0;
  if (source.category === 'Tech') score += 1.0;
  
  // キーワードによる加点
  if (/breaking|速報|新発表/i.test(title)) score += 1.5;
  if (/OpenAI|Google|Apple|Microsoft/i.test(title)) score += 1.0;
  
  // 1.0-10.0の範囲に収めて、0.1刻みに丸める
  return Math.round(Math.min(Math.max(score, 1.0), 10.0) * 10) / 10;
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
                       item.description || 
                       item.content || 
                       'No summary available';
        
        // HTMLタグを除去して最初の200文字を取得
        const cleanSummary = summary
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200);
        
        const articleTitle = item.title || 'No title';
        
        return {
          title: articleTitle,
          summary: cleanSummary + (cleanSummary.length >= 200 ? '...' : ''),
          source_url: item.link || '',
          published_at: item.pubDate || new Date().toISOString(),
          source_name: source.name,
          category: source.category,
          original_language: source.language,
          importance_score: calculateImportanceScore(articleTitle, cleanSummary, source),
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
  
  const existingUrls = new Set(existingArticles?.map(a => a.source_url) || []);
  
  // 新しい記事のみフィルタリング
  const newArticles = articles.filter(article => !existingUrls.has(article.source_url));
  
  if (newArticles.length === 0) {
    console.log('新しい記事はありません');
    return;
  }
  
  // バッチ挿入
  const { error } = await supabase
    .from('news_articles')
    .insert(newArticles);
  
  if (error) {
    console.error('記事の保存中にエラー:', error);
  } else {
    console.log(`${newArticles.length} 件の新しい記事を保存しました`);
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
```

### Step 4: データベーステーブルの更新

Supabaseで以下のインデックスを作成してください（テーブル構造は既に完成済み）：

```sql
-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_importance_score ON news_articles(importance_score DESC);
```

### Step 5: 定期実行の設定

`app/api/cron/route.ts` を作成してください：

```typescript
import { NextResponse } from 'next/server';
import { runRSSCollection } from '@/lib/rss-collector';

export async function GET(request: Request) {
  // 開発環境でのみ手動実行を許可
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const result = await runRSSCollection();
  return NextResponse.json(result);
}
```

### Step 6: 開発用のバッチ実行スクリプト

`scripts/collect-rss.ts` を作成してください：

```typescript
import { runRSSCollection } from '../lib/rss-collector';

async function main() {
  console.log('RSS収集バッチを開始します...');
  const result = await runRSSCollection();
  
  if (result.success) {
    console.log(`✅ 成功: ${result.count} 件の記事を処理しました`);
  } else {
    console.error('❌ エラーが発生しました:', result.error);
  }
  
  process.exit(0);
}

main().catch(console.error);
```

package.jsonにスクリプトを追加：

```json
{
  "scripts": {
    "collect-rss": "tsx scripts/collect-rss.ts"
  }
}
```

### Step 7: フロントエンドでの表示

`app/page.tsx` を更新してください：

```typescript
import { supabase } from '@/lib/supabase';

export default async function HomePage() {
  // 最新の記事を取得
  const { data: articles } = await supabase
    .from('news_articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(50);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          AIニュースアプリ（開発版）
        </h1>
        <p className="text-gray-600">
          ※現在は各ニュースサイトのRSS要約を表示しています。
          完成版ではAIによる高品質な要約機能が追加されます。
        </p>
      </div>
      
      <div className="grid gap-4">
        {articles?.map((article) => (
          <ArticleCard
            key={article.id}
            title={article.title}
            summary={article.summary}
            source={article.source_name}
            category={article.category}
            date={article.published_at}
            link={article.source_url}
            language={article.original_language}
            importanceScore={article.importance_score}
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 8: 定期実行の自動化（ローカル開発用）

開発中は以下の方法で定期実行できます：

1. **手動実行**: `npm run collect-rss`
2. **ブラウザから実行**: `http://localhost:3000/api/cron`
3. **VSCodeのタスク**: 30分ごとに自動実行

## テスト手順

1. Supabaseのテーブルが正しく設定されているか確認
2. `npm run collect-rss` を実行してRSS収集をテスト
3. Supabaseダッシュボードで記事が保存されているか確認
4. ブラウザでアプリを開いて記事が表示されるか確認

## 注意事項

- これは開発段階の実装です
- 公開前に必ずAI要約機能を実装してください
- RSS要約をそのまま使用しているため、著作権に配慮し一般公開はしないでください
- 開発環境でのテストとフィードバック収集のみに使用してください
- テーブル名は`news_articles`を使用（`articles`ではない）
- `priority`は使わず、`importance_score`と`source_reliability`を使用

## 次のステップ（来週）

1. Claude APIキーの取得と設定
2. AI要約機能の実装
3. 英語記事の自動翻訳機能
4. 重要度判定とパーソナライゼーション

## トラブルシューティング

### RSS取得エラーが出る場合
- CORSエラー: サーバーサイドで実行されているか確認
- タイムアウト: 一度に取得するフィード数を減らす
- パースエラー: RSS形式が特殊な場合は個別対応

### 記事が重複する場合
- `source_url` フィールドでの重複チェックが機能しているか確認
- データベースのユニーク制約を追加することも検討

### パフォーマンスが遅い場合
- 同時実行数を制限（Promise.all の代わりに順次実行）
- キャッシュの実装を検討
- 取得する記事数を制限