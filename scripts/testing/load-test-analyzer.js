const fs = require('fs').promises;
const path = require('path');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：負荷テスト結果分析クラス
class LoadTestAnalyzer {
    constructor() {
        // 分析結果格納用
        this.analysisResults = [];
    }

    // 設計書準拠：負荷テストレポート生成
    async generateLoadTestReport(testResults, errorLog = []) {
        log('負荷テストレポートを生成中...');
        
        const report = {
            timestamp: getJSTTimestamp(),
            testResults: testResults,
            errorLog: errorLog,
            summary: {
                totalTests: testResults.length,
                totalErrors: errorLog.length,
                overallPerformance: this.calculateOverallPerformance(testResults)
            }
        };
        
        // レポートをファイルに出力
        const outputPath = path.join(__dirname, '..', '..', 'output', 'load-test-report.json');
        await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
        
        log('負荷テストレポートを出力しました: ' + outputPath);
        
        return report;
    }

    // 設計書準拠：総合パフォーマンス評価
    calculateOverallPerformance(testResults) {
        if (testResults.length === 0) {
            return { grade: 'N/A', score: 0, details: 'テスト結果なし' };
        }
        
        let totalScore = 0;
        let scoreCount = 0;
        
        testResults.forEach(result => {
            if (result.throughput) {
                // スループットベースのスコア（高いほど良い）
                const throughputScore = Math.min(result.throughput / 1000, 100);
                totalScore += throughputScore;
                scoreCount++;
            }
            
            if (result.successRate !== undefined) {
                totalScore += result.successRate;
                scoreCount++;
            }
        });
        
        const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
        
        let grade;
        if (avgScore >= 90) grade = 'A';
        else if (avgScore >= 80) grade = 'B';
        else if (avgScore >= 70) grade = 'C';
        else if (avgScore >= 60) grade = 'D';
        else grade = 'F';
        
        return {
            grade: grade,
            score: Math.round(avgScore),
            details: '平均パフォーマンススコア'
        };
    }

    // 設計書準拠：テスト結果の詳細分析
    analyzeTestResults(testResults) {
        const analysis = {
            performanceMetrics: {},
            trends: {},
            recommendations: [],
            timestamp: getJSTTimestamp()
        };

        // パフォーマンス指標の集計
        analysis.performanceMetrics = this.calculatePerformanceMetrics(testResults);
        
        // トレンド分析
        analysis.trends = this.analyzeTrends(testResults);
        
        // 改善提案の生成
        analysis.recommendations = this.generateRecommendations(testResults);

        this.analysisResults.push(analysis);
        
        return analysis;
    }

    // 設計書準拠：パフォーマンス指標計算
    calculatePerformanceMetrics(testResults) {
        const metrics = {
            throughput: {
                max: 0,
                min: Infinity,
                avg: 0,
                total: 0
            },
            responseTime: {
                max: 0,
                min: Infinity,
                avg: 0
            },
            errorRate: {
                total: 0,
                percentage: 0
            },
            memoryUsage: {
                peak: 0,
                growth: 0,
                efficiency: 0
            }
        };

        let throughputSum = 0;
        let throughputCount = 0;
        let responseTimeSum = 0;
        let responseTimeCount = 0;
        let totalErrors = 0;
        let totalOperations = 0;

        testResults.forEach(result => {
            if (result.throughput) {
                metrics.throughput.max = Math.max(metrics.throughput.max, result.throughput);
                metrics.throughput.min = Math.min(metrics.throughput.min, result.throughput);
                throughputSum += result.throughput;
                throughputCount++;
            }

            if (result.avgTime) {
                metrics.responseTime.max = Math.max(metrics.responseTime.max, result.avgTime);
                metrics.responseTime.min = Math.min(metrics.responseTime.min, result.avgTime);
                responseTimeSum += result.avgTime;
                responseTimeCount++;
            }

            if (result.errors !== undefined) {
                totalErrors += result.errors;
            }

            if (result.totalOperations) {
                totalOperations += result.totalOperations;
            } else if (result.operations) {
                totalOperations += result.operations;
            }

            if (result.peakMemory) {
                metrics.memoryUsage.peak = Math.max(metrics.memoryUsage.peak, result.peakMemory);
            }

            if (result.memoryGrowth && result.memoryGrowth.heap) {
                metrics.memoryUsage.growth += result.memoryGrowth.heap;
            }
        });

        // 平均値の計算
        metrics.throughput.avg = throughputCount > 0 ? Math.round(throughputSum / throughputCount) : 0;
        metrics.responseTime.avg = responseTimeCount > 0 ? Math.round(responseTimeSum / responseTimeCount * 100) / 100 : 0;
        metrics.errorRate.total = totalErrors;
        metrics.errorRate.percentage = totalOperations > 0 ? Math.round((totalErrors / totalOperations) * 100 * 100) / 100 : 0;
        
        // メモリ効率の計算
        metrics.memoryUsage.efficiency = metrics.memoryUsage.growth > 0 ? 
            Math.round((totalOperations / metrics.memoryUsage.growth) * 100) / 100 : 0;

        // Infinityの処理
        if (metrics.throughput.min === Infinity) metrics.throughput.min = 0;
        if (metrics.responseTime.min === Infinity) metrics.responseTime.min = 0;

        return metrics;
    }

    // 設計書準拠：トレンド分析
    analyzeTrends(testResults) {
        const trends = {
            performanceStability: 'stable',
            memoryLeakDetection: 'none',
            scalabilityAssessment: 'good',
            details: {}
        };

        // パフォーマンスの安定性チェック
        const throughputs = testResults.filter(r => r.throughput).map(r => r.throughput);
        if (throughputs.length > 1) {
            const variance = this.calculateVariance(throughputs);
            const mean = throughputs.reduce((sum, val) => sum + val, 0) / throughputs.length;
            const coefficientOfVariation = Math.sqrt(variance) / mean;
            
            if (coefficientOfVariation > 0.3) {
                trends.performanceStability = 'unstable';
            } else if (coefficientOfVariation > 0.15) {
                trends.performanceStability = 'moderate';
            }
        }

        // メモリリーク検出
        const memoryGrowths = testResults.filter(r => r.memoryGrowth && r.memoryGrowth.heap)
                                        .map(r => r.memoryGrowth.heap);
        if (memoryGrowths.length > 0) {
            const avgGrowth = memoryGrowths.reduce((sum, val) => sum + val, 0) / memoryGrowths.length;
            if (avgGrowth > 10) {
                trends.memoryLeakDetection = 'potential';
            } else if (avgGrowth > 50) {
                trends.memoryLeakDetection = 'detected';
            }
        }

        trends.details = {
            throughputVariance: throughputs.length > 1 ? this.calculateVariance(throughputs) : 0,
            avgMemoryGrowth: memoryGrowths.length > 0 ? 
                Math.round(memoryGrowths.reduce((sum, val) => sum + val, 0) / memoryGrowths.length * 100) / 100 : 0
        };

        return trends;
    }

    // 設計書準拠：改善提案生成
    generateRecommendations(testResults) {
        const recommendations = [];

        const metrics = this.calculatePerformanceMetrics(testResults);

        // スループット改善提案
        if (metrics.throughput.avg < 1000) {
            recommendations.push({
                category: 'performance',
                priority: 'high',
                title: 'スループット改善',
                description: '平均スループットが低下しています。並列処理の最適化を検討してください。',
                target: 'throughput',
                currentValue: metrics.throughput.avg,
                targetValue: 1000
            });
        }

        // レスポンス時間改善提案
        if (metrics.responseTime.avg > 100) {
            recommendations.push({
                category: 'performance',
                priority: 'medium',
                title: 'レスポンス時間最適化',
                description: '平均レスポンス時間が長すぎます。処理の最適化を行ってください。',
                target: 'responseTime',
                currentValue: metrics.responseTime.avg,
                targetValue: 50
            });
        }

        // エラー率改善提案
        if (metrics.errorRate.percentage > 5) {
            recommendations.push({
                category: 'reliability',
                priority: 'high',
                title: 'エラー率削減',
                description: 'エラー率が高すぎます。エラーハンドリングの強化が必要です。',
                target: 'errorRate',
                currentValue: metrics.errorRate.percentage,
                targetValue: 1
            });
        }

        // メモリ使用量改善提案
        if (metrics.memoryUsage.growth > 20) {
            recommendations.push({
                category: 'memory',
                priority: 'medium',
                title: 'メモリ効率改善',
                description: 'メモリ使用量の増加が大きすぎます。メモリリークの調査を行ってください。',
                target: 'memoryGrowth',
                currentValue: metrics.memoryUsage.growth,
                targetValue: 10
            });
        }

        return recommendations;
    }

    // 設計書準拠：統計計算ヘルパー
    calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // 設計書準拠：分析結果の保存
    async saveAnalysisResults(outputDir = 'output') {
        try {
            const outputPath = path.join(__dirname, '..', '..', outputDir, 'load-test-analysis.json');
            await fs.writeFile(outputPath, JSON.stringify(this.analysisResults, null, 2), 'utf8');
            log('負荷テスト分析結果を保存しました: ' + outputPath);
            return outputPath;
        } catch (error) {
            log('分析結果保存エラー: ' + error.message);
            return null;
        }
    }

    // 設計書準拠：分析結果のアクセサ
    getAnalysisResults() {
        return this.analysisResults;
    }

    clearAnalysisResults() {
        this.analysisResults = [];
    }
}

// 設計書準拠：エクスポート
module.exports = {
    LoadTestAnalyzer
};