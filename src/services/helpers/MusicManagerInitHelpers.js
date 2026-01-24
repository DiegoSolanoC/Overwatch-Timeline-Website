/**
 * MusicManagerInitHelpers - Extracted from MusicManager.init() per deslop
 * (Small Functions, Separation of Concerns). Keeps MusicManager under ~500 lines.
 */

(function () {
    'use strict';

    function setupFadeAndEndBehavior(manager, opts) {
        var fadeIn = opts.fadeIn;
        var fadeOut = opts.fadeOut;
        var playNextSong = opts.playNextSong;
        var bg = manager.backgroundMusic;
        var progress = manager.progressService;
        var shuffle = manager.shuffleService;
        var vol = manager.volumeService;

        bg.addEventListener('timeupdate', function () {
            if (progress.isInteracting()) return;
            var fadeDuration = 2000;
            var timeRemaining = bg.duration - bg.currentTime;
            if (timeRemaining <= (fadeDuration / 1000) && timeRemaining > 0.1 && !vol.isFading()) {
                fadeOut();
            }
        });

        bg.addEventListener('ended', function () {
            if (shuffle.isShuffling && shuffle.shuffleQueue.length > 0) {
                playNextSong();
            } else if (!shuffle.isShuffling) {
                bg.currentTime = 0;
                bg.play();
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
                bg.loop = !shuffle.isShuffling;
                var progressBar = document.getElementById('musicProgressBar');
                if (progressBar) progressBar.value = 0;

                manager.playbackService.loadSong(songPath, shuffle.isShuffling, function (duration, readyState) {
                    manager.progressService.updateProgressBar();
                    if (progressBar) progressBar.value = 0;
                });

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
            var nextSong = playback.getNextSong(
                shuffle.isShuffling,
                shuffle.shuffleQueue,
                shuffle.currentSongIndex
            );
            if (nextSong) {
                if (shuffle.isShuffling) {
                    shuffle.currentSongIndex = (shuffle.currentSongIndex + 1) % shuffle.shuffleQueue.length;
                }
                playMusic('assets/audio/music/' + nextSong.filename);
            }
        };
    }

    function restoreMusicState(manager) {
        var musicState = manager.stateService.loadState();
        if (!musicState) return false;

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

            if (musicState.currentSong && manager.musicFiles.length > 0) {
                var songToRestore = manager.musicFiles.find(function (s) {
                    var statePath = musicState.currentSong || '';
                    return statePath.endsWith('/' + s.filename) || decodeURIComponent(statePath).endsWith('/' + s.filename);
                });

                if (songToRestore) {
                    manager.currentSong = 'assets/audio/music/' + songToRestore.filename;
                    manager.playbackService.setCurrentSong(manager.currentSong);

                    var encodedPath = manager.playbackService.encodeMusicPath(manager.currentSong);
                    manager.backgroundMusic.src = encodedPath;
                    manager.backgroundMusic.loop = !manager.shuffleService.isShuffling;
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

                    return true;
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
                playMusic('assets/audio/music/' + manager.musicFiles[0].filename);
                manager.updateNowPlaying();
            } else if (restored) {
                logAssetLoad('MUSIC_PRIORITY', 'Music state restored successfully');
            }
        }).catch(function (err) {
            console.error('Error loading manifest.json:', err);
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
