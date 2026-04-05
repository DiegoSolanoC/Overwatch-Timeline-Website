/**
 * MusicManagerInitHelpers - Extracted from MusicManager.init() per deslop
 * (Small Functions, Separation of Concerns). Keeps MusicManager under ~500 lines.
 */

(function () {
    'use strict';

    function phIsAmbient(PH, path) {
        if (!path) return false;
        if (PH && typeof PH.isAmbientPath === 'function') return PH.isAmbientPath(path);
        return path.indexOf('Default.ogg') !== -1;
    }

    function phIsStartup(PH, path) {
        if (!path) return false;
        if (PH && typeof PH.isStartupThemePath === 'function') return PH.isStartupThemePath(path);
        return path.indexOf('/Themes/') !== -1;
    }

    function setupFadeAndEndBehavior(manager, opts) {
        var fadeIn = opts.fadeIn;
        var fadeOut = opts.fadeOut;
        var playNextSong = opts.playNextSong;
        var transitionToAmbient = opts.transitionToAmbient;
        var bg = manager.backgroundMusic;
        var progress = manager.progressService;
        var shuffle = manager.shuffleService;
        var vol = manager.volumeService;

        bg.addEventListener('timeupdate', function () {
            if (manager._musicMode === 'ambient' || manager._musicMode === 'startup') return;
            if (progress.isInteracting()) return;
            var fadeDuration = 2000;
            var timeRemaining = bg.duration - bg.currentTime;
            if (timeRemaining <= (fadeDuration / 1000) && timeRemaining > 0.1 && !vol.isFading()) {
                fadeOut();
            }
        });

        bg.addEventListener('ended', function () {
            if (manager._musicMode === 'startup' && transitionToAmbient) {
                transitionToAmbient();
                return;
            }
            if (manager.isLooping && manager._musicMode === 'catalog' && !shuffle.isShuffling) {
                bg.currentTime = 0;
                bg.play();
                return;
            }
            if (shuffle.isShuffling && shuffle.shuffleQueue.length > 0) {
                playNextSong();
                return;
            }
            if (manager._musicMode === 'catalog' && transitionToAmbient) {
                transitionToAmbient();
            }
        });
    }

    function createPlayMusic(manager) {
        var bg = manager.backgroundMusic;
        var shuffle = manager.shuffleService;
        var progress = manager.progressService;
        var playback = manager.playbackService;
        var fileSvc = manager.fileService;
        var vol = manager.volumeService;

        var fadeIn = function () {
            manager.volumeService.fadeIn(progress.isSeeking, progress.isDragging);
        };

        return function playMusic(songPath) {
            if (songPath) {
                var P = (typeof window !== 'undefined' && window.MusicPaletteDefaultHelpers)
                    ? window.MusicPaletteDefaultHelpers
                    : null;
                if (P && P.isStartupThemePath(songPath)) {
                    manager._musicMode = 'startup';
                } else if (P && P.isAmbientPath(songPath)) {
                    manager._musicMode = 'ambient';
                } else {
                    manager._musicMode = 'catalog';
                }

                if (manager._musicMode !== 'catalog') {
                    manager.isLooping = false;
                    var loopBtnClear = document.getElementById('loopBtn');
                    if (loopBtnClear) loopBtnClear.classList.remove('active');
                    if (manager.iconService) manager.iconService.updateLoopIcon(false);
                }

                if (manager._musicMode === 'startup') {
                    bg.loop = false;
                } else if (manager._musicMode === 'ambient') {
                    bg.loop = true;
                } else {
                    bg.loop = !!(manager.isLooping && !shuffle.isShuffling);
                }

                var progressBar = document.getElementById('musicProgressBar');
                if (progressBar) progressBar.value = 0;

                var loopOverride =
                    manager._musicMode === 'startup' ? false
                        : (manager._musicMode === 'ambient' ? true
                            : !!(manager.isLooping && !shuffle.isShuffling));
                manager.playbackService.loadSong(songPath, shuffle.isShuffling, function (duration, readyState) {
                    manager.progressService.updateProgressBar();
                    if (progressBar) progressBar.value = 0;
                }, loopOverride);

                manager.currentSong = songPath;
                playback.setCurrentSong(songPath);
                manager.updateNowPlaying();
                fileSvc.updateSelectedButton(songPath, function (btnPath, sPath) {
                    return playback.matchesSongPath(btnPath, sPath);
                });
            }
            manager.playbackService.play(function () {
                fadeIn();
                manager.progressService.updateProgressBar();
            });
        };
    }

    function createPlayNextSong(manager, playMusic) {
        var playback = manager.playbackService;
        var shuffle = manager.shuffleService;

        return function playNextSong() {
            var nextSong = null;
            var bg = manager.backgroundMusic;

            // Skip / next: loop beats shuffle on catalog; restart same track when looping.
            if (manager._musicMode === 'catalog' && manager.isLooping) {
                if (bg && manager.currentSong) {
                    try {
                        bg.currentTime = 0;
                        var restartPlay = bg.play();
                        if (restartPlay !== undefined) {
                            restartPlay.catch(function () {});
                        }
                    } catch (e) { /* ignore */ }
                    if (manager.progressService && manager.progressService.updateProgressBar) {
                        manager.progressService.updateProgressBar();
                    }
                    if (typeof manager.saveMusicState === 'function') {
                        manager.saveMusicState();
                    }
                }
                return;
            }

            if (shuffle.isShuffling) {
                // If shuffle was enabled before the manifest finished loading, the queue can be empty.
                // Ensure it's built from the latest musicFiles/currentSong.
                if (!shuffle.shuffleQueue || shuffle.shuffleQueue.length === 0) {
                    shuffle.enableShuffle(manager.musicFiles || [], manager.currentSong);
                }
                // Use the shuffle service as the source of truth for advancing the queue.
                nextSong = shuffle.getNextSong();
            } else if (manager._musicMode === 'catalog' && !shuffle.isShuffling && !manager.isLooping) {
                if (typeof manager._transitionToAmbientLoop === 'function') {
                    manager._transitionToAmbientLoop();
                }
                return;
            } else {
                nextSong = playback.getNextSong(false, null, 0);
            }

            if (nextSong && nextSong.filename) {
                playMusic('assets/audio/music/' + nextSong.filename);
            }
        };
    }

    function restoreMusicState(manager) {
        var musicState = manager.stateService.loadState();
        if (!musicState) return false;

        var PH = (typeof window !== 'undefined' && window.MusicPaletteDefaultHelpers)
            ? window.MusicPaletteDefaultHelpers
            : null;

        // Site ambience alone is not a "recall" — full visit should begin with palette startup, then ambient.
        if (musicState.currentSong && phIsAmbient(PH, musicState.currentSong) && !phIsStartup(PH, musicState.currentSong)) {
            return false;
        }

        function finalizeLoopUi(m) {
            var loopBtn = document.getElementById('loopBtn');
            if (loopBtn) loopBtn.classList.toggle('active', !!m.isLooping);
            if (m.iconService) m.iconService.updateLoopIcon(!!m.isLooping);
        }

        try {
            if (musicState.isShuffling && musicState.shuffleQueue && manager.musicFiles.length > 0) {
                manager.shuffleService.restoreShuffleState(
                    manager.musicFiles,
                    musicState.shuffleQueue,
                    musicState.currentSongIndex
                );
                var shuffleBtn = document.getElementById('shuffleBtn');
                if (shuffleBtn) shuffleBtn.classList.add('active');
            }

            manager.isLooping = !manager.shuffleService.isShuffling && !!musicState.isLooping;

            if (musicState.volume !== undefined) {
                manager.volumeService.setTargetVolume(musicState.volume);
                manager.backgroundMusic.volume = musicState.volume;
                var vs = document.getElementById('volumeSlider');
                var vv = document.getElementById('volumeValue');
                if (vs) vs.value = Math.round(musicState.volume * 100);
                if (vv) vv.textContent = Math.round(musicState.volume * 100) + '%';
            }

            if (musicState.muted !== undefined) {
                manager.backgroundMusic.muted = musicState.muted;
                manager.iconService.updateMuteIcon(musicState.muted);
                if (manager.muteBtn) {
                    manager.muteBtn.classList.toggle('active', !!musicState.muted);
                }
            }

            if (musicState.currentSong) {
                var rawSong = musicState.currentSong;
                var isAmbient = phIsAmbient(PH, rawSong);
                var isStartup = phIsStartup(PH, rawSong);

                function clearShuffleUiIfNeeded() {
                    if (isAmbient || isStartup) {
                        if (manager.shuffleService.isShuffling) {
                            manager.shuffleService.disableShuffle();
                            var shuffleBtn = document.getElementById('shuffleBtn');
                            if (shuffleBtn) shuffleBtn.classList.remove('active');
                            manager.iconService.updateShuffleIcon(false);
                        }
                    }
                }

                if (isAmbient || isStartup) {
                    manager.isLooping = false;
                    clearShuffleUiIfNeeded();
                    manager._musicMode = isAmbient ? 'ambient' : 'startup';
                    manager.currentSong = rawSong;
                    manager.playbackService.setCurrentSong(manager.currentSong);
                    var encSpec = manager.playbackService.encodeMusicPath(manager.currentSong);
                    manager.backgroundMusic.src = encSpec;
                    manager.backgroundMusic.loop = isAmbient;
                    manager.backgroundMusic.load();

                    manager.updateNowPlaying();
                    manager.fileService.updateSelectedButton(
                        manager.currentSong,
                        function (btnPath, songPath) {
                            return manager.playbackService.matchesSongPath(btnPath, songPath);
                        }
                    );

                    var musicStateRef2 = musicState;
                    var restorePosition2 = function () {
                        if (manager.backgroundMusic.readyState >= 2) {
                            if (musicStateRef2.currentTime !== undefined && musicStateRef2.currentTime > 0) {
                                manager.backgroundMusic.currentTime = musicStateRef2.currentTime;
                            }
                            if (musicStateRef2.paused) {
                                manager.backgroundMusic.pause();
                                manager.iconService.updatePauseIcon(true);
                                if (manager.pauseBtn) manager.pauseBtn.classList.add('active');
                            } else {
                                setTimeout(function () {
                                    var p2 = manager.backgroundMusic.play();
                                    if (p2 !== undefined) {
                                        p2.then(function () {
                                            manager.iconService.updatePauseIcon(false);
                                            if (manager.pauseBtn) manager.pauseBtn.classList.remove('active');
                                        }).catch(function () {
                                            manager.backgroundMusic.pause();
                                            manager.iconService.updatePauseIcon(true);
                                            if (manager.pauseBtn) manager.pauseBtn.classList.add('active');
                                        });
                                    }
                                }, 100);
                            }
                            manager.backgroundMusic.removeEventListener('loadedmetadata', restorePosition2);
                            manager.backgroundMusic.removeEventListener('canplay', restorePosition2);
                        }
                    };

                    manager.backgroundMusic.addEventListener('loadedmetadata', restorePosition2);
                    manager.backgroundMusic.addEventListener('canplay', restorePosition2);

                    setTimeout(function () {
                        if (manager.backgroundMusic.readyState >= 2) {
                            if (musicStateRef2.currentTime !== undefined && musicStateRef2.currentTime > 0) {
                                manager.backgroundMusic.currentTime = musicStateRef2.currentTime;
                            }
                            if (musicStateRef2.paused) {
                                manager.backgroundMusic.pause();
                                manager.iconService.updatePauseIcon(true);
                                if (manager.pauseBtn) manager.pauseBtn.classList.add('active');
                            } else {
                                manager.backgroundMusic.play().catch(function () {});
                            }
                        }
                    }, 1000);

                    finalizeLoopUi(manager);
                    return true;
                }

                if (manager.musicFiles.length > 0) {
                    var songToRestore = manager.musicFiles.find(function (s) {
                        var statePath = musicState.currentSong || '';
                        return statePath.endsWith('/' + s.filename) || decodeURIComponent(statePath).endsWith('/' + s.filename);
                    });

                    if (songToRestore) {
                        manager._musicMode = 'catalog';
                        manager.currentSong = 'assets/audio/music/' + songToRestore.filename;
                        manager.playbackService.setCurrentSong(manager.currentSong);

                        var encodedPath = manager.playbackService.encodeMusicPath(manager.currentSong);
                        manager.backgroundMusic.src = encodedPath;
                        manager.backgroundMusic.loop = !!(manager.isLooping && !manager.shuffleService.isShuffling);
                        manager.backgroundMusic.load();

                        manager.updateNowPlaying();
                        manager.fileService.updateSelectedButton(
                            manager.currentSong,
                            function (btnPath, songPath) {
                                return manager.playbackService.matchesSongPath(btnPath, songPath);
                            }
                        );

                        var musicStateRef = musicState;
                        var restorePosition = function () {
                            if (manager.backgroundMusic.readyState >= 2) {
                                if (musicStateRef.currentTime !== undefined && musicStateRef.currentTime > 0) {
                                    manager.backgroundMusic.currentTime = musicStateRef.currentTime;
                                }
                                if (musicStateRef.paused) {
                                    manager.backgroundMusic.pause();
                                    manager.iconService.updatePauseIcon(true);
                                    if (manager.pauseBtn) manager.pauseBtn.classList.add('active');
                                } else {
                                    setTimeout(function () {
                                        var p = manager.backgroundMusic.play();
                                        if (p !== undefined) {
                                            p.then(function () {
                                                manager.iconService.updatePauseIcon(false);
                                                if (manager.pauseBtn) manager.pauseBtn.classList.remove('active');
                                            }).catch(function (err) {
                                                manager.backgroundMusic.pause();
                                                manager.iconService.updatePauseIcon(true);
                                                if (manager.pauseBtn) manager.pauseBtn.classList.add('active');
                                            });
                                        }
                                    }, 100);
                                }
                                manager.backgroundMusic.removeEventListener('loadedmetadata', restorePosition);
                                manager.backgroundMusic.removeEventListener('canplay', restorePosition);
                            }
                        };

                        manager.backgroundMusic.addEventListener('loadedmetadata', restorePosition);
                        manager.backgroundMusic.addEventListener('canplay', restorePosition);

                        setTimeout(function () {
                            if (manager.backgroundMusic.readyState >= 2) {
                                if (musicStateRef.currentTime !== undefined && musicStateRef.currentTime > 0) {
                                    manager.backgroundMusic.currentTime = musicStateRef.currentTime;
                                }
                                if (musicStateRef.paused) {
                                    manager.backgroundMusic.pause();
                                    manager.iconService.updatePauseIcon(true);
                                    if (manager.pauseBtn) manager.pauseBtn.classList.add('active');
                                } else {
                                    manager.backgroundMusic.play().catch(function () {});
                                }
                            }
                        }, 1000);

                        finalizeLoopUi(manager);
                        return true;
                    }
                }
            }
            return false;
        } catch (e) {
            console.error('Error restoring music state:', e);
            return false;
        }
    }

    function loadMusicFiles(manager, playMusic) {
        var logAssetLoad = (typeof getLogAssetLoad !== 'undefined' && getLogAssetLoad) ? getLogAssetLoad() : function () {};

        return manager.fileService.loadMusicFiles().then(function (musicFiles) {
            if (!musicFiles || musicFiles.length === 0) {
                manager.musicGrid.innerHTML = '<div style="color: #ff6600; padding: 20px; text-align: center;">No music files found.<br><br>1. Add files to Music folder<br>2. Add icons to assets/images/music folder<br>3. Run: node generate-manifest.js<br>4. Refresh page</div>';
                return;
            }

            manager.musicFiles = musicFiles;
            manager.playbackService.setMusicFiles(musicFiles);

            var prioritySong = (typeof window !== 'undefined' && window.prioritySong) || null;
            if (prioritySong) {
                manager.fileService.preloadPrioritySong(prioritySong, function (path) {
                    return manager.playbackService.encodeMusicPath(path);
                });
            }

            manager.fileService.createMusicButtons(
                manager.musicGrid,
                manager.currentSong,
                function (songPath) {
                    playMusic(songPath);
                    manager.updateNowPlaying();
                    manager.saveMusicState();
                },
                function (path) { return manager.playbackService.encodeMusicPath(path); },
                function (btnPath, songPath) { return manager.playbackService.matchesSongPath(btnPath, songPath); }
            );

            manager.fileService.preloadAllMusic(function (path) {
                return manager.playbackService.encodeMusicPath(path);
            });

            var restored = manager.restoreMusicState();
            if (!restored && !manager.currentSong && manager.musicFiles.length > 0) {
                var PH0 = window.MusicPaletteDefaultHelpers;
                var themePath = PH0 && PH0.getStartupThemePath
                    ? PH0.getStartupThemePath(PH0.getActiveMusicPaletteKey())
                    : null;
                var onStartupErr = function () {
                    manager.backgroundMusic.removeEventListener('error', onStartupErr);
                    manager.backgroundMusic.removeEventListener('playing', onStartupPlaying);
                    if (manager._musicMode === 'startup' && typeof manager._transitionToAmbientLoop === 'function') {
                        manager._transitionToAmbientLoop();
                    }
                };
                var onStartupPlaying = function () {
                    manager.backgroundMusic.removeEventListener('error', onStartupErr);
                    manager.backgroundMusic.removeEventListener('playing', onStartupPlaying);
                };
                manager.backgroundMusic.addEventListener('error', onStartupErr);
                manager.backgroundMusic.addEventListener('playing', onStartupPlaying);
                if (themePath) {
                    playMusic(themePath);
                    manager.updateNowPlaying();
                } else if (typeof manager._transitionToAmbientLoop === 'function') {
                    manager.backgroundMusic.removeEventListener('error', onStartupErr);
                    manager._transitionToAmbientLoop();
                }
            } else if (restored) {
                logAssetLoad('MUSIC_PRIORITY', 'Music state restored successfully');
            }
        }).catch(function (err) {
            console.error('Error loading manifest.json:', err);
            try {
                if (typeof window !== 'undefined' && window.MusicStateService
                    && window.MusicStateService.isLocalDevHost()) {
                    manager.stateService.clearState();
                }
            } catch (e) { /* ignore */ }
            manager.musicGrid.innerHTML = '<div style="color: #ff6600; padding: 20px; text-align: center;">Error loading music. Run generate-manifest.js</div>';
        });
    }

    function setupPlayOnInteraction(manager, playMusic) {
        var events = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown', 'wheel'];
        var handler = function () {
            if (!manager.hasStartedPlaying && manager.backgroundMusic.paused && manager.currentSong) {
                playMusic();
                manager.hasStartedPlaying = true;
                events.forEach(function (ev) { document.removeEventListener(ev, handler); });
            }
        };
        events.forEach(function (ev) {
            document.addEventListener(ev, handler, { passive: true, once: false });
        });
        manager.backgroundMusic.addEventListener('playing', function () {
            manager.hasStartedPlaying = true;
            events.forEach(function (ev) { document.removeEventListener(ev, handler); });
        });
    }

    window.MusicManagerInitHelpers = {
        setupFadeAndEndBehavior: setupFadeAndEndBehavior,
        createPlayMusic: createPlayMusic,
        createPlayNextSong: createPlayNextSong,
        restoreMusicState: restoreMusicState,
        loadMusicFiles: loadMusicFiles,
        setupPlayOnInteraction: setupPlayOnInteraction
    };
})();
