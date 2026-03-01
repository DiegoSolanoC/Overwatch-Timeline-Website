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

        // Set initial state
        if (sceneModel.getMapViewEnabled && sceneModel.getMapViewEnabled()) {
            toggleBtn.classList.add('active');
        }

        const getIconPath = (enabled) => enabled
            ? 'assets/images/icons/Switch to Globe Icon.png'
            : 'assets/images/icons/Switch to Flat Icon.png';
        const renderIcon = () => {
            if (!mapIcon) return;
            const enabled = (sceneModel.getMapViewEnabled ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView);
            const src = getIconPath(enabled);
            const alt = enabled ? 'Switch to Globe' : 'Switch to Flat Map';
            mapIcon.innerHTML = `<img src="${src}" alt="${alt}" style="width: 100%; height: 100%; object-fit: contain;">`;
        };

        // Ensure icon uses local file (stateful)
        renderIcon();

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
            renderIcon();
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
