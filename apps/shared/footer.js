/**
 * Footer Component
 * PURPOSE:
 * Automatically injects a "Created by" footer with LinkedIn and GitHub links across all utility pages
 * to avoid code duplication while maintaining consistent branding.
 * 
 * FEATURES:
 * - Automatic dark/light mode detection and styling
 * - Prevents duplicate footers
 * - Fixed position bottom-right
 * - Responsive design with backdrop blur
 * - Accessible with proper link attributes
 * - GitHub repository link for quick reference
 */

const Footer = (() => {
    const LINKEDIN_URL = 'https://www.linkedin.com/in/rquintino/';
    const GITHUB_URL = 'https://github.com/rquintino/rqi-web-snippets';
    const AUTHOR_NAME = '© Copyright 2025 Rui Quintino';
    
    const styles = {
        container: `
            position: fixed;
            bottom: 25px;
            right: 10px;
            font-size: 0.8rem;
            opacity: 0.7;
            z-index: 1000;
            padding: 4px 8px;
            border-radius: 6px;
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease;
            border: 1px solid rgba(0,0,0,0.1);
        `,
        link: `
            color: inherit;
            text-decoration: none;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        `,
        light: {
            background: 'rgba(255,255,255,0.98)',
            color: '#222222',
            borderColor: 'rgba(0,0,0,0.2)',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)'
        },
        dark: {
            background: 'rgba(80,80,80,0.98)',
            color: '#ffffff',
            borderColor: 'rgba(255,255,255,0.5)',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }
    };

    const linkedInIcon = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
    `;
    
    const githubIcon = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
        </svg>
    `;

    function isDarkMode() {
        return document.body.classList.contains('dark-mode') || 
               document.body.getAttribute('data-theme') === 'dark' ||
               document.documentElement.classList.contains('dark');
    }

    function applyTheme(footer) {
        const theme = isDarkMode() ? styles.dark : styles.light;
        Object.assign(footer.style, theme);
    }

    function createFooterElement() {
        const footer = document.createElement('div');
        footer.className = 'created-by-footer';
        footer.style.cssText = styles.container;
        
        footer.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
                <span>${AUTHOR_NAME}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <a href="${LINKEDIN_URL}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       style="${styles.link}"
                       title="LinkedIn Profile">
                        ${linkedInIcon}
                    </a>
                    <a href="${GITHUB_URL}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       style="${styles.link}"
                       title="GitHub Repository">
                        ${githubIcon}
                    </a>
                </div>
            </div>
        `;

        // Add hover effects
        // No hover opacity changes needed since we're at full opacity by default

        return footer;
    }

    function setupThemeWatcher(footer) {
        const observer = new MutationObserver(() => applyTheme(footer));
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'data-theme']
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return observer;
    }

    function init() {
        // Prevent duplicate footers
        if (document.querySelector('.created-by-footer')) return;
        
        const footer = createFooterElement();
        applyTheme(footer);
        setupThemeWatcher(footer);
        document.body.appendChild(footer);
    }

    function load() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    return { load };
})();

// Auto-initialize
Footer.load();
