const SimpleLearningSystem = require('../simple-learning-system');
const fs = require('fs').promises;
const path = require('path');

/**
 * シンプル学習システムの基本テスト
 */
async function runTests() {
    console.log('🧪 シンプル学習システムのテストを開始');
    
    const learningSystem = new SimpleLearningSystem();
    let testsPassed = 0;
    let testsFailed = 0;
    
    // テスト1: データベース初期化
    try {
        await learningSystem.initializeDatabase();
        console.log('✅ テスト1: データベース初期化 - 成功');
        testsPassed++;
    } catch (error) {
        console.error('❌ テスト1: データベース初期化 - 失敗:', error.message);
        testsFailed++;
    }
    
    // テスト2: 学習データなしでの分析
    try {
        const result = await learningSystem.analyzeWithLearning('テスト内容', 'meeting');
        if (result.approach && result.experienceId) {
            console.log('✅ テスト2: 初回分析 - 成功');
            testsPassed++;
        } else {
            throw new Error('必要なデータが返されませんでした');
        }
    } catch (error) {
        console.error('❌ テスト2: 初回分析 - 失敗:', error.message);
        testsFailed++;
    }
    
    // テスト3: フィードバック記録
    try {
        const result = await learningSystem.analyzeWithLearning('テスト内容2', 'meeting');
        const feedback = await learningSystem.receiveFeedback(
            result.experienceId, 
            '良い分析でした'
        );
        if (feedback.score === 8) {
            console.log('✅ テスト3: フィードバック記録 - 成功');
            testsPassed++;
        } else {
            throw new Error('スコアが期待値と異なります');
        }
    } catch (error) {
        console.error('❌ テスト3: フィードバック記録 - 失敗:', error.message);
        testsFailed++;
    }
    
    // テスト4: 学習データを活用した分析
    try {
        // 成功パターンを作成
        const result1 = await learningSystem.analyzeWithLearning('テスト内容3', 'proposal');
        await learningSystem.receiveFeedback(result1.experienceId, '素晴らしい');
        
        // 同じパターンで再分析
        const result2 = await learningSystem.analyzeWithLearning('テスト内容4', 'proposal');
        if (result2.usedLearnings > 0) {
            console.log('✅ テスト4: 学習データ活用 - 成功');
            testsPassed++;
        } else {
            throw new Error('学習データが活用されませんでした');
        }
    } catch (error) {
        console.error('❌ テスト4: 学習データ活用 - 失敗:', error.message);
        testsFailed++;
    }
    
    // テスト5: 統計取得
    try {
        const stats = await learningSystem.getLearningStatistics();
        if (stats.total_experiences >= 3) {
            console.log('✅ テスト5: 統計取得 - 成功');
            console.log(`  総経験数: ${stats.total_experiences}`);
            console.log(`  平均スコア: ${Math.round(stats.avg_success_score * 10) / 10}`);
            console.log(`  パターン種類: ${stats.pattern_types}`);
            testsPassed++;
        } else {
            throw new Error('統計データが不正です');
        }
    } catch (error) {
        console.error('❌ テスト5: 統計取得 - 失敗:', error.message);
        testsFailed++;
    }
    
    // 結果サマリー
    console.log('\n📊 テスト結果サマリー');
    console.log(`✅ 成功: ${testsPassed}件`);
    console.log(`❌ 失敗: ${testsFailed}件`);
    console.log(`合計: ${testsPassed + testsFailed}件`);
    
    if (testsFailed === 0) {
        console.log('\n🎉 全てのテストが成功しました！');
    } else {
        console.log('\n⚠️ 一部のテストが失敗しました');
    }
}

// テスト実行
if (require.main === module) {
    runTests().catch(console.error);
}