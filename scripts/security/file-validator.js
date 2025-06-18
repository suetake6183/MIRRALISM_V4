const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：ファイル検証機能クラス
class FileValidator {
    constructor() {
        this.validationLog = [];
    }

    // 設計書準拠：データ整合性検証
    async validateDataIntegrity() {
        log('データ整合性検証を開始');
        
        const validationResults = [];
        
        // 1. データベースファイルの検証
        const dbValidation = await this.validateDatabaseFiles();
        validationResults.push(dbValidation);
        
        // 2. 設定ファイルの検証
        const configValidation = await this.validateConfigFiles();
        validationResults.push(configValidation);
        
        // 3. 出力ファイルの検証
        const outputValidation = await this.validateOutputFiles();
        validationResults.push(outputValidation);
        
        // 4. 入力ファイルの検証
        const inputValidation = await this.validateInputFiles();
        validationResults.push(inputValidation);

        const totalIssues = validationResults.reduce((sum, result) => sum + result.issues.length, 0);
        
        log('データ整合性検証完了');
        log('検証カテゴリ数: ' + validationResults.length);
        log('発見された問題: ' + totalIssues + '件');

        this.validationLog.push({
            operation: 'data_integrity_validation',
            results: validationResults,
            totalIssues: totalIssues,
            timestamp: getJSTTimestamp()
        });

        return {
            results: validationResults,
            totalIssues: totalIssues,
            passRate: validationResults.length > 0 ? ((validationResults.length - totalIssues) / validationResults.length * 100) : 100
        };
    }

    // 設計書準拠：データベースファイル検証
    async validateDatabaseFiles() {
        const issues = [];
        const dbDir = path.join(__dirname, '..', '..', 'database');
        
        try {
            const files = await fs.readdir(dbDir);
            const dbFiles = files.filter(file => file.endsWith('.db'));
            
            for (const dbFile of dbFiles) {
                const dbPath = path.join(dbDir, dbFile);
                
                try {
                    const stats = await fs.stat(dbPath);
                    
                    // ファイルサイズチェック
                    if (stats.size === 0) {
                        issues.push({
                            file: dbFile,
                            type: 'empty_file',
                            severity: 'high',
                            description: 'データベースファイルが空です'
                        });
                    } else if (stats.size > 100 * 1024 * 1024) { // 100MB以上
                        issues.push({
                            file: dbFile,
                            type: 'large_file',
                            severity: 'medium',
                            description: 'データベースファイルが大きすぎます: ' + (stats.size / 1024 / 1024).toFixed(2) + 'MB'
                        });
                    }
                    
                    // ファイル権限チェック（基本的な読み込み可能性）
                    await fs.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
                    
                } catch (error) {
                    issues.push({
                        file: dbFile,
                        type: 'access_error',
                        severity: 'high',
                        description: 'ファイルアクセスエラー: ' + error.message
                    });
                }
            }
            
            if (dbFiles.length === 0) {
                issues.push({
                    file: 'database directory',
                    type: 'missing_files',
                    severity: 'high',
                    description: 'データベースファイルが見つかりません'
                });
            }
            
        } catch (error) {
            issues.push({
                file: 'database directory',
                type: 'directory_error',
                severity: 'high',
                description: 'データベースディレクトリアクセスエラー: ' + error.message
            });
        }
        
        return {
            category: 'database_files',
            filesChecked: 0,
            issues: issues
        };
    }

    // 設計書準拠：設定ファイル検証
    async validateConfigFiles() {
        const issues = [];
        const configFiles = [
            'package.json',
            'CLAUDE.md',
            '.gitignore'
        ];
        
        for (const configFile of configFiles) {
            const configPath = path.join(__dirname, '..', '..', configFile);
            
            try {
                const content = await fs.readFile(configPath, 'utf8');
                
                if (configFile === 'package.json') {
                    try {
                        const packageData = JSON.parse(content);
                        
                        if (!packageData.name) {
                            issues.push({
                                file: configFile,
                                type: 'missing_field',
                                severity: 'medium',
                                description: 'package.jsonにnameフィールドがありません'
                            });
                        }
                        
                        if (!packageData.dependencies) {
                            issues.push({
                                file: configFile,
                                type: 'missing_dependencies',
                                severity: 'low',
                                description: 'dependenciesが定義されていません'
                            });
                        }
                        
                    } catch (parseError) {
                        issues.push({
                            file: configFile,
                            type: 'parse_error',
                            severity: 'high',
                            description: 'JSONパースエラー: ' + parseError.message
                        });
                    }
                }
                
                if (content.trim().length === 0) {
                    issues.push({
                        file: configFile,
                        type: 'empty_file',
                        severity: 'medium',
                        description: '設定ファイルが空です'
                    });
                }
                
            } catch (error) {
                if (error.code === 'ENOENT') {
                    issues.push({
                        file: configFile,
                        type: 'missing_file',
                        severity: configFile === 'package.json' ? 'high' : 'low',
                        description: '設定ファイルが見つかりません'
                    });
                } else {
                    issues.push({
                        file: configFile,
                        type: 'access_error',
                        severity: 'medium',
                        description: 'ファイルアクセスエラー: ' + error.message
                    });
                }
            }
        }
        
        return {
            category: 'config_files',
            filesChecked: configFiles.length,
            issues: issues
        };
    }

    // 設計書準拠：出力ファイル検証
    async validateOutputFiles() {
        const issues = [];
        const outputDir = path.join(__dirname, '..', '..', 'output');
        
        try {
            await fs.access(outputDir);
            const files = await fs.readdir(outputDir);
            
            for (const file of files) {
                const filePath = path.join(outputDir, file);
                
                try {
                    const stats = await fs.stat(filePath);
                    
                    if (stats.isFile() && file.endsWith('.json')) {
                        const content = await fs.readFile(filePath, 'utf8');
                        
                        try {
                            JSON.parse(content);
                        } catch (parseError) {
                            issues.push({
                                file: file,
                                type: 'invalid_json',
                                severity: 'medium',
                                description: 'JSONファイルが不正です: ' + parseError.message
                            });
                        }
                    }
                    
                } catch (error) {
                    issues.push({
                        file: file,
                        type: 'access_error',
                        severity: 'low',
                        description: 'ファイルアクセスエラー: ' + error.message
                    });
                }
            }
            
        } catch (error) {
            issues.push({
                file: 'output directory',
                type: 'directory_error',
                severity: 'low',
                description: '出力ディレクトリアクセスエラー: ' + error.message
            });
        }
        
        return {
            category: 'output_files',
            filesChecked: 0,
            issues: issues
        };
    }

    // 設計書準拠：入力ファイル検証
    async validateInputFiles() {
        const issues = [];
        const inputDir = path.join(__dirname, '..', '..', 'input');
        
        try {
            await fs.access(inputDir);
            const files = await fs.readdir(inputDir);
            
            const textFiles = files.filter(file => file.endsWith('.txt') || file.endsWith('.md'));
            
            for (const file of textFiles) {
                const filePath = path.join(inputDir, file);
                
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    // 文字エンコーディングチェック
                    if (content.includes('\uFFFD')) {
                        issues.push({
                            file: file,
                            type: 'encoding_error',
                            severity: 'medium',
                            description: '文字エンコーディングエラーが検出されました'
                        });
                    }
                    
                    // ファイルサイズチェック
                    if (content.length === 0) {
                        issues.push({
                            file: file,
                            type: 'empty_file',
                            severity: 'low',
                            description: '入力ファイルが空です'
                        });
                    } else if (content.length > 10 * 1024 * 1024) { // 10MB以上
                        issues.push({
                            file: file,
                            type: 'large_file',
                            severity: 'medium',
                            description: '入力ファイルが大きすぎます: ' + (content.length / 1024 / 1024).toFixed(2) + 'MB'
                        });
                    }
                    
                } catch (error) {
                    issues.push({
                        file: file,
                        type: 'read_error',
                        severity: 'medium',
                        description: 'ファイル読み込みエラー: ' + error.message
                    });
                }
            }
            
        } catch (error) {
            issues.push({
                file: 'input directory',
                type: 'directory_error',
                severity: 'medium',
                description: '入力ディレクトリアクセスエラー: ' + error.message
            });
        }
        
        return {
            category: 'input_files',
            filesChecked: 0,
            issues: issues
        };
    }

    // 設計書準拠：ファイルチェックサム計算
    async calculateFileChecksum(filePath) {
        try {
            const content = await fs.readFile(filePath);
            const hash = crypto.createHash('sha256');
            hash.update(content);
            return hash.digest('hex');
        } catch (error) {
            return null;
        }
    }

    // 設計書準拠：ファイル整合性検証
    async verifyFileIntegrity(filePath, expectedChecksum) {
        const actualChecksum = await this.calculateFileChecksum(filePath);
        return actualChecksum === expectedChecksum;
    }

    // 設計書準拠：検証ログのアクセサ
    getValidationLog() {
        return this.validationLog;
    }

    clearValidationLog() {
        this.validationLog = [];
    }
}

// 設計書準拠：エクスポート
module.exports = {
    FileValidator
};