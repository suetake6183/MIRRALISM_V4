const elasticlunr = require('elasticlunr');
const NodeCache = require('node-cache');
const { LearningDataSearchEngine } = require('./search-engine');

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

// 設計書準拠：拡張検索システムクラス（APIなし）
class EnhancedSearchSystem {
    constructor() {
        // 既存のSQLite検索エンジン
        this.sqliteSearch = new LearningDataSearchEngine();
        
        // elasticlunr全文検索インデックス
        this.index = elasticlunr(function() {
            this.addField('content');
            this.addField('description');
            this.addField('context');
            this.setRef('id');
        });
        
        // node-cacheキャッシュシステム（TTL: 600秒）
        this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
        
        this.indexBuilt = false;
    }

    // 設計書準拠：検索インデックス構築
    async buildSearchIndex() {
        log('全文検索インデックスを構築中...');
        
        try {
            // SQLiteから全データ取得
            const allData = await this.sqliteSearch.search('', {
                searchType: 'all',
                resultLimit: 1000
            });
            
            let documentId = 0;
            
            // 学習パターンのインデックス化
            allData.patterns.forEach(pattern => {
                this.index.addDoc({
                    id: `pattern_${pattern.id}`,
                    content: pattern.pattern_description + ' ' + (pattern.pattern_details || ''),
                    description: pattern.pattern_description,
                    context: pattern.context || ''
                });
                documentId++;
            });
            
            // フィードバックのインデックス化
            allData.feedback.forEach(feedback => {
                this.index.addDoc({
                    id: `feedback_${feedback.id}`,
                    content: feedback.user_feedback + ' ' + feedback.improved_method,
                    description: feedback.user_feedback,
                    context: 'feedback'
                });
                documentId++;
            });
            
            // 分析結果のインデックス化
            allData.analysis.forEach(analysis => {
                this.index.addDoc({
                    id: `analysis_${analysis.id}`,
                    content: analysis.original_conclusion + ' ' + analysis.corrected_conclusion,
                    description: analysis.original_conclusion,
                    context: analysis.result_section || ''
                });
                documentId++;
            });
            
            this.indexBuilt = true;
            log('インデックス構築完了: ' + documentId + '件のドキュメント');
            
            // インデックスをキャッシュに保存
            this.cache.set('search_index', this.index.toJSON());
            
        } catch (error) {
            log('インデックス構築エラー: ' + error.message);
        }
    }

    // 設計書準拠：ハイブリッド検索（elasticlunr + SQLite）
    async hybridSearch(query, options = {}) {
        const cacheKey = `search_${query}_${JSON.stringify(options)}`;
        
        // キャッシュチェック
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            log('キャッシュから検索結果を取得');
            return cachedResult;
        }
        
        log('ハイブリッド検索を実行: ' + query);
        const startTime = Date.now();
        
        // インデックスが未構築の場合は構築
        if (!this.indexBuilt) {
            await this.buildSearchIndex();
        }
        
        try {
            // 1. elasticlunrによる全文検索
            const elasticResults = this.index.search(query, {
                fields: {
                    content: { boost: 1 },
                    description: { boost: 2 },
                    context: { boost: 1.5 }
                },
                expand: true
            });
            
            // 2. SQLiteによる構造化検索
            const sqliteResults = await this.sqliteSearch.search(query, options);
            
            // 3. 結果の統合とスコアリング
            const mergedResults = this.mergeSearchResults(elasticResults, sqliteResults);
            
            // 4. LLM学習データに基づくリランキング
            const rankedResults = await this.rerankByLearningData(mergedResults, query);
            
            const hybridResult = {
                query: query,
                options: options,
                totalResults: rankedResults.length,
                results: rankedResults,
                searchTime: Date.now() - startTime,
                searchMethod: 'hybrid',
                timestamp: getJSTTimestamp()
            };
            
            // 結果をキャッシュに保存
            this.cache.set(cacheKey, hybridResult);
            
            log('ハイブリッド検索完了: ' + rankedResults.length + '件 (' + (Date.now() - startTime) + 'ms)');
            return hybridResult;
            
        } catch (error) {
            log('ハイブリッド検索エラー: ' + error.message);
            return {
                query: query,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：検索結果統合
    mergeSearchResults(elasticResults, sqliteResults) {
        const merged = new Map();
        
        // elasticlunr結果の処理
        elasticResults.forEach((result, index) => {
            merged.set(result.ref, {
                id: result.ref,
                score: result.score * 2, // elasticlunrスコアを重視
                elasticRank: index + 1,
                source: 'elastic'
            });
        });
        
        // SQLite結果の統合
        const allSqliteResults = [
            ...sqliteResults.patterns.map(p => ({ ...p, type: 'pattern' })),
            ...sqliteResults.feedback.map(f => ({ ...f, type: 'feedback' })),
            ...sqliteResults.analysis.map(a => ({ ...a, type: 'analysis' }))
        ];
        
        allSqliteResults.forEach((result, index) => {
            const id = `${result.type}_${result.id}`;
            if (merged.has(id)) {
                // 既存結果のスコア更新
                const existing = merged.get(id);
                existing.score += result.relevanceScore || 0.5;
                existing.sqliteRank = index + 1;
                existing.data = result;
            } else {
                // 新規結果の追加
                merged.set(id, {
                    id: id,
                    score: result.relevanceScore || 0.5,
                    sqliteRank: index + 1,
                    data: result,
                    source: 'sqlite'
                });
            }
        });
        
        // スコアでソートして配列に変換
        return Array.from(merged.values())
            .sort((a, b) => b.score - a.score);
    }

    // 設計書準拠：学習データに基づくリランキング
    async rerankByLearningData(results, query) {
        try {
            // 成功パターンを取得
            const successPatterns = await this.sqliteSearch.getSuccessfulPatterns();
            
            // 成功パターンに含まれる結果のスコアを上昇
            results.forEach(result => {
                if (result.data && result.data.success_count > 5) {
                    result.score *= 1.5; // 成功回数が多いパターンを優遇
                }
                
                // 最近使用されたパターンも優遇
                if (result.data && result.data.last_used) {
                    const daysSinceUsed = (Date.now() - new Date(result.data.last_used)) / (1000 * 60 * 60 * 24);
                    if (daysSinceUsed < 7) {
                        result.score *= 1.2;
                    }
                }
            });
            
            // 再ソート
            return results.sort((a, b) => b.score - a.score);
            
        } catch (error) {
            log('リランキングエラー: ' + error.message);
            return results;
        }
    }

    // 設計書準拠：キャッシュ統計取得
    getCacheStats() {
        return {
            keys: this.cache.keys(),
            stats: this.cache.getStats(),
            timestamp: getJSTTimestamp()
        };
    }

    // 設計書準拠：キャッシュクリア
    clearCache() {
        this.cache.flushAll();
        log('キャッシュをクリアしました');
    }

    // 設計書準拠：インデックス再構築
    async rebuildIndex() {
        this.indexBuilt = false;
        this.index = elasticlunr(function() {
            this.addField('content');
            this.addField('description');
            this.addField('context');
            this.setRef('id');
        });
        await this.buildSearchIndex();
    }
}

// 設計書準拠：エクスポート
module.exports = {
    EnhancedSearchSystem
};

// 設計書準拠：直接実行でのテスト
if (require.main === module) {
    const enhancedSearch = new EnhancedSearchSystem();
    
    async function testEnhancedSearch() {
        log('拡張検索システムテストを開始');
        
        // インデックス構築
        await enhancedSearch.buildSearchIndex();
        
        // ハイブリッド検索テスト
        const results = await enhancedSearch.hybridSearch('分析', {
            category: 'meeting',
            resultLimit: 10
        });
        
        log('\n検索結果:');
        log('総件数: ' + results.totalResults);
        log('検索時間: ' + results.searchTime + 'ms');
        
        if (results.results && results.results.length > 0) {
            log('\n上位3件:');
            results.results.slice(0, 3).forEach((result, index) => {
                log((index + 1) + '. ID: ' + result.id + ', スコア: ' + result.score.toFixed(3));
            });
        }
        
        // キャッシュ統計
        const cacheStats = enhancedSearch.getCacheStats();
        log('\nキャッシュ統計:');
        log('キー数: ' + cacheStats.keys.length);
        log('ヒット数: ' + cacheStats.stats.hits);
        log('ミス数: ' + cacheStats.stats.misses);
    }
    
    testEnhancedSearch();
}