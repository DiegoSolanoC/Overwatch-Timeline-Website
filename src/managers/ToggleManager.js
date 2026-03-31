/**
 * ToggleManager - Manages toggle button setup for auto-rotate and hyperloop
 */

export class ToggleManager {
    constructor(sceneModel) {
        this.sceneModel = sceneModel;
    }
    
    /**
     * Setup auto-rotate toggle
     */
    setupAutoRotateToggle() {
        const toggleBtn = document.getElementById('autoRotateToggle');
        if (!toggleBtn) return;
        
        const rotateIcon = document.getElementById('rotateIcon');
        const sceneModel = this.sceneModel;
        
        // Set initial state
        if (sceneModel.getAutoRotateEnabled()) {
            toggleBtn.classList.add('active');
        }
        
        // Ensure rotation icon always uses local image file
        if (rotateIcon) {
            rotateIcon.innerHTML = '<img src="assets/images/icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // Handle button click/touch - unified handler
        const handleToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            // Play rotation toggle sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('rotationToggle');
            }
            
            const enabled = !sceneModel.getAutoRotateEnabled();
            sceneModel.setAutoRotateEnabled(enabled);
            
            if (enabled) {
                toggleBtn.classList.add('active');
                sceneModel.setAutoRotate(true);
                // Clear any pending timeout
                const timeout = sceneModel.autoRotateTimeout;
                if (timeout) {
                    clearTimeout(timeout);
                    sceneModel.autoRotateTimeout = null;
                }
            } else {
                toggleBtn.classList.remove('active');
                sceneModel.setAutoRotate(false);
                // Clear any pending timeout
                const timeout = sceneModel.autoRotateTimeout;
                if (timeout) {
                    clearTimeout(timeout);
                    sceneModel.autoRotateTimeout = null;
                }
            }
            
            // Always keep the icon as an image, never change to emoji
            if (rotateIcon) {
                rotateIcon.innerHTML = '<img src="assets/images/icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
            }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        toggleBtn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        toggleBtn.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        toggleBtn.addEventListener('click', handleToggle);
    }

    /**
     * Setup hyperloop toggle
     * @param {Function} onToggle - Callback when toggle changes
     */
    setupHyperloopToggle(onToggle) {
        const toggleBtn = document.getElementById('hyperloopToggle');
        if (!toggleBtn) return;
        
        const hyperloopIcon = document.getElementById('hyperloopIcon');
        const sceneModel = this.sceneModel;
        
        // Set initial state
        if (sceneModel.getHyperloopVisible()) {
            toggleBtn.classList.add('active');
        }
        
        // Ensure hyperloop icon always uses local image file
        if (hyperloopIcon) {
            hyperloopIcon.innerHTML = '<img src="assets/images/icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // Handle button click/touch - unified handler
        const handleToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            // Play transport toggle sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('transportToggle');
            }
            
            const visible = !sceneModel.getHyperloopVisible();
            sceneModel.setHyperloopVisible(visible);
            
            if (visible) {
                toggleBtn.classList.add('active');
                console.log('🚄 Transport systems ENABLED (Trains, Planes)');
            } else {
                toggleBtn.classList.remove('active');
                console.log('⏸️ Transport systems DISABLED - all vehicles will finish invisibly, no new spawns');
            }
            
            // Always keep the icon as an image, never change to emoji
            if (hyperloopIcon) {
                hyperloopIcon.innerHTML = '<img src="assets/images/icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
            }
            
            if (onToggle) {
                onToggle();
            }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        toggleBtn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        toggleBtn.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        toggleBtn.addEventListener('click', handleToggle);
    }

    /**
     * Setup map view toggle (Earth globe <-> flat map)
     */
    setupMapViewToggle() {
        const toggleBtn = document.getElementById('mapViewToggle');
        if (!toggleBtn) return;

        const mapIcon = document.getElementById('mapViewToggleIcon');
        const sceneModel = this.sceneModel;
        const rotateBtn = document.getElementById('autoRotateToggle');
        const rotateBar = document.getElementById('headerRotateSubBar');

        const getBodyScale = () => {
            try {
                const t = window.getComputedStyle(document.body).transform;
                if (!t || t === 'none') return 1;
                const m = t.match(/^matrix\(([^)]+)\)$/);
                if (!m) return 1;
                const parts = m[1].split(',').map(s => parseFloat(s.trim()));
                const a = parts[0];
                return (Number.isFinite(a) && a > 0) ? a : 1;
            } catch (_) {
                return 1;
            }
        };

        const positionRotateBarUnderToggle = () => {
            if (!rotateBar) return;
            try {
                const gap = 0;
                // Desktop uses `body { transform: scale(...) }`. Align fixed elements by
                // converting viewport rect coordinates into the body's unscaled space.
                const scale = getBodyScale();
                const rect = toggleBtn.getBoundingClientRect();

                const margin = 8;
                const vw = Math.max(1, (window.innerWidth || 1) / scale);

                // Match the Map/Globe button box so the diagonals feel continuous.
                const width = rect.width / scale;
                // Tuck slightly under the header edge to avoid any visible gap line.
                const top = ((rect.bottom + gap) / scale) - 1;

                // Anchor under the Map/Globe button, but keep fully on-screen.
                let left = rect.left / scale;
                if (left + width > vw - margin) left = Math.max(margin, vw - margin - width);
                if (left < margin) left = margin;

                rotateBar.style.left = `${left}px`;
                rotateBar.style.top = `${top}px`;
                rotateBar.style.width = `${width}px`;
                rotateBar.style.right = 'auto';
                rotateBar.style.bottom = 'auto';
            } catch (_) {
                // no-op
            }
        };

        /** First layout pass often runs before icon/fonts settle — re-measure over a few frames. */
        const bumpRotateBarLayout = () => {
            positionRotateBarUnderToggle();
            requestAnimationFrame(() => {
                positionRotateBarUnderToggle();
                requestAnimationFrame(positionRotateBarUnderToggle);
            });
        };

        const stopRotateBarFollow = () => {
            if (!rotateBar) return;
            try {
                if (rotateBar._followCleanup) {
                    rotateBar._followCleanup();
                    rotateBar._followCleanup = null;
                }
            } catch (_) {}
        };

        const startRotateBarFollow = () => {
            if (!rotateBar) return;
            stopRotateBarFollow();
            bumpRotateBarLayout();

            let pendingRaf = null;
            const schedule = () => {
                if (pendingRaf != null) return;
                pendingRaf = requestAnimationFrame(() => {
                    pendingRaf = null;
                    if (!document.body.classList.contains('rotate-subbar-open')) return;
                    positionRotateBarUnderToggle();
                });
            };

            const onScroll = () => schedule();
            const onResize = () => schedule();
            window.addEventListener('scroll', onScroll, true);
            window.addEventListener('resize', onResize);

            const headerHub = toggleBtn.closest('.header-hub');
            if (headerHub) headerHub.addEventListener('scroll', onScroll);

            rotateBar._followCleanup = () => {
                window.removeEventListener('scroll', onScroll, true);
                window.removeEventListener('resize', onResize);
                if (headerHub) headerHub.removeEventListener('scroll', onScroll);
                if (pendingRaf != null) {
                    cancelAnimationFrame(pendingRaf);
                    pendingRaf = null;
                }
            };
        };

        // Set initial state
        if (sceneModel.getMapViewEnabled && sceneModel.getMapViewEnabled()) {
            toggleBtn.classList.add('active');
        }

        // We want the button to reflect the CURRENT mode (not the target),
        // so the label/icon match what you're currently viewing.
        const getIconPath = (enabled) => enabled
            ? 'assets/images/icons/Switch to Flat Icon.png'   // Map view enabled
            : 'assets/images/icons/Switch to Globe Icon.png'; // Globe view enabled

        const renderState = () => {
            if (!mapIcon) return;
            const enabled = (sceneModel.getMapViewEnabled ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView);
            const src = getIconPath(enabled);
            const alt = enabled ? 'Map' : 'Globe';
            mapIcon.innerHTML = `<img src="${src}" alt="${alt}" style="width: 100%; height: 100%; object-fit: contain;">`;

            const img = mapIcon.querySelector('img');
            if (img) {
                const onImgReady = () => {
                    if (!document.body.classList.contains('rotate-subbar-open')) return;
                    bumpRotateBarLayout();
                };
                if (img.complete) {
                    requestAnimationFrame(onImgReady);
                } else {
                    img.addEventListener('load', onImgReady, { once: true });
                }
            }

            // Update label text (Map vs Globe)
            const labelEl = toggleBtn.querySelector('.header-hub-btn-label');
            if (labelEl) {
                labelEl.textContent = enabled ? 'Map' : 'Globe';
            }

            // Title can clarify that it's a toggle.
            toggleBtn.title = enabled ? 'Currently: Map (click to switch to Globe)' : 'Currently: Globe (click to switch to Map)';

            // Rotate is only relevant on globe mode.
            // Don't toggle `display` here; we want the subbar to animate smoothly
            // (slide behind the header) when switching Map/Globe.

            // Slide the rotation subbar in/out (desktop).
            document.body.classList.toggle('rotate-subbar-open', !enabled);

            // Position subbar directly under the Map/Globe button (and keep following it).
            bumpRotateBarLayout();
            if (!enabled) {
                startRotateBarFollow();
            } else {
                stopRotateBarFollow();
            }
        };

        // Ensure icon uses local file (stateful)
        renderState();

        try {
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    if (document.body.classList.contains('rotate-subbar-open')) {
                        bumpRotateBarLayout();
                    }
                }).catch(() => {});
            }
        } catch (_) {}

        if (typeof ResizeObserver !== 'undefined' && !toggleBtn.dataset.rotateBarResizeObserver) {
            toggleBtn.dataset.rotateBarResizeObserver = '1';
            const ro = new ResizeObserver(() => {
                if (document.body.classList.contains('rotate-subbar-open')) {
                    positionRotateBarUnderToggle();
                }
            });
            ro.observe(toggleBtn);
        }

        if (!toggleBtn.dataset.rotateSubbarWindowLoad) {
            toggleBtn.dataset.rotateSubbarWindowLoad = '1';
            window.addEventListener('load', () => {
                if (document.body.classList.contains('rotate-subbar-open')) {
                    bumpRotateBarLayout();
                }
            });
        }

        // Keep the rotate subbar aligned on resize.
        if (!toggleBtn.dataset.rotateSubbarResizeSetup) {
            toggleBtn.dataset.rotateSubbarResizeSetup = 'true';
            window.addEventListener('resize', () => {
                renderState();
            });
        }

        const handleToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }

            // Play map switch sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('switchMap');
            }

            const enabled = !(sceneModel.getMapViewEnabled ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView);
            if (sceneModel.setMapViewEnabled) {
                sceneModel.setMapViewEnabled(enabled);
            } else {
                sceneModel.isMapView = enabled;
            }

            if (enabled) {
                toggleBtn.classList.add('active');
            } else {
                toggleBtn.classList.remove('active');
            }

            // Apply mode switch via controller (also refreshes markers)
            if (window.globeController && typeof window.globeController.setMapViewEnabled === 'function') {
                window.globeController.setMapViewEnabled(enabled);
            }

            // Keep icon as image (stateful)
            renderState();
        };

        // Prevent button from interfering with globe controls (mouse)
        toggleBtn.addEventListener('mousedown', (event) => event.stopPropagation());
        toggleBtn.addEventListener('mouseup', (event) => event.stopPropagation());

        // Touch handling
        let touchStartTime = 0;
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (Date.now() - touchStartTime < 300) {
                handleToggle(event);
            }
        });

        toggleBtn.addEventListener('click', handleToggle);
    }
}
