/**
 * 二重出力管理システム
 * AI学習用JSONファイルと人間向け成果物を同時生成
 */

const fs = require('fs').promises;
const path = require('path');

class DualOutputManager {
    constructor() {
        this.aiOutputDir = 'output/ai_learning';
        this.humanOutputDir = 'output/deliverables';
        this.initializeDirectories();
    }

    async initializeDirectories() {
        const directories = [
            // AI学習用ディレクトリ
            `${this.aiOutputDir}/raw_analysis`,
            `${this.aiOutputDir}/learning_patterns`,
            `${this.aiOutputDir}/metadata`,
            
            // 人間向け成果物ディレクトリ
            `${this.humanOutputDir}/profiles`,
            `${this.humanOutputDir}/meeting_summaries`,
            `${this.humanOutputDir}/relationship_maps`,
            `${this.humanOutputDir}/insights_reports`,
            `${this.humanOutputDir}/action_items`,
            `${this.humanOutputDir}/templates`
        ];

        for (const dir of directories) {
            await fs.mkdir(dir, { recursive: true }).catch(() => {});
        }
    }

    /**
     * AI学習用JSONファイルを保存
     */
    async saveAILearningData(analysisData, metadata) {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `${timestamp}_${metadata.type}_${metadata.source}.json`;
        
        const aiData = {
            metadata: {
                ...metadata,
                createdAt: new Date().toISOString(),
                version: "1.0",
                dataType: "ai_learning"
            },
            rawAnalysis: analysisData,
            learningPatterns: this.extractLearningPatterns(analysisData),
            structuredData: this.structureForAI(analysisData)
        };

        const aiFilePath = path.join(this.aiOutputDir, 'raw_analysis', filename);
        await fs.writeFile(aiFilePath, JSON.stringify(aiData, null, 2), 'utf8');
        
        console.log(`✅ AI学習データを保存: ${aiFilePath}`);
        return aiFilePath;
    }

    /**
     * 人間向け成果物を生成・保存
     */
    async generateHumanDeliverables(analysisData, metadata) {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const results = {};

        // 1. プロファイル生成
        if (metadata.type === 'profile_analysis') {
            results.profile = await this.generateProfile(analysisData, timestamp);
        }

        // 2. 会議サマリー生成
        if (metadata.type === 'meeting_analysis') {
            results.summary = await this.generateMeetingSummary(analysisData, timestamp);
            results.actionItems = await this.generateActionItems(analysisData, timestamp);
        }

        // 3. 関係性マップ生成
        if (analysisData.relationships) {
            results.relationshipMap = await this.generateRelationshipMap(analysisData, timestamp);
        }

        // 4. 洞察レポート生成
        results.insights = await this.generateInsightsReport(analysisData, timestamp);

        return results;
    }

    /**
     * 人間が読みやすいプロファイルを生成
     */
    async generateProfile(analysisData, timestamp) {
        const profile = this.extractProfileData(analysisData);
        
        const profileContent = `# ${profile.name}さんのプロファイル

## 📊 基本情報
- **名前**: ${profile.name}
- **役職・専門**: ${profile.role || '不明'}
- **分析日**: ${new Date().toLocaleDateString('ja-JP')}

## 🎯 特徴的なパターン
${profile.patterns.map(p => `- **${p.category}**: ${p.description}`).join('\n')}

## 💬 コミュニケーションスタイル
- **発言頻度**: ${profile.speakingFrequency}
- **発言の特徴**: ${profile.speakingStyle}
- **使用する語尾**: ${profile.speechPatterns.join(', ')}

## 🤝 人間関係における役割
${profile.relationshipRole}

## 📈 ビジネス・専門分野での強み
${profile.businessStrengths.map(s => `- ${s}`).join('\n')}

## 🔍 今後の注目ポイント
${profile.futureObservations.map(o => `- ${o}`).join('\n')}

---
*このプロファイルは${timestamp}時点での分析に基づいています*
`;

        const filename = `${timestamp}_${profile.name}_プロファイル.md`;
        const filePath = path.join(this.humanOutputDir, 'profiles', filename);
        await fs.writeFile(filePath, profileContent, 'utf8');
        
        console.log(`✅ プロファイルを生成: ${filePath}`);
        return filePath;
    }

    /**
     * 会議サマリーを生成
     */
    async generateMeetingSummary(analysisData, timestamp) {
        const summary = this.extractMeetingData(analysisData);
        
        const summaryContent = `# 会議サマリー

## 📅 会議情報
- **日時**: ${summary.date}
- **参加者**: ${summary.participants.join(', ')}
- **議題**: ${summary.topics.join(', ')}

## 📋 主要な議論内容

### 🎯 決定事項
${summary.decisions.map(d => `- ${d}`).join('\n')}

### ⚠️ 課題・懸念事項
${summary.concerns.map(c => `- ${c}`).join('\n')}

### 💡 提案・アイデア
${summary.proposals.map(p => `- ${p}`).join('\n')}

## 👥 参加者別の発言傾向
${summary.participantAnalysis.map(p => `
### ${p.name}
- **発言量**: ${p.speakingRatio}%
- **主な関心事**: ${p.mainTopics.join(', ')}
- **提案した内容**: ${p.proposals.join(', ') || 'なし'}
`).join('\n')}

## 🔄 次回までのアクション
${summary.nextActions.map(a => `- [ ] ${a.action} (担当: ${a.assignee}, 期限: ${a.deadline})`).join('\n')}

---
*分析日: ${new Date().toLocaleDateString('ja-JP')}*
`;

        const filename = `${timestamp}_会議サマリー.md`;
        const filePath = path.join(this.humanOutputDir, 'meeting_summaries', filename);
        await fs.writeFile(filePath, summaryContent, 'utf8');
        
        console.log(`✅ 会議サマリーを生成: ${filePath}`);
        return filePath;
    }

    /**
     * 洞察レポートを生成
     */
    async generateInsightsReport(analysisData, timestamp) {
        const insights = this.extractInsights(analysisData);
        
        const reportContent = `# 分析洞察レポート

## 🔍 主要な発見事項

### 🎯 ビジネス・プロジェクトに関する洞察
${insights.businessInsights.map(i => `
#### ${i.title}
${i.description}

**根拠**: ${i.evidence}
**重要度**: ${'⭐'.repeat(i.importance)}
`).join('\n')}

### 👥 人間関係・チームダイナミクスの洞察
${insights.relationshipInsights.map(i => `
#### ${i.title}
${i.description}

**観察された行動**: ${i.observedBehavior}
**影響**: ${i.impact}
`).join('\n')}

### 📈 成長・改善の機会
${insights.improvementOpportunities.map(o => `
#### ${o.area}
**現状**: ${o.currentState}
**改善提案**: ${o.suggestion}
**期待効果**: ${o.expectedImpact}
`).join('\n')}

## 🚀 推奨アクション

### 短期（1-2週間）
${insights.shortTermActions.map(a => `- ${a}`).join('\n')}

### 中期（1-3ヶ月）
${insights.mediumTermActions.map(a => `- ${a}`).join('\n')}

### 長期（3ヶ月以上）
${insights.longTermActions.map(a => `- ${a}`).join('\n')}

---
*このレポートは${timestamp}時点での分析に基づく洞察です*
`;

        const filename = `${timestamp}_洞察レポート.md`;
        const filePath = path.join(this.humanOutputDir, 'insights_reports', filename);
        await fs.writeFile(filePath, reportContent, 'utf8');
        
        console.log(`✅ 洞察レポートを生成: ${filePath}`);
        return filePath;
    }

    /**
     * アクションアイテムを生成
     */
    async generateActionItems(analysisData, timestamp) {
        const actions = this.extractActionItems(analysisData);
        
        const actionContent = `# アクションアイテム

## 📋 今回の分析から抽出されたアクションアイテム

### 🔴 高優先度（緊急・重要）
${actions.highPriority.map(a => `
- [ ] **${a.title}**
  - **詳細**: ${a.description}
  - **担当**: ${a.assignee || '未定'}
  - **期限**: ${a.deadline || '要調整'}
  - **成功指標**: ${a.successCriteria || '要定義'}
`).join('\n')}

### 🟡 中優先度（重要・非緊急）
${actions.mediumPriority.map(a => `
- [ ] **${a.title}**
  - **詳細**: ${a.description}
  - **担当**: ${a.assignee || '未定'}
  - **期限**: ${a.deadline || '要調整'}
`).join('\n')}

### 🟢 低優先度（改善・最適化）
${actions.lowPriority.map(a => `
- [ ] **${a.title}**
  - **詳細**: ${a.description}
  - **担当**: ${a.assignee || '未定'}
`).join('\n')}

## 📊 進捗管理

### 完了チェックリスト
- [ ] 高優先度アイテムの担当者決定
- [ ] 期限設定の完了
- [ ] 成功指標の明確化
- [ ] 定期レビュー日程の設定

### 次回確認事項
- 前回アクションアイテムの進捗確認
- 新規課題の発生有無
- 優先度の再評価

---
*作成日: ${new Date().toLocaleDateString('ja-JP')}*
`;

        const filename = `${timestamp}_アクションアイテム.md`;
        const filePath = path.join(this.humanOutputDir, 'action_items', filename);
        await fs.writeFile(filePath, actionContent, 'utf8');
        
        console.log(`✅ アクションアイテムを生成: ${filePath}`);
        return filePath;
    }

    /**
     * 人間関係マップを生成
     */
    async generateRelationshipMap(analysisData, timestamp) {
        const relationships = this.extractRelationshipData(analysisData);
        
        const mapContent = `# 人間関係マップ

## 👥 関係者一覧

${relationships.participants.map(p => `
### ${p.name}
- **役割**: ${p.role}
- **影響力レベル**: ${'⭐'.repeat(p.influenceLevel)}
- **コミュニケーションスタイル**: ${p.communicationStyle}
- **主な関心事**: ${p.mainInterests.join(', ')}
`).join('\n')}

## 🔗 関係性の構造

### 権力・影響力の関係
\`\`\`
${relationships.powerStructure.map(r => `${r.from} → ${r.to} (${r.type}: ${r.strength})`).join('\n')}
\`\`\`

### 協力関係
${relationships.collaborations.map(c => `
- **${c.participants.join(' ↔ ')}**
  - 協力内容: ${c.content}
  - 強度: ${'●'.repeat(c.strength)}
  - 成果: ${c.outcomes.join(', ')}
`).join('\n')}

### 潜在的な課題・対立
${relationships.tensions.map(t => `
- **関係者**: ${t.participants.join(' vs ')}
  - 課題内容: ${t.issue}
  - 影響度: ${'⚠️'.repeat(t.severity)}
  - 対処提案: ${t.suggestion}
`).join('\n')}

## 📈 関係性の変化トレンド

### 強化されている関係
${relationships.strengtheningRelations.map(r => `- ${r.participants.join(' - ')}: ${r.reason}`).join('\n')}

### 注意が必要な関係
${relationships.weakeningRelations.map(r => `- ${r.participants.join(' - ')}: ${r.concern}`).join('\n')}

## 🎯 関係性改善の提案

### 短期的改善策
${relationships.shortTermImprovements.map(i => `- ${i}`).join('\n')}

### 長期的戦略
${relationships.longTermStrategies.map(s => `- ${s}`).join('\n')}

---
*分析日: ${new Date().toLocaleDateString('ja-JP')}*
*次回更新推奨: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('ja-JP')}*
`;

        const filename = `${timestamp}_人間関係マップ.md`;
        const filePath = path.join(this.humanOutputDir, 'relationship_maps', filename);
        await fs.writeFile(filePath, mapContent, 'utf8');
        
        console.log(`✅ 人間関係マップを生成: ${filePath}`);
        return filePath;
    }

    /**
     * テンプレート生成・管理機能
     */
    async generateTemplate(templateType, customFields = {}) {
        const templates = {
            'meeting_summary': this.getMeetingSummaryTemplate(),
            'profile': this.getProfileTemplate(),
            'insights_report': this.getInsightsReportTemplate(),
            'action_items': this.getActionItemsTemplate(),
            'relationship_map': this.getRelationshipMapTemplate()
        };

        const template = templates[templateType];
        if (!template) {
            throw new Error(`未対応のテンプレートタイプ: ${templateType}`);
        }

        // カスタムフィールドでテンプレートをカスタマイズ
        let customizedTemplate = template;
        Object.entries(customFields).forEach(([key, value]) => {
            customizedTemplate = customizedTemplate.replace(`{{${key}}}`, value);
        });

        const filename = `template_${templateType}_${Date.now()}.md`;
        const filePath = path.join(this.humanOutputDir, 'templates', filename);
        await fs.writeFile(filePath, customizedTemplate, 'utf8');
        
        console.log(`✅ テンプレートを生成: ${filePath}`);
        return filePath;
    }

    // テンプレート定義メソッド
    getMeetingSummaryTemplate() {
        return `# {{meetingTitle}} - 会議サマリー

## 📅 会議情報
- **日時**: {{date}}
- **参加者**: {{participants}}
- **議題**: {{topics}}

## 📋 主要な議論内容

### 🎯 決定事項
{{decisions}}

### ⚠️ 課題・懸念事項
{{concerns}}

### 💡 提案・アイデア
{{proposals}}

## 🔄 次回までのアクション
{{nextActions}}

---
*テンプレート作成日: ${new Date().toLocaleDateString('ja-JP')}*
`;
    }

    getProfileTemplate() {
        return `# {{name}}さんのプロファイル

## 📊 基本情報
- **名前**: {{name}}
- **役職・専門**: {{role}}
- **分析日**: {{analysisDate}}

## 🎯 特徴的なパターン
{{patterns}}

## 💬 コミュニケーションスタイル
{{communicationStyle}}

## 🤝 人間関係における役割
{{relationshipRole}}

## 📈 ビジネス・専門分野での強み
{{businessStrengths}}

---
*テンプレート作成日: ${new Date().toLocaleDateString('ja-JP')}*
`;
    }

    getInsightsReportTemplate() {
        return `# {{title}} - 分析洞察レポート

## 🔍 主要な発見事項
{{mainFindings}}

## 🎯 ビジネス・プロジェクトに関する洞察
{{businessInsights}}

## 👥 人間関係・チームダイナミクスの洞察
{{relationshipInsights}}

## 🚀 推奨アクション
{{recommendedActions}}

---
*テンプレート作成日: ${new Date().toLocaleDateString('ja-JP')}*
`;
    }

    getActionItemsTemplate() {
        return `# {{title}} - アクションアイテム

## 🔴 高優先度（緊急・重要）
{{highPriorityItems}}

## 🟡 中優先度（重要・非緊急）
{{mediumPriorityItems}}

## 🟢 低優先度（改善・最適化）
{{lowPriorityItems}}

## 📊 進捗管理
{{progressTracking}}

---
*テンプレート作成日: ${new Date().toLocaleDateString('ja-JP')}*
`;
    }

    getRelationshipMapTemplate() {
        return `# {{title}} - 人間関係マップ

## 👥 関係者一覧
{{participants}}

## 🔗 関係性の構造
{{relationshipStructure}}

## 📈 関係性の変化トレンド
{{relationshipTrends}}

## 🎯 関係性改善の提案
{{improvementSuggestions}}

---
*テンプレート作成日: ${new Date().toLocaleDateString('ja-JP')}*
`;
    }

    // ヘルパーメソッド
    extractProfileData(analysisData) {
        // 分析データからプロファイル情報を抽出
        return {
            name: analysisData.primaryParticipant || '不明',
            role: analysisData.role || '不明',
            patterns: analysisData.patterns || [],
            speakingFrequency: analysisData.speakingFrequency || '不明',
            speakingStyle: analysisData.speakingStyle || '不明',
            speechPatterns: analysisData.speechPatterns || [],
            relationshipRole: analysisData.relationshipRole || '不明',
            businessStrengths: analysisData.businessStrengths || [],
            futureObservations: analysisData.futureObservations || []
        };
    }

    extractMeetingData(analysisData) {
        // 分析データから会議情報を抽出
        return {
            date: analysisData.meetingDate || new Date().toLocaleDateString('ja-JP'),
            participants: analysisData.participants || [],
            topics: analysisData.topics || [],
            decisions: analysisData.decisions || [],
            concerns: analysisData.concerns || [],
            proposals: analysisData.proposals || [],
            participantAnalysis: analysisData.participantAnalysis || [],
            nextActions: analysisData.nextActions || []
        };
    }

    extractInsights(analysisData) {
        // 分析データから洞察を抽出
        return {
            businessInsights: analysisData.businessInsights || [],
            relationshipInsights: analysisData.relationshipInsights || [],
            improvementOpportunities: analysisData.improvementOpportunities || [],
            shortTermActions: analysisData.shortTermActions || [],
            mediumTermActions: analysisData.mediumTermActions || [],
            longTermActions: analysisData.longTermActions || []
        };
    }

    extractLearningPatterns(analysisData) {
        // AI学習用のパターンを抽出
        return {
            communicationPatterns: analysisData.communicationPatterns || [],
            decisionMakingPatterns: analysisData.decisionMakingPatterns || [],
            relationshipPatterns: analysisData.relationshipPatterns || []
        };
    }

    structureForAI(analysisData) {
        // AI学習に最適化された構造化データを生成
        return {
            entities: analysisData.entities || {},
            relationships: analysisData.relationships || [],
            events: analysisData.events || [],
            patterns: analysisData.patterns || [],
            metadata: analysisData.metadata || {}
        };
    }

    extractActionItems(analysisData) {
        // 分析データからアクションアイテムを抽出
        const allActions = [
            ...(analysisData.shortTermActions || []),
            ...(analysisData.mediumTermActions || []),
            ...(analysisData.longTermActions || []),
            ...(analysisData.nextActions || [])
        ];

        return {
            highPriority: allActions.filter(a => 
                typeof a === 'object' ? a.priority === 'high' : 
                typeof a === 'string' && (a.includes('緊急') || a.includes('重要') || a.includes('期限'))
            ).map(a => this.formatActionItem(a)),
            mediumPriority: allActions.filter(a => 
                typeof a === 'object' ? a.priority === 'medium' : 
                typeof a === 'string' && (a.includes('検討') || a.includes('計画') || a.includes('準備'))
            ).map(a => this.formatActionItem(a)),
            lowPriority: allActions.filter(a => 
                typeof a === 'object' ? a.priority === 'low' : 
                typeof a === 'string' && !a.includes('緊急') && !a.includes('重要')
            ).map(a => this.formatActionItem(a))
        };
    }

    formatActionItem(action) {
        if (typeof action === 'string') {
            return {
                title: action.substring(0, 50) + (action.length > 50 ? '...' : ''),
                description: action,
                assignee: '未定',
                deadline: '要調整'
            };
        }
        return {
            title: action.title || action.action || '未定義のアクション',
            description: action.description || action.details || action.action || '',
            assignee: action.assignee || '未定',
            deadline: action.deadline || '要調整',
            successCriteria: action.successCriteria || '要定義'
        };
    }

    extractRelationshipData(analysisData) {
        // 分析データから関係性情報を抽出
        return {
            participants: (analysisData.participants || []).map(p => ({
                name: typeof p === 'string' ? p : p.name,
                role: typeof p === 'object' ? p.role : '不明',
                influenceLevel: typeof p === 'object' ? p.influenceLevel || 3 : 3,
                communicationStyle: typeof p === 'object' ? p.communicationStyle : '不明',
                mainInterests: typeof p === 'object' ? p.mainInterests || [] : []
            })),
            powerStructure: analysisData.powerStructure?.relationships || [],
            collaborations: analysisData.collaborations || [],
            tensions: analysisData.tensions || analysisData.concerns?.map(c => ({
                participants: ['関係者'],
                issue: c,
                severity: 2,
                suggestion: '要検討'
            })) || [],
            strengtheningRelations: analysisData.strengtheningRelations || [],
            weakeningRelations: analysisData.weakeningRelations || [],
            shortTermImprovements: analysisData.shortTermActions || [],
            longTermStrategies: analysisData.longTermActions || []
        };
    }
}

module.exports = DualOutputManager; 