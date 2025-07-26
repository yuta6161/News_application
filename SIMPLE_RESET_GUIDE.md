# 🖱️ 簡単！Supabaseテーブル削除ガイド

SQLを使わずに、ダッシュボードで簡単にテーブルを削除する方法です。

## 🎯 方法1: ダッシュボードで手動削除（推奨）

### Step 1: Supabaseダッシュボードにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左サイドバーから **「Table Editor」** をクリック

### Step 2: テーブルを一つずつ削除

既存のテーブルを以下の順序で削除してください：

1. **`article_interactions`テーブル**（もしあれば）
   - テーブル一覧から `article_interactions` を選択
   - 右上の **「...」（3点メニュー）** をクリック
   - **「Delete table」** を選択
   - 確認ダイアログで **「Delete」** をクリック

2. **`user_preferences`テーブル**（もしあれば）
   - 同様の手順で削除

3. **`news_articles`テーブル**
   - 同様の手順で削除

### Step 3: 新しいスキーマの構築

1. 左サイドバーから **「SQL Editor」** をクリック
2. 新しいクエリを作成
3. `database_fresh_install.sql` の内容をコピー&ペースト
4. **「Run」** ボタンをクリック

## 🎯 方法2: SQLで一括削除（上級者向け）

### 簡単なSQL版

もしSQLに慣れているなら、以下の短いクエリでも削除できます：

```sql
-- 依存関係を考慮した順序で削除
DROP TABLE IF EXISTS article_interactions CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS news_articles CASCADE;

-- ビューと関数も削除（もしあれば）
DROP VIEW IF EXISTS popular_articles CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_category_counts() CASCADE;
DROP FUNCTION IF EXISTS get_personalized_articles(TEXT, INTEGER) CASCADE;
```

## 🤔 DELETE vs DROP の違い

### ❌ DELETE（データだけ削除）
```sql
DELETE FROM news_articles;  -- データだけ消える、テーブル構造は残る
```

- **用途**: テーブルの中身を空にしたい時
- **残るもの**: テーブル構造、カラム、制約、インデックス
- **問題**: 間違った設計のテーブル構造はそのまま

### ✅ DROP（テーブル自体を削除）
```sql
DROP TABLE news_articles;  -- テーブル構造ごと完全削除
```

- **用途**: テーブル自体を完全に削除したい時
- **削除されるもの**: データ、テーブル構造、制約、インデックス、全て
- **メリット**: 新しい設計で作り直せる

## 🔄 なぜDROPが必要？

あなたの既存テーブルには以下の問題があります：

```sql
-- 😤 現在の間違った設計
importance_score INTEGER DEFAULT 3 CHECK (1 <= importance_score <= 5)
category CHECK (category IN ('Tech', 'Business', 'World', 'Sports', 'Entertainment'))

-- ✨ 正しい設計（設計書準拠）
importance_score NUMERIC(3,1) DEFAULT 5.0 CHECK (1.0 <= importance_score <= 10.0)
category CHECK (category IN ('Tech', 'Business', 'AI', 'Startup', 'General'))
```

**DELETEだけでは**：
- ❌ データ型（INTEGER → NUMERIC）は変更できない
- ❌ 制約（1-5 → 1.0-10.0）は変更できない
- ❌ カテゴリ制約も変更できない
- ❌ 不要なカラムは残ったまま

**DROPすれば**：
- ✅ 完全に新しい設計で作り直せる
- ✅ 設計書通りの完璧なテーブル構造
- ✅ Phase 4.5用カラムも最初から準備

## 🆘 よくある質問

### Q: データがなくなるのが心配...
**A**: 開発段階なので、サンプルデータは `database_fresh_install.sql` で自動挿入されます。

### Q: ダッシュボードでテーブルが見つからない
**A**: 既にないか、別の名前の可能性があります。「Table Editor」で確認してください。

### Q: 削除できないエラーが出る
**A**: 依存関係がある可能性があります。ビューや外部キーがあるテーブルから先に削除してください。

### Q: 新しいスキーマ作成でエラー
**A**: 削除が完全に終わっていない可能性があります。テーブル一覧を確認してください。

## 📞 サポート

手順で困ったら、スクリーンショットと一緒に質問してくださいね！

---

**推奨**: 初心者の方は**方法1のダッシュボード削除**がお勧めです！