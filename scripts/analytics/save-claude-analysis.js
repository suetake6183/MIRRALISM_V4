const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const { log, getJSTTimestamp } = require('../shared/logger');

// Claude Code分析結果を学習データベースに保存
class ClaudeAnalysisSaver {
    constructor() {
        this.dbPath = path.join(__dirname, '..', '..', 'database', 'learning.db');
    }

    async getDbConnection() {
        return await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
    }

    // 分析結果を学習データとして保存
    async saveAnalysisResult(analysisData) {
        log('Claude Code分析結果を学習データベースに保存中...');
        
        try {
            const db = await this.getDbConnection();
            
            // 分析結果を学習パターンとして保存
            await db.run(`
                INSERT INTO learning_patterns 
                (pattern_description, pattern_details, context, success_count, created_at, last_used)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'Claude Code分析結果',
                JSON.stringify(analysisData),
                'Claude Code自動分析',
                1,
                getJSTTimestamp(),
                getJSTTimestamp()
            ]);

            // ファイル種別判定結果も保存
            if (analysisData.fileType) {
                await db.run(`
                    INSERT INTO file_type_learning 
                    (file_content_sample, llm_judgment, llm_reasoning, user_feedback, correct_type, is_correct, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    analysisData.contentSample || '',
                    analysisData.fileType,
                    analysisData.reasoning || 'Claude Code自動判定',
                    null,
                    analysisData.fileType,
                    true,
                    getJSTTimestamp()
                ]);
            }

            await db.close();
            log('✅ Claude Code分析結果を学習データベースに保存しました');
            
        } catch (error) {
            log('❌ 学習データ保存エラー: ' + error.message);
        }
    }

    // 最新の分析結果ファイルから学習データを抽出
    async extractFromLatestAnalysis() {
        try {
            const outputDir = path.join(__dirname, '..', '..', 'output', 'analysis');
            
            if (!fs.existsSync(outputDir)) {
                log('分析結果ディレクトリが存在しません');
                return;
            }

            const files = fs.readdirSync(outputDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(outputDir, file),
                    mtime: fs.statSync(path.join(outputDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length === 0) {
                log('分析結果ファイルが見つかりません');
                return;
            }

            const latestFile = files[0];
            log('最新の分析結果ファイル: ' + latestFile.name);

            const analysisData = JSON.parse(fs.readFileSync(latestFile.path, 'utf8'));
            
            // 学習データとして保存
            await this.saveAnalysisResult({
                fileName: latestFile.name,
                fileType: analysisData.type || 'unknown',
                analysisResult: analysisData,
                contentSample: analysisData.summary || '',
                reasoning: 'Claude Code詳細分析',
                timestamp: getJSTTimestamp()
            });

        } catch (error) {
            log('❌ 分析結果抽出エラー: ' + error.message);
        }
    }

    // 対話型学習データ保存（ユーザーフィードバック付き）
    async saveWithFeedback(feedback) {
        log('ユーザーフィードバック付きで学習データを保存中...');
        
        try {
            const db = await this.getDbConnection();
            
            await db.run(`
                INSERT INTO learning_patterns 
                (pattern_description, pattern_details, context, success_count, created_at, last_used)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'ユーザーフィードバック',
                JSON.stringify(feedback),
                'Claude Code対話型学習',
                1,
                getJSTTimestamp(),
                getJSTTimestamp()
            ]);

            await db.close();
            log('✅ フィードバック付き学習データを保存しました');
            
        } catch (error) {
            log('❌ フィードバック保存エラー: ' + error.message);
        }
    }
}

// 直接実行時の処理
async function main() {
    log('Claude Code分析結果の学習データ保存を開始...');
    
    const saver = new ClaudeAnalysisSaver();
    
    // 最新の分析結果から学習データを抽出・保存
    await saver.extractFromLatestAnalysis();
    
    log('学習データ保存処理が完了しました');
}

// モジュールエクスポート
module.exports = {
    ClaudeAnalysisSaver
};

// 直接実行時
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 実行エラー:', error.message);
        process.exit(1);
    });
} 