import { config } from 'dotenv';
import { testGeminiConnection, analyzeArticle } from '../lib/ai/gemini';

// 環境変数の読み込み
config({ path: '.env.local' });

async function main() {
  console.log('🚀 Gemini API接続テストを開始します...\n');
  
  // APIキーの確認（最初の数文字のみ表示）
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEYが設定されていません！');
    process.exit(1);
  }
  console.log(`📝 APIキー: ${apiKey.substring(0, 10)}...（確認OK）\n`);
  
  // 1. 基本的な接続テスト
  console.log('1️⃣ 基本接続テスト:');
  const isConnected = await testGeminiConnection();
  
  if (!isConnected) {
    console.error('❌ Gemini APIに接続できませんでした。');
    console.error('APIキーを確認してください。');
    process.exit(1);
  }
  
  console.log('✅ Gemini API接続成功！\n');
  
  // 2. 記事分析テスト
  console.log('2️⃣ 記事分析テスト:');
  const testArticle = {
    title: 'OpenAI、GPT-5を2025年中にリリース予定と発表',
    content: 'OpenAIは本日、次世代言語モデル「GPT-5」を2025年中にリリースする計画を発表しました。GPT-5は従来モデルと比較して推論能力が大幅に向上し、複雑なタスクでも高い精度を実現するとされています。企業向けAPIでは、日本語での文書要約や翻訳機能が強化される予定です。',
    source: 'TechCrunch',
    sourceReliability: 9
  };
  
  console.log('テスト記事:');
  console.log(`タイトル: ${testArticle.title}`);
  console.log(`内容: ${testArticle.content}\n`);
  
  try {
    const analysis = await analyzeArticle(
      testArticle.title,
      testArticle.content,
      testArticle.source,
      testArticle.sourceReliability
    );
    
    console.log('📊 分析結果:');
    console.log('---');
    console.log(`重要度スコア: ${analysis.importance_score}/10`);
    console.log(`要約: ${analysis.summary}`);
    console.log(`検索強化必要: ${analysis.needs_enhancement ? 'はい' : 'いいえ'}`);
    
    console.log('\n📏 タグ:');
    analysis.tags.forEach(tag => {
      console.log(`  - ${tag.tag_name} (${tag.category}) [信頼度: ${tag.confidence}]`);
    });
    
    if (analysis.suggested_searches && analysis.suggested_searches.length > 0) {
      console.log('\n🔍 推奨追加検索:');
      analysis.suggested_searches.forEach(search => {
        console.log(`  - ${search}`);
      });
    }
    
    console.log('\n✅ 記事分析テスト成功！');
    console.log('\n🎉 Gemini APIは正常に動作しています！');
    
  } catch (error) {
    console.error('\n❌ 記事分析テスト失敗:', error);
    process.exit(1);
  }
}

main().catch(console.error);