const { test, expect } = require('@playwright/test');
const path = require('path');

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

test.describe('Typing Speed Test - Blind Mode Best Score Separation', () => {
  test('page loads without errors', async ({ page }) => {
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should use different storage keys for normal and blind mode', async ({ page }) => {
    // Test that the getBestScoreStorageKey helper function returns correct keys
    const normalModeKey = await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      return app.getBestScoreStorageKey();
    });

    const blindModeKey = await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = true;
      return app.getBestScoreStorageKey();
    });

    // Normal mode should use original key format
    expect(normalModeKey).toBe('typing-best-wpm-english-100');
    
    // Blind mode should use key with -blind suffix
    expect(blindModeKey).toBe('typing-best-wpm-english-100-blind');
  });

  test('should maintain backwards compatibility with existing scores', async ({ page }) => {
    // Set up a score in the old format (normal mode)
    await page.evaluate(async () => {
      await saveToIndexedDB('typing-best-wpm-english-100', '75.5');
    });

    // Reload page and check normal mode loads the existing score
    await page.reload();
    await page.waitForLoadState('networkidle');

    const loadedScore = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app.bestScore;
    });

    expect(loadedScore).toBe(75.5);
  });

  test('should track best scores separately for normal and blind modes', async ({ page }) => {
    // Set different scores for normal and blind modes
    await page.evaluate(async () => {
      await saveToIndexedDB('typing-best-wpm-english-100', '80');
      await saveToIndexedDB('typing-best-wpm-english-100-blind', '65');
    });

    // Test normal mode shows normal score
    await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      app.loadBestScore();
    });

    await page.waitForTimeout(100);

    let currentScore = await page.evaluate(() => {
      return window.typingAppInstance.bestScore;
    });

    expect(currentScore).toBe(80);

    // Test blind mode shows blind score
    await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = true;
      app.loadBestScore();
    });

    await page.waitForTimeout(100);

    currentScore = await page.evaluate(() => {
      return window.typingAppInstance.bestScore;
    });

    expect(currentScore).toBe(65);
  });

  test('should update best score display when toggling blind mode', async ({ page }) => {
    // Set up different best scores for both modes
    await page.evaluate(async () => {
      await saveToIndexedDB('typing-best-wpm-english-100', '80');
      await saveToIndexedDB('typing-best-wpm-english-100-blind', '65');
    });

    // Start in normal mode
    await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      app.loadBestScore();
    });

    await page.waitForTimeout(100);

    // Check normal mode best score is displayed
    let bestScoreDisplay = await page.locator('.stat-value').nth(3).textContent();
    expect(bestScoreDisplay).toBe('80');

    // Toggle to blind mode
    await page.click('button:has-text("Blind Mode")');
    await page.waitForTimeout(200);

    // Check blind mode best score is displayed
    bestScoreDisplay = await page.locator('.stat-value').nth(3).textContent();
    expect(bestScoreDisplay).toBe('65');

    // Toggle back to normal mode
    await page.click('button:has-text("👁️‍🗨️ Blind Mode")');
    await page.waitForTimeout(200);

    // Check normal mode best score is displayed again
    bestScoreDisplay = await page.locator('.stat-value').nth(3).textContent();
    expect(bestScoreDisplay).toBe('80');
  });

  test('should save new best scores to correct mode-specific storage', async ({ page }) => {
    // Start with blind mode enabled
    await page.click('button:has-text("Blind Mode")');
    await page.waitForTimeout(100);

    // Simulate achieving a new best score in blind mode
    await page.evaluate(async () => {
      const app = window.typingAppInstance;
      app.blindModeSelected = true;
      await app.saveBestScore(90.5);
    });

    // Check that the score was saved to the blind mode key
    const blindModeScore = await page.evaluate(async () => {
      return await getFromIndexedDB('typing-best-wpm-english-100-blind');
    });

    expect(parseFloat(blindModeScore)).toBe(90.5);

    // Switch to normal mode and save a different score
    await page.evaluate(async () => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      await app.saveBestScore(85.3);
    });

    // Check that the score was saved to the normal mode key
    const normalModeScore = await page.evaluate(async () => {
      return await getFromIndexedDB('typing-best-wpm-english-100');
    });

    expect(parseFloat(normalModeScore)).toBe(85.3);

    // Verify blind mode score is still intact
    const blindModeScoreAfter = await page.evaluate(async () => {
      return await getFromIndexedDB('typing-best-wpm-english-100-blind');
    });

    expect(parseFloat(blindModeScoreAfter)).toBe(90.5);
  });

  test('should reset best score only for current mode', async ({ page }) => {
    // Set up scores for both modes
    await page.evaluate(async () => {
      await saveToIndexedDB('typing-best-wpm-english-100', '80');
      await saveToIndexedDB('typing-best-wpm-english-100-blind', '65');
    });

    // Reset normal mode score
    await page.evaluate(async () => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      await app.resetBestScore();
    });

    // Check normal mode score is reset
    const normalModeScore = await page.evaluate(async () => {
      return await getFromIndexedDB('typing-best-wpm-english-100');
    });

    expect(normalModeScore).toBeNull();

    // Check blind mode score is still intact
    const blindModeScore = await page.evaluate(async () => {
      return await getFromIndexedDB('typing-best-wpm-english-100-blind');
    });

    expect(parseFloat(blindModeScore)).toBe(65);
  });

  test('should work correctly with different dictionaries', async ({ page }) => {
    // Change to a different dictionary
    await page.selectOption('.dict-select', 'english-1000');
    await page.waitForTimeout(100);

    // Test storage keys for advanced dictionary
    const normalModeKey = await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      return app.getBestScoreStorageKey();
    });

    const blindModeKey = await page.evaluate(() => {
      const app = window.typingAppInstance;
      app.blindModeSelected = true;
      return app.getBestScoreStorageKey();
    });

    expect(normalModeKey).toBe('typing-best-wpm-english-1000');
    expect(blindModeKey).toBe('typing-best-wpm-english-1000-blind');
  });

  test('should handle first-time users with no existing scores', async ({ page }) => {
    // Clear any existing scores
    await page.evaluate(async () => {
      await removeFromIndexedDB('typing-best-wpm-english-100');
      await removeFromIndexedDB('typing-best-wpm-english-100-blind');
    });

    // Load scores for both modes
    await page.evaluate(async () => {
      const app = window.typingAppInstance;
      app.blindModeSelected = false;
      await app.loadBestScore();
    });

    let bestScore = await page.evaluate(() => window.typingAppInstance.bestScore);
    expect(bestScore).toBeNull();

    await page.evaluate(async () => {
      const app = window.typingAppInstance;
      app.blindModeSelected = true;
      await app.loadBestScore();
    });

    bestScore = await page.evaluate(() => window.typingAppInstance.bestScore);
    expect(bestScore).toBeNull();

    // Check display shows "-" for no best score
    const bestScoreDisplay = await page.locator('.stat-value').nth(3).textContent();
    expect(bestScoreDisplay).toBe('-');
  });
});