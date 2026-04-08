const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Tests for character error isolation:
 * When a user types an incorrect character, only THAT character should be marked
 * as incorrect. Subsequent correctly-typed characters should be marked as correct (green).
 */

test.describe('Character Error Isolation', () => {
    let errors, pageErrors;

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

        await page.goto(`file://${path.resolve(__dirname, 'typing-speed-test.html')}`);
        await page.waitForLoadState('networkidle');
    });

    test('only the incorrect character should be red, remaining correct chars should be green (during typing)', async ({ page }) => {
        await page.locator('.restart-btn').click();
        await page.waitForTimeout(300);

        const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);

        // Type wrong first character + correct remaining characters
        const wrongChar = firstWord[0] === 'x' ? 'z' : 'x';
        const typed = wrongChar + firstWord.slice(1);

        await page.locator('.input-field').type(typed);
        await page.waitForTimeout(200);

        const charClasses = await page.evaluate(() => {
            const currentWord = document.querySelector('.word.current');
            if (!currentWord) return [];
            const chars = currentWord.querySelectorAll('.char');
            return Array.from(chars).map((c, i) => ({
                index: i,
                text: c.textContent,
                className: c.className,
                hasCorrect: c.classList.contains('correct'),
                hasIncorrect: c.classList.contains('incorrect')
            }));
        });

        // First char should be incorrect
        expect(charClasses[0].hasIncorrect).toBe(true);
        expect(charClasses[0].hasCorrect).toBe(false);

        // All remaining chars should be correct (green)
        for (let i = 1; i < charClasses.length; i++) {
            expect(charClasses[i].hasCorrect,
                `char ${i} ('${charClasses[i].text}') should be correct but has class: ${charClasses[i].className}`
            ).toBe(true);
            expect(charClasses[i].hasIncorrect,
                `char ${i} ('${charClasses[i].text}') should NOT be incorrect`
            ).toBe(false);
        }

        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('only incorrect chars should be red after word completion (pressing space)', async ({ page }) => {
        await page.locator('.restart-btn').click();
        await page.waitForTimeout(300);

        const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);

        // Type wrong first character + correct remaining characters, then space
        const wrongChar = firstWord[0] === 'x' ? 'z' : 'x';
        const typed = wrongChar + firstWord.slice(1);
        await page.locator('.input-field').type(typed);
        await page.locator('.input-field').press('Space');
        await page.waitForTimeout(200);

        // Check wordCharStates has entries for ALL character positions
        const charStatesCount = await page.evaluate(() => {
            const states = window.typingAppInstance.wordCharStates[0];
            return Object.keys(states || {}).length;
        });
        expect(charStatesCount).toBe(firstWord.length);

        // Check classes of ALL characters in the completed word
        const charClasses = await page.evaluate(() => {
            const typedWords = document.querySelectorAll('.word.typed');
            if (!typedWords.length) return [];
            const firstWord = typedWords[0];
            const chars = firstWord.querySelectorAll('.char');
            return Array.from(chars).map((c, i) => ({
                index: i,
                text: c.textContent,
                className: c.className,
                hasCorrect: c.classList.contains('correct'),
                hasIncorrect: c.classList.contains('incorrect'),
                computedColor: getComputedStyle(c).color
            }));
        });

        // First char should be incorrect
        expect(charClasses[0].hasIncorrect).toBe(true);
        expect(charClasses[0].hasCorrect).toBe(false);

        // All remaining chars should be correct (green) - NOT inheriting error color
        for (let i = 1; i < charClasses.length; i++) {
            expect(charClasses[i].hasCorrect,
                `char ${i} ('${charClasses[i].text}') should be correct but has class: ${charClasses[i].className}`
            ).toBe(true);
            expect(charClasses[i].hasIncorrect,
                `char ${i} ('${charClasses[i].text}') should NOT be incorrect`
            ).toBe(false);
        }

        // Correct chars should have green color, incorrect should have red
        const correctCharColor = charClasses[1]?.computedColor;
        const incorrectCharColor = charClasses[0]?.computedColor;
        expect(correctCharColor).not.toBe(incorrectCharColor);

        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('error in middle of word - only that char is incorrect', async ({ page }) => {
        await page.locator('.restart-btn').click();
        await page.waitForTimeout(300);

        const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);
        test.skip(firstWord.length < 3, 'Word too short for this test');

        // Type correct first char, wrong second char, correct rest
        const wrongChar = firstWord[1] === 'x' ? 'z' : 'x';
        const typed = firstWord[0] + wrongChar + firstWord.slice(2);

        await page.locator('.input-field').type(typed);
        await page.waitForTimeout(200);

        const charClasses = await page.evaluate(() => {
            const currentWord = document.querySelector('.word.current');
            if (!currentWord) return [];
            const chars = currentWord.querySelectorAll('.char');
            return Array.from(chars).map((c, i) => ({
                index: i,
                text: c.textContent,
                className: c.className,
                hasCorrect: c.classList.contains('correct'),
                hasIncorrect: c.classList.contains('incorrect')
            }));
        });

        expect(charClasses[0].hasCorrect).toBe(true);
        expect(charClasses[1].hasIncorrect).toBe(true);
        for (let i = 2; i < charClasses.length; i++) {
            expect(charClasses[i].hasCorrect,
                `char ${i} ('${charClasses[i].text}') should be correct`
            ).toBe(true);
        }

        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('using keyboard presses - wrong first char then correct remaining', async ({ page }) => {
        await page.locator('.restart-btn').click();
        await page.waitForTimeout(300);
        await page.locator('.input-field').focus();

        const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);
        const wrongChar = firstWord[0] === 'x' ? 'z' : 'x';

        // Type each character individually via keyboard press
        await page.keyboard.press(wrongChar);
        for (let i = 1; i < firstWord.length; i++) {
            await page.keyboard.press(firstWord[i]);
        }
        await page.waitForTimeout(200);

        const charClasses = await page.evaluate(() => {
            const currentWord = document.querySelector('.word.current');
            if (!currentWord) return [];
            const chars = currentWord.querySelectorAll('.char');
            return Array.from(chars).map((c, i) => ({
                index: i,
                text: c.textContent,
                className: c.className,
                hasCorrect: c.classList.contains('correct'),
                hasIncorrect: c.classList.contains('incorrect')
            }));
        });

        // First char should be incorrect
        expect(charClasses[0].hasIncorrect).toBe(true);
        // All remaining chars should be correct
        for (let i = 1; i < charClasses.length; i++) {
            expect(charClasses[i].hasCorrect,
                `char ${i} ('${charClasses[i].text}') should be correct but has class: ${charClasses[i].className}`
            ).toBe(true);
        }

        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });

    test('using keyboard presses - wrong first char, complete word, check completed state', async ({ page }) => {
        await page.locator('.restart-btn').click();
        await page.waitForTimeout(300);
        await page.locator('.input-field').focus();

        const firstWord = await page.evaluate(() => window.typingAppInstance.words[0]);
        const wrongChar = firstWord[0] === 'x' ? 'z' : 'x';

        // Type each character individually via keyboard
        await page.keyboard.press(wrongChar);
        for (let i = 1; i < firstWord.length; i++) {
            await page.keyboard.press(firstWord[i]);
        }
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);

        // Verify all char states were recorded
        const statesInfo = await page.evaluate(() => {
            const states = window.typingAppInstance.wordCharStates[0];
            return {
                count: Object.keys(states || {}).length,
                states: states
            };
        });
        expect(statesInfo.count).toBe(firstWord.length);
        expect(statesInfo.states[0]).toBe(false); // first char wrong
        for (let i = 1; i < firstWord.length; i++) {
            expect(statesInfo.states[i]).toBe(true); // rest correct
        }

        // Check visual state of completed word
        const charClasses = await page.evaluate(() => {
            const typedWords = document.querySelectorAll('.word.typed');
            if (!typedWords.length) return [];
            const firstWord = typedWords[0];
            const chars = firstWord.querySelectorAll('.char');
            return Array.from(chars).map((c, i) => ({
                index: i,
                text: c.textContent,
                hasCorrect: c.classList.contains('correct'),
                hasIncorrect: c.classList.contains('incorrect'),
                computedColor: getComputedStyle(c).color
            }));
        });

        // First char incorrect (red), rest correct (green)
        expect(charClasses[0].hasIncorrect).toBe(true);
        for (let i = 1; i < charClasses.length; i++) {
            expect(charClasses[i].hasCorrect,
                `completed char ${i} ('${charClasses[i].text}') should be correct`
            ).toBe(true);
        }

        // Verify colors are actually different
        expect(charClasses[0].computedColor).not.toBe(charClasses[1].computedColor);

        expect(pageErrors).toEqual([]);
        expect(errors).toEqual([]);
    });
});
