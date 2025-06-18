const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：効果測定コア機能クラス
class EffectivenessTrackerCore {
    constructor() {
        this.learningDbPath = path.join(__dirname, '..', '..', 'database', 'learning.db');
    }

    // 設計書準拠：データベース接続
    async getDbConnection() {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });
            return db;
        } catch (error) {
            log('データベース接続エラー: ' + error.message);
            throw error;
        }
    }

    // 設計書準拠：メソッド効果測定
    async trackMethodEffectiveness(method, result, userFeedback = null) {
        log('メソッド効果測定を開始: ' + method);
        
        try {
            const db = await this.getDbConnection();
            
            // 既存記録の確認
            const existing = await db.get(
                'SELECT * FROM method_effectiveness WHERE method_name = ?',
                [method]
            );
            
            if (existing) {
                // 既存記録の更新
                const newUsageCount = existing.usage_count + 1;
                const newEffectivenessScore = this.calculateEffectivenessScore(result, userFeedback, existing);
                
                await db.run(`
                    UPDATE method_effectiveness 
                    SET effectiveness_score = ?, usage_count = ?, 
                        last_used = ?, optimization_notes = ?
                    WHERE method_name = ?
                `, [
                    newEffectivenessScore,
                    newUsageCount,
                    getJSTTimestamp(),
                    this.generateOptimizationNotes(result, userFeedback),
                    method
                ]);
                
                log('メソッド効果測定を更新しました: ' + method);
                
            } else {
                // 新規記録の作成
                const effectivenessScore = this.calculateEffectivenessScore(result, userFeedback);
                
                await db.run(`
                    INSERT INTO method_effectiveness 
                    (method_name, effectiveness_score, usage_count, success_contexts, optimization_notes, created_at, last_used)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    method,
                    effectivenessScore,
                    1,
                    JSON.stringify([result]),
                    this.generateOptimizationNotes(result, userFeedback),
                    getJSTTimestamp(),
                    getJSTTimestamp()
                ]);
                
                log('新しいメソッド効果測定を記録しました: ' + method);
            }
            
            await db.close();
            
            return {
                method: method,
                tracked: true,
                timestamp: getJSTTimestamp()
            };
            
        } catch (error) {
            log('メソッド効果測定エラー: ' + error.message);
            return {
                method: method,
                tracked: false,
                error: error.message
            };
        }
    }

    // 設計書準拠：効果スコア計算
    calculateEffectivenessScore(result, userFeedback = null, existing = null) {
        let baseScore = 50; // 基本スコア
        
        // 結果の成功度に基づく調整
        if (result && result.success) {
            baseScore += 30;
        }
        
        if (result && result.confidence) {
            baseScore += (result.confidence * 20);
        }
        
        // ユーザーフィードバックに基づく調整
        if (userFeedback) {
            if (userFeedback.satisfaction > 0.8) {
                baseScore += 20;
            } else if (userFeedback.satisfaction > 0.6) {
                baseScore += 10;
            } else if (userFeedback.satisfaction < 0.4) {
                baseScore -= 20;
            }
        }
        
        // 既存スコアとの平均化
        if (existing && existing.effectiveness_score) {
            baseScore = (baseScore + existing.effectiveness_score) / 2;
        }
        
        return Math.min(Math.max(Math.round(baseScore), 0), 100);
    }

    // 設計書準拠：最適化ノート生成
    generateOptimizationNotes(result, userFeedback) {
        const notes = [];
        
        if (result && result.executionTime) {
            notes.push('実行時間: ' + result.executionTime + 'ms');
        }
        
        if (result && result.accuracy) {
            notes.push('精度: ' + (result.accuracy * 100).toFixed(1) + '%');
        }
        
        if (userFeedback && userFeedback.improvements) {
            notes.push('改善提案: ' + userFeedback.improvements);
        }
        
        return notes.join('; ');
    }

    // 設計書準拠：改善トレンド分析
    async analyzeImprovementTrends(days = 30) {
        log('改善トレンド分析を開始: ' + days + '日間');
        
        try {
            const db = await this.getDbConnection();
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffString = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
            
            // 期間内のメソッド効果データを取得
            const methods = await db.all(`
                SELECT method_name, effectiveness_score, usage_count, last_used
                FROM method_effectiveness 
                WHERE last_used >= ?
                ORDER BY effectiveness_score DESC
            `, [cutoffString]);
            
            // トレンド分析
            const trends = {
                totalMethods: methods.length,
                improvingMethods: 0,
                decliningMethods: 0,
                stableMethods: 0,
                averageEffectiveness: 0,
                topPerformingMethods: [],
                underperformingMethods: []
            };
            
            if (methods.length > 0) {
                const totalScore = methods.reduce((sum, method) => sum + method.effectiveness_score, 0);
                trends.averageEffectiveness = Math.round(totalScore / methods.length);
                
                // 上位・下位メソッドの特定
                trends.topPerformingMethods = methods.filter(m => m.effectiveness_score >= 80).slice(0, 5);
                trends.underperformingMethods = methods.filter(m => m.effectiveness_score < 50).slice(0, 5);
                
                // 改善・低下・安定の分類（仮の計算）
                trends.improvingMethods = methods.filter(m => m.effectiveness_score > trends.averageEffectiveness).length;
                trends.decliningMethods = methods.filter(m => m.effectiveness_score < 40).length;
                trends.stableMethods = methods.length - trends.improvingMethods - trends.decliningMethods;
            }
            
            await db.close();
            
            log('改善トレンド分析完了');
            log('総メソッド数: ' + trends.totalMethods);
            log('平均効果スコア: ' + trends.averageEffectiveness);
            
            return trends;
            
        } catch (error) {
            log('改善トレンド分析エラー: ' + error.message);
            return {
                totalMethods: 0,
                error: error.message
            };
        }
    }

    // 設計書準拠：メソッド推奨生成
    async generateMethodRecommendations(fileType) {
        log('メソッド推奨を生成中: ' + fileType);
        
        try {
            const db = await this.getDbConnection();
            
            // ファイルタイプに関連する効果的なメソッドを取得
            const methods = await db.all(`
                SELECT method_name, effectiveness_score, usage_count, success_contexts
                FROM method_effectiveness 
                WHERE success_contexts LIKE ?
                ORDER BY effectiveness_score DESC, usage_count DESC
                LIMIT 10
            `, ['%' + fileType + '%']);
            
            const recommendations = methods.map(method => {
                let reason = '';
                if (method.effectiveness_score >= 80) {
                    reason = '高い効果スコア（' + method.effectiveness_score + '%）';
                } else if (method.usage_count > 10) {
                    reason = '豊富な使用実績（' + method.usage_count + '回）';
                } else {
                    reason = '中程度の効果（' + method.effectiveness_score + '%）';
                }
                
                return {
                    method: method.method_name,
                    effectivenessScore: method.effectiveness_score,
                    usageCount: method.usage_count,
                    reason: reason,
                    recommendation: method.effectiveness_score >= 70 ? 'recommended' : 'optional'
                };
            });
            
            await db.close();
            
            log('メソッド推奨生成完了: ' + recommendations.length + '件');
            
            return {
                fileType: fileType,
                recommendations: recommendations,
                timestamp: getJSTTimestamp()
            };
            
        } catch (error) {
            log('メソッド推奨生成エラー: ' + error.message);
            return {
                fileType: fileType,
                recommendations: [],
                error: error.message
            };
        }
    }

    // 設計書準拠：上位メソッド取得
    async getTopMethods(db, days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
        
        return await db.all(`
            SELECT method_name, effectiveness_score, usage_count
            FROM method_effectiveness 
            WHERE last_used >= ?
            ORDER BY effectiveness_score DESC, usage_count DESC
            LIMIT 10
        `, [cutoffString]);
    }

    // 設計書準拠：効果測定データの取得
    async getEffectivenessData(methodName = null) {
        try {
            const db = await this.getDbConnection();
            
            let query = 'SELECT * FROM method_effectiveness';
            let params = [];
            
            if (methodName) {
                query += ' WHERE method_name = ?';
                params.push(methodName);
            }
            
            query += ' ORDER BY effectiveness_score DESC';
            
            const data = await db.all(query, params);
            await db.close();
            
            return data;
            
        } catch (error) {
            log('効果測定データ取得エラー: ' + error.message);
            return [];
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    EffectivenessTrackerCore
};