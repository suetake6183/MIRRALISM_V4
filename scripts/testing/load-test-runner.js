const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：負荷テスト実行クラス
class LoadTestRunner {
    constructor() {
        this.testResults = [];
        this.errorLog = [];
    }

    // 設計書準拠：並列ファイル読み込みテスト
    async testConcurrentFileReading(concurrency = 10, iterations = 100) {
        log('並列ファイル読み込みテストを開始');
        log('並列数: ' + concurrency + ', 反復回数: ' + iterations);
        
        const inputDir = path.join(__dirname, '..', '..', 'input');
        const testFile = path.join(inputDir, 'comprehensive_test_data.txt');
        
        const startTime = performance.now();
        const promises = [];
        
        for (let i = 0; i < iterations; i++) {
            const batch = [];
            for (let j = 0; j < concurrency; j++) {
                batch.push(this.readFileWithTiming(testFile, i * concurrency + j));
            }
            promises.push(Promise.all(batch));
        }
        
        try {
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            const totalOperations = concurrency * iterations;
            const totalTime = endTime - startTime;
            const avgTime = totalTime / totalOperations;
            
            const testResult = {
                test: 'concurrent_file_reading',
                concurrency: concurrency,
                iterations: iterations,
                totalOperations: totalOperations,
                totalTime: Math.round(totalTime),
                avgTime: Math.round(avgTime * 100) / 100,
                throughput: Math.round((totalOperations / totalTime) * 1000),
                errors: this.errorLog.length,
                timestamp: getJSTTimestamp()
            };
            
            this.testResults.push(testResult);
            
            log('ファイル読み込みテスト完了');
            log('総操作数: ' + totalOperations);
            log('総時間: ' + Math.round(totalTime) + 'ms');
            log('平均時間: ' + testResult.avgTime + 'ms');
            log('スループット: ' + testResult.throughput + ' ops/sec');
            
            return testResult;
            
        } catch (error) {
            log('ファイル読み込みテストエラー: ' + error.message);
            this.errorLog.push({
                test: 'concurrent_file_reading',
                error: error.message,
                timestamp: getJSTTimestamp()
            });
            return null;
        }
    }

    // 設計書準拠：データベース負荷テスト
    async testDatabaseLoad(operations = 1000) {
        log('データベース負荷テストを開始');
        log('操作数: ' + operations);
        
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        const dbPath = path.join(__dirname, '..', '..', 'database', 'learning.db');
        
        const startTime = performance.now();
        const promises = [];
        
        try {
            const db = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });
            
            // 並列クエリ実行
            for (let i = 0; i < operations; i++) {
                promises.push(this.executeQueryWithTiming(db, i));
            }
            
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            await db.close();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / operations;
            const successCount = results.filter(r => r.success).length;
            
            const testResult = {
                test: 'database_load',
                operations: operations,
                totalTime: Math.round(totalTime),
                avgTime: Math.round(avgTime * 100) / 100,
                throughput: Math.round((operations / totalTime) * 1000),
                successRate: Math.round((successCount / operations) * 100),
                errors: operations - successCount,
                timestamp: getJSTTimestamp()
            };
            
            this.testResults.push(testResult);
            
            log('データベーステスト完了');
            log('成功率: ' + testResult.successRate + '%');
            log('スループット: ' + testResult.throughput + ' queries/sec');
            
            return testResult;
            
        } catch (error) {
            log('データベーステストエラー: ' + error.message);
            this.errorLog.push({
                test: 'database_load',
                error: error.message,
                timestamp: getJSTTimestamp()
            });
            return null;
        }
    }

    // 設計書準拠：メモリ使用量ストレステスト
    async testMemoryStress(dataSize = 1000, iterations = 100) {
        log('メモリストレステストを開始');
        log('データサイズ: ' + dataSize + ', 反復回数: ' + iterations);
        
        const initialMemory = process.memoryUsage();
        const startTime = performance.now();
        
        const memorySnapshots = [];
        
        try {
            for (let i = 0; i < iterations; i++) {
                // 大きなデータ構造を作成
                const largeData = Array(dataSize).fill().map((_, index) => ({
                    id: i * dataSize + index,
                    data: 'test data '.repeat(100),
                    timestamp: Date.now(),
                    metadata: {
                        iteration: i,
                        index: index,
                        processed: false
                    }
                }));
                
                // データ処理のシミュレーション
                largeData.forEach(item => {
                    item.metadata.processed = true;
                    item.processedAt = Date.now();
                });
                
                // メモリ使用量記録
                if (i % 10 === 0) {
                    const currentMemory = process.memoryUsage();
                    memorySnapshots.push({
                        iteration: i,
                        heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024 * 100) / 100,
                        heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024 * 100) / 100,
                        rss: Math.round(currentMemory.rss / 1024 / 1024 * 100) / 100
                    });
                }
                
                // ガベージコレクションを促進
                if (i % 50 === 0 && global.gc) {
                    global.gc();
                }
            }
            
            const endTime = performance.now();
            const finalMemory = process.memoryUsage();
            
            const testResult = {
                test: 'memory_stress',
                dataSize: dataSize,
                iterations: iterations,
                totalTime: Math.round(endTime - startTime),
                initialMemory: {
                    heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024 * 100) / 100,
                    rss: Math.round(initialMemory.rss / 1024 / 1024 * 100) / 100
                },
                finalMemory: {
                    heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024 * 100) / 100,
                    rss: Math.round(finalMemory.rss / 1024 / 1024 * 100) / 100
                },
                memoryGrowth: {
                    heap: Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024 * 100) / 100,
                    rss: Math.round((finalMemory.rss - initialMemory.rss) / 1024 / 1024 * 100) / 100
                },
                peakMemory: Math.max(...memorySnapshots.map(s => s.heapUsed)),
                snapshots: memorySnapshots,
                timestamp: getJSTTimestamp()
            };
            
            this.testResults.push(testResult);
            
            log('メモリテスト完了');
            log('メモリ増加量: ヒープ ' + testResult.memoryGrowth.heap + 'MB, RSS ' + testResult.memoryGrowth.rss + 'MB');
            log('ピークメモリ: ' + testResult.peakMemory + 'MB');
            
            return testResult;
            
        } catch (error) {
            log('メモリテストエラー: ' + error.message);
            this.errorLog.push({
                test: 'memory_stress',
                error: error.message,
                timestamp: getJSTTimestamp()
            });
            return null;
        }
    }

    // 設計書準拠：システム統合ストレステスト
    async testSystemIntegration(cycles = 50) {
        log('システム統合ストレステストを開始');
        log('サイクル数: ' + cycles);
        
        const { EnhancedSearchSystem } = require('../search/enhanced-search');
const { PerformanceOptimizer } = require('../performance/performance-optimizer');
        
        const startTime = performance.now();
        const results = [];
        
        try {
            const searchSystem = new EnhancedSearchSystem();
            const optimizer = new PerformanceOptimizer();
            
            for (let i = 0; i < cycles; i++) {
                const cycleStart = performance.now();
                
                // 1. インデックス構築
                await searchSystem.buildSearchIndex();
                
                // 2. 検索実行
                const searchResult = await searchSystem.hybridSearch('分析', {
                    category: 'meeting',
                    resultLimit: 10
                });
                
                // 3. メモリ分析
                const memAnalysis = await optimizer.analyzeMemoryUsage();
                
                const cycleTime = performance.now() - cycleStart;
                
                results.push({
                    cycle: i + 1,
                    time: Math.round(cycleTime),
                    searchResults: searchResult.totalResults,
                    memoryUsed: memAnalysis.usage.heapUsed,
                    success: true
                });
                
                if (i % 10 === 0) {
                    log('サイクル ' + (i + 1) + '/' + cycles + ' 完了');
                }
            }
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const avgCycleTime = totalTime / cycles;
            
            const testResult = {
                test: 'system_integration',
                cycles: cycles,
                totalTime: Math.round(totalTime),
                avgCycleTime: Math.round(avgCycleTime * 100) / 100,
                successRate: 100, // すべて成功と仮定
                avgSearchResults: Math.round(results.reduce((sum, r) => sum + r.searchResults, 0) / cycles),
                avgMemoryUsed: Math.round(results.reduce((sum, r) => sum + r.memoryUsed, 0) / cycles * 100) / 100,
                results: results,
                timestamp: getJSTTimestamp()
            };
            
            this.testResults.push(testResult);
            
            log('統合テスト完了');
            log('平均サイクル時間: ' + testResult.avgCycleTime + 'ms');
            log('平均検索結果数: ' + testResult.avgSearchResults + '件');
            log('平均メモリ使用量: ' + testResult.avgMemoryUsed + 'MB');
            
            return testResult;
            
        } catch (error) {
            log('統合テストエラー: ' + error.message);
            this.errorLog.push({
                test: 'system_integration',
                error: error.message,
                timestamp: getJSTTimestamp()
            });
            return null;
        }
    }

    // 設計書準拠：ヘルパーメソッド
    async readFileWithTiming(filePath, id) {
        const start = performance.now();
        try {
            await fs.readFile(filePath, 'utf8');
            return {
                id: id,
                time: performance.now() - start,
                success: true
            };
        } catch (error) {
            this.errorLog.push({
                operation: 'file_read',
                id: id,
                error: error.message,
                timestamp: getJSTTimestamp()
            });
            return {
                id: id,
                time: performance.now() - start,
                success: false
            };
        }
    }

    async executeQueryWithTiming(db, id) {
        const start = performance.now();
        try {
            await db.get('SELECT COUNT(*) as count FROM learning_patterns WHERE id > ?', [id % 10]);
            return {
                id: id,
                time: performance.now() - start,
                success: true
            };
        } catch (error) {
            this.errorLog.push({
                operation: 'db_query',
                id: id,
                error: error.message,
                timestamp: getJSTTimestamp()
            });
            return {
                id: id,
                time: performance.now() - start,
                success: false
            };
        }
    }

    // 設計書準拠：テスト結果とエラーログのアクセサ
    getTestResults() {
        return this.testResults;
    }

    getErrorLog() {
        return this.errorLog;
    }

    clearResults() {
        this.testResults = [];
        this.errorLog = [];
    }
}

// 設計書準拠：エクスポート
module.exports = {
    LoadTestRunner
};