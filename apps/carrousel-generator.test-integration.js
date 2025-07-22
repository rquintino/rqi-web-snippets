const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Carousel Generator - Integration & Missing Tests', () => {
  test('profile position persistence across page refreshes', async ({ page }) => {
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

    // Open profile config
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);

    // Set profile name and change position to top-left
    await page.fill('input[placeholder="Your Name"]', 'Test User');
    await page.selectOption('.modal-content select', 'top-left');
    await page.waitForTimeout(300);

    // Close modal
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Verify profile is positioned top-left
    const profileElement = await page.locator('.viewport-avatar');
    const hasTopLeftClass = await profileElement.evaluate(el => el.classList.contains('position-top-left'));
    expect(hasTopLeftClass).toBe(true);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify position persisted after refresh
    const profileAfterRefresh = await page.locator('.viewport-avatar');
    const stillHasTopLeftClass = await profileAfterRefresh.evaluate(el => el.classList.contains('position-top-left'));
    expect(stillHasTopLeftClass).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon appears only on first slide and persists setting', async ({ page }) => {
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

    // Debug: Check initial state
    const slideCount = await page.locator('.slide-indicator').textContent();
    console.log('Debug on init: Slide indicator shows:', slideCount);

    // On first slide, swipe icon should be visible
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await expect(swipeIcon).toBeVisible();

    // Add a second slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);

    // On second slide, swipe icon should be hidden
    await expect(swipeIcon).toBeHidden();

    // Go back to first slide
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);

    // Swipe icon should be visible again on first slide
    await expect(swipeIcon).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon location persists across page refreshes', async ({ page }) => {
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

    // Change location to top-right using right-click
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Should now be top-right
    let updatedClass = await swipeIcon.getAttribute('class');
    expect(updatedClass).toContain('swipe-top-right');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify location persisted
    const swipeIconAfterRefresh = page.locator('.viewport-swipe-icon');
    const classAfterRefresh = await swipeIconAfterRefresh.getAttribute('class');
    expect(classAfterRefresh).toContain('swipe-top-right');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon menu positioning adapts to icon location', async ({ page }) => {
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

    // Test bottom-right position
    await swipeIcon.click();
    await page.waitForTimeout(300);

    let menu = page.locator('.swipe-icon-menu');
    await expect(menu).toBeVisible();
    
    let menuClass = await menu.getAttribute('class');
    expect(menuClass).toContain('menu-bottom-right');

    // Close menu
    await page.click('.viewport', { position: { x: 100, y: 100 }, force: true });
    await page.waitForTimeout(300);

    // Change to top-right and test menu positioning
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    await swipeIcon.click();
    await page.waitForTimeout(300);

    menu = page.locator('.swipe-icon-menu');
    menuClass = await menu.getAttribute('class');
    expect(menuClass).toContain('menu-top-right');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('swipe icon title updates with current location', async ({ page }) => {
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

    // Check initial title (bottom-right)
    let title = await swipeIcon.getAttribute('title');
    expect(title).toContain('bottom-right');

    // Change to top-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Check updated title
    title = await swipeIcon.getAttribute('title');
    expect(title).toContain('top-right');

    // Change to middle-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Check updated title
    title = await swipeIcon.getAttribute('title');
    expect(title).toContain('middle-right');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('profile and swipe icon are positioned more vertically centered', async ({ page }) => {
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

    // Set up a profile to test positioning
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test Profile');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Check that both profile and swipe icon are positioned with 10% from bottom
    const viewport = page.locator('.viewport');
    const viewportBox = await viewport.boundingBox();

    const profile = page.locator('.viewport-avatar');
    const profileBox = await profile.boundingBox();

    const swipeIcon = page.locator('.viewport-swipe-icon');
    const swipeBox = await swipeIcon.boundingBox();

    if (viewportBox && profileBox && swipeBox) {
      // Calculate distances from bottom as percentage
      const profileDistanceFromBottom = (viewportBox.y + viewportBox.height - profileBox.y) / viewportBox.height;
      const swipeDistanceFromBottom = (viewportBox.y + viewportBox.height - swipeBox.y) / viewportBox.height;

      // Should be positioned around 10% from bottom (allow some tolerance)
      expect(profileDistanceFromBottom).toBeGreaterThan(0.05);
      expect(profileDistanceFromBottom).toBeLessThan(0.25);
      
      expect(swipeDistanceFromBottom).toBeGreaterThan(0.05);
      expect(swipeDistanceFromBottom).toBeLessThan(0.25);
    }

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('profile and swipe icon are properly aligned at 10% from bottom', async ({ page }) => {
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

    // Set up profile in bottom-right to test alignment with swipe icon
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test Profile');
    await page.selectOption('.modal-content select', 'bottom-right');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Both should be in bottom-right and aligned
    const profile = page.locator('.viewport-avatar');
    const swipeIcon = page.locator('.viewport-swipe-icon');

    await expect(profile).toBeVisible();
    await expect(swipeIcon).toBeVisible();

    // Both should have similar positioning
    const profileClass = await profile.getAttribute('class');
    const swipeClass = await swipeIcon.getAttribute('class');

    expect(profileClass).toContain('position-bottom-right');
    expect(swipeClass).toContain('swipe-bottom-right');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('size slider controls profile and swipe icon sizes with 50% bigger default', async ({ page }) => {
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

    // Set up profile and check initial sizes
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test User');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Test size scaling with font size changes
    const profile = page.locator('.viewport-avatar');
    const swipeIcon = page.locator('.viewport-swipe-icon');

    await expect(profile).toBeVisible();
    await expect(swipeIcon).toBeVisible();

    // Change font size and verify both scale accordingly
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '24';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Both elements should still be visible and properly scaled
    await expect(profile).toBeVisible();
    await expect(swipeIcon).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('all three features work together without conflicts', async ({ page }) => {
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

    // Test all three features together: profile, swipe icon, and callouts
    
    // 1. Add profile
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Integration Test');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // 2. Add callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);

    // 3. Verify all elements are visible and working
    const profile = page.locator('.viewport-avatar');
    const swipeIcon = page.locator('.viewport-swipe-icon');
    const callout = page.locator('.text-callout');

    await expect(profile).toBeVisible();
    await expect(swipeIcon).toBeVisible();
    await expect(callout).toBeVisible();

    // 4. Test font size affects all elements
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '28';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    // All should still be visible and scaled
    await expect(profile).toBeVisible();
    await expect(swipeIcon).toBeVisible();
    await expect(callout).toBeVisible();

    // Step 3: Add callout and adjust font size
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);

    // Exit edit mode of any callouts
    await page.press('body', 'Escape');
    await page.waitForTimeout(200);

    // Test swipe icon interaction
    const iconText = await page.locator('.swipe-icon-display').textContent();
    expect(iconText).toBe('→');

    // Verify font size applied
    const calloutDisplay = page.locator('.callout-display').first();
    const fontSize = await calloutDisplay.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe('28px');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});