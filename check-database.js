// データベース状態確認スクリプト
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('🔧 環境変数確認:');
console.log('   SUPABASE_URL:', supabaseUrl ? '✅ 設定済み' : '❌ 未設定');
console.log('   SUPABASE_KEY:', supabaseKey ? '✅ 設定済み' : '❌ 未設定');
console.log('   URL形式:', supabaseUrl ? supabaseUrl.slice(0, 30) + '...' : 'N/A');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  console.log('💡 .env.localファイルを確認してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 news_articlesテーブルの状態を確認中...\n');

  try {
    // 0. まずは接続テスト
    console.log('🔗 0. データベース接続テスト');
    const { error: connectionError } = await supabase
      .from('news_articles')
      .select('id', { head: true })
      .limit(1);

    if (connectionError) {
      console.error('❌ 接続エラーの詳細:', {
        message: connectionError.message,
        details: connectionError.details,
        hint: connectionError.hint,
        code: connectionError.code
      });
      
      // テーブルが存在しない場合の対応
      if (connectionError.code === 'PGRST106' || connectionError.message.includes('not found')) {
        console.log('\n❌ news_articlesテーブルが存在しません');
        console.log('📝 テーブル作成が必要です。以下のファイルを確認してください:');
        console.log('   - database_fresh_install.sql');
        console.log('   - database_complete_reset.sql');
        return;
      }
      return;
    }

    console.log('✅ データベース接続成功\n');

    // 1. 総記事数の確認
    console.log('📊 1. 総記事数の確認');
    const { count, error: countError } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 記事数取得エラー:', countError);
      return;
    }

    console.log(`   総記事数: ${count}件`);

    if (count === 0) {
      console.log('\n⚠️  データベースにデータが存在しません');
      console.log('   RSS収集を実行してデータを追加してください');
      return;
    }

    // 2. 最新記事3件の表示
    console.log('\n📰 2. 最新記事3件');
    const { data: latestArticles, error: latestError } = await supabase
      .from('news_articles')
      .select('title, source_name, category, importance_score, published_at')
      .order('published_at', { ascending: false })
      .limit(3);

    if (latestError) {
      console.error('❌ 最新記事取得エラー:', latestError.message);
    } else {
      latestArticles.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`);
        console.log(`      📺 ソース: ${article.source_name}`);
        console.log(`      🏷️  カテゴリ: ${article.category}`);
        console.log(`      ⭐ 重要度: ${article.importance_score}`);
        console.log(`      📅 公開日: ${new Date(article.published_at).toLocaleString('ja-JP')}\n`);
      });
    }

    // 3. カテゴリ別データ数
    console.log('📊 3. カテゴリ別データ数');
    const { data: categoryData, error: categoryError } = await supabase
      .from('news_articles')
      .select('category')
      .not('category', 'is', null);

    if (categoryError) {
      console.error('❌ カテゴリデータ取得エラー:', categoryError.message);
    } else {
      const categoryCounts = {};
      categoryData.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      });

      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}件`);
      });
    }

    // 4. 重要度スコア分布
    console.log('\n⭐ 4. 重要度スコア分布');
    const { data: scoreData, error: scoreError } = await supabase
      .from('news_articles')
      .select('importance_score')
      .not('importance_score', 'is', null);

    if (scoreError) {
      console.error('❌ 重要度スコア取得エラー:', scoreError.message);
    } else {
      const scoreBuckets = {
        '9.0-10.0': 0,
        '8.0-8.9': 0,
        '7.0-7.9': 0,
        '6.0-6.9': 0,
        '5.0-5.9': 0,
        '4.0以下': 0
      };

      scoreData.forEach(item => {
        const score = item.importance_score;
        if (score >= 9.0) scoreBuckets['9.0-10.0']++;
        else if (score >= 8.0) scoreBuckets['8.0-8.9']++;
        else if (score >= 7.0) scoreBuckets['7.0-7.9']++;
        else if (score >= 6.0) scoreBuckets['6.0-6.9']++;
        else if (score >= 5.0) scoreBuckets['5.0-5.9']++;
        else scoreBuckets['4.0以下']++;
      });

      Object.entries(scoreBuckets).forEach(([range, count]) => {
        console.log(`   ${range}: ${count}件`);
      });
    }

    console.log('\n✅ データベース状態確認完了');

  } catch (error) {
    console.error('❌ 予期しないエラー:', error.message);
  }
}

checkDatabase();