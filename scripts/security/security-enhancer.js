const fs = require('fs').promises;
const path = require('path');
const { log, getJSTTimestamp } = require('./shared/logger');
const { SecurityChecker } = require('./security/security-checker');
const { FileValidator } = require('./security/file-validator');

// 設計書準拠：セキュリティ強化クラス（分割構造対応）
class SecurityEnhancer {
    constructor() {
        this.checker = new SecurityChecker();
        this.validator = new FileValidator();
        this.securityResults = [];
    }

    // 設計書準拠：ファイルアクセスセキュリティ（委譲）
    async secureFileAccess() {
        return await this.checker.secureFileAccess();
    }

    // 設計書準拠：データ整合性検証（委譲）
    async validateDataIntegrity() {
        return await this.validator.validateDataIntegrity();
    }

    // 設計書準拠：包括的セキュリティ監査
    async performSecurityAudit() {
        log('包括的セキュリティ監査を開始');
        
        const auditResults = {
            fileAccess: null,
            dataIntegrity: null,
            codeAudit: null,
            timestamp: getJSTTimestamp()
        };
        
        try {
            // 1. ファイルアクセスセキュリティ
            log('ファイルアクセスセキュリティを検証中...');
            auditResults.fileAccess = await this.secureFileAccess();
            
            // 2. データ整合性検証
            log('データ整合性を検証中...');
            auditResults.dataIntegrity = await this.validateDataIntegrity();
            
            // 3. コードセキュリティ監査
            log('コードセキュリティを監査中...');
            auditResults.codeAudit = await this.checker.auditCodeSecurity();
            
            // 4. 総合評価
            const securityScore = this.calculateSecurityScore(auditResults);
            auditResults.securityScore = securityScore;
            
            this.securityResults.push(auditResults);
            
            log('包括的セキュリティ監査完了');
            log('セキュリティスコア: ' + securityScore.score + '% (' + securityScore.grade + ')');
            
            return auditResults;
            
        } catch (error) {
            log('セキュリティ監査エラー: ' + error.message);
            auditResults.error = error.message;
            return auditResults;
        }
    }

    // 設計書準拠：コードセキュリティ監査（委譲）
    async auditCodeSecurity() {
        return await this.checker.auditCodeSecurity();
    }

    // 設計書準拠：セキュリティスコア計算
    calculateSecurityScore(auditResults) {
        let totalScore = 0;
        let maxScore = 0;
        
        // ファイルアクセスセキュリティスコア
        if (auditResults.fileAccess && auditResults.fileAccess.summary) {
            const fileAccessScore = (auditResults.fileAccess.summary.safe / auditResults.fileAccess.summary.total) * 100;
            totalScore += fileAccessScore * 0.3; // 30%の重み
            maxScore += 30;
        }
        
        // データ整合性スコア
        if (auditResults.dataIntegrity && auditResults.dataIntegrity.passRate !== undefined) {
            totalScore += auditResults.dataIntegrity.passRate * 0.3; // 30%の重み
            maxScore += 30;
        }
        
        // コードセキュリティスコア
        if (auditResults.codeAudit && auditResults.codeAudit.summary) {
            const codeSecurityScore = auditResults.codeAudit.summary.totalFiles > 0 ?
                (auditResults.codeAudit.summary.safeFiles / auditResults.codeAudit.summary.totalFiles) * 100 : 100;
            totalScore += codeSecurityScore * 0.4; // 40%の重み
            maxScore += 40;
        }
        
        const finalScore = maxScore > 0 ? Math.round(totalScore) : 0;
        
        let grade;
        if (finalScore >= 95) grade = 'A+';
        else if (finalScore >= 90) grade = 'A';
        else if (finalScore >= 85) grade = 'B+';
        else if (finalScore >= 80) grade = 'B';
        else if (finalScore >= 75) grade = 'C+';
        else if (finalScore >= 70) grade = 'C';
        else if (finalScore >= 60) grade = 'D';
        else grade = 'F';
        
        return {
            score: finalScore,
            grade: grade,
            details: {
                fileAccessWeight: 30,
                dataIntegrityWeight: 30,
                codeSecurityWeight: 40
            }
        };
    }

    // 設計書準拠：セキュリティレポート生成
    async generateSecurityReport() {
        log('セキュリティレポートを生成中...');
        
        const report = {
            timestamp: getJSTTimestamp(),
            securityResults: this.securityResults,
            summary: {
                totalAudits: this.securityResults.length,
                latestScore: this.securityResults.length > 0 ? this.securityResults[this.securityResults.length - 1].securityScore : null
            },
            recommendations: this.generateSecurityRecommendations()
        };
        
        // レポートをファイルに出力
        const outputPath = path.join(__dirname, '..', 'output', 'security-report.json');
        try {
            await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
            log('セキュリティレポートを出力しました: ' + outputPath);
        } catch (error) {
            log('セキュリティレポート出力エラー: ' + error.message);
        }
        
        return report;
    }

    // 設計書準拠：セキュリティ改善提案生成
    generateSecurityRecommendations() {
        const recommendations = [];
        
        if (this.securityResults.length === 0) {
            recommendations.push({
                priority: 'low',
                title: 'セキュリティ監査実行',
                description: 'セキュリティ監査を実行してください'
            });
            return recommendations;
        }
        
        const latestResult = this.securityResults[this.securityResults.length - 1];
        
        // ファイルアクセスセキュリティの改善提案
        if (latestResult.fileAccess && latestResult.fileAccess.summary.warning > 0) {
            recommendations.push({
                priority: 'medium',
                title: 'ファイルアクセス権限の見直し',
                description: latestResult.fileAccess.summary.warning + '件の警告が検出されました。ファイルアクセス権限を確認してください。'
            });
        }
        
        if (latestResult.fileAccess && latestResult.fileAccess.summary.error > 0) {
            recommendations.push({
                priority: 'high',
                title: 'ファイルアクセスエラーの修正',
                description: latestResult.fileAccess.summary.error + '件のエラーが検出されました。immediate対応が必要です。'
            });
        }
        
        // データ整合性の改善提案
        if (latestResult.dataIntegrity && latestResult.dataIntegrity.totalIssues > 0) {
            recommendations.push({
                priority: 'medium',
                title: 'データ整合性の改善',
                description: latestResult.dataIntegrity.totalIssues + '件のデータ整合性問題が検出されました。'
            });
        }
        
        // コードセキュリティの改善提案
        if (latestResult.codeAudit && latestResult.codeAudit.summary.vulnerabilities > 0) {
            recommendations.push({
                priority: 'high',
                title: 'コードセキュリティの強化',
                description: latestResult.codeAudit.summary.vulnerabilities + '件の脆弱性が検出されました。コードレビューを実施してください。'
            });
        }
        
        // セキュリティスコアが低い場合の改善提案
        if (latestResult.securityScore && latestResult.securityScore.score < 80) {
            recommendations.push({
                priority: 'high',
                title: '総合セキュリティスコア改善',
                description: 'セキュリティスコアが' + latestResult.securityScore.score + '%です。総合的なセキュリティ強化が必要です。'
            });
        }
        
        return recommendations;
    }

    // 設計書準拠：結果アクセサ
    getSecurityResults() {
        return this.securityResults;
    }

    getSecurityLog() {
        return this.checker.getSecurityLog();
    }

    getValidationLog() {
        return this.validator.getValidationLog();
    }

    // 設計書準拠：結果クリア
    clearResults() {
        this.securityResults = [];
        this.checker.clearSecurityLog();
        this.validator.clearValidationLog();
    }

    // 設計書準拠：包括的セキュリティ強化実行
    async runComprehensiveSecurityEnhancement() {
        log('包括的セキュリティ強化を開始...');
        
        try {
            // 1. セキュリティ監査実行
            const auditResults = await this.performSecurityAudit();
            
            // 2. レポート生成
            const report = await this.generateSecurityReport();
            
            log('包括的セキュリティ強化完了');
            
            return {
                audit: auditResults,
                report: report
            };
            
        } catch (error) {
            log('包括的セキュリティ強化エラー: ' + error.message);
            return null;
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    SecurityEnhancer
};

// 設計書準拠：直接実行（既存コードとの互換性保持）
if (require.main === module) {
    async function runSecurityEnhancement() {
        log('MIRRALISM V4 - セキュリティ強化システム');
        log('設計書準拠版（分割構造対応）');
        log('');
        
        const securityEnhancer = new SecurityEnhancer();
        
        // 包括的セキュリティ強化を実行
        const results = await securityEnhancer.runComprehensiveSecurityEnhancement();
        
        if (results) {
            log('');
            log('=== セキュリティ改善提案 ===');
            if (results.report.recommendations.length > 0) {
                results.report.recommendations.forEach((rec, index) => {
                    log((index + 1) + '. [' + rec.priority.toUpperCase() + '] ' + rec.title + ': ' + rec.description);
                });
            } else {
                log('改善提案はありません。セキュリティ状態は良好です。');
            }
        }
    }
    
    runSecurityEnhancement();
}