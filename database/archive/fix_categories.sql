-- 既存記事のカテゴリーをフロントエンドに合わせて修正

-- AI → Tech に変更
UPDATE news_articles SET category = 'Tech' WHERE category = 'AI';

-- General → World に変更  
UPDATE news_articles SET category = 'World' WHERE category = 'General';

-- Startup → World に変更（国際的な技術・ビジネス話題として）
UPDATE news_articles SET category = 'World' WHERE category = 'Startup';

-- 確認用クエリ
SELECT category, COUNT(*) as count FROM news_articles GROUP BY category ORDER BY category;