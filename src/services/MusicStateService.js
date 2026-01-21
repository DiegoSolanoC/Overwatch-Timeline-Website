/**
 * MusicStateService - Handles music state persistence to/from localStorage
 */

class MusicStateService {
    constructor() {
        this.storageKey = 'musicState';
    }

    /**
     * Save current music state to localStorage
     */
    saveState(musicState) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(musicState));
        } catch (e) {
            console.error('Error saving music state:', e);
        }
    }

    /**
     * Load music state from localStorage
     */
    loadState() {
        try {
            const savedState = localStorage.getItem(this.storageKey);
            if (!savedState) return null;
            return JSON.parse(savedState);
        } catch (e) {
            console.error('Error loading music state:', e);
            return null;
        }
    }

    /**
     * Build music state object from current playback state
     */
    buildState(backgroundMusic, currentSong, isShuffling, currentSongIndex, shuffleQueue) {
        if (!backgroundMusic) return null;
        
        return {
            currentSong: currentSong,
            currentTime: backgroundMusic.currentTime,
            paused: backgroundMusic.paused,
            volume: backgroundMusic.volume,
            muted: backgroundMusic.muted,
            isShuffling: isShuffling,
            currentSongIndex: currentSongIndex,
            shuffleQueue: isShuffling ? shuffleQueue.map(s => s.filename) : null
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicStateService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MusicStateService = MusicStateService;
}
