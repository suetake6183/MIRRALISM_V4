# アーカイブシステム設計

## 概要
分析済みのファイルを自動的にアーカイブし、inputフォルダをクリーンに保つ仕組み

## アーカイブの流れ

### 1. 分析完了後の自動アーカイブ
```javascript
// analyze.js に追加
async function archiveProcessedFile(originalPath, analysisId) {
    console.log('ファイルをアーカイブ中...');
    
    // 1. 現在の日付でフォルダを作成
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const archivePath = `archive/${year}/${month}/`;
    
    // フォルダが無ければ作成
    await fs.mkdir(archivePath, { recursive: true });
    
    // 2. ファイルを移動
    const filename = path.basename(originalPath);
    const newPath = path.join(archivePath, filename);
    await fs.rename(originalPath, newPath);
    
    // 3. メタデータを保存
    const metadata = {
        originalPath: originalPath,
        archivedPath: newPath,
        analysisId: analysisId,
        archivedAt: now.toISOString(),
        fileType: await detectContentType(await fs.readFile(newPath, 'utf-8'))
    };
    
    const metadataPath = path.join(archivePath, `${filename}.meta.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    // 4. インデックスDBに記録
    await updateArchiveIndex(filename, metadata);
    
    console.log(`✓ ${filename} をアーカイブしました`);
    console.log(`  保存先: ${newPath}`);
}
```

## アーカイブ検索機能

### archive/index.db のスキーマ
```sql
CREATE TABLE archive_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_filename TEXT NOT NULL,
    archived_path TEXT NOT NULL,
    file_type TEXT,
    analysis_id TEXT,
    content_summary TEXT, -- 内容の要約（検索用）
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    year INTEGER,
    month INTEGER,
    UNIQUE(archived_path)
);

-- 検索用インデックス
CREATE INDEX idx_filename ON archive_index(original_filename);
CREATE INDEX idx_date ON archive_index(year, month);
CREATE INDEX idx_type ON archive_index(file_type);
```

### 検索機能
```javascript
// scripts/search-archive.js
async function searchArchive(query) {
    const db = await connectArchiveDB();
    
    // ファイル名で検索
    const results = await db.all(`
        SELECT * FROM archive_index 
        WHERE original_filename LIKE ? 
        OR content_summary LIKE ?
        ORDER BY archived_at DESC
        LIMIT 20
    `, [`%${query}%`, `%${query}%`]);
    
    console.log(`「${query}」の検索結果：`);
    results.forEach(r => {
        console.log(`- ${r.original_filename} (${r.archived_at})`);
        console.log(`  場所: ${r.archived_path}`);
    });
    
    return results;
}
```

## 使用例

### 通常の分析フロー
```
1. input/meeting-2025-06-16.txt を配置
2. 分析を実行
3. 分析完了後、自動的に archive/2025/06/ に移動
4. inputフォルダは空になる
```

### アーカイブの確認
```
末武：「過去のファイルを確認したい」
Claude Code：searchArchive('meeting') を実行
→ アーカイブされた会議ファイル一覧を表示
```

### 再分析
```javascript
// アーカイブからファイルを再分析
async function reanalyzeFromArchive(archivedPath) {
    console.log('アーカイブから再分析します...');
    
    // 一時的にinputにコピー
    const tempPath = `input/temp_${path.basename(archivedPath)}`;
    await fs.copyFile(archivedPath, tempPath);
    
    // 分析実行
    await analyzeDocument(tempPath);
    
    // 分析後は削除（元のアーカイブは残す）
    await fs.unlink(tempPath);
}
```

## アーカイブのメンテナンス

### 古いファイルの圧縮
```javascript
// 6ヶ月以上前のファイルを圧縮
async function compressOldArchives() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // 対象フォルダを特定して圧縮
    // ...
}
```

### 容量管理
```javascript
// アーカイブの容量を確認
async function checkArchiveSize() {
    const stats = await getDirectorySize('archive/');
    console.log(`アーカイブ容量: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    if (stats.size > 1024 * 1024 * 1024) { // 1GB超
        console.log('⚠️ アーカイブが1GBを超えています。整理を検討してください。');
    }
}
```

## 設定オプション

### 自動アーカイブの有効/無効
```javascript
// config.json
{
    "autoArchive": true,        // 分析後の自動アーカイブ
    "archiveDelay": 0,          // アーカイブまでの待機時間（分）
    "keepOriginal": false       // コピーして元ファイルも残す
}
```

### 手動アーカイブ
```
末武：「inputフォルダをクリーンアップして」
Claude Code：すべての分析済みファイルをアーカイブ
```

## エラー処理

```javascript
try {
    await archiveProcessedFile(file, analysisId);
} catch (error) {
    if (error.code === 'ENOSPC') {
        console.error('ディスク容量が不足しています');
    } else {
        console.error('アーカイブ中にエラーが発生しました:', error.message);
        // アーカイブに失敗してもinputには残す
    }
}
```