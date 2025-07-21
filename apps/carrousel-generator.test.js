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
});