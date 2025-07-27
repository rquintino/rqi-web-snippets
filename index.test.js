const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Web Utilities Index Page', () => {
  test.beforeEach(async ({ page }) => {
    const filePath = path.join(__dirname, 'index.html');
    await page.goto(`file://${filePath}`);
  });

  test('should load the page correctly without errors', async ({ page }) => {
    // Set up console error listener BEFORE loading the page
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    const filePath = path.join(__dirname, 'index.html');
    await page.goto(`file://${filePath}`);
    await page.waitForLoadState('networkidle');
    
    // Check the title
    await expect(page).toHaveTitle('Rui Quintino (with 🤖) Web Snippets Playground');
    
    // Check main elements are visible
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.app-grid')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check theme toggle button exists
    await expect(page.locator('#theme-toggle')).toBeVisible();
    
    // Check fullscreen toggle button exists
    await expect(page.locator('#fullscreen-toggle')).toBeVisible();
    
    // Check deployment info is displayed
    await expect(page.locator('#deployment-info')).toBeVisible();
    await expect(page.locator('#deploy-date')).toContainText('Last updated:');
    await expect(page.locator('#deploy-details')).toContainText('UTC');
    
    // Check if app cards are present (should have more than one)
    await expect(page.locator('.app-card')).toHaveCount(await page.locator('.app-card').count());
    const cardCount = await page.locator('.app-card').count();
    expect(cardCount).toBeGreaterThan(1);
    
    // Check for no console errors
    expect(errors).toEqual([]);
  });

  test('should toggle dark/light mode', async ({ page }) => {
    // Check initial theme (default is light)
    await expect(page.locator('body[data-theme="dark"]')).not.toBeVisible();
    
    // Click the theme toggle button
    await page.click('#theme-toggle');
    
    // Check if dark theme is applied
    await expect(page.locator('body[data-theme="dark"]')).toBeVisible();
    
    // Click the theme toggle button again
    await page.click('#theme-toggle');
    
    // Check if light theme is applied
    await expect(page.locator('body[data-theme="dark"]')).not.toBeVisible();
  });

  test('should show search bar when typing and filter cards', async ({ page }) => {
    // Check that search bar is initially hidden
    await expect(page.locator('#utility-search-bar')).toHaveCSS('display', 'none');
    
    // Type a letter to activate search
    await page.keyboard.press('t');
    
    // Check that search bar is now visible
    await expect(page.locator('#utility-search-bar')).toBeVisible();
    await expect(page.locator('#utility-search-input')).toBeVisible();
    
    // Check initial value of search input
    await expect(page.locator('#utility-search-input')).toHaveValue('t');
    
    // Type more to search for "typing"
    await page.keyboard.type('yping');
    
    // Wait for search highlighting to be applied
    await page.waitForTimeout(500);
    
    // Check that we have the correct card visible
    await expect(page.locator('.app-card:has-text("Typing Speed Test")')).toBeVisible();
    
    // Clear search using Escape key
    await page.keyboard.press('Escape');
    
    // Check that search bar is hidden again
    await expect(page.locator('#utility-search-bar')).toHaveCSS('display', 'none');
  });
});