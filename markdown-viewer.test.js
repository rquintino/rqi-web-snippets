// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Markdown Viewer', () => {
  test('page loads without errors', async ({ page }) => {
    // Navigate to the page
    await page.goto('markdown-viewer.html');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('Markdown Viewer');
    
    // Check that main elements are visible
    await expect(page.locator('.input-pane')).toBeVisible();
    await expect(page.locator('.toc-pane')).toBeVisible();
    await expect(page.locator('.preview-pane')).toBeVisible();
    
    // Check default content loads
    const textareaContent = await page.locator('textarea').inputValue();
    expect(textareaContent).toContain('# Markdown Viewer');
    
    // Check preview rendering
    const previewContent = await page.locator('.preview-content');
    await expect(previewContent.locator('h1')).toHaveText('Markdown Viewer');
    
    // Check TOC generation
    const tocContent = await page.locator('.toc-content');
    await expect(tocContent.locator('a')).toContainText(['Markdown Viewer']);
  });

 
});
