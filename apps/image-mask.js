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
    let currentEffect = 'blur';
    let history = [];
    let currentHistoryIndex = -1;
    let scaleRatio = 1;
    
    function init(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        setupEventListeners();
        saveState();
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
        const data = imageData.data;
        
        switch(currentEffect) {
            case 'blur':
                applyBlur(imageData);
                break;
            case 'pixelate':
                applyPixelate(imageData, 8);
                break;
            case 'blackout':
                applyBlackout(imageData);
                break;
            case 'noise':
                applyNoise(imageData);
                break;
        }
        
        ctx.putImageData(imageData, x, y);
    }
    
    function applyBlur(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const original = new Uint8ClampedArray(data);
        const radius = 15; // Much larger blur radius for strong privacy
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                let r = 0, g = 0, b = 0, count = 0;
                
                // Sample in larger radius for stronger blur
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            const pixelIdx = (ny * width + nx) * 4;
                            r += original[pixelIdx];
                            g += original[pixelIdx + 1];
                            b += original[pixelIdx + 2];
                            count++;
                        }
                    }
                }
                
                if (count > 0) {
                    data[idx] = r / count;
                    data[idx + 1] = g / count;
                    data[idx + 2] = b / count;
                }
            }
        }
    }
    
    function applyPixelate(imageData, blockSize) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                let r = 0, g = 0, b = 0, count = 0;
                
                // Calculate average color for block
                for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        count++;
                    }
                }
                
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                
                // Apply average color to entire block
                for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        data[idx] = r;
                        data[idx + 1] = g;
                        data[idx + 2] = b;
                    }
                }
            }
        }
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
    
    function applyNoise(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.random() * 255;     // R
            data[i + 1] = Math.random() * 255; // G
            data[i + 2] = Math.random() * 255; // B
            // Keep alpha unchanged
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
    
    function reset() {
        if (image && history.length > 0) {
            currentHistoryIndex = 0;
            loadFromHistory(0);
        }
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
    
    return {
        init,
        loadImage,
        setEffect,
        undo,
        reset,
        download,
        copy
    };
})();