# 分析結果フィードバック学習システム

## フィードバックの種類と学習

### 1. 分析方法へのフィードバック（既存）
```
Claude：「話題分類、関係性、アクションで分析します」
末武：「価格の話も追加して」
→ 分析方法のパターンを学習
```

### 2. 分析結果へのフィードバック（新規）
```
Claude：「分析完了。関係性は良好と判断しました」
末武：「いや、この会議は結構緊張感があったよ」
→ 判断基準や解釈の仕方を学習
```

## データベース設計（追加分）

### analysis_results_feedback テーブル
```sql
-- 分析結果に対するフィードバック
CREATE TABLE analysis_results_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT NOT NULL, -- どの分析に対してか
    result_section TEXT, -- 'relationship', 'sentiment', 'summary' など
    original_conclusion TEXT, -- 元の分析結果
    user_feedback TEXT, -- ユーザーからの修正指示
    corrected_conclusion TEXT, -- 修正後の結論
    feedback_type TEXT, -- 'interpretation', 'detail_level', 'focus_point'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 解釈パターンの学習
CREATE TABLE interpretation_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_type TEXT, -- '会議', '個人メモ', '提案書' など
    signal_words TEXT, -- 判断の手がかりとなった言葉
    interpretation TEXT, -- どう解釈したか
    accuracy_score REAL DEFAULT 0.5, -- 正確性スコア
    usage_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 具体的な学習フロー

### 分析結果の提示
```javascript
// analyze.js の拡張
async function presentAnalysisResults(analysis, analysisId) {
    console.log('\n【分析結果】\n');
    console.log(analysis);
    
    // フィードバックを受け付ける
    console.log('\n分析結果はいかがでしょうか？');
    console.log('修正が必要な部分があれば教えてください。');
    console.log('（例：「関係性の判断が違う」「もっと詳しく」「この部分は不要」）');
    
    // ユーザーの応答を待つ
    const feedback = await getUserInput();
    
    if (feedback && feedback !== 'OK') {
        await processResultFeedback(analysisId, analysis, feedback);
    }
}

// 分析結果のフィードバック処理
async function processResultFeedback(analysisId, originalAnalysis, feedback) {
    console.log('フィードバックを処理中...');
    
    // フィードバックの種類を判別
    const feedbackType = categorizeFeedback(feedback);
    
    // どの部分に対するフィードバックか特定
    const targetSection = identifyTargetSection(feedback, originalAnalysis);
    
    // 学習データとして保存
    const db = await connectDB();
    await db.run(`
        INSERT INTO analysis_results_feedback 
        (analysis_id, result_section, original_conclusion, user_feedback, feedback_type)
        VALUES (?, ?, ?, ?, ?)
    `, [analysisId, targetSection, originalAnalysis[targetSection], feedback, feedbackType]);
    
    // 解釈パターンを更新
    await updateInterpretationPatterns(targetSection, feedback);
    
    console.log('フィードバックを学習しました。次回の分析に反映されます。');
}
```

## フィードバックの種類と対応

### 1. 解釈の修正
```
例：
末武：「緊張感があったと書いてあるけど、実際は和やかだったよ」

学習内容：
- 「緊張」という言葉があっても文脈によっては和やか
- 表面的な言葉だけでなく全体の流れを見る
```

### 2. 詳細度の調整
```
例：
末武：「アクションアイテムをもっと具体的に」

学習内容：
- アクションアイテムは5W1Hで記述
- 期限と担当者を明確にする
```

### 3. 注目点の変更
```
例：
末武：「技術的な話より、ビジネス面を重視して」

学習内容：
- このクライアントではビジネス観点を優先
- 技術詳細は要約程度に留める
```

## 学習の活用例

### 次回の分析時
```javascript
async function applyLearnedPatterns(content, context) {
    const db = await connectDB();
    
    // 過去の解釈パターンを取得
    const patterns = await db.all(`
        SELECT * FROM interpretation_patterns 
        WHERE context_type = ? 
        ORDER BY accuracy_score DESC, usage_count DESC
        LIMIT 10
    `, [context]);
    
    // 過去のフィードバックを考慮
    const feedbackHistory = await db.all(`
        SELECT * FROM analysis_results_feedback 
        WHERE feedback_type = 'interpretation' 
        ORDER BY created_at DESC 
        LIMIT 20
    `);
    
    console.log('過去の学習を適用して分析します...');
    
    // 学習内容を反映した分析を実行
    return enhancedAnalysis(content, patterns, feedbackHistory);
}
```

## 将来の拡張機能（実装予定）

### バージョン2.0で追加予定
```markdown
## 関係性マップ機能
- 人物間の関係を視覚的に表示
- 関係の強さを線の太さで表現
- 時系列での変化をアニメーション表示

## 定期レポート機能
- 月次/週次での自動レポート生成
- 関係性の変化を追跡
- 重要な変化をハイライト

## クイック分析モード
- ワンクリックで標準分析を実行
- 学習済みパターンを即座に適用
- 5分以内に結果を出力
```

## 学習効果の測定

### フィードバック統計
```javascript
async function generateLearningReport() {
    const db = await connectDB();
    
    // 分析方法の学習状況
    const methodLearning = await db.get(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN success_count > 0 THEN 1 ELSE 0 END) as successful
        FROM learning_patterns
    `);
    
    // 分析結果の学習状況
    const resultLearning = await db.all(`
        SELECT feedback_type, COUNT(*) as count
        FROM analysis_results_feedback
        GROUP BY feedback_type
    `);
    
    console.log('【学習状況レポート】');
    console.log(`分析方法の学習: ${methodLearning.successful}/${methodLearning.total} パターン`);
    console.log('分析結果の改善点:');
    resultLearning.forEach(r => {
        console.log(`- ${r.feedback_type}: ${r.count}件`);
    });
}
```

このように、分析結果に対するフィードバックも詳細に学習し、次回以降の分析精度を向上させます。