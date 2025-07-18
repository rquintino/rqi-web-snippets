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
        tooltip: { show: false, text: '', x: 0, y: 0 },
        
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
            this.loadPreferences();
            this.updateTheme();
            
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
