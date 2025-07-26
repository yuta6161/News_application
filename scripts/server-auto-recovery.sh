#!/bin/bash

# Next.jsサーバー自動復旧スクリプト
# 使用方法: ./scripts/server-auto-recovery.sh

PROJECT_DIR="/home/lain6161/News_application"
LOG_FILE="$PROJECT_DIR/server.log"
PID_FILE="$PROJECT_DIR/server.pid"

echo "🚀 Next.jsサーバー自動復旧システム開始..."
echo "📂 プロジェクトディレクトリ: $PROJECT_DIR"
echo "📋 ログファイル: $LOG_FILE"

# サーバー状態チェック関数
check_server() {
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
        return 0  # サーバー正常
    else
        return 1  # サーバー異常
    fi
}

# サーバー起動関数
start_server() {
    cd "$PROJECT_DIR"
    
    # 既存プロセス終了
    echo "🛑 既存プロセスを終了中..."
    pkill -f "next dev" 2>/dev/null || true
    sleep 2
    
    # ログローテーション（1MB以上の場合）
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt 1048576 ]; then
        echo "📋 ログローテーション実行..."
        mv "$LOG_FILE" "$LOG_FILE.old"
    fi
    
    # Next.jsキャッシュクリア（時々）
    if [ $(($RANDOM % 10)) -eq 0 ]; then
        echo "🧹 Next.jsキャッシュクリア..."
        rm -rf .next
    fi
    
    # サーバー起動
    echo "▶️ サーバー起動中..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    
    # 起動待機
    echo "⏳ サーバー起動待機中..."
    for i in {1..30}; do
        sleep 1
        if check_server; then
            echo "✅ サーバー起動成功! (PID: $SERVER_PID)"
            return 0
        fi
        echo -n "."
    done
    
    echo "❌ サーバー起動失敗"
    return 1
}

# メイン監視ループ
echo "👁️ サーバー監視開始..."
RESTART_COUNT=0
LAST_RESTART=0

while true; do
    CURRENT_TIME=$(date +%s)
    
    if check_server; then
        echo "$(date): ✅ サーバー正常動作中"
        RESTART_COUNT=0
    else
        echo "$(date): ❌ サーバー異常検出!"
        
        # 連続再起動制限（5分以内に3回以上再起動しない）
        if [ $((CURRENT_TIME - LAST_RESTART)) -lt 300 ] && [ $RESTART_COUNT -ge 3 ]; then
            echo "⚠️ 連続再起動制限により5分待機..."
            sleep 300
            RESTART_COUNT=0
        fi
        
        echo "🔄 サーバー自動復旧開始..."
        if start_server; then
            RESTART_COUNT=$((RESTART_COUNT + 1))
            LAST_RESTART=$CURRENT_TIME
            echo "✅ 復旧完了 (復旧回数: $RESTART_COUNT)"
        else
            echo "❌ 復旧失敗、60秒後に再試行..."
            sleep 60
        fi
    fi
    
    # 30秒間隔でチェック
    sleep 30
done