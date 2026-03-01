/**
 * PaletteManager - Handles color palette toggle functionality
 * Extracted from component-loader.js to improve maintainability
 */

// Track if palette toggle is already set up to prevent duplicate listeners
let paletteToggleSetup = false;

/**
 * Setup palette toggle functionality
 * This is needed when the button is added dynamically after DOMContentLoaded
 */
export function setupPaletteToggle() {
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
        
        const iconPath = palette === 'gray' ? 'assets/images/icons/Dark Palette Icon.png' : 'assets/images/icons/Blue Palette Icon.png';
        
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
            const texturePath = isGray ? 'assets/images/maps/MAP Black.png' : 'assets/images/maps/MAP.png';
            window.globeController.globeView.changeGlobeTexture(texturePath);
            
            // Change Moon and Mars textures
            const moonTexturePath = isGray ? 'assets/images/misc/Moon_Dark.png' : 'assets/images/misc/Moon.png';
            const marsTexturePath = isGray ? 'assets/images/misc/Mars_Dark.png' : 'assets/images/misc/Mars.png';
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
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                window.SoundEffectsManager.play('colorChange');
            } else {
                // Load and play if not already loaded
                window.SoundEffectsManager.loadSound('colorChange', 'assets/audio/sfx/Color Change.mp3');
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
                    window.SoundEffectsManager.loadSound('colorChange', 'assets/audio/sfx/Color Change.mp3');
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
            // Desktop uses a scaled body (see styles/base.css). Compensate so the menu
            // visually clears the footer/button area even under transform: scale(...).
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            const desktopBottomPx = 190; // tuned: 190*0.67 ≈ 127px visual
            menu.style.bottom = isMobile ? '150px' : `${desktopBottomPx}px`;
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
 * Reset palette toggle setup flag
 * Used when unloading palette
 */
export function resetPaletteToggleSetup() {
    paletteToggleSetup = false;
}
