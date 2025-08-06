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

  await page.goto(`file://${path.resolve(__dirname, 'typing-stats.html')}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Typing Stats - Last Word WPM Feature', () => {

  test('page loads without errors after adding last word WPM', async ({ page }) => {
    // Check basic structure
    await expect(page.locator('.metrics-panel')).toBeVisible();
    await expect(page.locator('.text-input')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('metrics layout shows correct order after keystrokes removal', async ({ page }) => {
    const metricTiles = page.locator('.metric-tile');
    
    // Should have 12 metrics (same count as before, keystrokes removed, last word WPM added)
    await expect(metricTiles).toHaveCount(12);
    
    // Check the first few metrics are in correct order
    const firstMetricLabel = metricTiles.nth(0).locator('.metric-label');
    const secondMetricLabel = metricTiles.nth(1).locator('.metric-label');
    const thirdMetricLabel = metricTiles.nth(2).locator('.metric-label');
    const fourthMetricLabel = metricTiles.nth(3).locator('.metric-label');
    
    await expect(firstMetricLabel).toHaveText('Active Time');
    await expect(secondMetricLabel).toHaveText('Words'); // Moved from position 3
    await expect(thirdMetricLabel).toHaveText('Last Word WPM'); // New metric
    await expect(fourthMetricLabel).toHaveText('Avg WPM (Gross)'); // Shifted down
  });

  test('keystrokes metric is completely removed', async ({ page }) => {
    // Should not find any element with "Keystrokes" label
    const keystrokesLabel = page.locator('.metric-label:has-text("Keystrokes")');
    await expect(keystrokesLabel).toHaveCount(0);
  });

  test('last word WPM shows 0.0 initially', async ({ page }) => {
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    await expect(valueElement).toHaveText('0.0');
  });

  test('last word WPM updates when typing a single word', async ({ page }) => {
    const textInput = page.locator('.text-input');
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    // Initially 0.0
    await expect(valueElement).toHaveText('0.0');
    
    // Type a word slowly (should be measurable WPM)
    await textInput.focus();
    await textInput.type('hello', { delay: 100 }); // 100ms between characters
    await page.waitForTimeout(100);
    
    // Still 0.0 because word not completed
    await expect(valueElement).toHaveText('0.0');
    
    // Complete the word with space
    await textInput.press('Space');
    await page.waitForTimeout(200);
    
    // Should now show non-zero WPM (word "hello" = 5 chars / 5 = 1 word equivalent)
    const wpmText = await valueElement.textContent();
    expect(parseFloat(wpmText)).toBeGreaterThan(0);
    expect(wpmText).toMatch(/^\d+\.\d$/); // Format: X.X
  });

  test('last word WPM calculates correctly using 5-letter standard', async ({ page }) => {
    const textInput = page.locator('.text-input');
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    await textInput.focus();
    
    // Type a 10-character word (should count as 2 words in 5-letter standard)
    await textInput.type('javascript', { delay: 50 }); // Fast typing
    await textInput.press('Space');
    await page.waitForTimeout(200);
    
    const wpmValue = parseFloat(await valueElement.textContent());
    
    // Should be reasonable WPM value (10 chars / 5 letters per word = 2 word equivalents)
    expect(wpmValue).toBeGreaterThan(10); // Reasonable lower bound
    expect(wpmValue).toBeLessThan(300); // Reasonable upper bound
  });

  test('last word WPM updates for consecutive words', async ({ page }) => {
    const textInput = page.locator('.text-input');
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    await textInput.focus();
    
    // Type first word
    await textInput.type('quick', { delay: 80 });
    await textInput.press('Space');
    await page.waitForTimeout(100);
    
    const firstWordWpm = parseFloat(await valueElement.textContent());
    expect(firstWordWpm).toBeGreaterThan(0);
    
    // Type second word (different speed)
    await textInput.type('test', { delay: 120 });
    await textInput.press('Space');
    await page.waitForTimeout(100);
    
    const secondWordWpm = parseFloat(await valueElement.textContent());
    expect(secondWordWpm).toBeGreaterThan(0);
    
    // Should be different WPM (due to different typing speeds)
    expect(secondWordWpm).not.toBe(firstWordWpm);
  });

  test('last word WPM resets to 0.0 on session reset', async ({ page }) => {
    const textInput = page.locator('.text-input');
    const resetButton = page.locator('button:has-text("Reset Session")');
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    // Type a word to get non-zero WPM
    await textInput.focus();
    await textInput.type('reset', { delay: 60 });
    await textInput.press('Space');
    await page.waitForTimeout(200);
    
    // Verify WPM is not zero
    const beforeReset = parseFloat(await valueElement.textContent());
    expect(beforeReset).toBeGreaterThan(0);
    
    // Reset session
    await resetButton.click();
    await page.waitForTimeout(100);
    
    // Should be back to 0.0
    await expect(valueElement).toHaveText('0.0');
  });

  test('last word WPM tooltip shows correct explanation', async ({ page }) => {
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    
    // Hover to show tooltip
    await lastWordWpmTile.hover();
    await page.waitForTimeout(100);
    
    // Check tooltip content
    const tooltip = page.locator('.tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('most recently completed word');
    await expect(tooltip).toContainText('5-letter standard');
  });

  test('last word WPM handles backspace during word typing', async ({ page }) => {
    const textInput = page.locator('.text-input');
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    await textInput.focus();
    
    // Type with corrections
    await textInput.type('helllo', { delay: 60 }); // Intentional typo
    await textInput.press('Backspace'); // Remove extra 'l'
    await textInput.press('Backspace'); // Remove another 'l'
    await textInput.type('lo', { delay: 60 }); // Correct spelling
    await textInput.press('Space');
    await page.waitForTimeout(200);
    
    // Should still calculate WPM correctly (final word length: "hello" = 5 chars)
    const wpmValue = parseFloat(await valueElement.textContent());
    expect(wpmValue).toBeGreaterThan(0);
  });

  test('last word WPM handles Tab key reset during typing', async ({ page }) => {
    const textInput = page.locator('.text-input');
    const lastWordWpmTile = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' });
    const valueElement = lastWordWpmTile.locator('.metric-value');
    
    await textInput.focus();
    
    // Start typing a word
    await textInput.type('incomplete', { delay: 60 });
    
    // Should still be 0.0 (word not completed)
    await expect(valueElement).toHaveText('0.0');
    
    // Press Tab to reset session
    await textInput.press('Tab');
    await page.waitForTimeout(200);
    
    // Should still be 0.0 after reset
    await expect(valueElement).toHaveText('0.0');
    
    // Text input should be cleared
    await expect(textInput).toHaveValue('');
  });

});