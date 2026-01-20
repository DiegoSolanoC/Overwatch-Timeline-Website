// Modal functionality
function showDetails(feature) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    
    const featureDetails = {
        feature1: {
            title: 'Feature 1 Details',
            text: 'This is detailed information about Feature 1. You can customize this text with your own content.'
        },
        feature2: {
            title: 'Feature 2 Details',
            text: 'This is detailed information about Feature 2. Add your own descriptions here!'
        },
        feature3: {
            title: 'Feature 3 Details',
            text: 'This is detailed information about Feature 3. Make it your own!'
        }
    };
    
    if (featureDetails[feature]) {
        modalTitle.textContent = featureDetails[feature].title;
        modalText.textContent = featureDetails[feature].text;
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Navigation functions (for single-page navigation if needed)
function showHome() {
    window.location.href = 'map.html';
}

function showAbout() {
    window.location.href = 'filters.html';
}

// Sound Effects Manager - make it globally accessible
window.SoundEffectsManager = {
    sounds: {},
    volume: 0.5, // Default 50%
    
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
    },
    
    // Save volume to localStorage
    saveVolume() {
        localStorage.setItem('soundEffectsVolume', this.volume.toString());
    },
    
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
    },
    
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
    },
    
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
    },
    
    // Initialize sound effects
    init() {
        // Load all sound effects
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Pick.mp3');
        this.loadSound('filterPick', 'Sound Effects/Filter Pick.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Off.mp3');
        this.loadSound('filterOff', 'Sound Effects/Filter Off.mp3');
        // Filter confirm at reduced volume (50% of normal)
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Confirm.mp3');
        const filterConfirmAudio = new Audio('Sound Effects/Filter Confirm.mp3');
        filterConfirmAudio.volume = this.volume * 0.5; // 50% of sound effects volume
        this.sounds['filterConfirm'] = filterConfirmAudio;
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Clear.mp3');
        this.loadSound('filterClear', 'Sound Effects/Filter Clear.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Radiate.mp3');
        this.loadSound('radiate', 'Sound Effects/Radiate.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Page.mp3');
        this.loadSound('page', 'Sound Effects/Page.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Event Click.mp3');
        this.loadSound('eventClick', 'Sound Effects/Event Click.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Music.mp3');
        this.loadSound('music', 'Sound Effects/Music.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Hack On.mp3');
        this.loadSound('hackOn', 'Sound Effects/Hack On.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Hack Off.mp3');
        this.loadSound('hackOff', 'Sound Effects/Hack Off.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Transport Toggle.mp3');
        this.loadSound('transportToggle', 'Sound Effects/Transport Toggle.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Rotation Toggle.mp3');
        this.loadSound('rotationToggle', 'Sound Effects/Rotation Toggle.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Event Manager.mp3');
        this.loadSound('eventManager', 'Sound Effects/Event Manager.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Switch Event.mp3');
        this.loadSound('switchEvent', 'Sound Effects/Switch Event.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Filter Button.mp3');
        this.loadSound('filterButton', 'Sound Effects/Filter Button.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Color Change.mp3');
        this.loadSound('colorChange', 'Sound Effects/Color Change.mp3');
        if (typeof logAssetLoad === 'function') logAssetLoad('SOUND_EFFECT', 'Mode Switch.mp3');
        this.loadSound('modeSwitch', 'Sound Effects/Mode Switch.mp3');
        
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
                SoundEffectsManager.setVolume(volume);
                soundEffectsVolumeValue.textContent = this.value + '%';
            });
        }
    }
};

function showContact() {
    window.location.href = 'map.html';
}

// Contact form handling
function handleSubmit(event) {
    event.preventDefault();
    
    const formMessage = document.getElementById('form-message');
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    // Since this is a static site, we'll just show a success message
    // In a real application, you'd send this to a backend server
    
    console.log('Form submitted:', { name, email, message });
    
    formMessage.className = 'form-message success';
    formMessage.textContent = 'Thank you for your message! (Note: This is a demo - no email was actually sent)';
    
    // Reset the form
    document.getElementById('contactForm').reset();
    
    // Hide message after 5 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// Asset loading order tracking
const assetLoadOrder = [];
const logAssetLoad = (assetType, assetName) => {
    const timestamp = performance.now().toFixed(2);
    const entry = `[${timestamp}ms] ${assetType}: ${assetName}`;
    assetLoadOrder.push(entry);
    console.log(entry);
};

// Log page name
const pageName = window.location.pathname.split('/').pop() || 'index.html';
logAssetLoad('PAGE', pageName);

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    logAssetLoad('DOM', 'DOMContentLoaded event fired');
    console.log('Website loaded successfully!');
    
    // Initialize sound effects manager
    if (window.SoundEffectsManager) {
        logAssetLoad('SOUND_EFFECTS', 'Initializing SoundEffectsManager');
        window.SoundEffectsManager.init();
    }
    
    const sidebar = document.getElementById('sidebar');
    const indicator = document.getElementById('sidebarIndicator');
    const closeButton = document.getElementById('sidebarClose');
    
    // Check if sidebar should be open from localStorage
    if (localStorage.getItem('sidebarOpen') === 'true') {
        sidebar.classList.add('visible');
    }
    
    // Toggle sidebar when clicking the indicator
    if (indicator) {
        indicator.addEventListener('click', function() {
            sidebar.classList.toggle('visible');
            localStorage.setItem('sidebarOpen', sidebar.classList.contains('visible'));
        });
    }
    
    // Close sidebar when clicking the X button
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling
            sidebar.classList.remove('visible');
            localStorage.setItem('sidebarOpen', 'false');
        });
    }
    
    // Close sidebar when clicking outside of it
    document.addEventListener('click', function(e) {
        if (!sidebar.contains(e.target) && !indicator.contains(e.target)) {
            sidebar.classList.remove('visible');
            localStorage.setItem('sidebarOpen', 'false');
        }
    });
    
    // Keep sidebar open when clicking navigation buttons
    const navButtons = sidebar.querySelectorAll('button');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            localStorage.setItem('sidebarOpen', 'true');
        });
    });
    
    // PRIORITY: Initialize Music Panel FIRST to load music state and current song
    setTimeout(() => {
        if (typeof logAssetLoad === 'function') logAssetLoad('INIT', 'Initializing Music Panel (PRIORITY)');
        initMusicPanel();
        
        // Then initialize Filters Panel (if elements exist - they may be created later when Events component loads)
        if (typeof logAssetLoad === 'function') logAssetLoad('INIT', 'Initializing Filters Panel');
        // Only try to initialize if elements exist, otherwise it will be initialized when Events component loads
        const filtersButton = document.getElementById('filtersToggle');
        const filtersPanel = document.getElementById('filtersPanel');
        const filtersGrid = document.getElementById('filtersGrid');
        if (filtersButton && filtersPanel && filtersGrid) {
            initFiltersPanel();
        } else {
            // Elements don't exist yet - they'll be created when Events component loads
            // initFiltersPanel will be called again at that time
        }
        
        // Log asset loading summary
        if (typeof logAssetLoad === 'function' && assetLoadOrder.length > 0) {
            console.log('\n=== ASSET LOADING ORDER SUMMARY ===');
            assetLoadOrder.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry}`);
            });
            console.log(`\nTotal assets logged: ${assetLoadOrder.length}`);
            console.log('=====================================\n');
        }
    }, 100);
});

// Music Panel functionality - SIMPLIFIED VERSION
// Track if music panel is already initialized to prevent double initialization
let musicPanelInitialized = false;

function initMusicPanel() {
    // Prevent double initialization
    if (musicPanelInitialized) {
        console.log('Music panel already initialized, skipping...');
        return;
    }
    
    const musicButton = document.getElementById('musicToggle');
    const musicPanel = document.getElementById('musicPanel');
    const musicPanelClose = document.getElementById('musicPanelClose');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const muteBtn = document.getElementById('muteBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBtn = document.getElementById('skipBtn');
    const musicGrid = document.getElementById('musicGrid');
    
    if (!musicButton || !musicPanel || !backgroundMusic || !musicGrid) return;
    
    // Mark as initialized
    musicPanelInitialized = true;
    
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
    
    let currentSong = null;
    let musicFiles = [];
    let isShuffling = false;
    let shuffleQueue = [];
    let currentSongIndex = 0;
    let isDragging = false;
    
    backgroundMusic.volume = initialVolume;
    currentTargetVolume = initialVolume;
    if (volumeSlider) volumeSlider.value = Math.round(initialVolume * 100);
    if (volumeValue) volumeValue.textContent = Math.round(initialVolume * 100) + '%';
    
    // Fade in/out variables
    let fadeInInterval = null;
    let fadeOutInterval = null;
    const fadeDuration = 2000; // 2 seconds fade
    const fadeSteps = 20;
    const fadeStepTime = fadeDuration / fadeSteps;
    
    // Fade in function
    const fadeIn = () => {
        if (fadeInInterval) clearInterval(fadeInInterval);
        if (fadeOutInterval) clearInterval(fadeOutInterval);
        
        backgroundMusic.volume = 0;
        let currentStep = 0;
        const targetVolume = backgroundMusic.muted ? 0 : currentTargetVolume;
        
        fadeInInterval = setInterval(() => {
            if (backgroundMusic.muted) {
                clearInterval(fadeInInterval);
                fadeInInterval = null;
                return;
            }
            
            currentStep++;
            const progress = currentStep / fadeSteps;
            backgroundMusic.volume = targetVolume * progress;
            
            if (currentStep >= fadeSteps) {
                clearInterval(fadeInInterval);
                fadeInInterval = null;
                backgroundMusic.volume = targetVolume;
            }
        }, fadeStepTime);
    };
    
    // Fade out function
    const fadeOut = () => {
        if (fadeOutInterval) return;
        if (fadeInInterval) clearInterval(fadeInInterval);
        
        // Don't fade out if user is seeking
        if (isSeeking || isDragging) return;
        
        const startVolume = backgroundMusic.volume;
        let currentStep = 0;
        
        fadeOutInterval = setInterval(() => {
            // Check again during fade - user might start seeking
            if (isSeeking || isDragging) {
                clearInterval(fadeOutInterval);
                fadeOutInterval = null;
                // Restore volume if fade was interrupted
                backgroundMusic.volume = startVolume;
                return;
            }
            
            currentStep++;
            const progress = currentStep / fadeSteps;
            backgroundMusic.volume = startVolume * (1 - progress);
            
            if (currentStep >= fadeSteps) {
                clearInterval(fadeOutInterval);
                fadeOutInterval = null;
                backgroundMusic.volume = 0;
                
                // Only reset currentTime if we're looping (not shuffling) and not seeking
                if (!isShuffling && backgroundMusic.loop && !isSeeking && !isDragging) {
                    backgroundMusic.currentTime = 0;
                    setTimeout(() => {
                        if (!backgroundMusic.paused && !isSeeking && !isDragging) {
                            fadeIn();
                        }
                    }, 50);
                }
            }
        }, fadeStepTime);
    };
    
    // Check when music is about to end and fade out
    backgroundMusic.addEventListener('timeupdate', () => {
        // Don't trigger fade out if user is seeking or dragging
        if (isSeeking || isDragging) return;
        
        const timeRemaining = backgroundMusic.duration - backgroundMusic.currentTime;
        if (timeRemaining <= (fadeDuration / 1000) && timeRemaining > 0.1 && !fadeOutInterval) {
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
            backgroundMusic.loop = !isShuffling;
            
            // Reset progress bar when loading new song
            const progressBar = document.getElementById('musicProgressBar');
            if (progressBar) {
                progressBar.value = 0;
            }
            
            // Encode the path to handle special characters
            const encodedPath = encodeMusicPath(songPath);
            backgroundMusic.src = encodedPath;
            currentSong = songPath; // Keep original for comparison
            updateNowPlaying();
            
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
            backgroundMusic.load();
            
            // Handler for when metadata is loaded (multiple events for compatibility)
            const handleMetadataLoaded = (eventType) => {
                const duration = backgroundMusic.duration;
                const readyState = backgroundMusic.readyState;
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
                    updateProgressBar();
                    
                    // Reset progress bar to start
                    if (progressBar) {
                        progressBar.value = 0;
                    }
                    
                    // Remove all listeners once we have valid metadata
                    backgroundMusic.removeEventListener('loadedmetadata', handleMetadataLoaded);
                    backgroundMusic.removeEventListener('canplay', handleMetadataLoaded);
                    backgroundMusic.removeEventListener('loadeddata', handleMetadataLoaded);
                    backgroundMusic.removeEventListener('canplaythrough', handleMetadataLoaded);
                }
            };
            
            // Listen for multiple events to catch metadata loading (some files trigger different events)
            backgroundMusic.addEventListener('loadedmetadata', () => handleMetadataLoaded('loadedmetadata'));
            backgroundMusic.addEventListener('canplay', () => handleMetadataLoaded('canplay'));
            backgroundMusic.addEventListener('loadeddata', () => handleMetadataLoaded('loadeddata'));
            backgroundMusic.addEventListener('canplaythrough', () => handleMetadataLoaded('canplaythrough'));
            
            // Fallback: Check periodically if metadata loaded (in case events don't fire)
            let metadataCheckCount = 0;
            const maxMetadataChecks = 100; // Check for up to 10 seconds (100 * 100ms)
            const metadataCheckInterval = setInterval(() => {
                metadataCheckCount++;
                const duration = backgroundMusic.duration;
                const readyState = backgroundMusic.readyState;
                
                if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                    const songName = songPath.split('/').pop();
                    console.log(`[DEBUG] Metadata loaded via polling for ${songName} after ${metadataCheckCount * 100}ms:`, {
                        duration: duration,
                        readyState: readyState
                    });
                    updateProgressBar();
                    if (progressBar) {
                        progressBar.value = 0;
                    }
                    clearInterval(metadataCheckInterval);
                } else if (metadataCheckCount >= maxMetadataChecks) {
                    // Give up after max checks
                    clearInterval(metadataCheckInterval);
                    const songName = songPath.split('/').pop();
                    console.warn(`[DEBUG] Metadata not loaded for ${songName} after ${maxMetadataChecks * 100}ms:`, {
                        duration: backgroundMusic.duration,
                        readyState: backgroundMusic.readyState,
                        networkState: backgroundMusic.networkState,
                        src: backgroundMusic.src
                    });
                }
            }, 100);
        }
        
        // Compare with encoded path for checking if same song
        const encodedPath = encodeMusicPath(songPath);
        if (!backgroundMusic.paused && backgroundMusic.src.endsWith(encodedPath.split('/').pop())) return;
        
        backgroundMusic.volume = 0;
        const playPromise = backgroundMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                fadeIn();
                updateProgressBar();
            }).catch(error => {
                console.log('Autoplay prevented:', error);
            });
        } else {
            fadeIn();
            updateProgressBar();
        }
    };
    
    // Shuffle function
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // Play next song (for shuffle)
    function playNextSong() {
        if (isShuffling && shuffleQueue.length > 0) {
            // Play next in shuffle queue
            currentSongIndex = (currentSongIndex + 1) % shuffleQueue.length;
            playMusic(`Music/${shuffleQueue[currentSongIndex].filename}`);
        } else {
            // If not shuffling, play default music (Winston's Desk)
            if (musicFiles.length === 0) return;
            const winstonsDesk = musicFiles.find(s => s.name.toLowerCase().includes('winston') || s.name.toLowerCase().includes('desk'));
            if (winstonsDesk) {
                playMusic(`Music/${winstonsDesk.filename}`);
            } else {
                // Fallback to first song
                playMusic(`Music/${musicFiles[0].filename}`);
            }
        }
    }
    
    // Make encodeMusicPath available globally for comparisons
    window.encodeMusicPath = encodeMusicPath;
    
    // Handle song end (for shuffle)
    backgroundMusic.addEventListener('ended', () => {
        if (isShuffling && shuffleQueue.length > 0) {
            playNextSong();
        } else if (!isShuffling) {
            // Loop current song
            backgroundMusic.currentTime = 0;
            backgroundMusic.play();
        }
    });
    
    // Shuffle button
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            isShuffling = !isShuffling;
            
            if (isShuffling) {
                // Create shuffle queue
                shuffleQueue = shuffleArray(musicFiles);
                currentSongIndex = shuffleQueue.findIndex(s => `Music/${s.filename}` === currentSong);
                if (currentSongIndex === -1) currentSongIndex = 0;
                this.classList.add('active');
                // Update icon to show shuffle is on (if you have a Shuffle On icon, otherwise keep same)
                if (shuffleBtnIcon) {
                    shuffleBtnIcon.src = 'Icons/Shuffle Icon.png'; // Or 'Shuffle On Icon.png' if you have it
                }
            } else {
                shuffleQueue = [];
                this.classList.remove('active');
                if (shuffleBtnIcon) {
                    shuffleBtnIcon.src = 'Icons/Shuffle Icon.png';
                }
            }
            saveMusicState();
        });
    }
    
    // Update pause button state when music plays/pauses
    backgroundMusic.addEventListener('play', () => {
        if (pauseBtn) {
            pauseBtn.classList.remove('active');
            updatePauseIcon(false);
        }
    });
    
    backgroundMusic.addEventListener('pause', () => {
        if (pauseBtn) {
            pauseBtn.classList.add('active');
            updatePauseIcon(true);
        }
    });
    
    // Get current song name
    function getCurrentSongName() {
        if (!currentSong) return 'No song playing';
        const song = musicFiles.find(s => `Music/${s.filename}` === currentSong);
        return song ? song.name : 'Unknown';
    }
    
    // Update now playing display
    function updateNowPlaying() {
        const nowPlayingEl = document.getElementById('musicNowPlaying');
        const currentSongEl = document.getElementById('musicCurrentSong');
        if (currentSongEl) {
            currentSongEl.textContent = getCurrentSongName();
        }
    }
    
    // Update progress bar
    function updateProgressBar() {
        const progressBar = document.getElementById('musicProgressBar');
        const currentTimeEl = document.getElementById('musicCurrentTime');
        const totalTimeEl = document.getElementById('musicTotalTime');
        
        // Check for valid duration (not NaN, not Infinity, and greater than 0)
        if (!backgroundMusic || !backgroundMusic.duration || isNaN(backgroundMusic.duration) || !isFinite(backgroundMusic.duration) || backgroundMusic.duration <= 0) {
            // Still update current time display even if duration isn't ready
            if (currentTimeEl && backgroundMusic && !isNaN(backgroundMusic.currentTime)) {
                currentTimeEl.textContent = formatTime(backgroundMusic.currentTime);
            }
            if (totalTimeEl) {
                totalTimeEl.textContent = '0:00';
            }
            // Debug logging
            if (backgroundMusic && backgroundMusic.src) {
                const songName = backgroundMusic.src.split('/').pop();
                console.log(`[DEBUG] Duration not ready for ${songName}:`, {
                    duration: backgroundMusic.duration,
                    readyState: backgroundMusic.readyState,
                    networkState: backgroundMusic.networkState,
                    paused: backgroundMusic.paused
                });
            }
            return;
        }
        
        const current = backgroundMusic.currentTime;
        const total = backgroundMusic.duration;
        const percent = (current / total) * 100;
        
        // Only update progress bar if not currently seeking/dragging
        if (progressBar && !isSeeking && !isDragging) {
            progressBar.value = percent;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(current);
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = formatTime(total);
        }
    }
    
    // Format time as MM:SS
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Progress bar interaction
    const progressBar = document.getElementById('musicProgressBar');
    let isSeeking = false; // Declare outside so it's accessible in timeupdate listener
    
    if (progressBar) {
        // Set seeking flag on any interaction
        progressBar.addEventListener('mousedown', () => {
            isSeeking = true;
            isDragging = true;
        });
        
        progressBar.addEventListener('click', (e) => {
            // Handle direct clicks on the slider - re-check duration validity
            if (backgroundMusic) {
                const duration = backgroundMusic.duration;
                const readyState = backgroundMusic.readyState;
                const songName = backgroundMusic.src ? backgroundMusic.src.split('/').pop() : 'unknown';
                
                if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                    const rect = progressBar.getBoundingClientRect();
                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                    const newTime = (Math.max(0, Math.min(100, percent)) / 100) * duration;
                    backgroundMusic.currentTime = newTime;
                    updateProgressBar();
                    console.log(`[DEBUG] Successfully clicked to seek ${songName} to ${newTime.toFixed(2)}s`);
                } else {
                    console.warn(`[DEBUG] Cannot seek ${songName} on click - duration invalid:`, {
                        duration: duration,
                        readyState: readyState,
                        networkState: backgroundMusic.networkState
                    });
                }
            }
        });
        
        progressBar.addEventListener('mouseup', () => {
            isSeeking = false;
            isDragging = false;
        });
        
        progressBar.addEventListener('mouseleave', () => {
            // Reset if mouse leaves while dragging
            if (isDragging) {
                isSeeking = false;
                isDragging = false;
            }
        });
        
        progressBar.addEventListener('input', function() {
            // Re-check duration validity at the time of seeking (in case it loaded after initial check)
            if (backgroundMusic) {
                const duration = backgroundMusic.duration;
                const readyState = backgroundMusic.readyState;
                
                // Debug logging
                if (isSeeking || isDragging) {
                    const songName = backgroundMusic.src ? backgroundMusic.src.split('/').pop() : 'unknown';
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
                    if (isSeeking || isDragging) {
                        backgroundMusic.currentTime = newTime;
                        // Update display immediately
                        updateProgressBar();
                    }
                } else if (isSeeking || isDragging) {
                    // Debug: log why seeking failed
                    const songName = backgroundMusic.src ? backgroundMusic.src.split('/').pop() : 'unknown';
                    console.warn(`[DEBUG] Cannot seek ${songName} - duration invalid:`, {
                        duration: duration,
                        readyState: readyState,
                        networkState: backgroundMusic.networkState
                    });
                }
            }
        });
        
        progressBar.addEventListener('change', function() {
            // Final update when user releases - re-check duration validity
            if (backgroundMusic) {
                const duration = backgroundMusic.duration;
                const readyState = backgroundMusic.readyState;
                
                if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                    const percent = this.value;
                    const newTime = (percent / 100) * duration;
                    backgroundMusic.currentTime = newTime;
                    updateProgressBar();
                    const songName = backgroundMusic.src ? backgroundMusic.src.split('/').pop() : 'unknown';
                    console.log(`[DEBUG] Successfully seeked ${songName} to ${newTime.toFixed(2)}s`);
                } else {
                    const songName = backgroundMusic.src ? backgroundMusic.src.split('/').pop() : 'unknown';
                    console.warn(`[DEBUG] Cannot seek ${songName} on change - duration invalid:`, {
                        duration: duration,
                        readyState: readyState,
                        networkState: backgroundMusic.networkState
                    });
                }
            }
            isSeeking = false;
            isDragging = false;
        });
        
        // Also handle touch events for mobile
        progressBar.addEventListener('touchstart', () => {
            isSeeking = true;
            isDragging = true;
        });
        
        progressBar.addEventListener('touchend', () => {
            isSeeking = false;
            isDragging = false;
        });
    }
    
    // Update progress on timeupdate
    let musicStateSaveTimeout = null;
    backgroundMusic.addEventListener('timeupdate', () => {
        // Don't update progress bar if user is seeking/dragging
        if (!isDragging && !isSeeking) {
            updateProgressBar();
        }
        // Throttle timeupdate saves to avoid too many writes
        if (!musicStateSaveTimeout) {
            musicStateSaveTimeout = setTimeout(() => {
                saveMusicState();
                musicStateSaveTimeout = null;
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
                if (!isDragging) {
                    isSeeking = false;
                }
            }, 100);
        });
    }
    
    // Save music state to localStorage
    const saveMusicState = () => {
        if (!backgroundMusic) return;
        const musicState = {
            currentSong: currentSong,
            currentTime: backgroundMusic.currentTime,
            paused: backgroundMusic.paused,
            volume: backgroundMusic.volume,
            muted: backgroundMusic.muted,
            isShuffling: isShuffling,
            currentSongIndex: currentSongIndex,
            shuffleQueue: isShuffling ? shuffleQueue.map(s => s.filename) : null
        };
        localStorage.setItem('musicState', JSON.stringify(musicState));
    };
    
    // Make saveMusicState globally accessible for beforeunload
    window.saveMusicState = saveMusicState;
    
    // Restore music state from localStorage
    const restoreMusicState = () => {
        const savedState = localStorage.getItem('musicState');
        if (!savedState) return false;
        
        try {
            const musicState = JSON.parse(savedState);
            
            // Restore shuffle state first
            if (musicState.isShuffling && musicState.shuffleQueue && musicFiles.length > 0) {
                isShuffling = true;
                shuffleQueue = musicFiles.filter(s => musicState.shuffleQueue.includes(s.filename));
                currentSongIndex = musicState.currentSongIndex || 0;
                if (shuffleBtn) {
                    shuffleBtn.classList.add('active');
                }
            }
            
            // Restore volume and muted state
            if (musicState.volume !== undefined) {
                backgroundMusic.volume = musicState.volume;
                currentTargetVolume = musicState.volume;
                if (volumeSlider) volumeSlider.value = Math.round(musicState.volume * 100);
                if (volumeValue) volumeValue.textContent = Math.round(musicState.volume * 100) + '%';
            }
            
            if (musicState.muted !== undefined) {
                backgroundMusic.muted = musicState.muted;
                updateMuteIcon(musicState.muted);
                if (muteBtn) {
                    if (musicState.muted) {
                        muteBtn.classList.add('active');
                    } else {
                        muteBtn.classList.remove('active');
                    }
                }
            }
            
            // Restore song if it exists
            if (musicState.currentSong && musicFiles.length > 0) {
                // Find the song in the music files
                const songToRestore = musicFiles.find(s => {
                    const songPath = `Music/${s.filename}`;
                    return songPath === musicState.currentSong || 
                           songPath.replace(/ /g, '%20') === musicState.currentSong;
                });
                
                if (songToRestore) {
                    currentSong = `Music/${songToRestore.filename}`;
                    
                    // Set the source and load
                    const encodedPath = encodeMusicPath(currentSong);
                    backgroundMusic.src = encodedPath;
                    backgroundMusic.loop = !isShuffling;
                    backgroundMusic.load();
                    
                    // Update UI
                    updateNowPlaying();
                    // Update selected button - try multiple path formats for matching
                    document.querySelectorAll('.music-grid-btn').forEach(btn => {
                        btn.classList.remove('selected');
                        const btnPath = btn.dataset.songPath;
                        // Match exact path, or with spaces encoded, or with different encodings
                        if (btnPath === currentSong || 
                            btnPath === currentSong.replace(/ /g, '%20') ||
                            btnPath.replace(/ /g, '%20') === currentSong ||
                            decodeURIComponent(btnPath) === decodeURIComponent(currentSong)) {
                            btn.classList.add('selected');
                        }
                    });
                    
                    // Restore position and play state after metadata loads
                    const restorePosition = () => {
                        if (backgroundMusic.readyState >= 2) { // HAVE_CURRENT_DATA
                            // Restore position first
                            if (musicState.currentTime !== undefined && musicState.currentTime > 0) {
                                backgroundMusic.currentTime = musicState.currentTime;
                            }
                            
                            // Restore play/pause state - IMPORTANT: Explicitly pause if it was paused
                            if (musicState.paused) {
                                // Make absolutely sure it's paused
                                backgroundMusic.pause();
                                updatePauseIcon(true);
                                if (pauseBtn) pauseBtn.classList.add('active');
                            } else {
                                // Only play if it was NOT paused - use a small delay to prevent staggering
                                setTimeout(() => {
                                    const playPromise = backgroundMusic.play();
                                    if (playPromise !== undefined) {
                                        playPromise.then(() => {
                                            updatePauseIcon(false);
                                            if (pauseBtn) pauseBtn.classList.remove('active');
                                        }).catch(error => {
                                            console.log('Autoplay prevented on restore:', error);
                                            // If autoplay prevented, keep it paused
                                            backgroundMusic.pause();
                                            updatePauseIcon(true);
                                            if (pauseBtn) pauseBtn.classList.add('active');
                                        });
                                    }
                                }, 100); // Small delay to prevent staggering on refresh
                            }
                            
                            backgroundMusic.removeEventListener('loadedmetadata', restorePosition);
                            backgroundMusic.removeEventListener('canplay', restorePosition);
                        }
                    };
                    
                    backgroundMusic.addEventListener('loadedmetadata', restorePosition);
                    backgroundMusic.addEventListener('canplay', restorePosition);
                    
                    // Fallback: try after a delay
                    setTimeout(() => {
                        if (backgroundMusic.readyState >= 2) {
                            if (musicState.currentTime !== undefined && musicState.currentTime > 0) {
                                backgroundMusic.currentTime = musicState.currentTime;
                            }
                            // IMPORTANT: Only play if NOT paused, and explicitly pause if it was paused
                            if (musicState.paused) {
                                // Make sure it's paused
                                backgroundMusic.pause();
                                updatePauseIcon(true);
                                if (pauseBtn) pauseBtn.classList.add('active');
                            } else {
                                backgroundMusic.play().catch(() => {
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
    async function loadMusicFiles() {
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
                musicFiles = manifest.music;
                console.log(`Loaded ${musicFiles.length} music files from manifest:`, musicFiles.map(s => s.name));
                
                // PRIORITY: Preload current song FIRST if we have one
                const currentPrioritySong = window.prioritySong || null;
                if (currentPrioritySong) {
                    const prioritySongFile = musicFiles.find(s => {
                        const songPath = `Music/${s.filename}`;
                        return songPath === currentPrioritySong || songPath.replace(/ /g, '%20') === currentPrioritySong;
                    });
                    if (prioritySongFile) {
                        logAssetLoad('MUSIC_PRIORITY', `Preloading current song: ${prioritySongFile.filename}`);
                        const encodedPath = encodeMusicPath(`Music/${prioritySongFile.filename}`);
                        const priorityAudio = new Audio(encodedPath);
                        priorityAudio.preload = 'auto';
                        priorityAudio.load();
                    }
                }
                
                // Log each music file
                musicFiles.forEach(song => {
                    logAssetLoad('MUSIC_FILE', `${song.filename} (${song.name})`);
                });
                
                createMusicButtons();
                
                // Preload all music files for faster switching (after priority song)
                musicFiles.forEach(song => {
                    // Encode filename to handle special characters
                    const encodedFilename = encodeURIComponent(song.filename);
                    const audio = new Audio(`Music/${encodedFilename}`);
                    audio.preload = 'auto';
                    // Also preload the icon images
                    const iconName = song.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                    const iconImg = new Image();
                    const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    // Encode the path properly for URLs (handles spaces and special characters)
                    const encodedIconName = encodeURIComponent(iconName);
                    iconImg.src = `Music Icons/${encodedIconName}.png?v=${imageCacheBuster}`;
                });
                
                // PRIORITY: Restore saved state immediately (this will load and restore the current song)
                const restored = restoreMusicState();
                if (!restored && !currentSong && musicFiles.length > 0) {
                    // Only play first song if no saved state exists
                    const firstSong = `Music/${musicFiles[0].filename}`;
                    playMusic(firstSong);
                    updateNowPlaying();
                } else if (restored) {
                    logAssetLoad('MUSIC_PRIORITY', 'Music state restored successfully');
                }
            } else {
                console.warn('No music files found in manifest.json');
                console.log('To add music files:');
                console.log('1. Add .mp3, .wav, or .ogg files to the Music folder');
                console.log('2. Add matching .png images to the Music Icons folder (same name as music file)');
                console.log('3. Run: node generate-manifest.js');
                console.log('4. Refresh this page');
                musicGrid.innerHTML = '<div style="color: #ff6600; padding: 20px; text-align: center;">No music files found.<br><br>1. Add files to Music folder<br>2. Add icons to Music Icons folder<br>3. Run: node generate-manifest.js<br>4. Refresh page</div>';
            }
        } catch (error) {
            console.error('Error loading manifest.json:', error);
            musicGrid.innerHTML = '<div style="color: #ff6600; padding: 20px; text-align: center;">Error loading music. Run generate-manifest.js</div>';
        }
    }
    
    // Create music buttons - EXACT COPY of createFilterButtons structure
    function createMusicButtons() {
        musicGrid.innerHTML = '';
        
        musicFiles.forEach(song => {
            const musicBtn = document.createElement('div');
            musicBtn.className = 'music-grid-btn';
            // Store original path (will be encoded when used)
            musicBtn.dataset.songPath = `Music/${song.filename}`;
            musicBtn.dataset.songName = song.name;
            
            // Image container (EXACT COPY of filter-image-container)
            const imageContainer = document.createElement('div');
            imageContainer.className = 'music-icon-container';
            
            const img = document.createElement('img');
            // Use image from Music Icons folder with same name as music file
            const iconName = song.filename.replace(/\.(mp3|wav|ogg)$/i, '');
            // Add cache busting to ensure latest images load
            const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Encode the path properly for URLs (handles spaces and special characters)
            const encodedIconName = encodeURIComponent(iconName);
            img.src = `Music Icons/${encodedIconName}.png?v=${imageCacheBuster}`;
            img.alt = song.name;
            img.onerror = function() {
                // If image fails to load, try alternative encodings/cases for GitHub Pages compatibility
                const originalSrc = this.src;
                console.warn(`[DEBUG] Image failed to load: ${originalSrc}`);
                
                // Try with different encoding (some servers handle spaces differently)
                const altEncoded = iconName.replace(/\s+/g, '%20');
                if (this.src !== `Music Icons/${altEncoded}.png?v=${imageCacheBuster}`) {
                    this.src = `Music Icons/${altEncoded}.png?v=${imageCacheBuster}`;
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
            const songPath = `Music/${song.filename}`;
            if (currentSong === songPath || 
                currentSong === songPath.replace(/ /g, '%20') ||
                currentSong && currentSong.replace(/ /g, '%20') === songPath ||
                (currentSong && decodeURIComponent(currentSong) === decodeURIComponent(songPath))) {
                musicBtn.classList.add('selected');
            }
            
            // Click handler
            musicBtn.addEventListener('click', function() {
                const songPath = this.dataset.songPath;
                
                // Remove selected from all buttons
                document.querySelectorAll('.music-grid-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Add selected to clicked button
                this.classList.add('selected');
                
                // Play the song
                playMusic(songPath);
                updateNowPlaying();
                saveMusicState();
            });
            
            musicGrid.appendChild(musicBtn);
        });
    }
    
    // Preload audio
    backgroundMusic.load();
    
    // Try to play immediately (will be set when music loads)
    let hasStartedPlaying = false;
    const playOnInteraction = () => {
        if (!hasStartedPlaying && backgroundMusic.paused && currentSong) {
            playMusic();
            hasStartedPlaying = true;
            interactionEvents.forEach(eventType => {
                document.removeEventListener(eventType, playOnInteraction);
            });
        }
    };
    
    const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown', 'wheel'];
    interactionEvents.forEach(eventType => {
        document.addEventListener(eventType, playOnInteraction, { passive: true, once: false });
    });
    
    backgroundMusic.addEventListener('playing', () => {
        hasStartedPlaying = true;
        interactionEvents.forEach(eventType => {
            document.removeEventListener(eventType, playOnInteraction);
        });
    });
    
    // Open/close music panel
    if (musicButton) {
        // Handle button click/touch - unified handler
        const handleMusicToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            // Play music button sound
            window.SoundEffectsManager.play('music');
            
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
            musicPanel.classList.toggle('open');
            if (musicPanel.classList.contains('open')) {
                musicButton.classList.add('active');
            } else {
                musicButton.classList.remove('active');
            }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        musicButton.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        musicButton.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        musicButton.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        musicButton.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleMusicToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        musicButton.addEventListener('click', handleMusicToggle);
    }
    
    // Close music panel
    if (musicPanelClose) {
        musicPanelClose.addEventListener('click', function() {
            // Play music button sound when closing panel
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('music');
            }
            musicPanel.classList.remove('open');
            if (musicButton) {
                musicButton.classList.remove('active');
            }
        });
    }
    
    // Volume slider
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            currentTargetVolume = volume;
            
            if (!backgroundMusic.muted && !fadeInInterval && !fadeOutInterval) {
                backgroundMusic.volume = volume;
            }
            
            if (volumeValue) {
                volumeValue.textContent = Math.round(volume * 100) + '%';
            }
            saveMusicState();
            
            if (volume === 0 && muteBtn) {
                muteBtn.classList.add('active');
                updateMuteIcon(true);
            } else if (muteBtn) {
                if (!backgroundMusic.muted) {
                    muteBtn.classList.remove('active');
                    updateMuteIcon(false);
                }
            }
        });
    }
    
    // Get icon elements
    const pauseBtnIcon = document.getElementById('pauseBtnIcon');
    const muteBtnIcon = document.getElementById('muteBtnIcon');
    const skipBtnIcon = document.getElementById('skipBtnIcon');
    const shuffleBtnIcon = document.getElementById('shuffleBtnIcon');
    
    // Function to update pause/play icon
    function updatePauseIcon(isPaused) {
        if (pauseBtnIcon) {
            pauseBtnIcon.src = isPaused ? 'Icons/Play Icon.png' : 'Icons/Pause Icon.png';
            pauseBtnIcon.alt = isPaused ? 'Play' : 'Pause';
        }
    }
    
    // Function to update mute/unmute icon
    function updateMuteIcon(isMuted) {
        if (muteBtnIcon) {
            muteBtnIcon.src = isMuted ? 'Icons/Muted Icon.png' : 'Icons/Unmuted Icon.png';
            muteBtnIcon.alt = isMuted ? 'Unmute' : 'Mute';
        }
    }
    
    // Mute button
    if (muteBtn) {
        muteBtn.addEventListener('click', function() {
            if (backgroundMusic.muted) {
                backgroundMusic.muted = false;
                this.classList.remove('active');
                updateMuteIcon(false);
                if (!fadeInInterval && !fadeOutInterval) {
                    backgroundMusic.volume = currentTargetVolume;
                }
            } else {
                backgroundMusic.muted = true;
                this.classList.add('active');
                updateMuteIcon(true);
            }
            saveMusicState();
        });
    }
    
    // Pause button
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
            if (backgroundMusic.paused) {
                backgroundMusic.play();
                this.classList.remove('active');
                updatePauseIcon(false);
            } else {
                backgroundMusic.pause();
                this.classList.add('active');
                updatePauseIcon(true);
            }
            saveMusicState();
        });
    }
    
    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', function() {
            playNextSong();
        });
    }
    
    // Update pause button state when music plays/pauses
    backgroundMusic.addEventListener('play', () => {
        if (pauseBtn) {
            pauseBtn.classList.remove('active');
            updatePauseIcon(false);
        }
    });
    
    backgroundMusic.addEventListener('pause', () => {
        if (pauseBtn) {
            pauseBtn.classList.add('active');
            updatePauseIcon(true);
        }
    });
    
    // Initialize icons based on current state
    if (backgroundMusic.paused) {
        updatePauseIcon(true);
        if (pauseBtn) pauseBtn.classList.add('active');
    } else {
        updatePauseIcon(false);
        if (pauseBtn) pauseBtn.classList.remove('active');
    }
    
    if (backgroundMusic.muted) {
        updateMuteIcon(true);
        if (muteBtn) muteBtn.classList.add('active');
    } else {
        updateMuteIcon(false);
        if (muteBtn) muteBtn.classList.remove('active');
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (musicPanel && musicPanel.classList.contains('open')) {
            if (!musicPanel.contains(e.target) && 
                !musicButton.contains(e.target) && 
                e.target !== musicButton) {
                musicPanel.classList.remove('open');
                if (musicButton) {
                    musicButton.classList.remove('active');
                }
            }
        }
    });
    
    // Load music files
    loadMusicFiles();
}

// Filters Panel functionality
function initFiltersPanel() {
    const filtersButton = document.getElementById('filtersToggle');
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersPanelClose = document.getElementById('filtersPanelClose');
    const filtersGrid = document.getElementById('filtersGrid');
    const unselectAllBtn = document.getElementById('unselectAllBtn');
    const confirmFiltersBtn = document.getElementById('confirmFiltersBtn');
    
    console.log('Initializing filters panel...');
    console.log('Filters button:', filtersButton);
    console.log('Filters panel:', filtersPanel);
    console.log('Filters grid:', filtersGrid);
    
    if (!filtersButton || !filtersPanel || !filtersGrid) {
        // Elements not found - this is expected if Events component hasn't loaded yet
        // Don't log as error, just return silently
        return;
    }
    
    // Load heroes and factions from manifest.json (dynamically generated from folders)
    let heroes = [];
    let factions = [];
    
    // Track selected filters (stores both heroes and factions)
    const selectedFilters = new Set();
    let currentFilterType = 'heroes'; // 'heroes' or 'factions'
    
    // Function to get confirmed filters from sceneModel
    function getConfirmedFilters() {
        if (window.globeController && window.globeController.sceneModel && window.globeController.sceneModel.activeFilters) {
            return new Set(window.globeController.sceneModel.activeFilters);
        }
        return new Set();
    }
    
    // Function to reset selectedFilters to confirmed state and update button states
    function resetToConfirmedFilters() {
        const confirmedFilters = getConfirmedFilters();
        
        // Reset selectedFilters to match confirmed filters
        selectedFilters.clear();
        confirmedFilters.forEach(filter => selectedFilters.add(filter));
        
        // Update button visual states
        const allButtons = filtersGrid.querySelectorAll('.filter-btn');
        allButtons.forEach(btn => {
            const filterKey = btn.dataset.filterKey;
            if (filterKey) {
                if (selectedFilters.has(filterKey)) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            }
        });
        
        // Update filter counts
        updateFilterCounts();
    }
    
    // Load manifest
    async function loadManifest() {
        try {
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
            
            if (manifest.heroes) {
                heroes = manifest.heroes.sort(); // Sort alphabetically
            }
            
            if (manifest.factions) {
                factions = manifest.factions.map(f => ({
                    filename: f.filename,
                    number: f.number,
                    displayName: f.displayName
                })).sort((a, b) => a.number - b.number); // Sort by number
            }
            
            // Initialize with loaded data
            createFilterButtons(heroes, 'heroes', 'Heroes');
            updateFilterCounts();
            
            // Preload faction images in background
            if (factions.length > 0) {
                setTimeout(() => {
                    preloadImages(factions, 'factions', 'Factions');
                }, 500);
            }
        } catch (error) {
            console.error('Error loading manifest.json:', error);
            console.log('Falling back to empty lists. Run generate-manifest.js to create manifest.json');
            // Fallback to empty arrays if manifest doesn't exist
            heroes = [];
            factions = [];
            createFilterButtons(heroes, 'heroes', 'Heroes');
        }
    }
    
    // Load manifest on page load
    loadManifest();
    
    // Function to update filter counts
    function updateFilterCounts() {
        const heroesCount = document.getElementById('heroesCount');
        const factionsCount = document.getElementById('factionsCount');
        
        let heroCount = 0;
        let factionCount = 0;
        
        selectedFilters.forEach(filter => {
            // Check if it's a faction (has number prefix) or hero
            if (/^\d+/.test(filter)) {
                factionCount++;
            } else {
                heroCount++;
            }
        });
        
        // Only display count if greater than 0
        if (heroesCount) {
            if (heroCount > 0) {
                heroesCount.textContent = heroCount;
                heroesCount.style.display = 'inline';
            } else {
                heroesCount.style.display = 'none';
            }
        }
        if (factionsCount) {
            if (factionCount > 0) {
                factionsCount.textContent = factionCount;
                factionsCount.style.display = 'inline';
            } else {
                factionsCount.style.display = 'none';
            }
        }
    }
    
    // Cache for button containers to avoid recreating them
    const buttonCache = {
        heroes: null,
        factions: null,
        music: null
    };
    
    // Preload all images for faster tab switching (with batching to avoid overwhelming server)
    function preloadImages(items, type, folder) {
        // Batch images to avoid overwhelming the server
        const batchSize = 5; // Load 5 images at a time
        const delayBetweenBatches = 100; // 100ms delay between batches
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            setTimeout(() => {
                batch.forEach(item => {
                    let imagePath;
                    if (type === 'factions') {
                        // Encode faction filename to handle spaces and special characters
                        const encodedFilename = encodeURIComponent(item.filename);
                        imagePath = `${folder}/${encodedFilename}.png`;
                    } else if (type === 'music') {
                        const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                        // Encode the path properly for URLs (handles spaces and special characters)
                        const encodedIconName = encodeURIComponent(iconName);
                        imagePath = `${folder}/${encodedIconName}.png`;
                    } else {
                        // heroes
                        imagePath = `${folder}/${item}.png`;
                    }
                    
                    const img = new Image();
                    // Use aggressive cache busting to ensure latest images load
                    const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    img.src = `${imagePath}?v=${imageCacheBuster}`;
                    
                    // Add error handling with retry
                    img.onerror = function() {
                        // Retry once after a delay with new cache buster
                        setTimeout(() => {
                            const retryCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            this.src = `${imagePath}?v=${retryCacheBuster}`;
                        }, 500);
                    };
                });
            }, (i / batchSize) * delayBetweenBatches);
        }
    }
    
    // Helper function to get hero display name (maps filename to display name)
    function getHeroDisplayName(heroName) {
        const heroDisplayNames = {
            'Soldier 76': 'Soldier: 76'
        };
        return heroDisplayNames[heroName] || heroName;
    }
    
    // Function to create filter buttons (with caching)
    function createFilterButtons(items, type, folder) {
        // Check if we have cached buttons
        if (buttonCache[type]) {
            filtersGrid.innerHTML = '';
            // Reuse cached buttons
            buttonCache[type].forEach(cachedBtn => {
                const filterKey = cachedBtn.dataset.filterKey;
                // Update selection state
                if (selectedFilters.has(filterKey)) {
                    cachedBtn.classList.add('selected');
                } else {
                    cachedBtn.classList.remove('selected');
                }
                filtersGrid.appendChild(cachedBtn);
            });
            updateFilterCounts();
            return;
        }
        
        // Create new buttons and cache them
        filtersGrid.innerHTML = '';
        const cachedButtons = [];
        
        items.forEach(item => {
            const filterBtn = document.createElement('div');
            filterBtn.className = 'filter-btn';
            
            // Get the filter key and display name based on type
            let filterKey, displayName;
            if (type === 'factions') {
                filterKey = item.filename;
                displayName = item.displayName;
            } else if (type === 'music') {
                filterKey = `Music/${item.filename}`;
                displayName = item.name;
            } else {
                // heroes - use original name for filterKey (image loading), but display name for label
                filterKey = item;
                displayName = getHeroDisplayName(item);
            }
            
            filterBtn.dataset.filterType = type;
            filterBtn.dataset.filterKey = filterKey;
            
            // Image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'filter-image-container';
            
            const img = document.createElement('img');
            // Use aggressive cache busting (same as music) to ensure latest images load
            const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // For music, use Music Icons folder with the filename (without extension), encoded for URLs
            if (type === 'music') {
                const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                const encodedIconName = encodeURIComponent(iconName);
                img.src = `Music Icons/${encodedIconName}.png?v=${imageCacheBuster}`;
            } else if (type === 'factions') {
                // Encode faction filename to handle spaces and special characters
                const encodedFilename = encodeURIComponent(filterKey);
                const imagePath = `${folder}/${encodedFilename}.png?v=${imageCacheBuster}`;
                img.src = imagePath;
                console.log(`[DEBUG] Loading faction image: ${imagePath} (filterKey: ${filterKey})`);
            } else {
                // heroes - encode to handle any special characters
                const encodedHeroName = encodeURIComponent(filterKey);
                img.src = `${folder}/${encodedHeroName}.png?v=${imageCacheBuster}`;
            }
            
            img.alt = displayName;
            img.onerror = function() {
                // Retry with a new cache buster after a delay
                const retryDelay = 300;
                const retryCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                setTimeout(() => {
                    if (type === 'music') {
                        const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                        const encodedIconName = encodeURIComponent(iconName);
                        this.src = `Music Icons/${encodedIconName}.png?v=${retryCacheBuster}`;
                    } else if (type === 'factions') {
                        // Encode faction filename to handle spaces and special characters
                        const encodedFilename = encodeURIComponent(filterKey);
                        const retryPath = `${folder}/${encodedFilename}.png?v=${retryCacheBuster}`;
                        console.log(`[DEBUG] Retrying faction image: ${retryPath}`);
                        this.src = retryPath;
                    } else {
                        // heroes - encode to handle any special characters
                        const encodedHeroName = encodeURIComponent(filterKey);
                        this.src = `${folder}/${encodedHeroName}.png?v=${retryCacheBuster}`;
                    }
                }, retryDelay);
                
                // If image fails to load, try alternative encodings for GitHub Pages compatibility
                if (type === 'music') {
                    const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                    const originalSrc = this.src;
                    console.warn(`[DEBUG] Filter image failed to load: ${originalSrc}`);
                    
                    // Try with different encoding (some servers handle spaces differently)
                    const altEncoded = iconName.replace(/\s+/g, '%20');
                    if (this.src !== `Music Icons/${altEncoded}.png?v=${imageCacheBuster}`) {
                        this.src = `Music Icons/${altEncoded}.png?v=${imageCacheBuster}`;
                        return; // Let it try again with this encoding
                    }
                } else if (type === 'factions' || type === 'heroes') {
                    // Try alternative encoding for heroes/factions
                    const originalSrc = this.src;
                    console.warn(`[DEBUG] Filter image failed to load: ${originalSrc} (type: ${type}, filterKey: ${filterKey})`);
                    
                    // Try with space replacement encoding
                    const altEncoded = filterKey.replace(/\s+/g, '%20');
                    const altCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const altPath = `${folder}/${altEncoded}.png?v=${altCacheBuster}`;
                    console.log(`[DEBUG] Trying alternative encoding: ${altPath}`);
                    if (this.src !== altPath) {
                        this.src = altPath;
                        return; // Let it try again with this encoding
                    }
                }
                
                // If still fails, hide the image but keep the button visible
                console.error(`[DEBUG] Filter image failed to load after retries: ${this.src} (type: ${type}, filterKey: ${filterKey}, folder: ${folder})`);
                this.style.display = 'none';
                // Don't hide the entire button, just the image - show placeholder background
                if (this.parentElement) {
                    this.parentElement.style.background = 'rgba(255, 0, 0, 0.3)'; // Red tint to indicate missing image
                }
            };
            
            imageContainer.appendChild(img);
            
            // Label
            const label = document.createElement('div');
            label.className = 'filter-label';
            label.textContent = displayName;
            
            filterBtn.appendChild(imageContainer);
            filterBtn.appendChild(label);
            
            // Check if this filter is already selected
            if (selectedFilters.has(filterKey)) {
                filterBtn.classList.add('selected');
            }
            
            // Toggle selection on click
            filterBtn.addEventListener('click', function() {
                if (selectedFilters.has(filterKey)) {
                    selectedFilters.delete(filterKey);
                    filterBtn.classList.remove('selected');
                    if (window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('filterOff');
                    }
                } else {
                    selectedFilters.add(filterKey);
                    filterBtn.classList.add('selected');
                    if (window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('filterPick');
                    }
                }
                updateFilterCounts(); // Update counts after selection change
            });
            
            filtersGrid.appendChild(filterBtn);
            cachedButtons.push(filterBtn);
        });
        
        // Cache the buttons
        buttonCache[type] = cachedButtons;
        
        // Preload images for the other type in background
        if (type === 'heroes' && factions.length > 0) {
            setTimeout(() => preloadImages(factions, 'factions', 'Factions'), 100);
        } else if (type === 'factions' && heroes.length > 0) {
            setTimeout(() => preloadImages(heroes, 'heroes', 'Heroes'), 100);
        }
        
        updateFilterCounts(); // Update counts when buttons are created
    }
    
    // Initialize will happen after manifest loads
    
    // Tab switching
    const heroesTab = document.getElementById('heroesTab');
    const factionsTab = document.getElementById('factionsTab');
    
    if (heroesTab) {
        heroesTab.addEventListener('click', function() {
            currentFilterType = 'heroes';
            heroesTab.classList.add('active');
            factionsTab.classList.remove('active');
            createFilterButtons(heroes, 'heroes', 'Heroes');
            updateFilterCounts(); // Update counts when switching tabs
        });
    }
    
    if (factionsTab) {
        factionsTab.addEventListener('click', function() {
            currentFilterType = 'factions';
            factionsTab.classList.add('active');
            heroesTab.classList.remove('active');
            createFilterButtons(factions, 'factions', 'Factions');
            updateFilterCounts(); // Update counts when switching tabs
        });
    }
    
    // Open filters panel - use mousedown to prevent globe interaction
    if (filtersButton) {
        // Handle button click/touch - unified handler
        const handleFiltersToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            console.log('Filters button clicked!');
            
            // Play filter button sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('filterButton');
            }
            
            // Close music panel if open
            const musicPanel = document.getElementById('musicPanel');
            const musicButton = document.getElementById('musicToggle');
            if (musicPanel && musicPanel.classList.contains('open')) {
                musicPanel.classList.remove('open');
                if (musicButton) {
                    musicButton.classList.remove('active');
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
            
            // Toggle panel (open if closed, close if open)
            const isOpening = !filtersPanel.classList.contains('open');
            filtersPanel.classList.toggle('open');
            console.log('Panel open state:', filtersPanel.classList.contains('open'));
            
            if (isOpening) {
                // When opening, initialize selectedFilters from confirmed filters
                const confirmedFilters = getConfirmedFilters();
                selectedFilters.clear();
                confirmedFilters.forEach(filter => selectedFilters.add(filter));
                
                // Update button states for current tab
                if (currentFilterType === 'heroes') {
                    createFilterButtons(heroes, 'heroes', 'Heroes');
                } else {
                    createFilterButtons(factions, 'factions', 'Factions');
                }
            } else {
                // When closing via toggle button, reset to confirmed state
                resetToConfirmedFilters();
            }
            
            // Update button active state
            if (filtersPanel.classList.contains('open')) {
                filtersButton.classList.add('active');
            } else {
                filtersButton.classList.remove('active');
            }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        filtersButton.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        filtersButton.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        filtersButton.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        filtersButton.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleFiltersToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        filtersButton.addEventListener('click', handleFiltersToggle);
    } else {
        console.error('Filters button not found!');
    }
    
    // Close filters panel
    if (filtersPanelClose) {
        filtersPanelClose.addEventListener('click', function() {
            // Play filter button sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('filterButton');
            }
            
            // Reset to confirmed filters before closing
            resetToConfirmedFilters();
            
            filtersPanel.classList.remove('open');
            // Update button active state
            if (filtersButton) {
                filtersButton.classList.remove('active');
            }
        });
    }
    
    // Clear button (unselect all and unlock all events)
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            window.SoundEffectsManager.play('filterClear');
            selectedFilters.clear();
            const filterButtons = filtersGrid.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Clear filters and unlock all events
            if (window.globeController && window.globeController.globeView) {
                const sceneModel = window.globeController.sceneModel;
                if (sceneModel) {
                    sceneModel.activeFilters.clear();
                    // Unlock all events
                    window.globeController.globeView.unlockAllEvents();
                }
            }
            
            // Refresh current view to update button states
            if (currentFilterType === 'heroes' && heroes.length > 0) {
                createFilterButtons(heroes, 'heroes', 'Heroes');
            } else if (currentFilterType === 'factions' && factions.length > 0) {
                createFilterButtons(factions, 'factions', 'Factions');
            }
        });
    }
    
    // Confirm button - applies filters and closes panel immediately
    if (confirmFiltersBtn) {
        confirmFiltersBtn.addEventListener('click', function() {
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('filterConfirm');
            }
            // Close panel first
            filtersPanel.classList.remove('open');
            if (filtersButton) {
                filtersButton.classList.remove('active');
            }
            
            // Apply filters to events immediately
            if (window.globeController && window.globeController.globeView) {
                // Store selected filters in sceneModel
                const sceneModel = window.globeController.sceneModel;
                if (sceneModel) {
                    sceneModel.activeFilters = new Set(selectedFilters);
                    // Apply filters to event markers
                    window.globeController.globeView.applyFilters();
                }
            }
            
            console.log('Selected filters:', Array.from(selectedFilters));
        });
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (filtersPanel && filtersPanel.classList.contains('open')) {
            if (!filtersPanel.contains(e.target) && 
                !filtersButton.contains(e.target) && 
                e.target !== filtersButton) {
                // Reset to confirmed filters before closing
                resetToConfirmedFilters();
                
                filtersPanel.classList.remove('open');
                // Update button active state
                if (filtersButton) {
                    filtersButton.classList.remove('active');
                }
            }
        }
    });
}

// Optional: Add keyboard shortcut to close modal (ESC key)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Color Palette Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    
    const colorPaletteToggle = document.getElementById('colorPaletteToggle');
    if (!colorPaletteToggle) return;
    
    // Create palette menu if it doesn't exist
    let paletteMenu = document.getElementById('paletteMenu');
    if (!paletteMenu) {
        paletteMenu = document.createElement('div');
        paletteMenu.id = 'paletteMenu';
        paletteMenu.className = 'palette-menu';
        
        // Blue palette option button
        const blueBtn = document.createElement('button');
        blueBtn.className = 'palette-option-btn blue';
        blueBtn.dataset.palette = 'blue';
        blueBtn.title = 'Blue Palette';
        paletteMenu.appendChild(blueBtn);
        
        // Black/Gray palette option button
        const blackBtn = document.createElement('button');
        blackBtn.className = 'palette-option-btn black';
        blackBtn.dataset.palette = 'gray';
        blackBtn.title = 'Gray Palette';
        paletteMenu.appendChild(blackBtn);
        
        document.body.appendChild(paletteMenu);
    }
    
    // Load saved color palette preference (default to blue if not set)
    const savedPalette = localStorage.getItem('colorPalette');
    if (savedPalette === 'gray') {
        document.body.classList.add('color-palette-gray');
        updatePaletteMenuActiveState('gray');
    } else {
        // Default to blue palette
        document.body.classList.remove('color-palette-gray');
        updatePaletteMenuActiveState('blue');
    }
    
    // Update icon on initial load
    updatePaletteButtonIcon(savedPalette === 'gray' ? 'gray' : 'blue');
    
    // Function to update palette button icon based on active palette
    function updatePaletteButtonIcon(palette) {
        const colorPaletteToggle = document.getElementById('colorPaletteToggle');
        if (!colorPaletteToggle) return;
        
        const iconSpan = colorPaletteToggle.querySelector('#colorPaletteIcon');
        if (!iconSpan) return;
        
        const iconPath = palette === 'gray' ? 'Icons/Dark Palette Icon.png' : 'Icons/Blue Palette Icon.png';
        
        // Check if img already exists, update src; otherwise create new img
        let img = iconSpan.querySelector('img');
        if (img) {
            img.src = iconPath;
            img.alt = 'Color Palette';
        } else {
            iconSpan.innerHTML = `<img src="${iconPath}" alt="Color Palette" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
    }
    
    // Function to update active state of palette menu buttons
    function updatePaletteMenuActiveState(palette) {
        const menu = document.getElementById('paletteMenu');
        if (!menu) return;
        
        const buttons = menu.querySelectorAll('.palette-option-btn');
        buttons.forEach(btn => {
            if (btn.dataset.palette === palette) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update palette button icon
        updatePaletteButtonIcon(palette);
    }
    
    // Function to change palette
    function changePalette(palette) {
        const isGray = palette === 'gray';
        
        if (isGray) {
            document.body.classList.add('color-palette-gray');
        } else {
            document.body.classList.remove('color-palette-gray');
        }
        
        updatePaletteMenuActiveState(palette);
        
        // Save preference
        localStorage.setItem('colorPalette', palette);
        
        // Change globe texture (only on pages with globe)
        if (window.globeController && window.globeController.globeView) {
            const texturePath = isGray ? 'Maps/MAP Black.png' : 'Maps/MAP.png';
            window.globeController.globeView.changeGlobeTexture(texturePath);
            
            // Change Moon and Mars textures
            const moonTexturePath = isGray ? 'Misc/Moon_Dark.png' : 'Misc/Moon.png';
            const marsTexturePath = isGray ? 'Misc/Mars_Dark.png' : 'Misc/Mars.png';
            window.globeController.globeView.changeMoonTexture(moonTexturePath);
            window.globeController.globeView.changeMarsTexture(marsTexturePath);
        }
        
        // Change scene background color (starfield background) (only on pages with globe)
        if (window.globeController && window.globeController.sceneModel) {
            const bgColor = isGray ? 0x0f0f0f : 0x050d18; // Darker gray/blue than panels for contrast
            window.globeController.sceneModel.setBackgroundColor(bgColor);
        }
        
        // Play sound effect if available
        if (window.SoundEffectsManager) {
            console.log('Attempting to play colorChange sound...');
            console.log('Available sounds:', Object.keys(window.SoundEffectsManager.sounds || {}));
            
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                const result = window.SoundEffectsManager.play('colorChange');
                if (!result) {
                    console.warn('Failed to play colorChange sound');
                }
            } else {
                console.warn('colorChange sound not loaded. Attempting to load now...');
                // Load and play if not already loaded
                window.SoundEffectsManager.loadSound('colorChange', 'Sound Effects/Color Change.mp3');
                setTimeout(() => {
                    if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                        console.log('colorChange sound loaded, playing now...');
                        window.SoundEffectsManager.play('colorChange');
                    } else {
                        console.error('Failed to load Color Change sound effect. Check if file exists at: Sound Effects/Color Change.mp3');
                    }
                }, 100);
            }
        } else {
            console.warn('SoundEffectsManager not available');
        }
        
        // Close menu after selection
        closePaletteMenu();
    }
    
    // Handle palette button click - toggle menu
    colorPaletteToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const menu = document.getElementById('paletteMenu');
        if (!menu) return;
        
        if (menu.classList.contains('open')) {
            closePaletteMenu();
        } else {
            openPaletteMenu();
        }
    });
    
    // Handle palette option button clicks
    const optionButtons = paletteMenu.querySelectorAll('.palette-option-btn');
    optionButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const palette = this.dataset.palette;
            if (palette) {
                changePalette(palette);
            }
        });
    });
    
    // Open palette menu
    function openPaletteMenu() {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        if (menu) {
            menu.classList.add('open');
        }
        if (toggle) {
            toggle.classList.add('active');
        }
    }
    
    // Close palette menu
    function closePaletteMenu() {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        if (menu) {
            menu.classList.remove('open');
        }
        if (toggle) {
            toggle.classList.remove('active');
        }
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        
        if (menu && menu.classList.contains('open')) {
            // Check if click is outside both menu and toggle button
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                closePaletteMenu();
            }
        }
    });
});


