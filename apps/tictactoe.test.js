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

  await page.goto(`file://${path.resolve(__dirname, 'tictactoe.html')}`);
  await page.waitForLoadState('networkidle');
});

test('page loads without errors', async ({ page }) => {
  // Check page title
  await expect(page).toHaveTitle('Jogo do Galo');
  
  // Check main title is visible
  await expect(page.locator('h1')).toHaveText('Jogo do Galo');
  
  // Check game board exists
  await expect(page.locator('.game-board')).toBeVisible();
  
  // Check all 9 cells exist
  const cells = page.locator('.cell');
  await expect(cells).toHaveCount(9);
  
  // Check control buttons exist
  await expect(page.locator('text=Novo Jogo')).toBeVisible();
  await expect(page.locator('text=Reset Pontuação')).toBeVisible();
  
  // Check theme toggle exists
  await expect(page.locator('.control-btn').first()).toBeVisible();
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors - this MUST be at the end
  expect(errors).toEqual([]);
});

test('can make player moves', async ({ page }) => {
  // Click first cell
  await page.locator('.cell').first().click();
  
  // Should show X in first cell
  await expect(page.locator('.cell').first()).toHaveText('X');
  
  // Game status should update
  await expect(page.locator('.game-status')).toContainText('Computador');
  
  // Wait for computer move
  await page.waitForTimeout(1000);
  
  // Computer should have made a move (one cell should have O)
  const oCount = await page.locator('.cell:has-text("O")').count();
  expect(oCount).toBe(1);
  
  // Check no errors
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test('theme toggle works', async ({ page }) => {
  // Initially should be light theme
  await expect(page.locator('html')).not.toHaveClass('dark');
  
  // Click theme toggle
  await page.locator('.control-btn').first().click();
  
  // Should switch to dark theme
  await expect(page.locator('html')).toHaveClass('dark');
  
  // Click again to switch back
  await page.locator('.control-btn').first().click();
  
  // Should be light theme again
  await expect(page.locator('html')).not.toHaveClass('dark');
  
  // Check no errors
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test('new game button resets board', async ({ page }) => {
  // Make some moves
  await page.locator('.cell').first().click();
  await page.waitForTimeout(600);
  await page.locator('.cell').nth(1).click();
  await page.waitForTimeout(600);
  
  // Click new game
  await page.locator('text=Novo Jogo').click();
  
  // All cells should be empty
  for (let i = 0; i < 9; i++) {
    await expect(page.locator('.cell').nth(i)).toBeEmpty();
  }
  
  // Game status should reset
  await expect(page.locator('.game-status')).toContainText('Sua vez');
  
  // Check no errors
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test('score tracking works', async ({ page }) => {
  // Initial scores should be 0
  const scoreValues = page.locator('.score-value');
  await expect(scoreValues.nth(0)).toHaveText('0'); // Player
  await expect(scoreValues.nth(1)).toHaveText('0'); // Draws
  await expect(scoreValues.nth(2)).toHaveText('0'); // Computer
  
  // Reset score button should work
  await page.locator('text=Reset Pontuação').click();
  
  await expect(scoreValues.nth(0)).toHaveText('0');
  await expect(scoreValues.nth(1)).toHaveText('0');
  await expect(scoreValues.nth(2)).toHaveText('0');
  
  // Check no errors
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test('home button works', async ({ page }) => {
  // Check home button exists and is clickable
  await expect(page.locator('.home-btn')).toBeVisible();
  await expect(page.locator('.home-btn')).toHaveText('🏠');
  
  // Check no errors
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
});

test('take screenshot for visual verification', async ({ page }) => {
  // Take screenshot of the game
  await page.screenshot({ 
    path: 'apps/tictactoe-screenshot.png',
    fullPage: true 
  });
  
  // Verify key visual elements are present
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.game-board')).toBeVisible();
  await expect(page.locator('.score-board')).toBeVisible();
  await expect(page.locator('.controls')).toBeVisible();
  
  // Check no errors
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
});