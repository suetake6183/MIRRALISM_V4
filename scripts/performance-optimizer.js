const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// 設計書準拠：シンプルな日本語ログのみ
function log(message) {
    console.log(message);
}

// 設計書準拠：JST時刻取得
function getJSTTimestamp() {
    const now = new Date();
    const jstOffset = 9 * 60;
    const jst = new Date(now.getTime() + (jstOffset * 60 * 1000));
    return jst.toISOString().replace('T', ' ').substring(0, 19);
}

// 設計書準拠：パフォーマンス最適化クラス
class PerformanceOptimizer {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'database', 'learning.db');
        this.optimizationLog = [];
    }

    // 設計書準拠：データベースインデックス最適化
    async optimizeDatabaseIndexes() {
        log('データベースインデックス最適化を開始');
        
        try {
            const db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // 既存のインデックスを確認
            const existingIndexes = await db.all(`
                SELECT name FROM sqlite_master 
                WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
            `);
            
            log('既存インデックス数: ' + existingIndexes.length);

            // 学習パターンテーブルのインデックス作成
            const indexOperations = [
                {
                    name: 'idx_learning_patterns_context',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_learning_patterns_context ON learning_patterns(context)',
                    table: 'learning_patterns'
                },
                {
                    name: 'idx_learning_patterns_created_at',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_learning_patterns_created_at ON learning_patterns(created_at)',
                    table: 'learning_patterns'
                },
                {
                    name: 'idx_learning_patterns_success_count',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_learning_patterns_success_count ON learning_patterns(success_count DESC)',
                    table: 'learning_patterns'
                },
                {
                    name: 'idx_file_type_learning_judgment',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_file_type_learning_judgment ON file_type_learning(llm_judgment)',
                    table: 'file_type_learning'
                },
                {
                    name: 'idx_file_type_learning_created_at',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_file_type_learning_created_at ON file_type_learning(created_at)',
                    table: 'file_type_learning'
                },
                {
                    name: 'idx_analysis_method_file_type',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_analysis_method_file_type ON analysis_method_effectiveness(file_type)',
                    table: 'analysis_method_effectiveness'
                },
                {
                    name: 'idx_analysis_method_score',
                    sql: 'CREATE INDEX IF NOT EXISTS idx_analysis_method_score ON analysis_method_effectiveness(user_satisfaction_score DESC)',
                    table: 'analysis_method_effectiveness'
                }
            ];

            // インデックス作成実行
            for (const indexOp of indexOperations) {
                try {
                    await db.run(indexOp.sql);
                    this.optimizationLog.push({
                        type: 'index_created',
                        name: indexOp.name,
                        table: indexOp.table,
                        timestamp: getJSTTimestamp()
                    });
                    log('インデックス作成: ' + indexOp.name);
                } catch (error) {
                    log('インデックス作成エラー: ' + indexOp.name + ' - ' + error.message);
                }
            }

            // データベース統計更新
            await db.run('ANALYZE');
            log('データベース統計を更新しました');

            // VACUUM実行（データベース最適化）
            await db.run('VACUUM');
            log('データベースを最適化しました（VACUUM）');

            await db.close();
            
            return {
                success: true,
                indexesCreated: indexOperations.length,
                timestamp: getJSTTimestamp()
            };

        } catch (error) {
            log('データベース最適化エラー: ' + error.message);
            return {
                success: false,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：非同期処理最適化
    async optimizeAsyncOperations() {
        log('非同期処理最適化を開始');
        
        // Promise.allを使用した並列処理の実装例
        const optimizations = {
            batchFileReading: true,
            parallelDatabaseQueries: true,
            streamProcessing: true,
            recommendations: []
        };

        // ファイル読み込み最適化の推奨事項
        optimizations.recommendations.push({
            area: 'ファイル読み込み',
            suggestion: 'Promise.allを使用して複数ファイルを並列読み込み',
            impact: 'high'
        });

        // データベースクエリ最適化
        optimizations.recommendations.push({
            area: 'データベースクエリ',
            suggestion: 'バッチクエリとトランザクションの活用',
            impact: 'medium'
        });

        // メモリ使用量最適化
        optimizations.recommendations.push({
            area: 'メモリ管理',
            suggestion: 'ストリーム処理による大容量ファイル対応',
            impact: 'high'
        });

        this.optimizationLog.push({
            type: 'async_optimization',
            recommendations: optimizations.recommendations,
            timestamp: getJSTTimestamp()
        });

        return optimizations;
    }

    // 設計書準拠：メモリ使用量分析
    async analyzeMemoryUsage() {
        log('メモリ使用量分析を開始');
        
        const memUsage = process.memoryUsage();
        const analysis = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
            rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
            external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
            timestamp: getJSTTimestamp()
        };

        log('ヒープ使用量: ' + analysis.heapUsed + ' MB / ' + analysis.heapTotal + ' MB');
        log('RSS: ' + analysis.rss + ' MB');

        // メモリ使用量の推奨事項
        const recommendations = [];
        
        if (analysis.heapUsed > analysis.heapTotal * 0.8) {
            recommendations.push({
                severity: 'high',
                message: 'ヒープメモリ使用率が高いです。ガベージコレクションの実行を推奨します。'
            });
        }

        if (analysis.rss > 500) {
            recommendations.push({
                severity: 'medium',
                message: 'プロセスメモリが500MBを超えています。大容量データの処理にはストリームを使用してください。'
            });
        }

        this.optimizationLog.push({
            type: 'memory_analysis',
            usage: analysis,
            recommendations: recommendations,
            timestamp: getJSTTimestamp()
        });

        return {
            usage: analysis,
            recommendations: recommendations
        };
    }

    // 設計書準拠：コード最適化の提案
    async generateOptimizationReport() {
        log('最適化レポートを生成中...');
        
        // 現在のコードベース分析
        const scriptsDir = path.join(__dirname);
        const files = await fs.readdir(scriptsDir);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        const codeOptimizations = [];

        // 各ファイルの最適化ポイントを分析
        for (const file of jsFiles) {
            const filePath = path.join(scriptsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            // 最適化可能なパターンの検出
            const optimizationPoints = [];
            
            // 同期的ファイル読み込みの検出
            if (content.includes('readFileSync')) {
                optimizationPoints.push({
                    type: 'sync_io',
                    message: '同期的ファイル読み込みを非同期に変更'
                });
            }
            
            // Promise.allの活用機会
            if (content.includes('await') && content.includes('for') && !content.includes('Promise.all')) {
                optimizationPoints.push({
                    type: 'parallel_processing',
                    message: 'Promise.allによる並列処理の検討'
                });
            }
            
            // 大きな配列操作
            if (content.includes('.map(') && content.includes('.filter(')) {
                optimizationPoints.push({
                    type: 'array_optimization',
                    message: '配列操作の最適化（reduce使用など）'
                });
            }
            
            if (optimizationPoints.length > 0) {
                codeOptimizations.push({
                    file: file,
                    optimizations: optimizationPoints
                });
            }
        }

        const report = {
            timestamp: getJSTTimestamp(),
            filesAnalyzed: jsFiles.length,
            optimizationOpportunities: codeOptimizations,
            summary: {
                totalFiles: jsFiles.length,
                filesWithOptimizations: codeOptimizations.length,
                totalOptimizations: codeOptimizations.reduce((sum, file) => sum + file.optimizations.length, 0)
            }
        };

        // レポートをファイルに出力
        const outputPath = path.join(__dirname, '..', 'output', 'optimization-report.json');
        await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
        
        log('最適化レポートを出力しました: ' + outputPath);
        
        return report;
    }

    // 設計書準拠：パフォーマンスベンチマーク
    async runPerformanceBenchmark() {
        log('パフォーマンスベンチマークを開始');
        
        const benchmarks = [];
        
        // 1. ファイル読み込み速度
        const fileReadStart = Date.now();
        const testFile = path.join(__dirname, '..', 'input', 'comprehensive_test_data.txt');
        try {
            await fs.readFile(testFile, 'utf8');
            const fileReadTime = Date.now() - fileReadStart;
            benchmarks.push({
                test: 'ファイル読み込み',
                time: fileReadTime,
                unit: 'ms'
            });
        } catch (error) {
            log('ファイル読み込みテストスキップ: ' + error.message);
        }
        
        // 2. データベースクエリ速度
        const dbQueryStart = Date.now();
        try {
            const db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });
            
            await db.all('SELECT COUNT(*) FROM learning_patterns');
            const dbQueryTime = Date.now() - dbQueryStart;
            benchmarks.push({
                test: 'データベースクエリ',
                time: dbQueryTime,
                unit: 'ms'
            });
            
            await db.close();
        } catch (error) {
            log('データベーステストスキップ: ' + error.message);
        }
        
        // 3. JSON処理速度
        const jsonStart = Date.now();
        const testData = { patterns: Array(1000).fill({ id: 1, data: 'test' }) };
        JSON.stringify(testData);
        JSON.parse(JSON.stringify(testData));
        const jsonTime = Date.now() - jsonStart;
        benchmarks.push({
            test: 'JSON処理（1000要素）',
            time: jsonTime,
            unit: 'ms'
        });
        
        // 結果の表示
        log('\nベンチマーク結果:');
        benchmarks.forEach(bench => {
            log(bench.test + ': ' + bench.time + ' ' + bench.unit);
        });
        
        return {
            benchmarks: benchmarks,
            timestamp: getJSTTimestamp(),
            totalTime: benchmarks.reduce((sum, b) => sum + b.time, 0)
        };
    }

    // 設計書準拠：最適化ログ取得
    getOptimizationLog() {
        return {
            log: this.optimizationLog,
            timestamp: getJSTTimestamp()
        };
    }
}

// 設計書準拠：エクスポート
module.exports = {
    PerformanceOptimizer
};

// 設計書準拠：直接実行
if (require.main === module) {
    const optimizer = new PerformanceOptimizer();
    
    async function runOptimization() {
        log('MIRRALISM V4 パフォーマンス最適化');
        log('設計書準拠版（APIなし・対話型実行）');
        log('');
        
        // 1. データベースインデックス最適化
        await optimizer.optimizeDatabaseIndexes();
        
        // 2. 非同期処理最適化
        const asyncOpt = await optimizer.optimizeAsyncOperations();
        log('\n非同期処理最適化の推奨事項:');
        asyncOpt.recommendations.forEach(rec => {
            log('- ' + rec.area + ': ' + rec.suggestion);
        });
        
        // 3. メモリ使用量分析
        const memAnalysis = await optimizer.analyzeMemoryUsage();
        
        // 4. 最適化レポート生成
        const report = await optimizer.generateOptimizationReport();
        log('\n最適化機会: ' + report.summary.totalOptimizations + '件');
        
        // 5. パフォーマンスベンチマーク
        await optimizer.runPerformanceBenchmark();
        
        log('\n最適化完了');
    }
    
    runOptimization();
}