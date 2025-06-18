const { log, getJSTTimestamp } = require('../shared/logger');
const { SearchDatabaseManager } = require('./search-database');

// 設計書準拠：学習データ検索エンジンクラス
class LearningDataSearchEngine {
    constructor() {
        this.dbManager = new SearchDatabaseManager();
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
                results.patterns = await this.dbManager.searchLearningPatterns(query, { category, dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'feedback') {
                results.feedback = await this.dbManager.searchFeedbackHistory(query, { dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'analysis') {
                results.analysis = await this.dbManager.searchAnalysisResults(query, { dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'fileTypes') {
                results.fileTypes = await this.dbManager.searchFileTypeLearning(query, { dateFrom, dateTo, limit: resultLimit });
            }

            if (searchType === 'all' || searchType === 'methods') {
                results.methods = await this.dbManager.searchMethodEffectiveness(query, { dateFrom, dateTo, limit: resultLimit });
            }

            // 総結果数の計算
            results.totalResults = results.patterns.length + results.feedback.length + 
                                 results.analysis.length + results.fileTypes.length + results.methods.length;

            log('検索完了: ' + results.totalResults + '件の結果');
            
            return results;

        } catch (error) {
            log('検索処理エラー: ' + error.message);
            return results;
        }
    }

    // 設計書準拠：学習パターン検索（直接アクセス）
    async searchLearningPatterns(query, options = {}) {
        return await this.dbManager.searchLearningPatterns(query, options);
    }

    // 設計書準拠：フィードバック履歴検索（直接アクセス）
    async searchFeedbackHistory(query, options = {}) {
        return await this.dbManager.searchFeedbackHistory(query, options);
    }

    // 設計書準拠：分析結果検索（直接アクセス）
    async searchAnalysisResults(query, options = {}) {
        return await this.dbManager.searchAnalysisResults(query, options);
    }

    // 設計書準拠：ファイルタイプ学習検索（直接アクセス）
    async searchFileTypeLearning(query, options = {}) {
        return await this.dbManager.searchFileTypeLearning(query, options);
    }

    // 設計書準拠：メソッド効果測定検索（直接アクセス）
    async searchMethodEffectiveness(query, options = {}) {
        return await this.dbManager.searchMethodEffectiveness(query, options);
    }

    // 設計書準拠：カテゴリ統計取得
    async getCategoryStats() {
        return await this.dbManager.getCategoryStats();
    }

    // 設計書準拠：成功パターン取得
    async getSuccessfulPatterns(fileType = null, limit = 10) {
        return await this.dbManager.getSuccessfulPatterns(fileType, limit);
    }

    // 設計書準拠：関連性スコア計算
    calculateRelevance(query, ...texts) {
        return this.dbManager.calculateRelevance(query, ...texts);
    }

    // 設計書準拠：検索結果のフォーマット
    formatSearchResults(results) {
        const formatted = {
            summary: {
                totalResults: results.totalResults,
                query: results.searchQuery,
                timestamp: results.timestamp
            },
            categories: {
                patterns: {
                    count: results.patterns.length,
                    items: results.patterns.slice(0, 5) // 上位5件のプレビュー
                },
                feedback: {
                    count: results.feedback.length,
                    items: results.feedback.slice(0, 5)
                },
                analysis: {
                    count: results.analysis.length,
                    items: results.analysis.slice(0, 5)
                },
                fileTypes: {
                    count: results.fileTypes.length,
                    items: results.fileTypes.slice(0, 5)
                },
                methods: {
                    count: results.methods.length,
                    items: results.methods.slice(0, 5)
                }
            }
        };

        return formatted;
    }

    // 設計書準拠：検索統計情報の取得
    async getSearchStats() {
        try {
            const categoryStats = await this.getCategoryStats();
            const successfulPatterns = await this.getSuccessfulPatterns(null, 5);

            return {
                categoryDistribution: categoryStats,
                topPatterns: successfulPatterns,
                lastUpdated: getJSTTimestamp()
            };

        } catch (error) {
            log('検索統計取得エラー: ' + error.message);
            return {
                categoryDistribution: [],
                topPatterns: [],
                lastUpdated: getJSTTimestamp()
            };
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    LearningDataSearchEngine
};