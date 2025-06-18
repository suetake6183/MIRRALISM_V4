const path = require('path');

// 設計書準拠：JST時刻取得
function getJSTTimestamp() {
    const now = new Date();
    const jstOffset = 9 * 60;
    const jst = new Date(now.getTime() + (jstOffset * 60 * 1000));
    return jst.toISOString().replace('T', ' ').substring(0, 19);
}

// 設計書準拠：シンプルな日本語ログのみ
function log(message) {
    console.log(message);
}

// 設計書準拠：JST時刻付きログ（デバッグ用）
function logWithTimestamp(message) {
    console.log(`[${getJSTTimestamp()}] ${message}`);
}

// 設計書準拠：エラーログ
function logError(message, error = null) {
    console.error(`エラー: ${message}`);
    if (error && error.message) {
        console.error(`詳細: ${error.message}`);
    }
}

// 設計書準拠：共通ユーティリティ
module.exports = {
    log,
    logWithTimestamp,
    logError,
    getJSTTimestamp
};