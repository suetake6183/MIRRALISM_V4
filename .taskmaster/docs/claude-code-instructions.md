# Claude Code向け - コード構造最適化作業指示書

## 🎯 作業概要
MIRRALISM_V4プロジェクトのコード構造最適化を実行します。

**重要**: この作業は設計書制約（日本語優先、対話型実行、API禁止）を**完全維持**しながら実施してください。

## 📋 最適化対象と現状

### 1. 重複コード問題
- **log関数**: 12ファイルで同一実装が重複
- **検索機能**: 4ファイル（search-engine.js, enhanced-search.js, search-interface.js, reference-system.js）で機能分散
- **データベース接続**: 複数ファイルで重複実装

### 2. 大規模ファイル問題
```
scripts/search-engine.js        (480行) ← 要分割
scripts/load-tester.js          (466行) ← 要分割  
scripts/security-enhancer.js    (447行) ← 要分割
scripts/effectiveness-tracker.js (416行) ← 要分割
scripts/performance-optimizer.js (397行) ← 要分割
scripts/learning-cycle.js       (397行) ← 要分割
```

### 3. ディレクトリ構造問題
現在: フラット構造（scripts/に16ファイル）
推奨: フィーチャーベース構造

## 🚀 実装フロー

### フェーズ1: 共通ユーティリティ統合（最優先）
1. **共通ログシステム作成**
   ```javascript
   // scripts/shared/logger.js
   function log(message) {
       console.log(`[${new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})}] ${message}`);
   }
   module.exports = { log };
   ```

2. **段階的置換実行**
   - 1ファイルずつ`require('./shared/logger')`に変更
   - 各置換後に`npm test`で動作確認
   - 設計書制約チェック（環境変数0件、装飾ログ0件）

### フェーズ2: 検索機能統合
1. **Facadeパターン実装**
   ```javascript
   // scripts/search/search-facade.js
   // 4つの検索機能を統一インターフェースで提供
   ```

2. **既存ファイル統合**
   - search-engine.js（基本機能）をベースに統合
   - enhanced-search.js、search-interface.js、reference-system.jsを段階的に統合

### フェーズ3: 大規模ファイル分割
**目標**: 各ファイル200-300行以内

**分割例（search-engine.js 480行）:**
```
scripts/search/
├── core/
│   ├── search-core.js      (150行)
│   └── index-builder.js    (120行)
├── interfaces/
│   ├── sqlite-adapter.js   (100行)
│   └── elasticlunr-adapter.js (110行)
└── search-facade.js        (統合インターフェース)
```

### フェーズ4: ディレクトリ再編
```
scripts/
├── core/           # 基本機能（analyze.js, db-setup.js）
├── search/         # 検索統合
├── testing/        # テスト関連
├── visualization/  # 可視化関連
├── performance/    # パフォーマンス・セキュリティ
└── shared/         # 共通ユーティリティ
```

## ⚠️ 設計書制約の厳守

### 絶対に維持すべき制約
1. **日本語優先**: 全コメント・エラーメッセージは日本語
2. **対話型実行**: バックグラウンド処理禁止
3. **API禁止**: 外部API使用禁止
4. **LLM中心設計**: プログラム的判定禁止

### 各フェーズ完了後の確認項目
```bash
# 制約チェックコマンド
grep -r "process\.env" scripts/     # 環境変数: 0件であること
grep -r "setInterval\|setTimeout" scripts/  # バックグラウンド処理: 0件であること
grep -r "🎯\|✨\|🚀" scripts/      # 装飾的ログ: 0件であること
npm test                           # 全テスト通過
```

## 📝 作業記録指示

### Task Master AIへの進捗記録
各フェーズ完了時に以下を実行:

```bash
# 進捗記録
task-master update-subtask --id=1.X --prompt="フェーズX完了
- 実装内容: [具体的な変更内容]
- 削減効果: [重複削除数、行数削減など]
- 制約確認: [チェック結果]
- テスト結果: [npm testの結果]"

# ステータス更新
task-master set-status --id=1.X --status=done
```

## 🎯 期待される効果

### 定量的改善目標
- **重複コード削減**: 12個のlog関数 → 1個（91%削減）
- **ファイルサイズ最適化**: 6ファイルを200-300行以内に分割
- **保守性向上**: 変更時の影響範囲を大幅縮小
- **開発効率向上**: 新機能追加時の工数削減

### 品質保証
- **設計書制約**: 100%維持
- **機能動作**: 既存機能の完全保持
- **テスト通過**: 全テスト継続通過
- **パフォーマンス**: 現状維持または改善

## 🔧 必要なツール設定

### 品質チェックツール導入
```bash
# 重複コード検出
npm install --save-dev jscpd

# 依存関係分析  
npm install --save-dev madge

# 未使用コード検出
npm install --save-dev knip
```

**重要**: 作業開始前に必ず現在の動作状態をベースラインとして記録し、各段階で動作確認を実施してください。

## 🚫 注意事項

1. **一度に大幅な変更をしない**: 段階的な実装を厳守
2. **テストを怠らない**: 各変更後に必ず動作確認
3. **設計書制約を最優先**: 最適化よりも制約遵守を優先
4. **バックアップ確保**: Git commitを頻繁に実行

この指示書に従って、安全かつ効率的にコード構造最適化を実行してください。 