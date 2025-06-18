const fs = require('fs').promises;
const path = require('path');
const { LearningDataSearchEngine } = require('./search-engine');
const { log, getJSTTimestamp } = require('../shared/logger');

// 設計書準拠：分析結果参照システムクラス
class AnalysisReferenceSystem {
    constructor() {
        this.searchEngine = new LearningDataSearchEngine();
    }

    // 設計書準拠：ファイル種別に基づく成功パターン参照
    async getReferencePatternsForFileType(fileType, analysisContext = '') {
        log('成功パターン参照を開始: ' + fileType);
        
        try {
            // 1. 同種別の成功パターン取得
            const successPatterns = await this.searchEngine.getSuccessfulPatterns(fileType, 5);
            
            // 2. 関連する分析方法効果データ取得
            const methodEffectiveness = await this.searchEngine.searchMethodEffectiveness('', {
                category: fileType,
                resultLimit: 5
            });
            const methods = methodEffectiveness || [];
            
            // 3. 文脈に基づく追加検索
            let contextualResults = [];
            if (analysisContext.trim()) {
                const contextSearch = await this.searchEngine.search(analysisContext, {
                    category: fileType,
                    searchType: 'patterns',
                    resultLimit: 3
                });
                contextualResults = contextSearch.patterns;
            }

            // 4. ファイル種別学習データから成功事例取得
            const learningExamples = await this.searchEngine.searchFileTypeLearning('', {
                category: fileType,
                resultLimit: 3
            });

            const references = {
                fileType: fileType,
                analysisContext: analysisContext,
                successPatterns: successPatterns,
                methodEffectiveness: methods,
                contextualPatterns: contextualResults,
                learningExamples: learningExamples.filter(ex => ex.is_correct),
                recommendedApproach: this.generateRecommendedApproach(fileType, successPatterns, methods),
                timestamp: getJSTTimestamp()
            };

            log('参照パターン生成完了: ' + (successPatterns.length + methods.length) + '件');
            return references;

        } catch (error) {
            log('参照パターン取得エラー: ' + error.message);
            return {
                fileType: fileType,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：推奨分析アプローチ生成
    generateRecommendedApproach(fileType, successPatterns, methodData) {
        if (!successPatterns.length && !methodData.length) {
            return this.getDefaultApproach(fileType);
        }

        // 最も成功したパターンを基準に推奨アプローチを生成
        const topPattern = successPatterns[0];
        const topMethod = methodData.find(m => m.user_satisfaction_score >= 4);

        let approach = {
            primary: topPattern ? topPattern.pattern_description : this.getDefaultApproach(fileType).primary,
            reasoning: `過去の成功パターン（使用回数: ${topPattern ? topPattern.success_count : 0}回）に基づく推奨`,
            confidence: this.calculateConfidence(successPatterns, methodData),
            adaptations: []
        };

        // 高評価の分析方法がある場合は追加提案
        if (topMethod) {
            approach.adaptations.push({
                suggestion: topMethod.analysis_method,
                reason: `ユーザー満足度${topMethod.user_satisfaction_score}/5の実績`,
                feedback: topMethod.specific_feedback
            });
        }

        // 学習パターンから改善提案生成
        if (successPatterns.length > 1) {
            const variations = successPatterns.slice(1, 3).map(pattern => ({
                alternative: pattern.pattern_description,
                usageContext: pattern.context,
                successRate: pattern.success_count
            }));
            approach.alternatives = variations;
        }

        return approach;
    }

    // 設計書準拠：信頼度計算
    calculateConfidence(patterns, methods) {
        const patternWeight = patterns.reduce((sum, p) => sum + p.success_count, 0);
        const methodWeight = methods.reduce((sum, m) => sum + (m.user_satisfaction_score || 0), 0);
        
        // 正規化して0-1の信頼度を算出
        const totalEvidence = patterns.length + methods.length;
        const weightedScore = (patternWeight + methodWeight) / Math.max(totalEvidence * 10, 1);
        
        return Math.min(weightedScore, 1);
    }

    // 設計書準拠：デフォルトアプローチ定義
    getDefaultApproach(fileType) {
        const defaults = {
            meeting: {
                primary: '1. 参加者の抽出\n2. 発言内容の分析\n3. 決定事項の整理',
                reasoning: 'meeting分析の標準アプローチ'
            },
            personal: {
                primary: '1. 主要テーマの抽出\n2. 感情や気づきの分析\n3. 次のアクションの提案',
                reasoning: 'personal分析の標準アプローチ'
            },
            proposal: {
                primary: '1. 提案内容の要約\n2. 関係者の整理\n3. 次のステップの明確化',
                reasoning: 'proposal分析の標準アプローチ'
            },
            unknown: {
                primary: '1. 内容の分類\n2. 主要要素の抽出\n3. 適切な分析方法の提案',
                reasoning: 'unknown分析の標準アプローチ'
            }
        };

        return defaults[fileType] || defaults.unknown;
    }

    // 設計書準拠：関連パターン検索
    async findRelatedPatterns(keyword, options = {}) {
        log('関連パターン検索: ' + keyword);
        
        try {
            const searchResults = await this.searchEngine.search(keyword, {
                searchType: 'patterns',
                resultLimit: options.limit || 10,
                category: options.category,
                dateFrom: options.dateFrom,
                dateTo: options.dateTo
            });

            // 関連度でソートして返却
            const sortedPatterns = searchResults.patterns.sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            return {
                keyword: keyword,
                totalFound: sortedPatterns.length,
                patterns: sortedPatterns,
                searchOptions: options,
                timestamp: getJSTTimestamp()
            };

        } catch (error) {
            log('関連パターン検索エラー: ' + error.message);
            return {
                keyword: keyword,
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：学習履歴分析
    async analyzeLearningHistory(dateRange = 7) {
        log('学習履歴分析を開始');
        
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - dateRange);

            const dateFrom = startDate.toISOString().split('T')[0];
            const dateTo = endDate.toISOString().split('T')[0];

            // 期間内の全データ取得
            const allResults = await this.searchEngine.search('', {
                searchType: 'all',
                dateFrom: dateFrom + ' 00:00:00',
                dateTo: dateTo + ' 23:59:59',
                resultLimit: 100
            });

            // 学習傾向分析
            const analysis = {
                period: `${dateFrom} から ${dateTo}`,
                totalActivities: allResults.totalResults,
                patternGrowth: allResults.patterns.length,
                feedbackVolume: allResults.feedback.length,
                analysisAccuracy: this.calculateAccuracy(allResults.fileTypes),
                categoryTrends: this.analyzeCategoryTrends(allResults),
                improvementAreas: this.identifyImprovementAreas(allResults),
                timestamp: getJSTTimestamp()
            };

            log('学習履歴分析完了');
            return analysis;

        } catch (error) {
            log('学習履歴分析エラー: ' + error.message);
            return {
                error: error.message,
                timestamp: getJSTTimestamp()
            };
        }
    }

    // 設計書準拠：分析精度計算
    calculateAccuracy(fileTypeData) {
        const totalJudgments = fileTypeData.length;
        const correctJudgments = fileTypeData.filter(item => item.is_correct).length;
        
        return totalJudgments > 0 ? (correctJudgments / totalJudgments) : 0;
    }

    // 設計書準拠：カテゴリトレンド分析
    analyzeCategoryTrends(results) {
        const categories = {};
        
        // 各データタイプからカテゴリを集計
        results.patterns.forEach(p => {
            const cat = p.context || 'unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        results.fileTypes.forEach(ft => {
            const cat = ft.llm_judgment || 'unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        // 活動量でソート
        return Object.entries(categories)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
    }

    // 設計書準拠：改善領域特定
    identifyImprovementAreas(results) {
        const improvements = [];

        // 精度が低い領域の特定
        const incorrectJudgments = results.fileTypes.filter(ft => !ft.is_correct);
        if (incorrectJudgments.length > 0) {
            improvements.push({
                area: 'ファイル種別判定精度',
                issue: `${incorrectJudgments.length}件の誤判定`,
                suggestion: '誤判定パターンの追加学習が必要'
            });
        }

        // フィードバック不足の特定
        if (results.feedback.length < results.patterns.length * 0.1) {
            improvements.push({
                area: 'フィードバック収集',
                issue: 'ユーザーフィードバックが不足',
                suggestion: 'より積極的なフィードバック要請が必要'
            });
        }

        // 低満足度方法の特定
        const lowSatisfactionMethods = results.methods.filter(m => m.user_satisfaction_score < 3);
        if (lowSatisfactionMethods.length > 0) {
            improvements.push({
                area: '分析方法改善',
                issue: `${lowSatisfactionMethods.length}件の低満足度方法`,
                suggestion: '分析手法の見直しが必要'
            });
        }

        return improvements;
    }

    // 設計書準拠：参照データエクスポート
    async exportReferenceData(outputPath = null) {
        log('参照データのエクスポートを開始');
        
        try {
            const stats = await this.searchEngine.getCategoryStats();
            const allPatterns = await this.searchEngine.getSuccessfulPatterns(null, 50);
            const learningHistory = await this.analyzeLearningHistory(30);

            const exportData = {
                exportDate: getJSTTimestamp(),
                systemStats: stats,
                successPatterns: allPatterns,
                learningHistory: learningHistory,
                categories: ['meeting', 'personal', 'proposal', 'unknown'],
                defaultApproaches: {
                    meeting: this.getDefaultApproach('meeting'),
                    personal: this.getDefaultApproach('personal'),
                    proposal: this.getDefaultApproach('proposal'),
                    unknown: this.getDefaultApproach('unknown')
                }
            };

            if (!outputPath) {
                outputPath = path.join(__dirname, '..', '..', 'output', 'reference-data-export.json');
            }

            await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
            log('参照データエクスポート完了: ' + outputPath);
            return outputPath;

        } catch (error) {
            log('エクスポートエラー: ' + error.message);
            return null;
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    AnalysisReferenceSystem
};

// 設計書準拠：直接実行でのテスト
if (require.main === module) {
    const referenceSystem = new AnalysisReferenceSystem();
    
    // テスト実行
    async function testReferenceSystem() {
        log('参照システムテストを開始');
        
        // 1. meeting分析の参照パターン取得
        const meetingReferences = await referenceSystem.getReferencePatternsForFileType('meeting', 'プロジェクト進捗');
        log('\nmeeting参照パターン:');
        console.log(JSON.stringify(meetingReferences, null, 2));
        
        // 2. 関連パターン検索
        const relatedPatterns = await referenceSystem.findRelatedPatterns('分析', { limit: 3 });
        log('\n関連パターン:');
        console.log(JSON.stringify(relatedPatterns, null, 2));
        
        // 3. 学習履歴分析
        const learningHistory = await referenceSystem.analyzeLearningHistory(7);
        log('\n学習履歴分析:');
        console.log(JSON.stringify(learningHistory, null, 2));
        
        // 4. 参照データエクスポート
        const exportPath = await referenceSystem.exportReferenceData();
        log('\nエクスポート完了: ' + exportPath);
    }
    
    testReferenceSystem();
}