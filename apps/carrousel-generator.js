/*
LinkedIn Carousel Generator
Main functionality for creating, managing, and exporting LinkedIn carousel slides.

Key methods:
- addSlide(): Creates new slide with unique ID
- duplicateSlide(): Clones current slide
- deleteSlide(): Removes current slide with index management
- handleImageUpload(): Processes image files via drag/drop, paste, or file input
- exportPDF(): Generates PDF using html2canvas and jsPDF
- saveToStorage(): Auto-saves to IndexedDB for persistence (with localStorage fallback)
- loadFromStorage(): Loads data from IndexedDB storage
*/

function carrouselApp() {
    return {
        slides: [],
        activeSlide: 0,
        aspectRatio: 'square',
        isDark: false, // Will be loaded in init()
        isFullscreen: false,
        lastKeyTime: 0, // For debouncing keyboard navigation
        isExporting: false,
        isPreviewLoading: false,
        showProfileConfig: false,
        showPreview: false,
        previewUrl: null,
        currentPDF: null,
        previewRefreshTimeout: null,
        profile: {
            avatarUrl: '',
            name: '',
            profileUrl: ''
        },

        async init() {
            await this.loadFromStorage();
            await this.loadDarkModePreference();
            this.setupKeyboardShortcuts();
            this.setupPasteHandler();
            this.setupInteractJS();
            
            if (this.slides.length === 0) {
                this.addSlide();
            }
        },

        generateId() {
            return 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        addSlide() {
            const newSlide = {
                id: this.generateId(),
                bgSrc: null,
                bgPosition: { x: 0, y: 0 },
                bgSize: { width: null, height: null }
            };
            
            this.slides.push(newSlide);
            this.activeSlide = this.slides.length - 1;
            this.saveToStorage();
            this.refreshPreview();
        },

        duplicateSlide() {
            if (this.slides.length === 0) return;
            
            const currentSlide = this.getCurrentSlide();
            const duplicatedSlide = {
                ...JSON.parse(JSON.stringify(currentSlide)),
                id: this.generateId()
            };
            
            this.slides.splice(this.activeSlide + 1, 0, duplicatedSlide);
            this.activeSlide = this.activeSlide + 1;
            this.saveToStorage();
            this.refreshPreview();
        },

        deleteSlide() {
            if (this.slides.length === 0) return;
            
            this.slides.splice(this.activeSlide, 1);
            
            if (this.slides.length === 0) {
                this.activeSlide = 0;
            } else if (this.activeSlide >= this.slides.length) {
                this.activeSlide = this.slides.length - 1;
            }
            
            this.saveToStorage();
            this.refreshPreview();
        },

        setActiveSlide(index) {
            if (index >= 0 && index < this.slides.length) {
                this.activeSlide = index;
                this.$nextTick(() => {
                    setTimeout(() => {
                        this.setupBackgroundImageInteraction();
                    }, 100);
                });
            }
        },

        getCurrentSlide() {
            return this.slides[this.activeSlide] || null;
        },


        updateAspectRatio() {
            this.saveToStorage();
            this.refreshPreview();
        },


        triggerImageUpload() {
            document.getElementById('imageInput').click();
        },

        handleFileSelect(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImageFile(file);
            }
        },

        handleDrop(event) {
            const file = event.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImageFile(file);
            }
        },

        processImageFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const slide = this.getCurrentSlide();
                if (slide) {
                    const img = new Image();
                    img.onload = () => {
                        // Set image at natural size, centered in canvas
                        slide.bgSrc = e.target.result;
                        slide.bgSize = { width: img.naturalWidth, height: img.naturalHeight };
                        slide.bgPosition = { x: 0, y: 0 };
                        this.saveToStorage();
                        this.refreshPreview();
                        
                        // Setup interaction after image loads
                        this.$nextTick(() => {
                            setTimeout(() => {
                                this.setupBackgroundImageInteraction();
                            }, 100);
                        });
                    };
                    img.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);
        },

        setupPasteHandler() {
            window.addEventListener('paste', (e) => {
                // Skip image paste if user is typing in inputs or editable elements
                if (e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA' || 
                    e.target.contentEditable === 'true') return;
                    
                const items = e.clipboardData.items;
                for (let item of items) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        this.processImageFile(file);
                        break;
                    }
                }
            });
        },

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Skip shortcuts if user is typing in inputs or editable elements
                if (e.target.contentEditable === 'true' || 
                    e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA') return;
                
                switch(e.key.toLowerCase()) {
                    case 'n':
                        if (!e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            this.addSlide();
                        }
                        break;
                    case 'd':
                        if (!e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            this.duplicateSlide();
                        }
                        break;
                    case 'delete':
                    case 'backspace':
                        if (!e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            this.deleteSlide();
                        }
                        break;
                    case 'e':
                        if (!e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            this.exportPDF();
                        }
                        break;
                    case 'arrowleft':
                        if (this.activeSlide > 0) {
                            // Debounce keyboard navigation to prevent rapid fire
                            const now = Date.now();
                            if (now - this.lastKeyTime < 150) return; // 150ms debounce
                            this.lastKeyTime = now;
                            
                            e.preventDefault();
                            this.setActiveSlide(this.activeSlide - 1);
                        }
                        break;
                    case 'arrowright':
                        if (this.activeSlide < this.slides.length - 1) {
                            // Debounce keyboard navigation to prevent rapid fire
                            const now = Date.now();
                            if (now - this.lastKeyTime < 150) return; // 150ms debounce
                            this.lastKeyTime = now;
                            
                            e.preventDefault();
                            this.setActiveSlide(this.activeSlide + 1);
                        }
                        break;
                }
            });
        },

        setupInteractJS() {
            this.$nextTick(() => {
                if (typeof interact !== 'undefined') {
                    this.setupThumbnailDragSort();
                    this.setupBackgroundImageInteraction();
                }
            });
        },

        setupThumbnailDragSort() {
            if (typeof interact === 'undefined') return;
            
            interact('.thumbnail').draggable({
                listeners: {
                    move(event) {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                        
                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    },
                    end(event) {
                        event.target.style.transform = '';
                        event.target.removeAttribute('data-x');
                        event.target.removeAttribute('data-y');
                    }
                }
            });

            interact('#thumbnails-container').dropzone({
                listeners: {
                    drop(event) {
                        const draggedElement = event.relatedTarget;
                        const draggedId = draggedElement.getAttribute('data-slide-id');
                        const targetElement = event.target.closest('.thumbnail');
                        
                        if (targetElement && draggedId) {
                            const targetId = targetElement.getAttribute('data-slide-id');
                            this.reorderSlides(draggedId, targetId);
                        }
                    }
                }
            });
        },


        reorderSlides(draggedId, targetId) {
            const draggedIndex = this.slides.findIndex(slide => slide.id === draggedId);
            const targetIndex = this.slides.findIndex(slide => slide.id === targetId);
            
            if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                const draggedSlide = this.slides.splice(draggedIndex, 1)[0];
                this.slides.splice(targetIndex, 0, draggedSlide);
                
                if (this.activeSlide === draggedIndex) {
                    this.activeSlide = targetIndex;
                } else if (this.activeSlide === targetIndex) {
                    this.activeSlide = draggedIndex;
                }
                
                this.saveToStorage();
            }
        },

        async exportPDF() {
            if (this.slides.length === 0) return;
            
            this.isExporting = true;
            
            try {
                const { jsPDF } = window.jspdf;
                const isSquare = this.aspectRatio === 'square';
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [1080, isSquare ? 1080 : 1350]
                });
                
                for (let i = 0; i < this.slides.length; i++) {
                    if (i > 0) pdf.addPage();
                    
                    this.setActiveSlide(i);
                    await this.$nextTick();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    const slide = this.getCurrentSlide();
                    const viewport = document.getElementById('viewport');
                    const targetWidth = isSquare ? 1080 : 1080;
                    const targetHeight = isSquare ? 1080 : 1350;
                    
                    // Create a temporary canvas to compose the final image
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = targetWidth;
                    tempCanvas.height = targetHeight;
                    const ctx = tempCanvas.getContext('2d');
                    
                    // Fill with white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                    
                    // If there's a background image, draw it first
                    if (slide?.bgSrc) {
                        try {
                            const bgImg = new Image();
                            bgImg.crossOrigin = 'anonymous';
                            
                            await new Promise((resolve, reject) => {
                                bgImg.onload = resolve;
                                bgImg.onerror = reject;
                                bgImg.src = slide.bgSrc;
                            });
                            
                            // Get viewport dimensions
                            const viewportRect = viewport.getBoundingClientRect();
                            const canvas = document.getElementById('canvas');
                            const canvasRect = canvas.getBoundingClientRect();
                            
                            // Calculate the actual visible portion of the background image
                            const bgElement = document.getElementById(`bg-image-${i}`);
                            if (bgElement) {
                                const bgRect = bgElement.getBoundingClientRect();
                                
                                // Calculate the intersection between bg image and viewport
                                const intersectLeft = Math.max(viewportRect.left, bgRect.left);
                                const intersectTop = Math.max(viewportRect.top, bgRect.top);
                                const intersectRight = Math.min(viewportRect.right, bgRect.right);
                                const intersectBottom = Math.min(viewportRect.bottom, bgRect.bottom);
                                
                                if (intersectRight > intersectLeft && intersectBottom > intersectTop) {
                                    // Calculate source coordinates on the original image
                                    const scaleX = bgImg.naturalWidth / bgRect.width;
                                    const scaleY = bgImg.naturalHeight / bgRect.height;
                                    
                                    const srcX = (intersectLeft - bgRect.left) * scaleX;
                                    const srcY = (intersectTop - bgRect.top) * scaleY;
                                    const srcWidth = (intersectRight - intersectLeft) * scaleX;
                                    const srcHeight = (intersectBottom - intersectTop) * scaleY;
                                    
                                    // Calculate destination coordinates on the export canvas
                                    const destX = (intersectLeft - viewportRect.left) * (targetWidth / viewportRect.width);
                                    const destY = (intersectTop - viewportRect.top) * (targetHeight / viewportRect.height);
                                    const destWidth = (intersectRight - intersectLeft) * (targetWidth / viewportRect.width);
                                    const destHeight = (intersectBottom - intersectTop) * (targetHeight / viewportRect.height);
                                    
                                    // Draw the cropped portion
                                    ctx.drawImage(bgImg, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight);
                                }
                            }
                        } catch (error) {
                            console.warn('Failed to load background image for export:', error);
                        }
                    }
                    
                    // Now capture the viewport overlay content (profile info, etc.)
                    const overlayCanvas = await html2canvas(viewport, {
                        backgroundColor: null,
                        useCORS: true,
                        allowTaint: true,
                        scale: 2
                    });
                    
                    // Draw the overlay on top
                    ctx.drawImage(overlayCanvas, 0, 0, targetWidth, targetHeight);
                    
                    // Convert to data URL and add to PDF
                    const imgData = tempCanvas.toDataURL('image/png');
                    pdf.addImage(imgData, 'PNG', 0, 0, 1080, isSquare ? 1080 : 1350);
                }
                
                pdf.save('linkedin-carousel.pdf');
            } catch (error) {
                console.error('Export failed:', error);
                alert('Export failed. Please try again.');
            } finally {
                this.isExporting = false;
            }
        },

        async previewPDF() {
            if (this.slides.length === 0) return;
            
            this.isPreviewLoading = true;
            
            try {
                const { jsPDF } = window.jspdf;
                const isSquare = this.aspectRatio === 'square';
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [1080, isSquare ? 1080 : 1350]
                });
                
                for (let i = 0; i < this.slides.length; i++) {
                    if (i > 0) pdf.addPage();
                    
                    this.setActiveSlide(i);
                    await this.$nextTick();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    const slide = this.getCurrentSlide();
                    const viewport = document.getElementById('viewport');
                    const targetWidth = isSquare ? 1080 : 1080;
                    const targetHeight = isSquare ? 1080 : 1350;
                    
                    // Create a temporary canvas to compose the final image
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = targetWidth;
                    tempCanvas.height = targetHeight;
                    const ctx = tempCanvas.getContext('2d');
                    
                    // Fill with white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                    
                    // If there's a background image, draw it first
                    if (slide?.bgSrc) {
                        try {
                            const bgImg = new Image();
                            bgImg.crossOrigin = 'anonymous';
                            
                            await new Promise((resolve, reject) => {
                                bgImg.onload = resolve;
                                bgImg.onerror = reject;
                                bgImg.src = slide.bgSrc;
                            });
                            
                            // Get viewport dimensions
                            const viewportRect = viewport.getBoundingClientRect();
                            const canvas = document.getElementById('canvas');
                            const canvasRect = canvas.getBoundingClientRect();
                            
                            // Calculate the actual visible portion of the background image
                            const bgElement = document.getElementById(`bg-image-${i}`);
                            if (bgElement) {
                                const bgRect = bgElement.getBoundingClientRect();
                                
                                // Calculate the intersection between bg image and viewport
                                const intersectLeft = Math.max(viewportRect.left, bgRect.left);
                                const intersectTop = Math.max(viewportRect.top, bgRect.top);
                                const intersectRight = Math.min(viewportRect.right, bgRect.right);
                                const intersectBottom = Math.min(viewportRect.bottom, bgRect.bottom);
                                
                                if (intersectRight > intersectLeft && intersectBottom > intersectTop) {
                                    // Calculate source coordinates on the original image
                                    const scaleX = bgImg.naturalWidth / bgRect.width;
                                    const scaleY = bgImg.naturalHeight / bgRect.height;
                                    
                                    const srcX = (intersectLeft - bgRect.left) * scaleX;
                                    const srcY = (intersectTop - bgRect.top) * scaleY;
                                    const srcWidth = (intersectRight - intersectLeft) * scaleX;
                                    const srcHeight = (intersectBottom - intersectTop) * scaleY;
                                    
                                    // Calculate destination coordinates on the export canvas
                                    const destX = (intersectLeft - viewportRect.left) * (targetWidth / viewportRect.width);
                                    const destY = (intersectTop - viewportRect.top) * (targetHeight / viewportRect.height);
                                    const destWidth = (intersectRight - intersectLeft) * (targetWidth / viewportRect.width);
                                    const destHeight = (intersectBottom - intersectTop) * (targetHeight / viewportRect.height);
                                    
                                    // Draw the cropped portion
                                    ctx.drawImage(bgImg, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight);
                                }
                            }
                        } catch (error) {
                            console.warn('Failed to load background image for export:', error);
                        }
                    }
                    
                    // Now capture the viewport overlay content (profile info, etc.)
                    const overlayCanvas = await html2canvas(viewport, {
                        backgroundColor: null,
                        useCORS: true,
                        allowTaint: true,
                        scale: 2
                    });
                    
                    // Draw the overlay on top
                    ctx.drawImage(overlayCanvas, 0, 0, targetWidth, targetHeight);
                    
                    // Convert to data URL and add to PDF
                    const imgData = tempCanvas.toDataURL('image/png');
                    pdf.addImage(imgData, 'PNG', 0, 0, 1080, isSquare ? 1080 : 1350);
                }
                
                // Create blob URL for preview
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                
                // Store for download later
                this.currentPDF = pdf;
                this.previewUrl = pdfUrl;
                this.showPreview = true;
                
            } catch (error) {
                console.error('Preview failed:', error);
                alert('Preview failed. Please try again.');
            } finally {
                this.isPreviewLoading = false;
            }
        },

        closePreview() {
            this.showPreview = false;
            if (this.previewUrl) {
                URL.revokeObjectURL(this.previewUrl);
                this.previewUrl = null;
            }
            if (this.previewRefreshTimeout) {
                clearTimeout(this.previewRefreshTimeout);
                this.previewRefreshTimeout = null;
            }
            this.currentPDF = null;
        },

        downloadPreviewedPDF() {
            if (this.currentPDF) {
                this.currentPDF.save('linkedin-carousel.pdf');
            }
        },

        async refreshPreview() {
            if (!this.showPreview) return;
            
            // Debounce the refresh to avoid too many rapid updates
            if (this.previewRefreshTimeout) {
                clearTimeout(this.previewRefreshTimeout);
            }
            
            this.previewRefreshTimeout = setTimeout(async () => {
                if (this.showPreview) {
                    // Close current preview first
                    if (this.previewUrl) {
                        URL.revokeObjectURL(this.previewUrl);
                        this.previewUrl = null;
                    }
                    
                    // Generate new preview (previewPDF sets isPreviewLoading)
                    await this.previewPDF();
                }
            }, 500); // 500ms debounce
        },

        async toggleDark() {
            this.isDark = !this.isDark;
            try {
                await window.setItem('carrousel-dark', JSON.stringify(this.isDark));
            } catch (error) {
                console.error('Failed to save dark mode preference:', error);
            }
        },

        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            if (this.isFullscreen) {
                document.documentElement.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        },

        navigateHome() {
            window.location.href = '../index.html';
        },

        async saveToStorage() {
            const data = {
                slides: this.slides,
                activeSlide: this.activeSlide,
                aspectRatio: this.aspectRatio,
                profile: this.profile,
                timestamp: Date.now()
            };
            try {
                await window.setItem('carrousel-data', JSON.stringify(data));
            } catch (error) {
                console.error('Failed to save to storage:', error);
            }
        },

        async loadFromStorage() {
            try {
                const storedData = await window.getItem('carrousel-data');
                const data = storedData ? JSON.parse(storedData) : {};
                if (data.slides && Array.isArray(data.slides)) {
                    this.slides = data.slides;
                    this.activeSlide = Math.max(0, Math.min(data.activeSlide || 0, this.slides.length - 1));
                    this.aspectRatio = data.aspectRatio || 'square';
                }
                if (data.profile) {
                    this.profile = { ...this.profile, ...data.profile };
                }
            } catch (error) {
                console.error('Failed to load from storage:', error);
            }
        },

        async loadDarkModePreference() {
            try {
                const darkMode = await window.getItem('carrousel-dark');
                this.isDark = darkMode ? JSON.parse(darkMode) : false;
            } catch (error) {
                console.error('Failed to load dark mode preference:', error);
                this.isDark = false;
            }
        },

        saveProfile() {
            this.saveToStorage();
            this.refreshPreview();
        },

        triggerAvatarUpload() {
            document.getElementById('avatarInput').click();
        },

        async handleAvatarUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('Please select an image smaller than 5MB.');
                return;
            }

            try {
                const base64 = await this.fileToBase64(file);
                this.profile.avatarUrl = base64;
                this.saveProfile();
            } catch (error) {
                console.error('Error processing avatar:', error);
                alert('Error uploading avatar. Please try again.');
            }

            // Clear the input
            event.target.value = '';
        },

        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        removeAvatar() {
            this.profile.avatarUrl = '';
            this.saveProfile();
        },

        setupBackgroundImageInteraction() {
            if (typeof interact === 'undefined') return;
            
            const imageId = `bg-image-${this.activeSlide}`;
            const imageElement = document.getElementById(imageId);
            
            if (!imageElement) return;
            
            // Remove any existing interaction
            interact(`#${imageId}`).unset();
            
            interact(`#${imageId}`).draggable({
                listeners: {
                    move: (event) => {
                        const slide = this.getCurrentSlide();
                        if (!slide) return;
                        
                        slide.bgPosition.x += event.dx;
                        slide.bgPosition.y += event.dy;
                        
                        event.target.style.transform = 
                            `translate(${slide.bgPosition.x}px, ${slide.bgPosition.y}px)`;
                    },
                    end: () => {
                        this.saveToStorage();
                        this.refreshPreview();
                    }
                }
            }).resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                modifiers: [
                    interact.modifiers.aspectRatio({
                        ratio: 'preserve'
                    })
                ],
                listeners: {
                    move: (event) => {
                        const slide = this.getCurrentSlide();
                        if (!slide) return;
                        
                        // Update size
                        slide.bgSize.width = event.rect.width;
                        slide.bgSize.height = event.rect.height;
                        
                        // Update position if edges moved
                        slide.bgPosition.x += event.deltaRect.left;
                        slide.bgPosition.y += event.deltaRect.top;
                        
                        // Apply styles
                        event.target.style.width = event.rect.width + 'px';
                        event.target.style.height = event.rect.height + 'px';
                        event.target.style.transform = 
                            `translate(${slide.bgPosition.x}px, ${slide.bgPosition.y}px)`;
                    },
                    end: () => {
                        this.saveToStorage();
                        this.refreshPreview();
                    }
                }
            });
        }
    };
}