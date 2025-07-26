// lib/tag-master.ts
// タグマスターの初期データ定義

export interface InitialTag {
  tag_name: string;
  category: 'company' | 'technology' | 'announcement_type' | 'importance' | 'platform' | 'genre' | 'price_range' | 'rating' | 'topic' | 'source_type';
  parent_category: string;
  description: string;
  base_reliability: number; // 1.0-10.0
}

export const initialTags: InitialTag[] = [
  // ========================================
  // AI・テクノロジー企業（高信頼度）
  // ========================================
  {
    tag_name: 'OpenAI',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'OpenAI社に関連する記事・発表',
    base_reliability: 10.0
  },
  {
    tag_name: 'Google',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'Google社に関連する記事・発表',
    base_reliability: 9.0
  },
  {
    tag_name: 'Microsoft',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'Microsoft社に関連する記事・発表',
    base_reliability: 9.0
  },
  {
    tag_name: 'Apple',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'Apple社に関連する記事・発表',
    base_reliability: 9.0
  },
  {
    tag_name: 'Meta',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'Meta社（旧Facebook）に関連する記事・発表',
    base_reliability: 8.0
  },
  {
    tag_name: 'Anthropic',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'Anthropic社（Claude開発元）に関連する記事・発表',
    base_reliability: 9.0
  },
  {
    tag_name: 'NVIDIA',
    category: 'company',
    parent_category: 'ai_tech',
    description: 'NVIDIA社に関連する記事・発表',
    base_reliability: 8.0
  },

  // ========================================
  // AI技術カテゴリ
  // ========================================
  {
    tag_name: '言語AI',
    category: 'technology',
    parent_category: 'ai_tech',
    description: '自然言語処理・大規模言語モデル関連技術',
    base_reliability: 8.0
  },
  {
    tag_name: '画像生成AI',
    category: 'technology',
    parent_category: 'ai_tech',
    description: '画像生成・画像認識AI技術',
    base_reliability: 8.0
  },
  {
    tag_name: '音声認識',
    category: 'technology',
    parent_category: 'ai_tech',
    description: '音声認識・音声合成技術',
    base_reliability: 7.0
  },
  {
    tag_name: '機械学習',
    category: 'technology',
    parent_category: 'ai_tech',
    description: '機械学習・深層学習技術全般',
    base_reliability: 8.0
  },
  {
    tag_name: 'マルチモーダル',
    category: 'technology',
    parent_category: 'ai_tech',
    description: '複数の入力形式を扱うAI技術',
    base_reliability: 7.0
  },
  {
    tag_name: 'LLM',
    category: 'technology',
    parent_category: 'ai_tech',
    description: '大規模言語モデル（Large Language Model）',
    base_reliability: 8.0
  },

  // ========================================
  // 発表・ニュースタイプ
  // ========================================
  {
    tag_name: '新製品発表',
    category: 'announcement_type',
    parent_category: 'general',
    description: '新製品・新サービスの発表',
    base_reliability: 8.0
  },
  {
    tag_name: '研究論文',
    category: 'announcement_type',
    parent_category: 'general',
    description: '研究論文の発表・公開',
    base_reliability: 7.0
  },
  {
    tag_name: 'アップデート',
    category: 'announcement_type',
    parent_category: 'general',
    description: '既存製品・サービスのアップデート',
    base_reliability: 6.0
  },
  {
    tag_name: '買収・合併',
    category: 'announcement_type',
    parent_category: 'business',
    description: '企業の買収・合併に関するニュース',
    base_reliability: 8.0
  },
  {
    tag_name: '資金調達',
    category: 'announcement_type',
    parent_category: 'business',
    description: 'スタートアップ・企業の資金調達',
    base_reliability: 7.0
  },
  {
    tag_name: '提携・協業',
    category: 'announcement_type',
    parent_category: 'business',
    description: '企業間の提携・協業発表',
    base_reliability: 7.0
  },

  // ========================================
  // 重要度・注目度
  // ========================================
  {
    tag_name: '革新的',
    category: 'importance',
    parent_category: 'general',
    description: '業界に大きな変化をもたらす革新的な内容',
    base_reliability: 9.0
  },
  {
    tag_name: '重要',
    category: 'importance',
    parent_category: 'general',
    description: '業界・技術にとって重要な内容',
    base_reliability: 8.0
  },
  {
    tag_name: '注目',
    category: 'importance',
    parent_category: 'general',
    description: '注目すべき内容・トレンド',
    base_reliability: 7.0
  },
  {
    tag_name: '速報',
    category: 'importance',
    parent_category: 'general',
    description: '速報性のあるニュース',
    base_reliability: 8.0
  },

  // ========================================
  // ゲーム関連（プラットフォーム）
  // ========================================
  {
    tag_name: 'Steam',
    category: 'platform',
    parent_category: 'game',
    description: 'Steam プラットフォーム関連',
    base_reliability: 8.0
  },
  {
    tag_name: 'Switch',
    category: 'platform',
    parent_category: 'game',
    description: 'Nintendo Switch 関連',
    base_reliability: 8.0
  },
  {
    tag_name: 'PlayStation',
    category: 'platform',
    parent_category: 'game',
    description: 'PlayStation 関連',
    base_reliability: 8.0
  },
  {
    tag_name: 'Xbox',
    category: 'platform',
    parent_category: 'game',
    description: 'Xbox 関連',
    base_reliability: 8.0
  },

  // ========================================
  // ゲームジャンル
  // ========================================
  {
    tag_name: 'アクション',
    category: 'genre',
    parent_category: 'game',
    description: 'アクションゲーム',
    base_reliability: 7.0
  },
  {
    tag_name: 'RPG',
    category: 'genre',
    parent_category: 'game',
    description: 'ロールプレイングゲーム',
    base_reliability: 7.0
  },
  {
    tag_name: 'インディー',
    category: 'genre',
    parent_category: 'game',
    description: 'インディーゲーム',
    base_reliability: 7.0
  },
  {
    tag_name: 'シミュレーション',
    category: 'genre',
    parent_category: 'game',
    description: 'シミュレーションゲーム',
    base_reliability: 7.0
  },

  // ========================================
  // 価格帯
  // ========================================
  {
    tag_name: '無料',
    category: 'price_range',
    parent_category: 'game',
    description: '無料ゲーム・無料サービス',
    base_reliability: 8.0
  },
  {
    tag_name: '〜1000円',
    category: 'price_range',
    parent_category: 'game',
    description: '1000円以下の価格帯',
    base_reliability: 8.0
  },
  {
    tag_name: '1000-3000円',
    category: 'price_range',
    parent_category: 'game',
    description: '1000円〜3000円の価格帯',
    base_reliability: 8.0
  },
  {
    tag_name: '3000円以上',
    category: 'price_range',
    parent_category: 'game',
    description: '3000円以上の価格帯',
    base_reliability: 8.0
  },

  // ========================================
  // 評価・レーティング
  // ========================================
  {
    tag_name: '圧倒的に好評',
    category: 'rating',
    parent_category: 'game',
    description: 'Steamで圧倒的に好評の評価',
    base_reliability: 9.0
  },
  {
    tag_name: '非常に好評',
    category: 'rating',
    parent_category: 'game',
    description: 'Steamで非常に好評の評価',
    base_reliability: 8.0
  },
  {
    tag_name: '好評',
    category: 'rating',
    parent_category: 'game',
    description: 'Steamで好評の評価',
    base_reliability: 7.0
  },
  {
    tag_name: '高評価',
    category: 'rating',
    parent_category: 'general',
    description: '一般的に高い評価を受けている',
    base_reliability: 7.0
  },

  // ========================================
  // その他の重要技術
  // ========================================
  {
    tag_name: 'Web開発',
    category: 'technology',
    parent_category: 'tech',
    description: 'Web開発技術・フレームワーク',
    base_reliability: 6.0
  },
  {
    tag_name: 'クラウド',
    category: 'technology',
    parent_category: 'tech',
    description: 'クラウドサービス・技術',
    base_reliability: 7.0
  },
  {
    tag_name: 'セキュリティ',
    category: 'technology',
    parent_category: 'tech',
    description: 'セキュリティ技術・脆弱性',
    base_reliability: 8.0
  },
  {
    tag_name: 'ブロックチェーン',
    category: 'technology',
    parent_category: 'tech',
    description: 'ブロックチェーン・暗号通貨技術',
    base_reliability: 6.0
  },
  
  // ========================================
  // 陰謀論・オルタナティブ系（テスト用）
  // ========================================
  {
    tag_name: '陰謀論',
    category: 'topic',
    parent_category: 'conspiracy',
    description: '陰謀論的な内容・主張を含む記事',
    base_reliability: 3.0
  },
  {
    tag_name: 'ディープステート',
    category: 'topic',
    parent_category: 'conspiracy',
    description: '影の政府・ディープステートに関する内容',
    base_reliability: 2.0
  },
  {
    tag_name: 'グローバリズム批判',
    category: 'topic',
    parent_category: 'conspiracy',
    description: 'グローバリズム・国際機関への批判的観点',
    base_reliability: 4.0
  },
  {
    tag_name: 'メディア批判',
    category: 'topic',
    parent_category: 'conspiracy',
    description: '主流メディア・情報統制への批判',
    base_reliability: 5.0
  },
  {
    tag_name: '経済陰謀論',
    category: 'topic',
    parent_category: 'conspiracy',
    description: '金融・経済システムの陰謀論的解釈',
    base_reliability: 3.5
  },
  {
    tag_name: 'ワクチン懐疑論',
    category: 'topic',
    parent_category: 'conspiracy',
    description: 'ワクチン・医療政策への懐疑的見解',
    base_reliability: 2.5
  },
  {
    tag_name: '象徴主義分析',
    category: 'topic',
    parent_category: 'conspiracy',
    description: 'シンボル・象徴の隠された意味の分析',
    base_reliability: 3.0
  },
  {
    tag_name: 'オルタナティブニュース',
    category: 'source_type',
    parent_category: 'conspiracy',
    description: '主流メディア以外の情報源',
    base_reliability: 4.0
  }
];

// カテゴリ別の統計を取得する関数
export function getTagStatsByCategory() {
  const stats: { [key: string]: number } = {};
  
  initialTags.forEach(tag => {
    stats[tag.category] = (stats[tag.category] || 0) + 1;
  });
  
  return stats;
}

// 親カテゴリ別の統計を取得する関数
export function getTagStatsByParentCategory() {
  const stats: { [key: string]: number } = {};
  
  initialTags.forEach(tag => {
    stats[tag.parent_category] = (stats[tag.parent_category] || 0) + 1;
  });
  
  return stats;
}

// 高信頼度タグ（8.0以上）を取得する関数
export function getHighReliabilityTags() {
  return initialTags.filter(tag => tag.base_reliability >= 8.0);
}

// 特定カテゴリのタグを取得する関数
export function getTagsByCategory(category: string) {
  return initialTags.filter(tag => tag.category === category);
}