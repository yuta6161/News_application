-- ========================================
-- AIニュースアプリ用データベーススキーマ【設計書完全準拠版】
-- 2025年1月作成 - Phase 3 RSS収集システム対応
-- ========================================

-- ========================================
-- 1. news_articlesテーブル【完全版】
-- ========================================
CREATE TABLE IF NOT EXISTS news_articles (
  -- 基本識別情報
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT UNIQUE NOT NULL, -- 個別記事URL（重複チェック用）
  
  -- 記事コンテンツ
  title TEXT NOT NULL,
  summary TEXT NOT NULL, -- RSS要約（現在）／表示用要約（将来）
  ai_summary TEXT, -- AI生成要約（Phase 4で使用）
  
  -- 記事メタ情報
  source_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Tech', 'Business', 'AI', 'Startup', 'General')),
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  
  -- 時間情報
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 言語・翻訳情報
  original_language TEXT NOT NULL DEFAULT 'ja',
  is_translated BOOLEAN DEFAULT FALSE,
  source_country TEXT NOT NULL DEFAULT 'JP',
  
  -- 重要度評価（設計書準拠：NUMERIC(3,1) 1.0-10.0）
  importance_score NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  
  -- 将来の拡張用（Phase 4.5）
  enhanced_summary TEXT, -- 検索強化型要約
  enhanced_sources TEXT[], -- 参照した情報源リスト
  quality_level TEXT CHECK (quality_level IN ('basic', 'enhanced')), -- 要約品質レベル
  processing_cost DECIMAL, -- API処理コスト
  
  -- 制約
  CONSTRAINT news_articles_importance_score_check 
    CHECK (importance_score >= 1.0 AND importance_score <= 10.0)
);

-- ========================================
-- 2. インデックス作成（パフォーマンス向上）
-- ========================================
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_importance_score ON news_articles(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_url ON news_articles(source_url);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_country ON news_articles(source_country);
CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON news_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_quality_level ON news_articles(quality_level);

-- ========================================
-- 3. 更新時刻の自動更新トリガー
-- ========================================
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
-- 4. user_preferencesテーブル
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

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. article_interactionsテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS article_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('read', 'helpful', 'share')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id, interaction_type)
);

CREATE INDEX IF NOT EXISTS idx_article_interactions_article_id ON article_interactions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_user_id ON article_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_type ON article_interactions(interaction_type);

-- ========================================
-- 6. ビュー作成（人気記事など）
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
ORDER BY na.importance_score DESC, helpful_count DESC, read_count DESC;

-- ========================================
-- 7. RLS（Row Level Security）ポリシー
-- ========================================

-- news_articlesテーブルのRLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles are viewable by everyone" 
  ON news_articles FOR SELECT 
  USING (true);

-- user_preferencesテーブルのRLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can record interactions" 
  ON article_interactions FOR ALL 
  USING (true)
  WITH CHECK (true);

-- ========================================
-- 8. 便利な関数
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
    v_preferred_categories := ARRAY['Tech', 'Business', 'AI', 'Startup', 'General'];
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

-- ========================================
-- 9. サンプルデータ（開発用）
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
  'OpenAI、GPT-5の開発を発表 - 汎用人工知能への大きな一歩',
  'OpenAIが次世代大規模言語モデル「GPT-5」の開発を正式発表。推論能力の大幅向上と、科学研究での活用を想定した新機能が搭載予定。リリースは2025年後半を予定しており、AI業界に大きな影響を与えると予想される。',
  'https://openai.com/blog/gpt-5-announcement',
  'OpenAI Blog',
  'AI',
  ARRAY['OpenAI', 'GPT-5', 'AGI', '大規模言語モデル'],
  NOW() - INTERVAL '1 hour',
  'en',
  true,
  'US',
  9.5
),
(
  'Google、Gemini Proの日本語性能を大幅改善',
  'GoogleがAIモデル「Gemini Pro」の日本語理解と生成能力を大幅に改善したアップデートを発表。従来比で30%の性能向上を実現し、日本市場でのAI活用促進を図る。',
  'https://blog.google/products/gemini/japan-update/',
  'Google AI Blog',
  'AI',
  ARRAY['Google', 'Gemini', '日本語AI', 'Bard'],
  NOW() - INTERVAL '3 hours',
  'ja',
  false,
  'JP',
  8.2
);

-- ========================================
-- 完了メッセージ
-- ========================================
-- 実行完了後のカラム構成:
-- ✅ Required: id, title, summary, source_url, source_name, category, published_at, original_language, source_country, importance_score(NUMERIC)
-- ✅ Optional: tags, image_url, created_at, updated_at, is_translated, ai_summary
-- ✅ Phase 4.5用: enhanced_summary, enhanced_sources, quality_level, processing_cost
-- ✅ 正しいカテゴリ: Tech, Business, AI, Startup, General
-- ✅ 正しい重要度: 1.0-10.0 (NUMERIC(3,1))