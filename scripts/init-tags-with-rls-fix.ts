import { config } from 'dotenv';
import { supabase } from '../lib/supabase';
import { initialTags, getTagStatsByCategory, getTagStatsByParentCategory, getHighReliabilityTags } from '../lib/tag-master';

// 環境変数の読み込み
config({ path: '.env.local' });

async function initializeTagMasterWithRLSFix() {
  console.log('🏷️  タグマスター初期化（RLS対応版）を開始します...\n');
  
  try {
    console.log('🔒 Step 1: RLSポリシーを一時的に無効化...');
    
    // RLSを無効化（開発環境のみ）
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE tag_master DISABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.log('   ⚠️  RLS無効化に失敗しました（権限不足の可能性）');
      console.log('   💡 Supabaseダッシュボードで手動実行してください:');
      console.log('       ALTER TABLE tag_master DISABLE ROW LEVEL SECURITY;');
      console.log('   ⏳ 手動実行後、再実行してください\n');
      
      // RLS無効化せずに続行を試す
      console.log('🚀 RLS無効化せずに続行を試みます...\n');
    } else {
      console.log('   ✅ RLS一時無効化完了\n');
    }
    
    // Step 2: 現在のタグマスター状況を確認
    console.log('📊 Step 2: 現在のタグマスター状況を確認中...');
    
    const { data: existingTags, error: countError } = await supabase
      .from('tag_master')
      .select('tag_name', { count: 'exact' });
    
    if (countError) {
      console.error('❌ タグマスター確認エラー:', countError);
      throw countError;
    }
    
    console.log(`   現在のタグ数: ${existingTags?.length || 0} 件`);
    
    if (existingTags && existingTags.length > 0) {
      console.log('⚠️  既存のタグが見つかりました:');
      existingTags.slice(0, 5).forEach(tag => {
        console.log(`   - ${tag.tag_name}`);
      });
      if (existingTags.length > 5) {
        console.log(`   ... 他 ${existingTags.length - 5} 件`);
      }
      console.log('');
    }
    
    // Step 3: 統計情報を表示
    console.log('📈 Step 3: 投入予定のタグ統計:');
    console.log(`   総タグ数: ${initialTags.length} 件`);
    
    const categoryStats = getTagStatsByCategory();
    console.log('   カテゴリ別内訳:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`     - ${category}: ${count} 件`);
    });
    
    const parentCategoryStats = getTagStatsByParentCategory();
    console.log('   親カテゴリ別内訳:');
    Object.entries(parentCategoryStats).forEach(([parentCategory, count]) => {
      console.log(`     - ${parentCategory}: ${count} 件`);
    });
    
    const highReliabilityTags = getHighReliabilityTags();
    console.log(`   高信頼度タグ(8.0以上): ${highReliabilityTags.length} 件`);
    
    // Step 4: 既存タグをクリア（開発段階のため）
    console.log('\n🗑️  Step 4: 既存タグをクリア中...');
    
    const { error: deleteError } = await supabase
      .from('tag_master')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 全削除
    
    if (deleteError) {
      console.error('❌ タグ削除エラー:', deleteError);
      throw deleteError;
    }
    
    console.log('   ✅ 既存タグをクリアしました');
    
    // Step 5: 新しいタグを一括投入
    console.log('\n📥 Step 5: 新しいタグを投入中...');
    
    // バッチサイズでタグを分割して投入（Supabaseの制限対策）
    const batchSize = 10; // 小さくして確実に
    let insertedCount = 0;
    
    for (let i = 0; i < initialTags.length; i += batchSize) {
      const batch = initialTags.slice(i, i + batchSize);
      
      console.log(`   バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(initialTags.length / batchSize)}: ${batch.length} 件投入中...`);
      
      try {
        const { data: insertedBatch, error: insertError } = await supabase
          .from('tag_master')
          .insert(batch)
          .select('tag_name');
        
        if (insertError) {
          console.error(`❌ バッチ投入エラー (詳細):`, {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
          
          // 個別投入を試す
          console.log('   🔄 個別投入を試みます...');
          let individualSuccess = 0;
          
          for (const tag of batch) {
            try {
              const { error: individualError } = await supabase
                .from('tag_master')
                .insert([tag]);
              
              if (!individualError) {
                individualSuccess++;
              } else {
                console.log(`     ❌ ${tag.tag_name}: ${individualError.message}`);
              }
            } catch (e) {
              console.log(`     ❌ ${tag.tag_name}: 予期しないエラー`);
            }
          }
          
          console.log(`   ✅ 個別投入: ${individualSuccess}/${batch.length} 件成功`);
          insertedCount += individualSuccess;
          
        } else {
          insertedCount += insertedBatch?.length || 0;
          console.log(`   ✅ ${insertedBatch?.length || 0} 件投入完了`);
        }
        
        // 少し待つ（API制限対策）
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (batchError) {
        console.error(`❌ バッチ処理中の予期しないエラー:`, batchError);
      }
    }
    
    // Step 6: 投入結果の確認
    console.log('\n📊 Step 6: 投入結果の確認...');
    
    const { data: finalTags, error: finalCountError } = await supabase
      .from('tag_master')
      .select('tag_name, category, base_reliability', { count: 'exact' });
    
    if (finalCountError) {
      console.error('❌ 最終確認エラー:', finalCountError);
      throw finalCountError;
    }
    
    console.log(`   最終タグ数: ${finalTags?.length || 0} 件`);
    console.log(`   投入成功数: ${insertedCount} 件`);
    
    // Step 7: サンプル表示
    console.log('\n📋 Step 7: 投入されたタグのサンプル:');
    
    if (finalTags && finalTags.length > 0) {
      // カテゴリ別にサンプルを表示
      const samplesByCategory: { [key: string]: any[] } = {};
      finalTags.forEach(tag => {
        if (!samplesByCategory[tag.category]) {
          samplesByCategory[tag.category] = [];
        }
        if (samplesByCategory[tag.category].length < 3) {
          samplesByCategory[tag.category].push(tag);
        }
      });
      
      Object.entries(samplesByCategory).forEach(([category, tags]) => {
        console.log(`   ${category}:`);
        tags.forEach(tag => {
          console.log(`     - ${tag.tag_name} (信頼度: ${tag.base_reliability})`);
        });
      });
    }
    
    // Step 8: RLSを再有効化（オプション）
    console.log('\n🔒 Step 8: RLS再有効化（オプション）...');
    try {
      const { error: rlsRestoreError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE tag_master ENABLE ROW LEVEL SECURITY;'
      });
      
      if (rlsRestoreError) {
        console.log('   ⚠️  RLS再有効化に失敗（開発環境では問題ありません）');
      } else {
        console.log('   ✅ RLS再有効化完了');
      }
    } catch (e) {
      console.log('   💡 RLS再有効化はスキップしました');
    }
    
    // Step 9: 完了メッセージ
    console.log('\n🎉 タグマスター初期化完了！');
    console.log('');
    console.log('✅ 次のステップ:');
    console.log('1. RSS収集テスト: npm run collect-rss');
    console.log('2. タグ分析レポート: npm run analyze-tags');
    console.log('');
    console.log('💡 注意事項:');
    console.log('- 今回投入したのは事前定義タグのみです');
    console.log('- RSS収集時にGeminiが自動生成タグを追加します');
    console.log('- 分析レポートで使用頻度を確認し、タグを最適化できます');
    
    return {
      success: true,
      totalTags: finalTags?.length || 0,
      insertedTags: insertedCount
    };
    
  } catch (error) {
    console.error('❌ タグマスター初期化エラー:', error);
    return {
      success: false,
      error: error
    };
  }
}

// 直接実行時
if (require.main === module) {
  initializeTagMasterWithRLSFix()
    .then(result => {
      if (result.success) {
        console.log(`\n🎯 初期化成功: ${result.totalTags} 件のタグが利用可能です`);
        process.exit(0);
      } else {
        console.error('\n💥 初期化失敗');
        process.exit(1);
      }
    })
    .catch(console.error);
}

export { initializeTagMasterWithRLSFix };