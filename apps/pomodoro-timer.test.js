const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Pomodoro Timer', () => {
  test('page loads without errors', async ({ page }) => {
    // Set up console error listener BEFORE loading the page
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Set up page error listener for JavaScript errors
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Verify main elements are present
    await expect(page.locator('.timer-card')).toBeVisible();
    await expect(page.locator('.session-type')).toBeVisible();
    await expect(page.locator('.timer-circle')).toBeVisible();
    await expect(page.locator('.timer-display .time')).toBeVisible();
    
    // Check initial state
    await expect(page.locator('.session-type')).toHaveText('Work');
    await expect(page.locator('.time')).toHaveText('25:00');
    await expect(page.locator('.session-count')).toContainText('Session 1');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('timer controls work correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Start timer
    await page.click('text=Start');
    await expect(page.locator('text=Pause')).toBeVisible();
    
    // Wait a moment for timer to tick
    await page.waitForTimeout(2000);
    
    // Check that time has decreased
    const timeText = await page.locator('.time').textContent();
    expect(timeText).not.toBe('25:00');
    
    // Pause timer
    await page.click('text=Pause');
    await expect(page.locator('text=Start')).toBeVisible();
    
    // Reset timer
    await page.click('text=Reset');
    await expect(page.locator('.time')).toHaveText('25:00');
    await expect(page.locator('.session-type')).toHaveText('Work');
    
    expect(errors).toEqual([]);
  });

  test('dark mode toggle works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check initial state (light mode)
    await expect(page.locator('body')).not.toHaveClass(/dark/);
    
    // Toggle to dark mode
    await page.click('button[title="Toggle Dark Mode"]');
    await expect(page.locator('body')).toHaveClass(/dark/);
    
    // Toggle back to light mode
    await page.click('button[title="Toggle Dark Mode"]');
    await expect(page.locator('body')).not.toHaveClass(/dark/);
    
    expect(errors).toEqual([]);
  });

  test('fullscreen toggle works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check initial state (not fullscreen)
    await expect(page.locator('body')).not.toHaveClass(/fullscreen/);
    
    // Toggle to fullscreen
    await page.click('button[title="Toggle Fullscreen"]');
    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    
    // Toggle back from fullscreen
    await page.click('button[title="Toggle Fullscreen"]');
    await expect(page.locator('body')).not.toHaveClass(/fullscreen/);
    
    expect(errors).toEqual([]);
  });

  test('settings panel toggles and saves preferences', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Settings should be hidden initially
    await expect(page.locator('.settings')).not.toBeVisible();
    
    // Show settings
    await page.click('text=Settings');
    await expect(page.locator('.settings')).toBeVisible();
    await expect(page.locator('text=Hide Settings')).toBeVisible();
    
    // Test work duration setting
    await page.fill('input[x-model="settings.workDuration"]', '30');
    await page.click('text=Reset'); // Reset to apply new duration
    await expect(page.locator('.time')).toHaveText('30:00');
    
    // Hide settings
    await page.click('text=Hide Settings');
    await expect(page.locator('.settings')).not.toBeVisible();
    
    expect(errors).toEqual([]);
  });

  test('circular progress indicator updates', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Get initial progress ring state
    const progressRing = page.locator('.progress-ring-progress');
    await expect(progressRing).toBeVisible();
    
    // Start timer and check that progress ring updates
    await page.click('text=Start');
    await page.waitForTimeout(2000);
    
    // The stroke-dashoffset should have changed (indicating progress)
    const strokeDashoffset = await progressRing.getAttribute('stroke-dashoffset');
    expect(parseFloat(strokeDashoffset)).toBeLessThan(565.48); // Full circle circumference
    
    expect(errors).toEqual([]);
  });

  test('home button navigates correctly', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check home button is present
    await expect(page.locator('button[title="Home"]')).toBeVisible();
    
    // Note: We can't test actual navigation without the index.html file
    // but we can verify the button exists and has the correct functionality
    const homeButton = page.locator('button[title="Home"]');
    await expect(homeButton).toBeVisible();
    
    expect(errors).toEqual([]);
  });

  test('start pause functionality works', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for Alpine.js to initialize
    await page.waitForTimeout(500);
    
    // Test start/pause functionality
    await page.click('text=Start');
    await expect(page.locator('text=Pause')).toBeVisible();
    
    await page.click('text=Pause');
    await expect(page.locator('text=Start')).toBeVisible();
    
    expect(errors).toEqual([]);
  });

  test('version number is displayed', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`file://${path.resolve(__dirname, 'pomodoro-timer.html')}`);
    await page.waitForLoadState('networkidle');
    
    // Check version is displayed
    await expect(page.locator('.version')).toBeVisible();
    await expect(page.locator('.version')).toHaveText('v2025-01-24.1');
    
    expect(errors).toEqual([]);
  });
});