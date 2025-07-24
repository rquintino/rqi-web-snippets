/**
 * Shared Footer Component
 * Automatically adds a "Created by" footer with LinkedIn link
 * Adapts to dark/light mode themes and positions above version number
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create footer element
    const footer = document.createElement('div');
    footer.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 10px;
        font-size: 0.75rem;
        opacity: 0.5;
        font-family: system-ui, sans-serif;
        z-index: 1000;
    `;
    
    // Create link
    const link = document.createElement('a');
    link.href = 'https://www.linkedin.com/in/rquintino/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Created by RQ';
    link.style.cssText = `
        color: inherit;
        text-decoration: none;
    `;
    
    // Add hover effect
    link.addEventListener('mouseenter', () => {
        link.style.opacity = '1';
        link.style.textDecoration = 'underline';
    });
    
    link.addEventListener('mouseleave', () => {
        link.style.opacity = '0.5';
        link.style.textDecoration = 'none';
    });
    
    footer.appendChild(link);
    document.body.appendChild(footer);
    
    // Adapt to dark mode changes
    const observer = new MutationObserver(() => {
        const isDark = document.body.classList.contains('dark');
        footer.style.color = isDark ? '#f1f5f9' : '#1e293b';
    });
    
    observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['class'] 
    });
    
    // Set initial color
    const isDark = document.body.classList.contains('dark');
    footer.style.color = isDark ? '#f1f5f9' : '#1e293b';
});