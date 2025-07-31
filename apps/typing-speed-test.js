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
    
    // Expose IndexedDB functions to window for testing
    window.saveToIndexedDB = saveToIndexedDB;
    window.getFromIndexedDB = getFromIndexedDB;
    window.removeFromIndexedDB = removeFromIndexedDB;
    
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
        
        bestScore: null,
        previousBestScore: null,
        showPreviousBest: false,
        
        // Dictionary selection
        selectedDictionary: 'english-100',
        availableDictionaries: {},
        
        // Adaptive difficulty mode
        adaptiveDifficulty: 0,
        previousSlowOutliers: [],
        
        showChartModal: false,
        
        
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
         * Generates 50 words for the typing test, with optional adaptive difficulty
         * that increases the probability of including slow words from previous test.
         * 
         * Adaptive mode requirements:
         * - adaptiveDifficulty > 0 (0-50%)
         * - At least 3 valid slow outliers from previous test
         * 
         * Algorithm:
         * - Calculate outlier count based on difficulty percentage
         * - Fill with outlier words (with wraparound if needed)
         * - Fill remaining slots with random words
         * - Shuffle to avoid predictable patterns
         */
        generateWords() {
            // Load from selected dictionary
            this.words = [];
            const list = window.typingWordList || (window.typingWordLists ? window.typingWordLists['english-100'] : []);
            
            // Check if adaptive mode should be active
            if (this.adaptiveDifficulty > 0 && this.previousSlowOutliers && this.previousSlowOutliers.length >= 3) {
                const outlierCount = Math.floor(50 * (this.adaptiveDifficulty / 100));
                const randomCount = 50 - outlierCount;
                
                // Add outlier words using weighted sampling (slower words get higher probability)
                for (let i = 0; i < outlierCount; i++) {
                    const selectedWord = this.selectWeightedOutlierWord();
                    if (selectedWord && typeof selectedWord === 'string' && selectedWord.length > 0) {
                        this.words.push(selectedWord);
                    } else {
                        // Fallback to random word if outlier selection fails
                        this.words.push(list[Math.floor(Math.random() * list.length)]);
                    }
                }
                
                // Fill remaining with random words
                for (let i = 0; i < randomCount; i++) {
                    this.words.push(list[Math.floor(Math.random() * list.length)]);
                }
                
                // Shuffle to avoid predictable patterns
                this.words = this.shuffleArray(this.words);
            } else {
                // Current behavior (random selection)
                for (let i = 0; i < 50; i++) {
                    this.words.push(list[Math.floor(Math.random() * list.length)]);
                }
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
         * Selects a word from previousSlowOutliers using weighted sampling.
         * Slower words (lower WPM) get exponentially higher probability of selection.
         * 
         * Weight calculation: weight = 1 / (wpm^2)
         * This gives much higher weight to very slow words.
         * 
         * @returns {string|null} Selected outlier word, or null if no valid outliers
         */
        selectWeightedOutlierWord() {
            if (!this.previousSlowOutliers || this.previousSlowOutliers.length === 0) {
                return null;
            }

            // Calculate weights for each outlier (inverse square of WPM)
            const weights = this.previousSlowOutliers.map(outlier => {
                const wpm = Math.max(outlier.wpm, 1); // Prevent division by zero
                return 1 / (wpm * wpm); // Exponential weighting - slower words get much higher weight
            });

            // Calculate total weight
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            
            // Select random point in weight distribution
            const randomValue = Math.random() * totalWeight;
            
            // Find which outlier corresponds to this random point
            let cumulativeWeight = 0;
            for (let i = 0; i < this.previousSlowOutliers.length; i++) {
                cumulativeWeight += weights[i];
                if (randomValue <= cumulativeWeight) {
                    return this.previousSlowOutliers[i].word;
                }
            }
            
            // Fallback to last outlier (shouldn't happen with proper math)
            return this.previousSlowOutliers[this.previousSlowOutliers.length - 1].word;
        },

        /**
         * Stores validated slow outlier data from current test for use in next test.
         * Filters out any invalid entries to prevent runtime errors.
         * Called automatically when test completes.
         */
        storeOutlierDataForNextTest() {
            // Store slow outliers for adaptive mode in next test
            if (this.outlierStats && this.outlierStats.hasOutliers && this.outlierStats.slowest && this.outlierStats.slowest.length > 0) {
                // Filter out any undefined or invalid outlier entries
                this.previousSlowOutliers = this.outlierStats.slowest.filter(outlier => 
                    outlier && 
                    outlier.word && 
                    typeof outlier.word === 'string' && 
                    outlier.word.length > 0 &&
                    typeof outlier.wpm === 'number' && 
                    !isNaN(outlier.wpm)
                );
            } else {
                this.previousSlowOutliers = [];
            }
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
            
            // Character-level accuracy tracks FIRST ATTEMPT at each position
            // Once a character position has been attempted, its state is locked in
            // This follows industry standard (Monkeytype/Keybr) behavior
            for (let charIndex = 0; charIndex < this.typedWord.length; charIndex++) {
                if (charIndex < currentWord.length) {
                    // Only record the state if this position hasn't been attempted yet
                    if (this.wordCharStates[this.currentWordIndex][charIndex] === undefined) {
                        const isCorrect = this.typedWord[charIndex] === currentWord[charIndex];
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
            this.$nextTick(() => this.updateCursor());
        },
        
        handleKeydown(event) {
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent default tab behavior
                this.restart();
                return;
            } else if (event.key === ' ') {
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
            // Use consistent calculation for finalWpm to match outlier statistics
            this.finalWpm = calculateConsistentAverage(this, this.errorPenalties > 0, 1);
            this.finalAccuracy = this.accuracy;
            
            // Store outlier data for next test (adaptive mode)
            this.storeOutlierDataForNextTest();
            
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
            this.storeOutlierDataForNextTest();
            
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
            
            // Ensure previousSlowOutliers is always an array
            if (!this.previousSlowOutliers) {
                this.previousSlowOutliers = [];
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
            
            // Clear previous outliers when changing dictionary
            this.previousSlowOutliers = [];
            
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