// @ts-check
const { expect } = require('@playwright/test');
const path = require('path');

/**
 * Shared test utilities for RQI Web Snippets test suite
 * Eliminates code duplication and provides consistent error detection
 */

// Constants
const TIMEOUTS = {
  SHORT: 500,
  MEDIUM: 1000,
  LONG: 2000,
  ALPINE_INIT: 10000,
  CHART_RENDER: 5000
};

const SELECTORS = {
  HOME_BTN: 'button[title="Home"], [href*="index.html"], .home-btn',
  DARK_TOGGLE: 'button[title="Toggle theme"], .icon-btn:has-text("🌙"), .icon-btn:has-text("☀️")',
  FULLSCREEN_TOGGLE: '.fullscreen-btn, .fullscreen-toggle, button[title*="fullscreen"]',
  VERSION: '.version, [x-text*="version"]',
  ALPINE_ROOT: '[x-data]'
};

const VERSION_PATTERN = /v\d{4}-\d{2}-\d{2}\.\d+/;

/**
 * Sets up comprehensive error listeners for a page
 * @param {import('@playwright/test').Page} page 
 * @returns {Promise<{errors: string[], pageErrors: string[], networkErrors: string[]}>}
 */
async function setupErrorListeners(page) {
  const errors = [];
  const pageErrors = [];
  const networkErrors = [];

  // Console error listener - CRITICAL for catching loading errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Page error listener for JavaScript errors
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  // Network error listener for failed requests
  page.on('requestfailed', (request) => {
    networkErrors.push(`Failed to load: ${request.url()} - ${request.failure()?.errorText}`);
  });

  return { errors, pageErrors, networkErrors };
}

/**
 * Navigates to an app page with proper error handling
 * @param {import('@playwright/test').Page} page 
 * @param {string} filename - HTML filename (e.g., 'typing-speed-test.html')
 * @param {boolean} waitForAlpine - Whether to wait for Alpine.js initialization
 * @returns {Promise<{errors: string[], pageErrors: string[], networkErrors: string[]}>}
 */
async function setupTestPage(page, filename, waitForAlpine = true) {
  const errorListeners = await setupErrorListeners(page);
  
  const filePath = path.resolve(__dirname, 'apps', filename);
  await page.goto(`file://${filePath}`);
  
  if (waitForAlpine) {
    await waitForAlpineInit(page);
  }
  
  await page.waitForLoadState('networkidle');
  
  return errorListeners;
}

/**
 * Waits for Alpine.js to initialize
 * @param {import('@playwright/test').Page} page 
 */
async function waitForAlpineInit(page) {
  await page.waitForFunction(
    () => window.Alpine !== undefined && window.Alpine.version,
    { timeout: TIMEOUTS.ALPINE_INIT }
  );
  await page.waitForTimeout(TIMEOUTS.SHORT); // Allow Alpine to fully initialize
}

/**
 * Waits for Chart.js to be available and charts to render
 * @param {import('@playwright/test').Page} page 
 */
async function waitForChartsReady(page) {
  await page.waitForFunction(
    () => typeof Chart !== 'undefined',
    { timeout: TIMEOUTS.CHART_RENDER }
  );
  await page.waitForTimeout(TIMEOUTS.MEDIUM); // Allow charts to render
}

/**
 * Comprehensive error checking - CRITICAL for catching any loading issues
 * @param {string[]} errors - Console errors
 * @param {string[]} pageErrors - JavaScript page errors  
 * @param {string[]} networkErrors - Network request failures
 * @param {string[]} allowedErrors - Patterns to ignore (e.g., known browser quirks)
 */
function expectNoErrors(errors, pageErrors, networkErrors, allowedErrors = []) {
  // Filter out allowed error patterns
  const filteredErrors = errors.filter(error => 
    !allowedErrors.some(pattern => error.includes(pattern))
  );
  
  const filteredPageErrors = pageErrors.filter(error => 
    !allowedErrors.some(pattern => error.includes(pattern))
  );
  
  const filteredNetworkErrors = networkErrors.filter(error => 
    !allowedErrors.some(pattern => error.includes(pattern))
  );

  // CRITICAL: Any of these failing means the app has loading issues
  expect(filteredNetworkErrors, 'Network requests should not fail').toEqual([]);
  expect(filteredPageErrors, 'JavaScript page errors should not occur').toEqual([]);
  expect(filteredErrors, 'Console errors should not occur').toEqual([]);
}

/**
 * Standard test for basic page functionality
 * @param {import('@playwright/test').Page} page 
 * @param {string} expectedTitle 
 * @param {Object} errorListeners 
 */
async function expectBasicPageFunctionality(page, expectedTitle, errorListeners) {
  // Check page loaded correctly
  await expect(page).toHaveTitle(expectedTitle);
  
  // Check Alpine.js root element exists
  await expect(page.locator(SELECTORS.ALPINE_ROOT)).toBeAttached();
  
  // Check common elements
  await expect(page.locator(SELECTORS.HOME_BTN)).toBeAttached();
  
  // Version should be displayed
  const versionElement = page.locator(SELECTORS.VERSION);
  if (await versionElement.count() > 0) {
    const versionText = await versionElement.textContent();
    expect(versionText).toMatch(VERSION_PATTERN);
  }
  
  // CRITICAL: Check no loading errors occurred
  expectNoErrors(
    errorListeners.errors, 
    errorListeners.pageErrors, 
    errorListeners.networkErrors,
    ['requestFullscreen'] // Known browser API warning
  );
}

/**
 * Tests dark mode toggle functionality
 * @param {import('@playwright/test').Page} page 
 */
async function testDarkModeToggle(page) {
  const darkToggle = page.locator(SELECTORS.DARK_TOGGLE);
  await expect(darkToggle).toBeVisible();
  
  // Get initial state
  const initialIsDark = await page.evaluate(() => {
    const alpine = document.querySelector('[x-data]');
    return alpine && alpine.__x && alpine.__x.$data.isDark;
  });
  
  // Toggle dark mode
  await darkToggle.click();
  await page.waitForTimeout(TIMEOUTS.SHORT);
  
  // Verify state changed
  const newIsDark = await page.evaluate(() => {
    const alpine = document.querySelector('[x-data]');
    return alpine && alpine.__x && alpine.__x.$data.isDark;
  });
  
  expect(newIsDark).toBe(!initialIsDark);
}

/**
 * Tests fullscreen toggle functionality
 * @param {import('@playwright/test').Page} page 
 */
async function testFullscreenToggle(page) {
  const fullscreenToggle = page.locator(SELECTORS.FULLSCREEN_TOGGLE);
  if (await fullscreenToggle.count() > 0) {
    await expect(fullscreenToggle).toBeVisible();
    await fullscreenToggle.click();
    await page.waitForTimeout(TIMEOUTS.SHORT);
  }
}

/**
 * Tests home button navigation
 * @param {import('@playwright/test').Page} page 
 */
async function testHomeNavigation(page) {
  const homeBtn = page.locator(SELECTORS.HOME_BTN);
  await expect(homeBtn).toBeVisible();
  
  // Check href points to index.html
  const href = await homeBtn.getAttribute('href');
  expect(href).toMatch(/index\.html/);
}

module.exports = {
  TIMEOUTS,
  SELECTORS,
  VERSION_PATTERN,
  setupErrorListeners,
  setupTestPage,
  waitForAlpineInit,
  waitForChartsReady,
  expectNoErrors,
  expectBasicPageFunctionality,
  testDarkModeToggle,
  testFullscreenToggle,
  testHomeNavigation
};