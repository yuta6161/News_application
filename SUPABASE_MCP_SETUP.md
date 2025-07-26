# 🔧 Supabase MCP セットアップガイド

Claude CodeでSupabaseを直接操作できるようにするための設定ガイドです。

## 🎯 Supabase MCPとは？

Claude CodeからSupabaseデータベースを直接操作できる機能です：

- ✅ **テーブル作成・管理**: SQLを書かずにテーブル操作
- ✅ **データクエリ**: 記事の検索・表示・更新
- ✅ **スキーマ管理**: データベース構造の確認・変更
- ✅ **リアルタイム確認**: データの状態をリアルタイムで確認

## 📋 セットアップ手順

### Step 1: Supabaseアクセストークンの取得

1. **Supabaseダッシュボード**にアクセス
   - https://supabase.com/dashboard

2. **Account Settings**に移動
   - 右上のアバター → **Account Settings**

3. **Access Tokens**ページへ
   - 左サイドバーから **Access Tokens** をクリック

4. **新しいトークンを生成**
   - **Generate new token** をクリック
   - トークン名: `Claude Code MCP` （任意）
   - **Generate token** をクリック

5. **トークンをコピー**
   - ⚠️ **重要**: 生成されたトークンをすぐにコピーしてください
   - 後で見ることはできません

### Step 2: 環境変数の設定

1. `.env.local` ファイルを編集
   ```bash
   # 既存の設定に追加
   SUPABASE_ACCESS_TOKEN=your_personal_access_token_here
   ```

2. 先ほどコピーしたトークンを貼り付け

### Step 3: MCP設定ファイルの更新

1. `.mcp.json` ファイルを編集
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": [
           "-y",
           "@supabase/mcp-server-supabase@latest",
           "--read-only",
           "--project-ref=nccerxzhcvoaraonvwti"
         ],
         "env": {
           "SUPABASE_ACCESS_TOKEN": "your_actual_token_here"
         }
       }
     }
   }
   ```

2. `YOUR_PERSONAL_ACCESS_TOKEN_HERE` を実際のトークンに置き換え

### Step 4: Claude Codeの再起動

1. Claude Codeを完全に終了
2. 再起動して設定を反映

## 🧪 動作確認

Claude Codeが再起動したら、以下のことが可能になります：

### データベース情報の確認
```
「news_articlesテーブルの構造を教えて」
「記事の件数を教えて」
「importance_scoreが8.0以上の記事を表示して」
```

### テーブル操作
```
「news_articlesテーブルにサンプルデータを挿入して」
「カテゴリがAIの記事を全て取得して」
「重要度スコアの分布を教えて」
```

### スキーマ管理
```
「テーブル一覧を表示して」
「news_articlesテーブルのインデックスを確認して」
「カラムの制約を表示して」
```

## 🔒 セキュリティ設定

現在の設定は **read-only** モードです：

- ✅ **安全**: データの読み取りのみ可能
- ✅ **確認**: テーブル構造やデータの確認
- ❌ **制限**: データの変更・削除は不可

### フル権限が必要な場合

データベースの変更も行いたい場合は、`.mcp.json` から `--read-only` を削除：

```json
"args": [
  "-y",
  "@supabase/mcp-server-supabase@latest",
  "--project-ref=nccerxzhcvoaraonvwti"
]
```

⚠️ **注意**: フル権限は慎重に使用してください

## 🆘 トラブルシューティング

### MCP接続エラー
- Claude Codeを再起動していますか？
- アクセストークンは正しく設定されていますか？
- プロジェクトREFは正しいですか？

### データが表示されない
- Supabaseにデータが存在しますか？
- RLS（Row Level Security）ポリシーは正しく設定されていますか？

### 権限エラー
- アクセストークンは有効ですか？
- read-onlyモードで書き込み操作をしようとしていませんか？

## 📚 使用例

### 基本的なクエリ
```sql
-- Claude Codeで「記事一覧を表示して」と言うだけで実行
SELECT title, category, importance_score 
FROM news_articles 
ORDER BY importance_score DESC 
LIMIT 10;
```

### データ分析
```sql
-- 「カテゴリ別の記事数を教えて」
SELECT category, COUNT(*) as count 
FROM news_articles 
GROUP BY category 
ORDER BY count DESC;
```

### 重要度分析
```sql
-- 「重要度8.0以上の記事を表示して」
SELECT title, source_name, importance_score 
FROM news_articles 
WHERE importance_score >= 8.0 
ORDER BY importance_score DESC;
```

## 🎉 完了後の確認項目

- [ ] アクセストークンを取得
- [ ] `.env.local` にトークンを設定
- [ ] `.mcp.json` を更新
- [ ] Claude Codeを再起動
- [ ] 「news_articlesテーブルを表示して」でテスト

## 📞 サポート

設定で困ったことがあれば、エラーメッセージと一緒に質問してください！

---

**作成日**: 2025-01-23  
**対象プロジェクト**: nccerxzhcvoaraonvwti  
**MCP バージョン**: @supabase/mcp-server-supabase@latest