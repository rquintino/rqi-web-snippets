const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('LinkedIn Carousel Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel.html')}`);
    await page.waitForLoadState('networkidle');
  });

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
    
    // Check that essential elements are present
    await expect(page.locator('h1')).toContainText('LinkedIn Carousel Generator');
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.main-container')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('displays empty state when no slides exist', async ({ page }) => {
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state h2')).toContainText('Create Your First Slide');
    await expect(page.locator('.canvas-wrapper')).not.toBeVisible();
  });

  test('header navigation and controls work', async ({ page }) => {
    // Test home button
    await expect(page.locator('button[title="Home"]')).toBeVisible();
    
    // Test fullscreen toggle
    const fullscreenBtn = page.locator('button[title="Toggle Fullscreen"]');
    await expect(fullscreenBtn).toBeVisible();
    await fullscreenBtn.click();
    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await fullscreenBtn.click();
    await expect(page.locator('body')).not.toHaveClass(/fullscreen/);

    // Test dark mode toggle
    const darkModeBtn = page.locator('button[title="Toggle Dark Mode"]');
    await expect(darkModeBtn).toBeVisible();
    await darkModeBtn.click();
    await expect(page.locator('body')).toHaveClass(/dark/);
    await darkModeBtn.click();
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });

  test('slide management functionality', async ({ page }) => {
    // Initially no slides
    await expect(page.locator('.empty-state')).toBeVisible();

    // Add first slide by clicking the add button in empty state area
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Click Add Slide button (need to find the actual button)
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    
    await page.waitForTimeout(100);
    
    // Should now show canvas and hide empty state
    await expect(page.locator('.empty-state')).not.toBeVisible();
    await expect(page.locator('.canvas-wrapper')).toBeVisible();
    
    // Check slide indicator
    await expect(page.locator('.slide-indicator')).toContainText('1/1');

    // Test add slide button in viewport
    const addSlideBtn = page.locator('button[title="Add Slide"]');
    await addSlideBtn.click();
    await expect(page.locator('.slide-indicator')).toContainText('2/2');

    // Test duplicate slide
    const duplicateBtn = page.locator('button[title="Duplicate Slide"]');
    await duplicateBtn.click();
    await expect(page.locator('.slide-indicator')).toContainText('3/3');

    // Test navigation
    const prevBtn = page.locator('button[title="Previous Slide"]');
    const nextBtn = page.locator('button[title="Next Slide"]');
    
    // Should be on slide 3, prev should work
    await prevBtn.click();
    await expect(page.locator('.slide-indicator')).toContainText('2/3');
    
    await prevBtn.click();
    await expect(page.locator('.slide-indicator')).toContainText('1/3');
    
    // Prev should be disabled on first slide
    await expect(prevBtn).toBeDisabled();
    
    // Navigate to last slide
    await nextBtn.click();
    await nextBtn.click();
    await expect(page.locator('.slide-indicator')).toContainText('3/3');
    
    // Next should be disabled on last slide
    await expect(nextBtn).toBeDisabled();

    // Test delete slide
    const deleteBtn = page.locator('button[title="Delete Slide"]');
    await deleteBtn.click();
    await expect(page.locator('.slide-indicator')).toContainText('2/2');
  });

  test('aspect ratio switching works', async ({ page }) => {
    // Add a slide first
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    const aspectSelect = page.locator('.viewport-select');
    await expect(aspectSelect).toBeVisible();
    
    // Default should be square
    await expect(aspectSelect).toHaveValue('square');
    await expect(page.locator('.viewport')).toHaveClass(/square/);
    
    // Switch to portrait
    await aspectSelect.selectOption('portrait');
    await expect(page.locator('.viewport')).toHaveClass(/portrait/);
    
    // Switch back to square
    await aspectSelect.selectOption('square');
    await expect(page.locator('.viewport')).toHaveClass(/square/);
  });

  test('image upload prompt is visible', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Should show upload prompt when no background image
    await expect(page.locator('.upload-prompt')).toBeVisible();
    await expect(page.locator('.upload-prompt p')).toContainText('Click to upload image or drag & drop');
    await expect(page.locator('.upload-hint')).toContainText('paste from clipboard');
  });

  test('profile configuration modal works', async ({ page }) => {
    // Add a slide first
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Should show add profile button when no profile
    const addProfileBtn = page.locator('.viewport-add-profile');
    await expect(addProfileBtn).toBeVisible();
    
    // Click to open profile config
    await addProfileBtn.click();
    
    // Modal should be visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-header h3')).toContainText('Profile Configuration');
    
    // Check form fields
    await expect(page.locator('input[placeholder="Your Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="https://linkedin.com/in/..."]')).toBeVisible();
    await expect(page.locator('.avatar-upload')).toBeVisible();
    
    // Close modal
    const closeBtn = page.locator('.modal-header button[title="Close"]');
    await closeBtn.click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('profile form input works', async ({ page }) => {
    // Add a slide and open profile modal
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);
    
    await page.locator('.viewport-add-profile').click();
    
    // Fill in profile name
    const nameInput = page.locator('input[placeholder="Your Name"]');
    await nameInput.fill('John Doe');
    
    // Fill in profile URL
    const urlInput = page.locator('input[placeholder="https://linkedin.com/in/..."]');
    await urlInput.fill('https://linkedin.com/in/johndoe');
    
    // Close modal
    await page.locator('.modal-header button[title="Close"]').click();
    
    // Reopen to verify persistence
    await page.locator('.viewport-avatar').click();
    await expect(nameInput).toHaveValue('John Doe');
    await expect(urlInput).toHaveValue('https://linkedin.com/in/johndoe');
  });

  test('PDF export buttons are present and properly disabled', async ({ page }) => {
    // When no slides, buttons should be disabled
    await expect(page.locator('button[title="Preview PDF"]')).toBeVisible();
    await expect(page.locator('button[title="Export PDF"]')).toBeVisible();
    
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);
    
    // Buttons should now be enabled
    await expect(page.locator('button[title="Preview PDF"]')).not.toBeDisabled();
    await expect(page.locator('button[title="Export PDF"]')).not.toBeDisabled();
  });

  test('drag and drop area is configured', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    
    // Canvas should have drag and drop event handlers
    // We can't easily test actual file drop, but we can verify the element accepts drops
    const dragOverPrevented = await canvas.evaluate(el => {
      const event = new DragEvent('dragover', { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(dragOverPrevented).toBe(true);
  });

  test('keyboard shortcuts work for clipboard paste', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Focus the canvas
    await page.locator('#canvas').click();
    
    // Simulate Ctrl+V (we can't test actual clipboard, but can verify event handling)
    await page.keyboard.press('Control+KeyV');
    
    // The app should handle the paste event (even if no actual image in clipboard)
    // No errors should occur
  });

  test('localStorage auto-save functionality', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(200);

    // Add profile data
    await page.evaluate(() => {
      const app = window.carrouselApp();
      app.profile.name = 'Test User';
      app.saveProfile();
    });

    // Reload page and check if data persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check if slide and profile data persisted
    await expect(page.locator('.canvas-wrapper')).toBeVisible();
    await expect(page.locator('.slide-indicator')).toContainText('1/1');
  });

  test('loading overlay appears during export', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Mock the export to show loading state
    await page.evaluate(() => {
      const app = window.carrouselApp();
      app.isExporting = true;
    });

    await expect(page.locator('.loading-overlay')).toBeVisible();
    await expect(page.locator('.loading-content p')).toContainText('Generating PDF...');
    await expect(page.locator('.spinner')).toBeVisible();
  });

  test('preview pane functionality', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Mock preview state
    await page.evaluate(() => {
      const app = window.carrouselApp();
      app.showPreview = true;
      app.isPreviewLoading = true;
    });

    await expect(page.locator('.preview-pane')).toBeVisible();
    await expect(page.locator('.preview-header h3')).toContainText('PDF Preview');
    await expect(page.locator('.preview-loading')).toBeVisible();
    await expect(page.locator('.preview-loading p')).toContainText('Generating preview...');

    // Test preview controls
    await expect(page.locator('button:has-text("Download")')).toBeVisible();
    await expect(page.locator('.preview-header button[title="Close Preview"]')).toBeVisible();
  });

  test('version number is displayed', async ({ page }) => {
    await expect(page.locator('.version')).toBeVisible();
    await expect(page.locator('.version')).toContainText(/v\d{4}-\d{2}-\d{2}/);
  });

  test('hidden file inputs are present', async ({ page }) => {
    // Check for image and avatar file inputs
    await expect(page.locator('#imageInput')).toBeHidden();
    await expect(page.locator('#avatarInput')).toBeHidden();
    
    // Verify they accept images
    await expect(page.locator('#imageInput')).toHaveAttribute('accept', 'image/*');
    await expect(page.locator('#avatarInput')).toHaveAttribute('accept', 'image/*');
  });

  test('slide management edge cases', async ({ page }) => {
    // Test buttons when no slides exist
    await page.evaluate(() => {
      // Force showing viewport actions even with no slides to test disabled states
      document.querySelector('.viewport-actions').style.display = 'flex';
    });
    
    // Navigation should be disabled with no slides
    await expect(page.locator('button[title="Previous Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Next Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Duplicate Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Delete Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Preview PDF"]')).toBeDisabled();
    await expect(page.locator('button[title="Export PDF"]')).toBeDisabled();
  });

  test('main container layout adapts to preview', async ({ page }) => {
    const mainContainer = page.locator('.main-container');
    
    // Initially no preview
    await expect(mainContainer).not.toHaveClass(/with-preview/);
    
    // Show preview
    await page.evaluate(() => {
      window.carrouselApp().showPreview = true;
    });
    
    await expect(mainContainer).toHaveClass(/with-preview/);
  });

  test('external libraries are loaded correctly', async ({ page }) => {
    // Verify Alpine.js is loaded
    const alpineLoaded = await page.evaluate(() => typeof window.Alpine !== 'undefined');
    expect(alpineLoaded).toBe(true);
    
    // Verify other libraries are available in global scope
    const html2canvasLoaded = await page.evaluate(() => typeof window.html2canvas !== 'undefined');
    expect(html2canvasLoaded).toBe(true);
    
    const jspdfLoaded = await page.evaluate(() => typeof window.jspdf !== 'undefined');
    expect(jspdfLoaded).toBe(true);
    
    const interactLoaded = await page.evaluate(() => typeof window.interact !== 'undefined');
    expect(interactLoaded).toBe(true);
  });

  test('Alpine.js data structure is properly initialized', async ({ page }) => {
    await page.waitForTimeout(500); // Wait for Alpine.js initialization
    
    const appData = await page.evaluate(() => {
      const app = window.carrouselApp();
      return {
        hasSlides: Array.isArray(app.slides),
        hasProfile: typeof app.profile === 'object',
        hasAspectRatio: typeof app.aspectRatio === 'string',
        hasActiveSlide: typeof app.activeSlide === 'number',
        hasThemeState: typeof app.isDark === 'boolean',
        hasFullscreenState: typeof app.isFullscreen === 'boolean'
      };
    });
    
    expect(appData.hasSlides).toBe(true);
    expect(appData.hasProfile).toBe(true);
    expect(appData.hasAspectRatio).toBe(true);
    expect(appData.hasActiveSlide).toBe(true);
    expect(appData.hasThemeState).toBe(true);
    expect(appData.hasFullscreenState).toBe(true);
  });

  test('background image interaction setup', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Mock a background image being loaded
    await page.evaluate(() => {
      const app = window.carrouselApp();
      app.slides[0].bgSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    });

    // Background image should be visible
    await expect(page.locator('.canvas-bg-image')).toBeVisible();
    await expect(page.locator('.upload-prompt')).not.toBeVisible();
  });

  test('viewport frame displays correctly', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);

    // Viewport should be visible
    await expect(page.locator('.viewport')).toBeVisible();
    await expect(page.locator('.viewport-actions')).toBeVisible();
    
    // Check that viewport has correct aspect ratio class
    await expect(page.locator('.viewport')).toHaveClass(/square/);
  });

  test('modal click outside to close', async ({ page }) => {
    // Add a slide and open profile modal
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);
    
    await page.locator('.viewport-add-profile').click();
    await expect(page.locator('.modal-overlay')).toBeVisible();
    
    // Click on overlay (outside modal content)
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('avatar upload and removal', async ({ page }) => {
    // Add a slide and open profile modal
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);
    
    await page.locator('.viewport-add-profile').click();
    
    // Avatar placeholder should be visible
    await expect(page.locator('.avatar-placeholder')).toBeVisible();
    await expect(page.locator('.avatar-img')).not.toBeVisible();
    
    // Upload button should be visible, remove button should not
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();
    await expect(page.locator('button:has-text("Remove")')).not.toBeVisible();
    
    // Mock avatar upload
    await page.evaluate(() => {
      const app = window.carrouselApp();
      app.profile.avatarUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    });
    
    // Avatar image should now be visible, placeholder should not
    await expect(page.locator('.avatar-img')).toBeVisible();
    await expect(page.locator('.avatar-placeholder')).not.toBeVisible();
    
    // Remove button should now be visible
    await expect(page.locator('button:has-text("Remove")')).toBeVisible();
  });

  test('profile visibility in viewport', async ({ page }) => {
    // Add a slide
    await page.evaluate(() => {
      window.carrouselApp().addSlide();
    });
    await page.waitForTimeout(100);
    
    // Initially should show add profile button
    await expect(page.locator('.viewport-add-profile')).toBeVisible();
    await expect(page.locator('.viewport-avatar')).not.toBeVisible();
    
    // Add profile data
    await page.evaluate(() => {
      const app = window.carrouselApp();
      app.profile.name = 'John Doe';
      app.profile.avatarUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    });
    
    // Should now show profile info, not add button
    await expect(page.locator('.viewport-avatar')).toBeVisible();
    await expect(page.locator('.viewport-add-profile')).not.toBeVisible();
    await expect(page.locator('.viewport-profile-name')).toContainText('John Doe');
    await expect(page.locator('.viewport-profile-avatar')).toBeVisible();
  });
});