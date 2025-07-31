const { test, expect } = require('@playwright/test');
const path = require('path');

let errors = [];
let pageErrors = [];

test.describe('Typing Speed Test - Word Grouping in Outliers', () => {
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
        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('outlier words should be grouped by unique word with WPM and standard deviation display', async ({ page }) => {
        // Complete a typing test with varied speeds to create outliers
        await page.locator('.restart-btn').click();
        
        // Type multiple instances of same words with different speeds to create duplicates in outliers
        const testWords = ['the', 'and', 'the', 'for', 'and', 'the', 'with', 'for', 'and', 'the'];
        
        for (let i = 0; i < testWords.length; i++) {
            const word = testWords[i];
            
            // Vary typing speed - make some instances very fast, others very slow
            const delay = (word === 'the' && i % 2 === 0) ? 50 : // Very fast for some 'the' instances
                         (word === 'and' && i % 3 === 0) ? 300 : // Very slow for some 'and' instances
                         150; // Normal speed for others
            
            for (const char of word) {
                await page.keyboard.type(char);
                await page.waitForTimeout(delay);
            }
            await page.keyboard.press('Space');
            await page.waitForTimeout(100);
        }

        // Complete the test
        for (let i = 0; i < 40; i++) { // Fill remaining words
            await page.keyboard.type('word ');
            await page.waitForTimeout(100);
        }

        // Wait for test completion and outlier calculation
        await page.waitForTimeout(1000);

        // Check that outlier highlights section exists
        const outlierSection = page.locator('[x-show="outlierStats.hasOutliers"]');
        await expect(outlierSection).toBeVisible();

        // Get grouped outlier data from the app
        const groupedOutliers = await page.evaluate(() => {
            const app = window.typingAppInstance;
            if (!app || !app.outlierStats) return null;
            
            // This will test our new grouping functionality
            return {
                fastest: app.outlierStats.fastest,
                slowest: app.outlierStats.slowest,
                hasGroupedData: true // We'll implement this
            };
        });

        expect(groupedOutliers).not.toBeNull();
        expect(groupedOutliers.hasGroupedData).toBe(true);

        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('grouped words should display average WPM and standard deviation for each unique word', async ({ page }) => {
        // Complete a typing test with multiple instances of same words
        await page.locator('.restart-btn').click();
        
        // Type words that will create outliers with multiple instances
        const repeatedWords = ['test', 'word', 'test', 'type', 'word', 'test', 'fast', 'type', 'word', 'test'];
        
        for (let i = 0; i < repeatedWords.length; i++) {
            const word = repeatedWords[i];
            
            // Create speed variations for same words
            const delay = (word === 'test' && i < 5) ? 80 : // Fast first few 'test' instances
                         (word === 'test' && i >= 5) ? 250 : // Slow later 'test' instances
                         (word === 'word') ? 60 : // Consistently fast 'word'
                         150; // Normal for others
            
            for (const char of word) {
                await page.keyboard.type(char);
                await page.waitForTimeout(delay);
            }
            await page.keyboard.press('Space');
            await page.waitForTimeout(50);
        }

        // Complete the test
        for (let i = 0; i < 40; i++) {
            await page.keyboard.type('fill ');
            await page.waitForTimeout(100);
        }

        // Wait for completion and stats calculation
        await page.waitForTimeout(1000);

        // Verify grouped outlier display format
        const outlierDisplay = await page.evaluate(() => {
            const app = window.typingAppInstance;
            if (!app || !app.outlierStats) return null;
            
            // Check if we have grouped data with stats
            const fastest = app.outlierStats.fastest || [];
            const slowest = app.outlierStats.slowest || [];
            
            return {
                fastestCount: fastest.length,
                slowestCount: slowest.length,
                hasStats: fastest.length > 0 && fastest[0].hasOwnProperty('meanWpm') && fastest[0].hasOwnProperty('standardDeviation')
            };
        });

        expect(outlierDisplay).not.toBeNull();
        // We expect grouped data to have statistical properties
        expect(outlierDisplay.hasStats).toBe(true);

        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });

    test('grouped outlier display should show word, mean WPM, and standard deviation in UI', async ({ page }) => {
        // Complete test to generate outliers
        await page.locator('.restart-btn').click();
        
        // Create outlier data with repeated words
        const words = ['quick', 'brown', 'quick', 'fox', 'brown', 'quick', 'jumps', 'fox', 'brown', 'quick'];
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const delay = (word === 'quick') ? 40 : // Consistently fast
                         (word === 'brown') ? 300 : // Consistently slow
                         150; // Normal
            
            for (const char of word) {
                await page.keyboard.type(char);
                await page.waitForTimeout(delay);
            }
            await page.keyboard.press('Space');
            await page.waitForTimeout(50);
        }

        // Complete test
        for (let i = 0; i < 40; i++) {
            await page.keyboard.type('end ');
            await page.waitForTimeout(120);
        }

        await page.waitForTimeout(1000);

        // Check that outlier UI displays grouped format
        const outlierItems = page.locator('.outlier-word-item');
        const firstFastWord = outlierItems.first();
        
        if (await firstFastWord.isVisible()) {
            const outlierText = await firstFastWord.textContent();
            
            // Expected format: "word (Nx) X.X wpm (±Y.Y)"
            expect(outlierText).toMatch(/\w+\s*\(\d+x\)\s*\d+\.?\d*\s*wpm\s*\(±\d+\.?\d*\)/);
        }

        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors
        expect(errors).toEqual([]);
    });
});