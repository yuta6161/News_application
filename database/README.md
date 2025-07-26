# Database SQL Files

このフォルダには、データベース関連のSQLファイルが整理されています。

## 📁 ファイル構成

### 🏗️ 初期設定・セットアップ
- `gemini_database_setup.sql` - Gemini版の完全なデータベーススキーマ
- `schema.sql` - 基本スキーマ定義

### 🔧 制約・構造修正
- `add-conspiracy-constraints.sql` - 陰謀論カテゴリサポートの制約追加
- `fix-category-constraint.sql` - news_articlesカテゴリ制約の修正
- `fix-article-tags-schema.sql` - article_tagsテーブルの構造修正

### 🛠️ 開発・メンテナンス
- `disable-rls-for-development.sql` - 開発用RLS無効化
- `clear-sample-data.sql` - サンプルデータのクリア

### 📊 陰謀論カテゴリ実装
- `conspiracy-category-setup.sql` - 陰謀論カテゴリの完全セットアップ

## 🚀 実行順序

### 新規セットアップ時
1. `gemini_database_setup.sql` - 基本スキーマ
2. `conspiracy-category-setup.sql` - 陰謀論カテゴリ追加

### 既存データベース更新時
1. `fix-category-constraint.sql` - 制約更新
2. `conspiracy-category-setup.sql` - カテゴリ実装

## ⚠️ 注意事項
- SQLファイルはSupabase SQL Editorで実行してください
- RLS（Row Level Security）が有効な場合は、一時的に無効化が必要な場合があります
- バックアップを取ってから実行することをお勧めします