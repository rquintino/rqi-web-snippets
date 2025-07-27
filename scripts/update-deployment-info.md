# Deployment Info System

This system automatically displays deployment information on the main index page, showing when the site was last published to GitHub Pages.

## Features

- **Automatic timestamp injection** during GitHub Pages deployment
- **Commit information** showing the latest changes
- **Environment detection** (Local vs GitHub Pages)
- **Unobtrusive display** in bottom-left corner with hover details

## Files

### Generated Files
- `apps/shared/deployment-info.js` - JavaScript module for web inclusion (placeholder in repo, overwritten on deploy)

### Source Files
- `scripts/update-deployment-info.js` - Script that generates deployment info
- `.github/workflows/deploy.yml` - Updated to run deployment info generation
- `index.html` - Updated to display deployment info

## How It Works

1. **During deployment**: GitHub Actions runs `update-deployment-info.js`
2. **Script collects**:
   - Current timestamp (UTC)
   - Git commit hash and message
   - Environment info (GitHub Pages vs Local)
3. **Generates file**: JavaScript module with deployment info
4. **Index page displays**: Formatted deployment date and details

## Manual Usage

For local testing or manual deployment:

```bash
npm run update-deploy-info
```

This creates the deployment info files locally (marked as "Local" environment).

## Display Format

The deployment info appears as a small, semi-transparent box in the bottom-left corner:

```
Last updated: July 27, 2025
11:15 AM UTC | GitHub Pages | fcbfb7d
```

Hovering over the commit hash shows the full commit message.

## Integration Points

### GitHub Actions Integration
The deploy workflow automatically generates fresh deployment info before each deployment:

```yaml
- name: Generate deployment info
  run: node scripts/update-deployment-info.js
  env:
    TZ: UTC
```

### Index Page Integration
The deployment info is loaded via script tag and displayed when available:

```html
<script src="apps/shared/deployment-info.js"></script>
```

### Version Control
The deployment info file is tracked in the repository as a placeholder that gets overwritten during deployment:

```
# Note: apps/shared/deployment-info.js is tracked as placeholder, overwritten on deploy
```

This ensures tests can run successfully while still having fresh deployment info on each deploy.

## Styling

The deployment info uses CSS variables for theme compatibility and appears as:
- Bottom-left fixed positioning
- Semi-transparent background
- Responsive to dark/light themes
- Hover effect for better visibility
- Non-intrusive 12px font size

## Error Handling

- If git info is unavailable, falls back to basic timestamp
- If deployment info fails to load, display is simply hidden
- No errors are thrown if the feature is missing