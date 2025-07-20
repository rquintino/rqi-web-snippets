/*
LinkedIn Carousel Generator
Main functionality for creating, managing, and exporting LinkedIn carousel slides.

Key methods:
- addSlide(): Creates new slide with unique ID
- duplicateSlide(): Clones current slide
- deleteSlide(): Removes current slide with index management
- handleImageUpload(): Processes image files via drag/drop, paste, or file input
- toggleCallout(): Adds/removes text callout with drag/resize functionality
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
        isExporting: false,

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
                hasCallout: false,
                calloutText: 'Click to edit text',
                calloutPosition: { x: 25, y: 25, width: 50, height: 20 },
                calloutTail: { enabled: false, position: 'bottom', offset: 50 }
            };
            
            this.slides.push(newSlide);
            this.activeSlide = this.slides.length - 1;
            this.saveToStorage();
            
            this.$nextTick(() => {
                this.setupCalloutInteraction();
            });
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
            
            this.$nextTick(() => {
                this.setupCalloutInteraction();
            });
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
        },

        setActiveSlide(index) {
            if (index >= 0 && index < this.slides.length) {
                this.activeSlide = index;
                this.$nextTick(() => {
                    this.setupCalloutInteraction();
                });
            }
        },

        getCurrentSlide() {
            return this.slides[this.activeSlide] || null;
        },

        updateAspectRatio() {
            this.saveToStorage();
        },

        toggleCallout() {
            const slide = this.getCurrentSlide();
            if (!slide) return;
            
            slide.hasCallout = !slide.hasCallout;
            this.saveToStorage();
            
            this.$nextTick(() => {
                this.setupCalloutInteraction();
            });
        },

        updateCalloutText(event) {
            const slide = this.getCurrentSlide();
            if (!slide) return;
            
            slide.calloutText = event.target.textContent || 'Click to edit text';
            this.saveToStorage();
        },

        toggleCalloutTail() {
            const slide = this.getCurrentSlide();
            if (!slide || !slide.hasCallout) return;
            
            if (!slide.calloutTail) {
                slide.calloutTail = { enabled: false, position: 'bottom', offset: 50 };
            }
            
            slide.calloutTail.enabled = !slide.calloutTail.enabled;
            this.saveToStorage();
        },

        updateCalloutTailPosition(position) {
            const slide = this.getCurrentSlide();
            if (!slide || !slide.hasCallout || !slide.calloutTail) return;
            
            slide.calloutTail.position = position;
            this.saveToStorage();
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
                    slide.bgSrc = e.target.result;
                    this.saveToStorage();
                }
            };
            reader.readAsDataURL(file);
        },

        setupPasteHandler() {
            window.addEventListener('paste', (e) => {
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
                if (e.target.contentEditable === 'true') return;
                
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
                            this.setActiveSlide(this.activeSlide - 1);
                        }
                        break;
                    case 'arrowright':
                        if (this.activeSlide < this.slides.length - 1) {
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
                    this.setupCalloutInteraction();
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

        setupCalloutInteraction() {
            if (typeof interact === 'undefined') return;
            
            const calloutId = `#callout-${this.activeSlide}`;
            
            interact(calloutId).draggable({
                listeners: {
                    move(event) {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                        
                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                }
            }).resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move(event) {
                        const target = event.target;
                        let x = (parseFloat(target.getAttribute('data-x')) || 0);
                        let y = (parseFloat(target.getAttribute('data-y')) || 0);
                        
                        target.style.width = event.rect.width + 'px';
                        target.style.height = event.rect.height + 'px';
                        
                        x += event.deltaRect.left;
                        y += event.deltaRect.top;
                        
                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
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
                    
                    const canvas = document.getElementById('canvas');
                    const canvasData = await html2canvas(canvas, {
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        scale: 2,
                        width: isSquare ? 540 : 540,
                        height: isSquare ? 540 : 675
                    });
                    
                    const imgData = canvasData.toDataURL('image/png');
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
            window.location.href = 'index.html';
        },

        async saveToStorage() {
            const data = {
                slides: this.slides,
                activeSlide: this.activeSlide,
                aspectRatio: this.aspectRatio,
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
        }
    };
}