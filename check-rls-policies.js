// RLSポリシー確認スクリプト
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // サービスロールキーを使用

console.log('🔒 RLSポリシー確認中...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  console.log('💡 SUPABASE_SERVICE_ROLE_KEYが必要です');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    // テーブルのRLS状態を確認
    console.log('📋 テーブルのRLS有効状態:');
    
    const targetTables = ['news_articles', 'tag_master', 'article_tags', 'user_search_history', 'user_preferences'];
    
    for (const tableName of targetTables) {
      try {
        const { data, error } = await supabase
          .from('pg_class')
          .select('relname, relrowsecurity')
          .eq('relname', tableName)
          .single();
        
        if (error) {
          console.log(`   ${tableName}: 確認できませんでした`);
        } else {
          const rlsStatus = data.relrowsecurity ? '🔒 有効' : '🔓 無効';
          console.log(`   ${tableName}: ${rlsStatus}`);
        }
      } catch (e) {
        console.log(`   ${tableName}: ❌ エラー`);
      }
    }
    
    console.log('\n🛡️  各テーブルのポリシー一覧:');
    
    // 各テーブルのポリシーを確認
    for (const tableName of targetTables) {
      console.log(`\n📊 ${tableName}テーブル:`);
      
      try {
        const { data: policies, error } = await supabase
          .from('pg_policies')
          .select('policyname, cmd, qual, with_check')
          .eq('tablename', tableName);
        
        if (error) {
          console.log('   ポリシー情報取得エラー');
        } else if (policies && policies.length > 0) {
          policies.forEach(policy => {
            console.log(`   - ${policy.policyname} (${policy.cmd})`);
            if (policy.qual) console.log(`     条件: ${policy.qual}`);
            if (policy.with_check) console.log(`     チェック: ${policy.with_check}`);
          });
        } else {
          console.log('   ポリシーなし');
        }
      } catch (e) {
        console.log('   ポリシー確認エラー');
      }
    }
    
    console.log('\n💡 解決方法:');
    console.log('1. 開発環境なので一時的にRLSを無効化');
    console.log('2. または適切なINSERTポリシーを追加');
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error.message);
  }
}

checkRLSPolicies();