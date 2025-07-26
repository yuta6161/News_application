# AIニュースアプリ完全開発ガイド（Gemini 2.5 Flash版）

## プロジェクト概要
世界中のニュースをAIが自動収集し、**ユーザーの自然な言葉を理解して最適なニュースを届ける**、次世代パーソナライゼーションニュースアプリケーション。

### 主要機能（完成時）
1. **自動ニュース収集**: RSS/APIからの24時間自動収集
2. **インテリジェントタグシステム**: Gemini 2.5 Flashによる自動タグ付けと分類
3. **セマンティック検索**: 自然言語での検索と意図理解
4. **検索強化型AI要約**: 重要記事は複数情報源から統合した高品質要約
5. **多言語対応**: 海外ニュースの自動翻訳＋日本向け文脈追加
6. **高度なパーソナライゼーション**: ユーザーの行動パターンから学習
7. **B2B API提供**: 企業向けニュース要約API（将来）

### 最大の差別化ポイント
1. **セマンティック検索システム**: 「OpenAIの公式情報だけ」「1500円くらいのインディーゲーム」など、ユーザーの自然な言葉を理解
2. **検索強化型要約システム**: 重要な記事についてはGemini 2.5 Flashが追加のWeb検索を指示し、複数の情報源から情報を収集・統合

## 技術スタック
- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Edge Functions  
- **データベース**: Supabase (PostgreSQL)
- **AI**: Gemini 2.5 Flash API - タグ付け、要約、検索、翻訳、意図解析
- **認証**: Supabase Auth
- **ホスティング**: Vercel
- **RSS解析**: rss-parser
- **定期実行**: node-cron (開発時), Vercel Cron (本番)

## システムアーキテクチャ

### データ収集層
```
RSS取得 → Gemini Flash分析 → タグ付け → Supabase保存
```

### ユーザー体験層
```
ユーザー入力 → 意図解析 → タグマッチング → 記事表示
```

### 学習層
```
閲覧履歴 → パターン分析 → 精度向上
```

## 開発フェーズ

### Phase 1: プロジェクトセットアップ ✅
- Next.js プロジェクトの初期設定
- Supabase連携
- 基本的なUI構築

### Phase 2: データベース構築 ✅
- Supabaseでのテーブル設計
- 認証システムの実装

### Phase 3: RSS自動収集システム（更新版）
- 複数のRSSフィードからの自動収集
- 記事の重複チェック
- **Gemini Flash APIによる自動分析**（新）
  - importance_score算出
  - タグ付け
  - 要約生成

### Phase 4: インテリジェントタグシステム（新）
- タグマスターの構築
- 自動タグ付けシステム
- タグベースの検索機能

### Phase 5: セマンティック検索（新）
- 自然言語での検索入力
- Gemini Flashによる意図解析
- 高度な検索条件の生成

### Phase 6: 検索強化型要約システム
- 重要記事の自動判定（Gemini Flash）
- Web検索による追加情報収集
- 複数情報源からの統合要約
- コスト最適化（1日20-30記事限定）

### Phase 7: パーソナライゼーション（強化版）
- ユーザー行動の記録と分析
- 嗜好パターンの学習
- 個別最適化された記事推薦

### Phase 8: B2B展開
- API化
- 企業向け機能

## Gemini Flash統合の詳細

### 記事処理フロー
```typescript
// lib/ai/gemini-processor.ts
export async function processArticle(article: RawArticle) {
  const analysis = await geminiFlash.analyze({
    prompt: `
      この記事を分析して以下をJSON形式で出力してください：
      - importance_score: 重要度スコア（1-10）
      - tags: 該当するタグのリスト（各タグに信頼度0.1-1.0を付与）
      - summary: 200字の要約
      - needs_enhancement: 検索強化が必要かどうか（boolean）
      - suggested_searches: 追加検索すべきキーワード（配列）
    `,
    content: {
      title: article.title,
      summary: article.contentSnippet,
      source: article.source_name,
      published_at: article.published_at
    }
  });
  
  return {
    ...article,
    importance_score: analysis.importance_score,
    ai_summary: analysis.summary,
    tags: analysis.tags,
    quality_level: analysis.needs_enhancement ? 'pending_enhancement' : 'basic'
  };
}
```

### セマンティック検索の実装
```typescript
// lib/ai/semantic-search.ts
export async function parseUserQuery(query: string) {
  const intent = await geminiFlash.analyze({
    prompt: `
      ユーザーの検索意図を分析してください：
      - required_tags: 必須タグ
      - preferred_tags: 推奨タグ
      - excluded_tags: 除外タグ
      - date_range: 期間指定
      - trust_level: 必要な信頼度レベル
      - special_conditions: その他の条件
    `,
    query: query
  });
  
  return buildSearchQuery(intent);
}
```

## データベース設計（拡張版）

### news_articlesテーブル（既存 + 更新）
```sql
CREATE TABLE news_articles (
  -- 既存カラム
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  original_language TEXT NOT NULL DEFAULT 'ja',
  source_country TEXT NOT NULL DEFAULT 'JP',
  importance_score NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  
  -- オプショナルフィールド
  tags TEXT[] DEFAULT '{}',  -- 廃止予定（article_tagsテーブルに移行）
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_translated BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,
  
  -- 検索強化型要約用
  enhanced_summary TEXT,
  enhanced_sources TEXT[],
  quality_level TEXT DEFAULT 'basic',  -- 'basic', 'pending_enhancement', 'enhanced'
  processing_cost DECIMAL,
  
  -- Gemini Flash分析メタデータ（新）
  analysis_version TEXT DEFAULT '1.0',
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT news_articles_importance_score_check 
    CHECK (importance_score >= 1.0 AND importance_score <= 10.0)
);
```

### tag_masterテーブル（新）
```sql
CREATE TABLE tag_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,  -- 'company', 'technology', 'announcement_type', 'importance', 'platform', 'genre', 'price_range', 'rating'
  parent_category TEXT,    -- 'ai_tech', 'game', 'business', etc.
  description TEXT,
  base_reliability NUMERIC(3,1) DEFAULT 5.0,  -- タグ自体の基本信頼度
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_tag_master_category (category),
  INDEX idx_tag_master_tag_name (tag_name)
);
```

### article_tagsテーブル（新）
```sql
CREATE TABLE article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag_master(id) ON DELETE CASCADE,
  confidence_score NUMERIC(3,1) NOT NULL DEFAULT 0.5,  -- 0.1-1.0
  assigned_by TEXT NOT NULL DEFAULT 'gemini_flash',  -- 'gemini_flash', 'user', 'system'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(article_id, tag_id),
  INDEX idx_article_tags_article_id (article_id),
  INDEX idx_article_tags_tag_id (tag_id),
  INDEX idx_article_tags_confidence (confidence_score DESC)
);
```

### user_search_historyテーブル（新）
```sql
CREATE TABLE user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  parsed_intent JSONB,  -- Gemini Flashが解析した意図
  result_count INTEGER,
  clicked_articles UUID[],  -- 実際にクリックした記事ID
  search_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_user_search_history_user_id (user_id),
  INDEX idx_user_search_history_created_at (created_at DESC)
);
```

### user_preferencesテーブル（新）
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_tags UUID[],  -- 好むタグのID
  excluded_tags UUID[],   -- 避けるタグのID
  tag_weights JSONB,      -- {tag_id: weight} の形式
  reading_patterns JSONB,  -- 閲覧パターンの分析結果
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id),
  INDEX idx_user_preferences_user_id (user_id)
);
```

## コスト管理

### Gemini 2.5 Flash API使用量目安
- 記事分析（タグ付け + 要約）: 1記事約$0.01
- セマンティック検索: 1クエリ約$0.005
- 検索強化処理: 1記事約$0.5-1.0
- 1日の予算: $30（約4,500円）

### 処理の優先順位
1. 重要度8.0以上の記事 → 検索強化型要約
2. AI・Tech カテゴリ → 詳細分析
3. その他 → 基本分析のみ

## 実装の優先順位と注意事項

### Phase 3の更新作業
1. Gemini 2.5 Flash APIキーの取得と設定
2. 記事分析機能の実装（importance_score、タグ付け、要約）
3. タグマスターの初期データ投入
4. article_tagsテーブルへの移行

### 重要な注意点
- APIキーは環境変数で管理
- 開発段階では処理量を制限（1時間10記事程度）
- タグ付けの精度を定期的に検証
- コストを常に監視し、予算内に収める
- 既存のimportance_score計算ロジックは削除し、Gemini Flash分析に一本化

## 将来的な拡張

### 高度な学習機能
- ユーザーの読了率から記事品質を評価
- タグの重み付けを動的に調整
- 時間帯別の興味パターン分析

### B2B API提供時の機能
```typescript
// 企業向けAPI例
const newsAPI = {
  // セマンティック検索
  semanticSearch: async (naturalQuery: string) => { /* ... */ },
  
  // タグベース検索
  tagSearch: async (tags: TagQuery) => { /* ... */ },
  
  // 検索強化型要約付き
  searchWithEnhancedSummary: async (query: string) => { /* ... */ },
  
  // カスタム監視
  monitor: async (config: MonitorConfig) => { /* ... */ },
  
  // 業界別ダイジェスト
  industryDigest: async (industry: string, options: DigestOptions) => { /* ... */ }
};
```

## まとめ

このアプリの核心は「**ユーザーの自然な言葉を理解する**セマンティック検索」と「**検索強化型要約**」にあります。Gemini 2.5 Flash APIを活用することで、単なるRSSリーダーを超えた、真にインテリジェントなニュースアプリケーションを実現します。