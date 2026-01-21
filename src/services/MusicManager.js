/**
 * MusicManager - Manages music panel functionality
 * Coordinates music playback, shuffle, volume, progress bar, and state persistence
 * Uses extracted services for separation of concerns
 */

// Use window.logAssetLoad if available (defined in script.js)
// Check if getLogAssetLoad already exists to avoid redeclaration
if (typeof getLogAssetLoad === 'undefined') {
    var getLogAssetLoad = () => {
        return (typeof window !== 'undefined' && typeof window.logAssetLoad === 'function') 
            ? window.logAssetLoad 
            : (() => {});
    };
}

class MusicManager {
    constructor() {
        this.initialized = false;
        this.currentSong = null;
        this.musicFiles = [];
        this.hasStartedPlaying = false;
        this.musicStateSaveTimeout = null;
        
        // Services (will be initialized in init)
        this.stateService = null;
        this.shuffleService = null;
        this.volumeService = null;
        this.progressService = null;
        this.playbackService = null;
        this.fileService = null;
        this.panelService = null;
        this.iconService = null;
        this.controlService = null;
        
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
        // Prevent double initialization (but allow re-initialization if elements weren't ready before)
        if (this.initialized && this.musicButton && this.musicPanel) {
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
        
        if (!this.musicButton || !this.musicPanel || !this.backgroundMusic || !this.musicGrid) {
            console.warn('MusicManager: Required DOM elements not found yet. Will retry when elements are available:', {
                musicButton: !!this.musicButton,
                musicPanel: !!this.musicPanel,
                backgroundMusic: !!this.backgroundMusic,
                musicGrid: !!this.musicGrid
            });
            // Don't set initialized = true if elements aren't ready
            return;
        }
        
        // Mark as initialized only after we have all required elements
        this.initialized = true;
        console.log('MusicManager: Initializing with all elements present');
        
        // Initialize services - check if they're available on window
        const missingServices = [];
        if (!window.MusicStateService) missingServices.push('MusicStateService');
        if (!window.MusicShuffleService) missingServices.push('MusicShuffleService');
        if (!window.MusicVolumeService) missingServices.push('MusicVolumeService');
        if (!window.MusicProgressService) missingServices.push('MusicProgressService');
        if (!window.MusicPlaybackService) missingServices.push('MusicPlaybackService');
        if (!window.MusicFileService) missingServices.push('MusicFileService');
        if (!window.MusicPanelService) missingServices.push('MusicPanelService');
        if (!window.MusicIconService) missingServices.push('MusicIconService');
        if (!window.MusicControlService) missingServices.push('MusicControlService');
        
        if (missingServices.length > 0) {
            console.error('MusicManager: One or more required services are not loaded. Make sure all music service scripts are loaded before MusicManager.js');
            console.error('Missing services:', missingServices);
            console.error('Available services:', {
                MusicStateService: !!window.MusicStateService,
                MusicShuffleService: !!window.MusicShuffleService,
                MusicVolumeService: !!window.MusicVolumeService,
                MusicProgressService: !!window.MusicProgressService,
                MusicPlaybackService: !!window.MusicPlaybackService,
                MusicFileService: !!window.MusicFileService,
                MusicPanelService: !!window.MusicPanelService,
                MusicIconService: !!window.MusicIconService,
                MusicControlService: !!window.MusicControlService
            });
            return;
        }
        
        this.stateService = new window.MusicStateService();
        this.shuffleService = new window.MusicShuffleService();
        this.volumeService = new window.MusicVolumeService(this.backgroundMusic);
        this.progressService = new window.MusicProgressService(this.backgroundMusic);
        this.playbackService = new window.MusicPlaybackService(this.backgroundMusic);
        this.fileService = new window.MusicFileService();
        this.panelService = new window.MusicPanelService(this.musicButton, this.musicPanel, this.musicPanelClose);
        this.iconService = new window.MusicIconService();
        this.controlService = new window.MusicControlService(
            this.backgroundMusic,
            this.volumeService,
            this.shuffleService,
            this.iconService,
            () => this.saveMusicState()
        );
        
        // Initialize service DOM references
        this.progressService.init();
        this.iconService.init();
        this.controlService.init();
        
        // PRIORITY: Load saved music state FIRST to get current song and volume
        const savedState = this.stateService.loadState();
        let prioritySong = null;
        let initialVolume = 0.1; // Default 10%
        
        if (savedState) {
            if (savedState.currentSong) {
                prioritySong = savedState.currentSong;
                logAssetLoad('MUSIC_PRIORITY', `Priority loading: ${prioritySong}`);
            }
            // Only use saved volume if it's not 0 (to avoid starting at 0%)
            if (savedState.volume !== undefined && savedState.volume > 0) {
                initialVolume = savedState.volume;
            }
        }
        
        // Make prioritySong accessible to loadMusicFiles
        window.prioritySong = prioritySong;
        
        this.volumeService.setTargetVolume(initialVolume);
        this.backgroundMusic.volume = initialVolume;
        if (this.volumeSlider) this.volumeSlider.value = Math.round(initialVolume * 100);
        if (this.volumeValue) this.volumeValue.textContent = Math.round(initialVolume * 100) + '%';
        
        // Fade in function (delegates to volume service)
        const fadeIn = () => {
            this.volumeService.fadeIn(
                this.progressService.isSeeking,
                this.progressService.isDragging
            );
        };
        
        // Fade out function (delegates to volume service)
        const fadeOut = () => {
            this.volumeService.fadeOut(
                this.progressService.isSeeking,
                this.progressService.isDragging,
                () => {
                    // Only reset currentTime if we're looping (not shuffling) and not seeking
                    if (!this.shuffleService.isShuffling && this.backgroundMusic.loop && 
                        !this.progressService.isInteracting()) {
                        this.backgroundMusic.currentTime = 0;
                        setTimeout(() => {
                            if (!this.backgroundMusic.paused && !this.progressService.isInteracting()) {
                                fadeIn();
                            }
                        }, 50);
                    }
                }
            );
        };
        
        // Check when music is about to end and fade out
        this.backgroundMusic.addEventListener('timeupdate', () => {
            // Don't trigger fade out if user is seeking or dragging
            if (this.progressService.isInteracting()) return;
            
            const fadeDuration = 2000; // 2 seconds
            const timeRemaining = this.backgroundMusic.duration - this.backgroundMusic.currentTime;
            if (timeRemaining <= (fadeDuration / 1000) && timeRemaining > 0.1 && !this.volumeService.isFading()) {
                fadeOut();
            }
        });
        
        // Play music function
        const playMusic = async (songPath = null) => {
            if (songPath) {
                // Set loop based on shuffle state
                this.backgroundMusic.loop = !this.shuffleService.isShuffling;
                
                // Reset progress bar when loading new song
                const progressBar = document.getElementById('musicProgressBar');
                if (progressBar) {
                    progressBar.value = 0;
                }
                
                // Load song using playback service
                this.playbackService.loadSong(
                    songPath,
                    this.shuffleService.isShuffling,
                    (duration, readyState) => {
                        // Metadata loaded callback
                        const songName = songPath.split('/').pop();
                        console.log(`[DEBUG] Valid metadata loaded for ${songName}, duration: ${duration}s`);
                        this.progressService.updateProgressBar();
                        if (progressBar) {
                            progressBar.value = 0;
                        }
                    }
                );
                
                this.currentSong = songPath;
                this.playbackService.setCurrentSong(songPath);
                this.updateNowPlaying();
                
                // Update selected button
                this.fileService.updateSelectedButton(
                    songPath,
                    (btnPath, songPath) => this.playbackService.matchesSongPath(btnPath, songPath)
                );
            }
            
            // Play the currently loaded song
            await this.playbackService.play(() => {
                fadeIn();
                this.progressService.updateProgressBar();
            });
        };
        
        // Play next song (for shuffle)
        const playNextSong = () => {
            const nextSong = this.playbackService.getNextSong(
                this.shuffleService.isShuffling,
                this.shuffleService.shuffleQueue,
                this.shuffleService.currentSongIndex
            );
            
            if (nextSong) {
                // Update shuffle index if shuffling
                if (this.shuffleService.isShuffling) {
                    this.shuffleService.currentSongIndex = (this.shuffleService.currentSongIndex + 1) % this.shuffleService.shuffleQueue.length;
                }
                playMusic(`assets/audio/music/${nextSong.filename}`);
            }
        };
        
        // Make encodeMusicPath available globally for comparisons
        window.encodeMusicPath = (path) => this.playbackService.encodeMusicPath(path);
        
        // Handle song end (for shuffle)
        this.backgroundMusic.addEventListener('ended', () => {
            if (this.shuffleService.isShuffling && this.shuffleService.shuffleQueue.length > 0) {
                playNextSong();
            } else if (!this.shuffleService.isShuffling) {
                // Loop current song
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.play();
            }
        });
        
        // Setup control buttons using control service
        this.controlService.setupAllControls(
            this.musicFiles,
            this.currentSong,
            () => playNextSong()
        );
        
        // Update pause button state when music plays/pauses
        this.backgroundMusic.addEventListener('play', () => {
            if (this.pauseBtn) {
                this.pauseBtn.classList.remove('active');
                this.iconService.updatePauseIcon(false);
            }
        });
        
        this.backgroundMusic.addEventListener('pause', () => {
            if (this.pauseBtn) {
                this.pauseBtn.classList.add('active');
                this.iconService.updatePauseIcon(true);
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
            const currentSongEl = document.getElementById('musicCurrentSong');
            if (currentSongEl) {
                currentSongEl.textContent = getCurrentSongName();
            }
        };
        
        // Update progress bar (delegates to progress service)
        this.updateProgressBar = () => {
            this.progressService.updateProgressBar();
        };
        
        // Format time (delegates to progress service)
        this.formatTime = (seconds) => {
            return this.progressService.formatTime(seconds);
        };
        
        // Setup progress bar event listeners
        this.progressService.setupEventListeners(() => {
            this.saveMusicState();
        });
        
        // Update progress on timeupdate
        this.backgroundMusic.addEventListener('timeupdate', () => {
            // Don't update progress bar if user is seeking/dragging
            if (!this.progressService.isInteracting()) {
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
        
        // Save music state to localStorage
        this.saveMusicState = () => {
            if (!this.backgroundMusic) return;
            const musicState = this.stateService.buildState(
                this.backgroundMusic,
                this.currentSong,
                this.shuffleService.isShuffling,
                this.shuffleService.currentSongIndex,
                this.shuffleService.shuffleQueue
            );
            if (musicState) {
                this.stateService.saveState(musicState);
            }
        };
        
        // Make saveMusicState globally accessible for beforeunload
        window.saveMusicState = this.saveMusicState;
        
        // Restore music state from localStorage
        const restoreMusicState = () => {
            const musicState = this.stateService.loadState();
            if (!musicState) return false;
            
            try {
                // Restore shuffle state first
                if (musicState.isShuffling && musicState.shuffleQueue && this.musicFiles.length > 0) {
                    this.shuffleService.restoreShuffleState(
                        this.musicFiles,
                        musicState.shuffleQueue,
                        musicState.currentSongIndex
                    );
                    const shuffleBtn = document.getElementById('shuffleBtn');
                    if (shuffleBtn) {
                        shuffleBtn.classList.add('active');
                    }
                }
                
                // Restore volume and muted state
                if (musicState.volume !== undefined) {
                    this.volumeService.setTargetVolume(musicState.volume);
                    this.backgroundMusic.volume = musicState.volume;
                    const volumeSlider = document.getElementById('volumeSlider');
                    const volumeValue = document.getElementById('volumeValue');
                    if (volumeSlider) volumeSlider.value = Math.round(musicState.volume * 100);
                    if (volumeValue) volumeValue.textContent = Math.round(musicState.volume * 100) + '%';
                }
                
                if (musicState.muted !== undefined) {
                    this.backgroundMusic.muted = musicState.muted;
                    this.iconService.updateMuteIcon(musicState.muted);
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
                        const statePath = musicState.currentSong || '';
                        return statePath.endsWith(`/${s.filename}`) || decodeURIComponent(statePath).endsWith(`/${s.filename}`);
                    });
                    
                    if (songToRestore) {
                        this.currentSong = `assets/audio/music/${songToRestore.filename}`;
                        this.playbackService.setCurrentSong(this.currentSong);
                        
                        // Set the source and load
                        const encodedPath = this.playbackService.encodeMusicPath(this.currentSong);
                        this.backgroundMusic.src = encodedPath;
                        this.backgroundMusic.loop = !this.shuffleService.isShuffling;
                        this.backgroundMusic.load();
                        
                        // Update UI
                        this.updateNowPlaying();
                        this.fileService.updateSelectedButton(
                            this.currentSong,
                            (btnPath, songPath) => this.playbackService.matchesSongPath(btnPath, songPath)
                        );
                        
                        // Restore position and play state after metadata loads
                        const restorePosition = () => {
                            if (this.backgroundMusic.readyState >= 2) {
                                // Restore position first
                                if (musicState.currentTime !== undefined && musicState.currentTime > 0) {
                                    this.backgroundMusic.currentTime = musicState.currentTime;
                                }
                                
                                // Restore play/pause state
                                if (musicState.paused) {
                                    this.backgroundMusic.pause();
                                    this.iconService.updatePauseIcon(true);
                                    if (this.pauseBtn) this.pauseBtn.classList.add('active');
                                } else {
                                    setTimeout(() => {
                                        const playPromise = this.backgroundMusic.play();
                                        if (playPromise !== undefined) {
                                            playPromise.then(() => {
                                                this.iconService.updatePauseIcon(false);
                                                if (this.pauseBtn) this.pauseBtn.classList.remove('active');
                                            }).catch(error => {
                                                console.log('Autoplay prevented on restore:', error);
                                                this.backgroundMusic.pause();
                                                this.iconService.updatePauseIcon(true);
                                                if (this.pauseBtn) this.pauseBtn.classList.add('active');
                                            });
                                        }
                                    }, 100);
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
                                if (musicState.paused) {
                                    this.backgroundMusic.pause();
                                    this.iconService.updatePauseIcon(true);
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
                const musicFiles = await this.fileService.loadMusicFiles();
                
                if (musicFiles && musicFiles.length > 0) {
                    this.musicFiles = musicFiles;
                    this.playbackService.setMusicFiles(musicFiles);
                    
                    // PRIORITY: Preload current song FIRST if we have one
                    const currentPrioritySong = window.prioritySong || null;
                    if (currentPrioritySong) {
                        this.fileService.preloadPrioritySong(
                            currentPrioritySong,
                            (path) => this.playbackService.encodeMusicPath(path)
                        );
                    }
                    
                    // Create music buttons
                    this.fileService.createMusicButtons(
                        this.musicGrid,
                        this.currentSong,
                        (songPath) => {
                            playMusic(songPath);
                            this.updateNowPlaying();
                            this.saveMusicState();
                        },
                        (path) => this.playbackService.encodeMusicPath(path),
                        (btnPath, songPath) => this.playbackService.matchesSongPath(btnPath, songPath)
                    );
                    
                    // Preload all music files for faster switching (after priority song)
                    this.fileService.preloadAllMusic((path) => this.playbackService.encodeMusicPath(path));
                    
                    // PRIORITY: Restore saved state immediately
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
        
        // Create music buttons (delegates to file service)
        this.createMusicButtons = () => {
            this.fileService.createMusicButtons(
                this.musicGrid,
                this.currentSong,
                (songPath) => {
                    playMusic(songPath);
                    this.updateNowPlaying();
                    this.saveMusicState();
                },
                (path) => this.playbackService.encodeMusicPath(path),
                (btnPath, songPath) => this.playbackService.matchesSongPath(btnPath, songPath)
            );
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
        
        // Setup panel UI using panel service
        if (!this.panelService) {
            console.error('MusicManager: panelService is null!');
            return;
        }
        if (!this.musicButton) {
            console.error('MusicManager: musicButton is null when setting up panel!');
            return;
        }
        
        console.log('MusicManager: Setting up panel service. Button element:', this.musicButton);
        this.panelService.setupToggleButton();
        this.panelService.setupCloseButton();
        this.panelService.setupClickOutsideHandler();
        console.log('MusicManager: Panel service setup complete. Button:', this.musicButton, 'Panel:', this.musicPanel);
        
        // Initialize button states
        this.controlService.initializeButtonStates();
        
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
