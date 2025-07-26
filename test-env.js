require('dotenv').config({ path: '.env.local' });

console.log('=== 環境変数テスト ===');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Gemini初期化テスト
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ GoogleGenerativeAI初期化成功');
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  console.log('✅ Geminiモデル取得成功');
  
} catch (error) {
  console.log('❌ Gemini初期化エラー:', error.message);
}