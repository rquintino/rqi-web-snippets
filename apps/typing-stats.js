/**
 * Typing Stats - Real-time Typing Analytics
 * 
 * Main purpose: Provides deep insights into typing behavior including keystroke dynamics,
 * digraph analysis, and performance metrics with privacy-first approach.
 * 
 * Key methods:
 * - handleKeyDown/Up: Captures keystroke events with precise timing
 * - handleContentEditableInput: Processes input from contenteditable text area
 * - completeWordWithColor: Finalizes typed words with color coding based on WPM
 * - updateMetrics: Calculates real-time WPM, accuracy, dwell/flight times
 * - updateDigraphs: Tracks letter transition patterns and speeds
 * - renderColoredContent: Updates display with color-coded completed words
 * - downloadSession: Exports complete session data as JSON
 * - resetSession: Clears all data and starts fresh
 */

function typingStats() {
    return {
        // Core data
        textContent: '',
        events: [],
        segments: [],
        digraphs: new Map(),
        
        // Digraph sorting state
        digraphSortBy: 'avgLatency',
        digraphSortDesc: true,
        
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
        
        // Target WPM feedback system
        targetWpm: 70, // Default based on experience level
        soundEnabled: true,
        audioContext: null,
        
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
        
        // Last word WPM tracking
        currentWordStartTime: null,
        currentWordLength: 0,
        lastWordWpm: 0,
        
        // Word coloring feature
        wordHistory: [], // Store completed word WPM data with colors
        currentWordText: '', // Track current incomplete word
        
        // Constants for word WPM calculation
        STANDARD_WORD_LENGTH: 5, // Standard 5 characters per word for WPM calculation
        MILLISECONDS_PER_MINUTE: 60000,
        
        // Word boundary characters for word completion detection
        WORD_BOUNDARIES: [' ', 'Tab', 'Enter', '.', ',', ';', ':', '!', '?', '"', "'"],
        
        // Performance optimization
        metricsUpdateThrottle: 100, // ms between metric updates
        lastMetricsUpdate: 0,
        
        // Computed properties
        get activeTypingTimeSeconds() {
            let currentActiveTime = this.activeTypingTime;
            if (!this.isPaused && this.lastActiveTime && this.sessionStartTime) {
                const now = this.getCurrentTime();
                currentActiveTime += now - this.lastActiveTime;
            }
            return currentActiveTime / 1000;
        },
        
        get sortedDigraphs() {
            return this.getSortedDigraphs();
        },
        
        init() {
            this.initializeTimerSupport();
            this.initializePreferences();
            this.initializeUI();
            this.startMetricsUpdateLoop();
            
            // Make app instance globally available for testing
            window.typingAppInstance = this;
        },
        
        initializeTimerSupport() {
            this.highResTimer = typeof performance !== 'undefined' && 
                               typeof performance.now === 'function';
        },
        
        initializePreferences() {
            this.loadPreferences().then(() => {
                this.updateTheme();
            }).catch(err => console.warn('Failed to load preferences:', err));
        },
        
        initializeUI() {
            this.$nextTick(() => {
                this.$refs.textInput.focus();
            });
            
            // Expose typing stats instance to window for testing
            window.typingStatsInstance = this;
        },
        
        
        startMetricsUpdateLoop() {
            setInterval(() => {
                this.updateRealTimeMetrics();
                this.checkForPause();
            }, this.metricsUpdateThrottle);
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
            // Handle Tab key for reset
            if (event.key === 'Tab') {
                event.preventDefault();
                this.resetSession();
                return;
            }
            
            const timestamp = this.getCurrentTime();
            
            this.initializeSessionIfNeeded(timestamp);
            this.updateActiveTypingTimeTracking(timestamp);
            
            const keyEvent = this.createKeyEvent('keydown', event, timestamp);
            this.events.push(keyEvent);
            
            this.keyStrokes++;
            this.trackRecentKeystroke(timestamp);
            this.updateDigraphs(event.key, timestamp);
            
            // Handle last word WPM tracking
            this.handleLastWordWpmTracking(event, timestamp);
            
            this.lastKeyTime = timestamp;
        },
        
        initializeSessionIfNeeded(timestamp) {
            if (!this.sessionStartTime) {
                this.sessionStartTime = timestamp;
                this.lastActiveTime = timestamp;
            }
        },
        
        updateActiveTypingTimeTracking(timestamp) {
            if (this.isPaused && this.lastKeyTime) {
                this.lastActiveTime = timestamp;
                this.isPaused = false;
            } else if (!this.isPaused && this.lastActiveTime) {
                this.activeTypingTime += timestamp - this.lastActiveTime;
                this.lastActiveTime = timestamp;
            }
        },
        
        createKeyEvent(type, event, timestamp) {
            return {
                type,
                key: event.key,
                code: event.code,
                timestamp,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey
            };
        },
        
        trackRecentKeystroke(timestamp) {
            this.recentKeystrokes.push(timestamp);
            const tenSecondsAgo = timestamp - 10000;
            this.recentKeystrokes = this.recentKeystrokes.filter(t => t > tenSecondsAgo);
        },
        
        handleLastWordWpmTracking(event, timestamp) {
            const key = event.key;
            
            // Check if this is a word boundary (space, tab, enter)
            if (this.isWordBoundary(key)) {
                this.completeCurrentWord(timestamp);
            } else if (this.isPrintableCharacter(key)) {
                // Start tracking word if not already started
                if (!this.currentWordStartTime) {
                    this.currentWordStartTime = timestamp;
                    this.currentWordLength = 0;
                }
                
                // Handle backspace/delete
                if (key === 'Backspace' || key === 'Delete') {
                    if (this.currentWordLength > 0) {
                        this.currentWordLength--;
                    }
                    // If word becomes empty, reset timing
                    if (this.currentWordLength === 0) {
                        this.currentWordStartTime = null;
                    }
                } else {
                    // Regular character, increment length
                    this.currentWordLength++;
                }
            }
        },
        
        isWordBoundary(key) {
            return this.WORD_BOUNDARIES.includes(key);
        },
        
        isPrintableCharacter(key) {
            // Include backspace and delete for word length tracking
            if (key === 'Backspace' || key === 'Delete') {
                return true;
            }
            // Regular printable characters (single character keys)
            return key.length === 1;
        },
        
        completeCurrentWord(timestamp) {
            if (this.currentWordStartTime && this.currentWordLength > 0) {
                // Calculate WPM using standard 5-letter word equivalent
                const wordTimeMinutes = (timestamp - this.currentWordStartTime) / this.MILLISECONDS_PER_MINUTE;
                const wordWpm = (this.currentWordLength / this.STANDARD_WORD_LENGTH) / wordTimeMinutes;
                
                // Update last word WPM (ensure it's a valid finite number)
                this.lastWordWpm = this.validateWpmValue(wordWpm);
                
                // Store completed word with color data
                if (this.currentWordText && this.currentWordText.trim()) {
                    this.completeWordWithColor(this.currentWordText.trim(), this.lastWordWpm, timestamp);
                }
                
                // Trigger WPM feedback if enabled
                if (this.targetWpm && this.lastWordWpm > 0) {
                    this.triggerWpmFeedback();
                }
            }
            
            // Reset word tracking for next word
            this.resetWordTracking();
        },
        
        validateWpmValue(wpm) {
            return isFinite(wpm) && wpm > 0 ? wpm : 0;
        },
        
        resetWordTracking() {
            this.currentWordStartTime = null;
            this.currentWordLength = 0;
        },
        
        handleKeyUp(event) {
            const timestamp = this.getCurrentTime();
            
            const keydownEvent = this.findCorrespondingKeydownEvent(event.key, timestamp);
            
            if (keydownEvent) {
                this.processDwellTime(keydownEvent, timestamp);
                this.createTypingSegment(event.key, keydownEvent, timestamp);
            }
            
            this.events.push(this.createKeyEvent('keyup', event, timestamp));
        },
        
        findCorrespondingKeydownEvent(key, timestamp) {
            return [...this.events].reverse().find(e => 
                e.type === 'keydown' && 
                e.key === key && 
                !e.keyupTimestamp
            );
        },
        
        processDwellTime(keydownEvent, timestamp) {
            keydownEvent.keyupTimestamp = timestamp;
            keydownEvent.dwellTime = timestamp - keydownEvent.timestamp;
        },
        
        createTypingSegment(key, keydownEvent, timestamp) {
            this.segments.push({
                key,
                downTime: keydownEvent.timestamp,
                upTime: timestamp,
                dwellTime: keydownEvent.dwellTime
            });
        },
        
        updateDigraphs(currentKey, timestamp) {
            if (this.events.length < 2) return;
            
            const previousKeydown = this.findPreviousKeydownEvent(timestamp);
            
            if (previousKeydown) {
                const digraph = previousKeydown.key + currentKey;
                const latency = timestamp - previousKeydown.timestamp;
                this.addDigraphData(digraph, latency);
            }
        },
        
        findPreviousKeydownEvent(timestamp) {
            return [...this.events].reverse().find(e => 
                e.type === 'keydown' && e.timestamp < timestamp
            );
        },
        
        addDigraphData(digraph, latency) {
            if (!this.digraphs.has(digraph)) {
                this.digraphs.set(digraph, {
                    count: 0,
                    totalLatency: 0,
                    latencies: []
                });
            }
            
            const data = this.digraphs.get(digraph);
            data.count++;
            data.totalLatency += latency;
            data.latencies.push(latency);
        },
        
        updateRealTimeMetrics() {
            if (!this.sessionStartTime) return;
            
            const now = this.getCurrentTime();
            
            // Throttle updates for performance
            if (now - this.lastMetricsUpdate < this.metricsUpdateThrottle) return;
            this.lastMetricsUpdate = now;
            
            const warmUpOver = this.checkWarmUpPeriod(now);
            const activeMinutes = this.calculateActiveTypingMinutes(now);
            
            this.updateBasicMetrics(activeMinutes);
            this.updateRunningMetrics(now, warmUpOver);
            this.updatePeakWPM(activeMinutes);
            this.cleanupHistoryData(now);
        },
        
        checkWarmUpPeriod(now) {
            const warmUpOver = !this.resumeStartTime || (now - this.resumeStartTime >= 10000);
            if (this.resumeStartTime && warmUpOver) {
                this.resumeStartTime = null;
            }
            return warmUpOver;
        },
        
        calculateActiveTypingMinutes(now) {
            let currentActiveTime = this.activeTypingTime;
            if (!this.isPaused && this.lastActiveTime) {
                currentActiveTime += now - this.lastActiveTime;
            }
            return (currentActiveTime / 1000) / 60;
        },
        
        updateBasicMetrics(activeMinutes) {
            this.words = this.calculateWordCount();
            this.updateWPMMetrics(activeMinutes);
            this.updateKSPCMetric();
            this.updateErrorRate();
        },
        
        calculateWordCount() {
            return this.textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
        },
        
        updateWPMMetrics(activeMinutes) {
            if (activeMinutes > 0) {
                this.grossWPM = (this.keyStrokes / 5) / activeMinutes;
                this.netWPM = this.words / activeMinutes;
            }
        },
        
        updateKSPCMetric() {
            const chars = this.textContent.length;
            this.kspc = chars > 0 ? this.keyStrokes / chars : 0;
        },
        
        updateErrorRate() {
            const errorKeys = this.events.filter(e => 
                e.type === 'keydown' && this.isErrorKey(e.key)
            ).length;
            this.errRate = this.keyStrokes > 0 ? errorKeys / this.keyStrokes : 0;
        },
        
        isErrorKey(key) {
            return key === 'Backspace' || key === 'Delete';
        },
        
        updateRunningMetrics(now, warmUpOver) {
            if (!this.isPaused && warmUpOver) {
                this.updateRunningWPM(now);
                this.updateRunningTiming(now);
            }
        },
        
        updateRunningWPM(now) {
            if (this.recentKeystrokes.length > 0) {
                const timeWindowMs = now - this.recentKeystrokes[0];
                const timeWindowMinutes = timeWindowMs / 60000;
                this.runningWPM = timeWindowMinutes > 0
                    ? (this.recentKeystrokes.length / 5) / timeWindowMinutes
                    : 0;
            }
        },
        
        updateRunningTiming(now) {
            const windowStart = now - 10000;
            
            this.updateRunningDwell(windowStart);
            this.updateRunningFlight(windowStart);
        },
        
        updateRunningDwell(windowStart) {
            const dwellWindow = this.segments
                .filter(s => s.upTime >= windowStart && s.dwellTime !== undefined)
                .map(s => s.dwellTime);
            
            if (dwellWindow.length > 0) {
                this.avgDwell = this.calculateMean(dwellWindow);
            }
        },
        
        updateRunningFlight(windowStart) {
            const flightWindow = this.calculateFlightTimes(windowStart);
            
            if (flightWindow.length > 0) {
                this.avgFlight = this.calculateMean(flightWindow);
                this.updateRhythmConsistency(flightWindow);
            }
        },
        
        calculateFlightTimes(windowStart) {
            const flightWindow = [];
            for (let i = 1; i < this.events.length; i++) {
                const current = this.events[i];
                const previous = this.events[i - 1];
                if (this.isValidFlightPair(current, previous, windowStart)) {
                    flightWindow.push(current.timestamp - previous.timestamp);
                }
            }
            return flightWindow;
        },
        
        isValidFlightPair(current, previous, windowStart) {
            return current.type === 'keydown' &&
                   previous.type === 'keydown' &&
                   current.timestamp >= windowStart;
        },
        
        updateRhythmConsistency(flightWindow) {
            if (flightWindow.length > 1) {
                const mean = this.avgFlight;
                const variance = this.calculateVariance(flightWindow, mean);
                const stdDev = Math.sqrt(variance);
                this.rhythmConsistency = mean > 0 ? (1 - (stdDev / mean)) * 100 : this.rhythmConsistency;
            }
        },
        
        calculateMean(values) {
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        },
        
        calculateVariance(values, mean) {
            return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        },
        
        updatePeakWPM(activeMinutes) {
            this.wpmHistory.push({
                timestamp: this.getCurrentTime(),
                grossWPM: this.grossWPM
            });
            
            if (this.keyStrokes >= 10 && activeMinutes >= (1/60) && this.runningWPM > this.peakWPM) {
                this.peakWPM = this.runningWPM;
            }
        },
        
        
        cleanupHistoryData(now) {
            const sixtySecondsAgo = now - 60000;
            this.wpmHistory = this.wpmHistory.filter(entry => entry.timestamp > sixtySecondsAgo);
        },
        
        handlePaste(event) {
            // Allow paste but don't generate artificial key events
            // The metrics will continue based on natural keystrokes
        },
        
        handleContentEditableInput(event) {
            // Extract text content from contenteditable div  
            const content = event.target.textContent || '';
            this.textContent = content;
            
            // Update current word text for tracking
            this.updateCurrentWordText(content);
        },
        
        updateCurrentWordText(content) {
            // Find the current word being typed (after last space)
            const words = content.split(/\s+/);
            const lastWord = words[words.length - 1] || '';
            
            // Only update if there's actual content
            if (content.trim()) {
                this.currentWordText = lastWord;
            } else {
                this.currentWordText = '';
            }
            
        },
        
        completeWordWithColor(wordText, wpm, timestamp) {
            // Store word in history
            const wordData = {
                word: wordText,
                wpm: wpm,
                timestamp: timestamp,
                index: this.wordHistory.length
            };
            this.wordHistory.push(wordData);
            
            // Update contenteditable content with colored span (debounced for performance)
            this.$nextTick(() => {
                this.renderColoredContent();
            });
            
            return wordData;
        },
        
        getColorFromWpm(wpm, targetWpm) {
            if (!targetWpm || !wpm) return '';
            
            if (wpm < targetWpm) {
                // Below target: Always red (hue = 0)
                return `hsl(0, 70%, 50%)`;
            } else {
                // Above target: Green intensity based on how far above
                const ratio = Math.min(wpm / targetWpm, 1.5);
                const hue = Math.min((ratio - 1) * 240 + 60, 120); // 60 (yellow-green) to 120 (green)
                return `hsl(${hue}, 70%, 50%)`;
            }
        },
        
        getWordColorFromWpm(wpm) {
            return this.getColorFromWpm(wpm, this.targetWpm) || 'var(--text-primary)';
        },
        
        renderColoredContent() {
            const textInput = this.$refs.textInput;
            if (!textInput) return;
            
            // Get current text content
            const content = textInput.textContent || '';
            const words = content.split(/(\s+)/); // Keep separators
            
            let html = '';
            let wordIndex = 0;
            
            for (const segment of words) {
                if (segment.trim()) {
                    // This is a word
                    const wordData = this.wordHistory[wordIndex];
                    if (wordData && wordData.word === segment.trim()) {
                        // This word is completed and has color data
                        const color = this.getWordColorFromWpm(wordData.wpm);
                        // Escape HTML to prevent XSS
                        const escapedWord = this.escapeHtml(wordData.word);
                        const escapedSegment = this.escapeHtml(segment);
                        html += `<span class="colored-word" style="color: ${this.escapeHtml(color)}" 
                                      onmouseover="window.typingAppInstance.showWordTooltip(event, ${wordData.wpm}, '${escapedWord}')" 
                                      onmouseleave="window.typingAppInstance.hideTooltip()">${escapedSegment}</span>`;
                        wordIndex++;
                    } else {
                        // This is the current word being typed (uncolored)
                        html += this.escapeHtml(segment);
                    }
                } else {
                    // This is whitespace/separator
                    html += segment;
                }
            }
            
            // Update the contenteditable with colored HTML
            const currentPos = this.getCaretPosition(textInput);
            textInput.innerHTML = html;
            this.setCaretPosition(textInput, currentPos);
        },
        
        showWordTooltip(event, wpm, word) {
            this.tooltip.show = true;
            this.tooltip.text = `${word}: ${wpm.toFixed(1)} WPM`;
            this.tooltip.x = event.pageX + 10;
            this.tooltip.y = event.pageY - 30;
        },
        
        getCaretPosition(element) {
            let caretPos = 0;
            if (window.getSelection) {
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    const range = selection.getRangeAt(0);
                    // Get the text position relative to the element's total text content
                    const preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(element);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    caretPos = preCaretRange.toString().length;
                }
            }
            return caretPos;
        },
        
        setCaretPosition(element, pos) {
            const range = document.createRange();
            const selection = window.getSelection();
            
            try {
                // Walk through all text nodes to find the correct position
                let textLength = 0;
                let targetNode = null;
                let targetOffset = 0;
                
                const walker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                while (node = walker.nextNode()) {
                    const nodeLength = node.textContent.length;
                    if (textLength + nodeLength >= pos) {
                        targetNode = node;
                        targetOffset = pos - textLength;
                        break;
                    }
                    textLength += nodeLength;
                }
                
                if (targetNode) {
                    range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
                } else {
                    // If we can't find the position, place cursor at the end
                    range.selectNodeContents(element);
                    range.collapse(false);
                }
                
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                
            } catch (e) {
                // Fallback: place cursor at end
                try {
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (fallbackError) {
                    // If even fallback fails, just ignore
                }
            }
        },
        
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
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
                digraphs: Object.fromEntries(this.digraphs),
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
            this.resetData();
            this.resetTiming();
            this.resetMetrics();
            
            this.$nextTick(() => {
                this.$refs.textInput.focus();
            });
        },
        
        resetData() {
            this.textContent = '';
            this.events = [];
            this.segments = [];
            this.digraphs = new Map();
            this.recentKeystrokes = [];
            this.wpmHistory = [];
            this.digraphSortBy = 'avgLatency';
            this.digraphSortDesc = true;
            
            // Clear word coloring data
            this.wordHistory = [];
            this.currentWordText = '';
            
            // Clear contenteditable content
            if (this.$refs.textInput) {
                this.$refs.textInput.innerHTML = '';
            }
        },
        
        resetTiming() {
            this.sessionStartTime = null;
            this.lastKeyTime = null;
            this.activeTypingTime = 0;
            this.lastActiveTime = null;
            this.isPaused = false;
            this.resumeStartTime = null;
        },
        
        resetMetrics() {
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
            this.lastWordWpm = 0;
            this.resetWordTracking();
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
                x: event.pageX + 10,
                y: event.pageY - 10
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
            window.location.href = '../index.html';
        },
        
        async loadPreferences() {
            try {
                const saved = await getItem('typingStats_preferences');
                if (saved) {
                    const prefs = typeof saved === 'string' ? JSON.parse(saved) : saved;
                    this.darkMode = prefs.darkMode !== undefined ? prefs.darkMode : true;
                    this.experienceLevel = prefs.experienceLevel || 'Intermediate';
                    this.targetWpm = prefs.targetWpm || this.getDefaultTargetWpm();
                } else {
                    // Set default target WPM based on experience level
                    this.targetWpm = this.getDefaultTargetWpm();
                }
            } catch (error) {
                console.warn('Could not load preferences:', error);
                this.darkMode = true; // fallback to default
                this.experienceLevel = 'Intermediate';
                this.targetWpm = this.getDefaultTargetWpm();
            }
        },

        async savePreferences() {
            try {
                await setItem('typingStats_preferences', {
                    darkMode: this.darkMode,
                    experienceLevel: this.experienceLevel,
                    targetWpm: this.targetWpm
                });
            } catch (error) {
                console.warn('Could not save preferences:', error);
            }
        },
        
        getDefaultTargetWpm() {
            const levelDefaults = {
                'Beginner': 25,
                'Novice': 50,
                'Intermediate': 70,
                'Proficient': 90,
                'Advanced': 110,
                'Expert/Elite': 130
            };
            return levelDefaults[this.experienceLevel] || 70;
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
            
            if (this.isWPMMetric(metric)) {
                return this.getWPMColor(value, min, max);
            } else if (this.isTimingMetric(metric)) {
                return this.getTimingColor(value, min, max);
            } else if (metric === 'kspc') {
                return this.getKSPCColor(value, min, max);
            }
            
            return '';
        },
        
        isWPMMetric(metric) {
            return ['runningWPM', 'grossWPM', 'netWPM', 'peakWPM'].includes(metric);
        },
        
        isTimingMetric(metric) {
            return ['runningDwell', 'runningFlight'].includes(metric);
        },
        
        getWPMColor(value, min, max) {
            if (value >= max * 1.1) return '#00ff00';
            if (value >= min && value <= max) return '#90EE90';
            if (value >= min * 0.8) return '#FFD700';
            return '#FF4500';
        },
        
        getTimingColor(value, min, max) {
            if (min === 0) {
                if (value <= max * 0.7) return '#00ff00';
                if (value <= max) return '#90EE90';
                if (value <= max * 1.3) return '#FFD700';
                return '#FF4500';
            } else {
                if (value < min) return '#00ff00';
                if (value >= min && value <= max) return '#90EE90';
                if (value <= max * 1.3) return '#FFD700';
                return '#FF4500';
            }
        },
        
        getKSPCColor(value, min, max) {
            if (min === max) {
                if (Math.abs(value - min) <= 0.001) return '#00ff00';
                if (Math.abs(value - min) <= 0.01) return '#90EE90';
                if (Math.abs(value - min) <= 0.05) return '#FFD700';
                return '#FF4500';
            } else {
                if (value < min) return '#00ff00';
                if (value >= min && value <= max) return '#90EE90';
                if (value <= max * 1.2) return '#FFD700';
                return '#FF4500';
            }
        },
        
        getSortedDigraphs() {
            const digraphArray = Array.from(this.digraphs.entries())
                .filter(([pair, data]) => data.count >= 2)
                .map(([pair, data]) => ({
                    pair: pair.replace(' ', '␣'),
                    count: data.count,
                    avgLatency: data.count > 0 ? data.totalLatency / data.count : 0,
                    stdDev: this.calculateStdDev(data.latencies, data.count > 0 ? data.totalLatency / data.count : 0)
                }));
            
            // Sort based on current sort criteria
            digraphArray.sort((a, b) => {
                let comparison = 0;
                if (this.digraphSortBy === 'count') {
                    comparison = a.count - b.count;
                } else if (this.digraphSortBy === 'avgLatency') {
                    comparison = a.avgLatency - b.avgLatency;
                }
                return this.digraphSortDesc ? -comparison : comparison;
            });
            
            return digraphArray.slice(0, 15);
        },
        
        calculateStdDev(values, mean) {
            if (values.length <= 1) return 0;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            return Math.sqrt(variance);
        },
        
        sortDigraphs(column) {
            if (this.digraphSortBy === column) {
                this.digraphSortDesc = !this.digraphSortDesc;
            } else {
                this.digraphSortBy = column;
                this.digraphSortDesc = column === 'avgLatency'; // Default desc for latency, asc for count
            }
        },
        
        // Target WPM feedback methods
        playSlowWordSound() {
            if (!this.soundEnabled) return;
            
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(220, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        },
        
        getLastWordColor() {
            return this.getColorFromWpm(this.lastWordWpm, this.targetWpm);
        },
        
        triggerWpmFeedback() {
            if (this.lastWordWpm < this.targetWpm) {
                this.playSlowWordSound();
                this.flashLastWordDisplay();
            }
        },
        
        flashLastWordDisplay() {
            // Find the last word WPM element by traversing the DOM
            const allMetricTiles = document.querySelectorAll('.metric-tile');
            let lastWordElement = null;
            
            allMetricTiles.forEach(tile => {
                const label = tile.querySelector('.metric-label');
                if (label && label.textContent.includes('Last Word WPM')) {
                    lastWordElement = tile.querySelector('.metric-value');
                }
            });
            
            if (lastWordElement) {
                lastWordElement.classList.add('last-word-flash');
                setTimeout(() => lastWordElement.classList.remove('last-word-flash'), 500);
            }
        }
    };
}
