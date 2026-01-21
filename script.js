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
    // Legacy: previously navigated to map.html (now removed)
    window.location.href = 'main.html';
}

function showAbout() {
    window.location.href = 'filters.html';
}

// Sound Effects Manager is now loaded from src/services/SoundEffectsManager.js
// It's available globally as window.SoundEffectsManager

function showContact() {
    // Legacy: previously navigated to map.html (now removed)
    window.location.href = 'main.html';
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

// Asset loading order tracking
const assetLoadOrder = [];
const logAssetLoad = (assetType, assetName) => {
    const timestamp = performance.now().toFixed(2);
    const entry = `[${timestamp}ms] ${assetType}: ${assetName}`;
    assetLoadOrder.push(entry);
    console.log(entry);
};

// Log page name
const pageName = window.location.pathname.split('/').pop() || 'index.html';
logAssetLoad('PAGE', pageName);

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    logAssetLoad('DOM', 'DOMContentLoaded event fired');
    console.log('Website loaded successfully!');
    
    // Initialize sound effects manager
    if (window.SoundEffectsManager) {
        logAssetLoad('SOUND_EFFECTS', 'Initializing SoundEffectsManager');
        window.SoundEffectsManager.init();
    }
    
    // Initialize sidebar service
    if (window.SidebarService && typeof window.SidebarService.init === 'function') {
        window.SidebarService.init();
    } else {
        console.warn('SidebarService not available - make sure src/services/SidebarService.js is loaded before script.js');
    }
    
    // NOTE: MusicManager.init() is now called from component-loader.js after music components are loaded
    // This ensures the music button and panel elements exist before initialization
    // The old initialization here has been moved to loadMusic() function
    
    setTimeout(() => {
        // Then initialize Filters Panel (if elements exist - they may be created later when Events component loads)
        if (typeof logAssetLoad === 'function') logAssetLoad('INIT', 'Initializing Filters Panel');
        // Only try to initialize if elements exist, otherwise it will be initialized when Events component loads
        const filtersButton = document.getElementById('filtersToggle');
        const filtersPanel = document.getElementById('filtersPanel');
        const filtersGrid = document.getElementById('filtersGrid');
        // Use FilterService if available
        if (window.FilterService && typeof window.FilterService.init === 'function') {
            window.FilterService.init();
        } else {
            console.warn('FilterService not available - make sure src/services/FilterService.js is loaded before script.js');
        }
        
        // Log asset loading summary
        if (typeof logAssetLoad === 'function' && assetLoadOrder.length > 0) {
            console.log('\n=== ASSET LOADING ORDER SUMMARY ===');
            assetLoadOrder.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry}`);
            });
            console.log(`\nTotal assets logged: ${assetLoadOrder.length}`);
            console.log('=====================================\n');
        }
    }, 100);
});

// Music Panel functionality has been moved to src/services/MusicManager.js
// The old initMusicPanel function is no longer needed - use MusicManager.init() instead

// Filters Panel functionality has been moved to src/services/FilterService.js
// The old initFiltersPanel function is no longer needed - use FilterService.init() instead

// Optional: Add keyboard shortcut to close modal (ESC key)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Color Palette Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    
    const colorPaletteToggle = document.getElementById('colorPaletteToggle');
    if (!colorPaletteToggle) return;
    
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
        paletteMenu.appendChild(blueBtn);
        
        // Black/Gray palette option button
        const blackBtn = document.createElement('button');
        blackBtn.className = 'palette-option-btn black';
        blackBtn.dataset.palette = 'gray';
        blackBtn.title = 'Gray Palette';
        paletteMenu.appendChild(blackBtn);
        
        document.body.appendChild(paletteMenu);
    }
    
    // Load saved color palette preference (default to blue if not set)
    const savedPalette = localStorage.getItem('colorPalette');
    if (savedPalette === 'gray') {
        document.body.classList.add('color-palette-gray');
        updatePaletteMenuActiveState('gray');
    } else {
        // Default to blue palette
        document.body.classList.remove('color-palette-gray');
        updatePaletteMenuActiveState('blue');
    }
    
    // Update icon on initial load
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
            console.log('Attempting to play colorChange sound...');
            console.log('Available sounds:', Object.keys(window.SoundEffectsManager.sounds || {}));
            
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                const result = window.SoundEffectsManager.play('colorChange');
                if (!result) {
                    console.warn('Failed to play colorChange sound');
                }
            } else {
                console.warn('colorChange sound not loaded. Attempting to load now...');
                // Load and play if not already loaded
                window.SoundEffectsManager.loadSound('colorChange', 'assets/audio/sfx/Color Change.mp3');
                setTimeout(() => {
                    if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['colorChange']) {
                        console.log('colorChange sound loaded, playing now...');
                        window.SoundEffectsManager.play('colorChange');
                    } else {
                        console.error('Failed to load Color Change sound effect. Check if file exists at: assets/audio/sfx/Color Change.mp3');
                    }
                }, 100);
            }
        } else {
            console.warn('SoundEffectsManager not available');
        }
        
        // Close menu after selection
        closePaletteMenu();
    }
    
    // Handle palette button click - toggle menu
    colorPaletteToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const menu = document.getElementById('paletteMenu');
        if (!menu) return;
        
        if (menu.classList.contains('open')) {
            closePaletteMenu();
        } else {
            openPaletteMenu();
        }
    });
    
    // Handle palette option button clicks
    const optionButtons = paletteMenu.querySelectorAll('.palette-option-btn');
    optionButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const palette = this.dataset.palette;
            if (palette) {
                changePalette(palette);
            }
        });
    });
    
    // Open palette menu
    function openPaletteMenu() {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        if (menu) {
            menu.classList.add('open');
        }
        if (toggle) {
            toggle.classList.add('active');
        }
    }
    
    // Close palette menu
    function closePaletteMenu() {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        if (menu) {
            menu.classList.remove('open');
        }
        if (toggle) {
            toggle.classList.remove('active');
        }
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('paletteMenu');
        const toggle = document.getElementById('colorPaletteToggle');
        
        if (menu && menu.classList.contains('open')) {
            // Check if click is outside both menu and toggle button
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                closePaletteMenu();
            }
        }
    });
});


