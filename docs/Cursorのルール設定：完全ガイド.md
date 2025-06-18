<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Cursorのルール設定：完全ガイド

## はじめに

Cursorは、AIを活用したコードエディタとして注目を集めており、開発者の生産性向上に大きく貢献しています[^1]。本レポートでは、Cursorにおけるルール設定機能について、信頼できるソースから収集した情報を基に詳細に解説します。

## Cursorのルール設定の概要

### ルール設定の基本概念

Cursorには2つの主要なルール設定システムが存在します[^2]。一つは「Rules for AI」で、すべてのプロジェクトと対話に適用される全体設定です[^2]。もう一つは「Project Rules」で、プロジェクトのルートディレクトリにある設定ファイルとして、現在のプロジェクトに特化して適用されます[^2]。

### ルール設定の種類と特徴

| 種類 | 対象 | 範囲 | 設定場所 |
| :-- | :-- | :-- | :-- |
| Rules for AI | 文体や参考情報 | ユーザーごとの設定 | Cursor内での設定 |
| Project Rules | コーディング規約や選定技術 | プロジェクトまたはチーム全体 | リポジトリのルートディレクトリ |

## Rules for AI（ユーザールール）

### 設定方法と特徴

Rules for AIは、Cursorエディタに搭載されているAIアシスタントの振る舞いをカスタマイズするための設定機能です[^3]。設定は「Settings > Rules for AI」から行うことができ、ユーザー独自のプロンプトルールを設定可能です[^3]。

### 設定手順

1. Cursorエディタを開く
2. Settings（設定）を開く
3. Rules for AI セクションを探す
4. カスタムルールをテキストとして入力[^3]

### 主な用途

- コーディング支援時のAIの応答スタイルをカスタマイズ
- 不要な説明や前置きを省略
- プロジェクト特有の要件に合わせたAI応答の調整
- 開発効率を向上させるための対話設定[^3]


## Project Rules（プロジェクトルール）

### 基本概念

Project Rulesは、プロジェクト固有のルールやガイドラインを定義するために使用されます[^4]。これらのルールは`.mdc`形式で記述され、`.cursor/rules/`ディレクトリに配置されます[^4]。

### .mdcファイルの構成要素

#### フロントマター（YAML形式）

- `description`: ルールの簡潔な説明
- `globs`: ルールを適用するファイルパターン
- `alwaysApply`: ルールを常に適用するかどうか[^4]


#### メインコンテンツ

Markdownコンテンツとして、ルールの詳細な説明やコードサンプルを含みます[^4]。

### Rule Type（ルールタイプ）

Cursor 0.47.5から追加された機能で、「このルールをAIにいつ渡すか？」という適用タイミングを設定できます[^5]。

#### 1. Always（常に適用）

どんなチャットや編集でも毎回必ず適用されるルールです[^5]。基本的なコーディングスタイル、プロジェクト全体のポリシーに適しています[^5]。

```yaml
---
description: 全体に適用されるルール
alwaysApply: true
---
```


#### 2. Auto Attached（特定パターンで自動適用）

対象ファイルが`globs`にマッチするときだけAIに適用されます[^5]。例えば`globs: "frontend/**"`にしておけば、フロントエンドコードだけに適用されます[^5]。

```yaml
---
description: フロント用
globs: "frontend/**"
---
```


#### 3. Agent Requested（AIが必要に応じて使用）

常に渡されるわけではなく、AIが「今このルール使ったほうがいいな」と判断したときだけ使われるルールです[^5]。

#### 4. Manual（手動適用）

明示的に使用する場合のみ含まれます[^6]。`@ruleName`として使用します[^6]。

### .mdcファイルの命名規則

- ファイル拡張子は`.mdc`を使用[^4]
- ファイル名にはkebab-caseを使用[^4]
- 数字のプレフィックスを使用して優先順位や順序を示すことが可能[^4]

例：

- 001-099: コア/ワークスペースルール
- 100-199: 統合ルール
- 200-299: パターンルール[^4]


## 従来の.cursorrulesファイル

### 基本概要

.cursorrulesファイルは、プロジェクトのルートディレクトリに配置する設定ファイルです[^7]。このファイルにより、常にAIに意識させたいルールを記述できます[^7]。

### 作成方法

`cmd + shift + p`（windowsは`ctrl + shift + p`）で開く窓から「cursor rule」と入力することで作成できます[^8]。ルール名を決めて、そのファイルの中にルールを記載することができます[^8]。

### 利点

.cursorrulesファイルの利点は以下の通りです[^2]：

- **カスタマイズされたAIの動作**: AIの応答をプロジェクトの特定のニーズに合わせて調整
- **一貫性**: コーディング標準やベストプラクティスを定義してスタイルガイドラインに沿ったコード生成を保証
- **コンテキストの認識**: プロジェクトに関する重要なコンテキストをAIに提供
- **生産性の向上**: 明確に定義されたルールにより手動編集を減らし開発プロセスを加速
- **チームの整合性**: 共有の.cursorrulesファイルによりチーム全体で一貫したAI支援を実現[^2]


## ベストプラクティス

### ルール作成のガイドライン

#### 1. プロジェクトのコンテキストを明確にする

プロジェクトの目的や使用する技術スタックを明確に記述することで、AIが適切なコンテキストでコードを生成できるようになります[^9]。

#### 2. コーディングスタンダードを定義する

使用するコーディングスタイルや命名規則を明確にすることで、一貫性のあるコードが生成されます[^9]。

#### 3. 使用するライブラリやフレームワークを指定する

プロジェクトで使用する特定のライブラリやフレームワークを明記することで、AIが適切なライブラリを使用してコードを生成できます[^9]。

#### 4. セキュリティルールを設定する

セキュリティに関するルールを明記することで、生成されるコードが安全であることを保証できます[^9]。

### 効果的なルール設定例

```
あなたは、明確で読みやすいコードを作成することに主に重点を置いているプログラミング専門家です。

# コメント
- コードの先頭にコメントを追加してください。形式は以下の通りです。
- JavaScript: "JSDoc"
- Python: "docstring"

# 命名規則
- 変数名や関数名、オブジェクトのプロパティ名やメソッド名は、ローワーキャメルケースで統一。

# コーディング
- 効率よりも可読性を重視してください。
- プログラムの詳細は省略せず、冗長になっても理解しやすさを重視してください。
```


## 移行と将来性

### .cursorrulesからProject Rulesへの移行

従来の「Rules for AI」や「.cursorrules」も引き続き利用可能で、Project Rulesと併用することも可能です[^10]。しかし、詳細な制御、管理のしやすさ、プロジェクトとの一体性といったメリットから、現在では**Project Rules (.cursor/rules/*.mdc) を活用することが推奨**されています[^10]。

### 推奨される理由

- **より具体的・個別的な指示が可能**: `globs`パターンを使って特定のファイルやディレクトリに対して詳細なルールを個別に設定可能[^10]
- **構造化された管理**: YAMLフロントマターとMarkdown本文で構成され、ルールを目的ごとにファイル分割して管理しやすい[^10]
- **プロジェクトとの連携**: ルールファイルがプロジェクトディレクトリ内に配置されるため、Gitなどのバージョン管理システムで管理可能[^10]


## まとめ

Cursorのルール設定は、AI駆動の開発環境において重要な役割を果たします[^2]。適切なルール設定により、開発効率の向上、コードの一貫性確保、チーム開発の効率化が実現できます[^2][^9]。現在はProject Rules（.mdcファイル）の使用が推奨されており、従来の.cursorrulesファイルから移行することで、より柔軟で管理しやすいルール設定が可能になります[^10]。

開発チームや個人開発者は、プロジェクトの特性に応じて適切なルール設定を行い、Cursorの機能を最大限に活用することで、より効率的で高品質な開発を実現できるでしょう[^2][^5]。

<div style="text-align: center">⁂</div>

[^1]: https://triggermind.com/ai-ide/cursor-editor-how-to-guide/

[^2]: https://qiita.com/tichise/items/9990a9785edf7011fac3

[^3]: https://qiita.com/tichise/items/751d7a6c01a4d74b766c

[^4]: https://zenn.dev/reyurnible/articles/448c50c171f8fb

[^5]: https://qiita.com/OtsukaTomoaki/items/b363de543251b11b3d98

[^6]: https://www.gaji.jp/blog/2025/05/14/22987/

[^7]: https://qiita.com/devneko/items/b23be4359a5e7a7c03b3

[^8]: https://re-ct.co.jp/articles/programming/1553/

[^9]: https://www.genspark.ai/spark/cursorの-cursorrulesの書き方の追加ベストプラクティス/61cc2ea6-863d-40ac-b24b-d6be3768548b

[^10]: https://qiita.com/channnnsm/items/5d6c2537dced7dacfa35

[^11]: https://qiita.com/ryamate/items/94a6170c4661242b4c1c

[^12]: https://zenn.dev/globis/articles/cursor-project-rules

[^13]: https://plus.cmknet.co.jp/cursor-ai-editor-settings-features/

[^14]: https://qiita.com/masakinihirota/items/4b55471205f7dd17482e

[^15]: https://www.hapi-tore.com/posts/ai_cursor-development-guide/

[^16]: https://qiita.com/yousan/items/b6b7ef0ac8313ba06a7a

[^17]: https://app.deskrex.ai/discover/cm626v5p300fc11y2kdudgen4

[^18]: https://blog.future.ad.jp/cursor/doc

[^19]: https://note.com/nobita2041/n/nbf9390e1878a

[^20]: https://note.com/aoki_monpro/n/n1fc1da69e355

[^21]: https://zenn.dev/manase/scraps/f63387529dff64

[^22]: https://taskhub.jp/magazine/service/12856/

[^23]: https://www.issoh.co.jp/tech/details/7095/

[^24]: https://zenn.dev/enlog/scraps/90543df8c7034e

[^25]: https://zenn.dev/takuya77088/articles/534570ca17a3da

[^26]: https://note.com/unikoukokun/n/nc4365a90c32c

[^27]: https://zenn.dev/kikagaku/articles/2d3752f773aa34

[^28]: https://cursor.document.top/ja/

[^29]: https://zenn.dev/umi_mori/books/ai-code-editor-cursor/viewer/how_to_use_docs

[^30]: https://zenn.dev/cureapp/articles/3bbaf2d42891d1

[^31]: https://qiita.com/tks_00/items/9a58548ad9f22a6a68af

[^32]: https://apidog.com/jp/blog/cursor-rules-jp/

[^33]: https://forum.cursor.com/t/how-to-create-project-rules/66934

[^34]: https://github.com/PatrickJS/awesome-cursorrules

[^35]: https://zenn.dev/airiswim/articles/040eaaf7a92e49

[^36]: https://zenn.dev/tkwbr999/articles/41a522427a3764

[^37]: https://note.com/life_to_ai/n/nb87d1c86273f

[^38]: https://zenn.dev/aimasaou/articles/ad3f8b499ebe91

