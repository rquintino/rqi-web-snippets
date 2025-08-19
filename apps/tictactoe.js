/**
 * Tic Tac Toe Game Logic
 * 
 * Main functionality:
 * - Player vs Computer game
 * - Smart AI with win/block strategy
 * - Score tracking across games
 * - Theme and fullscreen management
 * 
 * Key Methods:
 * - makeMove(index): Handle player moves
 * - computerMove(): AI move logic
 * - getBestMove(): AI strategy (win > block > center > corner > random)
 * - checkWin(player): Check for winning condition
 * - checkDraw(): Check for draw condition
 */

// Fullscreen event listeners
document.addEventListener('fullscreenchange', function() {
    const app = document.querySelector('[x-data]').__x.$data;
    app.isFullscreen = !!document.fullscreenElement;
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const app = document.querySelector('[x-data]').__x.$data;
        if (app.isFullscreen) {
            document.exitFullscreen();
            app.isFullscreen = false;
        }
    }
});

// Initialize game state
document.addEventListener('alpine:init', () => {
    console.log('Tic Tac Toe game initialized');
});