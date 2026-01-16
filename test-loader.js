/**
 * Test Loader - Modular component loading for testing
 * Allows loading individual components (Globe, Music, Events) on demand
 */

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

// Loading overlay helpers for test page
let isRunOperation = false; // Flag to track if we're in a run operation

function showLoadingOverlay() {
    // Works for both test.html and main.html
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        // Force immediate visibility (no transition delay)
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
        loadingOverlay.classList.add('active');
        console.log('[Loading Overlay] Showing overlay');
    } else {
        console.warn('[Loading Overlay] Overlay element not found!');
    }
}

function hideLoadingOverlay() {
    // Don't hide overlay if we're in a run operation (let the run function handle it)
    if (isRunOperation) {
        console.log('[Loading Overlay] Skipping hide - run operation in progress');
        return;
    }
    
    // Works for both test.html and main.html
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        // Reset inline styles to allow CSS transition
        loadingOverlay.style.opacity = '';
        loadingOverlay.style.visibility = '';
        console.log('[Loading Overlay] Hiding overlay');
    }
}

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
        // Replace content with single current message
        if (statusContent) {
            statusContent.innerHTML = ''; // Clear all previous messages
            const item = document.createElement('div');
            item.className = `test-status-item ${type}`;
            item.textContent = message;
            statusContent.appendChild(item);
        }
    } else {
        // Use regular test status (replace for test page)
    const statusDiv = document.getElementById('testStatus');
        statusContent = document.getElementById('statusContent');
    if (statusDiv && statusContent) {
        statusDiv.style.display = 'block';
        statusContent.innerHTML = ''; // Clear all previous messages
        const item = document.createElement('div');
        item.className = `test-status-item ${type}`;
        item.textContent = message;
        statusContent.appendChild(item);
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
    
    // Check if already set up - if so, just ensure state is applied and listeners exist
    const wasAlreadySetup = paletteToggleSetup && colorPaletteToggle.dataset.setup === 'true';
    
    // Always apply saved state
    const savedPalette = localStorage.getItem('colorPalette');
    if (savedPalette === 'gray') {
        document.body.classList.add('color-palette-gray');
    } else {
        document.body.classList.remove('color-palette-gray');
    }
    
    // If already set up, verify listeners are still attached, then return
    if (wasAlreadySetup) {
        // Verify menu exists and has listeners
        const paletteMenu = document.getElementById('paletteMenu');
        if (paletteMenu) {
            const optionButtons = paletteMenu.querySelectorAll('.palette-option-btn');
            // Check if any button is missing its handler
            let needsReattach = false;
            optionButtons.forEach(btn => {
                if (!btn._paletteOptionHandler) {
                    needsReattach = true;
                }
            });
            // If listeners are missing, continue with setup to reattach them
            if (!needsReattach && colorPaletteToggle._paletteButtonHandler) {
                // Update active state
                if (window.updatePaletteMenuActiveState) {
                    window.updatePaletteMenuActiveState(savedPalette === 'gray' ? 'gray' : 'blue');
                }
                return;
            }
        }
        // If we get here, something is missing - continue with full setup
    }
    
    // Mark as set up
    colorPaletteToggle.dataset.setup = 'true';
    paletteToggleSetup = true;
    
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
        blueBtn.setAttribute('aria-label', 'Blue Palette');
        // Add a visual indicator inside the button
        blueBtn.innerHTML = '<span style="display: block; width: 100%; height: 100%; border-radius: 50%;"></span>';
        paletteMenu.appendChild(blueBtn);
        console.log('[Palette] Created blue button:', blueBtn);
        
        // Black/Gray palette option button
        const blackBtn = document.createElement('button');
        blackBtn.className = 'palette-option-btn black';
        blackBtn.dataset.palette = 'gray';
        blackBtn.title = 'Gray Palette';
        blackBtn.setAttribute('aria-label', 'Gray Palette');
        // Add a visual indicator inside the button
        blackBtn.innerHTML = '<span style="display: block; width: 100%; height: 100%; border-radius: 50%;"></span>';
        paletteMenu.appendChild(blackBtn);
        console.log('[Palette] Created black button:', blackBtn);
        
        document.body.appendChild(paletteMenu);
        console.log('[Palette] Menu appended to body, total children:', paletteMenu.children.length);
    }
    
    // Update menu active state and icon (savedPalette was already retrieved and applied above)
    updatePaletteMenuActiveState(savedPalette === 'gray' ? 'gray' : 'blue');
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
        
        console.log('Palette changed to:', palette);
        
        // Change globe texture (only on pages with globe)
        if (window.globeController && window.globeController.globeView) {
            const texturePath = isGray ? 'Maps/MAP Black.png' : 'Maps/MAP.png';
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
        
        // Close menu after selection
        closePaletteMenu();
    }
    
    // Handle palette button click - toggle menu
    const handlePaletteButtonClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[Palette] Button clicked');
        const menu = document.getElementById('paletteMenu');
        if (!menu) {
            console.error('[Palette] Menu not found!');
            return;
        }
        
        console.log('[Palette] Menu found, current state:', menu.classList.contains('open') ? 'open' : 'closed');
        
        if (menu.classList.contains('open')) {
            console.log('[Palette] Closing menu');
            closePaletteMenu();
        } else {
            console.log('[Palette] Opening menu');
            openPaletteMenu();
            
            // Play sound effect when opening menu
            if (window.SoundEffectsManager) {
                if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                    window.SoundEffectsManager.play('colorChange');
                } else {
                    // Load and play if not already loaded
                    window.SoundEffectsManager.loadSound('colorChange', 'Sound Effects/Color Change.mp3');
                    setTimeout(() => {
                        if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                            window.SoundEffectsManager.play('colorChange');
                        }
                    }, 100);
                }
            }
        }
    };
    
    // Handle palette option button clicks
    const handlePaletteOptionClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const palette = this.dataset.palette;
        if (palette) {
            changePalette(palette);
        }
    };
    
    // Open palette menu
    function openPaletteMenu() {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        console.log('[Palette] openPaletteMenu called, menu:', menu, 'toggle:', toggle);
        if (menu) {
            menu.classList.add('open');
            // Force visibility with inline styles as fallback
            menu.style.opacity = '1';
            menu.style.visibility = 'visible';
            menu.style.transform = 'translateY(0)';
            menu.style.pointerEvents = 'auto';
            menu.style.display = 'flex';
            menu.style.position = 'fixed';
            menu.style.bottom = '150px'; // Pushed further up to avoid overlap with button
            menu.style.right = '20px';
            menu.style.zIndex = '300';
            menu.style.flexDirection = 'column';
            menu.style.gap = '10px';
            menu.style.alignItems = 'flex-end'; // Align circles to the right
            console.log('[Palette] Added "open" class to menu, classes:', menu.className);
            console.log('[Palette] Menu computed styles:', {
                opacity: window.getComputedStyle(menu).opacity,
                visibility: window.getComputedStyle(menu).visibility,
                display: window.getComputedStyle(menu).display,
                zIndex: window.getComputedStyle(menu).zIndex
            });
            
            // Check if buttons exist
            const buttons = menu.querySelectorAll('.palette-option-btn');
            console.log('[Palette] Number of option buttons found:', buttons.length);
            buttons.forEach((btn, index) => {
                console.log(`[Palette] Button ${index}:`, btn, 'classes:', btn.className);
            });
        } else {
            console.error('[Palette] Menu element not found!');
        }
        if (toggle) {
            toggle.classList.add('active');
            console.log('[Palette] Added "active" class to toggle');
        }
    }
    
    // Close palette menu
    function closePaletteMenu() {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        if (menu) {
            menu.classList.remove('open');
            // Reset inline styles
            menu.style.opacity = '';
            menu.style.visibility = '';
            menu.style.transform = '';
            menu.style.pointerEvents = '';
        }
        if (toggle) {
            toggle.classList.remove('active');
        }
    }
    
    // Store close function globally so click outside handler can access it
    window._closePaletteMenu = closePaletteMenu;
    
    // Remove old event listeners if they exist (to prevent duplicates)
    const oldHandler = colorPaletteToggle._paletteButtonHandler;
    if (oldHandler) {
        colorPaletteToggle.removeEventListener('click', oldHandler, true);
    }
    
    // Attach handlers - store reference to allow removal later
    colorPaletteToggle._paletteButtonHandler = handlePaletteButtonClick;
    colorPaletteToggle.addEventListener('click', handlePaletteButtonClick, true);
    
    // Remove old listeners from option buttons and attach new ones
    const optionButtons = paletteMenu.querySelectorAll('.palette-option-btn');
    optionButtons.forEach(btn => {
        const oldOptionHandler = btn._paletteOptionHandler;
        if (oldOptionHandler) {
            btn.removeEventListener('click', oldOptionHandler);
        }
        btn._paletteOptionHandler = handlePaletteOptionClick;
        btn.addEventListener('click', handlePaletteOptionClick);
    });
    
    // Close menu when clicking outside - only add once globally
    // Use capture phase to ensure it runs before stopPropagation() in option buttons
    if (!window._paletteClickOutsideHandler) {
        window._paletteClickOutsideHandler = function(e) {
            const menu = document.getElementById('paletteMenu');
            const toggle = document.getElementById('colorPaletteToggle');
            
            if (menu && menu.classList.contains('open')) {
                // Check if click is outside both menu and toggle button
                // Also check if click is on a palette option button (which should close the menu via changePalette)
                const isPaletteOption = e.target.closest('.palette-option-btn');
                if (!menu.contains(e.target) && toggle && !toggle.contains(e.target) && !isPaletteOption) {
                    if (window._closePaletteMenu) {
                        window._closePaletteMenu();
                    }
                }
            }
        };
        // Use capture phase (true) to catch events before they're stopped by stopPropagation
        document.addEventListener('click', window._paletteClickOutsideHandler, true);
    }
    
    // Make updatePaletteMenuActiveState available globally for state updates
    window.updatePaletteMenuActiveState = updatePaletteMenuActiveState;
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
                    <img src="Icons/Palette Icon.png" alt="Color Palette" style="width: 100%; height: 100%; object-fit: contain;">
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
                    <img src="Icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">
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
                    <img src="Icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">
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
                    <img src="Icons/Home Button.png" alt="Exit" style="width: 100%; height: 100%; object-fit: contain;">
                </span>
            `;
            document.getElementById('content').appendChild(exitBtn);
            updateStatus('✓ Exit button added', 'success');
            
            // Setup exit button click handler
            exitBtn.addEventListener('click', async function() {
                console.log('[Exit Button] Exit clicked, starting exit process...');
                
                // Set run operation flag FIRST to prevent individual functions from hiding overlay
                isRunOperation = true;
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
                        window.SoundEffectsManager.loadSound('modeSwitch', 'Music/Mode Switch.mp3');
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
                    isRunOperation = false;
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
                    <img src="Icons/Music Icon.png" alt="Music" style="width: 100%; height: 100%; object-fit: contain;">
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
                                    <img id="pauseBtnIcon" src="Icons/Pause Icon.png" alt="Pause" class="control-icon">
                                </button>
                                <button id="skipBtn" class="music-control-btn">
                                    <img id="skipBtnIcon" src="Icons/Skip Icon.png" alt="Skip" class="control-icon">
                                </button>
                                <button id="muteBtn" class="music-control-btn">
                                    <img id="muteBtnIcon" src="Icons/Unmuted Icon.png" alt="Mute" class="control-icon">
                                </button>
                                <button id="shuffleBtn" class="music-control-btn">
                                    <img id="shuffleBtnIcon" src="Icons/Shuffle Icon.png" alt="Shuffle" class="control-icon">
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
                script.src = 'js/EventManager.js?' + Date.now(); // Cache busting
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
                    <img src="Icons/Filter Icon.png" alt="Filters" style="width: 100%; height: 100%; object-fit: contain;">
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
                    <img src="Icons/Event Manager Icon.png" alt="Event Manager" style="width: 100%; height: 100%; object-fit: contain;">
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
                <img src="Main Menu Buttons/Global Timeline.png" alt="Global Timeline">
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
                    <img src="Main Menu Buttons/Concept Glossary.png" alt="Concept Glossary">
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
                    <img src="Main Menu Buttons/Character Bios.png" alt="Character Bios">
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
                isRunOperation = true;
                showLoadingOverlay();
                try {
                    await runGlobeComponents();
                } catch (error) {
                    console.error('Error in runGlobeComponents:', error);
                    isRunOperation = false;
                    hideLoadingOverlay();
                }
            });
            updateStatus('✓ Global Timeline button listener added', 'success');
        }
<<<<<<< HEAD
        
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
=======
        if (typeof runGlossaryComponents === 'function') {
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
        if (typeof runBiographyComponents === 'function') {
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
>>>>>>> origin/main
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

/**
 * Run all Menu Components
 * Simply ensures menu is loaded and visible
 */
async function runMenuComponents() {
    // Note: isRunOperation and overlay should already be set by the button click handler
    // But if called directly (not from button), set them here
    if (!isRunOperation) {
        isRunOperation = true;
        showLoadingOverlay();
    }
    updateStatus('🚀 Running Menu Components...', 'info');
    
    try {
        // If menu is not loaded, load it first
        if (!loadedComponents.menu) {
            updateStatus('→ Menu not loaded, loading now...', 'info');
            await loadMenu();
        } else {
            updateStatus('→ Menu already loaded', 'info');
        }
        
        // Ensure menu is visible
        const testContainer = document.querySelector('.test-container');
        const menuButtons = testContainer ? testContainer.querySelector('.main-menu-buttons') : null;
        
        if (menuButtons) {
            menuButtons.style.display = 'flex';
            updateStatus('✓ Menu Components are running!', 'success');
        } else {
            updateStatus('⚠ Menu buttons not found', 'error');
        }
    } catch (error) {
        console.error('Error running Menu Components:', error);
        updateStatus(`✗ Error running Menu Components: ${error.message}`, 'error');
    } finally {
        isRunOperation = false;
        hideLoadingOverlay();
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
    
    // Note: isRunOperation and overlay should already be set by the button click handler
    // But if called directly (not from button), set them here
    if (!isRunOperation) {
        isRunOperation = true;
        showLoadingOverlay();
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
        isRunOperation = false;
        hideLoadingOverlay();
        if (runBtn) {
            runBtn.disabled = false;
        }
    }
}

// Make runUniversalFeatures, runMenuComponents, and runGlobeComponents available globally
window.runUniversalFeatures = runUniversalFeatures;
window.runMenuComponents = runMenuComponents;
window.runGlobeComponents = runGlobeComponents;

/**
 * Run all Globe Components sequentially
 * Loads: Globe Base, then Transport, then Controls, then Events
 */
async function runGlobeComponents(isAutoLoad = false) {
    // Note: isRunOperation and overlay should already be set by the button click handler
    // But if called directly (not from button), set them here
    if (!isRunOperation) {
        isRunOperation = true;
        showLoadingOverlay();
        // Small delay to ensure overlay is rendered before starting loads
        await new Promise(r => setTimeout(r, 50));
    }
    
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
    
    // Hide the test-container completely (which contains the main menu buttons)
    const testContainer = document.querySelector('.test-container');
    if (testContainer) {
        testContainer.style.display = 'none';
        updateStatus('→ Hiding menu container...', 'info');
    }
    
    // Hide globe container initially - we'll show it after everything is loaded
    const globeContainer = document.getElementById('globe-container');
    if (globeContainer) {
        globeContainer.style.display = 'none';
        globeContainer.style.width = '100%';
        globeContainer.style.height = '100%';
        updateStatus('→ Preparing globe container...', 'info');
    }
    
    updateStatus('🚀 Starting Globe Components auto-load...', 'info');
    
    try {
        // Load Globe Base
        if (!loadedComponents.globeBase) {
            updateStatus('→ Loading Globe Base...', 'info');
            await loadGlobeBase();
            // Show globe container immediately after Globe Base loads
            if (globeContainer) {
                globeContainer.style.opacity = '1';
                globeContainer.style.pointerEvents = 'auto';
                globeContainer.style.display = 'block';
                globeContainer.classList.add('loaded');
            }
            updateGlobeComponentsProgress(1);
            // Small delay between loads
            await new Promise(r => setTimeout(r, 300));
        } else {
            updateStatus('→ Globe Base already loaded, skipping...', 'info');
            // If already loaded, make sure globe is visible
            if (globeContainer) {
                globeContainer.style.opacity = '1';
                globeContainer.style.pointerEvents = 'auto';
                globeContainer.style.display = 'block';
                globeContainer.classList.add('loaded');
            }
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
        
        // Globe container should already be visible (shown after Globe Base loaded)
        // Just ensure it's still visible
        if (globeContainer) {
            globeContainer.style.opacity = '1';
            globeContainer.style.pointerEvents = 'auto';
            globeContainer.style.display = 'block';
            globeContainer.classList.add('loaded');
        }
    } catch (error) {
        console.error('Error in Globe Components auto-load:', error);
        updateStatus(`✗ Error in Globe Components auto-load: ${error.message}`, 'error');
    } finally {
        isRunOperation = false;
        hideLoadingOverlay();
        if (runBtn) {
            runBtn.disabled = false;
        }
    }
}

/**
 * Kill all Menu Components
 */
async function killMenuComponents() {
    updateStatus('Killing all Menu Components...', 'info');
    
    if (loadedComponents.menu) {
        await unloadMenu();
    }
    
    updateStatus('✓ All Menu Components killed!', 'success');
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
 * Restore main menu (show test-container, hide globe)
 * Make it globally accessible
 */
window.restoreMainMenu = async function restoreMainMenu() {
    const testContainer = document.querySelector('.test-container');
    const globeContainer = document.getElementById('globe-container');
    
    // Ensure menu is loaded (reload if it was killed)
    if (!loadedComponents.menu) {
        updateStatus('Loading menu components...', 'info');
        await loadMenu();
    }
    
    // Restore menu visibility - ensure it's fully visible
    const menuButtons = testContainer ? testContainer.querySelector('.main-menu-buttons') : null;
    if (testContainer) {
        testContainer.style.display = 'flex';
        testContainer.classList.remove('fading');
        testContainer.style.opacity = '1';
        testContainer.style.visibility = 'visible';
    }
    
    // Restore menu buttons visibility
    if (menuButtons) {
        menuButtons.style.display = 'flex';
        menuButtons.style.visibility = 'visible';
        menuButtons.style.opacity = '1';
    }
    
    // Hide globe and reset its positioning
    if (globeContainer) {
        globeContainer.style.display = 'none';
        globeContainer.classList.remove('loaded');
        globeContainer.style.position = '';
        globeContainer.style.top = '';
        globeContainer.style.left = '';
    }
    
    // Close any open panels
    const eventSlide = document.getElementById('eventSlide');
    const eventsManagePanel = document.getElementById('eventsManagePanel');
    const filtersPanel = document.getElementById('filtersPanel');
    
    if (eventSlide) eventSlide.classList.remove('open');
    if (eventsManagePanel) eventsManagePanel.classList.remove('open');
    if (filtersPanel) filtersPanel.classList.remove('open');
    
    // Remove active states from buttons
    const eventsManageToggle = document.getElementById('eventsManageToggle');
    const filtersToggle = document.getElementById('filtersToggle');
    if (eventsManageToggle) eventsManageToggle.classList.remove('active');
    if (filtersToggle) filtersToggle.classList.remove('active');
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
    
    // Restore the menu (test-container) when killing globe components
    // This will also load menu if not already loaded
    await restoreMainMenu();
    
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
    
    // Note: isRunOperation and overlay should already be set by the button click handler
    // But if called directly (not from button), set them here
    if (!isRunOperation) {
        isRunOperation = true;
        showLoadingOverlay();
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
        isRunOperation = false;
        hideLoadingOverlay();
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
    
    // Note: isRunOperation and overlay should already be set by the button click handler
    // But if called directly (not from button), set them here
    if (!isRunOperation) {
        isRunOperation = true;
        showLoadingOverlay();
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
        isRunOperation = false;
        hideLoadingOverlay();
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

