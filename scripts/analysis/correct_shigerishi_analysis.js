/**
 * 下重さんとの会話分析 - 修正版
 * 正しい関係性情報を含めて学習システムに記録
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// 修正された関係性情報
const correctedAnalysis = {
    // 基本情報
    fileName: '社労士　下重さん.txt',
    analysisType: 'meeting',
    timestamp: new Date('2025-06-17').toISOString(),
    
    // 修正された関係性情報
    relationshipCorrections: {
        meeting_context: '守成クラブ（経営者コミュニティ）での知り合い',
        contract_period: '昨年から顧問契約（比較的新しい関係）',
        relationship_distance: '業務上の相談相手（それほど深い信頼関係ではない）',
        meeting_purpose: '年度更新相談 + AI研修ビジネス協力打診'
    },
    
    // 会話の真の構造
    conversationStructure: {
        surface_purpose: '年度更新手続きの相談',
        real_purpose: 'AI研修ビジネスでの協力可能性を探る商談',
        proposal: '顧問契約→スポット契約への変更提案'
    },
    
    // 参加者特徴（確認済み）
    participants: {
        suetake: {
            speech_pattern: '関西弁ベース「〜んすけど」「〜じゃないすか」',
            personality: [
                '効率重視、現実主義',
                'SKコーム運営から距離を置く方針',
                'AI技術への深い理解と熱中',
                'ビジネス構想力と戦略的思考'
            ]
        },
        shigerishi: {
            profession: '社労士として専門的知識を持つ',
            ai_usage: 'HRベース等のAIツールを既に使用',
            personality: [
                '慎重で現実的な判断',
                '新技術への興味はあるが保守的'
            ]
        }
    },
    
    // 重要な議論ポイント
    keyDiscussions: [
        {
            topic: '年度更新手続き',
            details: '建設業労災保険と雇用保険の手続き確認'
        },
        {
            topic: '契約形態変更',
            details: '顧問契約からスポット契約への変更提案・合意'
        },
        {
            topic: 'AI研修ビジネス協力',
            details: [
                '助成金を活用したAI研修パッケージの提案',
                '社労士による申請サポートの協力可能性',
                '労務管理状況による制約の確認'
            ]
        },
        {
            topic: 'AI技術活用状況',
            details: [
                '下重さん：HRベース使用中（月額15,000円）',
                '末武さん：自己学習システム開発中',
                'AI業務効率化の議論'
            ]
        }
    ],
    
    // 学習ポイント
    learningPoints: {
        relationship_dynamics: [
            '守成クラブという経営者コミュニティでの出会い',
            '昨年からの比較的新しい顧問契約関係',
            '業務上の相談相手レベルの関係性',
            'それほど深い信頼関係ではない'
        ],
        conversation_flow: [
            '表面的な年度更新相談から始まる',
            '真の目的はAI研修ビジネスでの協力打診',
            '契約形態変更の提案と合意',
            'AI技術活用についての情報交換'
        ],
        business_insights: [
            '末武さんのSKコーム運営からの距離感',
            'AI研修ビジネスへの参入意欲',
            '助成金活用スキームへの関心',
            '効率重視の現実的判断'
        ]
    }
};

// データベーステーブル作成（存在しない場合）
async function createTables(learningDb) {
    console.log('Creating tables if not exists...');
    
    // 学習データテーブル
    await learningDb.exec(`
        CREATE TABLE IF NOT EXISTS conversation_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            analysis_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            raw_content TEXT,
            analysis_result TEXT,
            learning_points TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // 関係性学習テーブル
    await learningDb.exec(`
        CREATE TABLE IF NOT EXISTS relationship_learning (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_name TEXT NOT NULL,
            relationship_context TEXT,
            relationship_distance TEXT,
            meeting_purposes TEXT,
            communication_patterns TEXT,
            business_interactions TEXT,
            learning_timestamp TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log('Tables created successfully.');
}

// 分析結果をデータベースに保存
async function saveAnalysisToDatabase(learningDb) {
    console.log('Saving corrected analysis to database...');
    
    try {
        // ファイル内容読み込み
        const filePath = './input/社労士　下重さん.txt';
        const rawContent = fs.readFileSync(filePath, 'utf8');
        
        // 会話分析データを保存
        const analysisResult = await learningDb.run(`
            INSERT INTO conversation_analysis 
            (file_name, analysis_type, timestamp, raw_content, analysis_result, learning_points)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            correctedAnalysis.fileName,
            correctedAnalysis.analysisType,
            correctedAnalysis.timestamp,
            rawContent,
            JSON.stringify(correctedAnalysis),
            JSON.stringify(correctedAnalysis.learningPoints)
        ]);
        
        console.log(`Conversation analysis saved with ID: ${analysisResult.lastID}`);
        
        // 関係性学習データを保存
        const relationshipResult = await learningDb.run(`
            INSERT INTO relationship_learning 
            (person_name, relationship_context, relationship_distance, meeting_purposes, 
             communication_patterns, business_interactions, learning_timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            '下重育美（社労士）',
            correctedAnalysis.relationshipCorrections.meeting_context,
            correctedAnalysis.relationshipCorrections.relationship_distance,
            JSON.stringify([
                correctedAnalysis.relationshipCorrections.meeting_purpose,
                ...Object.values(correctedAnalysis.conversationStructure)
            ]),
            JSON.stringify(correctedAnalysis.participants.shigerishi),
            JSON.stringify(correctedAnalysis.keyDiscussions),
            correctedAnalysis.timestamp
        ]);
        
        console.log(`Relationship learning saved with ID: ${relationshipResult.lastID}`);
        
        // 学習統計を更新
        await updateLearningStatistics(learningDb);
        
        console.log('✅ 修正された分析結果を学習システムに正しく記録しました。');
        
    } catch (error) {
        console.error('❌ データベース保存エラー:', error.message);
        throw error;
    }
}

// 学習統計を更新
async function updateLearningStatistics(learningDb) {
    // 学習統計テーブル作成
    await learningDb.exec(`
        CREATE TABLE IF NOT EXISTS learning_statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_conversations INTEGER DEFAULT 0,
            relationship_profiles INTEGER DEFAULT 0,
            analysis_corrections INTEGER DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // 統計更新
    await learningDb.run(`
        INSERT OR REPLACE INTO learning_statistics 
        (id, total_conversations, relationship_profiles, analysis_corrections, last_updated)
        VALUES (
            1,
            (SELECT COUNT(*) FROM conversation_analysis),
            (SELECT COUNT(DISTINCT person_name) FROM relationship_learning),
            (SELECT COUNT(*) FROM conversation_analysis WHERE analysis_result LIKE '%corrected%'),
            CURRENT_TIMESTAMP
        )
    `);
    
    console.log('Learning statistics updated.');
}

// 分析結果の検証表示
function displayAnalysisResults() {
    console.log('\n=== 修正された分析結果 ===\n');
    
    console.log('📋 基本情報:');
    console.log(`  ファイル: ${correctedAnalysis.fileName}`);
    console.log(`  種別: ${correctedAnalysis.analysisType}`);
    console.log(`  日時: ${correctedAnalysis.timestamp}`);
    
    console.log('\n🔄 修正された関係性情報:');
    Object.entries(correctedAnalysis.relationshipCorrections).forEach(([key, value]) => {
        console.log(`  ${key.replace(/_/g, ' ')}: ${value}`);
    });
    
    console.log('\n💬 会話の真の構造:');
    Object.entries(correctedAnalysis.conversationStructure).forEach(([key, value]) => {
        console.log(`  ${key.replace(/_/g, ' ')}: ${value}`);
    });
    
    console.log('\n👥 参加者特徴:');
    console.log('  末武さん:');
    console.log(`    話し方: ${correctedAnalysis.participants.suetake.speech_pattern}`);
    correctedAnalysis.participants.suetake.personality.forEach(trait => {
        console.log(`    - ${trait}`);
    });
    
    console.log('  下重さん:');
    console.log(`    専門性: ${correctedAnalysis.participants.shigerishi.profession}`);
    console.log(`    AI活用: ${correctedAnalysis.participants.shigerishi.ai_usage}`);
    correctedAnalysis.participants.shigerishi.personality.forEach(trait => {
        console.log(`    - ${trait}`);
    });
    
    console.log('\n🎯 重要な議論ポイント:');
    correctedAnalysis.keyDiscussions.forEach((discussion, index) => {
        console.log(`  ${index + 1}. ${discussion.topic}`);
        if (Array.isArray(discussion.details)) {
            discussion.details.forEach(detail => console.log(`     - ${detail}`));
        } else {
            console.log(`     ${discussion.details}`);
        }
    });
    
    console.log('\n📚 学習ポイント:');
    Object.entries(correctedAnalysis.learningPoints).forEach(([category, points]) => {
        console.log(`  ${category.replace(/_/g, ' ')}:`);
        points.forEach(point => console.log(`    - ${point}`));
    });
}

// メイン実行
async function main() {
    console.log('🔄 下重さんとの会話分析 - 修正版実行開始\n');
    
    let learningDb;
    
    try {
        // データベース接続
        learningDb = await open({
            filename: path.join(__dirname, '../../database/learning.db'),
            driver: sqlite3.Database
        });
        
        // テーブル作成
        await createTables(learningDb);
        
        // 分析結果表示
        displayAnalysisResults();
        
        // データベースに保存
        await saveAnalysisToDatabase(learningDb);
        
        console.log('\n✅ 修正された分析結果の学習システムへの記録が完了しました。');
        console.log('   正しい関係性情報がデータベースに保存されました。');
        
    } catch (error) {
        console.error('\n❌ エラーが発生しました:', error.message);
        process.exit(1);
    } finally {
        // データベース接続を閉じる
        if (learningDb) {
            await learningDb.close();
        }
    }
}

// スクリプト実行
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    correctedAnalysis,
    saveAnalysisToDatabase,
    displayAnalysisResults
};