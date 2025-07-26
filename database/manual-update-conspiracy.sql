-- 陰謀論記事のカテゴリを手動更新するSQL

-- 1. 制約を一時的に無効化
ALTER TABLE news_articles DISABLE ROW LEVEL SECURITY;

-- 2. テスト用陰謀論記事のカテゴリを更新
UPDATE news_articles 
SET category = 'Conspiracy' 
WHERE source_name IN ('Zero Hedge', 'The Vigilant Citizen', 'Global Research')
   OR title LIKE '%Federal Reserve%'
   OR title LIKE '%World Economic Forum%'
   OR title LIKE '%Mainstream Media%'
   OR title LIKE '%Symbolism%'
   OR title LIKE '%Digital Currency%';

-- 3. 更新結果確認
SELECT 
    id,
    title,
    category,
    source_name,
    created_at
FROM news_articles 
WHERE category = 'Conspiracy'
ORDER BY created_at DESC;

-- 4. 制約を再有効化（オプション）
-- ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;