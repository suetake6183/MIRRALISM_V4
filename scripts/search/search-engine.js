const { LearningDataSearchEngine } = require('./search-core');

// 設計書準拠：後方互換性維持のためのFacade
// 新しい検索エンジンへの委譲
const searchEngine = new LearningDataSearchEngine();

// 設計書準拠：既存APIとの互換性を維持
class LearningDataSearchEngineFacade {
    constructor() {
        this.engine = searchEngine;
    }

    // 全てのメソッドを新しい検索エンジンに委譲
    async search(query, options = {}) {
        return await this.engine.search(query, options);
    }

    async searchLearningPatterns(query, options = {}) {
        return await this.engine.searchLearningPatterns(query, options);
    }

    async searchFeedbackHistory(query, options = {}) {
        return await this.engine.searchFeedbackHistory(query, options);
    }

    async searchAnalysisResults(query, options = {}) {
        return await this.engine.searchAnalysisResults(query, options);
    }

    async searchFileTypeLearning(query, options = {}) {
        return await this.engine.searchFileTypeLearning(query, options);
    }

    async searchMethodEffectiveness(query, options = {}) {
        return await this.engine.searchMethodEffectiveness(query, options);
    }

    async getCategoryStats() {
        return await this.engine.getCategoryStats();
    }

    async getSuccessfulPatterns(fileType = null, limit = 10) {
        return await this.engine.getSuccessfulPatterns(fileType, limit);
    }

    calculateRelevance(query, ...texts) {
        return this.engine.calculateRelevance(query, ...texts);
    }

    formatSearchResults(results) {
        return this.engine.formatSearchResults(results);
    }

    async getSearchStats() {
        return await this.engine.getSearchStats();
    }
}

// 設計書準拠：エクスポート（既存のAPIを維持）
module.exports = {
    LearningDataSearchEngine: LearningDataSearchEngineFacade
};

// 設計書準拠：直接実行時のテスト（既存コードとの互換性保持）
if (require.main === module) {
    const { log } = require('../shared/logger');
    
    async function testSearch() {
        log('MIRRALISM V4 - 検索エンジンテスト');
        log('設計書準拠版（分割構造対応）');
        
        const searchEngine = new LearningDataSearchEngineFacade();
        
        try {
            log('');
            log('=== 包括的検索テスト ===');
            const results = await searchEngine.search('分析', {
                category: 'meeting',
                resultLimit: 5
            });
            
            log('検索結果: ' + results.totalResults + '件');
            
            if (results.patterns.length > 0) {
                log('学習パターン例: ' + results.patterns[0].pattern_description);
            }
            
            log('');
            log('=== カテゴリ統計テスト ===');
            const stats = await searchEngine.getCategoryStats();
            log('カテゴリ数: ' + stats.length);
            
            log('');
            log('=== 成功パターンテスト ===');
            const patterns = await searchEngine.getSuccessfulPatterns('meeting', 3);
            log('成功パターン数: ' + patterns.length);
            
            log('');
            log('検索エンジンテスト完了');
            
        } catch (error) {
            log('テストエラー: ' + error.message);
        }
    }
    
    testSearch();
}