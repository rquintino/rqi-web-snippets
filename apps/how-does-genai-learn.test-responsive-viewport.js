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

test('viewport height management - app fits within 100vh', async ({ page }) => {
  // Test desktop viewport
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(100);
  
  const appContainer = page.locator('.app-container');
  const containerHeight = await appContainer.evaluate(el => el.offsetHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  
  // App should fit within viewport height
  expect(containerHeight).toBeLessThanOrEqual(viewportHeight);
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});

test('dynamic font scaling with CSS clamp', async ({ page }) => {
  // Test font scaling at different viewport sizes
  const viewports = [
    { width: 320, height: 568 },  // Mobile portrait
    { width: 768, height: 1024 }, // Tablet
    { width: 1200, height: 800 }  // Desktop
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    
    const h1 = page.locator('.header h1');
    const subtitle = page.locator('.header p');
    const mainBtn = page.locator('.main-btn');
    
    // Check that elements are visible and have appropriate sizes
    await expect(h1).toBeVisible();
    await expect(subtitle).toBeVisible();
    await expect(mainBtn).toBeVisible();
    
    // Verify font sizes scale appropriately
    const h1FontSize = await h1.evaluate(el => window.getComputedStyle(el).fontSize);
    const subtitleFontSize = await subtitle.evaluate(el => window.getComputedStyle(el).fontSize);
    const btnFontSize = await mainBtn.evaluate(el => window.getComputedStyle(el).fontSize);
    
    // Font sizes should be within reasonable ranges for each viewport
    const h1Size = parseFloat(h1FontSize);
    const subtitleSize = parseFloat(subtitleFontSize);
    const btnSize = parseFloat(btnFontSize);
    
    expect(h1Size).toBeGreaterThan(18); // Minimum readable size
    expect(subtitleSize).toBeGreaterThan(12);
    expect(btnSize).toBeGreaterThan(12);
    
    if (viewport.width >= 1200) {
      // Desktop should have larger fonts
      expect(h1Size).toBeGreaterThan(30);
    }
  }
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});

test('flexible layout structure and proportional panels', async ({ page }) => {
  // Test multiple viewport sizes
  const viewports = [
    { width: 320, height: 568 },  // Mobile portrait
    { width: 768, height: 1024 }, // Tablet
    { width: 1200, height: 800 }  // Desktop
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    
    const appContainer = page.locator('.app-container');
    const trainingArea = page.locator('.training-area');
    const sourcePanel = page.locator('.source-panel');
    const examplesPanel = page.locator('.examples-panel');
    
    // Check that all elements are visible
    await expect(appContainer).toBeVisible();
    await expect(trainingArea).toBeVisible();
    await expect(sourcePanel).toBeVisible();
    await expect(examplesPanel).toBeVisible();
    
    // Verify app doesn't overflow viewport
    const appHeight = await appContainer.evaluate(el => el.offsetHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(appHeight).toBeLessThanOrEqual(viewportHeight + 50); // Allow small margin for browser differences
    
    // Check training panels have appropriate heights
    const sourcePanelHeight = await sourcePanel.evaluate(el => el.offsetHeight);
    const examplesPanelHeight = await examplesPanel.evaluate(el => el.offsetHeight);
    
    // Panels should have reasonable minimum heights
    expect(sourcePanelHeight).toBeGreaterThan(200);
    expect(examplesPanelHeight).toBeGreaterThan(200);
    
    // On mobile, check if panels stack vertically
    if (viewport.width <= 768) {
      const trainingAreaGridTemplate = await trainingArea.evaluate(el => 
        window.getComputedStyle(el).gridTemplateColumns
      );
      // Should be single column on mobile (check for no "1fr 1fr" pattern)
      expect(trainingAreaGridTemplate).not.toMatch(/1fr 1fr/);
    }
  }
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});

test('height-based media queries for short screens', async ({ page }) => {
  // Test very short screen
  await page.setViewportSize({ width: 1200, height: 480 });
  await page.waitForTimeout(100);
  
  const header = page.locator('.header');
  const controls = page.locator('.controls');
  const trainingStatus = page.locator('.training-status');
  
  // Elements should still be visible on short screens
  await expect(header).toBeVisible();
  await expect(controls).toBeVisible();
  
  // Check compact spacing on short screens
  const headerPaddingTop = await header.evaluate(el => 
    window.getComputedStyle(el).paddingTop
  );
  const headerMarginBottom = await header.evaluate(el => 
    window.getComputedStyle(el).marginBottom
  );
  
  // Should have reduced spacing on short screens
  expect(parseFloat(headerPaddingTop)).toBeLessThan(60);
  expect(parseFloat(headerMarginBottom)).toBeLessThan(30);
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});

test('responsive breakpoints work correctly', async ({ page }) => {
  const breakpoints = [
    { width: 320, height: 568, name: 'mobile-portrait' },
    { width: 568, height: 320, name: 'mobile-landscape' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 768, name: 'large-tablet' },
    { width: 1200, height: 800, name: 'desktop' }
  ];
  
  for (const breakpoint of breakpoints) {
    await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
    await page.waitForTimeout(100);
    
    // All content should remain accessible and visible
    await expect(page.locator('.header h1')).toBeVisible();
    await expect(page.locator('.main-btn')).toBeVisible();
    await expect(page.locator('.source-panel')).toBeVisible();
    await expect(page.locator('.examples-panel')).toBeVisible();
    
    // No horizontal scrollbar should appear
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalScroll).toBe(false);
    
    // App should fit within viewport
    const appHeight = await page.locator('.app-container').evaluate(el => el.offsetHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(appHeight).toBeLessThanOrEqual(viewportHeight + 50);
  }
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});

test('no content overflow at any viewport size', async ({ page }) => {
  // Test extreme viewport sizes
  const extremeViewports = [
    { width: 280, height: 480 }, // Very small mobile
    { width: 320, height: 480 }, // Small mobile
    { width: 1920, height: 1080 }, // Large desktop
    { width: 2560, height: 1440 }  // Very large desktop
  ];
  
  for (const viewport of extremeViewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    
    // Check no horizontal overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowInnerWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth + 20); // Small tolerance
    
    // Check app container fits
    const appContainer = page.locator('.app-container');
    const appWidth = await appContainer.evaluate(el => el.offsetWidth);
    expect(appWidth).toBeLessThanOrEqual(windowInnerWidth);
    
    // All key elements should still be functional
    await expect(page.locator('.main-btn')).toBeVisible();
    await expect(page.locator('.header h1')).toBeVisible();
  }
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors
  expect(errors).toEqual([]);
});