/**
 * Screenshot Generator for Web Utilities
 * 
 * This script automatically generates thumbnail screenshots for all HTML utilities
 * in the workspace. It creates light mode screenshots only.
 * Screenshots are saved directly in the apps directory using the naming convention:
 * - nameoftheapp.jpeg (320x180px thumbnail with proper scaling)
 * 
 * The script uses a two-step process:
 * 1. Capture full-size screenshots at 1200x800 viewport for proper UI display
 * 2. Resize images to 320x180 thumbnails with proper aspect ratio using HTML/CSS
 * 
 * Main methods:
 * - scanForApps(): Finds all HTML files except index.html
 * - takeScreenshot(): Captures and resizes screenshots with optimal quality
 * - generateAllScreenshots(): Processes all apps (light mode only)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ScreenshotGenerator {
    constructor() {
        this.outputDir = '../apps'; // Apps directory
        this.viewport = { width: 1422, height: 800 }; // Full-size viewport for proper display
        this.thumbnailSize = { width: 640, height: 360 }; // Output thumbnail dimensions to match index.html
        this.apps = [];
    }

    /**
     * Scan workspace for HTML apps (excluding index.html)
     */
    scanForApps() {
        const appsDir = path.join(__dirname, '..', 'apps');
        const files = fs.readdirSync(appsDir);
        this.apps = files
            .filter(file => 
                file.endsWith('.html') && 
                file !== 'index.html' && 
                !file.startsWith('__')  // Exclude temporary test files
            )
            .map(file => ({
                filename: file,
                name: path.basename(file, '.html'),
                path: path.resolve(appsDir, file)
            }));
        
        console.log(`Found ${this.apps.length} apps:`, this.apps.map(app => app.name));
        return this.apps;
    }

    /**
     * Take screenshot of a specific app
     */
    async takeScreenshot(browser, app, theme = 'light') {
        const page = await browser.newPage();
        
        try {
            // Set viewport
            await page.setViewportSize(this.viewport);
            
            // Navigate to app
            await page.goto(`file://${app.path}`);
            
            // Wait for page to load completely
            await page.waitForLoadState('networkidle');
            
            // Wait a bit more for any animations or dynamic content
            await page.waitForTimeout(2000);
            
            // If dark mode requested, try to toggle it
            if (theme === 'dark') {
                // Look for common dark mode toggle selectors
                const darkToggleSelectors = [
                    '[data-theme-toggle]',
                    '.theme-toggle',
                    '.dark-toggle',
                    'button[title*="dark"]',
                    'button[title*="Dark"]',
                    '[aria-label*="dark"]',
                    '[aria-label*="Dark"]'
                ];
                
                let toggled = false;
                for (const selector of darkToggleSelectors) {
                    try {
                        const element = await page.$(selector);
                        if (element) {
                            await element.click();
                            await page.waitForTimeout(500); // Wait for theme transition
                            toggled = true;
                            break;
                        }
                    } catch (e) {
                        // Continue to next selector
                    }
                }
                
                if (!toggled) {
                    console.log(`  Warning: Could not find dark mode toggle for ${app.name}`);
                }
            }
            
            // Take screenshot using naming convention
            const filename = theme === 'dark' ? 
                `${app.name}-dark.jpeg` : 
                `${app.name}.jpeg`;
            
            const screenshotPath = path.join(__dirname, this.outputDir, filename);
            
            // Check if screenshot already exists
            if (fs.existsSync(screenshotPath)) {
                console.log(`  ⚠️ Screenshot already exists: ${filename}`);
                console.log(`     Use 'npm run screenshots:clean' to clear existing screenshots`);
                return;
            }
            
            // Take screenshot with optimized settings for smaller file size
            // First take a full screenshot
            const fullScreenshot = await page.screenshot({
                type: 'png',
            });
            
            // Create a new browser page for image resizing
            const resizePage = await browser.newPage();
            
            // Set the viewport to the thumbnail size
            await resizePage.setViewportSize(this.thumbnailSize);
            
            // Use HTML/CSS to resize the image properly while preserving aspect ratio and showing the full image
            await resizePage.setContent(`
                <html>
                <head>
                    <style>
                        body, html { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: #fff; }
                        .container { width: ${this.thumbnailSize.width}px; height: ${this.thumbnailSize.height}px; display: flex; justify-content: center; align-items: center; overflow: hidden; }
                        img { max-width: 100%; max-height: 100%; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img id="screenshot" src="data:image/jpeg;base64,${fullScreenshot.toString('base64')}" />
                    </div>
                </body>
                </html>
            `);
            
            // Wait for the image to load
            await resizePage.waitForSelector('img');
            
            // Take a screenshot of the resized image
            await resizePage.screenshot({
                path: screenshotPath,
                type: 'jpeg',
                quality: 70
            });
            
            // Close the resize page
            await resizePage.close();
            
            console.log(`  ✓ ${theme} mode screenshot saved: ${filename} (optimized size)`);
            
        } catch (error) {
            console.error(`  ✗ Error taking ${theme} screenshot for ${app.name}:`, error.message);
        } finally {
            await page.close();
        }
    }

    /**
     * Generate screenshots for all apps (light theme only)
     */
    async generateAllScreenshots() {
        console.log('🤖 Starting screenshot generation (light theme only)...\n');
        
        // Scan for apps
        this.scanForApps();
        
        if (this.apps.length === 0) {
            console.log('No apps found to screenshot.');
            return;
        }
        
        // Launch browser
        const browser = await chromium.launch();
        
        try {
            // Process each app
            for (const app of this.apps) {
                console.log(`\n📸 Processing ${app.name}...`);
                
                // Take light mode screenshot only
                await this.takeScreenshot(browser, app, 'light');
            }
            
            console.log('\n🎉 Screenshot generation complete!');
            console.log(`📁 Screenshots saved in root directory with naming convention: appname.jpeg`);
            console.log(`📏 All thumbnails generated at 320x180px to match index.html display size`);
            
        } finally {
            await browser.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new ScreenshotGenerator();
    generator.generateAllScreenshots().catch(console.error);
}

module.exports = ScreenshotGenerator;
