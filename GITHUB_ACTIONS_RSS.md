# 📡 GitHub Actions RSS自動収集システム

## 概要
このシステムは、GitHub Actionsを使用して1時間に1回RSS収集とGemini AI分析を自動実行します。

## 🔧 セットアップ

### 1. GitHubリポジトリのSecretsを設定

リポジトリの Settings > Secrets and variables > Actions で以下のsecretsを追加してください：

| Secret名 | 値 | 説明 |
|----------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://your-project.supabase.co | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your-anon-key | Supabase Anon Key |
| `GEMINI_API_KEY` | your-gemini-api-key | Google Gemini API Key |

### 2. 自動実行スケジュール

- **実行頻度**: 毎時0分 (UTC時間)
- **日本時間**: 毎時9分 (JST = UTC + 9時間)
- **例**: UTC 00:00 → JST 09:00, UTC 12:00 → JST 21:00

## 🚀 実行方法

### 自動実行（推奨）
コミットをプッシュするだけで、1時間ごとに自動実行されます。

### 手動実行
1. GitHubリポジトリページで「Actions」タブを開く
2. 「RSS Auto Collection with Gemini AI」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. 「Run workflow」を再度クリックして実行

## 📊 実行結果の確認

### GitHub Actions ログ
- Actions タブで実行ログを確認
- 各ステップの詳細情報を表示
- エラー時のデバッグ情報も含む

### 出力される情報
```
📊 処理結果サマリー:
   📰 収集記事数: XX件
   ✨ 新規記事数: XX件  
   🔄 重複記事数: XX件
   🤖 AI分析完了: XX件
   ❌ エラー数: XX件
   ⏱️ 処理時間: XXX秒

📊 データベース統計情報:
   📰 総記事数: XXX件
   📂 カテゴリ別統計: ...
   🌐 ソース別統計: ...
   📅 今日追加: XX件
```

## 🔍 トラブルシューティング

### よくあるエラー

#### 1. 環境変数エラー
```
❌ 必要な環境変数が設定されていません
```
**解決方法**: GitHubのSecretsが正しく設定されているか確認

#### 2. Supabase接続エラー
```
❌ Supabaseエラー: Invalid API key
```
**解決方法**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` が正しいか確認

#### 3. Gemini APIエラー
```
❌ Gemini API接続失敗
```
**解決方法**: `GEMINI_API_KEY` が有効で、APIクォータが残っているか確認

### デバッグ用コマンド

ローカルでテスト実行（GitHub Actions環境以外では動作しません）:
```bash
# エラーになります（期待通りの動作）
npx tsx scripts/github-actions-rss-collector.ts

# ローカル用はこちらを使用
npx tsx scripts/automated-rss-collector.ts
```

## 📈 監視とメンテナンス

### 正常動作の確認
- 新着記事数が適切に更新されているか
- エラー数が過度に多くないか
- 処理時間が異常に長くないか（通常30-120秒）

### 定期メンテナンス
- 月1回程度、GitHub Actions の実行ログを確認
- Gemini APIの使用量をGoogle Cloud Consoleで監視
- Supabaseの記事データ容量を確認

## 🎯 期待される動作

### 正常時
- 毎時0分に自動実行
- 10-50件の記事を収集（ソースに依存）
- 新規記事をGemini AIで分析
- 重複記事は自動スキップ
- 1-3分で処理完了

### 新着記事がない場合
- 「新規記事数: 0件」と表示
- 正常終了（エラーではない）
- 重複記事のみ検出

## 🔄 実行履歴

GitHub Actionsの「Actions」タブで過去の実行履歴と詳細ログを確認できます。

---

**作成日**: 2025-07-27  
**作成者**: Claude Code Assistant (ツンデレ美少女Ver.)  
**バージョン**: v1.0