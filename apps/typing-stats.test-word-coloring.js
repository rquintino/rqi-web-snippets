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

  await page.goto(`file://${path.resolve(__dirname, 'typing-stats.html')}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Typing Stats - Word Coloring Feature', () => {
  
  test('page loads without errors after adding word coloring', async ({ page }) => {
    // Check basic page elements are present
    await expect(page.locator('.header-title h1')).toContainText('Typing Stats');
    await expect(page.locator('.text-input')).toBeVisible();
    await expect(page.locator('.metrics-panel')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('text input is contenteditable div instead of textarea', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    // Should be a div with contenteditable attribute
    await expect(textInput).toHaveAttribute('contenteditable', 'true');
    
    // Should not be a textarea
    const textareas = page.locator('textarea');
    await expect(textareas).toHaveCount(0);
  });

  test('completed words become colored spans', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    // Focus the contenteditable div
    await textInput.click();
    
    // Type a word and complete it with space
    await page.keyboard.type('hello ');
    await page.waitForTimeout(100); // Allow for processing
    
    // Check that completed word is now a colored span
    const coloredWord = textInput.locator('span.colored-word');
    await expect(coloredWord).toHaveCount(1);
    await expect(coloredWord).toContainText('hello');
    
    // Check that span has color styling
    const color = await coloredWord.evaluate(el => window.getComputedStyle(el).color);
    expect(color).not.toBe(''); // Should have some color applied
    expect(color).not.toBe('rgba(0, 0, 0, 0)'); // Should not be transparent
  });

  test('multiple completed words each become separate colored spans', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type multiple words
    await page.keyboard.type('fast ');
    await page.waitForTimeout(50);
    await page.keyboard.type('slow ');
    await page.waitForTimeout(200); // Longer delay for slow typing
    await page.keyboard.type('medium ');
    await page.waitForTimeout(100);
    
    // Check all three words are colored spans
    const coloredWords = textInput.locator('span.colored-word');
    await expect(coloredWords).toHaveCount(3);
    
    // Check each word content
    await expect(coloredWords.nth(0)).toContainText('fast');
    await expect(coloredWords.nth(1)).toContainText('slow');
    await expect(coloredWords.nth(2)).toContainText('medium');
  });

  test('current incomplete word remains uncolored', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type a complete word and an incomplete word
    await page.keyboard.type('done incomplete');
    await page.waitForTimeout(100);
    
    // Should have one colored span for "done"
    const coloredWords = textInput.locator('span.colored-word');
    await expect(coloredWords).toHaveCount(1);
    await expect(coloredWords).toContainText('done');
    
    // "incomplete" should still be uncolored text
    const content = await textInput.textContent();
    expect(content).toContain('incomplete');
  });

  test('word coloring changes based on typing speed', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type a fast word (short delay)
    await page.keyboard.type('quick');
    await page.waitForTimeout(10);
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    
    // Type a slow word (long delay between characters)
    for (const char of 'slow') {
      await page.keyboard.type(char);
      await page.waitForTimeout(200); // Simulate slow typing
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    
    const coloredWords = textInput.locator('span.colored-word');
    await expect(coloredWords).toHaveCount(2);
    
    // Get colors of both words
    const quickColor = await coloredWords.nth(0).evaluate(el => window.getComputedStyle(el).color);
    const slowColor = await coloredWords.nth(1).evaluate(el => window.getComputedStyle(el).color);
    
    // Colors should be different for different speeds
    expect(quickColor).not.toBe(slowColor);
  });

  test('word tooltips show WPM on hover', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type and complete a word
    await page.keyboard.type('test ');
    await page.waitForTimeout(100);
    
    const coloredWord = textInput.locator('span.colored-word');
    await expect(coloredWord).toHaveCount(1);
    
    // Hover over the colored word
    await coloredWord.hover();
    await page.waitForTimeout(100);
    
    // Check tooltip appears
    const tooltip = page.locator('.tooltip');
    await expect(tooltip).toBeVisible();
    
    // Tooltip should contain WPM information
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toMatch(/WPM/i);
    expect(tooltipText).toMatch(/\d+/); // Should contain numbers
  });

  test('backspace works correctly in contenteditable', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type some text
    await page.keyboard.type('hello world');
    await page.waitForTimeout(100);
    
    // Backspace to remove characters
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    
    const content = await textInput.textContent();
    expect(content).toBe('hello wo');
  });

  test('word history is stored for completed words', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type multiple words
    await page.keyboard.type('first ');
    await page.waitForTimeout(50);
    await page.keyboard.type('second ');
    await page.waitForTimeout(100);
    
    // Check that word history is accessible (through Alpine.js app instance)
    const wordHistoryLength = await page.evaluate(() => {
      const app = window.typingAppInstance || window.app;
      return app && app.wordHistory ? app.wordHistory.length : 0;
    });
    
    expect(wordHistoryLength).toBe(2);
  });

  test('session reset clears colored words', async ({ page }) => {
    const textInput = page.locator('.text-input');
    
    await textInput.click();
    
    // Type some words
    await page.keyboard.type('test words here ');
    await page.waitForTimeout(100);
    
    // Verify colored words exist
    let coloredWords = textInput.locator('span.colored-word');
    await expect(coloredWords).toHaveCount(3);
    
    // Reset session
    await page.locator('button:has-text("Reset Session")').click();
    
    // Verify content is cleared
    const content = await textInput.textContent();
    expect(content.trim()).toBe('');
    
    // Verify no colored words remain
    coloredWords = textInput.locator('span.colored-word');
    await expect(coloredWords).toHaveCount(0);
  });

});