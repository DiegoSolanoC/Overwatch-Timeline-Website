/**
 * SoundEffectsManager - Manages all sound effects for the application
 * Handles loading, playing, and volume control for sound effects
 */

// Asset loading order tracking (if available) - use window.logAssetLoad if it exists
// Don't declare a const to avoid conflicts with script.js

class SoundEffectsManager {
    constructor() {
        this.sounds = {};
        this.volume = 0.5; // Default 50%
    }
    
    // Load saved volume from localStorage
    loadVolume() {
        const savedVolume = localStorage.getItem('soundEffectsVolume');
        if (savedVolume !== null) {
            const volume = parseFloat(savedVolume);
            if (!isNaN(volume) && volume >= 0 && volume <= 1) {
                this.volume = volume;
            }
        }
        return this.volume;
    }
    
    // Save volume to localStorage
    saveVolume() {
        localStorage.setItem('soundEffectsVolume', this.volume.toString());
    }
    
    // Load a sound effect
    loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.preload = 'auto'; // Preload the audio
            audio.volume = this.volume;
            // Add error handler
            audio.addEventListener('error', (e) => {
                console.error(`Error loading sound "${name}" from "${path}":`, e);
            });
            // Add load handler for debugging
            audio.addEventListener('canplaythrough', () => {
                console.log(`Sound "${name}" loaded successfully`);
            });
            this.sounds[name] = audio;
            return audio;
        } catch (error) {
            console.error(`Failed to create audio for "${name}":`, error);
            return null;
        }
    }
    
    // Play a sound effect
    play(name, options = {}) {
        if (this.sounds[name]) {
            // Clone the audio to allow overlapping sounds
            const audio = this.sounds[name].cloneNode();
            
            // Reset to beginning and ensure it's ready
            audio.currentTime = 0;
            
            // Set playback rate if specified (for speed adjustment)
            if (options.playbackRate) {
                audio.playbackRate = options.playbackRate;
            }
            
            // Set volume with optional multiplier
            let volumeMultiplier = 1;
            if (name === 'filterConfirm') {
                volumeMultiplier = 0.5; // Filter confirm is always at 50% of the set volume
            } else if (name === 'hackOn' || name === 'hackOff') {
                volumeMultiplier = 0.85; // Hack sounds at 85% of the set volume
            } else if (name === 'page') {
                volumeMultiplier = 0.4; // Page turning sound at 40% of the set volume
            }
            
            audio.volume = this.volume * volumeMultiplier;
            
            // Play immediately - if not ready, wait for ready state
            const playAudio = () => {
                audio.play().catch(err => {
                    console.warn(`Could not play sound effect "${name}":`, err);
                });
            };
            
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                playAudio();
            } else {
                // Wait for audio to be ready, but don't wait too long
                const readyHandler = () => {
                    playAudio();
                    audio.removeEventListener('canplay', readyHandler);
                };
                audio.addEventListener('canplay', readyHandler);
                // Fallback: try to play anyway after a short delay
                setTimeout(() => {
                    if (audio.readyState >= 2) {
                        playAudio();
                    }
                    audio.removeEventListener('canplay', readyHandler);
                }, 50);
            }
            
            // Add fade out for hackOn
            if (name === 'hackOn' && options.fadeOut) {
                const fadeDuration = options.fadeOutDuration || 500; // Default 500ms fade
                const fadeSteps = 20;
                const fadeStepTime = fadeDuration / fadeSteps;
                const startVolume = audio.volume;
                let currentStep = 0;
                
                const fadeInterval = setInterval(() => {
                    currentStep++;
                    const progress = currentStep / fadeSteps;
                    audio.volume = startVolume * (1 - progress);
                    
                    if (currentStep >= fadeSteps) {
                        clearInterval(fadeInterval);
                        audio.volume = 0;
                        // Stop the audio after fade completes
                        setTimeout(() => {
                            audio.pause();
                            audio.currentTime = 0;
                        }, 100);
                    }
                }, fadeStepTime);
            }
            
            return audio;
        } else {
            console.warn(`Sound effect "${name}" not loaded`);
            return null;
        }
    }
    
    // Set volume for all sound effects
    setVolume(volume) {
        this.volume = volume;
        this.saveVolume(); // Save to localStorage
        Object.keys(this.sounds).forEach(name => {
            // Filter confirm is always at 50% of the set volume
            if (name === 'filterConfirm') {
                this.sounds[name].volume = volume * 0.5;
            } else {
                this.sounds[name].volume = volume;
            }
        });
    }
    
    // Initialize sound effects
    init() {
        // Load all sound effects
        // Use window.logAssetLoad if available (defined in script.js)
        const logAssetLoad = (typeof window !== 'undefined' && typeof window.logAssetLoad === 'function') 
            ? window.logAssetLoad 
            : (() => {});
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Pick.mp3');
        this.loadSound('filterPick', 'assets/audio/sfx/Filter Pick.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Off.mp3');
        this.loadSound('filterOff', 'assets/audio/sfx/Filter Off.mp3');
        // Filter confirm at reduced volume (50% of normal)
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Confirm.mp3');
        const filterConfirmAudio = new Audio('assets/audio/sfx/Filter Confirm.mp3');
        filterConfirmAudio.volume = this.volume * 0.5; // 50% of sound effects volume
        this.sounds['filterConfirm'] = filterConfirmAudio;
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Clear.mp3');
        this.loadSound('filterClear', 'assets/audio/sfx/Filter Clear.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Radiate.mp3');
        this.loadSound('radiate', 'assets/audio/sfx/Radiate.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Page.mp3');
        this.loadSound('page', 'assets/audio/sfx/Page.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Event Click.mp3');
        this.loadSound('eventClick', 'assets/audio/sfx/Event Click.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Music.mp3');
        this.loadSound('music', 'assets/audio/sfx/Music.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Hack On.mp3');
        this.loadSound('hackOn', 'assets/audio/sfx/Hack On.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Hack Off.mp3');
        this.loadSound('hackOff', 'assets/audio/sfx/Hack Off.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Transport Toggle.mp3');
        this.loadSound('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Rotation Toggle.mp3');
        this.loadSound('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Event Manager.mp3');
        this.loadSound('eventManager', 'assets/audio/sfx/Event Manager.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Switch Event.mp3');
        this.loadSound('switchEvent', 'assets/audio/sfx/Switch Event.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Button.mp3');
        this.loadSound('filterButton', 'assets/audio/sfx/Filter Button.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Color Change.mp3');
        this.loadSound('colorChange', 'assets/audio/sfx/Color Change.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Mode Switch.mp3');
        this.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
        
        // Load saved volume and apply it
        const savedVolume = this.loadVolume();
        this.setVolume(savedVolume); // This will apply to all sounds
        
        // Setup sound effects volume slider
        const soundEffectsSlider = document.getElementById('soundEffectsSlider');
        const soundEffectsVolumeValue = document.getElementById('soundEffectsVolumeValue');
        
        if (soundEffectsSlider && soundEffectsVolumeValue) {
            // Set slider to saved volume
            soundEffectsSlider.value = Math.round(savedVolume * 100);
            soundEffectsVolumeValue.textContent = Math.round(savedVolume * 100) + '%';
            
            soundEffectsSlider.addEventListener('input', function() {
                const volume = this.value / 100;
                window.SoundEffectsManager.setVolume(volume);
                soundEffectsVolumeValue.textContent = this.value + '%';
            });
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundEffectsManager;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.SoundEffectsManager = new SoundEffectsManager();
}
