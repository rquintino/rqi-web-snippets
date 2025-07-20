/**
 * Typing Stats Insights - Behavioral Analysis Dashboard
 * 
 * Main purpose: Analyze typing behavior from JSON logs and provide actionable insights
 * 
 * Key methods:
 * - typingInsights() - Main Alpine.js component with reactive data
 * - processJsonFile() - Parse and validate JSON log files
 * - calculateMetrics() - Compute comprehensive typing metrics
 * - generateRecommendations() - Rules-based coaching suggestions
 * - renderCharts() - Create interactive visualizations
 * - exportCSV() - Export metrics to CSV format
 */

function typingInsights() {
    return {
        // UI State
        isDark: false,
        isFullscreen: false,
        hasData: false,
        isProcessing: false,
        dragOver: false,
        showTooltipElement: false,
        tooltipText: '',
        tooltipX: 0,
        tooltipY: 0,
        showSummary: false,
        summaryContent: '',
        selectedPrimaryMetric: 'wpm',
        selectedSecondaryMetric: '',
        hoveredTimestamp: null,
        
        // Replay functionality
        isReplaying: false,
        replaySpeed: 2,
        replayProgress: 0,
        replayTotal: 0,
        replayTextDisplay: '',
        replayCursorX: 0,
        replayCurrentWPM: 0,
        replayCurrentKey: '',
        replayTimer: null,
        replayEvents: [],
        replayIndex: 0,
        
        // Comparison & Progress Tracking
        comparisonMode: false,
        comparisonSessionId: null,
        comparisonSession: null,
        
        // Data Processing
        sessions: [],
        currentSession: null,
        selectedSessionId: null,
        processedFiles: 0,
        totalFiles: 0,
        processingProgress: 0,
        
        // Analytics
        recommendations: [],
        charts: {},
        
        init() {
            this.isDark = localStorage.getItem('darkMode') === 'true';
            this.applyTheme();
            this.loadStoredData();
            this.setupKeyboardShortcuts();
        },
        
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + O to open files
                if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                    e.preventDefault();
                    if (!this.hasData) {
                        this.$refs.fileInput?.click();
                    }
                }
                // Ctrl/Cmd + E to export CSV
                if ((e.ctrlKey || e.metaKey) && e.key === 'e' && this.hasData) {
                    e.preventDefault();
                    this.exportCSV();
                }
                // Escape to close modal
                if (e.key === 'Escape') {
                    this.showSummary = false;
                }
                // D to toggle dark mode
                if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (document.activeElement.tagName !== 'INPUT') {
                        this.toggleDarkMode();
                    }
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
        
        // Tooltip Management
        showTooltip(event, text) {
            this.tooltipText = text;
            this.tooltipX = event.clientX + 10;
            this.tooltipY = event.clientY - 30;
            this.showTooltipElement = true;
        },
        
        hideTooltip() {
            this.showTooltipElement = false;
        },
        
        // Error handling
        showErrorMessage(message) {
            this.summaryContent = `
                <div style="color: var(--danger);">
                    <h4>Error</h4>
                    <p>${message}</p>
                    <small>Check the browser console for more details.</small>
                </div>
            `;
            this.showSummary = true;
        },
        
        // File Processing
        handleFileDrop(event) {
            this.dragOver = false;
            const files = Array.from(event.dataTransfer.files);
            this.processFiles(files);
        },
        
        handleFileSelect(event) {
            const files = Array.from(event.target.files);
            this.processFiles(files);
        },
        
        async processFiles(files) {
            const jsonFiles = files.filter(file => file.name.endsWith('.json'));
            if (jsonFiles.length === 0) {
                alert('Please select JSON files only.');
                return;
            }
            
            this.isProcessing = true;
            this.totalFiles = jsonFiles.length;
            this.processedFiles = 0;
            this.processingProgress = 0;
            
            for (const file of jsonFiles) {
                try {
                    await this.processJsonFile(file);
                    this.processedFiles++;
                    this.processingProgress = (this.processedFiles / this.totalFiles) * 100;
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    this.showErrorMessage(`Error processing ${file.name}: ${error.message}`);
                }
            }
            
            this.isProcessing = false;
            this.hasData = this.sessions.length > 0;
            
            if (this.hasData) {
                this.selectedSessionId = this.sessions[this.sessions.length - 1].id;
                this.loadSession();
                this.saveToStorage();
            }
        },
        
        async processJsonFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.validateAndStoreSession(data, file.name);
                        resolve();
                    } catch (error) {
                        reject(new Error(`Invalid JSON format: ${error.message}`));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        },
        
        validateAndStoreSession(data, filename) {
            // Validate schema version
            if (!data.metadata || !data.metadata.version) {
                throw new Error('Missing metadata.version field');
            }
            
            if (!data.events || !Array.isArray(data.events)) {
                throw new Error('Missing or invalid events array');
            }
            
            // Generate session ID
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Enhance with additional analytics
            const enhancedSession = {
                id: sessionId,
                filename: filename,
                uploadedAt: new Date().toISOString(),
                ...data,
                enhancedMetrics: this.calculateEnhancedMetrics(data),
                coachAnalysis: this.calculateCoachAnalysis(data),
                flowAnalysis: this.calculateFlowAnalysis(data)
            };
            
            this.sessions.push(enhancedSession);
        },
        
        calculateEnhancedMetrics(data) {
            const events = data.events || [];
            const keydownEvents = events.filter(e => e.type === 'keydown');
            
            if (keydownEvents.length === 0) {
                return { dwellDistribution: [], flightDistribution: [], pauseAnalysis: {} };
            }
            
            // Calculate timing distributions
            const dwellTimes = keydownEvents.map(e => e.dwellTime).filter(t => t != null);
            const flightTimes = [];
            
            for (let i = 0; i < keydownEvents.length - 1; i++) {
                const current = keydownEvents[i];
                const next = keydownEvents[i + 1];
                if (current.keyupTimestamp && next.timestamp) {
                    const flightTime = next.timestamp - current.keyupTimestamp;
                    if (flightTime > 0) flightTimes.push(flightTime);
                }
            }
            
            // Pause analysis
            const pauseThreshold = data.metadata?.pauseThreshold || 500;
            const pauses = flightTimes.filter(t => t > pauseThreshold);
            
            return {
                dwellDistribution: this.calculateDistribution(dwellTimes),
                flightDistribution: this.calculateDistribution(flightTimes),
                pauseAnalysis: {
                    count: pauses.length,
                    totalTime: pauses.reduce((a, b) => a + b, 0),
                    avgDuration: pauses.length > 0 ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0
                }
            };
        },
        
        calculateDistribution(values) {
            if (values.length === 0) return { min: 0, max: 0, mean: 0, median: 0, std: 0 };
            
            const sorted = [...values].sort((a, b) => a - b);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
            
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                mean: mean,
                median: sorted[Math.floor(sorted.length / 2)],
                std: Math.sqrt(variance),
                values: values
            };
        },
        
        // Session Management
        loadSession() {
            this.currentSession = this.sessions.find(s => s.id === this.selectedSessionId);
            if (this.currentSession) {
                this.generateRecommendations();
                this.$nextTick(() => {
                    this.renderCharts();
                });
            }
        },
        
        formatSessionLabel(session) {
            const date = new Date(session.metadata?.sessionStart || session.uploadedAt).toLocaleDateString();
            const wpm = session.metrics?.netWPM?.toFixed(0) || '0';
            return `${session.filename} (${date}, ${wpm} WPM)`;
        },
        
        // Performance Bands
        getPerformanceBand(metric, value) {
            const bands = {
                netWPM: { expert: 80, advanced: 60, intermediate: 40, beginner: 0 },
                errorRate: { expert: 1, advanced: 2, intermediate: 5, beginner: 100 },
                avgDwell: { expert: 100, advanced: 150, intermediate: 200, beginner: Infinity },
                rhythmCV: { expert: 8, advanced: 15, intermediate: 25, beginner: Infinity }
            };
            
            if (!bands[metric] || value == null) return 'Unknown';
            
            const thresholds = bands[metric];
            if (metric === 'netWPM') {
                if (value >= thresholds.expert) return 'Expert';
                if (value >= thresholds.advanced) return 'Advanced';
                if (value >= thresholds.intermediate) return 'Intermediate';
                return 'Beginner';
            } else {
                if (value <= thresholds.expert) return 'Expert';
                if (value <= thresholds.advanced) return 'Advanced';
                if (value <= thresholds.intermediate) return 'Intermediate';
                return 'Beginner';
            }
        },
        
        // Recommendations Engine
        generateRecommendations() {
            this.recommendations = [];
            
            if (!this.currentSession || !this.currentSession.metrics) return;
            
            const metrics = this.currentSession.metrics;
            
            // Speed recommendations
            if (metrics.netWPM < 40) {
                this.recommendations.push({
                    id: 'speed_basic',
                    icon: '🚀',
                    title: 'Improve Typing Speed',
                    content: 'Practice basic finger exercises and focus on proper finger placement. Try typing.com or keybr.com for structured lessons.',
                    priority: 'high'
                });
            }
            
            // Accuracy recommendations
            if (metrics.errorRate > 0.05) {
                this.recommendations.push({
                    id: 'accuracy_focus',
                    icon: '🎯',
                    title: 'Focus on Accuracy',
                    content: 'Slow down and focus on accuracy first. Speed will follow naturally. Aim for <2% error rate before increasing speed.',
                    priority: 'high'
                });
            }
            
            // Dwell time recommendations
            if (metrics.avgDwell > 200) {
                this.recommendations.push({
                    id: 'dwell_optimization',
                    icon: '⏱️',
                    title: 'Reduce Key Press Duration',
                    content: 'Practice lighter key presses. Heavy typing can slow you down and cause fatigue. Check your keyboard and posture.',
                    priority: 'medium'
                });
            }
            
            // Rhythm recommendations
            if (metrics.rhythmConsistency < 75) {
                this.recommendations.push({
                    id: 'rhythm_practice',
                    icon: '🎵',
                    title: 'Improve Typing Rhythm',
                    content: 'Practice with a metronome to develop consistent timing. Focus on smooth, even key presses rather than bursts.',
                    priority: 'medium'
                });
            }
            
            // Pause analysis recommendations
            if (this.currentSession.enhancedMetrics?.pauseAnalysis?.count > 10) {
                this.recommendations.push({
                    id: 'reduce_pauses',
                    icon: '⏸️',
                    title: 'Reduce Long Pauses',
                    content: `You had ${this.currentSession.enhancedMetrics.pauseAnalysis.count} long pauses. Try to think ahead and maintain flow. Practice common word patterns.`,
                    priority: 'low'
                });
            }
            
            // Flight time recommendations
            if (metrics.avgFlight > 220) {
                this.recommendations.push({
                    id: 'finger_placement',
                    icon: '🤚',
                    title: 'Improve Finger Placement',
                    content: 'Long intervals between keys suggest finger positioning issues. Practice proper home row position and finger assignments.',
                    priority: 'medium'
                });
            }
            
            // Advanced coach analysis recommendations
            if (this.currentSession.coachAnalysis) {
                const coachAnalysis = this.currentSession.coachAnalysis;
                
                // Weak finger recommendations
                if (coachAnalysis.weakFingers.length > 0) {
                    const weakFingerNames = coachAnalysis.weakFingers.map(f => f.finger.replace(/([A-Z])/g, ' $1').trim()).join(', ');
                    this.recommendations.push({
                        id: 'weak_fingers',
                        icon: '💪',
                        title: 'Strengthen Weak Fingers',
                        content: `Focus on ${weakFingerNames}. These fingers show slower response times. Practice exercises targeting these specific fingers.`,
                        priority: 'high'
                    });
                }
                
                // Hand balance recommendation
                if (coachAnalysis.overallFingerBalance.balance > 0.2) {
                    const dominantHand = coachAnalysis.overallFingerBalance.leftRatio > 0.6 ? 'left' : 'right';
                    this.recommendations.push({
                        id: 'hand_balance',
                        icon: '⚖️',
                        title: 'Improve Hand Balance',
                        content: `You're over-relying on your ${dominantHand} hand (${Math.round(coachAnalysis.overallFingerBalance[dominantHand + 'Ratio'] * 100)}%). Practice exercises that use both hands evenly.`,
                        priority: 'medium'
                    });
                }
                
                // Error pattern recommendations
                if (coachAnalysis.errorPatterns.doubleKeyPresses > 5) {
                    this.recommendations.push({
                        id: 'double_presses',
                        icon: '🎯',
                        title: 'Reduce Double Key Presses',
                        content: `${coachAnalysis.errorPatterns.doubleKeyPresses} double key presses detected. Practice lighter, more controlled key presses.`,
                        priority: 'medium'
                    });
                }
                
                // Common mistakes
                const commonMistakes = Object.entries(coachAnalysis.errorPatterns.commonMistakes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3);
                
                if (commonMistakes.length > 0) {
                    const mistakeList = commonMistakes.map(([key, count]) => `'${key}' (${count}x)`).join(', ');
                    this.recommendations.push({
                        id: 'common_mistakes',
                        icon: '🔧',
                        title: 'Address Common Mistakes',
                        content: `Most frequent errors: ${mistakeList}. Practice these keys slowly and focus on accuracy.`,
                        priority: 'medium'
                    });
                }
            }
        },
        
        // Chart Rendering
        renderCharts() {
            this.renderSpeedChart();
            this.renderTimingCharts();
            this.renderKeyboardHeatmap();
            this.renderDigraphChart();
            this.renderFlowChart();
        },
        
        updateSpeedChart() {
            this.renderSpeedChart();
        },
        
        renderSpeedChart() {
            const container = document.getElementById('speed-chart');
            if (!container || !this.currentSession) return;
            
            const events = this.currentSession.events?.filter(e => e.type === 'keydown') || [];
            if (events.length === 0) return;
            
            // Build segments for analysis
            const segmentSize = 10; // characters per segment
            const segments = [];
            const textContent = this.currentSession.textContent || '';
            
            for (let i = 0; i < events.length; i += segmentSize) {
                const segment = events.slice(i, i + segmentSize);
                if (segment.length === 0) continue;
                
                const startTime = segment[0].timestamp;
                const endTime = segment[segment.length - 1].timestamp;
                const duration = endTime - startTime;
                const charCount = i + segment.length;
                
                // Calculate metrics for this segment
                const wpm = duration > 0 ? (segment.length * 60000) / (duration * 5) : 0;
                const dwellTimes = segment.map(e => e.dwellTime).filter(t => t != null);
                const avgDwell = dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0;
                
                // Flight times
                const flightTimes = [];
                for (let j = 0; j < segment.length - 1; j++) {
                    if (segment[j].keyupTimestamp && segment[j + 1].timestamp) {
                        flightTimes.push(segment[j + 1].timestamp - segment[j].keyupTimestamp);
                    }
                }
                const avgFlight = flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : 0;
                
                // Accuracy (simplified - count backspaces/deletions)
                const errors = segment.filter(e => e.key === 'Backspace' || e.key === 'Delete').length;
                const accuracy = Math.max(0, 100 - (errors / segment.length) * 100);
                
                // Rhythm consistency (CV of timing)
                const timings = [...dwellTimes, ...flightTimes];
                let rhythmCV = 0;
                if (timings.length > 1) {
                    const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
                    const variance = timings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timings.length;
                    const stdDev = Math.sqrt(variance);
                    rhythmCV = mean > 0 ? (stdDev / mean) * 100 : 0;
                }
                const rhythmConsistency = Math.max(0, 100 - rhythmCV);
                
                // Text being typed
                const segmentText = textContent.slice(Math.max(0, charCount - segmentSize), charCount);
                
                segments.push({
                    charCount,
                    time: new Date(startTime).toLocaleTimeString(),
                    wpm: Math.max(0, Math.min(200, wpm)),
                    accuracy,
                    dwell: avgDwell,
                    flight: avgFlight,
                    rhythm: rhythmConsistency,
                    text: segmentText,
                    timestamp: startTime
                });
            }
            
            // Prepare data for Dygraphs
            const data = segments.map(s => {
                const row = [s.charCount];
                
                // Add primary metric
                row.push(this.getMetricValue(s, this.selectedPrimaryMetric));
                
                // Add secondary metric if selected
                if (this.selectedSecondaryMetric) {
                    row.push(this.getMetricValue(s, this.selectedSecondaryMetric));
                }
                
                return row;
            });
            
            // Build labels
            const labels = ['Characters', this.getMetricLabel(this.selectedPrimaryMetric)];
            if (this.selectedSecondaryMetric) {
                labels.push(this.getMetricLabel(this.selectedSecondaryMetric));
            }
            
            if (this.charts.speedChart) {
                this.charts.speedChart.destroy();
            }
            
            this.charts.speedChart = new Dygraph(container, data, {
                labels,
                xlabel: 'Characters Typed',
                ylabel: this.getMetricLabel(this.selectedPrimaryMetric),
                y2label: this.selectedSecondaryMetric ? this.getMetricLabel(this.selectedSecondaryMetric) : null,
                series: this.selectedSecondaryMetric ? {
                    [this.getMetricLabel(this.selectedSecondaryMetric)]: { axis: 'y2' }
                } : {},
                width: container.offsetWidth,
                height: 300,
                highlightCallback: (event, x, points, row, seriesName) => {
                    if (row < segments.length) {
                        this.hoveredTimestamp = segments[row];
                    }
                },
                unhighlightCallback: () => {
                    this.hoveredTimestamp = null;
                },
                axes: {
                    y2: this.selectedSecondaryMetric ? {
                        independentTicks: true
                    } : undefined
                }
            });
        },
        
        getMetricValue(segment, metric) {
            switch(metric) {
                case 'wpm': return segment.wpm;
                case 'accuracy': return segment.accuracy;
                case 'dwell': return segment.dwell;
                case 'flight': return segment.flight;
                case 'rhythm': return segment.rhythm;
                default: return 0;
            }
        },
        
        getMetricLabel(metric) {
            switch(metric) {
                case 'wpm': return 'WPM';
                case 'accuracy': return 'Accuracy %';
                case 'dwell': return 'Dwell Time (ms)';
                case 'flight': return 'Flight Time (ms)';
                case 'rhythm': return 'Rhythm Consistency %';
                default: return '';
            }
        },
        
        renderTimingCharts() {
            this.renderHistogram('dwell-chart', this.currentSession?.enhancedMetrics?.dwellDistribution?.values || [], 'Dwell Time (ms)');
            this.renderHistogram('flight-chart', this.currentSession?.enhancedMetrics?.flightDistribution?.values || [], 'Flight Time (ms)');
        },
        
        renderHistogram(canvasId, data, label) {
            const canvas = document.getElementById(canvasId);
            if (!canvas || data.length === 0) return;
            
            const ctx = canvas.getContext('2d');
            
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
            }
            
            // Create histogram bins
            const bins = 20;
            const min = Math.min(...data);
            const max = Math.max(...data);
            const binSize = (max - min) / bins;
            const histogram = new Array(bins).fill(0);
            
            data.forEach(value => {
                const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
                histogram[binIndex]++;
            });
            
            this.charts[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: histogram.map((_, i) => Math.round(min + i * binSize)),
                    datasets: [{
                        label: label,
                        data: histogram,
                        backgroundColor: 'rgba(74, 144, 226, 0.7)',
                        borderColor: 'rgba(74, 144, 226, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        },
        
        renderKeyboardHeatmap(highlightKey = null, eventType = null) {
            const canvas = document.getElementById('keyboard-heatmap');
            if (!canvas || !this.currentSession) return;
            
            const ctx = canvas.getContext('2d');
            const events = this.currentSession.events?.filter(e => e.type === 'keydown') || [];
            
            // Set canvas size
            canvas.width = canvas.offsetWidth;
            canvas.height = 200;
            
            // Count key presses and dwell times
            const keyData = {};
            events.forEach(event => {
                const key = event.code || event.key;
                if (!keyData[key]) {
                    keyData[key] = { count: 0, totalDwell: 0 };
                }
                keyData[key].count++;
                if (event.dwellTime) {
                    keyData[key].totalDwell += event.dwellTime;
                }
            });
            
            // Simple QWERTY layout representation
            const layout = [
                ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
                ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
                ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM']
            ];
            
            // Clear canvas
            ctx.fillStyle = this.isDark ? '#2d2d2d' : '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Find max count for color scaling
            const maxCount = Math.max(...Object.values(keyData).map(d => d.count), 1);
            
            // Draw keyboard layout
            const keyWidth = 30;
            const keyHeight = 25;
            const padding = 5;
            const startY = 20;
            
            layout.forEach((row, rowIndex) => {
                const startX = (canvas.width - (row.length * (keyWidth + padding))) / 2;
                row.forEach((keyCode, colIndex) => {
                    const x = startX + colIndex * (keyWidth + padding);
                    const y = startY + rowIndex * (keyHeight + padding);
                    
                    // Color based on usage frequency
                    const count = keyData[keyCode]?.count || 0;
                    const intensity = count / maxCount;
                    
                    // Highlight current key during replay with different colors for keydown/keyup
                    if (highlightKey === keyCode) {
                        if (eventType === 'keydown') {
                            ctx.fillStyle = '#ff6b6b'; // Bright red for keydown
                        } else if (eventType === 'keyup') {
                            ctx.fillStyle = '#4ecdc4'; // Teal for keyup
                        } else {
                            ctx.fillStyle = '#ff6b6b'; // Default red
                        }
                    } else {
                        const hue = 220; // Blue hue
                        const saturation = intensity * 100;
                        const lightness = this.isDark ? 30 + intensity * 40 : 70 - intensity * 40;
                        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    }
                    ctx.fillRect(x, y, keyWidth, keyHeight);
                    
                    // Border
                    ctx.strokeStyle = this.isDark ? '#404040' : '#ccc';
                    ctx.strokeRect(x, y, keyWidth, keyHeight);
                    
                    // Key label
                    ctx.fillStyle = this.isDark ? '#f0f0f0' : '#333';
                    ctx.font = '10px system-ui';
                    ctx.textAlign = 'center';
                    const keyLabel = keyCode.replace('Key', '');
                    ctx.fillText(keyLabel, x + keyWidth / 2, y + keyHeight / 2 + 3);
                    
                    // Count label
                    if (count > 0) {
                        ctx.font = '8px system-ui';
                        ctx.fillStyle = this.isDark ? '#ccc' : '#666';
                        ctx.fillText(count.toString(), x + keyWidth / 2, y + keyHeight - 3);
                    }
                });
            });
            
            // Space bar
            const spaceWidth = 150;
            const spaceX = (canvas.width - spaceWidth) / 2;
            const spaceY = startY + 3 * (keyHeight + padding);
            const spaceCount = keyData['Space']?.count || 0;
            const spaceIntensity = spaceCount / maxCount;
            
            // Highlight space bar during replay
            if (highlightKey === 'Space') {
                if (eventType === 'keydown') {
                    ctx.fillStyle = '#ff6b6b'; // Bright red for keydown
                } else if (eventType === 'keyup') {
                    ctx.fillStyle = '#4ecdc4'; // Teal for keyup
                } else {
                    ctx.fillStyle = '#ff6b6b'; // Default red
                }
            } else {
                const spaceHue = 220;
                const spaceSaturation = spaceIntensity * 100;
                const spaceLightness = this.isDark ? 30 + spaceIntensity * 40 : 70 - spaceIntensity * 40;
                ctx.fillStyle = `hsl(${spaceHue}, ${spaceSaturation}%, ${spaceLightness}%)`;
            }
            ctx.fillRect(spaceX, spaceY, spaceWidth, keyHeight);
            ctx.strokeStyle = this.isDark ? '#404040' : '#ccc';
            ctx.strokeRect(spaceX, spaceY, spaceWidth, keyHeight);
            
            ctx.fillStyle = this.isDark ? '#f0f0f0' : '#333';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('SPACE', spaceX + spaceWidth / 2, spaceY + keyHeight / 2 + 3);
            if (spaceCount > 0) {
                ctx.font = '8px system-ui';
                ctx.fillStyle = this.isDark ? '#ccc' : '#666';
                ctx.fillText(spaceCount.toString(), spaceX + spaceWidth / 2, spaceY + keyHeight - 3);
            }
            
            // Legend
            ctx.font = '10px system-ui';
            ctx.fillStyle = this.isDark ? '#ccc' : '#666';
            ctx.textAlign = 'left';
            ctx.fillText('Usage frequency (darker = more used)', 10, canvas.height - 10);
        },
        
        renderDigraphChart() {
            const canvas = document.getElementById('digraph-chart');
            if (!canvas || !this.currentSession?.digraphs) return;
            
            const ctx = canvas.getContext('2d');
            
            if (this.charts.digraphChart) {
                this.charts.digraphChart.destroy();
            }
            
            // Get top 10 digraphs by frequency
            const digraphs = Object.entries(this.currentSession.digraphs)
                .map(([pair, data]) => ({
                    pair,
                    avgLatency: data.totalLatency / data.count,
                    count: data.count
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            
            this.charts.digraphChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: digraphs.map(d => d.pair),
                    datasets: [{
                        label: 'Average Latency (ms)',
                        data: digraphs.map(d => d.avgLatency),
                        backgroundColor: 'rgba(74, 144, 226, 0.7)',
                        borderColor: 'rgba(74, 144, 226, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Latency (ms)' } },
                        x: { title: { display: true, text: 'Digraph' } }
                    }
                }
            });
        },
        
        renderFlowChart() {
            const canvas = document.getElementById('flow-chart');
            if (!canvas || !this.currentSession?.flowAnalysis) return;
            
            const ctx = canvas.getContext('2d');
            const flowData = this.currentSession.flowAnalysis;
            
            if (this.charts.flowChart) {
                this.charts.flowChart.destroy();
            }
            
            // Prepare data: character position vs WPM with burst highlighting
            const segments = flowData.flowSegments || [];
            if (segments.length === 0) return;
            
            const data = segments.map((segment, index) => ({
                x: index,
                y: segment.wpm,
                isBurst: flowData.bursts?.some(burst => 
                    index >= burst.start && index <= burst.end
                ) || false,
                isFatigue: segment.wpm < (flowData.avgWPM * 0.7)
            }));
            
            this.charts.flowChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'WPM Flow',
                            data: data.map(d => ({ x: d.x, y: d.y })),
                            borderColor: '#4a90e2',
                            backgroundColor: 'rgba(74, 144, 226, 0.1)',
                            pointBackgroundColor: data.map(d => {
                                if (d.isBurst) return '#ff6b6b'; // Red for bursts
                                if (d.isFatigue) return '#ffa726'; // Orange for fatigue
                                return '#4a90e2'; // Blue for normal
                            }),
                            pointRadius: data.map(d => d.isBurst || d.isFatigue ? 6 : 3),
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Average WPM',
                            data: segments.map((_, index) => ({ x: index, y: flowData.avgWPM })),
                            borderColor: '#28a745',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Typing Flow Pattern (Red=Burst, Orange=Fatigue)'
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Character Sequence'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Words Per Minute'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });
        },
        
        // Data Management
        exportCSV() {
            if (!this.currentSession) return;
            
            const metrics = this.currentSession.metrics;
            const metadata = this.currentSession.metadata;
            
            const csvData = [
                ['Metric', 'Value'],
                ['Session Date', metadata?.sessionStart || 'Unknown'],
                ['Net WPM', metrics?.netWPM?.toFixed(2) || '0'],
                ['Gross WPM', metrics?.grossWPM?.toFixed(2) || '0'],
                ['Error Rate (%)', ((metrics?.errorRate || 0) * 100).toFixed(2)],
                ['Key Strokes', metrics?.keyStrokes || '0'],
                ['Words', metrics?.words || '0'],
                ['Average Dwell (ms)', metrics?.avgDwell?.toFixed(2) || '0'],
                ['Average Flight (ms)', metrics?.avgFlight?.toFixed(2) || '0'],
                ['Rhythm Consistency (%)', metrics?.rhythmConsistency?.toFixed(2) || '0'],
                ['Active Typing Time (s)', metadata?.activeTypingTime?.toFixed(2) || '0']
            ];
            
            const csv = csvData.map(row => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `typing-metrics-${this.currentSession.id}.csv`;
            a.click();
            
            URL.revokeObjectURL(url);
        },
        
        clearData() {
            if (confirm('Clear all session data? This cannot be undone.')) {
                this.sessions = [];
                this.currentSession = null;
                this.selectedSessionId = null;
                this.hasData = false;
                this.recommendations = [];
                localStorage.removeItem('typingInsightsSessions');
                
                // Destroy charts
                Object.values(this.charts).forEach(chart => {
                    if (chart && chart.destroy) chart.destroy();
                });
                this.charts = {};
            }
        },
        
        saveToStorage() {
            try {
                localStorage.setItem('typingInsightsSessions', JSON.stringify(this.sessions));
            } catch (error) {
                console.warn('Could not save to localStorage:', error);
            }
        },
        
        loadStoredData() {
            try {
                const stored = localStorage.getItem('typingInsightsSessions');
                if (stored) {
                    this.sessions = JSON.parse(stored);
                    this.hasData = this.sessions.length > 0;
                    if (this.hasData) {
                        this.selectedSessionId = this.sessions[this.sessions.length - 1].id;
                        this.loadSession();
                    }
                }
            } catch (error) {
                console.warn('Could not load from localStorage:', error);
            }
        },
        
        showAllSessions() {
            this.summaryContent = `
                <p><strong>Total sessions:</strong> ${this.sessions.length}</p>
                <div class="sessions-list">
                    ${this.sessions.map(s => `
                        <div class="session-item">
                            <strong>${s.filename}</strong><br>
                            <small>${new Date(s.metadata?.sessionStart || s.uploadedAt).toLocaleString()}</small><br>
                            <span>Net WPM: ${s.metrics?.netWPM?.toFixed(1) || '0'}</span> | 
                            <span>Error Rate: ${((s.metrics?.errorRate || 0) * 100).toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
            `;
            this.showSummary = true;
        },
        
        // Progress Tracking & Learning Curve Analysis
        showProgressTracking() {
            if (this.sessions.length < 2) {
                this.showErrorMessage('Need at least 2 sessions to show progress tracking.');
                return;
            }
            
            const sortedSessions = [...this.sessions].sort((a, b) => 
                new Date(a.metadata?.sessionStart || a.uploadedAt) - 
                new Date(b.metadata?.sessionStart || b.uploadedAt)
            );
            
            const progressData = this.calculateProgressMetrics(sortedSessions);
            
            this.summaryContent = `
                <h3>📈 Learning Progress Analysis</h3>
                <div class="progress-summary">
                    <div class="progress-stat">
                        <strong>WPM Improvement:</strong> ${progressData.wpmImprovement > 0 ? '+' : ''}${progressData.wpmImprovement.toFixed(1)} WPM
                        <span class="trend ${progressData.wpmImprovement > 0 ? 'positive' : 'negative'}">
                            ${progressData.wpmImprovement > 0 ? '📈' : '📉'}
                        </span>
                    </div>
                    <div class="progress-stat">
                        <strong>Accuracy Improvement:</strong> ${progressData.accuracyImprovement > 0 ? '+' : ''}${progressData.accuracyImprovement.toFixed(1)}%
                        <span class="trend ${progressData.accuracyImprovement > 0 ? 'positive' : 'negative'}">
                            ${progressData.accuracyImprovement > 0 ? '📈' : '📉'}
                        </span>
                    </div>
                    <div class="progress-stat">
                        <strong>Consistency Improvement:</strong> ${progressData.consistencyImprovement > 0 ? '+' : ''}${progressData.consistencyImprovement.toFixed(1)}%
                        <span class="trend ${progressData.consistencyImprovement > 0 ? 'positive' : 'negative'}">
                            ${progressData.consistencyImprovement > 0 ? '📈' : '📉'}
                        </span>
                    </div>
                    <div class="progress-stat">
                        <strong>Learning Velocity:</strong> ${progressData.learningVelocity.toFixed(2)} WPM/session
                    </div>
                    <div class="progress-stat">
                        <strong>Skill Level:</strong> ${progressData.skillLevel}
                    </div>
                </div>
                <h4>Session Timeline:</h4>
                <div class="progress-timeline">
                    ${sortedSessions.map((session, index) => `
                        <div class="timeline-item">
                            <div class="timeline-marker">${index + 1}</div>
                            <div class="timeline-content">
                                <strong>${session.filename}</strong><br>
                                <small>${new Date(session.metadata?.sessionStart || session.uploadedAt).toLocaleDateString()}</small><br>
                                <span>WPM: ${session.metrics?.netWPM?.toFixed(1) || '0'}</span> | 
                                <span>Accuracy: ${(100 - (session.metrics?.errorRate || 0) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            this.showSummary = true;
        },
        
        calculateProgressMetrics(sortedSessions) {
            const first = sortedSessions[0];
            const last = sortedSessions[sortedSessions.length - 1];
            
            const wpmImprovement = (last.metrics?.netWPM || 0) - (first.metrics?.netWPM || 0);
            const accuracyImprovement = ((1 - (last.metrics?.errorRate || 0)) - (1 - (first.metrics?.errorRate || 0))) * 100;
            const consistencyImprovement = (last.metrics?.rhythmConsistency || 0) - (first.metrics?.rhythmConsistency || 0);
            
            const learningVelocity = sortedSessions.length > 1 ? wpmImprovement / (sortedSessions.length - 1) : 0;
            
            // Determine skill level based on latest WPM
            const latestWPM = last.metrics?.netWPM || 0;
            let skillLevel = 'Beginner';
            if (latestWPM >= 80) skillLevel = 'Expert';
            else if (latestWPM >= 60) skillLevel = 'Advanced';
            else if (latestWPM >= 40) skillLevel = 'Intermediate';
            else if (latestWPM >= 20) skillLevel = 'Novice';
            
            return {
                wpmImprovement,
                accuracyImprovement,
                consistencyImprovement,
                learningVelocity,
                skillLevel
            };
        },
        
        // Session Comparison
        toggleComparison() {
            this.comparisonMode = !this.comparisonMode;
            if (!this.comparisonMode) {
                this.comparisonSessionId = null;
                this.comparisonSession = null;
            }
        },
        
        loadComparison() {
            if (this.comparisonSessionId) {
                this.comparisonSession = this.sessions.find(s => s.id === this.comparisonSessionId);
            } else {
                this.comparisonSession = null;
            }
        },
        
        // Enhanced performance band with styling
        getPerformanceBandClass(metric, value) {
            const band = this.getPerformanceBand(metric, value);
            return band.toLowerCase();
        },
        
        // Typing Coach Analysis
        calculateCoachAnalysis(data) {
            const events = data.events || [];
            const keydownEvents = events.filter(e => e.type === 'keydown');
            
            // Finger mapping for QWERTY layout
            const fingerMapping = {
                // Left hand
                'KeyQ': 'leftPinky', 'KeyW': 'leftRing', 'KeyE': 'leftMiddle', 'KeyR': 'leftIndex', 'KeyT': 'leftIndex',
                'KeyA': 'leftPinky', 'KeyS': 'leftRing', 'KeyD': 'leftMiddle', 'KeyF': 'leftIndex', 'KeyG': 'leftIndex',
                'KeyZ': 'leftPinky', 'KeyX': 'leftRing', 'KeyC': 'leftMiddle', 'KeyV': 'leftIndex', 'KeyB': 'leftIndex',
                // Right hand
                'KeyY': 'rightIndex', 'KeyU': 'rightIndex', 'KeyI': 'rightMiddle', 'KeyO': 'rightRing', 'KeyP': 'rightPinky',
                'KeyH': 'rightIndex', 'KeyJ': 'rightIndex', 'KeyK': 'rightMiddle', 'KeyL': 'rightRing',
                'KeyN': 'rightIndex', 'KeyM': 'rightIndex',
                'Space': 'thumbs'
            };
            
            // Analyze finger performance
            const fingerStats = {};
            keydownEvents.forEach(event => {
                const finger = fingerMapping[event.code] || 'unknown';
                if (!fingerStats[finger]) {
                    fingerStats[finger] = { count: 0, totalDwell: 0, errors: 0 };
                }
                fingerStats[finger].count++;
                if (event.dwellTime) fingerStats[finger].totalDwell += event.dwellTime;
                if (event.key === 'Backspace' || event.key === 'Delete') fingerStats[finger].errors++;
            });
            
            // Calculate average dwell per finger
            Object.keys(fingerStats).forEach(finger => {
                fingerStats[finger].avgDwell = fingerStats[finger].totalDwell / fingerStats[finger].count;
                fingerStats[finger].errorRate = fingerStats[finger].errors / fingerStats[finger].count;
            });
            
            // Identify weak fingers
            const avgDwell = Object.values(fingerStats).reduce((sum, f) => sum + f.avgDwell, 0) / Object.keys(fingerStats).length;
            const weakFingers = Object.entries(fingerStats)
                .filter(([finger, stats]) => stats.avgDwell > avgDwell * 1.3)
                .map(([finger, stats]) => ({ finger, ...stats }));
            
            // Common error patterns
            const errorPatterns = this.analyzeErrorPatterns(keydownEvents);
            
            return {
                fingerStats,
                weakFingers,
                errorPatterns,
                overallFingerBalance: this.calculateFingerBalance(fingerStats)
            };
        },
        
        analyzeErrorPatterns(events) {
            const patterns = {
                doubleKeyPresses: 0,
                commonMistakes: {},
                adjacentKeyErrors: 0
            };
            
            // Analyze patterns
            for (let i = 0; i < events.length - 1; i++) {
                const current = events[i];
                const next = events[i + 1];
                
                // Double key presses
                if (current.key === next.key && next.timestamp - current.timestamp < 200) {
                    patterns.doubleKeyPresses++;
                }
                
                // Adjacent key errors (simplified)
                if (next.key === 'Backspace' && current.code) {
                    patterns.adjacentKeyErrors++;
                    const mistake = current.key;
                    patterns.commonMistakes[mistake] = (patterns.commonMistakes[mistake] || 0) + 1;
                }
            }
            
            return patterns;
        },
        
        calculateFingerBalance(fingerStats) {
            const leftFingers = ['leftPinky', 'leftRing', 'leftMiddle', 'leftIndex'];
            const rightFingers = ['rightIndex', 'rightMiddle', 'rightRing', 'rightPinky'];
            
            const leftTotal = leftFingers.reduce((sum, finger) => sum + (fingerStats[finger]?.count || 0), 0);
            const rightTotal = rightFingers.reduce((sum, finger) => sum + (fingerStats[finger]?.count || 0), 0);
            
            const total = leftTotal + rightTotal;
            return total > 0 ? {
                leftRatio: leftTotal / total,
                rightRatio: rightTotal / total,
                balance: Math.abs(0.5 - (leftTotal / total)) * 2 // 0 = perfect balance, 1 = completely unbalanced
            } : { leftRatio: 0.5, rightRatio: 0.5, balance: 0 };
        },
        
        // Flow Analysis - Advanced typing patterns
        calculateFlowAnalysis(data) {
            const events = data.events || [];
            const keydownEvents = events.filter(e => e.type === 'keydown');
            
            if (keydownEvents.length < 10) {
                return {
                    burstCount: 0,
                    avgBurstDuration: 0,
                    fatiguePoints: 0,
                    flowConsistency: 0,
                    peakWPM: 0,
                    momentumScore: 0,
                    flowSegments: []
                };
            }
            
            // Calculate rolling WPM in 5-character windows
            const windowSize = 5;
            const flowSegments = [];
            
            for (let i = 0; i <= keydownEvents.length - windowSize; i++) {
                const window = keydownEvents.slice(i, i + windowSize);
                const duration = window[window.length - 1].timestamp - window[0].timestamp;
                const wpm = duration > 0 ? (windowSize * 60000) / (duration * 5) : 0;
                
                flowSegments.push({
                    startIndex: i,
                    wpm: Math.min(200, Math.max(0, wpm)), // Clamp to reasonable range
                    timestamp: window[0].timestamp,
                    avgDwell: window.reduce((sum, e) => sum + (e.dwellTime || 0), 0) / windowSize
                });
            }
            
            // Detect speed bursts (30% above average)
            const avgWPM = flowSegments.reduce((sum, seg) => sum + seg.wpm, 0) / flowSegments.length;
            const burstThreshold = avgWPM * 1.3;
            const bursts = [];
            let currentBurst = null;
            
            flowSegments.forEach((segment, index) => {
                if (segment.wpm > burstThreshold) {
                    if (!currentBurst) {
                        currentBurst = { start: index, segments: [segment] };
                    } else {
                        currentBurst.segments.push(segment);
                    }
                } else if (currentBurst) {
                    currentBurst.end = index - 1;
                    currentBurst.duration = (currentBurst.segments[currentBurst.segments.length - 1].timestamp - 
                                             currentBurst.segments[0].timestamp) / 1000;
                    bursts.push(currentBurst);
                    currentBurst = null;
                }
            });
            
            // Close any open burst
            if (currentBurst) {
                currentBurst.end = flowSegments.length - 1;
                currentBurst.duration = (currentBurst.segments[currentBurst.segments.length - 1].timestamp - 
                                         currentBurst.segments[0].timestamp) / 1000;
                bursts.push(currentBurst);
            }
            
            // Detect fatigue points (significant drops in speed)
            const fatigueThreshold = avgWPM * 0.7;
            const fatiguePoints = flowSegments.filter(seg => seg.wpm < fatigueThreshold).length;
            
            // Calculate flow consistency (coefficient of variation)
            const wpmValues = flowSegments.map(s => s.wpm);
            const stdDev = Math.sqrt(wpmValues.reduce((sum, wpm) => sum + Math.pow(wpm - avgWPM, 2), 0) / wpmValues.length);
            const flowConsistency = avgWPM > 0 ? Math.max(0, 100 - (stdDev / avgWPM) * 100) : 0;
            
            // Calculate momentum score (acceleration and deceleration patterns)
            let momentumScore = 0;
            for (let i = 1; i < flowSegments.length; i++) {
                const acceleration = flowSegments[i].wpm - flowSegments[i - 1].wpm;
                if (acceleration > 0) momentumScore += 1; // Positive momentum
                else if (acceleration < -5) momentumScore -= 2; // Negative momentum penalty
            }
            momentumScore = Math.max(0, (momentumScore / flowSegments.length) * 100);
            
            return {
                burstCount: bursts.length,
                avgBurstDuration: bursts.length > 0 ? bursts.reduce((sum, b) => sum + b.duration, 0) / bursts.length : 0,
                fatiguePoints,
                flowConsistency,
                peakWPM: Math.max(...wpmValues),
                momentumScore,
                flowSegments,
                bursts,
                avgWPM
            };
        },
        
        // Replay functionality
        startReplay() {
            if (!this.currentSession || this.isReplaying) return;
            
            this.isReplaying = true;
            // Include both keydown and keyup events for visualization
            this.replayEvents = this.currentSession.events?.filter(e => e.type === 'keydown' || e.type === 'keyup') || [];
            this.replayEvents.sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
            this.replayTotal = this.replayEvents.length;
            this.replayIndex = 0;
            this.replayProgress = 0;
            this.replayTextDisplay = '';
            this.replayCursorX = 0;
            
            this.scheduleNextReplayEvent();
        },
        
        scheduleNextReplayEvent() {
            if (!this.isReplaying || this.replayIndex >= this.replayEvents.length) {
                this.stopReplay();
                return;
            }
            
            const currentEvent = this.replayEvents[this.replayIndex];
            const nextEvent = this.replayEvents[this.replayIndex + 1];
            
            // Calculate delay to next event
            let delay = 100; // default delay
            if (nextEvent) {
                delay = (nextEvent.timestamp - currentEvent.timestamp) / this.replaySpeed;
                delay = Math.max(50, Math.min(2000, delay)); // clamp between 50ms and 2s
            }
            
            this.replayTimer = setTimeout(() => {
                this.executeReplayEvent(currentEvent);
                this.replayIndex++;
                this.scheduleNextReplayEvent();
            }, delay);
        },
        
        executeReplayEvent(event) {
            // Update progress
            this.replayProgress = this.replayIndex + 1;
            this.replayCurrentKey = event.key + ' (' + event.type + ')';
            
            // Update text display only for keydown events
            if (event.type === 'keydown') {
                if (event.key === 'Backspace') {
                    this.replayTextDisplay = this.replayTextDisplay.slice(0, -1);
                } else if (event.key.length === 1) {
                    this.replayTextDisplay += event.key;
                }
                
                // Calculate current WPM (last 5 keydown characters)
                const recentKeydowns = this.replayEvents
                    .slice(0, this.replayIndex + 1)
                    .filter(e => e.type === 'keydown')
                    .slice(-5);
                    
                if (recentKeydowns.length >= 2) {
                    const timeSpan = recentKeydowns[recentKeydowns.length - 1].timestamp - recentKeydowns[0].timestamp;
                    this.replayCurrentWPM = timeSpan > 0 ? (recentKeydowns.length * 60000) / (timeSpan * 5) : 0;
                }
                
                // Update cursor position (approximate)
                this.replayCursorX = this.replayTextDisplay.length * 8; // rough character width
            }
            
            // Highlight key on heatmap with different colors for keydown/keyup
            this.highlightKeyOnHeatmap(event.code, event.type);
        },
        
        highlightKeyOnHeatmap(keyCode, eventType) {
            // Re-render heatmap with highlighted key and event type
            this.renderKeyboardHeatmap(keyCode, eventType);
        },
        
        pauseReplay() {
            this.isReplaying = false;
            if (this.replayTimer) {
                clearTimeout(this.replayTimer);
                this.replayTimer = null;
            }
        },
        
        stopReplay() {
            this.isReplaying = false;
            if (this.replayTimer) {
                clearTimeout(this.replayTimer);
                this.replayTimer = null;
            }
            this.replayIndex = 0;
            this.replayProgress = 0;
            this.replayTextDisplay = '';
            this.replayCursorX = 0;
            this.replayCurrentWPM = 0;
            this.replayCurrentKey = '';
            
            // Re-render heatmap without highlighting
            this.renderKeyboardHeatmap();
        }
    };
}