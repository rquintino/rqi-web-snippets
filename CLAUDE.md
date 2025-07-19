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
- Only use well-established libraries with strong security track records, if in doubt, stop and confirm with user
- Don't use libraries with any known security or privacy risks

### 4. Code Philosophy
- Prioritize code readability and simplicity over performance, these are personal standalone apps/tools
- Keep applications lightweight and focused
- Not intended for critical or data-intensive operations

### CSS file token reduction rules for LLMs
- Use the shortest legal form of every property/value pair
- Remove tabs, extra spaces inside each individual CSS block, trim everything possible inside. ex. .char {position: relative}
- Keep multiple lines, one per block/CSS declaration
- Remove blank lines
- No comments and last semicolons
- Omit units on 0
- Put long or repeated literals once in :root, then reference
- Group selectors that share declarations: .b,.c{color:#fff}

### Automated Testing
- For automated testing we're using playwright/test with node.js
- For each app the tests will be in <apptitle>.test.js file
- Always ensure the minimal test which is the app loads without network or console errors
- When adding a feature also add needed tests, be exhaustive, always

#### Critical Testing Pattern for Console Error Detection
- **ALWAYS** set up console error listeners BEFORE loading the page in tests
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

  await page.goto(`file://${path.resolve(__dirname, 'app-name.html')}`);
  await page.waitForLoadState('networkidle');
  
  // ... other assertions ...
  
  // Check no console errors - this MUST be at the end
  expect(errors).toEqual([]);
});
```
- This pattern ensures that JavaScript loading errors, missing files, and other console errors are properly caught
- Without this pattern, tests may pass while the page has loading failures

### 5. Security & Privacy
- All external resources must be loaded via HTTPS
- Minimize external dependencies
- No sensitive data handling, no storage of any possibly sensitive information
- Always be mindful of security and privacy

### Shared Footer Component
- For "Created by" footer with LinkedIn link, include shared/footer.js in all utility pages to avoid duplication
- All utility pages should include `<script src="shared/footer.js"></script>` before closing body tag (path relative to apps/ folder)
- The shared/footer.js automatically adds a "Created by" footer with LinkedIn link in bottom-right
- Automatically detects and adapts to dark/light mode themes
- Positioned above version number to avoid overlap
- No need to manually add footer HTML - the script handles everything

### Data and Storage
- If the app needs to persist state, use local storage to ensure no user data is lost, if large content use IndexedDB

### 6. UI
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
- Keep a single apps/index.html that should have links to all existing pages. Make it modern, fun
- All app/utilities files should have a home button that goes back to the apps/index.html file
- When editing large files always use multiple edits instead of a full rewrite of the file as it will likely fail

## Testing Commands
- Run tests: `npm test`
- Run linting: `npm run lint` (if available)