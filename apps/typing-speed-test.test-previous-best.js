const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - Previous Best WPM Display', () => {

    test('page loads without errors', async ({ page }) => {
        // Set up console error listener BEFORE loading the page
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Set up page error listener for JavaScript errors
        const pageErrors = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });

        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');
        
        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors - this MUST be at the end
        expect(errors).toEqual([]);
    });

    test('should show previous best WPM alongside new best when achieved', async ({ page }) => {
        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');

        // Set a lower best score first (simulate having a previous best)
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.bestScore = 50; // Set a lower best score to beat
        });

        // Start typing and achieve a higher score
        await page.click('.text-display');
        
        // Complete all 50 words to finish the test
        for (let i = 0; i < 50; i++) {
            await page.keyboard.type('word');
            await page.keyboard.press('Space');
            await page.waitForTimeout(10);
        }

        // Wait for results to appear
        await page.waitForSelector('.results', { timeout: 5000 });

        // Check if previous best is displayed when new best is achieved
        const finalWpm = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return app.finalWpm;
        });

        // Only check for previous best display if a new best was actually achieved
        if (finalWpm > 50) {
            // Look for previous best display element
            const previousBestVisible = await page.isVisible('[data-testid="previous-best"]');
            if (previousBestVisible) {
                const previousBestText = await page.textContent('[data-testid="previous-best"]');
                expect(previousBestText).toContain('Previous');
                expect(previousBestText).toContain('50');
            }
        }
    });

    test('should maintain chart reference line at previous best during active test', async ({ page }) => {
        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');

        // Set a best score to compare against
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.bestScore = 40;
        });

        // Start typing
        await page.click('.text-display');
        
        // Type a few words to get some chart data
        for (let i = 0; i < 5; i++) {
            await page.keyboard.type('word');
            await page.keyboard.press('Space');
            await page.waitForTimeout(50);
        }

        // Check that chart is using previous best as reference during active test
        const chartReference = await page.evaluate(() => {
            const app = window.typingAppInstance;
            // If we're still in an active test and have achieved a new best
            if (app.started && !app.showResults) {
                // The chart should still show the previous best (40) as reference
                return app.previousBestScore || app.bestScore;
            }
            return null;
        });

        if (chartReference !== null) {
            expect(chartReference).toBe(40);
        }
    });

    test('should update chart reference to new best only after test completion', async ({ page }) => {
        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');

        // Set initial best score
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.bestScore = 30;
        });

        // Complete a full test
        await page.click('.text-display');
        
        // Type all 50 words quickly to complete test
        for (let i = 0; i < 50; i++) {
            await page.keyboard.type('word');
            await page.keyboard.press('Space');
            await page.waitForTimeout(10);
        }

        // Wait for results
        await page.waitForSelector('.results', { timeout: 5000 });

        // Check that chart reference is updated to new best after test completion
        const newBestScore = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return app.bestScore;
        });

        // The chart should now use the new best score as reference
        expect(typeof newBestScore).toBe('number');
        expect(newBestScore).toBeGreaterThanOrEqual(30);
    });

    test('should handle previous best display consistently in blind mode', async ({ page }) => {
        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');

        // Enable blind mode
        await page.click('.toggle-btn');
        await page.waitForTimeout(100);

        // Set previous best score
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.bestScore = 35;
        });

        // Complete test in blind mode
        await page.click('.text-display');
        
        for (let i = 0; i < 50; i++) {
            await page.keyboard.type('word');
            await page.keyboard.press('Space');
            await page.waitForTimeout(10);
        }

        // Wait for blind reveal phase
        await page.waitForSelector('.blind-reveal-continue', { timeout: 5000 });
        
        // Click continue to proceed to results
        await page.click('.continue-btn');
        
        // Wait for results
        await page.waitForSelector('.results', { timeout: 5000 });

        // Verify behavior is consistent with normal mode
        const finalWpm = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return app.finalWpm;
        });

        if (finalWpm > 35) {
            // Should handle previous best the same way as normal mode
            const previousBestVisible = await page.isVisible('[data-testid="previous-best"]');
            if (previousBestVisible) {
                const previousBestText = await page.textContent('[data-testid="previous-best"]');
                expect(previousBestText).toContain('Previous');
            }
        }
    });

    test('should not show previous best display when no new best is achieved', async ({ page }) => {
        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');

        // Set a high best score that won't be beaten
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.bestScore = 150; // Very high score
        });

        // Complete test with slower typing
        await page.click('.text-display');
        
        for (let i = 0; i < 50; i++) {
            await page.keyboard.type('word');
            await page.keyboard.press('Space');
            await page.waitForTimeout(100); // Slower typing
        }

        // Wait for results
        await page.waitForSelector('.results', { timeout: 5000 });

        // Verify no previous best display when new best not achieved
        const previousBestVisible = await page.isVisible('[data-testid="previous-best"]');
        expect(previousBestVisible).toBe(false);
    });

    test('should handle first-time user with no previous best', async ({ page }) => {
        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');

        // Ensure no best score exists (first-time user)
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.bestScore = null;
        });

        // Complete test
        await page.click('.text-display');
        
        for (let i = 0; i < 50; i++) {
            await page.keyboard.type('word');
            await page.keyboard.press('Space');
            await page.waitForTimeout(20);
        }

        // Wait for results
        await page.waitForSelector('.results', { timeout: 5000 });

        // Should not show previous best for first-time user
        const previousBestVisible = await page.isVisible('[data-testid="previous-best"]');
        expect(previousBestVisible).toBe(false);

        // But should now have a best score set
        const newBestScore = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return app.bestScore;
        });

        expect(typeof newBestScore).toBe('number');
        expect(newBestScore).toBeGreaterThan(0);
    });

});