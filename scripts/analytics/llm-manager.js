const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：学習データベース統合管理
class LLMLearningManager {
    constructor() {
        this.dbPath = path.join(__dirname, '..', '..', 'database', 'learning.db');
    }

    // 設計書準拠：過去の学習パターン取得
    async getLearningPatterns(fileType = null, limit = 10) {
        try {
            const db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            let query = `
                SELECT pattern_description, pattern_details, context, created_at 
                FROM learning_patterns 
            `;
            
            if (fileType) {
                query += ` WHERE pattern_details LIKE '%${fileType}%' `;
            }
            
            query += ` ORDER BY created_at DESC LIMIT ${limit}`;
            
            const patterns = await db.all(query);
            await db.close();
            
            return patterns;
        } catch (error) {
            log('学習パターン取得エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：学習データ記録
    async recordLearningData(description, details, context) {
        try {
            const db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            await db.run(`
                INSERT INTO learning_patterns 
                (pattern_description, pattern_details, context, created_at)
                VALUES (?, ?, ?, datetime('now', '+9 hours'))
            `, [description, details, context]);

            await db.close();
            log('学習データを記録しました');
        } catch (error) {
            log('学習データ記録エラー: ' + error.message);
        }
    }

    // 設計書準拠：LLM判定支援情報の生成
    async generateLLMContext(contentSample) {
        const patterns = await this.getLearningPatterns();
        
        const context = {
            contentSample: contentSample.substring(0, 500),
            learningData: patterns.slice(0, 5),
            timestamp: getJSTTimestamp(),
            availableTypes: ['meeting', 'personal', 'proposal', 'unknown']
        };

        return context;
    }

    // 設計書準拠：分析結果の検証と学習
    async validateAndLearn(judgment, reasoning, actualResult) {
        const validationData = {
            judgment: judgment,
            reasoning: reasoning,
            result: actualResult,
            timestamp: getJSTTimestamp()
        };

        await this.recordLearningData(
            '分析結果検証',
            `判定: ${judgment}, 理由: ${reasoning}`,
            '実行結果から学習'
        );

        return validationData;
    }
}

// 設計書準拠：LLM統合ワークフロー管理
class LLMWorkflowManager {
    constructor() {
        this.learningManager = new LLMLearningManager();
    }

    // 設計書準拠：自動分析開始（対話型から変更）
    async initiateLLMAnalysis(filePath) {
        log('LLM統合分析システム開始');
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const context = await this.learningManager.generateLLMContext(content);
            
            log('\\n=== 自動ファイル種別判定システム ===');
            log('ファイル: ' + path.basename(filePath));
            log('内容サンプル:');
            log('─'.repeat(40));
            log(context.contentSample);
            log('─'.repeat(40));
            
            if (context.learningData.length > 0) {
                log('\\n過去の学習データ:');
                context.learningData.forEach((data, index) => {
                    log(`${index + 1}. ${data.pattern_description}`);
                });
            }
            
            // 自動判定を実行
            const fileType = await this.autoDetectFileType(content);
            log('\\n自動判定結果: ' + fileType);
            
            // 判定理由を生成
            let reasoning = '';
            switch (fileType) {
                case 'meeting':
                    reasoning = '会議・打ち合わせ関連のキーワードを検出';
                    break;
                case 'proposal':
                    reasoning = '提案書・企画書関連のキーワードを検出';
                    break;
                case 'personal':
                    reasoning = '個人的な思考・メモ関連のキーワードを検出';
                    break;
                default:
                    reasoning = '明確な分類キーワードが見つからない';
            }
            
            // 判定結果を記録
            await this.learningManager.recordLearningData(
                '自動判定実行',
                `判定: ${fileType}, 理由: ${reasoning}`,
                '自動判定システム'
            );
            
            return { 
                status: 'judgment_completed', 
                judgment: fileType,
                reasoning: reasoning,
                filePath: filePath,
                content: content
            };
            
        } catch (error) {
            log('エラー: ' + error.message);
            return { status: 'error', error: error.message };
        }
    }

    // 自動ファイル種別判定機能を追加
    async autoDetectFileType(content) {
        log('自動ファイル種別判定を実行中...');
        
        // 会議判定パターン
        if (content.includes('参加者') || content.includes('議題') || 
            content.includes('打ち合わせ') || content.includes('会議') ||
            content.includes('社労士') || content.includes('相談')) {
            return 'meeting';
        }
        
        // 提案書判定パターン  
        if (content.includes('提案') || content.includes('企画') || 
            content.includes('計画書') || content.includes('仕様書')) {
            return 'proposal';
        }
        
        // 個人メモ判定パターン
        if (content.includes('思考') || content.includes('メモ') || 
            content.includes('日記') || content.includes('個人的')) {
            return 'personal';
        }
        
        return 'unknown';
    }

    // 設計書準拠：LLM判定結果の処理
    async processLLMJudgment(judgment, reasoning) {
        const validTypes = ['meeting', 'personal', 'proposal', 'unknown'];
        
        if (!validTypes.includes(judgment.toLowerCase())) {
            log('無効な判定です。meeting, personal, proposal, unknownのいずれかを選択してください。');
            return { valid: false };
        }

        const result = {
            valid: true,
            judgment: judgment.toLowerCase(),
            reasoning: reasoning,
            timestamp: getJSTTimestamp()
        };

        await this.learningManager.recordLearningData(
            'LLM判定結果',
            `判定: ${result.judgment}, 理由: ${reasoning}`,
            'Claude Code判定システム'
        );

        log('判定結果を記録しました: ' + result.judgment);
        return result;
    }

    // 設計書準拠：統合学習サイクル
    async executeLearningCycle(judgment, reasoning, feedback = null) {
        log('\\n=== 統合学習サイクル実行 ===');
        
        const learningData = {
            judgment: judgment,
            reasoning: reasoning,
            feedback: feedback,
            timestamp: getJSTTimestamp()
        };

        await this.learningManager.recordLearningData(
            '統合学習サイクル',
            `判定精度向上: ${judgment}`,
            'Claude Code学習システム'
        );

        log('学習サイクルが完了しました');
        return learningData;
    }
}

// 設計書準拠：エクスポート
module.exports = {
    LLMLearningManager,
    LLMWorkflowManager
};