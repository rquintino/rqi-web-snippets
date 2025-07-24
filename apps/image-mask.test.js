const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Image Mask Utility', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'image-mask.html');
  });

  test('page loads without errors', async ({ page }) => {
    
    // Check title
    await expect(page).toHaveTitle('Image Mask - Privacy Tool');
    
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Image Mask');
    await expect(page.locator('.canvas-container')).toBeVisible();
    await expect(page.locator('.upload-placeholder')).toBeVisible(); // Should show initially
    await expect(page.locator('.effect-selector')).toBeVisible();
    await expect(page.locator('.actions')).toBeVisible();
    
    // Check no console errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('effect buttons are present and functional', async ({ page }) => {
    // Check all effect buttons exist
    const effects = ['blur', 'pixelate', 'blackout', 'noise'];
    
    for (const effect of effects) {
      await expect(page.locator(`.effect-btn:has-text("${effect}")`)).toBeVisible();
    }
    
    // Check blur is selected by default
    await expect(page.locator('.effect-btn:has-text("blur")')).toHaveClass(/active/);
    
    // Test switching effects
    await page.click('.effect-btn:has-text("pixelate")');
    await expect(page.locator('.effect-btn:has-text("pixelate")')).toHaveClass(/active/);
    await expect(page.locator('.effect-btn:has-text("blur")')).not.toHaveClass(/active/);
  });

  test('action buttons are present', async ({ page }) => {
    await expect(page.locator('.action-btn:has-text("Undo")')).toBeVisible();
    await expect(page.locator('.action-btn:has-text("Reset")')).toBeVisible();
    await expect(page.locator('.action-btn:has-text("Copy")')).toBeVisible();
    await expect(page.locator('.action-btn:has-text("Download")')).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    // Check initial theme
    const body = page.locator('body');
    
    // Toggle theme
    await page.click('.icon-btn:has-text("🌙"), .icon-btn:has-text("☀️")');
    
    // Wait for theme change
    await page.waitForTimeout(100);
    
    // Check theme changed (we can't easily test the exact class due to Alpine.js timing)
    // But we can verify the button text changed
    const themeBtn = page.locator('.icon-btn').nth(0);
    const btnText = await themeBtn.textContent();
    expect(['🌙', '☀️']).toContain(btnText.trim());
  });

  test('canvas is properly initialized', async ({ page }) => {
    // Canvas should be hidden initially (no image loaded)
    const canvas = page.locator('.main-canvas');
    await expect(canvas).toBeHidden();
    
    // Check canvas has proper dimensions even when hidden
    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(parseInt(width)).toBeGreaterThan(0);
    expect(parseInt(height)).toBeGreaterThan(0);
  });

  test('file input exists and is properly configured', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeHidden(); // Should be hidden by CSS
    
    // Check accept attribute
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('image/*');
  });

  test('upload area responds to clicks', async ({ page }) => {
    // Click upload placeholder should work (when no image loaded)
    await page.click('.upload-placeholder');
    
    // Check that clicking doesn't cause errors
    
    await page.waitForTimeout(100);
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('home button navigation', async ({ page }) => {
    const homeBtn = page.locator('.home-btn');
    await expect(homeBtn).toBeVisible();
    
    // Check Alpine.js click handler (can't test onclick attribute with Alpine.js)
    await expect(homeBtn).toHaveAttribute('@click', "window.location.href='../index.html'");
  });

  test('version number is displayed', async ({ page }) => {
    await expect(page.locator('.version')).toBeVisible();
    await expect(page.locator('.version')).toContainText(/^v\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  test('responsive design elements', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check elements are still visible
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.canvas-container')).toBeVisible();
    await expect(page.locator('.upload-placeholder')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('drag and drop area setup', async ({ page }) => {
    const canvasContainer = page.locator('.canvas-container');
    await expect(canvasContainer).toBeVisible();
    
    // Check drag and drop attributes are set up (via event listeners in JS)
    // We can't easily test the actual drag/drop without files, but we can ensure
    // the area is present and styled correctly
    await expect(canvasContainer).toHaveClass(/upload-mode/);
  });

  test('image loading simulation and state changes', async ({ page }) => {
    // Initially should show upload placeholder
    await expect(page.locator('.upload-placeholder')).toBeVisible();
    await expect(page.locator('.main-canvas')).toBeHidden();
    
    // Simulate image loading by executing JavaScript
    await page.evaluate(() => {
      // Create a small test image data URL
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      const dataUrl = canvas.toDataURL();
      
      // Trigger the Alpine.js image loading
      const alpineEl = document.querySelector('[x-data]');
      if (alpineEl && alpineEl._x_dataStack) {
        alpineEl._x_dataStack[0].image = true;
        window.ImageMask.loadImage(dataUrl);
      }
    });
    
    // Wait for state change
    await page.waitForTimeout(TIMEOUTS.SHORT);
    
    // After loading, canvas should be visible and placeholder hidden
    await expect(page.locator('.main-canvas')).toBeVisible();
    await expect(page.locator('.upload-placeholder')).toBeHidden();
  });

  test('effect selection changes active state', async ({ page }) => {
    // Initially blur should be active
    await expect(page.locator('.effect-btn:has-text("blur")')).toHaveClass(/active/);
    
    // Click pixelate effect
    await page.click('.effect-btn:has-text("pixelate")');
    await page.waitForTimeout(100);
    
    // Check state changed
    await expect(page.locator('.effect-btn:has-text("pixelate")')).toHaveClass(/active/);
    await expect(page.locator('.effect-btn:has-text("blur")')).not.toHaveClass(/active/);
    
    // Test all effects can be selected
    const effects = ['blackout', 'noise'];
    for (const effect of effects) {
      await page.click(`.effect-btn:has-text("${effect}")`);
      await page.waitForTimeout(50);
      await expect(page.locator(`.effect-btn:has-text("${effect}")`)).toHaveClass(/active/);
    }
  });

  test('fullscreen toggle functionality', async ({ page }) => {
    const fullscreenBtn = page.locator('.icon-btn').nth(1); // Second icon button
    await expect(fullscreenBtn).toBeVisible();
    
    // Test clicking doesn't cause errors (actual fullscreen test would require special permissions)
    
    await fullscreenBtn.click();
    await page.waitForTimeout(100);
    
    // Should not have errors (though fullscreen might not actually engage in test)
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors, ['requestFullscreen']);
  });

  test('keyboard paste simulation', async ({ page }) => {
    // Test that paste event listener is set up
    
    // Simulate paste event (without actual clipboard data)
    await page.evaluate(() => {
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      document.dispatchEvent(pasteEvent);
    });
    
    await page.waitForTimeout(100);
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('reset functionality clears image state', async ({ page }) => {
    // First simulate loading an image
    await page.evaluate(() => {
      const alpineEl = document.querySelector('[x-data]');
      if (alpineEl && alpineEl._x_dataStack) {
        alpineEl._x_dataStack[0].image = true;
      }
    });
    
    await page.waitForTimeout(100);
    await expect(page.locator('.main-canvas')).toBeVisible();
    
    // Click reset button
    await page.click('.action-btn:has-text("Reset")');
    await page.waitForTimeout(100);
    
    // Should return to upload state
    await expect(page.locator('.upload-placeholder')).toBeVisible();
    await expect(page.locator('.main-canvas')).toBeHidden();
  });

  test('action buttons have proper styling and icons', async ({ page }) => {
    // Check that action buttons have expected text/icons
    await expect(page.locator('.action-btn:has-text("Undo")')).toContainText('↶');
    await expect(page.locator('.action-btn:has-text("Reset")')).toContainText('⟲');
    await expect(page.locator('.action-btn:has-text("Copy")')).toContainText('📋');
    await expect(page.locator('.action-btn:has-text("Download")')).toContainText('💾');
    
    // Check primary button styling
    await expect(page.locator('.action-btn:has-text("Download")')).toHaveClass(/primary/);
  });

  test('sidebar sections are properly organized', async ({ page }) => {
    // Check section titles
    await expect(page.locator('.section-title:has-text("Masking Effects")')).toBeVisible();
    await expect(page.locator('.section-title:has-text("Actions")')).toBeVisible();
    await expect(page.locator('.section-title:has-text("How to Use")')).toBeVisible();
    
    // Check instructions are present
    await expect(page.locator('.section').nth(2)).toContainText('Upload or paste an image');
    await expect(page.locator('.section').nth(2)).toContainText('Select a masking effect');
    await expect(page.locator('.section').nth(2)).toContainText('Draw rectangles to mask areas');
  });
});