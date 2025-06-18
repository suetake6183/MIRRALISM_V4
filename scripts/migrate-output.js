const OutputManager = require('./shared/output-manager');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('./shared/logger');

async function migrateOutputStructure() {
    log('🔄 Output構造の移行を開始...');
    
    try {
        const manager = new OutputManager();
        await manager.initializeDirectories();
        
        // 既存のanalysisファイルを移行
        const oldDir = path.join(__dirname, '..', 'output', 'analysis');
        const newDir = path.join(__dirname, '..', 'output', 'analysis_results');
        
        try {
            const files = await fs.readdir(oldDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const oldPath = path.join(oldDir, file);
                    const newPath = path.join(newDir, file);
                    
                    await fs.copyFile(oldPath, newPath);
                    log(`📁 移行: ${file}`);
                }
            }
            
            log('✅ ファイル移行完了');
            
            // 古いディレクトリを削除
            await fs.rmdir(oldDir, { recursive: true });
            log('🗑️ 古いanalysisディレクトリを削除');
            
        } catch (error) {
            log('⚠️ 移行中にエラー: ' + error.message);
        }
        
        // 未使用ディレクトリのクリーンアップ
        const outputBase = path.join(__dirname, '..', 'output');
        const unusedDirs = ['insights', 'profiles', 'jscpd-report'];
        
        for (const dir of unusedDirs) {
            const dirPath = path.join(outputBase, dir);
            try {
                await fs.rmdir(dirPath, { recursive: true });
                log(`🗑️ 未使用ディレクトリを削除: ${dir}`);
            } catch (error) {
                // ディレクトリが存在しない場合は無視
            }
        }
        
        log('✅ Output構造の移行が完了しました');
        log('📁 新しい構造:');
        log('   output/');
        log('   ├── analysis_results/  # すべての分析結果');
        log('   └── system_reports/    # システムレポート');
        
    } catch (error) {
        log('❌ 移行エラー: ' + error.message);
        throw error;
    }
}

// 直接実行された場合
if (require.main === module) {
    migrateOutputStructure().catch(console.error);
}

module.exports = migrateOutputStructure; 