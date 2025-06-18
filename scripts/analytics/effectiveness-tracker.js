const { log } = require('../shared/logger');
const { EffectivenessTrackerCore } = require('./effectiveness-tracker-core');
const { EffectivenessStatistics } = require('./effectiveness-statistics');

// 設計書準拠：効果測定システム（分割構造対応）
class EffectivenessTracker {
    constructor() {
        this.core = new EffectivenessTrackerCore();
        this.statistics = new EffectivenessStatistics();
    }

    // 設計書準拠：データベース接続（委譲）
    async getDbConnection() {
        return await this.core.getDbConnection();
    }

    // 設計書準拠：メソッド効果測定（委譲）
    async trackMethodEffectiveness(method, result, userFeedback = null) {
        return await this.core.trackMethodEffectiveness(method, result, userFeedback);
    }

    // 設計書準拠：改善トレンド分析（委譲）
    async analyzeImprovementTrends(days = 30) {
        return await this.core.analyzeImprovementTrends(days);
    }

    // 設計書準拠：メソッド推奨生成（委譲）
    async generateMethodRecommendations(fileType) {
        return await this.core.generateMethodRecommendations(fileType);
    }

    // 設計書準拠：効果測定レポート生成（委譲）
    async generateEffectivenessReport(days = 30) {
        return await this.statistics.generateEffectivenessReport(days);
    }

    // 設計書準拠：効果予測分析（新機能）
    async predictEffectiveness(methodName, context = {}) {
        return await this.statistics.predictEffectiveness(methodName, context);
    }

    // 設計書準拠：メソッド比較分析（新機能）
    async compareMethodEffectiveness(method1, method2) {
        return await this.statistics.compareMethodEffectiveness(method1, method2);
    }

    // 設計書準拠：効果測定データ取得
    async getEffectivenessData(methodName = null) {
        return await this.core.getEffectivenessData(methodName);
    }

    // 設計書準拠：包括的効果分析実行
    async runComprehensiveEffectivenessAnalysis(options = {}) {
        log('包括的効果分析を開始...');
        
        const {
            days = 30,
            includeComparison = true,
            includePrediction = true
        } = options;
        
        try {
            const results = {
                basicAnalysis: null,
                trends: null,
                report: null,
                comparison: null,
                predictions: null,
                timestamp: require('./shared/logger').getJSTTimestamp()
            };
            
            // 1. 基本トレンド分析
            log('トレンド分析を実行中...');
            results.trends = await this.analyzeImprovementTrends(days);
            
            // 2. 効果測定レポート生成
            log('効果測定レポートを生成中...');
            results.report = await this.generateEffectivenessReport(days);
            
            // 3. メソッド比較分析（オプション）
            if (includeComparison && results.report.topMethods && results.report.topMethods.length >= 2) {
                log('メソッド比較分析を実行中...');
                const topMethod = results.report.topMethods[0].method_name;
                const secondMethod = results.report.topMethods[1].method_name;
                results.comparison = await this.compareMethodEffectiveness(topMethod, secondMethod);
            }
            
            // 4. 効果予測（オプション）
            if (includePrediction && results.report.topMethods && results.report.topMethods.length > 0) {
                log('効果予測分析を実行中...');
                results.predictions = [];
                for (const method of results.report.topMethods.slice(0, 3)) { // 上位3つのメソッド
                    const prediction = await this.predictEffectiveness(method.method_name);
                    results.predictions.push(prediction);
                }
            }
            
            log('包括的効果分析完了');
            
            return results;
            
        } catch (error) {
            log('包括的効果分析エラー: ' + error.message);
            return {
                error: error.message,
                timestamp: require('./shared/logger').getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：キャッシュ管理
    getCachedStatistics(key) {
        return this.statistics.getCachedStatistics(key);
    }

    setCachedStatistics(key, data, ttl = 300000) {
        return this.statistics.setCachedStatistics(key, data, ttl);
    }

    clearExpiredCache() {
        return this.statistics.clearExpiredCache();
    }
}

// 設計書準拠：エクスポート
module.exports = {
    EffectivenessTracker
};

// 設計書準拠：直接実行（既存コードとの互換性保持）
if (require.main === module) {
    async function runEffectivenessTracking() {
        log('MIRRALISM V4 - 効果測定システム');
        log('設計書準拠版（分割構造対応）');
        log('');
        
        const tracker = new EffectivenessTracker();
        
        try {
            // 包括的効果分析を実行
            const results = await tracker.runComprehensiveEffectivenessAnalysis();
            
            if (!results.error) {
                log('');
                log('=== 効果分析結果 ===');
                
                if (results.trends) {
                    log('総メソッド数: ' + results.trends.totalMethods);
                    log('平均効果スコア: ' + results.trends.averageEffectiveness + '%');
                    log('改善中メソッド: ' + results.trends.improvingMethods + '個');
                }
                
                if (results.report && results.report.recommendations) {
                    log('');
                    log('=== 改善提案 ===');
                    results.report.recommendations.forEach((rec, index) => {
                        log((index + 1) + '. [' + rec.priority.toUpperCase() + '] ' + rec.title + ': ' + rec.description);
                    });
                }
                
                if (results.predictions && results.predictions.length > 0) {
                    log('');
                    log('=== 効果予測 ===');
                    results.predictions.forEach((pred, index) => {
                        log((index + 1) + '. ' + pred.methodName + ': ' + pred.prediction + '% (信頼度: ' + (pred.confidence * 100) + '%)');
                    });
                }
            }
            
        } catch (error) {
            log('効果測定システムエラー: ' + error.message);
        }
    }
    
    runEffectivenessTracking();
}