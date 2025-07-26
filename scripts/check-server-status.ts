#!/usr/bin/env tsx

async function checkServerStatus() {
  console.log('🔍 サーバー状態チェック開始...')
  
  try {
    // 1. Next.jsプロセスチェック
    const { spawn } = require('child_process')
    const ps = spawn('ps', ['aux'])
    const grep = spawn('grep', ['next'])
    const grep2 = spawn('grep', ['-v', 'grep'])
    
    ps.stdout.pipe(grep.stdin)
    grep.stdout.pipe(grep2.stdin)
    
    let processOutput = ''
    grep2.stdout.on('data', (data: Buffer) => {
      processOutput += data.toString()
    })
    
    await new Promise(resolve => grep2.on('close', resolve))
    
    if (processOutput.trim()) {
      console.log('✅ Next.jsプロセス動作中')
      console.log(processOutput.trim())
    } else {
      console.log('❌ Next.jsプロセスが見つかりません')
      return false
    }
    
    // 2. ポート接続テスト
    const response = await fetch('http://localhost:3000/api/articles-simple', {
      signal: AbortSignal.timeout(5000) // 5秒タイムアウト
    })
    
    if (response.ok) {
      console.log('✅ HTTP接続OK - ポート3000で動作中')
      const data = await response.json()
      console.log(`📊 API応答: ${data.count}件の記事取得`)
      return true
    } else {
      console.log(`❌ HTTP接続失敗 - ステータス: ${response.status}`)
      return false
    }
    
  } catch (error) {
    console.log('❌ サーバー接続エラー:', error instanceof Error ? error.message : error)
    return false
  }
}

// 実行
checkServerStatus().then(isRunning => {
  if (isRunning) {
    console.log('\n🚀 サーバー正常動作中！')
    console.log('🌐 アクセス: http://localhost:3000')
  } else {
    console.log('\n⚠️ サーバーが停止中です')
    console.log('📝 再起動コマンド: npm run dev')
  }
})