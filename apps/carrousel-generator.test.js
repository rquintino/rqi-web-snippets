const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Carousel Generator', () => {
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

  test('empty avatar button is clickable and opens profile config', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // First add a slide so the avatar area is visible
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Check that profile config modal is initially hidden
    await expect(page.locator('.modal-overlay')).toBeHidden();
    
    // Find the empty avatar button (when no profile is set)
    const emptyAvatarButton = page.locator('.viewport-add-profile');
    
    // Verify the empty avatar button is visible and clickable
    await expect(emptyAvatarButton).toBeVisible();
    await expect(emptyAvatarButton).toBeEnabled();
    
    // Click the empty avatar button
    await emptyAvatarButton.click();
    
    // Verify that the profile config modal opens
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-container h3')).toContainText('Profile Configuration');
  });

  test('keyboard navigation skips slides when adding many slides', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for initial slide to be created
    await page.waitForSelector('.slide-indicator');
    
    // Add 5 more slides using button clicks (total 6 slides) to avoid keyboard shortcut issues
    for (let i = 0; i < 5; i++) {
      await page.click('button[title="Add Slide"]');
      await page.waitForTimeout(100);
    }
    
    // Verify we have 6 slides total
    const slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('6/6'); // Should be on last slide
    
    // Go to first slide using button clicks
    for (let i = 0; i < 5; i++) {
      await page.click('button[title="Previous Slide"]');
      await page.waitForTimeout(50);
    }
    
    // Verify we're on slide 1
    let currentIndicator = await page.textContent('.slide-indicator');
    expect(currentIndicator).toBe('1/6');
    
    // Now test keyboard navigation forward and track each step
    const navigationResults = [];
    
    // Navigate forward using arrow keys and track actual activeSlide value
    for (let i = 0; i < 3; i++) {
      await page.press('body', 'ArrowRight');
      await page.waitForTimeout(200); // Longer delay to ensure state updates
      
      const indicator = await page.textContent('.slide-indicator');
      navigationResults.push({ step: i + 1, indicator });
    }
    
    
    // Test that navigation increments by exactly 1 each time (this should fail due to the bug)
    expect(navigationResults[0].indicator).toBe('2/6'); // Should be slide 2
    expect(navigationResults[1].indicator).toBe('3/6'); // Should be slide 3, but bug might make it skip
    expect(navigationResults[2].indicator).toBe('4/6'); // Should be slide 4, but bug might make it skip
  });
});