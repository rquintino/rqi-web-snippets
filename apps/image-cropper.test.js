const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

let errors = [];
let pageErrors = [];

test.describe('Image Cropper', () => {
test.beforeEach(async ({ page }) => {
errors = [];
page.on('console', msg => {
if (msg.type() === 'error') {
errors.push(msg.text());
}
});

pageErrors = [];
page.on('pageerror', (error) => {
pageErrors.push(error.message);
});

await page.goto(`file://${path.resolve(__dirname, 'image-cropper.html')}`);
await page.waitForLoadState('networkidle');
});

test('page loads without errors', async ({ page }) => {
await expect(page.locator('h1')).toContainText('Image Cropper');

const uploadLabel = page.locator('.upload-label');
await expect(uploadLabel).toBeVisible();
await expect(uploadLabel).toContainText('Choose Image');

const homeBtn = page.locator('.home-btn');
await expect(homeBtn).toBeVisible();

const themeBtn = page.locator('.theme-btn');
await expect(themeBtn).toBeVisible();

const fullscreenBtn = page.locator('.fullscreen-btn');
await expect(fullscreenBtn).toBeVisible();

const version = page.locator('.version');
await expect(version).toBeVisible();
await expect(version).toContainText('v2026-02-16');

expect(pageErrors).toEqual([]);
expect(errors).toEqual([]);
});

test('dark/light mode toggle works', async ({ page }) => {
const themeBtn = page.locator('.theme-btn');
const html = page.locator('html');

const initialClass = await html.getAttribute('class');
await themeBtn.click();
await page.waitForTimeout(100);
const afterClass = await html.getAttribute('class');

expect(initialClass).not.toBe(afterClass);
});

test('fullscreen toggle works', async ({ page }) => {
const fullscreenBtn = page.locator('.fullscreen-btn');
const container = page.locator('div[x-data]').first();

await fullscreenBtn.click();
await page.waitForTimeout(100);
const hasFullscreen = await container.evaluate(el => el.classList.contains('fullscreen'));

expect(hasFullscreen).toBe(true);
});

test('image upload displays crop interface', async ({ page }) => {
const testImage = Buffer.from(
'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+M9QzwABDGMKowAADhgGAWjR9awAAAAASUVORK5CYII=',
'base64'
);
const tempImagePath = path.join(__dirname, 'temp-test-upload.png');
fs.writeFileSync(tempImagePath, testImage);

try {
const fileInput = page.locator('#imageInput');
await fileInput.setInputFiles(tempImagePath);
await page.waitForTimeout(500);

const cropSection = page.locator('.crop-section');
await expect(cropSection).toBeVisible();

const canvas = page.locator('.crop-canvas');
await expect(canvas).toBeVisible();
} finally {
if (fs.existsSync(tempImagePath)) {
fs.unlinkSync(tempImagePath);
}
}
});

test('crop selection creates overlay', async ({ page }) => {
// Create a 200x200 pixel red square PNG
const testImage = Buffer.from(
'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIQDgEaHfLDmAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAUSURBVHja7cExAQAAAMKg9U9tCU+gAAAg1gAB9AAB9A==',
'base64'
);
const tempImagePath = path.join(__dirname, 'temp-test-image.png');
fs.writeFileSync(tempImagePath, testImage);

try {
const fileInput = page.locator('#imageInput');
await fileInput.setInputFiles(tempImagePath);
await page.waitForTimeout(1000);

const canvas = page.locator('.crop-canvas');
await expect(canvas).toBeVisible();
const box = await canvas.boundingBox();
if (!box) throw new Error('Canvas not found');

await page.mouse.move(box.x + 10, box.y + 10);
await page.mouse.down();
await page.mouse.move(box.x + 50, box.y + 50);
await page.mouse.up();
await page.waitForTimeout(200);

const overlay = page.locator('.crop-overlay');
await expect(overlay).toBeVisible();

const preview = page.locator('.preview-canvas');
await expect(preview).toBeVisible();
} finally {
if (fs.existsSync(tempImagePath)) {
fs.unlinkSync(tempImagePath);
}
}
});

test('download button enabled after crop', async ({ page }) => {
const testImage = Buffer.from(
'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIQDgEaHfLDmAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAUSURBVHja7cExAQAAAMKg9U9tCU+gAAAg1gAB9AAB9A==',
'base64'
);
const tempImagePath = path.join(__dirname, 'temp-test-image2.png');
fs.writeFileSync(tempImagePath, testImage);

try {
const fileInput = page.locator('#imageInput');
await fileInput.setInputFiles(tempImagePath);
await page.waitForTimeout(1000);

const canvas = page.locator('.crop-canvas');
await expect(canvas).toBeVisible();
const box = await canvas.boundingBox();
if (!box) throw new Error('Canvas not found');

await page.mouse.move(box.x + 10, box.y + 10);
await page.mouse.down();
await page.mouse.move(box.x + 50, box.y + 50);
await page.mouse.up();
await page.waitForTimeout(200);

const downloadBtn = page.locator('button:has-text("Download Crop")');
const isDisabled = await downloadBtn.isDisabled();
expect(isDisabled).toBe(false);
} finally {
if (fs.existsSync(tempImagePath)) {
fs.unlinkSync(tempImagePath);
}
}
});

test('reset crop clears selection', async ({ page }) => {
const testImage = Buffer.from(
'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIQDgEaHfLDmAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAUSURBVHja7cExAQAAAMKg9U9tCU+gAAAg1gAB9AAB9A==',
'base64'
);
const tempImagePath = path.join(__dirname, 'temp-test-image3.png');
fs.writeFileSync(tempImagePath, testImage);

try {
const fileInput = page.locator('#imageInput');
await fileInput.setInputFiles(tempImagePath);
await page.waitForTimeout(1000);

const canvas = page.locator('.crop-canvas');
await expect(canvas).toBeVisible();
const box = await canvas.boundingBox();
if (!box) throw new Error('Canvas not found');

await page.mouse.move(box.x + 10, box.y + 10);
await page.mouse.down();
await page.mouse.move(box.x + 50, box.y + 50);
await page.mouse.up();
await page.waitForTimeout(200);

const resetBtn = page.locator('button:has-text("Reset Crop")');
await resetBtn.click();
await page.waitForTimeout(200);

const overlay = page.locator('.crop-overlay');
await expect(overlay).not.toBeVisible();
} finally {
if (fs.existsSync(tempImagePath)) {
fs.unlinkSync(tempImagePath);
}
}
});

test('clear image returns to upload state', async ({ page }) => {
const testImage = Buffer.from(
'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIQDgEaHfLDmAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAUSURBVHja7cExAQAAAMKg9U9tCU+gAAAg1gAB9AAB9A==',
'base64'
);
const tempImagePath = path.join(__dirname, 'temp-test-image4.png');
fs.writeFileSync(tempImagePath, testImage);

try {
const fileInput = page.locator('#imageInput');
await fileInput.setInputFiles(tempImagePath);
await page.waitForTimeout(1000);

const clearBtn = page.locator('button:has-text("Clear Image")');
await clearBtn.click();
await page.waitForTimeout(200);

const uploadLabel = page.locator('.upload-label');
await expect(uploadLabel).toBeVisible();

const cropSection = page.locator('.crop-section');
await expect(cropSection).not.toBeVisible();
} finally {
if (fs.existsSync(tempImagePath)) {
fs.unlinkSync(tempImagePath);
}
}
});

test('screenshot analysis', async ({ page }) => {
const screenshotPath = path.join(__dirname, 'image-cropper-screenshot.png');
await page.screenshot({ path: screenshotPath, fullPage: true });

expect(fs.existsSync(screenshotPath)).toBe(true);
});
});
