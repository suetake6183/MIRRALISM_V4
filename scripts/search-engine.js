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

// 設計書準拠：学習データ検索エンジンクラス
class LearningDataSearchEngine {
    constructor() {
        this.learningDbPath = path.join(__dirname, '..', 'database', 'learning.db');
        this.profilesDbPath = path.join(__dirname, '..', 'database', 'profiles.db');
        this.archiveDbPath = path.join(__dirname, '..', 'database', 'archive-index.db');
    }

    // 設計書準拠：包括的検索メソッド
    async search(query, options = {}) {
        const {
            category = null,
            dateFrom = null,
            dateTo = null,
            resultLimit = 20,
            searchType = 'all' // 'patterns', 'feedback', 'analysis', 'all'
        } = options;

        log('検索を開始します');
        log('検索クエリ: ' + query);
        
        const results = {
            patterns: [],
            feedback: [],
            analysis: [],
            fileTypes: [],
            methods: [],
            totalResults: 0,
            searchQuery: query,
            searchOptions: options,
            timestamp: getJSTTimestamp()
        };

        try {
            if (searchType === 'all' || searchType === 'patterns') {
                results.patterns = await this.searchLearningPatterns(query, { category, dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'feedback') {
                results.feedback = await this.searchFeedbackHistory(query, { dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'analysis') {
                results.analysis = await this.searchAnalysisResults(query, { dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'filetypes') {
                results.fileTypes = await this.searchFileTypeLearning(query, { dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'methods') {
                results.methods = await this.searchMethodEffectiveness(query, { dateFrom, dateTo, limit: resultLimit });
            }

            results.totalResults = results.patterns.length + results.feedback.length + 
                                 results.analysis.length + results.fileTypes.length + results.methods.length;

            log('検索完了: ' + results.totalResults + '件の結果');
            return results;

        } catch (error) {
            log('検索エラー: ' + error.message);
            return { ...results, error: error.message };
        }
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
                SELECT id, original_method, user_feedback, improved_method, created_at
                FROM feedback_history 
                WHERE 1=1
            `;
            const params = [];

            if (query && query.trim()) {
                sql += ` AND (original_method LIKE ? OR user_feedback LIKE ? OR improved_method LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'feedback_history',
                relevanceScore: this.calculateRelevance(query, row.user_feedback, row.improved_method)
            }));

        } catch (error) {
            log('フィードバック検索エラー: ' + error.message);
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
                SELECT id, analysis_id, result_section, original_conclusion, 
                       user_feedback, corrected_conclusion, feedback_type, created_at
                FROM analysis_results_feedback 
                WHERE 1=1
            `;
            const params = [];

            if (query && query.trim()) {
                sql += ` AND (original_conclusion LIKE ? OR user_feedback LIKE ? OR corrected_conclusion LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'analysis_result',
                relevanceScore: this.calculateRelevance(query, row.original_conclusion, row.corrected_conclusion)
            }));

        } catch (error) {
            log('分析結果検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：ファイル種別学習検索
    async searchFileTypeLearning(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, file_content_sample, llm_judgment, llm_reasoning, 
                       user_feedback, correct_type, is_correct, created_at
                FROM file_type_learning 
                WHERE 1=1
            `;
            const params = [];

            if (query && query.trim()) {
                sql += ` AND (llm_judgment LIKE ? OR llm_reasoning LIKE ? OR user_feedback LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'file_type_learning',
                relevanceScore: this.calculateRelevance(query, row.llm_reasoning, row.user_feedback)
            }));

        } catch (error) {
            log('ファイル種別検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：分析方法効果検索
    async searchMethodEffectiveness(query, options = {}) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT id, file_type, analysis_method, user_satisfaction_score, 
                       specific_feedback, created_at
                FROM analysis_method_effectiveness 
                WHERE 1=1
            `;
            const params = [];

            if (query && query.trim()) {
                sql += ` AND (file_type LIKE ? OR analysis_method LIKE ? OR specific_feedback LIKE ?)`;
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (options.dateFrom) {
                sql += ` AND created_at >= ?`;
                params.push(options.dateFrom);
            }
            if (options.dateTo) {
                sql += ` AND created_at <= ?`;
                params.push(options.dateTo);
            }

            sql += ` ORDER BY user_satisfaction_score DESC, created_at DESC`;
            
            if (options.limit) {
                sql += ` LIMIT ?`;
                params.push(options.limit);
            }

            const results = await db.all(sql, params);
            await db.close();

            return results.map(row => ({
                ...row,
                type: 'method_effectiveness',
                relevanceScore: this.calculateRelevance(query, row.analysis_method, row.specific_feedback)
            }));

        } catch (error) {
            log('分析方法検索エラー: ' + error.message);
            return [];
        }
    }

    // 設計書準拠：関連度計算
    calculateRelevance(query, text1, text2 = '') {
        if (!query || (!text1 && !text2)) return 0;

        const searchTerms = query.toLowerCase().split(/\s+/);
        const combinedText = (text1 + ' ' + text2).toLowerCase();
        
        let score = 0;
        searchTerms.forEach(term => {
            const occurrences = (combinedText.match(new RegExp(term, 'g')) || []).length;
            score += occurrences;
        });

        // 正規化（0-1の範囲）
        return Math.min(score / (searchTerms.length * 3), 1);
    }

    // 設計書準拠：カテゴリ別統計取得
    async getCategoryStats() {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            const stats = {
                patterns: await db.get('SELECT COUNT(*) as count FROM learning_patterns'),
                feedback: await db.get('SELECT COUNT(*) as count FROM feedback_history'),
                analysis: await db.get('SELECT COUNT(*) as count FROM analysis_results_feedback'),
                fileTypes: await db.get('SELECT COUNT(*) as count FROM file_type_learning'),
                methods: await db.get('SELECT COUNT(*) as count FROM analysis_method_effectiveness')
            };

            // カテゴリ分布
            const categoryDistribution = await db.all(`
                SELECT context, COUNT(*) as count 
                FROM learning_patterns 
                WHERE context IS NOT NULL 
                GROUP BY context 
                ORDER BY count DESC
            `);

            await db.close();

            return {
                ...stats,
                categoryDistribution,
                timestamp: getJSTTimestamp()
            };

        } catch (error) {
            log('統計取得エラー: ' + error.message);
            return { error: error.message };
        }
    }

    // 設計書準拠：成功パターン参照
    async getSuccessfulPatterns(fileType = null, limit = 10) {
        try {
            const db = await open({
                filename: this.learningDbPath,
                driver: sqlite3.Database
            });

            let sql = `
                SELECT pattern_description, pattern_details, context, success_count, 
                       last_used, created_at
                FROM learning_patterns 
                WHERE success_count > 1
            `;
            const params = [];

            if (fileType) {
                sql += ` AND context LIKE ?`;
                params.push(`%${fileType}%`);
            }

            sql += ` ORDER BY success_count DESC, last_used DESC LIMIT ?`;
            params.push(limit);

            const results = await db.all(sql, params);
            await db.close();

            log('成功パターン取得: ' + results.length + '件');
            return results;

        } catch (error) {
            log('成功パターン取得エラー: ' + error.message);
            return [];
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    LearningDataSearchEngine
};

// 設計書準拠：直接実行でのテスト
if (require.main === module) {
    const searchEngine = new LearningDataSearchEngine();
    
    // テスト検索実行
    async function testSearch() {
        log('検索エンジンテストを開始');
        
        const results = await searchEngine.search('meeting', {
            category: 'meeting',
            resultLimit: 5
        });
        
        log('検索結果:');
        console.log(JSON.stringify(results, null, 2));
        
        const stats = await searchEngine.getCategoryStats();
        log('カテゴリ統計:');
        console.log(JSON.stringify(stats, null, 2));
        
        const successPatterns = await searchEngine.getSuccessfulPatterns('meeting', 3);
        log('成功パターン:');
        console.log(JSON.stringify(successPatterns, null, 2));
    }
    
    testSearch();
}