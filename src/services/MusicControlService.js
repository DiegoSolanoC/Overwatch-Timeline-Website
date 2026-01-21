/**
 * MusicControlService - Handles control button event handlers (volume, mute, pause, skip, shuffle)
 */

class MusicControlService {
    constructor(backgroundMusic, volumeService, shuffleService, iconService, onStateChange) {
        this.backgroundMusic = backgroundMusic;
        this.volumeService = volumeService;
        this.shuffleService = shuffleService;
        this.iconService = iconService;
        this.onStateChange = onStateChange; // Callback for state changes (e.g., saveMusicState)
        
        // DOM elements (will be set in init)
        this.volumeSlider = null;
        this.volumeValue = null;
        this.muteBtn = null;
        this.pauseBtn = null;
        this.skipBtn = null;
        this.shuffleBtn = null;
    }

    /**
     * Initialize DOM element references
     */
    init() {
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.muteBtn = document.getElementById('muteBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.skipBtn = document.getElementById('skipBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
    }

    /**
     * Setup volume slider handler
     */
    setupVolumeSlider() {
        if (!this.volumeSlider) return;
        
        this.volumeSlider.addEventListener('input', () => {
            const volume = this.volumeSlider.value / 100;
            this.volumeService.setTargetVolume(volume);
            this.volumeService.setVolume(volume);
            
            if (this.volumeValue) {
                this.volumeValue.textContent = Math.round(volume * 100) + '%';
            } else {
                // Fallback: try to get element directly
                const volumeValueEl = document.getElementById('volumeValue');
                if (volumeValueEl) {
                    volumeValueEl.textContent = Math.round(volume * 100) + '%';
                }
            }
            
            if (this.onStateChange) {
                this.onStateChange();
            }
            
            if (volume === 0 && this.muteBtn) {
                this.muteBtn.classList.add('active');
                this.iconService.updateMuteIcon(true);
            } else if (this.muteBtn) {
                if (!this.backgroundMusic.muted) {
                    this.muteBtn.classList.remove('active');
                    this.iconService.updateMuteIcon(false);
                }
            }
        });
    }

    /**
     * Setup mute button handler
     */
    setupMuteButton() {
        if (!this.muteBtn) return;
        
        this.muteBtn.addEventListener('click', () => {
            if (this.backgroundMusic.muted) {
                this.backgroundMusic.muted = false;
                this.muteBtn.classList.remove('active');
                this.iconService.updateMuteIcon(false);
                if (!this.volumeService.isFading()) {
                    this.backgroundMusic.volume = this.volumeService.getTargetVolume();
                }
            } else {
                this.backgroundMusic.muted = true;
                this.muteBtn.classList.add('active');
                this.iconService.updateMuteIcon(true);
            }
            
            if (this.onStateChange) {
                this.onStateChange();
            }
        });
    }

    /**
     * Setup pause button handler
     */
    setupPauseButton() {
        if (!this.pauseBtn) return;
        
        this.pauseBtn.addEventListener('click', () => {
            if (this.backgroundMusic.paused) {
                this.backgroundMusic.play();
                this.pauseBtn.classList.remove('active');
                this.iconService.updatePauseIcon(false);
            } else {
                this.backgroundMusic.pause();
                this.pauseBtn.classList.add('active');
                this.iconService.updatePauseIcon(true);
            }
            
            if (this.onStateChange) {
                this.onStateChange();
            }
        });
    }

    /**
     * Setup skip button handler
     */
    setupSkipButton(onSkip) {
        if (!this.skipBtn) return;
        
        this.skipBtn.addEventListener('click', () => {
            if (onSkip) {
                onSkip();
            }
        });
    }

    /**
     * Setup shuffle button handler
     */
    setupShuffleButton(musicFiles, currentSong) {
        if (!this.shuffleBtn) return;
        
        this.shuffleBtn.addEventListener('click', () => {
            if (this.shuffleService.isShuffling) {
                this.shuffleService.disableShuffle();
                this.shuffleBtn.classList.remove('active');
                this.iconService.updateShuffleIcon(false);
            } else {
                this.shuffleService.enableShuffle(musicFiles, currentSong);
                this.shuffleBtn.classList.add('active');
                this.iconService.updateShuffleIcon(true);
            }
            
            if (this.onStateChange) {
                this.onStateChange();
            }
        });
    }

    /**
     * Setup all control buttons
     */
    setupAllControls(musicFiles, currentSong, onSkip) {
        this.setupVolumeSlider();
        this.setupMuteButton();
        this.setupPauseButton();
        this.setupSkipButton(onSkip);
        this.setupShuffleButton(musicFiles, currentSong);
    }

    /**
     * Initialize button states based on current playback state
     */
    initializeButtonStates() {
        if (this.backgroundMusic.paused) {
            this.iconService.updatePauseIcon(true);
            if (this.pauseBtn) this.pauseBtn.classList.add('active');
        } else {
            this.iconService.updatePauseIcon(false);
            if (this.pauseBtn) this.pauseBtn.classList.remove('active');
        }
        
        if (this.backgroundMusic.muted) {
            this.iconService.updateMuteIcon(true);
            if (this.muteBtn) this.muteBtn.classList.add('active');
        } else {
            this.iconService.updateMuteIcon(false);
            if (this.muteBtn) this.muteBtn.classList.remove('active');
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicControlService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MusicControlService = MusicControlService;
}
