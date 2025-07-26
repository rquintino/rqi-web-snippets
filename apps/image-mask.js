/**
 * Image Mask - Privacy-focused image masking utility
 * 
 * Main functionality:
 * - Canvas-based image editing with immediate effect application
 * - Rectangle selection for masking areas
 * - Multiple effects: blur, pixelate, blackout, noise
 * - Undo/redo functionality with history tracking
 * - Copy to clipboard and download capabilities
 * - All processing client-side for maximum privacy
 */

window.ImageMask = (function() {
    let canvas, ctx;
    let image = null;
    let originalImage = null;
    let isDrawing = false;
    let startX, startY;
    let currentEffect = 'noise & blur';
    let history = [];
    let currentHistoryIndex = -1;
    let scaleRatio = 1;
    
    // Secure random number generator using Web Crypto API
    function secureRandom() {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xFFFFFFFF + 1); // Convert to 0-1 range
    }
    
    function secureRandomInt(max) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return Math.floor((array[0] / (0xFFFFFFFF + 1)) * max);
    }
    
    function init(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        setupEventListeners();
        saveState();
        setupKeyboardShortcuts();
    }
    
    function setupEventListeners() {
        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        
        // Touch events
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        canvas.addEventListener('touchend', handleTouch);
    }
    
    function handleTouch(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        const mouseEvent = new MouseEvent(e.type.replace('touch', 'mouse').replace('start', 'down').replace('end', 'up'), {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
    
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        // Calculate position relative to the actual canvas coordinates
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    function startDrawing(e) {
        if (!image) return;
        
        isDrawing = true;
        const pos = getMousePos(e);
        startX = pos.x;
        startY = pos.y;
    }
    
    function restoreCanvasState(callback) {
        if (history.length > 0) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                if (callback) callback();
            };
            img.src = history[currentHistoryIndex];
        }
    }
    
    function draw(e) {
        if (!isDrawing || !image) return;
        
        const pos = getMousePos(e);
        
        restoreCanvasState(() => {
            // Draw selection rectangle
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
            ctx.setLineDash([]);
        });
    }
    
    function stopDrawing(e) {
        if (!isDrawing || !image) return;
        
        isDrawing = false;
        const pos = getMousePos(e);
        
        const width = Math.abs(pos.x - startX);
        const height = Math.abs(pos.y - startY);
        
        if (width > 5 && height > 5) {
            const x = Math.min(startX, pos.x);
            const y = Math.min(startY, pos.y);
            
            restoreCanvasState(() => {
                applyEffect(x, y, width, height);
                saveState();
            });
        } else {
            restoreCanvasState();
        }
    }
    
    function applyEffect(x, y, width, height) {
        const imageData = ctx.getImageData(x, y, width, height);
        
        switch(currentEffect) {
            case 'blackout':
                applyBlackout(imageData);
                break;
            case 'noise':
            case 'noise & blur':
                applyNoiseWithLocalColors(imageData);
                break;
        }
        
        ctx.putImageData(imageData, x, y);
    }
    
    function applyBlackout(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            // Keep alpha unchanged
        }
    }
    
    function applyNoiseWithLocalColors(imageData) {
        /**
         * LOCAL COLOR NOISE ALGORITHM EXPLAINED:
         * 
         * This algorithm creates privacy-preserving noise that maintains visual coherence
         * by using colors from the local area rather than pure random colors.
         * 
         * STEP 1: COLOR SAMPLING PHASE
         * - For each pixel, we sample colors from a surrounding area (sampleRadius = 20px)
         * - We skip every other pixel (dy += 2, dx += 2) for performance
         * - This creates a pool of ~400 colors representative of the local area
         * - Colors are clamped to image boundaries to avoid edge artifacts
         * 
         * STEP 2: NOISE GENERATION PHASE  
         * - Pick a random color from the local sample pool using crypto-secure randomness
         * - Add small random variation (±15 per channel) to prevent banding
         * - This preserves general color tone while destroying readable content
         * 
         * STEP 3: BLUR SMOOTHING PHASE
         * - Apply box blur with radius 15 to smooth harsh pixel transitions
         * - Averages each pixel with surrounding 31x31 area
         * - Creates natural-looking texture that's impossible to reverse
         * 
         * PRIVACY BENEFITS:
         * - Uses actual image colors so noise blends naturally
         * - Cryptographically secure randomness prevents pattern prediction
         * - Blur makes individual pixels unrecoverable
         * - Maintains visual appeal while ensuring text/faces are unreadable
         */
        
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const original = new Uint8ClampedArray(data);
        const sampleRadius = 20; // 41x41 sampling area
        
        // PHASE 1: Generate noise using local color palette
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Sample colors from local neighborhood
                const colors = [];
                for (let dy = -sampleRadius; dy <= sampleRadius; dy += 2) {
                    for (let dx = -sampleRadius; dx <= sampleRadius; dx += 2) {
                        const ny = Math.max(0, Math.min(height - 1, y + dy));
                        const nx = Math.max(0, Math.min(width - 1, x + dx));
                        const sampleIdx = (ny * width + nx) * 4;
                        colors.push({
                            r: original[sampleIdx],
                            g: original[sampleIdx + 1],
                            b: original[sampleIdx + 2]
                        });
                    }
                }
                
                // Select random color from local palette
                const randomColor = colors[secureRandomInt(colors.length)];
                
                // Add subtle variation to prevent color banding
                const variation = 30; // ±15 per channel
                data[idx] = Math.max(0, Math.min(255, randomColor.r + (secureRandom() - 0.5) * variation));
                data[idx + 1] = Math.max(0, Math.min(255, randomColor.g + (secureRandom() - 0.5) * variation));
                data[idx + 2] = Math.max(0, Math.min(255, randomColor.b + (secureRandom() - 0.5) * variation));
            }
        }
        
        // PHASE 2: Apply box blur for smooth, natural appearance
        const blurRadius = 15; // 31x31 blur kernel
        const blurred = new Uint8ClampedArray(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                let r = 0, g = 0, b = 0, count = 0;
                
                // Average with surrounding pixels
                for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                    for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            const pixelIdx = (ny * width + nx) * 4;
                            r += blurred[pixelIdx];
                            g += blurred[pixelIdx + 1];
                            b += blurred[pixelIdx + 2];
                            count++;
                        }
                    }
                }
                
                // Apply averaged result
                if (count > 0) {
                    data[idx] = r / count;
                    data[idx + 1] = g / count;
                    data[idx + 2] = b / count;
                }
            }
        }
    }
    
    function loadImage(src) {
        const img = new Image();
        img.onload = function() {
            image = img;
            originalImage = img;
            
            // Calculate display size to fit canvas while maintaining aspect ratio
            const maxWidth = 800;
            const maxHeight = 600;
            scaleRatio = Math.min(maxWidth / img.width, maxHeight / img.height);
            
            // Set canvas to original image size for quality preservation
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Set display size via CSS to show scaled version
            canvas.style.width = (img.width * scaleRatio) + 'px';
            canvas.style.height = (img.height * scaleRatio) + 'px';
            
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            // Clear history and save initial state
            history = [];
            currentHistoryIndex = -1;
            saveState();
        };
        img.src = src;
    }
    
    function saveState() {
        // Remove any history after current index
        history = history.slice(0, currentHistoryIndex + 1);
        
        // Add new state
        history.push(canvas.toDataURL());
        currentHistoryIndex++;
        
        // Limit history size
        if (history.length > 20) {
            history.shift();
            currentHistoryIndex--;
        }
    }
    
    function loadFromHistory(index) {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = history[index];
    }
    
    function undo() {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            loadFromHistory(currentHistoryIndex);
        }
    }
    
    function redo() {
        if (currentHistoryIndex < history.length - 1) {
            currentHistoryIndex++;
            loadFromHistory(currentHistoryIndex);
        }
    }
    
    function reset() {
        if (image && history.length > 0) {
            currentHistoryIndex = 0;
            loadFromHistory(0);
        }
    }
    
    function clear() {
        image = null;
        originalImage = null;
        history = [];
        currentHistoryIndex = -1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.width = '';
        canvas.style.height = '';
    }
    
    function setEffect(effect) {
        currentEffect = effect;
    }
    
    
    function download() {
        if (!image) return;
        
        const link = document.createElement('a');
        link.download = 'masked-image.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }
    
    async function copy() {
        if (!image) return;
        
        try {
            // Ensure document is focused before clipboard operation
            window.focus();
            canvas.focus();
            
            canvas.toBlob(async (blob) => {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
            }, 'image/png', 1.0);
        } catch (err) {
            console.warn('Copy to clipboard failed:', err);
            // Fallback: show a message to user
            alert('Copy to clipboard failed. Please click on the canvas first and try again.');
        }
    }
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                switch(e.key.toLowerCase()) {
                    case 'c':
                        e.preventDefault();
                        copy();
                        flashButton('copy');
                        break;
                    case 'z':
                        e.preventDefault();
                        undo();
                        flashButton('undo');
                        break;
                    case 'y':
                        e.preventDefault();
                        redo();
                        flashButton('redo');
                        break;
                }
            }
        });
    }
    
    function flashButton(action) {
        let selector;
        switch(action) {
            case 'copy': selector = '[data-action="copy"]'; break;
            case 'undo': selector = '[data-action="undo"]'; break;
            case 'redo': selector = '[data-action="redo"]'; break;
        }
        const btn = document.querySelector(selector);
        if (btn) {
            btn.classList.add('key-pressed');
            setTimeout(() => btn.classList.remove('key-pressed'), 200);
        }
    }
    
    return {
        init,
        loadImage,
        setEffect,
        undo,
        redo,
        reset,
        clear,
        download,
        copy
    };
})();