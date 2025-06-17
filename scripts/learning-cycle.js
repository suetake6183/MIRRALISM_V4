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
 * 継続的学習サイクル管理システム
 * Claude Code自身の判定結果を継続的に学習し、精度向上を図る
 */
class LearningCycleManager {
    constructor() {
        this.effectivenessThreshold = 0.8; // 80%以上で成功判定
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
            console.error('❌ 学習データベース接続エラー:', error.message);
            throw error;
        }
    }

    /**
     * 分析結果の自動学習
     * @param {string} fileType - ファイルタイプ
     * @param {object} analysisResult - 分析結果
     * @param {object} userFeedback - ユーザーフィードバック（オプション）
     */
    async captureAnalysisExperience(fileType, analysisResult, userFeedback = null) {
        try {
            console.log('\n学習サイクル実行中...');
            
            const db = await this.getDbConnection();
            
            // 1. 判定結果の記録
            await this.saveFileTypeLearning(db, {
                contentSample: analysisResult.contentSample || analysisResult.content?.substring(0, 200),
                llmJudgment: analysisResult.llmJudgment || fileType,
                llmReasoning: analysisResult.llmReasoning || analysisResult.reasoning,
                userFeedback: userFeedback ? JSON.stringify(userFeedback) : null,
                correctType: fileType,
                isCorrect: true
            });
            
            // 2. 成功パターンの更新
            await this.updateSuccessPatterns(db, fileType, analysisResult);
            
            // 3. 効果測定の記録
            if (analysisResult.analysisMethod) {
                await this.recordEffectiveness(db, fileType, analysisResult);
            }
            
            await db.close();
            
            console.log('学習データを自動記録しました');
            console.log(`学習内容: ${fileType}タイプの判定精度向上`);
            
        } catch (error) {
            console.error('❌ 学習データ記録エラー:', error.message);
            throw error;
        }
    }

    /**
     * ファイル種別学習データの保存
     */
    async saveFileTypeLearning(db, learningData) {
        try {
            await db.run(
                `INSERT INTO file_type_learning 
                 (file_content_sample, llm_judgment, llm_reasoning, user_feedback, correct_type, is_correct, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    learningData.contentSample,
                    learningData.llmJudgment,
                    learningData.llmReasoning,
                    learningData.userFeedback,
                    learningData.correctType,
                    learningData.isCorrect,
                    getJSTForDB()
                ]
            );
        } catch (error) {
            console.error('❌ ファイル種別学習データ保存エラー:', error.message);
            throw error;
        }
    }

    /**
     * 成功パターンの更新
     */
    async updateSuccessPatterns(db, fileType, analysisResult) {
        try {
            // 既存パターンの検索
            const existingPattern = await db.get(
                `SELECT * FROM learning_patterns 
                 WHERE pattern_description LIKE ? AND context LIKE ?`,
                [`%${fileType}%`, `%成功%`]
            );

            if (existingPattern) {
                // 既存パターンの成功回数を増加
                await db.run(
                    `UPDATE learning_patterns 
                     SET success_count = success_count + 1, 
                         last_used = ?,
                         pattern_details = ?
                     WHERE id = ?`,
                    [getJSTForDB(), JSON.stringify(analysisResult), existingPattern.id]
                );
            } else {
                // 新しい成功パターンを作成
                await db.run(
                    `INSERT INTO learning_patterns 
                     (pattern_description, pattern_details, success_count, context, last_used, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        `${fileType}タイプの判定成功パターン`,
                        JSON.stringify(analysisResult),
                        1,
                        `${fileType}分析の成功事例`,
                        getJSTForDB(),
                        getJSTForDB()
                    ]
                );
            }
        } catch (error) {
            console.error('❌ 成功パターン更新エラー:', error.message);
            throw error;
        }
    }

    /**
     * 効果測定の記録
     */
    async recordEffectiveness(db, fileType, analysisResult) {
        try {
            const satisfactionScore = this.calculateSatisfactionScore(analysisResult);
            
            await db.run(
                `INSERT INTO analysis_method_effectiveness 
                 (file_type, analysis_method, user_satisfaction_score, specific_feedback, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    fileType,
                    analysisResult.analysisMethod,
                    satisfactionScore,
                    analysisResult.feedback || '自動学習による記録',
                    getJSTForDB()
                ]
            );
        } catch (error) {
            console.error('❌ 効果測定記録エラー:', error.message);
            throw error;
        }
    }

    /**
     * 満足度スコアの計算
     */
    calculateSatisfactionScore(analysisResult) {
        let score = 3; // 基本点

        // 分析結果の質に基づいてスコアを調整
        if (analysisResult.confidence && analysisResult.confidence > 0.8) score += 1;
        if (analysisResult.detailLevel === 'high') score += 1;
        if (analysisResult.participants && analysisResult.participants.length > 0) score += 1;

        return Math.min(score, 5);
    }

    /**
     * 判定精度の継続的改善
     */
    async improveJudgmentAccuracy() {
        try {
            const db = await this.getDbConnection();
            
            // 過去の学習データを分析
            const learningData = await db.all(
                `SELECT * FROM file_type_learning 
                 WHERE created_at > datetime('now', '-30 days', 'localtime')
                 ORDER BY created_at DESC`
            );

            const accuracyTrends = this.analyzeAccuracyTrends(learningData);
            const improvements = this.generateImprovementSuggestions(accuracyTrends);

            await db.close();

            return improvements;
        } catch (error) {
            console.error('❌ 判定精度改善分析エラー:', error.message);
            return [];
        }
    }

    /**
     * 精度トレンドの分析
     */
    analyzeAccuracyTrends(learningData) {
        const totalJudgments = learningData.length;
        const correctJudgments = learningData.filter(data => data.is_correct).length;
        const accuracyRate = totalJudgments > 0 ? correctJudgments / totalJudgments : 0;

        const typeAccuracy = {};
        learningData.forEach(data => {
            if (!typeAccuracy[data.llm_judgment]) {
                typeAccuracy[data.llm_judgment] = { correct: 0, total: 0 };
            }
            typeAccuracy[data.llm_judgment].total++;
            if (data.is_correct) {
                typeAccuracy[data.llm_judgment].correct++;
            }
        });

        return {
            overallAccuracy: accuracyRate,
            typeAccuracy: typeAccuracy,
            totalJudgments: totalJudgments,
            recentTrend: this.calculateRecentTrend(learningData)
        };
    }

    /**
     * 最近のトレンド計算
     */
    calculateRecentTrend(learningData) {
        if (learningData.length < 10) return 'insufficient_data';

        const recent = learningData.slice(0, 5);
        const previous = learningData.slice(5, 10);

        const recentAccuracy = recent.filter(d => d.is_correct).length / recent.length;
        const previousAccuracy = previous.filter(d => d.is_correct).length / previous.length;

        if (recentAccuracy > previousAccuracy) return 'improving';
        if (recentAccuracy < previousAccuracy) return 'declining';
        return 'stable';
    }

    /**
     * 改善提案の生成
     */
    generateImprovementSuggestions(accuracyTrends) {
        const suggestions = [];

        if (accuracyTrends.overallAccuracy < 0.9) {
            suggestions.push({
                type: 'accuracy_improvement',
                suggestion: `判定精度が${(accuracyTrends.overallAccuracy * 100).toFixed(1)}%です。90%以上を目標に改善が必要です。`,
                priority: 'high'
            });
        }

        Object.entries(accuracyTrends.typeAccuracy).forEach(([type, accuracy]) => {
            const rate = accuracy.correct / accuracy.total;
            if (rate < 0.8) {
                suggestions.push({
                    type: 'type_specific_improvement',
                    suggestion: `${type}タイプの判定精度（${(rate * 100).toFixed(1)}%）に改善の余地があります。`,
                    priority: 'medium'
                });
            }
        });

        if (accuracyTrends.recentTrend === 'declining') {
            suggestions.push({
                type: 'trend_alert',
                suggestion: '最近の判定精度が低下傾向にあります。学習データの見直しを推奨します。',
                priority: 'high'
            });
        }

        return suggestions;
    }

    /**
     * 効果的な分析手法の特定
     */
    async identifyEffectiveMethods() {
        try {
            const db = await this.getDbConnection();
            
            const effectivenessData = await db.all(
                `SELECT file_type, analysis_method, 
                        AVG(user_satisfaction_score) as avg_score,
                        COUNT(*) as usage_count
                 FROM analysis_method_effectiveness 
                 WHERE created_at > datetime('now', '-60 days', 'localtime')
                 GROUP BY file_type, analysis_method
                 HAVING avg_score >= 4.0
                 ORDER BY avg_score DESC, usage_count DESC`
            );

            await db.close();

            return effectivenessData.map(data => ({
                fileType: data.file_type,
                method: data.analysis_method,
                averageScore: data.avg_score,
                usageCount: data.usage_count,
                effectiveness: data.avg_score >= 4.5 ? 'excellent' : 'good'
            }));
        } catch (error) {
            console.error('❌ 効果的手法特定エラー:', error.message);
            return [];
        }
    }

    /**
     * 学習統計の取得
     */
    async getLearningStatistics() {
        try {
            const db = await this.getDbConnection();
            
            const stats = {
                totalLearningEntries: 0,
                accuracyRate: 0,
                mostAccurateType: null,
                recentImprovements: 0
            };

            // 総学習エントリー数
            const totalResult = await db.get(
                'SELECT COUNT(*) as count FROM file_type_learning'
            );
            stats.totalLearningEntries = totalResult.count;

            // 精度率
            const accuracyResult = await db.get(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
                 FROM file_type_learning`
            );
            if (accuracyResult.total > 0) {
                stats.accuracyRate = accuracyResult.correct / accuracyResult.total;
            }

            // 最も精度の高いタイプ
            const typeAccuracy = await db.all(
                `SELECT llm_judgment,
                        COUNT(*) as total,
                        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
                 FROM file_type_learning
                 GROUP BY llm_judgment
                 HAVING total >= 3
                 ORDER BY (correct * 1.0 / total) DESC
                 LIMIT 1`
            );
            if (typeAccuracy.length > 0) {
                stats.mostAccurateType = {
                    type: typeAccuracy[0].llm_judgment,
                    accuracy: typeAccuracy[0].correct / typeAccuracy[0].total
                };
            }

            // 最近の改善数
            const recentResult = await db.get(
                `SELECT COUNT(*) as count FROM learning_patterns
                 WHERE last_used > datetime('now', '-7 days', 'localtime')`
            );
            stats.recentImprovements = recentResult.count;

            await db.close();

            return stats;
        } catch (error) {
            console.error('❌ 学習統計取得エラー:', error.message);
            return null;
        }
    }
}

module.exports = LearningCycleManager;