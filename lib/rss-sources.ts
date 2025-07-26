export interface RSSSource {
  name: string;
  url: string;
  category: 'Tech' | 'Music' | 'Conspiracy' | 'Business' | 'World' | 'Sports' | 'Entertainment';
  language: 'ja' | 'en';
  source_reliability: number; // 1-10の情報源信頼度
  display_on_site?: boolean; // サイトトップに表示するか（デフォルト: true）
}

export const rssSources: RSSSource[] = [
  // 日本語Tech系
  {
    name: 'はてなブックマーク - テクノロジー',
    url: 'https://b.hatena.ne.jp/hotentry/it.rss',
    category: 'Tech',
    language: 'ja',
    source_reliability: 7 // コミュニティキュレーション、高信頼
  },
  {
    name: 'Publickey',
    url: 'https://www.publickey1.jp/atom.xml',
    category: 'Tech',
    language: 'ja',
    source_reliability: 8 // 専門メディア、高品質
  },
  {
    name: 'ITmedia NEWS',
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    category: 'Tech',
    language: 'ja',
    source_reliability: 8 // 大手メディア、信頼性高
  },
  
  // 英語Tech系（将来のAI翻訳対象）
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Tech',
    language: 'en',
    source_reliability: 8 // 著名なTechメディア
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'Tech',
    language: 'en',
    source_reliability: 8 // 高品質なTechジャーナリズム
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'Tech',
    language: 'en',
    source_reliability: 9 // 技術的深度が高い、専門性抜群
  },
  
  // 世界・AI関連（Techから分離してWorldに）
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    category: 'Tech', // AIカテゴリーがないのでTechに統合
    language: 'en',
    source_reliability: 10 // 公式ソース、最高信頼度
  },
  {
    name: 'Google AI Blog',
    url: 'https://blog.google/technology/ai/rss/',
    category: 'Tech', // AIカテゴリーがないのでTechに統合
    language: 'en',
    source_reliability: 10 // 公式ソース、最高信頼度
  },
  
  
  // 音楽系（新規追加）
  {
    name: 'Attack Magazine',
    url: 'https://www.attackmagazine.com/feed/',
    category: 'Music',
    language: 'en',
    source_reliability: 8 // ハウス・テクノ等エレクトロニック音楽制作
  },
  {
    name: 'Musicman',
    url: 'https://www.musicman.co.jp/feed',
    category: 'Music',
    language: 'ja',
    source_reliability: 9 // 日本の音楽業界総合情報サイト
  },
  {
    name: 'Bedroom Producers Blog',
    url: 'https://bedroomproducersblog.com/feed/',
    category: 'Music',
    language: 'en',
    source_reliability: 8 // VST・プラグイン・音楽制作ソフト
  },
  {
    name: 'EDMProd',
    url: 'https://www.edmprod.com/feed/',
    category: 'Music',
    language: 'en',
    source_reliability: 8 // EDM制作ガイド・チュートリアル
  },
  {
    name: 'Pitchfork',
    url: 'https://pitchfork.com/feed/feed-news/rss', // 正しいURLに修正
    category: 'Music',
    language: 'en',
    source_reliability: 9 // インディーズ・オルタナティブ音楽レビュー
  },
  {
    name: 'XLR8R',
    url: 'https://xlr8r.com/feed',
    category: 'Music',
    language: 'en',
    source_reliability: 8 // エレクトロニック音楽カルチャー
  },
  {
    name: 'Create Digital Music',
    url: 'https://cdm.link/feed/',
    category: 'Music',
    language: 'en',
    source_reliability: 8 // デジタル音楽制作技術（正しいドメイン使用）
  },
  {
    name: 'SonicScoop',
    url: 'https://www.sonicscoop.com/feed/',
    category: 'Music',
    language: 'en',
    source_reliability: 8 // オーディオエンジニア向け音楽制作技術
  },
  // ARAMA! JAPAN - XMLパースエラーのため一時的にコメントアウト
  // {
  //   name: 'ARAMA! JAPAN',
  //   url: 'https://aramajapan.com/category/news/feed/',
  //   category: 'Music',
  //   language: 'en', // 英語で日本の音楽情報を配信
  //   source_reliability: 7 // 日本のポップカルチャー・アーティスト情報
  // },
  {
    name: 'Electric Bloom Webzine',
    url: 'https://electricbloomwebzine.com/feed',
    category: 'Music',
    language: 'en', // 英語で日本音楽専門
    source_reliability: 6 // 日本音楽専門ウェブジン
  },
  
  // ビジネス（データ取得のみ、非表示）
  {
    name: 'はてなブックマーク - 経済・政治',
    url: 'https://b.hatena.ne.jp/hotentry/social.rss',
    category: 'Business',
    language: 'ja',
    source_reliability: 7, // コミュニティキュレーション
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'TechCrunch - Startup',
    url: 'https://techcrunch.com/category/startups/feed/',
    category: 'Business',
    language: 'en',
    source_reliability: 8, // ビジネス・スタートアップ専門
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'Forbes',
    url: 'https://www.forbes.com/real-time/feed2/',
    category: 'Business',
    language: 'en',
    source_reliability: 9, // 世界的なビジネスメディア
    display_on_site: false // データ分析用のみ
  },
  
  // 世界ニュース（データ取得のみ、非表示）
  {
    name: 'Y Combinator',
    url: 'https://news.ycombinator.com/rss',
    category: 'World', // 国際的な技術・ビジネス話題
    language: 'en',
    source_reliability: 7, // コミュニティ、良質だが主観的
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'NHK News',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    category: 'World',
    language: 'ja',
    source_reliability: 9, // 公共放送、高信頼度
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'Yahoo News',
    url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    category: 'World',
    language: 'ja',
    source_reliability: 7, // 大手ポータル
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    category: 'World',
    language: 'en',
    source_reliability: 9, // 公共放送、国際的信頼度
    display_on_site: false // データ分析用のみ
  },
  
  // スポーツ（データ取得のみ、非表示）
  {
    name: 'ESPN',
    url: 'https://www.espn.com/espn/rss/news',
    category: 'Sports',
    language: 'en',
    source_reliability: 8, // スポーツ専門メディア
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'Yahoo Sports',
    url: 'https://sports.yahoo.com/rss/',
    category: 'Sports',
    language: 'en',
    source_reliability: 7, // 大手スポーツメディア
    display_on_site: false // データ分析用のみ
  },
  
  // エンターテイメント（データ取得のみ、非表示）
  {
    name: 'The Hollywood Reporter',
    url: 'https://www.hollywoodreporter.com/c/news/feed/',
    category: 'Entertainment',
    language: 'en',
    source_reliability: 8, // エンタメ業界専門
    display_on_site: false // データ分析用のみ
  },
  {
    name: 'Variety',
    url: 'https://variety.com/feed/',
    category: 'Entertainment',
    language: 'en',
    source_reliability: 8, // エンタメ業界専門
    display_on_site: false // データ分析用のみ
  },
  
  // 陰謀論・オルタナティブニュース（テスト用）
  {
    name: 'InfoWars',
    url: 'https://www.infowars.com/rss.xml',
    category: 'Conspiracy',
    language: 'en',
    source_reliability: 3 // 情報の信頼性は低いが、陰謀論カテゴリのテスト用
  },
  {
    name: 'Natural News',
    url: 'https://www.naturalnews.com/rss.xml',
    category: 'Conspiracy',
    language: 'en',
    source_reliability: 3 // オルタナティブニュース
  },
  {
    name: 'Zero Hedge',
    url: 'https://feeds.feedburner.com/zerohedge/feed',
    category: 'Conspiracy',
    language: 'en',
    source_reliability: 4 // 経済陰謀論系、一部信頼できる情報もある
  },
  {
    name: 'Global Research',
    url: 'https://www.globalresearch.ca/rss',
    category: 'Conspiracy',
    language: 'en',
    source_reliability: 4 // オルタナティブ分析、政治経済の陰謀論
  },
  {
    name: 'The Vigilant Citizen',
    url: 'https://vigilantcitizen.com/feed/',
    category: 'Conspiracy',
    language: 'en',
    source_reliability: 3 // 象徴主義・メディア分析の陰謀論
  }
];