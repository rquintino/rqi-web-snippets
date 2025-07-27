const { test, expect } = require('@playwright/test');
const path = require('path');

let errors = [];
let pageErrors = [];

test.beforeEach(async ({ page }) => {
  // Set up console error listener BEFORE loading the page
  errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Set up page error listener for JavaScript errors
  pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Typing Speed Test - Tab Key Restart Functionality', () => {
  test('should restart typing test when Tab key is pressed during typing', async ({ page }) => {
    // Start typing test
    await page.click('.restart-btn');
    await page.waitForTimeout(200);
    
    // Type a few characters
    await page.type('.input-field', 'hello');
    await page.waitForTimeout(500);
    
    // Verify test is started
    const isStarted = await page.evaluate(() => window.typingAppInstance.started);
    expect(isStarted).toBe(true);
    
    // Press Tab key to restart
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Verify test was restarted
    const isStartedAfterTab = await page.evaluate(() => window.typingAppInstance.started);
    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    const currentWordIndex = await page.evaluate(() => window.typingAppInstance.currentWordIndex);
    
    expect(isStartedAfterTab).toBe(false);
    expect(typedWord).toBe('');
    expect(currentWordIndex).toBe(0);
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should restart test when Tab key is pressed in final results screen', async ({ page }) => {
    // Complete a typing test
    await page.click('.restart-btn');
    await page.waitForTimeout(200);
    
    // Type the complete first word plus space to advance
    const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);
    await page.type('.input-field', firstWord + ' ');
    await page.waitForTimeout(200);
    
    // Skip to end by setting currentWordIndex to trigger finish
    await page.evaluate(() => {
      window.typingAppInstance.currentWordIndex = window.typingAppInstance.words.length;
      window.typingAppInstance.finish();
    });
    await page.waitForTimeout(500);
    
    // Verify results are showing
    const showResults = await page.evaluate(() => window.typingAppInstance.showResults);
    expect(showResults).toBe(true);
    
    // Press Tab key to restart from results
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Verify test was restarted
    const isStartedAfterTab = await page.evaluate(() => window.typingAppInstance.started);
    const showResultsAfterTab = await page.evaluate(() => window.typingAppInstance.showResults);
    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    
    expect(isStartedAfterTab).toBe(false);
    expect(showResultsAfterTab).toBe(false);
    expect(typedWord).toBe('');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should restart test when Tab key is pressed in blind reveal screen', async ({ page }) => {
    // Enable blind mode
    await page.click('.toggle-btn');
    await page.waitForTimeout(200);
    
    // Start typing test
    await page.click('.restart-btn');
    await page.waitForTimeout(200);
    
    // Type the complete first word plus space to advance
    const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);
    await page.type('.input-field', firstWord + ' ');
    await page.waitForTimeout(200);
    
    // Skip to end to trigger blind reveal
    await page.evaluate(() => {
      window.typingAppInstance.currentWordIndex = window.typingAppInstance.words.length;
      window.typingAppInstance.finish();
    });
    await page.waitForTimeout(500);
    
    // Verify blind reveal is showing
    const showBlindReveal = await page.evaluate(() => window.typingAppInstance.showBlindReveal);
    expect(showBlindReveal).toBe(true);
    
    // Press Tab key to restart from blind reveal
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Verify test was restarted
    const isStartedAfterTab = await page.evaluate(() => window.typingAppInstance.started);
    const showBlindRevealAfterTab = await page.evaluate(() => window.typingAppInstance.showBlindReveal);
    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    
    expect(isStartedAfterTab).toBe(false);
    expect(showBlindRevealAfterTab).toBe(false);
    expect(typedWord).toBe('');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should not interfere with existing keyboard functionality', async ({ page }) => {
    // Start typing test
    await page.click('.restart-btn');
    await page.waitForTimeout(200);
    
    // Test that normal typing still works after Tab functionality is added
    await page.type('.input-field', 'test');
    await page.waitForTimeout(200);
    
    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedWord).toBe('test');
    
    // Test that space still advances word
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    
    const currentWordIndex = await page.evaluate(() => window.typingAppInstance.currentWordIndex);
    expect(currentWordIndex).toBe(1);
    
    // Test that backspace still works
    await page.type('.input-field', 'hello');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);
    
    const typedWordAfterBackspace = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedWordAfterBackspace).toBe('hell');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('should focus input field after Tab restart', async ({ page }) => {
    // Start typing test
    await page.click('.restart-btn');
    await page.waitForTimeout(200);
    
    // Type something
    await page.type('.input-field', 'test');
    await page.waitForTimeout(200);
    
    // Press Tab to restart
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Check that input field is focused
    const isFocused = await page.evaluate(() => document.activeElement === document.querySelector('.input-field'));
    expect(isFocused).toBe(true);
    
    // Verify we can immediately start typing (no additional click needed)
    await page.type('.input-field', 'immediate');
    await page.waitForTimeout(200);
    
    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedWord).toBe('immediate');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });
});