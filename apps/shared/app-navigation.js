/**
 * App Navigation System
 * Contains apps registry and provides prev/next navigation between apps
 * Positioned at bottom-left with modern icons and hover tooltips
 */

const APPS_REGISTRY = [
    {
        filename: "typing-speed-test.html",
        title: "Typing Speed Test",
        description: "Test and improve your typing speed with this interactive tool",
        icon: "⌨️",
        screenshot: "typing-speed-test.jpeg"
    },
    {
        filename: "foundation-model-training.html",
        title: "Foundation Model Training",
        description: "Interactive visualization of AI foundation model training process",
        icon: "🤖",
        screenshot: "foundation-model-training.jpeg"
    },
    {
        filename: "how-does-genai-learn.html",
        title: "How Does GenAI Learn?",
        description: "Learn how language models train using masked word prediction",
        icon: "🎯",
        screenshot: "how-does-genai-learn.jpeg"
    },
    {
        filename: "markdown-viewer.html",
        title: "Markdown Viewer",
        description: "Three-pane markdown viewer with TOC and live preview",
        icon: "📝",
        screenshot: "markdown-viewer.jpeg"
    },
    {
        filename: "typing-stats.html",
        title: "Typing Stats",
        description: "Real-time typing analytics with deep behavioral insights",
        icon: "📊",
        screenshot: "typing-stats.jpeg"
    },
    {
        filename: "typing-stats-insights.html",
        title: "Typing Stats Insights",
        description: "Advanced behavioral analysis dashboard for typing data with coaching recommendations",
        icon: "🔍",
        screenshot: "typing-stats-insights.jpeg"
    },
    {
        filename: "how-llms-work.html",
        title: "How LLMs Work",
        description: "Interactive visualization of how Large Language Models process inputs to generate outputs",
        icon: "🧠",
        screenshot: "how-llms-work.jpeg"
    },
    {
        filename: "whats-new-with-genai.html",
        title: "What's New with GenAI",
        description: "Explore the differences between Traditional AI and Generative AI with interactive visuals.",
        icon: "✨",
        screenshot: "whats-new-with-genai.jpeg"
    },
    {
        filename: "image-mask.html",
        title: "Image Mask",
        description: "Privacy-focused image masking tool with blur, pixelate, blackout and noise effects",
        icon: "🔒",
        screenshot: "image-mask.jpeg"
    },
    {
        filename: "dev-cost-analyzer.html",
        title: "Development Cost Analyzer",
        description: "Comprehensive analysis dashboard for development costs and complexity across all web applications",
        icon: "💰",
        screenshot: "dev-cost-analyzer.jpeg"
    },
    {
        filename: "carrousel-generator.html",
        title: "LinkedIn Carousel Generator",
        description: "Create professional LinkedIn carousel slides with images, text callouts, and export to PDF",
        icon: "📑",
        screenshot: "carrousel-generator.jpeg"
    },
    {
        filename: "pomodoro-timer.html",
        title: "Pomodoro Timer",
        description: "Focus timer using the Pomodoro technique with work sessions, breaks, and progress tracking",
        icon: "⏱️",
        screenshot: "pomodoro-timer.jpeg"
    }
];

// Export registry for other scripts (like index.html)
window.appsRegistry = APPS_REGISTRY;

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});

function initializeNavigation() {
    // Get current app filename
    const currentPath = window.location.pathname;
    const currentFilename = currentPath.split('/').pop();
    
    // Find current app index in registry
    const currentIndex = APPS_REGISTRY.findIndex(app => app.filename === currentFilename);
    
    // Only show navigation if we're in an app (not index.html)
    if (currentIndex === -1) return;
    
    // Create navigation container
    const navContainer = document.createElement('div');
    navContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        display: flex;
        gap: 12px;
        z-index: 1000;
        font-family: system-ui, sans-serif;
    `;
    
    // Previous button
    const prevIndex = (currentIndex - 1 + APPS_REGISTRY.length) % APPS_REGISTRY.length;
    const prevApp = APPS_REGISTRY[prevIndex];
    
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '◀';
    prevBtn.title = `Previous: ${prevApp.title}`;
    prevBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        opacity: 0.3;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    `;
    
    prevBtn.addEventListener('click', () => {
        window.location.href = prevApp.filename;
    });
    
    prevBtn.addEventListener('mouseenter', () => {
        prevBtn.style.opacity = '1';
        prevBtn.style.transform = 'scale(1.1)';
        prevBtn.style.background = 'rgba(0, 0, 0, 0.9)';
    });
    
    prevBtn.addEventListener('mouseleave', () => {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.transform = 'scale(1)';
        prevBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    });
    
    // Next button
    const nextIndex = (currentIndex + 1) % APPS_REGISTRY.length;
    const nextApp = APPS_REGISTRY[nextIndex];
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '▶';
    nextBtn.title = `Next: ${nextApp.title}`;
    nextBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        opacity: 0.3;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    `;
    
    nextBtn.addEventListener('click', () => {
        window.location.href = nextApp.filename;
    });
    
    nextBtn.addEventListener('mouseenter', () => {
        nextBtn.style.opacity = '1';
        nextBtn.style.transform = 'scale(1.1)';
        nextBtn.style.background = 'rgba(0, 0, 0, 0.9)';
    });
    
    nextBtn.addEventListener('mouseleave', () => {
        nextBtn.style.opacity = '0.3';
        nextBtn.style.transform = 'scale(1)';
        nextBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    });
    
    // Adapt to dark mode
    const updateTheme = () => {
        const isDark = document.body.classList.contains('dark') || 
                       document.body.hasAttribute('data-theme') && 
                       document.body.getAttribute('data-theme') === 'dark';
        
        const bgColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.7)';
        const bgColorHover = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.9)';
        const textColor = isDark ? '#f1f5f9' : 'white';
        
        [prevBtn, nextBtn].forEach(btn => {
            btn.style.background = bgColor;
            btn.style.color = textColor;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.background = bgColorHover;
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.background = bgColor;
            });
        });
    };
    
    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['class', 'data-theme'] 
    });
    
    // Set initial theme
    updateTheme();
    
    navContainer.appendChild(prevBtn);
    navContainer.appendChild(nextBtn);
    document.body.appendChild(navContainer);
}