/**
 * タグカテゴリの定義
 * Gemini AIが使用すべきカテゴリを明確に定義
 */

export const TAG_CATEGORIES = {
  // 基本カテゴリ（必須）
  company: {
    name: 'company',
    description: '企業・組織名（例：Apple, Google, OpenAI）',
    examples: ['Apple', 'Google', 'OpenAI', 'Microsoft', 'トヨタ']
  },
  
  person: {
    name: 'person',
    description: '人物名（例：イーロン・マスク、アーティスト名）',
    examples: ['イーロン・マスク', 'Taylor Swift', 'サム・アルトマン']
  },
  
  technology: {
    name: 'technology',
    description: '技術・テクノロジー（例：AI, ブロックチェーン）',
    examples: ['AI', '機械学習', 'ブロックチェーン', 'VR', 'AR']
  },
  
  platform: {
    name: 'platform',
    description: 'サービス・プラットフォーム（例：YouTube, Spotify）',
    examples: ['YouTube', 'Spotify', 'Twitter', 'GitHub', 'AWS']
  },
  
  // コンテンツ分類カテゴリ
  genre: {
    name: 'genre',
    description: 'ジャンル・分野（例：ロック、ジャズ、EDM）',
    examples: ['ロック', 'ジャズ', 'EDM', 'ヒップホップ', 'クラシック']
  },
  
  announcement_type: {
    name: 'announcement_type',
    description: '発表・ニュースの種類（例：新製品発表、買収）',
    examples: ['新製品発表', '買収', 'パートナーシップ', '資金調達', 'アップデート']
  },
  
  // メタ情報カテゴリ
  importance: {
    name: 'importance',
    description: '重要度・優先度を示すタグ',
    examples: ['速報', '重要', '注目', 'トレンド', '話題']
  },
  
  event: {
    name: 'event',
    description: 'イベント・出来事（例：カンファレンス、フェスティバル）',
    examples: ['WWDC', 'CES', 'コミケ', 'フジロック', 'オリンピック']
  }
} as const;

// カテゴリ名の配列（型安全）
export const ALLOWED_CATEGORIES = Object.keys(TAG_CATEGORIES) as Array<keyof typeof TAG_CATEGORIES>;

// Gemini用のプロンプト生成
export function getCategoryPrompt(): string {
  return `
**カテゴリは必ず以下の8種類から選択してください：**

${Object.entries(TAG_CATEGORIES).map(([key, value]) => 
  `- ${key}: ${value.description}`
).join('\n')}

**重要**: 上記以外のカテゴリは使用しないでください。
該当するカテゴリがない場合は、最も近いカテゴリを選択してください。
`;
}

// カテゴリ検証関数
export function isValidCategory(category: string): category is keyof typeof TAG_CATEGORIES {
  return category in TAG_CATEGORIES;
}

// カテゴリのSQL配列を生成
export function getCategorySQLArray(): string {
  return `ARRAY[${ALLOWED_CATEGORIES.map(c => `'${c}'::text`).join(', ')}]`;
}