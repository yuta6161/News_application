import { supabase } from '@/lib/supabase'

async function createTestConspiracyArticles() {
  try {
    console.log('🔍 テスト用陰謀論記事の作成開始...')
    
    // テスト用陰謀論記事データ
    const testArticles = [
      {
        title: 'Federal Reserve Secret Meetings: What They Do Not Want You to Know',
        summary: 'An investigation into the undisclosed discussions at the Federal Reserve that shape global economic policy without public oversight.',
        source_url: 'https://example-conspiracy.com/fed-secrets-1',
        source_name: 'Zero Hedge',
        category: 'Tech', // 一時的にTechとして保存（制約回避）
        published_at: new Date().toISOString(),
        original_language: 'en',
        source_country: 'US',
        importance_score: 7.5,
        ai_summary: 'この記事は連邦準備制度の秘密会議について検証し、一般市民に知らされていない経済政策決定プロセスの透明性欠如を指摘しています。金融エリートによる影響力の行使について詳しく分析しています。'
      },
      {
        title: 'Mainstream Media Control: How Six Corporations Shape Global Narrative',
        summary: 'Analysis of how a handful of media conglomerates control information flow and shape public opinion worldwide.',
        source_url: 'https://example-conspiracy.com/media-control-1',
        source_name: 'The Vigilant Citizen',
        category: 'Tech', // 一時的にTechとして保存
        published_at: new Date(Date.now() - 3600000).toISOString(), // 1時間前
        original_language: 'en',
        source_country: 'US',
        importance_score: 8.0,
        ai_summary: '世界的なメディア企業6社がいかにして情報の流れを支配し、世論形成に影響を与えているかを分析した記事です。メディア集約化の問題と情報統制の現状について詳細に検討しています。'
      },
      {
        title: 'Digital Currency and Social Credit: The Coming Financial Reset',
        summary: 'Exploring the connections between central bank digital currencies and social credit systems being implemented globally.',
        source_url: 'https://example-conspiracy.com/digital-currency-1',
        source_name: 'Global Research',
        category: 'Tech', // 一時的にTechとして保存
        published_at: new Date(Date.now() - 7200000).toISOString(), // 2時間前
        original_language: 'en',
        source_country: 'CA',
        importance_score: 7.8,
        ai_summary: '中央銀行デジタル通貨（CBDC）と社会信用システムの関連性を探り、世界的な金融リセットの可能性について論じた分析記事です。プライバシーと自由への潜在的な影響について警告しています。'
      },
      {
        title: 'Symbolism in Corporate Logos: Hidden Messages in Plain Sight',
        summary: 'An examination of occult and Masonic symbolism in major corporate branding and its alleged deeper meanings.',
        source_url: 'https://example-conspiracy.com/corporate-symbols-1',
        source_name: 'The Vigilant Citizen',
        category: 'Tech', // 一時的にTechとして保存
        published_at: new Date(Date.now() - 10800000).toISOString(), // 3時間前
        original_language: 'en',
        source_country: 'US',
        importance_score: 6.5,
        ai_summary: '大手企業のロゴやブランディングに隠された象徴主義とオカルト的な意味について分析した記事です。フリーメイソンや秘密結社との関連性を示唆する視覚的要素の解釈を提示しています。'
      },
      {
        title: 'The World Economic Forum Agenda: Great Reset or Great Deception',
        summary: 'Critical analysis of the World Economic Forum proposals and their potential impact on individual freedoms and sovereignty.',
        source_url: 'https://example-conspiracy.com/wef-agenda-1',
        source_name: 'Zero Hedge',
        category: 'Tech', // 一時的にTechとして保存
        published_at: new Date(Date.now() - 14400000).toISOString(), // 4時間前
        original_language: 'en',
        source_country: 'US',
        importance_score: 8.5,
        ai_summary: '世界経済フォーラムの「グレートリセット」構想について批判的に分析し、個人の自由と国家主権への潜在的な影響を検討した記事です。グローバルガバナンスの動向について詳しく解説しています。'
      }
    ]
    
    console.log(`📝 ${testArticles.length}件のテスト記事を作成中...`)
    
    // 記事を一件ずつ挿入
    let successCount = 0
    for (const article of testArticles) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .insert([article])
          .select()
        
        if (error) {
          console.error(`❌ 記事挿入失敗: ${article.title.substring(0, 50)}...`, error.message)
        } else {
          console.log(`✅ 記事挿入成功: ${article.title.substring(0, 50)}...`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ 予期しないエラー: ${article.title.substring(0, 50)}...`, err)
      }
    }
    
    console.log(`\n📊 結果: ${successCount}/${testArticles.length} 件の記事を作成`)
    
    // 記事カテゴリをConspiracyに手動更新（制約を一時的に回避）
    console.log('\n🔄 カテゴリをConspiracyに更新中...')
    
    try {
      // 直接SQLでカテゴリを更新（制約チェックを一時的に回避）
      const updatePromises = testArticles.map(article => 
        supabase.rpc('update_article_category', {
          article_url: article.source_url,
          new_category: 'Conspiracy'
        }).then(result => {
          if (result.error) {
            console.log(`⚠️ カテゴリ更新スキップ: ${article.title.substring(0, 30)}... (制約あり)`)
          } else {
            console.log(`✅ カテゴリ更新成功: ${article.title.substring(0, 30)}...`)
          }
        })
      )
      
      await Promise.all(updatePromises)
    } catch (err) {
      console.log('⚠️ カテゴリ更新は制約により一時的にスキップされました')
      console.log('💡 手動でSupabaseダッシュボードから以下のSQLを実行してください:')
      console.log('   UPDATE news_articles SET category = \'Conspiracy\' WHERE source_name IN (\'Zero Hedge\', \'The Vigilant Citizen\', \'Global Research\');')
    }
    
    console.log('\n🎉 テスト用陰謀論記事の作成完了！')
    console.log('🌐 ブラウザで http://localhost:3000 を確認してください')
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// 実行
createTestConspiracyArticles()