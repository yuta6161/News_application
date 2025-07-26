-- サンプルデータを削除して、実際のRSSデータだけにする
DELETE FROM news_articles WHERE source_name IN ('OpenAI Blog', 'Google AI Blog', 'Anthropic Blog');

-- または全削除する場合（こちらの方が確実）
-- DELETE FROM news_articles;