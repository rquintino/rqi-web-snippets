/**
 * How LLMs Work - Interactive Visualization
 *
 * Purpose: Alpine.js component for visualizing how Large Language Models process inputs
 * Main methods:
 * - llmVisualization(): Main Alpine.js data function
 * - toggleTheme(): Switches between light/dark themes
 * - toggleFullscreen(): Enables/disables fullscreen mode
 * - toggleLang(): Switches between EN/PT languages
 * - t(key): Returns translated text for current language
 */

const translations = {
    en: {
        pageTitle: 'How LLMs Work - Interactive Visualization',
        contextWindow: 'Context Window',
        contextDesc: 'Multiple layers of input combined and sent to the AI model',
        foundationModel: 'Foundation Model',
        foundationModelEx: '(ex. Claude, GPT-4o)',
        modelDesc: 'Frozen learned patterns of language/public knowledge',
        generatedOutputs: 'Generated Outputs',
        outputsDesc: 'Generated responses in multiple formats',
        userPrompt: 'User Prompt',
        userPromptEx: '"Write a professional email to decline a meeting"',
        conversationThread: 'Conversation Thread',
        conversationDesc: 'Previous messages and context',
        additionalFiles: 'Additional Files',
        filesDesc: 'Documents, data, and references',
        systemInstructions: 'System Instructions',
        systemDesc: 'Behavior and response guidelines',
        text: 'Text',
        textDesc: 'Writing, summarization, translation, Q&A, analysis',
        code: 'Code',
        codeDesc: 'Programming, debugging, automation, scripts',
        toolUsage: 'Tool Usage',
        toolDesc: 'Gmail, Calendar, CRM, databases, web search',
        visualContent: 'Visual Content',
        visualDesc: 'Generated images and diagrams',
        videoSound: 'Video and Sound',
        videoDesc: 'Multimedia content and audio generation',
        frozenPatterns: '🔒 FROZEN PATTERNS',
        frozenDesc: 'Learned knowledge cannot be changed during inference',
        input: 'Input',
        output: 'Output'
    },
    pt: {
        pageTitle: 'Como Funcionam os LLMs - Visualização Interativa',
        contextWindow: 'Janela de Contexto',
        contextDesc: 'Múltiplas camadas de entrada combinadas e enviadas ao modelo de IA',
        foundationModel: 'Modelo Base',
        foundationModelEx: '(ex. Claude, GPT-4o)',
        modelDesc: 'Padrões aprendidos congelados de linguagem/conhecimento público',
        generatedOutputs: 'Respostas Geradas',
        outputsDesc: 'Respostas geradas em múltiplos formatos',
        userPrompt: 'Prompt do Utilizador',
        userPromptEx: '"Escreve um email profissional para recusar uma reunião"',
        conversationThread: 'Histórico da Conversa',
        conversationDesc: 'Mensagens anteriores e contexto',
        additionalFiles: 'Ficheiros Adicionais',
        filesDesc: 'Documentos, dados e referências',
        systemInstructions: 'Instruções do Sistema',
        systemDesc: 'Diretrizes de comportamento e resposta',
        text: 'Texto',
        textDesc: 'Escrita, resumos, tradução, Q&A, análise',
        code: 'Código',
        codeDesc: 'Programação, depuração, automação, scripts',
        toolUsage: 'Uso de Ferramentas',
        toolDesc: 'Gmail, Calendário, CRM, bases de dados, pesquisa web',
        visualContent: 'Conteúdo Visual',
        visualDesc: 'Imagens e diagramas gerados',
        videoSound: 'Vídeo e Som',
        videoDesc: 'Conteúdo multimédia e geração de áudio',
        frozenPatterns: '🔒 PADRÕES CONGELADOS',
        frozenDesc: 'Conhecimento aprendido não pode ser alterado durante a inferência',
        input: 'Entrada',
        output: 'Saída'
    }
};

function llmVisualization() {
    return {
        isDark: true,
        isFullscreen: false,
        lang: 'en',
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
        
        t(key) {
            return translations[this.lang]?.[key] || translations.en[key] || key;
        },

        init() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            const savedTheme = localStorage.getItem('llm-theme');
            if (savedTheme) {
                this.isDark = savedTheme === 'dark';
            }
            const savedLang = localStorage.getItem('llm-lang');
            if (savedLang) {
                this.lang = savedLang;
            }
            document.title = this.t('pageTitle');
        },

        toggleLang() {
            this.lang = this.lang === 'en' ? 'pt' : 'en';
            localStorage.setItem('llm-lang', this.lang);
            document.title = this.t('pageTitle');
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