#!/bin/bash

# クイックサーバー再起動スクリプト
PROJECT_DIR="/home/lain6161/News_application"

echo "🔄 Next.jsサーバー クイック再起動..."

cd "$PROJECT_DIR"

# 1. 既存プロセス終了
echo "🛑 既存プロセス終了中..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# 2. Next.jsキャッシュクリア
echo "🧹 Next.jsキャッシュクリア..."
rm -rf .next

# 3. サーバー起動
echo "▶️ サーバー起動中..."
nohup npm run dev > server.log 2>&1 &
SERVER_PID=$!

echo "✅ サーバー起動完了! (PID: $SERVER_PID)"
echo "🌐 アクセス: http://localhost:3000"
echo "📋 ログ確認: tail -f server.log"

# 起動確認
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo "✅ サーバー正常動作確認済み"
else
    echo "⚠️ サーバー起動中... 少し待ってから再度確認してください"
fi