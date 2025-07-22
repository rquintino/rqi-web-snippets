const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Carousel Generator - Swipe Icon', () => {
  test('swipe icon appears only on first slide and selection works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // On first slide, swipe icon should be visible
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await expect(swipeIcon).toBeVisible();
    
    // Should show default swipe icon (arrow right)
    const iconText = await page.locator('.swipe-icon-display').textContent();
    expect(iconText).toBe('→');

    // Add another slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);

    // On second slide, swipe icon should be hidden
    await expect(swipeIcon).toBeHidden();

    // Go back to first slide
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);

    // Swipe icon should be visible again
    await expect(swipeIcon).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon location options work correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const swipeIcon = page.locator('.viewport-swipe-icon');
    await expect(swipeIcon).toBeVisible();

    // Should start with bottom-right location
    const initialClass = await swipeIcon.getAttribute('class');
    expect(initialClass).toContain('swipe-bottom-right');

    // Test different locations via right-click
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Should now be top-right
    let updatedClass = await swipeIcon.getAttribute('class');
    expect(updatedClass).toContain('swipe-top-right');

    // Right-click again
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Should now be middle-right
    updatedClass = await swipeIcon.getAttribute('class');
    expect(updatedClass).toContain('swipe-middle-right');

    // Right-click again to cycle back
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Should be back to bottom-right
    updatedClass = await swipeIcon.getAttribute('class');
    expect(updatedClass).toContain('swipe-bottom-right');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon location dropdown selector works correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const swipeIcon = page.locator('.viewport-swipe-icon');
    await expect(swipeIcon).toBeVisible();

    // Click to open selection menu
    await swipeIcon.click();
    await page.waitForTimeout(300);

    // Selection menu should be visible
    const selectionMenu = page.locator('.swipe-icon-menu');
    await expect(selectionMenu).toBeVisible();

    // Test location dropdown
    const locationSelect = page.locator('.swipe-location-select');
    await expect(locationSelect).toBeVisible();

    // Change to top-right
    await locationSelect.selectOption('top-right');
    await page.waitForTimeout(300);

    // Close menu by clicking away
    await page.click('.viewport', { position: { x: 100, y: 100 }, force: true });
    await page.waitForTimeout(300);

    // Verify position changed
    const updatedClass = await swipeIcon.getAttribute('class');
    expect(updatedClass).toContain('swipe-top-right');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon click handler investigation', async ({ page }) => {
    const errors = [];
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for first slide to be created
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await expect(swipeIcon).toBeVisible();

    // Check if there are overlapping elements
    const overlappingElements = await page.evaluate(() => {
      const swipeIcon = document.querySelector('.viewport-swipe-icon');
      if (!swipeIcon) return 'swipe icon not found';
      
      const rect = swipeIcon.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Get element at the center of swipe icon
      const elementAtCenter = document.elementFromPoint(centerX, centerY);
      
      return {
        swipeIconRect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        },
        elementAtCenter: elementAtCenter ? {
          tagName: elementAtCenter.tagName,
          className: elementAtCenter.className,
          title: elementAtCenter.title
        } : 'no element found'
      };
    });

    console.log('Overlapping elements analysis:', JSON.stringify(overlappingElements, null, 2));

    // Try a regular click first
    try {
      await swipeIcon.click({ timeout: 1000 });
      console.log('Regular click succeeded');
    } catch (error) {
      console.log('Regular click failed:', error.message);
      
      // Try force click
      try {
        await swipeIcon.click({ force: true });
        console.log('Force click succeeded');
      } catch (forceError) {
        console.log('Force click also failed:', forceError.message);
      }
    }

    // Check if the menu is now visible first
    const selectionMenu = page.locator('.swipe-icon-menu');
    const menuVisible = await selectionMenu.isVisible();
    console.log(`Selection menu visible after click: ${menuVisible}`);

    // Try to manually call the method to see if it works
    const manualToggleResult = await page.evaluate(() => {
      try {
        const body = document.body;
        const alpineData = Alpine.$data(body);
        if (alpineData && typeof alpineData.toggleSwipeIconSelection === 'function') {
          alpineData.toggleSwipeIconSelection();
          return 'method called successfully';
        } else {
          return 'method not found or not a function';
        }
      } catch (error) {
        return 'error: ' + error.message;
      }
    });
    console.log('Manual method call result:', manualToggleResult);

    // Check menu visibility after manual call
    const menuVisibleAfterManual = await selectionMenu.isVisible();
    console.log(`Menu visible after manual call: ${menuVisibleAfterManual}`);

    // Show captured console logs
    console.log('Console logs captured:', consoleLogs);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});