const { test, expect } = require('@playwright/test');
const path = require('path');
const { 
  setupTestPage, 
  expectNoErrors,
  waitForChartsReady,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Development Cost Analyzer', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'dev-cost-analyzer.html');
  });

  test('page loads without errors', async ({ page }) => {
    
    // Wait for charts to render
    await waitForChartsReady(page);
    
    // Check page title
    await expect(page).toHaveTitle(/Development Cost Analyzer/);
    
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Development Cost Analyzer');
    await expect(page.locator('.calculator-panel')).toBeVisible();
    await expect(page.locator('.overview-section')).toBeVisible();
    await expect(page.locator('.apps-section')).toBeVisible();
    
    // Check charts are rendered
    await expect(page.locator('#complexityCostChart')).toBeVisible();
    await expect(page.locator('#timeDistributionChart')).toBeVisible();
    
    // Check for no loading errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('cost calculator functionality', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check initial cost values are displayed
    await expect(page.locator('.cost-card').first()).toContainText('$');
    
    // Test rate slider changes
    const juniorRateSlider = page.locator('.rate-slider').first();
    await juniorRateSlider.fill('50');
    
    // Wait for calculations to update
    await page.waitForTimeout(100);
    
    // Verify slider value is displayed in label
    await expect(page.locator('.rate-input').first()).toContainText('$50/hour');
    
    // Verify costs updated
    const costCards = page.locator('.cost-card');
    await expect(costCards).toHaveCount(3);
  });

  test('app filtering and sorting', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check initial app cards are displayed
    const appCards = page.locator('.app-card');
    await expect(appCards).toHaveCount(10);
    
    // Test complexity filter
    await page.selectOption('select[x-model="filterComplexity"]', 'high');
    await page.waitForTimeout(100);
    
    // Should show fewer apps (high complexity only)
    const filteredCards = page.locator('.app-card');
    const count = await filteredCards.count();
    expect(count).toBeLessThan(9);
    
    // Test sorting
    await page.selectOption('select[x-model="sortBy"]', 'name');
    await page.waitForTimeout(100);
    
    // Verify first app card has expected complexity styling
    await expect(page.locator('.app-card').first()).toHaveClass(/complexity/);
  });

  test('app details toggle', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Find first details toggle button
    const toggleButton = page.locator('.details-toggle').first();
    await expect(toggleButton).toContainText('Show Details');
    
    // Click to show details
    await toggleButton.click();
    await page.waitForTimeout(100);
    
    // Check details are now visible
    await expect(page.locator('.features-list').first()).toBeVisible();
    await expect(toggleButton).toContainText('Hide Details');
    
    // Click to hide details
    await toggleButton.click();
    await page.waitForTimeout(100);
    
    // Check details are hidden
    await expect(toggleButton).toContainText('Show Details');
  });

  test('charts render correctly', async ({ page }) => {
    // Set up console error listener BEFORE loading the page
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for charts to render
    await page.waitForTimeout(1000);
    
    // Check chart canvases are present
    await expect(page.locator('#complexityCostChart')).toBeVisible();
    await expect(page.locator('#timeDistributionChart')).toBeVisible();
    
    // Verify chart containers have content
    const chartContainers = page.locator('.chart-container');
    await expect(chartContainers).toHaveCount(2);
    
    // Verify chart canvases are present and visible
    const complexityChart = page.locator('#complexityCostChart');
    const timeChart = page.locator('#timeDistributionChart');
    
    // Check that canvases are present and visible
    await expect(complexityChart).toBeVisible();
    await expect(timeChart).toBeVisible();
    
    // Wait a bit more for charts to potentially render
    await page.waitForTimeout(500);
    
    // Check no console errors occurred during chart rendering
    expect(errors).toEqual([]);
  });

  test('dark mode toggle', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check initial light mode
    await expect(page.locator('body')).not.toHaveClass('dark');
    
    // Toggle dark mode
    await page.click('button[title*="Toggle Dark"]');
    await page.waitForTimeout(100);
    
    // Check dark mode is applied
    await expect(page.locator('body')).toHaveClass('dark');
    
    // Toggle back to light mode
    await page.click('button[title*="Toggle Dark"]');
    await page.waitForTimeout(100);
    
    // Check light mode is restored
    await expect(page.locator('body')).not.toHaveClass('dark');
  });

  test('dark mode keyboard shortcut', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Press 'd' key to toggle dark mode
    await page.keyboard.press('d');
    await page.waitForTimeout(100);
    
    // Check dark mode is applied
    await expect(page.locator('body')).toHaveClass('dark');
  });

  test('export functionality triggers', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check export buttons are present
    await expect(page.locator('.export-btn')).toHaveCount(3);
    
    // Check CSV export button
    const csvButton = page.locator('button:has-text("Export CSV")');
    await expect(csvButton).toBeVisible();
    
    // Check JSON export button
    const jsonButton = page.locator('button:has-text("Export JSON")');
    await expect(jsonButton).toBeVisible();
    
    // Check PDF export button
    const pdfButton = page.locator('button:has-text("Generate PDF")');
    await expect(pdfButton).toBeVisible();
  });

  test('statistics calculations', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check overview statistics are displayed
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);
    
    // Check total apps stat
    await expect(page.locator('.stat-card').first()).toContainText('10');
    
    // Check lines of code stat shows numbers
    const locStat = page.locator('.stat-card').nth(1);
    await expect(locStat).toContainText(/\d+/);
    
    // Check average complexity is calculated
    const complexityStat = page.locator('.stat-card').nth(2);
    await expect(complexityStat).toContainText(/\d+\.\d/);
  });

  test('insights panel displays data', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check insights panel is present
    await expect(page.locator('.insights-panel')).toBeVisible();
    
    // Check insight cards are displayed
    const insightCards = page.locator('.insight-card');
    await expect(insightCards).toHaveCount(4);
    
    // Check most complex app insight
    await expect(page.locator('.insight-card').first()).toContainText('Most Complex App');
    
    // Check cost range insight
    await expect(page.locator('.insight-card').nth(3)).toContainText('Cost Range');
  });

  test('responsive design elements', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    
    // Check main elements are still visible
    await expect(page.locator('.calculator-panel')).toBeVisible();
    await expect(page.locator('.apps-section')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);
    
    // Check layout adjusts appropriately
    await expect(page.locator('.main-container')).toBeVisible();
  });

  test('home navigation button', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check home button is present
    const homeButton = page.locator('button[title="Home"]');
    await expect(homeButton).toBeVisible();
    await expect(homeButton).toContainText('🏠');
  });

  test('complexity badge styling', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check complexity badges are present
    const complexityBadges = page.locator('.complexity-badge');
    await expect(complexityBadges).toHaveCount(10);
    
    // Check badge format (should contain "/10")
    await expect(complexityBadges.first()).toContainText('/10');
    
    // Check app cards have complexity classes
    const highComplexityCards = page.locator('.app-card.high-complexity');
    const count = await highComplexityCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('disclaimer and assumptions modal', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check disclaimer is visible
    const disclaimer = page.locator('.disclaimer');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('Claude Sonnet');
    
    // Check info button is present
    const infoBtn = page.locator('.info-btn');
    await expect(infoBtn).toBeVisible();
    
    // Check modal is initially hidden
    const modal = page.locator('.modal-overlay');
    await expect(modal).not.toBeVisible();
    
    // Click info button to open modal
    await infoBtn.click();
    await expect(modal).toBeVisible();
    
    // Check modal content
    await expect(modal).toContainText('Calculation Assumptions');
    await expect(modal).toContainText('AI Analysis Method');
    await expect(modal).toContainText('Time Estimation Factors');
    await expect(modal).toContainText('Complexity Scoring');
    
    // Close modal by clicking close button
    const closeBtn = page.locator('.close-btn');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
    
    // Re-open modal and close by clicking overlay (outside modal content)
    await infoBtn.click();
    await expect(modal).toBeVisible();
    await modal.click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(100);
    await expect(modal).not.toBeVisible();
  });

  test('app launch buttons are present and functional', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'dev-cost-analyzer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check launch buttons are present for all apps
    const launchButtons = page.locator('.launch-btn');
    await expect(launchButtons).toHaveCount(10);
    
    // Check launch button has correct attributes
    const firstLaunchBtn = launchButtons.first();
    await expect(firstLaunchBtn).toBeVisible();
    await expect(firstLaunchBtn).toHaveAttribute('target', '_blank');
    await expect(firstLaunchBtn).toHaveAttribute('title', 'Open app in new tab');
    
    // Check href attribute points to a valid HTML file
    const href = await firstLaunchBtn.getAttribute('href');
    expect(href).toMatch(/\.html$/);
    
    // Check launch button styling and icon
    await expect(firstLaunchBtn).toContainText('🌐');
  });
});