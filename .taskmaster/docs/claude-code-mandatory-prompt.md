# 🚨 Claude Code 必須プロンプト（毎回必読）

## 📋 設計書絶対制約

### 🔴 絶対禁止事項
```
❌ バックグラウンド処理の実装（設計書16行目で明確に禁止）
❌ 装飾的ログ出力（絵文字🎨🔄⚙️✨💡📊🧠等の使用禁止）
❌ プログラム的判定システム（キーワード配列、スコア計算等）
❌ 複雑な環境変数制御システム
❌ conservative/experimental/adaptiveモード等の複雑分岐
❌ 技術者向けの複雑なログ出力
```

### ✅ 必須遵守事項
```
✅ 対話型実行のみ（毎回ユーザー指示に基づく実行）
✅ LLM（Claude Code）中心の判定・分析
✅ シンプルな日本語ログ出力のみ
✅ 非エンジニア向けの分かりやすい表現
✅ 設計書integrated-design-package.mdの厳格遵守
```

## 🚨 **絶対禁止コード（コピペ禁止）**

### ❌ 環境変数制御（完全禁止）
```javascript
// 以下のパターンは絶対に実装禁止
if (process.env.CLAUDE_CODE_FILE_TYPE) { ... }
if (process.env.ANALYSIS_METHOD) { ... }
if (process.env.AUTO_APPROVE) { ... }
if (process.env.FILE_INDEX) { ... }
process.env.ANYTHING // 一切の環境変数参照禁止
```

### ❌ 装飾的ログ（完全禁止）
```javascript
// 以下のパターンは絶対に実装禁止
console.log('🎯📋📈🔄⚙️✨💡📊🧠🎨'); // 絵文字禁止
console.log('[カスタム手法]'); // 装飾的表現禁止
console.log('━━━━━━━━━━'); // 装飾線禁止
```

### ❌ 複雑な制御システム（完全禁止）
```javascript
// 以下のパターンは絶対に実装禁止
switch (mode) {
    case 'conservative':
    case 'experimental':
    case 'adaptive':
}
throw new Error('環境変数が設定されていません'); // 環境変数エラー禁止
```

## ✅ **許可されたコード（これのみ実装可能）**

### ✅ シンプルな日本語ログ
```javascript
// 以下のパターンのみ実装可能
console.log('分析を開始します');
console.log('ファイルを読み込みました');
console.log('分析が完了しました');
```

### ✅ 対話型実行
```javascript
// ユーザー指示による実行のみ
async function main() {
    console.log('Claude Codeによる判定をお願いします');
    throw new Error('対話型実行モード: Claude Codeが直接判定してください');
}
```

### ✅ LLM中心設計
```javascript
// Claude Code自身による判定
async function requestLLMJudgment(content) {
    console.log('Claude Codeがコンテンツを分析してください');
    // プログラム的判定なし
}
```

## 🎯 実装原則

### 1. 設計書優先主義
- 設計書に書かれていない機能は実装しない
- 「改良」「高度化」の誘惑を排除
- 疑問があれば必ずユーザーに確認

### 2. シンプル強制
- 複雑な制御フローは避ける
- 装飾的な要素は一切追加しない
- ログは必要最小限の日本語のみ

### 3. LLM中心設計
- プログラム的判定は一切行わない
- Claude Code自身の言語理解能力を活用
- 学習データは参考情報として提供のみ

## 🚨 **強制的制約チェック**

### ファイル先頭に必須実装
```javascript
// 全ての新規ファイルの先頭に必須
// 設計書制約チェック（強制）
const forbiddenPatterns = [
    'process.env.',
    '🎯', '📋', '📈', '🔄', '⚙️', '✨', '💡', '📊', '🧠', '🎨',
    '[カスタム手法]',
    'conservative',
    'experimental',
    'adaptive'
];

const currentFile = require('fs').readFileSync(__filename, 'utf8');
forbiddenPatterns.forEach(pattern => {
    if (currentFile.includes(pattern)) {
        throw new Error(`設計書違反: 禁止パターン "${pattern}" が検出されました`);
    }
});
```

## 🚨 過去の重大失敗パターン（絶対に繰り返さない）

### パターン1: 環境変数制御システム
```javascript
// ❌ 過去の違反例（絶対に実装禁止）
if (process.env.CLAUDE_CODE_FILE_TYPE && process.env.CLAUDE_CODE_REASONING) {
    fileType = process.env.CLAUDE_CODE_FILE_TYPE;
    reasoning = process.env.CLAUDE_CODE_REASONING;
}
```

### パターン2: 装飾的ログの乱用
```javascript
// ❌ 過去の違反例（絶対に実装禁止）
console.log('🎨 [カスタム手法モード]');
console.log('🔄 [代替手法モード]');
console.log('⚙️ [設定適応モード]');
```

### パターン3: 複雑な分岐制御
```javascript
// ❌ 過去の違反例（絶対に実装禁止）
switch (analysisMode) {
    case 'conservative':
        return conservativeAnalysis();
    case 'experimental':
        return experimentalAnalysis();
}
```

## 📝 実装前必須チェックリスト

### 実装開始前
- [ ] 新しいanalyze.js（シンプル版）を確認
- [ ] 環境変数参照が0件であることを確認
- [ ] 装飾的要素が0件であることを確認

### 実装中
- [ ] 毎行コードを書く前に禁止パターンをチェック
- [ ] 複雑な条件分岐を作成していないか
- [ ] プログラム的判定を実装していないか

### 実装完了後
- [ ] grep検索で禁止パターンが0件であることを確認
- [ ] ファイルサイズが適切（200行以下推奨）
- [ ] 対話型実行の原則が守られているか確認

## 🎯 正しい実装例

### ✅ 新しいanalyze.js（設計書完全準拠）
```javascript
// 環境変数制御なし
// 装飾的ログなし
// 対話型実行のみ
// LLM中心設計

function log(message) {
    console.log(message); // シンプルな日本語のみ
}

async function requestLLMJudgment(content) {
    log('Claude Codeによる判定をお願いします');
    throw new Error('対話型実行モード: Claude Codeが直接判定してください');
}
```

## 🚨 緊急停止条件

以下の場合は実装を即座に停止してユーザーに確認：

1. 環境変数参照を書こうとしている
2. 絵文字や装飾的要素を追加しようとしている
3. 複雑な制御システムを作成しようとしている
4. 設計書にない機能を実装しようとしている

## 📋 最終確認項目

実装完了時に必ず確認：

- [ ] `grep -r "process.env" scripts/` → 0件
- [ ] `grep -r "🎯\|📋\|📈" scripts/` → 0件
- [ ] `grep -r "conservative\|experimental" scripts/` → 0件
- [ ] ファイルサイズ200行以下
- [ ] 対話型実行の徹底
- [ ] LLM中心の設計維持

---

**新しいanalyze.jsは設計書に完全準拠したシンプルな実装です。この制約を絶対に守ってください。** 