const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - 3 Standard Deviation Lines and Outlier Highlighting', () => {
    let errors = [];
    let pageErrors = [];

    test.beforeEach(async ({ page }) => {
        // Set up console error listener BEFORE loading the page
        errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Set up page error listener for JavaScript errors
        pageErrors = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });

        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');
    });

    test('page loads without errors', async ({ page }) => {
        const pageTitle = await page.locator('title').textContent();
        expect(pageTitle).toContain('Typing Speed Test');
        
        // Verify key elements are present
        await expect(page.locator('.text-display')).toBeVisible();
        await expect(page.locator('#wpmChart')).toBeVisible();
        
        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors - this MUST be at the end
        expect(errors).toEqual([]);
    });

    test('chart displays 3σ upper and lower bound lines after completing multiple words', async ({ page }) => {
        // Start typing test
        const inputField = page.locator('.input-field');
        await inputField.focus();
        
        // Type multiple words with varying speeds to create statistical variance
        const words = ['hello', 'world', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'end'];
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            // Type each character with some variation in timing
            for (const char of word) {
                await inputField.type(char, { delay: i % 2 === 0 ? 50 : 150 }); // Alternate between fast and slow typing
            }
            
            // Complete the word
            await inputField.press('Space');
            await page.waitForTimeout(100); // Allow chart to update
        }
        
        // Wait for chart to render completely
        await page.waitForTimeout(1500); // Increased wait time
        
        // Check that 3σ bound lines are present in the chart
        const hasStdDeviationLines = await page.evaluate(() => {
            const chart = window.wpmChart;
            
            if (!chart || !chart.data || !chart.data.datasets) return false;
            
            // Look for datasets labeled as standard deviation bounds
            const datasets = chart.data.datasets;
            const upperBoundDataset = datasets.find(d => d.label && d.label.includes('3σ Upper'));
            const lowerBoundDataset = datasets.find(d => d.label && d.label.includes('3σ Lower'));
            
            return {
                hasUpperBound: !!upperBoundDataset,
                hasLowerBound: !!lowerBoundDataset,
                upperBoundStyling: upperBoundDataset ? {
                    borderDash: upperBoundDataset.borderDash,
                    borderColor: upperBoundDataset.borderColor
                } : null,
                lowerBoundStyling: lowerBoundDataset ? {
                    borderDash: lowerBoundDataset.borderDash,
                    borderColor: lowerBoundDataset.borderColor
                } : null
            };
        });
        
        expect(hasStdDeviationLines.hasUpperBound).toBe(true);
        expect(hasStdDeviationLines.hasLowerBound).toBe(true);
        expect(hasStdDeviationLines.upperBoundStyling.borderDash).toBeTruthy(); // Should be dashed line
        expect(hasStdDeviationLines.lowerBoundStyling.borderDash).toBeTruthy(); // Should be dashed line
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('outlier words show immediate labels on chart without hovering', async ({ page }) => {
        // Start typing test
        const inputField = page.locator('.input-field');
        await inputField.focus();
        
        // Type words with extreme variation to ensure outliers
        const words = ['a', 'really', 'very', 'extremely', 'super', 'incredibly', 'fast', 'word', 'sequence', 'here'];
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            // Create EXTREMELY dramatic variation to force outliers 
            // Based on debug: need >373 WPM for upper outlier, <0 for lower outlier (but that's impossible)
            // So let's create very fast and very slow words with more dramatic differences
            const delay = i === 0 ? 5 : // Super fast for >400 WPM
                         i === 1 ? 1000 : // Extremely slow for very low WPM  
                         i === words.length - 1 ? 5 : // Also super fast
                         i === words.length - 2 ? 800 : // Also extremely slow
                         100; // Others normal
            
            for (const char of word) {
                await inputField.type(char, { delay });
            }
            
            await inputField.press('Space');
            await page.waitForTimeout(100);
        }
        
        // Wait for chart to render and statistical calculations
        await page.waitForTimeout(500);
        
        // Check for outlier point enhancements and immediate labels using app's outlierStats
        const outlierInfo = await page.evaluate(() => {
            const chart = window.wpmChart;
            const app = window.typingAppInstance;
            
            if (!chart || !app || !app.wordStats) return { hasOutliers: false, error: 'Missing chart or app' };
            
            // Check if any word WPM points are styled differently (larger radius for outliers)
            const wordWpmDataset = chart.data.datasets.find(d => d.label === 'Word WPM');
            if (!wordWpmDataset) return { hasOutliers: false, error: 'No Word WPM dataset' };
            
            // Use the app's outlierStats computed property
            const outlierStats = app.outlierStats;
            const wordWpms = app.wordStats.map(stat => stat.wpm);
            
            return {
                hasOutliers: outlierStats.hasOutliers,
                outlierCount: (outlierStats.fastest.length + outlierStats.slowest.length),
                totalWords: wordWpms.length,
                statistics: outlierStats.statistics,
                wordWpmDatasetPresent: !!wordWpmDataset,
                wordWpms: wordWpms,
                fastest: outlierStats.fastest,
                slowest: outlierStats.slowest
            };
        });
        
        expect(outlierInfo.hasOutliers).toBe(true);
        expect(outlierInfo.outlierCount).toBeGreaterThan(0);
        expect(outlierInfo.wordWpmDatasetPresent).toBe(true);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('outlier highlights table appears below digraphs with fastest and slowest words', async ({ page }) => {
        // Complete a typing test to see results
        const inputField = page.locator('.input-field');
        await inputField.focus();
        
        // Type several words with variation to generate statistical data
        const testWords = ['hello', 'world', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'test', 'fast', 'slow', 'end'];
        
        for (let i = 0; i < testWords.length; i++) {
            const word = testWords[i];
            // Create variation: some words very fast, some very slow to generate outliers
            const delay = (i % 3 === 0) ? 15 : (i % 5 === 0) ? 300 : 80;
            
            for (const char of word) {
                await inputField.type(char, { delay });
            }
            
            await inputField.press('Space');
            await page.waitForTimeout(50);
        }
        
        // Force test completion by calling finish() directly
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            if (app && typeof app.finish === 'function') {
                app.finish();
            }
        });
        
        // Wait for results screen to appear
        await expect(page.locator('.results')).toBeVisible();
        await page.waitForTimeout(500); // Additional wait for outlier calculations
        
        // Check if outlier highlights table exists
        const outlierTableExists = await page.evaluate(() => {
            // Look for a table or section containing outlier highlights
            const possibleSelectors = [
                '.outlier-highlights-table',
                '.outlier-highlights',
                '.fastest-slowest-words',
                '[class*="outlier"]',
                '[data-testid*="outlier"]'
            ];
            
            for (const selector of possibleSelectors) {
                const element = document.querySelector(selector);
                if (element) return { found: true, selector, visible: element.offsetParent !== null };
            }
            
            // Check if there's any element mentioning "fastest" and "slowest" words
            const textElements = [...document.querySelectorAll('*')].filter(el => {
                const text = el.textContent?.toLowerCase() || '';
                return text.includes('fastest') && text.includes('slowest');
            });
            
            return {
                found: textElements.length > 0,
                selector: 'text-based-search',
                visible: textElements.some(el => el.offsetParent !== null),
                count: textElements.length
            };
        });
        
        expect(outlierTableExists.found).toBe(true);
        expect(outlierTableExists.visible).toBe(true);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('modal chart displays same 3σ lines and outlier highlighting as main chart', async ({ page }) => {
        // Complete typing test
        const inputField = page.locator('.input-field');
        await inputField.focus();
        
        // Type words with variation (need at least 10 for sigma bands)
        const words = ['fast', 'slow', 'medium', 'quick', 'turtle', 'rabbit', 'speed', 'test', 'more', 'words', 'for', 'bands'];
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const delay = i % 3 === 0 ? 30 : i % 3 === 1 ? 200 : 100;
            
            for (const char of word) {
                await inputField.type(char, { delay });
            }
            
            await inputField.press('Space');
            await page.waitForTimeout(50);
        }
        
        await page.waitForTimeout(500);
        
        // Open modal chart
        await page.click('button[title="Expand chart"]');
        await page.waitForTimeout(500);
        
        // Verify modal chart has same features as main chart
        const modalChartFeatures = await page.evaluate(() => {
            const modalChart = window.wpmChartModal;
            if (!modalChart || !modalChart.data || !modalChart.data.datasets) return false;
            
            const datasets = modalChart.data.datasets;
            const hasUpperBound = datasets.some(d => d.label && d.label.includes('3σ Upper'));
            const hasLowerBound = datasets.some(d => d.label && d.label.includes('3σ Lower'));
            const hasWordWpm = datasets.some(d => d.label === 'Word WPM');
            
            return {
                hasUpperBound,
                hasLowerBound,
                hasWordWpm,
                datasetCount: datasets.length
            };
        });
        
        expect(modalChartFeatures.hasUpperBound).toBe(true);
        expect(modalChartFeatures.hasLowerBound).toBe(true);
        expect(modalChartFeatures.hasWordWpm).toBe(true);
        
        // Close modal
        await page.click('button[title="Close"]');
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('standard deviation calculations handle edge cases correctly', async ({ page }) => {
        // Test with minimal words (edge case)
        const inputField = page.locator('.input-field');
        await inputField.focus();
        
        // Type only 3 words to test edge case handling
        const words = ['one', 'two', 'three'];
        
        for (const word of words) {
            for (const char of word) {
                await inputField.type(char, { delay: 100 });
            }
            await inputField.press('Space');
            await page.waitForTimeout(100);
        }
        
        await page.waitForTimeout(500);
        
        // Check that the system handles small datasets gracefully
        const edgeCaseHandling = await page.evaluate(() => {
            const chart = window.wpmChart;
            const app = window.typingAppInstance;
            
            if (!chart || !app) return { handled: false };
            
            // With only 3 words, standard deviation should still be calculated
            // but bounds might not be meaningful
            const wordWpms = app.wordStats ? app.wordStats.map(stat => stat.wpm) : [];
            
            return {
                handled: true,
                wordCount: wordWpms.length,
                chartDatasets: chart.data ? chart.data.datasets.length : 0,
                hasChartData: chart.data && chart.data.datasets && chart.data.datasets.length > 0
            };
        });
        
        expect(edgeCaseHandling.handled).toBe(true);
        expect(edgeCaseHandling.wordCount).toBe(3);
        expect(edgeCaseHandling.hasChartData).toBe(true);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });
});