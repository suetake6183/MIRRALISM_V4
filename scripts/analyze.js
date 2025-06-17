const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { LLMLearningManager, LLMWorkflowManager } = require('./llm-manager');
const { IntegratedSearchInterface } = require('./search-interface');

// 設計書準拠：シンプルな日本語ログのみ
function log(message) {
    console.log(message);
}

// 設計書準拠：JST時刻取得（装飾なし）
function getJSTTimestamp() {
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jst = new Date(now.getTime() + (jstOffset * 60 * 1000));
    return jst.toISOString().replace('T', ' ').substring(0, 19);
}

// 設計書準拠：データベース用JST時刻
function getJSTForDB() {
    return getJSTTimestamp();
}

// 設計書準拠：対話型学習プロンプト（シンプル版）
async function displayLearningPrompt(fileType, analysisMethod) {
    log('\n対話型学習システム');
    log('分析結果の改善のため、フィードバックをお願いします。');
    log('');
    log('判定結果: ' + fileType);
    log('分析手法: ' + analysisMethod);
    log('');
    log('フィードバック方法：');
    log('1. ファイル種別判定が正確でしたか？');
    log('2. 分析手法は適切でしたか？');  
    log('3. 分析結果に満足していますか？');
    log('');
    log('次回実行時に改善した分析を提供します。');
    
    // 学習データの簡単な保存（設計書制約内）
    try {
        const db = await open({
            filename: path.join(__dirname, '..', 'database', 'learning.db'),
            driver: sqlite3.Database
        });
        
        await db.run(`
            INSERT INTO learning_patterns 
            (pattern_description, pattern_details, context, created_at)
            VALUES (?, ?, ?, datetime('now', '+9 hours'))
        `, [
            '対話型学習機会',
            '判定: ' + fileType + ', 手法: ' + analysisMethod,
            'ユーザーフィードバック要請'
        ]);
        
        await db.close();
        log('学習データを記録しました');
    } catch (error) {
        log('学習データ保存中にエラーが発生しましたが、分析は正常に完了しています。');
    }
}

// 設計書準拠：サブタスク10.6 Interactive Workflow with Claude Code
async function createInteractiveWorkflow(contentSample, learningData) {
    log('\n=== 対話型ワークフロー開始 ===');
    log('Claude Codeとの構造化された対話システム');
    log('');
    
    // Step 1: コンテンツ提示
    log('Step 1: 分析対象コンテンツの提示');
    log('─'.repeat(50));
    log(contentSample);
    log('─'.repeat(50));
    
    // Step 2: 学習データ参照情報の提供
    if (learningData && learningData.length > 0) {
        log('\nStep 2: 過去の学習データ参照');
        learningData.slice(0, 3).forEach((data, index) => {
            log(`${index + 1}. ${data.judgment} - ${data.reasoning}`);
        });
    } else {
        log('\nStep 2: 学習データなし（初回分析）');
    }
    
    // Step 3: 判定要請
    log('\nStep 3: Claude Codeによる判定要請');
    log('判定カテゴリ:');
    log('• meeting: 会議・打ち合わせの議事録');
    log('• personal: 個人の思考メモ・日記');
    log('• proposal: 提案書・企画書');
    log('• unknown: 判定困難');
    
    // Step 4: 対話型実行の指示
    log('\nStep 4: 対話型実行指示');
    log('Claude Codeがコンテンツを分析し、判定結果を提供してください。');
    log('');
    
    return {
        step: 'awaiting_llm_judgment',
        message: '対話型実行モード: Claude Codeによる判定をお待ちしています'
    };
}

// 設計書準拠：LLM応答の解釈と処理
async function interpretLLMResponse(judgment, reasoning) {
    log('\n=== LLM応答の解釈 ===');
    log('受信した判定: ' + judgment);
    log('判定理由: ' + reasoning);
    
    // 判定結果の検証
    const validTypes = ['meeting', 'personal', 'proposal', 'unknown'];
    const isValidJudgment = validTypes.includes(judgment.toLowerCase());
    
    if (!isValidJudgment) {
        log('警告: 無効な判定結果です。meeting/personal/proposal/unknownのいずれかを指定してください。');
        return { valid: false, judgment: 'unknown', reasoning: '判定結果が無効' };
    }
    
    log('判定結果が有効です。分析を続行します。');
    return { 
        valid: true, 
        judgment: judgment.toLowerCase(), 
        reasoning: reasoning,
        timestamp: getJSTTimestamp()
    };
}

// 設計書準拠：動的インタラクション管理
async function manageDynamicInteraction(step, data) {
    log('\n=== 動的インタラクション管理 ===');
    log('現在のステップ: ' + step);
    
    switch (step) {
        case 'content_analysis':
            log('フェーズ: コンテンツ分析');
            return await createInteractiveWorkflow(data.content, data.learningData);
            
        case 'judgment_received':
            log('フェーズ: 判定結果受信');
            return await interpretLLMResponse(data.judgment, data.reasoning);
            
        case 'analysis_execution':
            log('フェーズ: 分析実行');
            return await performAnalysis(data.content, data.fileType);
            
        case 'learning_feedback':
            log('フェーズ: 学習フィードバック');
            return await displayLearningPrompt(data.fileType, data.method);
            
        default:
            log('不明なステップです: ' + step);
            return { error: '不明なインタラクションステップ' };
    }
}

// 設計書準拠：LLM中心判定（対話型のみ）
async function requestLLMJudgment(contentSample, learningData) {
    log('\n=== Claude Code（LLM）判定要請 ===');
    
    // サブタスク10.6: 対話型ワークフローの実行
    const workflowResult = await createInteractiveWorkflow(contentSample, learningData);
    
    // 設計書準拠：対話型実行のため、ここで処理を停止
    throw new Error('対話型実行モード: Claude Codeが直接判定してください。');
}

// 設計書準拠：会議内容分析（シンプル版）
async function analyzeMeetingContent(content) {
    log('会議内容を分析中です...');
    
    // 基本情報の抽出
    const participants = [];
    const participantPattern = /参加者[：:](.*?)\n/;
    const match = content.match(participantPattern);
    if (match) {
        const names = match[1].split(/[、,]/).map(n => n.trim());
        participants.push(...names);
    }
    
    // 発言の抽出
    const statements = [];
    const statementPattern = /([^：:]+)[：:]([^\n]+)/g;
    let statementMatch;
    while ((statementMatch = statementPattern.exec(content)) !== null) {
        if (!statementMatch[1].includes('日時') && !statementMatch[1].includes('参加者')) {
            statements.push({
                speaker: statementMatch[1].trim(),
                content: statementMatch[2].trim()
            });
        }
    }
    
    // シンプルな分析結果
    const analysisResult = {
        type: 'meeting',
        participants: participants,
        statementCount: statements.length,
        summary: '会議の基本的な構造を分析しました',
        timestamp: getJSTTimestamp()
    };
    
    return analysisResult;
}

// 設計書準拠：個人コンテンツ分析（シンプル版）
async function analyzePersonalContent(content) {
    log('個人コンテンツを分析中です...');
    
    const analysisResult = {
        type: 'personal',
        contentLength: content.length,
        summary: '個人的な思考内容を分析しました',
        timestamp: getJSTTimestamp()
    };
    
    return analysisResult;
}

// 設計書準拠：提案書分析（シンプル版）
async function analyzeProposalContent(content) {
    log('提案書内容を分析中です...');
    
    const analysisResult = {
        type: 'proposal',
        contentLength: content.length,
        summary: '提案書の構造を分析しました',
        timestamp: getJSTTimestamp()
    };
    
    return analysisResult;
}

// 設計書準拠：分析実行（シンプル版）
async function performAnalysis(content, fileType) {
    let analysisResult;
    
    switch (fileType) {
        case 'meeting':
            analysisResult = await analyzeMeetingContent(content);
            break;
        case 'personal':
            analysisResult = await analyzePersonalContent(content);
            break;
        case 'proposal':
            analysisResult = await analyzeProposalContent(content);
            break;
        default:
            analysisResult = {
                type: 'unknown',
                summary: '分析対象の判定ができませんでした',
                timestamp: getJSTTimestamp()
            };
    }
    
    return analysisResult;
}

// 設計書準拠：結果表示（シンプル版）
function displayAnalysisResult(result) {
    log('\n=== 分析結果 ===');
    log('種別: ' + result.type);
    log('概要: ' + result.summary);
    log('分析時刻: ' + result.timestamp);
    
    if (result.participants) {
        log('参加者: ' + result.participants.join(', '));
    }
    
    if (result.statementCount) {
        log('発言数: ' + result.statementCount);
    }
    
    log('=================\n');
}

// 設計書準拠：メイン処理（対話型実行のみ）
async function main() {
    try {
        log('MIRRALISM V4 - LLM中心人間関係分析システム');
        log('設計書準拠版（対話型実行のみ）');
        log('タスク10: LLM学習システム統合版');
        log('');
        
        // LLMワークフローマネージャーの初期化
        const workflowManager = new LLMWorkflowManager();
        
        // 検索インターフェースの初期化
        const searchInterface = new IntegratedSearchInterface();
        
        // inputフォルダのファイル一覧取得
        const inputDir = path.join(__dirname, '..', 'input');
        const files = await fs.readdir(inputDir);
        const txtFiles = files.filter(file => file.endsWith('.txt'));
        
        if (txtFiles.length === 0) {
            log('inputフォルダにtxtファイルが見つかりません。');
            return;
        }
        
        log('利用可能なファイル:');
        txtFiles.forEach((file, index) => {
            log((index + 1) + '. ' + file);
        });
        
        // 設計書準拠：最初のファイルでLLM統合分析を開始
        if (txtFiles.length > 0) {
            const firstFile = txtFiles[0];
            const filePath = path.join(inputDir, firstFile);
            
            log('\nLLM統合分析システム開始: ' + firstFile);
            
            // 分析支援検索の実行
            log('分析支援検索を実行中...');
            const analysisSupport = await searchInterface.searchForAnalysisSupport('meeting', 'システム開発');
            if (analysisSupport.recommendations && analysisSupport.recommendations.length > 0) {
                log('推奨アプローチ: ' + analysisSupport.recommendations[0].content);
            }
            
            await workflowManager.initiateLLMAnalysis(filePath);
        }
        
    } catch (error) {
        log('エラーが発生しました: ' + error.message);
        
        // 対話型実行の場合の適切な処理
        if (error.message.includes('対話型実行モード')) {
            log('\n次の手順:');
            log('1. Claude Codeがファイル内容を確認');
            log('2. Claude Codeが種別を判定（meeting/personal/proposal/unknown）');
            log('3. 判定結果に基づいて分析を実行');
            log('4. 学習サイクルでフィードバックを収集');
        }
    }
}

// 設計書準拠：エクスポート（タスク10統合対応）
module.exports = {
    main,
    performAnalysis,
    displayAnalysisResult,
    displayLearningPrompt,
    createInteractiveWorkflow,
    interpretLLMResponse,
    manageDynamicInteraction,
    LLMLearningManager,
    LLMWorkflowManager,
    IntegratedSearchInterface
};

// 設計書準拠：直接実行
if (require.main === module) {
    main();
} 