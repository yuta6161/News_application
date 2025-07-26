// 全テーブル詳細確認スクリプト
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('🔧 環境変数確認:');
console.log('   SUPABASE_URL:', supabaseUrl ? '✅ 設定済み' : '❌ 未設定');
console.log('   SUPABASE_KEY:', supabaseKey ? '✅ 設定済み' : '❌ 未設定');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 確認対象のテーブル
const targetTables = [
  'news_articles',
  'tag_master', 
  'article_tags',
  'user_search_history',
  'user_preferences'
];

async function checkAllTables() {
  console.log('🔍 全テーブル詳細構造確認中...\n');

  try {
    // 1. テーブル存在確認
    console.log('📋 1. テーブル存在確認');
    const { data: tableList, error: tableError } = await supabase
      .rpc('check_table_existence', { table_names: targetTables })
      .single();

    // RPC関数がない場合は、直接SQLで確認
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', targetTables);

    if (error) {
      console.log('   💡 information_schema経由で確認...');
      // 各テーブルを個別にテスト
      for (const tableName of targetTables) {
        try {
          const { error: testError } = await supabase
            .from(tableName)
            .select('*', { head: true, count: 'exact' })
            .limit(1);
          
          if (testError) {
            if (testError.code === 'PGRST106') {
              console.log(`   ❌ ${tableName}: 存在しません`);
            } else {
              console.log(`   ⚠️  ${tableName}: エラー - ${testError.message}`);
            }
          } else {
            console.log(`   ✅ ${tableName}: 存在します`);
          }
        } catch (e) {
          console.log(`   ❌ ${tableName}: アクセスエラー`);
        }
      }
    } else {
      const existingTables = tables.map(t => t.table_name);
      targetTables.forEach(table => {
        if (existingTables.includes(table)) {
          console.log(`   ✅ ${table}: 存在します`);
        } else {
          console.log(`   ❌ ${table}: 存在しません`);
        }
      });
    }

    console.log('\n');

    // 2. 各テーブルの詳細構造確認
    for (const tableName of targetTables) {
      console.log(`📊 2. ${tableName}テーブルの詳細構造`);
      console.log('='.repeat(50));
      
      try {
        // テーブル存在確認
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('*', { head: true, count: 'exact' })
          .limit(1);

        if (testError && testError.code === 'PGRST106') {
          console.log(`❌ ${tableName}テーブルが存在しません\n`);
          continue;
        }

        // カラム情報取得（SQL直接実行）
        try {
          const { data: columns, error: colError } = await supabase
            .rpc('get_table_structure', { table_name: tableName });

          if (colError) {
            console.log('   💡 代替方法でカラム情報を取得中...');
            // PostgRESTのメタデータから推測
            const { data: sampleData, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);

            if (!sampleError && sampleData && sampleData.length > 0) {
              console.log('   📝 サンプルデータから推測されるカラム構造:');
              Object.keys(sampleData[0]).forEach(key => {
                const value = sampleData[0][key];
                const type = typeof value;
                console.log(`      ${key}: ${type} (推測)`);
              });
            } else {
              console.log('   📝 カラム構造（空テーブルのため詳細不明）');
            }
          } else {
            console.log('   📝 カラム構造:');
            columns.forEach(col => {
              console.log(`      ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL許可)'}`);
              if (col.column_default) {
                console.log(`         デフォルト値: ${col.column_default}`);
              }
            });
          }
        } catch (structureError) {
          console.log('   ⚠️  構造情報の取得に失敗しました');
        }

        // データ件数確認
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!countError) {
          console.log(`   📊 データ件数: ${count}件`);
        }

        // サンプルデータ表示（最大3件）
        if (!testError) {
          const { data: samples, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);

          if (!sampleError && samples && samples.length > 0) {
            console.log('   📄 サンプルデータ:');
            samples.forEach((sample, index) => {
              console.log(`      ${index + 1}. ${JSON.stringify(sample, null, 8)}`);
            });
          } else if (count > 0) {
            console.log('   📄 データは存在しますが、取得に失敗しました');
          } else {
            console.log('   📄 サンプルデータ: なし（空テーブル）');
          }
        }

      } catch (tableError) {
        console.log(`❌ ${tableName}テーブルの確認中にエラー:`, tableError.message);
      }

      console.log('\n');
    }

    // 3. インデックス確認
    console.log('🔍 3. インデックス確認');
    console.log('='.repeat(30));
    
    try {
      // 各テーブルのインデックス情報を取得
      for (const tableName of targetTables) {
        const { data: indexes, error: indexError } = await supabase
          .rpc('get_table_indexes', { table_name: tableName });

        if (indexError) {
          console.log(`   ${tableName}: インデックス情報取得失敗`);
        } else if (indexes && indexes.length > 0) {
          console.log(`   ${tableName}:`);
          indexes.forEach(idx => {
            console.log(`      - ${idx.indexname}: ${idx.indexdef}`);
          });
        } else {
          console.log(`   ${tableName}: インデックス情報なし`);
        }
      }
    } catch (indexError) {
      console.log('   ⚠️  インデックス情報の取得に失敗しました');
      console.log('   💡 Supabaseダッシュボードで直接確認してください');
    }

    console.log('\n✅ 全テーブル確認完了');

  } catch (error) {
    console.error('❌ 予期しないエラー:', error.message);
  }
}

checkAllTables();