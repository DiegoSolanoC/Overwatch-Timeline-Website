/**
 * Test Loader - Modular component loading for testing
 * Allows loading individual components (Globe, Music, Events) on demand
 */

// Track which components are loaded
const loadedComponents = {
    palette: false,
    music: false,
    globeBase: false,
    transport: false,
    controls: false,
    events: false,
    glossary: false,
    biography: false
};

// Status tracking
function updateStatus(message, type = 'info') {
    // Check if we're on main.html with overlay status
    const isMainPage = window.location.pathname.includes('main.html') || window.location.href.includes('main.html');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const overlayActive = loadingOverlay && loadingOverlay.classList.contains('active');
    
    let statusContent;
    if (isMainPage && overlayActive) {
        // Use overlay status on main page when overlay is active
        statusContent = document.getElementById('overlayStatusContent');
        // Replace content instead of appending (show only latest)
        if (statusContent) {
            statusContent.innerHTML = '';
            const item = document.createElement('div');
            item.className = `test-status-item ${type}`;
            item.textContent = message;
            statusContent.appendChild(item);
        }
    } else {
        // Use regular test status (append for test page)
        const statusDiv = document.getElementById('testStatus');
        statusContent = document.getElementById('statusContent');
        if (statusDiv && statusContent) {
            statusDiv.style.display = 'block';
            const item = document.createElement('div');
            item.className = `test-status-item ${type}`;
            item.textContent = message;
            statusContent.appendChild(item);
            // Auto-scroll to bottom
            statusContent.scrollTop = statusContent.scrollHeight;
        }
    }
}

// Progress tracking for Globe Components
let globeComponentsProgress = {
    total: 4, // Globe Base, Transport, Controls, Events
    completed: 0
};

function updateGlobeComponentsProgress(completed) {
    globeComponentsProgress.completed = completed;
    const progressBar = document.getElementById('loadingProgressBar');
    if (progressBar) {
        const percentage = (completed / globeComponentsProgress.total) * 100;
        progressBar.style.width = percentage + '%';
    }
}

function resetGlobeComponentsProgress() {
    globeComponentsProgress.completed = 0;
    const progressBar = document.getElementById('loadingProgressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

function setButtonState(buttonId, state) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.classList.remove('loading', 'loaded');
    if (state === 'loading') {
        btn.classList.add('loading');
        btn.disabled = true;
    } else if (state === 'loaded') {
        btn.classList.add('loaded');
        btn.disabled = false;
    } else {
        btn.disabled = false;
    }
}

/**
 * Setup palette toggle functionality
 * This is needed when the button is added dynamically after DOMContentLoaded
 */
// Track if palette toggle is already set up to prevent duplicate listeners
let paletteToggleSetup = false;

function setupPaletteToggle() {
    const colorPaletteToggle = document.getElementById('colorPaletteToggle');
    if (!colorPaletteToggle) return;
    
    // If already set up, don't set up again (but still apply saved state)
    if (paletteToggleSetup && colorPaletteToggle.dataset.setup === 'true') {
        // Just ensure saved state is applied
        const savedPalette = localStorage.getItem('colorPalette');
        if (savedPalette === 'gray') {
            document.body.classList.add('color-palette-gray');
            colorPaletteToggle.classList.add('active');
        } else {
            document.body.classList.remove('color-palette-gray');
            colorPaletteToggle.classList.remove('active');
        }
        return;
    }
    
    // Mark as set up
    colorPaletteToggle.dataset.setup = 'true';
    paletteToggleSetup = true;
    
    // Load saved color palette preference (default to blue if not set)
    const savedPalette = localStorage.getItem('colorPalette');
    if (savedPalette === 'gray') {
        document.body.classList.add('color-palette-gray');
        colorPaletteToggle.classList.add('active');
    } else {
        // Default to blue palette
        document.body.classList.remove('color-palette-gray');
        colorPaletteToggle.classList.remove('active');
    }
    
    // Create a single persistent handler function that always gets the current button
    const handlePaletteToggle = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Always get the current button element (in case it was replaced)
        const currentToggle = document.getElementById('colorPaletteToggle');
        if (!currentToggle) return;
        
        const isGray = document.body.classList.toggle('color-palette-gray');
        currentToggle.classList.toggle('active', isGray);
        
        // Save preference
        localStorage.setItem('colorPalette', isGray ? 'gray' : 'blue');
        
        console.log('Palette toggled:', isGray ? 'gray' : 'blue', 'Body class:', document.body.classList.contains('color-palette-gray'));
        
        // Change globe texture (only on pages with globe)
        if (window.globeController && window.globeController.globeView) {
            const texturePath = isGray ? 'MAP Black.png' : 'MAP.png';
            window.globeController.globeView.changeGlobeTexture(texturePath);
        }
        
        // Change scene background color (starfield background) (only on pages with globe)
        if (window.globeController && window.globeController.sceneModel) {
            const bgColor = isGray ? 0x0f0f0f : 0x050d18; // Darker gray/blue than panels for contrast
            window.globeController.sceneModel.setBackgroundColor(bgColor);
        }
        
        // Play sound effect if available
        if (window.SoundEffectsManager) {
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                window.SoundEffectsManager.play('colorChange');
            } else {
                // Load and play if not already loaded
                window.SoundEffectsManager.loadSound('colorChange', 'Sound Effects/Color Change.mp3');
                setTimeout(() => {
                    window.SoundEffectsManager.play('colorChange');
                }, 100);
            }
        }
    };
    
    // Attach the handler - use capture phase to ensure it runs
    colorPaletteToggle.addEventListener('click', handlePaletteToggle, true);
}

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
        paletteToggleSetup = false;
        
        loadedComponents.palette = false;
        setButtonState('loadPaletteBtn', 'default');
        updateStatus('✓ Palette components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Palette:', error);
        updateStatus(`✗ Error unloading Palette: ${error.message}`, 'error');
    }
}

async function loadPalette() {
    // If already loaded, unload it instead
    if (loadedComponents.palette) {
        await unloadPalette();
        return;
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
                    <img src="Palette Icon.png" alt="Color Palette" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(paletteBtn);
            updateStatus('✓ Palette button added', 'success');
        }
        
        // Load palette sound effect
        updateStatus('Loading palette sound effect...', 'info');
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.loadSound('colorChange', 'Sound Effects/Color Change.mp3');
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
    
    setButtonState('loadGlobeBaseBtn', 'loading');
    updateStatus('Starting Globe Base load...', 'info');
    
    try {
        // Show globe container
        const container = document.getElementById('globe-container');
        if (container) {
            container.style.display = 'block';
            container.classList.add('loaded');
        }
        
        // Load GlobeController module
        updateStatus('Loading GlobeController module...', 'info');
        const { GlobeController } = await import('./controllers/GlobeController.js');
        
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
        
        loadedComponents.globeBase = true;
        setButtonState('loadGlobeBaseBtn', 'loaded');
        updateStatus('✓ Globe base components fully loaded!', 'success');
        
        // On main.html, make globe take full space immediately when Globe Base loads
        if (window.location.pathname.includes('main.html') || window.location.href.includes('main.html')) {
            const globeContainer = document.getElementById('globe-container');
            const mainElement = document.querySelector('main');
            if (globeContainer && mainElement) {
                // Make main element take full space
                mainElement.style.display = 'block';
                mainElement.style.position = 'relative';
                mainElement.style.width = '100%';
                mainElement.style.height = '100%';
                mainElement.style.padding = '0';
                mainElement.style.margin = '0';
                
                // Make globe container take full absolute space
                globeContainer.style.position = 'absolute';
                globeContainer.style.top = '0';
                globeContainer.style.left = '0';
                globeContainer.style.right = '0';
                globeContainer.style.bottom = '0';
                globeContainer.style.width = '100%';
                globeContainer.style.height = '100%';
                globeContainer.style.margin = '0';
                globeContainer.style.padding = '0';
                
                // Resize renderer immediately to match new container size
                setTimeout(() => {
                    if (window.globeController && window.globeController.sceneModel && window.globeController.sceneModel.getRenderer) {
                        const renderer = window.globeController.sceneModel.getRenderer();
                        const camera = window.globeController.sceneModel.getCamera();
                        if (renderer && camera) {
                            const width = globeContainer.clientWidth;
                            const height = globeContainer.clientHeight;
                            if (width > 0 && height > 0) {
                                camera.aspect = width / height;
                                camera.updateProjectionMatrix();
                                renderer.setSize(width, height);
                            }
                        }
                    }
                }, 100);
            }
        }
        
    } catch (error) {
        console.error('Error loading Globe Base:', error);
        updateStatus(`✗ Error loading Globe Base: ${error.message}`, 'error');
        setButtonState('loadGlobeBaseBtn', 'error');
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
    // If already loaded, unload it instead
    if (loadedComponents.transport) {
        await unloadTransport();
        return;
    }
    
    // Globe base must be loaded first
    if (!loadedComponents.globeBase || !window.globeController) {
        updateStatus('⚠ Globe base must be loaded first!', 'error');
        setButtonState('loadTransportBtn', 'error');
        return;
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
                    <img src="Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">
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
            window.SoundEffectsManager.loadSound('transportToggle', 'Sound Effects/Transport Toggle.mp3');
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
    // If already loaded, unload it instead
    if (loadedComponents.controls) {
        await unloadControls();
        return;
    }
    
    // Globe base must be loaded first
    if (!loadedComponents.globeBase || !window.globeController) {
        updateStatus('⚠ Globe base must be loaded first!', 'error');
        setButtonState('loadControlsBtn', 'error');
        return;
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
                    <img src="Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">
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
                    <img src="Home Button.png" alt="Exit" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(exitBtn);
            updateStatus('✓ Exit button added', 'success');
            
            // Setup exit button click handler
            exitBtn.addEventListener('click', async function() {
                // Play mode switch sound effect
                if (window.SoundEffectsManager) {
                    if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                        window.SoundEffectsManager.play('modeSwitch');
                    } else {
                        // Load and play if not already loaded
                        window.SoundEffectsManager.loadSound('modeSwitch', 'Music/Mode Switch.mp3');
                        setTimeout(() => {
                            window.SoundEffectsManager.play('modeSwitch');
                        }, 100);
                    }
                }
                
                // Clear saved mode when exiting
                localStorage.removeItem('currentMode');
                
                const isMainPage = window.location.pathname.includes('main.html') || window.location.href.includes('main.html');
                const loadingOverlay = document.getElementById('loadingOverlay');
                
                // Fade in the black overlay (if on main.html)
                if (isMainPage && loadingOverlay) {
                    loadingOverlay.classList.add('active');
                    // Wait for fade transition to complete (0.5s)
                    await new Promise(r => setTimeout(r, 500));
                }
                
                updateStatus('Exiting to main menu...', 'info');
                await killGlobeComponents();
                
                // On main.html, show the test container (main menu) again and fade out overlay
                if (isMainPage) {
                    const testContainer = document.querySelector('.test-container');
                    if (testContainer) {
                        testContainer.style.display = 'flex';
                        testContainer.classList.remove('fading');
                    }
                    
                    // Fade out the black overlay
                    if (loadingOverlay) {
                        loadingOverlay.classList.remove('active');
                    }
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
            window.SoundEffectsManager.loadSound('rotationToggle', 'Sound Effects/Rotation Toggle.mp3');
            updateStatus('✓ Rotation sound effect loaded', 'success');
        }
        
        loadedComponents.controls = true;
        setButtonState('loadControlsBtn', 'loaded');
        updateStatus('✓ Controls components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Controls:', error);
        updateStatus(`✗ Error loading Controls: ${error.message}`, 'error');
        setButtonState('loadControlsBtn', 'error');
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
    // If already loaded, unload it instead
    if (loadedComponents.music) {
        await unloadMusic();
        return;
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
                    <img src="Music Icon.png" alt="Music" style="width: 100%; height: 100%; object-fit: contain;">
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
                                    <img id="pauseBtnIcon" src="Pause Icon.png" alt="Pause" class="control-icon">
                                </button>
                                <button id="skipBtn" class="music-control-btn">
                                    <img id="skipBtnIcon" src="Skip Icon.png" alt="Skip" class="control-icon">
                                </button>
                                <button id="muteBtn" class="music-control-btn">
                                    <img id="muteBtnIcon" src="Unmuted Icon.png" alt="Mute" class="control-icon">
                                </button>
                                <button id="shuffleBtn" class="music-control-btn">
                                    <img id="shuffleBtnIcon" src="Shuffle Icon.png" alt="Shuffle" class="control-icon">
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
            window.SoundEffectsManager.loadSound('music', 'Sound Effects/Music.mp3');
            updateStatus('✓ Music sound effect loaded', 'success');
        }
        
        // Initialize music panel (from script.js)
        updateStatus('Initializing music panel...', 'info');
        if (typeof initMusicPanel === 'function') {
            initMusicPanel();
            updateStatus('✓ Music panel initialized', 'success');
        } else {
            updateStatus('⚠ initMusicPanel function not found - music panel may not work', 'error');
        }
        
        loadedComponents.music = true;
        setButtonState('loadMusicBtn', 'loaded');
        updateStatus('✓ Music components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Music:', error);
        updateStatus(`✗ Error loading Music: ${error.message}`, 'error');
        setButtonState('loadMusicBtn', 'error');
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
    // If already loaded, unload it instead
    if (loadedComponents.events) {
        await unloadEvents();
        return;
    }
    
    // Globe base must be loaded first
    if (!loadedComponents.globeBase || !window.globeController) {
        updateStatus('⚠ Globe base must be loaded first!', 'error');
        setButtonState('loadEventsBtn', 'error');
        return;
    }
    
    setButtonState('loadEventsBtn', 'loading');
    updateStatus('Starting Events load...', 'info');
    
    try {
        // Load EventManager (it's loaded via script tag, not ES6 module)
        updateStatus('Loading EventManager...', 'info');
        
        // Check if EventManager is already available (loaded via script tag)
        if (typeof EventManager === 'undefined') {
            // Load EventManager script dynamically
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'js/EventManager.js';
                script.onload = async () => {
                    try {
                        // Wait a bit for EventManager to be available
                        await new Promise(r => setTimeout(r, 100));
                        
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
                        reject(error);
                    }
                };
                script.onerror = () => reject(new Error('Failed to load EventManager.js'));
                document.head.appendChild(script);
            });
        } else {
            // EventManager already loaded
            updateStatus('Initializing EventManager...', 'info');
            const eventManager = new EventManager();
            await eventManager.init();
            window.eventManager = eventManager;
            updateStatus('✓ EventManager initialized', 'success');
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
                    <img src="Filter Icon.png" alt="Filters" style="width: 100%; height: 100%; object-fit: contain;">
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
                    <img src="Event Manager Icon.png" alt="Event Manager" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(eventMgrBtn);
            updateStatus('✓ Event manager button added', 'success');
        }
        
        // Setup event listeners AFTER button is created
        if (window.eventManager) {
            updateStatus('Setting up event listeners...', 'info');
            window.eventManager.setupEventListeners();
            updateStatus('✓ Event listeners set up', 'success');
        }
        
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
            window.SoundEffectsManager.loadSound('filterPick', 'Sound Effects/Filter Pick.mp3');
            window.SoundEffectsManager.loadSound('filterOff', 'Sound Effects/Filter Off.mp3');
            window.SoundEffectsManager.loadSound('filterConfirm', 'Sound Effects/Filter Confirm.mp3');
            window.SoundEffectsManager.loadSound('filterClear', 'Sound Effects/Filter Clear.mp3');
            window.SoundEffectsManager.loadSound('filterButton', 'Sound Effects/Filter Button.mp3');
            window.SoundEffectsManager.loadSound('eventClick', 'Sound Effects/Event Click.mp3');
            window.SoundEffectsManager.loadSound('eventManager', 'Sound Effects/Event Manager.mp3');
            window.SoundEffectsManager.loadSound('switchEvent', 'Sound Effects/Switch Event.mp3');
            window.SoundEffectsManager.loadSound('page', 'Sound Effects/Page.mp3');
            updateStatus('✓ Event sound effects loaded', 'success');
        }
        
        // Initialize filter panel functionality
        updateStatus('Initializing filter panel...', 'info');
        if (typeof initFiltersPanel === 'function') {
            initFiltersPanel();
            updateStatus('✓ Filter panel initialized', 'success');
        } else {
            updateStatus('⚠ initFiltersPanel function not found - filter panel may not work', 'error');
        }
        
        // Setup event listeners AFTER all buttons and panels are created
        if (window.eventManager) {
            updateStatus('Setting up event listeners...', 'info');
            // Verify button exists before setting up listeners
            const toggleBtn = document.getElementById('eventsManageToggle');
            const panel = document.getElementById('eventsManagePanel');
            if (toggleBtn && panel) {
                window.eventManager.setupEventListeners();
                updateStatus('✓ Event listeners set up', 'success');
            } else {
                updateStatus(`⚠ Button or panel not found! Button: ${!!toggleBtn}, Panel: ${!!panel}`, 'error');
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
    }
}

/**
 * Run all Universal Features sequentially
 * Loads: Palette, then Music
 */
async function runUniversalFeatures() {
    const runBtn = document.getElementById('runUniversalBtn');
    if (runBtn) {
        runBtn.disabled = true;
    }
    
    updateStatus('🚀 Starting Universal Features auto-load...', 'info');
    
    try {
        // Load Palette
        if (!loadedComponents.palette) {
            updateStatus('→ Loading Palette...', 'info');
            await loadPalette();
            // Small delay between loads
            await new Promise(r => setTimeout(r, 300));
        } else {
            updateStatus('→ Palette already loaded, skipping...', 'info');
        }
        
        // Load Music
        if (!loadedComponents.music) {
            updateStatus('→ Loading Music...', 'info');
            await loadMusic();
        } else {
            updateStatus('→ Music already loaded, skipping...', 'info');
        }
        
        updateStatus('✓ Universal Features auto-load complete!', 'success');
    } catch (error) {
        console.error('Error in Universal Features auto-load:', error);
        updateStatus(`✗ Error in Universal Features auto-load: ${error.message}`, 'error');
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
        }
    }
}

// Make runUniversalFeatures available globally for main.html
window.runUniversalFeatures = runUniversalFeatures;

/**
 * Run all Globe Components sequentially
 * Loads: Globe Base, then Transport, then Controls, then Events
 */
async function runGlobeComponents(isAutoLoad = false) {
    // Play mode switch sound effect only if manually triggered (not auto-load)
    if (!isAutoLoad && window.SoundEffectsManager) {
        if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
            window.SoundEffectsManager.play('modeSwitch');
        } else {
            // Load and play if not already loaded
            window.SoundEffectsManager.loadSound('modeSwitch', 'Music/Mode Switch.mp3');
            setTimeout(() => {
                window.SoundEffectsManager.play('modeSwitch');
            }, 100);
        }
    }
    
    // Save current mode to localStorage
    localStorage.setItem('currentMode', 'globe');
    
    const runBtn = document.getElementById('runGlobeBtn');
    if (runBtn) {
        runBtn.disabled = true;
    }
    
    // Reset progress
    resetGlobeComponentsProgress();
    
    // On main.html, fade component loading to black and show loading overlay
    if (window.location.pathname.includes('main.html') || window.location.href.includes('main.html')) {
        const testContainer = document.querySelector('.test-container');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (testContainer) {
            // Fade out the component loading menu
            testContainer.classList.add('fading');
        }
        
        if (loadingOverlay) {
            // Fade in the black overlay
            setTimeout(() => {
                loadingOverlay.classList.add('active');
            }, 100);
            
            // Wait for fade transition to complete (0.5s) before starting actual loading
            await new Promise(r => setTimeout(r, 600)); // 100ms delay + 500ms transition
        }
    }
    
    updateStatus('🚀 Starting Globe Components auto-load...', 'info');
    
    try {
        // Load Globe Base
        if (!loadedComponents.globeBase) {
            updateStatus('→ Loading Globe Base...', 'info');
            await loadGlobeBase();
            updateGlobeComponentsProgress(1);
            // Small delay between loads
            await new Promise(r => setTimeout(r, 300));
        } else {
            updateStatus('→ Globe Base already loaded, skipping...', 'info');
            updateGlobeComponentsProgress(1);
        }
        
        // Load Transport
        if (!loadedComponents.transport) {
            updateStatus('→ Loading Transport...', 'info');
            await loadTransport();
            updateGlobeComponentsProgress(2);
            await new Promise(r => setTimeout(r, 300));
        } else {
            updateStatus('→ Transport already loaded, skipping...', 'info');
            updateGlobeComponentsProgress(2);
        }
        
        // Load Controls
        if (!loadedComponents.controls) {
            updateStatus('→ Loading Controls...', 'info');
            await loadControls();
            updateGlobeComponentsProgress(3);
            await new Promise(r => setTimeout(r, 300));
        } else {
            updateStatus('→ Controls already loaded, skipping...', 'info');
            updateGlobeComponentsProgress(3);
        }
        
        // Load Events
        if (!loadedComponents.events) {
            updateStatus('→ Loading Events...', 'info');
            await loadEvents();
            updateGlobeComponentsProgress(4);
        } else {
            updateStatus('→ Events already loaded, skipping...', 'info');
            updateGlobeComponentsProgress(4);
        }
        
        updateStatus('✓ Globe Components auto-load complete!', 'success');
        
        // On main.html, fade out black overlay and hide test container
        if (window.location.pathname.includes('main.html') || window.location.href.includes('main.html')) {
            const loadingOverlay = document.getElementById('loadingOverlay');
            const testContainer = document.querySelector('.test-container');
            
            // Fade out the black overlay
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
            
            // Hide test container after overlay fades out (globe already took full space when Globe Base loaded)
            if (testContainer) {
                setTimeout(() => {
                    testContainer.style.display = 'none';
                    
                    // Resize renderer one more time to ensure it matches final layout
                    const globeContainer = document.getElementById('globe-container');
                    if (globeContainer && window.globeController && window.globeController.sceneModel && window.globeController.sceneModel.getRenderer) {
                        setTimeout(() => {
                            const renderer = window.globeController.sceneModel.getRenderer();
                            const camera = window.globeController.sceneModel.getCamera();
                            if (renderer && camera) {
                                const width = globeContainer.clientWidth;
                                const height = globeContainer.clientHeight;
                                if (width > 0 && height > 0) {
                                    camera.aspect = width / height;
                                    camera.updateProjectionMatrix();
                                    renderer.setSize(width, height);
                                }
                            }
                        }, 100);
                    }
                }, 500); // Wait for overlay fade out (0.5s transition)
            }
        }
    } catch (error) {
        console.error('Error in Globe Components auto-load:', error);
        updateStatus(`✗ Error in Globe Components auto-load: ${error.message}`, 'error');
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
        }
    }
}

/**
 * Kill all Universal Features
 */
async function killUniversalFeatures() {
    updateStatus('Killing all Universal Features...', 'info');
    
    if (loadedComponents.palette) {
        await unloadPalette();
    }
    
    if (loadedComponents.music) {
        await unloadMusic();
    }
    
    updateStatus('✓ All Universal Features killed!', 'success');
}

/**
 * Kill all Globe Components
 */
async function killGlobeComponents() {
    updateStatus('Killing all Globe Components...', 'info');
    
    // Unload in reverse order (dependencies first)
    if (loadedComponents.events) {
        await unloadEvents();
    }
    
    if (loadedComponents.controls) {
        await unloadControls();
    }
    
    if (loadedComponents.transport) {
        await unloadTransport();
    }
    
    if (loadedComponents.globeBase) {
        await unloadGlobeBase();
    }
    
    updateStatus('✓ All Globe Components killed!', 'success');
}

/**
 * Run all Glossary Components sequentially
 * (Placeholder - no actual loads yet)
 */
async function runGlossaryComponents(isAutoLoad = false) {
    // Play mode switch sound effect only if manually triggered (not auto-load)
    if (!isAutoLoad && window.SoundEffectsManager) {
        if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
            window.SoundEffectsManager.play('modeSwitch');
        } else {
            // Load and play if not already loaded
            window.SoundEffectsManager.loadSound('modeSwitch', 'Music/Mode Switch.mp3');
            setTimeout(() => {
                window.SoundEffectsManager.play('modeSwitch');
            }, 100);
        }
    }
    
    // Save current mode to localStorage
    localStorage.setItem('currentMode', 'glossary');
    
    const runBtn = document.getElementById('runGlossaryBtn');
    if (runBtn) {
        runBtn.disabled = true;
    }
    
    updateStatus('🚀 Starting Glossary Components auto-load...', 'info');
    
    try {
        // Placeholder - no actual loading yet
        updateStatus('→ Glossary Components loading not yet implemented', 'info');
        
        loadedComponents.glossary = true;
        updateStatus('✓ Glossary Components auto-load complete!', 'success');
    } catch (error) {
        console.error('Error in Glossary Components auto-load:', error);
        updateStatus(`✗ Error in Glossary Components auto-load: ${error.message}`, 'error');
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
        }
    }
}

/**
 * Kill all Glossary Components
 */
async function killGlossaryComponents() {
    updateStatus('Killing all Glossary Components...', 'info');
    
    // Placeholder - no actual unloading yet
    loadedComponents.glossary = false;
    
    updateStatus('✓ All Glossary Components killed!', 'success');
}

/**
 * Run all Biography Components sequentially
 * (Placeholder - no actual loads yet)
 */
async function runBiographyComponents(isAutoLoad = false) {
    // Play mode switch sound effect only if manually triggered (not auto-load)
    if (!isAutoLoad && window.SoundEffectsManager) {
        if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
            window.SoundEffectsManager.play('modeSwitch');
        } else {
            // Load and play if not already loaded
            window.SoundEffectsManager.loadSound('modeSwitch', 'Music/Mode Switch.mp3');
            setTimeout(() => {
                window.SoundEffectsManager.play('modeSwitch');
            }, 100);
        }
    }
    
    // Save current mode to localStorage
    localStorage.setItem('currentMode', 'biography');
    
    const runBtn = document.getElementById('runBiographyBtn');
    if (runBtn) {
        runBtn.disabled = true;
    }
    
    updateStatus('🚀 Starting Biography Components auto-load...', 'info');
    
    try {
        // Placeholder - no actual loading yet
        updateStatus('→ Biography Components loading not yet implemented', 'info');
        
        loadedComponents.biography = true;
        updateStatus('✓ Biography Components auto-load complete!', 'success');
    } catch (error) {
        console.error('Error in Biography Components auto-load:', error);
        updateStatus(`✗ Error in Biography Components auto-load: ${error.message}`, 'error');
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
        }
    }
}

/**
 * Kill all Biography Components
 */
async function killBiographyComponents() {
    updateStatus('Killing all Biography Components...', 'info');
    
    // Placeholder - no actual unloading yet
    loadedComponents.biography = false;
    
    updateStatus('✓ All Biography Components killed!', 'success');
}

// Setup button event listeners
document.addEventListener('DOMContentLoaded', function() {
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
        runUniversalBtn.addEventListener('click', runUniversalFeatures);
    }
    
    if (killUniversalBtn) {
        killUniversalBtn.addEventListener('click', killUniversalFeatures);
    }
    
    if (loadGlobeBaseBtn) {
        loadGlobeBaseBtn.addEventListener('click', loadGlobeBase);
    }
    
    if (loadTransportBtn) {
        loadTransportBtn.addEventListener('click', loadTransport);
    }
    
    if (loadControlsBtn) {
        loadControlsBtn.addEventListener('click', loadControls);
    }
    
    if (loadEventsBtn) {
        loadEventsBtn.addEventListener('click', loadEvents);
    }
    
    if (runGlobeBtn) {
        runGlobeBtn.addEventListener('click', runGlobeComponents);
    }
    
    if (killGlobeBtn) {
        killGlobeBtn.addEventListener('click', killGlobeComponents);
    }
    
    // Glossary components
    const runGlossaryBtn = document.getElementById('runGlossaryBtn');
    const killGlossaryBtn = document.getElementById('killGlossaryBtn');
    
    if (runGlossaryBtn) {
        runGlossaryBtn.addEventListener('click', runGlossaryComponents);
    }
    
    if (killGlossaryBtn) {
        killGlossaryBtn.addEventListener('click', killGlossaryComponents);
    }
    
    // Biography components
    const runBiographyBtn = document.getElementById('runBiographyBtn');
    const killBiographyBtn = document.getElementById('killBiographyBtn');
    
    if (runBiographyBtn) {
        runBiographyBtn.addEventListener('click', runBiographyComponents);
    }
    
    if (killBiographyBtn) {
        killBiographyBtn.addEventListener('click', killBiographyComponents);
    }
    
    updateStatus('Test loader ready. Click buttons to load components.', 'info');
    
    // Auto-run Universal Features on main.html
    if (window.location.pathname.includes('main.html') || window.location.href.includes('main.html')) {
        // Check for saved mode first - hide menu immediately if mode exists
        const savedMode = localStorage.getItem('currentMode');
        if (savedMode) {
            console.log('Main page: Found saved mode:', savedMode, '- Hiding menu immediately');
            // Hide the test container immediately to prevent brief flash
            const testContainer = document.querySelector('.test-container');
            if (testContainer) {
                testContainer.style.display = 'none';
                testContainer.style.opacity = '0';
            }
        }
        
        console.log('Main page detected: Auto-running Universal Features...');
        // Small delay to ensure everything is ready
        setTimeout(function() {
            runUniversalFeatures();
        }, 100);
        
        // Check for saved mode and auto-load it (without sound)
        if (savedMode) {
            console.log('Main page: Auto-loading saved mode:', savedMode);
            // Wait a bit longer to ensure all components are ready
            setTimeout(function() {
                if (savedMode === 'globe') {
                    console.log('Main page: Auto-loading Globe mode (silent)...');
                    runGlobeComponents(true); // Pass true to indicate auto-load
                } else if (savedMode === 'glossary') {
                    console.log('Main page: Auto-loading Glossary mode (silent)...');
                    runGlossaryComponents(true); // Pass true to indicate auto-load
                } else if (savedMode === 'biography') {
                    console.log('Main page: Auto-loading Biography mode (silent)...');
                    runBiographyComponents(true); // Pass true to indicate auto-load
                }
            }, 500); // Wait 500ms after Universal Features start
        }
    }
});

