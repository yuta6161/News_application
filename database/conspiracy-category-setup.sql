-- 陰謀論カテゴリの完全セットアップ
-- 実行順序: このファイルをSupabase SQL Editorで実行

-- ===========================================
-- 1. news_articlesテーブルのカテゴリ制約更新
-- ===========================================

-- 既存のカテゴリ制約を削除
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;

-- Conspiracyを含む新しい制約を追加
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check 
CHECK (category IN (
  'Tech', 
  'Business', 
  'World', 
  'Sports', 
  'Entertainment',
  'Conspiracy'
));

-- ===========================================
-- 2. tag_masterテーブルのカテゴリ制約更新
-- ===========================================

-- 既存のカテゴリ制約を削除
ALTER TABLE tag_master DROP CONSTRAINT IF EXISTS tag_master_category_check;

-- 陰謀論関連カテゴリを含む新しい制約を追加
ALTER TABLE tag_master ADD CONSTRAINT tag_master_category_check 
CHECK (category IN (
  'company', 
  'technology', 
  'announcement_type', 
  'importance', 
  'platform', 
  'genre', 
  'price_range', 
  'rating',
  'topic',
  'source_type'
));

-- ===========================================
-- 3. 既存記事のカテゴリ更新
-- ===========================================

-- 陰謀論系ソースからの記事をConspiracyカテゴリに更新
UPDATE news_articles 
SET category = 'Conspiracy' 
WHERE source_name IN ('Zero Hedge', 'The Vigilant Citizen', 'Global Research', 'InfoWars', 'Natural News')
   OR title ILIKE '%Federal Reserve%'
   OR title ILIKE '%World Economic Forum%'
   OR title ILIKE '%Mainstream Media%'
   OR title ILIKE '%Symbolism%'
   OR title ILIKE '%Digital Currency%'
   OR title ILIKE '%Deep State%'
   OR title ILIKE '%Globalism%'
   OR title ILIKE '%Conspiracy%';

-- ===========================================
-- 4. カテゴリ別統計ビューの作成
-- ===========================================

-- カテゴリ別記事数確認用ビュー
CREATE OR REPLACE VIEW category_stats AS
SELECT 
  category,
  COUNT(*) as article_count,
  COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as ai_analyzed_count,
  ROUND(AVG(importance_score), 2) as avg_importance
FROM news_articles 
GROUP BY category 
ORDER BY article_count DESC;

-- 陰謀論記事の詳細統計ビュー
CREATE OR REPLACE VIEW conspiracy_article_stats AS
SELECT 
  na.id,
  na.title,
  na.source_name,
  na.importance_score,
  na.published_at,
  COUNT(at.id) as tag_count,
  ARRAY_AGG(at.tag_name) FILTER (WHERE at.tag_name IS NOT NULL) as tags
FROM news_articles na
LEFT JOIN article_tags at ON na.id = at.article_id
WHERE na.category = 'Conspiracy'
GROUP BY na.id, na.title, na.source_name, na.importance_score, na.published_at
ORDER BY na.published_at DESC;

-- ===========================================
-- 5. 実行結果確認
-- ===========================================

-- カテゴリ別記事数の確認
SELECT 
    category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM news_articles 
GROUP BY category 
ORDER BY count DESC;

-- 陰謀論記事の確認
SELECT 
    id,
    title,
    source_name,
    category,
    created_at
FROM news_articles 
WHERE category = 'Conspiracy'
ORDER BY created_at DESC
LIMIT 10;

-- 成功メッセージ
SELECT '✅ 陰謀論カテゴリのセットアップが完了しました！' as status;