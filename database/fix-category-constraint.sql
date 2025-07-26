-- news_articlesテーブルのカテゴリ制約を更新してConspiracyを許可

-- 1. 現在の制約を確認
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'news_articles'::regclass 
  AND conname LIKE '%category%';

-- 2. 既存のカテゴリ制約を削除
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;

-- 3. Conspiracyを含む新しい制約を追加
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check 
CHECK (category IN (
  'Tech', 
  'Business', 
  'World', 
  'Sports', 
  'Entertainment',
  'Conspiracy'
));

-- 4. 制約更新確認
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'news_articles'::regclass 
  AND conname LIKE '%category%';

-- 5. テスト用記事のカテゴリを更新
UPDATE news_articles 
SET category = 'Conspiracy' 
WHERE source_name IN ('Zero Hedge', 'The Vigilant Citizen', 'Global Research')
   OR title ILIKE '%Federal Reserve%'
   OR title ILIKE '%World Economic Forum%'
   OR title ILIKE '%Mainstream Media%'
   OR title ILIKE '%Symbolism%'
   OR title ILIKE '%Digital Currency%';

-- 6. 更新結果確認
SELECT 
    id,
    title,
    category,
    source_name,
    created_at
FROM news_articles 
WHERE category = 'Conspiracy'
ORDER BY created_at DESC;