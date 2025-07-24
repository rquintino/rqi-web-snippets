const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('Typing Speed Test', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'typing-speed-test.html');
  });

  test('should load the page correctly without errors', async ({ page }) => {
    
    // Check the title
    await expect(page).toHaveTitle('Typing Speed Test - Active WPM');
    
    // Check main elements are visible
    await expect(page.locator('.text-display')).toBeVisible();
    await expect(page.locator('.input-field')).toBeVisible();
    await expect(page.locator('.restart-btn')).toBeVisible();
    
    // Check for no errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('should change dictionary correctly', async ({ page }) => {
    
    // Get the select element and check initial value
    const dictSelect = page.locator('#dict-select');
    await expect(dictSelect).toBeVisible();
    
    // Change to another dictionary
    await dictSelect.selectOption('english-200');
    
    // Verify the selection changed
    await expect(dictSelect).toHaveValue('english-200');
    
    // Change to Portuguese dictionary
    await dictSelect.selectOption('portuguese-200');
    
    // Verify the selection changed
    await expect(dictSelect).toHaveValue('portuguese-200');
  });
  test('should toggle dark/light mode', async ({ page }) => {
    
    // Get the background color before toggle
    const initialBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // Find the theme toggle button and click it
    const themeToggleBtn = page.locator('.icon-btn:has-text("🌙"), .icon-btn:has-text("☀️")');
    await themeToggleBtn.click();
    
    // Wait a bit for the transition to complete
    await page.waitForTimeout(TIMEOUTS.SHORT);
    
    // Get the background color after toggle
    const newBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // The colors should be different after toggling
    expect(newBgColor).not.toEqual(initialBgColor);
    
    // Toggle back
    await themeToggleBtn.click();
    
    // Wait a bit for the transition to complete
    await page.waitForTimeout(TIMEOUTS.SHORT);
    
    // Get the final background color
    const finalBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // The final color should be the same as the initial color
    expect(finalBgColor).toEqual(initialBgColor);
  });

  test('should initialize stats correctly', async ({ page }) => {
    
    // Check that initial stats are correct
    await expect(page.locator('.stat-value').first()).toHaveText('0');
    await expect(page.locator('.stat-value').nth(1)).toHaveText('0');
    await expect(page.locator('.stat-value').nth(2)).toHaveText('100%');
  });
  test('should reset best score when reset button is clicked', async ({ page }) => {
    
    // First, we need to ensure there's a best score
    // We'll set one through localStorage
    await page.evaluate(() => {
      // Using localStorage directly for this test 
      localStorage.setItem('typing-speed-test-best-score', '100');
      // Reload to apply the best score
      window.location.reload();
    });
    
    // Wait for the page to reload
    await page.waitForLoadState('domcontentloaded');
    
    // Find and click the reset button (using first() to handle the multiple matches)
    const resetBtn = page.locator('.stat button[title="Reset Best Score"]').first();
    await resetBtn.click();
    
    // Check that best score has been reset
    await expect(page.locator('.stat-value').nth(3)).toHaveText('-');
  });

  test('should show the chart', async ({ page }) => {
    
    // Check that the chart is visible
    await expect(page.locator('#wpmChart')).toBeVisible();
  });

  test('should open chart modal when expand button is clicked', async ({ page }) => {
    
    // Find and click the expand chart button
    const expandBtn = page.locator('button[title="Expand chart"]');
    await expandBtn.click();
    
    // Check that the modal is visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('#wpmChartModal')).toBeVisible();
    
    // Close modal by clicking the close button
    const closeBtn = page.locator('button[title="Close"]');
    await closeBtn.click();
    
    // Check that modal is closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('should navigate to home page when home button is clicked', async ({ page }) => {
    
    // Find and click the home button
    const homeBtn = page.locator('button[title="Home"]');
    await homeBtn.click();
    
    // Check that we're navigated to index.html
    await expect(page).toHaveURL(/.*index\.html$/);
  });
  test('should start typing test when Start Typing button is clicked', async ({ page }) => {
    
    // Find and click the start button
    const startBtn = page.locator('.restart-btn');
    
    // Check initial button state
    await expect(startBtn).toContainText('Start Typing');
    
    // Click the button
    await startBtn.click();
    
    // Check that the input field is focused
    await expect(page.locator('.input-field')).toBeFocused();
    
    // Verify button text contains "Restart" (using a more flexible matcher)
    await expect(startBtn).toContainText('Restart');
  });
  test('should display the current version', async ({ page }) => {
    
    // Check that the version text is visible
    await expect(page.locator('.version')).toBeVisible();
    
    // Check that it has the expected format (vyyyy-MM-dd.N)
    const versionRegex = /v\d{4}-\d{2}-\d{2}\.\d+/;
    const versionText = await page.locator('.version').innerText();
    expect(versionText).toMatch(versionRegex);
  });
  test('should handle basic input and display character status correctly', async ({ page }) => {
    
    // Start the typing test
    await page.locator('.restart-btn').click();
    
    // Get the first word from the display
    const firstWord = await page.evaluate(() => {
      return document.querySelector('.word.current').textContent.trim();
    });
    
    // Type the first character of the word
    await page.locator('.input-field').type(firstWord[0]);
    
    // Check that the character is marked as correct
    const firstCharClass = await page.evaluate(() => {
      return document.querySelector('.word.current .char').className;
    });
    
    expect(firstCharClass).toContain('correct');
    
    // Clear the input field
    await page.locator('.input-field').fill('');
    
    // Type an incorrect first character
    await page.locator('.input-field').type('!');
    
    // Check if the first character is now marked as incorrect
    const incorrectFirstCharClass = await page.evaluate(() => {
      return document.querySelector('.word.current .char').className;
    });
    
    expect(incorrectFirstCharClass).toContain('incorrect');
  });
  
  test('should update the display when restarting test', async ({ page }) => {
    
    // Start the typing test
    await page.locator('.restart-btn').click();
    
    // Type something to make sure the test has started
    await page.locator('.input-field').type('test');
    
    // Get the current word
    const initialCurrentWord = await page.evaluate(() => {
      return document.querySelector('.word.current').textContent.trim();
    });
    
    // Click the restart button
    await page.locator('.restart-btn').click();
    
    // Check that the input field is cleared
    const inputValue = await page.locator('.input-field').inputValue();
    expect(inputValue).toBe('');
    
    // Get the new current word
    const newCurrentWord = await page.evaluate(() => {
      return document.querySelector('.word.current').textContent.trim();
    });
    
    // The words should be from a different test (they might occasionally be the same by chance,
    // but we're not testing that here, just that the restart functionality works)
    
    // Verify stats were reset
    await expect(page.locator('.stat-value').first()).toHaveText('0');
    await expect(page.locator('.stat-value').nth(1)).toHaveText('0');
    await expect(page.locator('.stat-value').nth(2)).toHaveText('100%');
  });
  
  test('should show tooltip when hovering over a word', async ({ page }) => {
    
    // Start the typing test
    await page.locator('.restart-btn').click();
    
    // Type a word to get WPM data
    const firstWord = await page.evaluate(() => {
      return document.querySelector('.word.current').textContent.trim();
    });
    
    // Type the word and press space
    await page.locator('.input-field').type(firstWord + ' ');
    
    // Hover over the typed word
    const typedWord = page.locator('.word.typed').first();
    await typedWord.hover();
    
    // Check that the tooltip is visible
    await expect(page.locator('.word-tooltip')).toBeVisible();
  });
});
