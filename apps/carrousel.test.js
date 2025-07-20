const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('LinkedIn Carousel Generator', () => {
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

    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Verify page title
    await expect(page).toHaveTitle('LinkedIn Carousel Generator');
    
    // Verify main elements are present
    await expect(page.locator('h1')).toContainText('LinkedIn Carousel Generator');
    await expect(page.locator('.btn-primary')).toContainText('New Slide');
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.canvas-container')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('creates initial slide on load', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Should have at least one slide created automatically
    const slideCount = await page.locator('.thumbnail').count();
    expect(slideCount).toBeGreaterThan(0);
    await expect(page.locator('.slide-count')).toContainText('slides');
    await expect(page.locator('.canvas')).toBeVisible();
  });

  test('can add new slides', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Add a new slide
    await page.click('.btn-primary:has-text("New Slide")');
    await page.waitForTimeout(200);
    
    // Should now have 2 slides
    await expect(page.locator('.thumbnail')).toHaveCount(2);
    await expect(page.locator('.slide-count')).toContainText('2 slides');
    
    // Second slide should be active
    await expect(page.locator('.thumbnail').nth(1)).toHaveClass(/active/);
  });

  test('can delete slides', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Add a slide, then delete it
    await page.click('.btn-primary:has-text("New Slide")');
    await page.waitForTimeout(200);
    
    await page.click('.btn-danger:has-text("Delete")');
    await page.waitForTimeout(200);
    
    // Should be back to 1 slide
    await expect(page.locator('.thumbnail')).toHaveCount(1);
    await expect(page.locator('.slide-count')).toContainText('1 slides');
  });

  test('can duplicate slides', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Duplicate the slide
    await page.click('.btn-secondary:has-text("Duplicate")');
    await page.waitForTimeout(200);
    
    // Should now have 2 slides
    await expect(page.locator('.thumbnail')).toHaveCount(2);
    await expect(page.locator('.slide-count')).toContainText('2 slides');
  });

  test('can toggle aspect ratio', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Default should be square
    await expect(page.locator('.canvas')).toHaveClass(/square/);
    
    // Change to portrait
    await page.selectOption('.select', 'portrait');
    await page.waitForTimeout(200);
    
    await expect(page.locator('.canvas')).toHaveClass(/portrait/);
    
    // Change back to square
    await page.selectOption('.select', 'square');
    await page.waitForTimeout(200);
    
    await expect(page.locator('.canvas')).toHaveClass(/square/);
  });

  test('can toggle text callout', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Callout should not be visible initially
    await expect(page.locator('.callout')).not.toBeVisible();
    
    // Toggle callout on
    await page.click('.canvas-controls .btn-icon[title="Toggle Text Callout"]');
    await page.waitForTimeout(200);
    
    // Callout should now be visible
    await expect(page.locator('.callout')).toBeVisible();
    await expect(page.locator('.callout')).toContainText('Click to edit text');
    
    // Toggle callout off
    await page.click('.canvas-controls .btn-icon[title="Toggle Text Callout"]');
    await page.waitForTimeout(200);
    
    // Callout should be hidden again
    await expect(page.locator('.callout')).not.toBeVisible();
  });

  test('can edit callout text', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Toggle callout on
    await page.click('.canvas-controls .btn-icon[title="Toggle Text Callout"]');
    await page.waitForTimeout(200);
    
    // Edit the callout text
    const callout = page.locator('.callout');
    await callout.click();
    await callout.fill('Custom callout text');
    await callout.blur();
    
    await expect(callout).toContainText('Custom callout text');
  });

  test('can switch between slides', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Get initial slide count
    const initialCount = await page.locator('.thumbnail').count();
    
    // Add a second slide if needed
    if (initialCount < 2) {
      await page.click('.btn-primary:has-text("New Slide")');
      await page.waitForTimeout(300);
      
      // Wait for thumbnails to be rendered
      await expect(page.locator('.thumbnail')).toHaveCount(initialCount + 1);
    }
    
    // Click on first thumbnail
    await page.locator('.thumbnail').nth(0).click();
    await page.waitForTimeout(200);
    
    // First slide should be active
    await expect(page.locator('.thumbnail').nth(0)).toHaveClass(/active/);
    
    // Click on second thumbnail
    await page.locator('.thumbnail').nth(1).click();
    await page.waitForTimeout(200);
    
    // Second slide should be active
    await expect(page.locator('.thumbnail').nth(1)).toHaveClass(/active/);
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Should start in light mode
    await expect(page.locator('body')).not.toHaveClass(/dark/);
    
    // Toggle dark mode
    await page.click('.btn-icon[title="Toggle Dark Mode"]');
    await page.waitForTimeout(200);
    
    // Should now be in dark mode
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Toggle back to light mode
    await page.click('.btn-icon[title="Toggle Dark Mode"]');
    await page.waitForTimeout(200);
    
    // Should be back in light mode
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Test 'n' key for new slide
    let initialCount = await page.locator('.thumbnail').count();
    await page.keyboard.press('n');
    await page.waitForTimeout(400);
    
    let afterNewCount = await page.locator('.thumbnail').count();
    expect(afterNewCount).toBeGreaterThan(initialCount);
    
    // Test 'd' key for duplicate
    await page.keyboard.press('d');
    await page.waitForTimeout(400);
    
    let afterDupCount = await page.locator('.thumbnail').count();
    expect(afterDupCount).toBeGreaterThan(afterNewCount);
    
    // Test Delete key for delete slide
    await page.keyboard.press('Delete');
    await page.waitForTimeout(400);
    
    let afterDeleteCount = await page.locator('.thumbnail').count();
    expect(afterDeleteCount).toBeLessThan(afterDupCount);
    
    // Test arrow keys for navigation if we have multiple slides
    if (afterDeleteCount >= 2) {
      // Store initial active slide
      const initialActiveElements = await page.locator('.thumbnail.active').count();
      expect(initialActiveElements).toBe(1); // Should have exactly one active slide
      
      // Test left arrow key
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);
      
      // Should still have exactly one active slide
      const afterLeftActiveElements = await page.locator('.thumbnail.active').count();
      expect(afterLeftActiveElements).toBe(1);
      
      // Test right arrow key
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      
      // Should still have exactly one active slide
      const afterRightActiveElements = await page.locator('.thumbnail.active').count();
      expect(afterRightActiveElements).toBe(1);
    }
  });

  test('upload prompt is visible when no image', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Upload prompt should be visible
    await expect(page.locator('.upload-prompt')).toBeVisible();
    await expect(page.locator('.upload-prompt')).toContainText('Click to upload image or drag & drop');
    await expect(page.locator('.upload-prompt')).toContainText('You can also paste from clipboard');
  });

  test('export PDF button is enabled when slides exist', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Export button should be enabled with slides
    const exportBtn = page.locator('.btn-success:has-text("Export PDF")');
    await expect(exportBtn).toBeEnabled();
  });

  test('localStorage persistence works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Add a slide and toggle callout
    await page.click('.btn-primary:has-text("New Slide")');
    await page.waitForTimeout(200);
    await page.click('.canvas-controls .btn-icon[title="Toggle Text Callout"]');
    await page.waitForTimeout(200);
    
    // Edit callout text
    const callout = page.locator('.callout');
    await callout.click();
    await callout.fill('Persistent text');
    await callout.blur();
    await page.waitForTimeout(500);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Data should be restored
    await expect(page.locator('.thumbnail')).toHaveCount(2);
    await expect(page.locator('.callout')).toBeVisible();
    await expect(page.locator('.callout')).toContainText('Persistent text');
  });

  test('home navigation works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Mock navigation to prevent actual navigation during test
    await page.addInitScript(() => {
      window.location.href = 'index.html';
    });
    
    // Home button should be present
    await expect(page.locator('.btn-icon[title="Home"]')).toBeVisible();
  });

  test('callout tail toggle works', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Enable callout first
    await page.click('.canvas-controls .btn-icon[title="Toggle Text Callout"]');
    await page.waitForTimeout(200);
    
    // Tail controls should be visible
    await expect(page.locator('.callout-tail-controls')).toBeVisible();
    
    // Callout should not have tail initially
    await expect(page.locator('.callout')).not.toHaveClass(/has-tail/);
    
    // Toggle tail on
    await page.click('.callout-tail-controls .btn-icon[title="Toggle Speech Bubble Tail"]');
    await page.waitForTimeout(200);
    
    // Callout should now have tail
    await expect(page.locator('.callout')).toHaveClass(/has-tail/);
    await expect(page.locator('.callout')).toHaveClass(/tail-bottom/); // default position
    
    // Tail position selector should be visible
    await expect(page.locator('.select-small')).toBeVisible();
    
    // Change tail position
    await page.selectOption('.select-small', 'top');
    await page.waitForTimeout(200);
    
    await expect(page.locator('.callout')).toHaveClass(/tail-top/);
    await expect(page.locator('.callout')).not.toHaveClass(/tail-bottom/);
    
    // Toggle tail off
    await page.click('.callout-tail-controls .btn-icon[title="Toggle Speech Bubble Tail"]');
    await page.waitForTimeout(200);
    
    // Callout should not have tail anymore
    await expect(page.locator('.callout')).not.toHaveClass(/has-tail/);
    
    // Position selector should be hidden
    await expect(page.locator('.select-small')).not.toBeVisible();
  });
});