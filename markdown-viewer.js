/**
 * Markdown Viewer
 * 
 * A three-pane markdown editor and viewer with table of contents.
 * Features include drag & drop file upload, synchronized TOC navigation,
 * and dark/light theme support.
 * 
 * Main functions:
 * - init: Initialize the application
 * - updatePreview: Generate HTML preview and TOC from markdown
 * - generateTOC: Create table of contents from headings
 * - handleDrop: Process dropped markdown files
 * - toggleTheme: Switch between dark and light mode
 * - toggleFullscreen: Toggle fullscreen mode
 * - toggleInputPane: Toggle the visibility of the input pane
 * - copyHtml: Copy formatted HTML to clipboard
 */

const DEFAULT_MARKDOWN = `# Markdown Viewer

## Introduction
This is a three-pane markdown viewer with table of contents support.

## Features
- Edit markdown in the left pane
- Navigate with the table of contents in the middle
- See the formatted result in the right pane

### Drag & Drop
Drag and drop any markdown file into the editor to load it.

### Syntax Highlighting
\`\`\`javascript
// Code blocks are highlighted
function example() {
  console.log("Hello, world!");
}
\`\`\`

### Tables
| Feature | Description |
|---------|-------------|
| Editing | Real-time markdown editing |
| Preview | Instant preview rendering |
| TOC     | Automatic table of contents |

## How to Use
1. Type or paste markdown in the left panel
2. Use the table of contents to navigate
3. View the formatted output on the right

## File Handling
- Drag and drop .md files to load them
- No data is saved automatically - copy content if needed

## About
Created with Alpine.js and Marked.
`;

function markdownViewer() {
    return {
        markdownText: DEFAULT_MARKDOWN,
        previewHtml: '',
        tocHtml: '',
        isDark: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
        isFullscreen: false,
        isDragging: false,
        showToast: false,
        toastMessage: '',
        isInputCollapsed: false,
        
        init() {
            // Set initial theme
            if (this.isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('hljs-theme').href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css';
            }
            
            // Update preview
            this.updatePreview();
            
            // Set up drag and drop events
            window.addEventListener('dragenter', () => {
                this.isDragging = true;
            });
            
            window.addEventListener('dragleave', (e) => {
                if (e.clientX === 0 && e.clientY === 0) {
                    this.isDragging = false;
                }
            });
            
            window.addEventListener('drop', () => {
                this.isDragging = false;
            });
        },
        
        updatePreview() {
            // Generate HTML from markdown
            try {
                // Create a custom renderer
                const renderer = new marked.Renderer();
                
                // Override the code rendering method
                renderer.code = function(code, language) {
                    // Add class for syntax highlighting
                    const languageClass = language ? ` class="language-${language}"` : '';
                    
                    // Escape the code to prevent XSS
                    const escapedCode = DOMPurify.sanitize(code);
                    return `<pre><code${languageClass}>${escapedCode}</code></pre>`;
                };
                
                // Override link rendering to force _blank and noopener
                renderer.link = function(href, title, text) {
                    // Sanitize the URL to prevent javascript: protocol attacks
                    if (href.toLowerCase().startsWith('javascript:') || 
                        href.toLowerCase().startsWith('data:') ||
                        href.toLowerCase().startsWith('vbscript:')) {
                        return text;
                    }
                    
                    const titleAttr = title ? ` title="${DOMPurify.sanitize(title)}"` : '';
                    return `<a href="${DOMPurify.sanitize(href)}" rel="noopener noreferrer" target="_blank"${titleAttr}>${text}</a>`;
                };
                
                // Set marked options
                marked.setOptions({
                    renderer: renderer,
                    gfm: true,
                    breaks: true,
                    sanitize: false, // We'll use DOMPurify instead
                    smartLists: true,
                    smartypants: true,
                    xhtml: false
                });
                
                // Generate HTML and sanitize with strict config
                const rawHtml = marked.parse(this.markdownText);
                
                // Configure DOMPurify with strict options
                const purifyConfig = {
                    ALLOWED_TAGS: [
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 
                        'blockquote', 'code', 'pre', 'strong', 'em', 'table', 'thead', 
                        'tbody', 'tr', 'th', 'td', 'br', 'hr', 'img', 'del', 'span'
                    ],
                    ALLOWED_ATTR: [
                        'href', 'target', 'rel', 'id', 'class', 'title', 'src', 'alt', 'style'
                    ],
                    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'button', 'svg'],
                    ADD_ATTR: ['target', 'rel'], // Add these to links
                    ALLOW_DATA_ATTR: false,
                    USE_PROFILES: { html: true },
                    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
                };
                
                this.previewHtml = DOMPurify.sanitize(rawHtml, purifyConfig);
                
                // Generate TOC
                this.generateTOC();
            } catch (error) {
                console.error('Error rendering markdown:', error);
                const errorMessage = DOMPurify.sanitize(`Error rendering markdown: ${error.message}`);
                this.previewHtml = `<div class="error">${errorMessage}</div>`;
            }
        },
        
        generateTOC() {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.previewHtml;
            
            const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
            
            if (headings.length === 0) {
                this.tocHtml = '<p class="toc-empty">No headings found</p>';
                return;
            }
            
            let toc = '<ul>';
            
            headings.forEach((heading, index) => {
                // Create id for the heading if it doesn't have one
                if (!heading.id) {
                    heading.id = `heading-${index}`;
                }
                
                const level = parseInt(heading.tagName.substring(1));
                const text = heading.textContent;
                const id = heading.id;
                
                toc += `<li class="toc-h${level}"><a href="#" data-target="${id}" @click.prevent="scrollToHeading('${id}')">${text}</a></li>`;
            });
            
            toc += '</ul>';
            this.tocHtml = toc;
        },
        
        scrollToHeading(id) {
            // First, find the heading in the preview pane
            const previewPane = document.querySelector('.preview-content');
            
            // Safely escape the ID for use in querySelector
            const escapedId = CSS.escape(id);
            const targetHeading = previewPane.querySelector(`#${escapedId}`);
            
            if (targetHeading) {
                // Scroll the heading into view
                targetHeading.scrollIntoView({ behavior: 'smooth' });
            }
        },
        
        handleDrop(event) {
            this.isDragging = false;
            
            const file = event.dataTransfer.files[0];
            if (!file) return;
            
            // Check if it's a markdown file
            if (!file.name.toLowerCase().endsWith('.md') && 
                !file.name.toLowerCase().endsWith('.markdown') && 
                file.type !== 'text/markdown') {
                this.showToastMessage('Please drop a markdown file');
                return;
            }
            
            // Check file size limit (10MB)
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_FILE_SIZE) {
                this.showToastMessage('File too large (max 10MB)');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // Sanitize the file content before setting it
                    const content = e.target.result;
                    // Only assign if it's a string (text)
                    if (typeof content === 'string') {
                        this.markdownText = content;
                        this.updatePreview();
                        this.showToastMessage(`Loaded: ${file.name}`);
                    } else {
                        throw new Error("Invalid file content");
                    }
                } catch (error) {
                    console.error("Error processing file:", error);
                    this.showToastMessage('Error processing file');
                }
            };
            reader.onerror = () => {
                this.showToastMessage('Error reading file');
            };
            
            // Only read as text, not as binary or other formats
            reader.readAsText(file);
        },
        
        toggleTheme() {
            this.isDark = !this.isDark;
            
            if (this.isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('hljs-theme').href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                document.getElementById('hljs-theme').href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
            }
            
            // Re-render the preview with the new theme
            this.updatePreview();
        },
        
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
                this.isFullscreen = true;
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    this.isFullscreen = false;
                }
            }
        },
        
        toggleInputPane() {
            this.isInputCollapsed = !this.isInputCollapsed;
        },
        
        copyHtml() {
            try {
                const previewHtml = this.previewHtml;
                
                // Use the Clipboard API with proper error handling
                navigator.clipboard.writeText(previewHtml)
                    .then(() => {
                        this.showToastMessage('HTML copied to clipboard');
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                        this.showToastMessage('Failed to copy HTML - permission denied');
                    });
            } catch (error) {
                console.error('Clipboard error:', error);
                this.showToastMessage('Error accessing clipboard');
            }
        },
        
        showToastMessage(message) {
            // Sanitize the message
            const sanitizedMessage = DOMPurify.sanitize(message);
            this.toastMessage = sanitizedMessage;
            this.showToast = true;
            
            setTimeout(() => {
                this.showToast = false;
            }, 3000);
        }
    };
}
