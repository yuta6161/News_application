import { execSync } from 'child_process'
import fs from 'fs'

async function analyzeServerStability() {
  console.log('🔍 Next.jsサーバー安定性診断開始...\n')
  
  try {
    // 1. 現在のプロセス状況
    console.log('📊 現在のプロセス状況:')
    try {
      const processes = execSync('ps aux | grep "next dev" | grep -v grep', { encoding: 'utf8' })
      if (processes.trim()) {
        console.log('✅ Next.jsプロセス動作中')
        console.log(processes.trim())
      } else {
        console.log('❌ Next.jsプロセスが見つかりません')
      }
    } catch (error) {
      console.log('❌ Next.jsプロセスが見つかりません')
    }
    
    // 2. ポート使用状況
    console.log('\n🌐 ポート使用状況:')
    try {
      const portCheck = execSync('netstat -tlnp | grep :3000 || lsof -i :3000 || echo "ポート3000は空いています"', { encoding: 'utf8' })
      console.log(portCheck.trim())
    } catch (error) {
      console.log('ポート3000は空いています')
    }
    
    // 3. システムリソース
    console.log('\n💾 システムリソース:')
    const memory = execSync('free -h', { encoding: 'utf8' })
    console.log(memory)
    
    const uptime = execSync('uptime', { encoding: 'utf8' })
    console.log('📈 システム負荷:', uptime.trim())
    
    // 4. Next.jsログ分析
    console.log('\n📋 サーバーログ分析:')
    if (fs.existsSync('./server.log')) {
      const logContent = fs.readFileSync('./server.log', 'utf8')
      const logLines = logContent.split('\n')
      
      console.log('📄 ログファイルサイズ:', fs.statSync('./server.log').size, 'bytes')
      console.log('📊 ログ行数:', logLines.length)
      
      // エラーパターンを検索
      const errorPatterns = [
        'Error',
        'EADDRINUSE',
        'ECONNREFUSED',
        'timeout',
        'crashed',
        'killed',
        'memory'
      ]
      
      const errors = []
      for (const line of logLines) {
        for (const pattern of errorPatterns) {
          if (line.toLowerCase().includes(pattern.toLowerCase())) {
            errors.push(line.trim())
          }
        }
      }
      
      if (errors.length > 0) {
        console.log('⚠️  検出されたエラー:')
        errors.slice(-5).forEach(error => console.log('   ', error))
      } else {
        console.log('✅ ログにエラーは検出されませんでした')
      }
      
      // 最新のログ数行を表示
      console.log('\n📝 最新ログ（最新5行）:')
      logLines.slice(-5).forEach(line => {
        if (line.trim()) console.log('   ', line.trim())
      })
      
    } else {
      console.log('❌ server.logファイルが見つかりません')
    }
    
    // 5. 推定原因と対策
    console.log('\n🔧 サーバー不安定化の一般的原因:')
    console.log('   1. メモリ不足（OOM Killer）')
    console.log('   2. ポート競合（EADDRINUSE）')
    console.log('   3. ファイル変更監視の負荷')
    console.log('   4. WSL環境特有の問題')
    console.log('   5. Node.jsプロセスのクラッシュ')
    console.log('   6. 長時間実行による不安定化')
    
    console.log('\n💡 推奨対策:')
    console.log('   ✅ 定期的なサーバー再起動')
    console.log('   ✅ nohupでのバックグラウンド実行')
    console.log('   ✅ プロセス監視スクリプトの実装')
    console.log('   ✅ ログローテーション')
    console.log('   ✅ 自動復旧機能の追加')
    
  } catch (error) {
    console.error('❌ 診断エラー:', error)
  }
}

// 実行
analyzeServerStability()