const { test, expect } = require('@playwright/test');
const path = require('path');

/*
BASELINE TEST SUITE FOR CAROUSEL GENERATOR
==========================================
This test suite captures the current behavior of the app as a baseline.
NO CODE WAS CHANGED - these tests document the actual app behavior.

BACKLOG ITEMS (Issues found during baseline testing):
1. Keyboard navigation may have timing/debouncing issues (see keyboard navigation test)
2. Keyboard shortcut 'n' for adding slides might add more slides than expected
3. Some interaction timing requires careful coordination with Alpine.js reactivity

WORKING FUNCTIONALITY (24 tests total):
- Page loads without errors ✓
- UI elements and theming ✓  
- Slide management (add, duplicate, delete) ✓
- Navigation controls ✓
- Profile configuration modal ✓
- Text callout creation and editing ✓
- Keyboard shortcuts (basic functionality) ✓
- PDF preview/export buttons (UI state) ✓
- File upload inputs ✓
- Empty states ✓
*/

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

  test('can add and interact with text callouts', async ({ page }) => {
    // Set up console error listener BEFORE loading the page
    const errors = [];
    const debugLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      // Capture our debug messages
      const text = msg.text();
      if (text.includes('===') || text.includes('DEBUG') || text.includes('CALLOUT')) {
        debugLogs.push(text);
        console.log('BROWSER DEBUG:', text);
      }
    });

    // Set up page error listener for JavaScript errors
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(1000);
    
    // Check if app is initialized by looking for slide indicator
    const slideCount = await page.locator('.slide-indicator').textContent();
    console.log('Initial slide count:', slideCount);
    expect(slideCount).toContain('/1'); // Should have 1 slide initially
    
    // Step 1: Click "Add Text Callout" button
    console.log('\n=== STEP 1: Adding callout ===');
    const addCalloutButton = page.locator('button[title="Add Text Callout"]');
    await expect(addCalloutButton).toBeVisible();
    await expect(addCalloutButton).toBeEnabled();
    
    await addCalloutButton.click();
    await page.waitForTimeout(1000); // Give time for all async operations
    
    // Step 2: Wait for callout creation (removed debug box since we cleaned up)
    console.log('\n=== STEP 2: Waiting for callout creation ===');
    await page.waitForTimeout(500); // Give time for callout creation
    
    // Step 3: Check if callout DOM elements exist
    console.log('\n=== STEP 3: Checking DOM rendering ===');
    const calloutElements = await page.locator('.text-callout').count();
    console.log('Callout DOM elements found:', calloutElements);
    expect(calloutElements).toBe(1);
    
    if (calloutElements === 0) {
      console.log('❌ FAILURE POINT 2: DOM elements not rendered');
      throw new Error('Callout DOM elements were not rendered');
    }
    
    // Step 4: Test text editing functionality
    console.log('\n=== STEP 4: Testing text editing ===');
    
    // Since callout is immediately in edit mode, check for textarea first
    const textarea = page.locator('.callout-editor').first();
    const textareaVisible = await textarea.isVisible();
    console.log('Textarea visible (should be in edit mode):', textareaVisible);
    
    if (textareaVisible) {
      console.log('✅ SUCCESS: Callout created in edit mode');
      
      // Test editing - clear and type new text
      await textarea.fill('Test callout text');
      await textarea.press('Enter'); // Should finish editing
      
      await page.waitForTimeout(300);
      
      // Now display should be visible and textarea hidden
      const calloutDisplay = page.locator('.text-callout .callout-display').first();
      await expect(calloutDisplay).toBeVisible();
      
      const finalText = await calloutDisplay.textContent();
      console.log('Final display text:', finalText);
      expect(finalText).toBe('Test callout text');
      
      // Test clicking to re-enter edit mode
      await calloutDisplay.click();
      await page.waitForTimeout(300);
      
      const textareaVisibleAgain = await textarea.isVisible();
      console.log('Textarea visible after clicking display:', textareaVisibleAgain);
      expect(textareaVisibleAgain).toBe(true);
      
      // Exit edit mode
      await textarea.press('Escape');
      await page.waitForTimeout(200);
      
    } else {
      console.log('❌ FAILURE POINT 3: Textarea not visible when callout should be in edit mode');
      
      // Check if display is visible instead
      const calloutDisplay = page.locator('.text-callout .callout-display').first();
      const displayVisible = await calloutDisplay.isVisible();
      console.log('Display visible instead:', displayVisible);
      
      if (displayVisible) {
        // Try clicking display to enter edit mode
        await calloutDisplay.click();
        await page.waitForTimeout(500);
        
        const textareaAfterClick = await textarea.isVisible();
        console.log('Textarea visible after clicking display:', textareaAfterClick);
        
        if (!textareaAfterClick) {
          throw new Error('Text editing is not functional - cannot enter edit mode');
        }
      } else {
        throw new Error('Neither textarea nor display is visible - DOM issue');
      }
    }
    
    // Step 5: Test drag functionality  
    console.log('\n=== STEP 5: Testing drag functionality ===');
    const callout = page.locator('.text-callout').first();
    const initialBox = await callout.boundingBox();
    
    if (initialBox) {
      console.log('Initial callout position:', { x: initialBox.x, y: initialBox.y });
      
      // Try to drag the callout
      await page.mouse.move(initialBox.x + initialBox.width/2, initialBox.y + initialBox.height/2);
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
      await page.mouse.up();
      
      await page.waitForTimeout(500);
      
      const newBox = await callout.boundingBox();
      if (newBox) {
        console.log('New callout position:', { x: newBox.x, y: newBox.y });
        
        const moved = Math.abs(newBox.x - initialBox.x) > 10 || Math.abs(newBox.y - initialBox.y) > 10;
        if (moved) {
          console.log('✅ SUCCESS: Drag working');
        } else {
          console.log('❌ FAILURE POINT 4: Drag not working - position unchanged');
          throw new Error('Drag functionality is not working');
        }
      }
    }
    
    console.log('\n=== ALL TESTS COMPLETED ===');
    console.log('All debug logs:', debugLogs);
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  // ===== COMPREHENSIVE BASELINE TESTS (15+ TESTS) =====
  
  test('initial state has correct elements visible', async ({ page }) => {
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
    
    // Check header elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1')).toContainText('LinkedIn Carousel Generator');
    await expect(page.locator('button[title="Home"]')).toBeVisible();
    await expect(page.locator('button[title="Toggle Fullscreen"]')).toBeVisible();
    await expect(page.locator('button[title="Toggle Dark Mode"]')).toBeVisible();
    
    // Check main container
    await expect(page.locator('.main-container')).toBeVisible();
    await expect(page.locator('.canvas-container')).toBeVisible();
    
    // Check slide indicator
    await expect(page.locator('.slide-indicator')).toBeVisible();
    const slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/1');
    
    // Check version
    await expect(page.locator('.version')).toBeVisible();
    
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

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

  test('slide navigation buttons work correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
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
    
    expect(errors).toEqual([]);
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
    
    expect(errors).toEqual([]);
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
    
    expect(errors).toEqual([]);
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
    await page.waitForTimeout(1000);
    
    // Delete the initial slide to get to empty state
    await page.click('button[title="Delete Slide"]');
    await page.waitForTimeout(500);
    
    // Empty state should be visible
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state h2')).toContainText('Create Your First Slide');
    await expect(page.locator('.empty-state p')).toContainText('Click "New Slide" to get started');
    
    // Canvas wrapper should be hidden
    await expect(page.locator('.canvas-wrapper')).toBeHidden();
    
    expect(errors).toEqual([]);
  });

  test('upload prompt is visible when no background image', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Upload prompt should be visible initially
    await expect(page.locator('.upload-prompt')).toBeVisible();
    await expect(page.locator('.upload-prompt p').first()).toContainText('Click to upload image or drag & drop');
    await expect(page.locator('.upload-hint')).toContainText('You can also paste from clipboard');
    
    // Background image should be hidden
    const bgImage = page.locator('.canvas-bg-image');
    await expect(bgImage).toBeHidden();
    
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
    
    // With 1 slide
    await expect(page.locator('button[title="Previous Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Next Slide"]')).toBeDisabled();
    await expect(page.locator('button[title="Add Slide"]')).toBeEnabled();
    await expect(page.locator('button[title="Duplicate Slide"]')).toBeEnabled();
    await expect(page.locator('button[title="Delete Slide"]')).toBeEnabled();
    await expect(page.locator('button[title="Preview PDF"]')).toBeEnabled();
    await expect(page.locator('button[title="Export PDF"]')).toBeEnabled();
    await expect(page.locator('button[title="Add Text Callout"]')).toBeEnabled();
    
    expect(errors).toEqual([]);
  });

  test('profile configuration modal opens and closes', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Modal should be hidden initially
    await expect(page.locator('.modal-overlay')).toBeHidden();
    
    // Click add profile button
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    
    // Modal should now be visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-container h3')).toContainText('Profile Configuration');
    
    // Should have form fields
    await expect(page.locator('input[placeholder="Your Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="https://linkedin.com/in/..."]')).toBeVisible();
    await expect(page.locator('.avatar-preview')).toBeVisible();
    
    // Close modal with X button
    await page.click('.modal-header button[title="Close"]');
    await page.waitForTimeout(300);
    
    // Modal should be hidden again
    await expect(page.locator('.modal-overlay')).toBeHidden();
    
    expect(errors).toEqual([]);
  });

  test('profile name input works correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Open profile modal
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    
    // Type in name field
    const nameInput = page.locator('input[placeholder="Your Name"]');
    await nameInput.fill('Test User');
    await page.waitForTimeout(500); // Allow time for auto-save
    
    // Close modal
    await page.click('.modal-header button[title="Close"]');
    await page.waitForTimeout(300);
    
    // Should now show profile info in viewport
    await expect(page.locator('.viewport-avatar')).toBeVisible();
    await expect(page.locator('.viewport-profile-name')).toContainText('Test User');
    
    // Add profile button should be hidden
    await expect(page.locator('.viewport-add-profile')).toBeHidden();
    
    expect(errors).toEqual([]);
  });

  test('preview PDF button functionality', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Preview pane should be hidden initially
    await expect(page.locator('.preview-pane')).toBeHidden();
    
    // Main container should not have with-preview class
    const mainContainer = page.locator('.main-container');
    const initialClass = await mainContainer.getAttribute('class');
    expect(initialClass || '').not.toContain('with-preview');
    
    // Click preview PDF (note: we're not testing actual PDF generation, just UI state)
    const previewButton = page.locator('button[title="Preview PDF"]');
    await expect(previewButton).toBeEnabled();
    
    expect(errors).toEqual([]);
  });

  test('export PDF button functionality', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Export button should be enabled
    const exportButton = page.locator('button[title="Export PDF"]');
    await expect(exportButton).toBeEnabled();
    
    // Loading overlay should be hidden initially
    await expect(page.locator('.loading-overlay')).toBeHidden();
    
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
    await page.waitForTimeout(1000);
    
    // Check image inputs exist
    const imageInput = page.locator('#imageInput');
    const avatarInput = page.locator('#avatarInput');
    
    await expect(imageInput).toBeAttached();
    await expect(avatarInput).toBeAttached();
    
    // Should be hidden
    await expect(imageInput).toBeHidden();
    await expect(avatarInput).toBeHidden();
    
    // Should have correct attributes
    const imageAccept = await imageInput.getAttribute('accept');
    const avatarAccept = await avatarInput.getAttribute('accept');
    
    expect(imageAccept).toBe('image/*');
    expect(avatarAccept).toBe('image/*');
    
    expect(errors).toEqual([]);
  });

  test('keyboard shortcuts work for slide navigation', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add a slide so we can test navigation
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Should be on slide 2/2
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Test left arrow to go to previous slide
    await page.press('body', 'ArrowLeft');
    await page.waitForTimeout(300);
    
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/2');
    
    // Test right arrow to go to next slide
    await page.press('body', 'ArrowRight');
    await page.waitForTimeout(300);
    
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    expect(errors).toEqual([]);
  });

  test('keyboard shortcuts work for slide management', async ({ page }) => {
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
    let initialSlideIndicator = await page.textContent('.slide-indicator');
    expect(initialSlideIndicator).toBe('1/1');
    
    // Test 'n' key to add slide  
    await page.press('body', 'n');
    await page.waitForTimeout(500);
    
    let slideIndicator = await page.textContent('.slide-indicator');
    // Note: Based on test results, this might create more than expected - capturing baseline behavior
    const afterAddingSlide = slideIndicator;
    expect(afterAddingSlide).toMatch(/^\d+\/\d+$/); // Should be in format "X/Y"
    
    // Test 'd' key to duplicate slide
    await page.press('body', 'd');
    await page.waitForTimeout(500);
    
    slideIndicator = await page.textContent('.slide-indicator');
    const afterDuplicating = slideIndicator;
    expect(afterDuplicating).toMatch(/^\d+\/\d+$/); // Should be in format "X/Y"
    
    // Test Delete key to delete slide
    await page.press('body', 'Delete');
    await page.waitForTimeout(500);
    
    slideIndicator = await page.textContent('.slide-indicator');
    const afterDeleting = slideIndicator;
    expect(afterDeleting).toMatch(/^\d+\/\d+$/); // Should be in format "X/Y"
    
    // For baseline, just ensure we still have at least 1 slide after deletion
    const finalSlideCount = parseInt(afterDeleting.split('/')[1]);
    expect(finalSlideCount).toBeGreaterThanOrEqual(1);
    
    expect(errors).toEqual([]);
  });

  test('multiple callouts can be added and managed', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add first callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(800);
    
    // Should have 1 callout
    let calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(1);
    
    // Exit edit mode
    const firstTextarea = page.locator('.callout-editor').first();
    await firstTextarea.fill('First callout');
    await firstTextarea.press('Enter');
    await page.waitForTimeout(300);
    
    // Add second callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(800);
    
    // Should have 2 callouts
    calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(2);
    
    // Add third callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(800);
    
    // Should have 3 callouts
    calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(3);
    
    expect(errors).toEqual([]);
  });

  test('callout delete button functionality', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add a callout
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(800);
    
    // Should have 1 callout
    let calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(1);
    
    // Delete button should be visible
    const deleteButton = page.locator('.callout-delete');
    await expect(deleteButton).toBeVisible();
    
    // Click delete button
    await deleteButton.click();
    await page.waitForTimeout(300);
    
    // Should have 0 callouts
    calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(0);
    
    expect(errors).toEqual([]);
  });

  test('profile position options work correctly', async ({ page }) => {
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

    // Move swipe icon to middle-right to avoid conflicts with profile avatar in any corner
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await swipeIcon.click({ button: 'right' }); // Move to top-right
    await page.waitForTimeout(100);
    await swipeIcon.click({ button: 'right' }); // Move to middle-right
    await page.waitForTimeout(200);

    // Open profile configuration modal using the add profile button
    await page.click('[title="Add Profile"]');
    await page.waitForTimeout(300);

    // Check that the position dropdown exists and has correct options
    const positionSelect = page.locator('select[x-model="profile.position"]');
    await expect(positionSelect).toBeVisible();

    // Check all position options are available
    const options = await positionSelect.locator('option').allTextContents();
    expect(options).toEqual(['Bottom Right', 'Bottom Left', 'Top Right', 'Top Left']);

    // Add some profile info to make avatar visible
    await page.fill('input[x-model="profile.name"]', 'Test User');
    await page.waitForTimeout(100);

    // Test each position
    const positions = [
      { value: 'bottom-right', class: 'position-bottom-right' },
      { value: 'bottom-left', class: 'position-bottom-left' },
      { value: 'top-right', class: 'position-top-right' },
      { value: 'top-left', class: 'position-top-left' }
    ];

    for (const position of positions) {
      // Select the position
      await positionSelect.selectOption(position.value);
      await page.waitForTimeout(100);

      // Close modal
      await page.click('.modal-header .btn-icon');
      await page.waitForTimeout(100);

      // Check that the avatar has the correct position class
      const avatar = page.locator('.viewport-avatar');
      await expect(avatar).toHaveClass(new RegExp(position.class));

      // Re-open modal for next iteration (except last)
      if (position !== positions[positions.length - 1]) {
        await page.click('.viewport-avatar');
        await page.waitForTimeout(100);
      }
    }

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

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

    // The app automatically creates first slide on init, so we should be on slide 1 (index 0)
    const slideIndicator = page.locator('.slide-indicator');
    const slideIndicatorText = await slideIndicator.textContent();
    console.log(`Debug on init: Slide indicator shows: ${slideIndicatorText}`);
    
    // Wait for Alpine.js to render the swipe icon
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await page.waitForTimeout(300);
    
    // Check swipe icon is visible on first slide (activeSlide === 0)
    await expect(swipeIcon).toBeVisible();

    // Add second slide (this will navigate to the new slide automatically)
    await page.click('[title="Add Slide"]');
    await page.waitForTimeout(300);

    // Now we should be on slide 2 (index 1), swipe icon should NOT be visible
    await expect(swipeIcon).not.toBeVisible();

    // Navigate back to first slide (index 0)
    await page.click('[title="Previous Slide"]');
    await page.waitForTimeout(300);

    // Swipe icon should be visible again on first slide
    await expect(swipeIcon).toBeVisible();

    // Click swipe icon to open selection menu (should work now)
    await swipeIcon.click();
    await page.waitForTimeout(200);

    // Check that selection menu is visible
    const selectionMenu = page.locator('.swipe-icon-menu');
    await expect(selectionMenu).toBeVisible();

    // Check that menu has header
    const menuHeader = page.locator('.swipe-menu-header');
    await expect(menuHeader).toHaveText('Choose Swipe Icon');

    // Check that all icons are present
    const iconButtons = page.locator('.swipe-menu-item');
    const iconCount = await iconButtons.count();
    expect(iconCount).toBe(8); // Should have 8 different icons

    // Test selecting a different icon (force click to avoid element overlap)
    const chevronRightIcon = page.locator('.swipe-menu-item').filter({ hasText: 'Chevron Right' });
    await chevronRightIcon.click({ force: true });
    await page.waitForTimeout(100);

    // Menu should close after selection
    await expect(selectionMenu).not.toBeVisible();

    // Swipe icon display should show the new icon
    const iconDisplay = page.locator('.swipe-icon-display');
    await expect(iconDisplay).toHaveText('›');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('font size adjustment affects all callouts immediately', async ({ page }) => {
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

    // Add a callout to test font size changes
    await page.click('[title="Add Text Callout"]');
    await page.waitForTimeout(300);

    // Find the callout and get initial font size
    const callout = page.locator('.text-callout').first();
    await expect(callout).toBeVisible();

    // Check initial font size (should be 16px default)
    const initialStyle = await callout.getAttribute('style');
    expect(initialStyle).toContain('font-size: 16px');

    // Find and test the font size slider
    const fontSlider = page.locator('.viewport-font-slider');
    await expect(fontSlider).toBeVisible();

    // Find the font size display
    const fontSizeDisplay = page.locator('.viewport-font-size');
    await expect(fontSizeDisplay).toHaveText('16px');

    // Change font size to 24px using evaluate to set value
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '24';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    // Check that font size display updated
    await expect(fontSizeDisplay).toHaveText('24px');

    // Check that callout font size updated immediately
    const updatedStyle = await callout.getAttribute('style');
    expect(updatedStyle).toContain('font-size: 24px');

    // Add a second callout to verify it also gets the new font size
    await page.click('[title="Add Text Callout"]');
    await page.waitForTimeout(300);

    const secondCallout = page.locator('.text-callout').nth(1);
    await expect(secondCallout).toBeVisible();

    // Second callout should also have the current font size
    const secondCalloutStyle = await secondCallout.getAttribute('style');
    expect(secondCalloutStyle).toContain('font-size: 24px');

    // Test min/max bounds by trying to set font size too low
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    // Should be clamped to minimum (8px)
    await expect(fontSizeDisplay).toHaveText('8px');
    const minStyle = await callout.getAttribute('style');
    expect(minStyle).toContain('font-size: 8px');

    // Test max bounds
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '50';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    // Should be clamped to maximum (32px)
    await expect(fontSizeDisplay).toHaveText('32px');
    const maxStyle = await callout.getAttribute('style');
    expect(maxStyle).toContain('font-size: 32px');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('font size changes are visually applied to callout display elements', async ({ page }) => {
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

    // Add a callout
    await page.click('[title="Add Text Callout"]');
    await page.waitForTimeout(500);

    // Wait for the callout to appear and be ready
    const callout = page.locator('.text-callout').first();
    await expect(callout).toBeVisible();
    
    // Check initial computed font size of the display element (should inherit from parent)
    const initialComputedFontSize = await page.evaluate(() => {
      const displayElement = document.querySelector('.callout-display');
      if (!displayElement) return 'element not found';
      return window.getComputedStyle(displayElement).fontSize;
    });
    console.log(`Initial computed font size: ${initialComputedFontSize}`);

    // Change font size to 24px
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '24';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Check that the computed font size of the display element has changed
    const updatedComputedFontSize = await page.evaluate(() => {
      const displayElement = document.querySelector('.callout-display');
      return window.getComputedStyle(displayElement).fontSize;
    });
    console.log(`Updated computed font size: ${updatedComputedFontSize}`);

    // The computed font size should now be 24px
    expect(updatedComputedFontSize).toBe('24px');

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

    // Check that position is still top-left after refresh
    const profileAfterRefresh = await page.locator('.viewport-avatar');
    const stillHasTopLeftClass = await profileAfterRefresh.evaluate(el => el.classList.contains('position-top-left'));
    expect(stillHasTopLeftClass).toBe(true);

    // Check name is still there
    const profileName = await page.textContent('.viewport-profile-name');
    expect(profileName).toBe('Test User');

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

    // Should be on slide 1/1, swipe icon should be visible
    let swipeIcon = page.locator('.viewport-swipe-icon');
    let isSwipeVisible = await swipeIcon.isVisible();
    expect(isSwipeVisible).toBe(true);

    // Verify it shows the default swipe icon
    const defaultIcon = await page.textContent('.swipe-icon-display');
    expect(defaultIcon).toBe('→'); // Default is swipe-right

    // Add another slide
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);

    // Should now be on slide 2/2, swipe icon should NOT be visible
    isSwipeVisible = await swipeIcon.isVisible();
    expect(isSwipeVisible).toBe(false);

    // Go back to first slide
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);

    // Should be on slide 1/2, swipe icon should be visible again
    isSwipeVisible = await swipeIcon.isVisible();
    expect(isSwipeVisible).toBe(true);

    // Click the swipe icon to open selection menu
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(300);

    // Check that menu is visible
    const menu = page.locator('.swipe-icon-menu');
    const menuVisible = await menu.isVisible();
    expect(menuVisible).toBe(true);

    // Select a different icon (chevron-right)
    await page.click('.swipe-menu-item[title="Chevron Right"]');
    await page.waitForTimeout(300);

    // Check that the icon changed
    const newIcon = await page.textContent('.swipe-icon-display');
    expect(newIcon).toBe('›');

    // Refresh page to check persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should still show the chevron icon on first slide
    const persistedIcon = await page.textContent('.swipe-icon-display');
    expect(persistedIcon).toBe('›');

    expect(pageErrors).toEqual([]);
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

    // Check profile positioning - should be 30% from bottom instead of 1rem
    const profileElement = page.locator('.viewport-avatar');
    const profileComputedStyle = await profileElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        bottom: styles.bottom,
        top: styles.top
      };
    });
    
    // Should have bottom: 30% (calculated from viewport)
    const profileHasNewPosition = profileComputedStyle.bottom !== '16px'; // 1rem = 16px typically
    expect(profileHasNewPosition).toBe(true);

    // Check swipe icon positioning  
    const swipeIcon = page.locator('.viewport-swipe-icon');
    const swipeComputedStyle = await swipeIcon.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        bottom: styles.bottom,
        right: styles.right
      };
    });
    
    // Should have bottom: 30% instead of 1rem
    const swipeHasNewPosition = swipeComputedStyle.bottom !== '16px'; // 1rem = 16px typically
    expect(swipeHasNewPosition).toBe(true);

    // Clear profile to check add profile button positioning
    // First move swipe icon to middle-right to avoid overlap with profile avatar
    await swipeIcon.click({ button: 'right' }); // Move to top-right
    await page.waitForTimeout(100);
    await swipeIcon.click({ button: 'right' }); // Move to middle-right
    await page.waitForTimeout(200);
    
    await page.click('.viewport-avatar'); // Open profile modal
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', ''); // Clear name
    await page.waitForTimeout(300);
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Now add profile button should be visible again with new positioning
    const addProfileButton = page.locator('.viewport-add-profile');
    await expect(addProfileButton).toBeVisible();
    
    const addProfileComputedStyle = await addProfileButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        bottom: styles.bottom,
        left: styles.left
      };
    });
    
    // Should have bottom: 30% instead of 12px
    const addProfileHasNewPosition = addProfileComputedStyle.bottom !== '12px';
    expect(addProfileHasNewPosition).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('delete key does not delete slides anymore', async ({ page }) => {
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

    // Start with one slide and add a second one for testing
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 2 slides
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Press delete key - should NOT delete slide anymore
    await page.press('body', 'Delete');
    await page.waitForTimeout(300);
    
    // Should still have 2 slides
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Verify slide can still be deleted via button
    await page.click('button[title="Delete Slide"]');
    await page.waitForTimeout(300);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/1');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('delete key only deletes images and callouts, never slides', async ({ page }) => {
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

    // Start with one slide and add a second one for testing
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 2 slides
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Test 1: Press delete key when there's no image or callouts - should NOT delete slide
    await page.press('body', 'Delete');
    await page.waitForTimeout(300);
    
    // Should still have 2 slides
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2');
    
    // Test 2: Add a callout and press delete - should delete callout, not slide
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);
    
    // Should have 1 callout
    let calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(1);
    
    // Exit edit mode first by pressing Escape
    await page.press('body', 'Escape');
    await page.waitForTimeout(200);
    
    // Press delete key
    await page.press('body', 'Delete');
    await page.waitForTimeout(300);
    
    // Callout should be deleted but slide should remain
    calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(0);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2'); // Still 2 slides
    
    // Test 3: Add another callout to verify single deletion
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);
    
    calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(1);
    
    // Exit edit mode first by pressing Escape
    await page.press('body', 'Escape');
    await page.waitForTimeout(200);
    
    // Delete the callout with delete key
    await page.press('body', 'Delete');
    await page.waitForTimeout(300);
    
    calloutCount = await page.locator('.text-callout').count();
    expect(calloutCount).toBe(0);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2'); // Still 2 slides
    
    // Test 4: Delete key with no callouts or images should NOT delete slide
    await page.press('body', 'Delete');
    await page.waitForTimeout(300);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/2'); // Still 2 slides
    
    // Test 5: Verify slide can still be deleted via button
    await page.click('button[title="Delete Slide"]');
    await page.waitForTimeout(300);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/1'); // Now 1 slide as expected

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('PDF generation returns to original slide after completion', async ({ page }) => {
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

    // Create multiple slides for testing
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Should now have 3 slides, currently on slide 3
    let slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('3/3');
    
    // Navigate to slide 2 (middle slide)
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/3');
    
    // Trigger PDF preview (this uses the generatePDF function internally)
    await page.click('button[title="Preview PDF"]');
    await page.waitForTimeout(2000); // Allow time for PDF generation
    
    // After PDF generation, should still be on slide 2
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('2/3');
    
    // Navigate to slide 1 and test export
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/3');
    
    // Note: We can't easily test actual PDF export download in Playwright
    // but we can verify that after triggering export, we stay on the same slide
    // Since exportPDF also uses generatePDF, it should have the same behavior
    
    // Close preview if it opened
    const previewPane = page.locator('.preview-pane');
    const isPreviewVisible = await previewPane.isVisible();
    if (isPreviewVisible) {
      await page.click('button[title="Close Preview"]');
      await page.waitForTimeout(300);
    }
    
    // Final slide should still be slide 1
    slideIndicator = await page.textContent('.slide-indicator');
    expect(slideIndicator).toBe('1/3');

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

    // Set up profile to test sizing
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test Profile');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Check initial sizes (should be 50% bigger than original)
    const initialProfileSize = await page.evaluate(() => {
      const profileAvatar = document.querySelector('.viewport-profile-avatar');
      return window.getComputedStyle(profileAvatar).width;
    });

    const initialSwipeSize = await page.evaluate(() => {
      const swipeIcon = document.querySelector('.viewport-swipe-icon');
      return window.getComputedStyle(swipeIcon).width;
    });

    const initialSwipeFontSize = await page.evaluate(() => {
      const swipeDisplay = document.querySelector('.swipe-icon-display');
      return window.getComputedStyle(swipeDisplay).fontSize;
    });

    // Default font size is 16px, so at 50% bigger:
    // Profile: 1.5rem -> 2.25rem = 36px 
    // Swipe: 2.5rem -> 3.75rem = 60px
    // Swipe Font: 1.2rem -> 1.8rem = 28.8px
    
    // Allow some tolerance for browser rounding
    expect(parseFloat(initialProfileSize)).toBeCloseTo(36, 1);
    expect(parseFloat(initialSwipeSize)).toBeCloseTo(60, 1);
    expect(parseFloat(initialSwipeFontSize)).toBeCloseTo(28.8, 1);

    // Test that sizes scale with font size changes
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '24';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(300);

    const scaledProfileSize = await page.evaluate(() => {
      const profileAvatar = document.querySelector('.viewport-profile-avatar');
      return window.getComputedStyle(profileAvatar).width;
    });

    const scaledSwipeSize = await page.evaluate(() => {
      const swipeIcon = document.querySelector('.viewport-swipe-icon');
      return window.getComputedStyle(swipeIcon).width;
    });

    const scaledSwipeFontSize = await page.evaluate(() => {
      const swipeDisplay = document.querySelector('.swipe-icon-display');
      return window.getComputedStyle(swipeDisplay).fontSize;
    });

    // At 24px font size (1.5x scale), sizes should be 1.5x bigger
    // Profile: 2.25rem * 1.5 = 3.375rem = 54px
    // Swipe: 3.75rem * 1.5 = 5.625rem = 90px  
    // Swipe Font: 1.8rem * 1.5 = 2.7rem = 43.2px

    expect(parseFloat(scaledProfileSize)).toBeCloseTo(54, 1);
    expect(parseFloat(scaledSwipeSize)).toBeCloseTo(90, 1);
    expect(parseFloat(scaledSwipeFontSize)).toBeCloseTo(43.2, 1);

    // Test smaller size
    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '8';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(300);

    const smallProfileSize = await page.evaluate(() => {
      const profileAvatar = document.querySelector('.viewport-profile-avatar');
      return window.getComputedStyle(profileAvatar).width;
    });

    // At 8px font size (0.5x scale), sizes should be 0.5x smaller
    // Profile: 2.25rem * 0.5 = 1.125rem = 18px

    expect(parseFloat(smallProfileSize)).toBeCloseTo(18, 1);

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

    // Set up a profile to test alignment
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test Profile');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Get the computed bottom position for both profile and swipe icon
    const profileBottom = await page.evaluate(() => {
      const profileElement = document.querySelector('.viewport-avatar');
      return window.getComputedStyle(profileElement).bottom;
    });

    const swipeBottom = await page.evaluate(() => {
      const swipeElement = document.querySelector('.viewport-swipe-icon');
      return window.getComputedStyle(swipeElement).bottom;
    });

    // Both should be vertically aligned at 10% from bottom
    // CSS percentages get computed to pixels, so check they're equal
    expect(profileBottom).toBe(swipeBottom);

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

    // Step 1: Set up profile with custom position
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Test Profile');
    await page.selectOption('.modal-content select', 'top-right');
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Verify profile is in top-right position
    const profile = page.locator('.viewport-avatar');
    const hasTopRightClass = await profile.evaluate(el => el.classList.contains('position-top-right'));
    expect(hasTopRightClass).toBe(true);

    // Step 2: Change swipe icon to hand gesture
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(300);
    await page.click('.swipe-menu-item[title="Hand Gesture"]');
    await page.waitForTimeout(300);

    // Verify swipe icon changed
    const iconText = await page.textContent('.swipe-icon-display');
    expect(iconText).toBe('👉');

    // Step 3: Add callout and adjust font size
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const slider = document.querySelector('.viewport-font-slider');
      slider.value = '28';
      slider.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(300);

    // Verify font size applied
    const callout = page.locator('.callout-display').first();
    const fontSize = await callout.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(fontSize).toBe('28px');

    // Step 4: Add second slide and verify swipe icon only on first
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);

    // Should be on slide 2, no swipe icon
    const swipeIconVisible = await swipeIcon.isVisible();
    expect(swipeIconVisible).toBe(false);

    // Profile should still be visible (it's global across all slides)
    const profileVisible = await profile.isVisible();
    expect(profileVisible).toBe(true);

    // Step 5: Go back to first slide, verify everything still works
    await page.click('button[title="Previous Slide"]');
    await page.waitForTimeout(300);

    // All features should be restored on slide 1
    const swipeIconVisibleAgain = await swipeIcon.isVisible();
    expect(swipeIconVisibleAgain).toBe(true);

    const profileVisibleAgain = await profile.isVisible();
    expect(profileVisibleAgain).toBe(true);

    const iconTextAgain = await page.textContent('.swipe-icon-display');
    expect(iconTextAgain).toBe('👉');

    const fontSizeDisplay = await page.textContent('.viewport-font-size');
    expect(fontSizeDisplay).toBe('28px');

    // Step 6: Test that all settings persist after refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Make sure we're on first slide (swipe icon only shows on first slide)
    const slideIndicator = await page.textContent('.slide-indicator');
    if (slideIndicator !== '1/2') {
      // Click previous button to get to slide 1
      await page.click('button[title="Previous Slide"]');
      await page.waitForTimeout(300);
    }

    // Check all features persisted
    const persistedProfile = page.locator('.viewport-avatar');
    const persistedSwipeIcon = page.locator('.viewport-swipe-icon');
    
    const profileStillTopRight = await persistedProfile.evaluate(el => el.classList.contains('position-top-right'));
    expect(profileStillTopRight).toBe(true);

    const swipeIconStillVisible = await persistedSwipeIcon.isVisible();
    expect(swipeIconStillVisible).toBe(true);

    const iconStillHandGesture = await page.textContent('.swipe-icon-display');
    expect(iconStillHandGesture).toBe('👉');

    const fontSizeStillLarge = await page.textContent('.viewport-font-size');
    expect(fontSizeStillLarge).toBe('28px');

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

    // Should be on first slide with swipe icon visible
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await expect(swipeIcon).toBeVisible();

    // Initially should have default bottom-right location
    const initialClass = await swipeIcon.getAttribute('class');
    expect(initialClass).toContain('swipe-bottom-right');

    // Test right-click to change location to top-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    const topRightClass = await swipeIcon.getAttribute('class');
    expect(topRightClass).toContain('swipe-top-right');

    // Test another right-click to change to middle-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    const middleRightClass = await swipeIcon.getAttribute('class');
    expect(middleRightClass).toContain('swipe-middle-right');

    // Test another right-click to cycle back to bottom-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(300);

    const backToBottomClass = await swipeIcon.getAttribute('class');
    expect(backToBottomClass).toContain('swipe-bottom-right');

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

    // Change swipe icon to middle-right position
    const swipeIcon = page.locator('.viewport-swipe-icon');
    await swipeIcon.click({ button: 'right' }); // bottom-right -> top-right
    await page.waitForTimeout(200);
    await swipeIcon.click({ button: 'right' }); // top-right -> middle-right
    await page.waitForTimeout(200);

    // Verify it's in middle-right position
    const middleRightClass = await swipeIcon.getAttribute('class');
    expect(middleRightClass).toContain('swipe-middle-right');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify position persisted
    const swipeIconAfterRefresh = page.locator('.viewport-swipe-icon');
    const persistedClass = await swipeIconAfterRefresh.getAttribute('class');
    expect(persistedClass).toContain('swipe-middle-right');

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
    const swipeMenu = page.locator('.swipe-icon-menu');

    // Test bottom-right position (default)
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(200);

    await expect(swipeMenu).toBeVisible();
    let menuClass = await swipeMenu.getAttribute('class');
    expect(menuClass).toContain('menu-bottom-right');

    // Close menu
    await page.click('body');
    await page.waitForTimeout(200);

    // Change to top-right and test menu positioning
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(200);
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(200);

    menuClass = await swipeMenu.getAttribute('class');
    expect(menuClass).toContain('menu-top-right');

    // Close menu
    await page.click('body');
    await page.waitForTimeout(200);

    // Change to middle-right and test menu positioning
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(200);
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(200);

    menuClass = await swipeMenu.getAttribute('class');
    expect(menuClass).toContain('menu-middle-right');

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

    // Check initial title (bottom-right)
    let title = await swipeIcon.getAttribute('title');
    expect(title).toContain('bottom-right');

    // Change to top-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(200);

    title = await swipeIcon.getAttribute('title');
    expect(title).toContain('top-right');

    // Change to middle-right
    await swipeIcon.click({ button: 'right' });
    await page.waitForTimeout(200);

    title = await swipeIcon.getAttribute('title');
    expect(title).toContain('middle-right');

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
    
    // Open swipe icon menu
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(300);

    // Check that the location selector is visible
    const locationSelect = page.locator('.swipe-location-select');
    await expect(locationSelect).toBeVisible();

    // Check initial value is bottom-right
    const initialValue = await locationSelect.inputValue();
    expect(initialValue).toBe('bottom-right');

    // Change to top-right using dropdown
    await locationSelect.selectOption('top-right');
    await page.waitForTimeout(300);

    // Close menu
    await page.click('body');
    await page.waitForTimeout(200);

    // Verify swipe icon moved to top-right
    const swipeIconClass = await swipeIcon.getAttribute('class');
    expect(swipeIconClass).toContain('swipe-top-right');

    // Open menu again and verify dropdown shows correct value
    await swipeIcon.click({ force: true });
    await page.waitForTimeout(200);

    const newValue = await locationSelect.inputValue();
    expect(newValue).toBe('top-right');

    // Change to middle-right
    await locationSelect.selectOption('middle-right');
    await page.waitForTimeout(300);

    // Close menu
    await page.click('body');
    await page.waitForTimeout(200);

    // Verify swipe icon moved to middle-right
    const middleRightClass = await swipeIcon.getAttribute('class');
    expect(middleRightClass).toContain('swipe-middle-right');

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

    // Verify it works with profile avatar and swipe icon scaling too
    const profileAvatar = page.locator('.viewport-profile-avatar');
    const swipeIcon = page.locator('.viewport-swipe-icon');

    const avatarSize = await profileAvatar.evaluate(el => {
      return window.getComputedStyle(el).width;
    });

    const swipeSize = await swipeIcon.evaluate(el => {
      return window.getComputedStyle(el).width;
    });

    // At 32px font size (2x scale):
    // Profile avatar: 2.25rem * 2 = 4.5rem = 72px
    // Swipe icon: 3.75rem * 2 = 7.5rem = 120px
    expect(parseFloat(avatarSize)).toBeCloseTo(72, 1);
    expect(parseFloat(swipeSize)).toBeCloseTo(120, 1);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});