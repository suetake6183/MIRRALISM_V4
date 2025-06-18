const { LearningDataSearchEngine } = require('./search-engine');
const { AnalysisReferenceSystem } = require('./reference-system');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：統合検索インターフェースクラス
class IntegratedSearchInterface {
    constructor() {
        this.searchEngine = new LearningDataSearchEngine();
        this.referenceSystem = new AnalysisReferenceSystem();
    }

    // 設計書準拠：包括的検索実行
    async performComprehensiveSearch(query, options = {}) {
        log('包括的検索を開始: ' + query);
        
        const startTime = Date.now();
        
        try {
            // 1. 基本検索実行
            const searchResults = await this.searchEngine.search(query, options);
            
            // 2. 関連パターン取得
            const relatedPatterns = await this.referenceSystem.findRelatedPatterns(query, {
                limit: 5,
                category: options.category
            });
            
            // 3. カテゴリが指定されている場合は参照パターンも取得
            let referencePatterns = null;
            if (options.category && options.category !== 'all') {
                referencePatterns = await this.referenceSystem.getReferencePatternsForFileType(
                    options.category, 
                    query
                );
            }
            
            // 4. 統計情報取得
            const stats = await this.searchEngine.getCategoryStats();
            
            const comprehensiveResults = {
                query: query,
                options: options,
                searchResults: searchResults,
                relatedPatterns: relatedPatterns,
                referencePatterns: referencePatterns,
                systemStats: stats,
                executionTime: Date.now() - startTime,
                timestamp: getJSTTimestamp()
            };
            
            log('包括的検索完了: ' + (Date.now() - startTime) + 'ms');
            return comprehensiveResults;
            
        } catch (error) {
            log('包括的検索エラー: ' + error.message);
            return {
                query: query,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：クイック検索（高速版）
    async performQuickSearch(query, category = null) {
        log('クイック検索: ' + query);
        
        try {
            const options = {
                category: category,
                resultLimit: 10,
                searchType: 'patterns'
            };
            
            const results = await this.searchEngine.search(query, options);
            
            return {
                query: query,
                category: category,
                totalResults: results.totalResults,
                patterns: results.patterns,
                quickMode: true,
                timestamp: getJSTTimestamp()
            };
            
        } catch (error) {
            log('クイック検索エラー: ' + error.message);
            return {
                query: query,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：分析支援検索
    async searchForAnalysisSupport(fileType, context = '') {
        log('分析支援検索を開始: ' + fileType);
        
        try {
            // 1. 該当ファイル種別の成功パターン取得
            const successPatterns = await this.searchEngine.getSuccessfulPatterns(fileType, 10);
            
            // 2. 参照パターン取得
            const referencePatterns = await this.referenceSystem.getReferencePatternsForFileType(fileType, context);
            
            // 3. 関連する高評価方法取得
            const methodSearch = await this.searchEngine.searchMethodEffectiveness('', {
                category: fileType,
                resultLimit: 5
            });
            
            // 4. 文脈キーワードがある場合の関連検索
            let contextualResults = [];
            if (context.trim()) {
                const contextSearch = await this.performQuickSearch(context, fileType);
                contextualResults = contextSearch.patterns || [];
            }
            
            const analysisSupport = {
                fileType: fileType,
                context: context,
                successPatterns: successPatterns,
                referencePatterns: referencePatterns,
                highRatedMethods: methodSearch,
                contextualPatterns: contextualResults,
                recommendations: this.generateAnalysisRecommendations(fileType, successPatterns, referencePatterns),
                timestamp: getJSTTimestamp()
            };
            
            log('分析支援検索完了');
            return analysisSupport;
            
        } catch (error) {
            log('分析支援検索エラー: ' + error.message);
            return {
                fileType: fileType,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：分析推奨事項生成
    generateAnalysisRecommendations(fileType, successPatterns, referencePatterns) {
        const recommendations = [];
        
        // 成功パターンからの推奨
        if (successPatterns.length > 0) {
            const topPattern = successPatterns[0];
            recommendations.push({
                type: 'success_pattern',
                title: '最も成功しているアプローチ',
                content: topPattern.pattern_description,
                confidence: this.calculatePatternConfidence(topPattern),
                usage_count: topPattern.success_count
            });
        }
        
        // 参照パターンからの推奨
        if (referencePatterns && referencePatterns.recommendedApproach) {
            recommendations.push({
                type: 'recommended_approach',
                title: '推奨分析アプローチ',
                content: referencePatterns.recommendedApproach.primary,
                reasoning: referencePatterns.recommendedApproach.reasoning,
                confidence: referencePatterns.recommendedApproach.confidence
            });
        }
        
        // 改善提案
        if (successPatterns.length > 1) {
            recommendations.push({
                type: 'alternative_approach',
                title: '代替アプローチ',
                content: successPatterns[1].pattern_description,
                context: successPatterns[1].context,
                usage_count: successPatterns[1].success_count
            });
        }
        
        return recommendations;
    }

    // 設計書準拠：パターン信頼度計算
    calculatePatternConfidence(pattern) {
        // 使用回数と最終使用日時から信頼度を算出
        const usageScore = Math.min(pattern.success_count / 20, 1); // 20回使用で最大スコア
        const freshnessScore = this.calculateFreshnessScore(pattern.last_used);
        
        return (usageScore * 0.7 + freshnessScore * 0.3);
    }

    // 設計書準拠：最新度スコア計算
    calculateFreshnessScore(lastUsed) {
        const now = new Date();
        const lastUsedDate = new Date(lastUsed);
        const daysDiff = (now - lastUsedDate) / (1000 * 60 * 60 * 24);
        
        // 7日以内なら最高スコア、30日以降は最低スコア
        return Math.max(0, Math.min(1, (30 - daysDiff) / 30));
    }

    // 設計書準拠：学習進捗ダッシュボード
    async generateLearningDashboard() {
        log('学習進捗ダッシュボードを生成');
        
        try {
            // 1. 基本統計
            const stats = await this.searchEngine.getCategoryStats();
            
            // 2. 学習履歴分析
            const learningHistory = await this.referenceSystem.analyzeLearningHistory(7);
            
            // 3. 各カテゴリの成功パターン
            const categoryPatterns = {};
            const categories = ['meeting', 'personal', 'proposal', 'unknown'];
            
            for (const category of categories) {
                const patterns = await this.searchEngine.getSuccessfulPatterns(category, 3);
                categoryPatterns[category] = patterns;
            }
            
            // 4. 最近の活動
            const recentActivity = await this.searchEngine.search('', {
                searchType: 'all',
                resultLimit: 10,
                dateFrom: this.getDateXDaysAgo(3)
            });
            
            const dashboard = {
                overview: {
                    totalPatterns: stats.patterns.count,
                    totalFileTypes: stats.fileTypes.count,
                    totalMethods: stats.methods.count,
                    accuracyRate: learningHistory.analysisAccuracy
                },
                categoryBreakdown: stats.categoryDistribution,
                learningTrends: learningHistory.categoryTrends,
                improvementAreas: learningHistory.improvementAreas,
                successPatterns: categoryPatterns,
                recentActivity: recentActivity,
                generatedAt: getJSTTimestamp()
            };
            
            log('ダッシュボード生成完了');
            return dashboard;
            
        } catch (error) {
            log('ダッシュボード生成エラー: ' + error.message);
            return {
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：日付計算ヘルパー
    getDateXDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0] + ' 00:00:00';
    }

    // 設計書準拠：検索インデックス最適化
    async optimizeSearchIndex() {
        log('検索インデックス最適化を開始');
        
        try {
            // SQLiteのVACUUMとANALYZE実行でインデックス最適化
            const sqlite3 = require('sqlite3').verbose();
            const { open } = require('sqlite');
            
            const db = await open({
                filename: this.searchEngine.learningDbPath,
                driver: sqlite3.Database
            });
            
            await db.run('VACUUM');
            await db.run('ANALYZE');
            
            await db.close();
            
            log('検索インデックス最適化完了');
            return {
                optimized: true,
                timestamp: getJSTTimestamp()
            };
            
        } catch (error) {
            log('インデックス最適化エラー: ' + error.message);
            return {
                optimized: false,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    IntegratedSearchInterface
};

// 設計書準拠：直接実行でのテスト
if (require.main === module) {
    const searchInterface = new IntegratedSearchInterface();
    
    // テスト実行
    async function testSearchInterface() {
        log('統合検索インターフェーステストを開始');
        
        // 1. 包括的検索テスト
        const comprehensiveResults = await searchInterface.performComprehensiveSearch('meeting', {
            category: 'meeting',
            resultLimit: 5
        });
        log('\n包括的検索結果: ' + comprehensiveResults.searchResults.totalResults + '件');
        
        // 2. 分析支援検索テスト
        const analysisSupport = await searchInterface.searchForAnalysisSupport('meeting', 'プロジェクト');
        log('分析支援: ' + analysisSupport.successPatterns.length + '件の成功パターン');
        
        // 3. ダッシュボード生成テスト
        const dashboard = await searchInterface.generateLearningDashboard();
        log('ダッシュボード: ' + dashboard.overview.totalPatterns + '件のパターン');
        
        // 4. インデックス最適化テスト
        const optimization = await searchInterface.optimizeSearchIndex();
        log('最適化: ' + (optimization.optimized ? '成功' : '失敗'));
    }
    
    testSearchInterface();
}