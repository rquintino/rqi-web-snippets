/**
 * What's New with GenAI - Alpine.js Implementation
 * Main purpose: Interactive comparison between Traditional AI and Generative AI
 * Methods: Network background animation, progress tracking, hover effects, responsive controls
 */

// Network Background Animation Class
class NetworkBackground {
    constructor(canvas, color = 'blue') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.color = color;
        this.nodes = [];
        this.nodeCount = 80;
        this.animationId = null;
        this.resizeObserver = null;
        
        this.colors = {
            blue: { node: 'rgba(59, 130, 246, 0.8)', line: 'rgba(255, 255, 255, 0.5)' },
            green: { node: 'rgba(34, 197, 94, 0.8)', line: 'rgba(255, 255, 255, 0.5)' },
            purple: { node: 'rgba(147, 51, 234, 0.8)', line: 'rgba(255, 255, 255, 0.5)' },
            orange: { node: 'rgba(249, 115, 22, 0.8)', line: 'rgba(255, 255, 255, 0.5)' },
            red: { node: 'rgba(239, 68, 68, 0.8)', line: 'rgba(255, 255, 255, 0.5)' },
            cyan: { node: 'rgba(6, 182, 212, 0.8)', line: 'rgba(255, 255, 255, 0.5)' }
        };
        
        this.init();
        this.setupResizeObserver();
    }
    
    setupResizeObserver() {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }
    }
    
    handleResize() {
        this.init();
    }
      init() {
        // Get parent container dimensions
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Set canvas internal dimensions to match container
        this.canvas.width = Math.max(containerRect.width, 100);
        this.canvas.height = Math.max(containerRect.height, 50);
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Check if this is the main foundation model (larger canvas)
        const isMainNetwork = this.canvas.classList.contains('main-network');
        
        if (isMainNetwork) {
            // Much higher density for the foundation model
            this.nodeCount = Math.min(60, Math.max(20, Math.floor((this.width * this.height) / 200)));
        } else {
            // Normal density for small task models
            this.nodeCount = Math.min(20, Math.max(8, Math.floor((this.width * this.height) / 400)));
        }
        
        // Create nodes
        this.nodes = [];
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 2 + 0.8
            });
        }
        
        this.animate();
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const currentColor = this.colors[this.color] || this.colors.blue;
        
        // Update and draw nodes
        this.nodes.forEach((node, i) => {
            // Update position
            node.x += node.vx;
            node.y += node.vy;
            
            // Bounce off edges
            if (node.x < 0 || node.x > this.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.height) node.vy *= -1;
            
            // Keep in bounds
            node.x = Math.max(0, Math.min(this.width, node.x));
            node.y = Math.max(0, Math.min(this.height, node.y));
            
            // Draw connections to nearby nodes
            this.nodes.forEach((otherNode, j) => {
                if (i !== j) {
                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                      // Longer connections for main network, shorter for task models
                      const isMainNetwork = this.canvas.classList.contains('main-network');
                      const maxDistance = isMainNetwork ? 120 : 80;
                      
                      if (distance < maxDistance) {
                        const alpha = 0.5 * (1 - distance / maxDistance);
                        this.ctx.strokeStyle = `${currentColor.line.slice(0, -4)}, ${alpha})`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.beginPath();
                        this.ctx.moveTo(node.x, node.y);
                        this.ctx.lineTo(otherNode.x, otherNode.y);
                        this.ctx.stroke();
                    }
                }
            });
            
            // Draw node
            this.ctx.fillStyle = currentColor.node;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
      destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

// Main Alpine.js Data Function
function whatsNewWithGenai() {
    return {
        darkMode: true,
        fullscreen: false,
        activeSection: null,
        networkBackgrounds: [],
        
        traditionalTasks: [
            { 
                name: "Detect Credit Card Fraud", 
                emoji: "🛡️", 
                color: "red",
                gradient: "linear-gradient(to right, #22c55e, #3b82f6)"
            },
            { 
                name: "Recognize Faces in Photos", 
                emoji: "👁️", 
                color: "green",
                gradient: "linear-gradient(to right, #22c55e, #3b82f6)"
            },
            { 
                name: "Recommend Next Netflix Movie", 
                emoji: "📺", 
                color: "purple",
                gradient: "linear-gradient(to right, #22c55e, #3b82f6)"
            },
            { 
                name: "Predict Walmart Sales", 
                emoji: "🛒", 
                color: "orange",
                gradient: "linear-gradient(to right, #22c55e, #3b82f6)"
            },
            { 
                name: "Transcribe English Speech", 
                emoji: "🎤", 
                color: "cyan",
                gradient: "linear-gradient(to right, #22c55e, #3b82f6)"
            },
            { 
                name: "Diagnose Skin Cancer", 
                emoji: "🔬", 
                color: "blue",
                gradient: "linear-gradient(to right, #22c55e, #3b82f6)"
            }
        ],
        
        allCapabilities: [
            { name: "Text Generation", icon: "✍️" },
            { name: "Code Generation", icon: "💻" },
            { name: "Image Creation", icon: "🎨" },
            { name: "Analysis", icon: "🔍" },
            { name: "Translation", icon: "🌐" },
            { name: "Summarization", icon: "📝" },
            { name: "Video Creation", icon: "🎬" },
            { name: "Music Composition", icon: "🎵" },
            { name: "Voice Synthesis", icon: "🗣️" },
            { name: "Email Writing", icon: "📧" },
            { name: "Research Assistant", icon: "📚" },
            { name: "Data Visualization", icon: "📊" },
            { name: "Logo Design", icon: "🎯" },
            { name: "Recipe Creation", icon: "👨‍🍳" },
            { name: "Presentation Maker", icon: "📈" },
            { name: "Story Writing", icon: "📖" },
            { name: "Math Solver", icon: "🧮" },
            { name: "Language Learning", icon: "🌍" },
            { name: "Code Review", icon: "🔬" },
            { name: "Marketing Copy", icon: "📢" },
            { name: "Legal Documents", icon: "⚖️" },
            { name: "Medical Diagnosis", icon: "🏥" },
            { name: "Game Development", icon: "🎮" },
            { name: "Social Media", icon: "📱" }
        ],
        
        genaiCapabilities: [],
        rotationTimer: null,
        
        genaibenefits: [
            "One model, countless tasks",
            "Understands any data format", 
            "Ready to use immediately",
            "Talk to it in plain English",
            "Text, images, video & audio",
            "No technical setup required"
        ],
        
        init() {
            this.initCapabilities();
            this.initNetworkBackgrounds();
            this.initLucideIcons();
            this.startCapabilityRotation();
        },
        
        initCapabilities() {
            // Start with 6 random capabilities
            this.shuffleCapabilities();
        },
        
        shuffleCapabilities() {
            // Get 6 random capabilities
            const shuffled = [...this.allCapabilities].sort(() => Math.random() - 0.5);
            this.genaiCapabilities = shuffled.slice(0, 6);
        },
        
        startCapabilityRotation() {
            // Rotate capabilities every 1.5 seconds
            this.rotationTimer = setInterval(() => {
                this.rotateCapabilities();
            }, 1500);
        },
        
        rotateCapabilities() {
            // Randomly replace 2-3 capabilities with new ones for more visible change
            const numToReplace = Math.floor(Math.random() * 2) + 2;
            const indicesToReplace = [];
            
            // Select random indices to replace
            while (indicesToReplace.length < numToReplace) {
                const randomIndex = Math.floor(Math.random() * 6);
                if (!indicesToReplace.includes(randomIndex)) {
                    indicesToReplace.push(randomIndex);
                }
            }
            
            // Step 1: Fade out the cards that will change
            indicesToReplace.forEach(index => {
                const cardElement = this.$el.querySelector(`.capability-item:nth-child(${index + 1})`);
                if (cardElement) {
                    cardElement.classList.add('fading');
                }
            });
            
            // Step 2: After fade out completes, change content and fade in
            setTimeout(() => {
                // Get available capabilities (not currently shown)
                const currentCapabilities = this.genaiCapabilities.map(c => c.name);
                const availableCapabilities = this.allCapabilities.filter(c => !currentCapabilities.includes(c.name));
                
                // Replace selected capabilities
                indicesToReplace.forEach(index => {
                    if (availableCapabilities.length > 0) {
                        const randomCapability = availableCapabilities.splice(Math.floor(Math.random() * availableCapabilities.length), 1)[0];
                        this.genaiCapabilities[index] = randomCapability;
                    }
                });
                
                // Step 3: Fade back in with new content
                this.$nextTick(() => {
                    indicesToReplace.forEach(index => {
                        const cardElement = this.$el.querySelector(`.capability-item:nth-child(${index + 1})`);
                        if (cardElement) {
                            cardElement.classList.remove('fading');
                        }
                    });
                });
            }, 300); // Wait for fade out to complete
        },
        
        initLucideIcons() {
            // Initialize Lucide icons
            this.$nextTick(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            });
        },
          initNetworkBackgrounds() {
            this.$nextTick(() => {
                // Add a small delay to ensure elements are fully rendered and sized
                setTimeout(() => {
                    // Initialize network backgrounds for task models
                    const taskCanvases = this.$el.querySelectorAll('.task-model .network-bg');
                    taskCanvases.forEach((canvas, index) => {
                        const color = canvas.dataset.color || 'blue';
                        this.networkBackgrounds.push(new NetworkBackground(canvas, color));
                    });
                    
                    // Initialize main foundation model network
                    const mainNetwork = this.$el.querySelector('.main-network');
                    if (mainNetwork) {
                        this.networkBackgrounds.push(new NetworkBackground(mainNetwork, 'blue'));
                    }
                }, 100);
            });
        },
        
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
        },
        
        toggleFullscreen() {
            this.fullscreen = !this.fullscreen;
            if (this.fullscreen) {
                document.documentElement.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        },
        
        goHome() {
            window.location.href = '../index.html';
        },
        
        destroy() {
            // Cleanup
            this.networkBackgrounds.forEach(bg => bg.destroy());
            if (this.rotationTimer) {
                clearInterval(this.rotationTimer);
            }
        }
    };
}
