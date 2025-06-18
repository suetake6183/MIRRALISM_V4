const { LearningCycle } = require('../analytics/learning-cycle');
const { log } = require('../shared/logger');

/**
 * MIRRALISM V4 - 学習パターン抽出スクリプト
 * 分析結果から学習パターンを抽出してデータベースに保存
 */

// Maeda Kuniko分析から学習パターンを抽出・保存
async function extractMaedaKunikoPatterns() {
    log('=== Maeda Kuniko学習パターン抽出開始 ===');
    
    const learningCycle = new LearningCycle();
    const result = await learningCycle.saveMaedaKunikoLearningPatterns();
    
    if (result.success) {
        log('✓ 学習パターン抽出完了');
        log('✓ 保存パターン数: ' + result.patternsCount);
        log('✓ カテゴリ: ' + result.categories.join(', '));
        
        // 統計も表示
        const stats = await learningCycle.getLearningStatistics();
        log('');
        log('=== 現在の学習データベース統計 ===');
        log('総パターン数: ' + stats.totalPatterns);
        log('平均成功率: ' + stats.averageSuccess);
        log('最新学習日時: ' + stats.latestLearning);
        
    } else {
        log('✗ 学習パターン抽出エラー: ' + result.error);
    }
    
    return result;
}

// 汎用的な学習パターン保存関数
async function saveCustomLearningPattern(patternDescription, patternDetails, context) {
    log('カスタム学習パターンを保存中: ' + patternDescription);
    
    const learningCycle = new LearningCycle();
    const analysisResult = {
        success: true,
        confidence: 0.8,
        details: patternDetails
    };
    
    return await learningCycle.captureAnalysisExperience(context, analysisResult, null);
}

// メイン実行関数
async function main() {
    log('MIRRALISM V4 - 学習パターン抽出システム');
    log('');
    
    try {
        // Maeda Kuniko学習パターンを抽出
        await extractMaedaKunikoPatterns();
        
        log('');
        log('学習パターン抽出処理完了');
        
    } catch (error) {
        log('処理エラー: ' + error.message);
    }
}

module.exports = {
    extractMaedaKunikoPatterns,
    saveCustomLearningPattern
};

// 直接実行時の処理
if (require.main === module) {
    main();
}