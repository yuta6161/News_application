-- 陰謀論カテゴリサポートのためのデータベース制約更新

-- 1. tag_masterテーブルのcategory制約を更新
ALTER TABLE tag_master DROP CONSTRAINT IF EXISTS tag_master_category_check;

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

-- 2. news_articlesテーブルのcategory制約を確認・更新（必要に応じて）
-- この制約は通常、アプリケーションレベルで制御されるが、念のため確認

-- 3. category別記事数確認用ビューの作成（オプション）
CREATE OR REPLACE VIEW category_stats AS
SELECT 
  category,
  COUNT(*) as article_count,
  COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as ai_analyzed_count,
  ROUND(AVG(importance_score), 2) as avg_importance
FROM news_articles 
GROUP BY category 
ORDER BY article_count DESC;

-- 4. 陰謀論関連記事の特別な統計ビュー
CREATE OR REPLACE VIEW conspiracy_article_stats AS
SELECT 
  na.id,
  na.title,
  na.source_name,
  na.importance_score,
  na.published_at,
  COUNT(at.id) as tag_count,
  ARRAY_AGG(at.tag_name) as tags
FROM news_articles na
LEFT JOIN article_tags at ON na.id = at.article_id
WHERE na.category = 'Conspiracy'
GROUP BY na.id, na.title, na.source_name, na.importance_score, na.published_at
ORDER BY na.published_at DESC;

-- 実行ログ
SELECT 'データベース制約更新完了: 陰謀論カテゴリサポート追加' as status;