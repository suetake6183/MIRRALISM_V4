# MIRRALISM V4 - LLM中心人間関係分析システム設計書

## システム概要

### 目的
末武さんの日々の思考、クライアントとの会話、書籍やウェブサイトの記録をClaude Code（LLM）が自律的に分析し、人間関係と思考パターンの洞察を提供するシステム

### 核心思想
- **Claude Code（LLM）が分析の主体**：プログラム的判定ではなく、言語理解による判定・分析
- **継続学習システム**：成功/失敗の経験を蓄積し、分析精度を向上
- **対話型ワークフロー**：末武さんとClaude Codeの協働による分析品質向上

### 重要な制約
- **APIは使わない**（Claude Code内で直接分析）
- **非エンジニア向け**（エラーは日本語、操作は簡単）
- **対話型実行**（バックグラウンド処理なし、毎回ユーザー指示）

---

## LLM中心ワークフロー

### 基本フロー
1. **末武さん**: "inputフォルダのファイルを分析してください"
2. **Claude Code**: 
   - inputフォルダのファイル内容を読み込み
   - database/learning.dbから過去の学習データを参照
   - LLM自身がファイル種別を判定（関数に依存しない）
   - 過去の成功/失敗パターンを考慮して分析方法を提案
   - "このファイルは[判定理由]により○○タイプと判断し、[学習根拠]でこの方法で分析します"
3. **末武さん**: 承認 or 修正指示
4. **Claude Code**: LLMによる分析実行・結果表示
5. **末武さん**: 
   - ファイル種別判定の正誤フィードバック
   - 分析方法の適切性フィードバック  
   - 分析結果の質フィードバック
6. **Claude Code**: すべてのフィードバックを学習データとして保存

### 学習サイクル
- **判定学習**: ファイル種別判定の成功/失敗→判定精度向上
- **方法学習**: 分析方法の有効性→提案品質向上
- **結果学習**: 分析結果の評価→分析深度向上

---

## データベース設計（拡張版）

### learning.db の拡張

```sql
-- 既存テーブル（そのまま活用）
CREATE TABLE learning_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_description TEXT NOT NULL,
    pattern_details TEXT,
    success_count INTEGER DEFAULT 1,
    context TEXT,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_method TEXT NOT NULL,
    user_feedback TEXT NOT NULL,
    improved_method TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analysis_results_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT NOT NULL,
    result_section TEXT,
    original_conclusion TEXT,
    user_feedback TEXT,
    corrected_conclusion TEXT,
    feedback_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 新規追加：ファイル種別判定学習
CREATE TABLE file_type_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_content_sample TEXT,
    llm_judgment TEXT,
    llm_reasoning TEXT,
    user_feedback TEXT,
    correct_type TEXT,
    is_correct BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 新規追加：分析方法効果測定
CREATE TABLE analysis_method_effectiveness (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_type TEXT,
    analysis_method TEXT,
    user_satisfaction_score INTEGER, -- 1-5
    specific_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 既存コードの活用と修正方針

### scripts/analyze.js の役割変更

**従来**: プログラム的判定・分析の実行
**新方針**: Claude Codeが呼び出すヘルパー関数群

#### 修正すべき関数
1. **detectContentType()** → **廃止**
   - LLMが直接判定するため不要
   
2. **proposeAnalysisMethod()** → **学習データ取得関数に変更**
   ```javascript
   // 修正後
   async function getLearningData(fileType = null) {
       // 過去の成功パターン、失敗事例を取得
       // Claude Codeが参考にするデータを提供
   }
   ```

3. **performAnalysis()** → **結果保存関数に変更**
   ```javascript
   // 修正後  
   async function saveAnalysisWithLearning(analysisResult, userFeedback) {
       // 分析結果と学習データを保存
   }
   ```

#### 保持すべき関数
- エラーハンドリング関数
- データベース接続関数
- アーカイブ関数
- タイムスタンプ関数

---

## Claude Code実装指示

### フェーズ1: 学習データベース拡張
1. 新しいテーブルをlearning.dbに追加
2. 学習データ取得・保存関数の実装

### フェーズ2: LLM判定・分析システム
1. ファイル内容の読み込み
2. 学習データを参考にしたLLM判定
3. 判定理由の明確化
4. 分析方法の提案（学習ベース）

### フェーズ3: フィードバック学習システム  
1. ユーザーフィードバックの受付
2. 学習データへの反映
3. 次回分析への活用

### フェーズ4: 継続改善
1. 分析精度の測定
2. 学習効果の可視化
3. システム全体の最適化

---

## 期待される成果

### 短期（1-2週間）
- LLMによる正確なファイル種別判定
- 学習データに基づく分析方法提案
- フィードバック学習の基本サイクル確立

### 中期（1ヶ月）
- 末武さんの思考パターンの言語化
- クライアント特徴の体系的把握
- 分析精度の継続的向上

### 長期（2-3ヶ月）
- 末武さん専用の分析エンジン完成
- クライアント提案書の効率的作成支援
- 人間関係洞察の高度化

---

## 実装優先順位

1. **最優先**: 学習データベース拡張とLLM判定システム
2. **高優先**: フィードバック学習サイクルの確立  
3. **中優先**: 分析結果の質向上
4. **低優先**: UI/UX改善、パフォーマンス最適化

この設計に基づき、既存システムを段階的に改修していきます。