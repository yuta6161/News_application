import { RSSSource } from './rss-sources';

/**
 * 記事の重要度を計算する関数
 * 1.0-10.0の範囲で0.1刻みの小数値を返す
 */
export function calculateImportanceScore(
  title: string,
  summary: string,
  source: RSSSource
): number {
  // 基準値: 5.0
  let score = 5.0;
  
  // source_reliabilityによる調整 (-2.0 ~ +2.0)
  // 信頼度10 = +2.0, 信頼度1 = -2.0
  const reliabilityAdjustment = ((source.source_reliability - 5.5) / 4.5) * 2.0;
  score += reliabilityAdjustment;
  
  // カテゴリによる調整
  const categoryBonus = {
    'AI': 2.0,              // AI関連は最優先
    'Tech': 1.0,            // Tech関連は高優先
    'Startup': 0.5,         // スタートアップは中優先
    'Business': 0.3,        // ビジネスは普通
    'Music': 0.2,           // 音楽関連
    'World': 0.4,           // 世界ニュース
    'Sports': 0.1,          // スポーツ
    'Entertainment': 0.1,   // エンターテイメント
    'Conspiracy': -0.5,     // 陰謀論は重要度を下げる
    'General': 0.0          // 一般記事は基準値
  };
  
  score += categoryBonus[source.category] || 0.0;
  
  // キーワードによる重要度調整
  const titleLower = title.toLowerCase();
  const summaryLower = summary.toLowerCase();
  const content = `${titleLower} ${summaryLower}`;
  
  // 高重要度キーワード (+1.5)
  const highImportanceKeywords = [
    'breaking', '速報', '新発表', '発表', 'announces', 'launches',
    'openai', 'chatgpt', 'claude', 'gemini', 'gpt', 'ai model',
    'breakthrough', '画期的', '革新', '買収', 'acquisition', 'merger'
  ];
  
  // 中重要度キーワード (+1.0)
  const mediumImportanceKeywords = [
    'update', 'アップデート', '更新', 'release', 'リリース',
    'new feature', '新機能', 'beta', 'ベータ', 'preview',
    'funding', '資金調達', 'investment', '投資', 'ipo'
  ];
  
  // 低重要度キーワード (+0.5)
  const lowImportanceKeywords = [
    'tutorial', 'チュートリアル', 'how to', '方法', 'guide',
    'tips', 'コツ', 'best practices', 'ベストプラクティス'
  ];
  
  // キーワードマッチング処理
  for (const keyword of highImportanceKeywords) {
    if (content.includes(keyword)) {
      score += 1.5;
      break; // 複数マッチしても1回だけ加算
    }
  }
  
  for (const keyword of mediumImportanceKeywords) {
    if (content.includes(keyword)) {
      score += 1.0;
      break;
    }
  }
  
  for (const keyword of lowImportanceKeywords) {
    if (content.includes(keyword)) {
      score += 0.5;
      break;
    }
  }
  
  // 記事の長さによる調整（詳細な記事ほど高評価）
  if (summary.length > 300) {
    score += 0.3;
  } else if (summary.length < 100) {
    score -= 0.2;
  }
  
  // 英語記事は翻訳価値があるため少し加点
  if (source.language === 'en') {
    score += 0.2;
  }
  
  // 1.0-10.0の範囲に収める
  score = Math.max(1.0, Math.min(10.0, score));
  
  // 0.1刻みに丸める
  score = Math.round(score * 10) / 10;
  
  return score;
}

/**
 * 重要度スコアを星の数で表示するためのヘルパー関数
 */
export function getImportanceStars(score: number): string {
  const stars = Math.round(score / 2); // 1-10を1-5の星に変換
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

/**
 * 重要度による色分けのためのヘルパー関数
 */
export function getImportanceColor(score: number): string {
  if (score >= 8.0) return 'text-red-600';      // 超重要（赤）
  if (score >= 6.5) return 'text-orange-600';   // 重要（オレンジ）
  if (score >= 5.0) return 'text-yellow-600';   // 普通（黄）
  if (score >= 3.5) return 'text-blue-600';     // 低重要（青）
  return 'text-gray-600';                       // 最低重要（グレー）
}