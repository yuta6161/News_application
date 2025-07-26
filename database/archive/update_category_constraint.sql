-- Step 1: 古いCHECK制約を削除
ALTER TABLE news_articles DROP CONSTRAINT news_articles_category_check;

-- Step 2: 新しいCHECK制約を追加（フロントエンドに合わせる）
ALTER TABLE news_articles ADD CONSTRAINT news_articles_category_check 
    CHECK (category IN ('Tech', 'Business', 'World', 'Sports', 'Entertainment'));

-- Step 3: 既存データのカテゴリーを更新
UPDATE news_articles SET category = 'Tech' WHERE category = 'AI';
UPDATE news_articles SET category = 'World' WHERE category = 'General';
UPDATE news_articles SET category = 'World' WHERE category = 'Startup';

-- Step 4: 確認用クエリ
SELECT category, COUNT(*) as count FROM news_articles GROUP BY category ORDER BY category;