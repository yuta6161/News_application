# AIニュースアプリ - 検索強化型要約対応版

世界中のニュースをAIが自動収集し、重要な記事については追加のWeb検索を行って複数の情報源から情報を統合、高品質な要約と翻訳を提供するニュースアプリケーション。

## 🎯 主要機能

1. **自動ニュース収集**: RSS/APIからの24時間自動収集
2. **検索強化型AI要約**: 重要記事は複数情報源から統合した高品質要約
3. **多言語対応**: 海外ニュースの自動翻訳＋日本向け文脈追加
4. **高度なパーソナライゼーション**: ユーザーごとの興味に基づくフィルタリング

## 🏗️ 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Edge Functions  
- **データベース**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic) - 要約、検索、翻訳
- **認証**: Supabase Auth
- **ホスティング**: Vercel

## 📋 開発フェーズ

### Phase 1: プロジェクトセットアップ ✅
- Next.js プロジェクトの初期設定
- Supabase連携
- 基本的なUI構築

### Phase 2: データベース構築 ✅
- Supabaseでのテーブル設計
- 認証システムの実装

### Phase 3: RSS自動収集システム ⚠️ **（現在の作業段階）**
- 複数のRSSフィードからの自動収集
- 記事の重複チェック
- カテゴリ分類
- **注**: この段階ではAPIキー不要、RSS要約をそのまま使用

### Phase 4: 基本AI要約機能（来週予定）
- Claude APIの統合
- 基本的な要約生成
- 翻訳機能の実装

### Phase 4.5: 検索強化型要約システム
- 重要記事の自動判定（スコア8.0以上）
- Web検索による追加情報収集
- 複数情報源からの統合要約
- コスト最適化（1日20-30記事限定）

## 🛠️ セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/yuta6161/News_application.git
cd News_application
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. Supabaseデータベースのセットアップ

**重要**: 既存のデータベースを修正する場合は、`database_migration_final.sql`を実行してください：

```bash
# Supabaseダッシュボードで以下のSQLファイルを順番に実行:
# 新規セットアップ: supabase/schema_corrected.sql
# 既存DB修正: database_migration_final.sql
```

### 4. 環境変数の設定
```bash
# .env.local ファイルを作成
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# Phase 4でAI機能追加時に必要:
ANTHROPIC_API_KEY=your-claude-api-key
```

## 🚀 開発コマンド

### 開発サーバーの起動
```bash
npm run dev
```

### RSS収集の手動実行（開発用）
```bash
npm run collect-rss
```

### ビルド
```bash
npm run build
```

### 型チェック
```bash
npm run type-check
```

## 📊 データベース設計

### news_articlesテーブル（メインテーブル）

| カラム名 | 型 | 用途 |
|---------|-----|------|
| id | uuid | 記事の一意識別子 |
| title | text | 記事タイトル |
| summary | text | RSS要約（現在）／表示用要約（将来） |
| source_url | text | 個別記事URL（重複チェック用） |
| source_name | text | 情報源の名称 |
| category | text | 'Tech', 'Business', 'AI', 'Startup', 'General' |
| importance_score | numeric(3,1) | 記事重要度（1.0-10.0） |
| original_language | text | 元記事の言語 |
| ai_summary | text | AI生成要約（Phase 4で使用） |
| enhanced_summary | text | 検索強化型要約（Phase 4.5で使用） |

### 重要度判定システム

記事の重要度は以下の要素で自動計算されます：

- **ソース信頼度**: OpenAI Blog(10) > Ars Technica(9) > TechCrunch(8) など
- **カテゴリ別重み**: AI(+2.0) > Tech(+1.0) > Startup(+0.5) など
- **キーワード判定**: "breaking", "OpenAI", "GPT" などで加点
- **記事長さ**: 詳細な記事ほど高評価

**8.0以上の記事**は検索強化型要約の対象となります。

## 🔧 修正履歴（2025-01-23）

### ✅ 修正完了項目

1. **データベース設計の統一**
   - `importance_score`: INTEGER(1-5) → NUMERIC(3,1)(1.0-10.0)に変更
   - `category`: 古い値 → 'Tech', 'Business', 'AI', 'Startup', 'General'に統一
   - 重複カラム削除: link, language, priority, original_summary
   - Phase 4.5用カラム追加: enhanced_summary, enhanced_sources, quality_level, processing_cost

2. **SQLファイルの整理**
   - 混乱していた複数のSQLファイルを削除
   - `supabase/schema_corrected.sql`: 新規作成用の完全版スキーマ
   - `database_migration_final.sql`: 既存DB修正用マイグレーション

3. **設計書との完全な整合性確保**
   - RSSソースのカテゴリとDB制約を一致
   - 重要度計算ロジックの実装確認
   - 将来の拡張用カラムの準備完了

### 🎯 次のステップ

1. **データベースマイグレーションの実行**
   ```bash
   # Supabaseダッシュボードでdatabase_migration_final.sqlを実行
   ```

2. **RSS収集のテスト**
   ```bash
   npm run collect-rss
   ```

3. **記事表示の動作確認**
   ```bash
   npm run dev
   # http://localhost:3000 でアプリをチェック
   ```

## 📝 注意事項

- **開発段階**: Claude APIキーは不要（RSS要約をそのまま表示）
- **公開前**: 必ずAI要約機能を実装してから公開
- **著作権**: RSS要約をそのまま使用しているため、開発・テスト用途のみ
- **テーブル名**: `news_articles`（`articles`ではない）

## 🆘 トラブルシューティング

### RSS取得エラー
- CORSエラー: サーバーサイドで実行されているか確認
- タイムアウト: 取得するフィード数を減らす

### 記事が重複する
- `source_url`フィールドでの重複チェックが機能しているか確認
- データベースのUNIQUE制約を確認

### パフォーマンスが遅い
- インデックスが正しく作成されているか確認
- 記事取得数を制限（現在は各ソース10件）

## 📧 サポート

質問や問題がある場合は、GitHubのIssuesでお知らせください。

---

**開発者**: Claude Code Assistant (ツンデレ美少女Ver.)  
**最終更新**: 2025-01-23