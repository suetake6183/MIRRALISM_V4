const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { log, getJSTTimestamp } = require('../shared/logger');

/**
 * シンプル学習サイクルシステム
 * 必要最小限の機能で学習サイクルを実現
 */
class SimpleLearningSystem {
    constructor() {
        this.dbPath = path.join(__dirname, '..', '..', 'database', 'simple_learning.db');
    }

    /**
     * データベース接続
     */
    async getDb() {
        return await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
    }

    /**
     * データベース初期化
     */
    async initializeDatabase() {
        const db = await this.getDb();
        
        await db.exec(`
            CREATE TABLE IF NOT EXISTS simple_learning (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                input_pattern TEXT NOT NULL,
                analysis_approach TEXT NOT NULL,
                success_score INTEGER DEFAULT 5,
                user_feedback TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_pattern ON simple_learning(input_pattern);
            CREATE INDEX IF NOT EXISTS idx_score ON simple_learning(success_score);
        `);
        
        await db.close();
        log('シンプル学習データベースを初期化しました');
    }

    /**
     * 学習データを活用して分析方針を決定
     */
    async analyzeWithLearning(input, inputType = 'general') {
        log('🧠 学習データを参照中...');
        
        // 過去の成功パターンを取得
        const pastLearnings = await this.getPastLearnings(inputType);
        
        // 最適なアプローチを選択（既存か新規）
        const approach = pastLearnings.length > 0 
            ? pastLearnings[0].analysis_approach 
            : this.getDefaultApproach(inputType);
        
        log(`📊 選択アプローチ: ${approach}`);
        
        // 分析はHumanRelationshipAnalyzerに委譲
        const result = {
            approach: approach,
            inputType: inputType,
            usedLearnings: pastLearnings.length,
            timestamp: getJSTTimestamp()
        };
        
        // 経験を記録
        const experienceId = await this.recordExperience(inputType, approach, result);
        
        return {
            ...result,
            experienceId
        };
    }

    /**
     * 過去の成功パターンを取得
     */
    async getPastLearnings(pattern) {
        const db = await this.getDb();
        
        const learnings = await db.all(`
            SELECT * FROM simple_learning 
            WHERE input_pattern = ? AND success_score >= 7
            ORDER BY success_score DESC, created_at DESC 
            LIMIT 1
        `, [pattern]);
        
        await db.close();
        
        log(`📚 ${pattern}の学習データ: ${learnings.length}件`);
        return learnings;
    }

    /**
     * 分析経験を記録
     */
    async recordExperience(pattern, approach, result) {
        const db = await this.getDb();
        
        const res = await db.run(`
            INSERT INTO simple_learning 
            (input_pattern, analysis_approach)
            VALUES (?, ?)
        `, [pattern, approach]);
        
        await db.close();
        
        log(`💾 経験を記録 (ID: ${res.lastID})`);
        return res.lastID;
    }

    /**
     * フィードバックを受け取る
     */
    async receiveFeedback(experienceId, feedback) {
        const db = await this.getDb();
        
        // シンプルなスコア判定
        let score = 5;
        if (feedback.includes('良い') || feedback.includes('素晴らしい')) {
            score = 8;
        } else if (feedback.includes('悪い') || feedback.includes('問題')) {
            score = 3;
        }
        
        await db.run(`
            UPDATE simple_learning 
            SET user_feedback = ?, success_score = ?
            WHERE id = ?
        `, [feedback, score, experienceId]);
        
        await db.close();
        
        log(`📝 フィードバック記録 (スコア: ${score})`);
        
        return {
            experienceId,
            score,
            message: '次回の分析で活用されます'
        };
    }

    /**
     * 学習統計を取得
     */
    async getLearningStatistics() {
        const db = await this.getDb();
        
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_experiences,
                AVG(success_score) as avg_success_score,
                COUNT(DISTINCT input_pattern) as pattern_types
            FROM simple_learning
        `);
        
        await db.close();
        
        return {
            ...stats,
            timestamp: getJSTTimestamp()
        };
    }

    /**
     * デフォルトアプローチを取得
     */
    getDefaultApproach(inputType) {
        const approaches = {
            'meeting': '会議分析',
            'proposal': '提案分析',
            'personal': '個人分析',
            'general': '一般分析'
        };
        return approaches[inputType] || approaches['general'];
    }
}

module.exports = SimpleLearningSystem;