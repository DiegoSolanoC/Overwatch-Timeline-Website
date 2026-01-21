/**
 * FilterService - Manages filter panel UI and coordination
 * Coordinates between FilterStateManager, FilterImageService, and UI components
 * Refactored to follow Single Responsibility Principle
 */

class FilterService {
    constructor(stateManager = null, imageService = null, globeController = null, soundManager = null) {
        this.initialized = false;
        this.heroes = [];
        this.factions = [];
        this.currentFilterType = 'heroes'; // 'heroes' or 'factions'
        this.buttonCache = {
            heroes: null,
            factions: null,
            music: null
        };
        
        // Dependencies (injected for testability, fallback to globals)
        this.stateManager = stateManager || new (window.FilterStateManager || class {
            constructor() { this.selectedFilters = new Set(); }
            getConfirmedFilters(sceneModel) {
                if (sceneModel?.activeFilters) return new Set(sceneModel.activeFilters);
                return new Set();
            }
            resetToConfirmed(sceneModel) {
                const confirmed = this.getConfirmedFilters(sceneModel);
                this.selectedFilters.clear();
                confirmed.forEach(f => this.selectedFilters.add(f));
            }
            clear() { this.selectedFilters.clear(); }
            add(f) { this.selectedFilters.add(f); }
            remove(f) { this.selectedFilters.delete(f); }
            has(f) { return this.selectedFilters.has(f); }
            toArray() { return Array.from(this.selectedFilters); }
            getCounts() {
                let heroCount = 0, factionCount = 0;
                this.selectedFilters.forEach(f => /^\d+/.test(f) ? factionCount++ : heroCount++);
                return { heroCount, factionCount };
            }
            applyToScene(sceneModel) {
                if (sceneModel) sceneModel.activeFilters = new Set(this.selectedFilters);
            }
        })();
        
        this.imageService = imageService || new (window.FilterImageService || class {
            generateCacheBuster() { return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
            buildImagePath(item, type, folder) {
                if (type === 'factions') {
                    return `${folder}/${encodeURIComponent(item.filename)}.png`;
                } else if (type === 'music') {
                    const iconName = item.filename.replace(/\.(mp3|wav|ogg)$/i, '');
                    return `assets/images/music/${encodeURIComponent(iconName)}.png`;
                } else {
                    return `${folder}/${encodeURIComponent(item)}.png`;
                }
            }
            createImageElement(imagePath, type, filterKey, folder) {
                const img = new Image();
                img.src = `${imagePath}?v=${this.generateCacheBuster()}`;
                img.alt = filterKey;
                return img;
            }
            preloadImages(items, type, folder) {
                // Simplified fallback
                items.forEach(item => {
                    const img = new Image();
                    img.src = `${this.buildImagePath(item, type, folder)}?v=${this.generateCacheBuster()}`;
                });
            }
        })();
        
        this.globeController = globeController || window.globeController;
        this.soundManager = soundManager || window.SoundEffectsManager;
        
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
    
    /**
     * Get sceneModel from globeController.
     * Always prefers the latest global window.globeController so we don't
     * depend on construction-time load order.
     */
    getSceneModel() {
        const globeController =
            this.globeController ||
            (typeof window !== 'undefined' ? window.globeController : null);
        return globeController?.sceneModel || null;
    }
    
    /**
     * Reset selectedFilters to confirmed state and update button states
     */
    resetToConfirmedFilters() {
        const sceneModel = this.getSceneModel();
        this.stateManager.resetToConfirmed(sceneModel);
        this.updateButtonStates();
        this.updateFilterCounts();
    }
    
    /**
     * Update visual states of filter buttons based on selectedFilters
     */
    updateButtonStates() {
        if (!this.filtersGrid) return;
        
        const allButtons = this.filtersGrid.querySelectorAll('.filter-btn');
        allButtons.forEach(btn => {
            const filterKey = btn.dataset.filterKey;
            if (filterKey) {
                if (this.stateManager.has(filterKey)) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            }
        });
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
    
    /**
     * Update filter counts display
     */
    updateFilterCounts() {
        const heroesCount = document.getElementById('heroesCount');
        const factionsCount = document.getElementById('factionsCount');
        const { heroCount, factionCount } = this.stateManager.getCounts();
        
        this.updateCountDisplay(heroesCount, heroCount);
        this.updateCountDisplay(factionsCount, factionCount);
    }
    
    /**
     * Update individual count display element
     */
    updateCountDisplay(element, count) {
        if (!element) return;
        
        if (count > 0) {
            element.textContent = count;
            element.style.display = 'inline';
        } else {
            element.style.display = 'none';
        }
    }
    
    /**
     * Preload images using FilterImageService
     */
    preloadImages(items, type, folder) {
        this.imageService.preloadImages(items, type, folder);
    }
    
    /**
     * Get hero display name (maps filename to display name)
     */
    getHeroDisplayName(heroName) {
        const heroDisplayNames = {
            'Soldier 76': 'Soldier: 76'
        };
        return heroDisplayNames[heroName] || heroName;
    }
    
    /**
     * Get filter key and display name based on type
     */
    getFilterKeyAndDisplayName(item, type) {
        if (type === 'factions') {
            return { filterKey: item.filename, displayName: item.displayName };
        } else if (type === 'music') {
            return { 
                filterKey: `assets/audio/music/${item.filename}`, 
                displayName: item.name 
            };
        } else {
            // heroes
            return { 
                filterKey: item, 
                displayName: this.getHeroDisplayName(item) 
            };
        }
    }
    
    /**
     * Create image element for filter button
     */
    createFilterImage(filterKey, displayName, type, folder) {
        const imagePath = this.imageService.buildImagePath(
            type === 'factions' ? { filename: filterKey } : filterKey,
            type,
            folder
        );
        const img = this.imageService.createImageElement(imagePath, type, filterKey, folder);
        img.alt = displayName;
        return img;
    }
    
    /**
     * Attach click handler to filter button
     */
    attachFilterButtonClickHandler(filterBtn, filterKey) {
        filterBtn.addEventListener('click', () => {
            if (this.stateManager.has(filterKey)) {
                this.stateManager.remove(filterKey);
                filterBtn.classList.remove('selected');
                if (this.soundManager) {
                    this.soundManager.play('filterOff');
                }
            } else {
                this.stateManager.add(filterKey);
                filterBtn.classList.add('selected');
                if (this.soundManager) {
                    this.soundManager.play('filterPick');
                }
            }
            this.updateFilterCounts();
        });
    }
    
    /**
     * Create a single filter button element
     */
    createFilterButtonElement(item, type, folder) {
        const { filterKey, displayName } = this.getFilterKeyAndDisplayName(item, type);
        
        const filterBtn = document.createElement('div');
        filterBtn.className = 'filter-btn';
        filterBtn.dataset.filterType = type;
        filterBtn.dataset.filterKey = filterKey;
        
        // Image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'filter-image-container';
        const img = this.createFilterImage(filterKey, displayName, type, folder);
        imageContainer.appendChild(img);
        
        // Label
        const label = document.createElement('div');
        label.className = 'filter-label';
        label.textContent = displayName;
        
        filterBtn.appendChild(imageContainer);
        filterBtn.appendChild(label);
        
        // Set initial selection state
        if (this.stateManager.has(filterKey)) {
            filterBtn.classList.add('selected');
        }
        
        // Attach click handler
        this.attachFilterButtonClickHandler(filterBtn, filterKey);
        
        return filterBtn;
    }
    
    /**
     * Use cached buttons if available
     */
    useCachedButtons(type) {
        if (!this.buttonCache[type]) return false;
        
        this.filtersGrid.innerHTML = '';
        this.buttonCache[type].forEach(cachedBtn => {
            const filterKey = cachedBtn.dataset.filterKey;
            if (filterKey) {
                if (this.stateManager.has(filterKey)) {
                    cachedBtn.classList.add('selected');
                } else {
                    cachedBtn.classList.remove('selected');
                }
            }
            this.filtersGrid.appendChild(cachedBtn);
        });
        this.updateFilterCounts();
        return true;
    }
    
    /**
     * Create filter buttons (with caching)
     */
    createFilterButtons(items, type, folder) {
        if (!this.filtersGrid) return;
        
        // Try to use cached buttons first
        if (this.useCachedButtons(type)) {
            return;
        }
        
        // Create new buttons and cache them
        this.filtersGrid.innerHTML = '';
        const cachedButtons = [];
        
        items.forEach(item => {
            const filterBtn = this.createFilterButtonElement(item, type, folder);
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
        
        this.updateFilterCounts();
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
    
    /**
     * Close other panels (music, events manage) when opening filters
     */
    closeOtherPanels() {
        const musicPanel = document.getElementById('musicPanel');
        const musicButton = document.getElementById('musicToggle');
        if (musicPanel?.classList.contains('open')) {
            musicPanel.classList.remove('open');
            musicButton?.classList.remove('active');
        }
        
        const eventsManagePanel = document.getElementById('eventsManagePanel');
        const eventsManageToggle = document.getElementById('eventsManageToggle');
        if (eventsManagePanel?.classList.contains('open')) {
            eventsManagePanel.classList.remove('open');
            eventsManageToggle?.classList.remove('active');
        }
    }
    
    /**
     * Open the filters panel
     */
    openPanel() {
        const sceneModel = this.getSceneModel();
        this.stateManager.resetToConfirmed(sceneModel);
        
        // Update button states for current tab
        if (this.currentFilterType === 'heroes') {
            this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
        } else {
            this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
        }
        
        this.filtersPanel.classList.add('open');
        this.filtersButton?.classList.add('active');
    }
    
    /**
     * Close the filters panel
     */
    closePanel() {
        this.filtersPanel.classList.remove('open');
        this.filtersButton?.classList.remove('active');
    }
    
    /**
     * Toggle panel open/close state
     */
    togglePanel() {
        const isOpening = !this.filtersPanel.classList.contains('open');
        
        if (isOpening) {
            this.closeOtherPanels();
            this.openPanel();
        } else {
            this.resetToConfirmedFilters();
            this.closePanel();
        }
    }
    
    /**
     * Setup filters toggle button handlers
     */
    setupFiltersButton() {
        if (!this.filtersButton) {
            console.error('Filters button not found!');
            return;
        }
        
        const handleFiltersToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            if (this.soundManager) {
                this.soundManager.play('filterButton');
            }
            
            this.togglePanel();
        };
        
        // Prevent button from interfering with globe controls
        this.filtersButton.addEventListener('mousedown', (e) => e.stopPropagation());
        this.filtersButton.addEventListener('mouseup', (e) => e.stopPropagation());
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        this.filtersButton.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            touchStartTime = Date.now();
        });
        
        this.filtersButton.addEventListener('touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (Date.now() - touchStartTime < 300) {
                handleFiltersToggle(e);
            }
        });
        
        this.filtersButton.addEventListener('click', handleFiltersToggle);
    }
    
    /**
     * Setup close button handler
     */
    setupCloseButton() {
        if (!this.filtersPanelClose) return;
        
        this.filtersPanelClose.addEventListener('click', () => {
            if (this.soundManager) {
                this.soundManager.play('filterButton');
            }
            this.resetToConfirmedFilters();
            this.closePanel();
        });
    }
    
    /**
     * Setup clear button handler
     */
    setupClearButton() {
        if (!this.clearFiltersBtn) return;
        
        this.clearFiltersBtn.addEventListener('click', () => {
            if (this.soundManager) {
                this.soundManager.play('filterClear');
            }
            this.stateManager.clear();
            this.updateButtonStates();
            
            // Clear filters and unlock all events
            const sceneModel = this.getSceneModel();
            const globeController =
                this.globeController ||
                (typeof window !== 'undefined' ? window.globeController : null);
            if (sceneModel && globeController?.globeView) {
                sceneModel.activeFilters.clear();
                globeController.globeView.unlockAllEvents();
            }
            
            // Refresh current view
            if (this.currentFilterType === 'heroes' && this.heroes.length > 0) {
                this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
            } else if (this.currentFilterType === 'factions' && this.factions.length > 0) {
                this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
            }
        });
    }
    
    /**
     * Setup confirm button handler
     */
    setupConfirmButton() {
        if (!this.confirmFiltersBtn) return;
        
        this.confirmFiltersBtn.addEventListener('click', () => {
            if (this.soundManager) {
                this.soundManager.play('filterConfirm');
            }
            
            // Apply filters to events immediately BEFORE closing
            const sceneModel = this.getSceneModel();
            const globeController =
                this.globeController ||
                (typeof window !== 'undefined' ? window.globeController : null);
            
            if (sceneModel && globeController?.globeView) {
                this.stateManager.applyToScene(sceneModel);
                globeController.globeView.applyFilters();
            }
            
            this.closePanel();
        });
    }
    
    /**
     * Setup all button handlers
     */
    setupButtons() {
        this.setupFiltersButton();
        this.setupCloseButton();
        this.setupClearButton();
        this.setupConfirmButton();
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
