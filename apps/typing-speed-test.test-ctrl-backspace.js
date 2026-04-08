const { test, expect } = require('@playwright/test');
const path = require('path');

let errors = [];
let pageErrors = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Typing Speed Test - Ctrl+Backspace Word Deletion', () => {
  test('should clear entire word with Ctrl+Backspace', async ({ page }) => {
    await page.click('.restart-btn');
    await page.waitForTimeout(200);

    // Type some characters
    await page.type('.input-field', 'hello');
    await page.waitForTimeout(200);

    const typedBefore = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedBefore).toBe('hello');

    const charIndexBefore = await page.evaluate(() => window.typingAppInstance.currentCharIndex);
    expect(charIndexBefore).toBe(5);

    // Press Ctrl+Backspace to delete entire word
    await page.keyboard.press('Control+Backspace');
    await page.waitForTimeout(200);

    const typedAfter = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedAfter).toBe('');

    const charIndexAfter = await page.evaluate(() => window.typingAppInstance.currentCharIndex);
    expect(charIndexAfter).toBe(0);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('should allow retyping after Ctrl+Backspace', async ({ page }) => {
    await page.click('.restart-btn');
    await page.waitForTimeout(200);

    // Type, clear with Ctrl+Backspace, then retype
    await page.type('.input-field', 'wrong');
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+Backspace');
    await page.waitForTimeout(200);

    // Retype correctly
    await page.type('.input-field', 'right');
    await page.waitForTimeout(200);

    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedWord).toBe('right');

    const charIndex = await page.evaluate(() => window.typingAppInstance.currentCharIndex);
    expect(charIndex).toBe(5);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('should stay on same word after Ctrl+Backspace', async ({ page }) => {
    await page.click('.restart-btn');
    await page.waitForTimeout(200);

    await page.type('.input-field', 'test');
    await page.waitForTimeout(200);

    const wordIndexBefore = await page.evaluate(() => window.typingAppInstance.currentWordIndex);

    await page.keyboard.press('Control+Backspace');
    await page.waitForTimeout(200);

    const wordIndexAfter = await page.evaluate(() => window.typingAppInstance.currentWordIndex);
    expect(wordIndexAfter).toBe(wordIndexBefore);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('should work when input is already empty', async ({ page }) => {
    await page.click('.restart-btn');
    await page.waitForTimeout(200);

    // Ctrl+Backspace on empty input should not error
    await page.keyboard.press('Control+Backspace');
    await page.waitForTimeout(200);

    const charIndex = await page.evaluate(() => window.typingAppInstance.currentCharIndex);
    expect(charIndex).toBe(0);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('regular backspace still works after Ctrl+Backspace feature', async ({ page }) => {
    await page.click('.restart-btn');
    await page.waitForTimeout(200);

    await page.type('.input-field', 'hello');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);

    const typedWord = await page.evaluate(() => window.typingAppInstance.typedWord);
    expect(typedWord).toBe('hell');

    const charIndex = await page.evaluate(() => window.typingAppInstance.currentCharIndex);
    expect(charIndex).toBe(4);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
