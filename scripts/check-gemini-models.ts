import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 環境変数の読み込み
config({ path: '.env.local' });

async function main() {
  console.log('🔍 Gemini API利用可能モデルの確認\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEYが設定されていません！');
    process.exit(1);
  }
  
  console.log(`📝 APIキー: ${apiKey.substring(0, 10)}...（確認OK）\n`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // 利用可能なモデルのリスト
  const modelsToTest = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash', 
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp'
  ];
  
  console.log('🧪 各モデルでテスト:\n');
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`📌 ${modelName}:`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello! Please respond with "OK" if you can read this.');
      const response = await result.response;
      const text = response.text();
      console.log(`   ✅ 成功: ${text.substring(0, 50)}...`);
    } catch (error: any) {
      if (error.message?.includes('model not found')) {
        console.log(`   ⚠️  モデルが見つかりません`);
      } else if (error.message?.includes('API_KEY_INVALID')) {
        console.log(`   ❌ APIキーが無効です`);
      } else {
        console.log(`   ❌ エラー: ${error.message?.substring(0, 50)}...`);
      }
    }
    console.log('');
  }
  
  console.log('\n💡 ヒント:');
  console.log('1. APIキーが正しいか確認してください');
  console.log('2. Google AI StudioでAPIが有効化されているか確認してください');
  console.log('3. 利用可能なモデル名を使用してください');
}

main().catch(console.error);