-- 開発環境用：RLS一時無効化（必要に応じて後で再有効化）
-- ⚠️ 注意: 本番環境では絶対に実行しないこと！

-- 全テーブルのRLSを無効化
ALTER TABLE news_articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- 確認用：RLS状態をチェック
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS有効'
    ELSE '🔓 RLS無効'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('news_articles', 'tag_master', 'article_tags', 'user_search_history', 'user_preferences')
ORDER BY tablename;