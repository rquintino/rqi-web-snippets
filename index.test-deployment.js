const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let errors = [];
let pageErrors = [];

test.describe('Index Page - Deployment Script Integration', () => {
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
  });

  test('deployment script updates cache-busting version without breaking index.html', async ({ page }) => {
    // Get initial state of index.html
    const indexPath = path.resolve(__dirname, 'index.html');
    const initialContent = fs.readFileSync(indexPath, 'utf8');
    const initialVersionMatch = initialContent.match(/deployment-info\.js\?v=([^"']*)/);
    const initialVersion = initialVersionMatch ? initialVersionMatch[1] : null;

    // Ensure we have an initial version
    expect(initialVersion).toBeTruthy();
    console.log('Initial deployment-info.js version:', initialVersion);

    // Test initial page loads without errors
    await page.goto(`file://${indexPath}`);
    await page.waitForLoadState('networkidle');
    
    // Verify initial page loads correctly
    await expect(page.locator('h1')).toContainText('Rui Quintino');
    await expect(page.locator('.app-grid')).toBeVisible();
    
    // Check no initial errors
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);

    // Clear error arrays for next test
    errors = [];
    pageErrors = [];

    // Run the deployment script
    console.log('Running deployment script...');
    const scriptOutput = execSync('npm run update-deploy-info', { 
      cwd: __dirname,
      encoding: 'utf8' 
    });
    console.log('Script output:', scriptOutput);

    // Verify the script updated the version
    const updatedContent = fs.readFileSync(indexPath, 'utf8');
    const updatedVersionMatch = updatedContent.match(/deployment-info\.js\?v=([^"']*)/);
    const updatedVersion = updatedVersionMatch ? updatedVersionMatch[1] : null;

    expect(updatedVersion).toBeTruthy();
    expect(updatedVersion).not.toBe(initialVersion);
    console.log('Updated deployment-info.js version:', updatedVersion);

    // Test updated page loads without errors
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify updated page still works correctly
    await expect(page.locator('h1')).toContainText('Rui Quintino');
    await expect(page.locator('.app-grid')).toBeVisible();
    
    // Verify deployment info is displayed
    const deploymentInfo = page.locator('.deployment-info');
    await expect(deploymentInfo).toBeVisible();
    await expect(deploymentInfo.locator('.deploy-date')).toContainText('Last updated:');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('deployment info loads with current deployment data', async ({ page }) => {
    // Load the page
    const indexPath = path.resolve(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);
    await page.waitForLoadState('networkidle');

    // Check deployment info is available in window object
    const deploymentData = await page.evaluate(() => {
      return window.deploymentInfo;
    });

    expect(deploymentData).toBeTruthy();
    expect(deploymentData.timestamp).toBeTruthy();
    expect(deploymentData.deployDate).toBeTruthy();
    expect(deploymentData.deployTime).toBeTruthy();
    expect(deploymentData.commitHash).toBeTruthy();
    expect(deploymentData.shortHash).toBeTruthy();

    // Verify deployment info is displayed in DOM
    await expect(page.locator('.deploy-date')).toContainText('Last updated:');
    await expect(page.locator('.deploy-details')).toBeVisible();
    
    // Verify commit link works
    const commitLink = page.locator('.deploy-details a');
    await expect(commitLink).toBeVisible();
    await expect(commitLink).toHaveAttribute('href', new RegExp(`https://github.com/rquintino/rqi-web-snippets/commit/${deploymentData.commitHash}`));

    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('index.html structure remains intact after deployment script', async ({ page }) => {
    // Run deployment script first
    execSync('npm run update-deploy-info', { cwd: __dirname });

    // Load the page
    const indexPath = path.resolve(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);
    await page.waitForLoadState('networkidle');

    // Verify all critical elements are present and functional
    await expect(page.locator('h1')).toContainText('Rui Quintino');
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.app-grid')).toBeVisible();
    await expect(page.locator('#theme-toggle')).toBeVisible();
    await expect(page.locator('#fullscreen-toggle')).toBeVisible();

    // Test theme toggle works
    await page.click('#theme-toggle');
    await page.waitForTimeout(100);
    const isDarkTheme = await page.evaluate(() => document.body.getAttribute('data-theme') === 'dark');
    expect(isDarkTheme).toBe(true);

    // Test search functionality works
    await page.keyboard.type('typing');
    await page.waitForTimeout(200);
    const searchBar = page.locator('#utility-search-bar');
    await expect(searchBar).toBeVisible();

    // Clear search
    await page.keyboard.press('Escape');
    await expect(searchBar).toBeHidden();

    // Verify apps are loaded from registry
    const appCards = page.locator('.app-card');
    const appCount = await appCards.count();
    expect(appCount).toBeGreaterThan(0);

    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('cache-busting version format is valid', async () => {
    // Run deployment script
    execSync('npm run update-deploy-info', { cwd: __dirname });

    // Check the generated version format
    const indexContent = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
    const versionMatch = indexContent.match(/deployment-info\.js\?v=([^"']*)/);
    
    expect(versionMatch).toBeTruthy();
    const version = versionMatch[1];
    
    // Version should be alphanumeric only (timestamp with special chars removed)
    expect(version).toMatch(/^[a-zA-Z0-9]+$/);
    
    // Should be reasonable length (ISO timestamp without special chars ~= 20 chars)
    expect(version.length).toBeGreaterThan(15);
    expect(version.length).toBeLessThan(30);
    
    console.log('Generated cache-busting version:', version);
  });
});