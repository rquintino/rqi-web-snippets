/**
 * Foundation Model Training Visualization
 * 
 * Main purpose: Interactive visualization of AI foundation model training process
 * 
 * Key methods:
 * - foundationModelApp(): Main Alpine.js component with training simulation
 * - NetworkCanvas: Canvas-based network animation with floating nodes and connections
 * - trainingLoop(): Manages training progress simulation over 30 days
 * - setCompletedAIModel(): Randomly selects AI model on completion
 * - canvasAnimations(): Handles network background animations
 */

function foundationModelApp() {
    return {
        trainingProgress: 0,
        currentDay: 1,
        isComplete: false,
        gpuScalingPhase: true,
        aiModel: { name: "", greeting: "" },
        showGreeting: false,
        finalNetworkState: null,
        isTraining: false,
        isDark: true,
        isFullscreen: false,
        trainingCanvas: null,
        modelCanvas: null,
        trainingInterval: null,
        
        companies: [
            { 
                name: "OpenAI", 
                tagline: "Ensuring AGI benefits all of humanity",
                models: ["GPT-4.1", "GPT-4o", "GPT-4.5"], 
                color: "#10b981" 
            },
            { 
                name: "Anthropic", 
                tagline: "AI safety and research company",
                models: ["Claude 4 Opus", "Claude 4 Sonnet", "Claude 3.7"], 
                color: "#f97316" 
            },
            { 
                name: "Meta", 
                tagline: "Democratizing AI through open source",
                models: ["Llama 4 Scout", "Llama 4 Maverick", "Llama 3.3"], 
                color: "#3b82f6" 
            },
            { 
                name: "Google", 
                tagline: "Organizing the world's information with AI",
                models: ["Gemini 2.5 Pro", "Gemini 2.0 Flash", "Gemini 2.5 Flash"], 
                color: "#ef4444" 
            }
        ],

        init() {
            this.startTrainingLoop();
            this.initCanvasAnimations();
        },

        startTrainingLoop() {
            this.trainingInterval = setInterval(() => {
                // Only increment if not yet complete
                if (this.trainingProgress < 100) {
                    this.trainingProgress += 1;
                }
                
                if (this.trainingProgress <= 25) {
                    this.gpuScalingPhase = true;
                    this.isTraining = false;
                } else if (this.trainingProgress < 100) {
                    this.gpuScalingPhase = false;
                    this.isTraining = true;
                }
                
                if (this.trainingProgress >= 100) {
                    // Cap the progress at exactly 100
                    this.trainingProgress = 100;
                    this.isComplete = true;
                    this.isTraining = false;
                    
                    if (!this.showGreeting) {
                        this.setCompletedAIModel();
                    }
                    
                    setTimeout(() => {
                        this.isComplete = false;
                        this.gpuScalingPhase = true;
                        this.trainingProgress = 0;
                        this.showGreeting = false;
                        this.finalNetworkState = null;
                    }, 8000);
                    return;
                }
                
                this.updateCurrentDay();
            }, this.gpuScalingPhase ? 80 : 150);
        },

        updateCurrentDay() {
            const totalDays = 30;
            this.currentDay = Math.floor((this.trainingProgress / 100) * totalDays) + 1;
        },

        setCompletedAIModel() {
            const aiModels = [
                { 
                    name: "Nexus", 
                    greeting: "Hello! I'm Nexus, your new AI companion. I'm ready to connect ideas and solve complex problems with you!" 
                },
                { 
                    name: "Zenith", 
                    greeting: "Greetings! I'm Zenith and I'm ready to help you reach new heights in productivity and creativity!" 
                },
                { 
                    name: "Aurora", 
                    greeting: "Hi there! I'm Aurora, bringing a new dawn to AI assistance. Let's illuminate possibilities together!" 
                },
                { 
                    name: "Prism", 
                    greeting: "Hello! I'm Prism, ready to refract your challenges into colorful solutions and insights!" 
                },
                { 
                    name: "Quantum", 
                    greeting: "Greetings! I'm Quantum, prepared to compute at the speed of thought and explore infinite possibilities!" 
                }
            ];
            
            const selectedModel = aiModels[Math.floor(Math.random() * aiModels.length)];
            this.aiModel = selectedModel;
            this.showGreeting = true;
            
            setTimeout(() => this.showGreeting = false, 4000);
        },

        getMonthName() {
            return 'January';
        },

        getGpuCount() {
            if (this.gpuScalingPhase) {
                return Math.floor((this.trainingProgress / 25) * 10000).toLocaleString();
            }
            return "10,000";
        },

        getProgressLabel() {
            if (this.trainingProgress >= 100) {
                return "✅ Training Complete!";
            } else if (this.gpuScalingPhase) {
                return "Scaling cluster...";
            } else if (this.trainingProgress < 70) {
                return "Pre-training model...";
            } else {
                return "Post-training alignment...";
            }
        },

        toggleTheme() {
            this.isDark = !this.isDark;
            document.documentElement.classList.toggle('light-theme', !this.isDark);
        },

        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                this.isFullscreen = true;
            } else {
                document.exitFullscreen();
                this.isFullscreen = false;
            }
        },

        initCanvasAnimations() {
            this.$nextTick(() => {
                if (this.$refs.trainingCanvas) {
                    this.trainingCanvas = new NetworkCanvas(this.$refs.trainingCanvas, 'orange', () => this.isTraining);
                }
                if (this.$refs.modelCanvas) {
                    this.modelCanvas = new NetworkCanvas(this.$refs.modelCanvas, 'blue', () => this.trainingProgress > 95);
                }
            });
        }
    }
}

class NetworkCanvas {
    constructor(canvas, color, isAnimatingCallback) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.color = color;
        this.isAnimatingCallback = isAnimatingCallback;
        this.nodes = [];
        this.animationId = null;
        
        this.colors = {
            blue: { node: '#3b82f6', line: '#3b82f6' },
            orange: { node: '#f97316', line: '#f97316' }
        };
        
        this.currentColor = this.colors[color] || this.colors.blue;
        
        this.init();
        this.animate();
    }
    
    init() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        const nodeCount = 60;
        this.nodes = [];
        
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * rect.width,
                y: Math.random() * rect.height,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                radius: Math.random() * 3 + 2
            });
        }
    }
    
    animate() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        const isAnimating = this.isAnimatingCallback();
        
        if (isAnimating) {
            this.nodes.forEach((node) => {
                node.x += node.vx;
                node.y += node.vy;
                
                if (node.x <= node.radius || node.x >= rect.width - node.radius) node.vx *= -1;
                if (node.y <= node.radius || node.y >= rect.height - node.radius) node.vy *= -1;
                
                node.x = Math.max(node.radius, Math.min(rect.width - node.radius, node.x));
                node.y = Math.max(node.radius, Math.min(rect.height - node.radius, node.y));
            });
        }
        
        // Draw connections
        this.nodes.forEach((node, i) => {
            this.nodes.forEach((otherNode, j) => {
                if (i < j) {
                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 100) {
                        const opacity = (1 - distance / 100) * 0.3;
                        const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
                        this.ctx.strokeStyle = this.currentColor.line + alpha;
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.moveTo(node.x, node.y);
                        this.ctx.lineTo(otherNode.x, otherNode.y);
                        this.ctx.stroke();
                    }
                }
            });
        });
        
        // Draw nodes
        this.nodes.forEach((node) => {
            this.ctx.fillStyle = this.currentColor.node;
            this.ctx.globalAlpha = 0.8;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}
