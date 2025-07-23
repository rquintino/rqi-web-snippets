const { test, expect } = require('@playwright/test');
const path = require('path');

// Helper function to set up page for testing
async function setupTestPage(page) {
  await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
  // Set test flag for app instance exposure
  await page.evaluate(() => { window.playwrightTest = true; });
  await page.waitForLoadState('networkidle');
}

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

    await setupTestPage(page);
    
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

    await setupTestPage(page);
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
    
    await setupTestPage(page);
    
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
    
    await setupTestPage(page);
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
    
    await setupTestPage(page);
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
    
    await setupTestPage(page);
    
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

  test('can add and navigate between slides', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Initially at slide 1/1
    await expect(page.locator('.slide-indicator')).toContainText('1/1');
    
    // Add a slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Now at slide 2/2
    await expect(page.locator('.slide-indicator')).toContainText('2/2');
    
    // Previous button should be enabled now
    await expect(page.locator('button[title="Previous Slide"]')).toBeEnabled();
    
    // Go back to slide 1
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);
    
    // Now at slide 1/2
    await expect(page.locator('.slide-indicator')).toContainText('1/2');
    
    expect(errors).toEqual([]);
  });

  test('can add text callouts', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Add callout button should be enabled
    await expect(page.locator('button[title="Add Text Callout"]')).toBeEnabled();
    
    // Click to add callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(800);
    
    // Callout should be created and visible
    await expect(page.locator('.text-callout')).toBeVisible();
    
    expect(errors).toEqual([]);
  });

  test('dark mode toggle works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Get initial state (could be dark or light depending on settings)
    const initiallyDark = await page.locator('body').evaluate(el => el.classList.contains('dark'));
    
    // Click dark mode toggle
    await page.click('button[title="Toggle Dark Mode"]');
    await page.waitForTimeout(300);
    
    // Should switch to opposite mode
    if (initiallyDark) {
      await expect(page.locator('body')).not.toHaveClass(/dark/);
    } else {
      await expect(page.locator('body')).toHaveClass(/dark/);
    }
    
    expect(errors).toEqual([]);
  });

  test('aspect ratio selector works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Default should be square
    await expect(page.locator('.viewport')).toHaveClass(/square/);
    
    // Change to portrait
    await page.selectOption('.viewport-select', 'portrait');
    await page.waitForTimeout(300);
    
    // Should switch to portrait
    await expect(page.locator('.viewport')).toHaveClass(/portrait/);
    
    expect(errors).toEqual([]);
  });

  test('font size slider works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Font size display should show default 16px
    await expect(page.locator('.viewport-font-size')).toContainText('16px');
    
    // Change font size using slider
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '24';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    
    // Font size display should update
    await expect(page.locator('.viewport-font-size')).toContainText('24px');
    
    expect(errors).toEqual([]);
  });

  test('export buttons are present and enabled', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Export buttons should exist and be enabled
    await expect(page.locator('button[title="Preview PDF"]')).toBeVisible();
    await expect(page.locator('button[title="Preview PDF"]')).toBeEnabled();
    
    await expect(page.locator('button[title="Export PDF"]')).toBeVisible();
    await expect(page.locator('button[title="Export PDF"]')).toBeEnabled();
    
    expect(errors).toEqual([]);
  });

  test('profile configuration opens', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Profile add button should be visible
    await expect(page.locator('.viewport-add-profile')).toBeVisible();
    
    // Click to open profile config
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    
    // Profile modal should be visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-content')).toBeVisible();
    
    expect(errors).toEqual([]);
  });
});

test.describe('Carousel Generator - Profile and Swipe Icon Visibility', () => {
  test('profile visibility logic works correctly for PDF export', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Set up a profile with name and avatar
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[x-model="profile.name"]', 'Test User');
    // Close modal programmatically
    await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      if (app) app.showProfileConfig = false;
    });
    await page.waitForTimeout(300);
    
    // Add two more slides (total 3 slides: 0, 1, 2)
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    
    // Test 'first' visibility setting
    const resultFirst = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.profile.visibility = 'first';
      return {
        slide0: app.shouldShowProfileForSlide(0),
        slide1: app.shouldShowProfileForSlide(1),
        slide2: app.shouldShowProfileForSlide(2)
      };
    });
    expect(resultFirst.slide0).toBe(true);
    expect(resultFirst.slide1).toBe(false);
    expect(resultFirst.slide2).toBe(false);
    
    // Test 'first-last' visibility setting
    const resultFirstLast = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.profile.visibility = 'first-last';
      return {
        slide0: app.shouldShowProfileForSlide(0),
        slide1: app.shouldShowProfileForSlide(1),
        slide2: app.shouldShowProfileForSlide(2)
      };
    });
    expect(resultFirstLast.slide0).toBe(true);
    expect(resultFirstLast.slide1).toBe(false);
    expect(resultFirstLast.slide2).toBe(true);
    
    // Test 'all' visibility setting
    const resultAll = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.profile.visibility = 'all';
      return {
        slide0: app.shouldShowProfileForSlide(0),
        slide1: app.shouldShowProfileForSlide(1),
        slide2: app.shouldShowProfileForSlide(2)
      };
    });
    expect(resultAll.slide0).toBe(true);
    expect(resultAll.slide1).toBe(true);
    expect(resultAll.slide2).toBe(true);
    
    // Test with no profile data
    const resultNoProfile = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.profile.name = '';
      app.profile.avatarUrl = '';
      return {
        slide0: app.shouldShowProfileForSlide(0),
        slide1: app.shouldShowProfileForSlide(1),
        slide2: app.shouldShowProfileForSlide(2)
      };
    });
    expect(resultNoProfile.slide0).toBe(false);
    expect(resultNoProfile.slide1).toBe(false);
    expect(resultNoProfile.slide2).toBe(false);
    
    expect(errors).toEqual([]);
  });

  test('swipe icon visibility logic works correctly for PDF export', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Add two more slides (total 3 slides: 0, 1, 2)
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    
    // Test 'first' visibility setting (default)
    const resultFirst = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.swipeIcon.enabled = true;
      app.swipeIcon.visibility = 'first';
      return {
        slide0: app.shouldShowSwipeIconForSlide(0),
        slide1: app.shouldShowSwipeIconForSlide(1),
        slide2: app.shouldShowSwipeIconForSlide(2)
      };
    });
    expect(resultFirst.slide0).toBe(true);
    expect(resultFirst.slide1).toBe(false);
    expect(resultFirst.slide2).toBe(false);
    
    // Test 'all' visibility setting
    const resultAll = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.swipeIcon.enabled = true;
      app.swipeIcon.visibility = 'all';
      return {
        slide0: app.shouldShowSwipeIconForSlide(0),
        slide1: app.shouldShowSwipeIconForSlide(1),
        slide2: app.shouldShowSwipeIconForSlide(2)
      };
    });
    expect(resultAll.slide0).toBe(true);
    expect(resultAll.slide1).toBe(true);
    expect(resultAll.slide2).toBe(false); // Last slide should not show swipe icon
    
    // Test with swipe icon disabled
    const resultDisabled = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.swipeIcon.enabled = false;
      return {
        slide0: app.shouldShowSwipeIconForSlide(0),
        slide1: app.shouldShowSwipeIconForSlide(1),
        slide2: app.shouldShowSwipeIconForSlide(2)
      };
    });
    expect(resultDisabled.slide0).toBe(false);
    expect(resultDisabled.slide1).toBe(false);
    expect(resultDisabled.slide2).toBe(false);
    
    // Test with single slide
    const resultSingleSlide = await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.swipeIcon.enabled = true;
      app.swipeIcon.visibility = 'all';
      // Simulate single slide by temporarily modifying slides array
      const originalSlides = app.slides;
      app.slides = [app.slides[0]];
      const result = {
        slide0: app.shouldShowSwipeIconForSlide(0)
      };
      app.slides = originalSlides; // Restore
      return result;
    });
    expect(resultSingleSlide.slide0).toBe(false); // Single slide should not show swipe icon
    
    expect(errors).toEqual([]);
  });

  test('PDF generation respects visibility settings', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Set up profile
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[x-model="profile.name"]', 'Test User');
    await page.selectOption('select[x-model="profile.visibility"]', 'all');
    // Close modal programmatically
    await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      if (app) app.showProfileConfig = false;
    });
    await page.waitForTimeout(300);
    
    // Enable swipe icon with 'all' visibility
    await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      app.swipeIcon.enabled = true;
      app.swipeIcon.visibility = 'all';
    });
    
    // Add another slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(300);
    
    // Test PDF generation completes without errors
    const pdfGenerated = await page.evaluate(async () => {
      try {
        const app = window.carrouselAppInstance;
        const pdf = await app.generatePDF();
        return pdf !== null;
      } catch (error) {
        console.error('PDF generation failed:', error);
        return false;
      }
    });
    
    expect(pdfGenerated).toBe(true);
    expect(errors).toEqual([]);
  });

  test('PDF file size baseline monitoring', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await setupTestPage(page);
    await page.waitForTimeout(1000);
    
    // Create a standardized test carousel with known content
    // Add text callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);
    
    // Edit the callout text to something consistent
    await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      const slide = app.getCurrentSlide();
      if (slide && slide.callouts && slide.callouts.length > 0) {
        slide.callouts[0].text = 'Test callout text for size baseline';
        slide.callouts[0].editing = false;
      }
    });
    
    // Add a second slide with content
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);
    
    await page.evaluate(() => {
      const app = window.carrouselAppInstance;
      const slide = app.getCurrentSlide();
      if (slide && slide.callouts && slide.callouts.length > 0) {
        slide.callouts[0].text = 'Second slide test content';
        slide.callouts[0].editing = false;
      }
    });
    
    // Generate PDF and measure size
    const pdfSize = await page.evaluate(async () => {
      try {
        const app = window.carrouselAppInstance;
        const pdf = await app.generatePDF();
        if (!pdf) return null;
        
        const pdfBlob = pdf.output('blob');
        return pdfBlob.size;
      } catch (error) {
        console.error('PDF generation failed:', error);
        return null;
      }
    });
    
    expect(pdfSize).not.toBeNull();
    
    // Size baseline: With JPEG compression (0.85 quality) + PDF compression,
    // a 2-slide carousel with text should be under 70KB
    // This prevents regression to PNG format or loss of compression (PNG would be ~200KB+)
    const maxSizeKB = 70;
    const actualSizeKB = Math.round(pdfSize / 1024);
    
    console.log(`PDF size: ${actualSizeKB}KB (baseline: <${maxSizeKB}KB)`);
    
    expect(pdfSize).toBeLessThan(maxSizeKB * 1024);
    expect(errors).toEqual([]);
  });
});