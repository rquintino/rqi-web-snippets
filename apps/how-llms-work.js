/**
 * How LLMs Work - Interactive Visualization
 * 
 * Purpose: Alpine.js component for visualizing how Large Language Models process inputs
 * Main methods:
 * - llmVisualization(): Main Alpine.js data function
 * - toggleTheme(): Switches between light/dark themes
 * - toggleFullscreen(): Enables/disables fullscreen mode
 * - generateNetworkConnections(): Creates network connection data for SVG
 * - generatePatternNodes(): Creates pattern node data for visualization
 */

function llmVisualization() {
    return {
        isDark: true,
        isFullscreen: false,
        patternNodes: [
            { x: 20, y: 20, size: 18, delay: 0 },
            { x: 60, y: 15, size: 14, delay: 100 },
            { x: 80, y: 40, size: 16, delay: 200 },
            { x: 15, y: 60, size: 20, delay: 300 },
            { x: 45, y: 50, size: 24, delay: 400 },
            { x: 75, y: 70, size: 18, delay: 500 },
            { x: 30, y: 85, size: 16, delay: 600 },
            { x: 65, y: 85, size: 14, delay: 700 },
            { x: 50, y: 25, size: 12, delay: 800 },
            { x: 25, y: 45, size: 16, delay: 900 },
            { x: 85, y: 20, size: 14, delay: 1000 },
            { x: 10, y: 30, size: 18, delay: 1100 },
            { x: 40, y: 15, size: 15, delay: 1200 },
            { x: 70, y: 25, size: 13, delay: 1300 },
            { x: 35, y: 70, size: 17, delay: 1400 },
            { x: 55, y: 75, size: 15, delay: 1500 },
            { x: 85, y: 60, size: 19, delay: 1600 },
            { x: 20, y: 75, size: 14, delay: 1700 },
            { x: 60, y: 35, size: 16, delay: 1800 },
            { x: 75, y: 50, size: 18, delay: 1900 }
        ],
        
        init() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            const savedTheme = localStorage.getItem('llm-theme');
            if (savedTheme) {
                this.isDark = savedTheme === 'dark';
            }
        },
        
        toggleTheme() {
            this.isDark = !this.isDark;
            localStorage.setItem('llm-theme', this.isDark ? 'dark' : 'light');
            document.body.classList.toggle('light', !this.isDark);
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 100);
        },
        
        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            if (this.isFullscreen) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    };
}

document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    const component = document.querySelector('[x-data]').__x?.$data;
    if (component) {
        component.isFullscreen = isFullscreen;
    }
});

// Make function globally available
window.llmVisualization = llmVisualization;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});