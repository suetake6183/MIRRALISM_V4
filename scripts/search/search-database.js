const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：検索データベース操作クラス
class SearchDatabaseManager {
    constructor() {
        this.learningDbPath = path.join(__dirname, '..', '..', 'database', 'learning.db');
        this.profilesDbPath = path.join(__dirname, '..', '..', 'database', 'profiles.db');
        this.archiveDbPath = path.join(__dirname, '..', '..', 'database', 'archive-index.db');
    }

    // 設計書準拠：学習パターン検索
    async searchLearningPatterns(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, pattern_description, pattern_details, context, success_count, 
                       created_at, last_used
                FROM learning_patterns 
                WHERE 1=1
            `;
            const params = [];

            // キーワード検索
            if (query && query.trim()) {
                sql += ` AND (pattern_description LIKE ? OR pattern_details LIKE ? OR context LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // カテゴリフィルター
            if (options.category) {
                sql += ` AND context LIKE ?`;
                params.push(`%${options.category}%`);
            }

            // 日付フィルター
            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY success_count DESC, created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'learning_pattern',
                relevanceScore: this.calculateRelevance(query, row.pattern_description, row.pattern_details)
            }));

        } catch (error) {
            log('学習パターン検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：フィードバック履歴検索
    async searchFeedbackHistory(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, feedback_content, analysis_context, satisfaction_score, 
                       improvement_suggestions, created_at
                FROM feedback_history 
                WHERE 1=1
            `;
            const params = [];

            // キーワード検索
            if (query && query.trim()) {
                sql += ` AND (feedback_content LIKE ? OR analysis_context LIKE ? OR improvement_suggestions LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // 日付フィルター
            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY satisfaction_score DESC, created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'feedback',
                relevanceScore: this.calculateRelevance(query, row.feedback_content, row.improvement_suggestions)
            }));

        } catch (error) {
            log('フィードバック履歴検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：分析結果検索
    async searchAnalysisResults(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, analysis_summary, key_insights, file_type, analysis_method, 
                       confidence_score, created_at
                FROM analysis_results 
                WHERE 1=1
            `;
            const params = [];

            // キーワード検索
            if (query && query.trim()) {
                sql += ` AND (analysis_summary LIKE ? OR key_insights LIKE ? OR analysis_method LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // 日付フィルター
            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY confidence_score DESC, created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'analysis_result',
                relevanceScore: this.calculateRelevance(query, row.analysis_summary, row.key_insights)
            }));

        } catch (error) {
            log('分析結果検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：ファイルタイプ学習検索
    async searchFileTypeLearning(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, file_type, learning_content, success_indicators, 
                       failure_patterns, accuracy_score, created_at
                FROM file_type_learning 
                WHERE 1=1
            `;
            const params = [];

            // キーワード検索
            if (query && query.trim()) {
                sql += ` AND (file_type LIKE ? OR learning_content LIKE ? OR success_indicators LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // 日付フィルター
            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY accuracy_score DESC, created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'file_type_learning',
                relevanceScore: this.calculateRelevance(query, row.file_type, row.learning_content)
            }));

        } catch (error) {
            log('ファイルタイプ学習検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：メソッド効果測定検索
    async searchMethodEffectiveness(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, method_name, effectiveness_score, usage_count, 
                       success_contexts, optimization_notes, created_at
                FROM method_effectiveness 
                WHERE 1=1
            `;
            const params = [];

            // キーワード検索
            if (query && query.trim()) {
                sql += ` AND (method_name LIKE ? OR success_contexts LIKE ? OR optimization_notes LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // 日付フィルター
            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY effectiveness_score DESC, usage_count DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'method_effectiveness',
                relevanceScore: this.calculateRelevance(query, row.method_name, row.success_contexts)
            }));

        } catch (error) {
            log('メソッド効果測定検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：カテゴリ統計取得
    async getCategoryStats() {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            const stats = await db.all(`
                SELECT 
                    context as category,
                    COUNT(*) as pattern_count,
                    AVG(success_count) as avg_success,
                    MAX(created_at) as latest_update
                FROM learning_patterns 
                GROUP BY context
                ORDER BY pattern_count DESC
            `);

            await db.close();
            return stats;

        } catch (error) {
            log('カテゴリ統計取得エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：成功パターン取得
    async getSuccessfulPatterns(fileType = null, limit = 10) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT pattern_description, pattern_details, success_count, context
                FROM learning_patterns 
                WHERE success_count > 0
            `;
            const params = [];

            if (fileType) {
                sql += ` AND context LIKE ?`;
                params.push(`%${fileType}%`);
            }

            sql += ` ORDER BY success_count DESC LIMIT ?`;
            params.push(limit);

            const patterns = await db.all(sql, params);
            await db.close();

            return patterns;

        } catch (error) {
            log('成功パターン取得エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：関連性スコア計算
    calculateRelevance(query, ...texts) {
        if (!query || !query.trim()) return 0.5;

        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/);
        
        let totalRelevance = 0;
        let textCount = 0;

        for (const text of texts) {
            if (!text) continue;
            
            const textLower = text.toLowerCase();
            let textRelevance = 0;

            for (const term of queryTerms) {
                if (textLower.includes(term)) {
                    textRelevance += term.length / text.length;
                }
            }

            totalRelevance += textRelevance;
            textCount++;
        }

        return textCount > 0 ? Math.min(totalRelevance / textCount, 1.0) : 0;
    }
}

// 設計書準拠：エクスポート
module.exports = {
    SearchDatabaseManager
};