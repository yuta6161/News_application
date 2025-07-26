# AIニュースアプリ完全開発ガイド（検索強化型要約対応版）

## プロジェクト概要
世界中のニュースをAIが自動収集し、重要な記事については追加のWeb検索を行って複数の情報源から情報を統合、高品質な要約と翻訳を提供するニュースアプリケーション。

### 主要機能（完成時）
1. **自動ニュース収集**: RSS/APIからの24時間自動収集
2. **検索強化型AI要約**: 重要記事は複数情報源から統合した高品質要約
3. **多言語対応**: 海外ニュースの自動翻訳＋日本向け文脈追加
4. **高度なパーソナライゼーション**: ユーザーごとの興味に基づくフィルタリング
5. **B2B API提供**: 企業向けニュース要約API（将来）

### 最大の差別化ポイント
**検索強化型要約システム**: 単なるRSS要約ではなく、重要な記事についてはClaudeがWeb検索を行い、複数の情報源から情報を収集・統合して、より正確で包括的な要約を生成する。

## 技術スタック
- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Edge Functions  
- **データベース**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic) - 要約、検索、翻訳
- **認証**: Supabase Auth
- **ホスティング**: Vercel
- **RSS解析**: rss-parser
- **定期実行**: node-cron (開発時), Vercel Cron (本番)

## 開発フェーズ

### Phase 1: プロジェクトセットアップ ✅
- Next.js プロジェクトの初期設定
- Supabase連携
- 基本的なUI構築

### Phase 2: データベース構築 ✅
- Supabaseでのテーブル設計
- 認証システムの実装

### Phase 3: RSS自動収集システム（現在）
- 複数のRSSフィードからの自動収集
- 記事の重複チェック
- カテゴリ分類
- **注**: この段階ではAPIキー不要、RSS要約をそのまま使用

### Phase 4: 基本AI要約機能（来週）
- Claude APIの統合
- 基本的な要約生成
- 翻訳機能の実装

### Phase 4.5: 検索強化型要約システム（Phase 4の後）
- 重要記事の自動判定
- Web検索による追加情報収集
- 複数情報源からの統合要約
- コスト最適化（1日20-30記事限定）

### Phase 5: パーソナライゼーション
- ユーザー設定に基づくフィルタリング
- 学習機能

### Phase 6: B2B展開
- API化
- 企業向け機能

## Phase 4.5: 検索強化型要約システム（詳細）

### システムの流れ
```
1. RSS記事取得
   ↓
2. 重要度判定（スコア8.0以上）
   ↓
3. 重要記事のみ：
   - Claudeが関連情報をWeb検索
   - 複数の情報源から情報収集
   - 統合して高品質な要約生成
   ↓
4. 通常記事：基本的な要約のみ
```

### 実装イメージ
```typescript
// lib/ai/enhanced-summary.ts
export async function processArticle(article: Article) {
  // 重要度判定
  const importance = article.importance_score;
  
  if (importance >= 8.0) {
    // 検索強化型処理
    return await enhancedSummarize(article);
  } else {
    // 通常処理
    return await basicSummarize(article);
  }
}

async function enhancedSummarize(article: Article) {
  // 1. Claudeに検索を依頼
  const searchResults = await claude.searchAndGather({
    query: article.title,
    context: article.summary
  });
  
  // 2. 複数の情報源を統合
  const integratedInfo = await claude.integrate({
    original: article,
    additional: searchResults
  });
  
  // 3. 高品質な要約を生成
  return await claude.createEnhancedSummary(integratedInfo);
}
```

### 重要度判定基準
```typescript
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
```

### 重要度の基準
- 1.0-3.9: 低重要度
- 4.0-5.9: 中重要度
- 6.0-7.9: 高重要度
- **8.0-10.0: 最重要（検索強化対象）**

### コスト管理
- 1日の予算: $30（約4,500円）
- 検索強化処理: 1記事約$1
- 処理上限: 1日20-30記事
- 優先順位: AI > Tech > Startup > その他

## データベース設計

### news_articlesテーブル
```sql
CREATE TABLE news_articles (
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
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_translated BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,           -- AI生成要約（Phase 4で使用）
  
  -- 将来の検索強化型要約用（Phase 4.5）
  enhanced_summary TEXT,     -- 検索強化型要約
  enhanced_sources TEXT[],   -- 参照した情報源
  quality_level TEXT,        -- 'basic' or 'enhanced'
  processing_cost DECIMAL,   -- 処理コスト
  
  CONSTRAINT news_articles_importance_score_check 
    CHECK (importance_score >= 1.0 AND importance_score <= 10.0)
);
```

## 実装の優先順位と注意事項

### 今週（Phase 3）
1. RSS自動収集システムの完成
2. UIの改善
3. 基本的な機能の実装
4. **APIキーは使用しない**

### 来週（Phase 4 & 4.5）
1. Claude APIキーの取得
2. 基本的な要約機能の実装
3. 重要記事の検索強化型要約
4. コスト管理システム

### 重要な注意点
- 開発段階ではRSS要約をそのまま表示してOK
- 公開前に必ずAI要約に切り替える
- 検索強化型要約は段階的に実装（最初は1日5記事程度でテスト）
- コストを常に監視し、予算内に収める
- テーブル名は`news_articles`（`articles`ではない）
- `priority`という名前は使わない（`importance_score`と`source_reliability`を使用）

## 将来的な拡張

### B2B API提供時の機能
```typescript
// 企業向けAPI例
const newsAPI = {
  // 基本検索
  search: async (query: string) => { /* ... */ },
  
  // 検索強化型要約付き
  searchWithEnhancedSummary: async (query: string) => { /* ... */ },
  
  // カスタム監視
  monitor: async (config: MonitorConfig) => { /* ... */ },
  
  // 一括処理
  batchProcess: async (articles: Article[]) => { /* ... */ }
};
```

## まとめ

このアプリの核心は「検索強化型要約」にあります。単なるRSSリーダーではなく、AIが能動的に情報を収集・統合することで、他にない価値を提供します。

開発は段階的に進め、まずはRSS収集から始めて、徐々に高度な機能を追加していきます。