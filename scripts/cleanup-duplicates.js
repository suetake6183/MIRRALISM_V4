const OutputManager = require('./shared/output-manager');
const { log } = require('./shared/logger');

async function cleanupDuplicateAnalysisFiles() {
    log('🔄 重複分析ファイルの整理を開始...');
    
    try {
        const manager = new OutputManager();
        
        // 社労士_下重さん.txtの重複ファイルを整理
        const inputPath = 'input/社労士_下重さん.txt';
        const movedCount = await manager.cleanupDuplicateFiles(inputPath);
        
        // 分析統計を表示
        const stats = await manager.getAnalysisStatistics();
        
        log('\n📊 整理結果:');
        log(`✅ アーカイブしたファイル: ${movedCount}件`);
        log(`📁 残存ファイル: ${stats.totalFiles}件`);
        log(`📈 総分析回数: ${stats.totalAnalyses}回`);
        
        log('\n📋 現在のファイル一覧:');
        stats.files.forEach(file => {
            log(`  ${file.fileName} (${file.analysisCount}回分析)`);
        });
        
        log('\n✅ 重複ファイル整理が完了しました');
        
    } catch (error) {
        log('❌ 重複ファイル整理エラー: ' + error.message);
        process.exit(1);
    }
}

// スクリプト実行
if (require.main === module) {
    cleanupDuplicateAnalysisFiles();
}

module.exports = { cleanupDuplicateAnalysisFiles }; 