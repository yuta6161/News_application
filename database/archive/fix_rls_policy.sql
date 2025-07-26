-- news_articlesテーブルに記事挿入を許可するRLSポリシーを追加
-- RSS収集スクリプトが動作するように一時的に全員に挿入権限を付与

CREATE POLICY "Allow RSS collection to insert articles" 
  ON news_articles FOR INSERT 
  WITH CHECK (true);

-- 必要に応じて、UPDATE/DELETE用のポリシーも追加
CREATE POLICY "Allow RSS collection to update articles" 
  ON news_articles FOR UPDATE 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow RSS collection to delete articles" 
  ON news_articles FOR DELETE 
  USING (true);