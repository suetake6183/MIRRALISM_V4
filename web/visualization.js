// MIRRALISM V4 - 関係性可視化システム
// 設計書準拠：シンプルで直感的なD3.js可視化

class VisualizationSystem {
    constructor() {
        this.data = null;
        this.currentMode = 'network';
        this.currentFilter = 'all';
        this.svg = null;
        this.width = 0;
        this.height = 0;
        this.simulation = null;
        
        this.init();
    }
    
    // 設計書準拠：システム初期化
    init() {
        this.setupEventListeners();
        this.loadVisualizationData();
        this.setupSVGContainer();
    }
    
    // 設計書準拠：イベントリスナー設定
    setupEventListeners() {
        document.getElementById('viewMode').addEventListener('change', (e) => {
            this.currentMode = e.target.value;
            this.updateVisualization();
        });
        
        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.updateVisualization();
        });
        
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadVisualizationData();
        });
        
        document.getElementById('exportSVG').addEventListener('click', () => {
            this.exportSVG();
        });
        
        document.getElementById('exportPNG').addEventListener('click', () => {
            this.exportPNG();
        });
        
        window.addEventListener('resize', () => {
            this.resizeVisualization();
        });
    }
    
    // 設計書準拠：データ読み込み
    async loadVisualizationData() {
        try {
            this.showLoading('データを読み込み中...');
            
            // サーバーAPIから可視化データを取得
            const response = await fetch('/api/visualization-data');
            if (!response.ok) {
                throw new Error('データの読み込みに失敗しました');
            }
            
            this.data = await response.json();
            this.hideLoading();
            this.updateStatistics();
            this.updateLegend();
            this.updateVisualization();
            
        } catch (error) {
            this.showError('データの読み込みエラー: ' + error.message);
        }
    }
    
    // 設計書準拠：SVGコンテナ設定
    setupSVGContainer() {
        const container = document.getElementById('chartContainer');
        const rect = container.getBoundingClientRect();
        
        this.width = rect.width - 40;
        this.height = 600;
        
        // 既存のSVGを削除
        d3.select('#chartContainer svg').remove();
        
        // 新しいSVGを作成
        this.svg = d3.select('#chartContainer')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        // ズーム機能の追加
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.svg.select('.zoom-group')
                    .attr('transform', event.transform);
            });
            
        this.svg.call(zoom);
        
        // ズーム用グループ
        this.svg.append('g').attr('class', 'zoom-group');
    }
    
    // 設計書準拠：可視化更新
    updateVisualization() {
        if (!this.data) return;
        
        const filteredData = this.filterData();
        
        switch (this.currentMode) {
            case 'network':
                this.renderNetworkView(filteredData);
                break;
            case 'timeline':
                this.renderTimelineView(filteredData);
                break;
            case 'category':
                this.renderCategoryView(filteredData);
                break;
        }
    }
    
    // 設計書準拠：データフィルタリング
    filterData() {
        if (this.currentFilter === 'all') {
            return this.data;
        }
        
        const filteredNodes = this.data.nodes.filter(node => 
            node.type === 'category' || node.category === this.currentFilter
        );
        
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = this.data.links.filter(link => 
            nodeIds.has(link.source) && nodeIds.has(link.target)
        );
        
        return {
            ...this.data,
            nodes: filteredNodes,
            links: filteredLinks
        };
    }
    
    // 設計書準拠：ネットワーク表示
    renderNetworkView(data) {
        const g = this.svg.select('.zoom-group');
        g.selectAll('*').remove();
        
        // Force simulation設定
        this.simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 5));
        
        // リンクの描画
        const links = g.selectAll('.link')
            .data(data.links)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke-width', d => Math.sqrt(d.strength * 3));
        
        // ノードの描画
        const nodes = g.selectAll('.node')
            .data(data.nodes)
            .enter().append('circle')
            .attr('class', 'node')
            .attr('r', d => d.size)
            .style('fill', d => d.color || this.getNodeColor(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.showNodeDetails(d))
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d)));
        
        // ラベルの描画
        const labels = g.selectAll('.node-label')
            .data(data.nodes)
            .enter().append('text')
            .attr('class', 'node-label')
            .text(d => d.label);
        
        // シミュレーション更新
        this.simulation.on('tick', () => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            nodes
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            labels
                .attr('x', d => d.x)
                .attr('y', d => d.y + 4);
        });
    }
    
    // 設計書準拠：時系列表示
    renderTimelineView(data) {
        const g = this.svg.select('.zoom-group');
        g.selectAll('*').remove();
        
        const timeSeriesData = data.timeSeries || [];
        if (timeSeriesData.length === 0) return;
        
        // 時間軸設定
        const xScale = d3.scaleTime()
            .domain(d3.extent(timeSeriesData, d => new Date(d.timestamp)))
            .range([50, this.width - 50]);
        
        const yScale = d3.scaleLinear()
            .domain([0, timeSeriesData.length])
            .range([this.height - 50, 50]);
        
        // 軸の描画
        g.append('g')
            .attr('transform', `translate(0, ${this.height - 50})`)
            .call(d3.axisBottom(xScale));
        
        g.append('g')
            .attr('transform', 'translate(50, 0)')
            .call(d3.axisLeft(yScale));
        
        // データポイントの描画
        g.selectAll('.timeline-point')
            .data(timeSeriesData)
            .enter().append('circle')
            .attr('class', 'timeline-point node')
            .attr('cx', d => xScale(new Date(d.timestamp)))
            .attr('cy', (d, i) => yScale(i))
            .attr('r', 8)
            .style('fill', d => this.getCategoryColor(d.category))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.showNodeDetails(d));
        
        // 接続線の描画
        const line = d3.line()
            .x(d => xScale(new Date(d.timestamp)))
            .y((d, i) => yScale(i))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(timeSeriesData)
            .attr('fill', 'none')
            .attr('stroke', '#666')
            .attr('stroke-width', 2)
            .attr('opacity', 0.5)
            .attr('d', line);
    }
    
    // 設計書準拠：カテゴリ別表示
    renderCategoryView(data) {
        const g = this.svg.select('.zoom-group');
        g.selectAll('*').remove();
        
        const categories = data.nodes.filter(n => n.type === 'category');
        if (categories.length === 0) return;
        
        const radius = Math.min(this.width, this.height) / 3;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // 円形レイアウト
        categories.forEach((cat, i) => {
            const angle = (i / categories.length) * 2 * Math.PI;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // カテゴリノード
            g.append('circle')
                .attr('class', 'node')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', cat.size)
                .style('fill', cat.color)
                .on('mouseover', (event) => this.showTooltip(event, cat))
                .on('mouseout', () => this.hideTooltip())
                .on('click', (event) => this.showNodeDetails(cat));
            
            // カテゴリラベル
            g.append('text')
                .attr('class', 'node-label')
                .attr('x', x)
                .attr('y', y + cat.size + 20)
                .text(cat.label)
                .style('font-size', '14px')
                .style('font-weight', 'bold');
            
            // カテゴリ内パターンの配置
            const patterns = data.nodes.filter(n => n.category === cat.id && n.type === 'pattern');
            patterns.forEach((pattern, j) => {
                const patternAngle = angle + (j - patterns.length/2) * 0.3;
                const patternRadius = radius * 0.7;
                const px = centerX + Math.cos(patternAngle) * patternRadius;
                const py = centerY + Math.sin(patternAngle) * patternRadius;
                
                g.append('circle')
                    .attr('class', 'node')
                    .attr('cx', px)
                    .attr('cy', py)
                    .attr('r', pattern.size)
                    .style('fill', cat.color)
                    .style('opacity', 0.7)
                    .on('mouseover', (event) => this.showTooltip(event, pattern))
                    .on('mouseout', () => this.hideTooltip())
                    .on('click', (event) => this.showNodeDetails(pattern));
                
                // パターンとカテゴリの接続線
                g.append('line')
                    .attr('class', 'link')
                    .attr('x1', x)
                    .attr('y1', y)
                    .attr('x2', px)
                    .attr('y2', py)
                    .style('stroke', cat.color)
                    .style('stroke-width', 1)
                    .style('opacity', 0.5);
            });
        });
    }
    
    // 設計書準拠：ノード色取得
    getNodeColor(node) {
        if (node.type === 'category') {
            return node.color;
        }
        return this.getCategoryColor(node.category);
    }
    
    // 設計書準拠：カテゴリ色取得
    getCategoryColor(category) {
        const colors = {
            '分析': '#4CAF50',
            '判定': '#2196F3',
            '学習': '#FF9800',
            '対話': '#9C27B0',
            'テスト': '#F44336'
        };
        return colors[category] || '#666666';
    }
    
    // 設計書準拠：統計情報更新
    updateStatistics() {
        if (!this.data || !this.data.stats) return;
        
        const stats = this.data.stats;
        const container = document.getElementById('statsContainer');
        
        container.innerHTML = `
            <div class="stat-card">
                <h4>総パターン数</h4>
                <div class="value">${stats.totalPatterns}</div>
            </div>
            <div class="stat-card">
                <h4>カテゴリ数</h4>
                <div class="value">${Object.keys(stats.categoryDistribution).length}</div>
            </div>
            <div class="stat-card">
                <h4>最多カテゴリ</h4>
                <div class="value">${this.getMostFrequentCategory(stats.categoryDistribution)}</div>
            </div>
            <div class="stat-card">
                <h4>最終更新</h4>
                <div class="value" style="font-size: 0.8em;">${stats.lastUpdate}</div>
            </div>
        `;
    }
    
    // 設計書準拠：凡例更新
    updateLegend() {
        if (!this.data) return;
        
        const categories = this.data.nodes.filter(n => n.type === 'category');
        const container = document.getElementById('legendContainer');
        
        container.innerHTML = categories.map(cat => `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${cat.color}"></div>
                <span class="legend-label">${cat.label} (${cat.count})</span>
            </div>
        `).join('');
    }
    
    // 設計書準拠：ツールチップ表示
    showTooltip(event, data) {
        const tooltip = document.getElementById('tooltip');
        
        let content = `<strong>${data.label}</strong><br>`;
        if (data.type === 'category') {
            content += `タイプ: カテゴリ<br>`;
            content += `パターン数: ${data.count}`;
        } else {
            content += `カテゴリ: ${data.category}<br>`;
            content += `作成日: ${data.timestamp}`;
            if (data.details) {
                content += `<br>詳細: ${data.details.substring(0, 50)}...`;
            }
        }
        
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
    }
    
    // 設計書準拠：ツールチップ非表示
    hideTooltip() {
        document.getElementById('tooltip').style.display = 'none';
    }
    
    // 設計書準拠：ノード詳細表示
    showNodeDetails(data) {
        const container = document.getElementById('detailsContainer');
        
        let content = `<h5>${data.label}</h5>`;
        content += `<p><strong>タイプ:</strong> ${data.type}</p>`;
        
        if (data.type === 'category') {
            content += `<p><strong>パターン数:</strong> ${data.count}</p>`;
            content += `<p><strong>サイズ:</strong> ${data.size}</p>`;
        } else {
            content += `<p><strong>カテゴリ:</strong> ${data.category}</p>`;
            content += `<p><strong>作成日:</strong> ${data.timestamp}</p>`;
            if (data.details) {
                content += `<p><strong>詳細:</strong></p>`;
                content += `<pre style="white-space: pre-wrap; font-size: 0.8em; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${data.details}</pre>`;
            }
        }
        
        container.innerHTML = content;
    }
    
    // 設計書準拠：ドラッグイベント
    dragStarted(event, d) {
        if (!event.active && this.simulation) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    dragEnded(event, d) {
        if (!event.active && this.simulation) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // 設計書準拠：画面リサイズ対応
    resizeVisualization() {
        const container = document.getElementById('chartContainer');
        const rect = container.getBoundingClientRect();
        
        this.width = rect.width - 40;
        this.height = 600;
        
        if (this.svg) {
            this.svg.attr('width', this.width).attr('height', this.height);
            this.updateVisualization();
        }
    }
    
    // 設計書準拠：SVGエクスポート
    exportSVG() {
        if (!this.svg) return;
        
        const svgData = new XMLSerializer().serializeToString(this.svg.node());
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `mirralism-v4-visualization-${new Date().toISOString().split('T')[0]}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    
    // 設計書準拠：PNGエクスポート
    exportPNG() {
        if (!this.svg) return;
        
        const svgData = new XMLSerializer().serializeToString(this.svg.node());
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = this.width;
        canvas.height = this.height;
        
        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.drawImage(img, 0, 0);
            
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `mirralism-v4-visualization-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    
    // 設計書準拠：ユーティリティ関数
    getMostFrequentCategory(distribution) {
        return Object.keys(distribution).reduce((a, b) => 
            distribution[a] > distribution[b] ? a : b
        );
    }
    
    showLoading(message) {
        document.getElementById('loadingMessage').textContent = message;
        document.getElementById('loadingMessage').style.display = 'block';
    }
    
    hideLoading() {
        document.getElementById('loadingMessage').style.display = 'none';
    }
    
    showError(message) {
        const container = document.getElementById('chartContainer');
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

// 設計書準拠：システム初期化
document.addEventListener('DOMContentLoaded', () => {
    window.visualizationSystem = new VisualizationSystem();
});