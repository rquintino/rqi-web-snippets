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

test.describe('Carousel Generator - Text Callouts', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupCarrouselPage(page);
  });
  test('can add and interact with text callouts', async ({ page }) => {
    const debugLogs = [];
    page.on('console', msg => {
      // Capture our debug messages
      const text = msg.text();
      if (text.includes('===') || text.includes('DEBUG') || text.includes('CALLOUT')) {
        debugLogs.push(text);
        console.log('BROWSER DEBUG:', text);
      }
    });
    
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
    
    // Check no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('multiple callouts can be added and managed', async ({ page }) => {
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
    
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('only one callout is editing at a time and clicking outside deselects', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Add first callout (auto in edit mode)
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(300);

    // Add second callout while first is still editing
    await page.click('button[title="Add Text Callout"]');
    await page.waitForTimeout(300);

    // Only one callout should have editing class
    let editingCount = await page.locator('.text-callout.editing').count();
    expect(editingCount).toBe(1);

    // The second callout should be editing
    const secondEditing = await page.locator('.text-callout').nth(1).evaluate(el => el.classList.contains('editing'));
    expect(secondEditing).toBe(true);

    // Click outside to deselect
    await page.click('#canvas', { position: { x: 5, y: 5 } });
    await page.waitForTimeout(200);

    editingCount = await page.locator('.text-callout.editing').count();
    expect(editingCount).toBe(0);
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
    
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
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
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
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
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });
});