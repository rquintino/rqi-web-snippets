const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Foundation Model Training Visualization', () => {
  test.beforeEach(async ({ page }) => {
    const filePath = path.join(__dirname, 'foundation-model-training.html');
    await page.goto(`file://${filePath}`);
  });

  test('page loads without errors', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Foundation Model Training');
    
    // Verify key elements are present
    await expect(page.locator('.header h1')).toHaveText('How Foundation Models Are Trained');
    await expect(page.locator('.pipeline-step.data-collection')).toBeVisible();
    await expect(page.locator('.pipeline-step.training-process')).toBeVisible();
    await expect(page.locator('.pipeline-step.final-model')).toBeVisible();
    
    // Check that both canvases are present
    await expect(page.locator('.training-canvas-container canvas')).toBeVisible();
    await expect(page.locator('.model-canvas-container canvas')).toBeVisible();
    
    // Verify company section is loaded
    await expect(page.locator('.companies-section h3')).toHaveText('Leading AI Companies');
    await expect(page.locator('.company-card')).toHaveCount(4);
    
    // Check for version
    await expect(page.locator('.version')).toBeVisible();
    
    // Verify no console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for any potential errors (2 seconds should be enough for initial load)
    await page.waitForTimeout(2000);
    expect(errors.length).toBe(0);
  });
  
  test('training progress updates correctly', async ({ page }) => {
    // Initial state check
    await expect(page.locator('.gpu-count-value')).toContainText('0');
    
    // Wait for progress to increase
    await page.waitForFunction(() => {
      const progressText = document.querySelector('.progress-fill').style.width;
      return parseInt(progressText) > 10;
    }, { timeout: 5000 });
    
    // Verify day counter is updating
    await expect(page.locator('.calendar-day')).not.toHaveText('1');
    
    // Verify GPU scaling phase works
    await page.waitForFunction(() => {
      const gpuText = document.querySelector('.gpu-count-value').textContent;
      return parseInt(gpuText.replace(/,/g, '')) > 1000;
    }, { timeout: 5000 });
  });
  
  test('theme toggle works', async ({ page }) => {
    // Default should be dark theme
    await expect(page.locator('html')).not.toHaveClass(/light-theme/);
    
    // Click theme toggle
    await page.locator('.theme-btn').click();
    
    // Should switch to light theme
    await expect(page.locator('html')).toHaveClass(/light-theme/);
    
    // Click again to go back to dark
    await page.locator('.theme-btn').click();
    
    // Should switch back to dark theme
    await expect(page.locator('html')).not.toHaveClass(/light-theme/);
  });
  
  test('training completes and shows AI model', async ({ page }) => {
    // Skip this test until we can fix the Alpine.js access issue
    test.skip();
    
    // Force training to complete
    await page.evaluate(() => {
      const app = document.querySelector('[x-data]').__x.$data;
      app.trainingProgress = 99;
    });
    
    // Wait for completion
    await page.waitForFunction(() => {
      return document.querySelector('.progress-label').textContent.includes('Complete');
    }, { timeout: 10000 });
    
    // Verify final state
    await expect(page.locator('.pipeline-step.final-model')).toHaveClass(/complete/);
    await expect(page.locator('.model-canvas-container')).toHaveClass(/active/);
    
    // Verify AI greeting appears
    await expect(page.locator('.ai-greeting')).toBeVisible({ timeout: 5000 });
  });
});
