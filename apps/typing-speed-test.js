/**
 * Typing Speed Test Application
 * 
 * PURPOSE:
 * A web-based typing speed test that measures Words Per Minute (WPM) and accuracy.
 * Features active typing time tracking (excludes pauses), per-word performance analysis,
 * and real-time WPM updates.
 * 
 * KEY FEATURES:
 * - Per-word WPM calculation (from first keypress to word completion)
 * - Current word WPM and average WPM display with real-time updates
 * - Real-time accuracy tracking
 * - Per-word performance visualization with background color coding
 * - Incorrect characters remain red after word completion
 * - Dark/Light mode toggle
 * - Fullscreen support
 * - 50 random common English words per test
 * - Visual cursor tracking
 * 
 * AVAILABLE METHODS:
 * 
 * === Initialization ===
 * - init()                    : Initializes the app
 * 
 * === Test Management ===
 * - generateWords()          : Generates 50 random words for the test
 * - start()                  : Starts the typing test
 * - finish()                 : Ends the test and shows results (or blind reveal if needed)
 * - continueFromBlindReveal(): Proceeds from blind reveal phase to normal results
 * - restart()                : Resets all stats and starts a new test
 * 
 * === Input Handling ===
 * - handleInput(event)       : Processes typing input, tracks timing
 * - handleKeydown(event)     : Handles space (word completion) and backspace
 * - checkWord()              : Validates current word and updates stats
 * 
 * === Statistics ===
 * - updateActiveStats()      : Calculates current word WPM and average WPM
 * - getWordWpmClass(index)   : Returns CSS class based on word's relative WPM
 * - getWordColor(wpm)        : Returns color based on WPM performance
 * - getWordBackgroundColor(index) : Returns background color based on relative WPM
 * - getCharClassForReveal(wordIndex, charIndex) : Returns character class for blind reveal phase
 * - checkAndSaveBestScore()  : Checks and saves new best score if applicable
 * 
 * === UI Management ===
 * - getCursorElement()       : Creates/positions the typing cursor
 * - updateCursor()           : Updates cursor position based on current typing position
 * - toggleDarkMode()         : Switches between dark and light themes
 * - toggleFullscreen()       : Toggles fullscreen mode
 * 
 * PERFORMANCE THRESHOLDS:
 * - Background colors are relative to all typed words:
 *   - Fastest words: Green backgrounds
 *   - Slowest words: Dark/red backgrounds
 */

function typingApp() {
    let wpmChart = null;
    let wpmChartModal = null;
    let wpmChartData = [];
    let audioContext = null;
    let errorPenalties = 0;
    
    // IndexedDB helper functions
    const dbName = 'typingSpeedTestDB';
    const dbVersion = 1;
    const storeName = 'settings';
    
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);
            
            request.onerror = (event) => {
                console.warn('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            };
        });
    }
    
    async function saveToIndexedDB(key, value) {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.put({ id: key, value });
                
                request.onsuccess = () => resolve(true);
                request.onerror = (event) => {
                    console.warn('Failed to save to IndexedDB:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.warn('IndexedDB save error:', error);
            return false;
        }
    }
    
    async function getFromIndexedDB(key) {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result.value);
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = (event) => {
                    console.warn('Failed to read from IndexedDB:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.warn('IndexedDB read error:', error);
            return null;
        }
    }
    
    async function removeFromIndexedDB(key) {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                
                request.onsuccess = () => resolve(true);
                request.onerror = (event) => {
                    console.warn('Failed to delete from IndexedDB:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.warn('IndexedDB delete error:', error);
            return false;
        }
    }
    
    // Create error sound using Web Audio API
    function playErrorSound() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        oscillator.frequency.linearRampToValueAtTime(220, audioContext.currentTime + 0.2); // A3 note
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    // Helper function to get the appropriate best score for chart reference line
    function getChartReferenceBestScore(app) {
        if (!app || typeof app.bestScore !== 'number' || isNaN(app.bestScore)) {
            return null;
        }
        
        // During active test, use previous best if a new best is being achieved
        if (app.started && !app.showResults && app.showPreviousBest && app.previousBestScore) {
            return app.previousBestScore;
        } else {
            return app.bestScore;
        }
    }

    // Enhanced tooltip callback function for chart data labels
    function createEnhancedTooltipCallback() {
        return function(context) {
            const datasetLabel = context.dataset.label || '';
            const dataIndex = context.dataIndex;
            const value = context.formattedValue;
            
            // For Word WPM dataset, show enhanced tooltip with word text and error indicators
            const app = window.typingAppInstance;
            if (datasetLabel === 'Word WPM' && app && app.words && app.wordCharStates) {
                const wordIndex = dataIndex;
                const word = app.words[wordIndex];
                const charStates = app.wordCharStates[wordIndex] || {};
                
                if (word && typeof word === 'string') {
                    // Create word text with visual indicators for correct/incorrect characters
                    let enhancedWord = '';
                    for (let charIndex = 0; charIndex < word.length; charIndex++) {
                        const character = word[charIndex];
                        const isCorrect = charStates[charIndex] === true;
                        const wasTyped = charStates[charIndex] !== undefined;
                        
                        if (!wasTyped) {
                            // Character not typed (edge case for incomplete words)
                            enhancedWord += character;
                        } else if (isCorrect) {
                            enhancedWord += '✓' + character;
                        } else {
                            enhancedWord += '✗' + character;
                        }
                    }
                    
                    return `Word #${wordIndex + 1} | ${enhancedWord} | ${value} wpm`;
                }
            }
            
            // Default tooltip for other datasets (Avg WPM, Best WPM, etc.)
            if (datasetLabel === 'Avg WPM') {
                return `Word #${dataIndex + 1} | ${value} wpm (avg)`;
            }
            
            // Fallback for any other datasets
            return `${datasetLabel}: ${value}`;
        };
    }

    function updateWpmChart(isDarkMode) {
        const ctx = document.getElementById('wpmChart').getContext('2d');
        const labels = wpmChartData.map((_, i) => i + 1);
        const data = wpmChartData;
        const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#e2b714';
        const bg = isDarkMode ? '#323437' : '#f5f5f5';
        const fg = isDarkMode ? '#d1d0c5' : '#323437';
        // Determine point colors: red for error words, accent for others
        const app = window.typingAppInstance || null;
        let pointColors = data.map((_, i) => {
            if (app && app.wordErrors && app.wordErrors[i]) return '#e53935'; // red
            return accent;
        });
        // New: Get individual word WPMs for scatter points
        let wordWpms = [];
        let wordPointColors = [];
        if (app && app.wordStats) {
            wordWpms = app.wordStats.map(stat => stat.wpm);
            wordPointColors = app.wordStats.map((stat, i) => app.wordErrors && app.wordErrors[i] ? '#e53935' : '#1976d2');
        }
        // Reference line for best WPM - use previous best during active test if new best achieved
        let bestWpmLine = null;
        const referenceBestScore = getChartReferenceBestScore(app);
        
        if (referenceBestScore !== null) {
            bestWpmLine = {
                label: 'Best WPM',
                data: Array(labels.length).fill(referenceBestScore),
                borderColor: '#43a047',
                borderWidth: 2,
                borderDash: [8, 6],
                pointRadius: 0,
                fill: false,
                order: 0,
                type: 'line',
                backgroundColor: 'rgba(67,160,71,0.1)',
                spanGaps: true,
                stepped: true
            };
        }
        if (wpmChart) {
            wpmChart.destroy();
        }
        wpmChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg WPM',
                        data: data,
                        borderColor: accent,
                        backgroundColor: accent + '33',
                        pointRadius: 2,
                        tension: 0.25,
                        fill: false,
                        pointBackgroundColor: pointColors
                    },
                    // New dataset for individual word WPMs
                    {
                        label: 'Word WPM',
                        data: wordWpms,
                        borderColor: 'rgba(0,0,0,0)', // no line
                        backgroundColor: wordPointColors,
                        pointBackgroundColor: wordPointColors,
                        pointBorderColor: wordPointColors,
                        pointRadius: 5,
                        type: 'scatter',
                        showLine: false,
                        fill: false,
                        order: 1
                    },
                    // Reference line for best WPM
                    ...(bestWpmLine ? [bestWpmLine] : [])
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: fg } },
                    title: { display: true, text: 'Average WPM Over Time', color: fg },
                    tooltip: {
                        mode: 'point',
                        intersect: false,
                        backgroundColor: isDarkMode ? '#323437' : '#f5f5f5',
                        titleColor: fg,
                        bodyColor: fg,
                        borderColor: fg,
                        borderWidth: 1,
                        usePointStyle: true,
                        callbacks: {
                            label: createEnhancedTooltipCallback()
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Word #', color: fg },
                        ticks: { color: fg }
                    },
                    y: {
                        title: { display: true, text: 'Avg WPM', color: fg },
                        beginAtZero: true,
                        ticks: { color: fg }
                    }
                }
            }
        });
    }

    function updateWpmChartModal(isDarkMode) {
        const ctx = document.getElementById('wpmChartModal').getContext('2d');
        const labels = wpmChartData.map((_, i) => i + 1);
        const data = wpmChartData;
        const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#e2b714';
        const bg = isDarkMode ? '#323437' : '#f5f5f5';
        const fg = isDarkMode ? '#d1d0c5' : '#323437';
        const app = window.typingAppInstance || null;
        let pointColors = data.map((_, i) => {
            if (app && app.wordErrors && app.wordErrors[i]) return '#e53935';
            return accent;
        });
        let wordWpms = [];
        let wordPointColors = [];
        if (app && app.wordStats) {
            wordWpms = app.wordStats.map(stat => stat.wpm);
            wordPointColors = app.wordStats.map((stat, i) => app.wordErrors && app.wordErrors[i] ? '#e53935' : '#1976d2');
        }
        let bestWpmLine = null;
        const referenceBestScore = getChartReferenceBestScore(app);
        
        if (referenceBestScore !== null) {
            bestWpmLine = {
                label: 'Best WPM',
                data: Array(labels.length).fill(referenceBestScore),
                borderColor: '#43a047',
                borderWidth: 2,
                borderDash: [8, 6],
                pointRadius: 0,
                fill: false,
                order: 0,
                type: 'line',
                backgroundColor: 'rgba(67,160,71,0.1)',
                spanGaps: true
            };
        }
        if (wpmChartModal) {
            wpmChartModal.destroy();
        }
        wpmChartModal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg WPM',
                        data: data,
                        borderColor: accent,
                        backgroundColor: accent + '33',
                        pointRadius: 2,
                        tension: 0.25,
                        fill: false,
                        pointBackgroundColor: pointColors
                    },
                    {
                        label: 'Word WPM',
                        data: wordWpms,
                        borderColor: 'rgba(0,0,0,0)',
                        backgroundColor: wordPointColors,
                        pointBackgroundColor: wordPointColors,
                        pointBorderColor: wordPointColors,
                        pointRadius: 5,
                        type: 'scatter',
                        showLine: false,
                        fill: false,
                        order: 1
                    },
                    ...(bestWpmLine ? [bestWpmLine] : [])
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: fg } },
                    title: { display: true, text: 'Average WPM Over Time', color: fg },
                    tooltip: {
                        mode: 'point',
                        intersect: false,
                        backgroundColor: isDarkMode ? '#323437' : '#f5f5f5',
                        titleColor: fg,
                        bodyColor: fg,
                        borderColor: fg,
                        borderWidth: 1,
                        usePointStyle: true,
                        callbacks: {
                            label: createEnhancedTooltipCallback()
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Word #', color: fg },
                        ticks: { color: fg }
                    },
                    y: {
                        title: { display: true, text: 'Avg WPM', color: fg },
                        beginAtZero: true,
                        ticks: { color: fg }
                    }
                }
            }
        });
    }

    function showChartModalHandler() {
        this.showChartModal = true;
        setTimeout(() => updateWpmChartModal(this.isDarkMode), 100);
        document.addEventListener('keydown', escModalHandler);
    }

    function hideChartModalHandler() {
        this.showChartModal = false;
        if (wpmChartModal) {
            wpmChartModal.destroy();
            wpmChartModal = null;
        }
        document.removeEventListener('keydown', escModalHandler);
    }

    function escModalHandler(e) {
        if (e.key === 'Escape') {
            hideChartModalHandler.call(window.typingAppInstance);
        }
    }

    // === CELEBRATION HELPERS ===
    function playCelebrationSound() {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        const notes = [523, 659, 784, 1046]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.value = 0.13;
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.18);
            gain.gain.setValueAtTime(0.13, now + i * 0.07);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.07 + 0.18);
        });
    }
    function launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        // Handle device pixel ratio for crispness
        const dpr = window.devicePixelRatio || 1;
        const W = window.innerWidth, H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        canvas.style.display = 'block';
        canvas.style.zIndex = 2000;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Confetti particles start in top 20% of screen
        let confetti = [];
        for (let i = 0; i < 80; i++) {
            confetti.push({
                x: Math.random() * W,
                y: Math.random() * H * 0.2,
                r: 6 + Math.random() * 8,
                d: 2.5 + Math.random() * 2.5, // slightly faster for full fall
                color: `hsl(${Math.random()*360},90%,60%)`,
                tilt: Math.random() * 10,
                tiltAngle: 0,
                tiltAngleInc: 0.05 + Math.random() * 0.07
            });
        }
        let frame = 0;
        const maxFrames = Math.ceil(H / 4) + 80; // ~2s fall for most screens
        function draw() {
            ctx.clearRect(0,0,W,H);
            confetti.forEach(c => {
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.r, c.r*0.6, c.tilt, 0, 2*Math.PI);
                ctx.fillStyle = c.color;
                ctx.fill();
            });
        }
        function update() {
            frame++;
            confetti.forEach(c => {
                c.y += c.d + Math.sin(frame/10 + c.x/100)*1.2;
                c.x += Math.sin(frame/15 + c.tilt)*2;
                c.tilt += c.tiltAngleInc;
            });
            draw();
            if (frame < maxFrames) requestAnimationFrame(update);
            else {
                canvas.style.display = 'none';
                ctx.clearRect(0,0,W,H);
            }
        }
        update();
    }
    function highlightBestScore() {
        // Try both stats and results screens
        const selectors = [
            '.stats .stat-value:nth-child(1) ~ .stat-value', // fallback
            '.stats .stat-value',
            '.results .stat-value',
        ];
        let el = null;
        // Try to find the best score element
        document.querySelectorAll('.stat-label').forEach(label => {
            if (label.textContent.trim().toLowerCase().includes('best wpm')) {
                const statVal = label.previousElementSibling;
                if (statVal) el = statVal;
            }
        });
        if (el) {
            el.classList.add('best-score-celebrate');
            setTimeout(()=>el.classList.remove('best-score-celebrate'), 1200);
        }
    }
    function celebrateBestScore() {
        launchConfetti();
        highlightBestScore();
        playCelebrationSound();
    }

    return {
        words: [],
        currentWordIndex: 0,
        currentCharIndex: 0,
        typedWord: '',
        started: false,
        showResults: false,
        wordErrors: {},
        currentWordWpm: 0,
        averageWpm: 0,
        accuracy: 100,
        isDarkMode: true,
        errorPenalties: 0,
        showWpmPenalty: false,
        blindMode: false,
        blindModeSelected: false,
        showBlindReveal: false,
        blindModeOriginal: false,
        typedWords: {},
        
        // Timing variables
        wordStartTime: null,
        wordFirstKeypressTime: null,
        wpmUpdateTimer: null,
        
        // Word stats
        wordStats: [],
        wordTimes: {},
        wordCharStates: {},
        
        // Final stats
        finalWpm: 0,
        finalAccuracy: 100,
        
        tooltip: {
            visible: false,
            text: '',
            style: ''
        },
        
        bestScore: null,
        previousBestScore: null,
        showPreviousBest: false,
        
        // Dictionary selection
        selectedDictionary: 'english-100',
        availableDictionaries: {},
        
        showChartModal: false,
        
        // Word sorting
        wordSortOrder: 'none',
        
        // Computed properties
        get sortedWordStats() {
            if (this.wordSortOrder === 'none') {
                return this.wordStats;
            }
            
            return [...this.wordStats].sort((a, b) => {
                if (this.wordSortOrder === 'wpm-asc') {
                    return a.wpm - b.wpm;
                } else {
                    return b.wpm - a.wpm;
                }
            });
        },
        
        async init() {
            // Load available dictionaries
            if (window.typingWordLists) {
                this.availableDictionaries = window.typingWordLists;
            }
            
            // Load saved settings from IndexedDB
            try {
                // Load blind mode setting
                const blindModeSetting = await getFromIndexedDB('typing-blind-mode');
                if (blindModeSetting !== null) {
                    this.blindMode = blindModeSetting === 'true';
                    this.blindModeSelected = blindModeSetting === 'true';
                }
                
                // Load dark mode setting
                const darkModeSetting = await getFromIndexedDB('typing-dark-mode');
                if (darkModeSetting !== null) {
                    this.isDarkMode = darkModeSetting === 'true';
                }
                
                // Load selected dictionary
                const savedDictionary = await getFromIndexedDB('typing-selected-dictionary');
                if (savedDictionary !== null && window.typingWordLists && window.typingWordLists[savedDictionary]) {
                    this.selectedDictionary = savedDictionary;
                }
            } catch (error) {
                console.warn('Failed to load settings:', error);
            }
            
            // Set dictionary from saved setting
            if (window.typingWordLists && window.typingWordLists[this.selectedDictionary]) {
                window.typingWordList = window.typingWordLists[this.selectedDictionary];
            }
            
            this.generateWords();
            this.$refs.input.focus();
            document.body.classList.toggle('light-mode', !this.isDarkMode);
            wpmChartData = [];
            window.typingAppInstance = this;
            setTimeout(() => updateWpmChart(this.isDarkMode), 100);
            await this.loadBestScore();
            // Modal chart event binding
            this.$watch('showChartModal', value => {
                if (value) {
                    setTimeout(() => updateWpmChartModal(this.isDarkMode), 100);
                    document.addEventListener('keydown', escModalHandler);
                } else {
                    if (wpmChartModal) {
                        wpmChartModal.destroy();
                        wpmChartModal = null;
                    }
                    document.removeEventListener('keydown', escModalHandler);
                }
            });
        },
        
        async loadBestScore() {
            try {
                const storageKey = `typing-best-wpm-${this.selectedDictionary}`;
                const stored = await getFromIndexedDB(storageKey);
                this.bestScore = stored ? parseFloat(stored) : null;
                if (isNaN(this.bestScore)) this.bestScore = null;
            } catch (error) {
                console.warn('Failed to load best score:', error);
                this.bestScore = null;
            }
        },
        
        async saveBestScore(newScore) {
            try {
                const storageKey = `typing-best-wpm-${this.selectedDictionary}`;
                await saveToIndexedDB(storageKey, newScore.toString());
                this.bestScore = newScore;
            } catch (error) {
                console.warn('Failed to save best score:', error);
            }
        },
        
        generateWords() {
            // Load from selected dictionary
            this.words = [];
            const list = window.typingWordList || (window.typingWordLists ? window.typingWordLists['english-100'] : []);
            for (let i = 0; i < 50; i++) {
                this.words.push(list[Math.floor(Math.random() * list.length)]);
            }
        },
        
        handleInput(event) {
            if (!this.started) {
                this.start();
            }
            
            const now = Date.now();
            
            // Start word timing on first keypress of the word
            if (this.typedWord.length === 1 && !this.wordFirstKeypressTime) {
                this.wordFirstKeypressTime = now;
                this.wordStartTime = now;
                // Start the continuous WPM update timer
                this.startWpmTimer();
            }
            
            // Store character correctness state for this word
            if (!this.wordCharStates[this.currentWordIndex]) {
                this.wordCharStates[this.currentWordIndex] = {};
            }
            
            const currentWord = this.words[this.currentWordIndex];
            const lastCharIndex = this.typedWord.length - 1;
            
            // Only check the most recently typed character
            if (lastCharIndex >= 0) {
                const isCorrect = this.typedWord[lastCharIndex] === currentWord[lastCharIndex];
                this.wordCharStates[this.currentWordIndex][lastCharIndex] = isCorrect;
                
                // Play sound and add penalty only for the incorrect character
                if (!isCorrect) {
                    playErrorSound();
                    this.errorPenalties++;
                    // Show WPM penalty animation
                    this.showWpmPenalty = true;
                    setTimeout(() => {
                        this.showWpmPenalty = false;
                    }, 1000);
                }
            }

            this.updateActiveStats();
            this.$nextTick(() => this.updateCursor());
        },
        
        handleKeydown(event) {
            if (event.key === ' ') {
                event.preventDefault();
                if (this.typedWord.length > 0) {  // Only check word if something was typed
                    this.checkWord();
                }
            } else if (event.key === 'Backspace') {
                if (this.currentCharIndex > 0) {
                    this.currentCharIndex--;
                }
            } else if (event.key.length === 1) {
                this.currentCharIndex++;
            }
            this.$nextTick(() => this.updateCursor());
        },
        
        checkWord() {
            // Clear the WPM timer when word is completed
            if (this.wpmUpdateTimer) {
                clearInterval(this.wpmUpdateTimer);
                this.wpmUpdateTimer = null;
            }
            
            const currentWord = this.words[this.currentWordIndex];
            const isCorrect = this.typedWord.trim() === currentWord;
            const now = Date.now();
            
            // Store typed word for blind reveal functionality
            this.typedWords[this.currentWordIndex] = this.typedWord.trim();
            
            if (!isCorrect) {
                this.wordErrors[this.currentWordIndex] = true;
            }
            
            // Calculate word WPM based on time from first keypress to space
            if (this.wordFirstKeypressTime) {
                const wordTime = (now - this.wordFirstKeypressTime) / 1000 / 60; // in minutes
                const wordLength = this.typedWord.length;
                const wordWpm = Math.round((wordLength / 5) / wordTime); // standard WPM calculation
                
                this.wordStats.push({
                    word: currentWord,
                    wpm: wordWpm,
                    correct: isCorrect,
                    time: wordTime
                });
                
                this.wordTimes[this.currentWordIndex] = wordWpm;
                // Update chart data
                const validWpms = this.wordStats.map(stat => stat.wpm).filter(wpm => !isNaN(wpm) && isFinite(wpm));
                if (validWpms.length > 0) {
                    const avg = Math.round(validWpms.reduce((sum, wpm) => sum + wpm, 0) / validWpms.length);
                    wpmChartData.push(avg);
                } else {
                    wpmChartData.push(0);
                }
                setTimeout(() => updateWpmChart(this.isDarkMode), 50);
            }
            
            this.currentWordIndex++;
            this.currentCharIndex = 0;
            this.typedWord = '';
            this.wordFirstKeypressTime = null;  // Reset timing for next word
            this.wordStartTime = null;
            
            if (this.currentWordIndex >= this.words.length) {
                this.finish();
            }
        },
        
        updateCurrentWordWpm() {
            if (!this.wordFirstKeypressTime || !this.started) return;
            
            const now = Date.now();
            const wordTime = (now - this.wordFirstKeypressTime) / 1000 / 60; // Convert to minutes
            const charsTyped = this.typedWord.length;
            
            if (wordTime > 0.001) {
                this.currentWordWpm = Math.round((charsTyped / 5) / wordTime);
            } else {
                this.currentWordWpm = 0;
            }
        },
        
        startWpmTimer() {
            // Clear any existing timer
            if (this.wpmUpdateTimer) {
                clearInterval(this.wpmUpdateTimer);
            }
            
            // Update WPM every 100ms
            this.wpmUpdateTimer = setInterval(() => {
                this.updateCurrentWordWpm();
            }, 100);
        },
        
        updateActiveStats() {
            // Calculate average WPM from completed words
            if (this.wordStats.length > 0) {
                const validWpms = this.wordStats
                    .map(stat => stat.wpm)
                    .filter(wpm => !isNaN(wpm) && isFinite(wpm));
                
                if (validWpms.length > 0) {
                    // Apply WPM penalties
                    this.averageWpm = Math.max(0, Math.round(
                        validWpms.reduce((sum, wpm) => sum + wpm, 0) / validWpms.length
                    ) - this.errorPenalties);
                }
            }
            
            // Calculate accuracy
            const totalWords = this.currentWordIndex;
            if (totalWords > 0) {
                const errors = Object.keys(this.wordErrors).length;
                this.accuracy = Math.round(((totalWords - errors) / totalWords) * 100);
            } else {
                this.accuracy = 100;
            }
        },
        
        getWordWpmClass(wordIndex) {
            if (!this.wordTimes[wordIndex] || this.wordStats.length === 0) return '';
            
            const allWpms = Object.values(this.wordTimes).filter(wpm => wpm > 0);
            if (allWpms.length === 0) return '';
            
            const minWpm = Math.min(...allWpms);
            const maxWpm = Math.max(...allWpms);
            const wordWpm = this.wordTimes[wordIndex];
            
            // Normalize WPM to 0-1 range
            const normalized = maxWpm === minWpm ? 0.5 : (wordWpm - minWpm) / (maxWpm - minWpm);
            
            if (normalized >= 0.8) return 'fastest';
            if (normalized >= 0.6) return 'fast';
            if (normalized >= 0.4) return 'average';
            if (normalized >= 0.2) return 'slow';
            return 'slowest';
        },
        
        getWordBackgroundColor(wordIndex) {
            if (!this.wordTimes[wordIndex] || this.wordStats.length === 0) return 'transparent';
            
            const allWpms = Object.values(this.wordTimes).filter(wpm => wpm > 0);
            if (allWpms.length === 0) return 'transparent';
            
            const minWpm = Math.min(...allWpms);
            const maxWpm = Math.max(...allWpms);
            const wordWpm = this.wordTimes[wordIndex];
            
            // Normalize WPM to 0-1 range (0 = slowest, 1 = fastest)
            const normalized = maxWpm === minWpm ? 0.5 : (wordWpm - minWpm) / (maxWpm - minWpm);
            
            // Create gradient from red (slow) to green (fast)
            const hue = normalized * 120; // 0 = red, 120 = green
            const saturation = 50 + normalized * 20; // 50-70%
            const lightness = this.isDarkMode ? 25 + normalized * 10 : 85 - normalized * 15;
            const alpha = 0.3;
            
            return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        },
        
        getCharClass(wordIndex, charIndex) {
            const classes = [];
            
            // If blind mode is active, handle differently
            if (this.blindMode) {
                // Current word that's being typed
                if (wordIndex === this.currentWordIndex && this.typedWord.length > 0) {
                    classes.push('masked');
                } 
                // Already typed words in blind mode
                else if (wordIndex < this.currentWordIndex) {
                    classes.push('masked');
                }
            } else {
                // Normal mode handling
                if (wordIndex === this.currentWordIndex) {
                    // Currently typing this word
                    if (charIndex < this.typedWord.length) {
                        if (this.typedWord[charIndex] === this.words[wordIndex][charIndex]) {
                            classes.push('correct');
                        } else {
                            classes.push('incorrect');
                        }
                    }
                } else if (wordIndex < this.currentWordIndex) {
                    // Word already completed
                    const charState = this.wordCharStates[wordIndex]?.[charIndex];
                    if (charState === true) {
                        classes.push('correct');
                    } else if (charState === false) {
                        classes.push('incorrect');
                    } else {
                        // If no state stored, check if the word was typed correctly overall
                        if (!this.wordErrors[wordIndex]) {
                            classes.push('correct');
                        }
                    }
                }
            }
            
            return classes.join(' ');
        },
        
        getCharClassForReveal(wordIndex, charIndex) {
            // Safety checks to prevent errors during template evaluation
            if (!this.words || !this.typedWords || wordIndex >= this.words.length || wordIndex >= this.currentWordIndex) {
                return '';
            }
            
            const typedWord = this.typedWords[wordIndex] || '';
            const actualWord = this.words[wordIndex] || '';
            
            // Only process characters that were actually typed and expected
            if (charIndex < typedWord.length && charIndex < actualWord.length) {
                return typedWord[charIndex] === actualWord[charIndex] ? 'correct' : 'incorrect';
            }
            
            return '';
        },
        
        getWordColor(wpm) {
            // This is used for the results display
            if (wpm >= 80) return '#4ca754';
            if (wpm >= 60) return '#7cb342';
            if (wpm >= 40) return 'var(--accent)';
            if (wpm >= 30) return '#ff9800';
            if (wpm >= 20) return '#ff5722';
            return 'var(--error)';
        },
        
        getCursorElement() {
            // Get the current word element
            const words = document.querySelectorAll('.text-display .word');
            if (!words[this.currentWordIndex]) return null;
            
            const currentWordEl = words[this.currentWordIndex];
            const chars = currentWordEl.querySelectorAll('.char');
            
            // Create a cursor element if it doesn't exist
            let cursor = document.getElementById('typing-cursor');
            if (!cursor) {
                cursor = document.createElement('span');
                cursor.id = 'typing-cursor';
                cursor.className = 'cursor';
                cursor.style.position = 'absolute';
            }
            
            // Position the cursor
            if (this.currentCharIndex < chars.length) {
                // Position before the current character
                const charEl = chars[this.currentCharIndex];
                const rect = charEl.getBoundingClientRect();
                const containerRect = document.querySelector('.text-display').getBoundingClientRect();
                cursor.style.left = (rect.left - containerRect.left) + 'px';
                cursor.style.top = (rect.top - containerRect.top) + 'px';
            } else {
                // Position after the last character
                const lastChar = chars[chars.length - 1] || currentWordEl;
                const rect = lastChar.getBoundingClientRect();
                const containerRect = document.querySelector('.text-display').getBoundingClientRect();
                cursor.style.left = (rect.right - containerRect.left) + 'px';
                cursor.style.top = (rect.top - containerRect.top) + 'px';
            }
            
            return cursor;
        },
        
        updateCursor() {
            const cursor = this.getCursorElement();
            if (cursor && this.started && !this.showResults) {
                const container = document.querySelector('.text-display');
                if (container && !container.contains(cursor)) {
                    container.appendChild(cursor);
                }
            } else if (cursor && cursor.parentNode) {
                cursor.remove();
            }
        },
        
        start() {
            this.started = true;
            this.$nextTick(() => this.updateCursor());
        },
        
        async finish() {
            // Clear the WPM timer
            if (this.wpmUpdateTimer) {
                clearInterval(this.wpmUpdateTimer);
                this.wpmUpdateTimer = null;
            }
            
            // If blind mode was active, save the setting for display and future restoration
            const wasBlindMode = this.blindMode;
            this.blindModeOriginal = wasBlindMode;
            
            // Store blind mode setting in IndexedDB
            try {
                await saveToIndexedDB('typing-blind-mode', wasBlindMode.toString());
            } catch (error) {
                console.warn('Failed to save blind mode setting:', error);
            }
            
            // Create a separate property to track UI state for blind mode
            // This will make the button appear active even when blind mode is disabled for results
            this.blindModeSelected = wasBlindMode;
            
            if (wasBlindMode) {
                // Enter reveal phase instead of going directly to results
                this.blindMode = false;  // Temporarily disable to show text
                this.showBlindReveal = true;
                // Don't proceed to results yet
                return;
            }
            
            // Normal flow for non-blind mode tests
            this.showResults = true;
            this.finalWpm = this.averageWpm;
            this.finalAccuracy = this.accuracy;
            
            // Check and save new best score if applicable
            const isNewBest = await this.checkAndSaveBestScore();
            if (isNewBest) {
                setTimeout(celebrateBestScore, 350);
            }
        },
        
        async continueFromBlindReveal() {
            // Transition from blind reveal phase to normal results
            this.showBlindReveal = false;
            this.showResults = true;
            
            // Set final scores for results display
            this.finalWpm = this.averageWpm;
            this.finalAccuracy = this.accuracy;
            
            // Check and save new best score if applicable
            const isNewBest = await this.checkAndSaveBestScore();
            
            // Restore original blind mode state for next test
            this.blindModeSelected = this.blindModeOriginal;
            
            // Celebrate new best score if achieved
            if (isNewBest) {
                setTimeout(celebrateBestScore, 350);
            }
        },
        
        async checkAndSaveBestScore() {
            if (typeof this.finalWpm === 'number' && (!this.bestScore || this.finalWpm > this.bestScore)) {
                // Store the previous best score before updating
                this.previousBestScore = this.bestScore;
                this.showPreviousBest = this.bestScore !== null; // Only show if there was a previous best
                
                await this.saveBestScore(this.finalWpm);
                return true;
            }
            return false;
        },
        
        async restart() {
            // Clear the WPM timer
            if (this.wpmUpdateTimer) {
                clearInterval(this.wpmUpdateTimer);
                this.wpmUpdateTimer = null;
            }
            
            this.words = [];
            this.currentWordIndex = 0;
            this.currentCharIndex = 0;
            this.typedWord = '';
            this.started = false;
            this.showResults = false;
            this.showBlindReveal = false;
            this.typedWords = {};
            this.wordErrors = {};
            this.currentWordWpm = 0;
            this.averageWpm = 0;
            this.accuracy = 100;
            this.wordFirstKeypressTime = null;
            this.wordStats = [];
            this.wordTimes = {};
            this.wordCharStates = {};
            this.errorPenalties = 0;
            this.showPreviousBest = false;
            
            // Restore blind mode from blindModeSelected or IndexedDB if needed
            try {
                if (this.blindModeSelected !== undefined) {
                    // Use the selected state we already have
                    this.blindMode = this.blindModeSelected;
                } else {
                    // Fall back to IndexedDB if for some reason blindModeSelected is not set
                    const savedBlindMode = await getFromIndexedDB('typing-blind-mode');
                    if (savedBlindMode !== null) {
                        this.blindMode = savedBlindMode === 'true';
                        this.blindModeSelected = this.blindMode;
                    }
                }
            } catch (error) {
                console.warn('Failed to restore blind mode setting:', error);
            }
            
            this.generateWords();
            this.$refs.input.focus();
            wpmChartData = [];
            setTimeout(() => updateWpmChart(this.isDarkMode), 100);
            this.loadBestScore();
        },
        
        async toggleBlindMode() {
            this.blindMode = !this.blindMode;
            this.blindModeSelected = this.blindMode;
            
            // Save setting to IndexedDB
            try {
                await saveToIndexedDB('typing-blind-mode', this.blindMode.toString());
            } catch (error) {
                console.warn('Failed to save blind mode setting:', error);
            }
            
            // Return focus to the input field
            this.$nextTick(() => {
                this.$refs.input.focus();
            });
        },
        
        async toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            
            // Save setting to IndexedDB
            try {
                await saveToIndexedDB('typing-dark-mode', this.isDarkMode.toString());
            } catch (error) {
                console.warn('Failed to save dark mode setting:', error);
            }
            
            document.body.classList.toggle('light-mode', !this.isDarkMode);
            setTimeout(() => updateWpmChart(this.isDarkMode), 100);
        },
        
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        },
        
        showWordTooltip(wordIndex, event) {
            // Only show for completed words
            if (wordIndex > this.currentWordIndex) return;
            let wpm = this.wordTimes[wordIndex];
            let stat = this.wordStats[wordIndex];
            let failedChars = [];
            let word = this.words[wordIndex];
            let charStates = this.wordCharStates[wordIndex] || {};
            for (let i = 0; i < word.length; i++) {
                if (charStates[i] === false) failedChars.push(word[i] || '_');
            }
            let failedStr = failedChars.length ? ` | Failed: ${failedChars.join(', ')}` : '';
            let wpmStr = (wpm && stat) ? `WPM: ${wpm}` : 'Not completed';
            this.tooltip.text = `${word} | ${wpmStr}${failedStr}`;
            // Position tooltip near mouse
            let x = event.clientX;
            let y = event.clientY;
            this.tooltip.style = `position: fixed; left: ${x + 10}px; top: ${y + 10}px; z-index: 1000;`;
            this.tooltip.visible = true;
        },
        hideWordTooltip() {
            this.tooltip.visible = false;
        },
        async resetBestScore() {
            try {
                const storageKey = `typing-best-wpm-${this.selectedDictionary}`;
                await removeFromIndexedDB(storageKey);
                this.bestScore = null;
            } catch (error) {
                console.warn('Failed to reset best score:', error);
            }
        },
        async changeDictionary(event) {
            this.selectedDictionary = event.target.value;
            
            // Save selected dictionary to IndexedDB
            try {
                await saveToIndexedDB('typing-selected-dictionary', this.selectedDictionary);
            } catch (error) {
                console.warn('Failed to save dictionary setting:', error);
            }
            
            if (window.typingWordLists && window.typingWordLists[this.selectedDictionary]) {
                window.typingWordList = window.typingWordLists[this.selectedDictionary];
                await this.loadBestScore(); // Load the best score for the new dictionary
                this.restart();
            }
        },
        showChartModalHandler,
        hideChartModalHandler
    };
}