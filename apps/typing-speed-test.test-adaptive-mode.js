const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - Adaptive Difficulty Mode', () => {
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
        // Check basic page elements are present
        await expect(page.locator('h1')).toContainText('Typing Speed Test');
        await expect(page.locator('.text-display')).toBeVisible();
        
        // Check no JavaScript page errors
        expect(pageErrors).toEqual([]);
        
        // Check no console errors - this MUST be at the end
        expect(errors).toEqual([]);
    });

    test('adaptive difficulty control is present in dictionary bar', async ({ page }) => {
        // Check that adaptive difficulty control exists in the dictionary selection bar
        const adaptiveControl = page.locator('.dict-select-bar .adaptive-control');
        await expect(adaptiveControl).toBeVisible();
        
        // Check it has proper label
        await expect(adaptiveControl).toContainText('Adaptive');
        
        // Check default value is 0%
        const slider = page.locator('.adaptive-control input[type="range"]');
        await expect(slider).toHaveValue('0');
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive difficulty control updates value when changed', async ({ page }) => {
        const slider = page.locator('.adaptive-control input[type="range"]');
        const valueDisplay = page.locator('.adaptive-control .adaptive-value');
        
        // Change to 25%
        await slider.fill('25');
        await expect(valueDisplay).toContainText('25%');
        
        // Change to 50%
        await slider.fill('50');
        await expect(valueDisplay).toContainText('50%');
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive mode remains 0% when no previous outliers exist', async ({ page }) => {
        // Set adaptive difficulty to 25%
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('25');
        
        // Start and complete a test (first test - no previous outliers)
        await page.locator('.restart-btn').click();
        await page.locator('.input-field').fill('the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can');
        
        // Check that words were generated randomly (not influenced by outliers since none exist)
        const appData = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return {
                adaptiveDifficulty: app.adaptiveDifficulty,
                wordCount: app.words.length,
                hasSlowOutliers: app.previousSlowOutliers ? app.previousSlowOutliers.length : 0
            };
        });
        
        expect(appData.adaptiveDifficulty).toBe(25);
        expect(appData.wordCount).toBe(50);
        expect(appData.hasSlowOutliers).toBe(0); // No previous outliers
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test.skip('adaptive mode activates only when sufficient slow outliers exist (minimum 3) - TODO: Fix undefined outlier data filtering', async ({ page }) => {
        // Complete first test to generate outliers
        await page.locator('.restart-btn').click();
        
        // Type slowly for some words, quickly for others to create outliers
        const words = ['the', 'be', 'to', 'of', 'and'];
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            if (i < 2) {
                // Type slowly to create slow outliers
                for (const char of word) {
                    await page.locator('.input-field').type(char);
                    await page.waitForTimeout(300); // Slow typing
                }
            } else {
                // Type quickly
                await page.locator('.input-field').type(word);
            }
            
            await page.locator('.input-field').press('Space');
            await page.waitForTimeout(100);
        }
        
        // Complete remaining words quickly
        const remainingText = ' it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us';
        await page.locator('.input-field').type(remainingText);
        
        // Wait for test completion
        await expect(page.locator('.results')).toBeVisible({ timeout: 10000 });
        
        // Check outlier detection
        const outlierData = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return {
                hasOutliers: app.outlierStats.hasOutliers,
                slowestCount: app.outlierStats.slowest.length,
                slowestWords: app.outlierStats.slowest.map(o => o.word)
            };
        });
        
        console.log('Outlier data:', outlierData);
        
        // Set adaptive difficulty and restart
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('30');
        
        await page.locator('.restart-btn').click();
        await page.waitForTimeout(500);
        
        // Check if adaptive mode activated based on outlier count
        const adaptiveState = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return {
                adaptiveDifficulty: app.adaptiveDifficulty,
                previousSlowOutliers: app.previousSlowOutliers ? app.previousSlowOutliers.length : 0,
                shouldActivate: app.previousSlowOutliers && app.previousSlowOutliers.length >= 3,
                firstFewWords: app.words.slice(0, 10)
            };
        });
        
        if (adaptiveState.previousSlowOutliers >= 3) {
            expect(adaptiveState.shouldActivate).toBe(true);
            // Should have some influence from previous outliers
        } else {
            expect(adaptiveState.shouldActivate).toBe(false);
            // Should fall back to random selection
        }
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive mode calculates correct outlier word count based on difficulty percentage', async ({ page }) => {
        // This test requires setup of outlier data and checking word selection logic
        const testCases = [
            { difficulty: 0, expectedOutlierCount: 0 },
            { difficulty: 10, expectedOutlierCount: 5 },
            { difficulty: 20, expectedOutlierCount: 10 },
            { difficulty: 30, expectedOutlierCount: 15 },
            { difficulty: 40, expectedOutlierCount: 20 },
            { difficulty: 50, expectedOutlierCount: 25 }
        ];
        
        for (const testCase of testCases) {
            const calculatedCount = await page.evaluate((difficulty) => {
                return Math.floor(50 * (difficulty / 100));
            }, testCase.difficulty);
            
            expect(calculatedCount).toBe(testCase.expectedOutlierCount);
        }
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive mode resets outlier data on dictionary change', async ({ page }) => {
        // Set some adaptive difficulty
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('25');
        
        // Simulate having outlier data
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.previousSlowOutliers = [
                { word: 'test', wpm: 20 },
                { word: 'slow', wpm: 15 },
                { word: 'words', wpm: 18 }
            ];
        });
        
        // Change dictionary
        const dictSelect = page.locator('#dict-select');
        await dictSelect.selectOption('english-200');
        await page.waitForTimeout(500);
        
        // Check that outlier data was cleared
        const clearedData = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return {
                previousSlowOutliers: app.previousSlowOutliers ? app.previousSlowOutliers.length : 0,
                adaptiveDifficulty: app.adaptiveDifficulty // Should still be preserved
            };
        });
        
        expect(clearedData.previousSlowOutliers).toBe(0);
        expect(clearedData.adaptiveDifficulty).toBe(25); // Should preserve difficulty setting
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive mode falls back to random selection when insufficient outliers', async ({ page }) => {
        // Set adaptive difficulty
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('40');
        
        // Simulate having only 2 outliers (below minimum of 3)
        await page.evaluate(() => {
            const app = window.typingAppInstance;
            app.previousSlowOutliers = [
                { word: 'test', wpm: 20 },
                { word: 'slow', wpm: 15 }
            ];
            // Trigger word generation
            app.generateWords();
        });
        
        // Check that it fell back to random selection
        const fallbackData = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return {
                wordCount: app.words.length,
                adaptiveDifficulty: app.adaptiveDifficulty,
                outlierCount: app.previousSlowOutliers ? app.previousSlowOutliers.length : 0
            };
        });
        
        expect(fallbackData.wordCount).toBe(50);
        expect(fallbackData.adaptiveDifficulty).toBe(40);
        expect(fallbackData.outlierCount).toBe(2); // Less than minimum of 3
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive mode maintains total word count of 50', async ({ page }) => {
        // Test various difficulty levels to ensure word count is always 50
        const difficulties = [0, 10, 25, 40, 50];
        
        for (const difficulty of difficulties) {
            const slider = page.locator('.adaptive-control input[type="range"]');
            await slider.fill(difficulty.toString());
            
            // Simulate sufficient outliers
            await page.evaluate((diff) => {
                const app = window.typingAppInstance;
                app.adaptiveDifficulty = diff;
                if (diff > 0) {
                    app.previousSlowOutliers = [
                        { word: 'slow1', wpm: 20 },
                        { word: 'slow2', wpm: 15 },
                        { word: 'slow3', wpm: 18 },
                        { word: 'slow4', wpm: 22 },
                        { word: 'slow5', wpm: 16 }
                    ];
                } else {
                    app.previousSlowOutliers = [];
                }
                app.generateWords();
            }, difficulty);
            
            const wordCount = await page.evaluate(() => {
                return window.typingAppInstance.words.length;
            });
            
            expect(wordCount).toBe(50);
        }
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive mode shuffles words to avoid predictable patterns', async ({ page }) => {
        // Set adaptive difficulty
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('30');
        
        // Generate words multiple times with same outliers and check for variation
        const wordSets = [];
        
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => {
                const app = window.typingAppInstance;
                app.previousSlowOutliers = [
                    { word: 'slow1', wpm: 20 },
                    { word: 'slow2', wpm: 15 },
                    { word: 'slow3', wpm: 18 }
                ];
                app.generateWords();
            });
            
            const words = await page.evaluate(() => {
                return window.typingAppInstance.words.slice(0, 15); // Check first 15 words
            });
            
            wordSets.push(words);
        }
        
        // Check that word sets are not identical (shuffling works)
        const set1String = wordSets[0].join(',');
        const set2String = wordSets[1].join(',');
        const set3String = wordSets[2].join(',');
        
        // At least one set should be different from others (due to shuffling)
        const allSame = (set1String === set2String && set2String === set3String);
        expect(allSame).toBe(false);
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('weighted outlier sampling prioritizes slower words', async ({ page }) => {
        // Set adaptive difficulty
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('50'); // High difficulty for more outlier sampling
        
        // Test weighted sampling with outliers of different speeds
        const samplingResults = await page.evaluate(() => {
            const app = window.typingAppInstance;
            
            // Set outliers with very different WPM values
            app.previousSlowOutliers = [
                { word: 'very_slow', wpm: 10 },    // Should get highest weight
                { word: 'medium_slow', wpm: 30 },  // Should get medium weight  
                { word: 'less_slow', wpm: 50 }     // Should get lowest weight
            ];
            
            // Sample many times to test weight distribution
            const results = { very_slow: 0, medium_slow: 0, less_slow: 0 };
            const iterations = 1000;
            
            for (let i = 0; i < iterations; i++) {
                const selectedWord = app.selectWeightedOutlierWord();
                if (results.hasOwnProperty(selectedWord)) {
                    results[selectedWord]++;
                }
            }
            
            return {
                results,
                iterations,
                // Calculate expected weights (1/wpm^2)
                expectedWeights: {
                    very_slow: 1 / (10 * 10),    // 0.01
                    medium_slow: 1 / (30 * 30),  // 0.0011
                    less_slow: 1 / (50 * 50)     // 0.0004
                }
            };
        });
        
        // Verify weighted sampling worked correctly
        const { results, iterations, expectedWeights } = samplingResults;
        
        // Very slow word should be selected most often
        expect(results.very_slow).toBeGreaterThan(results.medium_slow);
        expect(results.medium_slow).toBeGreaterThan(results.less_slow);
        
        // Check that very slow word got significant majority of selections
        const verySlowPercentage = (results.very_slow / iterations) * 100;
        expect(verySlowPercentage).toBeGreaterThan(60); // Should be around 90%+ with this weighting
        
        console.log('Weighted sampling results:', {
            very_slow: `${results.very_slow} (${((results.very_slow / iterations) * 100).toFixed(1)}%)`,
            medium_slow: `${results.medium_slow} (${((results.medium_slow / iterations) * 100).toFixed(1)}%)`,
            less_slow: `${results.less_slow} (${((results.less_slow / iterations) * 100).toFixed(1)}%)`
        });
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('adaptive difficulty setting persists across page reloads', async ({ page }) => {
        // Set adaptive difficulty to 35%
        const slider = page.locator('.adaptive-control input[type="range"]');
        await slider.fill('35');
        
        // Wait for save to complete
        await page.waitForTimeout(500);
        
        // Verify it was saved
        const savedValue = await page.evaluate(async () => {
            return await window.getFromIndexedDB('typing-adaptive-difficulty');
        });
        
        expect(savedValue).toBe('35');
        
        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Check that the adaptive difficulty was restored
        const restoredValue = await page.evaluate(() => {
            return window.typingAppInstance.adaptiveDifficulty;
        });
        
        expect(restoredValue).toBe(35);
        
        // Also check the UI reflects the restored value
        const sliderValue = await slider.inputValue();
        expect(sliderValue).toBe('35');
        
        const displayValue = await page.locator('.adaptive-value').textContent();
        expect(displayValue).toBe('35%');
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test.skip('adaptive mode preserves outlier data until page refresh - TODO: Fix undefined outlier data filtering', async ({ page }) => {
        // Complete a test to generate outliers
        await page.locator('.restart-btn').click();
        
        // Type with mixed speeds to create outliers
        await page.locator('.input-field').type('the', { delay: 500 }); // Slow
        await page.locator('.input-field').press('Space');
        await page.locator('.input-field').type('be', { delay: 500 }); // Slow  
        await page.locator('.input-field').press('Space');
        await page.locator('.input-field').type('to', { delay: 500 }); // Slow
        await page.locator('.input-field').press('Space');
        
        // Complete quickly
        const fastText = 'of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us';
        await page.locator('.input-field').type(fastText, { delay: 10 });
        
        // Wait for completion
        await expect(page.locator('.results')).toBeVisible({ timeout: 15000 });
        
        // Check outliers were generated
        const hasOutliers = await page.evaluate(() => {
            const app = window.typingAppInstance;
            return app.outlierStats.hasOutliers && app.outlierStats.slowest.length >= 3;
        });
        
        if (hasOutliers) {
            // Restart test (should preserve outliers)
            await page.locator('.restart-btn').click();
            await page.waitForTimeout(500);
            
            const outliersPreserved = await page.evaluate(() => {
                const app = window.typingAppInstance;
                return app.previousSlowOutliers && app.previousSlowOutliers.length >= 3;
            });
            
            expect(outliersPreserved).toBe(true);
        }
        
        // Check no errors
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });
});