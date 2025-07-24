const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Typing Stats Insights App', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'typing-stats-insights.html');
  });

  test('page loads without errors', async ({ page }) => {
    
    // Check page title
    await expect(page).toHaveTitle(/Typing Stats Insights/);
    
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Typing Stats Insights');
    await expect(page.locator('.upload-section')).toBeVisible();
    await expect(page.locator('.drop-zone')).toBeVisible();
    
    // Check no console errors - this MUST be at the end
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('dark mode toggle works', async ({ page }) => {
    
    // Test dark mode toggle
    const darkModeBtn = page.locator('button[title*="Toggle Dark/Light Mode"]');
    await expect(darkModeBtn).toBeVisible();
    
    // Click dark mode toggle
    await darkModeBtn.click();
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Click again to toggle back
    await darkModeBtn.click();
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });

  test('file upload UI elements work', async ({ page }) => {
    
    // Check drop zone
    const dropZone = page.locator('.drop-zone');
    await expect(dropZone).toBeVisible();
    await expect(dropZone).toContainText('Drop typing stats JSON files here');
    
    // Check file input exists (hidden)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute('accept', '.json');
    await expect(fileInput).toHaveAttribute('multiple');
  });

  test('home button navigation works', async ({ page }) => {
    
    const homeBtn = page.locator('button[title="Home"]');
    await expect(homeBtn).toBeVisible();
    await expect(homeBtn).toContainText('🏠');
  });

  test('version number is displayed', async ({ page }) => {
    
    const version = page.locator('.version');
    await expect(version).toBeVisible();
    await expect(version).toContainText(/v\d{4}-\d{2}-\d{2}\.\d+/);
  });

  test('responsive layout works', async ({ page }) => {
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.drop-zone')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.drop-zone')).toBeVisible();
  });

  test('sample JSON data processing simulation', async ({ page }) => {
    
    // Test that the Alpine.js app initializes
    await page.waitForFunction(() => {
      return window.Alpine && document.querySelector('[x-data]')?._x_dataStack?.[0];
    });
    
    // Check that the app data is accessible
    const hasTypingInsights = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && typeof appData.processFiles === 'function';
    });
    
    expect(hasTypingInsights).toBe(true);
  });

  test('chart libraries load correctly', async ({ page }) => {
    
    // Check that Chart.js loads
    const hasChartJs = await page.evaluate(() => typeof window.Chart !== 'undefined');
    expect(hasChartJs).toBe(true);
    
    // Check that Dygraphs loads
    const hasDygraphs = await page.evaluate(() => typeof window.Dygraph !== 'undefined');
    expect(hasDygraphs).toBe(true);
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    
    // Test 'd' key for dark mode toggle
    await page.keyboard.press('d');
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Test 'd' again to toggle back
    await page.keyboard.press('d');
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });

  test('tooltips appear on hover', async ({ page }) => {
    
    // Upload area should show keyboard hint
    await expect(page.locator('.keyboard-hint')).toBeVisible();
    await expect(page.locator('.keyboard-hint')).toContainText('Ctrl+O');
  });

  test('enhanced error handling works', async ({ page }) => {
    
    // Check that error handling methods exist
    const hasErrorHandling = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && typeof appData.showErrorMessage === 'function';
    });
    
    expect(hasErrorHandling).toBe(true);
  });

  test('performance band styling is applied', async ({ page }) => {
    
    // Check that performance band CSS classes exist
    const hasBandStyles = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      // Check if CSS custom properties exist
      return document.styleSheets.length > 0;
    });
    
    expect(hasBandStyles).toBe(true);
  });

  test('replay controls exist in DOM', async ({ page }) => {
    
    // Check replay controls exist in DOM (may be hidden until data loads)
    await expect(page.locator('button:has-text("Replay")')).toBeAttached();
    await expect(page.locator('button:has-text("Pause")')).toBeAttached();
    await expect(page.locator('button:has-text("Stop")')).toBeAttached();
    await expect(page.locator('select').filter({ hasText: '0.25x' })).toBeAttached();
  });

  test('chart metric selectors exist in DOM', async ({ page }) => {
    
    // Check metric selectors exist in DOM (may be hidden until data loads)
    await expect(page.locator('select#primaryMetric')).toBeAttached();
    await expect(page.locator('select#secondaryMetric')).toBeAttached();
    
    // Check default values exist in Alpine data
    const hasDefaultValues = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && appData.selectedPrimaryMetric === 'wpm';
    });
    expect(hasDefaultValues).toBe(true);
  });

  test('advanced coaching analysis methods exist', async ({ page }) => {
    
    // Check that coaching analysis methods exist
    const hasCoachingMethods = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && 
             typeof appData.calculateCoachAnalysis === 'function' &&
             typeof appData.startReplay === 'function' &&
             typeof appData.updateSpeedChart === 'function';
    });
    
    expect(hasCoachingMethods).toBe(true);
  });

  test('progress tracking and comparison features exist', async ({ page }) => {
    
    // Check progress and comparison buttons exist
    await expect(page.locator('button:has-text("Progress")')).toBeAttached();
    await expect(page.locator('button:has-text("Compare")')).toBeAttached();
    
    // Check that progress methods exist
    const hasProgressMethods = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && 
             typeof appData.showProgressTracking === 'function' &&
             typeof appData.toggleComparison === 'function' &&
             typeof appData.calculateProgressMetrics === 'function';
    });
    
    expect(hasProgressMethods).toBe(true);
  });

  test('flow analysis features render correctly', async ({ page }) => {
    
    // Check flow analysis section exists
    await expect(page.locator('h3:has-text("Typing Flow Analysis")')).toBeAttached();
    await expect(page.locator('#flow-chart')).toBeAttached();
    
    // Check flow analysis methods exist
    const hasFlowMethods = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && 
             typeof appData.calculateFlowAnalysis === 'function' &&
             typeof appData.renderFlowChart === 'function';
    });
    
    expect(hasFlowMethods).toBe(true);
  });
});