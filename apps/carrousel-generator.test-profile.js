const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Carousel Generator - Profile Functionality', () => {
  test('empty avatar button is clickable and opens profile config', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    
    // First add a slide so the avatar area is visible
    await page.click('button[title="Add Slide"]');
    await page.waitForTimeout(500);
    
    // Check that profile config modal is initially hidden
    await expect(page.locator('.modal-overlay')).toBeHidden();
    
    // Find the empty avatar button (when no profile is set)
    const emptyAvatarButton = page.locator('.viewport-add-profile');
    
    // Verify the empty avatar button is visible and clickable
    await expect(emptyAvatarButton).toBeVisible();
    await expect(emptyAvatarButton).toBeEnabled();
    
    // Click the empty avatar button
    await emptyAvatarButton.click();
    
    // Verify that the profile config modal opens
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-container h3')).toContainText('Profile Configuration');
  });

  test('profile configuration modal opens and closes', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Modal should be hidden initially
    await expect(page.locator('.modal-overlay')).toBeHidden();
    
    // Click the empty avatar to open modal
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    
    // Modal should now be visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-container')).toBeVisible();
    await expect(page.locator('.modal-container h3')).toContainText('Profile Configuration');
    
    // Click close button
    await page.click('.modal-header button[title="Close"]');
    await page.waitForTimeout(300);
    
    // Modal should be hidden again
    await expect(page.locator('.modal-overlay')).toBeHidden();
    
    expect(errors).toEqual([]);
  });

  test('profile name input works correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Open profile modal
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    
    // Find name input and enter text
    const nameInput = page.locator('input[placeholder="Your Name"]');
    await expect(nameInput).toBeVisible();
    
    await nameInput.fill('Test User');
    await page.waitForTimeout(300);
    
    // Close modal by clicking outside
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    
    // Profile should now be visible with the name
    await expect(page.locator('.viewport-avatar')).toBeVisible();
    const displayedName = await page.textContent('.viewport-profile-name');
    expect(displayedName).toBe('Test User');
    
    expect(errors).toEqual([]);
  });

  test('profile position options work correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'carrousel-generator.html')}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Set up profile with initial name
    await page.click('.viewport-add-profile');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Your Name"]', 'Position Test');
    
    // Test bottom-left position
    await page.selectOption('.modal-content select', 'bottom-left');
    await page.waitForTimeout(300);
    
    // Close modal
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    
    // Check that profile has bottom-left position class
    const profileElement = page.locator('.viewport-avatar');
    const hasBottomLeftClass = await profileElement.evaluate(el => 
      el.classList.contains('position-bottom-left'));
    expect(hasBottomLeftClass).toBe(true);
    
    // Test changing to top-right position
    await page.click('.viewport-avatar', { force: true });
    await page.waitForTimeout(500);
    
    await page.selectOption('.modal-content select', 'top-right');
    await page.waitForTimeout(300);
    
    // Close modal
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    
    // Check that profile now has top-right position class
    const hasTopRightClass = await profileElement.evaluate(el => 
      el.classList.contains('position-top-right'));
    expect(hasTopRightClass).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});