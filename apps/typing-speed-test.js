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
 * - calculateCharacterAccuracy() : Calculates character-level accuracy (industry standard)
 * - getWordWpmClass(index)   : Returns CSS class based on word's relative WPM
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
    const dbVersion = 2;
    const storeName = 'settings';
    const ledgerStoreName = 'wordLedger';
    const LEDGER_MAX_SAMPLES = 20;

    /** Extract WPM from ledger entry (handles legacy number or {wpm, ts} object) */
    function ledgerWpm(entry) {
        return typeof entry === 'number' ? entry : entry.wpm;
    }

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
                if (!db.objectStoreNames.contains(ledgerStoreName)) {
                    db.createObjectStore(ledgerStoreName, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Loads the full word ledger for a given dictionary from IndexedDB.
     * @param {string} dictionary - Dictionary key (e.g. 'english-100')
     * @returns {Object} Map of word -> { effectiveWpms: Array<number|{wpm,ts}>, lastUpdated: number }
     */
    async function loadWordLedger(dictionary) {
        const db = await openDB();
        const tx = db.transaction(ledgerStoreName, 'readonly');
        const store = tx.objectStore(ledgerStoreName);
        return new Promise((resolve) => {
            const request = store.get(`ledger-${dictionary}`);
            request.onsuccess = () => resolve(request.result ? request.result.value : {});
            request.onerror = () => resolve({});
        });
    }

    /**
     * Saves the full word ledger for a given dictionary to IndexedDB.
     * @param {string} dictionary - Dictionary key
     * @param {Object} ledger - Map of word -> { effectiveWpms, lastUpdated }
     */
    async function saveWordLedger(dictionary, ledger) {
        const db = await openDB();
        const tx = db.transaction(ledgerStoreName, 'readwrite');
        const store = tx.objectStore(ledgerStoreName);
        return new Promise((resolve, reject) => {
            const request = store.put({ id: `ledger-${dictionary}`, value: ledger });
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
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
    
    // Expose IndexedDB functions to window for testing
    window.saveToIndexedDB = saveToIndexedDB;
    window.getFromIndexedDB = getFromIndexedDB;
    window.removeFromIndexedDB = removeFromIndexedDB;
    window.loadWordLedger = loadWordLedger;
    window.saveWordLedger = saveWordLedger;
    
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

    // Centralized function to calculate consistent average WPM from wordStats
    // This is the single source of truth for all average calculations
    function calculateConsistentAverage(app, includePenalties = false, precision = 1) {
        if (!app || !app.wordStats || app.wordStats.length === 0) return 0;
        
        const validStats = app.wordStats.filter(stat => stat && typeof stat.wpm === 'number' && !isNaN(stat.wpm));
        if (validStats.length === 0) return 0;
        
        const rawAverage = validStats.reduce((sum, stat) => sum + stat.wpm, 0) / validStats.length;
        
        let result = rawAverage;
        if (includePenalties) {
            result = Math.max(0, rawAverage - (app.errorPenalties || 0));
        }
        
        // Round to specified decimal places for consistency
        return Math.round(result * Math.pow(10, precision)) / Math.pow(10, precision);
    }

    // Helper function to calculate cumulative average WPM for chart legend
    // UPDATED: Now uses wordStats as single source of truth with 1 decimal place
    function getCumulativeAverageWpm(data) {
        // Use app instance to get consistent calculation from wordStats
        const app = window.typingAppInstance;
        if (app && app.wordStats && app.wordStats.length > 0) {
            return calculateConsistentAverage(app, false, 1);
        }
        
        // Fallback to old calculation only if app not available or no wordStats yet
        if (!data || data.length === 0) return 0;
        const validData = data.filter(wpm => !isNaN(wpm) && isFinite(wpm));
        if (validData.length === 0) return 0;
        const sum = validData.reduce((total, wpm) => total + wpm, 0);
        return Math.round((sum / validData.length) * 10) / 10; // Round to 1 decimal place
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

    // === STATISTICAL CALCULATION METHODS ===
    
    // Statistical constants for sigma band calculations
    const SIGMA_STATS_CONFIG = {
        MIN_SAMPLE_SIZE: 10,           // Minimum words needed for reliable statistics
        SIGMA_MULTIPLIER: 3,           // Number of standard deviations for bounds
        MIN_SD_PERCENT: 0.05,          // Minimum SD as percentage of mean (5%)
        MIN_BAND_WIDTH_PERCENT: 0.20   // Minimum band width as percentage of mean (20%)
    };

    /**
     * Returns empty statistics object when insufficient data is available
     */
    function getEmptyStatistics() {
        return {
            mean: 0,
            standardDeviation: 0,
            upperBound: 0,
            lowerBound: 0,
            outliers: {
                upper: [],
                lower: []
            }
        };
    }

    /**
     * Filters and validates word statistics for mathematical calculations
     * @param {Object} app - The typing app instance
     * @returns {Array} Array of valid word statistics
     */
    function getValidWordStats(app) {
        if (!app || !app.wordStats) return [];
        
        return app.wordStats.filter(stat => 
            stat && 
            typeof stat.wpm === 'number' && 
            !isNaN(stat.wpm) && 
            isFinite(stat.wpm)
        );
    }

    /**
     * Calculates the original statistical bounds used for outlier detection
     * (separate from display bounds which may have safeguards applied)
     * @param {Object} app - The typing app instance
     * @returns {Object} Original statistical bounds
     */
    function calculateOriginalStatisticalBounds(app) {
        const validStats = getValidWordStats(app);
        
        if (validStats.length < SIGMA_STATS_CONFIG.MIN_SAMPLE_SIZE) {
            return { upperBound: 0, lowerBound: 0, mean: 0, standardDeviation: 0 };
        }
        
        const rawWpms = validStats.map(stat => stat.wpm);
        const rawMean = rawWpms.reduce((sum, wpm) => sum + wpm, 0) / rawWpms.length;
        const variance = rawWpms.reduce((sum, wpm) => Math.pow(wpm - rawMean, 2), 0) / rawWpms.length;
        const standardDeviation = Math.sqrt(variance);
        const upperBound = rawMean + (SIGMA_STATS_CONFIG.SIGMA_MULTIPLIER * standardDeviation);
        const lowerBound = Math.max(0, rawMean - (SIGMA_STATS_CONFIG.SIGMA_MULTIPLIER * standardDeviation));
        
        return { upperBound, lowerBound, mean: rawMean, standardDeviation };
    }

    /**
     * Groups outliers by unique word and calculates statistics for each group.
     * 
     * @param {Array} outliers - Array of outlier objects with word and wpm properties
     * @returns {Array} Array of grouped outliers with word, meanWpm, standardDeviation, instanceCount
     */
    function groupOutliersByWord(outliers) {
        if (!outliers || outliers.length === 0) return [];
        
        // Group outliers by word
        const wordGroups = {};
        outliers.forEach(outlier => {
            if (!outlier || !outlier.word || typeof outlier.wpm !== 'number') return; // Skip invalid entries
            
            const word = outlier.word;
            if (!wordGroups[word]) {
                wordGroups[word] = [];
            }
            wordGroups[word].push(outlier.wpm);
        });
        
        // Calculate statistics for each word group
        const groupedOutliers = [];
        Object.keys(wordGroups).forEach(word => {
            const wpms = wordGroups[word];
            if (wpms.length > 0) {
                const meanWpm = wpms.reduce((sum, wpm) => sum + wpm, 0) / wpms.length;
                
                // Calculate standard deviation
                let standardDeviation = 0;
                if (wpms.length > 1) {
                    const variance = wpms.reduce((sum, wpm) => Math.pow(wpm - meanWpm, 2), 0) / wpms.length;
                    standardDeviation = Math.sqrt(variance);
                }
                
                groupedOutliers.push({
                    word: word,
                    meanWpm: meanWpm,
                    standardDeviation: standardDeviation,
                    instanceCount: wpms.length,
                    // Keep original properties for backward compatibility
                    wpm: meanWpm
                });
            }
        });
        
        return groupedOutliers;
    }

    /**
     * Calculates mathematically consistent WPM statistics with safeguards against
     * narrow sigma bands and unreliable small-sample statistics.
     * 
     * Key improvements:
     * - Requires minimum 10 words for reliable statistics
     * - Uses consistent raw values for mean and standard deviation
     * - Applies minimum band width safeguards (20% of mean)
     * - Separates outlier detection from band display bounds
     * 
     * @param {Object} app - The typing app instance
     * @returns {Object} Statistical measures with bounds and outliers
     */
    function calculateWordWpmStatistics(app) {
        const validStats = getValidWordStats(app);
        
        // Require minimum sample size for reliable statistics
        if (validStats.length < SIGMA_STATS_CONFIG.MIN_SAMPLE_SIZE) {
            return getEmptyStatistics();
        }
        
        // Extract raw WPM values for mathematical consistency
        const rawWpms = validStats.map(stat => stat.wpm);
        
        // Calculate mean using raw values (not rounded for precision)
        const rawMean = rawWpms.reduce((sum, wpm) => sum + wpm, 0) / rawWpms.length;
        
        // Calculate standard deviation using same raw values and raw mean
        const variance = rawWpms.reduce((sum, wpm) => Math.pow(wpm - rawMean, 2), 0) / rawWpms.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Apply minimum standard deviation safeguard to prevent artificially narrow bands
        const minStandardDeviation = Math.max(
            standardDeviation, 
            rawMean * SIGMA_STATS_CONFIG.MIN_SD_PERCENT
        );
        
        // Calculate initial 3σ bounds with minimum SD
        let upperBound = rawMean + (SIGMA_STATS_CONFIG.SIGMA_MULTIPLIER * minStandardDeviation);
        let lowerBound = Math.max(0, rawMean - (SIGMA_STATS_CONFIG.SIGMA_MULTIPLIER * minStandardDeviation));
        
        // Apply minimum band width safeguard for user experience
        const minBandWidth = rawMean * SIGMA_STATS_CONFIG.MIN_BAND_WIDTH_PERCENT;
        const currentBandWidth = upperBound - lowerBound;
        
        if (currentBandWidth < minBandWidth) {
            const expansion = (minBandWidth - currentBandWidth) / 2;
            upperBound += expansion;
            lowerBound = Math.max(0, lowerBound - expansion);
        }
        
        // Log statistics for debugging (non-sensitive data only)
        console.log(`WPM Stats - Mean: ${rawMean.toFixed(1)}, SD: ${standardDeviation.toFixed(1)}, ` +
                   `Min SD: ${minStandardDeviation.toFixed(1)}, Upper: ${upperBound.toFixed(1)}, ` +
                   `Lower: ${lowerBound.toFixed(1)}, Band Width: ${((upperBound - lowerBound) / rawMean * 100).toFixed(1)}%`);
        
        // Get original statistical bounds for outlier detection
        const originalBounds = calculateOriginalStatisticalBounds(app);
        
        const outliers = {
            upper: [],
            lower: []
        };
        
        validStats.forEach((stat, index) => {
            if (stat.wpm > originalBounds.upperBound) {
                outliers.upper.push({
                    word: stat.word,
                    wpm: stat.wpm,
                    index: index
                });
            } else if (stat.wpm < originalBounds.lowerBound) {
                outliers.lower.push({
                    word: stat.word,
                    wpm: stat.wpm,
                    index: index
                });
            }
        });
        
        return {
            mean: rawMean,
            standardDeviation,
            upperBound,
            lowerBound,
            outliers
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
        
        // Conditional final WPM line with penalties for error visualization
        let finalWpmLine = null;
        if (app && app.errorPenalties > 0 && data.length > 0 && app.finalWpm !== undefined) {
            // Create a straight horizontal line at the final WPM value
            const finalWpmValue = Math.max(0, app.finalWpm);
            finalWpmLine = {
                label: `WPM Penalties (${app.errorPenalties})`,
                data: Array(labels.length).fill(finalWpmValue),
                borderColor: '#ef4444', // Red color for penalties
                borderWidth: 2,
                borderDash: [5, 5], // Dashed line to distinguish from average
                pointRadius: 0, // No points for straight line
                fill: false,
                order: 2,
                type: 'line',
                backgroundColor: 'rgba(239,68,68,0.1)',
                spanGaps: true,
                stepped: true
            };
        }
        
        // Calculate 3σ statistical bounds for outlier detection
        const stats = calculateWordWpmStatistics(app);
        let upperBoundLine = null;
        let lowerBoundLine = null;
        
        if (stats.standardDeviation > 0 && labels.length >= SIGMA_STATS_CONFIG.MIN_SAMPLE_SIZE) {
            // 3σ Upper Bound Line
            upperBoundLine = {
                label: `3σ Upper Bound (${stats.upperBound.toFixed(1)})`,
                data: Array(labels.length).fill(stats.upperBound),
                borderColor: '#ff9800', // Orange color for bounds
                borderWidth: 2,
                borderDash: [6, 4], // Dashed line pattern
                pointRadius: 0,
                fill: false,
                order: 3,
                type: 'line',
                backgroundColor: 'rgba(255,152,0,0.1)',
                spanGaps: true,
                stepped: true
            };
            
            // 3σ Lower Bound Line
            lowerBoundLine = {
                label: `3σ Lower Bound (${Math.max(0, stats.lowerBound).toFixed(1)})`,
                data: Array(labels.length).fill(Math.max(0, stats.lowerBound)), // Ensure non-negative
                borderColor: '#ff9800', // Orange color for bounds
                borderWidth: 2,
                borderDash: [6, 4], // Dashed line pattern
                pointRadius: 0,
                fill: false,
                order: 3,
                type: 'line',
                backgroundColor: 'rgba(255,152,0,0.1)',
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
                        label: `Average WPM (${getCumulativeAverageWpm(data).toFixed(1)})`,
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
                    ...(bestWpmLine ? [bestWpmLine] : []),
                    // Conditional final WPM line with penalties
                    ...(finalWpmLine ? [finalWpmLine] : []),
                    // 3σ statistical bound lines
                    ...(upperBoundLine ? [upperBoundLine] : []),
                    ...(lowerBoundLine ? [lowerBoundLine] : [])
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
        
        // Make chart globally accessible for testing
        window.wpmChart = wpmChart;
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
        
        // Conditional final WPM line with penalties (mirrors main chart)
        let finalWpmLine = null;
        if (app && app.errorPenalties > 0 && data.length > 0 && app.finalWpm !== undefined) {
            // Create a straight horizontal line at the final WPM value
            const finalWpmValue = Math.max(0, app.finalWpm);
            finalWpmLine = {
                label: `WPM Penalties (${app.errorPenalties})`,
                data: Array(labels.length).fill(finalWpmValue),
                borderColor: '#ef4444', // Red color for penalties
                borderWidth: 2,
                borderDash: [5, 5], // Dashed line to distinguish from average
                pointRadius: 0, // No points for straight line
                fill: false,
                order: 2,
                type: 'line',
                backgroundColor: 'rgba(239,68,68,0.1)',
                spanGaps: true,
                stepped: true
            };
        }
        
        // Calculate 3σ statistical bounds for modal chart (mirrors main chart)
        const modalStats = calculateWordWpmStatistics(app);
        let modalUpperBoundLine = null;
        let modalLowerBoundLine = null;
        
        if (modalStats.standardDeviation > 0 && labels.length >= SIGMA_STATS_CONFIG.MIN_SAMPLE_SIZE) {
            // 3σ Upper Bound Line for modal
            modalUpperBoundLine = {
                label: `3σ Upper Bound (${modalStats.upperBound.toFixed(1)})`,
                data: Array(labels.length).fill(modalStats.upperBound),
                borderColor: '#ff9800', // Orange color for bounds
                borderWidth: 2,
                borderDash: [6, 4], // Dashed line pattern
                pointRadius: 0,
                fill: false,
                order: 3,
                type: 'line',
                backgroundColor: 'rgba(255,152,0,0.1)',
                spanGaps: true,
                stepped: true
            };
            
            // 3σ Lower Bound Line for modal
            modalLowerBoundLine = {
                label: `3σ Lower Bound (${Math.max(0, modalStats.lowerBound).toFixed(1)})`,
                data: Array(labels.length).fill(Math.max(0, modalStats.lowerBound)), // Ensure non-negative
                borderColor: '#ff9800', // Orange color for bounds
                borderWidth: 2,
                borderDash: [6, 4], // Dashed line pattern
                pointRadius: 0,
                fill: false,
                order: 3,
                type: 'line',
                backgroundColor: 'rgba(255,152,0,0.1)',
                spanGaps: true,
                stepped: true
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
                        label: `Average WPM (${getCumulativeAverageWpm(data).toFixed(1)})`,
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
                    ...(bestWpmLine ? [bestWpmLine] : []),
                    // Conditional final WPM line with penalties
                    ...(finalWpmLine ? [finalWpmLine] : []),
                    // 3σ statistical bound lines for modal chart
                    ...(modalUpperBoundLine ? [modalUpperBoundLine] : []),
                    ...(modalLowerBoundLine ? [modalLowerBoundLine] : [])
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
        
        // Make modal chart globally accessible for testing
        window.wpmChartModal = wpmChartModal;
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
        trendTooltip: {
            visible: false,
            style: '',
            word: '',
            _chart: null
        },
        
        bestScore: null,
        previousBestScore: null,
        showPreviousBest: false,
        
        // Dictionary selection
        selectedDictionary: 'english-100',
        availableDictionaries: {},
        
        // Adaptive difficulty mode
        adaptiveDifficulty: 0,
        previousSlowWords: [],
        adaptiveWordIndices: new Set(),
        adaptiveWordCount: 0,

        // Ledger-based leaderboard (fastest/slowest from all-time data)
        ledgerLeaderboard: { fastest: [], slowest: [], totalWords: 0 },
        
        showChartModal: false,

        // Pace ghost cursor
        paceTargetWpm: 0,
        paceActiveTime: 0,
        paceBaseChars: 0,
        paceLastKeystroke: null,
        pacePaused: true,
        pacePauseTimer: null,
        paceAnimFrame: null,
        paceGhostCharIndex: 0,
        paceGhostWordIndex: 0,
        liveWpm: 0,
        paceAlignedSince: null,
        paceSparksActive: false,
        paceSparkParticles: [],
        paceSparkFrame: null,
        paceStreakTier: 0,
        paceLastTierNotified: 0,


        // Computed property for outlier statistics
        get outlierStats() {
            const stats = calculateWordWpmStatistics(this);
            
            // Group outliers by word and calculate statistics for each group
            const groupedFastest = groupOutliersByWord(stats.outliers.upper);
            const groupedSlowest = groupOutliersByWord(stats.outliers.lower);
            
            // Sort grouped fastest words from highest to lowest mean WPM (descending)
            const sortedFastest = groupedFastest.sort((a, b) => b.meanWpm - a.meanWpm);
            
            // Sort grouped slowest words from lowest to highest mean WPM (ascending)
            const sortedSlowest = groupedSlowest.sort((a, b) => a.meanWpm - b.meanWpm);
            
            // Get the ACTUAL bounds used for outlier detection (not safeguarded display bounds)
            const actualBounds = calculateOriginalStatisticalBounds(this);
            
            return {
                hasOutliers: stats.outliers.upper.length > 0 || stats.outliers.lower.length > 0,
                fastest: sortedFastest,
                slowest: sortedSlowest,
                statistics: {
                    mean: actualBounds.mean,
                    standardDeviation: actualBounds.standardDeviation,
                    // Use actual detection bounds for UI display consistency
                    upperBound: actualBounds.upperBound,
                    lowerBound: actualBounds.lowerBound
                }
            };
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
                
                // Load pace target setting
                const savedPaceTarget = await getFromIndexedDB('typing-pace-target');
                if (savedPaceTarget !== null) {
                    this.paceTargetWpm = parseInt(savedPaceTarget, 10) || 0;
                }

                // Load adaptive difficulty setting
                const savedAdaptiveDifficulty = await getFromIndexedDB('typing-adaptive-difficulty');
                if (savedAdaptiveDifficulty !== null) {
                    this.adaptiveDifficulty = parseInt(savedAdaptiveDifficulty, 10) || 0;
                }
            } catch (error) {
                console.warn('Failed to load settings:', error);
            }
            
            // Set dictionary from saved setting
            if (window.typingWordLists && window.typingWordLists[this.selectedDictionary]) {
                window.typingWordList = window.typingWordLists[this.selectedDictionary];
            }

            // Load word ledger for adaptive mode (works from first test of session)
            try {
                const ledger = await loadWordLedger(this.selectedDictionary);
                if (ledger && Object.keys(ledger).length > 0) {
                    this.computeSlowWordsFromLedger(ledger);
                }
            } catch (e) {
                console.warn('Failed to load word ledger:', e);
            }

            this.generateWords();
            this.$refs.input.focus();
            document.body.classList.toggle('light-mode', !this.isDarkMode);
            wpmChartData = [];
            window.typingAppInstance = this;
            setTimeout(() => updateWpmChart(this.isDarkMode), 100);
            await this.loadBestScore();
            
            // Add global Tab key listener for results/blind reveal screens
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Tab' && (this.started || this.showResults || this.showBlindReveal)) {
                    event.preventDefault();
                    this.restart();
                }
            });
            
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
        
        getBestScoreStorageKey() {
            const baseKey = `typing-best-wpm-${this.selectedDictionary}`;
            return this.blindModeSelected ? `${baseKey}-blind` : baseKey;
        },
        
        async loadBestScore() {
            try {
                const storageKey = this.getBestScoreStorageKey();
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
                const storageKey = this.getBestScoreStorageKey();
                await saveToIndexedDB(storageKey, newScore.toString());
                this.bestScore = newScore;
            } catch (error) {
                console.warn('Failed to save best score:', error);
            }
        },
        
        /**
         * Generates 50 words for the typing test, with optional adaptive difficulty.
         * Adaptive mode mixes in the worst-performing words from the persistent word ledger.
         * No minimum count gate — activates whenever slider > 0 and slow words exist.
         * Tracks which word indices are adaptive for visual marking.
         */
        generateWords() {
            this.words = [];
            this.adaptiveWordIndices = new Set();
            const list = window.typingWordList || (window.typingWordLists ? window.typingWordLists['english-100'] : []);

            if (this.adaptiveDifficulty > 0 && this.previousSlowWords && this.previousSlowWords.length > 0) {
                const adaptiveCount = Math.floor(50 * (this.adaptiveDifficulty / 100));
                const randomCount = 50 - adaptiveCount;

                // Build word list with adaptive markers
                const adaptiveWords = [];
                for (let i = 0; i < adaptiveCount; i++) {
                    const selected = this.selectWeightedSlowWord();
                    if (selected) {
                        adaptiveWords.push({ word: selected, isAdaptive: true });
                    } else {
                        adaptiveWords.push({ word: list[Math.floor(Math.random() * list.length)], isAdaptive: false });
                    }
                }

                const randomWords = [];
                for (let i = 0; i < randomCount; i++) {
                    randomWords.push({ word: list[Math.floor(Math.random() * list.length)], isAdaptive: false });
                }

                // Combine and shuffle
                const combined = this.shuffleArray([...adaptiveWords, ...randomWords]);
                combined.forEach((item, index) => {
                    this.words.push(item.word);
                    if (item.isAdaptive) this.adaptiveWordIndices.add(index);
                });

                this.adaptiveWordCount = adaptiveWords.filter(w => w.isAdaptive).length;
            } else {
                for (let i = 0; i < 50; i++) {
                    this.words.push(list[Math.floor(Math.random() * list.length)]);
                }
                this.adaptiveWordCount = 0;
            }
        },

        /**
         * Fisher-Yates shuffle algorithm for randomizing word order
         * @param {Array} array - Array to shuffle
         * @returns {Array} New shuffled array (original unchanged)
         */
        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        /**
         * Selects a word from previousSlowWords using weighted sampling.
         * Uses 1/effectiveWpm² weighting so the worst words appear most often.
         * @returns {string|null} Selected word, or null if no slow words
         */
        selectWeightedSlowWord() {
            if (!this.previousSlowWords || this.previousSlowWords.length === 0) {
                return null;
            }

            const weights = this.previousSlowWords.map(w => {
                const wpm = Math.max(w.effectiveWpm, 1);
                return 1 / (wpm * wpm);
            });

            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            const randomValue = Math.random() * totalWeight;

            let cumulative = 0;
            for (let i = 0; i < this.previousSlowWords.length; i++) {
                cumulative += weights[i];
                if (randomValue <= cumulative) {
                    return this.previousSlowWords[i].word;
                }
            }

            return this.previousSlowWords[this.previousSlowWords.length - 1].word;
        },

        /**
         * Stores the bottom 25% worst-performing words from current test for adaptive mode.
         * Uses effectiveWpm = rawWpm × accuracy to rank words, so errors penalize ranking.
         * No minimum count gate — always works when there are completed words.
         */
        /**
         * Merges current test word stats into the persistent word ledger (IndexedDB),
         * then recomputes previousSlowWords from the full ledger.
         * Each word keeps a sliding window of the last LEDGER_MAX_SAMPLES effective WPMs.
         * Scoped per dictionary.
         */
        async storeOutlierDataForNextTest() {
            if (!this.wordStats || this.wordStats.length === 0) {
                return;
            }

            // Build per-occurrence effective WPM from this test
            const perOccurrence = this.wordStats.map((stat, index) => {
                const word = stat.word;
                const rawWpm = stat.wpm;
                const charStates = this.wordCharStates[index] || {};
                const wordLen = word ? word.length : 1;
                let correctChars = 0;
                for (let c = 0; c < wordLen; c++) {
                    if (charStates[c] === true) correctChars++;
                }
                const accuracy = wordLen > 0 ? correctChars / wordLen : 1;
                return { word, effectiveWpm: rawWpm * accuracy };
            }).filter(w => w.word && typeof w.word === 'string' && w.word.length > 0);

            // Load existing ledger for current dictionary
            let ledger = {};
            try {
                ledger = await loadWordLedger(this.selectedDictionary) || {};
            } catch (e) { /* start fresh */ }

            // Merge new samples into ledger (sliding window)
            const now = Date.now();
            perOccurrence.forEach(({ word, effectiveWpm }) => {
                if (!ledger[word]) {
                    ledger[word] = { effectiveWpms: [], lastUpdated: now };
                }
                ledger[word].effectiveWpms.push({ wpm: effectiveWpm, ts: now });
                // Keep only last N samples
                if (ledger[word].effectiveWpms.length > LEDGER_MAX_SAMPLES) {
                    ledger[word].effectiveWpms = ledger[word].effectiveWpms.slice(-LEDGER_MAX_SAMPLES);
                }
                ledger[word].lastUpdated = now;
            });

            // Save updated ledger
            try {
                await saveWordLedger(this.selectedDictionary, ledger);
            } catch (e) {
                console.warn('Failed to save word ledger:', e);
            }

            // Recompute slow words from full ledger
            this.computeSlowWordsFromLedger(ledger);
        },

        /**
         * Computes previousSlowWords and ledgerLeaderboard from a ledger object.
         * Bottom 25% by mean effective WPM for adaptive, top/bottom 10 for leaderboard.
         */
        computeSlowWordsFromLedger(ledger) {
            const entries = Object.entries(ledger)
                .filter(([, v]) => v.effectiveWpms && v.effectiveWpms.length > 0)
                .map(([word, v]) => {
                    const raw = v.effectiveWpms;
                    const wpms = raw.map(ledgerWpm);
                    const mean = wpms.reduce((s, x) => s + x, 0) / wpms.length;
                    let sd = 0;
                    if (wpms.length > 1) {
                        const variance = wpms.reduce((s, x) => Math.pow(x - mean, 2), 0) / wpms.length;
                        sd = Math.sqrt(variance);
                    }
                    return { word, effectiveWpm: mean, occurrences: wpms.length, standardDeviation: sd };
                });

            // Sort ascending by effectiveWpm (slowest first)
            entries.sort((a, b) => a.effectiveWpm - b.effectiveWpm);

            // Adaptive: bottom 25%
            const bottomCount = Math.max(1, Math.ceil(entries.length * 0.25));
            this.previousSlowWords = entries.slice(0, bottomCount);

            // Leaderboard: slowest 10 and fastest 10
            const showCount = Math.min(10, entries.length);
            this.ledgerLeaderboard = {
                slowest: entries.slice(0, showCount),
                fastest: entries.slice(-showCount).reverse(),
                totalWords: entries.length
            };
        },

        /**
         * Returns true if the word at the given index is an adaptive (slow practice) word.
         */
        isAdaptiveWord(wordIndex) {
            return this.adaptiveWordIndices && this.adaptiveWordIndices.has(wordIndex);
        },

        /**
         * Saves the current adaptive difficulty setting to IndexedDB for persistence.
         * Called automatically when the difficulty slider changes.
         */
        async saveAdaptiveDifficulty() {
            try {
                await saveToIndexedDB('typing-adaptive-difficulty', this.adaptiveDifficulty.toString());
            } catch (error) {
                console.warn('Failed to save adaptive difficulty setting:', error);
            }
        },
        
        handleInput(event) {
            if (!this.started) {
                this.start();
            }
            
            const now = Date.now();
            // Use event.target.value for reliable access regardless of x-model timing
            const inputValue = event.target.value;
            
            // Start word timing on first keypress of the word
            if (inputValue.length === 1 && !this.wordFirstKeypressTime) {
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
            
            // Character-level accuracy tracks FIRST ATTEMPT at each position
            // Once a character position has been attempted, its state is locked in
            // This follows industry standard (Monkeytype/Keybr) behavior
            for (let charIndex = 0; charIndex < inputValue.length; charIndex++) {
                if (charIndex < currentWord.length) {
                    // Only record the state if this position hasn't been attempted yet
                    if (this.wordCharStates[this.currentWordIndex][charIndex] === undefined) {
                        const isCorrect = inputValue[charIndex] === currentWord[charIndex];
                        this.wordCharStates[this.currentWordIndex][charIndex] = isCorrect;
                        
                        // Play sound and add penalty only for incorrect characters
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
                }
            }

            this.updateActiveStats();
            this.updateLiveWpm();
            this.$nextTick(() => this.updateCursor());
        },
        
        handleKeydown(event) {
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent default tab behavior
                this.restart();
                return;
            }
            // Signal pace cursor: forward keys advance time, backspace just keeps it alive
            if (this.started && event.key.length === 1 && event.key !== ' ') {
                this.paceKeystroke(false);
            } else if (this.started && event.key === 'Backspace') {
                this.paceRebase();
            }
            if (event.key === ' ') {
                event.preventDefault();
                if (this.typedWord.length > 0) {  // Only check word if something was typed
                    this.paceKeystroke(false);
                    this.checkWord();
                }
            } else if (event.key === 'Backspace') {
                if (event.ctrlKey) {
                    // Ctrl+Backspace: browser deletes entire word, sync charIndex to 0
                    this.currentCharIndex = 0;
                } else if (this.currentCharIndex > 0) {
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
                // Update chart data using centralized calculation for consistency
                const avg = calculateConsistentAverage(this, false, 1);
                wpmChartData.push(avg);
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
            this.updateLiveWpm();
        },

        updateLiveWpm() {
            // Blend completed word averages with current word WPM
            const completedCount = this.wordStats.length;
            if (completedCount === 0) {
                this.liveWpm = this.currentWordWpm;
            } else {
                const completedAvg = this.wordStats.reduce((s, st) => s + st.wpm, 0) / completedCount;
                // Weight current word as 1 additional sample
                this.liveWpm = Math.round((completedAvg * completedCount + this.currentWordWpm) / (completedCount + 1));
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
            // UPDATED: Use centralized average calculation with penalties, rounded to 1 decimal place
            this.averageWpm = calculateConsistentAverage(this, true, 1);
            
            // Calculate character-level accuracy (industry standard)
            this.accuracy = this.calculateCharacterAccuracy();
        },
        
        calculateCharacterAccuracy() {
            let totalChars = 0;
            let correctChars = 0;
            
            // Include current word being typed
            const wordsToCheck = this.currentWordIndex + (this.typedWord.length > 0 ? 1 : 0);
            
            for (let wordIndex = 0; wordIndex < wordsToCheck; wordIndex++) {
                const word = this.words[wordIndex];
                if (!word) continue;
                
                if (wordIndex === this.currentWordIndex) {
                    // Current word being typed - only count typed characters
                    for (let charIndex = 0; charIndex < this.typedWord.length && charIndex < word.length; charIndex++) {
                        totalChars++;
                        const charState = this.wordCharStates[wordIndex]?.[charIndex];
                        if (charState === true) {
                            correctChars++;
                        }
                    }
                } else {
                    // Completed words - count all characters
                    for (let charIndex = 0; charIndex < word.length; charIndex++) {
                        totalChars++;
                        const charState = this.wordCharStates[wordIndex]?.[charIndex];
                        if (charState === true) {
                            correctChars++;
                        } else if (charState === undefined) {
                            // If no character state recorded, check if word was correct overall
                            // This handles edge cases for words completed before character tracking was fully implemented
                            if (!this.wordErrors[wordIndex]) {
                                correctChars++;
                            }
                        }
                    }
                }
            }
            
            if (totalChars === 0) {
                return 100; // No characters typed yet
            }
            
            return Math.round((correctChars / totalChars) * 100);
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
                        // No state stored - compare against stored typed word for accurate coloring
                        const typedWord = this.typedWords[wordIndex] || '';
                        if (charIndex < typedWord.length && typedWord[charIndex] === this.words[wordIndex][charIndex]) {
                            classes.push('correct');
                        } else if (!this.wordErrors[wordIndex]) {
                            classes.push('correct');
                        } else {
                            classes.push('incorrect');
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
            this.startPaceCursor();
        },
        
        async finish() {
            // Clear the WPM timer
            if (this.wpmUpdateTimer) {
                clearInterval(this.wpmUpdateTimer);
                this.wpmUpdateTimer = null;
            }
            
            this.stopPaceCursor();

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
            // Use consistent calculation for finalWpm to match outlier statistics
            this.finalWpm = calculateConsistentAverage(this, this.errorPenalties > 0, 1);
            this.finalAccuracy = this.accuracy;
            
            // Store outlier data for next test (adaptive mode)
            await this.storeOutlierDataForNextTest();
            
            // Update chart one final time to ensure label consistency
            setTimeout(() => updateWpmChart(this.isDarkMode), 100);
            
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
            // Use consistent calculation for finalWpm to match outlier statistics
            this.finalWpm = calculateConsistentAverage(this, this.errorPenalties > 0, 1);
            this.finalAccuracy = this.accuracy;
            
            // Store outlier data for next test (adaptive mode)
            await this.storeOutlierDataForNextTest();
            
            // Update chart one final time to ensure label consistency
            setTimeout(() => updateWpmChart(this.isDarkMode), 100);
            
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
            
            // Ensure previousSlowWords is always an array
            if (!this.previousSlowWords) {
                this.previousSlowWords = [];
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
            this.liveWpm = 0;
            this.stopPaceCursor();
            
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
            
            // Load the correct best score for the current mode
            await this.loadBestScore();
            
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

        /**
         * Shows a sparkline trend chart for a word when hovering over leaderboard items.
         * Reads timestamped history from the word ledger in IndexedDB.
         */
        async showWordTrend(event, word) {
            const tt = this.trendTooltip;
            // Position near mouse, prefer above-right
            const x = event.clientX;
            const y = event.clientY;
            const chartW = 220, chartH = 100, pad = 12;
            const left = Math.min(x + pad, window.innerWidth - chartW - pad);
            const top = y - chartH - pad < 0 ? y + pad : y - chartH - pad;
            tt.style = `left:${left}px;top:${top}px;`;
            tt.word = word;
            tt.visible = true;

            // Load ledger data for this word
            let samples = [];
            try {
                const ledger = await loadWordLedger(this.selectedDictionary) || {};
                const entry = ledger[word];
                if (entry && entry.effectiveWpms) {
                    samples = entry.effectiveWpms.map(e => ({
                        wpm: ledgerWpm(e),
                        ts: typeof e === 'object' && e.ts ? e.ts : null
                    }));
                }
            } catch (_) { /* ignore */ }

            if (samples.length === 0 || !tt.visible || tt.word !== word) return;

            // Render sparkline after DOM update
            this.$nextTick(() => {
                const canvas = this.$refs.trendCanvas;
                if (!canvas || typeof Chart === 'undefined') return;

                if (tt._chart) { tt._chart.destroy(); tt._chart = null; }

                const labels = samples.map((s, i) => {
                    if (s.ts) {
                        const d = new Date(s.ts);
                        return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    }
                    return `#${i+1}`;
                });
                const data = samples.map(s => Math.round(s.wpm));
                const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e2b714';

                tt._chart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            data,
                            borderColor: accent,
                            backgroundColor: accent + '22',
                            borderWidth: 2,
                            pointRadius: samples.length <= 10 ? 3 : 1,
                            pointBackgroundColor: accent,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: false,
                        animation: false,
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        scales: {
                            x: { display: false },
                            y: {
                                display: true,
                                ticks: { font: { size: 9 }, color: '#888', maxTicksLimit: 3 },
                                grid: { color: 'rgba(128,128,128,0.15)' },
                                title: { display: false }
                            }
                        }
                    }
                });
            });
        },

        hideWordTrend() {
            const tt = this.trendTooltip;
            tt.visible = false;
            if (tt._chart) { tt._chart.destroy(); tt._chart = null; }
        },

        async resetBestScore() {
            try {
                const storageKey = this.getBestScoreStorageKey();
                await removeFromIndexedDB(storageKey);
                this.bestScore = null;
            } catch (error) {
                console.warn('Failed to reset best score:', error);
            }
        },
        async changeDictionary(event) {
            this.selectedDictionary = event.target.value;
            
            // Load ledger for the new dictionary (or clear if none)
            try {
                const ledger = await loadWordLedger(this.selectedDictionary);
                if (ledger && Object.keys(ledger).length > 0) {
                    this.computeSlowWordsFromLedger(ledger);
                } else {
                    this.previousSlowWords = [];
                }
            } catch (e) {
                this.previousSlowWords = [];
            }

            // Save selected dictionary to IndexedDB
            try {
                await saveToIndexedDB('typing-selected-dictionary', this.selectedDictionary);
            } catch (error) {
                console.warn('Failed to save dictionary setting:', error);
            }

            if (window.typingWordLists && window.typingWordLists[this.selectedDictionary]) {
                window.typingWordList = window.typingWordLists[this.selectedDictionary];
                await this.loadBestScore();
                this.restart();
            }
        },
        startPaceCursor() {
            if (this.paceTargetWpm <= 0) return;
            this.paceActiveTime = 0;
            this.paceBaseChars = 0;
            this.paceLastKeystroke = null;
            this.pacePaused = true;
            this.paceGhostCharIndex = 0;
            this.paceGhostWordIndex = 0;
            this.tickPaceCursor();
        },

        stopPaceCursor() {
            if (this.paceAnimFrame) {
                cancelAnimationFrame(this.paceAnimFrame);
                this.paceAnimFrame = null;
            }
            if (this.pacePauseTimer) {
                clearTimeout(this.pacePauseTimer);
                this.pacePauseTimer = null;
            }
            this.paceLastKeystroke = null;
            this.pacePaused = true;
            this.paceAlignedSince = null;
            this.paceStreakTier = 0;
            this.paceLastTierNotified = 0;
            if (this.paceSparksActive) {
                this.paceSparksActive = false;
                this.stopPaceSparks();
            }
            const ghost = document.getElementById('pace-ghost');
            if (ghost) ghost.remove();
        },

        paceKeystroke(pauseOnly) {
            if (this.paceTargetWpm <= 0) return;
            const now = Date.now();

            if (!pauseOnly) {
                // Resuming after pause — reset ghost to user's current position
                if (this.pacePaused) {
                    let userChars = 0;
                    for (let w = 0; w < this.currentWordIndex; w++) {
                        userChars += this.words[w].length + 1;
                    }
                    userChars += this.typedWord.length;
                    this.paceBaseChars = userChars;
                    this.paceActiveTime = 0;
                } else if (this.paceLastKeystroke) {
                    this.paceActiveTime += now - this.paceLastKeystroke;
                }
                this.paceLastKeystroke = now;
                this.pacePaused = false;
            }

            // Auto-pause after 1.5s of no input
            if (this.pacePauseTimer) clearTimeout(this.pacePauseTimer);
            this.pacePauseTimer = setTimeout(() => {
                if (this.paceLastKeystroke) {
                    this.paceActiveTime += Date.now() - this.paceLastKeystroke;
                }
                this.pacePaused = true;
                this.paceLastKeystroke = null;
            }, 600);
        },

        paceRebase() {
            if (this.paceTargetWpm <= 0) return;
            // Snap ghost to user's current position after backspace
            this.$nextTick(() => {
                let userChars = 0;
                for (let w = 0; w < this.currentWordIndex; w++) {
                    userChars += this.words[w].length + 1;
                }
                userChars += this.typedWord.length;
                this.paceBaseChars = userChars;
                this.paceActiveTime = 0;
                this.paceLastKeystroke = Date.now();
                this.pacePaused = false;

                // Refresh pause timer
                if (this.pacePauseTimer) clearTimeout(this.pacePauseTimer);
                this.pacePauseTimer = setTimeout(() => {
                    if (this.paceLastKeystroke) {
                        this.paceActiveTime += Date.now() - this.paceLastKeystroke;
                    }
                    this.pacePaused = true;
                    this.paceLastKeystroke = null;
                }, 600);
            });
        },

        tickPaceCursor() {
            if (!this.started || this.showResults || this.paceTargetWpm <= 0) {
                this.stopPaceCursor();
                return;
            }

            // Compute total active milliseconds including current live segment
            let totalMs = this.paceActiveTime;
            if (!this.pacePaused && this.paceLastKeystroke) {
                totalMs += Date.now() - this.paceLastKeystroke;
            }

            const elapsed = totalMs / 1000 / 60; // minutes
            const targetChars = this.paceBaseChars + this.paceTargetWpm * 5 * elapsed;

            // Walk through words to find ghost position
            let charsSoFar = 0;
            let ghostWord = 0;
            let ghostChar = 0;
            for (let w = 0; w < this.words.length; w++) {
                const wordLen = this.words[w].length + 1; // +1 for space
                if (charsSoFar + wordLen > targetChars) {
                    ghostWord = w;
                    ghostChar = Math.floor(targetChars - charsSoFar);
                    break;
                }
                charsSoFar += wordLen;
                if (w === this.words.length - 1) {
                    ghostWord = w;
                    ghostChar = this.words[w].length;
                }
            }

            this.paceGhostWordIndex = ghostWord;
            this.paceGhostCharIndex = ghostChar;
            this.updatePaceGhost();

            this.paceAnimFrame = requestAnimationFrame(() => this.tickPaceCursor());
        },

        updatePaceGhost() {
            const wordEls = document.querySelectorAll('.text-display .word');
            if (!wordEls[this.paceGhostWordIndex]) return;

            const wordEl = wordEls[this.paceGhostWordIndex];
            const chars = wordEl.querySelectorAll('.char');
            const container = document.querySelector('.text-display');
            if (!container) return;

            let ghost = document.getElementById('pace-ghost');
            if (!ghost) {
                ghost = document.createElement('span');
                ghost.id = 'pace-ghost';
                ghost.className = 'pace-ghost';
                container.appendChild(ghost);
            }

            const containerRect = container.getBoundingClientRect();
            let left, top;

            if (this.paceGhostCharIndex < chars.length) {
                const charEl = chars[this.paceGhostCharIndex];
                const rect = charEl.getBoundingClientRect();
                left = rect.left - containerRect.left;
                top = rect.top - containerRect.top;
            } else {
                const lastChar = chars[chars.length - 1] || wordEl;
                const rect = lastChar.getBoundingClientRect();
                left = rect.right - containerRect.left;
                top = rect.top - containerRect.top;
            }

            ghost.style.left = left + 'px';
            ghost.style.top = top + 'px';

            // Color based on user position vs ghost: green=ahead, amber=on pace, red=behind
            // Count total chars the user has typed (completed words + current word)
            let userChars = 0;
            for (let w = 0; w < this.currentWordIndex; w++) {
                userChars += this.words[w].length + 1; // +1 for space
            }
            userChars += this.typedWord.length;

            let ghostChars = 0;
            for (let w = 0; w < this.paceGhostWordIndex; w++) {
                ghostChars += this.words[w].length + 1;
            }
            ghostChars += this.paceGhostCharIndex;

            // Threshold colors: green (ahead) → blue (on pace) → red (behind)
            const diff = userChars - ghostChars;
            const aligned = Math.abs(diff) < 1.5;
            let color;

            if (aligned) {
                color = '#42a5f5';
                ghost.style.color = color;
                ghost.classList.add('pace-aligned');

                // Track sustained alignment for sparks + streak tiers
                if (!this.paceAlignedSince) {
                    this.paceAlignedSince = Date.now();
                }
                const alignedMs = Date.now() - this.paceAlignedSince;

                // Streak tiers: 2s=1(sparks), 4s=2x, 8s=3x, 15s=4x
                let newTier = 0;
                if (alignedMs >= 15000) newTier = 4;
                else if (alignedMs >= 8000) newTier = 3;
                else if (alignedMs >= 4000) newTier = 2;
                else if (alignedMs >= 2000) newTier = 1;

                if (newTier >= 1 && !this.paceSparksActive) {
                    this.paceSparksActive = true;
                    ghost.classList.add('pace-sparks');
                    this.startPaceSparks();
                }
                // Notify on tier change
                if (newTier > this.paceStreakTier && newTier >= 2 && newTier > this.paceLastTierNotified) {
                    this.paceLastTierNotified = newTier;
                    this.showStreakNotification(newTier);
                }
                this.paceStreakTier = newTier;
            } else {
                ghost.classList.remove('pace-aligned', 'pace-sparks');
                this.paceAlignedSince = null;
                this.paceStreakTier = 0;
                this.paceLastTierNotified = 0;
                if (this.paceSparksActive) {
                    this.paceSparksActive = false;
                    this.stopPaceSparks();
                }

                if (diff > 1) {
                    color = '#4ca754';
                } else if (diff < -1) {
                    color = '#e53935';
                } else {
                    color = '#42a5f5';
                }
            }

            ghost.style.background = color;
            ghost.style.boxShadow = aligned ? `0 0 12px ${color}, 0 0 24px ${color}, 0 0 4px #fff` : `0 0 8px ${color}`;

            // Feed spark positions
            if (this.paceSparksActive) {
                const ghostRect = ghost.getBoundingClientRect();
                this.emitPaceSparks(ghostRect.left + ghostRect.width / 2, ghostRect.top + ghostRect.height / 2);
            }
        },

        startPaceSparks() {
            const canvas = document.getElementById('pace-spark-canvas');
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            canvas.style.display = 'block';
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.paceSparkParticles = [];

            const animate = () => {
                if (!this.paceSparksActive) return;
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                this.paceSparkParticles = this.paceSparkParticles.filter(p => p.life > 0);
                this.paceSparkParticles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.15; // gravity
                    p.life -= 1;
                    const alpha = p.life / p.maxLife;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${alpha})`;
                    ctx.fill();
                });
                this.paceSparkFrame = requestAnimationFrame(animate);
            };
            this.paceSparkFrame = requestAnimationFrame(animate);
        },

        stopPaceSparks() {
            if (this.paceSparkFrame) {
                cancelAnimationFrame(this.paceSparkFrame);
                this.paceSparkFrame = null;
            }
            const canvas = document.getElementById('pace-spark-canvas');
            if (canvas) {
                canvas.style.display = 'none';
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            this.paceSparkParticles = [];
        },

        emitPaceSparks(x, y) {
            const tier = this.paceStreakTier;
            // More particles and bigger as tier increases
            const count = 1 + tier + Math.floor(Math.random() * (1 + tier));
            const baseSpeed = 1.5 + tier * 0.5;
            const baseSize = 2 + tier * 0.5;
            const baseLife = 20 + tier * 5;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = baseSpeed + Math.random() * 3;
                const maxLife = baseLife + Math.floor(Math.random() * 20);

                // Hue by tier: 1=cyan(190-230), 2=green(100-150), 3=gold(35-55), 4=rainbow
                let hue;
                if (tier >= 4) {
                    hue = Math.random() * 360;
                } else if (tier === 3) {
                    hue = 35 + Math.random() * 20;
                } else if (tier === 2) {
                    hue = 100 + Math.random() * 50;
                } else {
                    hue = 190 + Math.random() * 40;
                }

                this.paceSparkParticles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2,
                    r: baseSize + Math.random() * 2,
                    hue,
                    life: maxLife,
                    maxLife
                });
            }
        },

        showStreakNotification(tier) {
            const labels = { 2: '2x', 3: '3x', 4: '4x' };
            const colors = { 2: '#4ca754', 3: '#e2b714', 4: '#e53935' };
            const text = labels[tier] || '';
            if (!text) return;

            const el = document.createElement('div');
            el.className = 'streak-notification';
            el.textContent = text;
            el.style.color = colors[tier];
            el.style.textShadow = `0 0 12px ${colors[tier]}`;
            document.body.appendChild(el);

            // Remove after animation
            setTimeout(() => el.remove(), 1000);
        },

        async savePaceTarget() {
            try {
                await saveToIndexedDB('typing-pace-target', this.paceTargetWpm.toString());
            } catch (e) { /* ignore */ }
        },

        showChartModalHandler,
        hideChartModalHandler,
        
        // Calculate the unpenalized average WPM for display in results
        // This shows the raw average without error penalties
        // UPDATED: Use centralized average calculation without penalties, to 1 decimal place
        getUnpenalizedAverageWpm() {
            return calculateConsistentAverage(this, false, 1);
        },
        
        // Export functionality
        exportResults(format) {
            try {
                // Validate input
                if (!format || (format !== 'csv' && format !== 'json')) {
                    console.error('Invalid export format:', format);
                    return;
                }
                
                const timestamp = new Date().toISOString();
                const data = this.prepareExportData(timestamp);
                
                if (format === 'csv') {
                    this.downloadCSV(data, timestamp);
                } else if (format === 'json') {
                    this.downloadJSON(data, timestamp);
                }
            } catch (error) {
                console.error('Export failed:', error);
                // Could show user-friendly error message in the future
            }
        },

        prepareExportData(timestamp) {
            return {
                metadata: {
                    exportDate: timestamp,
                    testDate: timestamp,
                    dictionary: this.selectedDictionary,
                    blindMode: this.blindModeSelected,
                    totalWords: this.words.length
                },
                summary: {
                    finalWpm: this.finalWpm,
                    finalAccuracy: this.finalAccuracy,
                    errorPenalties: this.errorPenalties,
                    bestScore: this.bestScore,
                    averageWpm: this.getUnpenalizedAverageWpm()
                },
                rawData: {
                    originalWords: this.words,
                    typedWords: this.typedWords,
                    wordCharStates: this.wordCharStates,
                    wordErrors: this.wordErrors,
                    wpmChartData: [...wpmChartData],
                    currentWordIndex: this.currentWordIndex
                },
                wordStats: this.wordStats.map((stat, index) => ({
                    wordNumber: index + 1,
                    word: stat.word,
                    wpm: stat.wpm,
                    correct: stat.correct,
                    timeMinutes: stat.time
                })),
                outliers: {
                    fastest: this.outlierStats.fastest,
                    slowest: this.outlierStats.slowest,
                    statistics: this.outlierStats.statistics
                }
            };
        },

        generateExportFilename(timestamp, extension) {
            const dateString = timestamp.slice(0, 19).replace(/:/g, '-');
            return `typing-test-${dateString}.${extension}`;
        },

        downloadCSV(data, timestamp) {
            // CSV Headers and rows for word-by-word data
            const csvHeaders = 'Word Number,Word,WPM,Correct,Time (minutes)\n';
            const csvRows = data.wordStats.map(stat => 
                `${stat.wordNumber},"${stat.word}",${stat.wpm},${stat.correct},${stat.timeMinutes}`
            ).join('\n');
            
            // Summary section
            const summarySection = `\n\nSUMMARY\nFinal WPM,${data.summary.finalWpm}\nFinal Accuracy,${data.summary.finalAccuracy}%\nError Penalties,${data.summary.errorPenalties}\nBest Score,${data.summary.bestScore || 'N/A'}\nDictionary,${data.metadata.dictionary}\nBlind Mode,${data.metadata.blindMode}\n`;
            
            const csvContent = csvHeaders + csvRows + summarySection;
            const filename = this.generateExportFilename(timestamp, 'csv');
            
            this.downloadFile(csvContent, filename, 'text/csv');
        },

        downloadJSON(data, timestamp) {
            const jsonContent = JSON.stringify(data, null, 2);
            const filename = this.generateExportFilename(timestamp, 'json');
            
            this.downloadFile(jsonContent, filename, 'application/json');
        },

        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };
}