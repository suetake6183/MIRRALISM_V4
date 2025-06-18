const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupDatabases() {
    console.log('データベースを初期化中...\n');
    
    try {
        // learning.db の作成
        console.log('1. learning.db を作成中...');
        const learningDb = await open({
            filename: path.join(__dirname, '../../database/learning.db'),
            driver: sqlite3.Database
        });
        
        await learningDb.exec(`
            CREATE TABLE IF NOT EXISTS learning_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_description TEXT NOT NULL,
                pattern_details TEXT,
                success_count INTEGER DEFAULT 1,
                context TEXT,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS feedback_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_method TEXT NOT NULL,
                user_feedback TEXT NOT NULL,
                improved_method TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS analysis_results_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id TEXT NOT NULL,
                result_section TEXT,
                original_conclusion TEXT,
                user_feedback TEXT,
                corrected_conclusion TEXT,
                feedback_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS file_type_learning (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_content_sample TEXT,
                llm_judgment TEXT,
                llm_reasoning TEXT,
                user_feedback TEXT,
                correct_type TEXT,
                is_correct BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS analysis_method_effectiveness (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_type TEXT,
                analysis_method TEXT,
                user_satisfaction_score INTEGER,
                specific_feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
        `);
        
        console.log('✓ learning.db 作成完了');
        await learningDb.close();
        
        // profiles.db の作成
        console.log('\n2. profiles.db を作成中...');
        const profilesDb = await open({
            filename: path.join(__dirname, '../../database/profiles.db'),
            driver: sqlite3.Database
        });
        
        await profilesDb.exec(`
            CREATE TABLE IF NOT EXISTS persons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                role TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS personality_traits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id INTEGER,
                trait_type TEXT,
                trait_description TEXT,
                confidence_score REAL DEFAULT 0.5,
                observed_count INTEGER DEFAULT 1,
                last_observed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (person_id) REFERENCES persons(id)
            );
            
            CREATE TABLE IF NOT EXISTS relationship_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person1_id INTEGER,
                person2_id INTEGER,
                pattern_type TEXT,
                pattern_description TEXT,
                confidence_score REAL DEFAULT 0.5,
                observed_count INTEGER DEFAULT 1,
                last_observed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (person1_id) REFERENCES persons(id),
                FOREIGN KEY (person2_id) REFERENCES persons(id)
            );
        `);
        
        console.log('✓ profiles.db 作成完了');
        await profilesDb.close();
        
        // archive-index.db の作成
        console.log('\n3. archive-index.db を作成中...');
        const archiveDb = await open({
            filename: path.join(__dirname, '../../database/archive-index.db'),
            driver: sqlite3.Database
        });
        
        await archiveDb.exec(`
            CREATE TABLE IF NOT EXISTS archive_index (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_filename TEXT NOT NULL,
                archived_path TEXT NOT NULL,
                file_type TEXT,
                analysis_id TEXT,
                content_summary TEXT,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                year INTEGER,
                month INTEGER,
                UNIQUE(archived_path)
            );
            
            CREATE INDEX IF NOT EXISTS idx_archive_date ON archive_index(year, month);
            CREATE INDEX IF NOT EXISTS idx_archive_filename ON archive_index(original_filename);
        `);
        
        console.log('✓ archive-index.db 作成完了');
        await archiveDb.close();
        
        console.log('\nすべてのデータベースの初期化が完了しました');
        console.log('\n次のステップ:');
        console.log('1. "npm run analyze" で分析を開始');
        console.log('2. inputフォルダに分析したいファイルを配置');
        
    } catch (error) {
        console.error('\n❌ エラーが発生しました:', error.message);
        if (error.code === 'SQLITE_CANTOPEN') {
            console.error('データベースフォルダへのアクセス権限を確認してください。');
        }
        process.exit(1);
    }
}

// スクリプトを実行
setupDatabases();