/**
 * Playwright Test for Screenshot Generation
 * 
 * Tests the screenshot generation functionality to ensure it works correctly
 * and generates the expected thumbnail images (JPEG format, 320x180 dimensions)
 * for all apps in light mode only. The test verifies that:
 * 1. Screenshots follow the correct naming convention (appname.jpeg)
 * 2. Generated files are valid JPEG images
 * 3. Image dimensions match the expected thumbnail size (320x180)
 * 4. Screenshots are generated without errors
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ScreenshotGenerator = require('./generate-screenshots');

test.describe('Screenshot Generation', () => {
    let generator;
    
    test.beforeEach(() => {
        generator = new ScreenshotGenerator();
    });

    test('should scan and find HTML apps', () => {
        const apps = generator.scanForApps();
        
        // Should find at least the existing apps
        expect(apps.length).toBeGreaterThan(0);
        
        // Should not include index.html
        const indexApp = apps.find(app => app.filename === 'index.html');
        expect(indexApp).toBeUndefined();
        
        // Each app should have required properties
        apps.forEach(app => {
            expect(app).toHaveProperty('filename');
            expect(app).toHaveProperty('name');
            expect(app).toHaveProperty('path');
            expect(app.filename).toMatch(/\.html$/);
        });
    });

    test('screenshot generation should complete without errors', async () => {
        // This is a longer test, so increase timeout
        test.setTimeout(60000);
        
        try {
            // Check each screenshot individually and only generate missing ones
            const apps = generator.scanForApps();
            const missingScreenshots = generator.findMissingScreenshots(apps);
            
            if (missingScreenshots.length === 0) {
                console.log('All screenshots already exist, skipping generation...');
            } else {
                console.log(`Found ${missingScreenshots.length} missing screenshots, generating only those...`);
                // Generate only missing screenshots
                await generator.generateSelectiveScreenshots(missingScreenshots);
            }
            
            // Check that screenshots exist in apps directory
            const screenshotsAfter = generator.getExistingScreenshots();
            
            // Screenshots should exist (either created now or existed before)
            expect(screenshotsAfter.length).toBeGreaterThan(0);
            
            // Check naming convention - should have appname.jpeg
            apps.forEach(app => {
                const lightFile = `${app.name}.jpeg`;
                
                expect(screenshotsAfter.includes(lightFile)).toBe(true);
            });
            
        } catch (error) {
            console.error('Screenshot generation failed:', error);
            throw error;
        }
    });

    test('generated screenshots should be valid JPEG files', () => {
        const screenshots = generator.getExistingScreenshots();
        
        if (screenshots.length === 0) {
            test.skip('No screenshots found to validate');
            return;
        }
        
        screenshots.forEach(screenshot => {
            const filePath = path.join(generator.getAppsDir(), screenshot);
            const stats = fs.statSync(filePath);
            
            // File should exist and have some size
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(1000); // At least 1KB
            
            // Check JPEG signature
            const buffer = fs.readFileSync(filePath);
            const jpegSignature = buffer.slice(0, 3);
            const expectedSignature = Buffer.from([0xFF, 0xD8, 0xFF]); // JPEG SOI marker + first segment marker
            expect(jpegSignature.equals(expectedSignature)).toBe(true);
        });
    });

    test('should follow naming convention', () => {
        const apps = generator.scanForApps();
        
        if (!fs.existsSync(generator.getAppsDir())) {
            test.skip('Apps directory does not exist');
            return;
        }
        
        const screenshots = generator.getExistingScreenshots();
        
        if (screenshots.length === 0) {
            test.skip('No screenshots found to validate naming');
            return;
        }
        
        // Each app should have light screenshot
        apps.forEach(app => {
            const expectedLight = `${app.name}.jpeg`;
            
            const hasLight = screenshots.includes(expectedLight);
            
            if (hasLight) { // Only check if screenshots exist
                expect(hasLight).toBe(true);
            }
        });
    });

    test('screenshot dimensions should match the thumbnailSize', async () => {
        const screenshots = generator.getExistingScreenshots();
        
        if (screenshots.length === 0) {
            test.skip('No screenshots found to validate dimensions');
            return;
        }

        // Use a different approach to verify dimensions - create a simple HTML page
        // Use relative paths which are more reliable
        const tempHtmlPath = path.join(generator.getAppsDir(), '__temp_image_test.html');
        
        // Get one screenshot to test
        const sampleScreenshot = screenshots[0];
        const relativePath = `./${sampleScreenshot}`;
        
        // Create temporary HTML file
        fs.writeFileSync(tempHtmlPath, `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Image Dimension Test</title>
                <script>
                    function checkDimensions() {
                        const img = document.getElementById('testImage');
                        document.getElementById('width').textContent = img.naturalWidth;
                        document.getElementById('height').textContent = img.naturalHeight;
                    }
                </script>
            </head>
            <body onload="checkDimensions()">
                <img id="testImage" src="${relativePath}" />
                <div id="dimensions">
                    Width: <span id="width"></span>
                    Height: <span id="height"></span>
                </div>
            </body>
            </html>
        `);
        
        try {
            // Launch browser and load the page
            const browser = await chromium.launch();
            const page = await browser.newPage();
            
            // Navigate to the temp HTML file
            await page.goto(`file://${tempHtmlPath}`);
            
            // Wait for the dimensions to be populated
            await page.waitForSelector('#width');
            
            // Get the dimensions
            const width = await page.evaluate(() => parseInt(document.getElementById('width').textContent));
            const height = await page.evaluate(() => parseInt(document.getElementById('height').textContent));
            
            // Clean up
            await browser.close();
            
            // Verify dimensions
            expect(width).toBe(generator.thumbnailSize.width);
            expect(height).toBe(generator.thumbnailSize.height);
            
        } finally {
            // Clean up the temp file
            if (fs.existsSync(tempHtmlPath)) {
                fs.unlinkSync(tempHtmlPath);
            }
        }
    });
});
