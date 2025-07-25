/*
LinkedIn Carousel Generator
Main functionality for creating, managing, and exporting LinkedIn carousel slides.

Key methods:
- addSlide(): Creates new slide with unique ID
- duplicateSlide(): Clones current slide
- deleteSlide(): Removes current slide with index management
- processImageFile(): Processes image files via drag/drop, paste, or file input
- generatePDF(): Core PDF generation logic used by export and preview
- exportPDF(): Downloads PDF using generatePDF()
- previewPDF(): Shows PDF preview using generatePDF()
- saveToStorage(): Auto-saves to IndexedDB for persistence (with localStorage fallback)
- loadFromStorage(): Loads data from IndexedDB storage
- setupInteractions(): Sets up drag/resize interactions for current slide
*/

function carrouselApp() {
    // Configuration constants
    const CONFIG = {
        DEBOUNCE_TIME: {
            KEYBOARD: 150,
            PREVIEW_REFRESH: 500,
            INTERACTION_SETUP: 100
        },
        FONT_SIZE: {
            MIN: 8,
            MAX: 32,
            DEFAULT: 16
        },
        DIMENSIONS: {
            SQUARE: { width: 1080, height: 1080 },
            PORTRAIT: { width: 1080, height: 1350 }
        },
        STORAGE_KEYS: {
            DATA: 'carrousel-data',
            DARK_MODE: 'carrousel-dark'
        },
        AVATAR: {
            MAX_SIZE: 5 * 1024 * 1024 // 5MB
        },
        DEFAULT_CALLOUT_POSITION: { x: 50, y: 50 }
    };

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
        selected: { type: null, id: null },
        profile: {
            avatarUrl: '',
            name: '',
            profileUrl: '',
            position: 'bottom-right',
            visibility: 'first' // 'first', 'first-last', 'all'
        },
        swipeIcon: {
            enabled: true,
            selected: 'swipe-right',
            showSelection: false,
            location: 'bottom-right',
            visibility: 'first' // 'first', 'first-last', 'all'
        },
        calloutFontSize: CONFIG.FONT_SIZE.DEFAULT,
        isProcessingPaste: false,
        availableSwipeIcons: [
            { id: 'swipe-right', name: 'Swipe Right', icon: '→' },
            { id: 'swipe-left', name: 'Swipe Left', icon: '←' },
            { id: 'chevron-right', name: 'Chevron Right', icon: '›' },
            { id: 'chevron-left', name: 'Chevron Left', icon: '‹' },
            { id: 'double-chevron', name: 'Double Chevron', icon: '»' },
            { id: 'finger-swipe', name: 'Finger Swipe', icon: '👆' },
            { id: 'hand-gesture', name: 'Hand Gesture', icon: '👉' },
            { id: 'scroll-icon', name: 'Scroll Icon', icon: '⇢' }
        ],

        async init() {
            await Promise.all([
                this.loadFromStorage(),
                this.loadDarkModePreference()
            ]);

            this.setupEventHandlers();
            this.updateIconSizes(); // Set initial icon sizes based on font size

            if (this.slides.length === 0) {
                this.addSlide();
            }
        },

        setupEventHandlers() {
            this.setupKeyboardShortcuts();
            this.setupWheelNavigation();
            this.setupPasteHandler();
            this.setupInteractJS();
        },

        generateId() {
            return 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        addSlide() {
            const newSlide = this.createSlideStructure();
            this.slides.push(newSlide);
            this.setActiveSlide(this.slides.length - 1);
            this.saveAndRefresh();
        },

        createSlideStructure() {
            return {
                id: this.generateId(),
                bgSrc: null,
                bgPosition: { x: 0, y: 0 },
                bgSize: { width: null, height: null },
                callouts: [],
                images: []
            };
        },

        duplicateSlide() {
            if (this.slides.length === 0) return;

            const currentSlide = this.getCurrentSlide();
            const duplicatedSlide = this.deepCloneSlide(currentSlide);

            this.slides.splice(this.activeSlide + 1, 0, duplicatedSlide);
            this.setActiveSlide(this.activeSlide + 1);
            this.saveAndRefresh();
        },

        deepCloneSlide(slide) {
            return {
                ...JSON.parse(JSON.stringify(slide)),
                id: this.generateId()
            };
        },

        deleteSlide() {
            if (this.slides.length === 0) return;

            this.slides.splice(this.activeSlide, 1);
            this.activeSlide = this.clampActiveSlideIndex();

            this.saveAndRefresh();
        },

        moveSlideLeft() {
            if (this.activeSlide > 0) {
                this.moveSlide(this.activeSlide, this.activeSlide - 1);
            }
        },

        moveSlideRight() {
            if (this.activeSlide < this.slides.length - 1) {
                this.moveSlide(this.activeSlide, this.activeSlide + 1);
            }
        },

        moveSlide(fromIndex, toIndex) {
            const slide = this.slides.splice(fromIndex, 1)[0];
            this.slides.splice(toIndex, 0, slide);
            this.activeSlide = toIndex;
            this.saveAndRefresh();
        },

        clampActiveSlideIndex() {
            return Math.min(this.activeSlide, Math.max(0, this.slides.length - 1));
        },

        setActiveSlide(index) {
            if (this.isValidSlideIndex(index)) {
                this.activeSlide = index;
                this.scheduleInteractionSetup();
            }
        },

        isValidSlideIndex(index) {
            return index >= 0 && index < this.slides.length;
        },

        scheduleInteractionSetup() {
            this.$nextTick(() => {
                setTimeout(() => this.setupInteractions(), CONFIG.DEBOUNCE_TIME.INTERACTION_SETUP);
            });
        },

        getCurrentSlide() {
            return this.slides[this.activeSlide] || null;
        },

        shouldShowProfile() {
            if (!this.profile.name && !this.profile.avatarUrl) return false;
            
            switch (this.profile.visibility) {
                case 'first':
                    return this.activeSlide === 0;
                case 'first-last':
                    return this.activeSlide === 0 || this.activeSlide === this.slides.length - 1;
                case 'all':
                    return true;
                default:
                    return this.activeSlide === 0;
            }
        },

        shouldShowSwipeIcon() {
            if (!this.swipeIcon.enabled || this.slides.length === 0) return false;
            
            switch (this.swipeIcon.visibility) {
                case 'first':
                    return this.activeSlide === 0;
                case 'all':
                    return this.activeSlide < this.slides.length - 1; // All except last
                default:
                    return this.activeSlide === 0;
            }
        },

        shouldShowProfileForSlide(slideIndex) {
            if (!this.profile.name && !this.profile.avatarUrl) return false;
            
            switch (this.profile.visibility) {
                case 'first':
                    return slideIndex === 0;
                case 'first-last':
                    return slideIndex === 0 || slideIndex === this.slides.length - 1;
                case 'all':
                    return true;
                default:
                    return slideIndex === 0;
            }
        },

        shouldShowSwipeIconForSlide(slideIndex) {
            if (!this.swipeIcon.enabled || this.slides.length === 0) return false;
            
            switch (this.swipeIcon.visibility) {
                case 'first':
                    return slideIndex === 0;
                case 'all':
                    return slideIndex < this.slides.length - 1; // All except last
                default:
                    return slideIndex === 0;
            }
        },


        updateAspectRatio() {
            this.saveAndRefresh();
        },

        saveAndRefresh() {
            this.saveToStorage();
            this.refreshPreview();
        },



        triggerOverlayUpload() {
            document.getElementById('overlayInput').click();
        },

        handleFileSelect(event) {
            const file = event.target.files[0];
            this.handleImageFile(file);
            event.target.value = ''; // Clear the input
        },

        handleOverlaySelect(event) {
            const file = event.target.files[0];
            this.handleOverlayFile(file);
            event.target.value = '';
        },

        handleDrop(event) {
            const file = event.dataTransfer.files[0];
            this.handleImageFile(file);
        },

        handleImageFile(file) {
            if (file && file.type.startsWith('image/')) {
                // If we have slides and current slide has background, add as overlay, otherwise set as background
                if (this.slides.length > 0 && this.getCurrentSlide()?.bgSrc) {
                    this.processOverlayFile(file);
                } else {
                    this.processImageFile(file);
                }
            }
        },

        handleOverlayFile(file) {
            if (file && file.type.startsWith('image/')) {
                this.processOverlayFile(file);
            }
        },

        processImageFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const slide = this.getCurrentSlide();
                if (slide) {
                    this.loadImageToSlide(e.target.result, slide);
                }
            };
            reader.readAsDataURL(file);
        },

        processOverlayFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const slide = this.getCurrentSlide();
                if (slide) {
                    this.loadOverlayImage(e.target.result, slide);
                }
            };
            reader.readAsDataURL(file);
        },


        loadImageToSlide(imageSrc, slide) {
            const img = new Image();
            img.onload = () => {
                this.setSlideImage(slide, imageSrc, img);
                this.scheduleBackgroundImageInteraction();
            };
            img.src = imageSrc;
        },


        loadOverlayImage(imageSrc, slide) {
            const img = new Image();
            img.onload = () => {
                this.ensureImagesArray(slide);
                const overlay = {
                    id: this.generateId(),
                    src: imageSrc,
                    x: CONFIG.DEFAULT_CALLOUT_POSITION.x,
                    y: CONFIG.DEFAULT_CALLOUT_POSITION.y,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    zIndex: 5
                };
                slide.images.push(overlay);
                this.saveAndRefresh();
                this.scheduleOverlayInteraction(overlay.id);
            };
            img.src = imageSrc;
        },

        setSlideImage(slide, src, img) {
            slide.bgSrc = src;
            slide.bgSize = { width: img.naturalWidth, height: img.naturalHeight };
            slide.bgPosition = { x: 0, y: 0 };
        },

        scheduleBackgroundImageInteraction() {
            this.$nextTick(() => {
                setTimeout(() => this.setupBackgroundImageInteraction(), CONFIG.DEBOUNCE_TIME.INTERACTION_SETUP);
            });
        },

        setupPasteHandler() {
            window.addEventListener('paste', (e) => {
                if (this.shouldSkipImagePaste(e.target)) return;

                const imageFile = this.extractImageFromClipboard(e.clipboardData);
                if (imageFile) {
                    // Prevent multiple simultaneous paste operations
                    if (this.isProcessingPaste) {
                        return;
                    }

                    // Only prevent default if we have an image to process
                    e.preventDefault();
                    e.stopPropagation();

                    this.isProcessingPaste = true;

                    // Use requestAnimationFrame to ensure this runs after any other paste handlers
                    requestAnimationFrame(() => {
                        // If we have slides, add as overlay image, otherwise set as background
                        if (this.slides.length > 0 && this.getCurrentSlide()) {
                            this.processOverlayFile(imageFile);
                        } else {
                            this.processImageFile(imageFile);
                        }
                        
                        // Reset the flag after a short delay to allow for the next paste
                        setTimeout(() => {
                            this.isProcessingPaste = false;
                        }, 200);
                    });
                }
            });
        },

        shouldSkipImagePaste(target) {
            return target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.contentEditable === 'true';
        },

        extractImageFromClipboard(clipboardData) {
            for (let item of clipboardData.items) {
                if (item.type.startsWith('image/')) {
                    return item.getAsFile();
                }
            }
            return null;
        },

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Skip shortcuts if user is typing in inputs or editable elements
                if (e.target.contentEditable === 'true' ||
                    e.target.tagName === 'INPUT' ||
                    e.target.tagName === 'TEXTAREA') return;

                switch (e.key.toLowerCase()) {
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
                            this.deleteSelectedImageOrCallout();
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
                            if (now - this.lastKeyTime < CONFIG.DEBOUNCE_TIME.KEYBOARD) return;
                            this.lastKeyTime = now;

                            e.preventDefault();
                            this.setActiveSlide(this.activeSlide - 1);
                        }
                        break;
                    case 'arrowright':
                        if (this.activeSlide < this.slides.length - 1) {
                            // Debounce keyboard navigation to prevent rapid fire
                            const now = Date.now();
                            if (now - this.lastKeyTime < CONFIG.DEBOUNCE_TIME.KEYBOARD) return;
                            this.lastKeyTime = now;

                            e.preventDefault();
                            this.setActiveSlide(this.activeSlide + 1);
                        }
                        break;
                }
            });
        },

        setupWheelNavigation() {
            document.addEventListener('wheel', (e) => {
                if (e.target.contentEditable === 'true' ||
                    e.target.tagName === 'INPUT' ||
                    e.target.tagName === 'TEXTAREA') return;

                const now = Date.now();
                if (now - this.lastKeyTime < CONFIG.DEBOUNCE_TIME.KEYBOARD) return;
                this.lastKeyTime = now;

                if (e.deltaY > 0 && this.activeSlide < this.slides.length - 1) {
                    e.preventDefault();
                    this.setActiveSlide(this.activeSlide + 1);
                } else if (e.deltaY < 0 && this.activeSlide > 0) {
                    e.preventDefault();
                    this.setActiveSlide(this.activeSlide - 1);
                }
            }, { passive: false });
        },

        setupInteractJS() {
            this.$nextTick(() => {
                if (typeof interact !== 'undefined') {
                    this.setupInteractions();
                }
            });
        },

        setupInteractions() {
            if (typeof interact === 'undefined') return;

            this.setupBackgroundImageInteraction();
            this.setupAllCalloutInteractions();
            this.setupAllImageInteractions();
        },


        async generatePDF() {
            if (this.slides.length === 0) return null;

            const { jsPDF } = window.jspdf;
            const isSquare = this.aspectRatio === 'square';
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [CONFIG.DIMENSIONS.SQUARE.width, isSquare ? CONFIG.DIMENSIONS.SQUARE.height : CONFIG.DIMENSIONS.PORTRAIT.height],
                compress: true
            });

            // Create hidden viewport for offscreen rendering
            const hiddenContainer = this.createHiddenViewport();
            
            try {
                for (let i = 0; i < this.slides.length; i++) {
                    if (i > 0) pdf.addPage();

                    const slide = this.slides[i];
                    
                    // Setup hidden viewport with current slide data
                    this.setupHiddenViewportSlide(hiddenContainer, slide, i);
                    await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause for rendering

                    const hiddenViewport = hiddenContainer.querySelector('.hidden-viewport');
                    const targetWidth = CONFIG.DIMENSIONS.SQUARE.width;
                    const targetHeight = isSquare ? CONFIG.DIMENSIONS.SQUARE.height : CONFIG.DIMENSIONS.PORTRAIT.height;

                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = targetWidth;
                    tempCanvas.height = targetHeight;
                    const ctx = tempCanvas.getContext('2d');

                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, targetWidth, targetHeight);

                    if (slide?.bgSrc) {
                        try {
                            const bgImg = new Image();
                            bgImg.crossOrigin = 'anonymous';

                            await new Promise((resolve, reject) => {
                                bgImg.onload = resolve;
                                bgImg.onerror = reject;
                                bgImg.src = slide.bgSrc;
                            });

                            const viewportRect = hiddenViewport.getBoundingClientRect();
                            const bgElement = hiddenContainer.querySelector('.hidden-bg-image');

                            if (bgElement) {
                                const bgRect = bgElement.getBoundingClientRect();

                                const intersectLeft = Math.max(viewportRect.left, bgRect.left);
                                const intersectTop = Math.max(viewportRect.top, bgRect.top);
                                const intersectRight = Math.min(viewportRect.right, bgRect.right);
                                const intersectBottom = Math.min(viewportRect.bottom, bgRect.bottom);

                                if (intersectRight > intersectLeft && intersectBottom > intersectTop) {
                                    const scaleX = bgImg.naturalWidth / bgRect.width;
                                    const scaleY = bgImg.naturalHeight / bgRect.height;

                                    const srcX = (intersectLeft - bgRect.left) * scaleX;
                                    const srcY = (intersectTop - bgRect.top) * scaleY;
                                    const srcWidth = (intersectRight - intersectLeft) * scaleX;
                                    const srcHeight = (intersectBottom - intersectTop) * scaleY;

                                    const destX = (intersectLeft - viewportRect.left) * (targetWidth / viewportRect.width);
                                    const destY = (intersectTop - viewportRect.top) * (targetHeight / viewportRect.height);
                                    const destWidth = (intersectRight - intersectLeft) * (targetWidth / viewportRect.width);
                                    const destHeight = (intersectBottom - intersectTop) * (targetHeight / viewportRect.height);

                                    ctx.drawImage(bgImg, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight);
                                }
                            }
                        } catch (error) {
                            console.warn('Failed to load background image for export:', error);
                        }
                    }

                    const overlayCanvas = await html2canvas(hiddenViewport, {
                        backgroundColor: null,
                        useCORS: true,
                        allowTaint: true,
                        scale: 2
                    });

                    ctx.drawImage(overlayCanvas, 0, 0, targetWidth, targetHeight);

                    const imgData = tempCanvas.toDataURL('image/jpeg', 0.85);
                    pdf.addImage(imgData, 'JPEG', 0, 0, CONFIG.DIMENSIONS.SQUARE.width, targetHeight);

                    // Add clickable link for profile if profile URL is configured
                    if (this.profile.profileUrl && (this.profile.name || this.profile.avatarUrl)) {
                        try {
                            const profileElement = hiddenContainer.querySelector('.hidden-viewport-avatar');
                            if (profileElement) {
                                const profileRect = profileElement.getBoundingClientRect();
                                const viewportRect = hiddenViewport.getBoundingClientRect();

                                // Calculate relative position within viewport
                                const relativeX = (profileRect.left - viewportRect.left) / viewportRect.width;
                                const relativeY = (profileRect.top - viewportRect.top) / viewportRect.height;
                                const relativeWidth = profileRect.width / viewportRect.width;
                                const relativeHeight = profileRect.height / viewportRect.height;

                                // Convert to PDF coordinates
                                const linkX = relativeX * CONFIG.DIMENSIONS.SQUARE.width;
                                const linkY = relativeY * targetHeight;
                                const linkWidth = relativeWidth * CONFIG.DIMENSIONS.SQUARE.width;
                                const linkHeight = relativeHeight * targetHeight;

                                // Add link annotation to PDF
                                pdf.link(linkX, linkY, linkWidth, linkHeight, { url: this.profile.profileUrl });
                            }
                        } catch (error) {
                            console.warn('Failed to add profile link to PDF:', error);
                        }
                    }
                }
            } finally {
                // Always cleanup hidden viewport
                this.cleanupHiddenViewport(hiddenContainer);
            }

            return pdf;
        },

        async exportPDF() {
            if (this.slides.length === 0) return;

            this.isExporting = true;
            const pdf = await this.safeExecute(
                () => this.generatePDF(),
                'Export failed.'
            );

            if (pdf) {
                pdf.save('linkedin-carousel.pdf');
            }
            this.isExporting = false;
        },

        async previewPDF() {
            if (this.slides.length === 0) return;

            this.isPreviewLoading = true;
            const pdf = await this.safeExecute(
                () => this.generatePDF(),
                'Preview failed.'
            );

            if (pdf) {
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);

                this.currentPDF = pdf;
                this.previewUrl = pdfUrl;
                this.showPreview = true;
            }
            this.isPreviewLoading = false;
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
            }, CONFIG.DEBOUNCE_TIME.PREVIEW_REFRESH);
        },

        async toggleDark() {
            this.isDark = !this.isDark;
            await this.saveDarkModePreference();
        },

        async saveDarkModePreference() {
            try {
                await window.setItem(CONFIG.STORAGE_KEYS.DARK_MODE, JSON.stringify(this.isDark));
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
            const data = this.createSaveData();
            try {
                await window.setItem(CONFIG.STORAGE_KEYS.DATA, JSON.stringify(data));
            } catch (error) {
                console.error('Failed to save to storage:', error);
            }
        },

        createSaveData() {
            return {
                slides: this.slides,
                activeSlide: this.activeSlide,
                aspectRatio: this.aspectRatio,
                profile: this.profile,
                swipeIcon: this.swipeIcon,
                calloutFontSize: this.calloutFontSize,
                timestamp: Date.now()
            };
        },

        async loadFromStorage() {
            try {
                const storedData = await window.getItem('carrousel-data');
                const data = storedData ? JSON.parse(storedData) : {};
                if (data.slides && Array.isArray(data.slides)) {
                    // Ensure backward compatibility - add callouts array if missing
                    this.slides = data.slides.map(slide => ({
                        ...slide,
                        callouts: slide.callouts || [],
                        images: slide.images || []
                    }));
                    this.activeSlide = Math.max(0, Math.min(data.activeSlide || 0, this.slides.length - 1));
                    this.aspectRatio = data.aspectRatio || 'square';
                }
                if (data.profile) {
                    this.profile = { ...this.profile, ...data.profile };
                }
                if (data.swipeIcon) {
                    this.swipeIcon = { ...this.swipeIcon, ...data.swipeIcon, showSelection: false };
                }
                if (typeof data.calloutFontSize === 'number') {
                    this.calloutFontSize = data.calloutFontSize;
                }
            } catch (error) {
                console.error('Failed to load from storage:', error);
            }
        },

        async loadDarkModePreference() {
            try {
                const darkMode = await window.getItem(CONFIG.STORAGE_KEYS.DARK_MODE);
                this.isDark = darkMode ? JSON.parse(darkMode) : false;
            } catch (error) {
                console.error('Failed to load dark mode preference:', error);
                this.isDark = false;
            }
        },


        getSelectedSwipeIcon() {
            return this.availableSwipeIcons.find(icon => icon.id === this.swipeIcon.selected) || this.availableSwipeIcons[0];
        },

        selectSwipeIcon(iconId) {
            this.swipeIcon.selected = iconId;
            this.swipeIcon.showSelection = false;
            this.saveToStorage();
        },

        toggleSwipeIconSelection() {
            this.swipeIcon.showSelection = !this.swipeIcon.showSelection;
        },

        toggleSwipeIconLocation() {
            const locations = ['bottom-right', 'top-right', 'middle-right'];
            const currentIndex = locations.indexOf(this.swipeIcon.location);
            this.swipeIcon.location = locations[(currentIndex + 1) % locations.length];
            this.saveToStorage();
        },

        updateCalloutFontSize(size) {
            this.calloutFontSize = this.clampFontSize(parseInt(size));
            this.updateIconSizes();
            this.saveAndRefresh();
        },

        updateIconSizes() {
            // Base sizes (default 50% bigger than original)
            const baseProfileSize = 2.25; // rem - was 1.5rem, now 50% bigger
            const baseProfileTextSize = 0.875; // rem - base profile text size
            const baseSwipeSize = 3.75; // rem - was 2.5rem, now 50% bigger  
            const baseSwipeFontSize = 1.8; // rem - was 1.2rem, now 50% bigger

            // Scale factor based on font size (16px is default)
            const scaleFactor = this.calloutFontSize / 16;

            // Calculate new sizes
            const profileSize = baseProfileSize * scaleFactor;
            const profileTextSize = baseProfileTextSize * scaleFactor;
            const swipeSize = baseSwipeSize * scaleFactor;
            const swipeFontSize = baseSwipeFontSize * scaleFactor;

            // Update CSS custom properties
            const root = document.documentElement;
            root.style.setProperty('--profile-avatar-size', `${profileSize}rem`);
            root.style.setProperty('--profile-text-size', `${profileTextSize}rem`);
            root.style.setProperty('--swipe-icon-size', `${swipeSize}rem`);
            root.style.setProperty('--swipe-icon-font-size', `${swipeFontSize}rem`);
        },

        clampFontSize(size) {
            return Math.max(CONFIG.FONT_SIZE.MIN, Math.min(CONFIG.FONT_SIZE.MAX, size));
        },

        async safeExecute(operation, errorMessage) {
            try {
                return await operation();
            } catch (error) {
                console.error(errorMessage, error);
                alert(errorMessage + ' Please try again.');
                return null;
            }
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

            if (file.size > CONFIG.AVATAR.MAX_SIZE) {
                alert('Please select an image smaller than 5MB.');
                return;
            }

            try {
                const base64 = await this.fileToBase64(file);
                this.profile.avatarUrl = base64;
                this.saveAndRefresh();
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
            this.saveAndRefresh();
        },

        setupBackgroundImageInteraction() {
            if (typeof interact === 'undefined') return;

            const imageId = `bg-image-${this.activeSlide}`;
            const imageElement = document.getElementById(imageId);
            if (!imageElement) return;

            const saveChanges = () => {
                this.saveToStorage();
                this.refreshPreview();
            };

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
                    end: saveChanges
                }
            }).resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                modifiers: [interact.modifiers.aspectRatio({ ratio: 'preserve' })],
                listeners: {
                    move: (event) => {
                        const slide = this.getCurrentSlide();
                        if (!slide) return;

                        slide.bgSize.width = event.rect.width;
                        slide.bgSize.height = event.rect.height;
                        slide.bgPosition.x += event.deltaRect.left;
                        slide.bgPosition.y += event.deltaRect.top;

                        event.target.style.width = event.rect.width + 'px';
                        event.target.style.height = event.rect.height + 'px';
                        event.target.style.transform =
                            `translate(${slide.bgPosition.x}px, ${slide.bgPosition.y}px)`;
                    },
                    end: saveChanges
                }
            });
        },

        // Callout methods
        addCallout() {
            const slide = this.getCurrentSlide();
            if (!slide) return;

            // Deselect any callout currently being edited
            this.clearCalloutEditing();

            this.ensureCalloutsArray(slide);
            const newCallout = this.createCallout();

            slide.callouts.push(newCallout);
            this.saveAndRefresh();

            this.scheduleCalloutSetupAndEdit(newCallout.id, slide);
        },

        ensureCalloutsArray(slide) {
            if (!slide.callouts) {
                slide.callouts = [];
            }
        },

        ensureImagesArray(slide) {
            if (!slide.images) {
                slide.images = [];
            }
        },

        createCallout() {
            return {
                id: this.generateId(),
                x: CONFIG.DEFAULT_CALLOUT_POSITION.x,
                y: CONFIG.DEFAULT_CALLOUT_POSITION.y,
                text: 'Click to edit text...',
                editing: false,
                zIndex: 20
            };
        },

        scheduleCalloutSetupAndEdit(calloutId, slide) {
            this.$nextTick(() => {
                setTimeout(() => {
                    this.setupCalloutInteraction(calloutId);

                    const callout = slide.callouts.find(c => c.id === calloutId);
                    if (callout) {
                        this.editCallout(callout);
                    }
                }, 200);
            });
        },

        scheduleOverlayInteraction(imageId) {
            this.$nextTick(() => {
                setTimeout(() => this.setupOverlayInteraction(imageId), 200);
            });
        },

        editCallout(callout) {
            // Only one callout should be in edit mode
            this.clearCalloutEditing();

            // Store original text for change tracking
            callout.originalText = callout.text;
            callout.editing = true;
            this.selectCallout(callout);
            this.$nextTick(() => {
                const textarea = document.querySelector(`#callout-${callout.id} .callout-editor`);
                if (textarea) {
                    textarea.focus();
                    textarea.select();
                }
            });
        },

        finishEditingCallout(callout) {
            const originalText = callout.originalText;
            const newText = callout.text;
            
            callout.editing = false;
            
            // Only save and refresh if text actually changed (account for undefined original text)
            if (originalText !== newText && originalText !== undefined) {
                this.saveAndRefresh();
            }
            
            // Clean up the temporary originalText property
            delete callout.originalText;
        },

        clearCalloutEditing() {
            const slide = this.getCurrentSlide();
            if (!slide || !slide.callouts) return;
            slide.callouts.forEach(c => c.editing = false);
        },

        selectCallout(callout) {
            this.selected = { type: 'callout', id: callout.id };
        },

        selectImage(image) {
            this.selected = { type: 'image', id: image.id };
        },

        isSelectedCallout(callout) {
            return this.selected.type === 'callout' && this.selected.id === callout.id;
        },

        isSelectedImage(image) {
            return this.selected.type === 'image' && this.selected.id === image.id;
        },

        clearSelection() {
            this.selected = { type: null, id: null };
            this.clearCalloutEditing();
        },


        deleteCallout(calloutId) {
            const slide = this.getCurrentSlide();
            if (!slide || !slide.callouts) return;

            slide.callouts = slide.callouts.filter(c => c.id !== calloutId);

            this.cleanupCalloutInteraction(calloutId);
            this.saveAndRefresh();
        },

        cleanupCalloutInteraction(calloutId) {
            if (this.isInteractAvailable()) {
                interact(`#callout-${calloutId}`).unset();
            }
        },

        deleteSelectedImageOrCallout() {
            const slide = this.getCurrentSlide();
            if (!slide || !this.selected.type) return;

            if (this.selected.type === 'image') {
                slide.images = (slide.images || []).filter(img => img.id !== this.selected.id);
                if (this.isInteractAvailable()) {
                    interact(`#image-${this.selected.id}`).unset();
                }
            } else if (this.selected.type === 'callout') {
                this.deleteCallout(this.selected.id);
            }

            this.clearSelection();
            this.saveAndRefresh();
        },

        isInteractAvailable() {
            return typeof interact !== 'undefined';
        },

        setupCalloutInteraction(calloutId) {
            if (typeof interact === 'undefined') return;

            const selector = `#callout-${calloutId}`;
            const element = document.querySelector(selector);

            if (!element) {
                setTimeout(() => this.setupCalloutInteraction(calloutId), 100);
                return;
            }

            interact(selector).unset();
            interact(selector).draggable({
                listeners: {
                    start: () => {
                        const slide = this.getCurrentSlide();
                        const callout = slide?.callouts?.find(c => c.id === calloutId);
                        if (callout) this.selectCallout(callout);
                    },
                    move: (event) => {
                        const slide = this.getCurrentSlide();
                        const callout = slide?.callouts?.find(c => c.id === calloutId);
                        if (!callout) return;

                        callout.x += event.dx;
                        callout.y += event.dy;
                        event.target.style.left = callout.x + 'px';
                        event.target.style.top = callout.y + 'px';
                    },
                    end: () => {
                        this.saveToStorage();
                        this.refreshPreview();
                    }
                }
            });
        },

        setupAllCalloutInteractions() {
            const slide = this.getCurrentSlide();
            if (!slide || !slide.callouts) return;

            slide.callouts.forEach(callout => {
                this.setupCalloutInteraction(callout.id);
            });
        },

        setupOverlayInteraction(imageId) {
            if (typeof interact === 'undefined') return;

            const selector = `#image-${imageId}`;
            const element = document.querySelector(selector);

            if (!element) {
                setTimeout(() => this.setupOverlayInteraction(imageId), 100);
                return;
            }

            const saveChanges = () => {
                this.saveToStorage();
                this.refreshPreview();
            };

            interact(selector).unset();
            interact(selector).draggable({
                listeners: {
                    start: (event) => {
                        const slide = this.getCurrentSlide();
                        const img = slide?.images?.find(i => i.id === imageId);
                        if (img) {
                            this.selectImage(img);
                            // Ensure the element starts with the correct position
                            event.target.style.left = img.x + 'px';
                            event.target.style.top = img.y + 'px';
                            event.target.style.transform = 'none';
                        }
                    },
                    move: (event) => {
                        const slide = this.getCurrentSlide();
                        const img = slide?.images?.find(i => i.id === imageId);
                        if (!img) return;

                        img.x += event.dx;
                        img.y += event.dy;
                        
                        // Update the element position directly, bypassing transform
                        event.target.style.left = img.x + 'px';
                        event.target.style.top = img.y + 'px';
                        event.target.style.transform = 'none';
                    },
                    end: saveChanges
                }
            }).resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                modifiers: [interact.modifiers.aspectRatio({ ratio: 'preserve' })],
                listeners: {
                    move: (event) => {
                        const slide = this.getCurrentSlide();
                        const img = slide?.images?.find(i => i.id === imageId);
                        if (!img) return;

                        img.width = event.rect.width;
                        img.height = event.rect.height;
                        img.x += event.deltaRect.left;
                        img.y += event.deltaRect.top;

                        event.target.style.width = event.rect.width + 'px';
                        event.target.style.height = event.rect.height + 'px';
                        event.target.style.left = img.x + 'px';
                        event.target.style.top = img.y + 'px';
                        event.target.style.transform = 'none';
                    },
                    end: saveChanges
                }
            });
        },

        setupAllImageInteractions() {
            const slide = this.getCurrentSlide();
            if (!slide || !slide.images) return;

            slide.images.forEach(img => {
                this.setupOverlayInteraction(img.id);
            });
        },

        createHiddenViewport() {
            const hiddenContainer = document.createElement('div');
            hiddenContainer.className = 'hidden-pdf-container';
            hiddenContainer.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 100vw;
                height: 100vh;
                z-index: -1000;
                pointer-events: none;
            `;

            // Get the original viewport to clone its structure and computed styles
            const originalViewport = document.getElementById('viewport');
            const originalCanvas = document.getElementById('canvas');
            
            // Clone the canvas structure with deep clone to get all styles
            const hiddenCanvas = originalCanvas.cloneNode(true);
            hiddenCanvas.className = 'canvas hidden-canvas';
            hiddenCanvas.id = 'hidden-canvas';
            
            // Clear the content but keep the structure
            hiddenCanvas.innerHTML = '';
            
            // Clone the viewport structure with computed styles
            const hiddenViewport = originalViewport.cloneNode(false);
            hiddenViewport.className = `viewport ${this.aspectRatio} hidden-viewport`;
            hiddenViewport.id = 'hidden-viewport';
            
            // Copy computed styles from original viewport
            const originalStyles = window.getComputedStyle(originalViewport);
            const importantStyles = ['width', 'height', 'border', 'background', 'overflow', 'position', 'margin'];
            importantStyles.forEach(prop => {
                hiddenViewport.style[prop] = originalStyles[prop];
            });
            
            hiddenCanvas.appendChild(hiddenViewport);
            hiddenContainer.appendChild(hiddenCanvas);
            document.body.appendChild(hiddenContainer);
            
            return hiddenContainer;
        },

        setupHiddenViewportSlide(hiddenContainer, slide, slideIndex) {
            const hiddenViewport = hiddenContainer.querySelector('.hidden-viewport');
            const hiddenCanvas = hiddenContainer.querySelector('.hidden-canvas');
            
            // Clear previous content
            hiddenViewport.innerHTML = '';
            
            // Remove any existing background image
            const existingBg = hiddenCanvas.querySelector('.hidden-bg-image');
            if (existingBg) {
                existingBg.remove();
            }

            // Add background image if present
            if (slide?.bgSrc) {
                const bgImg = document.createElement('img');
                bgImg.src = slide.bgSrc;
                bgImg.className = 'hidden-bg-image canvas-bg-image';
                bgImg.style.cssText = `
                    transform: translate(${slide.bgPosition?.x || 0}px, ${slide.bgPosition?.y || 0}px);
                    width: ${slide.bgSize?.width || 'auto'}px;
                    height: ${slide.bgSize?.height || 'auto'}px;
                `;
                bgImg.draggable = false;
                hiddenCanvas.appendChild(bgImg);
            }

            // Add overlay images
            if (slide?.images) {
                slide.images.forEach(img => {
                    const imgElement = document.createElement('img');
                    imgElement.src = img.src;
                    imgElement.className = 'hidden-image-overlay image-overlay';
                    imgElement.style.cssText = `
                        left: ${img.x}px;
                        top: ${img.y}px;
                        width: ${img.width}px;
                        height: ${img.height}px;
                        z-index: ${img.zIndex || 5};
                        position: absolute;
                    `;
                    imgElement.draggable = false;
                    hiddenViewport.appendChild(imgElement);
                });
            }

            // Add text callouts
            if (slide?.callouts) {
                slide.callouts.forEach(callout => {
                    const calloutElement = document.createElement('div');
                    calloutElement.className = 'hidden-text-callout text-callout';
                    calloutElement.style.cssText = `
                        left: ${callout.x}px;
                        top: ${callout.y}px;
                        z-index: ${callout.zIndex || 20};
                        font-size: ${this.calloutFontSize}px;
                        position: absolute;
                    `;
                    
                    const textDisplay = document.createElement('div');
                    textDisplay.className = 'callout-display';
                    textDisplay.textContent = callout.text;
                    calloutElement.appendChild(textDisplay);
                    
                    hiddenViewport.appendChild(calloutElement);
                });
            }

            // Add profile if present and visibility settings allow
            if (this.shouldShowProfileForSlide(slideIndex)) {
                const profileElement = document.createElement('div');
                profileElement.className = `hidden-viewport-avatar viewport-avatar position-${this.profile.position}`;
                
                const profileInfo = document.createElement('div');
                profileInfo.className = 'viewport-profile-info';
                
                if (this.profile.avatarUrl) {
                    const avatarImg = document.createElement('img');
                    avatarImg.src = this.profile.avatarUrl;
                    avatarImg.alt = this.profile.name;
                    avatarImg.className = 'viewport-profile-avatar';
                    profileInfo.appendChild(avatarImg);
                }
                
                if (this.profile.name) {
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'viewport-profile-name';
                    nameSpan.textContent = this.profile.name;
                    profileInfo.appendChild(nameSpan);
                }
                
                profileElement.appendChild(profileInfo);
                hiddenViewport.appendChild(profileElement);
            }

            // Add swipe icon if visibility settings allow
            if (this.shouldShowSwipeIconForSlide(slideIndex)) {
                const swipeElement = document.createElement('div');
                swipeElement.className = `hidden-viewport-swipe-icon viewport-swipe-icon swipe-${this.swipeIcon.location}`;
                
                const swipeDisplay = document.createElement('span');
                swipeDisplay.className = 'swipe-icon-display';
                swipeDisplay.textContent = this.getSelectedSwipeIcon().icon;
                swipeElement.appendChild(swipeDisplay);
                
                hiddenViewport.appendChild(swipeElement);
            }
        },

        cleanupHiddenViewport(hiddenContainer) {
            if (hiddenContainer && hiddenContainer.parentNode) {
                hiddenContainer.parentNode.removeChild(hiddenContainer);
            }
        }
    };
}

// Expose app instance globally for testing only
document.addEventListener('alpine:init', () => {
    // Only expose in test environments (when window.playwrightTest is set by tests)
    if (typeof window !== 'undefined' && (window.playwrightTest || location.protocol === 'file:')) {
        setTimeout(() => {
            const bodyElement = document.querySelector('body');
            if (bodyElement && bodyElement._x_dataStack && bodyElement._x_dataStack[0]) {
                window.carrouselAppInstance = bodyElement._x_dataStack[0];
            }
        }, 100);
    }
});
