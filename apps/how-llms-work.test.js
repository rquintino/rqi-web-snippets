const { test, expect } = require('@playwright/test');
const { 
  setupTestPage, 
  expectNoErrors,
  TIMEOUTS
} = require('../test-helpers');

const SELECTORS = {
  contextTitle: '.context-title',
  modelTitle: '.model-title',
  outputsTitle: '.outputs-title',
  userPrompt: '.user-prompt',
  conversation: '.conversation',
  files: '.files',
  system: '.system',
  modelContainer: '.model-container',
  centralIcon: '.central-icon',
  frozenNotice: '.frozen-notice',
  controlBtn: '.control-btn',
  homeBtn: '.home-btn',
  version: '.version',
  networkSvg: '.network-svg',
  networkLine: '.network-line',
  patternNode: '.pattern-node'
};

test.describe('How LLMs Work Visualization', () => {
  let errorListeners;

  test.beforeEach(async ({ page }) => {
    errorListeners = await setupTestPage(page, 'how-llms-work.html');
  });

  test('page loads without errors', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/How LLMs Work/);
    
    // Check basic page structure
    await expect(page.locator('[x-data]')).toBeAttached();
    
    // Check for no loading errors
    expectNoErrors(errorListeners.errors, errorListeners.pageErrors, errorListeners.networkErrors);
  });


  test('displays main sections', async ({ page }) => {
    await expect(page.locator(SELECTORS.contextTitle)).toContainText('Context Window');
    await expect(page.locator(SELECTORS.modelTitle)).toContainText('Foundation Model');
    await expect(page.locator(SELECTORS.outputsTitle)).toContainText('Generated Outputs');
  });

  test('displays input layers', async ({ page }) => {
    const inputLayers = [SELECTORS.userPrompt, SELECTORS.conversation, SELECTORS.files, SELECTORS.system];
    const inputTexts = ['User Prompt', 'Conversation Thread', 'Additional Files', 'System Instructions'];
    
    for (let i = 0; i < inputLayers.length; i++) {
      await expect(page.locator(inputLayers[i])).toBeVisible();
      await expect(page.locator(`${inputLayers[i]} .layer-text h4`)).toContainText(inputTexts[i]);
    }
  });

  test('displays model visualization', async ({ page }) => {
    await expect(page.locator(SELECTORS.modelContainer)).toBeVisible();
    await expect(page.locator(SELECTORS.centralIcon)).toBeVisible();
    await expect(page.locator(SELECTORS.frozenNotice)).toBeVisible();
    await expect(page.locator(`${SELECTORS.frozenNotice} p`)).toContainText('FROZEN PATTERNS');
  });

  test('displays output cards', async ({ page }) => {
    // Check all output types are present
    await expect(page.locator('.text-output')).toBeVisible();
    await expect(page.locator('.code-output')).toBeVisible();
    await expect(page.locator('.tools-output')).toBeVisible();
    await expect(page.locator('.visual-output')).toBeVisible();
    await expect(page.locator('.video-output')).toBeVisible();
    
    // Check output card content
    await expect(page.locator('.text-output h4')).toContainText('Text');
    await expect(page.locator('.code-output h4')).toContainText('Code');
    await expect(page.locator('.tools-output h4')).toContainText('Tool Usage');
    await expect(page.locator('.visual-output h4')).toContainText('Visual Content');
    await expect(page.locator('.video-output h4')).toContainText('Video and Sound');
  });

  test('has control buttons', async ({ page }) => {
    await expect(page.locator(SELECTORS.controlBtn).first()).toBeVisible();
    expect(await page.locator(SELECTORS.controlBtn).count()).toBeGreaterThanOrEqual(3);
  });

  test('theme toggle works', async ({ page }) => {
    const themeButton = page.locator(SELECTORS.controlBtn).nth(1);
    await expect(page.locator('body')).not.toHaveClass(/light/);
    await themeButton.click();
    await expect(page.locator('body')).toHaveClass(/light/);
    await themeButton.click();
    await expect(page.locator('body')).not.toHaveClass(/light/);
  });

  test('home button navigates correctly', async ({ page }) => {
    const homeButton = page.locator(SELECTORS.homeBtn);
    await expect(homeButton).toBeVisible();
    const href = await homeButton.evaluate(btn => btn.onclick ? btn.onclick.toString() : 'index.html');
    expect(href).toContain('index.html');
  });

  test('displays version number', async ({ page }) => {
    await expect(page.locator(SELECTORS.version)).toBeVisible();
    await expect(page.locator(SELECTORS.version)).toContainText(/v\d{4}-\d{2}-\d{2}\.\d+/);
  });

  test('network connections are present', async ({ page }) => {
    await expect(page.locator(SELECTORS.networkSvg)).toBeVisible();
    await page.waitForFunction(() => {
      const lines = document.querySelectorAll('.network-line');
      return lines.length > 0;
    });
    const lineCount = await page.locator(SELECTORS.networkLine).count();
    expect(lineCount).toBeGreaterThan(0);
  });

  test('pattern nodes are present', async ({ page }) => {
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll('.pattern-node');
      return nodes.length > 0;
    });
    const nodeCount = await page.locator(SELECTORS.patternNode).count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test('animations are working', async ({ page }) => {
    // Check that animated elements have the expected styles
    await expect(page.locator('.input-layer').first()).toHaveCSS('animation-name', 'slideInLeft');
    await expect(page.locator('.output-card').first()).toHaveCSS('animation-name', 'slideInRight');
    await expect(page.locator('.pattern-node').first()).toHaveCSS('animation-name', 'pulse');
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 400, height: 800 });
    
    // All main sections should still be visible
    await expect(page.locator('.inputs-section')).toBeVisible();
    await expect(page.locator('.model-section')).toBeVisible();
    await expect(page.locator('.outputs-section')).toBeVisible();
    
    // Controls should be adapted for mobile
    await expect(page.locator('.controls')).toBeVisible();
  });

  test('Alpine.js is initialized', async ({ page }) => {
    // Wait for Alpine.js to initialize
    await page.waitForFunction(() => window.Alpine !== undefined, { timeout: 10000 });
    
    // Check that Alpine.js data is present
    const hasAlpineData = await page.evaluate(() => {
      const element = document.querySelector('[x-data]');
      return element && element._x_dataStack && element._x_dataStack.length > 0;
    });
    
    expect(hasAlpineData).toBeTruthy();
  });

  test('lucide icons are loaded', async ({ page }) => {
    await page.waitForFunction(() => {
      const icons = document.querySelectorAll('[data-lucide]');
      return icons.length > 0;
    });
    const iconCount = await page.locator('[data-lucide]').count();
    expect(iconCount).toBeGreaterThan(0);
  });
});