// Supabase接続テスト
import 'dotenv/config';
import { supabase } from '../lib/supabase';

async function testSupabaseConnection() {
  console.log('🔍 Supabase接続テスト開始...\n');
  
  try {
    // 1. 基本接続テスト
    console.log('1️⃣ 基本接続テスト...');
    const { data, error } = await supabase
      .from('news_articles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ 基本接続エラー:', error);
      return;
    }
    
    console.log('✅ 基本接続: 正常');
    
    // 2. 読み取りテスト
    console.log('\n2️⃣ 読み取りテスト...');
    const { data: readData, error: readError } = await supabase
      .from('news_articles')
      .select('source_name, title')
      .limit(3);
    
    if (readError) {
      console.error('❌ 読み取りエラー:', readError);
    } else {
      console.log('✅ 読み取り: 正常');
      console.log(`   取得件数: ${readData?.length || 0} 件`);
    }
    
    // 3. 書き込みテスト（テストデータ）
    console.log('\n3️⃣ 書き込みテスト...');
    const testArticle = {
      title: 'Supabase接続テスト記事',
      summary: 'これはSupabase接続テスト用の一時的な記事です',
      source_url: `https://test.example.com/test-${Date.now()}`,
      published_at: new Date().toISOString(),
      source_name: 'Test Source',
      category: 'Tech',
      original_language: 'ja',
      importance_score: 5.0
    };
    
    const { data: writeData, error: writeError } = await supabase
      .from('news_articles')
      .insert(testArticle)
      .select('id')
      .single();
    
    if (writeError) {
      console.error('❌ 書き込みエラー:', writeError);
    } else {
      console.log('✅ 書き込み: 正常');
      console.log(`   記事ID: ${writeData.id}`);
      
      // 4. 削除テスト（テストデータクリーンアップ）
      console.log('\n4️⃣ 削除テスト（クリーンアップ）...');
      const { error: deleteError } = await supabase
        .from('news_articles')
        .delete()
        .eq('id', writeData.id);
      
      if (deleteError) {
        console.error('❌ 削除エラー:', deleteError);
      } else {
        console.log('✅ 削除: 正常（テストデータクリーンアップ完了）');
      }
    }
    
    // 5. 大量データクエリテスト
    console.log('\n5️⃣ 大量データクエリテスト...');
    const startTime = Date.now();
    const { data: bulkData, error: bulkError } = await supabase
      .from('news_articles')
      .select('source_url')
      .limit(100);
    
    const endTime = Date.now();
    
    if (bulkError) {
      console.error('❌ 大量データクエリエラー:', bulkError);
    } else {
      console.log('✅ 大量データクエリ: 正常');
      console.log(`   取得件数: ${bulkData?.length || 0} 件`);
      console.log(`   実行時間: ${endTime - startTime}ms`);
    }
    
    console.log('\n🎉 Supabase接続テスト完了！');
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

testSupabaseConnection();