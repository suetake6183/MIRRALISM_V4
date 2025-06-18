const fs = require('fs').promises;
const path = require('path');
const { log, getJSTTimestamp } = require('../shared/logger');
const { EffectivenessTrackerCore } = require('./effectiveness-tracker-core');

// 設計書準拠：効果測定統計処理クラス
class EffectivenessStatistics {
    constructor() {
        this.core = new EffectivenessTrackerCore();
        this.statisticsCache = new Map();
    }

    // 設計書準拠：効果測定レポート生成
    async generateEffectivenessReport(days = 30) {
        log('効果測定レポートを生成中: ' + days + '日間');
        
        try {
            const db = await this.core.getDbConnection();
            
            // 基本統計の収集
            const basicStats = await this.collectBasicStatistics(db, days);
            
            // トレンド分析
            const trends = await this.core.analyzeImprovementTrends(days);
            
            // 上位メソッド
            const topMethods = await this.core.getTopMethods(db, days);
            
            // 効果分布
            const distribution = await this.calculateEffectivenessDistribution(db);
            
            await db.close();
            
            const report = {
                period: days + '日間',
                generated: getJSTTimestamp(),
                basicStatistics: basicStats,
                trends: trends,
                topMethods: topMethods,
                effectivenessDistribution: distribution,
                recommendations: this.generateStatisticalRecommendations(basicStats, trends)
            };
            
            // レポートをファイルに出力
            const outputPath = path.join(__dirname, '..', '..', 'output', 'effectiveness-report.json');
            await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
            
            log('効果測定レポートを出力しました: ' + outputPath);
            
            return report;
            
        } catch (error) {
            log('効果測定レポート生成エラー: ' + error.message);
            return {
                error: error.message,
                generated: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：基本統計収集
    async collectBasicStatistics(db, days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
        
        // メソッド統計
        const methodStats = await db.get(`
            SELECT 
                COUNT(*) as total_methods,
                AVG(effectiveness_score) as avg_effectiveness,
                MAX(effectiveness_score) as max_effectiveness,
                MIN(effectiveness_score) as min_effectiveness,
                SUM(usage_count) as total_usage
            FROM method_effectiveness 
            WHERE last_used >= ?
        `, [cutoffString]);
        
        // 効果レベル別カウント
        const levelCounts = await db.all(`
            SELECT 
                CASE 
                    WHEN effectiveness_score >= 80 THEN 'excellent'
                    WHEN effectiveness_score >= 60 THEN 'good'
                    WHEN effectiveness_score >= 40 THEN 'average'
                    ELSE 'poor'
                END as level,
                COUNT(*) as count
            FROM method_effectiveness 
            WHERE last_used >= ?
            GROUP BY level
        `, [cutoffString]);
        
        return {
            ...methodStats,
            avg_effectiveness: methodStats.avg_effectiveness ? Math.round(methodStats.avg_effectiveness * 100) / 100 : 0,
            levelDistribution: levelCounts
        };
    }

    // 設計書準拠：効果分布計算
    async calculateEffectivenessDistribution(db) {
        const distribution = await db.all(`
            SELECT 
                CASE 
                    WHEN effectiveness_score >= 90 THEN '90-100%'
                    WHEN effectiveness_score >= 80 THEN '80-89%'
                    WHEN effectiveness_score >= 70 THEN '70-79%'
                    WHEN effectiveness_score >= 60 THEN '60-69%'
                    WHEN effectiveness_score >= 50 THEN '50-59%'
                    WHEN effectiveness_score >= 40 THEN '40-49%'
                    WHEN effectiveness_score >= 30 THEN '30-39%'
                    WHEN effectiveness_score >= 20 THEN '20-29%'
                    WHEN effectiveness_score >= 10 THEN '10-19%'
                    ELSE '0-9%'
                END as range,
                COUNT(*) as count
            FROM method_effectiveness 
            GROUP BY range
            ORDER BY MIN(effectiveness_score) DESC
        `);
        
        return distribution;
    }

    // 設計書準拠：統計的推奨事項生成
    generateStatisticalRecommendations(basicStats, trends) {
        const recommendations = [];
        
        // 平均効果スコアに基づく推奨
        if (basicStats.avg_effectiveness < 60) {
            recommendations.push({
                priority: 'high',
                category: 'effectiveness',
                title: 'メソッド効果の向上',
                description: '平均効果スコアが' + basicStats.avg_effectiveness + '%と低いです。効果的なメソッドの選択と最適化が必要です。'
            });
        }
        
        // 使用頻度に基づく推奨
        if (basicStats.total_usage < 50) {
            recommendations.push({
                priority: 'medium',
                category: 'usage',
                title: 'メソッド活用の促進',
                description: '総使用回数が' + basicStats.total_usage + '回と少ないです。より積極的なメソッド活用を推奨します。'
            });
        }
        
        // メソッド数に基づく推奨
        if (basicStats.total_methods < 5) {
            recommendations.push({
                priority: 'medium',
                category: 'diversity',
                title: 'メソッドの多様化',
                description: '利用メソッド数が' + basicStats.total_methods + '個と少ないです。多様なアプローチの検討を推奨します。'
            });
        }
        
        // トレンドに基づく推奨
        if (trends.decliningMethods > trends.improvingMethods) {
            recommendations.push({
                priority: 'high',
                category: 'trends',
                title: 'メソッド効果の改善',
                description: '効果が低下しているメソッド（' + trends.decliningMethods + '個）が改善しているメソッド（' + trends.improvingMethods + '個）を上回っています。'
            });
        }
        
        return recommendations;
    }

    // 設計書準拠：効果予測分析
    async predictEffectiveness(methodName, context = {}) {
        log('効果予測分析を実行: ' + methodName);
        
        try {
            // 過去の効果データを取得
            const historicalData = await this.core.getEffectivenessData(methodName);
            
            if (historicalData.length === 0) {
                return {
                    methodName: methodName,
                    prediction: 50, // デフォルト予測値
                    confidence: 0.1,
                    reason: '履歴データなし'
                };
            }
            
            // 効果予測計算
            const recentData = historicalData.slice(-10); // 最新10件
            const avgEffectiveness = recentData.reduce((sum, data) => sum + data.effectiveness_score, 0) / recentData.length;
            
            // コンテキストに基づく調整
            let contextAdjustment = 0;
            if (context.fileType) {
                // ファイルタイプに適合しているかの簡易判定
                const contextMatch = historicalData.some(data => 
                    data.success_contexts && data.success_contexts.includes(context.fileType)
                );
                if (contextMatch) {
                    contextAdjustment += 10;
                }
            }
            
            const prediction = Math.min(Math.max(Math.round(avgEffectiveness + contextAdjustment), 0), 100);
            const confidence = Math.min(recentData.length / 10, 1); // 最大1.0
            
            return {
                methodName: methodName,
                prediction: prediction,
                confidence: Math.round(confidence * 100) / 100,
                reason: '過去' + recentData.length + '件のデータに基づく予測'
            };
            
        } catch (error) {
            log('効果予測分析エラー: ' + error.message);
            return {
                methodName: methodName,
                prediction: 0,
                confidence: 0,
                error: error.message
            };
        }
    }

    // 設計書準拠：比較分析
    async compareMethodEffectiveness(method1, method2) {
        log('メソッド比較分析: ' + method1 + ' vs ' + method2);
        
        try {
            const data1 = await this.core.getEffectivenessData(method1);
            const data2 = await this.core.getEffectivenessData(method2);
            
            const comparison = {
                method1: {
                    name: method1,
                    avgEffectiveness: data1.length > 0 ? Math.round(data1.reduce((sum, d) => sum + d.effectiveness_score, 0) / data1.length) : 0,
                    usageCount: data1.reduce((sum, d) => sum + d.usage_count, 0),
                    dataPoints: data1.length
                },
                method2: {
                    name: method2,
                    avgEffectiveness: data2.length > 0 ? Math.round(data2.reduce((sum, d) => sum + d.effectiveness_score, 0) / data2.length) : 0,
                    usageCount: data2.reduce((sum, d) => sum + d.usage_count, 0),
                    dataPoints: data2.length
                },
                analysis: {
                    effectivenessDifference: 0,
                    usageDifference: 0,
                    recommendation: ''
                }
            };
            
            // 比較分析
            comparison.analysis.effectivenessDifference = comparison.method1.avgEffectiveness - comparison.method2.avgEffectiveness;
            comparison.analysis.usageDifference = comparison.method1.usageCount - comparison.method2.usageCount;
            
            // 推奨メソッドの決定
            if (Math.abs(comparison.analysis.effectivenessDifference) < 5) {
                comparison.analysis.recommendation = '両メソッドの効果は同程度です';
            } else if (comparison.analysis.effectivenessDifference > 0) {
                comparison.analysis.recommendation = method1 + 'がより効果的です（+' + comparison.analysis.effectivenessDifference + '%）';
            } else {
                comparison.analysis.recommendation = method2 + 'がより効果的です（+' + Math.abs(comparison.analysis.effectivenessDifference) + '%）';
            }
            
            return comparison;
            
        } catch (error) {
            log('メソッド比較分析エラー: ' + error.message);
            return {
                error: error.message
            };
        }
    }

    // 設計書準拠：統計キャッシュ管理
    getCachedStatistics(key) {
        return this.statisticsCache.get(key);
    }

    setCachedStatistics(key, data, ttl = 300000) { // 5分のTTL
        this.statisticsCache.set(key, {
            data: data,
            expires: Date.now() + ttl
        });
    }

    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.statisticsCache.entries()) {
            if (value.expires < now) {
                this.statisticsCache.delete(key);
            }
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    EffectivenessStatistics
};