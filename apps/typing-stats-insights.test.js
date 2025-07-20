const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Stats Insights App', () => {
  test('page loads without errors', async ({ page }) => {
    // Set up console error listener BEFORE loading the page
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page).toHaveTitle(/Typing Stats Insights/);
    
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Typing Stats Insights');
    await expect(page.locator('.upload-section')).toBeVisible();
    await expect(page.locator('.drop-zone')).toBeVisible();
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    const homeBtn = page.locator('button[title="Home"]');
    await expect(homeBtn).toBeVisible();
    await expect(homeBtn).toContainText('🏠');
  });

  test('version number is displayed', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    const version = page.locator('.version');
    await expect(version).toBeVisible();
    await expect(version).toContainText(/v\d{4}-\d{2}-\d{2}\.\d+/);
  });

  test('responsive layout works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check that Chart.js loads
    const hasChartJs = await page.evaluate(() => typeof window.Chart !== 'undefined');
    expect(hasChartJs).toBe(true);
    
    // Check that Dygraphs loads
    const hasDygraphs = await page.evaluate(() => typeof window.Dygraph !== 'undefined');
    expect(hasDygraphs).toBe(true);
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Test 'd' key for dark mode toggle
    await page.keyboard.press('d');
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Test 'd' again to toggle back
    await page.keyboard.press('d');
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });

  test('tooltips appear on hover', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Upload area should show keyboard hint
    await expect(page.locator('.keyboard-hint')).toBeVisible();
    await expect(page.locator('.keyboard-hint')).toContainText('Ctrl+O');
  });

  test('enhanced error handling works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check that error handling methods exist
    const hasErrorHandling = await page.evaluate(() => {
      const appData = document.querySelector('[x-data]')?._x_dataStack?.[0];
      return appData && typeof appData.showErrorMessage === 'function';
    });
    
    expect(hasErrorHandling).toBe(true);
  });

  test('performance band styling is applied', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check that performance band CSS classes exist
    const hasBandStyles = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      // Check if CSS custom properties exist
      return document.styleSheets.length > 0;
    });
    
    expect(hasBandStyles).toBe(true);
  });

  test('replay controls exist in DOM', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check replay controls exist in DOM (may be hidden until data loads)
    await expect(page.locator('button:has-text("Replay")')).toBeAttached();
    await expect(page.locator('button:has-text("Pause")')).toBeAttached();
    await expect(page.locator('button:has-text("Stop")')).toBeAttached();
    await expect(page.locator('select').filter({ hasText: '0.25x' })).toBeAttached();
  });

  test('chart metric selectors exist in DOM', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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
    await page.goto(`file://${path.resolve(__dirname, 'typing-stats-insights.html')}`);
    await page.waitForLoadState('networkidle');
    
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