/**
 * Deployment Info Updater
 * 
 * Updates deployment information including timestamp and commit info
 * for display on the main index page.
 * 
 * Usage:
 * - npm run update-deploy-info
 * - node scripts/update-deployment-info.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitInfo() {
    try {
        const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        const shortHash = commitHash.substring(0, 7);
        const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
        const authorDate = execSync('git log -1 --pretty=%ai', { encoding: 'utf8' }).trim();
        
        return {
            commitHash,
            shortHash,
            commitMessage,
            authorDate
        };
    } catch (error) {
        console.warn('Warning: Could not get git info:', error.message);
        return {
            commitHash: 'unknown',
            shortHash: 'unknown',
            commitMessage: 'No git info available',
            authorDate: new Date().toISOString()
        };
    }
}

function updateDeploymentInfo() {
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        deployDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        }),
        deployTime: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
        }),
        environment: process.env.GITHUB_ACTIONS ? 'GitHub Pages' : 'Local',
        ...getGitInfo()
    };

    // Create JavaScript module for web inclusion
    const jsPath = path.join(__dirname, '..', 'apps', 'shared', 'deployment-info.js');
    
    // Ensure the shared directory exists
    const sharedDir = path.dirname(jsPath);
    if (!fs.existsSync(sharedDir)) {
        fs.mkdirSync(sharedDir, { recursive: true });
    }

    const jsContent = `// Auto-generated deployment info - do not edit manually
window.deploymentInfo = ${JSON.stringify(deploymentInfo, null, 2)};
`;

    fs.writeFileSync(jsPath, jsContent);

    // Update cache-busting version in index.html
    const indexPath = path.join(__dirname, '..', 'index.html');
    
    try {
        if (fs.existsSync(indexPath)) {
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // Create cache-busting version from timestamp (removing non-alphanumeric chars)
            const cacheVersion = deploymentInfo.timestamp.replace(/[^a-zA-Z0-9]/g, '');
            
            // Update deployment-info.js version
            const updatedContent = indexContent.replace(
                /deployment-info\.js\?v=[^"']*/g,
                `deployment-info.js?v=${cacheVersion}`
            );
            
            if (updatedContent !== indexContent) {
                fs.writeFileSync(indexPath, updatedContent);
                console.log('🔄 Updated cache-busting version in index.html:', cacheVersion);
            }
        }
    } catch (error) {
        console.warn('⚠️  Warning: Could not update index.html cache-busting version:', error.message);
    }

    console.log('✅ Deployment info updated successfully');
    console.log('📅 Deploy Date:', deploymentInfo.deployDate);
    console.log('⏰ Deploy Time:', deploymentInfo.deployTime);
    console.log('📝 Commit:', deploymentInfo.shortHash, '-', deploymentInfo.commitMessage.split('\n')[0]);
    console.log('📁 File created:', jsPath);

    return deploymentInfo;
}

// Run if called directly
if (require.main === module) {
    updateDeploymentInfo();
}

module.exports = { updateDeploymentInfo };