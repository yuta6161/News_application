require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('🔗 Gemini API接続テスト開始...\n');
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    console.log('📡 APIキー確認...');
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY環境変数が設定されていません');
    }
    console.log('   ✅ APIキー存在確認 (長さ: ' + process.env.GEMINI_API_KEY.length + ')');
    
    console.log('🤖 Gemini初期化...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100,
      }
    });
    console.log('   ✅ モデル初期化完了');
    
    console.log('📝 API呼び出しテスト...');
    const startTime = Date.now();
    const result = await model.generateContent('Hello, respond with "OK"');
    const response = result.response.text();
    const duration = Date.now() - startTime;
    
    console.log('   ✅ API応答受信 (' + duration + 'ms)');
    console.log('   📄 応答内容:', response);
    
    if (response.toLowerCase().includes('ok')) {
      console.log('\\n🎉 Gemini API接続テスト成功！');
      return true;
    } else {
      console.log('\\n⚠️  予期しない応答内容');
      return false;
    }
    
  } catch (error) {
    console.log('\\n❌ Gemini API接続失敗:');
    console.log('   エラータイプ:', error.constructor.name);
    console.log('   エラーメッセージ:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('   💡 APIキーの問題の可能性があります');
    } else if (error.message.includes('quota')) {
      console.log('   💡 API使用量制限の可能性があります');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('   💡 ネットワーク接続の問題の可能性があります');
    }
    
    return false;
  }
}

testGeminiAPI().catch(console.error);