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
 */

function devCostAnalyzer() {
    return {
        // UI State
        isDark: false,
        isFullscreen: false,
        sortBy: 'complexity',
        filterComplexity: 'all',
        
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
            this.appData = [
                {
                    name: "Typing Stats",
                    file: "typing-stats.html",
                    purpose: "Real-time typing analytics with deep behavioral insights",
                    complexity: 9,
                    totalLines: 1255,
                    features: [
                        "Real-time typing metrics (WPM, accuracy, error rate)",
                        "Digraph analytics (letter transition analysis)",
                        "High-resolution timing with performance.now()",
                        "Dwell time and flight time measurements",
                        "Rhythm consistency tracking",
                        "Session persistence with JSON export",
                        "Privacy-first client-side processing",
                        "Experience level customization",
                        "Tooltips with explanations and benchmarks"
                    ],
                    dependencies: ["Alpine.js 3.x", "Custom shared.js utilities"],
                    challenges: [
                        "High-resolution timing implementation",
                        "Complex real-time metrics calculations",
                        "Digraph analysis algorithms",
                        "Performance optimization for real-time updates"
                    ],
                    hours: { junior: 50, intermediate: 30, advanced: 20 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "Typing Stats Insights",
                    file: "typing-stats-insights.html",
                    purpose: "Advanced behavioral analysis dashboard for typing data",
                    complexity: 10,
                    totalLines: 2128,
                    features: [
                        "JSON log file batch processing",
                        "Multiple chart types (Dygraphs, Chart.js)",
                        "Keyboard heatmap visualization",
                        "Typing replay with speed controls",
                        "Session comparison analysis",
                        "Performance coaching recommendations",
                        "CSV export functionality",
                        "IndexedDB persistence option",
                        "Flow analysis and burst detection"
                    ],
                    dependencies: ["Alpine.js 3.x", "Dygraphs 2.2.1", "Chart.js 3.9.1"],
                    challenges: [
                        "Complex data processing algorithms",
                        "Multiple charting library integration",
                        "Canvas-based heatmap rendering",
                        "Performance optimization for large datasets"
                    ],
                    hours: { junior: 70, intermediate: 45, advanced: 30 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "Typing Speed Test",
                    file: "typing-speed-test.html",
                    purpose: "Modern typing speed test with real-time performance visualization",
                    complexity: 8,
                    totalLines: 1876,
                    features: [
                        "Real-time WPM calculation per word",
                        "Word-by-word performance visualization",
                        "Multiple dictionary support",
                        "Blind mode typing challenge",
                        "WPM penalty system for errors",
                        "Chart.js performance graphs",
                        "Best score tracking with celebration",
                        "Confetti animations for achievements",
                        "Word sorting and statistics"
                    ],
                    dependencies: ["Alpine.js 3.x", "Chart.js 4.4.1", "Custom word dictionaries"],
                    challenges: [
                        "Real-time performance calculations",
                        "Complex color-coded feedback system",
                        "Canvas animation programming",
                        "Chart.js integration and customization"
                    ],
                    hours: { junior: 42, intermediate: 25, advanced: 16 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "How Does GenAI Learn",
                    file: "how-does-genai-learn.html",
                    purpose: "Interactive visualization of GenAI learning through masking and prediction",
                    complexity: 7,
                    totalLines: 1151,
                    features: [
                        "Sliding window text masking demonstration",
                        "Real-time prediction simulation",
                        "Training accuracy tracking",
                        "Multi-phase workflow visualization",
                        "Context window sliding for text generation",
                        "Color-coded feedback system",
                        "Progressive training visualization",
                        "Random word prediction simulation"
                    ],
                    dependencies: ["Alpine.js 3.x", "Lucide icons"],
                    challenges: [
                        "Complex animation sequencing",
                        "State machine implementation",
                        "Educational concept visualization",
                        "Real-time text processing"
                    ],
                    hours: { junior: 35, intermediate: 22, advanced: 13 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "Image Mask",
                    file: "image-mask.html",
                    purpose: "Privacy-focused image masking tool with multiple effects",
                    complexity: 7,
                    totalLines: 877,
                    features: [
                        "Canvas-based image editing",
                        "Multiple masking effects (blur, pixelate, blackout, noise)",
                        "Clipboard support (paste/copy)",
                        "Draw rectangles for area selection",
                        "Undo/redo functionality",
                        "Client-side privacy protection",
                        "Drag-and-drop image upload",
                        "Touch-friendly mobile interface"
                    ],
                    dependencies: ["Alpine.js 3.x", "Canvas API"],
                    challenges: [
                        "Canvas image processing",
                        "Complex drawing interactions",
                        "Image effect algorithms",
                        "File handling and clipboard integration"
                    ],
                    hours: { junior: 38, intermediate: 22, advanced: 14 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "Markdown Viewer",
                    file: "markdown-viewer.html",
                    purpose: "Three-pane markdown editor with TOC and live preview",
                    complexity: 6,
                    totalLines: 654,
                    features: [
                        "Three-pane layout (Input, TOC, Preview)",
                        "Collapsible input pane",
                        "Drag & drop file support",
                        "Table of Contents generation",
                        "Synchronized scrolling",
                        "Markdown syntax highlighting",
                        "HTML clipboard export",
                        "Local storage persistence"
                    ],
                    dependencies: ["Alpine.js 3.12.3", "Marked 4.3.0", "DOMPurify 3.0.5", "Highlight.js 11.7.0"],
                    challenges: [
                        "Multiple library integration",
                        "Synchronized scrolling implementation",
                        "Security considerations with HTML rendering",
                        "Complex layout management"
                    ],
                    hours: { junior: 30, intermediate: 18, advanced: 10 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "Foundation Model Training",
                    file: "foundation-model-training.html",
                    purpose: "Visualization of the multi-billion dollar AI training process",
                    complexity: 6,
                    totalLines: 724,
                    features: [
                        "3-step training pipeline visualization",
                        "Dynamic GPU cluster scaling animation",
                        "Real-time progress tracking with calendar",
                        "Interactive network background animations",
                        "AI model completion with personality greetings",
                        "Company showcase with AI models",
                        "30-day training simulation",
                        "Canvas-based animations"
                    ],
                    dependencies: ["Alpine.js 3.x", "Lucide icons", "Company data JSON"],
                    challenges: [
                        "Canvas animation programming",
                        "Complex timing and progression logic",
                        "Educational visualization design",
                        "Performance optimization for animations"
                    ],
                    hours: { junior: 30, intermediate: 19, advanced: 12 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "What's New with GenAI",
                    file: "whats-new-with-genai.html",
                    purpose: "Interactive comparison between Traditional AI and Generative AI",
                    complexity: 5,
                    totalLines: 685,
                    features: [
                        "Side-by-side AI comparison visualization",
                        "Network background animations",
                        "Traditional vs Generative AI concepts",
                        "Foundation model training visualization",
                        "Company logos and model information",
                        "Hover effects and section highlighting",
                        "Responsive grid layout"
                    ],
                    dependencies: ["Alpine.js 3.x", "Lucide icons"],
                    challenges: [
                        "Canvas background animations",
                        "Responsive design implementation",
                        "Educational content organization",
                        "Interactive state management"
                    ],
                    hours: { junior: 25, intermediate: 15, advanced: 9 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                },
                {
                    name: "How LLMs Work",
                    file: "how-llms-work.html",
                    purpose: "Interactive visualization of LLM input processing and output generation",
                    complexity: 4,
                    totalLines: 703,
                    features: [
                        "Three-section flow visualization",
                        "Animated network connections",
                        "Multiple input types display",
                        "Multiple output formats",
                        "Pattern node animations",
                        "Educational content layout",
                        "Responsive design"
                    ],
                    dependencies: ["Alpine.js 3.x", "Lucide icons"],
                    challenges: [
                        "SVG animation coordination",
                        "Educational content design",
                        "Responsive layout management",
                        "Visual flow representation"
                    ],
                    hours: { junior: 20, intermediate: 12, advanced: 7 },
                    costs: { junior: 0, intermediate: 0, advanced: 0 },
                    showDetails: false
                }
            ];
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
                junior: this.appData.reduce((sum, app) => sum + app.costs.junior, 0),
                intermediate: this.appData.reduce((sum, app) => sum + app.costs.intermediate, 0),
                advanced: this.appData.reduce((sum, app) => sum + app.costs.advanced, 0)
            };
            
            this.totalHours = {
                junior: this.appData.reduce((sum, app) => sum + app.hours.junior, 0),
                intermediate: this.appData.reduce((sum, app) => sum + app.hours.intermediate, 0),
                advanced: this.appData.reduce((sum, app) => sum + app.hours.advanced, 0)
            };
        },
        
        // Computed Properties
        get totalLinesOfCode() {
            return this.appData.reduce((sum, app) => sum + app.totalLines, 0);
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
            return Math.min(...this.appData.map(app => app.costs.intermediate));
        },
        
        get maxCost() {
            return Math.max(...this.appData.map(app => app.costs.intermediate));
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
                y: app.costs.intermediate,
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
                this.charts.timeDistribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: this.appData.map(app => app.name),
                    datasets: [
                        {
                            label: 'Junior Developer',
                            data: this.appData.map(app => app.hours.junior),
                            backgroundColor: '#ff6b6b',
                            borderColor: '#ff6b6b',
                            borderWidth: 1
                        },
                        {
                            label: 'Mid-level Developer',
                            data: this.appData.map(app => app.hours.intermediate),
                            backgroundColor: '#4ecdc4',
                            borderColor: '#4ecdc4',
                            borderWidth: 1
                        },
                        {
                            label: 'Senior Developer',
                            data: this.appData.map(app => app.hours.advanced),
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
                app.totalLines,
                app.dependencies.length,
                app.features.length,
                app.hours.junior,
                app.costs.junior,
                app.hours.intermediate,
                app.costs.intermediate,
                app.hours.advanced,
                app.costs.advanced
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
                    total_lines_of_code: this.totalLinesOfCode,
                    average_complexity: this.averageComplexity,
                    total_dependencies: this.totalDependencies
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
                    <li>Total Lines of Code: ${this.totalLinesOfCode.toLocaleString()}</li>
                    <li>Average Complexity: ${this.averageComplexity.toFixed(1)}/10</li>
                    <li>Total Development Cost (Mid-level): $${this.totalCosts.intermediate.toLocaleString()}</li>
                </ul>
                
                <h2>Applications</h2>
                ${this.appData.map(app => `
                    <div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px;">
                        <h3>${app.name} (Complexity: ${app.complexity}/10)</h3>
                        <p>${app.purpose}</p>
                        <p><strong>Development Costs:</strong> 
                           Junior: $${app.costs.junior.toLocaleString()} | 
                           Mid-level: $${app.costs.intermediate.toLocaleString()} | 
                           Senior: $${app.costs.advanced.toLocaleString()}
                        </p>
                    </div>
                `).join('')}
            `;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head><title>Development Cost Analysis</title></head>
                    <body style="font-family: Arial, sans-serif; margin: 20px;">
                        ${reportContent}
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