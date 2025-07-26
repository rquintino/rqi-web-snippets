const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Typing Speed Test - Chart Tooltip Enhancements', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'typing-speed-test.html');
  });

  test('should load and complete typing test without errors after tooltip enhancement', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Type all words to complete test
    const words = await page.locator('.word').allTextContents();
    for (const word of words) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Should show results with chart
    await expect(page.locator('.results')).toBeVisible({ timeout: TIMEOUTS.SLOW });
    await expect(page.locator('#wpmChart')).toBeVisible();
    
    // Check for no errors (this verifies tooltip implementation doesn't break anything)
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should open modal chart without errors after tooltip enhancement', async ({ page }) => {
    // Complete typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    const words = await page.locator('.word').allTextContents();
    for (const word of words) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Wait for results and open modal chart
    await expect(page.locator('.results')).toBeVisible({ timeout: TIMEOUTS.SLOW });
    await page.locator('button[title="Expand chart"]').click();
    
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('#wpmChartModal')).toBeVisible();
    
    // Check for no errors (this verifies modal chart tooltip implementation doesn't break anything)
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should verify chart tooltip functionality through DOM interaction', async ({ page }) => {
    // Complete typing test  
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    const words = await page.locator('.word').allTextContents();
    for (const word of words) {
      await input.fill(word);
      await input.press('Space');
    }
    
    await expect(page.locator('.results')).toBeVisible({ timeout: TIMEOUTS.SLOW });
    
    // Hover over chart to trigger tooltip functionality
    const chartCanvas = page.locator('#wpmChart');
    await chartCanvas.hover({ position: { x: 150, y: 100 } });
    
    // Wait a moment for any tooltip processing
    await page.waitForTimeout(500);
    
    // The key test: no JavaScript errors should occur during tooltip interaction
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });
});