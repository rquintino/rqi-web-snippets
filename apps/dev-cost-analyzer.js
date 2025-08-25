/**
 * Development Cost Analyzer - RQI Web Snippets
 * 
 * Main purpose: Analyze development costs and complexity of all web applications in the repository
 * 
 * Key methods:
 * - devCostAnalyzer() - Main Alpine.js component with reactive data
 * - calculateAppCosts() - Compute development costs for each app based on complexity
 * - updateCalculations() - Recalculate all costs when rates change
 * - renderCharts() - Create interactive visualizations using Chart.js
 * - exportCSV() / exportJSON() - Export analysis data in various formats
 * - filterApps() / sortApps() - Interactive filtering and sorting capabilities
 * - sanitizeHTML() - Sanitize HTML content to prevent XSS attacks
 */

// HTML sanitization function to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function devCostAnalyzer() {
    return {
        // UI State
        isDark: false,
        isFullscreen: false,
        sortBy: 'complexity',
        filterComplexity: 'all',
        showAssumptions: false,
        includeTests: true,
        
        // Cost Configuration
        rates: {
            junior: 35,
            intermediate: 75,
            advanced: 150
        },
        
        // Calculated Data
        appData: [],
        filteredApps: [],
        totalCosts: { junior: 0, intermediate: 0, advanced: 0 },
        totalHours: { junior: 0, intermediate: 0, advanced: 0 },
        charts: {},
        
        init() {
            this.isDark = localStorage.getItem('darkMode') === 'true';
            this.applyTheme();
            this.initializeAppData();
            this.calculateAllCosts();
            this.filteredApps = [...this.appData];
            this.sortApps();
            this.setupKeyboardShortcuts();
            // Ensure charts render after DOM is ready and costs are calculated
            this.$nextTick(() => {
                // Wait for Chart.js to be fully loaded
                const checkChartJS = () => {
                    if (typeof Chart !== 'undefined') {
                        this.renderCharts();
                    } else {
                        setTimeout(checkChartJS, 50);
                    }
                };
                setTimeout(checkChartJS, 100);
            });
        },
        
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // D to toggle dark mode
                if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (document.activeElement.tagName !== 'INPUT') {
                        this.toggleDarkMode();
                    }
                }
                // Ctrl/Cmd + E to export CSV
                if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                    e.preventDefault();
                    this.exportCSV();
                }
            });
        },
        
        // Theme Management
        toggleDarkMode() {
            this.isDark = !this.isDark;
            localStorage.setItem('darkMode', this.isDark);
            this.applyTheme();
        },
        
        applyTheme() {
            document.body.classList.toggle('dark', this.isDark);
        },
        
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                this.isFullscreen = true;
            } else {
                document.exitFullscreen();
                this.isFullscreen = false;
            }
        },
        
        goHome() {
            window.location.href = '../index.html';
        },
        
        // Data Initialization
        initializeAppData() {
            // Data loaded via script tag as window.devCostAnalyzerData
            if (window.devCostAnalyzerData) {
                // Add runtime properties to each app
                this.appData = window.devCostAnalyzerData.map(app => ({
                    ...app,
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                }));
            } else {
                console.error('Dev cost analyzer data not loaded');
                this.appData = [];
            }
        },
        
        // Cost Calculations
        calculateAllCosts() {
            this.appData.forEach(app => {
                this.calculateAppCosts(app);
            });
            this.updateTotalCosts();
        },
        
        calculateAppCosts(app) {
            app.costs.junior = app.hours.junior * this.rates.junior;
            app.costs.intermediate = app.hours.intermediate * this.rates.intermediate;
            app.costs.advanced = app.hours.advanced * this.rates.advanced;
        },
        
        updateCalculations() {
            this.calculateAllCosts();
            this.updateCharts();
        },
        
        updateTotalCosts() {
            this.totalCosts = {
                junior: this.appData.reduce((sum, app) => sum + this.getAppCost(app, 'junior'), 0),
                intermediate: this.appData.reduce((sum, app) => sum + this.getAppCost(app, 'intermediate'), 0),
                advanced: this.appData.reduce((sum, app) => sum + this.getAppCost(app, 'advanced'), 0)
            };
            
            this.totalHours = {
                junior: this.appData.reduce((sum, app) => sum + this.getAppHours(app, 'junior'), 0),
                intermediate: this.appData.reduce((sum, app) => sum + this.getAppHours(app, 'intermediate'), 0),
                advanced: this.appData.reduce((sum, app) => sum + this.getAppHours(app, 'advanced'), 0)
            };
        },
        
        // Computed Properties
        get totalLinesOfCode() {
            return this.appData.reduce((sum, app) => sum + app.totalLines, 0);
        },
        
        get totalTestLinesOfCode() {
            return this.appData.reduce((sum, app) => sum + (app.testLines || 0), 0);
        },
        
        get totalLinesIncludingTests() {
            return this.totalLinesOfCode + this.totalTestLinesOfCode;
        },
        
        get averageComplexity() {
            return this.appData.reduce((sum, app) => sum + app.complexity, 0) / this.appData.length;
        },
        
        get totalDependencies() {
            const allDeps = this.appData.flatMap(app => app.dependencies);
            return new Set(allDeps).size;
        },
        
        get mostComplexApp() {
            return this.appData.reduce((max, app) => 
                app.complexity > max.complexity ? app : max
            );
        },
        
        get quickWinApps() {
            return this.appData.filter(app => app.hours.intermediate < 20);
        },
        
        get minCost() {
            return Math.min(...this.appData.map(app => this.getAppCost(app, 'intermediate')));
        },
        
        get maxCost() {
            return Math.max(...this.appData.map(app => this.getAppCost(app, 'intermediate')));
        },
        
        // Test Filter Toggle
        toggleTestsFilter() {
            this.updateTotalCosts();
            this.renderCharts();
        },
        
        // Dynamic cost calculation based on includeTests filter
        getAppCost(app, level) {
            const totalLines = this.includeTests ? (app.totalLines + (app.testLines || 0)) : app.totalLines;
            const baseCost = app.costs[level];
            const baseLines = app.totalLines;
            
            // Proportionally adjust cost based on line count
            return Math.round(baseCost * (totalLines / baseLines));
        },
        
        // Dynamic hours calculation based on includeTests filter
        getAppHours(app, level) {
            const totalLines = this.includeTests ? (app.totalLines + (app.testLines || 0)) : app.totalLines;
            const baseHours = app.hours[level];
            const baseLines = app.totalLines;
            
            // Proportionally adjust hours based on line count
            return Math.round(baseHours * (totalLines / baseLines));
        },
        
        // Filtering and Sorting
        filterApps() {
            if (this.filterComplexity === 'all') {
                this.filteredApps = [...this.appData];
            } else {
                const ranges = {
                    low: [1, 4],
                    medium: [5, 7],
                    high: [8, 10]
                };
                const [min, max] = ranges[this.filterComplexity];
                this.filteredApps = this.appData.filter(app => 
                    app.complexity >= min && app.complexity <= max
                );
            }
            this.sortApps();
        },
        
        sortApps() {
            return;
            this.filteredApps.sort((a, b) => {
                switch (this.sortBy) {
                    case 'complexity':
                        return b.complexity - a.complexity;
                    case 'cost':
                        return b.costs.intermediate - a.costs.intermediate;
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'lines':
                        return b.totalLines - a.totalLines;
                    default:
                        return 0;
                }
            });
        },
        
        getComplexityClass(complexity) {
            if (complexity <= 4) return 'low-complexity';
            if (complexity <= 7) return 'medium-complexity';
            return 'high-complexity';
        },
        
        // Chart Rendering
        renderCharts() {
            this.renderComplexityCostChart();
            this.renderTimeDistributionChart();
        },
        
        renderComplexityCostChart() {
            const ctx = document.getElementById('complexityCostChart');
            if (!ctx) {
                console.warn('complexityCostChart canvas not found');
                return;
            }
            
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                return;
            }
            
            if (this.charts.complexityCost) {
                this.charts.complexityCost.destroy();
            }
            
            // Ensure costs are calculated
            if (this.appData.length === 0 || this.appData[0].costs.intermediate === 0) {
                this.calculateAllCosts();
            }
            
            const data = this.appData.map(app => ({
                x: app.complexity,
                y: this.getAppCost(app, 'intermediate'),
                name: app.name
            }));
            
            try {
                this.charts.complexityCost = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Apps (Mid-level Developer)',
                        data: data,
                        backgroundColor: '#4a90e2',
                        borderColor: '#4a90e2',
                        pointRadius: 8,
                        pointHoverRadius: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const point = data[context.dataIndex];
                                    return `${point.name}: $${point.y.toLocaleString()} (Complexity: ${point.x})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Complexity Score (1-10)' },
                            min: 0,
                            max: 10
                        },
                        y: {
                            title: { display: true, text: 'Development Cost ($)' },
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error rendering complexity cost chart:', error);
            }
        },
        
        renderTimeDistributionChart() {
            const ctx = document.getElementById('timeDistributionChart');
            if (!ctx) {
                console.warn('timeDistributionChart canvas not found');
                return;
            }
            
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                return;
            }
            
            if (this.charts.timeDistribution) {
                this.charts.timeDistribution.destroy();
            }
            
            // Ensure data is available
            if (this.appData.length === 0) {
                console.warn('No app data available for time distribution chart');
                return;
            }
            
            try {
                // Sort apps by mid-level development time (ascending)
                const sortedApps = [...this.appData].sort((a, b) => a.hours.intermediate - b.hours.intermediate);
                
                this.charts.timeDistribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedApps.map(app => app.name),
                    datasets: [
                        {
                            label: 'Junior Developer',
                            data: sortedApps.map(app => app.hours.junior),
                            backgroundColor: '#ff6b6b',
                            borderColor: '#ff6b6b',
                            borderWidth: 1
                        },
                        {
                            label: 'Mid-level Developer',
                            data: sortedApps.map(app => app.hours.intermediate),
                            backgroundColor: '#4ecdc4',
                            borderColor: '#4ecdc4',
                            borderWidth: 1
                        },
                        {
                            label: 'Senior Developer',
                            data: sortedApps.map(app => app.hours.advanced),
                            backgroundColor: '#45b7d1',
                            borderColor: '#45b7d1',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${context.parsed.y} hours`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Applications' }
                        },
                        y: {
                            title: { display: true, text: 'Development Time (Hours)' },
                            beginAtZero: true
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error rendering time distribution chart:', error);
            }
        },
        
        updateCharts() {
            this.$nextTick(() => {
                this.renderCharts();
            });
        },
        
        // Export Functions
        exportCSV() {
            const headers = [
                'App Name', 'Complexity', 'Lines of Code', 'Dependencies', 'Features',
                'Junior Hours', 'Junior Cost', 'Mid Hours', 'Mid Cost', 'Senior Hours', 'Senior Cost'
            ];
            
            const rows = this.appData.map(app => [
                app.name,
                app.complexity,
                this.includeTests ? (app.totalLines + (app.testLines || 0)) : app.totalLines,
                app.dependencies.length,
                app.features.length,
                this.getAppHours(app, 'junior'),
                this.getAppCost(app, 'junior'),
                this.getAppHours(app, 'intermediate'),
                this.getAppCost(app, 'intermediate'),
                this.getAppHours(app, 'advanced'),
                this.getAppCost(app, 'advanced')
            ]);
            
            const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
            this.downloadFile(csv, 'dev-cost-analysis.csv', 'text/csv');
        },
        
        exportJSON() {
            const data = {
                analysis_date: new Date().toISOString(),
                rates: this.rates,
                total_costs: this.totalCosts,
                total_hours: this.totalHours,
                summary: {
                    total_apps: this.appData.length,
                    total_lines_of_code: this.includeTests ? this.totalLinesIncludingTests : this.totalLinesOfCode,
                    average_complexity: this.averageComplexity,
                    total_dependencies: this.totalDependencies,
                    includes_test_code: this.includeTests
                },
                applications: this.appData
            };
            
            const json = JSON.stringify(data, null, 2);
            this.downloadFile(json, 'dev-cost-analysis.json', 'application/json');
        },
        
        generatePDF() {
            // Create a simple HTML report for printing
            const reportContent = `
                <h1>Development Cost Analysis Report</h1>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
                
                <h2>Summary</h2>
                <ul>
                    <li>Total Applications: ${this.appData.length}</li>
                    <li>Total Lines of Code: ${(this.includeTests ? this.totalLinesIncludingTests : this.totalLinesOfCode).toLocaleString()}</li>
                    <li>Average Complexity: ${this.averageComplexity.toFixed(1)}/10</li>
                    <li>Total Development Cost (Mid-level): $${this.totalCosts.intermediate.toLocaleString()}</li>
                </ul>
                
                <h2>Applications</h2>
                ${this.appData.map(app => `
                    <div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px;">
                        <h3>${app.name} (Complexity: ${app.complexity}/10)</h3>
                        <p>${app.purpose}</p>
                        <p><strong>Development Costs:</strong> 
                           Junior: $${this.getAppCost(app, 'junior').toLocaleString()} | 
                           Mid-level: $${this.getAppCost(app, 'intermediate').toLocaleString()} | 
                           Senior: $${this.getAppCost(app, 'advanced').toLocaleString()}
                        </p>
                    </div>
                `).join('')}
            `;
            
            const printWindow = window.open('', '_blank');
            const sanitizedContent = sanitizeHTML(reportContent);
            printWindow.document.write(`
                <html>
                    <head><title>Development Cost Analysis</title></head>
                    <body style="font-family: Arial, sans-serif; margin: 20px;">
                        ${sanitizedContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        },
        
        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
}