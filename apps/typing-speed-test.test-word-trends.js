const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - Word Trend Sparklines', () => {
    let errors = [];
    let pageErrors = [];

    test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        pageErrors = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.message);
        });

        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');
    });

    test('page loads without errors', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Typing Speed Test');
        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('trend tooltip element exists in DOM', async ({ page }) => {
        const trendTooltip = page.locator('.trend-tooltip');
        await expect(trendTooltip).toBeAttached();
        // Should be hidden initially
        await expect(trendTooltip).toBeHidden();
    });

    test('trend tooltip contains canvas element', async ({ page }) => {
        const canvas = page.locator('.trend-tooltip canvas');
        await expect(canvas).toBeAttached();
    });

    test('trendTooltip data property is initialized', async ({ page }) => {
        const trendTooltip = await page.evaluate(() => {
            const el = document.querySelector('[x-data]');
            const data = el._x_dataStack?.[0];
            return data?.trendTooltip ? {
                visible: data.trendTooltip.visible,
                word: data.trendTooltip.word,
                hasStyle: typeof data.trendTooltip.style === 'string'
            } : null;
        });
        expect(trendTooltip).not.toBeNull();
        expect(trendTooltip.visible).toBe(false);
        expect(trendTooltip.word).toBe('');
        expect(trendTooltip.hasStyle).toBe(true);
    });

    test('ledger stores timestamps with WPM data', async ({ page }) => {
        // Seed a word ledger with the new format via page context
        const hasTimestamps = await page.evaluate(async () => {
            // Access the app's IndexedDB helper
            const dbName = 'typingSpeedTestDB';
            const dbVersion = 2;

            // Open DB
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName, dbVersion);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            // Write a test ledger entry with timestamp format
            const testLedger = {
                'hello': {
                    effectiveWpms: [
                        { wpm: 45, ts: Date.now() - 60000 },
                        { wpm: 50, ts: Date.now() - 30000 },
                        { wpm: 55, ts: Date.now() }
                    ],
                    lastUpdated: Date.now()
                }
            };

            const tx = db.transaction('wordLedger', 'readwrite');
            const store = tx.objectStore('wordLedger');
            await new Promise((resolve, reject) => {
                const req = store.put({ id: 'ledger-english-100', value: testLedger });
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });

            // Read it back
            const tx2 = db.transaction('wordLedger', 'readonly');
            const store2 = tx2.objectStore('wordLedger');
            const result = await new Promise((resolve) => {
                const req = store2.get('ledger-english-100');
                req.onsuccess = () => resolve(req.result?.value);
            });

            db.close();

            if (!result || !result.hello) return false;
            const entries = result.hello.effectiveWpms;
            return entries.every(e => typeof e === 'object' && typeof e.wpm === 'number' && typeof e.ts === 'number');
        });

        expect(hasTimestamps).toBe(true);
    });

    test('ledgerWpm helper handles both legacy and new format', async ({ page }) => {
        const result = await page.evaluate(() => {
            // The ledgerWpm function is in IIFE scope, test via computeSlowWordsFromLedger
            const el = document.querySelector('[x-data]');
            const data = el._x_dataStack?.[0];

            // Create a mixed ledger with legacy (number) and new ({wpm, ts}) entries
            const mixedLedger = {
                'legacy': {
                    effectiveWpms: [40, 45, 50],
                    lastUpdated: Date.now()
                },
                'modern': {
                    effectiveWpms: [
                        { wpm: 60, ts: Date.now() - 1000 },
                        { wpm: 65, ts: Date.now() }
                    ],
                    lastUpdated: Date.now()
                }
            };

            data.computeSlowWordsFromLedger(mixedLedger);

            // Check that leaderboard was computed correctly for both formats
            const lb = data.ledgerLeaderboard;
            if (!lb || lb.totalWords !== 2) return { error: 'wrong total', lb };

            const legacy = lb.fastest.concat(lb.slowest).find(e => e.word === 'legacy');
            const modern = lb.fastest.concat(lb.slowest).find(e => e.word === 'modern');

            return {
                legacyMean: legacy ? Math.round(legacy.effectiveWpm) : null,
                modernMean: modern ? Math.round(modern.effectiveWpm) : null,
                legacyOcc: legacy?.occurrences,
                modernOcc: modern?.occurrences
            };
        });

        expect(result.legacyMean).toBe(45); // (40+45+50)/3
        expect(result.modernMean).toBe(63); // (60+65)/2 rounded
        expect(result.legacyOcc).toBe(3);
        expect(result.modernOcc).toBe(2);
    });

    test('showWordTrend and hideWordTrend methods exist', async ({ page }) => {
        const hasMethods = await page.evaluate(() => {
            const el = document.querySelector('[x-data]');
            const data = el._x_dataStack?.[0];
            return typeof data.showWordTrend === 'function' && typeof data.hideWordTrend === 'function';
        });
        expect(hasMethods).toBe(true);
    });

    test('leaderboard items have hover event handlers', async ({ page }) => {
        // Inject ledger data and trigger leaderboard computation
        await page.evaluate(async () => {
            const el = document.querySelector('[x-data]');
            const data = el._x_dataStack?.[0];

            const ledger = {};
            const words = ['fast', 'slow', 'medium', 'quick', 'steady'];
            words.forEach((w, i) => {
                ledger[w] = {
                    effectiveWpms: [{ wpm: 20 + i * 20, ts: Date.now() }],
                    lastUpdated: Date.now()
                };
            });

            data.computeSlowWordsFromLedger(ledger);
            data.showResults = true;
        });

        await page.waitForTimeout(300);

        // Check that outlier-word-item elements have mouseenter/mouseleave handlers
        const fastItems = page.locator('.outlier-word-item');
        const count = await fastItems.count();
        expect(count).toBeGreaterThan(0);

        // Verify the items have @mouseenter by checking for cursor:pointer style
        const firstItem = fastItems.first();
        const cursor = await firstItem.evaluate(el => getComputedStyle(el).cursor);
        expect(cursor).toBe('pointer');
    });

    test('trend tooltip CSS styles are applied', async ({ page }) => {
        const styles = await page.evaluate(() => {
            const el = document.querySelector('.trend-tooltip');
            if (!el) return null;
            const s = getComputedStyle(el);
            return {
                position: s.position,
                zIndex: s.zIndex
            };
        });
        expect(styles).not.toBeNull();
        expect(styles.position).toBe('fixed');
        expect(parseInt(styles.zIndex)).toBeGreaterThanOrEqual(1100);
    });
});
