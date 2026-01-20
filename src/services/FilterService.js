/**
 * FilterService - Manages filter panel functionality
 * Handles hero/faction filtering, filter selection, and applying filters to events
 */

class FilterService {
    constructor() {
        this.initialized = false;
        this.heroes = [];
        this.factions = [];
        this.selectedFilters = new Set();
        this.currentFilterType = 'heroes'; // 'heroes' or 'factions'
        this.buttonCache = {
            heroes: null,
            factions: null,
            music: null
        };
        
        // DOM elements (will be set in init)
        this.filtersButton = null;
        this.filtersPanel = null;
        this.filtersPanelClose = null;
        this.filtersGrid = null;
        this.clearFiltersBtn = null;
        this.confirmFiltersBtn = null;
        this.heroesTab = null;
        this.factionsTab = null;
    }
    
    init() {
        // Prevent double initialization
        if (this.initialized) {
            console.log('Filters panel already initialized, skipping...');
            return;
        }
        
        // Get DOM elements
        this.filtersButton = document.getElementById('filtersToggle');
        this.filtersPanel = document.getElementById('filtersPanel');
        this.filtersPanelClose = document.getElementById('filtersPanelClose');
        this.filtersGrid = document.getElementById('filtersGrid');
        this.clearFiltersBtn = document.getElementById('clearFiltersBtn');
        this.confirmFiltersBtn = document.getElementById('confirmFiltersBtn');
        this.heroesTab = document.getElementById('heroesTab');
        this.factionsTab = document.getElementById('factionsTab');
        
        console.log('Initializing filters panel...');
        console.log('Filters button:', this.filtersButton);
        console.log('Filters panel:', this.filtersPanel);
        console.log('Filters grid:', this.filtersGrid);
        
        if (!this.filtersButton || !this.filtersPanel || !this.filtersGrid) {
            // Elements not found - this is expected if Events component hasn't loaded yet
            // Don't log as error, just return silently
            return;
        }
        
        // Mark as initialized
        this.initialized = true;
        
        // Initialize with confirmed filters
        this.resetToConfirmedFilters();
        
        // Load manifest
        this.loadManifest();
        
        // Setup tab switching
        this.setupTabs();
        
        // Setup button handlers
        this.setupButtons();
        
        // Setup click outside handler
        this.setupClickOutside();
    }
    
    // Function to get confirmed filters from sceneModel
    getConfirmedFilters() {
        if (window.globeController && window.globeController.sceneModel && window.globeController.sceneModel.activeFilters) {
            return new Set(window.globeController.sceneModel.activeFilters);
        }
        return new Set();
    }
    
    // Function to reset selectedFilters to confirmed state and update button states
    resetToConfirmedFilters() {
        const confirmedFilters = this.getConfirmedFilters();
        
        // Reset selectedFilters to match confirmed filters
        this.selectedFilters.clear();
        confirmedFilters.forEach(filter => this.selectedFilters.add(filter));
        
        // Update button visual states
        if (this.filtersGrid) {
            const allButtons = this.filtersGrid.querySelectorAll('.filter-btn');
            allButtons.forEach(btn => {
                const filterKey = btn.dataset.filterKey;
                if (filterKey) {
                    if (this.selectedFilters.has(filterKey)) {
                        btn.classList.add('selected');
                    } else {
                        btn.classList.remove('selected');
                    }
                }
            });
        }
        
        // Update filter counts
        this.updateFilterCounts();
    }
    
    // Load manifest
    async loadManifest() {
        try {
            // Add cache busting to ensure we get the latest manifest
            // Use both timestamp and random number for better cache busting
            const cacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const response = await fetch(`manifest.json?v=${cacheBuster}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const manifest = await response.json();
            
            if (manifest.heroes) {
                this.heroes = manifest.heroes.sort(); // Sort alphabetically
            }
            
            if (manifest.factions) {
                this.factions = manifest.factions.map(f => ({
                    filename: f.filename,
                    number: f.number,
                    displayName: f.displayName
                })).sort((a, b) => a.number - b.number); // Sort by number
            }
            
            // Initialize with loaded data
            this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
            this.updateFilterCounts();
            
            // Preload faction images in background
            if (this.factions.length > 0) {
                setTimeout(() => {
                    this.preloadImages(this.factions, 'factions', 'assets/images/factions');
                }, 500);
            }
        } catch (error) {
            console.error('Error loading manifest.json:', error);
            console.log('Falling back to empty lists. Run generate-manifest.js to create manifest.json');
            // Fallback to empty arrays if manifest doesn't exist
            this.heroes = [];
            this.factions = [];
            this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
        }
    }
    
    // Function to update filter counts
    updateFilterCounts() {
        const heroesCount = document.getElementById('heroesCount');
        const factionsCount = document.getElementById('factionsCount');
        
        let heroCount = 0;
        let factionCount = 0;
        
        this.selectedFilters.forEach(filter => {
            // Check if it's a faction (has number prefix) or hero
            if (/^\d+/.test(filter)) {
                factionCount++;
            } else {
                heroCount++;
            }
        });
        
        // Only display count if greater than 0
        if (heroesCount) {
            if (heroCount > 0) {
                heroesCount.textContent = heroCount;
                heroesCount.style.display = 'inline';
            } else {
                heroesCount.style.display = 'none';
            }
        }
        if (factionsCount) {
            if (factionCount > 0) {
                factionsCount.textContent = factionCount;
                factionsCount.style.display = 'inline';
            } else {
                factionsCount.style.display = 'none';
            }
        }
    }
    
    // Preload all images for faster tab switching (with batching to avoid overwhelming server)
    preloadImages(items, type, folder) {
        // Batch images to avoid overwhelming the server
        const batchSize = 5; // Load 5 images at a time
        const delayBetweenBatches = 100; // 100ms delay between batches
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            setTimeout(() => {
                batch.forEach(item => {
                    let imagePath;
                    if (type === 'factions') {
                        // Encode faction filename to handle spaces and special characters
                        const encodedFilename = encodeURIComponent(item.filename);
                        imagePath = `${folder}/${encodedFilename}.png`;
                    } else if (type === 'music') {
                        const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                        // Encode the path properly for URLs (handles spaces and special characters)
                        const encodedIconName = encodeURIComponent(iconName);
                        imagePath = `${folder}/${encodedIconName}.png`;
                    } else {
                        // heroes
                        imagePath = `${folder}/${item}.png`;
                    }
                    
                    const img = new Image();
                    // Use aggressive cache busting to ensure latest images load
                    const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    img.src = `${imagePath}?v=${imageCacheBuster}`;
                    
                    // Add error handling with retry
                    img.onerror = function() {
                        // Retry once after a delay with new cache buster
                        setTimeout(() => {
                            const retryCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            this.src = `${imagePath}?v=${retryCacheBuster}`;
                        }, 500);
                    };
                });
            }, (i / batchSize) * delayBetweenBatches);
        }
    }
    
    // Helper function to get hero display name (maps filename to display name)
    getHeroDisplayName(heroName) {
        const heroDisplayNames = {
            'Soldier 76': 'Soldier: 76'
        };
        return heroDisplayNames[heroName] || heroName;
    }
    
    // Function to create filter buttons (with caching)
    createFilterButtons(items, type, folder) {
        if (!this.filtersGrid) return;
        
        // Check if we have cached buttons
        if (this.buttonCache[type]) {
            this.filtersGrid.innerHTML = '';
            // Reuse cached buttons
            this.buttonCache[type].forEach(cachedBtn => {
                const filterKey = cachedBtn.dataset.filterKey;
                // Update selection state
                if (this.selectedFilters.has(filterKey)) {
                    cachedBtn.classList.add('selected');
                } else {
                    cachedBtn.classList.remove('selected');
                }
                this.filtersGrid.appendChild(cachedBtn);
            });
            this.updateFilterCounts();
            return;
        }
        
        // Create new buttons and cache them
        this.filtersGrid.innerHTML = '';
        const cachedButtons = [];
        
        items.forEach(item => {
            const filterBtn = document.createElement('div');
            filterBtn.className = 'filter-btn';
            
            // Get the filter key and display name based on type
            let filterKey, displayName;
            if (type === 'factions') {
                filterKey = item.filename;
                displayName = item.displayName;
            } else if (type === 'music') {
                // Use full path for music filter key to match songPath
                filterKey = `assets/audio/music/${item.filename}`;
                displayName = item.name;
            } else {
                // heroes - use original name for filterKey (image loading), but display name for label
                filterKey = item;
                displayName = this.getHeroDisplayName(item);
            }
            
            filterBtn.dataset.filterType = type;
            filterBtn.dataset.filterKey = filterKey;
            
            // Image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'filter-image-container';
            
            const img = document.createElement('img');
            // Use aggressive cache busting (same as music) to ensure latest images load
            const imageCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // For music, use assets/images/music folder with the filename (without extension), encoded for URLs
            if (type === 'music') {
                const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                const encodedIconName = encodeURIComponent(iconName);
                img.src = `assets/images/music/${encodedIconName}.png?v=${imageCacheBuster}`;
            } else if (type === 'factions') {
                // Encode faction filename to handle spaces and special characters
                const encodedFilename = encodeURIComponent(filterKey);
                const imagePath = `${folder}/${encodedFilename}.png?v=${imageCacheBuster}`;
                img.src = imagePath;
                console.log(`[DEBUG] Loading faction image: ${imagePath} (filterKey: ${filterKey})`);
            } else {
                // heroes - encode to handle any special characters
                const encodedHeroName = encodeURIComponent(filterKey);
                img.src = `${folder}/${encodedHeroName}.png?v=${imageCacheBuster}`;
            }
            
            img.alt = displayName;
            img.onerror = (function(service, type, filterKey, folder, imageCacheBuster) {
                return function() {
                    // Retry with a new cache buster after a delay
                    const retryDelay = 300;
                    const retryCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    setTimeout(() => {
                        if (type === 'music') {
                            const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                            const encodedIconName = encodeURIComponent(iconName);
                            this.src = `assets/images/music/${encodedIconName}.png?v=${retryCacheBuster}`;
                        } else if (type === 'factions') {
                            // Encode faction filename to handle spaces and special characters
                            const encodedFilename = encodeURIComponent(filterKey);
                            const retryPath = `${folder}/${encodedFilename}.png?v=${retryCacheBuster}`;
                            console.log(`[DEBUG] Retrying faction image: ${retryPath}`);
                            this.src = retryPath;
                        } else {
                            // heroes - encode to handle any special characters
                            const encodedHeroName = encodeURIComponent(filterKey);
                            this.src = `${folder}/${encodedHeroName}.png?v=${retryCacheBuster}`;
                        }
                    }, retryDelay);
                    
                    // If image fails to load, try alternative encodings for GitHub Pages compatibility
                    if (type === 'music') {
                        const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                        const originalSrc = this.src;
                        console.warn(`[DEBUG] Filter image failed to load: ${originalSrc}`);
                        
                        // Try with different encoding (some servers handle spaces differently)
                        const altEncoded = iconName.replace(/\s+/g, '%20');
                        if (this.src !== `assets/images/music/${altEncoded}.png?v=${imageCacheBuster}`) {
                            this.src = `assets/images/music/${altEncoded}.png?v=${imageCacheBuster}`;
                            return; // Let it try again with this encoding
                        }
                    } else if (type === 'factions' || type === 'heroes') {
                        // Try alternative encoding for heroes/factions
                        const originalSrc = this.src;
                        console.warn(`[DEBUG] Filter image failed to load: ${originalSrc} (type: ${type}, filterKey: ${filterKey})`);
                        
                        // Try with space replacement encoding
                        const altEncoded = filterKey.replace(/\s+/g, '%20');
                        const altCacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const altPath = `${folder}/${altEncoded}.png?v=${altCacheBuster}`;
                        console.log(`[DEBUG] Trying alternative encoding: ${altPath}`);
                        if (this.src !== altPath) {
                            this.src = altPath;
                            return; // Let it try again with this encoding
                        }
                    }
                    
                    // If still fails, hide the image but keep the button visible
                    console.error(`[DEBUG] Filter image failed to load after retries: ${this.src} (type: ${type}, filterKey: ${filterKey}, folder: ${folder})`);
                    this.style.display = 'none';
                    // Don't hide the entire button, just the image - show placeholder background
                    if (this.parentElement) {
                        this.parentElement.style.background = 'rgba(255, 0, 0, 0.3)'; // Red tint to indicate missing image
                    }
                };
            })(this, type, filterKey, folder, imageCacheBuster);
            
            imageContainer.appendChild(img);
            
            // Label
            const label = document.createElement('div');
            label.className = 'filter-label';
            label.textContent = displayName;
            
            filterBtn.appendChild(imageContainer);
            filterBtn.appendChild(label);
            
            // Check if this filter is already selected
            if (this.selectedFilters.has(filterKey)) {
                filterBtn.classList.add('selected');
            }
            
            // Toggle selection on click
            filterBtn.addEventListener('click', () => {
                if (this.selectedFilters.has(filterKey)) {
                    this.selectedFilters.delete(filterKey);
                    filterBtn.classList.remove('selected');
                    if (window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('filterOff');
                    }
                } else {
                    this.selectedFilters.add(filterKey);
                    filterBtn.classList.add('selected');
                    if (window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('filterPick');
                    }
                }
                this.updateFilterCounts(); // Update counts after selection change
            });
            
            this.filtersGrid.appendChild(filterBtn);
            cachedButtons.push(filterBtn);
        });
        
        // Cache the buttons
        this.buttonCache[type] = cachedButtons;
        
        // Preload images for the other type in background
        if (type === 'heroes' && this.factions.length > 0) {
            setTimeout(() => this.preloadImages(this.factions, 'factions', 'assets/images/factions'), 100);
        } else if (type === 'factions' && this.heroes.length > 0) {
            setTimeout(() => this.preloadImages(this.heroes, 'heroes', 'assets/images/heroes'), 100);
        }
        
        this.updateFilterCounts(); // Update counts when buttons are created
    }
    
    // Setup tab switching
    setupTabs() {
        if (this.heroesTab) {
            this.heroesTab.addEventListener('click', () => {
                this.currentFilterType = 'heroes';
                this.heroesTab.classList.add('active');
                if (this.factionsTab) {
                    this.factionsTab.classList.remove('active');
                }
                this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
                this.updateFilterCounts(); // Update counts when switching tabs
            });
        }
        
        if (this.factionsTab) {
            this.factionsTab.addEventListener('click', () => {
                this.currentFilterType = 'factions';
                this.factionsTab.classList.add('active');
                if (this.heroesTab) {
                    this.heroesTab.classList.remove('active');
                }
                this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
                this.updateFilterCounts(); // Update counts when switching tabs
            });
        }
    }
    
    // Setup button handlers
    setupButtons() {
        // Open filters panel - use mousedown to prevent globe interaction
        if (this.filtersButton) {
            // Handle button click/touch - unified handler
            const handleFiltersToggle = (event) => {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                console.log('Filters button clicked!');
                
                // Play filter button sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('filterButton');
                }
                
                // Close music panel if open
                const musicPanel = document.getElementById('musicPanel');
                const musicButton = document.getElementById('musicToggle');
                if (musicPanel && musicPanel.classList.contains('open')) {
                    musicPanel.classList.remove('open');
                    if (musicButton) {
                        musicButton.classList.remove('active');
                    }
                }
                
                // Close event management panel if open
                const eventsManagePanel = document.getElementById('eventsManagePanel');
                const eventsManageToggle = document.getElementById('eventsManageToggle');
                if (eventsManagePanel && eventsManagePanel.classList.contains('open')) {
                    eventsManagePanel.classList.remove('open');
                    if (eventsManageToggle) {
                        eventsManageToggle.classList.remove('active');
                    }
                }
                
                // Toggle panel (open if closed, close if open)
                const isOpening = !this.filtersPanel.classList.contains('open');
                this.filtersPanel.classList.toggle('open');
                console.log('Panel open state:', this.filtersPanel.classList.contains('open'));
                
                if (isOpening) {
                    // When opening, initialize selectedFilters from confirmed filters
                    const confirmedFilters = this.getConfirmedFilters();
                    this.selectedFilters.clear();
                    confirmedFilters.forEach(filter => this.selectedFilters.add(filter));
                    
                    // Update button states for current tab
                    if (this.currentFilterType === 'heroes') {
                        this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
                    } else {
                        this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
                    }
                } else {
                    // When closing via toggle button, reset to confirmed state
                    this.resetToConfirmedFilters();
                }
                
                // Update button active state
                if (this.filtersPanel.classList.contains('open')) {
                    this.filtersButton.classList.add('active');
                } else {
                    this.filtersButton.classList.remove('active');
                }
            };
            
            // Prevent button from interfering with globe controls (mouse)
            this.filtersButton.addEventListener('mousedown', (event) => {
                event.stopPropagation();
            });
            
            this.filtersButton.addEventListener('mouseup', (event) => {
                event.stopPropagation();
            });
            
            // Handle touch events for mobile
            let touchStartTime = 0;
            this.filtersButton.addEventListener('touchstart', (event) => {
                event.stopPropagation();
                touchStartTime = Date.now();
            });
            
            this.filtersButton.addEventListener('touchend', (event) => {
                event.stopPropagation();
                event.preventDefault();
                // Only trigger if it was a quick tap (not a drag)
                if (Date.now() - touchStartTime < 300) {
                    handleFiltersToggle(event);
                }
            });
            
            // Handle click events (desktop and fallback)
            this.filtersButton.addEventListener('click', handleFiltersToggle);
        } else {
            console.error('Filters button not found!');
        }
        
        // Close filters panel
        if (this.filtersPanelClose) {
            this.filtersPanelClose.addEventListener('click', () => {
                // Play filter button sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('filterButton');
                }
                
                // Reset to confirmed filters before closing
                this.resetToConfirmedFilters();
                
                this.filtersPanel.classList.remove('open');
                // Update button active state
                if (this.filtersButton) {
                    this.filtersButton.classList.remove('active');
                }
            });
        }
        
        // Clear button (unselect all and unlock all events)
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', () => {
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('filterClear');
                }
                this.selectedFilters.clear();
                const filterButtons = this.filtersGrid.querySelectorAll('.filter-btn');
                filterButtons.forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Clear filters and unlock all events
                if (window.globeController && window.globeController.globeView) {
                    const sceneModel = window.globeController.sceneModel;
                    if (sceneModel) {
                        sceneModel.activeFilters.clear();
                        // Unlock all events
                        window.globeController.globeView.unlockAllEvents();
                    }
                }
                
                // Refresh current view to update button states
                if (this.currentFilterType === 'heroes' && this.heroes.length > 0) {
                    this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
                } else if (this.currentFilterType === 'factions' && this.factions.length > 0) {
                    this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
                }
            });
        }
        
        // Confirm button - applies filters and closes panel immediately
        if (this.confirmFiltersBtn) {
            this.confirmFiltersBtn.addEventListener('click', () => {
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('filterConfirm');
                }
                // Close panel first
                this.filtersPanel.classList.remove('open');
                if (this.filtersButton) {
                    this.filtersButton.classList.remove('active');
                }
                
                // Apply filters to events immediately
                if (window.globeController && window.globeController.globeView) {
                    // Store selected filters in sceneModel
                    const sceneModel = window.globeController.sceneModel;
                    if (sceneModel) {
                        sceneModel.activeFilters = new Set(this.selectedFilters);
                        // Apply filters to event markers
                        window.globeController.globeView.applyFilters();
                    }
                }
                
                console.log('Selected filters:', Array.from(this.selectedFilters));
            });
        }
    }
    
    // Setup click outside handler
    setupClickOutside() {
        document.addEventListener('click', (e) => {
            if (this.filtersPanel && this.filtersPanel.classList.contains('open')) {
                if (!this.filtersPanel.contains(e.target) && 
                    !this.filtersButton.contains(e.target) && 
                    e.target !== this.filtersButton) {
                    // Reset to confirmed filters before closing
                    this.resetToConfirmedFilters();
                    
                    this.filtersPanel.classList.remove('open');
                    // Update button active state
                    if (this.filtersButton) {
                        this.filtersButton.classList.remove('active');
                    }
                }
            }
        });
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.FilterService = new FilterService();
}
