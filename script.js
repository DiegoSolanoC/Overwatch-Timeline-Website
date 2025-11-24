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
    window.location.href = 'index.html';
}

function showAbout() {
    window.location.href = 'about.html';
}

// Sound Effects Manager - make it globally accessible
window.SoundEffectsManager = {
    sounds: {},
    volume: 0.5, // Default 50%
    
    // Load a sound effect
    loadSound(name, path) {
        const audio = new Audio(path);
        audio.volume = this.volume;
        this.sounds[name] = audio;
        return audio;
    },
    
    // Play a sound effect
    play(name) {
        if (this.sounds[name]) {
            // Clone the audio to allow overlapping sounds
            const audio = this.sounds[name].cloneNode();
            // Filter confirm is always at 50% of the set volume
            if (name === 'filterConfirm') {
                audio.volume = this.volume * 0.5;
            } else {
                audio.volume = this.volume;
            }
            audio.play().catch(err => {
                console.warn(`Could not play sound effect "${name}":`, err);
            });
        } else {
            console.warn(`Sound effect "${name}" not loaded`);
        }
    },
    
    // Set volume for all sound effects
    setVolume(volume) {
        this.volume = volume;
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
        this.loadSound('filterPick', 'Sound Effects/Filter Pick.mp3');
        this.loadSound('filterOff', 'Sound Effects/Filter Off.mp3');
        // Filter confirm at reduced volume (50% of normal)
        const filterConfirmAudio = new Audio('Sound Effects/Filter Confirm.mp3');
        filterConfirmAudio.volume = this.volume * 0.5; // 50% of sound effects volume
        this.sounds['filterConfirm'] = filterConfirmAudio;
        this.loadSound('filterClear', 'Sound Effects/Filter Clear.mp3');
        this.loadSound('radiate', 'Sound Effects/Radiate.mp3');
        this.loadSound('page', 'Sound Effects/Page.mp3');
        this.loadSound('eventClick', 'Sound Effects/Event Click.mp3');
        this.loadSound('music', 'Sound Effects/Music.mp3');
        
        // Setup sound effects volume slider
        const soundEffectsSlider = document.getElementById('soundEffectsSlider');
        const soundEffectsVolumeValue = document.getElementById('soundEffectsVolumeValue');
        
        if (soundEffectsSlider && soundEffectsVolumeValue) {
            soundEffectsSlider.addEventListener('input', function() {
                const volume = this.value / 100;
                SoundEffectsManager.setVolume(volume);
                soundEffectsVolumeValue.textContent = this.value + '%';
            });
        }
    }
};

function showContact() {
    window.location.href = 'contact.html';
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

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    
    // Initialize sound effects manager
    if (window.SoundEffectsManager) {
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
    
    // Initialize Filters Panel - wait a bit to ensure all elements are loaded
    setTimeout(() => {
        initFiltersPanel();
        initMusicPanel();
    }, 100);
});

// Music Panel functionality - SIMPLIFIED VERSION
function initMusicPanel() {
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
    
    let currentSong = null;
    let musicFiles = [];
    let isShuffling = false;
    let shuffleQueue = [];
    let currentSongIndex = 0;
    let isDragging = false;
    
    // Set initial volume to 20%
    const initialVolume = 0.2;
    backgroundMusic.volume = initialVolume;
    if (volumeSlider) volumeSlider.value = 20;
    if (volumeValue) volumeValue.textContent = '20%';
    
    // Fade in/out variables
    let fadeInInterval = null;
    let fadeOutInterval = null;
    const fadeDuration = 2000; // 2 seconds fade
    const fadeSteps = 20;
    const fadeStepTime = fadeDuration / fadeSteps;
    let currentTargetVolume = initialVolume;
    
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
            
            // Update selected button
            document.querySelectorAll('.music-grid-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.songPath === songPath) {
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
                    shuffleBtnIcon.src = 'Shuffle Icon.png'; // Or 'Shuffle On Icon.png' if you have it
                }
            } else {
                shuffleQueue = [];
                this.classList.remove('active');
                if (shuffleBtnIcon) {
                    shuffleBtnIcon.src = 'Shuffle Icon.png';
                }
            }
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
    backgroundMusic.addEventListener('timeupdate', () => {
        // Don't update progress bar if user is seeking/dragging
        if (!isDragging && !isSeeking) {
            updateProgressBar();
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
    
    // Load music files from manifest
    async function loadMusicFiles() {
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
            
            if (manifest.music && manifest.music.length > 0) {
                musicFiles = manifest.music;
                console.log(`Loaded ${musicFiles.length} music files from manifest:`, musicFiles.map(s => s.name));
                createMusicButtons();
                
                // Preload all music files for faster switching
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
                
                // Play first song (should be Winston's Desk) by default if no song is playing
                if (!currentSong && musicFiles.length > 0) {
                    const firstSong = `Music/${musicFiles[0].filename}`;
                    playMusic(firstSong);
                    updateNowPlaying();
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
            
            // Check if this is the current song
            if (currentSong === `Music/${song.filename}`) {
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
        musicButton.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        musicButton.addEventListener('mouseup', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        musicButton.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        musicButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
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
        });
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
            pauseBtnIcon.src = isPaused ? 'Play Icon.png' : 'Pause Icon.png';
            pauseBtnIcon.alt = isPaused ? 'Play' : 'Pause';
        }
    }
    
    // Function to update mute/unmute icon
    function updateMuteIcon(isMuted) {
        if (muteBtnIcon) {
            muteBtnIcon.src = isMuted ? 'Muted Icon.png' : 'Unmuted Icon.png';
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
        console.error('Filters panel elements not found!');
        return;
    }
    
    // Load heroes and factions from manifest.json (dynamically generated from folders)
    let heroes = [];
    let factions = [];
    
    // Track selected filters (stores both heroes and factions)
    const selectedFilters = new Set();
    let currentFilterType = 'heroes'; // 'heroes' or 'factions'
    
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
                        imagePath = `${folder}/${item.filename}.png`;
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
                    // Use a single cache buster per batch to reduce unique requests
                    const imageCacheBuster = Date.now();
                    img.src = `${imagePath}?v=${imageCacheBuster}`;
                    
                    // Add error handling with retry
                    img.onerror = function() {
                        // Retry once after a delay
                        setTimeout(() => {
                            this.src = `${imagePath}?v=${Date.now()}`;
                        }, 500);
                    };
                });
            }, (i / batchSize) * delayBetweenBatches);
        }
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
                // heroes
                filterKey = item;
                displayName = item;
            }
            
            filterBtn.dataset.filterType = type;
            filterBtn.dataset.filterKey = filterKey;
            
            // Image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'filter-image-container';
            
            const img = document.createElement('img');
            // Use simpler cache busting (timestamp only, not random) to reduce unique requests
            const imageCacheBuster = Date.now();
            
            // For music, use Music Icons folder with the filename (without extension), encoded for URLs
            if (type === 'music') {
                const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                const encodedIconName = encodeURIComponent(iconName);
                img.src = `Music Icons/${encodedIconName}.png?v=${imageCacheBuster}`;
            } else {
                img.src = `${folder}/${filterKey}.png?v=${imageCacheBuster}`;
            }
            
            img.alt = displayName;
            img.onerror = function() {
                // Retry with a new timestamp after a delay
                const retryDelay = 300;
                setTimeout(() => {
                    if (type === 'music') {
                        const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                        const encodedIconName = encodeURIComponent(iconName);
                        this.src = `Music Icons/${encodedIconName}.png?v=${Date.now()}`;
                    } else {
                        this.src = `${folder}/${filterKey}.png?v=${Date.now()}`;
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
                }
                
                // If still fails, hide the button or show placeholder
                this.style.display = 'none';
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
        // Prevent button from interfering with globe controls
        filtersButton.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        filtersButton.addEventListener('mouseup', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        filtersButton.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        filtersButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Filters button clicked!');
            
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
            filtersPanel.classList.toggle('open');
            console.log('Panel open state:', filtersPanel.classList.contains('open'));
            // Update button active state
            if (filtersPanel.classList.contains('open')) {
                filtersButton.classList.add('active');
            } else {
                filtersButton.classList.remove('active');
            }
        });
    } else {
        console.error('Filters button not found!');
    }
    
    // Close filters panel
    if (filtersPanelClose) {
        filtersPanelClose.addEventListener('click', function() {
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


