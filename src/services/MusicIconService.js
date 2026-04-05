/**
 * MusicIconService - Handles icon updates for music controls
 */

class MusicIconService {
    constructor() {
        this.pauseBtnIcon = null;
        this.muteBtnIcon = null;
        this.skipBtnIcon = null;
        this.shuffleBtnIcon = null;
        this.loopBtnIcon = null;
    }

    /**
     * Initialize icon element references
     */
    init() {
        this.pauseBtnIcon = document.getElementById('pauseBtnIcon');
        this.muteBtnIcon = document.getElementById('muteBtnIcon');
        this.skipBtnIcon = document.getElementById('skipBtnIcon');
        this.loopBtnIcon = document.getElementById('loopBtnIcon');
        this.shuffleBtnIcon = document.getElementById('shuffleBtnIcon');
    }

    /**
     * Update pause/play icon
     */
    updatePauseIcon(isPaused) {
        if (this.pauseBtnIcon) {
            this.pauseBtnIcon.src = isPaused ? 'assets/images/icons/Play Icon.png' : 'assets/images/icons/Pause Icon.png';
            this.pauseBtnIcon.alt = isPaused ? 'Play' : 'Pause';
        }
    }

    /**
     * Update mute/unmute icon
     */
    updateMuteIcon(isMuted) {
        if (this.muteBtnIcon) {
            this.muteBtnIcon.src = isMuted ? 'assets/images/icons/Muted Icon.png' : 'assets/images/icons/Unmuted Icon.png';
            this.muteBtnIcon.alt = isMuted ? 'Unmute' : 'Mute';
        }
    }

    /**
     * Update shuffle icon
     */
    updateShuffleIcon(isShuffling) {
        if (this.shuffleBtnIcon) {
            // For now, use the same icon regardless of state
            // Could be enhanced to show different icons for active/inactive
            this.shuffleBtnIcon.src = 'assets/images/icons/Shuffle Icon.png';
        }
    }

    /**
     * Loop toggle visual (SVG uses currentColor; opacity hints inactive state).
     */
    updateLoopIcon(isLooping) {
        if (this.loopBtnIcon) {
            this.loopBtnIcon.style.opacity = isLooping ? '1' : '0.5';
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicIconService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MusicIconService = MusicIconService;
}
