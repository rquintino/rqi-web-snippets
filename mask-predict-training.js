/*
 * Mask and Predict Training Visualization
 * 
 * Main Purpose: Demonstrates how language models learn through masked word prediction
 * 
 * Key Methods:
 * - maskPredictApp(): Main Alpine.js application state
 * - tokenizeText(): Breaks text into words for processing
 * - createTrainingExamples(): Generates sliding window examples
 * - startTraining(): Initiates the training simulation
 * - simulateTraining(): Runs prediction attempts with visual feedback
 * - updateAccuracy(): Calculates training performance metrics
 */

function maskPredictApp() {
    return {
        // Theme and UI state
        isDark: true,
        isFullscreen: false,
        
        // Training configuration
        windowSize: 10,
        trainingSpeed: 'superfast',
        
        // Training state
        isPreparingData: false,
        isTraining: false,
        isComplete: false,
        isDataPrepared: false,
        // Add new prediction phase state
        isPredicting: false,
        isPredictionComplete: false,
        currentPosition: 0,
        totalPositions: 0,
        
        // Source text - shortened paragraph about GenAI (50% of original size)
        sourceText: `Generative Artificial Intelligence represents a revolutionary breakthrough in machine learning that has fundamentally transformed how we interact with technology. Unlike traditional AI systems that were designed for specific tasks like image recognition or data analysis, generative AI models can create new content across multiple modalities including text, images, audio, and video. These sophisticated systems are built on neural network architectures such as transformers, which process and understand patterns in vast amounts of training data to generate human-like responses.`,
        
        // Training data
        sourceWords: [],
        trainingExamples: [],
        visibleExamples: [],
        
        // Statistics
        correctPredictions: 0,
        totalAttempts: 0,
        accuracy: 0,
        
        // Common words for random attempts
        commonWords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'throughout', 'alongside', 'within', 'without', 'towards', 'upon', 'beneath', 'behind', 'beyond', 'across', 'against', 'along', 'around', 'inside', 'outside', 'over', 'under', 'near', 'far', 'here', 'there', 'where', 'when', 'how', 'why', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'some', 'any', 'all', 'each', 'every', 'many', 'much', 'few', 'little', 'more', 'most', 'less', 'least', 'very', 'too', 'quite', 'rather', 'so', 'such', 'just', 'only', 'even', 'also', 'still', 'already', 'yet', 'now', 'then', 'soon', 'later', 'again', 'once', 'twice', 'often', 'always', 'never', 'sometimes', 'usually', 'generally', 'particularly', 'especially', 'specifically', 'mainly', 'mostly', 'partly', 'completely', 'entirely', 'fully', 'quite', 'rather', 'extremely', 'highly', 'deeply', 'widely', 'clearly', 'obviously', 'certainly', 'probably', 'possibly', 'perhaps', 'maybe', 'definitely', 'absolutely', 'really', 'truly', 'actually', 'basically', 'essentially', 'fundamentally', 'originally', 'initially', 'finally', 'eventually', 'recently', 'currently', 'previously', 'formerly', 'subsequently', 'consequently', 'therefore', 'however', 'nevertheless', 'nonetheless', 'furthermore', 'moreover', 'additionally', 'similarly', 'likewise', 'conversely', 'alternatively', 'otherwise', 'meanwhile', 'simultaneously', 'immediately', 'instantly', 'gradually', 'suddenly', 'quickly', 'slowly', 'carefully', 'easily', 'hardly', 'nearly', 'almost', 'quite', 'rather', 'pretty', 'fairly', 'relatively', 'particularly', 'especially', 'specifically', 'exactly', 'precisely', 'approximately', 'roughly', 'generally', 'typically', 'normally', 'usually', 'commonly', 'frequently', 'regularly', 'occasionally', 'rarely', 'seldom', 'never', 'always', 'constantly', 'continuously', 'repeatedly', 'consistently', 'persistently', 'permanently', 'temporarily', 'briefly', 'shortly', 'recently', 'lately', 'currently', 'presently', 'previously', 'formerly', 'originally', 'initially', 'eventually', 'finally', 'ultimately', 'completely', 'entirely', 'fully', 'totally', 'perfectly', 'absolutely', 'definitely', 'certainly', 'surely', 'obviously', 'clearly', 'apparently', 'seemingly', 'presumably', 'supposedly', 'allegedly', 'reportedly', 'actually', 'really', 'truly', 'genuinely', 'honestly', 'frankly', 'seriously', 'literally', 'virtually', 'practically', 'basically', 'essentially', 'fundamentally', 'primarily', 'mainly', 'mostly', 'largely', 'generally', 'typically', 'usually', 'normally', 'commonly', 'frequently', 'often', 'sometimes', 'occasionally', 'rarely', 'seldom', 'hardly', 'barely', 'scarcely', 'nearly', 'almost', 'quite', 'rather', 'very', 'extremely', 'highly', 'deeply', 'greatly', 'significantly', 'considerably', 'substantially', 'remarkably', 'incredibly', 'amazingly', 'surprisingly', 'unexpectedly', 'unfortunately', 'fortunately', 'hopefully', 'thankfully', 'luckily', 'sadly', 'regrettably', 'disappointingly', 'shockingly', 'alarmingly', 'worryingly', 'encouragingly', 'reassuringly', 'refreshingly', 'interestingly', 'surprisingly', 'notably', 'importantly', 'significantly', 'particularly', 'especially', 'specifically', 'precisely', 'exactly', 'directly', 'immediately', 'instantly', 'promptly', 'quickly', 'rapidly', 'swiftly', 'speedily', 'efficiently', 'effectively', 'successfully', 'properly', 'correctly', 'accurately', 'precisely', 'carefully', 'cautiously', 'wisely', 'sensibly', 'reasonably', 'logically', 'rationally', 'intelligently', 'cleverly', 'skillfully', 'expertly', 'professionally', 'competently', 'adequately', 'sufficiently', 'thoroughly', 'comprehensively', 'extensively', 'broadly', 'widely', 'globally', 'universally', 'internationally', 'nationally', 'locally', 'regionally', 'domestically', 'internally', 'externally', 'publicly', 'privately', 'personally', 'individually', 'collectively', 'jointly', 'mutually', 'reciprocally', 'alternatively', 'optionally', 'voluntarily', 'willingly', 'reluctantly', 'hesitantly', 'eagerly', 'enthusiastically', 'passionately', 'devotedly', 'loyally', 'faithfully', 'honestly', 'sincerely', 'genuinely', 'authentically', 'legitimately', 'legally', 'officially', 'formally', 'informally', 'casually', 'naturally', 'artificially', 'manually', 'automatically', 'mechanically', 'electronically', 'digitally', 'technologically', 'scientifically', 'mathematically', 'statistically', 'economically', 'financially', 'commercially', 'industrially', 'academically', 'educationally', 'culturally', 'socially', 'politically', 'historically', 'traditionally', 'conventionally', 'unconventionally', 'innovatively', 'creatively', 'imaginatively', 'originally', 'uniquely', 'distinctively', 'characteristically', 'typically', 'normally', 'usually', 'commonly', 'frequently', 'regularly', 'consistently', 'constantly', 'continuously', 'perpetually', 'permanently', 'temporarily', 'briefly', 'momentarily', 'instantly', 'immediately', 'promptly', 'quickly', 'rapidly', 'swiftly', 'slowly', 'gradually', 'progressively', 'steadily', 'consistently', 'reliably', 'dependably', 'predictably', 'unexpectedly', 'surprisingly', 'shockingly', 'amazingly', 'incredibly', 'remarkably', 'extraordinarily', 'exceptionally', 'unusually', 'particularly', 'especially', 'specifically', 'precisely', 'exactly', 'approximately', 'roughly', 'generally', 'broadly', 'widely', 'extensively', 'comprehensively', 'thoroughly', 'completely', 'entirely', 'fully', 'totally', 'absolutely', 'perfectly', 'ideally', 'optimally', 'maximally', 'minimally', 'adequately', 'sufficiently', 'insufficiently', 'inadequately', 'poorly', 'badly', 'terribly', 'horribly', 'awfully', 'extremely', 'very', 'quite', 'rather', 'fairly', 'relatively', 'comparatively', 'proportionally', 'correspondingly', 'accordingly', 'consequently', 'therefore', 'thus', 'hence', 'so', 'then', 'next', 'afterwards', 'subsequently', 'later', 'eventually', 'finally', 'ultimately', 'eventually', 'sooner', 'earlier', 'previously', 'formerly', 'originally', 'initially', 'firstly', 'secondly', 'thirdly', 'lastly', 'finally', 'additionally', 'furthermore', 'moreover', 'besides', 'also', 'too', 'as', 'well', 'likewise', 'similarly', 'equally', 'comparably', 'correspondingly', 'respectively', 'individually', 'separately', 'independently', 'jointly', 'collectively', 'together', 'simultaneously', 'concurrently', 'meanwhile', 'simultaneously', 'at', 'once', 'immediately', 'instantly', 'promptly', 'quickly', 'rapidly', 'swiftly', 'speedily', 'efficiently', 'effectively', 'successfully', 'properly', 'correctly', 'accurately', 'precisely', 'carefully', 'cautiously', 'wisely', 'sensibly', 'reasonably', 'logically', 'rationally', 'intelligently', 'cleverly', 'skillfully', 'expertly', 'professionally', 'competently', 'adequately', 'sufficiently', 'thoroughly', 'comprehensively', 'extensively', 'broadly', 'widely', 'globally', 'universally', 'internationally', 'nationally', 'locally', 'regionally', 'domestically', 'internally', 'externally', 'publicly', 'privately', 'personally', 'individually', 'collectively', 'jointly', 'mutually', 'reciprocally', 'alternatively', 'optionally', 'voluntarily', 'willingly', 'reluctantly', 'hesitantly', 'eagerly', 'enthusiastically', 'passionately', 'devotedly', 'loyally', 'faithfully', 'honestly', 'sincerely', 'genuinely', 'authentically', 'legitimately', 'legally', 'officially', 'formally', 'informally', 'casually', 'naturally', 'artificially', 'manually', 'automatically', 'mechanically', 'electronically', 'digitally', 'technologically', 'scientifically', 'mathematically', 'statistically', 'economically', 'financially', 'commercially', 'industrially', 'academically', 'educationally', 'culturally', 'socially', 'politically', 'historically', 'traditionally', 'conventionally', 'unconventionally', 'innovatively', 'creatively', 'imaginatively', 'originally', 'uniquely', 'distinctively', 'characteristically', 'typically', 'normally', 'usually', 'commonly', 'frequently', 'regularly', 'consistently', 'constantly', 'continuously', 'perpetually', 'permanently', 'temporarily', 'briefly', 'momentarily', 'instantly', 'immediately', 'promptly', 'quickly', 'rapidly', 'swiftly', 'slowly', 'gradually', 'progressively', 'steadily', 'consistently', 'reliably', 'dependably', 'predictably', 'unexpectedly', 'surprisingly', 'shockingly', 'amazingly', 'incredibly', 'remarkably', 'extraordinarily', 'exceptionally', 'unusually', 'particularly', 'especially', 'specifically', 'precisely', 'exactly', 'approximately', 'roughly', 'generally', 'broadly', 'widely', 'extensively', 'comprehensively', 'thoroughly', 'completely', 'entirely', 'fully', 'totally', 'absolutely', 'perfectly', 'ideally', 'optimally', 'maximally', 'minimally', 'adequately', 'sufficiently', 'insufficiently', 'inadequately', 'poorly', 'badly', 'terribly', 'horribly', 'awfully', 'extremely', 'very', 'quite', 'rather', 'fairly', 'relatively', 'comparatively', 'proportionally', 'correspondingly', 'accordingly', 'consequently', 'therefore', 'thus', 'hence', 'so'],
        
        // Add new prediction text
        predictionText: `The future of artificial intelligence lies in creating systems that can understand and generate human-like responses across multiple domains. Advanced language models demonstrate remarkable capabilities in reasoning, creativity, and problem-solving. These systems will revolutionize how we interact with computers and process information. Machine learning algorithms continue to evolve, becoming more sophisticated and efficient with each iteration. The integration of AI into everyday applications will transform industries ranging from healthcare to education.`,
        
        // Add prediction state variables
        predictionWords: [],
        generatedText: [],
        currentPredictionIndex: 0,
        predictionWindowSize: 9,
        
        generateRandomWeights(length) {
            // Generate random weights between 0.2 and 1.0 for each word
            return Array.from({ length }, () => 0.2 + Math.random() * 0.8);
        },
        
        generateUniformWeights(length) {
            // Generate uniform weights of 1.0 for all words (initial state)
            return Array.from({ length }, () => 1.0);
        },
        
        updateContextWeights(example) {
            // Update weights during training to simulate learning
            example.contextWeights = example.contextWeights.map((weight, index) => {
                // More dramatic weight changes during training
                let adjustment;
                
                // Words closer to the end of context get more weight adjustments
                const positionFactor = (index + 1) / example.context.length;
                
                if (Math.random() < 0.3) {
                    // 30% chance of significant weight change
                    adjustment = (Math.random() - 0.5) * 0.6 * positionFactor;
                } else {
                    // 70% chance of smaller adjustment
                    adjustment = (Math.random() - 0.5) * 0.2 * positionFactor;
                }
                
                return Math.max(0.1, Math.min(1.0, weight + adjustment));
            });
        },
        
        init() {
            this.tokenizeText();
            this.createTrainingExamples();
            this.tokenizePredictionText();
            
            // Apply dark theme by default
            document.body.classList.add('dark-theme');
        },
        
        tokenizeText() {
            // Simple tokenization - split by spaces and clean up
            this.sourceWords = this.sourceText
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 0);
        },
        
        tokenizePredictionText() {
            // Tokenize prediction text
            this.predictionWords = this.predictionText
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 0);
        },
        
        createTrainingExamples() {
            this.trainingExamples = [];
            
            // Create sliding window examples
            for (let i = 0; i <= this.sourceWords.length - this.windowSize; i++) {
                const context = this.sourceWords.slice(i, i + this.windowSize - 1);
                const target = this.sourceWords[i + this.windowSize - 1];
                      this.trainingExamples.push({
                context: context,
                target: target,
                currentAttempt: null,
                isCorrect: false,
                isComplete: false,
                attempts: [],
                contextWeights: this.generateUniformWeights(context.length)
            });
            }
            
            this.totalPositions = this.trainingExamples.length;
            this.visibleExamples = []; // Start with empty visible examples
        },
        
        async handleNextStep() {
            if (!this.isDataPrepared && !this.isPreparingData) {
                await this.startDataPreparation();
            } else if (this.isDataPrepared && !this.isTraining && !this.isComplete) {
                this.startTraining();
            } else if (this.isComplete && !this.isPredicting && !this.isPredictionComplete) {
                await this.startPrediction();
            }
        },
        
        async startDataPreparation() {
            this.isPreparingData = true;
            this.isDataPrepared = false;
            this.currentPosition = 0;
            this.visibleExamples = [];
            
            const speed = this.getTrainingSpeedMs();
            
            // Show sliding window going through text and add examples one by one
            for (let i = 0; i < this.trainingExamples.length; i++) {
                if (!this.isPreparingData) break;
                
                this.currentPosition = i;
                
                // Add the current example to visible examples
                this.visibleExamples.push({
                    ...this.trainingExamples[i],
                    contextWeights: this.generateUniformWeights(this.trainingExamples[i].context.length)
                });
                
                // Auto-scroll both panes
                await this.sleep(50); // Small delay to ensure DOM update
                this.scrollToCurrentPosition();
                
                await this.sleep(speed);
            }
            
            this.isPreparingData = false;
            this.isDataPrepared = true;
        },
        
        scrollToCurrentPosition() {
            // Scroll source text to current window position
            const sourceText = document.querySelector('.source-text');
            if (sourceText) {
                const currentWords = sourceText.querySelectorAll('.word');
                const currentWord = currentWords[this.currentPosition];
                if (currentWord) {
                    currentWord.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }
            
            // Scroll examples container to show latest example
            const examplesContainer = document.querySelector('.examples-container');
            if (examplesContainer) {
                examplesContainer.scrollTop = examplesContainer.scrollHeight;
            }
        },
        
        startTraining() {
            if (!this.isDataPrepared) return;
            
            this.isTraining = true;
            this.isComplete = false;
            this.currentPosition = 0;
            this.correctPredictions = 0;
            this.totalAttempts = 0;
            
            // Reset all visible examples for training
            this.visibleExamples.forEach(example => {
                example.currentAttempt = null;
                example.isCorrect = false;
                example.isComplete = false;
                example.attempts = [];
                // Keep uniform weights at the start of training
                example.contextWeights = this.generateUniformWeights(example.context.length);
            });
            
            this.simulateTraining();
        },
        
        async simulateTraining() {
            const speed = this.getTrainingSpeedMs();
            const maxIterations = 500; // Much longer training period (2.5x longer)
            let iteration = 0;
            let lastAccuracy = 0;
            let backtrackChance = 0.15; // 15% chance to backtrack
            
            while (iteration < maxIterations && !this.isComplete) {
                if (!this.isTraining) break;
                
                // Process all examples simultaneously
                let allCorrect = true;
                
                // Check if we should backtrack (make some correct answers wrong again)
                const shouldBacktrack = Math.random() < backtrackChance && iteration > 30;
                
                for (let i = 0; i < this.visibleExamples.length; i++) {
                    const example = this.visibleExamples[i];
                    
                    // Backtrack: occasionally make correct answers wrong again
                    if (shouldBacktrack && example.isCorrect && Math.random() < 0.3) {
                        example.isCorrect = false;
                        example.isComplete = false;
                        this.correctPredictions--;
                        example.currentAttempt = this.getRandomWord();
                        allCorrect = false;
                        continue;
                    }
                    
                    if (!example.isCorrect) {
                        allCorrect = false;
                        this.totalAttempts++;
                        
                        // Update weights during training to simulate learning
                        this.updateContextWeights(example);
                        
                        // More gradual learning curve with oscillation
                        let correctChance = 0;
                        
                        // Add oscillation factor
                        const oscillationFactor = 1 + 0.3 * Math.sin(iteration * 0.1);
                        
                        if (iteration < 50) {
                            // First 50 iterations: very low chance (0-4%)
                            correctChance = iteration * 0.0008;
                        } else if (iteration < 150) {
                            // Next 100 iterations: slow improvement (4-20%)
                            correctChance = 0.04 + (iteration - 50) * 0.0016;
                        } else if (iteration < 300) {
                            // Next 150 iterations: moderate improvement (20-60%)
                            correctChance = 0.2 + (iteration - 150) * 0.0027;
                        } else if (iteration < 450) {
                            // Next 150 iterations: faster convergence (60-90%)
                            correctChance = 0.6 + (iteration - 300) * 0.002;
                        } else {
                            // Final 50 iterations: fine-tuning (90-95%)
                            correctChance = 0.9 + (iteration - 450) * 0.001;
                        }
                        
                        // Apply oscillation
                        correctChance *= oscillationFactor;
                        
                        // Cap at 95% to maintain some randomness
                        correctChance = Math.min(Math.max(correctChance, 0), 0.95);
                        
                        if (Math.random() < correctChance) {
                            // Get correct answer
                            example.currentAttempt = example.target;
                            example.isCorrect = true;
                            example.isComplete = true;
                            this.correctPredictions++;
                        } else {
                            // Get random wrong answer
                            example.currentAttempt = this.getRandomWord();
                        }
                    }
                }
                
                // Reduce backtrack chance over time
                backtrackChance = Math.max(0.05, backtrackChance * 0.995);
                
                // Reduce backtrack chance over time
                backtrackChance = Math.max(0.05, backtrackChance * 0.995);
                
                this.updateAccuracy();
                
                // Check if all examples are correct
                if (allCorrect) {
                    this.isTraining = false;
                    this.isComplete = true;
                    break;
                }
                
                await this.sleep(speed);
                iteration++;
            }
            
            // Ensure completion
            if (this.isTraining) {
                this.isTraining = false;
                this.isComplete = true;
            }
        },
        
        getRandomWord() {
            // Mix of common words and words from the source text
            const sourceWordPool = [...new Set(this.sourceWords)];
            const allWords = [...this.commonWords, ...sourceWordPool];
            return allWords[Math.floor(Math.random() * allWords.length)];
        },
        
        updateAccuracy() {
            // Accuracy should be: correct examples / total examples * 100
            const totalExamples = this.visibleExamples.length;
            this.accuracy = totalExamples > 0 ? (this.correctPredictions / totalExamples) * 100 : 0;
        },
        
        async startPrediction() {
            if (!this.isComplete) return;
            
            this.isPredicting = true;
            this.isPredictionComplete = false;
            this.generatedText = [];
            this.currentPredictionIndex = 0;
            
            // Start with first 9 words from prediction text
            this.generatedText = this.predictionWords.slice(0, this.predictionWindowSize);
            
            await this.simulatePrediction();
        },
        
        async simulatePrediction() {
            const speed = this.getTrainingSpeedMs();
            
            // Continue generating until we reach the end of the prediction text
            while (this.currentPredictionIndex + this.predictionWindowSize < this.predictionWords.length) {
                if (!this.isPredicting) break;
                
                // Get the next word from the prediction text (simulating LLM prediction)
                const nextWordIndex = this.currentPredictionIndex + this.predictionWindowSize;
                const nextWord = this.predictionWords[nextWordIndex];
                
                // Add the predicted word to generated text
                this.generatedText.push(nextWord);
                
                // Move the window forward
                this.currentPredictionIndex++;
                
                // Scroll to show the latest prediction
                await this.sleep(50);
                this.scrollToPrediction();
                
                await this.sleep(speed);
            }
            
            this.isPredicting = false;
            this.isPredictionComplete = true;
        },
        
        scrollToPrediction() {
            const predictionContainer = document.querySelector('.prediction-text');
            if (predictionContainer) {
                predictionContainer.scrollTop = predictionContainer.scrollHeight;
            }
        },
        
        getPredictionContext() {
            // Get the current 9-word context window
            const startIndex = this.currentPredictionIndex;
            const endIndex = startIndex + this.predictionWindowSize;
            return this.generatedText.slice(startIndex, endIndex);
        },
        
        getLatestPrediction() {
            // Get the most recently predicted word
            if (this.generatedText.length > this.predictionWindowSize) {
                return this.generatedText[this.generatedText.length - 1];
            }
            return null;
        },
        
        getMainButtonText() {
            if (this.isPreparingData) return 'Transforming Data...';
            if (this.isTraining) return 'Training LLM...';
            if (this.isPredicting) return 'Predicting using LLM...';
            if (this.isPredictionComplete) return 'Complete!';
            
            if (!this.isDataPrepared) return 'Transform Data';
            if (this.isDataPrepared && !this.isComplete) return 'Train LLM';
            if (this.isComplete && !this.isPredictionComplete) return 'Predict using LLM';
            
            return 'Complete!';
        },
        
        isMainButtonDisabled() {
            return this.isPreparingData || this.isTraining || this.isPredicting || this.isPredictionComplete;
        },
        
        getTrainingSpeedMs() {
            switch (this.trainingSpeed) {
                case 'slow': return 2000;
                case 'medium': return 1000;
                case 'fast': return 500;
                case 'superfast': return 50;
                default: return 1000;
            }
        },
        
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        isInCurrentWindow(index) {
            if (!this.isPreparingData) return false;
            const start = this.currentPosition;
            const end = start + this.windowSize - 1;
            return index >= start && index < end;
        },
        
        isCurrentMaskedWord(index) {
            if (!this.isPreparingData) return false;
            return index === this.currentPosition + this.windowSize - 1;
        },
        
        getStatusMessage() {
            if (this.isPredictionComplete) {
                return `Text generation completed! Generated ${this.generatedText.length} words.`;
            }
            if (this.isPredicting) {
                return `Generating text... ${this.generatedText.length} words generated`;
            }
            if (this.isComplete) {
                return `Training completed! Final accuracy: ${Math.round(this.accuracy)}%`;
            }
            if (this.isTraining) {
                const correctCount = this.visibleExamples.filter(ex => ex.isCorrect).length;
                return `Training in progress... ${correctCount}/${this.visibleExamples.length} examples correct`;
            }
            if (this.isPreparingData) {
                return `Transforming training data... Position ${this.currentPosition + 1}/${this.totalPositions}`;
            }
            return '';
        },
        
        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            if (this.isFullscreen) {
                document.documentElement.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        },
        
        toggleTheme() {
            this.isDark = !this.isDark;
            document.body.classList.toggle('dark-theme', this.isDark);
            document.body.classList.toggle('light-theme', !this.isDark);
        },
        
        getAccuracyColor() {
            // Convert accuracy (0-100) to red-green color gradient
            const accuracy = Math.max(0, Math.min(100, this.accuracy));
            
            // Calculate RGB values for smooth red-to-green transition
            let red, green;
            
            if (accuracy <= 50) {
                // 0-50%: Red to yellow (red stays 255, green increases)
                red = 255;
                green = Math.round((accuracy / 50) * 255);
            } else {
                // 50-100%: Yellow to green (red decreases, green stays 255)
                red = Math.round(255 - ((accuracy - 50) / 50) * 255);
                green = 255;
            }
            
            return `color: rgb(${red}, ${green}, 0)`;
        }
    }
}
