import { config } from 'dotenv';
import { supabase } from '../lib/supabase';

// 環境変数の読み込み
config({ path: '.env.local' });

interface ArticleWithTags {
  id: string;
  title: string;
  source_name: string;
  importance_score: number;
  ai_summary: string | null;
  published_at: string;
  tags: Array<{
    tag_name: string;
    category: string;
    confidence_score: number;
    is_auto_generated: boolean;
  }>;
}

async function viewArticleTags() {
  console.log('📰 記事別タグビューア\n');
  
  try {
    // 1. 最新記事を取得（AI分析済みのもの）
    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select('id, title, source_name, importance_score, ai_summary, published_at')
      .not('ai_summary', 'is', null)
      .order('published_at', { ascending: false })
      .limit(10);

    if (articlesError) {
      console.error('❌ 記事取得エラー:', articlesError);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('AI分析済みの記事が見つかりません');
      return;
    }

    console.log(`🔍 AI分析済み記事: ${articles.length} 件\n`);

    // 2. 各記事のタグを取得して表示
    for (const article of articles) {
      console.log('='.repeat(80));
      console.log(`📄 ${article.title}`);
      console.log(`   📺 ソース: ${article.source_name}`);
      console.log(`   ⭐ 重要度: ${article.importance_score}`);
      console.log(`   📅 公開日: ${new Date(article.published_at).toLocaleString('ja-JP')}`);
      
      if (article.ai_summary) {
        console.log(`   📝 AI要約: ${article.ai_summary.substring(0, 100)}...`);
      }

      // タグを取得
      const { data: tags, error: tagsError } = await supabase
        .from('article_tags')
        .select('tag_name, category, confidence_score, is_auto_generated')
        .eq('article_id', article.id)
        .order('confidence_score', { ascending: false });

      if (tagsError) {
        console.log(`   ❌ タグ取得エラー: ${tagsError.message}`);
        continue;
      }

      if (!tags || tags.length === 0) {
        console.log('   🏷️  タグ: なし');
      } else {
        console.log(`   🏷️  タグ (${tags.length}個):`);
        tags.forEach((tag, index) => {
          const type = tag.is_auto_generated ? '🔄' : '📌';
          const confidence = (tag.confidence_score * 100).toFixed(0);
          console.log(`      ${index + 1}. ${type} ${tag.tag_name} [${tag.category}] (信頼度: ${confidence}%)`);
        });
      }
      console.log('');
    }

    // 3. タグ使用統計
    console.log('='.repeat(80));
    console.log('\n📊 タグ使用統計サマリー');
    
    const { data: tagStats, error: statsError } = await supabase
      .from('article_tags')
      .select('tag_name, category, confidence_score')
      .order('tag_name');

    if (!statsError && tagStats) {
      const tagCounts: { [key: string]: { count: number; avgConfidence: number; category: string } } = {};
      
      tagStats.forEach(tag => {
        if (!tagCounts[tag.tag_name]) {
          tagCounts[tag.tag_name] = { count: 0, avgConfidence: 0, category: tag.category };
        }
        tagCounts[tag.tag_name].count++;
        tagCounts[tag.tag_name].avgConfidence = 
          (tagCounts[tag.tag_name].avgConfidence * (tagCounts[tag.tag_name].count - 1) + tag.confidence_score) 
          / tagCounts[tag.tag_name].count;
      });

      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      console.log('\n🏆 使用頻度TOP10:');
      sortedTags.forEach(([tagName, stats], index) => {
        const avgConf = (stats.avgConfidence * 100).toFixed(0);
        console.log(`   ${index + 1}. ${tagName} [${stats.category}] - ${stats.count}回使用 (平均信頼度: ${avgConf}%)`);
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 使用方法:

🔸 最新10記事のタグを表示:
   npm run view-article-tags

🔸 特定記事のタグを詳細表示（未実装）:
   npm run view-article-tags -- --article-id=xxx

🔸 このヘルプ:
   npm run view-article-tags -- --help
`);
  process.exit(0);
}

// 実行
viewArticleTags()
  .then(() => {
    console.log('\n✅ 記事タグ表示完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  });