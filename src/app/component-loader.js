/**
 * Test Loader - Modular component loading for testing
 * Allows loading individual components (Globe, Music, Events) on demand
 * Note: Loading overlay, status, and button state management are now handled by managers
 */

import { showLoadingOverlay, hideLoadingOverlay, setRunOperation, getRunOperation } from '../managers/LoadingOverlayManager.js';
import { updateStatus, updateGlobeComponentsProgress, resetGlobeComponentsProgress } from '../managers/StatusManager.js';
import { setButtonState } from '../managers/ButtonStateManager.js';
import { setupPaletteToggle, resetPaletteToggleSetup } from '../managers/PaletteManager.js';
import { ComponentOrchestrator } from '../managers/ComponentOrchestrator.js';

// Track which components are loaded
const loadedComponents = {
    palette: false,
    music: false,
    menu: false,
    globeBase: false,
    transport: false,
    controls: false,
    events: false,
    glossary: false,
    biography: false
};

// Local variable for isRunOperation (delegates to LoadingOverlayManager)
// We keep a local variable for direct access but sync with the manager
let isRunOperation = false;

// Helper function to sync isRunOperation with manager
function setIsRunOperation(value) {
    isRunOperation = value;
    setRunOperation(value);
}

/**
 * Setup palette toggle functionality
 * Delegates to PaletteManager
 * Note: setupPaletteToggle is imported from PaletteManager
 */

/**
 * Load Palette Components (Universal Feature)
 * - Palette button
 * - Background color switching
 * - Globe texture switching
 * - Related sound effects
 */
async function unloadPalette() {
    if (!loadedComponents.palette) {
        updateStatus('Palette not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Palette...', 'info');
    
    try {
        // Remove palette button
        const paletteBtn = document.getElementById('colorPaletteToggle');
        if (paletteBtn) {
            paletteBtn.remove();
            updateStatus('✓ Palette button removed', 'success');
        }
        
        // Reset palette toggle setup flag
        resetPaletteToggleSetup();
        
        loadedComponents.palette = false;
        setButtonState('loadPaletteBtn', 'default');
        updateStatus('✓ Palette components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Palette:', error);
        updateStatus(`✗ Error unloading Palette: ${error.message}`, 'error');
    }
}

async function loadPalette() {
    // If already loaded, just return (don't toggle)
    if (loadedComponents.palette) {
        updateStatus('→ Palette already loaded!', 'info');
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadPaletteBtn', 'loading');
    updateStatus('Starting Palette load...', 'info');
    
    try {
        // Add palette button (if not already present)
        if (!document.getElementById('colorPaletteToggle')) {
            updateStatus('Adding palette button...', 'info');
            const paletteBtn = document.createElement('button');
            paletteBtn.id = 'colorPaletteToggle';
            paletteBtn.className = 'globe-control-btn color-palette-btn bottom-right-btn';
            paletteBtn.title = 'Toggle Color Palette';
            paletteBtn.innerHTML = `
                <span id="colorPaletteIcon">
                    <img src="assets/images/icons/Palette Icon.png" alt="Color Palette" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(paletteBtn);
            updateStatus('✓ Palette button added', 'success');
        }
        
        // Load palette sound effect
        updateStatus('Loading palette sound effect...', 'info');
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.loadSound('colorChange', 'assets/audio/sfx/Color Change.mp3');
            updateStatus('✓ Palette sound effect loaded', 'success');
        }
        
        // Setup palette toggle functionality
        setupPaletteToggle();
        
        loadedComponents.palette = true;
        setButtonState('loadPaletteBtn', 'loaded');
        updateStatus('✓ Palette components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Palette:', error);
        updateStatus(`✗ Error loading Palette: ${error.message}`, 'error');
        setButtonState('loadPaletteBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Load Globe Base Components
 * - Earth sphere and textures
 * - Starfield background
 * - Scene, camera, renderer, lights
 * - City markers, seaport markers
 */
async function unloadGlobeBase() {
    if (!loadedComponents.globeBase) {
        updateStatus('Globe base not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Globe Base...', 'info');
    
    try {
        // Stop animation loop if running
        if (window.globeController) {
            if (window.globeController.animationId) {
                cancelAnimationFrame(window.globeController.animationId);
                window.globeController.animationId = null;
            }
            
            // Stop any ongoing animations
            if (window.globeController.globeController) {
                window.globeController.globeController.stopAutoRotate();
            }
        }
        
        // Hide globe container
        const container = document.getElementById('globe-container');
        if (container) {
            container.style.display = 'none';
            container.classList.remove('loaded');
            
            // Clear canvas
            const canvas = container.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
                if (ctx) {
                    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
                }
            }
        }
        
        // Clear globe controller
        if (window.globeController) {
            // Dispose of Three.js resources
            const scene = window.globeController.sceneModel?.getScene();
            const renderer = window.globeController.sceneModel?.getRenderer();
            
            if (scene) {
                // Dispose of all objects in scene
                scene.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => {
                                if (mat.map) mat.map.dispose();
                                mat.dispose();
                            });
                        } else {
                            if (object.material.map) object.material.map.dispose();
                            object.material.dispose();
                        }
                    }
                });
                while(scene.children.length > 0) {
                    scene.remove(scene.children[0]);
                }
            }
            
            if (renderer) {
                renderer.dispose();
                renderer.forceContextLoss();
                // Clear the renderer's DOM element
                if (renderer.domElement && renderer.domElement.parentNode) {
                    renderer.domElement.parentNode.removeChild(renderer.domElement);
                }
            }
            
            window.globeController = null;
        }
        
        // Also unload dependent components
        if (loadedComponents.transport) {
            await unloadTransport();
        }
        if (loadedComponents.controls) {
            await unloadControls();
        }
        if (loadedComponents.events) {
            await unloadEvents();
        }
        
        loadedComponents.globeBase = false;
        setButtonState('loadGlobeBaseBtn', 'default');
        updateStatus('✓ Globe base components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Globe Base:', error);
        updateStatus(`✗ Error unloading Globe Base: ${error.message}`, 'error');
    }
}

async function loadGlobeBase() {
    // If already loaded, unload it instead
    if (loadedComponents.globeBase) {
        await unloadGlobeBase();
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadGlobeBaseBtn', 'loading');
    updateStatus('Starting Globe Base load...', 'info');
    
    try {
        // Keep globe container invisible but allow it to exist for initialization
        // The container needs to exist for the renderer to be created, but we hide it visually
        const container = document.getElementById('globe-container');
        if (container) {
            // Make it invisible but still allow rendering (opacity 0, not display none)
            // This allows Three.js to properly initialize the renderer
            container.style.opacity = '0';
            container.style.pointerEvents = 'none';
            container.style.position = 'absolute';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'block'; // Must be block for Three.js to work
            // Don't add 'loaded' class yet - will be added after all loading is complete
        }
        
        // Load GlobeController module
        updateStatus('Loading GlobeController module...', 'info');
        let GlobeController;
        try {
            const module = await import('../controllers/GlobeController.js');
            GlobeController = module.GlobeController;
            if (!GlobeController) {
                throw new Error('GlobeController not found in module. Available exports: ' + Object.keys(module).join(', '));
            }
        } catch (importError) {
            console.error('Failed to import GlobeController:', importError);
            console.error('Import error stack:', importError.stack);
            throw new Error(`Failed to import GlobeController: ${importError.message}. Original error: ${importError}`);
        }
        
        // Initialize GlobeController
        updateStatus('Initializing GlobeController...', 'info');
        const controller = new GlobeController();
        window.globeController = controller;
        
        // Initialize the globe (this loads earth, textures, starfield, city markers, seaport markers)
        updateStatus('Initializing globe scene...', 'info');
        await controller.init();
        
        // Remove event markers if events aren't loaded yet (they should only load with Events)
        if (!loadedComponents.events && controller.globeView) {
            updateStatus('Removing event markers (will load with Event Markers)...', 'info');
            const markers = controller.sceneModel.getMarkers();
            const scene = controller.sceneModel.getScene();
            
            // Remove event markers from scene
            markers.forEach(marker => {
                if (marker.userData && marker.userData.isEventMarker) {
                    scene.remove(marker);
                    const index = controller.sceneModel.getMarkers().indexOf(marker);
                    if (index > -1) {
                        controller.sceneModel.getMarkers().splice(index, 1);
                    }
                }
            });
            
            // Also remove event markers from globe children
            const globe = controller.sceneModel.getGlobe();
            if (globe) {
                const toRemove = [];
                globe.traverse((child) => {
                    if (child.userData && child.userData.isEventMarker) {
                        toRemove.push(child);
                    }
                });
                toRemove.forEach(child => {
                    if (child.parent) {
                        child.parent.remove(child);
                    }
                });
            }
            updateStatus('✓ Event markers removed', 'success');
        }
        
        // Make globe container visible now that it's loaded (unless in a run operation - run will handle visibility)
        if (!isRunOperation) {
            const container = document.getElementById('globe-container');
            if (container) {
                container.style.opacity = '1';
                container.style.pointerEvents = 'auto';
                container.style.display = 'block';
                container.classList.add('loaded');
                updateStatus('✓ Globe container made visible', 'success');
            }
        }
        
        loadedComponents.globeBase = true;
        setButtonState('loadGlobeBaseBtn', 'loaded');
        updateStatus('✓ Globe base components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Globe Base:', error);
        updateStatus(`✗ Error loading Globe Base: ${error.message}`, 'error');
        setButtonState('loadGlobeBaseBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Load Transport Components
 * - Vehicles (trains, planes, boats)
 * - Connection lines (city connections, seaport connections, secondary lines)
 * - Ports and airports
 * - Transport toggle button
 * - Related sound effects
 */
async function unloadTransport() {
    if (!loadedComponents.transport) {
        updateStatus('Transport not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Transport...', 'info');
    
    try {
        // Remove transport toggle button
        const transportBtn = document.getElementById('hyperloopToggle');
        if (transportBtn) {
            transportBtn.remove();
            updateStatus('✓ Transport toggle removed', 'success');
        }
        
        loadedComponents.transport = false;
        setButtonState('loadTransportBtn', 'default');
        updateStatus('✓ Transport components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Transport:', error);
        updateStatus(`✗ Error unloading Transport: ${error.message}`, 'error');
    }
}

async function loadTransport() {
    // If already loaded, just return (don't toggle)
    if (loadedComponents.transport) {
        updateStatus('→ Transport already loaded!', 'info');
        return;
    }
    
    // Globe base must be loaded first
    if (!loadedComponents.globeBase || !window.globeController) {
        updateStatus('⚠ Globe base must be loaded first!', 'error');
        setButtonState('loadTransportBtn', 'error');
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadTransportBtn', 'loading');
    updateStatus('Starting Transport load...', 'info');
    
    try {
        const controller = window.globeController;
        
        // Transport systems are already initialized in GlobeController.init()
        // But we need to ensure they're visible and working
        
        // Add transport toggle (if not already present)
        if (!document.getElementById('hyperloopToggle')) {
            updateStatus('Adding transport toggle...', 'info');
            const transportBtn = document.createElement('button');
            transportBtn.id = 'hyperloopToggle';
            transportBtn.className = 'globe-control-btn hyperloop-btn active';
            transportBtn.title = 'Toggle Transport Systems';
            transportBtn.innerHTML = `
                <span id="hyperloopIcon">
                    <img src="assets/images/icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(transportBtn);
            updateStatus('✓ Transport toggle added', 'success');
        }
        
        // Setup transport toggle
        if (controller.uiView) {
            controller.uiView.setupHyperloopToggle(() => {
                controller.transportView.updateHyperloopVisibility();
            });
            updateStatus('✓ Transport toggle initialized', 'success');
        }
        
        // Load transport sound effect
        updateStatus('Loading transport sound effect...', 'info');
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.loadSound('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3');
            updateStatus('✓ Transport sound effect loaded', 'success');
        }
        
        // Ensure transport systems are visible
        if (controller.transportView) {
            controller.transportView.updateHyperloopVisibility();
        }
        
        loadedComponents.transport = true;
        setButtonState('loadTransportBtn', 'loaded');
        updateStatus('✓ Transport components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Transport:', error);
        updateStatus(`✗ Error loading Transport: ${error.message}`, 'error');
        setButtonState('loadTransportBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Load Controls Components
 * - Rotation toggle button
 * - Interaction controls (mouse/touch)
 * - Related sound effects
 */
async function unloadControls() {
    if (!loadedComponents.controls) {
        updateStatus('Controls not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Controls...', 'info');
    
    try {
        // Remove rotation toggle button
        const rotateBtn = document.getElementById('autoRotateToggle');
        if (rotateBtn) {
            rotateBtn.remove();
            updateStatus('✓ Rotation toggle removed', 'success');
        }
        
        // Remove exit button
        const exitBtn = document.getElementById('exitButton');
        if (exitBtn) {
            exitBtn.remove();
            updateStatus('✓ Exit button removed', 'success');
        }
        
        loadedComponents.controls = false;
        setButtonState('loadControlsBtn', 'default');
        updateStatus('✓ Controls components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Controls:', error);
        updateStatus(`✗ Error unloading Controls: ${error.message}`, 'error');
    }
}

async function loadControls() {
    // If already loaded, just return (don't toggle)
    if (loadedComponents.controls) {
        updateStatus('→ Controls already loaded!', 'info');
        return;
    }
    
    // Globe base must be loaded first
    if (!loadedComponents.globeBase || !window.globeController) {
        updateStatus('⚠ Globe base must be loaded first!', 'error');
        setButtonState('loadControlsBtn', 'error');
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadControlsBtn', 'loading');
    updateStatus('Starting Controls load...', 'info');
    
    try {
        const controller = window.globeController;
        
        // Add rotation toggle (if not already present)
        if (!document.getElementById('autoRotateToggle')) {
            updateStatus('Adding rotation toggle...', 'info');
            const rotateBtn = document.createElement('button');
            rotateBtn.id = 'autoRotateToggle';
            rotateBtn.className = 'globe-control-btn';
            rotateBtn.title = 'Toggle Auto-Rotation';
            rotateBtn.innerHTML = `
                <span id="rotateIcon">
                    <img src="assets/images/icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(rotateBtn);
            updateStatus('✓ Rotation toggle added', 'success');
        }
        
        // Add exit button (if not already present)
        if (!document.getElementById('exitButton')) {
            updateStatus('Adding exit button...', 'info');
            const exitBtn = document.createElement('button');
            exitBtn.id = 'exitButton';
            exitBtn.className = 'globe-control-btn exit-btn';
            exitBtn.style.position = 'absolute';
            exitBtn.style.top = '20px';
            exitBtn.style.right = '20px';
            exitBtn.style.bottom = 'auto';
            exitBtn.style.left = 'auto';
            exitBtn.title = 'Exit to Main Menu';
            exitBtn.innerHTML = `
                <span id="exitIcon">
                    <img src="assets/images/icons/Home Button.png" alt="Exit" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(exitBtn);
            updateStatus('✓ Exit button added', 'success');
            
            // Setup exit button click handler
            exitBtn.addEventListener('click', async function() {
                console.log('[Exit Button] Exit clicked, starting exit process...');
                
                // Set run operation flag FIRST to prevent individual functions from hiding overlay
                setIsRunOperation(true);
                console.log('[Exit Button] isRunOperation set to true');
                
                // Show loading overlay SYNCHRONOUSLY before any async operations
                showLoadingOverlay();
                console.log('[Exit Button] Overlay shown');
                
                // Play mode switch sound effect
                if (window.SoundEffectsManager) {
                    if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                        window.SoundEffectsManager.play('modeSwitch');
                    } else {
                        // Load and play if not already loaded
                        window.SoundEffectsManager.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
                        setTimeout(() => {
                            window.SoundEffectsManager.play('modeSwitch');
                        }, 100);
                    }
                }
                
                // Clear saved mode when exiting
                localStorage.removeItem('currentMode');
                
                updateStatus('Exiting to main menu...', 'info');
                
                try {
                    console.log('[Exit Button] Calling killGlobeComponents()...');
                    await killGlobeComponents();
                    console.log('[Exit Button] killGlobeComponents() completed');
                } catch (error) {
                    console.error('[Exit Button] Error in killGlobeComponents:', error);
                } finally {
                    console.log('[Exit Button] Finally block - resetting flag and hiding overlay');
                    // Reset flag and fade out loading overlay after everything is done
                    setIsRunOperation(false);
                    hideLoadingOverlay();
                }
            });
        }
        
        // Setup rotation toggle
        if (controller.uiView) {
            controller.uiView.setupAutoRotateToggle();
            updateStatus('✓ Rotation toggle initialized', 'success');
        }
        
        // Load rotation sound effect
        updateStatus('Loading rotation sound effect...', 'info');
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.loadSound('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3');
            updateStatus('✓ Rotation sound effect loaded', 'success');
        }
        
        loadedComponents.controls = true;
        setButtonState('loadControlsBtn', 'loaded');
        updateStatus('✓ Controls components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Controls:', error);
        updateStatus(`✗ Error loading Controls: ${error.message}`, 'error');
        setButtonState('loadControlsBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Unload Music Components
 */
async function unloadMusic() {
    if (!loadedComponents.music) {
        updateStatus('Music not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Music...', 'info');
    
    try {
        // Remove music button
        const musicBtn = document.getElementById('musicToggle');
        if (musicBtn) {
            musicBtn.remove();
            updateStatus('✓ Music button removed', 'success');
        }
        
        // Remove music panel
        const musicPanel = document.getElementById('musicPanel');
        if (musicPanel) {
            musicPanel.remove();
            updateStatus('✓ Music panel removed', 'success');
        }
        
        // Stop any playing music
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio = null;
        }
        
        loadedComponents.music = false;
        setButtonState('loadMusicBtn', 'default');
        updateStatus('✓ Music components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Music:', error);
        updateStatus(`✗ Error unloading Music: ${error.message}`, 'error');
    }
}

/**
 * Load Music Components
 * - Music options button
 * - Music lists and images
 * - Related sound effects
 */
async function loadMusic() {
    // If already loaded, just return (don't toggle)
    if (loadedComponents.music) {
        updateStatus('→ Music already loaded!', 'info');
        return;
    }
    
    showLoadingOverlay();
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadMusicBtn', 'loading');
    updateStatus('Starting Music load...', 'info');
    
    try {
        // Add music toggle button (if not already present)
        if (!document.getElementById('musicToggle')) {
            updateStatus('Adding music toggle button...', 'info');
            const musicBtn = document.createElement('button');
            musicBtn.id = 'musicToggle';
            musicBtn.className = 'globe-control-btn music-btn bottom-right-btn';
            musicBtn.title = 'Music Options';
            musicBtn.innerHTML = `
                <span id="musicIcon">
                    <img src="assets/images/icons/Music Icon.png" alt="Music" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(musicBtn);
            updateStatus('✓ Music button added', 'success');
        }
        
        // Add music panel HTML (if not already present)
        if (!document.getElementById('musicPanel')) {
            updateStatus('Adding music panel...', 'info');
            const musicPanel = document.createElement('div');
            musicPanel.id = 'musicPanel';
            musicPanel.className = 'music-panel';
            musicPanel.innerHTML = `
                <div class="music-panel-close" id="musicPanelClose">&times;</div>
                <div class="music-panel-content">
                    <div class="music-actions">
                        <h2 class="music-title">Music Options</h2>
                        <div class="music-actions-buttons"></div>
                    </div>
                    <div class="music-now-playing" id="musicNowPlaying">
                        <div class="music-current-song" id="musicCurrentSong">Loading...</div>
                        <div class="music-progress-container">
                            <input type="range" id="musicProgressBar" class="music-progress-bar" min="0" max="100" value="0">
                            <div class="music-time-display">
                                <span id="musicCurrentTime">0:00</span> <span id="musicTotalTime">0:00</span>
                            </div>
                            <div class="music-control-buttons">
                                <button id="pauseBtn" class="music-control-btn">
                                    <img id="pauseBtnIcon" src="assets/images/icons/Pause Icon.png" alt="Pause" class="control-icon">
                                </button>
                                <button id="skipBtn" class="music-control-btn">
                                    <img id="skipBtnIcon" src="assets/images/icons/Skip Icon.png" alt="Skip" class="control-icon">
                                </button>
                                <button id="muteBtn" class="music-control-btn">
                                    <img id="muteBtnIcon" src="assets/images/icons/Unmuted Icon.png" alt="Mute" class="control-icon">
                                </button>
                                <button id="shuffleBtn" class="music-control-btn">
                                    <img id="shuffleBtnIcon" src="assets/images/icons/Shuffle Icon.png" alt="Shuffle" class="control-icon">
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="music-control-row">
                        <label for="volumeSlider">Music Volume:</label>
                        <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="10">
                        <span id="volumeValue" class="volume-value">10%</span>
                    </div>
                    <div class="music-control-row">
                        <label for="soundEffectsSlider">Sound Effects Volume:</label>
                        <input type="range" id="soundEffectsSlider" class="volume-slider" min="0" max="100" value="50">
                        <span id="soundEffectsVolumeValue" class="volume-value">50%</span>
                    </div>
                    <div class="music-grid" id="musicGrid"></div>
                </div>
            `;
            document.body.appendChild(musicPanel);
            updateStatus('✓ Music panel added', 'success');
        }
        
        // Initialize MusicManager AFTER elements are created
        if (window.MusicManager && typeof window.MusicManager.init === 'function') {
            updateStatus('Initializing MusicManager...', 'info');
            window.MusicManager.init();
            updateStatus('✓ MusicManager initialized', 'success');
        } else {
            console.warn('MusicManager not available after loading music components');
        }
        
        // Add audio element (if not already present)
        if (!document.getElementById('backgroundMusic')) {
            updateStatus('Adding audio element...', 'info');
            const audio = document.createElement('audio');
            audio.id = 'backgroundMusic';
            audio.loop = true;
            document.body.appendChild(audio);
            updateStatus('✓ Audio element added', 'success');
        }
        
        // Load music sound effect
        updateStatus('Loading music sound effect...', 'info');
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.loadSound('music', 'assets/audio/sfx/Music.mp3');
            updateStatus('✓ Music sound effect loaded', 'success');
        }
        
        // Initialize music panel (using MusicManager service)
        updateStatus('Initializing music panel...', 'info');
        // Wait a bit to ensure all services are loaded
        setTimeout(() => {
            if (window.MusicManager && typeof window.MusicManager.init === 'function') {
                window.MusicManager.init();
                updateStatus('✓ Music panel initialized', 'success');
            } else {
                console.error('MusicManager not available:', {
                    MusicManager: !!window.MusicManager,
                    hasInit: window.MusicManager && typeof window.MusicManager.init === 'function',
                    services: {
                        MusicStateService: !!window.MusicStateService,
                        MusicPanelService: !!window.MusicPanelService,
                        MusicControlService: !!window.MusicControlService
                    }
                });
                updateStatus('⚠ MusicManager not found - music panel may not work', 'error');
            }
        }, 50);
        
        loadedComponents.music = true;
        setButtonState('loadMusicBtn', 'loaded');
        updateStatus('✓ Music components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Music:', error);
        updateStatus(`✗ Error loading Music: ${error.message}`, 'error');
        setButtonState('loadMusicBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Load Events Components
 * - EventManager initialization
 * - Event markers on the globe
 * - Filter button and panel
 * - Event manager button and panel
 * - Event pagination (arrows, page input, numbered buttons)
 * - Event slide panel, event image overlay, event edit modal
 * - Related sound effects
 */
async function unloadEvents() {
    if (!loadedComponents.events) {
        updateStatus('Events not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Events...', 'info');
    
    try {
        // Remove filter button
        const filterBtn = document.getElementById('filtersToggle');
        if (filterBtn) {
            filterBtn.remove();
            updateStatus('✓ Filter button removed', 'success');
        }
        
        // Remove event manager button
        const eventsManageBtn = document.getElementById('eventsManageToggle');
        if (eventsManageBtn) {
            eventsManageBtn.remove();
            updateStatus('✓ Event manager button removed', 'success');
        }
        
        // Remove event pagination
        const pagination = document.getElementById('eventPagination');
        if (pagination) {
            pagination.remove();
            updateStatus('✓ Event pagination removed', 'success');
        }
        
        // Remove dynamically added panels (if they were added dynamically)
        const filtersPanel = document.getElementById('filtersPanel');
        if (filtersPanel && filtersPanel.parentElement) {
            filtersPanel.remove();
        }
        
        // Clear event manager
        if (window.eventManager) {
            window.eventManager = null;
        }
        
        // Remove event markers from globe if it exists
        if (window.globeController && window.globeController.sceneModel) {
            const markers = window.globeController.sceneModel.getMarkers();
            const scene = window.globeController.sceneModel.getScene();
            
            markers.forEach(marker => {
                if (marker.userData && marker.userData.isEventMarker) {
                    scene.remove(marker);
                }
            });
            
            // Clear markers array
            window.globeController.sceneModel.getMarkers().length = 0;
        }
        
        loadedComponents.events = false;
        setButtonState('loadEventsBtn', 'default');
        updateStatus('✓ Events components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Events:', error);
        updateStatus(`✗ Error unloading Events: ${error.message}`, 'error');
    }
}

async function loadEvents() {
    // If already loaded, just return (don't toggle)
    if (loadedComponents.events) {
        updateStatus('→ Events already loaded!', 'info');
        return;
    }
    
    // Globe base must be loaded first
    if (!loadedComponents.globeBase || !window.globeController) {
        updateStatus('⚠ Globe base must be loaded first!', 'error');
        setButtonState('loadEventsBtn', 'error');
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadEventsBtn', 'loading');
    updateStatus('Starting Events load...', 'info');
    
    try {
        // Clean up any existing EventManager instance first
        if (window.eventManager) {
            updateStatus('Cleaning up existing EventManager instance...', 'info');
            // Clear any listeners or state if needed
            if (window.eventManager.listenersSetup) {
                window.eventManager.listenersSetup = false;
            }
            // Clear all state
            if (window.eventManager.events) {
                window.eventManager.events = [];
            }
            if (window.eventManager.cities) {
                window.eventManager.cities = [];
            }
            if (window.eventManager.airports) {
                window.eventManager.airports = [];
            }
            if (window.eventManager.seaports) {
                window.eventManager.seaports = [];
            }
            window.eventManager = null;
        }
        
        // Load EventManager (it's loaded via script tag, not ES6 module)
        updateStatus('Loading EventManager...', 'info');
        
        // Check if EventManager is already available (loaded via script tag)
        // Also check if script tag already exists to avoid duplicates
        const existingScript = document.querySelector('script[src*="EventManager.js"]');
        if (typeof EventManager === 'undefined' && !existingScript) {
            // Load EventManager script dynamically
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'src/managers/EventManager.js?' + Date.now(); // Cache busting
                script.onload = async () => {
                    try {
                        // Wait a bit for EventManager to be available
                        await new Promise(r => setTimeout(r, 50));
                        
                        if (typeof EventManager === 'undefined') {
                            throw new Error('EventManager class not found after loading script');
                        }
                        
                        // Initialize EventManager
                        updateStatus('Initializing EventManager...', 'info');
                        const eventManager = new EventManager();
                        await eventManager.init();
                        window.eventManager = eventManager;
                        updateStatus('✓ EventManager initialized', 'success');
                        
                        resolve();
                    } catch (error) {
                        console.error('EventManager initialization error:', error);
                        updateStatus(`✗ EventManager initialization failed: ${error.message}`, 'error');
                        reject(error);
                    }
                };
                script.onerror = () => {
                    const error = new Error('Failed to load EventManager.js');
                    updateStatus(`✗ ${error.message}`, 'error');
                    reject(error);
                };
                document.head.appendChild(script);
            });
        } else {
            // EventManager already loaded - create fresh instance
            if (typeof EventManager === 'undefined') {
                // Wait a bit more if script exists but class not ready
                updateStatus('Waiting for EventManager class to be available...', 'info');
                let attempts = 0;
                while (typeof EventManager === 'undefined' && attempts < 10) {
                    await new Promise(r => setTimeout(r, 50));
                    attempts++;
                }
                if (typeof EventManager === 'undefined') {
                    throw new Error('EventManager class not available after waiting');
                }
            }
            updateStatus('Creating new EventManager instance...', 'info');
            const eventManager = new EventManager();
            updateStatus('Initializing EventManager...', 'info');
            try {
            await eventManager.init();
            window.eventManager = eventManager;
            updateStatus('✓ EventManager initialized', 'success');
            } catch (error) {
                console.error('EventManager initialization error:', error);
                updateStatus(`✗ EventManager initialization failed: ${error.message}`, 'error');
                throw error;
            }
        }
        
        // Sync events with globe and add markers
        if (window.globeController && window.eventManager) {
            updateStatus('Syncing events with globe...', 'info');
            window.globeController.dataModel.events = [...window.eventManager.events];
            if (window.globeController.globeView) {
                // Add event markers now that events are loaded
                window.globeController.globeView.addEventMarkers();
                window.globeController.globeView.refreshEventMarkers();
            }
            updateStatus('✓ Events synced with globe and markers added', 'success');
        }
        
        // Add filter button (if not already present)
        if (!document.getElementById('filtersToggle')) {
            updateStatus('Adding filter button...', 'info');
            const filterBtn = document.createElement('button');
            filterBtn.id = 'filtersToggle';
            filterBtn.className = 'globe-control-btn filters-btn top-left-btn';
            filterBtn.title = 'Open Filters';
            filterBtn.innerHTML = `
                <span id="filtersIcon">
                    <img src="assets/images/icons/Filter Icon.png" alt="Filters" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(filterBtn);
            updateStatus('✓ Filter button added', 'success');
        }
        
        // Add event manager button (if not already present)
        if (!document.getElementById('eventsManageToggle')) {
            updateStatus('Adding event manager button...', 'info');
            const eventMgrBtn = document.createElement('button');
            eventMgrBtn.id = 'eventsManageToggle';
            eventMgrBtn.className = 'globe-control-btn events-manage-btn top-left-btn';
            eventMgrBtn.title = 'Manage Events';
            eventMgrBtn.innerHTML = `
                <span id="eventsManageIcon">
                    <img src="assets/images/icons/Event Manager Icon.png" alt="Event Manager" style="width: 100%; height: 100%; object-fit: contain%;">
                </span>
            `;
            document.getElementById('content').appendChild(eventMgrBtn);
            updateStatus('✓ Event manager button added', 'success');
        }
        
        // Don't set up listeners here - wait until button is created
        
        // Add event pagination (if not already present)
        if (!document.getElementById('eventPagination')) {
            updateStatus('Adding event pagination...', 'info');
            const pagination = document.createElement('div');
            pagination.id = 'eventPagination';
            pagination.className = 'event-pagination';
            pagination.innerHTML = `
                <div class="page-controls-row">
                    <button id="prevPageBtn" class="page-btn" title="Previous Page">‹</button>
                    <div class="page-input-container">
                        <span class="page-label">Page</span>
                        <input type="number" id="pageInput" class="page-input" min="1" value="1" title="Enter page number">
                        <span class="page-total" id="pageTotal">/ 1</span>
                    </div>
                    <button id="nextPageBtn" class="page-btn" title="Next Page">›</button>
                </div>
                <div class="event-number-buttons" id="eventNumberButtons">
                    <button class="event-number-btn" data-position="1" title="Event 1">1</button>
                    <button class="event-number-btn" data-position="2" title="Event 2">2</button>
                    <button class="event-number-btn" data-position="3" title="Event 3">3</button>
                    <button class="event-number-btn" data-position="4" title="Event 4">4</button>
                    <button class="event-number-btn" data-position="5" title="Event 5">5</button>
                    <button class="event-number-btn" data-position="6" title="Event 6">6</button>
                    <button class="event-number-btn" data-position="7" title="Event 7">7</button>
                    <button class="event-number-btn" data-position="8" title="Event 8">8</button>
                    <button class="event-number-btn" data-position="9" title="Event 9">9</button>
                    <button class="event-number-btn" data-position="10" title="Event 10">10</button>
                </div>
            `;
            document.getElementById('content').appendChild(pagination);
            
            // Function to apply mobile positioning
            const applyMobilePaginationPosition = () => {
                const paginationEl = document.getElementById('eventPagination');
                if (paginationEl && window.innerWidth <= 768) {
                    paginationEl.style.setProperty('position', 'fixed', 'important');
                    paginationEl.style.setProperty('bottom', '120px', 'important');
                    paginationEl.style.setProperty('left', '50%', 'important');
                    paginationEl.style.setProperty('right', 'auto', 'important');
                    paginationEl.style.setProperty('transform', 'translateX(-50%)', 'important');
                    paginationEl.style.setProperty('top', 'auto', 'important');
                }
            };
            
            // Apply immediately if on mobile
            applyMobilePaginationPosition();
            
            // Also apply on window resize
            window.addEventListener('resize', applyMobilePaginationPosition);
            
            updateStatus('✓ Event pagination added', 'success');
        }
        
        // Add filters panel (if not already present)
        if (!document.getElementById('filtersPanel')) {
            updateStatus('Adding filters panel...', 'info');
            const filtersPanel = document.createElement('div');
            filtersPanel.id = 'filtersPanel';
            filtersPanel.className = 'filters-panel';
            filtersPanel.innerHTML = `
                <div class="filters-panel-close" id="filtersPanelClose">&times;</div>
                <div class="filters-panel-content">
                    <div class="filters-actions">
                        <h2 class="filters-title">Filters</h2>
                        <div class="filters-actions-buttons">
                            <button id="clearFiltersBtn" class="filters-action-btn">Clear</button>
                            <button id="confirmFiltersBtn" class="filters-action-btn filters-confirm-btn">Confirm</button>
                        </div>
                    </div>
                    <div class="filters-tabs">
                        <button id="heroesTab" class="filter-tab active">
                            Heroes
                            <span class="filter-count" id="heroesCount">0</span>
                        </button>
                        <button id="factionsTab" class="filter-tab">
                            Factions
                            <span class="filter-count" id="factionsCount">0</span>
                        </button>
                    </div>
                    <div class="filters-grid" id="filtersGrid"></div>
                </div>
            `;
            document.body.appendChild(filtersPanel);
            updateStatus('✓ Filters panel added', 'success');
        }
        
        // Verify other panels exist (they should be in HTML)
        if (!document.getElementById('eventSlide')) {
            updateStatus('⚠ Event slide panel not found in HTML', 'error');
        } else {
            updateStatus('✓ Event slide panel found', 'success');
        }
        
        if (!document.getElementById('eventImageOverlay')) {
            updateStatus('⚠ Event image overlay not found in HTML', 'error');
        } else {
            updateStatus('✓ Event image overlay found', 'success');
        }
        
        if (!document.getElementById('eventsManagePanel')) {
            updateStatus('⚠ Event manager panel not found in HTML', 'error');
        } else {
            updateStatus('✓ Event manager panel found', 'success');
        }
        
        if (!document.getElementById('eventEditModal')) {
            updateStatus('⚠ Event edit modal not found in HTML', 'error');
        } else {
            updateStatus('✓ Event edit modal found', 'success');
        }
        
        // Load all event-related sound effects
        updateStatus('Loading event sound effects...', 'info');
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.loadSound('filterPick', 'assets/audio/sfx/Filter Pick.mp3');
            window.SoundEffectsManager.loadSound('filterOff', 'assets/audio/sfx/Filter Off.mp3');
            window.SoundEffectsManager.loadSound('filterConfirm', 'assets/audio/sfx/Filter Confirm.mp3');
            window.SoundEffectsManager.loadSound('filterClear', 'assets/audio/sfx/Filter Clear.mp3');
            window.SoundEffectsManager.loadSound('filterButton', 'assets/audio/sfx/Filter Button.mp3');
            window.SoundEffectsManager.loadSound('eventClick', 'assets/audio/sfx/Event Click.mp3');
            window.SoundEffectsManager.loadSound('eventManager', 'assets/audio/sfx/Event Manager.mp3');
            window.SoundEffectsManager.loadSound('switchEvent', 'assets/audio/sfx/Switch Event.mp3');
            window.SoundEffectsManager.loadSound('page', 'assets/audio/sfx/Page.mp3');
            updateStatus('✓ Event sound effects loaded', 'success');
        }
        
        // Initialize filter panel functionality
        updateStatus('Initializing filter panel...', 'info');
        if (window.FilterService && typeof window.FilterService.init === 'function') {
            window.FilterService.init();
            updateStatus('✓ Filter panel initialized', 'success');
        } else {
            updateStatus('⚠ FilterService not found - filter panel may not work', 'error');
        }
        
        // Setup event listeners AFTER all buttons and panels are created
        // This is critical - setupEventListeners needs the button to exist
        if (window.eventManager) {
            updateStatus('Setting up event listeners for add/edit functionality...', 'info');
            // Verify button exists before setting up listeners
            const toggleBtn = document.getElementById('eventsManageToggle');
            const panel = document.getElementById('eventsManagePanel');
            const addBtn = document.getElementById('addEventBtn');
            if (toggleBtn && panel && addBtn) {
                // Small delay to ensure DOM is fully ready
                setTimeout(() => {
                window.eventManager.setupEventListeners();
                    updateStatus('✓ Event listeners set up - add/edit functionality ready', 'success');
                }, 50);
            } else {
                updateStatus(`⚠ Some elements not found! Toggle: ${!!toggleBtn}, Panel: ${!!panel}, AddBtn: ${!!addBtn}`, 'error');
                // Retry after a longer delay
                setTimeout(() => {
                    if (window.eventManager) {
                        const retryToggleBtn = document.getElementById('eventsManageToggle');
                        const retryPanel = document.getElementById('eventsManagePanel');
                        const retryAddBtn = document.getElementById('addEventBtn');
                        if (retryToggleBtn && retryPanel && retryAddBtn) {
                            window.eventManager.setupEventListeners();
                            updateStatus('✓ Event listeners set up (retry successful)', 'success');
                        } else {
                            updateStatus(`✗ Failed to set up event listeners - elements still missing`, 'error');
                        }
                    }
                }, 200);
            }
        }
        
        // Sync events with globe and add markers
        if (window.globeController && window.eventManager) {
            updateStatus('Syncing events with globe...', 'info');
            window.globeController.dataModel.events = [...window.eventManager.events];
            if (window.globeController.globeView) {
                // Add event markers now that events are loaded
                window.globeController.globeView.addEventMarkers();
                window.globeController.globeView.refreshEventMarkers();
            }
            if (window.globeController.uiView) {
                window.globeController.uiView.setupEventPagination(() => {
                    if (window.globeController.globeView) {
                        window.globeController.globeView.refreshEventMarkers();
                    }
                });
                // Setup event number buttons
                window.globeController.uiView.setupEventNumberButtons(() => {
                    if (window.globeController.globeView) {
                        window.globeController.globeView.refreshEventMarkers();
                    }
                });
            }
            updateStatus('✓ Events synced with globe and markers added', 'success');
        }
        
        loadedComponents.events = true;
        setButtonState('loadEventsBtn', 'loaded');
        updateStatus('✓ Events components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Events:', error);
        updateStatus(`✗ Error loading Events: ${error.message}`, 'error');
        setButtonState('loadEventsBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Unload Menu Components
 */
async function unloadMenu() {
    if (!loadedComponents.menu) {
        updateStatus('Menu not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Menu...', 'info');
    
    try {
        // Remove menu container if it exists
        const testContainer = document.querySelector('.test-container');
        if (testContainer) {
            // Remove the main-menu-buttons div
            const menuButtons = testContainer.querySelector('.main-menu-buttons');
            if (menuButtons) {
                menuButtons.remove();
                updateStatus('✓ Menu buttons removed', 'success');
            }
        }
        
        loadedComponents.menu = false;
        setButtonState('loadMenuBtn', 'default');
        updateStatus('✓ Menu components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Menu:', error);
        updateStatus(`✗ Error unloading Menu: ${error.message}`, 'error');
    }
}

/**
 * Load Menu Components
 * - Main menu with 3 buttons (Global Timeline, Concept Glossary, Character Bios)
 */
async function loadMenu() {
    // If already loaded, just return (don't toggle)
    if (loadedComponents.menu) {
        updateStatus('→ Menu already loaded!', 'info');
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadMenuBtn', 'loading');
    updateStatus('Starting Menu load...', 'info');
    
    try {
        // Check if test-container exists, if not create it
        let testContainer = document.querySelector('.test-container');
        if (!testContainer) {
            updateStatus('Creating test container...', 'info');
            testContainer = document.createElement('div');
            testContainer.className = 'test-container';
            testContainer.id = 'testContainer';
            document.getElementById('content').appendChild(testContainer);
            updateStatus('✓ Test container created', 'success');
        }
        
        // Check if menu buttons already exist
        if (testContainer.querySelector('.main-menu-buttons')) {
            updateStatus('Menu buttons already exist', 'info');
            loadedComponents.menu = true;
            setButtonState('loadMenuBtn', 'loaded');
            updateStatus('✓ Menu components already loaded!', 'success');
            // Don't hide overlay if in a run operation (exit process)
            if (!isRunOperation) {
                hideLoadingOverlay();
            }
            return;
        }
        
        // Create main menu buttons structure
        updateStatus('Creating main menu buttons...', 'info');
        const menuButtons = document.createElement('div');
        menuButtons.className = 'main-menu-buttons';
        
        // Detect if running on GitHub Pages
        const isGitHubPages = (() => {
            const hostname = window.location.hostname;
            return hostname.includes('github.io') || 
                   hostname.includes('github.com') ||
                   hostname === 'localhost' && window.location.port === ''; // Also check for localhost without port (GitHub Pages preview)
        })();
        
        // Global Timeline button
        const globeBtn = document.createElement('button');
        globeBtn.id = 'runGlobeBtn';
        globeBtn.className = 'main-menu-btn';
        globeBtn.title = 'Global Timeline';
        globeBtn.innerHTML = `
            <div class="main-menu-image-container">
                <img src="assets/images/menu/Global%20Timeline.png" alt="Global Timeline">
            </div>
            <div class="main-menu-label-container">
                <div class="main-menu-label">Global Timeline</div>
                <div class="main-menu-description">Revisit the Story of Overwatch in Chronological Order, view through a 3D Globe</div>
            </div>
        `;
        
        menuButtons.appendChild(globeBtn);
        
        // Only show Concept Glossary and Character Bios if NOT on GitHub Pages
        if (!isGitHubPages) {
            // Concept Glossary button
            const glossaryBtn = document.createElement('button');
            glossaryBtn.id = 'runGlossaryBtn';
            glossaryBtn.className = 'main-menu-btn';
            glossaryBtn.title = 'Concept Glossary';
            glossaryBtn.innerHTML = `
                <div class="main-menu-image-container">
                    <img src="assets/images/menu/Concept%20Glossary.png" alt="Concept Glossary">
                </div>
                <div class="main-menu-label-container">
                    <div class="main-menu-label">Concept Glossary</div>
                    <div class="main-menu-description">Coming Soon...</div>
                </div>
            `;
            
            // Character Bios button
            const biographyBtn = document.createElement('button');
            biographyBtn.id = 'runBiographyBtn';
            biographyBtn.className = 'main-menu-btn';
            biographyBtn.title = 'Character Bios';
            biographyBtn.innerHTML = `
                <div class="main-menu-image-container">
                    <img src="assets/images/menu/Character%20Bios.png" alt="Character Bios" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="main-menu-label-container">
                    <div class="main-menu-label">Character Bios</div>
                    <div class="main-menu-description">Coming Soon...</div>
                </div>
            `;
            
            menuButtons.appendChild(glossaryBtn);
            menuButtons.appendChild(biographyBtn);
        }
        
        testContainer.appendChild(menuButtons);
        updateStatus('✓ Menu buttons created', 'success');
        
        // Setup event listeners for menu buttons
        updateStatus('Setting up menu button listeners...', 'info');
        if (typeof runGlobeComponents === 'function') {
            globeBtn.addEventListener('click', async function() {
                // Show overlay SYNCHRONOUSLY before any async operations
                setIsRunOperation(true);
                showLoadingOverlay();
                try {
                    await runGlobeComponents();
                } catch (error) {
                    console.error('Error in runGlobeComponents:', error);
                    setIsRunOperation(false);
                    hideLoadingOverlay();
                }
            });
            updateStatus('✓ Global Timeline button listener added', 'success');
        }
        
        // Only setup listeners for Glossary and Biography if buttons exist (not on GitHub Pages)
        if (!isGitHubPages) {
            const glossaryBtn = document.getElementById('runGlossaryBtn');
            const biographyBtn = document.getElementById('runBiographyBtn');
            
            if (glossaryBtn && typeof runGlossaryComponents === 'function') {
                glossaryBtn.addEventListener('click', async function() {
                    // Show overlay SYNCHRONOUSLY before any async operations
                    isRunOperation = true;
                    showLoadingOverlay();
                    try {
                        await runGlossaryComponents();
                    } catch (error) {
                        console.error('Error in runGlossaryComponents:', error);
                        isRunOperation = false;
                        hideLoadingOverlay();
                    }
                });
                updateStatus('✓ Concept Glossary button listener added', 'success');
            }
            if (biographyBtn && typeof runBiographyComponents === 'function') {
                biographyBtn.addEventListener('click', async function() {
                    // Show overlay SYNCHRONOUSLY before any async operations
                    isRunOperation = true;
                    showLoadingOverlay();
                    try {
                        await runBiographyComponents();
                    } catch (error) {
                        console.error('Error in runBiographyComponents:', error);
                        isRunOperation = false;
                        hideLoadingOverlay();
                    }
                });
                updateStatus('✓ Character Bios button listener added', 'success');
            }
        }
        
        loadedComponents.menu = true;
        setButtonState('loadMenuBtn', 'loaded');
        updateStatus('✓ Menu components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Menu:', error);
        updateStatus(`✗ Error loading Menu: ${error.message}`, 'error');
        setButtonState('loadMenuBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// Initialize ComponentOrchestrator with loaders and unloaders
const componentOrchestrator = new ComponentOrchestrator(
    loadedComponents,
    {
        palette: loadPalette,
        music: loadMusic,
        menu: loadMenu,
        globeBase: loadGlobeBase,
        transport: loadTransport,
        controls: loadControls,
        events: loadEvents
    },
    {
        palette: unloadPalette,
        music: unloadMusic,
        menu: unloadMenu,
        globeBase: unloadGlobeBase,
        transport: unloadTransport,
        controls: unloadControls,
        events: unloadEvents
    }
);

/**
 * Run all Menu Components
 * Simply ensures menu is loaded and visible
 * Delegates to ComponentOrchestrator
 */
async function runMenuComponents() {
    return componentOrchestrator.runMenuComponents();
}

/**
 * Run all Universal Features sequentially
 * Loads: Palette, then Music
 * Delegates to ComponentOrchestrator
 */
async function runUniversalFeatures() {
    return componentOrchestrator.runUniversalFeatures();
}

/**
 * Run all Globe Components sequentially
 * Loads: Globe Base, then Transport, then Controls, then Events
 * Delegates to ComponentOrchestrator
 */
async function runGlobeComponents(isAutoLoad = false) {
    return componentOrchestrator.runGlobeComponents(isAutoLoad);
}

/**
 * Kill all Menu Components
 * Delegates to ComponentOrchestrator
 */
async function killMenuComponents() {
    return componentOrchestrator.killMenuComponents();
}

/**
 * Kill all Universal Features
 * Delegates to ComponentOrchestrator
 */
async function killUniversalFeatures() {
    return componentOrchestrator.killUniversalFeatures();
}

/**
 * Restore main menu (show test-container, hide globe)
 * Make it globally accessible
 * Delegates to ComponentOrchestrator
 */
window.restoreMainMenu = async function restoreMainMenu() {
    return componentOrchestrator.restoreMainMenu();
}

/**
 * Kill all Globe Components
 * Delegates to ComponentOrchestrator
 */
async function killGlobeComponents() {
    return componentOrchestrator.killGlobeComponents();
}

/**
 * Run all Glossary Components sequentially
 * (Placeholder - no actual loads yet)
 * Delegates to ComponentOrchestrator
 */
async function runGlossaryComponents(isAutoLoad = false) {
    return componentOrchestrator.runGlossaryComponents(isAutoLoad);
}

/**
 * Kill all Glossary Components
 * Delegates to ComponentOrchestrator
 */
async function killGlossaryComponents() {
    return componentOrchestrator.killGlossaryComponents();
}

/**
 * Run all Biography Components sequentially
 * (Placeholder - no actual loads yet)
 * Delegates to ComponentOrchestrator
 */
async function runBiographyComponents(isAutoLoad = false) {
    return componentOrchestrator.runBiographyComponents(isAutoLoad);
}

/**
 * Kill all Biography Components
 * Delegates to ComponentOrchestrator
 */
async function killBiographyComponents() {
    return componentOrchestrator.killBiographyComponents();
}

// Setup button event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('test-loader.js: DOMContentLoaded fired, setting up button listeners...');
    
    // Universal features
    const loadPaletteBtn = document.getElementById('loadPaletteBtn');
    const loadMusicBtn = document.getElementById('loadMusicBtn');
    const runUniversalBtn = document.getElementById('runUniversalBtn');
    const killUniversalBtn = document.getElementById('killUniversalBtn');
    
    // Globe components
    const loadGlobeBaseBtn = document.getElementById('loadGlobeBaseBtn');
    const loadTransportBtn = document.getElementById('loadTransportBtn');
    const loadControlsBtn = document.getElementById('loadControlsBtn');
    const loadEventsBtn = document.getElementById('loadEventsBtn');
    const runGlobeBtn = document.getElementById('runGlobeBtn');
    const killGlobeBtn = document.getElementById('killGlobeBtn');
    
    if (loadPaletteBtn) {
        loadPaletteBtn.addEventListener('click', loadPalette);
    }
    
    if (loadMusicBtn) {
        loadMusicBtn.addEventListener('click', loadMusic);
    }
    
    if (runUniversalBtn) {
        runUniversalBtn.addEventListener('click', async function() {
            // Show overlay SYNCHRONOUSLY before any async operations
            isRunOperation = true;
            showLoadingOverlay();
            try {
                await runUniversalFeatures();
            } catch (error) {
                console.error('Error in runUniversalFeatures:', error);
                isRunOperation = false;
                hideLoadingOverlay();
            }
        });
    }
    
    if (killUniversalBtn) {
        killUniversalBtn.addEventListener('click', killUniversalFeatures);
    }
    
    // Menu components
    const loadMenuBtn = document.getElementById('loadMenuBtn');
    const runMenuBtn = document.getElementById('runMenuBtn');
    const killMenuBtn = document.getElementById('killMenuBtn');
    
    if (loadMenuBtn) {
        loadMenuBtn.addEventListener('click', loadMenu);
    }
    
    if (runMenuBtn) {
        console.log('test-loader.js: Wiring up runMenuBtn');
        runMenuBtn.addEventListener('click', async function() {
            console.log('runMenuBtn clicked');
            // Show overlay SYNCHRONOUSLY before any async operations
            isRunOperation = true;
            showLoadingOverlay();
            try {
                await runMenuComponents();
            } catch (error) {
                console.error('Error in runMenuComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
                isRunOperation = false;
                hideLoadingOverlay();
            }
        });
    } else {
        console.warn('test-loader.js: runMenuBtn not found!');
    }
    
    if (killMenuBtn) {
        killMenuBtn.addEventListener('click', async function() {
            console.log('killMenuBtn clicked');
            try {
                await killMenuComponents();
            } catch (error) {
                console.error('Error in killMenuComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    }
    
    if (loadGlobeBaseBtn) {
        console.log('test-loader.js: Wiring up loadGlobeBaseBtn');
        loadGlobeBaseBtn.addEventListener('click', async function() {
            console.log('loadGlobeBaseBtn clicked');
            try {
                await loadGlobeBase();
            } catch (error) {
                console.error('Error in loadGlobeBase:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    } else {
        console.warn('test-loader.js: loadGlobeBaseBtn not found!');
    }
    
    if (loadTransportBtn) {
        console.log('test-loader.js: Wiring up loadTransportBtn');
        loadTransportBtn.addEventListener('click', async function() {
            console.log('loadTransportBtn clicked');
            try {
                await loadTransport();
            } catch (error) {
                console.error('Error in loadTransport:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    } else {
        console.warn('test-loader.js: loadTransportBtn not found!');
    }
    
    if (loadControlsBtn) {
        console.log('test-loader.js: Wiring up loadControlsBtn');
        loadControlsBtn.addEventListener('click', async function() {
            console.log('loadControlsBtn clicked');
            try {
                await loadControls();
            } catch (error) {
                console.error('Error in loadControls:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    } else {
        console.warn('test-loader.js: loadControlsBtn not found!');
    }
    
    if (loadEventsBtn) {
        console.log('test-loader.js: Wiring up loadEventsBtn');
        loadEventsBtn.addEventListener('click', async function() {
            console.log('loadEventsBtn clicked');
            try {
                await loadEvents();
            } catch (error) {
                console.error('Error in loadEvents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    } else {
        console.warn('test-loader.js: loadEventsBtn not found!');
    }
    
    // Only wire up if not already wired
    if (runGlobeBtn && !runGlobeBtn.hasAttribute('data-listener-attached')) {
        runGlobeBtn.setAttribute('data-listener-attached', 'true');
        runGlobeBtn.addEventListener('click', async function() {
            console.log('runGlobeBtn clicked');
            // Show overlay SYNCHRONOUSLY before any async operations
            isRunOperation = true;
            showLoadingOverlay();
            try {
                await runGlobeComponents();
            } catch (error) {
                console.error('Error in runGlobeComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
                isRunOperation = false;
                hideLoadingOverlay();
            }
        });
    }
    
    if (killGlobeBtn) {
        killGlobeBtn.addEventListener('click', async function() {
            console.log('killGlobeBtn clicked');
            try {
                await killGlobeComponents();
            } catch (error) {
                console.error('Error in killGlobeComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    }
    
    // Glossary components
    const runGlossaryBtn = document.getElementById('runGlossaryBtn');
    const killGlossaryBtn = document.getElementById('killGlossaryBtn');
    
    // Only wire up if not already wired
    if (runGlossaryBtn && !runGlossaryBtn.hasAttribute('data-listener-attached')) {
        runGlossaryBtn.setAttribute('data-listener-attached', 'true');
        runGlossaryBtn.addEventListener('click', async function() {
            console.log('runGlossaryBtn clicked');
            // Show overlay SYNCHRONOUSLY before any async operations
            isRunOperation = true;
            showLoadingOverlay();
            try {
                await runGlossaryComponents();
            } catch (error) {
                console.error('Error in runGlossaryComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
                isRunOperation = false;
                hideLoadingOverlay();
            }
        });
    }
    
    if (killGlossaryBtn) {
        killGlossaryBtn.addEventListener('click', async function() {
            console.log('killGlossaryBtn clicked');
            try {
                await killGlossaryComponents();
            } catch (error) {
                console.error('Error in killGlossaryComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    }
    
    // Biography components
    const runBiographyBtn = document.getElementById('runBiographyBtn');
    const killBiographyBtn = document.getElementById('killBiographyBtn');
    
    // Wire up Character Bios button
    if (runBiographyBtn && !runBiographyBtn.hasAttribute('data-listener-attached')) {
        runBiographyBtn.setAttribute('data-listener-attached', 'true');
        runBiographyBtn.addEventListener('click', async function() {
            console.log('runBiographyBtn clicked');
            // Show overlay SYNCHRONOUSLY before any async operations
            isRunOperation = true;
            showLoadingOverlay();
            try {
                await runBiographyComponents();
            } catch (error) {
                console.error('Error in runBiographyComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
                isRunOperation = false;
                hideLoadingOverlay();
            }
        });
    }
    
    if (killBiographyBtn) {
        killBiographyBtn.addEventListener('click', async function() {
            console.log('killBiographyBtn clicked');
            try {
                await killBiographyComponents();
            } catch (error) {
                console.error('Error in killBiographyComponents:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        });
    }
    
    updateStatus('Test loader ready. Click buttons to load components.', 'info');
});

// Make runUniversalFeatures, runMenuComponents, and runGlobeComponents available globally
// This must be at the end after all functions are defined
window.runUniversalFeatures = runUniversalFeatures;
window.runMenuComponents = runMenuComponents;
window.runGlobeComponents = runGlobeComponents;