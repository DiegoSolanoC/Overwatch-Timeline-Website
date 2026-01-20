/**
 * MusicManager - Manages music panel functionality
 * Handles music playback, shuffle, volume, progress bar, and state persistence
 */

// Use window.logAssetLoad if available (defined in script.js)
const getLogAssetLoad = () => {
    return (typeof window !== 'undefined' && typeof window.logAssetLoad === 'function') 
        ? window.logAssetLoad 
        : (() => {});
};

class MusicManager {
    constructor() {
        this.initialized = false;
        this.currentSong = null;
        this.musicFiles = [];
        this.isShuffling = false;
        this.shuffleQueue = [];
        this.currentSongIndex = 0;
        this.isDragging = false;
        this.isSeeking = false;
        this.currentTargetVolume = 0.1; // Default 10%
        this.fadeInInterval = null;
        this.fadeOutInterval = null;
        this.musicStateSaveTimeout = null;
        this.hasStartedPlaying = false;
        
        // DOM elements (will be set in init)
        this.musicButton = null;
        this.musicPanel = null;
        this.musicPanelClose = null;
        this.backgroundMusic = null;
        this.volumeSlider = null;
        this.volumeValue = null;
        this.muteBtn = null;
        this.pauseBtn = null;
        this.skipBtn = null;
        this.musicGrid = null;
        this.pauseBtnIcon = null;
        this.muteBtnIcon = null;
        this.skipBtnIcon = null;
        this.shuffleBtnIcon = null;
    }
    
    init() {
        // Prevent double initialization
        if (this.initialized) {
            console.log('Music panel already initialized, skipping...');
            return;
        }
        
        const logAssetLoad = getLogAssetLoad();
        
        // Get DOM elements
        this.musicButton = document.getElementById('musicToggle');
        this.musicPanel = document.getElementById('musicPanel');
        this.musicPanelClose = document.getElementById('musicPanelClose');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.muteBtn = document.getElementById('muteBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.skipBtn = document.getElementById('skipBtn');
        this.musicGrid = document.getElementById('musicGrid');
        
        if (!this.musicButton || !this.musicPanel || !this.backgroundMusic || !this.musicGrid) return;
        
        // Mark as initialized
        this.initialized = true;
        
        // PRIORITY: Load saved music state FIRST to get current song and volume
        const savedState = localStorage.getItem('musicState');
        let prioritySong = null;
        let initialVolume = 0.1; // Default 10%
        
        if (savedState) {
            try {
                const musicState = JSON.parse(savedState);
                if (musicState.currentSong) {
                    prioritySong = musicState.currentSong;
                    logAssetLoad('MUSIC_PRIORITY', `Priority loading: ${prioritySong}`);
                }
                // Only use saved volume if it's not 0 (to avoid starting at 0%)
                if (musicState.volume !== undefined && musicState.volume > 0) {
                    initialVolume = musicState.volume;
                }
            } catch (e) {
                // Use defaults if parse fails
            }
        }
        
        // Make prioritySong accessible to loadMusicFiles
        window.prioritySong = prioritySong;
        
        this.currentTargetVolume = initialVolume;
        this.backgroundMusic.volume = initialVolume;
        if (this.volumeSlider) this.volumeSlider.value = Math.round(initialVolume * 100);
        if (this.volumeValue) this.volumeValue.textContent = Math.round(initialVolume * 100) + '%';
        
        // Fade in/out variables
        const fadeDuration = 2000; // 2 seconds fade
        const fadeSteps = 20;
        const fadeStepTime = fadeDuration / fadeSteps;
        
        // Fade in function
        const fadeIn = () => {
            if (this.fadeInInterval) clearInterval(this.fadeInInterval);
            if (this.fadeOutInterval) clearInterval(this.fadeOutInterval);
            
            this.backgroundMusic.volume = 0;
            let currentStep = 0;
            const targetVolume = this.backgroundMusic.muted ? 0 : this.currentTargetVolume;
            
            this.fadeInInterval = setInterval(() => {
                if (this.backgroundMusic.muted) {
                    clearInterval(this.fadeInInterval);
                    this.fadeInInterval = null;
                    return;
                }
                
                currentStep++;
                const progress = currentStep / fadeSteps;
                this.backgroundMusic.volume = targetVolume * progress;
                
                if (currentStep >= fadeSteps) {
                    clearInterval(this.fadeInInterval);
                    this.fadeInInterval = null;
                    this.backgroundMusic.volume = targetVolume;
                }
            }, fadeStepTime);
        };
        
        // Fade out function
        const fadeOut = () => {
            if (this.fadeOutInterval) return;
            if (this.fadeInInterval) clearInterval(this.fadeInInterval);
            
            // Don't fade out if user is seeking
            if (this.isSeeking || this.isDragging) return;
            
            const startVolume = this.backgroundMusic.volume;
            let currentStep = 0;
            
            this.fadeOutInterval = setInterval(() => {
                // Check again during fade - user might start seeking
                if (this.isSeeking || this.isDragging) {
                    clearInterval(this.fadeOutInterval);
                    this.fadeOutInterval = null;
                    // Restore volume if fade was interrupted
                    this.backgroundMusic.volume = startVolume;
                    return;
                }
                
                currentStep++;
                const progress = currentStep / fadeSteps;
                this.backgroundMusic.volume = startVolume * (1 - progress);
                
                if (currentStep >= fadeSteps) {
                    clearInterval(this.fadeOutInterval);
                    this.fadeOutInterval = null;
                    this.backgroundMusic.volume = 0;
                    
                    // Only reset currentTime if we're looping (not shuffling) and not seeking
                    if (!this.isShuffling && this.backgroundMusic.loop && !this.isSeeking && !this.isDragging) {
                        this.backgroundMusic.currentTime = 0;
                        setTimeout(() => {
                            if (!this.backgroundMusic.paused && !this.isSeeking && !this.isDragging) {
                                fadeIn();
                            }
                        }, 50);
                    }
                }
            }, fadeStepTime);
        };
        
        // Check when music is about to end and fade out
        this.backgroundMusic.addEventListener('timeupdate', () => {
            // Don't trigger fade out if user is seeking or dragging
            if (this.isSeeking || this.isDragging) return;
            
            const timeRemaining = this.backgroundMusic.duration - this.backgroundMusic.currentTime;
            if (timeRemaining <= (fadeDuration / 1000) && timeRemaining > 0.1 && !this.fadeOutInterval) {
                fadeOut();
            }
        });
        
        // Play music function
        // Helper function to encode music file paths (handles special characters)
        const encodeMusicPath = (path) => {
            if (!path) return path;
            // Split path to encode only the filename, not the folder
            const parts = path.split('/');
            if (parts.length === 2) {
                const folder = parts[0];
                const filename = parts[1];
                return `${folder}/${encodeURIComponent(filename)}`;
            }
            return path; // Return as-is if format is unexpected
        };

        const playMusic = (songPath = null) => {
            if (songPath) {
                // Set loop based on shuffle state
                this.backgroundMusic.loop = !this.isShuffling;
                
                // Reset progress bar when loading new song
                const progressBar = document.getElementById('musicProgressBar');
                if (progressBar) {
                    progressBar.value = 0;
                }
                
                // Encode the path to handle special characters
                const encodedPath = encodeMusicPath(songPath);
                this.backgroundMusic.src = encodedPath;
                this.currentSong = songPath; // Keep original for comparison
                this.updateNowPlaying();
                
                // Update selected button - try multiple path formats for matching
                document.querySelectorAll('.music-grid-btn').forEach(btn => {
                    btn.classList.remove('selected');
                    const btnPath = btn.dataset.songPath;
                    // Match exact path, or with spaces encoded, or with different encodings
                    if (btnPath === songPath || 
                        btnPath === songPath.replace(/ /g, '%20') ||
                        btnPath.replace(/ /g, '%20') === songPath ||
                        decodeURIComponent(btnPath) === decodeURIComponent(songPath)) {
                        btn.classList.add('selected');
                    }
                });
                
                // Force load metadata
                this.backgroundMusic.load();
                
                // Handler for when metadata is loaded (multiple events for compatibility)
                const handleMetadataLoaded = (eventType) => {
                    const duration = this.backgroundMusic.duration;
                    const readyState = this.backgroundMusic.readyState;
                    const songName = songPath.split('/').pop();
                    
                    console.log(`[DEBUG] ${eventType} event for ${songName}:`, {
                        duration: duration,
                        readyState: readyState,
                        isValid: duration && !isNaN(duration) && isFinite(duration) && duration > 0
                    });
                    
                    // Check if duration is valid
                    if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                        console.log(`[DEBUG] Valid metadata loaded for ${songName}, duration: ${duration}s`);
                        // Update progress bar with correct duration
                        this.updateProgressBar();
                        
                        // Reset progress bar to start
                        if (progressBar) {
                            progressBar.value = 0;
                        }
                        
                        // Remove all listeners once we have valid metadata
                        this.backgroundMusic.removeEventListener('loadedmetadata', handleMetadataLoaded);
                        this.backgroundMusic.removeEventListener('canplay', handleMetadataLoaded);
                        this.backgroundMusic.removeEventListener('loadeddata', handleMetadataLoaded);
                        this.backgroundMusic.removeEventListener('canplaythrough', handleMetadataLoaded);
                    }
                };
                
                // Listen for multiple events to catch metadata loading (some files trigger different events)
                this.backgroundMusic.addEventListener('loadedmetadata', () => handleMetadataLoaded('loadedmetadata'));
                this.backgroundMusic.addEventListener('canplay', () => handleMetadataLoaded('canplay'));
                this.backgroundMusic.addEventListener('loadeddata', () => handleMetadataLoaded('loadeddata'));
                this.backgroundMusic.addEventListener('canplaythrough', () => handleMetadataLoaded('canplaythrough'));
                
                // Fallback: Check periodically if metadata loaded (in case events don't fire)
                let metadataCheckCount = 0;
                const maxMetadataChecks = 100; // Check for up to 10 seconds (100 * 100ms)
                const metadataCheckInterval = setInterval(() => {
                    metadataCheckCount++;
                    const duration = this.backgroundMusic.duration;
                    const readyState = this.backgroundMusic.readyState;
                    
                    if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                        const songName = songPath.split('/').pop();
                        console.log(`[DEBUG] Metadata loaded via polling for ${songName} after ${metadataCheckCount * 100}ms:`, {
                            duration: duration,
                            readyState: readyState
                        });
                        this.updateProgressBar();
                        if (progressBar) {
                            progressBar.value = 0;
                        }
                        clearInterval(metadataCheckInterval);
                    } else if (metadataCheckCount >= maxMetadataChecks) {
                        // Give up after max checks
                        clearInterval(metadataCheckInterval);
                        const songName = songPath.split('/').pop();
                        console.warn(`[DEBUG] Metadata not loaded for ${songName} after ${maxMetadataChecks * 100}ms:`, {
                            duration: this.backgroundMusic.duration,
                            readyState: this.backgroundMusic.readyState,
                            networkState: this.backgroundMusic.networkState,
                            src: this.backgroundMusic.src
                        });
                    }
                }, 100);
            }
            
            // Compare with encoded path for checking if same song
            const encodedPath = encodeMusicPath(songPath);
            if (!this.backgroundMusic.paused && this.backgroundMusic.src.endsWith(encodedPath.split('/').pop())) return;
            
            this.backgroundMusic.volume = 0;
            const playPromise = this.backgroundMusic.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    fadeIn();
                    this.updateProgressBar();
                }).catch(error => {
                    console.log('Autoplay prevented:', error);
                });
            } else {
                fadeIn();
                this.updateProgressBar();
            }
        };
        
        // Shuffle function
        const shuffleArray = (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };
        
        // Play next song (for shuffle)
        const playNextSong = () => {
            if (this.isShuffling && this.shuffleQueue.length > 0) {
                // Play next in shuffle queue
                this.currentSongIndex = (this.currentSongIndex + 1) % this.shuffleQueue.length;
                playMusic(`assets/audio/music/${this.shuffleQueue[this.currentSongIndex].filename}`);
            } else {
                // If not shuffling, play default music (Winston's Desk)
                if (this.musicFiles.length === 0) return;
                const winstonsDesk = this.musicFiles.find(s => s.name.toLowerCase().includes('winston') || s.name.toLowerCase().includes('desk'));
                if (winstonsDesk) {
                    playMusic(`assets/audio/music/${winstonsDesk.filename}`);
                } else {
                    // Fallback to first song
                    playMusic(`assets/audio/music/${this.musicFiles[0].filename}`);
                }
            }
        };
        
        // Make encodeMusicPath available globally for comparisons
        window.encodeMusicPath = encodeMusicPath;
        
        // Handle song end (for shuffle)
        this.backgroundMusic.addEventListener('ended', () => {
            if (this.isShuffling && this.shuffleQueue.length > 0) {
                playNextSong();
            } else if (!this.isShuffling) {
                // Loop current song
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play();
            }
        });
        
        // Get icon elements
        this.pauseBtnIcon = document.getElementById('pauseBtnIcon');
        this.muteBtnIcon = document.getElementById('muteBtnIcon');
        this.skipBtnIcon = document.getElementById('skipBtnIcon');
        this.shuffleBtnIcon = document.getElementById('shuffleBtnIcon');
        
        // Function to update pause/play icon
        const updatePauseIcon = (isPaused) => {
            if (this.pauseBtnIcon) {
                this.pauseBtnIcon.src = isPaused ? 'assets/images/icons/Play Icon.png' : 'assets/images/icons/Pause Icon.png';
                this.pauseBtnIcon.alt = isPaused ? 'Play' : 'Pause';
            }
        };
        
        // Function to update mute/unmute icon
        const updateMuteIcon = (isMuted) => {
            if (this.muteBtnIcon) {
                this.muteBtnIcon.src = isMuted ? 'assets/images/icons/Muted Icon.png' : 'assets/images/icons/Unmuted Icon.png';
                this.muteBtnIcon.alt = isMuted ? 'Unmute' : 'Mute';
            }
        };
        
        // Shuffle button
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                this.isShuffling = !this.isShuffling;
                
                if (this.isShuffling) {
                    // Create shuffle queue
                    this.shuffleQueue = shuffleArray(this.musicFiles);
                    this.currentSongIndex = this.shuffleQueue.findIndex(s => this.currentSong && this.currentSong.endsWith(`/${s.filename}`));
                    if (this.currentSongIndex === -1) this.currentSongIndex = 0;
                    shuffleBtn.classList.add('active');
                    // Update icon to show shuffle is on
                    if (this.shuffleBtnIcon) {
                        this.shuffleBtnIcon.src = 'assets/images/icons/Shuffle Icon.png';
                    }
                } else {
                    this.shuffleQueue = [];
                    shuffleBtn.classList.remove('active');
                    if (this.shuffleBtnIcon) {
                        this.shuffleBtnIcon.src = 'assets/images/icons/Shuffle Icon.png';
                    }
                }
                this.saveMusicState();
            });
        }
        
        // Update pause button state when music plays/pauses
        this.backgroundMusic.addEventListener('play', () => {
            if (this.pauseBtn) {
                this.pauseBtn.classList.remove('active');
                updatePauseIcon(false);
            }
        });
        
        this.backgroundMusic.addEventListener('pause', () => {
            if (this.pauseBtn) {
                this.pauseBtn.classList.add('active');
                updatePauseIcon(true);
            }
        });
        
        // Get current song name
        const getCurrentSongName = () => {
            if (!this.currentSong) return 'No song playing';
            const song = this.musicFiles.find(s => this.currentSong && this.currentSong.endsWith(`/${s.filename}`));
            return song ? song.name : 'Unknown';
        };
        
        // Update now playing display
        this.updateNowPlaying = () => {
            const nowPlayingEl = document.getElementById('musicNowPlaying');
            const currentSongEl = document.getElementById('musicCurrentSong');
            if (currentSongEl) {
                currentSongEl.textContent = getCurrentSongName();
            }
        };
        
        // Update progress bar
        this.updateProgressBar = () => {
            const progressBar = document.getElementById('musicProgressBar');
            const currentTimeEl = document.getElementById('musicCurrentTime');
            const totalTimeEl = document.getElementById('musicTotalTime');
            
            // Check for valid duration (not NaN, not Infinity, and greater than 0)
            if (!this.backgroundMusic || !this.backgroundMusic.duration || isNaN(this.backgroundMusic.duration) || !isFinite(this.backgroundMusic.duration) || this.backgroundMusic.duration <= 0) {
                // Still update current time display even if duration isn't ready
                if (currentTimeEl && this.backgroundMusic && !isNaN(this.backgroundMusic.currentTime)) {
                    currentTimeEl.textContent = this.formatTime(this.backgroundMusic.currentTime);
                }
                if (totalTimeEl) {
                    totalTimeEl.textContent = '0:00';
                }
                // Debug logging
                if (this.backgroundMusic && this.backgroundMusic.src) {
                    const songName = this.backgroundMusic.src.split('/').pop();
                    console.log(`[DEBUG] Duration not ready for ${songName}:`, {
                        duration: this.backgroundMusic.duration,
                        readyState: this.backgroundMusic.readyState,
                        networkState: this.backgroundMusic.networkState,
                        paused: this.backgroundMusic.paused
                    });
                }
                return;
            }
            
            const current = this.backgroundMusic.currentTime;
            const total = this.backgroundMusic.duration;
            const percent = (current / total) * 100;
            
            // Only update progress bar if not currently seeking/dragging
            if (progressBar && !this.isSeeking && !this.isDragging) {
                progressBar.value = percent;
            }
            
            if (currentTimeEl) {
                currentTimeEl.textContent = this.formatTime(current);
            }
            
            if (totalTimeEl) {
                totalTimeEl.textContent = this.formatTime(total);
            }
        };
        
        // Format time as MM:SS
        this.formatTime = (seconds) => {
            if (isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        // Progress bar interaction
        const progressBar = document.getElementById('musicProgressBar');
        
        if (progressBar) {
            // Set seeking flag on any interaction
            progressBar.addEventListener('mousedown', () => {
                this.isSeeking = true;
                this.isDragging = true;
            });
            
            progressBar.addEventListener('click', (e) => {
                // Handle direct clicks on the slider - re-check duration validity
                if (this.backgroundMusic) {
                    const duration = this.backgroundMusic.duration;
                    const readyState = this.backgroundMusic.readyState;
                    const songName = this.backgroundMusic.src ? this.backgroundMusic.src.split('/').pop() : 'unknown';
                    
                    if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                        const rect = progressBar.getBoundingClientRect();
                        const percent = ((e.clientX - rect.left) / rect.width) * 100;
                        const newTime = (Math.max(0, Math.min(100, percent)) / 100) * duration;
                        this.backgroundMusic.currentTime = newTime;
                        this.updateProgressBar();
                        console.log(`[DEBUG] Successfully clicked to seek ${songName} to ${newTime.toFixed(2)}s`);
                    } else {
                        console.warn(`[DEBUG] Cannot seek ${songName} on click - duration invalid:`, {
                            duration: duration,
                            readyState: readyState,
                            networkState: this.backgroundMusic.networkState
                        });
                    }
                }
            });
            
            progressBar.addEventListener('mouseup', () => {
                this.isSeeking = false;
                this.isDragging = false;
            });
            
            progressBar.addEventListener('mouseleave', () => {
                // Reset if mouse leaves while dragging
                if (this.isDragging) {
                    this.isSeeking = false;
                    this.isDragging = false;
                }
            });
            
            progressBar.addEventListener('input', (function(manager) {
                return function() {
                    // Re-check duration validity at the time of seeking (in case it loaded after initial check)
                    if (manager.backgroundMusic) {
                        const duration = manager.backgroundMusic.duration;
                        const readyState = manager.backgroundMusic.readyState;
                        
                        // Debug logging
                        if (manager.isSeeking || manager.isDragging) {
                            const songName = manager.backgroundMusic.src ? manager.backgroundMusic.src.split('/').pop() : 'unknown';
                            console.log(`[DEBUG] Seeking ${songName}:`, {
                                duration: duration,
                                readyState: readyState,
                                isValid: duration && !isNaN(duration) && isFinite(duration) && duration > 0,
                                value: this.value
                            });
                        }
                        
                        // Try to get duration, even if it wasn't available before
                        if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                            const percent = this.value;
                            const newTime = (percent / 100) * duration;
                            // Only update if we're actually seeking (not just hovering)
                            if (manager.isSeeking || manager.isDragging) {
                                manager.backgroundMusic.currentTime = newTime;
                                // Update display immediately
                                manager.updateProgressBar();
                            }
                        } else if (manager.isSeeking || manager.isDragging) {
                            // Debug: log why seeking failed
                            const songName = manager.backgroundMusic.src ? manager.backgroundMusic.src.split('/').pop() : 'unknown';
                            console.warn(`[DEBUG] Cannot seek ${songName} - duration invalid:`, {
                                duration: duration,
                                readyState: readyState,
                                networkState: manager.backgroundMusic.networkState
                            });
                        }
                    }
                };
            })(this));
            
            progressBar.addEventListener('change', (function(manager) {
                return function() {
                    // Final update when user releases - re-check duration validity
                    if (manager.backgroundMusic) {
                        const duration = manager.backgroundMusic.duration;
                        const readyState = manager.backgroundMusic.readyState;
                        
                        if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                            const percent = this.value;
                            const newTime = (percent / 100) * duration;
                            manager.backgroundMusic.currentTime = newTime;
                            manager.updateProgressBar();
                            const songName = manager.backgroundMusic.src ? manager.backgroundMusic.src.split('/').pop() : 'unknown';
                            console.log(`[DEBUG] Successfully seeked ${songName} to ${newTime.toFixed(2)}s`);
                        } else {
                            const songName = manager.backgroundMusic.src ? manager.backgroundMusic.src.split('/').pop() : 'unknown';
                            console.warn(`[DEBUG] Cannot seek ${songName} on change - duration invalid:`, {
                                duration: duration,
                                readyState: readyState,
                                networkState: manager.backgroundMusic.networkState
                            });
                        }
                    }
                    manager.isSeeking = false;
                    manager.isDragging = false;
                };
            })(this));
            
            // Also handle touch events for mobile
            progressBar.addEventListener('touchstart', () => {
                this.isSeeking = true;
                this.isDragging = true;
            });
            
            progressBar.addEventListener('touchend', () => {
                this.isSeeking = false;
                this.isDragging = false;
            });
        }
        
        // Update progress on timeupdate
        this.backgroundMusic.addEventListener('timeupdate', () => {
            // Don't update progress bar if user is seeking/dragging
            if (!this.isDragging && !this.isSeeking) {
                this.updateProgressBar();
            }
            // Throttle timeupdate saves to avoid too many writes
            if (!this.musicStateSaveTimeout) {
                this.musicStateSaveTimeout = setTimeout(() => {
                    this.saveMusicState();
                    this.musicStateSaveTimeout = null;
                }, 1000); // Save every second
            }
        });
        
        // Save state before page unload
        window.addEventListener('beforeunload', () => {
            if (window.saveMusicState) {
                window.saveMusicState();
            }
        });
        
        // Prevent fadeOut from interfering with seeking
        // Reset seeking flags when user finishes interacting
        if (progressBar) {
            progressBar.addEventListener('mouseleave', () => {
                // Small delay to ensure seeking is complete
                setTimeout(() => {
                    if (!this.isDragging) {
                        this.isSeeking = false;
                    }
                }, 100);
            });
        }
        
        // Save music state to localStorage
        this.saveMusicState = () => {
            if (!this.backgroundMusic) return;
            const musicState = {
                currentSong: this.currentSong,
                currentTime: this.backgroundMusic.currentTime,
                paused: this.backgroundMusic.paused,
                volume: this.backgroundMusic.volume,
                muted: this.backgroundMusic.muted,
                isShuffling: this.isShuffling,
                currentSongIndex: this.currentSongIndex,
                shuffleQueue: this.isShuffling ? this.shuffleQueue.map(s => s.filename) : null
            };
            localStorage.setItem('musicState', JSON.stringify(musicState));
        };
        
        // Make saveMusicState globally accessible for beforeunload
        window.saveMusicState = this.saveMusicState;
        
        // Restore music state from localStorage
        const restoreMusicState = () => {
            const savedState = localStorage.getItem('musicState');
            if (!savedState) return false;
            
            try {
                const musicState = JSON.parse(savedState);
                
                // Restore shuffle state first
                if (musicState.isShuffling && musicState.shuffleQueue && this.musicFiles.length > 0) {
                    this.isShuffling = true;
                    this.shuffleQueue = this.musicFiles.filter(s => musicState.shuffleQueue.includes(s.filename));
                    this.currentSongIndex = musicState.currentSongIndex || 0;
                    const shuffleBtn = document.getElementById('shuffleBtn');
                    if (shuffleBtn) {
                        shuffleBtn.classList.add('active');
                    }
                }
                
                // Restore volume and muted state
                if (musicState.volume !== undefined) {
                    this.backgroundMusic.volume = musicState.volume;
                    this.currentTargetVolume = musicState.volume;
                    if (this.volumeSlider) this.volumeSlider.value = Math.round(musicState.volume * 100);
                    if (this.volumeValue) this.volumeValue.textContent = Math.round(musicState.volume * 100) + '%';
                }
                
                if (musicState.muted !== undefined) {
                    this.backgroundMusic.muted = musicState.muted;
                    updateMuteIcon(musicState.muted);
                    if (this.muteBtn) {
                        if (musicState.muted) {
                            this.muteBtn.classList.add('active');
                        } else {
                            this.muteBtn.classList.remove('active');
                        }
                    }
                }
                
                // Restore song if it exists
                if (musicState.currentSong && this.musicFiles.length > 0) {
                    // Find the song in the music files
                    const songToRestore = this.musicFiles.find(s => {
                        // Match by filename regardless of base path/encoding
                        const statePath = musicState.currentSong || '';
                        return statePath.endsWith(`/${s.filename}`) || decodeURIComponent(statePath).endsWith(`/${s.filename}`);
                    });
                    
                    if (songToRestore) {
                        this.currentSong = `assets/audio/music/${songToRestore.filename}`;
                        
                        // Set the source and load
                        const encodedPath = encodeMusicPath(this.currentSong);
                        this.backgroundMusic.src = encodedPath;
                        this.backgroundMusic.loop = !this.isShuffling;
                        this.backgroundMusic.load();
                        
                        // Update UI
                        this.updateNowPlaying();
                        // Update selected button - try multiple path formats for matching
                        document.querySelectorAll('.music-grid-btn').forEach(btn => {
                            btn.classList.remove('selected');
                            const btnPath = btn.dataset.songPath;
                            // Match exact path, or with spaces encoded, or with different encodings
                            if (btnPath === this.currentSong || 
                                btnPath === this.currentSong.replace(/ /g, '%20') ||
                                btnPath.replace(/ /g, '%20') === this.currentSong ||
                                decodeURIComponent(btnPath) === decodeURIComponent(this.currentSong)) {
                                btn.classList.add('selected');
                            }
                        });
                        
                        // Restore position and play state after metadata loads
                        const restorePosition = () => {
                            if (this.backgroundMusic.readyState >= 2) { // HAVE_CURRENT_DATA
                                // Restore position first
                                if (musicState.currentTime !== undefined && musicState.currentTime > 0) {
                                    this.backgroundMusic.currentTime = musicState.currentTime;
                                }
                                
                                // Restore play/pause state - IMPORTANT: Explicitly pause if it was paused
                                if (musicState.paused) {
                                    // Make absolutely sure it's paused
                                    this.backgroundMusic.pause();
                                    updatePauseIcon(true);
                                    if (this.pauseBtn) this.pauseBtn.classList.add('active');
                                } else {
                                    // Only play if it was NOT paused - use a small delay to prevent staggering
                                    setTimeout(() => {
                                        const playPromise = this.backgroundMusic.play();
                                        if (playPromise !== undefined) {
                                            playPromise.then(() => {
                                                updatePauseIcon(false);
                                                if (this.pauseBtn) this.pauseBtn.classList.remove('active');
                                            }).catch(error => {
                                                console.log('Autoplay prevented on restore:', error);
                                                // If autoplay prevented, keep it paused
                                                this.backgroundMusic.pause();
                                                updatePauseIcon(true);
                                                if (this.pauseBtn) this.pauseBtn.classList.add('active');
                                            });
                                        }
                                    }, 100); // Small delay to prevent staggering on refresh
                                }
                                
                                this.backgroundMusic.removeEventListener('loadedmetadata', restorePosition);
                                this.backgroundMusic.removeEventListener('canplay', restorePosition);
                            }
                        };
                        
                        this.backgroundMusic.addEventListener('loadedmetadata', restorePosition);
                        this.backgroundMusic.addEventListener('canplay', restorePosition);
                        
                        // Fallback: try after a delay
                        setTimeout(() => {
                            if (this.backgroundMusic.readyState >= 2) {
                                if (musicState.currentTime !== undefined && musicState.currentTime > 0) {
                                    this.backgroundMusic.currentTime = musicState.currentTime;
                                }
                                // IMPORTANT: Only play if NOT paused, and explicitly pause if it was paused
                                if (musicState.paused) {
                                    // Make sure it's paused
                                    this.backgroundMusic.pause();
                                    updatePauseIcon(true);
                                    if (this.pauseBtn) this.pauseBtn.classList.add('active');
                                } else {
                                    this.backgroundMusic.play().catch(() => {
                                        console.log('Autoplay prevented on restore (fallback)');
                                    });
                                }
                            }
                        }, 1000);
                        
                        return true;
                    }
                }
                
                return false;
            } catch (e) {
                console.error('Error restoring music state:', e);
                return false;
            }
        };
        
        // Load music files from manifest
        const loadMusicFiles = async () => {
            try {
                logAssetLoad('MUSIC', 'Loading manifest.json (PRIORITY)');
                // Add cache busting to ensure we get the latest manifest
                // Use both timestamp and random number for better cache busting
                const cacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const response = await fetch(`manifest.json?v=${cacheBuster}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                const manifest = await response.json();
                logAssetLoad('MUSIC', `manifest.json loaded (${manifest.music ? manifest.music.length : 0} music files)`);
                
                if (manifest.music && manifest.music.length > 0) {
                    this.musicFiles = manifest.music;
                    console.log(`Loaded ${this.musicFiles.length} music files from manifest:`, this.musicFiles.map(s => s.name));
                    
                    // PRIORITY: Preload current song FIRST if we have one
                    const currentPrioritySong = window.prioritySong || null;
                    if (currentPrioritySong) {
                        const prioritySongFile = this.musicFiles.find(s => {
                            const songPath = `assets/audio/music/${s.filename}`;
                            return songPath === currentPrioritySong || songPath.replace(/ /g, '%20') === currentPrioritySong;
                        });
                        if (prioritySongFile) {
                            logAssetLoad('MUSIC_PRIORITY', `Preloading current song: ${prioritySongFile.filename}`);
                            const encodedPath = encodeMusicPath(`assets/audio/music/${prioritySongFile.filename}`);
                            const priorityAudio = new Audio(encodedPath);
                            priorityAudio.preload = 'auto';
                            priorityAudio.load();
                        }
                    }
                    
                    // Log each music file
                    this.musicFiles.forEach(song => {
                        logAssetLoad('MUSIC_FILE', `${song.filename} (${song.name})`);
                    });
                    
                    this.createMusicButtons();
                    
                    // Preload all music files for faster switching (after priority song)
                    this.musicFiles.forEach(song => {
                        // Encode filename to handle special characters
                        const encodedFilename = encodeURIComponent(song.filename);
                        const audio = new Audio(`assets/audio/music/${encodedFilename}`);
                        audio.preload = 'auto';
                        // Also preload the icon images
                        const iconName = song.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                        const iconImg = new Image();
                        const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        // Encode the path properly for URLs (handles spaces and special characters)
                        const encodedIconName = encodeURIComponent(iconName);
                        iconImg.src = `assets/images/music/${encodedIconName}.png?v=${imageCacheBuster}`;
                    });
                    
                    // PRIORITY: Restore saved state immediately (this will load and restore the current song)
                    const restored = restoreMusicState();
                    if (!restored && !this.currentSong && this.musicFiles.length > 0) {
                        // Only play first song if no saved state exists
                        const firstSong = `assets/audio/music/${this.musicFiles[0].filename}`;
                        playMusic(firstSong);
                        this.updateNowPlaying();
                    } else if (restored) {
                        logAssetLoad('MUSIC_PRIORITY', 'Music state restored successfully');
                    }
                } else {
                    console.warn('No music files found in manifest.json');
                    console.log('To add music files:');
                    console.log('1. Add .mp3, .wav, or .ogg files to the Music folder');
                    console.log('2. Add matching .png images to the assets/images/music folder (same name as music file)');
                    console.log('3. Run: node generate-manifest.js');
                    console.log('4. Refresh this page');
                    this.musicGrid.innerHTML = '<div style="color: #ff6600; padding: 20px; text-align: center;">No music files found.<br><br>1. Add files to Music folder<br>2. Add icons to assets/images/music folder<br>3. Run: node generate-manifest.js<br>4. Refresh page</div>';
                }
            } catch (error) {
                console.error('Error loading manifest.json:', error);
                this.musicGrid.innerHTML = '<div style="color: #ff6600; padding: 20px; text-align: center;">Error loading music. Run generate-manifest.js</div>';
            }
        };
        
        // Create music buttons - EXACT COPY of createFilterButtons structure
        this.createMusicButtons = () => {
            this.musicGrid.innerHTML = '';
            
            this.musicFiles.forEach(song => {
                const musicBtn = document.createElement('div');
                musicBtn.className = 'music-grid-btn';
                // Store original path (will be encoded when used)
                musicBtn.dataset.songPath = `assets/audio/music/${song.filename}`;
                musicBtn.dataset.songName = song.name;
                
                // Image container (EXACT COPY of filter-image-container)
                const imageContainer = document.createElement('div');
                imageContainer.className = 'music-icon-container';
                
                const img = document.createElement('img');
                // Use image from assets/images/music folder with same name as music file
                const iconName = song.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                // Add cache busting to ensure latest images load
                const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                // Encode the path properly for URLs (handles spaces and special characters)
                const encodedIconName = encodeURIComponent(iconName);
                img.src = `assets/images/music/${encodedIconName}.png?v=${imageCacheBuster}`;
                img.alt = song.name;
                img.onerror = function() {
                    // If image fails to load, try alternative encodings/cases for GitHub Pages compatibility
                    const originalSrc = this.src;
                    console.warn(`[DEBUG] Image failed to load: ${originalSrc}`);
                    
                    // Try with different encoding (some servers handle spaces differently)
                    const altEncoded = iconName.replace(/\s+/g, '%20');
                    if (this.src !== `assets/images/music/${altEncoded}.png?v=${imageCacheBuster}`) {
                        this.src = `assets/images/music/${altEncoded}.png?v=${imageCacheBuster}`;
                        return; // Let it try again with this encoding
                    }
                    
                    // If still fails, hide the button or show placeholder
                    this.style.display = 'none';
                    console.error(`[DEBUG] Image failed to load after retry: ${iconName}`);
                };
                
                imageContainer.appendChild(img);
                
                // Label (EXACT COPY of filter-label)
                const label = document.createElement('div');
                label.className = 'music-label';
                label.textContent = song.name;
                
                musicBtn.appendChild(imageContainer);
                musicBtn.appendChild(label);
                
                // Check if this is the current song - try multiple path formats for matching
                const songPath = `assets/audio/music/${song.filename}`;
                if (this.currentSong === songPath || 
                    this.currentSong === songPath.replace(/ /g, '%20') ||
                    this.currentSong && this.currentSong.replace(/ /g, '%20') === songPath ||
                    (this.currentSong && decodeURIComponent(this.currentSong) === decodeURIComponent(songPath))) {
                    musicBtn.classList.add('selected');
                }
                
                // Click handler
                musicBtn.addEventListener('click', () => {
                    const songPath = musicBtn.dataset.songPath;
                    
                    // Remove selected from all buttons
                    document.querySelectorAll('.music-grid-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    
                    // Add selected to clicked button
                    musicBtn.classList.add('selected');
                    
                    // Play the song
                    playMusic(songPath);
                    this.updateNowPlaying();
                    this.saveMusicState();
                });
                
                this.musicGrid.appendChild(musicBtn);
            });
        };
        
        // Preload audio
        this.backgroundMusic.load();
        
        // Try to play immediately (will be set when music loads)
        const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown', 'wheel'];
        const playOnInteraction = () => {
            if (!this.hasStartedPlaying && this.backgroundMusic.paused && this.currentSong) {
                playMusic();
                this.hasStartedPlaying = true;
                interactionEvents.forEach(eventType => {
                    document.removeEventListener(eventType, playOnInteraction);
                });
            }
        };
        
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, playOnInteraction, { passive: true, once: false });
        });
        
        this.backgroundMusic.addEventListener('playing', () => {
            this.hasStartedPlaying = true;
            interactionEvents.forEach(eventType => {
                document.removeEventListener(eventType, playOnInteraction);
            });
        });
        
        // Open/close music panel
        if (this.musicButton) {
            // Handle button click/touch - unified handler
            const handleMusicToggle = (event) => {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                
                // Play music button sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('music');
                }
                
                // Close filters panel if open
                const filtersPanel = document.getElementById('filtersPanel');
                const filtersButton = document.getElementById('filtersToggle');
                if (filtersPanel && filtersPanel.classList.contains('open')) {
                    filtersPanel.classList.remove('open');
                    if (filtersButton) {
                        filtersButton.classList.remove('active');
                    }
                }
                
                // Close event management panel if open
                const eventsManagePanel = document.getElementById('eventsManagePanel');
                const eventsManageToggle = document.getElementById('eventsManageToggle');
                if (eventsManagePanel && eventsManagePanel.classList.contains('open')) {
                    eventsManagePanel.classList.remove('open');
                    if (eventsManageToggle) {
                        eventsManageToggle.classList.remove('active');
                    }
                }
                
                // Toggle music panel
                this.musicPanel.classList.toggle('open');
                if (this.musicPanel.classList.contains('open')) {
                    this.musicButton.classList.add('active');
                } else {
                    this.musicButton.classList.remove('active');
                }
            };
            
            // Prevent button from interfering with globe controls (mouse)
            this.musicButton.addEventListener('mousedown', (event) => {
                event.stopPropagation();
            });
            
            this.musicButton.addEventListener('mouseup', (event) => {
                event.stopPropagation();
            });
            
            // Handle touch events for mobile
            let touchStartTime = 0;
            this.musicButton.addEventListener('touchstart', (event) => {
                event.stopPropagation();
                touchStartTime = Date.now();
            });
            
            this.musicButton.addEventListener('touchend', (event) => {
                event.stopPropagation();
                event.preventDefault();
                // Only trigger if it was a quick tap (not a drag)
                if (Date.now() - touchStartTime < 300) {
                    handleMusicToggle(event);
                }
            });
            
            // Handle click events (desktop and fallback)
            this.musicButton.addEventListener('click', handleMusicToggle);
        }
        
        // Close music panel
        if (this.musicPanelClose) {
            this.musicPanelClose.addEventListener('click', () => {
                // Play music button sound when closing panel
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('music');
                }
                this.musicPanel.classList.remove('open');
                if (this.musicButton) {
                    this.musicButton.classList.remove('active');
                }
            });
        }
        
        // Volume slider
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (function(manager) {
                return function() {
                    const volume = this.value / 100;
                    manager.currentTargetVolume = volume;
                    
                    if (!manager.backgroundMusic.muted && !manager.fadeInInterval && !manager.fadeOutInterval) {
                        manager.backgroundMusic.volume = volume;
                    }
                    
                    if (manager.volumeValue) {
                        manager.volumeValue.textContent = Math.round(volume * 100) + '%';
                    }
                    manager.saveMusicState();
                    
                    if (volume === 0 && manager.muteBtn) {
                        manager.muteBtn.classList.add('active');
                        updateMuteIcon(true);
                    } else if (manager.muteBtn) {
                        if (!manager.backgroundMusic.muted) {
                            manager.muteBtn.classList.remove('active');
                            updateMuteIcon(false);
                        }
                    }
                };
            })(this));
        }
        
        // Mute button
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => {
                if (this.backgroundMusic.muted) {
                    this.backgroundMusic.muted = false;
                    this.muteBtn.classList.remove('active');
                    updateMuteIcon(false);
                    if (!this.fadeInInterval && !this.fadeOutInterval) {
                        this.backgroundMusic.volume = this.currentTargetVolume;
                    }
                } else {
                    this.backgroundMusic.muted = true;
                    this.muteBtn.classList.add('active');
                    updateMuteIcon(true);
                }
                this.saveMusicState();
            });
        }
        
        // Pause button
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => {
                if (this.backgroundMusic.paused) {
                    this.backgroundMusic.play();
                    this.pauseBtn.classList.remove('active');
                    updatePauseIcon(false);
                } else {
                    this.backgroundMusic.pause();
                    this.pauseBtn.classList.add('active');
                    updatePauseIcon(true);
                }
                this.saveMusicState();
            });
        }
        
        // Skip button
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => {
                playNextSong();
            });
        }
        
        // Initialize icons based on current state
        if (this.backgroundMusic.paused) {
            updatePauseIcon(true);
            if (this.pauseBtn) this.pauseBtn.classList.add('active');
        } else {
            updatePauseIcon(false);
            if (this.pauseBtn) this.pauseBtn.classList.remove('active');
        }
        
        if (this.backgroundMusic.muted) {
            updateMuteIcon(true);
            if (this.muteBtn) this.muteBtn.classList.add('active');
        } else {
            updateMuteIcon(false);
            if (this.muteBtn) this.muteBtn.classList.remove('active');
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (this.musicPanel && this.musicPanel.classList.contains('open')) {
                if (!this.musicPanel.contains(e.target) && 
                    !this.musicButton.contains(e.target) && 
                    e.target !== this.musicButton) {
                    this.musicPanel.classList.remove('open');
                    if (this.musicButton) {
                        this.musicButton.classList.remove('active');
                    }
                }
            }
        });
        
        // Load music files
        loadMusicFiles();
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicManager;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.MusicManager = new MusicManager();
}
