/**
 * Typing Stats - Real-time Typing Analytics
 * 
 * Main purpose: Provides deep insights into typing behavior including keystroke dynamics,
 * digraph analysis, and performance metrics with privacy-first approach.
 * 
 * Key methods:
 * - handleKeyDown/Up: Captures keystroke events with precise timing
 * - updateMetrics: Calculates real-time WPM, accuracy, dwell/flight times
 * - updateDigraphs: Tracks letter transition patterns and speeds
 * - downloadSession: Exports complete session data as JSON
 * - resetSession: Clears all data and starts fresh
 */

function typingStats() {
    return {
        // Core data
        textContent: '',
        events: [],
        segments: [],
        digraphs: {},
        
        // Timing
        sessionStartTime: null,
        lastKeyTime: null,
        highResTimer: true,
        
        // UI state
        darkMode: true,
        tooltip: { show: false, text: '', x: 0, y: 0 },
        
        // Real-time metrics
        elapsed: 0,
        keyStrokes: 0,
        words: 0,
        grossWPM: 0,
        netWPM: 0,
        kspc: 0,
        errRate: 0,
        avgDwell: 0,
        avgFlight: 0,
        spaceDowns: 0,
        shiftCount: 0,
        ctrlCount: 0,
        altCount: 0,
        metaCount: 0,
        
        // Computed properties
        get topFrequentDigraphs() {
            return Object.entries(this.digraphs)
                .map(([pair, data]) => ({
                    pair: pair.replace(' ', '␣'),
                    count: data.count,
                    avgLatency: data.count > 0 ? data.totalLatency / data.count : 0
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        },
        
        get topSlowestDigraphs() {
            return Object.entries(this.digraphs)
                .filter(([_, data]) => data.count >= 3)
                .map(([pair, data]) => ({
                    pair: pair.replace(' ', '␣'),
                    count: data.count,
                    avgLatency: data.count > 0 ? data.totalLatency / data.count : 0
                }))
                .sort((a, b) => b.avgLatency - a.avgLatency)
                .slice(0, 10);
        },
        
        init() {
            // Check for high-resolution timer support
            this.highResTimer = typeof performance !== 'undefined' && 
                               typeof performance.now === 'function';
            
            // Load preferences
            this.loadPreferences();
            this.updateTheme();
            
            // Focus text input
            this.$nextTick(() => {
                this.$refs.textInput.focus();
            });
            
            // Update metrics every 100ms
            setInterval(() => {
                this.updateRealTimeMetrics();
            }, 100);
        },
        
        getCurrentTime() {
            return this.highResTimer ? performance.now() : Date.now();
        },
        
        handleKeyDown(event) {
            const timestamp = this.getCurrentTime();
            
            // Initialize session on first keystroke
            if (!this.sessionStartTime) {
                this.sessionStartTime = timestamp;
            }
            
            // Record keystroke event
            const keyEvent = {
                type: 'keydown',
                key: event.key,
                code: event.code,
                timestamp: timestamp,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey
            };
            
            this.events.push(keyEvent);
            
            // Update counters
            this.keyStrokes++;
            
            if (event.key === ' ') this.spaceDowns++;
            if (event.shiftKey && event.key === 'Shift') this.shiftCount++;
            if (event.ctrlKey && event.key === 'Control') this.ctrlCount++;
            if (event.altKey && event.key === 'Alt') this.altCount++;
            if (event.metaKey && (event.key === 'Meta' || event.key === 'Cmd')) this.metaCount++;
            
            // Track digraphs
            this.updateDigraphs(event.key, timestamp);
            
            this.lastKeyTime = timestamp;
        },
        
        handleKeyUp(event) {
            const timestamp = this.getCurrentTime();
            
            // Find corresponding keydown event
            const keydownEvent = [...this.events].reverse().find(e => 
                e.type === 'keydown' && 
                e.key === event.key && 
                !e.keyupTimestamp
            );
            
            if (keydownEvent) {
                keydownEvent.keyupTimestamp = timestamp;
                keydownEvent.dwellTime = timestamp - keydownEvent.timestamp;
                
                // Create segment for analysis
                this.segments.push({
                    key: event.key,
                    downTime: keydownEvent.timestamp,
                    upTime: timestamp,
                    dwellTime: keydownEvent.dwellTime
                });
            }
            
            // Record keyup event
            this.events.push({
                type: 'keyup',
                key: event.key,
                code: event.code,
                timestamp: timestamp
            });
        },
        
        updateDigraphs(currentKey, timestamp) {
            if (this.events.length < 2) return;
            
            // Find the previous keydown event
            const previousKeydown = [...this.events].reverse().find(e => 
                e.type === 'keydown' && e.timestamp < timestamp
            );
            
            if (previousKeydown) {
                const digraph = previousKeydown.key + currentKey;
                const latency = timestamp - previousKeydown.timestamp;
                
                if (!this.digraphs[digraph]) {
                    this.digraphs[digraph] = {
                        count: 0,
                        totalLatency: 0
                    };
                }
                
                this.digraphs[digraph].count++;
                this.digraphs[digraph].totalLatency += latency;
            }
        },
        
        updateRealTimeMetrics() {
            if (!this.sessionStartTime) return;
            
            const now = this.getCurrentTime();
            this.elapsed = (now - this.sessionStartTime) / 1000; // seconds
            
            // Word count
            this.words = this.textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
            
            // WPM calculations
            const minutes = this.elapsed / 60;
            if (minutes > 0) {
                this.grossWPM = (this.keyStrokes / 5) / minutes;
                this.netWPM = this.words / minutes;
            }
            
            // KSPC (Keys per Character)
            const chars = this.textContent.length;
            this.kspc = chars > 0 ? this.keyStrokes / chars : 0;
            
            // Error rate (backspace/delete ratio)
            const errorKeys = this.events.filter(e => 
                e.type === 'keydown' && (e.key === 'Backspace' || e.key === 'Delete')
            ).length;
            this.errRate = this.keyStrokes > 0 ? errorKeys / this.keyStrokes : 0;
            
            // Average dwell time
            const dwellTimes = this.segments.map(s => s.dwellTime).filter(t => t !== undefined);
            this.avgDwell = dwellTimes.length > 0 ? 
                dwellTimes.reduce((sum, t) => sum + t, 0) / dwellTimes.length : 0;
            
            // Average flight time
            const flightTimes = [];
            for (let i = 1; i < this.events.length; i++) {
                const current = this.events[i];
                const previous = this.events[i - 1];
                if (current.type === 'keydown' && previous.type === 'keydown') {
                    flightTimes.push(current.timestamp - previous.timestamp);
                }
            }
            this.avgFlight = flightTimes.length > 0 ? 
                flightTimes.reduce((sum, t) => sum + t, 0) / flightTimes.length : 0;
        },
        
        handlePaste(event) {
            // Allow paste but don't generate artificial key events
            // The metrics will continue based on natural keystrokes
        },
        
        downloadSession() {
            if (this.events.length === 0) return;
            
            const sessionData = {
                metadata: {
                    version: '2025-07-18.1',
                    sessionStart: new Date(Date.now() - this.elapsed * 1000).toISOString(),
                    sessionEnd: new Date().toISOString(),
                    duration: this.elapsed,
                    highResTimer: this.highResTimer
                },
                metrics: {
                    keyStrokes: this.keyStrokes,
                    words: this.words,
                    grossWPM: this.grossWPM,
                    netWPM: this.netWPM,
                    kspc: this.kspc,
                    errorRate: this.errRate,
                    avgDwell: this.avgDwell,
                    avgFlight: this.avgFlight,
                    spaceDowns: this.spaceDowns,
                    modifierCounts: {
                        shift: this.shiftCount,
                        ctrl: this.ctrlCount,
                        alt: this.altCount,
                        meta: this.metaCount
                    }
                },
                events: this.events,
                segments: this.segments,
                digraphs: this.digraphs,
                textContent: this.textContent
            };
            
            const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `typing-stats-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        resetSession() {
            this.textContent = '';
            this.events = [];
            this.segments = [];
            this.digraphs = {};
            this.sessionStartTime = null;
            this.lastKeyTime = null;
            
            // Reset metrics
            this.elapsed = 0;
            this.keyStrokes = 0;
            this.words = 0;
            this.grossWPM = 0;
            this.netWPM = 0;
            this.kspc = 0;
            this.errRate = 0;
            this.avgDwell = 0;
            this.avgFlight = 0;
            this.spaceDowns = 0;
            this.shiftCount = 0;
            this.ctrlCount = 0;
            this.altCount = 0;
            this.metaCount = 0;
            
            this.$nextTick(() => {
                this.$refs.textInput.focus();
            });
        },
        
        formatTime(seconds) {
            if (seconds < 60) {
                return `${seconds.toFixed(1)}s`;
            } else if (seconds < 3600) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}m ${secs}s`;
            } else {
                const hours = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                return `${hours}h ${mins}m`;
            }
        },
        
        showTooltip(event, text) {
            this.tooltip = {
                show: true,
                text: text,
                x: event.clientX + 10,
                y: event.clientY - 10
            };
        },
        
        hideTooltip() {
            this.tooltip.show = false;
        },
        
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            this.updateTheme();
            this.savePreferences();
        },
        
        updateTheme() {
            if (this.darkMode) {
                document.body.classList.remove('light-mode');
            } else {
                document.body.classList.add('light-mode');
            }
        },
        
        toggleFullscreen() {
            try {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            } catch (error) {
                console.warn('Fullscreen not supported or failed:', error);
            }
        },
        
        goHome() {
            window.location.href = 'index.html';
        },
        
        loadPreferences() {
            try {
                const saved = localStorage.getItem('typingStats_preferences');
                if (saved) {
                    const prefs = JSON.parse(saved);
                    this.darkMode = prefs.darkMode !== undefined ? prefs.darkMode : true;
                }
            } catch (error) {
                console.warn('Could not load preferences:', error);
                this.darkMode = true; // fallback to default
            }
        },

        savePreferences() {
            try {
                localStorage.setItem('typingStats_preferences', JSON.stringify({
                    darkMode: this.darkMode
                }));
            } catch (error) {
                console.warn('Could not save preferences:', error);
            }
        }
    };
}
