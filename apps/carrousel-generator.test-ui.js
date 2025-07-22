const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Carousel Generator - UI Controls', () => {
  test('dark mode toggle functionality', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Initially should not have dark class
    const initialDark = await page.locator('body').getAttribute('class');
    expect(initialDark || '').not.toContain('dark');
    
    // Click dark mode toggle
    await page.click('button[title="Toggle Dark Mode"]');
    await page.waitForTimeout(300);
    
    // Should now have dark class
    const afterToggle = await page.locator('body').getAttribute('class');
    expect(afterToggle).toContain('dark');
    
    // Toggle back
    await page.click('button[title="Toggle Dark Mode"]');
    await page.waitForTimeout(300);
    
    // Should not have dark class again
    const afterToggleBack = await page.locator('body').getAttribute('class');
    expect(afterToggleBack || '').not.toContain('dark');
    
    expect(errors).toEqual([]);
  });

  test('fullscreen toggle functionality', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Initially should not have fullscreen class
    const initialFullscreen = await page.locator('body').getAttribute('class');
    expect(initialFullscreen || '').not.toContain('fullscreen');
    
    // Click fullscreen toggle
    await page.click('button[title="Toggle Fullscreen"]');
    await page.waitForTimeout(300);
    
    // Should now have fullscreen class
    const afterToggle = await page.locator('body').getAttribute('class');
    expect(afterToggle).toContain('fullscreen');
    
    expect(errors).toEqual([]);
  });

  test('aspect ratio selector works correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const aspectRatioSelect = page.locator('.viewport-select');
    await expect(aspectRatioSelect).toBeVisible();
    
    // Should default to square
    const initialValue = await aspectRatioSelect.inputValue();
    expect(initialValue).toBe('square');
    
    // Should have square class on viewport
    const viewport = page.locator('.viewport');
    const initialClass = await viewport.getAttribute('class');
    expect(initialClass).toContain('square');
    
    // Change to portrait
    await aspectRatioSelect.selectOption('portrait');
    await page.waitForTimeout(300);
    
    // Should now have portrait class
    const afterChange = await viewport.getAttribute('class');
    expect(afterChange).toContain('portrait');
    expect(afterChange).not.toContain('square');
    
    expect(errors).toEqual([]);
  });

  test('font size slider respects minimum and maximum boundaries', async ({ page }) => {
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

    // Add a callout to test font sizes on
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);

    const slider = page.locator('.viewport-font-slider');
    const callout = page.locator('.callout-display').first();

    // Test minimum boundary (8px) - set via JavaScript since browsers handle range differently
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '5';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(200);

    // Should be clamped to minimum
    let displayedSize = await page.textContent('.viewport-font-size');
    expect(displayedSize).toBe('8px');

    let computedSize = await callout.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(computedSize).toBe('8px');

    // Test maximum boundary (32px)
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '40';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(200);

    // Should be clamped to maximum
    displayedSize = await page.textContent('.viewport-font-size');
    expect(displayedSize).toBe('32px');

    computedSize = await callout.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(computedSize).toBe('32px');

    // Test valid range (middle value)
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '20';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(200);

    displayedSize = await page.textContent('.viewport-font-size');
    expect(displayedSize).toBe('20px');

    computedSize = await callout.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(computedSize).toBe('20px');

    // Verify slider attributes are correct
    const minValue = await slider.getAttribute('min');
    const maxValue = await slider.getAttribute('max');
    const stepValue = await slider.getAttribute('step');

    expect(minValue).toBe('8');
    expect(maxValue).toBe('32');
    expect(stepValue).toBe('1');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('font size slider affects profile text size like callouts and icons', async ({ page }) => {
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

    // Set up a profile with a name to test text scaling
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test Profile Name');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Check initial profile text font size (should be scaled from base 0.875rem based on default 16px)
    const profileText = page.locator('.viewport-profile-name');
    await expect(profileText).toBeVisible();

    const initialFontSize = await profileText.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });

    // At default 16px callout size, profile text should be 0.875rem = 14px
    expect(parseFloat(initialFontSize)).toBeCloseTo(14, 1);

    // Change font size to 24px using slider
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '24';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Check that profile text font size scaled accordingly
    const scaledFontSize = await profileText.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });

    // At 24px callout size (1.5x scale), profile text should be 0.875rem * 1.5 = 1.3125rem = 21px
    expect(parseFloat(scaledFontSize)).toBeCloseTo(21, 1);

    // Test minimum boundary
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '8';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    const minFontSize = await profileText.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });

    // At 8px callout size (0.5x scale), profile text should be 0.875rem * 0.5 = 0.4375rem = 7px
    expect(parseFloat(minFontSize)).toBeCloseTo(7, 1);

    // Test maximum boundary
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '32';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    const maxFontSize = await profileText.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });

    // At 32px callout size (2x scale), profile text should be 0.875rem * 2 = 1.75rem = 28px
    expect(parseFloat(maxFontSize)).toBeCloseTo(28, 1);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});