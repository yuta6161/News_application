# 🗃️ データベース完全リセット手順書

既存のSupabaseテーブル（"AI News App Database Schema"と"RSS Collection System Database Enhancement"）を削除して、設計書完全準拠の新しいスキーマで再構築する手順です。

## ⚠️ 重要な注意事項

- **全てのデータが削除されます**
- 必要なデータがある場合は、事前にバックアップを取ってください
- 実行は自己責任でお願いします

## 📋 実行手順

### Step 1: Supabaseダッシュボードにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック

### Step 2: 既存テーブルの完全削除

1. 新しいクエリを作成
2. `database_complete_reset.sql` の内容をコピー&ペースト
3. **Run** ボタンをクリックして実行

```sql
-- ⚠️ 警告: 全てのデータが削除されます
-- database_complete_reset.sql の内容を実行
```

**実行結果の確認**:
- エラーが出ていないことを確認
- 「Table」タブを確認して、既存のテーブルが全て削除されていることを確認

### Step 3: 新しいスキーマの構築

1. 新しいクエリを作成
2. `database_fresh_install.sql` の内容をコピー&ペースト  
3. **Run** ボタンをクリックして実行

```sql
-- 設計書完全準拠の新しいスキーマを構築
-- database_fresh_install.sql の内容を実行
```

**実行結果の確認**:
- エラーが出ていないことを確認
- 「Table」タブを確認して、以下のテーブルが作成されていることを確認:
  - `news_articles`
  - `user_preferences` 
  - `article_interactions`

### Step 4: データ構造の確認

Supabaseダッシュボードの「Table」タブで以下を確認してください：

#### news_articlesテーブル
- ✅ `importance_score`: `numeric(3,1)` 型
- ✅ `category`: CHECK制約で `'Tech', 'Business', 'AI', 'Startup', 'General'`
- ✅ Phase 4.5用カラム: `enhanced_summary`, `enhanced_sources`, `quality_level`, `processing_cost`
- ✅ サンプルデータが3件挿入されている

#### インデックス
- ✅ `idx_news_articles_importance_score`
- ✅ `idx_news_articles_category`
- ✅ `idx_news_articles_published_at` など

### Step 5: 動作テスト

1. **RSS収集のテスト**
   ```bash
   cd /home/lain6161/News_application
   npm run collect-rss
   ```

2. **アプリの動作確認**
   ```bash
   npm run dev
   # http://localhost:3000 にアクセス
   ```

3. **データベースの確認**
   - Supabaseダッシュボードで `news_articles` テーブルを確認
   - 新しい記事が正しく保存されているかチェック

## 🎯 完成後の構造

### テーブル構成
```
news_articles (メインテーブル)
├── 基本識別: id, source_url
├── コンテンツ: title, summary, ai_summary
├── メタ情報: source_name, category, tags, image_url
├── 時間情報: published_at, created_at, updated_at
├── 言語情報: original_language, is_translated, source_country
├── 重要度: importance_score (NUMERIC(3,1))
└── 将来拡張: enhanced_summary, enhanced_sources, quality_level, processing_cost

user_preferences (ユーザー設定)
└── ユーザーごとのカテゴリ・言語設定

article_interactions (記事インタラクション)
└── 読了・役立つ・シェアの記録
```

### 主要な特徴
- ✅ **重要度システム**: 1.0-10.0の精密な評価（8.0以上が検索強化対象）
- ✅ **カテゴリ統一**: RSSソースと完全一致
- ✅ **Phase 4.5準備**: 検索強化型要約用カラム完備
- ✅ **パフォーマンス**: 最適化されたインデックス
- ✅ **セキュリティ**: RLSポリシー適用済み

## 🆘 トラブルシューティング

### エラーが発生した場合

1. **権限エラー**
   - Supabaseプロジェクトの管理者権限があることを確認
   - RLS（Row Level Security）の設定を確認

2. **削除に失敗した場合**
   - 依存関係があるオブジェクト（ビュー、関数など）を先に削除
   - `CASCADE` オプションで強制削除

3. **作成に失敗した場合**
   - SQLの構文エラーをチェック
   - 一つずつ実行して問題箇所を特定

### よくある問題

- **Q**: `news_articles`テーブルが既に存在するエラー
- **A**: Step 2の削除が完了していません。再度実行してください。

- **Q**: サンプルデータの挿入でエラー
- **A**: 制約違反の可能性があります。データを確認してください。

- **Q**: RSS収集でエラー
- **A**: 環境変数とSupabase接続を確認してください。

## 📞 サポート

問題が解決しない場合は、GitHubのIssuesまたはDiscordでお知らせください。

---

**作成日**: 2025-01-23  
**作成者**: Claude Code Assistant  
**バージョン**: v1.0