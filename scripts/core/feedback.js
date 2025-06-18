const SimpleLearningSystem = require('./simple-learning-system');
const { log } = require('../shared/logger');

/**
 * フィードバック受付スクリプト
 * 使用方法: node feedback.js <experienceId> "<フィードバック内容>"
 */
async function main() {
    const experienceId = process.argv[2];
    const feedback = process.argv[3];
    
    if (!experienceId || !feedback) {
        console.error('使用方法: node feedback.js <experienceId> "<フィードバック内容>"');
        process.exit(1);
    }
    
    const learningSystem = new SimpleLearningSystem();
    
    try {
        const result = await learningSystem.receiveFeedback(experienceId, feedback);
        
        log('📝 フィードバックを受け取りました');
        log(`📊 成功スコア: ${result.originalScore} → ${result.adjustedScore}`);
        log(`💡 改善点: ${result.improvements.join('、')}`);
        log('');
        log('次回の分析でこのフィードバックが活用されます。');
        
    } catch (error) {
        console.error('❌ フィードバック処理エラー:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}