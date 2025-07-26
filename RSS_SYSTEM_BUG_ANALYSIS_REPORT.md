# RSS収集システム バグ分析レポート

**作成日**: 2025年7月26日  
**作成者**: Claude Code Assistant

## 1. エグゼクティブサマリー

RSS収集システムにおいて、複数のRSSソースで「フィードに記事があるがDBに保存されていません」という問題が発生している。調査の結果、以下の複数の根本原因が判明した：

1. **データベース制約違反**による保存失敗
2. **XMLパースエラー**による取得失敗
3. **処理順序の問題**による部分的な失敗
4. **エラーハンドリングの不備**による連鎖的失敗

## 2. 問題の詳細分析

### 2.1 影響を受けているRSSソース（2025年7月26日時点）

| ソース名 | カテゴリ | 状態 | 原因 |
|---------|----------|------|------|
| SonicScoop | Music | 0件保存 | タグ制約違反 |
| Create Digital Music | Music | 0件保存 | タグ制約違反 |
| Sound on Sound | Music | 0件保存 | XMLパースエラー |
| XLR8R | Music | 0件保存 | タグ制約違反 |
| ARAMA! JAPAN | Music | 0件保存 | XMLパースエラー |
| Electric Bloom Webzine | Music | 0件保存 | 不明 |
| NHK News | World | 0件保存 | タグ制約違反 |

### 2.2 根本原因分析

#### 原因1: データベース制約違反

**問題の詳細**:
- `article_tags`テーブルと`tag_master`テーブルに厳格なカテゴリ制約が存在
- Gemini APIが生成するタグカテゴリが制約に含まれていない

**エラー例**:
```
タグ保存エラー (無料サンプルパック): {
  code: '23514',
  message: 'new row for relation "article_tags" violates check constraint "article_tags_category_check"'
}
```

**制約で許可されていないカテゴリ**:
- product_service
- industry
- concept
- product
- other
- person
- media
- social_issue
- risk_management
- legal
- market
- product_type
- industry_term

#### 原因2: XMLパースエラー

**影響を受けるソース**:
- Sound on Sound: `Invalid character in entity name`
- ARAMA! JAPAN: `Unable to parse XML`

**問題の詳細**:
- 不正なXML文字（例: エスケープされていない`&`）
- 文字エンコーディングの問題
- 不完全なXML構造

#### 原因3: 処理順序とトランザクション管理

**現在の処理フロー**:
1. RSS記事を取得
2. 記事をデータベースに保存
3. Gemini APIで分析
4. タグを保存

**問題点**:
- ステップ4でエラーが発生しても、記事自体は保存されている場合がある
- トランザクション管理が不適切で、部分的な成功/失敗が発生

#### 原因4: エラーハンドリングの不備

**現在の問題**:
- 個別の記事処理でエラーが発生しても処理を継続
- エラーログは出力されるが、根本原因の解決がされない
- 同じエラーが繰り返し発生

## 3. システム設計の問題点

### 3.1 制約管理の問題

- **静的な制約定義**: データベース制約がハードコードされており、動的な拡張が困難
- **制約の不整合**: `article_tags`と`tag_master`で制約が異なる
- **Gemini APIとの非同期**: Geminiが生成可能なカテゴリとDB制約が同期していない

### 3.2 エラー処理の問題

```typescript
// 現在の問題のあるコード構造
for (const article of articles) {
  try {
    // 記事保存
    const savedArticle = await saveArticle(article);
    // AI分析
    const analysis = await analyzeWithGemini(article);
    // タグ保存（ここでエラー）
    await saveTags(analysis.tags);
  } catch (error) {
    // エラーをログに出力するだけで続行
    console.error('エラー:', error);
    continue;
  }
}
```

### 3.3 監視とアラートの欠如

- 保存失敗の統計情報が収集されていない
- 繰り返し発生するエラーの検知機能がない
- 管理者への通知機能がない

## 4. 推奨される解決策

### 4.1 即時対応（短期的修正）

1. **制約の完全な修正**
```sql
-- 全ての可能なカテゴリを含む制約に更新
ALTER TABLE article_tags 
ADD CONSTRAINT article_tags_category_check 
CHECK (category = ANY (ARRAY[/* 全カテゴリリスト */]));
```

2. **XMLパースエラーの対処**
```typescript
// XMLサニタイズ処理の追加
function sanitizeXML(xmlString: string): string {
  return xmlString
    .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
```

### 4.2 中期的改善

1. **トランザクション管理の改善**
```typescript
await supabase.transaction(async (tx) => {
  const article = await tx.insert('news_articles', articleData);
  const analysis = await analyzeWithGemini(article);
  await tx.insert('article_tags', analysis.tags);
});
```

2. **動的カテゴリ管理**
- カテゴリをENUM制約ではなく、別テーブルで管理
- 新しいカテゴリの自動追加機能

3. **エラー回復機能**
- 失敗した記事の再処理キュー
- エラー種別に応じた自動修復

### 4.3 長期的改善

1. **システムアーキテクチャの見直し**
- RSS取得、記事保存、AI分析を独立したサービスに分離
- メッセージキューを使用した非同期処理

2. **監視システムの構築**
- エラー率のリアルタイム監視
- 異常検知とアラート
- ダッシュボードでの可視化

## 5. 再発防止策

### 5.1 開発プロセスの改善

1. **テストの強化**
```typescript
describe('RSS Collection System', () => {
  it('should handle all Gemini-generated tag categories', async () => {
    const allPossibleCategories = [/* リスト */];
    for (const category of allPossibleCategories) {
      await expect(saveTag({ category })).resolves.not.toThrow();
    }
  });
});
```

2. **制約変更時のチェックリスト**
- [ ] Gemini APIのレスポンス仕様を確認
- [ ] 全ての関連テーブルの制約を更新
- [ ] テストケースを追加
- [ ] ステージング環境で全RSSソースをテスト

### 5.2 運用プロセスの改善

1. **定期的な健全性チェック**
- 毎日：各RSSソースの取得/保存状況を確認
- 週次：エラーログの分析とパターン検出
- 月次：システム全体のパフォーマンス評価

2. **インシデント対応フロー**
- エラー検知 → 原因分析 → 影響範囲特定 → 修正 → 全体テスト → デプロイ

## 6. 結論

現在のRSS収集システムの問題は、単一の原因ではなく、複数の設計上の問題が組み合わさって発生している。特に：

1. **データベース制約とAI出力の不整合**が最大の問題
2. **エラーハンドリングの不備**により問題が隠蔽されやすい
3. **部分的な修正**では問題が再発する

これらの問題を根本的に解決するには、システム全体の設計を見直し、適切なエラーハンドリング、トランザクション管理、監視機能を実装する必要がある。

## 7. 付録

### 7.1 影響を受ける全RSSソースリスト
[全RSSソースの詳細リスト]

### 7.2 エラーログサンプル
[代表的なエラーログ]

### 7.3 修正スクリプト

```sql
-- 即時対応用SQLスクリプト
-- 1. article_tagsテーブルの制約を完全に修正
ALTER TABLE article_tags 
DROP CONSTRAINT IF EXISTS article_tags_category_check;

ALTER TABLE article_tags
ADD CONSTRAINT article_tags_category_check 
CHECK (category = ANY (ARRAY[
  -- 既存のカテゴリ
  'company', 'technology', 'announcement_type', 'importance', 
  'platform', 'genre', 'price_range', 'rating', 
  'auto_generated', 'event', 'activity', 'topic', 'source_type',
  -- Geminiが生成する新カテゴリ
  'product_service', 'industry', 'concept', 'product', 'other',
  'person', 'media', 'social_issue', 'risk_management', 'legal',
  'market', 'product_type', 'industry_term', 'location', 'feature',
  'trend', 'organization', 'policy', 'research', 'health',
  'education', 'environment', 'culture', 'sports', 'science'
]::text[]));

-- 2. tag_masterテーブルの制約も同様に修正
ALTER TABLE tag_master 
DROP CONSTRAINT IF EXISTS tag_master_category_check;

ALTER TABLE tag_master
ADD CONSTRAINT tag_master_category_check 
CHECK (category = ANY (ARRAY[
  -- article_tagsと同じカテゴリリスト
  'company', 'technology', 'announcement_type', 'importance', 
  'platform', 'genre', 'price_range', 'rating', 
  'auto_generated', 'event', 'activity', 'topic', 'source_type',
  'product_service', 'industry', 'concept', 'product', 'other',
  'person', 'media', 'social_issue', 'risk_management', 'legal',
  'market', 'product_type', 'industry_term', 'location', 'feature',
  'trend', 'organization', 'policy', 'research', 'health',
  'education', 'environment', 'culture', 'sports', 'science'
]::text[]));
```

### 7.4 緊急対応手順

1. **データベース制約の修正**
   ```bash
   # 上記のSQLスクリプトを実行
   npm run supabase-query < fix_constraints.sql
   ```

2. **XMLパースエラーの対処**
   - Sound on Sound: URLを `https://www.soundonsound.com/news/rss.xml` に変更
   - ARAMA! JAPAN: 一時的に無効化し、別のRSSソースを検討

3. **RSS収集の再実行**
   ```bash
   npm run collect-rss-gemini
   ```

4. **結果の確認**
   ```bash
   npm run check-rss-health
   ```

---
**レポート終了**