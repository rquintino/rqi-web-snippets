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

// Translations
const translations = {
    en: {
        mainTitle: "What's New with GenAI?",
        subtitle: "Traditional AI vs Generative AI",
        traditionalAI: "Traditional AI",
        generativeAI: "Generative AI",
        traditionalPeriod: "(2000-2020)",
        generativePeriod: "(2022+)",
        oneModelPerTask: "One Model Per Very Specific Task",
        oneFoundationModel: "One Foundation Model, Multiple Tasks",
        foundationModel: "Foundation Model",
        tasks: {
            detectFraud: "Detect Credit Card Fraud",
            recognizeFaces: "Recognize Faces in Photos",
            recommendMovies: "Recommend Next Netflix Movie",
            predictSales: "Predict Walmart Sales",
            transcribeSpeech: "Transcribe English Speech",
            diagnoseCancer: "Diagnose Skin Cancer"
        },
        capabilities: {
            textGeneration: "Text Generation",
            codeGeneration: "Code Generation",
            imageCreation: "Image Creation",
            analysis: "Analysis",
            translation: "Translation",
            summarization: "Summarization",
            videoCreation: "Video Creation",
            musicComposition: "Music Composition",
            voiceSynthesis: "Voice Synthesis",
            emailWriting: "Email Writing",
            researchAssistant: "Research Assistant",
            dataVisualization: "Data Visualization",
            logoDesign: "Logo Design",
            recipeCreation: "Recipe Creation",
            presentationMaker: "Presentation Maker",
            storyWriting: "Story Writing",
            mathSolver: "Math Solver",
            languageLearning: "Language Learning",
            codeReview: "Code Review",
            marketingCopy: "Marketing Copy",
            legalDocuments: "Legal Documents",
            medicalDiagnosis: "Medical Diagnosis",
            gameDevelopment: "Game Development",
            socialMedia: "Social Media"
        },
        benefits: {
            oneModel: "One model, countless tasks",
            anyFormat: "Understands any data format",
            readyToUse: "Ready to use immediately",
            plainEnglish: "Talk to it in plain English",
            multiModal: "Text, images, video & audio",
            noSetup: "No technical setup required"
        }
    },
    pt: {
        mainTitle: "O que há de novo na GenAI?",
        subtitle: "IA Tradicional vs IA Generativa",
        traditionalAI: "IA Tradicional",
        generativeAI: "IA Generativa",
        traditionalPeriod: "(2000-2020)",
        generativePeriod: "(2022+)",
        oneModelPerTask: "Um Modelo Por Tarefa Muito Específica",
        oneFoundationModel: "Um Modelo Base, Múltiplas Tarefas",
        foundationModel: "Modelo Base",
        tasks: {
            detectFraud: "Detetar Fraude de Cartão de Crédito",
            recognizeFaces: "Reconhecer Rostos em Fotos",
            recommendMovies: "Recomendar Próximo Filme Netflix",
            predictSales: "Prever Vendas do Walmart",
            transcribeSpeech: "Transcrever Discurso em Inglês",
            diagnoseCancer: "Diagnosticar Cancro de Pele"
        },
        capabilities: {
            textGeneration: "Geração de Texto",
            codeGeneration: "Geração de Código",
            imageCreation: "Criação de Imagens",
            analysis: "Análise",
            translation: "Tradução",
            summarization: "Resumo",
            videoCreation: "Criação de Vídeo",
            musicComposition: "Composição Musical",
            voiceSynthesis: "Síntese de Voz",
            emailWriting: "Escrita de E-mails",
            researchAssistant: "Assistente de Pesquisa",
            dataVisualization: "Visualização de Dados",
            logoDesign: "Design de Logótipos",
            recipeCreation: "Criação de Receitas",
            presentationMaker: "Criador de Apresentações",
            storyWriting: "Escrita de Histórias",
            mathSolver: "Resolução de Matemática",
            languageLearning: "Aprendizagem de Línguas",
            codeReview: "Revisão de Código",
            marketingCopy: "Textos de Marketing",
            legalDocuments: "Documentos Legais",
            medicalDiagnosis: "Diagnóstico Médico",
            gameDevelopment: "Desenvolvimento de Jogos",
            socialMedia: "Redes Sociais"
        },
        benefits: {
            oneModel: "Um modelo, inúmeras tarefas",
            anyFormat: "Compreende qualquer formato",
            readyToUse: "Pronto a usar imediatamente",
            plainEnglish: "Fale com ele em linguagem natural",
            multiModal: "Texto, imagens, vídeo e áudio",
            noSetup: "Sem configuração técnica"
        }
    }
};

// Main Alpine.js Data Function
function whatsNewWithGenai() {
    return {
        darkMode: true,
        fullscreen: false,
        language: 'en',
        activeSection: null,
        networkBackgrounds: [],
        
        traditionalTasks: [
            { key: "detectFraud", emoji: "🛡️", color: "red", gradient: "linear-gradient(to right, #22c55e, #3b82f6)" },
            { key: "recognizeFaces", emoji: "👁️", color: "green", gradient: "linear-gradient(to right, #22c55e, #3b82f6)" },
            { key: "recommendMovies", emoji: "📺", color: "purple", gradient: "linear-gradient(to right, #22c55e, #3b82f6)" },
            { key: "predictSales", emoji: "🛒", color: "orange", gradient: "linear-gradient(to right, #22c55e, #3b82f6)" },
            { key: "transcribeSpeech", emoji: "🎤", color: "cyan", gradient: "linear-gradient(to right, #22c55e, #3b82f6)" },
            { key: "diagnoseCancer", emoji: "🔬", color: "blue", gradient: "linear-gradient(to right, #22c55e, #3b82f6)" }
        ],
        
        allCapabilities: [
            { key: "textGeneration", icon: "✍️" },
            { key: "codeGeneration", icon: "💻" },
            { key: "imageCreation", icon: "🎨" },
            { key: "analysis", icon: "🔍" },
            { key: "translation", icon: "🌐" },
            { key: "summarization", icon: "📝" },
            { key: "videoCreation", icon: "🎬" },
            { key: "musicComposition", icon: "🎵" },
            { key: "voiceSynthesis", icon: "🗣️" },
            { key: "emailWriting", icon: "📧" },
            { key: "researchAssistant", icon: "📚" },
            { key: "dataVisualization", icon: "📊" },
            { key: "logoDesign", icon: "🎯" },
            { key: "recipeCreation", icon: "👨‍🍳" },
            { key: "presentationMaker", icon: "📈" },
            { key: "storyWriting", icon: "📖" },
            { key: "mathSolver", icon: "🧮" },
            { key: "languageLearning", icon: "🌍" },
            { key: "codeReview", icon: "🔬" },
            { key: "marketingCopy", icon: "📢" },
            { key: "legalDocuments", icon: "⚖️" },
            { key: "medicalDiagnosis", icon: "🏥" },
            { key: "gameDevelopment", icon: "🎮" },
            { key: "socialMedia", icon: "📱" }
        ],
        
        genaiCapabilities: [],
        rotationTimer: null,
        
        genaiBenefitKeys: ['oneModel', 'anyFormat', 'readyToUse', 'plainEnglish', 'multiModal', 'noSetup'],
        
        // Translation helper
        t(key) {
            const keys = key.split('.');
            let value = translations[this.language];
            for (const k of keys) {
                value = value?.[k];
            }
            return value || key;
        },

        toggleLanguage() {
            this.language = this.language === 'en' ? 'pt' : 'en';
        },

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
                const currentCapabilities = this.genaiCapabilities.map(c => c.key);
                const availableCapabilities = this.allCapabilities.filter(c => !currentCapabilities.includes(c.key));
                
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
