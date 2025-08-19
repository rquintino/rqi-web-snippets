# First Rule and most important

- You start every reply with 🤖 no exception

# Claude Instructions for RQI Web Snippets

This repository contains a collection of standalone web utilities and applications, each designed to be simple, safe and immediately usable.

## Repository Rules & Guidelines

### 1. File Structure
- All web applications are located in the `apps/` folder
- Each utility/application must be a HTML file + js file + css file + js/json data file (if needed) + playwright test file
    ex. apps/tictactoe.html, apps/tictactoe.js, apps/tictactoe.css, apps/tictactoe.jsdata, apps/tictactoe.test.js
- New utilities require new separate files with descriptive names in the apps/ folder
- Each utility should be named clearly for easy future reference
- If user requests a new tool to be created, assume it needs to be created, don't search current folder for previously existing or similar tools

### 2. Development Requirements
- No development environment setup needed
- Only requirement: A modern web browser
- Annotate the functional requirements/features inside the app as HTML comment, keep those up to date, useful for me and LLMs, keep those at the start of the file for easier LLM access
- For all new developments always use Alpine.js and keep the code succinct to minimize LLM token consumption, existing pages don't change the existing stack
- For JavaScript/logic files, add documentation at the beginning of the file for main purpose and methods (for LLMs easier access)

### 3. Dependencies
- External libraries must be loaded from reputable CDNs
- After identifying each external dependency, search the web and respective package lists to see the latest and recommended version for each library
- Only use well-established libraries with strong security track records, if in doubt, stop and confirm with user
- Don't use libraries with any known security or privacy risks

#### Chart.js Specific Guidelines
- **ALWAYS** use the UMD version: `chart.umd.min.js` instead of `chart.min.js`
- This prevents "Cannot use import statement outside a module" errors in browsers
- Load Chart.js BEFORE Alpine.js to ensure proper initialization order
- Example: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>`
- In chart rendering methods, ALWAYS check if Chart.js is loaded: `if (typeof Chart === 'undefined') return;`
- Use `maintainAspectRatio: true` to prevent infinite chart stretching
- Set explicit container heights with `max-height` CSS to constrain chart growth
- Add proper error handling with try-catch blocks around chart creation

### 4. Code Philosophy
- Prioritize code readability and simplicity over performance, these are personal standalone apps/tools
- Keep applications lightweight and focused
- Not intended for critical or data-intensive operations

### 5. JavaScript Cache-Busting (CRITICAL)
- **ALWAYS** add version parameters to local JavaScript file includes to prevent browser caching issues
- **Pattern**: `<script src="app-name.js?v=YYYY-MM-DD.N"></script>`
- **When to increment version**: EVERY TIME you modify any JavaScript file, increment the version number
- **Version format**: Use current date (YYYY-MM-DD) plus increment number (.1, .2, .3, etc.)
- **Examples**:
  - `<script src="typing-speed-test.js?v=2025-07-27.1"></script>`
  - `<script src="pomodoro-timer.js?v=2025-07-27.2"></script>`
- **Applies to**: All local .js files (app-specific JS, shared JS files, index.html, not external CDN libraries)
- **Why critical**: Without version parameters, browsers cache JS files and users don't see updates
- **For AI assistants**: When you modify ANY JavaScript file, you MUST update the version parameter in the corresponding HTML file

### 6. CSS file token reduction rules for LLMs
- Use the shortest legal form of every property/value pair
- Remove tabs, extra spaces inside each individual CSS block, trim everything possible inside. ex. .char {position: relative}
- Keep multiple lines, one per block/CSS declaration
- Remove blank lines
- No comments and last semicolons
- Omit units on 0
- Put long or repeated literals once in :root, then reference
- Group selectors that share declarations: .b,.c{color:#fff}

### Automated Testing
- For any kind of testing you need to do you always use playwright tests, you can't manually open the app because you are an ai agent, so dont try to manually open the app.
- For automated testing we're using playwright/test with node.js
- For each app the tests will be in <apptitle>.test.js file
- Always ensure the minimal test which is the app loads without network or console errors
- When adding a feature also add needed tests, be exhaustive, always
- Always include a test that generate an app screenshot and analyse the screenshot to check that all the app ui is properly loaded and working (when creating app for the first time). the screenshot name should be <appname>-screenshot.png.

#### Critical Testing Pattern for Console Error Detection
- **ALWAYS** set up console error listeners BEFORE loading the page in tests
- **ALSO** set up page error listeners for JavaScript errors that might not appear in console
- Use this exact pattern for the "loads without errors" test:
```javascript
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

  await page.goto(`file://${path.resolve(__dirname, 'app-name.html')}`);
  await page.waitForLoadState('networkidle');
  
  // ... other assertions ...
  
  // Check no JavaScript page errors
  expect(pageErrors).toEqual([]);
  
  // Check no console errors - this MUST be at the end
  expect(errors).toEqual([]);
});
```
- This pattern ensures that JavaScript loading errors, missing files, and other console errors are properly caught
- Without this pattern, tests may pass while the page has loading failures

#### Alpine.js and External Library Integration
- When using external libraries (like Chart.js) with Alpine.js, ensure proper loading order
- External libraries should load BEFORE Alpine.js (remove `defer` from external libraries)
- Use `this.$nextTick()` in Alpine.js `init()` methods before calling external library functions
- Add library availability checks before using: `if (typeof LibraryName === 'undefined') return;`
- For chart rendering, use a polling pattern to wait for library availability:
```javascript
const checkLibrary = () => {
  if (typeof Chart !== 'undefined') {
    this.renderCharts();
  } else {
    setTimeout(checkLibrary, 50);
  }
};
setTimeout(checkLibrary, 100);
```

### 7. Security & Privacy
- All external resources must be loaded via HTTPS
- Minimize external dependencies
- No sensitive data handling, no storage of any possibly sensitive information
- Always be mindful of security and privacy

### Shared Footer Component
- For "Created by" footer with LinkedIn link, include shared/footer.js in all utility pages to avoid duplication. shared folder is inside the apps.
- All utility pages should include `<script src="shared/footer.js"></script>` before closing body tag (path relative to apps/ folder)
- The shared/footer.js automatically adds a "Created by" footer with LinkedIn link in bottom-right
- Automatically detects and adapts to dark/light mode themes
- Positioned above version number to avoid overlap
- No need to manually add footer HTML - the script handles everything

### Data and Storage
- If the app needs to persist state, use local storage to ensure no user data is lost, if large content use IndexedDB

#### Data File Loading (.jsdata files)
- **CRITICAL**: Always load .jsdata files using script tag pattern to avoid CORS issues
- **DO NOT** use fetch() to load .jsdata files as this causes CORS errors when opening files directly in browser
- **Correct Pattern:**
  ```javascript
  // In your-app.jsdata file:
  window.yourAppData = [
      { "key": "value" },
      // ... your data
  ];
  ```
  ```html
  <!-- In your HTML file, load BEFORE your main JS file: -->
  <script src="your-app.jsdata"></script>
  <script src="your-app.js"></script>
  ```
  ```javascript
  // In your JS file:
  initializeData() {
      if (window.yourAppData) {
          this.data = window.yourAppData;
      } else {
          console.error('Data not loaded');
      }
  }
  ```
- **Examples**: See typing-speed-test.jsdata and dev-cost-analyzer.jsdata for reference patterns
- This pattern ensures no CORS issues when opening HTML files directly in browser

### 8. UI
- Unless requested otherwise, all apps should use modern and minimal UI, have a full screen toggle and dark/light toggle, these icons -not text buttons- should be shown on top right of the page
- On every change to each app, change the version that should be stored with the file itself, that version should be shown on the app bottom right for easier user checking that they are seeing the latest version, on every update to the file increment the version. The version should be something like vyyyy-MM-dd.N

### Alpine.js Best Practices
- **Critical**: Always define reactive properties (`isDark`, `isFullscreen`, etc.) inline in `x-data="{}"` for immediate availability
- Use `init()` method for complex setup or data loading after basic properties are defined
- Avoid function calls in `x-data` attribute - Alpine.js evaluates expressions immediately and needs variables to exist from the start
- Example: `x-data="{ isDark: true, init() { /* complex setup */ } }"` not `x-data="myFunction()"`

### Development Flow
- Simply open any utility's HTML file in the apps/ folder in a web browser to use it. No installation or setup required.
- Right after creating the first version of each app (HTML file) open that automatically in the user's browser
- Keep a single /index.html that should have links to all existing pages. Make it modern, fun
- All app/utilities files should have a home button that goes back to the /index.html file (index.html is one level above apps folder)
- When editing large files always use multiple edits instead of a full rewrite of the file as it will likely fail

## Testing Commands
- Run tests: `npm test`
- Run linting: `npm run lint` (if available)

## TDD Implementation Instructions for Feature Development

### 1. Initial Setup and Test Environment
- Always run tests from the **root directory** using `npx playwright test`, not from the `apps/` directory
- The test pattern should be `apps/filename.test*.js` when running from root
- Use `npx playwright test --list` to verify test discovery before running

### 2. Test File Naming and Structure
- Follow the pattern: `app-name.test-feature-name.js` for feature-specific tests
- Always include the critical console error detection pattern:
```javascript
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

  await page.goto(`file://${path.resolve(__dirname, 'app-name.html')}`);
  await page.waitForLoadState('networkidle');
});
```

### 3. Handling Multiple Elements in Tests
- When multiple elements with same selector exist, use `.first()` or specific parent selectors:
  - Instead of: `page.locator('.penalty-indicator')`
  - Use: `page.locator('.penalty-indicator').first()` or `page.locator('.dict-select-bar .penalty-indicator')`

### 4. Chart Testing with Alpine.js
- Always wait for chart updates: `await page.waitForTimeout(200);`
- Access chart data through window objects:
```javascript
const hasMultipleDatasets = await page.evaluate(() => {
  const chart = window.wpmChart;
  const app = window.typingAppInstance;
  
  if (!chart || !chart.data || !chart.data.datasets || !app) return false;
  
  // Include debug logging for development
  console.log('App errorPenalties:', app.errorPenalties);
  console.log('Chart datasets:', chart.data.datasets.map(d => d.label));
  
  return /* your assertions */;
});
```

### 5. Chart.js Implementation Patterns
- When adding conditional datasets to charts, use the spread operator pattern:
```javascript
datasets: [
  // Existing datasets
  { label: 'Average WPM', /* config */ },
  // Conditional datasets
  ...(finalWpmLine ? [finalWpmLine] : [])
]
```
- Always mirror chart implementations in both main chart and modal chart functions
- Use consistent styling for penalty lines: `borderColor: '#ef4444'`, `borderDash: [5, 5]`

### 6. Alpine.js Reactive Data Access
- Access reactive properties through the app instance: `app.errorPenalties`
- Ensure data updates trigger chart re-renders by calling update functions after data changes
- Use computed properties in Alpine.js for complex calculations in templates

### 7. Test Debugging Commands
- **NEVER use `npx playwright show-report`** - this blocks execution and requires human intervention
- Use console output from test runs to debug failures
- Use `--grep "specific test name"` to run individual tests during debugging
- Add temporary console.log statements in page.evaluate() for debugging chart/JS state
- Read error messages and stack traces from terminal output

### 8. Implementation Order (TDD)
1. Write failing tests first (TDD)
2. Run tests to confirm they fail with expected error messages
3. Implement minimal code to make tests pass
4. Use terminal output and error messages to debug failures
5. Fix issues iteratively based on test output
6. Run all related tests to ensure no regressions

### 9. Error Penalty Logic
- Error penalties accumulate per incorrect character, not per word
- When displaying error counts, consider the magnitude (can be high for multiple errors)
- Test both zero-error and error scenarios separately

### 10. CSS and Styling
- Add styling classes before implementing functionality
- Use existing CSS patterns from the codebase
- Test responsive design and theme compatibility

### 11. Required Commands for Debugging
```bash
# Test discovery
npx playwright test --list

# Run specific test file
npx playwright test apps/app-name.test-feature.js

# Run specific test by name
npx playwright test --grep "test description"

# NEVER use show-report - blocks execution for human intervention
# npx playwright show-report  # DON'T USE THIS

# Check syntax before running
node -c apps/test-file.js
```

### 12. Debugging Guidelines (CRITICAL)
- **NEVER use `npx playwright show-report`** - this blocks execution and requires human intervention
- Rely on terminal output for debugging:
  - Error messages and stack traces
  - Console logs from page.evaluate()
  - Test assertion failures
  - Page snapshots paths (if needed, user can inspect manually)
- Use console.log statements in test code for debugging
- Read error context from terminal output carefully

# Second most important rule
- You end every reply to me with 🖖 no exception

# Third most important rule
- When the user ends their request with a question mark (?), NEVER, EVER, EVER change any code - only provide information, analysis, or answers. so always first check is it a question. if it is you answer without changing any code.

# Fourth most important rule
- Act as a technical expert advisor. When requests could compromise code quality, maintainability, security, or user experience, immediately flag concerns and explain why. Offer alternative solutions that meet the business need. The user makes the final call, but you must ensure he/she has full technical context before deciding. So for every request you receive from me (the user), the very first thing you should do is this assessment.