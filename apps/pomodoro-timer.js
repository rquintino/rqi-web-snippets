/**
 * Pomodoro Timer Application
 * 
 * Main purpose: Implement a complete Pomodoro technique timer with work/break sessions
 * 
 * Key methods:
 * - pomodoroTimer(): Main Alpine.js data function
 * - startTimer(): Begin countdown
 * - pauseTimer(): Pause current session
 * - resetTimer(): Reset to initial state
 * - tick(): Handle countdown logic (called every second)
 * - completeSession(): Handle session completion and transitions
 * - playNotification(): Audio notification for session changes
 * - toggleDark/toggleFullscreen(): UI theme controls
 * - saveSettings/loadSettings(): Persist user preferences
 */

function pomodoroTimer() {
    return {
        // Core timer state
        timeLeft: 25 * 60, // 25 minutes in seconds
        isRunning: false,
        sessionType: 'Work',
        sessionCount: 1,
        interval: null,
        
        // UI state - defined inline for immediate availability
        isDark: localStorage.getItem('pomodoro-dark') === 'true',
        isFullscreen: false,
        showSettings: false,
        
        // Settings
        settings: {
            workDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            soundEnabled: true
        },
        
        // Progress ring properties
        circumference: 2 * Math.PI * 90, // radius = 90
        
        init() {
            this.loadSettings();
            this.resetTimer();
            
            // Apply dark mode immediately
            if (this.isDark) {
                document.body.classList.add('dark');
            }
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !e.target.matches('input, textarea, [contenteditable]')) {
                    e.preventDefault();
                    if (this.isRunning) {
                        this.pauseTimer();
                    } else {
                        this.startTimer();
                    }
                }
                if (e.code === 'KeyR' && e.ctrlKey) {
                    e.preventDefault();
                    this.resetTimer();
                }
            });
        },
        
        get displayTime() {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        },
        
        get strokeDashoffset() {
            const totalTime = this.getTotalSessionTime();
            const progress = (totalTime - this.timeLeft) / totalTime;
            return this.circumference * (1 - progress);
        },
        
        getTotalSessionTime() {
            switch (this.sessionType) {
                case 'Work':
                    return this.settings.workDuration * 60;
                case 'Short Break':
                    return this.settings.shortBreak * 60;
                case 'Long Break':
                    return this.settings.longBreak * 60;
                default:
                    return 25 * 60;
            }
        },
        
        startTimer() {
            if (this.isRunning) return;
            
            this.isRunning = true;
            this.interval = setInterval(() => {
                this.tick();
            }, 1000);
        },
        
        pauseTimer() {
            this.isRunning = false;
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        },
        
        resetTimer() {
            this.pauseTimer();
            this.sessionType = 'Work';
            this.timeLeft = this.settings.workDuration * 60;
            this.sessionCount = 1;
        },
        
        tick() {
            if (this.timeLeft > 0) {
                this.timeLeft--;
            } else {
                this.completeSession();
            }
        },
        
        completeSession() {
            this.pauseTimer();
            this.playNotification();
            
            if (this.sessionType === 'Work') {
                // Completed a work session
                if (this.sessionCount % 4 === 0) {
                    // Long break after 4 work sessions
                    this.sessionType = 'Long Break';
                    this.timeLeft = this.settings.longBreak * 60;
                } else {
                    // Short break
                    this.sessionType = 'Short Break';
                    this.timeLeft = this.settings.shortBreak * 60;
                }
            } else {
                // Completed a break session
                this.sessionType = 'Work';
                this.timeLeft = this.settings.workDuration * 60;
                if (this.sessionType === 'Work' && (this.sessionCount % 4 !== 0 || this.sessionCount === 0)) {
                    this.sessionCount++;
                }
            }
            
            // Auto-start next session (can be paused immediately if not wanted)
            setTimeout(() => {
                this.startTimer();
            }, 1000);
        },
        
        playNotification() {
            if (!this.settings.soundEnabled) return;
            
            // Create a simple beep sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                console.log('Audio notification not supported');
            }
        },
        
        toggleDark() {
            this.isDark = !this.isDark;
            document.body.classList.toggle('dark', this.isDark);
            localStorage.setItem('pomodoro-dark', this.isDark);
        },
        
        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            document.body.classList.toggle('fullscreen', this.isFullscreen);
            
            if (this.isFullscreen) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            }
        },
        
        goHome() {
            window.location.href = 'index.html';
        },
        
        saveSettings() {
            localStorage.setItem('pomodoro-settings', JSON.stringify(this.settings));
        },
        
        loadSettings() {
            const saved = localStorage.getItem('pomodoro-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        },
        
        // Watch for settings changes
        $watch: {
            settings: {
                handler() {
                    this.saveSettings();
                    // Update current session if changed while not running
                    if (!this.isRunning) {
                        if (this.sessionType === 'Work') {
                            this.timeLeft = this.settings.workDuration * 60;
                        } else if (this.sessionType === 'Short Break') {
                            this.timeLeft = this.settings.shortBreak * 60;
                        } else if (this.sessionType === 'Long Break') {
                            this.timeLeft = this.settings.longBreak * 60;
                        }
                    }
                },
                deep: true
            }
        }
    };
}