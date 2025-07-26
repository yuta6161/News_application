-- AIニュースアプリ用のデータベーススキーマ
-- Supabaseで実行するSQL

-- ========================================
-- 1. news_articlesテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Tech', 'Business', 'World', 'Sports', 'Entertainment')),
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  original_language TEXT NOT NULL DEFAULT 'ja',
  is_translated BOOLEAN DEFAULT FALSE,
  source_country TEXT NOT NULL DEFAULT 'JP',
  importance_score INTEGER NOT NULL DEFAULT 3 CHECK (importance_score >= 1 AND importance_score <= 5)
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_importance_score ON news_articles(importance_score DESC);
CREATE INDEX idx_news_articles_source_country ON news_articles(source_country);
CREATE INDEX idx_news_articles_created_at ON news_articles(created_at DESC);

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. user_preferencesテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  preferred_categories TEXT[] DEFAULT '{}',
  excluded_keywords TEXT[] DEFAULT '{}',
  preferred_languages TEXT[] DEFAULT ARRAY['ja', 'en'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- 更新時刻の自動更新トリガー
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. article_interactionsテーブル（追加）
-- ========================================
CREATE TABLE IF NOT EXISTS article_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('read', 'helpful', 'share')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id, interaction_type)
);

-- インデックスの作成
CREATE INDEX idx_article_interactions_article_id ON article_interactions(article_id);
CREATE INDEX idx_article_interactions_user_id ON article_interactions(user_id);
CREATE INDEX idx_article_interactions_type ON article_interactions(interaction_type);

-- ========================================
-- 4. ビューの作成（人気記事など）
-- ========================================
CREATE OR REPLACE VIEW popular_articles AS
SELECT 
  na.*,
  COUNT(DISTINCT ai.user_id) FILTER (WHERE ai.interaction_type = 'read') as read_count,
  COUNT(DISTINCT ai.user_id) FILTER (WHERE ai.interaction_type = 'helpful') as helpful_count
FROM news_articles na
LEFT JOIN article_interactions ai ON na.id = ai.article_id
WHERE na.published_at > NOW() - INTERVAL '7 days'
GROUP BY na.id
ORDER BY helpful_count DESC, read_count DESC;

-- ========================================
-- 5. RLS（Row Level Security）ポリシー
-- ========================================

-- news_articlesテーブルのRLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが記事を読める
CREATE POLICY "Articles are viewable by everyone" 
  ON news_articles FOR SELECT 
  USING (true);

-- 管理者のみが記事を作成・更新・削除できる（将来的に実装）
-- CREATE POLICY "Only admins can insert articles" 
--   ON news_articles FOR INSERT 
--   WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- user_preferencesテーブルのRLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ参照・更新できる
CREATE POLICY "Users can view own preferences" 
  ON user_preferences FOR SELECT 
  USING (user_id = auth.uid()::text OR user_id = 'anonymous');

CREATE POLICY "Users can update own preferences" 
  ON user_preferences FOR UPDATE 
  USING (user_id = auth.uid()::text OR user_id = 'anonymous');

CREATE POLICY "Users can insert own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (user_id = auth.uid()::text OR user_id = 'anonymous');

-- article_interactionsテーブルのRLS
ALTER TABLE article_interactions ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがインタラクションを記録できる
CREATE POLICY "Users can record interactions" 
  ON article_interactions FOR ALL 
  USING (true)
  WITH CHECK (true);

-- ========================================
-- 6. サンプルデータ（開発用）
-- ========================================
INSERT INTO news_articles (
  title, 
  summary, 
  source_url, 
  source_name, 
  category, 
  tags, 
  published_at,
  original_language,
  is_translated,
  source_country,
  importance_score
) VALUES 
(
  'Supabaseがリアルタイム機能を大幅強化、WebSocketの性能が10倍に',
  'オープンソースのBaaS「Supabase」が最新アップデートでリアルタイム機能を強化。WebSocketの同時接続数が10倍に向上し、チャットアプリやライブ配信サービスの開発が容易に。',
  'https://supabase.com/blog/realtime-performance-improvements',
  'Supabase Blog',
  'Tech',
  ARRAY['Supabase', 'WebSocket', 'リアルタイム', 'BaaS'],
  NOW() - INTERVAL '2 hours',
  'en',
  true,
  'US',
  4
),
(
  '東京都、AIを活用した交通渋滞予測システムを導入',
  '東京都がAIによる交通渋滞予測システムを2024年4月から本格導入。過去の交通データとリアルタイム情報を組み合わせ、最大1時間先の渋滞を95%の精度で予測可能に。',
  'https://www.metro.tokyo.lg.jp/tosei/hodohappyo/press/2024/03/04/01.html',
  '東京都',
  'Tech',
  ARRAY['AI', '交通', 'スマートシティ', '東京'],
  NOW() - INTERVAL '5 hours',
  'ja',
  false,
  'JP',
  3
);

-- ========================================
-- 7. 便利な関数
-- ========================================

-- カテゴリー別の記事数を取得
CREATE OR REPLACE FUNCTION get_category_counts()
RETURNS TABLE(category TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    na.category,
    COUNT(*)::BIGINT
  FROM news_articles na
  WHERE na.published_at > NOW() - INTERVAL '24 hours'
  GROUP BY na.category
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- ユーザーの興味に基づいた記事を取得
CREATE OR REPLACE FUNCTION get_personalized_articles(p_user_id TEXT, p_limit INTEGER DEFAULT 20)
RETURNS SETOF news_articles AS $$
DECLARE
  v_preferred_categories TEXT[];
  v_excluded_keywords TEXT[];
BEGIN
  -- ユーザー設定を取得
  SELECT preferred_categories, excluded_keywords
  INTO v_preferred_categories, v_excluded_keywords
  FROM user_preferences
  WHERE user_id = p_user_id;

  -- 設定がない場合はすべての記事を返す
  IF v_preferred_categories IS NULL THEN
    v_preferred_categories := ARRAY['Tech', 'Business', 'World', 'Sports', 'Entertainment'];
  END IF;

  RETURN QUERY
  SELECT na.*
  FROM news_articles na
  WHERE 
    na.category = ANY(v_preferred_categories)
    AND NOT EXISTS (
      SELECT 1 
      FROM unnest(v_excluded_keywords) AS keyword
      WHERE na.title ILIKE '%' || keyword || '%' 
         OR na.summary ILIKE '%' || keyword || '%'
    )
  ORDER BY 
    na.importance_score DESC,
    na.published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;