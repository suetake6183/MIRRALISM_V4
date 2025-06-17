const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// JST（日本標準時）でのタイムスタンプ生成
function getJSTTimestamp() {
    const now = new Date();
    const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return jstTime.toISOString().replace('Z', '+09:00');
}

// SQLite用のJSTタイムスタンプ文字列を生成
function getJSTForDB() {
    const now = new Date();
    const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return jstTime.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
}

/**
 * 分析方法の効果測定システム
 * 各分析手法の効果を追跡し、改善提案を生成する
 */
class EffectivenessTracker {
    constructor() {
        this.learningDbPath = path.join(__dirname, '../database/learning.db');
    }

    /**
     * データベース接続を取得
     */
    async getDbConnection() {
        try {
            return await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });
        } catch (error) {
            console.error('❌ 効果測定データベース接続エラー:', error.message);
            throw error;
        }
    }

    /**
     * 分析方法の効果を追跡
     * @param {string} method - 分析方法
     * @param {object} result - 分析結果
     * @param {object} userFeedback - ユーザーフィードバック
     */
    async trackMethodEffectiveness(method, result, userFeedback = null) {
        try {
            const db = await this.getDbConnection();
            
            const satisfactionScore = this.calculateSatisfactionScore(result, userFeedback);
            
            await db.run(
                `INSERT INTO analysis_method_effectiveness 
                 (file_type, analysis_method, user_satisfaction_score, specific_feedback, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    result.fileType || 'unknown',
                    method,
                    satisfactionScore,
                    userFeedback ? JSON.stringify(userFeedback) : '自動効果測定による記録',
                    getJSTForDB()
                ]
            );

            await db.close();
            
            console.log(`効果測定記録: ${method} (満足度: ${satisfactionScore}/5)`);
            
            return {
                method: method,
                satisfactionScore: satisfactionScore,
                recorded: true
            };
            
        } catch (error) {
            console.error('❌ 効果測定記録エラー:', error.message);
            throw error;
        }
    }

    /**
     * 改善トレンドの分析
     * @param {number} days - 分析対象日数（デフォルト30日）
     */
    async analyzeImprovementTrends(days = 30) {
        try {
            const db = await this.getDbConnection();
            
            // 期間内のデータを取得
            const recentData = await db.all(
                `SELECT * FROM analysis_method_effectiveness 
                 WHERE created_at > datetime('now', '-${days} days', 'localtime')
                 ORDER BY created_at DESC`
            );

            if (recentData.length === 0) {
                await db.close();
                return {
                    averageSatisfaction: 0,
                    trendDirection: 'no_data',
                    recommendedMethods: [],
                    dataPoints: 0
                };
            }

            const trends = {
                averageSatisfaction: this.calculateAverage(recentData),
                trendDirection: this.calculateTrend(recentData),
                recommendedMethods: await this.getTopMethods(db, days),
                dataPoints: recentData.length,
                methodBreakdown: this.analyzeMethodBreakdown(recentData),
                improvementSuggestions: this.generateImprovementSuggestions(recentData)
            };

            await db.close();

            return trends;
            
        } catch (error) {
            console.error('❌ 改善トレンド分析エラー:', error.message);
            return null;
        }
    }

    /**
     * 推奨手法の生成
     * @param {string} fileType - ファイルタイプ
     */
    async generateMethodRecommendations(fileType) {
        try {
            const db = await this.getDbConnection();
            
            const effectiveData = await db.all(
                `SELECT analysis_method, 
                        AVG(user_satisfaction_score) as avg_score,
                        COUNT(*) as usage_count,
                        MAX(created_at) as last_used
                 FROM analysis_method_effectiveness 
                 WHERE file_type = ? AND created_at > datetime('now', '-60 days', 'localtime')
                 GROUP BY analysis_method
                 HAVING avg_score >= 4.0
                 ORDER BY avg_score DESC, usage_count DESC
                 LIMIT 5`,
                [fileType]
            );

            await db.close();

            return effectiveData.map(data => ({
                method: data.analysis_method,
                averageScore: Math.round(data.avg_score * 10) / 10,
                usageCount: data.usage_count,
                lastUsed: data.last_used,
                effectiveness: data.avg_score >= 4.5 ? 'excellent' : 'good',
                recommendationReason: this.generateRecommendationReason(data)
            }));
            
        } catch (error) {
            console.error('❌ 推奨手法生成エラー:', error.message);
            return [];
        }
    }

    /**
     * 満足度スコアの計算
     * @param {object} result - 分析結果
     * @param {object} feedback - ユーザーフィードバック
     */
    calculateSatisfactionScore(result, feedback) {
        if (feedback && feedback.rating) {
            return Math.min(Math.max(feedback.rating, 1), 5);
        }
        
        // フィードバックがない場合は結果の質から推定
        let score = 3; // 基本点
        
        // 分析結果の品質指標
        if (result.participants && result.participants.length > 0) score += 0.5;
        if (result.decisions && result.decisions.length > 0) score += 0.5;
        if (result.actionItems && result.actionItems.length > 0) score += 0.5;
        if (result.insights && result.insights.length > 0) score += 0.5;
        
        // コンテンツの充実度
        if (result.content && result.content.length > 500) score += 0.5;
        
        return Math.min(Math.round(score * 10) / 10, 5);
    }

    /**
     * 平均満足度の計算
     */
    calculateAverage(data) {
        if (data.length === 0) return 0;
        const sum = data.reduce((acc, item) => acc + item.user_satisfaction_score, 0);
        return Math.round((sum / data.length) * 10) / 10;
    }

    /**
     * トレンドの方向性を計算
     */
    calculateTrend(data) {
        if (data.length < 6) return 'insufficient_data';

        const recent = data.slice(0, Math.floor(data.length / 2));
        const previous = data.slice(Math.floor(data.length / 2));

        const recentAvg = this.calculateAverage(recent);
        const previousAvg = this.calculateAverage(previous);

        const difference = recentAvg - previousAvg;

        if (difference > 0.2) return 'improving';
        if (difference < -0.2) return 'declining';
        return 'stable';
    }

    /**
     * トップ手法の取得
     */
    async getTopMethods(db, days = 30) {
        try {
            const topMethods = await db.all(
                `SELECT analysis_method,
                        AVG(user_satisfaction_score) as avg_score,
                        COUNT(*) as usage_count
                 FROM analysis_method_effectiveness 
                 WHERE created_at > datetime('now', '-${days} days', 'localtime')
                 GROUP BY analysis_method
                 HAVING usage_count >= 2
                 ORDER BY avg_score DESC, usage_count DESC
                 LIMIT 3`
            );

            return topMethods.map(method => ({
                method: method.analysis_method,
                averageScore: Math.round(method.avg_score * 10) / 10,
                usageCount: method.usage_count
            }));
        } catch (error) {
            console.error('❌ トップ手法取得エラー:', error.message);
            return [];
        }
    }

    /**
     * 手法別内訳の分析
     */
    analyzeMethodBreakdown(data) {
        const breakdown = {};
        
        data.forEach(item => {
            const method = item.analysis_method;
            if (!breakdown[method]) {
                breakdown[method] = {
                    count: 0,
                    totalScore: 0,
                    averageScore: 0
                };
            }
            breakdown[method].count++;
            breakdown[method].totalScore += item.user_satisfaction_score;
        });

        // 平均スコアを計算
        Object.keys(breakdown).forEach(method => {
            breakdown[method].averageScore = 
                Math.round((breakdown[method].totalScore / breakdown[method].count) * 10) / 10;
        });

        return breakdown;
    }

    /**
     * 改善提案の生成
     */
    generateImprovementSuggestions(data) {
        const suggestions = [];
        const breakdown = this.analyzeMethodBreakdown(data);
        const overallAverage = this.calculateAverage(data);

        // 全体的な満足度が低い場合
        if (overallAverage < 3.5) {
            suggestions.push({
                type: 'overall_improvement',
                priority: 'high',
                suggestion: `全体の満足度が${overallAverage}と低めです。分析手法の見直しを推奨します。`
            });
        }

        // 特定手法の改善が必要な場合
        Object.entries(breakdown).forEach(([method, stats]) => {
            if (stats.averageScore < 3.0 && stats.count >= 3) {
                suggestions.push({
                    type: 'method_specific',
                    priority: 'medium',
                    suggestion: `${method}の満足度が${stats.averageScore}と低いです。手法の調整が必要です。`
                });
            }
        });

        // 高評価手法の推奨
        const topMethod = Object.entries(breakdown)
            .filter(([_, stats]) => stats.count >= 2)
            .sort((a, b) => b[1].averageScore - a[1].averageScore)[0];

        if (topMethod && topMethod[1].averageScore >= 4.0) {
            suggestions.push({
                type: 'recommend_best',
                priority: 'low',
                suggestion: `${topMethod[0]}が高評価（${topMethod[1].averageScore}）です。この手法の活用を推奨します。`
            });
        }

        return suggestions;
    }

    /**
     * 推奨理由の生成
     */
    generateRecommendationReason(data) {
        const reasons = [];
        
        if (data.avg_score >= 4.5) {
            reasons.push('非常に高い満足度');
        } else if (data.avg_score >= 4.0) {
            reasons.push('高い満足度');
        }
        
        if (data.usage_count >= 10) {
            reasons.push('豊富な実績');
        } else if (data.usage_count >= 5) {
            reasons.push('十分な実績');
        }
        
        return reasons.length > 0 ? reasons.join('、') : '安定した性能';
    }

    /**
     * 効果測定レポートの生成
     */
    async generateEffectivenessReport(days = 30) {
        try {
            const trends = await this.analyzeImprovementTrends(days);
            
            if (!trends) {
                return {
                    success: false,
                    message: 'レポート生成に失敗しました'
                };
            }

            const report = {
                generatedAt: getJSTTimestamp(),
                period: `${days}日間`,
                summary: {
                    averageSatisfaction: trends.averageSatisfaction,
                    trendDirection: trends.trendDirection,
                    dataPoints: trends.dataPoints
                },
                topMethods: trends.recommendedMethods,
                methodBreakdown: trends.methodBreakdown,
                improvementSuggestions: trends.improvementSuggestions,
                recommendations: this.generateOverallRecommendations(trends)
            };

            return {
                success: true,
                report: report
            };
            
        } catch (error) {
            console.error('❌ 効果測定レポート生成エラー:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 総合的な推奨事項の生成
     */
    generateOverallRecommendations(trends) {
        const recommendations = [];

        // トレンドに基づく推奨
        switch (trends.trendDirection) {
            case 'improving':
                recommendations.push('現在の傾向は良好です。このまま継続してください。');
                break;
            case 'declining':
                recommendations.push('満足度が低下傾向にあります。分析手法の見直しを検討してください。');
                break;
            case 'stable':
                recommendations.push('安定した性能を維持しています。さらなる改善の機会を探ってください。');
                break;
        }

        // 満足度レベルに基づく推奨
        if (trends.averageSatisfaction >= 4.5) {
            recommendations.push('非常に高い満足度を達成しています。');
        } else if (trends.averageSatisfaction >= 4.0) {
            recommendations.push('良好な満足度レベルです。');
        } else if (trends.averageSatisfaction >= 3.0) {
            recommendations.push('満足度の向上余地があります。');
        } else {
            recommendations.push('満足度の大幅な改善が必要です。');
        }

        return recommendations;
    }
}

module.exports = EffectivenessTracker;