-- 一時的にRLSを無効化してRSS収集を実行できるようにする
-- ⚠️ これは開発環境でのみ使用すること！

-- RLSを一時的に無効化
ALTER TABLE news_articles DISABLE ROW LEVEL SECURITY;

-- 使用後は再度有効化すること：
-- ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;