-- article_tagsテーブルのスキーマ修正
-- 自動生成タグに対応するため、tag_idをNULLABLEにし、代替フィールドを追加

-- 1. まず既存のテーブルを確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'article_tags' 
ORDER BY ordinal_position;

-- 2. 制約を確認
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'article_tags';

-- 3. 修正案1: tag_idをNULLABLEにして、自動生成タグ用のフィールドを追加
ALTER TABLE article_tags DROP CONSTRAINT IF EXISTS article_tags_tag_id_fkey;
ALTER TABLE article_tags ALTER COLUMN tag_id DROP NOT NULL;

-- 4. 自動生成タグ用のフィールドを追加
ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS tag_name TEXT;
ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;

-- 5. 新しい制約を追加
-- tag_idまたはtag_nameのどちらかは必須
ALTER TABLE article_tags ADD CONSTRAINT article_tags_tag_required 
  CHECK ((tag_id IS NOT NULL) OR (tag_name IS NOT NULL AND is_auto_generated = TRUE));

-- 6. 外部キー制約を復元（NULLの場合はスキップ）
ALTER TABLE article_tags ADD CONSTRAINT article_tags_tag_id_fkey 
  FOREIGN KEY (tag_id) REFERENCES tag_master(id) ON DELETE CASCADE;

-- 7. カテゴリの制約を追加
ALTER TABLE article_tags ADD CONSTRAINT article_tags_category_check 
  CHECK (category IN ('company', 'technology', 'announcement_type', 'importance', 'platform', 'genre', 'price_range', 'rating', 'auto_generated'));

-- 8. 重複制約を修正（tag_idまたはtag_name + categoryで重複回避）
ALTER TABLE article_tags DROP CONSTRAINT IF EXISTS article_tags_article_id_tag_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS article_tags_unique_predefined 
  ON article_tags(article_id, tag_id) 
  WHERE tag_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS article_tags_unique_auto 
  ON article_tags(article_id, tag_name, category) 
  WHERE is_auto_generated = TRUE;

-- 9. 修正後のスキーマ確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'article_tags' 
ORDER BY ordinal_position;