/**
 * Typing Speed Test - Word Sort Order Bug Fix Tests
 * 
 * Tests for ensuring word performance table displays in correct initial sort order
 * matching the dropdown selection.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - Word Sort Order Bug Fix', () => {
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
    
    // Basic page load checks
    await expect(page.locator('h1')).toContainText('Typing Speed Test');
    await expect(page.locator('.text-display')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should display word list sorted by WPM (low to high) initially after test completion', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Start typing test
    const input = page.locator('input[type="text"]');
    await input.focus();
    
    // Complete first few words to generate word performance data
    const words = ['the', 'quick', 'brown'];
    for (let i = 0; i < words.length; i++) {
      // Type each word with different speeds to create varied WPM values
      const word = words[i];
      for (const char of word) {
        await input.type(char);
        // Add delay to create different typing speeds for each word
        await page.waitForTimeout(50 + (i * 20)); // First word faster, later words slower
      }
      await input.press('Space');
    }
    
    // Complete the test by finishing all remaining words quickly
    const allWords = await page.evaluate(() => {
      return window.typingAppInstance ? window.typingAppInstance.words : [];
    });
    
    // Type remaining words quickly
    for (let i = 3; i < allWords.length; i++) {
      const word = allWords[i];
      for (const char of word) {
        await input.type(char);
        await page.waitForTimeout(20); // Fast typing for remaining words
      }
      await input.press('Space');
    }
    
    // Wait for results to appear
    await expect(page.locator('.results')).toBeVisible({ timeout: 10000 });
    
    // Check that word performance section is visible
    await expect(page.locator('h4:has-text("Word Performance")')).toBeVisible();
    
    // Check that dropdown shows "WPM (Low to High)" as selected
    const dropdown = page.locator('select[x-model="wordSortOrder"]');
    await expect(dropdown).toHaveValue('wpm-asc');
    
    // Verify that the dropdown text shows the correct option
    const selectedOption = dropdown.locator('option[value="wpm-asc"]');
    await expect(selectedOption).toContainText('WPM (Low to High)');
    
    // Get word performance data and verify it's sorted low to high
    const wordWpms = await page.evaluate(() => {
      const app = window.typingAppInstance;
      if (!app || !app.sortedWordStats) return [];
      return app.sortedWordStats.map(stat => stat.wpm);
    });
    
    // Verify we have word WPM data
    expect(wordWpms.length).toBeGreaterThan(0);
    
    // Check that the words are sorted in ascending order (low to high)
    for (let i = 1; i < wordWpms.length; i++) {
      expect(wordWpms[i]).toBeGreaterThanOrEqual(wordWpms[i - 1]);
    }
  });

  test('should maintain sorting functionality when dropdown is changed manually', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Start and complete typing test (simplified version)
    const input = page.locator('input[type="text"]');
    await input.focus();
    
    // Complete first few words with varied speeds
    const words = ['the', 'quick', 'brown'];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (const char of word) {
        await input.type(char);
        await page.waitForTimeout(30 + (i * 30)); // Create speed variation
      }
      await input.press('Space');
    }
    
    // Complete remaining words quickly
    const allWords = await page.evaluate(() => {
      return window.typingAppInstance ? window.typingAppInstance.words : [];
    });
    
    for (let i = 3; i < allWords.length; i++) {
      const word = allWords[i];
      for (const char of word) {
        await input.type(char);
        await page.waitForTimeout(15);
      }
      await input.press('Space');
    }
    
    // Wait for results
    await expect(page.locator('.results')).toBeVisible({ timeout: 10000 });
    
    const dropdown = page.locator('select[x-model="wordSortOrder"]');
    
    // Verify initial state is "wpm-asc" 
    await expect(dropdown).toHaveValue('wpm-asc');
    
    const initialWpms = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app.sortedWordStats.map(stat => stat.wpm);
    });
    
    // Change to high to low sorting
    await dropdown.selectOption('wpm-desc');
    await expect(dropdown).toHaveValue('wpm-desc');
    
    // Verify words are now sorted high to low
    const descendingWpms = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app.sortedWordStats.map(stat => stat.wpm);
    });
    
    // Check descending order
    for (let i = 1; i < descendingWpms.length; i++) {
      expect(descendingWpms[i]).toBeLessThanOrEqual(descendingWpms[i - 1]);
    }
    
    // Change back to low to high
    await dropdown.selectOption('wpm-asc');
    await expect(dropdown).toHaveValue('wpm-asc');
    
    // Verify it matches initial ascending order
    const finalWpms = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app.sortedWordStats.map(stat => stat.wpm);
    });
    
    expect(finalWpms).toEqual(initialWpms);
  });
});