const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Carousel Generator - Basic Functionality', () => {
  test('page loads without errors', async ({ page }) => {
    // Set up console error listener BEFORE loading the page
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Set up page error listener for JavaScript errors
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check that the page has loaded
    await expect(page.locator('h1')).toContainText('LinkedIn Carousel Generator');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('initial state has correct elements visible', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check header is visible with title
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('h1')).toContainText('LinkedIn Carousel Generator');
    
    // Check main container and canvas are visible
    await expect(page.locator('.main-container')).toBeVisible();
    await expect(page.locator('.canvas-container')).toBeVisible();
    
    // Check that we start with one slide (slide 1/1)
    await expect(page.locator('.slide-indicator')).toContainText('1/1');
    
    // Check viewport is visible
    await expect(page.locator('.viewport')).toBeVisible();
    
    // Check version is displayed
    await expect(page.locator('.version')).toBeVisible();
    await expect(page.locator('.version')).toContainText('v');
    
    expect(errors).toEqual([]);
  });

  test('empty state is visible when no slides', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Delete the initial slide to see empty state
    await page.click('button[title="Delete Slide"]');
    await page.waitForTimeout(500);
    
    // Empty state should be visible
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state h2')).toContainText('Create Your First Slide');
    
    // Canvas wrapper should be hidden
    await expect(page.locator('.canvas-wrapper')).toBeHidden();
    
    expect(errors).toEqual([]);
  });

  test('canvas is ready for images without background upload prompt', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Canvas should be visible and ready
    await expect(page.locator('.canvas-wrapper')).toBeVisible();
    await expect(page.locator('.viewport')).toBeVisible();
    
    // Background image should be hidden initially (no background set)
    const bgImage = page.locator('.canvas-bg-image');
    await expect(bgImage).toBeHidden();
    
    // Upload prompt should no longer exist
    await expect(page.locator('.upload-prompt')).toBeHidden();
    
    expect(errors).toEqual([]);
  });

  test('viewport actions are properly enabled/disabled', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Initially at slide 1/1, so previous should be disabled, next should be disabled
    await expect(page.locator('button[title="Previous Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Next Slide"]')).toBeDisabled();
    
    // Add slide button should be enabled
    await expect(page.locator('button[title="Add Slide"]')).toBeEnabled();
    
    // Duplicate and delete should be enabled (we have 1 slide)
    await expect(page.locator('button[title="Duplicate Slide"]')).toBeEnabled();
    await expect(page.locator('button[title="Delete Slide"]')).toBeEnabled();
    
    expect(errors).toEqual([]);
  });

  test('hidden file inputs exist for image uploads', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check that hidden file inputs exist
    const imageInput = page.locator('#imageInput');
    const overlayInput = page.locator('#overlayInput');
    const avatarInput = page.locator('#avatarInput');
    
    await expect(imageInput).toBeAttached();
    await expect(overlayInput).toBeAttached();
    await expect(avatarInput).toBeAttached();
    
    // Verify they are hidden (display: none)
    await expect(imageInput).toBeHidden();
    await expect(overlayInput).toBeHidden();
    await expect(avatarInput).toBeHidden();
    
    // Verify they accept image files
    await expect(imageInput).toHaveAttribute('accept', 'image/*');
    await expect(overlayInput).toHaveAttribute('accept', 'image/*');
    await expect(avatarInput).toHaveAttribute('accept', 'image/*');
    
    expect(errors).toEqual([]);
  });
});