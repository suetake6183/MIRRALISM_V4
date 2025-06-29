# 人間関係分析システム

末武さんの議事録や思考メモをLLMが自律的に分析し、人間関係の洞察を提供するシステムです。

## 特徴

- 📁 ファイルを置くだけで自動分析
- 🤖 AIが分析方法を提案
- 📚 フィードバックで学習・改善
- 🗄️ 自動アーカイブ機能

## 使い方

### 1. セットアップ（初回のみ）
```bash
npm install
npm run setup
```

### 2. 分析の実行
1. `input/` フォルダに分析したいファイルを配置
2. 以下のコマンドを実行：
```bash
npm run analyze
```
3. AIの提案を確認し、承認または修正
4. 分析結果は `output/analysis/` に保存されます

### 3. その他のコマンド
```bash
npm run profile   # 人物プロファイルの確認・更新
npm run feedback  # 分析結果へのフィードバック
npm run archive   # アーカイブファイルの検索
```

## フォルダ構成

```
├── input/          # 分析対象ファイルを配置
├── output/         # 分析結果
│   ├── analysis/   # 分析レポート
│   ├── profiles/   # 人物プロファイル
│   └── insights/   # 洞察
├── archive/        # 分析済みファイルの保管
└── database/       # 学習データ
```

## 対応ファイル形式

- テキストファイル（.txt）
- Markdownファイル（.md）
- その他のプレーンテキスト形式

## トラブルシューティング

### ファイルが読み込めない場合
- ファイルがUTF-8形式で保存されているか確認
- ファイルパスに日本語が含まれていないか確認

### エラーが発生した場合
- エラーメッセージを確認し、指示に従ってください
- 解決しない場合は、`npm run setup` で再初期化をお試しください

## 注意事項

- 個人情報や機密情報を含むファイルの取り扱いにはご注意ください
- 分析結果は参考情報としてご利用ください