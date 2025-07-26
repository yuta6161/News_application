-- ========================================
-- 【最終版】データベース修正マイグレーションSQL
-- 設計書完全準拠への移行スクリプト
-- 実行前に必ずバックアップを取ってください
-- ========================================

-- Step 1: 既存のビューを一時削除（型変更のため）
DROP VIEW IF EXISTS popular_articles;

-- Step 2: 重複・不要カラムの削除
ALTER TABLE news_articles DROP COLUMN IF EXISTS link;         -- source_urlと重複
ALTER TABLE news_articles DROP COLUMN IF EXISTS language;     -- original_languageと重複
ALTER TABLE news_articles DROP COLUMN IF EXISTS priority;     -- importance_scoreと競合
ALTER TABLE news_articles DROP COLUMN IF EXISTS original_summary; -- summaryと役割重複

-- Step 3: 既存の制約を削除
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_importance_score_check;
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;

-- Step 4: importance_scoreをNUMERIC型に変更（設計書準拠）
ALTER TABLE news_articles ALTER COLUMN importance_score TYPE NUMERIC(3,1);

-- Step 5: 新しい制約を追加（1.0-10.0の範囲）
ALTER TABLE news_articles ADD CONSTRAINT news_articles_importance_score_check 
CHECK (importance_score >= 1.0 AND importance_score <= 10.0);

-- Step 6: カテゴリー制約を正しいものに変更（RSSソースと一致）
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check 
CHECK (category IN ('Tech', 'Business', 'AI', 'Startup', 'General'));

-- Step 7: デフォルト値を5.0に変更
ALTER TABLE news_articles ALTER COLUMN importance_score SET DEFAULT 5.0;

-- Step 8: 将来の拡張用カラムを追加（Phase 4.5用）
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS enhanced_summary TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS enhanced_sources TEXT[];
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS quality_level TEXT 
CHECK (quality_level IN ('basic', 'enhanced'));
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS processing_cost DECIMAL;

-- Step 9: 必要なインデックスの追加
CREATE INDEX IF NOT EXISTS idx_news_articles_importance_score ON news_articles(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_quality_level ON news_articles(quality_level);

-- Step 10: popular_articlesビューを再作成（重要度順ソート対応）
CREATE OR REPLACE VIEW popular_articles AS
SELECT 
  na.*,
  COUNT(DISTINCT ai.user_id) FILTER (WHERE ai.interaction_type = 'read') as read_count,
  COUNT(DISTINCT ai.user_id) FILTER (WHERE ai.interaction_type = 'helpful') as helpful_count
FROM news_articles na
LEFT JOIN article_interactions ai ON na.id = ai.article_id
WHERE na.published_at > NOW() - INTERVAL '7 days'
GROUP BY na.id
ORDER BY na.importance_score DESC, helpful_count DESC, read_count DESC;

-- Step 11: 既存データの調整
-- 重要度を基準値に統一（新しい計算ロジックで再計算されるため）
UPDATE news_articles SET importance_score = 5.0;

-- Step 12: 古いカテゴリーを新しいものに変換
UPDATE news_articles SET category = 'General' WHERE category = 'World';
UPDATE news_articles SET category = 'General' WHERE category = 'Sports';
UPDATE news_articles SET category = 'General' WHERE category = 'Entertainment';

-- ========================================
-- 確認用クエリ（実行後にチェック）
-- ========================================

-- テーブル構造の確認
SELECT 
  column_name, 
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'news_articles'
ORDER BY ordinal_position;

-- 制約の確認
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'news_articles';

-- カテゴリー別記事数の確認
SELECT category, COUNT(*) as count
FROM news_articles 
GROUP BY category
ORDER BY count DESC;

-- 重要度の分布確認
SELECT 
  importance_score,
  COUNT(*) as count
FROM news_articles 
GROUP BY importance_score
ORDER BY importance_score;

-- ========================================
-- 完了メッセージ
-- ========================================
-- 🎉 マイグレーション完了！
-- 
-- ✅ 修正内容:
-- - importance_score: INTEGER(1-5) → NUMERIC(3,1)(1.0-10.0)
-- - category: 古い値 → 'Tech', 'Business', 'AI', 'Startup', 'General'
-- - 重複カラム削除: link, language, priority, original_summary
-- - Phase 4.5用カラム追加: enhanced_summary, enhanced_sources, quality_level, processing_cost
-- - インデックス最適化
-- 
-- 🔄 次のステップ:
-- 1. RSS収集スクリプトの動作確認
-- 2. importance_calculator.tsの動作テスト
-- 3. 新しいスキーマでの記事保存テスト