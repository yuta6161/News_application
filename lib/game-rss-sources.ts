// ゲーム系RSS専用ソース定義（共通設定）
export const gameRssSources = [
  {
    name: '4Gamer.net',
    url: 'https://www.4gamer.net/rss/news.xml',
    category: 'Game',
    language: 'ja',
    priority: 10,
    description: '国内最大級のPCゲーム専門メディア'
  },
  {
    name: 'ファミ通.com',
    url: 'https://www.famitsu.com/rss/famitsu_all.rdf',
    category: 'Game',
    language: 'ja',
    priority: 9,
    description: '日本最古参・最大手のゲーム総合メディア'
  },
  {
    name: 'IndieGamesPlus',
    url: 'https://indiegamesplus.com/feed',
    category: 'Game',
    language: 'en',
    priority: 9,
    description: 'インディーゲーム専門メディア（Gamasutra制作）'
  },
  {
    name: 'IGN Japan',
    url: 'https://jp.ign.com/feed.xml',
    category: 'Game',
    language: 'ja',
    priority: 8,
    description: '世界最大級ゲームメディアの日本版'
  },
  {
    name: 'Game*Spark',
    url: 'https://www.gamespark.jp/rss/index.rdf',
    category: 'Game',
    language: 'ja',
    priority: 8,
    description: '海外ゲーム・インディーゲーム特化'
  },
  {
    name: 'Steam News',
    url: 'https://store.steampowered.com/feeds/news.xml',
    category: 'Game',
    language: 'en',
    priority: 8,
    description: 'Steam公式ニュース'
  },
  {
    name: '電撃オンライン',
    url: 'https://dengekionline.com/rss/news.rdf',
    category: 'Game',
    language: 'ja',
    priority: 7,
    description: 'アニメ・ゲーム・ホビー総合'
  },
  {
    name: 'AUTOMATON',
    url: 'https://automaton-media.com/feed/',
    category: 'Game',
    language: 'ja',
    priority: 7,
    description: '独立系ゲームメディア、質重視'
  },
  {
    name: 'SteamPrices新作',
    url: 'https://www.steamprices.com/au/rss/new.xml',
    category: 'Game',
    language: 'en',
    priority: 7,
    description: 'Steam新作ゲーム専用'
  },
  {
    name: 'IndieGameBundles',
    url: 'https://indiegamebundles.com/feed',
    category: 'Game',
    language: 'en',
    priority: 6,
    description: 'PCゲームバンドル・無料Steamキー'
  }
]

// ゲーム系重要キーワード（日英対応）
export const gameImportantKeywords = [
  // 日本語キーワード
  '発売', 'リリース', '新作', '続編', '発表', '公開',
  'アップデート', 'DLC', '拡張', 'コラボ',
  'Nintendo Direct', 'State of Play', 'Xbox Showcase',
  'E3', 'TGS', 'gamescom', 'GDC',
  '売上', 'ランキング', '1位', '記録',
  'eスポーツ', '大会', '優勝', '賞金',
  '無料', 'セール', '配信開始', 'サービス終了',
  // 英語キーワード（Steam/インディー系）
  'release', 'launch', 'announced', 'revealed', 'trailer',
  'update', 'patch', 'dlc', 'expansion', 'early access',
  'steam', 'indie', 'independent', 'bundle', 'sale',
  'free', 'discount', 'wishlist', 'greenlight',
  'kickstarter', 'crowdfunding', 'beta', 'alpha',
  'gameplay', 'review', 'rating', 'award'
]

// ゲーム系企業・ブランド（重要度計算用）
export const gameCompanies = [
  // 大手日本企業
  '任天堂', 'ソニー', 'マイクロソフト', 'スクエニ', 'カプコン',
  'バンナム', 'コナミ', 'セガ', 'フロムソフトウェア',
  // 大手海外企業
  'Nintendo', 'Sony', 'Microsoft', 'Square Enix', 'Capcom',
  'Valve', 'Steam', 'Epic Games', 'Ubisoft', 'EA',
  'Activision', 'Blizzard', 'Bethesda', 'CD Projekt',
  // インディー系有名企業・作品
  'Team Cherry', 'Supergiant Games', 'Klei Entertainment',
  'Devolver Digital', 'Annapurna Interactive', 'thatgamecompany',
  'Hades', 'Cuphead', 'Hollow Knight', 'Among Us',
  // Steam関連
  'Early Access', 'Greenlight', 'Steam Workshop'
]

// ゲーム記事の重要度計算（共通関数）
export function calculateGameImportanceScore(title: string, summary: string, source: any): number {
  let score = source.priority || 5
  
  const content = (title + ' ' + summary).toLowerCase()
  
  // キーワードでスコアアップ
  gameImportantKeywords.forEach(keyword => {
    if (content.includes(keyword.toLowerCase())) {
      score = Math.min(10, score + 0.5)
    }
  })
  
  // 企業・ブランドでスコアアップ
  gameCompanies.forEach(company => {
    if (content.includes(company.toLowerCase())) {
      score = Math.min(10, score + 0.3)
    }
  })
  
  return Math.round(score * 10) / 10
}