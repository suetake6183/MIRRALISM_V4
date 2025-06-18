const { log } = require('./shared/logger');
const { LoadTestRunner } = require('./testing/load-test-runner');
const { LoadTestAnalyzer } = require('./testing/load-test-analyzer');

// 設計書準拠：負荷テストクラス（分割構造対応）
class LoadTester {
    constructor() {
        this.runner = new LoadTestRunner();
        this.analyzer = new LoadTestAnalyzer();
    }

    // 設計書準拠：並列ファイル読み込みテスト（委譲）
    async testConcurrentFileReading(concurrency = 10, iterations = 100) {
        return await this.runner.testConcurrentFileReading(concurrency, iterations);
    }

    // 設計書準拠：データベース負荷テスト（委譲）
    async testDatabaseLoad(operations = 1000) {
        return await this.runner.testDatabaseLoad(operations);
    }

    // 設計書準拠：メモリ使用量ストレステスト（委譲）
    async testMemoryStress(dataSize = 1000, iterations = 100) {
        return await this.runner.testMemoryStress(dataSize, iterations);
    }

    // 設計書準拠：システム統合ストレステスト（委譲）
    async testSystemIntegration(cycles = 50) {
        return await this.runner.testSystemIntegration(cycles);
    }

    // 設計書準拠：負荷テストレポート生成（委譲）
    async generateLoadTestReport() {
        const testResults = this.runner.getTestResults();
        const errorLog = this.runner.getErrorLog();
        return await this.analyzer.generateLoadTestReport(testResults, errorLog);
    }

    // 設計書準拠：総合パフォーマンス評価（委譲）
    calculateOverallPerformance() {
        const testResults = this.runner.getTestResults();
        return this.analyzer.calculateOverallPerformance(testResults);
    }

    // 設計書準拠：詳細分析（新機能）
    async analyzeTestResults() {
        const testResults = this.runner.getTestResults();
        return this.analyzer.analyzeTestResults(testResults);
    }

    // 設計書準拠：結果アクセサ
    getTestResults() {
        return this.runner.getTestResults();
    }

    getErrorLog() {
        return this.runner.getErrorLog();
    }

    getAnalysisResults() {
        return this.analyzer.getAnalysisResults();
    }

    // 設計書準拠：結果クリア
    clearResults() {
        this.runner.clearResults();
        this.analyzer.clearAnalysisResults();
    }

    // 設計書準拠：包括的負荷テスト実行
    async runComprehensiveLoadTest() {
        log('包括的負荷テストを開始...');
        
        try {
            // 1. 並列ファイル読み込みテスト
            await this.testConcurrentFileReading(5, 20);
            
            // 2. データベース負荷テスト
            await this.testDatabaseLoad(100);
            
            // 3. メモリストレステスト
            await this.testMemoryStress(100, 20);
            
            // 4. システム統合ストレステスト
            await this.testSystemIntegration(10);
            
            // 5. 結果分析
            const analysis = await this.analyzeTestResults();
            
            // 6. レポート生成
            const report = await this.generateLoadTestReport();
            
            log('包括的負荷テスト完了');
            log('総合評価: ' + report.summary.overallPerformance.grade + ' (' + report.summary.overallPerformance.score + '点)');
            
            return {
                report: report,
                analysis: analysis
            };
            
        } catch (error) {
            log('包括的負荷テストエラー: ' + error.message);
            return null;
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    LoadTester
};

// 設計書準拠：直接実行（既存コードとの互換性保持）
if (require.main === module) {
    const loadTester = new LoadTester();
    
    async function runLoadTests() {
        log('MIRRALISM V4 負荷テスト');
        log('設計書準拠版（分割構造対応）');
        log('');
        
        // 包括的負荷テストを実行
        const results = await loadTester.runComprehensiveLoadTest();
        
        if (results) {
            log('');
            log('=== 改善提案 ===');
            if (results.analysis.recommendations.length > 0) {
                results.analysis.recommendations.forEach((rec, index) => {
                    log((index + 1) + '. ' + rec.title + ': ' + rec.description);
                });
            } else {
                log('改善提案はありません。良好なパフォーマンスです。');
            }
        }
    }
    
    runLoadTests();
}