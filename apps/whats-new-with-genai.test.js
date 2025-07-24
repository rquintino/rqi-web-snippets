const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

test.describe('What\'s New with GenAI', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'whats-new-with-genai.html');
  });

  test('loads without errors', async ({ page }) => {
    
    // Verify title
    await expect(page).toHaveTitle(/What's New with GenAI/);
    
    // Verify main heading
    await expect(page.locator('h1.main-title')).toContainText('What\'s New with GenAI?');
    
    // Verify both sections are present
    await expect(page.locator('.traditional-section')).toBeVisible();
    await expect(page.locator('.genai-section')).toBeVisible();
    
    // Verify controls are present
    await expect(page.locator('.home-btn')).toBeVisible();
    await expect(page.locator('.mode-btn')).toBeVisible();
    await expect(page.locator('.fullscreen-btn')).toBeVisible();
    
    // Check for no loading errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });

  test('dark mode toggle works', async ({ page }) => {
    
    const container = page.locator('.app-container');
    
    // Should start in dark mode
    await expect(container).toHaveClass(/dark-mode/);
    
    // Toggle to light mode
    await page.click('.mode-btn');
    await expect(container).not.toHaveClass(/dark-mode/);
    
    // Toggle back to dark mode
    await page.click('.mode-btn');
    await expect(container).toHaveClass(/dark-mode/);
  });

  test('section hover effects work', async ({ page }) => {
    
    const traditionalSection = page.locator('.traditional-section');
    const genaiSection = page.locator('.genai-section');
    
    // Hover over traditional section
    await traditionalSection.hover();
    await expect(traditionalSection).toHaveClass(/active/);
    
    // Hover over genai section
    await genaiSection.hover();
    await expect(genaiSection).toHaveClass(/active/);
  });

  test('traditional tasks are displayed', async ({ page }) => {
    
    // Check that task items are visible
    const taskItems = page.locator('.task-item');
    await expect(taskItems).toHaveCount(6);
    
    // Verify some specific tasks
    await expect(page.getByText('Detect Credit Card Fraud')).toBeVisible();
    await expect(page.getByText('Recognize Faces in Photos')).toBeVisible();
    await expect(page.getByText('Recommend Next Netflix Movie')).toBeVisible();
  });

  test('genai capabilities are displayed', async ({ page }) => {
    
    // Check capabilities grid
    const capabilityItems = page.locator('.capability-item');
    await expect(capabilityItems).toHaveCount(6);
    
    // Verify capabilities have content (since they're randomly selected)
    for (let i = 0; i < 6; i++) {
      const capabilityItem = capabilityItems.nth(i);
      await expect(capabilityItem).toBeVisible();
      await expect(capabilityItem.locator('.capability-emoji')).toBeVisible();
      await expect(capabilityItem.locator('.capability-name')).not.toBeEmpty();
    }
  });

  test('benefits grid is displayed', async ({ page }) => {
    
    // Check benefits grid
    const benefitCards = page.locator('.benefit-card');
    await expect(benefitCards).toHaveCount(6);
    
    // Verify some benefits with new text
    await expect(page.getByText('One model, countless tasks')).toBeVisible();
    await expect(page.getByText('Talk to it in plain English')).toBeVisible();
  });

});