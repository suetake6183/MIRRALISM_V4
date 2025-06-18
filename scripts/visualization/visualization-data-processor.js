const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { log, getJSTTimestamp } = require('./shared/logger');

// 設計書準拠：可視化用データ処理クラス
class VisualizationDataProcessor {
    constructor() {
        this.dbPath = path.join(__dirname, '..', '..', 'database', 'learning.db');
    }

    // 設計書準拠：学習パターンの関係性データ生成
    async generateLearningRelationshipData() {
        try {
            const db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // 学習パターンの基本データ取得
            const patterns = await db.all(`
                SELECT id, pattern_description, pattern_details, context, created_at 
                FROM learning_patterns 
                ORDER BY created_at DESC
            `);

            // 時系列での学習進捗データ生成
            const timeSeriesData = patterns.map((pattern, index) => {
                return {
                    id: pattern.id,
                    timestamp: pattern.created_at,
                    description: pattern.pattern_description,
                    details: pattern.pattern_details,
                    context: pattern.context,
                    progressIndex: patterns.length - index,
                    category: this.categorizePattern(pattern.pattern_description)
                };
            });

            await db.close();
            
            log('学習関係性データを生成しました');
            return {
                nodes: this.generateNodes(timeSeriesData),
                links: this.generateLinks(timeSeriesData),
                timeSeries: timeSeriesData,
                stats: this.generateStats(timeSeriesData)
            };

        } catch (error) {
            log('データ処理エラー: ' + error.message);
            return { nodes: [], links: [], timeSeries: [], stats: {} };
        }
    }

    // 設計書準拠：ノードデータ生成
    generateNodes(timeSeriesData) {
        const nodes = [];
        const categories = ['分析', '判定', '学習', '対話', 'テスト'];
        
        // カテゴリノード生成
        categories.forEach(category => {
            const categoryData = timeSeriesData.filter(item => item.category === category);
            if (categoryData.length > 0) {
                nodes.push({
                    id: category,
                    type: 'category',
                    label: category,
                    size: categoryData.length * 10,
                    color: this.getCategoryColor(category),
                    count: categoryData.length
                });
            }
        });

        // 個別パターンノード生成
        timeSeriesData.forEach(item => {
            nodes.push({
                id: `pattern_${item.id}`,
                type: 'pattern',
                label: item.description.substring(0, 20) + '...',
                category: item.category,
                size: 5,
                timestamp: item.timestamp,
                details: item.details
            });
        });

        return nodes;
    }

    // 設計書準拠：リンクデータ生成
    generateLinks(timeSeriesData) {
        const links = [];
        
        // カテゴリとパターンのリンク
        timeSeriesData.forEach(item => {
            links.push({
                source: item.category,
                target: `pattern_${item.id}`,
                type: 'category-pattern',
                strength: 1
            });
        });

        // 時系列での隣接パターンリンク
        for (let i = 0; i < timeSeriesData.length - 1; i++) {
            const current = timeSeriesData[i];
            const next = timeSeriesData[i + 1];
            
            if (current.category === next.category) {
                links.push({
                    source: `pattern_${current.id}`,
                    target: `pattern_${next.id}`,
                    type: 'temporal',
                    strength: 0.5
                });
            }
        }

        return links;
    }

    // 設計書準拠：統計データ生成
    generateStats(timeSeriesData) {
        const categoryCount = {};
        const dailyProgress = {};
        
        timeSeriesData.forEach(item => {
            // カテゴリ統計
            if (!categoryCount[item.category]) {
                categoryCount[item.category] = 0;
            }
            categoryCount[item.category]++;
            
            // 日別進捗統計
            const date = item.timestamp.split(' ')[0];
            if (!dailyProgress[date]) {
                dailyProgress[date] = 0;
            }
            dailyProgress[date]++;
        });

        return {
            totalPatterns: timeSeriesData.length,
            categoryDistribution: categoryCount,
            dailyProgress: dailyProgress,
            lastUpdate: getJSTTimestamp()
        };
    }

    // 設計書準拠：パターンカテゴリ分類
    categorizePattern(description) {
        if (description.includes('判定') || description.includes('Claude Code')) {
            return '判定';
        } else if (description.includes('分析') || description.includes('meeting') || description.includes('personal')) {
            return '分析';
        } else if (description.includes('学習') || description.includes('フィードバック')) {
            return '学習';
        } else if (description.includes('対話') || description.includes('ワークフロー')) {
            return '対話';
        } else if (description.includes('テスト') || description.includes('検証')) {
            return 'テスト';
        } else {
            return '学習';
        }
    }

    // 設計書準拠：カテゴリ色設定
    getCategoryColor(category) {
        const colors = {
            '分析': '#4CAF50',
            '判定': '#2196F3', 
            '学習': '#FF9800',
            '対話': '#9C27B0',
            'テスト': '#F44336'
        };
        return colors[category] || '#666666';
    }

    // 設計書準拠：可視化用JSONデータ出力
    async exportVisualizationData() {
        log('可視化データの生成を開始します');
        
        const data = await this.generateLearningRelationshipData();
        
        const outputDir = path.join(__dirname, '..', 'output');
        
        try {
            await fs.mkdir(outputDir, { recursive: true });
            
            const outputPath = path.join(outputDir, 'visualization-data.json');
            await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
            
            log('可視化データを出力しました: ' + outputPath);
            return outputPath;
            
        } catch (error) {
            log('データ出力エラー: ' + error.message);
            return null;
        }
    }
}

// 設計書準拠：エクスポート
module.exports = {
    VisualizationDataProcessor
};

// 設計書準拠：直接実行
if (require.main === module) {
    const processor = new VisualizationDataProcessor();
    processor.exportVisualizationData();
}