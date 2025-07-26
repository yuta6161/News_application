// scripts/tag-analysis-report-fixed.ts
import { config } from 'dotenv';
import { supabase } from '../lib/supabase';
import fs from 'fs/promises';
import path from 'path';

// 環境変数の読み込み
config({ path: '.env.local' });

interface TagAnalysis {
  tag_name: string;
  tag_id: string;
  category: string;
  parent_category: string;
  usage_count: number;
  confidence_avg: number;
  confidence_min: number;
  confidence_max: number;
  articles: Array<{
    title: string;
    source_name: string;
    category: string;
    importance_score: number;
    published_at: string;
    confidence_score: number;
  }>;
  common_patterns: {
    sources: { [key: string]: number };
    categories: { [key: string]: number };
    co_occurring_tags: { [key: string]: number };
    importance_score_avg: number;
    typical_confidence: number;
  };
}

async function generateTagReport() {
  console.log('🔍 タグ分析レポートを生成中...\n');

  try {
    // 1. 全タグを取得
    const { data: allTags, error: tagError } = await supabase
      .from('tag_master')
      .select('*')
      .order('created_at', { ascending: true });

    if (tagError) throw tagError;

    console.log(`📊 総タグ数: ${allTags?.length || 0}`);

    // 2. 各タグの詳細分析
    const tagAnalyses: TagAnalysis[] = [];

    for (const tag of allTags || []) {
      console.log(`🔎 分析中: ${tag.tag_name}...`);
      
      // タグが付けられた記事を取得（修正版クエリ）
      const { data: taggedArticles, error: articleError } = await supabase
        .from('article_tags')
        .select(`
          confidence_score,
          article_id,
          news_articles!inner (
            id,
            title,
            source_name,
            category,
            importance_score,
            published_at
          )
        `)
        .eq('tag_id', tag.id);

      if (articleError) {
        console.error(`❌ タグ ${tag.tag_name} の分析でエラー:`, articleError);
        continue;
      }

      if (!taggedArticles || taggedArticles.length === 0) {
        // 未使用タグ
        tagAnalyses.push({
          tag_name: tag.tag_name,
          tag_id: tag.id,
          category: tag.category,
          parent_category: tag.parent_category || 'general',
          usage_count: 0,
          confidence_avg: 0,
          confidence_min: 0,
          confidence_max: 0,
          articles: [],
          common_patterns: {
            sources: {},
            categories: {},
            co_occurring_tags: {},
            importance_score_avg: 0,
            typical_confidence: 0
          }
        });
        continue;
      }

      // 信頼度スコアの統計
      const confidenceScores = taggedArticles.map(ta => ta.confidence_score);
      const confidenceAvg = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
      const confidenceMin = Math.min(...confidenceScores);
      const confidenceMax = Math.max(...confidenceScores);

      // 記事情報の集計
      const articles = taggedArticles.map(ta => ({
        title: (ta.news_articles as any)?.title,
        source_name: (ta.news_articles as any)?.source_name,
        category: (ta.news_articles as any)?.category,
        importance_score: (ta.news_articles as any)?.importance_score,
        published_at: (ta.news_articles as any)?.published_at,
        confidence_score: ta.confidence_score
      }));

      // 共通パターンの分析
      const sources: { [key: string]: number } = {};
      const categories: { [key: string]: number } = {};
      let totalImportance = 0;

      articles.forEach(article => {
        sources[article.source_name] = (sources[article.source_name] || 0) + 1;
        categories[article.category] = (categories[article.category] || 0) + 1;
        totalImportance += article.importance_score;
      });

      // 共起タグの分析（修正版）
      const coOccurringTags: { [key: string]: number } = {};
      const articleIds = taggedArticles.map(ta => ta.article_id);
      
      if (articleIds.length > 0) {
        const { data: coTags } = await supabase
          .from('article_tags')
          .select(`
            tag_master!inner (
              tag_name
            )
          `)
          .in('article_id', articleIds)
          .neq('tag_id', tag.id);

        coTags?.forEach(ct => {
          const tagName = (ct.tag_master as any)?.tag_name;
          coOccurringTags[tagName] = (coOccurringTags[tagName] || 0) + 1;
        });
      }

      tagAnalyses.push({
        tag_name: tag.tag_name,
        tag_id: tag.id,
        category: tag.category,
        parent_category: tag.parent_category || 'general',
        usage_count: taggedArticles.length,
        confidence_avg: Math.round(confidenceAvg * 100) / 100,
        confidence_min: confidenceMin,
        confidence_max: confidenceMax,
        articles: articles.slice(0, 5), // 最新5件のみ
        common_patterns: {
          sources,
          categories,
          co_occurring_tags: Object.fromEntries(
            Object.entries(coOccurringTags)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
          ),
          importance_score_avg: Math.round((totalImportance / articles.length) * 10) / 10,
          typical_confidence: Math.round(confidenceAvg * 10) / 10
        }
      });

      console.log(`✅ 完了: ${tag.tag_name} (${taggedArticles.length}回使用)`);
    }

    // 3. レポート生成
    const report = generateReport(tagAnalyses);

    // 4. ファイルに保存
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `tag-analysis-report-${timestamp}.md`;
    
    // reportsディレクトリを作成
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filepath = path.join(reportsDir, filename);
    await fs.writeFile(filepath, report, 'utf-8');

    console.log(`\n✅ レポートを生成しました: ${filepath}`);

    // 5. コンソールにサマリーを表示
    displaySummary(tagAnalyses);

    return tagAnalyses;

  } catch (error) {
    console.error('❌ レポート生成エラー:', error);
    throw error;
  }
}

function generateReport(analyses: TagAnalysis[]): string {
  const now = new Date().toLocaleString('ja-JP');
  const sortedByUsage = [...analyses].sort((a, b) => b.usage_count - a.usage_count);
  const autoGenerated = analyses.filter(a => a.category === 'auto_generated');
  const predefined = analyses.filter(a => a.category !== 'auto_generated');

  let report = `# 📊 タグ分析レポート

生成日時: ${now}

## 🎯 概要統計

- **総タグ数**: ${analyses.length}
- **事前定義タグ**: ${predefined.length}
- **自動生成タグ**: ${autoGenerated.length}
- **未使用タグ**: ${analyses.filter(a => a.usage_count === 0).length}
- **10回以上使用**: ${analyses.filter(a => a.usage_count >= 10).length}
- **50回以上使用**: ${analyses.filter(a => a.usage_count >= 50).length}

## 📈 使用頻度TOP20

| 順位 | タグ名 | 使用回数 | 平均信頼度 | カテゴリ | 主な出現源 |
|------|--------|----------|------------|----------|------------|
`;

  sortedByUsage.slice(0, 20).forEach((tag, i) => {
    const topSource = Object.entries(tag.common_patterns.sources)
      .sort(([,a], [,b]) => b - a)[0];
    report += `| ${i+1} | ${tag.tag_name} | ${tag.usage_count} | ${tag.confidence_avg} | ${tag.category} | ${topSource ? topSource[0] : '-'} |\n`;
  });

  // 自動生成タグの詳細
  report += `\n## 🤖 自動生成タグ分析\n\n`;
  report += `### 🔥 高頻度自動生成タグ（10回以上）\n\n`;

  const highFreqAutoTags = autoGenerated
    .filter(t => t.usage_count >= 10)
    .sort((a, b) => b.usage_count - a.usage_count);

  if (highFreqAutoTags.length === 0) {
    report += `現在、10回以上使用された自動生成タグはありません。\n\n`;
  } else {
    highFreqAutoTags.forEach(tag => {
      report += `#### ${tag.tag_name} (${tag.usage_count}回)\n\n`;
      report += `- **平均信頼度**: ${tag.confidence_avg}\n`;
      report += `- **平均重要度スコア**: ${tag.common_patterns.importance_score_avg}\n`;
      report += `- **主な出現カテゴリ**: ${Object.entries(tag.common_patterns.categories)
        .sort(([,a], [,b]) => b - a)
        .map(([cat, count]) => `${cat}(${count})`)
        .join(', ')}\n`;
      report += `- **共起タグ**: ${Object.entries(tag.common_patterns.co_occurring_tags)
        .map(([tag, count]) => `${tag}(${count})`)
        .join(', ') || 'なし'}\n`;
      report += `- **サンプル記事**:\n`;
      tag.articles.slice(0, 3).forEach(article => {
        report += `  - "${article.title}" (${article.source_name}, 信頼度:${article.confidence_score})\n`;
      });
      report += '\n';
    });
  }

  // パターン分析
  report += `### 🔍 発見されたパターン\n\n`;

  // カテゴリ別の自動生成タグ
  const tagsByCategory: { [key: string]: string[] } = {};
  autoGenerated.forEach(tag => {
    const mainCategory = Object.entries(tag.common_patterns.categories)
      .sort(([,a], [,b]) => b - a)[0];
    if (mainCategory && tag.usage_count > 0) {
      const cat = mainCategory[0];
      if (!tagsByCategory[cat]) tagsByCategory[cat] = [];
      tagsByCategory[cat].push(`${tag.tag_name}(${tag.usage_count})`);
    }
  });

  report += `#### カテゴリ別頻出タグ\n\n`;
  if (Object.keys(tagsByCategory).length === 0) {
    report += `まだカテゴリ別の傾向は発見されていません。\n\n`;
  } else {
    Object.entries(tagsByCategory).forEach(([cat, tags]) => {
      report += `- **${cat}**: ${tags.slice(0, 10).join(', ')}\n`;
    });
  }

  // 低使用率タグ
  report += `\n### ⚠️ 低使用率タグ（1-2回のみ）\n\n`;
  const lowUsageTags = analyses.filter(t => t.usage_count > 0 && t.usage_count <= 2);
  report += `合計 ${lowUsageTags.length} 個のタグが1-2回のみ使用されています。\n\n`;
  if (lowUsageTags.length > 0) {
    report += `例: ${lowUsageTags.slice(0, 20).map(t => t.tag_name).join(', ')}${lowUsageTags.length > 20 ? '...' : ''}\n`;
  }

  // 推奨事項
  report += `\n## 💡 推奨事項\n\n`;
  report += `### ⭐ 事前定義タグ候補\n\n`;
  
  const promotionCandidates = autoGenerated
    .filter(t => t.usage_count >= 20 && t.confidence_avg >= 0.7)
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 10);
    
  if (promotionCandidates.length === 0) {
    report += `現在、事前定義タグへの昇格候補はありません。\n`;
    report += `（基準: 20回以上使用 かつ 平均信頼度0.7以上）\n\n`;
  } else {
    report += `以下の自動生成タグは使用頻度が高く、事前定義タグへの昇格を検討できます：\n\n`;
    promotionCandidates.forEach(tag => {
      report += `- **${tag.tag_name}**: ${tag.usage_count}回使用、平均信頼度${tag.confidence_avg}\n`;
    });
  }

  report += `\n### 🗑️ 削除候補タグ\n\n`;
  
  const deletionCandidates = analyses
    .filter(t => t.usage_count === 0 || (t.usage_count === 1 && t.confidence_avg < 0.5))
    .slice(0, 20);

  if (deletionCandidates.length === 0) {
    report += `現在、削除候補のタグはありません。\n\n`;
  } else {
    report += `以下のタグは使用頻度が低く、削除を検討できます：\n\n`;
    deletionCandidates.forEach(tag => {
      report += `- ${tag.tag_name} (${tag.usage_count}回、${tag.category})\n`;
    });
  }

  return report;
}

function displaySummary(analyses: TagAnalysis[]) {
  console.log('\n🎉 ===== サマリー =====');
  console.log(`📊 総タグ数: ${analyses.length}`);
  console.log(`✅ 使用中タグ: ${analyses.filter(a => a.usage_count > 0).length}`);
  console.log(`❌ 未使用タグ: ${analyses.filter(a => a.usage_count === 0).length}`);
  
  console.log('\n🏆 使用頻度TOP10:');
  analyses
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 10)
    .forEach((tag, i) => {
      const categoryIcon = tag.category === 'auto_generated' ? '🤖' : '📌';
      console.log(`${i+1}. ${categoryIcon} ${tag.tag_name} (${tag.usage_count}回)`);
    });
}

// package.jsonに追加するためのエクスポート
export { generateTagReport };

// 直接実行時
if (require.main === module) {
  generateTagReport().catch(console.error);
}