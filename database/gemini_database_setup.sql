-- =====================================================
-- Gemini版 AIニュースアプリ データベース構築スクリプト
-- =====================================================
-- 実行日: 2025-01-25
-- 目的: 既存テーブルを削除し、Gemini版の新しい構造で再構築
-- =====================================================

-- Step 1: 既存テーブルの削除（依存関係順）
-- =====================================================

-- 外部キー制約があるテーブルから順番に削除
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_search_history CASCADE;
DROP TABLE IF EXISTS article_tags CASCADE;
DROP TABLE IF EXISTS tag_master CASCADE;
DROP TABLE IF EXISTS news_articles CASCADE;

-- 既存インデックスもクリーンアップ（念のため）
DROP INDEX IF EXISTS idx_news_articles_published_at;
DROP INDEX IF EXISTS idx_news_articles_category;
DROP INDEX IF EXISTS idx_news_articles_importance_score;
DROP INDEX IF EXISTS idx_news_articles_quality_level;

-- Step 2: 新しいテーブル構造の作成
-- =====================================================

-- 2-1. news_articles テーブル（Gemini版）
CREATE TABLE news_articles (
  -- 基本識別情報
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT UNIQUE NOT NULL,
  
  -- 記事コンテンツ
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  ai_summary TEXT,  -- Gemini生成要約
  
  -- 記事メタ情報
  source_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Tech', 'Business', 'AI', 'Startup', 'General', 'Game', 'World', 'Sports')),
  image_url TEXT,
  
  -- 時間情報
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 言語・翻訳情報
  original_language TEXT NOT NULL DEFAULT 'ja',
  is_translated BOOLEAN DEFAULT FALSE,
  source_country TEXT NOT NULL DEFAULT 'JP',
  
  -- AI分析情報（Gemini Flash）
  importance_score NUMERIC(3,1) NOT NULL DEFAULT 5.0 CHECK (importance_score >= 1.0 AND importance_score <= 10.0),
  quality_level TEXT DEFAULT 'basic' CHECK (quality_level IN ('basic', 'pending_enhancement', 'enhanced')),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  analysis_version TEXT DEFAULT '1.0',
  
  -- 検索強化型要約用
  enhanced_summary TEXT,
  enhanced_sources TEXT[],
  processing_cost DECIMAL,
  
  -- 廃止予定フィールド（後方互換性のため残す）
  tags TEXT[] DEFAULT '{}'
);

-- 2-2. tag_master テーブル（新規）
CREATE TABLE tag_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'company', 'technology', 'announcement_type', 'importance', 
    'platform', 'genre', 'price_range', 'rating', 'auto_generated'
  )),
  parent_category TEXT,
  description TEXT,
  base_reliability NUMERIC(3,1) DEFAULT 5.0 CHECK (base_reliability >= 1.0 AND base_reliability <= 10.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2-3. article_tags テーブル（新規）
CREATE TABLE article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag_master(id) ON DELETE CASCADE,
  confidence_score NUMERIC(3,1) NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0.1 AND confidence_score <= 1.0),
  assigned_by TEXT NOT NULL DEFAULT 'gemini_flash' CHECK (assigned_by IN ('gemini_flash', 'user', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じ記事に同じタグは1つだけ
  UNIQUE(article_id, tag_id)
);

-- 2-4. user_search_history テーブル（新規）
CREATE TABLE user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  parsed_intent JSONB,
  result_count INTEGER,
  clicked_articles UUID[],
  search_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2-5. user_preferences テーブル（新規）
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_tags UUID[],
  excluded_tags UUID[],
  tag_weights JSONB,
  reading_patterns JSONB,
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユーザーごとに1つの設定のみ
  UNIQUE(user_id)
);

-- Step 3: インデックスの作成
-- =====================================================

-- news_articles のインデックス
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_importance_score ON news_articles(importance_score DESC);
CREATE INDEX idx_news_articles_quality_level ON news_articles(quality_level);
CREATE INDEX idx_news_articles_source_url ON news_articles(source_url);

-- tag_master のインデックス
CREATE INDEX idx_tag_master_category ON tag_master(category);
CREATE INDEX idx_tag_master_tag_name ON tag_master(tag_name);
CREATE INDEX idx_tag_master_parent_category ON tag_master(parent_category);

-- article_tags のインデックス
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX idx_article_tags_confidence ON article_tags(confidence_score DESC);

-- user_search_history のインデックス
CREATE INDEX idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX idx_user_search_history_created_at ON user_search_history(created_at DESC);

-- user_preferences のインデックス
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Step 4: Row Level Security (RLS) の設定
-- =====================================================

-- news_articles: 全員が読み取り可能
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_articles_select_policy" ON news_articles
  FOR SELECT USING (true);

-- tag_master: 全員が読み取り可能
ALTER TABLE tag_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag_master_select_policy" ON tag_master
  FOR SELECT USING (true);

-- article_tags: 全員が読み取り可能
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "article_tags_select_policy" ON article_tags
  FOR SELECT USING (true);

-- user_search_history: ユーザー自身のデータのみ
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_search_history_policy" ON user_search_history
  FOR ALL USING (auth.uid() = user_id);

-- user_preferences: ユーザー自身のデータのみ
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_policy" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Step 5: 確認用クエリ
-- =====================================================

-- テーブル作成確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('news_articles', 'tag_master', 'article_tags', 'user_search_history', 'user_preferences')
ORDER BY table_name;

-- カラム構成確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'news_articles'
ORDER BY ordinal_position;

-- インデックス確認
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('news_articles', 'tag_master', 'article_tags')
ORDER BY tablename, indexname;

-- =====================================================
-- 構築完了
-- =====================================================
-- 次のステップ: タグマスターの初期データ投入
-- コマンド: npm run init-tags
-- =====================================================