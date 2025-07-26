// 環境変数確認スクリプト
require('dotenv').config({ path: '.env.local' });

console.log('🔧 すべての環境変数確認:');
console.log('');

const envVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', // 古い名前も確認
  'CLAUDE_API_KEY',
  'NEXT_PUBLIC_APP_URL'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.slice(0, 30)}...`);
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});

console.log('');
console.log('📝 注意事項:');
console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です');
console.log('   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY は古い名前です');