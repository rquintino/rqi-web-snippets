const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Test suite for Typing Speed Test Sigma Band Narrowing Bug Fix
 * 
 * Tests the mathematical consistency and proper behavior of 3-sigma statistical bands
 * in the WPM chart, ensuring bands are appropriately sized and don't show excessive outliers.
 */

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

  await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
  await page.waitForLoadState('networkidle');
});

test.describe('Typing Speed Test - Sigma Band Narrowing Bug Fix', () => {

  test('page loads without errors', async ({ page }) => {
    // Basic page load validation
    await expect(page.locator('h1')).toHaveText('Typing Speed Test');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('sigma bands are hidden until minimum sample size (10 words)', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();

    // Type first 5 words rapidly
    const input = page.locator('.input-field');
    await input.focus();
    
    for (let i = 0; i < 5; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      await page.waitForTimeout(10);
    }

    // Check that sigma bands are NOT visible in chart (less than 10 words)
    const hasSigmaBands = await page.evaluate(() => {
      const chart = window.wpmChart;
      if (!chart || !chart.data || !chart.data.datasets) return false;
      
      return chart.data.datasets.some(dataset => 
        dataset.label && dataset.label.includes('3σ')
      );
    });

    expect(hasSigmaBands).toBe(false);

    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('sigma bands appear after 10 words with mathematically consistent calculations', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();

    // Type exactly 10 words with varying speeds
    const input = page.locator('.input-field');
    await input.focus();
    
    for (let i = 0; i < 10; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      // Vary typing speed to create different WPM values
      await page.waitForTimeout(i < 5 ? 15 : 30);
    }

    await page.waitForTimeout(50);

    // Check that sigma bands ARE visible in chart (10+ words)
    const sigmaBandInfo = await page.evaluate(() => {
      const chart = window.wpmChart;
      const app = window.typingAppInstance;
      
      if (!chart || !chart.data || !chart.data.datasets || !app) return null;
      
      // Find sigma band datasets
      const upperBandDataset = chart.data.datasets.find(d => 
        d.label && d.label.includes('3σ Upper Bound')
      );
      const lowerBandDataset = chart.data.datasets.find(d => 
        d.label && d.label.includes('3σ Lower Bound')
      );
      
      if (!upperBandDataset || !lowerBandDataset) return null;
      
      // Get statistical values
      const wordStats = app.wordStats.filter(stat => stat && typeof stat.wpm === 'number' && !isNaN(stat.wpm));
      const wpms = wordStats.map(stat => stat.wpm);
      const mean = wpms.reduce((sum, wpm) => sum + wpm, 0) / wpms.length;
      const variance = wpms.reduce((sum, wpm) => Math.pow(wpm - mean, 2), 0) / wpms.length;
      const standardDeviation = Math.sqrt(variance);
      
      return {
        hasSigmaBands: true,
        sampleSize: wordStats.length,
        mean: mean,
        standardDeviation: standardDeviation,
        upperBound: upperBandDataset.data[0],
        lowerBound: lowerBandDataset.data[0],
        expectedUpperBound: mean + (3 * standardDeviation),
        expectedLowerBound: Math.max(0, mean - (3 * standardDeviation))
      };
    });

    expect(sigmaBandInfo).not.toBeNull();
    expect(sigmaBandInfo.hasSigmaBands).toBe(true);
    expect(sigmaBandInfo.sampleSize).toBeGreaterThanOrEqual(10);
    
    // Check that bands are at least as wide as raw calculation (due to safeguards)
    expect(sigmaBandInfo.upperBound).toBeGreaterThanOrEqual(sigmaBandInfo.expectedUpperBound - 0.1);
    expect(sigmaBandInfo.lowerBound).toBeLessThanOrEqual(sigmaBandInfo.expectedLowerBound + 0.1);

    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('sigma bands have minimum width safeguards preventing unreasonably narrow bands', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();

    const input = page.locator('.input-field');
    await input.focus();
    
    // Type 12 words with consistent timing to create low variance scenario
    for (let i = 0; i < 12; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      await page.waitForTimeout(25); // Consistent timing
    }

    await page.waitForTimeout(50);

    // Check that bands have minimum width even with low variance
    const bandWidthInfo = await page.evaluate(() => {
      const chart = window.wpmChart;
      const app = window.typingAppInstance;
      
      if (!chart || !chart.data || !chart.data.datasets || !app) return null;
      
      const upperBandDataset = chart.data.datasets.find(d => 
        d.label && d.label.includes('3σ Upper Bound')
      );
      const lowerBandDataset = chart.data.datasets.find(d => 
        d.label && d.label.includes('3σ Lower Bound')
      );
      
      if (!upperBandDataset || !lowerBandDataset) return null;
      
      const upperBound = upperBandDataset.data[0];
      const lowerBound = lowerBandDataset.data[0];
      const bandWidth = upperBound - lowerBound;
      
      // Calculate actual mean for reference
      const wordStats = app.wordStats.filter(stat => stat && typeof stat.wpm === 'number' && !isNaN(stat.wpm));
      const wpms = wordStats.map(stat => stat.wpm);
      const mean = wpms.reduce((sum, wpm) => sum + wpm, 0) / wpms.length;
      
      return {
        upperBound,
        lowerBound,
        bandWidth,
        mean,
        bandWidthPercent: (bandWidth / mean) * 100
      };
    });

    expect(bandWidthInfo).not.toBeNull();
    // Band width should be at least 20% of mean WPM (minimum safeguard)
    expect(bandWidthInfo.bandWidthPercent).toBeGreaterThan(20);
    
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('outlier detection uses consistent mean calculation', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();

    const input = page.locator('.input-field');
    await input.focus();
    
    // Create a scenario with clear outliers
    for (let i = 0; i < 11; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      // Create varied timing: fast-slow-fast-slow pattern
      await page.waitForTimeout(i % 3 === 0 ? 15 : i % 3 === 1 ? 60 : 30);
    }

    await page.waitForTimeout(50);

    // Check outlier statistics use same mean as chart
    const consistencyCheck = await page.evaluate(() => {
      const app = window.typingAppInstance;
      const chart = window.wpmChart;
      
      if (!app || !chart || !app.outlierStats) return null;
      
      // Get mean from outlier statistics
      const outlierMean = app.outlierStats.statistics.mean;
      
      // Get mean from consistent average calculation
      const validStats = app.wordStats.filter(stat => stat && typeof stat.wpm === 'number' && !isNaN(stat.wpm));
      const consistentMean = validStats.reduce((sum, stat) => sum + stat.wpm, 0) / validStats.length;
      
      return {
        outlierMean: outlierMean,
        consistentMean: consistentMean,
        difference: Math.abs(outlierMean - consistentMean),
        hasOutliers: app.outlierStats.hasOutliers
      };
    });

    expect(consistencyCheck).not.toBeNull();
    // Means should be mathematically identical (within floating point precision)
    expect(consistencyCheck.difference).toBeLessThan(0.01);
    
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('standard deviation calculation uses unrounded values for mathematical accuracy', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();

    const input = page.locator('.input-field');
    await input.focus();
    
    // Type words with known timing to test precision
    for (let i = 0; i < 11; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      await page.waitForTimeout(20 + (i * 5)); // Gradual speed change
    }

    await page.waitForTimeout(50);

    // Verify standard deviation calculation precision
    const precisionCheck = await page.evaluate(() => {
      const app = window.typingAppInstance;
      if (!app) return null;
      
      // Manual calculation with raw values
      const validStats = app.wordStats.filter(stat => stat && typeof stat.wpm === 'number' && !isNaN(stat.wpm));
      const rawWpms = validStats.map(stat => stat.wpm);
      const rawMean = rawWpms.reduce((sum, wpm) => sum + wpm, 0) / rawWpms.length;
      const rawVariance = rawWpms.reduce((sum, wpm) => Math.pow(wpm - rawMean, 2), 0) / rawWpms.length;
      const rawStandardDeviation = Math.sqrt(rawVariance);
      
      // Get outlier statistics standard deviation
      const outlierSD = app.outlierStats.statistics.standardDeviation;
      
      return {
        manualSD: rawStandardDeviation,
        outlierSD: outlierSD,
        difference: Math.abs(rawStandardDeviation - outlierSD),
        sampleSize: rawWpms.length
      };
    });

    expect(precisionCheck).not.toBeNull();
    expect(precisionCheck.sampleSize).toBeGreaterThanOrEqual(10);
    // Standard deviations should match within floating point precision
    expect(precisionCheck.difference).toBeLessThan(0.001);
    
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('outlier detection accuracy - words in fastest/slowest sections match their displayed bounds', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();

    const input = page.locator('.input-field');
    await input.focus();
    
    // Create a scenario that will trigger safeguards (consistent timing = low variance)
    for (let i = 0; i < 12; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      // Use mostly consistent timing to create low variance (triggers min band width safeguard)
      await page.waitForTimeout(25 + (i % 2) * 5); // Small variations: 25, 30ms
    }

    // Complete the test with remaining words
    const remainingWords = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return Math.min(app ? app.words.length - app.currentWordIndex : 0, 5); // Limit to 5 more words max
    });

    for (let i = 0; i < remainingWords; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      await page.waitForTimeout(25);
    }

    await page.waitForTimeout(50);

    // Validate outlier detection vs displayed bounds
    const boundsMismatch = await page.evaluate(() => {
      const app = window.typingAppInstance;
      if (!app || !app.outlierStats) return null;
      
      // Get the bounds that are displayed to user
      const displayedStats = app.outlierStats.statistics;
      const fastest = app.outlierStats.fastest;
      const slowest = app.outlierStats.slowest;
      
      // Get the actual bounds used for outlier detection (original statistical bounds)
      const validStats = app.wordStats.filter(stat => stat && typeof stat.wpm === 'number' && !isNaN(stat.wpm) && isFinite(stat.wpm));
      const rawWpms = validStats.map(stat => stat.wpm);
      const rawMean = rawWpms.reduce((sum, wpm) => sum + wpm, 0) / rawWpms.length;
      const variance = rawWpms.reduce((sum, wpm) => Math.pow(wpm - rawMean, 2), 0) / rawWpms.length;
      const standardDeviation = Math.sqrt(variance);
      const actualUpperBound = rawMean + (3 * standardDeviation);
      const actualLowerBound = Math.max(0, rawMean - (3 * standardDeviation));
      
      // Check for the bug: words in fastest/slowest that don't match DISPLAYED bounds
      const fastestViolations = fastest.filter(word => word.wpm <= displayedStats.upperBound);
      const slowestViolations = slowest.filter(word => word.wpm >= displayedStats.lowerBound);
      
      return {
        displayedUpperBound: displayedStats.upperBound,
        displayedLowerBound: displayedStats.lowerBound,
        actualUpperBound: actualUpperBound,
        actualLowerBound: actualLowerBound,
        boundsMismatch: Math.abs(displayedStats.upperBound - actualUpperBound) > 0.1 || 
                       Math.abs(displayedStats.lowerBound - actualLowerBound) > 0.1,
        fastestWords: fastest.map(w => ({ word: w.word, wpm: w.wpm })),
        slowestWords: slowest.map(w => ({ word: w.word, wpm: w.wpm })),
        fastestViolations: fastestViolations.map(w => ({ word: w.word, wpm: w.wpm })),
        slowestViolations: slowestViolations.map(w => ({ word: w.word, wpm: w.wpm }))
      };
    });

    expect(boundsMismatch).not.toBeNull();
    
    // Log the mismatch details for debugging
    console.log('Bounds Mismatch Check:');
    console.log(`Displayed Upper Bound: ${boundsMismatch.displayedUpperBound.toFixed(1)}`);
    console.log(`Actual Detection Upper Bound: ${boundsMismatch.actualUpperBound.toFixed(1)}`);
    console.log(`Displayed Lower Bound: ${boundsMismatch.displayedLowerBound.toFixed(1)}`);
    console.log(`Actual Detection Lower Bound: ${boundsMismatch.actualLowerBound.toFixed(1)}`);
    console.log(`Bounds Mismatch: ${boundsMismatch.boundsMismatch}`);
    
    if (boundsMismatch.fastestViolations.length > 0) {
      console.log('❌ Fastest Words that violate DISPLAYED bound:', boundsMismatch.fastestViolations);
    }
    
    if (boundsMismatch.slowestViolations.length > 0) {
      console.log('❌ Slowest Words that violate DISPLAYED bound:', boundsMismatch.slowestViolations);
    }

    // The bug: all words in fastest section must be above DISPLAYED upper bound
    expect(boundsMismatch.fastestViolations).toEqual([]);
    
    // The bug: all words in slowest section must be below DISPLAYED lower bound
    expect(boundsMismatch.slowestViolations).toEqual([]);
    
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('modal chart mirrors main chart sigma band behavior', async ({ page }) => {
    // Start typing test and create data
    await page.locator('.restart-btn').click();

    const input = page.locator('.input-field');
    await input.focus();
    
    for (let i = 0; i < 11; i++) {
      const word = await page.locator('.word.current').textContent();
      await input.type(word + ' ');
      await page.waitForTimeout(20 + (i * 3));
    }

    await page.waitForTimeout(100);

    // Open modal chart
    await page.locator('button[title="Expand chart"]').click();
    await page.waitForTimeout(150);

    // Check that modal chart has identical sigma bands
    const modalConsistency = await page.evaluate(() => {
      const mainChart = window.wpmChart;
      const modalChart = window.wpmChartModal;
      
      if (!mainChart || !modalChart) return null;
      
      const mainUpper = mainChart.data.datasets.find(d => d.label && d.label.includes('3σ Upper Bound'));
      const mainLower = mainChart.data.datasets.find(d => d.label && d.label.includes('3σ Lower Bound'));
      const modalUpper = modalChart.data.datasets.find(d => d.label && d.label.includes('3σ Upper Bound'));
      const modalLower = modalChart.data.datasets.find(d => d.label && d.label.includes('3σ Lower Bound'));
      
      if (!mainUpper || !mainLower || !modalUpper || !modalLower) return null;
      
      return {
        mainUpperValue: mainUpper.data[0],
        modalUpperValue: modalUpper.data[0],
        mainLowerValue: mainLower.data[0],
        modalLowerValue: modalLower.data[0],
        upperMatch: Math.abs(mainUpper.data[0] - modalUpper.data[0]) < 0.01,
        lowerMatch: Math.abs(mainLower.data[0] - modalLower.data[0]) < 0.01
      };
    });

    expect(modalConsistency).not.toBeNull();
    expect(modalConsistency.upperMatch).toBe(true);
    expect(modalConsistency.lowerMatch).toBe(true);

    // Close modal
    await page.locator('button[title="Close"]').click();
    
    expect(pageErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

});