-- news_articlesテーブルのカテゴリ制約を更新してConspiracyを許可
-- エラーが発生しない簡潔版

-- 1. 既存のカテゴリ制約を削除
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;

-- 2. Conspiracyを含む新しい制約を追加
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check 
CHECK (category IN (
  'Tech', 
  'Business', 
  'World', 
  'Sports', 
  'Entertainment',
  'Conspiracy'
));

-- 3. テスト用記事のカテゴリを更新
UPDATE news_articles 
SET category = 'Conspiracy' 
WHERE source_name IN ('Zero Hedge', 'The Vigilant Citizen', 'Global Research');

-- 4. 更新結果確認
SELECT 
    COUNT(*) as conspiracy_articles_count,
    'Conspiracy記事数' as description
FROM news_articles 
WHERE category = 'Conspiracy';

-- 5. カテゴリ別統計
SELECT 
    category,
    COUNT(*) as count
FROM news_articles 
GROUP BY category 
ORDER BY count DESC;