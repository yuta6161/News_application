// 詳細テーブル構造確認（SQL直接実行版）
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDetailedTableInfo() {
  console.log('🔍 詳細テーブル構造確認（SQL直接実行版）\n');

  const targetTables = [
    'news_articles',
    'tag_master', 
    'article_tags',
    'user_search_history',
    'user_preferences'
  ];

  try {
    // 1. テーブル基本情報と全カラム詳細
    console.log('📋 1. 全テーブルのカラム詳細情報');
    console.log('='.repeat(60));

    const columnsQuery = `
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      ORDER BY table_name, ordinal_position;
    `;

    const { data: columns, error: colError } = await supabase.rpc('sql_query', {
      query: columnsQuery,
      params: [targetTables]
    });

    if (colError) {
      console.log('❌ カラム情報取得エラー:', colError.message);
      console.log('💡 代替方法を使用します...\n');

      // 各テーブルを個別に確認
      for (const tableName of targetTables) {
        console.log(`\n📊 ${tableName.toUpperCase()}テーブル`);
        console.log('-'.repeat(40));

        try {
          // スキーマ情報を個別取得
          const { data: tableInfo, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(0); // データは取得せず、スキーマのみ

          if (tableError) {
            console.log(`❌ ${tableName}: ${tableError.message}`);
            continue;
          }

          // テーブルが存在することを確認
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (!countError) {
            console.log(`✅ テーブル存在確認: OK (${count}件のデータ)`);
          }

          // 一つだけデータを取得して構造を推測
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!sampleError) {
            if (sampleData && sampleData.length > 0) {
              console.log('📝 カラム情報（サンプルデータより推測）:');
              Object.entries(sampleData[0]).forEach(([key, value]) => {
                const type = value === null ? 'null' : typeof value;
                const actualType = Array.isArray(value) ? 'array' : type;
                console.log(`   ${key}: ${actualType} = ${JSON.stringify(value)}`);
              });
            } else {
              console.log('📝 テーブルは存在しますが、データが空です');
              
              // INSERT権限テストで構造を確認
              try {
                const testInsert = await supabase
                  .from(tableName)
                  .insert({})
                  .select();
                console.log('💡 INSERT テストの結果:', testInsert.error?.message || 'OK');
              } catch (insertError) {
                console.log('💡 INSERT制約エラー:', insertError.message);
              }
            }
          }

        } catch (individualError) {
          console.log(`❌ ${tableName}の個別確認エラー:`, individualError.message);
        }
      }
    } else {
      // カラム情報が正常に取得できた場合
      let currentTable = '';
      columns.forEach(col => {
        if (col.table_name !== currentTable) {
          currentTable = col.table_name;
          console.log(`\n📊 ${currentTable.toUpperCase()}テーブル`);
          console.log('-'.repeat(40));
        }
        
        const nullable = col.is_nullable === 'YES' ? '(NULL許可)' : '(NOT NULL)';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT: ${col.column_default}` : '';
        
        console.log(`   ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
    }

    // 2. 制約情報
    console.log('\n\n🔒 2. 制約情報（PRIMARY KEY, FOREIGN KEY, CHECK制約など）');
    console.log('='.repeat(60));

    const constraintsQuery = `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = ANY($1)
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
    `;

    try {
      // 制約情報の代替取得方法
      for (const tableName of targetTables) {
        console.log(`\n📋 ${tableName}の制約:`);
        
        // 主キー確認のための INSERT テスト
        try {
          const { error: insertError } = await supabase
            .from(tableName)
            .insert({})
            .select();
          
          if (insertError) {
            console.log(`   制約エラー: ${insertError.message}`);
            
            // エラーメッセージから制約を推測
            if (insertError.message.includes('null value')) {
              console.log('   → NOT NULL制約を持つカラムが存在');
            }
            if (insertError.message.includes('duplicate key')) {
              console.log('   → UNIQUE制約またはPRIMARY KEY制約が存在');
            }
            if (insertError.message.includes('foreign key')) {
              console.log('   → FOREIGN KEY制約が存在');
            }
          }
        } catch (e) {
          console.log(`   制約テストエラー: ${e.message}`);
        }
      }
    } catch (constraintError) {
      console.log('❌ 制約情報取得エラー:', constraintError.message);
    }

    // 3. インデックス情報
    console.log('\n\n🔍 3. インデックス情報');
    console.log('='.repeat(40));

    for (const tableName of targetTables) {
      console.log(`\n📊 ${tableName}のインデックス:`);
      
      try {
        // PostgreSQLのシステムカタログから直接確認は難しいので
        // 実際のクエリパフォーマンスで推測
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          console.log('   ✅ 基本的なSELECT操作は可能');
          console.log('   💡 詳細なインデックス情報はSupabaseダッシュボードで確認してください');
        }
      } catch (e) {
        console.log('   ❌ アクセスエラー');
      }
    }

    console.log('\n✅ 詳細テーブル構造確認完了');
    console.log('\n💡 より詳細な情報が必要な場合は:');
    console.log('   1. Supabaseダッシュボード > Table Editor で確認');
    console.log('   2. SQL Editor で直接クエリ実行');
    console.log('   3. gemini_database_setup.sql の内容を参照');

  } catch (error) {
    console.error('❌ 予期しないエラー:', error.message);
  }
}

getDetailedTableInfo();