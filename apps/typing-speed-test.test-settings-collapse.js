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

test.describe('Typing Speed Test - Settings pane auto-collapse', () => {
  test('starts minimized: strip visible with gear, settings bar hidden', async ({ page }) => {
    await expect(page.locator('.dict-status-strip')).toBeVisible();
    await expect(page.locator('.dict-select-bar')).toBeHidden();

    const stripText = await page.locator('.dict-status-strip').innerText();
    expect(stripText).toContain('⚙');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('clicking the strip toggles the settings bar open and closed', async ({ page }) => {
    await page.click('.dict-status-strip');
    await page.waitForTimeout(100);
    await expect(page.locator('.dict-select-bar')).toBeVisible();
    await expect(page.locator('.dict-status-strip')).toBeHidden();

    await page.click('.dict-status-strip', { force: true });
    await expect(page.locator('.dict-status-strip')).toBeVisible();
    await page.click('.dict-status-strip');
    await page.waitForTimeout(100);
    // Reopen and close via re-clicking strip after it reappears
    await expect(page.locator('.dict-select-bar')).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('settings can be opened during an active typing test', async ({ page }) => {
    await page.click('.restart-btn');
    await page.waitForTimeout(150);
    await page.type('.input-field', 'a');
    await page.waitForTimeout(150);

    const isStarted = await page.evaluate(() => window.typingAppInstance.started);
    expect(isStarted).toBe(true);

    await expect(page.locator('.dict-status-strip')).toBeVisible();
    await page.click('.dict-status-strip');
    await page.waitForTimeout(100);

    await expect(page.locator('.dict-select-bar')).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('restart resets settings to closed state', async ({ page }) => {
    await page.click('.dict-status-strip');
    await page.waitForTimeout(100);
    await expect(page.locator('.dict-select-bar')).toBeVisible();

    await page.click('.restart-btn');
    await page.waitForTimeout(150);

    const settingsOpen = await page.evaluate(() => window.typingAppInstance.settingsOpen);
    expect(settingsOpen).toBe(false);
    await expect(page.locator('.dict-select-bar')).toBeHidden();
    await expect(page.locator('.dict-status-strip')).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('status strip shows pace token when pace target is set', async ({ page }) => {
    await page.evaluate(() => {
      window.typingAppInstance.paceTargetWpm = 60;
    });
    await page.waitForTimeout(50);

    const stripText = await page.locator('.dict-status-strip').innerText();
    expect(stripText).toContain('🎯');
    expect(stripText).toContain('60');

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
