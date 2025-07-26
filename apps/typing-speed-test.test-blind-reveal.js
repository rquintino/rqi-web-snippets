const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Typing Speed Test - Blind Mode Results Reveal', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'typing-speed-test.html');
  });

  test('should show blind reveal phase when completing test in blind mode', async ({ page }) => {
    // Enable blind mode
    await page.locator('button').filter({ hasText: 'Blind Mode' }).click();
    
    // Verify blind mode is active
    await expect(page.locator('button').filter({ hasText: '👁️‍🗨️ Blind Mode' })).toBeVisible();
    
    // Start typing test
    await page.locator('.restart-btn').click();
    
    // Type a few words to complete the test quickly
    const input = page.locator('.input-field');
    await input.focus();
    
    // Get the first few words from the text display
    const words = await page.locator('.word').allTextContents();
    const testWords = words.slice(0, 3); // Type first 3 words for faster test
    
    for (const word of testWords) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Continue typing remaining words to complete test
    const remainingWords = words.slice(3);
    for (const word of remainingWords) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Should show blind reveal phase instead of going directly to results
    await expect(page.locator('.blind-reveal-header')).toBeVisible();
    await expect(page.locator('.blind-reveal-header h3')).toContainText('Your Typing Results');
    await expect(page.locator('.continue-btn')).toBeVisible();
    
    // Results should not be visible yet
    await expect(page.locator('.results')).not.toBeVisible();
    
    // Check for no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should show typed words with error highlighting in reveal phase', async ({ page }) => {
    // Enable blind mode
    await page.locator('button').filter({ hasText: 'Blind Mode' }).click();
    
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Get the first word and type it with intentional errors
    const firstWord = await page.locator('.word').first().textContent();
    const incorrectWord = firstWord + 'xxx'; // Add extra characters to create errors
    
    await input.fill(incorrectWord);
    await input.press('Space');
    
    // Type remaining words correctly to complete test
    const words = await page.locator('.word').allTextContents();
    const remainingWords = words.slice(1);
    for (const word of remainingWords) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Should be in reveal phase
    await expect(page.locator('.blind-reveal-header')).toBeVisible();
    
    // Check that text is visible (not masked) in reveal phase
    const revealText = page.locator('.text-display');
    await expect(revealText).toBeVisible();
    
    // Should show error highlighting for incorrect characters (at least the 'xxx' we added)
    const incorrectCount = await revealText.locator('.char.incorrect').count();
    expect(incorrectCount).toBeGreaterThanOrEqual(3); // At least the 'xxx' we added
    
    // Check for no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should proceed to normal results when continue button is clicked', async ({ page }) => {
    // Enable blind mode
    await page.locator('button').filter({ hasText: 'Blind Mode' }).click();
    
    // Start and complete typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Type all words to complete test
    const words = await page.locator('.word').allTextContents();
    for (const word of words) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Should be in reveal phase
    await expect(page.locator('.blind-reveal-header')).toBeVisible();
    
    // Click continue button
    await page.locator('.continue-btn').click();
    
    // Should now show normal results
    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.results h3')).toContainText('Test Complete!');
    
    // Reveal phase should no longer be visible
    await expect(page.locator('.blind-reveal-header')).not.toBeVisible();
    
    // Check for no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should restore blind mode state after test completion', async ({ page }) => {
    // Enable blind mode
    await page.locator('button').filter({ hasText: 'Blind Mode' }).click();
    
    // Complete typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    const words = await page.locator('.word').allTextContents();
    for (const word of words) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Go through reveal phase
    await expect(page.locator('.blind-reveal-header')).toBeVisible();
    await page.locator('.continue-btn').click();
    
    // Should be in results now
    await expect(page.locator('.results')).toBeVisible();
    
    // Start a new test and verify blind mode is still selected
    await page.locator('.restart-btn').click();
    
    // Blind mode button should still show as active
    await expect(page.locator('button').filter({ hasText: '👁️‍🗨️ Blind Mode' })).toBeVisible();
    
    // Check for no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should skip reveal phase for normal mode tests', async ({ page }) => {
    // Ensure blind mode is disabled (should be default)
    const blindModeBtn = page.locator('button').filter({ hasText: 'Blind Mode' });
    const isActive = await blindModeBtn.locator('span').first().textContent();
    
    if (isActive.includes('👁️‍🗨️')) {
      // If blind mode is active, disable it
      await blindModeBtn.click();
    }
    
    // Start and complete typing test in normal mode
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    const words = await page.locator('.word').allTextContents();
    for (const word of words) {
      await input.fill(word);
      await input.press('Space');
    }
    
    // Should go directly to results, skipping reveal phase
    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.blind-reveal-header')).not.toBeVisible();
    
    // Check for no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });
});