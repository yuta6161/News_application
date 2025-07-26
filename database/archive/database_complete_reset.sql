-- ========================================
-- 【完全リセット】既存テーブル削除SQL
-- ⚠️ 警告: このスクリプトは全てのデータを削除します
-- 実行前に必要なデータのバックアップを取ってください
-- ========================================

-- Step 1: 既存のビューを削除
DROP VIEW IF EXISTS popular_articles CASCADE;

-- Step 2: 既存のトリガーを削除
DROP TRIGGER IF EXISTS update_news_articles_updated_at ON news_articles;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Step 3: 既存の関数を削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_category_counts() CASCADE;
DROP FUNCTION IF EXISTS get_personalized_articles(TEXT, INTEGER) CASCADE;

-- Step 4: 既存のテーブルを削除（依存関係を考慮した順序）
DROP TABLE IF EXISTS article_interactions CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS news_articles CASCADE;

-- Step 5: 既存のポリシーを削除（テーブル削除で自動削除されるが念のため）
-- RLSポリシーはテーブルと一緒に削除される

-- Step 6: 既存のインデックスを削除（テーブル削除で自動削除されるが念のため）
-- インデックスもテーブルと一緒に削除される

-- ========================================
-- 確認用クエリ（削除後の確認）
-- ========================================

-- テーブル一覧の確認（空になっているはず）
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('news_articles', 'user_preferences', 'article_interactions');

-- 関数一覧の確認（削除されているはず）
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('update_updated_at_column', 'get_category_counts', 'get_personalized_articles');

-- ビュー一覧の確認（削除されているはず）
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'popular_articles';

-- ========================================
-- 実行完了メッセージ
-- ========================================
-- 🧹 完全削除完了！
-- 
-- ✅ 削除されたもの:
-- - news_articles テーブル
-- - user_preferences テーブル  
-- - article_interactions テーブル
-- - popular_articles ビュー
-- - 全ての関数とトリガー
-- - 全てのRLSポリシー
-- - 全てのインデックス
-- 
-- 🎯 次のステップ:
-- database_fresh_install.sql を実行して新しいスキーマを作成してください