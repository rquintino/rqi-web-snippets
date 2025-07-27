const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Typing Speed Test - Final WPM Visualization Enhancement', () => {
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

  test('page loads without errors', async ({ page }) => {
    // Basic page load test
    await expect(page.locator('h1')).toContainText('Typing Speed Test');
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors - this MUST be at the end
    expect(errors).toEqual([]);
  });

  test('chart shows dual lines when errors exist during typing', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Get the first word and type it with intentional errors
    const firstWord = await page.locator('.word').first().textContent();
    const incorrectWord = firstWord + 'xxx'; // Add extra characters to create errors
    
    await input.clear();
    await input.type(incorrectWord);
    await input.press('Space');
    
    // Type a few more words correctly to have chart data
    const words = await page.locator('.word').allTextContents();
    for (let i = 1; i < 5; i++) {
      await input.clear();
      await input.type(words[i]);
      await input.press('Space');
    }
    
    // Wait for chart to update
    await page.waitForTimeout(200);
    
    // Check that penalty indicator is visible
    await expect(page.locator('.penalty-indicator').first()).toBeVisible();
    
    // Check that chart has multiple datasets (this will fail initially)
    const chartCanvas = page.locator('#wpmChart');
    await expect(chartCanvas).toBeVisible();
    
    // Evaluate chart data to check for dual lines
    const hasMultipleDatasets = await page.evaluate(() => {
      const canvas = window.wpmChart;
      const app = window.typingAppInstance;
      
      if (!canvas || !app) return false;
      
      const chart = Chart.getChart(canvas);
      if (!chart || !chart.data || !chart.data.datasets) return false;
      
      // Should have at least 2 datasets when errors exist: 
      // 1. Average WPM (existing)
      // 2. Final WPM with penalties (new)
      const datasets = chart.data.datasets;
      const avgWpmDataset = datasets.find(d => d.label === 'Average WPM');
      const finalWpmDataset = datasets.find(d => d.label === 'Final WPM (with penalties)');
      
      return avgWpmDataset && finalWpmDataset && app.errorPenalties > 0;
    });
    
    // This should fail initially since we haven't implemented the feature yet
    expect(hasMultipleDatasets).toBe(true);
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('chart shows only single line when no errors exist', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Debug: Check initial error penalties
    const initialPenalties = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app ? app.errorPenalties : 'no app';
    });
    
    // Type a few words correctly (no errors) - use type instead of fill
    const words = await page.locator('.word').allTextContents();
    for (let i = 0; i < 5; i++) {
      await input.clear();
      await input.type(words[i]);
      await input.press('Space');
    }
    
    // Wait for chart to update
    await page.waitForTimeout(500);
    
    // Debug: Check error penalties after typing
    const finalPenalties = await page.evaluate(() => {
      const app = window.typingAppInstance;
      return app ? app.errorPenalties : 'no app';
    });
    
    // Check that penalty indicator is NOT visible (check the top bar one specifically)
    await expect(page.locator('.dict-select-bar .penalty-indicator')).not.toBeVisible();
    
    // Check that chart has only the original dataset
    const chartDebugInfo = await page.evaluate(() => {
      const canvas = window.wpmChart;
      const app = window.typingAppInstance;
      
      if (!canvas || !app) {
        return { error: 'Missing canvas or app', hasCanvas: !!canvas, hasApp: !!app };
      }
      
      // Get the Chart.js instance from the canvas
      const chart = Chart.getChart(canvas);
      
      if (!chart) {
        return { 
          error: 'Missing Chart.js instance', 
          hasCanvas: true, 
          hasApp: true, 
          canvasKeys: Object.keys(canvas),
          hasChartJS: typeof Chart !== 'undefined'
        };
      }
      
      if (!chart.data) {
        return { 
          error: 'Missing chart data', 
          hasCanvas: true, 
          hasApp: true, 
          hasChart: true,
          chartKeys: Object.keys(chart)
        };
      }
      
      if (!chart.data.datasets) {
        return { error: 'Missing datasets', hasChart: true, hasApp: true, hasData: true, dataKeys: Object.keys(chart.data) };
      }
      
      const datasets = chart.data.datasets;
      const labels = datasets.map(d => d.label);
      const avgWpmDataset = datasets.find(d => d.label === 'Average WPM');
      const finalWpmDataset = datasets.find(d => d.label === 'Final WPM (with penalties)');
      
      return {
        errorPenalties: app.errorPenalties,
        datasetLabels: labels,
        hasAvgWpm: !!avgWpmDataset,
        hasFinalWpm: !!finalWpmDataset,
        hasSingleDataset: avgWpmDataset && !finalWpmDataset
      };
    });
    
    
    expect(chartDebugInfo.hasSingleDataset).toBe(true);
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test.skip('final results show both penalized and unpenalized WPM when errors exist', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Type first word with errors
    const words = await page.locator('.word').allTextContents();
    const incorrectWord = words[0] + 'xxx';
    await input.clear();
    await input.type(incorrectWord);
    await input.press('Space');
    
    // Complete the test with remaining words correctly
    for (let i = 1; i < words.length; i++) {
      await input.clear();
      await input.type(words[i]);
      await input.press('Space');
    }
    
    // Wait for results to show
    await expect(page.locator('.results')).toBeVisible();
    
    // Check that both metrics are displayed (this will fail initially)
    const finalWpmStat = page.locator('.results .stat').filter({ hasText: 'Final WPM' });
    const averageWpmStat = page.locator('.results .stat').filter({ hasText: 'Average WPM' });
    
    await expect(finalWpmStat).toBeVisible();
    await expect(averageWpmStat).toBeVisible(); // This should fail initially
    
    // Check that penalty explanation is visible
    const penaltyExplanation = page.locator('.penalty-explanation');
    await expect(penaltyExplanation).toBeVisible(); // This should fail initially
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('chart modal mirrors main chart behavior with dual lines', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Type with errors to trigger dual line display
    const words = await page.locator('.word').allTextContents();
    const incorrectWord = words[0] + 'xxx';
    await input.clear();
    await input.type(incorrectWord);
    await input.press('Space');
    
    // Type a few more words
    for (let i = 1; i < 5; i++) {
      await input.clear();
      await input.type(words[i]);
      await input.press('Space');
    }
    
    // Open chart modal
    await page.locator('.chart-container .icon-btn').click();
    await expect(page.locator('#wpmChartModal')).toBeVisible();
    
    // Wait for modal chart to render
    await page.waitForTimeout(200);
    
    // Check that modal chart also has dual lines
    const modalHasMultipleDatasets = await page.evaluate(() => {
      const canvas = document.getElementById('wpmChartModal');
      if (!canvas) return false;
      
      const chart = Chart.getChart(canvas);
      if (!chart || !chart.data || !chart.data.datasets) return false;
      
      const datasets = chart.data.datasets;
      const avgWpmDataset = datasets.find(d => d.label === 'Average WPM');
      const finalWpmDataset = datasets.find(d => d.label === 'Final WPM (with penalties)');
      
      return !!(avgWpmDataset && finalWpmDataset);
    });
    
    // This should fail initially
    expect(modalHasMultipleDatasets).toBe(true);
    
    // Close modal
    await page.locator('.modal-panel .icon-btn').click();
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });

  test('penalty line has distinct visual styling', async ({ page }) => {
    // Start typing test
    await page.locator('.restart-btn').click();
    
    const input = page.locator('.input-field');
    await input.focus();
    
    // Type with errors to trigger dual line display
    const words = await page.locator('.word').allTextContents();
    const incorrectWord = words[0] + 'xxx';
    await input.clear();
    await input.type(incorrectWord);
    await input.press('Space');
    
    // Type a few more words
    for (let i = 1; i < 5; i++) {
      await input.clear();
      await input.type(words[i]);
      await input.press('Space');
    }
    
    // Wait for chart to update
    await page.waitForTimeout(200);
    
    // Check styling of penalty line
    const penaltyLineStyle = await page.evaluate(() => {
      const canvas = window.wpmChart;
      if (!canvas) return null;
      
      const chart = Chart.getChart(canvas);
      if (!chart || !chart.data || !chart.data.datasets) return null;
      
      const finalWpmDataset = chart.data.datasets.find(d => d.label === 'Final WPM (with penalties)');
      if (!finalWpmDataset) return null;
      
      return {
        borderColor: finalWpmDataset.borderColor,
        borderDash: finalWpmDataset.borderDash
      };
    });
    
    // This should fail initially since the dataset doesn't exist yet
    expect(penaltyLineStyle).not.toBeNull();
    expect(penaltyLineStyle.borderColor).toBe('#ef4444'); // Red color as per spec
    expect(penaltyLineStyle.borderDash).toEqual([5, 5]); // Dashed line as per spec
    
    // Check no JavaScript page errors
    expect(pageErrors).toEqual([]);
    
    // Check no console errors
    expect(errors).toEqual([]);
  });
});