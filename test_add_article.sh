#!/bin/bash

# APIエンドポイント経由で記事を追加するテストスクリプト

curl -X POST http://localhost:3000/api/news \
  -H "Content-Type: application/json" \
  -d '{
    "title": "APIテスト記事：TypeScript 5.4の新機能解説",
    "summary": "TypeScript 5.4で追加された新機能を詳しく解説。NoInfer型、Object.groupBy()のサポート、パフォーマンス改善など、開発効率を向上させる機能が多数追加されています。",
    "source_url": "https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/",
    "source_name": "TypeScript公式ブログ",
    "category": "Tech",
    "tags": ["TypeScript", "JavaScript", "Microsoft", "プログラミング"],
    "published_at": "2024-03-06T12:00:00Z",
    "original_language": "en",
    "is_translated": true,
    "source_country": "US",
    "importance_score": 4
  }'