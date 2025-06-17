const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

// 設計書準拠：シンプルな日本語ログのみ
function log(message) {
    console.log(message);
}

// 設計書準拠：MIMEタイプ設定
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

// 設計書準拠：可視化サーバークラス
class VisualizationServer {
    constructor(port = 8000) {
        this.port = port;
        this.webDir = path.join(__dirname, '..', 'web');
        this.outputDir = path.join(__dirname, '..', 'output');
    }

    // 設計書準拠：サーバー開始
    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(this.port, () => {
            log(`MIRRALISM V4 可視化サーバーが起動しました`);
            log(`URL: http://localhost:${this.port}`);
            log(`Webディレクトリ: ${this.webDir}`);
        });

        return server;
    }

    // 設計書準拠：リクエスト処理
    async handleRequest(req, res) {
        try {
            const parsedUrl = url.parse(req.url, true);
            let filePath = parsedUrl.pathname;

            // ルートへのアクセスはindex.htmlにリダイレクト
            if (filePath === '/') {
                filePath = '/index.html';
            }

            // APIエンドポイントの処理
            if (filePath.startsWith('/api/')) {
                await this.handleApiRequest(parsedUrl, res);
                return;
            }

            // 静的ファイルの処理
            await this.serveStaticFile(filePath, res);

        } catch (error) {
            log('リクエスト処理エラー: ' + error.message);
            this.sendErrorResponse(res, 500, 'Internal Server Error');
        }
    }

    // 設計書準拠：静的ファイル配信
    async serveStaticFile(filePath, res) {
        try {
            let fullPath;

            // 可視化データへのアクセス
            if (filePath.startsWith('/output/')) {
                fullPath = path.join(this.outputDir, filePath.replace('/output/', ''));
            } else {
                fullPath = path.join(this.webDir, filePath);
            }

            const data = await fs.readFile(fullPath);
            const ext = path.extname(fullPath);
            const mimeType = mimeTypes[ext] || 'text/plain';

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);

        } catch (error) {
            if (error.code === 'ENOENT') {
                this.sendErrorResponse(res, 404, 'File Not Found');
            } else {
                log('ファイル読み込みエラー: ' + error.message);
                this.sendErrorResponse(res, 500, 'Internal Server Error');
            }
        }
    }

    // 設計書準拠：APIリクエスト処理
    async handleApiRequest(parsedUrl, res) {
        const pathname = parsedUrl.pathname;

        switch (pathname) {
            case '/api/visualization-data':
                await this.getVisualizationData(res);
                break;
            case '/api/refresh-data':
                await this.refreshVisualizationData(res);
                break;
            default:
                this.sendErrorResponse(res, 404, 'API endpoint not found');
        }
    }

    // 設計書準拠：可視化データ取得API
    async getVisualizationData(res) {
        try {
            const dataPath = path.join(this.outputDir, 'visualization-data.json');
            const data = await fs.readFile(dataPath, 'utf8');

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);

        } catch (error) {
            log('可視化データ取得エラー: ' + error.message);
            this.sendErrorResponse(res, 500, 'Data not available');
        }
    }

    // 設計書準拠：可視化データ更新API
    async refreshVisualizationData(res) {
        try {
            // 可視化データプロセッサーを実行
            const { VisualizationDataProcessor } = require('./visualization-data-processor');
            const processor = new VisualizationDataProcessor();
            const outputPath = await processor.exportVisualizationData();

            if (outputPath) {
                const data = await fs.readFile(outputPath, 'utf8');
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(data);
                log('可視化データを更新しました');
            } else {
                this.sendErrorResponse(res, 500, 'Data refresh failed');
            }

        } catch (error) {
            log('データ更新エラー: ' + error.message);
            this.sendErrorResponse(res, 500, 'Data refresh failed');
        }
    }

    // 設計書準拠：エラーレスポンス送信
    sendErrorResponse(res, statusCode, message) {
        res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
        res.end(message);
    }
}

// 設計書準拠：エクスポート
module.exports = {
    VisualizationServer
};

// 設計書準拠：直接実行
if (require.main === module) {
    const server = new VisualizationServer();
    server.start();
}