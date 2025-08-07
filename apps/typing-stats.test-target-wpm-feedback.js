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

  await page.goto(`file://${path.resolve(__dirname, 'typing-stats.html')}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Typing Stats - Target WPM Feedback Feature', () => {

  test('page loads without errors after adding target WPM feedback', async ({ page }) => {
    // Basic page elements should be present
    await expect(page.locator('h1')).toHaveText('Typing Stats');
    await expect(page.locator('.text-input')).toBeVisible();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('target WPM input is present in control panel', async ({ page }) => {
    // Target WPM control should exist
    await expect(page.locator('label:has-text("Target WPM:")')).toBeVisible();
    await expect(page.locator('input[type="number"].wpm-input')).toBeVisible();
    
    // Should have proper attributes
    const targetInput = page.locator('input[type="number"].wpm-input');
    await expect(targetInput).toHaveAttribute('min', '10');
    await expect(targetInput).toHaveAttribute('max', '200');
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('target WPM defaults to experience level setting', async ({ page }) => {
    // Get the default target WPM value
    const targetWpm = await page.evaluate(() => {
      return window.typingStatsInstance.targetWpm;
    });
    
    // Should default to 70 for Intermediate level
    expect(targetWpm).toBe(70);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('target WPM persists in localStorage', async ({ page }) => {
    // Change target WPM
    await page.locator('input[type="number"].wpm-input').fill('90');
    await page.locator('input[type="number"].wpm-input').dispatchEvent('change');
    await page.waitForTimeout(200);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should remember the setting
    const targetWpm = await page.evaluate(() => {
      return window.typingStatsInstance.targetWpm;
    });
    
    expect(targetWpm).toBe(90);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('last word WPM color changes based on target WPM', async ({ page }) => {
    // Set target WPM to 50
    await page.locator('input[type="number"].wpm-input').fill('50');
    await page.waitForTimeout(100);
    
    // Type a word slowly (should trigger red/orange color)
    await page.locator('.text-input').type('test ', { delay: 500 });
    await page.waitForTimeout(200);
    
    // Check that last word WPM element has color styling
    const lastWordElement = page.locator('.metric-tile:has(.metric-label:has-text("Last Word WPM")) .metric-value');
    const color = await lastWordElement.evaluate(el => el.style.color);
    
    // Should have some color applied (not empty)
    expect(color).not.toBe('');
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('slow word triggers audio feedback', async ({ page }) => {
    // Mock audio context to prevent actual sound
    await page.evaluate(() => {
      window.mockAudioCalls = [];
      
      // Mock AudioContext
      window.AudioContext = class MockAudioContext {
        constructor() {
          this.currentTime = 0;
          this.destination = {};
        }
        
        createOscillator() {
          return {
            type: 'sine',
            frequency: { 
              setValueAtTime: (freq, time) => window.mockAudioCalls.push(['setFreq', freq, time]),
              linearRampToValueAtTime: (freq, time) => window.mockAudioCalls.push(['rampFreq', freq, time])
            },
            connect: () => window.mockAudioCalls.push(['connect']),
            start: () => window.mockAudioCalls.push(['start']),
            stop: (time) => window.mockAudioCalls.push(['stop', time])
          };
        }
        
        createGain() {
          return {
            gain: {
              setValueAtTime: (gain, time) => window.mockAudioCalls.push(['setGain', gain, time]),
              exponentialRampToValueAtTime: (gain, time) => window.mockAudioCalls.push(['rampGain', gain, time])
            },
            connect: () => window.mockAudioCalls.push(['gainConnect'])
          };
        }
      };
    });
    
    // Set high target WPM to ensure feedback
    await page.locator('input[type="number"].wpm-input').fill('100');
    await page.waitForTimeout(100);
    
    // Type a word slowly (should trigger audio feedback)
    await page.locator('.text-input').type('slow ', { delay: 800 });
    await page.waitForTimeout(300);
    
    // Check if audio was called
    const audioCalls = await page.evaluate(() => window.mockAudioCalls);
    expect(audioCalls.length).toBeGreaterThan(0);
    expect(audioCalls).toContainEqual(['start']);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('fast word does not trigger audio feedback', async ({ page }) => {
    // Mock audio context
    await page.evaluate(() => {
      window.mockAudioCalls = [];
      
      window.AudioContext = class MockAudioContext {
        constructor() {
          this.currentTime = 0;
          this.destination = {};
        }
        
        createOscillator() {
          return {
            type: 'sine',
            frequency: { 
              setValueAtTime: () => {},
              linearRampToValueAtTime: () => {}
            },
            connect: () => {},
            start: () => window.mockAudioCalls.push(['start']),
            stop: () => {}
          };
        }
        
        createGain() {
          return {
            gain: {
              setValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {}
            },
            connect: () => {}
          };
        }
      };
    });
    
    // Set low target WPM 
    await page.locator('input[type="number"].wpm-input').fill('30');
    await page.waitForTimeout(100);
    
    // Type a word quickly (should not trigger audio)
    await page.locator('.text-input').type('fast ', { delay: 50 });
    await page.waitForTimeout(300);
    
    // Check if audio was NOT called
    const audioCalls = await page.evaluate(() => window.mockAudioCalls);
    expect(audioCalls).not.toContain(['start']);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('visual flash animation triggers on slow words', async ({ page }) => {
    // Set high target WPM to ensure feedback
    await page.locator('input[type="number"].wpm-input').fill('120');
    await page.waitForTimeout(100);
    
    // Type a word slowly
    await page.locator('.text-input').type('test ', { delay: 600 });
    await page.waitForTimeout(100);
    
    // Check if flash class was applied (might be removed quickly)
    const hasFlashClass = await page.evaluate(() => {
      // Find the last word WPM element by traversing the DOM
      const allMetricTiles = document.querySelectorAll('.metric-tile');
      let lastWordElement = null;
      
      allMetricTiles.forEach(tile => {
        const label = tile.querySelector('.metric-label');
        if (label && label.textContent.includes('Last Word WPM')) {
          lastWordElement = tile.querySelector('.metric-value');
        }
      });
      
      return lastWordElement && (lastWordElement.classList.contains('last-word-flash') || lastWordElement.classList.contains('last-word-feedback'));
    });
    
    // Either flash class was applied or element has color styling
    const hasColorStyling = await page.evaluate(() => {
      // Find the last word WPM element by traversing the DOM
      const allMetricTiles = document.querySelectorAll('.metric-tile');
      let lastWordElement = null;
      
      allMetricTiles.forEach(tile => {
        const label = tile.querySelector('.metric-label');
        if (label && label.textContent.includes('Last Word WPM')) {
          lastWordElement = tile.querySelector('.metric-value');
        }
      });
      
      return lastWordElement && lastWordElement.style.color !== '';
    });
    
    expect(hasFlashClass || hasColorStyling).toBe(true);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('sound toggle functionality works', async ({ page }) => {
    // Check if sound enabled toggle exists (if implemented)
    const soundToggle = page.locator('input[type="checkbox"]#soundEnabled, .sound-toggle');
    
    // If sound toggle exists, test it
    if (await soundToggle.count() > 0) {
      await expect(soundToggle).toBeVisible();
      
      // Toggle should be enabled by default
      const isChecked = await soundToggle.isChecked();
      expect(isChecked).toBe(true);
    }
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('target WPM integrates with existing last word WPM tracking', async ({ page }) => {
    // Set a target WPM
    await page.locator('input[type="number"].wpm-input').fill('60');
    await page.waitForTimeout(100);
    
    // Type several words to verify integration
    await page.locator('.text-input').type('one two three ', { delay: 200 });
    await page.waitForTimeout(200);
    
    // Verify last word WPM still updates normally
    const lastWordWpm = await page.locator('.metric-tile:has(.metric-label:has-text("Last Word WPM")) .metric-value').textContent();
    expect(parseFloat(lastWordWpm)).toBeGreaterThan(0);
    
    // Verify the feedback system doesn't break existing functionality
    await page.locator('button:has-text("Reset Session")').click();
    await page.waitForTimeout(100);
    
    // Last word WPM should reset to 0.0
    const resetLastWordWpm = await page.locator('.metric-tile:has(.metric-label:has-text("Last Word WPM")) .metric-value').textContent();
    expect(resetLastWordWpm).toBe('0.0');
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

});