const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { log, getJSTTimestamp } = require('./logger');

/**
 * Output管理システム - 統合分析結果管理
 * 設計原則: 同一データは統合ファイルで管理、重複排除
 */
class OutputManager {
    constructor() {
        this.baseDir = path.join(__dirname, '..', '..', 'output');
        this.analysisDir = path.join(this.baseDir, 'analysis_results');
        this.systemDir = path.join(this.baseDir, 'system_reports');
    }

    // ディレクトリ初期化
    async initializeDirectories() {
        try {
            await fs.mkdir(this.analysisDir, { recursive: true });
            await fs.mkdir(this.systemDir, { recursive: true });
            log('✅ Output ディレクトリを初期化しました');
        } catch (error) {
            log('❌ ディレクトリ初期化エラー: ' + error.message);
            throw error;
        }
    }

    // 入力ファイルからハッシュ生成（同一データ判定用）
    generateInputHash(inputPath, inputContent) {
        const content = inputContent || inputPath;
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    }

    // 統一ファイル名生成（日本語対応修正版）
    generateUnifiedFileName(inputPath, analysisType = 'comprehensive') {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        
        // 日本語ファイル名の適切な変換
        let cleanName = baseName;
        if (baseName.includes('社労士')) {
            cleanName = 'sharoshi_meeting';
        } else if (baseName.includes('下重')) {
            cleanName = 'shimoju_meeting';
        } else {
            // その他の場合は英数字とアンダースコアのみ残す
            cleanName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
            // 連続するアンダースコアを単一に変換
            cleanName = cleanName.replace(/_+/g, '_');
            // 前後のアンダースコアを削除
            cleanName = cleanName.replace(/^_+|_+$/g, '');
            // 空の場合はdefaultを使用
            if (!cleanName) {
                cleanName = 'analysis';
            }
        }
        
        return `${cleanName}_${analysisType}_${today}.json`;
    }

    // 統合分析結果保存（同一データは統合・更新）
    async saveUnifiedAnalysisResult(data, inputPath, analysisType = 'comprehensive') {
        try {
            const fileName = this.generateUnifiedFileName(inputPath, analysisType);
            const filePath = path.join(this.analysisDir, fileName);
            
            let existingData = {};
            
            // 既存ファイルがあれば読み込み
            try {
                const existingContent = await fs.readFile(filePath, 'utf8');
                existingData = JSON.parse(existingContent);
            } catch (error) {
                // ファイルが存在しない場合は新規作成
                log(`新規分析ファイルを作成: ${fileName}`);
            }

            // 分析履歴として統合
            const unifiedData = {
                ...existingData,
                inputSource: inputPath,
                lastUpdated: getJSTTimestamp(),
                analysisHistory: [
                    ...(existingData.analysisHistory || []),
                    {
                        timestamp: getJSTTimestamp(),
                        analysisType: analysisType,
                        data: data
                    }
                ],
                latestAnalysis: data,
                totalAnalysisCount: (existingData.totalAnalysisCount || 0) + 1
            };

            await fs.writeFile(filePath, JSON.stringify(unifiedData, null, 2), 'utf8');
            
            log(`✅ 統合分析結果を保存: ${fileName}`);
            log(`📊 累計分析回数: ${unifiedData.totalAnalysisCount}回`);
            
            return filePath;
            
        } catch (error) {
            log('❌ 統合分析結果保存エラー: ' + error.message);
            throw error;
        }
    }

    // 重複ファイル整理
    async cleanupDuplicateFiles(inputPath) {
        try {
            const files = await fs.readdir(this.analysisDir);
            const baseName = path.basename(inputPath, path.extname(inputPath));
            
            // 同一入力データに関連するファイルを特定
            const relatedFiles = files.filter(file => {
                return file.includes('shimoju') || // 社労士関連
                       file.includes('analysis_175') || // タイムスタンプファイル
                       file.includes(baseName.replace(/[^a-zA-Z0-9]/g, '_'));
            });

            log(`🔍 重複ファイル候補: ${relatedFiles.length}件`);
            
            // 統合ファイル名を生成
            const unifiedFileName = this.generateUnifiedFileName(inputPath, 'comprehensive');
            
            // 重複ファイルをバックアップディレクトリに移動
            const backupDir = path.join(this.analysisDir, 'archived');
            await fs.mkdir(backupDir, { recursive: true });
            
            let movedCount = 0;
            for (const file of relatedFiles) {
                if (file !== unifiedFileName && file.endsWith('.json')) {
                    const oldPath = path.join(this.analysisDir, file);
                    const newPath = path.join(backupDir, file);
                    
                    try {
                        await fs.rename(oldPath, newPath);
                        movedCount++;
                        log(`📦 アーカイブ: ${file}`);
                    } catch (error) {
                        log(`⚠️ ファイル移動失敗: ${file} - ${error.message}`);
                    }
                }
            }
            
            log(`✅ 重複ファイル整理完了: ${movedCount}件をアーカイブ`);
            return movedCount;
            
        } catch (error) {
            log('❌ 重複ファイル整理エラー: ' + error.message);
            throw error;
        }
    }

    // 分析結果の検索・取得
    async getLatestAnalysisFor(inputPath) {
        try {
            const fileName = this.generateUnifiedFileName(inputPath, 'comprehensive');
            const filePath = path.join(this.analysisDir, fileName);
            
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            return data.latestAnalysis;
            
        } catch (error) {
            log(`⚠️ 分析結果が見つかりません: ${inputPath}`);
            return null;
        }
    }

    // 分析統計の取得
    async getAnalysisStatistics() {
        try {
            const files = await fs.readdir(this.analysisDir);
            const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));
            
            let totalAnalyses = 0;
            const fileStats = [];
            
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(this.analysisDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    const count = data.totalAnalysisCount || 1;
                    totalAnalyses += count;
                    
                    fileStats.push({
                        fileName: file,
                        analysisCount: count,
                        lastUpdated: data.lastUpdated || '不明',
                        inputSource: data.inputSource || '不明'
                    });
                } catch (error) {
                    // 古い形式のファイルはスキップ
                }
            }
            
            return {
                totalFiles: jsonFiles.length,
                totalAnalyses: totalAnalyses,
                files: fileStats.sort((a, b) => b.analysisCount - a.analysisCount)
            };
            
        } catch (error) {
            log('❌ 分析統計取得エラー: ' + error.message);
            return null;
        }
    }

    // システムレポート保存
    async saveSystemReport(data, reportType) {
        const filename = `${reportType}_report.json`;
        const filepath = path.join(this.systemDir, filename);

        try {
            await this.initializeDirectories();
            await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
            log(`✅ システムレポートを保存: ${filename}`);
            return filepath;
        } catch (error) {
            log('❌ システムレポート保存エラー: ' + error.message);
            throw error;
        }
    }

    // 最新結果への参照を更新
    async updateLatestReference(latestFilename) {
        const referencePath = path.join(this.analysisDir, 'latest_analysis.json');
        const referenceData = {
            latestFile: latestFilename,
            updatedAt: getJSTTimestamp(),
            description: '最新の分析結果ファイルへの参照'
        };

        try {
            await fs.writeFile(referencePath, JSON.stringify(referenceData, null, 2), 'utf8');
        } catch (error) {
            log('⚠️ 最新参照更新エラー: ' + error.message);
        }
    }

    // 古いファイルのクリーンアップ（オプション）
    async cleanupOldFiles(keepCount = 10) {
        try {
            const files = await fs.readdir(this.analysisDir);
            const analysisFiles = files
                .filter(f => f.endsWith('.json') && f !== 'latest_analysis.json')
                .map(f => ({
                    name: f,
                    path: path.join(this.analysisDir, f),
                    timestamp: f.substring(0, 12) // YYYYMMDDHHMM
                }))
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

            if (analysisFiles.length > keepCount) {
                const filesToDelete = analysisFiles.slice(keepCount);
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    log(`🗑️ 古いファイルを削除: ${file.name}`);
                }
            }
        } catch (error) {
            log('⚠️ ファイルクリーンアップエラー: ' + error.message);
        }
    }

    // ファイル検索
    async findAnalysisFiles(pattern = '') {
        try {
            const files = await fs.readdir(this.analysisDir);
            return files
                .filter(f => f.includes(pattern) && f.endsWith('.json'))
                .sort()
                .reverse(); // 新しい順
        } catch (error) {
            log('❌ ファイル検索エラー: ' + error.message);
            return [];
        }
    }
}

module.exports = OutputManager; 