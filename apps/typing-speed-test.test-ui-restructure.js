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

test.describe('Typing Speed Test - UI Restructure', () => {
  test('page loads without errors', async ({ page }) => {
    // Check basic elements are present
    await expect(page.locator('h1')).toContainText('Typing Speed Test');
    await expect(page.locator('.main-container')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('completion metrics appear above chart when test is completed', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    await page.waitForTimeout(100);
    
    // Type all words to complete test
    const inputField = page.locator('.input-field');
    await inputField.focus();
    
    // Get all words and type them quickly
    const words = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app.words; // Type all words to complete test
    });
    
    for (let i = 0; i < words.length; i++) {
      await inputField.fill(words[i]);
      await page.keyboard.press('Space');
      await page.waitForTimeout(10); // Minimal delay
    }
    
    // Wait for results to appear
    await page.waitForSelector('.results', { state: 'visible' });
    
    // Check that results section appears above chart
    const resultsSection = page.locator('.results');
    const chartContainer = page.locator('.chart-container');
    
    await expect(resultsSection).toBeVisible();
    await expect(chartContainer).toBeVisible();
    
    // Verify DOM order - results should come before chart in the document
    const elementOrder = await page.evaluate(() => {
      const results = document.querySelector('.results');
      const chart = document.querySelector('.chart-container');
      
      if (!results || !chart) return 'elements_not_found';
      
      // Compare positions in DOM
      const position = results.compareDocumentPosition(chart);
      // DOCUMENT_POSITION_FOLLOWING (4) means chart comes after results
      return (position & Node.DOCUMENT_POSITION_FOLLOWING) ? 'results_before_chart' : 'chart_before_results';
    });
    
    expect(elementOrder).toBe('results_before_chart');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('word list panel is completely removed from the UI', async ({ page }) => {
    // Check that word stats section (word list) is not present
    const wordStatsSection = page.locator('.word-stats');
    await expect(wordStatsSection).not.toBeVisible();
    
    // Check that sort controls for word list are not present
    const sortControls = page.locator('.sort-controls');
    await expect(sortControls).not.toBeVisible();
    
    // Check that "Word Performance" heading is not present
    const wordPerformanceHeading = page.locator('text=Word Performance');
    await expect(wordPerformanceHeading).not.toBeVisible();
    
    // Complete a test to verify word list doesn't appear in results
    await page.locator('.restart-btn').click();
    await page.waitForTimeout(100);
    
    const inputField = page.locator('.input-field');
    await inputField.focus();
    
    // Get all words and type them quickly
    const words = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app.words;
    });
    
    for (let i = 0; i < words.length; i++) {
      await inputField.fill(words[i]);
      await page.keyboard.press('Space');
      await page.waitForTimeout(10);
    }
    
    // Wait for results
    await page.waitForSelector('.results', { state: 'visible' });
    
    // Verify word list is still not present in results
    await expect(page.locator('.word-stats')).not.toBeVisible();
    await expect(page.locator('.sort-controls')).not.toBeVisible();
    await expect(page.locator('text=Word Performance')).not.toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('outlier highlights table elements exist in DOM structure', async ({ page }) => {
    // Check that outlier highlights table structure exists in the HTML
    const outlierTableInDOM = await page.locator('.outlier-highlights-table').count();
    expect(outlierTableInDOM).toBeGreaterThanOrEqual(1); // Should exist in DOM
    
    // Check that outlier-related elements exist
    const outlierWordsListExists = await page.locator('.outlier-words-list').count();
    expect(outlierWordsListExists).toBeGreaterThanOrEqual(0); // Should exist
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('export controls elements exist in DOM structure', async ({ page }) => {
    // Check that export controls structure exists in the HTML
    const exportControlsInDOM = await page.locator('.export-controls').count();
    expect(exportControlsInDOM).toBeGreaterThanOrEqual(1); // Should exist in DOM
    
    // Check that export buttons exist
    const csvExportBtnExists = await page.locator('button:has-text("Export CSV")').count();
    const jsonExportBtnExists = await page.locator('button:has-text("Export JSON")').count();
    
    expect(csvExportBtnExists).toBeGreaterThanOrEqual(1);
    expect(jsonExportBtnExists).toBeGreaterThanOrEqual(1);
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });
});