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
        pauseThreshold: 500, // ms - time before considering user "idle"
        isPaused: false,
        activeTypingTime: 0, // accumulated active typing time in ms
        lastActiveTime: null, // when we last detected active typing
        
        // UI state
        darkMode: true,
        experienceLevel: 'Intermediate',
        tooltip: { show: false, text: '', x: 0, y: 0 },
        
        // Experience level thresholds matrix
        levelThresholds: {
            'Beginner': {
                runningWPM: { min: 10, max: 40 },
                grossWPM: { min: 10, max: 40 },
                netWPM: { min: 10, max: 40 },
                peakWPM: { min: 10, max: 40 },
                runningDwell: { min: 0, max: 200 },
                runningFlight: { min: 0, max: 300 },
                kspc: { min: 0, max: 2.0 }
            },
            'Novice': {
                runningWPM: { min: 41, max: 60 },
                grossWPM: { min: 41, max: 60 },
                netWPM: { min: 41, max: 60 },
                peakWPM: { min: 41, max: 60 },
                runningDwell: { min: 130, max: 150 },
                runningFlight: { min: 150, max: 200 },
                kspc: { min: 1.10, max: 1.20 }
            },
            'Intermediate': {
                runningWPM: { min: 61, max: 80 },
                grossWPM: { min: 61, max: 80 },
                netWPM: { min: 61, max: 80 },
                peakWPM: { min: 61, max: 80 },
                runningDwell: { min: 110, max: 130 },
                runningFlight: { min: 120, max: 150 },
                kspc: { min: 1.05, max: 1.10 }
            },
            'Proficient': {
                runningWPM: { min: 81, max: 100 },
                grossWPM: { min: 81, max: 100 },
                netWPM: { min: 81, max: 100 },
                peakWPM: { min: 81, max: 100 },
                runningDwell: { min: 90, max: 110 },
                runningFlight: { min: 90, max: 120 },
                kspc: { min: 1.01, max: 1.05 }
            },
            'Advanced': {
                runningWPM: { min: 101, max: 120 },
                grossWPM: { min: 101, max: 120 },
                netWPM: { min: 101, max: 120 },
                peakWPM: { min: 101, max: 120 },
                runningDwell: { min: 70, max: 90 },
                runningFlight: { min: 70, max: 90 },
                kspc: { min: 1.000, max: 1.01 }
            },
            'Expert/Elite': {
                runningWPM: { min: 121, max: 999 },
                grossWPM: { min: 121, max: 999 },
                netWPM: { min: 121, max: 999 },
                peakWPM: { min: 121, max: 999 },
                runningDwell: { min: 0, max: 70 },
                runningFlight: { min: 0, max: 70 },
                kspc: { min: 1.000, max: 1.000 }
            }
        },
        
        // Real-time metrics
        elapsed: 0,
        keyStrokes: 0,
        words: 0,
        grossWPM: 0,
        netWPM: 0,
        runningWPM: 0, // running WPM over last 10 seconds
        kspc: 0,
        errRate: 0,
        avgDwell: 0,
        avgFlight: 0,
        rhythmConsistency: 0,
        resumeStartTime: null, // timestamp when resumed from pause for running metrics warm-up
        peakWPM: 0,
        recentKeystrokes: [], // for peak WPM calculation
        wpmHistory: [], // track WPM over time for peak calculation
        
        // Computed properties
        get activeTypingTimeSeconds() {
            let currentActiveTime = this.activeTypingTime;
            if (!this.isPaused && this.lastActiveTime && this.sessionStartTime) {
                const now = this.getCurrentTime();
                currentActiveTime += now - this.lastActiveTime;
            }
            return currentActiveTime / 1000;
        },
        
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
            this.loadPreferences().then(() => {
                this.updateTheme();
            }).catch(err => console.warn('Failed to load preferences:', err));
            
            // Focus text input
            this.$nextTick(() => {
                this.$refs.textInput.focus();
            });
            
            // Update metrics every 100ms
            setInterval(() => {
                this.updateRealTimeMetrics();
                this.checkForPause();
            }, 100);
        },
        
        checkForPause() {
            if (!this.lastKeyTime || !this.sessionStartTime) return;
            
            const now = this.getCurrentTime();
            const timeSinceLastKey = now - this.lastKeyTime;
            
            if (timeSinceLastKey > this.pauseThreshold) {
                if (!this.isPaused) {
                    // Just became paused - record the active time up to this point
                    if (this.lastActiveTime) {
                        this.activeTypingTime += this.lastKeyTime - this.lastActiveTime;
                    }
                    this.isPaused = true;
                }
            } else {
                if (this.isPaused) {
                    // Just resumed typing - start tracking active time again
                    this.lastActiveTime = this.lastKeyTime;
                    this.isPaused = false;
                    // start warm-up for running metrics
                    this.resumeStartTime = this.lastKeyTime;
                }
            }
        },
        
        getCurrentTime() {
            return this.highResTimer ? performance.now() : Date.now();
        },
        
        handleKeyDown(event) {
            const timestamp = this.getCurrentTime();
            
            // Initialize session on first keystroke
            if (!this.sessionStartTime) {
                this.sessionStartTime = timestamp;
                this.lastActiveTime = timestamp;
            }
            
            // Update active typing time tracking
            if (this.isPaused && this.lastKeyTime) {
                // Resuming from pause - start new active segment
                this.lastActiveTime = timestamp;
                this.isPaused = false;
            } else if (!this.isPaused && this.lastActiveTime) {
                // Continue active typing - update accumulated time
                this.activeTypingTime += timestamp - this.lastActiveTime;
                this.lastActiveTime = timestamp;
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
            
            // Track for peak WPM calculation (keep last 10 seconds of keystrokes)
            this.recentKeystrokes.push(timestamp);
            const tenSecondsAgo = timestamp - 10000;
            this.recentKeystrokes = this.recentKeystrokes.filter(t => t > tenSecondsAgo);
            
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
            // Determine if warm-up period after resume is over
            const warmUpOver = !this.resumeStartTime || (now - this.resumeStartTime >= 10000);
            if (this.resumeStartTime && warmUpOver) {
                this.resumeStartTime = null;
            }
            
            // Calculate active typing time
            let currentActiveTime = this.activeTypingTime;
            if (!this.isPaused && this.lastActiveTime) {
                currentActiveTime += now - this.lastActiveTime;
            }
            const activeMinutes = (currentActiveTime / 1000) / 60;
            
            // Word count
            this.words = this.textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
            
            // WPM calculations based on active typing time
            if (activeMinutes > 0) {
                this.grossWPM = (this.keyStrokes / 5) / activeMinutes;
                this.netWPM = this.words / activeMinutes;
            }
            
            // Running WPM: update only when active and warm-up over
            if (!this.isPaused && warmUpOver) {
                if (this.recentKeystrokes.length > 0) {
                    const timeWindowMs = now - this.recentKeystrokes[0];
                    const timeWindowMinutes = timeWindowMs / 60000;
                    this.runningWPM = timeWindowMinutes > 0
                        ? (this.recentKeystrokes.length / 5) / timeWindowMinutes
                        : 0;
                }
            }
            
            // KSPC (Keys per Character)
            const chars = this.textContent.length;
            this.kspc = chars > 0 ? this.keyStrokes / chars : 0;
            
            // Error rate (backspace/delete ratio)
            const errorKeys = this.events.filter(e => 
                e.type === 'keydown' && (e.key === 'Backspace' || e.key === 'Delete')
            ).length;
            this.errRate = this.keyStrokes > 0 ? errorKeys / this.keyStrokes : 0;

            // Running dwell time (last 10 seconds), update only when active and warm-up over
            if (!this.isPaused && warmUpOver) {
                const windowStart = now - 10000;
                const dwellWindow = this.segments
                    .filter(s => s.upTime >= windowStart && s.dwellTime !== undefined)
                    .map(s => s.dwellTime);
                this.avgDwell = dwellWindow.length > 0
                    ? dwellWindow.reduce((sum, t) => sum + t, 0) / dwellWindow.length
                    : this.avgDwell;
            }

            // Running flight time (last 10 seconds), update only when active and warm-up over
            if (!this.isPaused && warmUpOver) {
                const windowStart = now - 10000;
                const flightWindow = [];
                for (let i = 1; i < this.events.length; i++) {
                    const current = this.events[i];
                    const previous = this.events[i - 1];
                    if (
                        current.type === 'keydown' &&
                        previous.type === 'keydown' &&
                        current.timestamp >= windowStart
                    ) {
                        flightWindow.push(current.timestamp - previous.timestamp);
                    }
                }
                if (flightWindow.length > 0) {
                    this.avgFlight = flightWindow.reduce((sum, t) => sum + t, 0) / flightWindow.length;
                }
                // Rhythm consistency (coefficient of variation of flight times)
                if (flightWindow.length > 1) {
                    const mean = this.avgFlight;
                    const variance = flightWindow.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / flightWindow.length;
                    const stdDev = Math.sqrt(variance);
                    this.rhythmConsistency = mean > 0 ? (1 - (stdDev / mean)) * 100 : this.rhythmConsistency;
                }
            }
            
            // Track current WPM for peak calculation
            this.wpmHistory.push({
                timestamp: now,
                grossWPM: this.grossWPM
            });
            
            // Keep only last 60 seconds of WPM history
            const sixtySecondsAgo = now - 60000;
            this.wpmHistory = this.wpmHistory.filter(entry => entry.timestamp > sixtySecondsAgo);
            
            // Peak WPM: highest runningWPM achieved, but only after we have meaningful data
            // Wait for at least 10 keystrokes and 5 seconds of active typing
            if (this.keyStrokes >= 10 && activeMinutes >= (5/60) && this.runningWPM > this.peakWPM) {
                this.peakWPM = this.runningWPM;
            }
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
                    totalDuration: this.elapsed,
                    activeTypingTime: this.activeTypingTimeSeconds,
                    pauseThreshold: this.pauseThreshold,
                    highResTimer: this.highResTimer
                },
                metrics: {
                    keyStrokes: this.keyStrokes,
                    words: this.words,
                    grossWPM: this.grossWPM,
                    netWPM: this.netWPM,
                    runningWPM: this.runningWPM,
                    kspc: this.kspc,
                    errorRate: this.errRate,
                    avgDwell: this.avgDwell,
                    avgFlight: this.avgFlight,
                    rhythmConsistency: this.rhythmConsistency,
                    peakWPM: this.peakWPM
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
            this.activeTypingTime = 0;
            this.lastActiveTime = null;
            this.isPaused = false;
            this.recentKeystrokes = [];
            this.wpmHistory = [];
            
            // Reset metrics
            this.elapsed = 0;
            this.keyStrokes = 0;
            this.words = 0;
            this.grossWPM = 0;
            this.netWPM = 0;
            this.runningWPM = 0;
            this.kspc = 0;
            this.errRate = 0;
            this.avgDwell = 0;
            this.avgFlight = 0;
            this.rhythmConsistency = 0;
            this.peakWPM = 0;
            
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
            // convert literal "\\n" sequences to actual newlines for proper display
            const formattedText = text.replace(/\\n/g, '\n');
            this.tooltip = {
                show: true,
                text: formattedText,
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
            this.savePreferences().catch(err => console.warn('Failed to save preferences:', err));
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
        
        async loadPreferences() {
            try {
                const saved = await getItem('typingStats_preferences');
                if (saved) {
                    const prefs = typeof saved === 'string' ? JSON.parse(saved) : saved;
                    this.darkMode = prefs.darkMode !== undefined ? prefs.darkMode : true;
                    this.experienceLevel = prefs.experienceLevel || 'Intermediate';
                }
            } catch (error) {
                console.warn('Could not load preferences:', error);
                this.darkMode = true; // fallback to default
                this.experienceLevel = 'Intermediate';
            }
        },

        async savePreferences() {
            try {
                await setItem('typingStats_preferences', {
                    darkMode: this.darkMode,
                    experienceLevel: this.experienceLevel
                });
            } catch (error) {
                console.warn('Could not save preferences:', error);
            }
        },
        
        getThresholdText(metric) {
            const thresholds = this.levelThresholds[this.experienceLevel];
            if (!thresholds || !thresholds[metric]) return '';
            
            const { min, max } = thresholds[metric];
            if (metric === 'runningWPM' || metric === 'grossWPM' || metric === 'netWPM' || metric === 'peakWPM') {
                return max === 999 ? `${min}+` : `${min}–${max}`;
            } else if (metric === 'runningDwell' || metric === 'runningFlight') {
                return min === 0 ? `<${max}` : `${min}–${max}`;
            } else if (metric === 'kspc') {
                return min === max ? `${min.toFixed(3)}` : `${min.toFixed(3)}–${max.toFixed(3)}`;
            }
            return `${min}–${max}`;
        },
        
        getMetricColor(metric, value) {
            const thresholds = this.levelThresholds[this.experienceLevel];
            if (!thresholds || !thresholds[metric]) return '';
            
            const { min, max } = thresholds[metric];
            
            if (metric === 'runningWPM' || metric === 'grossWPM' || metric === 'netWPM' || metric === 'peakWPM') {
                // Higher is better for WPM
                if (value >= max * 1.1) return '#00ff00'; // Strong green (10% above max)
                if (value >= min && value <= max) return '#90EE90'; // Light green (in range)
                if (value >= min * 0.8) return '#FFD700'; // Yellow (within 20% of min)
                return '#FF4500'; // Red (below threshold)
            } else if (metric === 'runningDwell' || metric === 'runningFlight') {
                // Lower is better for dwell/flight times
                if (min === 0) { // "less than" ranges (e.g., <200 for Beginner)
                    if (value <= max * 0.7) return '#00ff00'; // Strong green (30% below max)
                    if (value <= max) return '#90EE90'; // Light green (at or below max)
                    if (value <= max * 1.3) return '#FFD700'; // Yellow (within 30% above max)
                    return '#FF4500'; // Red (well above threshold)
                } else { // regular ranges (e.g., 130-150 for Novice)
                    if (value < min) return '#00ff00'; // Strong green (below min = excellent)
                    if (value >= min && value <= max) return '#90EE90'; // Light green (in range)
                    if (value <= max * 1.3) return '#FFD700'; // Yellow (within 30% above max)
                    return '#FF4500'; // Red (well above range)
                }
            } else if (metric === 'kspc') {
                // Lower is better for KSPC (closer to 1.000 is ideal)
                if (min === max) { // Exact value for Expert/Elite (1.000 exactly)
                    if (Math.abs(value - min) <= 0.001) return '#00ff00'; // Strong green (exact)
                    if (Math.abs(value - min) <= 0.01) return '#90EE90'; // Light green (very close)
                    if (Math.abs(value - min) <= 0.05) return '#FFD700'; // Yellow (close)
                    return '#FF4500'; // Red (far from ideal)
                } else {
                    if (value < min) return '#00ff00'; // Strong green (below min = excellent)
                    if (value >= min && value <= max) return '#90EE90'; // Light green (in range)
                    if (value <= max * 1.2) return '#FFD700'; // Yellow (within 20% above max)
                    return '#FF4500'; // Red (well above range)
                }
            }
            
            return '';
        }
    };
}
