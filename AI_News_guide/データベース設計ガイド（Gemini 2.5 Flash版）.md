# データベース設計ガイド（Gemini 2.5 Flash版）

## 概要
このドキュメントは、AIニュースアプリ（Gemini 2.5 Flash版）のデータベース設計を包括的に定義します。既存のテーブルに加えて、インテリジェントタグシステムとパーソナライゼーション機能のための新しいテーブルを追加します。

## テーブル一覧

1. **news_articles** - ニュース記事（既存・更新）
2. **tag_master** - タグマスター（新規）
3. **article_tags** - 記事タグ関連（新規）
4. **user_search_history** - ユーザー検索履歴（新規）
5. **user_preferences** - ユーザー嗜好（新規）

## 1. news_articlesテーブル（更新版）

### 基本識別情報
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **id** | uuid | PRIMARY KEY | 記事の一意識別子 | `550e8400-e29b-41d4-a716-446655440000` |
| **source_url** | text | UNIQUE NOT NULL | 個別記事のURL | `https://techcrunch.com/2024/01/15/openai-gpt5/` |

### 記事コンテンツ
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **title** | text | NOT NULL | 記事タイトル | `OpenAI、GPT-5を発表` |
| **summary** | text | NOT NULL | RSS要約（保存用） | `OpenAIは本日、次世代AI...`（200文字） |
| **ai_summary** | text | | Gemini生成要約 | `本日OpenAIが発表したGPT-5は...` |

### 記事メタ情報
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **source_name** | text | NOT NULL | 情報源の名称 | `TechCrunch` |
| **category** | text | NOT NULL | 記事カテゴリ | `AI`, `Tech`, `Game` |
| **tags** | text[] | DEFAULT '{}' | 廃止予定 | - |
| **image_url** | text | | サムネイル画像URL | `https://example.com/image.jpg` |

### 時間情報
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **published_at** | timestamptz | NOT NULL | 記事の公開日時 | `2024-01-15 09:00:00+00` |
| **created_at** | timestamptz | DEFAULT NOW() | DB登録日時 | `2024-01-15 09:05:00+00` |
| **updated_at** | timestamptz | DEFAULT NOW() | 最終更新日時 | `2024-01-15 10:00:00+00` |

### 言語・翻訳情報
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **original_language** | text | DEFAULT 'ja' | 元記事の言語 | `en`, `ja` |
| **is_translated** | boolean | DEFAULT FALSE | 翻訳済みフラグ | `true`, `false` |
| **source_country** | text | DEFAULT 'JP' | 情報源の国 | `US`, `JP` |

### AI分析情報
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **importance_score** | numeric(3,1) | CHECK (1.0-10.0) | Gemini判定の重要度 | `8.5` |
| **quality_level** | text | DEFAULT 'basic' | 処理レベル | `basic`, `pending_enhancement`, `enhanced` |
| **analyzed_at** | timestamptz | | Gemini分析日時 | `2024-01-15 09:06:00+00` |
| **analysis_version** | text | DEFAULT '1.0' | 分析バージョン | `1.0`, `2.0` |

### 検索強化型要約用
| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **enhanced_summary** | text | | 検索強化型要約 | `複数の情報源によると...` |
| **enhanced_sources** | text[] | | 参照した情報源 | `{techcrunch.com, theverge.com}` |
| **processing_cost** | decimal | | API処理コスト | `0.85` |

### インデックス
```sql
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_importance_score ON news_articles(importance_score DESC);
CREATE INDEX idx_news_articles_quality_level ON news_articles(quality_level);
```

## 2. tag_masterテーブル（新規）

| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **id** | uuid | PRIMARY KEY | タグID | `auto-generated` |
| **tag_name** | text | UNIQUE NOT NULL | タグ名 | `OpenAI`, `言語AI`, `新製品発表` |
| **category** | text | NOT NULL | タグカテゴリ | `company`, `technology`, `genre` |
| **parent_category** | text | | 親カテゴリ | `ai_tech`, `game`, `general` |
| **description** | text | | タグの説明 | `OpenAI社に関連する記事` |
| **base_reliability** | numeric(3,1) | DEFAULT 5.0 | 基本信頼度 | `10.0`, `8.0` |
| **created_at** | timestamptz | DEFAULT NOW() | 作成日時 | `2024-01-15 09:00:00+00` |

### タグカテゴリの定義
- **company**: 企業名（OpenAI、Google、Microsoft等）
- **technology**: 技術分野（言語AI、画像生成AI、機械学習等）
- **announcement_type**: 発表タイプ（新製品発表、研究論文、アップデート等）
- **importance**: 重要度（革新的、重要、注目等）
- **platform**: プラットフォーム（Steam、Switch、PlayStation等）
- **genre**: ジャンル（アクション、RPG、インディー等）
- **price_range**: 価格帯（無料、〜1000円、1000-3000円等）
- **rating**: 評価（圧倒的に好評、非常に好評、好評等）

### インデックス
```sql
CREATE INDEX idx_tag_master_category ON tag_master(category);
CREATE INDEX idx_tag_master_tag_name ON tag_master(tag_name);
CREATE INDEX idx_tag_master_parent_category ON tag_master(parent_category);
```

## 3. article_tagsテーブル（新規）

| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **id** | uuid | PRIMARY KEY | 関連ID | `auto-generated` |
| **article_id** | uuid | FK → news_articles | 記事ID | `記事のUUID` |
| **tag_id** | uuid | FK → tag_master | タグID | `タグのUUID` |
| **confidence_score** | numeric(3,1) | DEFAULT 0.5 | 確信度 | `0.9`, `0.7` |
| **assigned_by** | text | DEFAULT 'gemini_flash' | 付与者 | `gemini_flash`, `user`, `system` |
| **created_at** | timestamptz | DEFAULT NOW() | 作成日時 | `2024-01-15 09:05:00+00` |

### 制約
```sql
UNIQUE(article_id, tag_id)  -- 同じ記事に同じタグは1つだけ
CHECK (confidence_score >= 0.1 AND confidence_score <= 1.0)
```

### インデックス
```sql
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX idx_article_tags_confidence ON article_tags(confidence_score DESC);
```

## 4. user_search_historyテーブル（新規）

| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **id** | uuid | PRIMARY KEY | 履歴ID | `auto-generated` |
| **user_id** | uuid | FK → auth.users | ユーザーID | `ユーザーのUUID` |
| **search_query** | text | NOT NULL | 検索文字列 | `OpenAIの公式情報だけ見たい` |
| **parsed_intent** | jsonb | | 解析された意図 | 下記参照 |
| **result_count** | integer | | 検索結果数 | `15` |
| **clicked_articles** | uuid[] | | クリックした記事 | `{記事ID1, 記事ID2}` |
| **search_duration_ms** | integer | | 検索処理時間 | `250` |
| **created_at** | timestamptz | DEFAULT NOW() | 検索日時 | `2024-01-15 10:00:00+00` |

### parsed_intentの例
```json
{
  "required_tags": ["OpenAI"],
  "preferred_tags": ["公式発表", "新製品"],
  "excluded_tags": ["憶測", "噂"],
  "trust_level": 9,
  "date_range": {
    "from": "2024-01-01",
    "to": "2024-01-15"
  }
}
```

### インデックス
```sql
CREATE INDEX idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX idx_user_search_history_created_at ON user_search_history(created_at DESC);
```

## 5. user_preferencesテーブル（新規）

| カラム名 | 型 | 制約 | 用途 | 例 |
|---------|-----|------|------|-----|
| **id** | uuid | PRIMARY KEY | 設定ID | `auto-generated` |
| **user_id** | uuid | UNIQUE FK → auth.users | ユーザーID | `ユーザーのUUID` |
| **preferred_tags** | uuid[] | | 好むタグID | `{タグID1, タグID2}` |
| **excluded_tags** | uuid[] | | 避けるタグID | `{タグID3, タグID4}` |
| **tag_weights** | jsonb | | タグの重み | 下記参照 |
| **reading_patterns** | jsonb | | 閲覧パターン | 下記参照 |
| **last_calculated_at** | timestamptz | | 最終計算日時 | `2024-01-15 12:00:00+00` |
| **created_at** | timestamptz | DEFAULT NOW() | 作成日時 | `2024-01-15 09:00:00+00` |
| **updated_at** | timestamptz | DEFAULT NOW() | 更新日時 | `2024-01-15 12:00:00+00` |

### tag_weightsの例
```json
{
  "550e8400-e29b-41d4-a716-446655440000": 1.5,  // OpenAIタグを1.5倍重視
  "660e8400-e29b-41d4-a716-446655440001": 0.5   // 憶測タグを0.5倍に軽減
}
```

### reading_patternsの例
```json
{
  "average_reading_time": 120,  // 平均読了時間（秒）
  "preferred_categories": ["AI", "Tech"],
  "active_hours": [9, 12, 18, 21],  // 活動時間帯
  "click_through_rate": 0.35,  // クリック率
  "topics_interest": {
    "technical_details": 0.8,
    "business_impact": 0.3
  }
}
```

### インデックス
```sql
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## マイグレーション手順

### 1. 既存テーブルの更新
```sql
-- news_articlesテーブルに新カラムを追加
ALTER TABLE news_articles 
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analysis_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS quality_level TEXT DEFAULT 'basic';

-- quality_levelにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_news_articles_quality_level 
ON news_articles(quality_level);
```

### 2. 新規テーブルの作成
各テーブルのCREATE文は上記の定義に基づいて実行

### 3. 初期データの投入
```sql
-- tag_masterに初期タグを投入
INSERT INTO tag_master (tag_name, category, parent_category, base_reliability) VALUES
('OpenAI', 'company', 'ai_tech', 10.0),
('Google', 'company', 'ai_tech', 9.0),
-- ... 他のタグも同様に
```

## 使用フロー

### 記事収集時
1. RSS記事を取得
2. Gemini Flashで分析（importance_score、タグ、要約）
3. news_articlesに保存
4. article_tagsにタグ関連を保存

### 検索時
1. ユーザーの自然言語入力を受付
2. Gemini Flashで意図解析
3. user_search_historyに記録
4. タグベースで記事を検索
5. クリック記事を記録

### パーソナライゼーション
1. user_search_historyを定期分析
2. user_preferencesを更新
3. 次回検索時に重み付けを適用

## 注意事項

1. **外部キー制約**を適切に設定してデータ整合性を保つ
2. **インデックス**を活用してパフォーマンスを最適化
3. **JSONB型**は柔軟性が高いが、スキーマレスなので注意
4. **confidence_score**は0.1-1.0の範囲で正規化
5. **タグの重複**を防ぐためUNIQUE制約を活用