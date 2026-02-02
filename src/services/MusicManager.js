/**
 * MusicManager - Manages music panel functionality
 * Coordinates music playback, shuffle, volume, progress bar, and state persistence
 * Init logic extracted to MusicManagerInitHelpers (deslop: Small Functions, SRP)
 */

if (typeof getLogAssetLoad === 'undefined') {
    var getLogAssetLoad = function () {
        return (typeof window !== 'undefined' && typeof window.logAssetLoad === 'function') 
            ? window.logAssetLoad 
            : function () {};
    };
}

class MusicManager {
    constructor() {
        this.initialized = false;
        this.currentSong = null;
        this.musicFiles = [];
        this.hasStartedPlaying = false;
        this.musicStateSaveTimeout = null;
        this.stateService = null;
        this.shuffleService = null;
        this.volumeService = null;
        this.progressService = null;
        this.playbackService = null;
        this.fileService = null;
        this.panelService = null;
        this.iconService = null;
        this.controlService = null;
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
        if (this.initialized && this.musicButton && this.musicPanel) {
            console.log('Music panel already initialized, skipping...');
            return;
        }
        
        var logAssetLoad = getLogAssetLoad();
        
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
            console.warn('MusicManager: Required DOM elements not found yet.');
            return;
        }
        
        this.initialized = true;
        console.log('MusicManager: Initializing with all elements present');
        
        // Sync sound effects slider with actual volume (slider is created with music panel, after SoundEffectsManager.init())
        if (window.SoundEffectsManager && typeof window.SoundEffectsManager.setupSoundEffectsSlider === 'function') {
            window.SoundEffectsManager.setupSoundEffectsSlider();
        }
        
        var missing = [];
        if (!window.MusicStateService) missing.push('MusicStateService');
        if (!window.MusicShuffleService) missing.push('MusicShuffleService');
        if (!window.MusicVolumeService) missing.push('MusicVolumeService');
        if (!window.MusicProgressService) missing.push('MusicProgressService');
        if (!window.MusicPlaybackService) missing.push('MusicPlaybackService');
        if (!window.MusicFileService) missing.push('MusicFileService');
        if (!window.MusicPanelService) missing.push('MusicPanelService');
        if (!window.MusicIconService) missing.push('MusicIconService');
        if (!window.MusicControlService) missing.push('MusicControlService');
        if (missing.length > 0) {
            console.error('MusicManager: Missing services:', missing);
            return;
        }
        
        var self = this;
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
            function () { return self.saveMusicState(); }
        );
        
        this.progressService.init();
        this.iconService.init();
        this.controlService.init();
        
        var savedState = this.stateService.loadState();
        var prioritySong = null;
        var initialVolume = 0.1;
        if (savedState) {
            if (savedState.currentSong) {
                prioritySong = savedState.currentSong;
                logAssetLoad('MUSIC_PRIORITY', 'Priority loading: ' + prioritySong);
            }
            if (savedState.volume !== undefined && savedState.volume > 0) {
                initialVolume = savedState.volume;
            }
        }
        window.prioritySong = prioritySong;
        
        this.volumeService.setTargetVolume(initialVolume);
        this.backgroundMusic.volume = initialVolume;
        if (this.volumeSlider) this.volumeSlider.value = Math.round(initialVolume * 100);
        if (this.volumeValue) this.volumeValue.textContent = Math.round(initialVolume * 100) + '%';
        
        var fadeIn = function () {
            self.volumeService.fadeIn(self.progressService.isSeeking, self.progressService.isDragging);
        };
        var fadeOut = function () {
            self.volumeService.fadeOut(
                self.progressService.isSeeking,
                self.progressService.isDragging,
                function () {
                    if (!self.shuffleService.isShuffling && self.backgroundMusic.loop && !self.progressService.isInteracting()) {
                        self.backgroundMusic.currentTime = 0;
                        setTimeout(function () {
                            if (!self.backgroundMusic.paused && !self.progressService.isInteracting()) {
                                fadeIn();
                            }
                        }, 50);
                    }
                }
            );
        };
        
        var H = window.MusicManagerInitHelpers || {};
        var playMusic = H.createPlayMusic ? H.createPlayMusic(this) : (function () {
            console.warn('MusicManagerInitHelpers not loaded');
            return function () {};
        })();
        var playNextSong = H.createPlayNextSong ? H.createPlayNextSong(this, playMusic) : function () {};

        if (H.setupFadeAndEndBehavior) {
            H.setupFadeAndEndBehavior(this, { fadeIn: fadeIn, fadeOut: fadeOut, playNextSong: playNextSong });
        }

        window.encodeMusicPath = function (path) { return self.playbackService.encodeMusicPath(path); };

        this.controlService.setupAllControls(this.musicFiles, this.currentSong, playNextSong);

        this.backgroundMusic.addEventListener('play', function () {
            if (self.pauseBtn) {
                self.pauseBtn.classList.remove('active');
                self.iconService.updatePauseIcon(false);
            }
        });
        this.backgroundMusic.addEventListener('pause', function () {
            if (self.pauseBtn) {
                self.pauseBtn.classList.add('active');
                self.iconService.updatePauseIcon(true);
            }
        });

        var getCurrentSongName = function () {
            if (!self.currentSong) return 'No song playing';
            var s = self.musicFiles.find(function (e) {
                return self.currentSong && self.currentSong.endsWith('/' + e.filename);
            });
            return s ? s.name : 'Unknown';
        };

        this.updateNowPlaying = function () {
            var el = document.getElementById('musicCurrentSong');
            if (el) el.textContent = getCurrentSongName();
        };
        this.updateProgressBar = function () { self.progressService.updateProgressBar(); };
        this.formatTime = function (sec) { return self.progressService.formatTime(sec); };

        this.progressService.setupEventListeners(function () { self.saveMusicState(); });

        this.backgroundMusic.addEventListener('timeupdate', function () {
            if (!self.progressService.isInteracting()) {
                self.updateProgressBar();
            }
            if (!self.musicStateSaveTimeout) {
                self.musicStateSaveTimeout = setTimeout(function () {
                    self.saveMusicState();
                    self.musicStateSaveTimeout = null;
                }, 1000);
            }
        });

        window.addEventListener('beforeunload', function () {
            if (window.saveMusicState) window.saveMusicState();
        });

        this.saveMusicState = function () {
            if (!self.backgroundMusic) return;
            var st = self.stateService.buildState(
                self.backgroundMusic,
                self.currentSong,
                self.shuffleService.isShuffling,
                self.shuffleService.currentSongIndex,
                self.shuffleService.shuffleQueue
            );
            if (st) self.stateService.saveState(st);
        };
        window.saveMusicState = this.saveMusicState;
        
        this.restoreMusicState = function () {
            return (H.restoreMusicState && H.restoreMusicState(this)) || false;
        };

        this.createMusicButtons = function () {
            self.fileService.createMusicButtons(
                self.musicGrid,
                self.currentSong,
                function (songPath) {
                    playMusic(songPath);
                    self.updateNowPlaying();
                    self.saveMusicState();
                },
                function (path) { return self.playbackService.encodeMusicPath(path); },
                function (btnPath, songPath) { return self.playbackService.matchesSongPath(btnPath, songPath); }
            );
        };
        
        this.backgroundMusic.load();
        
        if (H.setupPlayOnInteraction) {
            H.setupPlayOnInteraction(this, playMusic);
        }

        if (!this.panelService || !this.musicButton) {
            console.error('MusicManager: panelService or musicButton is null');
            return;
        }
        this.panelService.setupToggleButton();
        this.panelService.setupCloseButton();
        this.panelService.setupClickOutsideHandler();
        
        this.controlService.initializeButtonStates();
        
        if (H.loadMusicFiles) {
            H.loadMusicFiles(this, playMusic);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicManager;
}
if (typeof window !== 'undefined') {
    window.MusicManager = new MusicManager();
}
