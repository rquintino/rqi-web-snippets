// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Markdown Viewer', () => {
  test('page loads without errors', async ({ page }) => {
    // Navigate to the page using file URL
    const filePath = path.resolve(__dirname, 'markdown-viewer.html');
    await page.goto(`file://${filePath}`);
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('Markdown Viewer');
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Check that main elements are visible
    await expect(page.locator('.input-pane')).toBeVisible();
    await expect(page.locator('.toc-pane')).toBeVisible();
    await expect(page.locator('.preview-pane')).toBeVisible();
    
    // Check default content loads
    await page.waitForFunction(() => {
      const textarea = document.querySelector('textarea');
      return textarea && textarea.value.includes('# Markdown Viewer');
    });
    const textareaContent = await page.locator('textarea').inputValue();
    expect(textareaContent).toContain('# Markdown Viewer');
    
    // Check preview rendering
    await page.waitForFunction(() => {
      const h1 = document.querySelector('.preview-content h1');
      return h1 && h1.textContent === 'Markdown Viewer';
    });
    const previewContent = await page.locator('.preview-content');
    await expect(previewContent.locator('h1')).toHaveText('Markdown Viewer');
    
    // Check TOC generation
    await page.waitForFunction(() => {
      const tocLinks = document.querySelectorAll('.toc-content a');
      return tocLinks.length > 0;
    });
    const tocContent = await page.locator('.toc-content');
    await expect(tocContent.locator('a').first()).toContainText('Markdown Viewer');
  });

  test('theme toggle works', async ({ page }) => {
    const filePath = path.resolve(__dirname, 'markdown-viewer.html');
    await page.goto(`file://${filePath}`);
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Get initial theme state (might be null for light theme)
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    
    // Click theme toggle
    await page.locator('.theme-btn').click();
    await page.waitForTimeout(100);
    
    // Check theme has changed to a valid theme value
    const newTheme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(newTheme);
    expect(newTheme).not.toBe(initialTheme);
    
    // Click again to toggle back
    await page.locator('.theme-btn').click();
    await page.waitForTimeout(100);
    
    // Check theme has toggled again
    const finalTheme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light', null]).toContain(finalTheme);
    // Should be different from the previous state
    expect(finalTheme).not.toBe(newTheme);
  });

  test('input pane toggle works', async ({ page }) => {
    const filePath = path.resolve(__dirname, 'markdown-viewer.html');
    await page.goto(`file://${filePath}`);
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Check input pane is initially visible
    await expect(page.locator('.input-pane')).toBeVisible();
    
    // Click collapse button (the one that's visible when input is not collapsed)
    await page.locator('.input-toggle-btn[title="Collapse Input Pane"]').click();
    
    // Check input pane is hidden
    await expect(page.locator('.input-pane')).toBeHidden();
    
    // Click expand button to show again (the one that's visible when input is collapsed)
    await page.locator('.input-toggle-btn[title="Show Input Pane"]').click();
    
    // Check input pane is visible again
    await expect(page.locator('.input-pane')).toBeVisible();
  });

  test('markdown input updates preview', async ({ page }) => {
    const filePath = path.resolve(__dirname, 'markdown-viewer.html');
    await page.goto(`file://${filePath}`);
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Clear textarea and add new content
    await page.locator('textarea').fill('# Test Heading\n\nThis is a test paragraph.');
    
    // Wait for preview to update
    await page.waitForFunction(() => {
      const h1 = document.querySelector('.preview-content h1');
      return h1 && h1.textContent === 'Test Heading';
    });
    
    // Check preview was updated
    await expect(page.locator('.preview-content h1')).toHaveText('Test Heading');
    await expect(page.locator('.preview-content p')).toContainText('This is a test paragraph.');
    
    // Check TOC was updated
    await page.waitForFunction(() => {
      const tocLinks = document.querySelectorAll('.toc-content a');
      return tocLinks.length > 0 && tocLinks[0] && tocLinks[0].textContent && tocLinks[0].textContent.includes('Test Heading');
    });
    await expect(page.locator('.toc-content a').first()).toContainText('Test Heading');
  });

  test('copy HTML functionality works', async ({ page }) => {
    const filePath = path.resolve(__dirname, 'markdown-viewer.html');
    await page.goto(`file://${filePath}`);
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Add simple content
    await page.locator('textarea').fill('# Copy Test\n\nThis content will be copied.');
    
    // Wait for preview to update
    await page.waitForTimeout(500);
    
    // Click copy button
    await page.locator('.copy-btn').click();
    
    // Wait for toast to appear
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('HTML copied to clipboard');
    
    // Check clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain('Copy Test');
    expect(clipboardContent).toContain('This content will be copied.');
  });
});
