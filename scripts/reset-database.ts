import { config } from 'dotenv';
import { supabase } from '../lib/supabase';
import fs from 'fs/promises';
import path from 'path';

// 環境変数の読み込み
config({ path: '.env.local' });

async function resetDatabase() {
  console.log('🚨 データベースリセットを開始します...\n');
  
  // 警告メッセージ
  console.log('⚠️  警告: この操作により以下のデータが削除されます:');
  console.log('   - 既存の152件のテスト記事');
  console.log('   - 全てのユーザーデータ（検索履歴など）');
  console.log('   - 現在のテーブル構造');
  console.log('');
  
  try {
    // Step 1: 現在のデータ状況を確認
    console.log('📊 Step 1: 現在のデータ状況を確認中...');
    
    const { data: currentArticles, error: countError } = await supabase
      .from('news_articles')
      .select('id', { count: 'exact' });
    
    if (!countError) {
      console.log(`   現在の記事数: ${currentArticles?.length || 0} 件`);
    }
    
    // Step 2: SQLファイルを読み込み
    console.log('\n📄 Step 2: SQLスクリプトを読み込み中...');
    const sqlPath = path.join(process.cwd(), 'database', 'gemini_database_setup.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');
    console.log('   ✅ SQLスクリプト読み込み完了');
    
    // Step 3: データベーススキーマをリセット
    console.log('\n🔄 Step 3: データベーススキーマをリセット中...');
    console.log('   警告: この処理には時間がかかる場合があります...');
    
    // SQLを実行（Supabaseの場合、RPCまたは直接SQLクライアントが必要）
    // ここではSupabaseダッシュボードでの手動実行を推奨
    console.log('\n❌ 自動実行はサポートされていません。');
    console.log('\n📋 手動実行手順:');
    console.log('1. Supabaseダッシュボードを開く');
    console.log('2. プロジェクト > SQL Editor に移動');
    console.log('3. 以下のSQLファイルの内容をコピー&ペースト:');
    console.log(`   ${sqlPath}`);
    console.log('4. "Run" ボタンをクリックして実行');
    console.log('');
    console.log('SQLファイルの場所:');
    console.log(`   ${sqlPath}`);
    
    // Step 4: SQLファイルの内容を表示（最初の100行）
    console.log('\n📄 SQLファイルの先頭部分:');
    console.log('=' .repeat(60));
    const lines = sqlContent.split('\n');
    lines.slice(0, 30).forEach(line => {
      console.log(line);
    });
    console.log('...');
    console.log(`（全${lines.length}行中の最初の30行を表示）`);
    console.log('=' .repeat(60));
    
    // Step 5: 実行後の確認事項
    console.log('\n✅ 手動実行後の確認事項:');
    console.log('1. 新しいテーブルが作成されているか確認');
    console.log('2. インデックスが正しく作成されているか確認');
    console.log('3. RLSポリシーが設定されているか確認');
    console.log('4. 次のコマンドでタグマスターの初期化:');
    console.log('   npm run init-tags');
    
    // Step 6: 次のステップの案内
    console.log('\n🚀 次のステップ:');
    console.log('手動でSQLを実行した後、以下のコマンドを順番に実行してください:');
    console.log('');
    console.log('1. npm run init-tags     # タグマスターの初期化');
    console.log('2. npm run collect-rss   # 少量のテストデータ収集');
    console.log('3. npm run analyze-tags  # タグ分析レポート生成');
    console.log('');
    
  } catch (error) {
    console.error('❌ データベースリセット中にエラーが発生しました:', error);
    throw error;
  }
}

// 直接実行時
if (require.main === module) {
  resetDatabase().catch(console.error);
}

export { resetDatabase };