const SimpleLearningSystem = require('../core/simple-learning-system');
const { log } = require('../shared/logger');

/**
 * シンプル学習システムの初期化
 */
async function main() {
    log('🚀 シンプル学習システムを初期化中...');
    
    const learningSystem = new SimpleLearningSystem();
    
    try {
        await learningSystem.initializeDatabase();
        
        log('✅ データベース初期化完了');
        log('📁 データベースファイル: database/simple_learning.db');
        log('');
        log('🎯 使用方法:');
        log('1. 分析実行: node scripts/core/analyze.js <ファイルパス>');
        log('2. フィードバック: node scripts/core/feedback.js <ID> "<内容>"');
        log('3. 統計確認: node scripts/core/learning-stats.js');
        
    } catch (error) {
        console.error('❌ 初期化エラー:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}