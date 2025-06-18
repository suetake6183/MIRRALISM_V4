const SimpleLearningSystem = require('./simple-learning-system');
const { log } = require('../shared/logger');

/**
 * 学習統計表示スクリプト
 */
async function main() {
    const learningSystem = new SimpleLearningSystem();
    
    try {
        const stats = await learningSystem.getLearningStatistics();
        
        log('📊 シンプル学習システム統計');
        log('================================');
        log(`総学習経験数: ${stats.total_experiences}件`);
        log(`平均成功スコア: ${Math.round(stats.avg_success_score * 10) / 10}/10`);
        log(`最高スコア: ${stats.max_score}/10`);
        log(`最低スコア: ${stats.min_score}/10`);
        log(`パターン種類: ${stats.pattern_types}種類`);
        log(`総使用回数: ${stats.total_usage}回`);
        log('');
        
        if (stats.recentImprovements.length > 0) {
            log('📈 最近の改善状況 (過去7日間)');
            log('--------------------------------');
            stats.recentImprovements.forEach(improvement => {
                log(`${improvement.input_pattern}: ${Math.round(improvement.avg_score * 10) / 10}/10`);
            });
        }
        
    } catch (error) {
        console.error('❌ 統計取得エラー:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}