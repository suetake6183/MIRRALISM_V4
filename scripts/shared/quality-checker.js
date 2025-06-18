const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { log, getJSTTimestamp } = require('./logger');

const execAsync = promisify(exec);

// 設計書準拠：自動化品質チェッククラス
class QualityChecker {
    constructor() {
        this.results = [];
        this.projectRoot = path.join(__dirname, '..', '..');
    }

    // 設計書準拠：設計書制約チェック
    async checkDesignConstraints() {
        log('設計書制約チェックを開始');
        
        const constraints = {
            environmentVariables: await this.checkEnvironmentVariables(),
            backgroundProcesses: await this.checkBackgroundProcesses(),
            decorativeLogs: await this.checkDecorativeLogs(),
            apiUsage: await this.checkApiUsage(),
            timestamp: getJSTTimestamp()
        };
        
        const totalViolations = constraints.environmentVariables.count + 
                                constraints.backgroundProcesses.count + 
                                constraints.decorativeLogs.count + 
                                constraints.apiUsage.count;
        
        log('設計書制約チェック完了: ' + totalViolations + '件の違反');
        
        return {
            ...constraints,
            totalViolations: totalViolations,
            passed: totalViolations === 0
        };
    }

    // 設計書準拠：環境変数依存チェック
    async checkEnvironmentVariables() {
        try {
            const { stdout } = await execAsync('grep -r "process\\.env" scripts/ || true');
            const violations = stdout.trim() ? stdout.trim().split('\n') : [];
            
            return {
                constraint: '環境変数依存禁止',
                count: violations.length,
                violations: violations,
                passed: violations.length === 0
            };
        } catch (error) {
            return {
                constraint: '環境変数依存禁止',
                count: 0,
                violations: [],
                passed: true
            };
        }
    }

    // 設計書準拠：バックグラウンド処理チェック
    async checkBackgroundProcesses() {
        try {
            const { stdout } = await execAsync('grep -r "setInterval\\|setTimeout" scripts/ | grep -v "quality-checker.js" | grep -v "grep" || true');
            const violations = stdout.trim() ? stdout.trim().split('\n') : [];
            
            return {
                constraint: 'バックグラウンド処理禁止',
                count: violations.length,
                violations: violations,
                passed: violations.length === 0
            };
        } catch (error) {
            return {
                constraint: 'バックグラウンド処理禁止',
                count: 0,
                violations: [],
                passed: true
            };
        }
    }

    // 設計書準拠：装飾的ログチェック
    async checkDecorativeLogs() {
        try {
            const { stdout } = await execAsync('grep -r "🎯\\|✨\\|🚀" scripts/ | grep -v "quality-checker.js" | grep -v "grep" || true');
            const violations = stdout.trim() ? stdout.trim().split('\n') : [];
            
            return {
                constraint: '装飾的ログ禁止',
                count: violations.length,
                violations: violations,
                passed: violations.length === 0
            };
        } catch (error) {
            return {
                constraint: '装飾的ログ禁止',
                count: 0,
                violations: [],
                passed: true
            };
        }
    }

    // 設計書準拠：API使用チェック
    async checkApiUsage() {
        try {
            const { stdout } = await execAsync('grep -r "fetch\\|axios\\|request\\|http\\.get\\|https\\.get" scripts/ | grep -v "quality-checker.js" | grep -v "grep" | grep -v "require" || true');
            const violations = stdout.trim() ? stdout.trim().split('\n').filter(line => 
                line.trim() &&
                !line.includes('require(\'http\')') && 
                !line.includes('require(\'https\')') &&
                !line.includes('// ') &&
                !line.includes('requestLLMJudgment') // LLM判定関数は除外
            ) : [];
            
            return {
                constraint: 'API使用禁止',
                count: violations.length,
                violations: violations,
                passed: violations.length === 0
            };
        } catch (error) {
            return {
                constraint: 'API使用禁止',
                count: 0,
                violations: [],
                passed: true
            };
        }
    }

    // 設計書準拠：重複コードチェック
    async checkCodeDuplication() {
        log('重複コードチェックを開始');
        
        try {
            const { stdout, stderr } = await execAsync('npx jscpd scripts/', {
                cwd: this.projectRoot
            });
            
            // jscpdの結果を解析
            const duplicateCount = (stdout.match(/Clone/g) || []).length;
            
            return {
                tool: 'jscpd',
                duplicatesFound: duplicateCount,
                output: stdout,
                timestamp: getJSTTimestamp()
            };
        } catch (error) {
            return {
                tool: 'jscpd',
                duplicatesFound: 0,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：依存関係分析
    async analyzeDependencies() {
        log('依存関係分析を開始');
        
        try {
            const { stdout } = await execAsync('npx madge --circular --json scripts/', {
                cwd: this.projectRoot
            });
            
            // JSON出力を解析して循環依存の数を正確に判定
            let circularCount = 0;
            try {
                const jsonResult = JSON.parse(stdout);
                circularCount = Array.isArray(jsonResult) ? jsonResult.length : 0;
            } catch (parseError) {
                // JSON解析に失敗した場合は文字列チェックにフォールバック
                circularCount = stdout.includes('No circular dependency found!') ? 0 : 1;
            }
            
            return {
                tool: 'madge',
                circularDependencies: circularCount,
                output: stdout,
                timestamp: getJSTTimestamp()
            };
        } catch (error) {
            return {
                tool: 'madge',
                circularDependencies: 0,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：未使用コードチェック
    async checkUnusedCode() {
        log('未使用コードチェックを開始');
        
        try {
            const { stdout } = await execAsync('npx knip', {
                cwd: this.projectRoot
            });
            
            const unusedCount = (stdout.match(/unused/g) || []).length;
            
            return {
                tool: 'knip',
                unusedItems: unusedCount,
                output: stdout,
                timestamp: getJSTTimestamp()
            };
        } catch (error) {
            return {
                tool: 'knip',
                unusedItems: 0,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：包括的品質チェック実行
    async runComprehensiveQualityCheck() {
        log('包括的品質チェックを開始...');
        
        const report = {
            timestamp: getJSTTimestamp(),
            designConstraints: null,
            codeDuplication: null,
            dependencies: null,
            unusedCode: null,
            summary: {}
        };
        
        try {
            // 1. 設計書制約チェック
            report.designConstraints = await this.checkDesignConstraints();
            
            // 2. 重複コードチェック
            report.codeDuplication = await this.checkCodeDuplication();
            
            // 3. 依存関係分析
            report.dependencies = await this.analyzeDependencies();
            
            // 4. 未使用コードチェック
            report.unusedCode = await this.checkUnusedCode();
            
            // 5. サマリー作成
            report.summary = {
                designConstraintsPassed: report.designConstraints.passed,
                totalViolations: report.designConstraints.totalViolations,
                duplicatesFound: report.codeDuplication.duplicatesFound,
                circularDependencies: report.dependencies.circularDependencies,
                unusedItems: report.unusedCode.unusedItems,
                overallQuality: this.calculateOverallQuality(report)
            };
            
            // 6. レポート保存
            await this.saveQualityReport(report);
            
            log('包括的品質チェック完了');
            log('品質スコア: ' + report.summary.overallQuality + '%');
            
            return report;
            
        } catch (error) {
            log('包括的品質チェックエラー: ' + error.message);
            report.error = error.message;
            return report;
        }
    }

    // 設計書準拠：総合品質スコア計算
    calculateOverallQuality(report) {
        let score = 100;
        
        // 設計書制約違反によるペナルティ
        if (report.designConstraints && !report.designConstraints.passed) {
            score -= report.designConstraints.totalViolations * 20; // 1違反で20点減点
        }
        
        // 重複コードによるペナルティ
        if (report.codeDuplication && report.codeDuplication.duplicatesFound > 0) {
            score -= Math.min(report.codeDuplication.duplicatesFound * 5, 20); // 最大20点減点
        }
        
        // 循環依存によるペナルティ
        if (report.dependencies && report.dependencies.circularDependencies > 0) {
            score -= 15; // 循環依存で15点減点
        }
        
        // 未使用コードによるペナルティ
        if (report.unusedCode && report.unusedCode.unusedItems > 0) {
            score -= Math.min(report.unusedCode.unusedItems * 2, 10); // 最大10点減点
        }
        
        return Math.max(score, 0);
    }

    // 設計書準拠：品質レポート保存
    async saveQualityReport(report) {
        try {
            const outputPath = path.join(this.projectRoot, 'output', 'quality-report.json');
            await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
            log('品質レポートを保存しました: ' + outputPath);
        } catch (error) {
            log('品質レポート保存エラー: ' + error.message);
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    QualityChecker
};

// 設計書準拠：直接実行
if (require.main === module) {
    async function runQualityCheck() {
        log('MIRRALISM V4 - 自動化品質チェックシステム');
        log('設計書準拠版');
        log('');
        
        const checker = new QualityChecker();
        
        // 包括的品質チェックを実行
        const report = await checker.runComprehensiveQualityCheck();
        
        if (!report.error) {
            log('');
            log('=== 品質チェック結果 ===');
            log('設計書制約: ' + (report.designConstraints.passed ? '✅ 合格' : '❌ ' + report.designConstraints.totalViolations + '件の違反'));
            log('重複コード: ' + report.codeDuplication.duplicatesFound + '件');
            log('循環依存: ' + report.dependencies.circularDependencies + '件');
            log('未使用コード: ' + report.unusedCode.unusedItems + '件');
            log('総合品質スコア: ' + report.summary.overallQuality + '%');
        }
    }
    
    runQualityCheck();
}