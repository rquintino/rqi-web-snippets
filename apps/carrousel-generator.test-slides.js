const { test, expect } = require('@playwright/test');
const path = require('path');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

// Helper function specific to carrousel generator
async function setupCarrouselPage(page) {
  const errorListeners = await setupTestPage(page, 'carrousel-generator.html', false);
  return errorListeners;
}

test.describe('Carousel Generator - Slide Management', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupCarrouselPage(page);
  });
  test('keyboard navigation skips slides when adding many slides', async ({ page }) => {
    
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

  test('slide navigation buttons work correctly', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Initially previous button should be disabled
    const prevButton = page.locator('button[title="Previous Slide"]');
    const nextButton = page.locator('button[title="Next Slide"]');
    
    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeDisabled(); // Only 1 slide initially
    
    // Add another slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Now should be on slide 2/2, previous enabled, next disabled
    const slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    await expect(nextButton).toBeDisabled();
    
    // Click previous
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);
    
    // Should be on slide 1/2
    const afterPrev = await page.textContent('.slide-indicator');
    expect(afterPrev).toBe('1/2');
    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeEnabled();
    
    // Click next
    await page.click('button[title="Next Slide"]');
    await page.waitForTimeout(300);
    
    // Should be back to slide 2/2
    const afterNext = await page.textContent('.slide-indicator');
    expect(afterNext).toBe('2/2');
    
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('add slide functionality works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Initially should have 1 slide
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/1');
    
    // Add a slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 2 slides and be on slide 2
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Add another slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 3 slides and be on slide 3
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('3/3');
    
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('duplicate slide functionality works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Initially should have 1 slide
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/1');
    
    // Duplicate button should be enabled with 1 slide
    const duplicateButton = page.locator('button[title="Duplicate Slide"]');
    await expect(duplicateButton).toBeEnabled();
    
    // Duplicate the slide
    await duplicateButton.click();
    await page.waitForTimeout(500);
    
    // Should now have 2 slides and be on slide 2
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('delete slide functionality works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add a few slides first
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    
    // Should have 3 slides, on slide 3
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('3/3');
    
    // Delete current slide
    await page.click('button[title="Delete Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 2 slides, on slide 2
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Delete another slide
    await page.click('button[title="Delete Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 1 slide
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/1');
    
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });
});