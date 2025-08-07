const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Typing Stats App', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'typing-stats.html');
  });

  test('loads without network or console errors', async ({ page }) => {
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check for network errors
    const networkErrors = [];
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Verify no console errors
    expect(consoleErrors).toEqual([]);
    
    // Verify no network errors (excluding external CDN resources that might fail in offline tests)
    const relevantNetworkErrors = networkErrors.filter(error => 
      !error.includes('cdn.jsdelivr.net')
    );
    expect(relevantNetworkErrors).toEqual([]);

    // Verify the main elements are present
    await expect(page.locator('.header-title h1')).toContainText('Typing Stats');
    await expect(page.locator('.text-input')).toBeVisible();
    await expect(page.locator('.metrics-panel')).toBeVisible();
  });

  test('has correct page title and basic structure', async ({ page }) => {
    await expect(page).toHaveTitle('Typing Stats - Real-time Typing Analytics');
    
    // Check header elements
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('button[title="Home"]')).toBeVisible();
    await expect(page.locator('button[title="Toggle Dark/Light Mode"]')).toBeVisible();
    await expect(page.locator('button[title="Toggle Fullscreen"]')).toBeVisible();
    
    // Check header title
    await expect(page.locator('.header-title h1')).toContainText('Typing Stats');
    await expect(page.locator('.header-title p')).toContainText('Real-time typing analytics and insights');
    
    // Check main components
    await expect(page.locator('.session-controls')).toBeVisible();
    await expect(page.locator('.input-section')).toBeVisible();
    await expect(page.locator('.metrics-panel')).toBeVisible();
    await expect(page.locator('.digraph-section')).toBeVisible();
  });

  test('session controls work correctly', async ({ page }) => {
    // Reset button should be visible and clickable
    const resetBtn = page.locator('button:has-text("Reset Session")');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toBeEnabled();
    
    // Download button should be disabled initially (no data)
    const downloadBtn = page.locator('button:has-text("Download JSON")');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeDisabled();
  });

  test('text input captures keystrokes and updates metrics', async ({ page }) => {
    const textInput = page.locator('.text-input');
    await textInput.click();
    
    // Wait for Alpine.js to initialize
    await page.waitForFunction(() => window.Alpine && window.Alpine.version);
    
    // Type some text
    await textInput.type('hello world test');
    
    // Wait longer for metrics to update
    await page.waitForTimeout(500);
    
    // Check that words metric updated
    const wordsMetric = page.locator('.metric-tile').filter({ hasText: 'Words' }).locator('.metric-value');
    const wordsValue = await wordsMetric.textContent();
    expect(parseInt(wordsValue)).toBeGreaterThan(0);
    
    // Check that last word WPM metric updated
    const lastWordWpmMetric = page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' }).locator('.metric-value');
    const lastWordWpmValue = await lastWordWpmMetric.textContent();
    expect(parseFloat(lastWordWpmValue)).toBeGreaterThanOrEqual(0); // Should be 0 or positive
    
    // Download button should now be enabled
    const downloadBtn = page.locator('button:has-text("Download JSON")');
    await expect(downloadBtn).toBeEnabled();
  });

  test('metrics display with correct labels', async ({ page }) => {
    const expectedMetrics = [
      'Active Time',
      'Words',
      'Last Word WPM',
      'Avg WPM (Gross)',
      'Avg WPM (Net)',
      'Running WPM',
      'KSPC',
      'Error Rate',
      'Running Dwell',
      'Running Flight',
      'Rhythm',
      'Peak WPM'
    ];
    
    for (const metric of expectedMetrics) {
      await expect(page.locator('.metric-label').filter({ hasText: metric })).toBeVisible();
    }
  });

  test('digraph table is present and structured correctly', async ({ page }) => {
    // Check unified digraph panel exists
    await expect(page.locator('.digraph-panel').filter({ hasText: 'Digraph Analysis' })).toBeVisible();
    
    // Check table headers for unified table
    await expect(page.locator('.header-cell').filter({ hasText: 'Digraph' })).toHaveCount(1);
    await expect(page.locator('.header-cell').filter({ hasText: 'Count' })).toHaveCount(1);
    await expect(page.locator('.header-cell').filter({ hasText: 'Avg ± Std Dev' })).toHaveCount(1);
    
    // Check that sortable headers have proper class
    await expect(page.locator('.header-cell.sortable')).toHaveCount(2);
  });

  test('dark/light mode toggle works', async ({ page }) => {
    // Check initial state (should be dark mode)
    await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    
    // Click toggle button
    const toggleBtn = page.locator('button[title="Toggle Dark/Light Mode"]');
    await toggleBtn.click();
    
    // Should now be in light mode
    await expect(page.locator('body')).toHaveClass(/light-mode/);
    
    // Click again to go back to dark mode
    await toggleBtn.click();
    await expect(page.locator('body')).not.toHaveClass(/light-mode/);
  });

  test('tooltip functionality works on metrics', async ({ page }) => {
    // Hover over a metric tile
    const metricTile = page.locator('.metric-tile').first();
    await metricTile.hover();
    
    // Tooltip should appear
    await expect(page.locator('.tooltip')).toBeVisible();
    
    // Move away from metric tile
    await page.locator('.header-title h1').hover();
    
    // Tooltip should disappear
    await expect(page.locator('.tooltip')).toBeHidden();
  });

  test('version number is displayed', async ({ page }) => {
    await expect(page.locator('.version')).toBeVisible();
    await expect(page.locator('.version')).toContainText('v2025-08-06.2');
  });

  test('reset session clears data', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    // Wait for Alpine.js to initialize
    await page.waitForFunction(() => window.Alpine && window.Alpine.version);
    
    // Type some text first
    await textInput.click();
    await textInput.type('test data');
    await page.waitForTimeout(500);
    
    // Verify data exists - check words metric since keystrokes was removed
    const wordsValue = await page.locator('.metric-tile').filter({ hasText: 'Words' }).locator('.metric-value').textContent();
    expect(parseInt(wordsValue)).toBeGreaterThan(0);
    
    // Reset session
    await page.locator('button:has-text("Reset Session")').click();
    
    // Verify data is cleared
    await expect(textInput).toHaveValue('');
    
    // Wait for metrics to update
    await page.waitForTimeout(300);
    
    const newWordsValue = await page.locator('.metric-tile').filter({ hasText: 'Words' }).locator('.metric-value').textContent();
    expect(parseInt(newWordsValue)).toBe(0);
    
    // Also check that Last Word WPM resets
    const lastWordWpmValue = await page.locator('.metric-tile').filter({ hasText: 'Last Word WPM' }).locator('.metric-value').textContent();
    expect(parseFloat(lastWordWpmValue)).toBe(0);
  });

  test('typing with new metrics shows rhythm and peak WPM', async ({ page }) => {
    const textInput = page.locator('.text-input');
    await textInput.click();
    
    // Type enough text to trigger meaningful metrics
    await textInput.type('The quick brown fox jumps over the lazy dog. This is a test of the typing metrics system.');
    
    // Wait for metrics to update
    await page.waitForTimeout(1000);
    
    // Check rhythm consistency metric exists and has a value
    const rhythmMetric = page.locator('.metric-tile').filter({ hasText: 'Rhythm' }).locator('.metric-value');
    const rhythmValue = await rhythmMetric.textContent();
    expect(rhythmValue).toMatch(/\d+\.\d+%/); // Should be a percentage
    
    // Check peak WPM metric exists (may be 0.0 if not enough data yet)
    const peakMetric = page.locator('.metric-tile').filter({ hasText: 'Peak WPM' }).locator('.metric-value');
    const peakValue = await peakMetric.textContent();
    expect(peakValue).toMatch(/\d+\.\d+/); // Should be a number
  });

  test('home button navigation works', async ({ page }) => {
    const homeBtn = page.locator('button[title="Home"]');
    await expect(homeBtn).toBeVisible();
    
    // Note: We can't test actual navigation in this context, but we can verify the button exists and is clickable
    await expect(homeBtn).toBeEnabled();
  });
});
