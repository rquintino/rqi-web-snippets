const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - Export Feature', () => {
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

  test('should show export buttons in results screen', async ({ page }) => {
    // Complete a typing test to get to results
    await page.click('.restart-btn'); // Start typing
    
    // Type complete test quickly
    const input = page.locator('.input-field');
    for (let i = 0; i < 50; i++) {
      await input.type('test '); // Type "test" + space for each word
    }

    // Wait for results to appear
    await page.waitForSelector('.results', { state: 'visible' });

    // Check for export buttons
    await expect(page.locator('.export-controls')).toBeVisible();
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();

    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should export CSV file when CSV button clicked', async ({ page }) => {
    // Complete a typing test
    await page.click('.restart-btn');
    
    const input = page.locator('.input-field');
    for (let i = 0; i < 50; i++) {
      await input.type('test ');
    }

    await page.waitForSelector('.results', { state: 'visible' });

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click CSV export button
    await page.click('button:has-text("Export CSV")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/typing-test-.*\.csv/);
    
    // Check no errors
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('should export JSON file when JSON button clicked', async ({ page }) => {
    // Complete a typing test
    await page.click('.restart-btn');
    
    const input = page.locator('.input-field');
    for (let i = 0; i < 50; i++) {
      await input.type('test ');
    }

    await page.waitForSelector('.results', { state: 'visible' });

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click JSON export button
    await page.click('button:has-text("Export JSON")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/typing-test-.*\.json/);
    
    // Check no errors
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('should include all required data in export', async ({ page }) => {
    // Complete a typing test
    await page.click('.restart-btn');
    
    const input = page.locator('.input-field');
    for (let i = 0; i < 50; i++) {
      await input.type('test ');
    }

    await page.waitForSelector('.results', { state: 'visible' });

    // Get export data by calling the prepareExportData method
    const exportData = await page.evaluate(() => {
      const app = window.typingAppInstance;
      if (!app || typeof app.prepareExportData !== 'function') {
        throw new Error('Export method not available');
      }
      return app.prepareExportData(new Date().toISOString());
    });

    // Verify required data structure
    expect(exportData).toHaveProperty('metadata');
    expect(exportData).toHaveProperty('summary');
    expect(exportData).toHaveProperty('rawData');
    expect(exportData).toHaveProperty('wordStats');
    
    // Verify metadata
    expect(exportData.metadata).toHaveProperty('dictionary');
    expect(exportData.metadata).toHaveProperty('blindMode');
    expect(exportData.metadata).toHaveProperty('totalWords');
    
    // Verify raw data for verification
    expect(exportData.rawData).toHaveProperty('originalWords');
    expect(exportData.rawData).toHaveProperty('typedWords');
    expect(exportData.rawData).toHaveProperty('wordCharStates');
    expect(exportData.rawData).toHaveProperty('wordErrors');
    
    // Verify word stats
    expect(Array.isArray(exportData.wordStats)).toBe(true);
    expect(exportData.wordStats.length).toBeGreaterThan(0);
    
    // Check no errors
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('should allow recalculation of statistics from raw data', async ({ page }) => {
    // Complete a typing test with some errors
    await page.click('.restart-btn');
    
    const input = page.locator('.input-field');
    // Type first word correctly, second word incorrectly to generate errors
    await input.type('test wrong ');
    
    // Complete remaining words
    for (let i = 2; i < 50; i++) {
      await input.type('test ');
    }

    await page.waitForSelector('.results', { state: 'visible' });

    // Get export data and verify calculations can be reproduced
    const verification = await page.evaluate(() => {
      const app = window.typingAppInstance;
      const exportData = app.prepareExportData(new Date().toISOString());
      
      // Verify we can recalculate error penalties from raw data
      let calculatedErrors = 0;
      Object.values(exportData.rawData.wordCharStates).forEach(wordStates => {
        Object.values(wordStates).forEach(isCorrect => {
          if (isCorrect === false) calculatedErrors++;
        });
      });
      
      return {
        exportedErrors: exportData.summary.errorPenalties,
        calculatedErrors: calculatedErrors,
        hasRawData: !!exportData.rawData.originalWords
      };
    });

    // Verify calculations match
    expect(verification.hasRawData).toBe(true);
    expect(verification.calculatedErrors).toBeGreaterThan(0);
    expect(verification.exportedErrors).toBe(verification.calculatedErrors);
    
    // Check no errors
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});