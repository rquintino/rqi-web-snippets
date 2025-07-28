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

  await page.goto(`file://${path.resolve(__dirname, 'how-does-genai-learn.html')}`);
  await page.waitForLoadState('networkidle');
});

test('page loads without errors', async ({ page }) => {
  // Check that the main title is visible
  await expect(page.locator('h1')).toContainText('How Does GenAI Learn?');
  
  // Check that main button is present
  await expect(page.locator('.main-btn')).toBeVisible();
  
  // Check that training panels are present
  await expect(page.locator('.source-panel')).toBeVisible();
  await expect(page.locator('.examples-panel')).toBeVisible();
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors - this MUST be at the end
  expect(errors).toEqual([]);
});

test('app initializes with correct default state', async ({ page }) => {
  // Verify main button text
  await expect(page.locator('.main-btn')).toContainText('Transform Data');
  
  // Verify header content
  await expect(page.locator('.header p')).toContainText('How Language Models Learn by Masking and Guessing the Next Word');
  
  // Verify control buttons are present
  await expect(page.locator('.fullscreen-btn')).toBeVisible();
  await expect(page.locator('.theme-btn')).toBeVisible();
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});