// RSS/XMLフィード取得スクリプト
// Node.js環境で実行（Next.jsとは別プロセス）

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

// RSSパーサーの初期化
const parser = new Parser({
  customFields: {
    item: [
      ['dc:creator', 'author'],
      ['content:encoded', 'contentEncoded'],
      ['media:thumbnail', 'thumbnail'],
      ['category', 'categories']
    ]
  }
});

// ニュースソースの定義
const NEWS_SOURCES = {
  itmedia_news: {
    name: 'ITmedia NEWS',
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    category: 'Tech',
    country: 'JP',
    language: 'ja'
  },
  nikkei_tech: {
    name: '日経クロステック',
    url: 'https://xtech.nikkei.com/rss/index.rdf',
    category: 'Tech',
    country: 'JP', 
    language: 'ja'
  },
  // 他のソースは後で追加
};

/**
 * RSSフィードから記事を取得
 * @param {string} sourceKey - ニュースソースのキー
 * @returns {Promise<Array>} 記事データの配列
 */
async function fetchArticlesFromRSS(sourceKey) {
  try {
    console.log(`📡 ${sourceKey} から記事を取得中...`);
    
    const source = NEWS_SOURCES[sourceKey];
    if (!source) {
      throw new Error(`未知のニュースソース: ${sourceKey}`);
    }

    // RSSフィードを取得
    const feed = await parser.parseURL(source.url);
    console.log(`✅ フィード取得完了: ${feed.title}`);
    console.log(`📰 記事数: ${feed.items.length}件`);

    // 記事データを変換
    const articles = feed.items.map((item, index) => {
      // published_atの日付処理
      let publishedAt;
      try {
        publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      } catch (error) {
        console.warn(`⚠️ 日付変換エラー: ${item.pubDate}`);
        publishedAt = new Date().toISOString();
      }

      // タグの抽出（カテゴリーから）
      let tags = [];
      if (item.categories && Array.isArray(item.categories)) {
        tags = item.categories.slice(0, 5); // 最大5個
      } else if (item.category) {
        tags = [item.category];
      }

      // 画像URLの抽出
      let imageUrl = '';
      if (item.thumbnail && item.thumbnail.$) {
        imageUrl = item.thumbnail.$.url;
      } else if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image')) {
        imageUrl = item.enclosure.url;
      }

      return {
        title: item.title || 'タイトルなし',
        summary: '', // 後でClaude APIで生成
        source_url: item.link || '',
        source_name: source.name,
        category: source.category,
        tags: tags,
        image_url: imageUrl,
        published_at: publishedAt,
        original_language: source.language,
        is_translated: false,
        source_country: source.country,
        importance_score: 3, // デフォルト値（後でAIが判定）
        
        // 処理用の追加データ
        raw_content: item.contentEncoded || item.content || item.summary || '',
        author: item.author || item.creator || '',
        guid: item.guid || item.link || `${sourceKey}-${index}`
      };
    });

    console.log(`🔄 記事データ変換完了: ${articles.length}件`);
    return articles;

  } catch (error) {
    console.error(`❌ RSS取得エラー (${sourceKey}):`, error.message);
    throw error;
  }
}

/**
 * 複数のソースから記事を取得
 * @param {Array<string>} sourceKeys - 取得するソースのキーの配列
 * @returns {Promise<Array>} 全記事データの配列
 */
async function fetchFromMultipleSources(sourceKeys = ['itmedia_news']) {
  const allArticles = [];
  
  for (const sourceKey of sourceKeys) {
    try {
      const articles = await fetchArticlesFromRSS(sourceKey);
      allArticles.push(...articles);
      
      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`⚠️ ${sourceKey} の取得をスキップ:`, error.message);
      continue;
    }
  }

  console.log(`🎉 全ソース取得完了: 合計 ${allArticles.length}件`);
  return allArticles;
}

/**
 * 取得した記事をJSONファイルに保存（デバッグ用）
 * @param {Array} articles - 記事データの配列
 * @param {string} filename - 保存ファイル名
 */
async function saveArticlesToFile(articles, filename = 'fetched_articles.json') {
  try {
    const filePath = path.join(__dirname, '..', 'data', filename);
    
    // dataディレクトリが存在しない場合は作成
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(articles, null, 2), 'utf8');
    console.log(`💾 記事データ保存完了: ${filePath}`);
  } catch (error) {
    console.error('❌ ファイル保存エラー:', error.message);
  }
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log('🚀 RSS記事取得スクリプト開始');
    console.log('================================');
    
    // ITmedia NEWSから記事を取得
    const articles = await fetchFromMultipleSources(['itmedia_news']);
    
    if (articles.length === 0) {
      console.log('⚠️ 取得できた記事がありません');
      return;
    }

    // 最初の記事のサンプル表示
    console.log('\n📋 取得記事サンプル:');
    console.log('--------------------------------');
    console.log(`タイトル: ${articles[0].title}`);
    console.log(`URL: ${articles[0].source_url}`);
    console.log(`公開日: ${articles[0].published_at}`);
    console.log(`タグ: ${articles[0].tags.join(', ')}`);
    
    // JSONファイルに保存
    await saveArticlesToFile(articles);
    
    console.log('\n✅ RSS記事取得完了！');
    
  } catch (error) {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  }
}

// モジュールとしてエクスポート
module.exports = {
  fetchArticlesFromRSS,
  fetchFromMultipleSources,
  saveArticlesToFile,
  NEWS_SOURCES
};

// 直接実行された場合
if (require.main === module) {
  main();
}