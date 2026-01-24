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
        
        // Load manifest and setup (async)
        this.loadManifest().then(() => {
            // Setup tab switching
            this.setupTabs();
            
            // Setup button handlers
            this.setupButtons();
            
            // Setup click outside handler
            this.setupClickOutside();
        });
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
    
    // Load manifest - delegates to helper
    async loadManifest() {
        const helper = window.FilterManifestHelpers?.loadManifest;
        if (helper) {
            const result = await helper(
                (items, type, folder) => this.createFilterButtons(items, type, folder),
                () => this.updateFilterCounts(),
                (items, type, folder) => this.preloadImages(items, type, folder),
                this.factions
            );
            this.heroes = result.heroes;
            this.factions = result.factions;
        } else {
            // Fallback implementation
            try {
                const cacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const response = await fetch(`manifest.json?v=${cacheBuster}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                const manifest = await response.json();
                this.heroes = manifest.heroes ? manifest.heroes.sort() : [];
                this.factions = manifest.factions ? manifest.factions.map(f => ({
                    filename: f.filename,
                    number: f.number,
                    displayName: f.displayName
                })).sort((a, b) => a.number - b.number) : [];
                this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
                this.updateFilterCounts();
                if (this.factions.length > 0) {
                    setTimeout(() => this.preloadImages(this.factions, 'factions', 'assets/images/factions'), 500);
                }
            } catch (error) {
                console.error('Error loading manifest.json:', error);
                this.heroes = [];
                this.factions = [];
                this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
            }
        }
    }
    
    /**
     * Update filter counts display - delegates to helper
     */
    async updateFilterCounts() {
        let helper = window.FilterCountHelpers?.updateFilterCounts;
        
        // If helper not available, try to load it dynamically
        if (!helper) {
            try {
                const module = await import('./helpers/FilterCountHelpers.js');
                helper = module.updateFilterCounts;
                // Cache it for next time
                if (!window.FilterCountHelpers) window.FilterCountHelpers = {};
                window.FilterCountHelpers.updateFilterCounts = helper;
            } catch (error) {
                // Silently fall through to fallback - helpers may be loading via script tags
            }
        }
        
        if (helper) {
            helper(this.stateManager);
        } else {
            // Fallback implementation
            const heroesCount = document.getElementById('heroesCount');
            const factionsCount = document.getElementById('factionsCount');
            const { heroCount, factionCount } = this.stateManager.getCounts();
            
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
    }
    
    /**
     * Preload images using FilterImageService
     */
    preloadImages(items, type, folder) {
        this.imageService.preloadImages(items, type, folder);
    }
    
    /**
     * Create filter buttons (with caching) - delegates to helper
     */
    async createFilterButtons(items, type, folder) {
        let helper = window.FilterButtonHelpers?.createFilterButtons;
        
        // If helper not available, try to load it dynamically (but don't error if it fails)
        if (!helper) {
            try {
                const module = await import('./helpers/FilterButtonHelpers.js');
                helper = module.createFilterButtons;
                // Cache it for next time
                if (!window.FilterButtonHelpers) window.FilterButtonHelpers = {};
                window.FilterButtonHelpers.createFilterButtons = helper;
            } catch (error) {
                // Silently return - helpers may be loading via script tags
                return;
            }
        }
        
        if (helper) {
            helper(
                items, type, folder, 
                this.filtersGrid, this.buttonCache, 
                this.stateManager, this.imageService, this.soundManager,
                this.heroes, this.factions,
                (items, type, folder) => this.preloadImages(items, type, folder),
                () => this.updateFilterCounts()
            );
        }
    }
    
    // Setup tab switching - delegates to helper
    setupTabs() {
        const helper = window.FilterTabHelpers?.setupTabs;
        if (helper) {
            helper(
                this.heroesTab, this.factionsTab,
                this.heroes, this.factions,
                (items, type, folder) => {
                    this.currentFilterType = type;
                    this.createFilterButtons(items, type, folder);
                },
                () => this.updateFilterCounts()
            );
        } else {
            // Fallback implementation
            if (this.heroesTab) {
                this.heroesTab.addEventListener('click', () => {
                    this.currentFilterType = 'heroes';
                    this.heroesTab.classList.add('active');
                    if (this.factionsTab) this.factionsTab.classList.remove('active');
                    this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
                    this.updateFilterCounts();
                });
            }
            if (this.factionsTab) {
                this.factionsTab.addEventListener('click', () => {
                    this.currentFilterType = 'factions';
                    this.factionsTab.classList.add('active');
                    if (this.heroesTab) this.heroesTab.classList.remove('active');
                    this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
                    this.updateFilterCounts();
                });
            }
        }
    }
    
    /**
     * Close other panels - delegates to helper
     */
    async closeOtherPanels() {
        const helper = window.FilterPanelHelpers?.closeOtherPanels;
        if (helper) {
            helper();
        } else {
            // Fallback
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
    }
    
    /**
     * Open the filters panel - delegates to helper
     */
    openPanel() {
        const helper = window.FilterPanelHelpers?.openPanel;
        if (helper) {
            helper(
                this.filtersPanel, this.filtersButton,
                this.stateManager, () => this.getSceneModel(),
                this.currentFilterType, this.heroes, this.factions,
                (items, type, folder) => this.createFilterButtons(items, type, folder)
            );
        } else {
            // Fallback
            const sceneModel = this.getSceneModel();
            this.stateManager.resetToConfirmed(sceneModel);
            if (this.currentFilterType === 'heroes') {
                this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
            } else {
                this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
            }
            this.filtersPanel.classList.add('open');
            this.filtersButton?.classList.add('active');
        }
    }
    
    /**
     * Close the filters panel - delegates to helper
     */
    async closePanel() {
        const helper = window.FilterPanelHelpers?.closePanel;
        if (helper) {
            helper(this.filtersPanel, this.filtersButton);
        } else {
            // Fallback
            this.filtersPanel.classList.remove('open');
            this.filtersButton?.classList.remove('active');
        }
    }
    
    /**
     * Toggle panel open/close state - delegates to helper
     */
    async togglePanel() {
        const helper = window.FilterPanelHelpers?.togglePanel;
        if (helper) {
            helper(
                this.filtersPanel, this.filtersButton,
                () => this.closeOtherPanels(),
                async (panel, button, stateManager, getSceneModel, currentType, heroes, factions, createFilterButtons) => {
                    const sceneModel = getSceneModel();
                    stateManager.resetToConfirmed(sceneModel);
                    if (currentType === 'heroes') {
                        await createFilterButtons(heroes, 'heroes', 'assets/images/heroes');
                    } else {
                        await createFilterButtons(factions, 'factions', 'assets/images/factions');
                    }
                    panel.classList.add('open');
                    button?.classList.add('active');
                },
                () => this.resetToConfirmedFilters(),
                (panel, button) => {
                    panel.classList.remove('open');
                    button?.classList.remove('active');
                },
                this.stateManager, () => this.getSceneModel(),
                this.currentFilterType, this.heroes, this.factions,
                (items, type, folder) => this.createFilterButtons(items, type, folder)
            );
        } else {
            // Fallback
            const isOpening = !this.filtersPanel.classList.contains('open');
            if (isOpening) {
                this.closeOtherPanels();
                this.openPanel();
            } else {
                this.resetToConfirmedFilters();
                this.closePanel();
            }
        }
    }
    
    /**
     * Setup all button handlers - delegates to helper
     */
    async setupButtons() {
        let helper = window.FilterButtonSetupHelpers?.setupButtons;
        
        // If helper not available, try to load it dynamically
        if (!helper) {
            try {
                const module = await import('./helpers/FilterButtonSetupHelpers.js');
                helper = module.setupButtons;
                // Cache it for next time
                if (!window.FilterButtonSetupHelpers) window.FilterButtonSetupHelpers = {};
                window.FilterButtonSetupHelpers.setupButtons = helper;
            } catch (error) {
                // Silently fall through to fallback - helpers may be loading via script tags
            }
        }
        
        if (helper) {
            helper(
                this.filtersButton, this.filtersPanelClose, this.clearFiltersBtn, this.confirmFiltersBtn,
                this.soundManager, () => this.togglePanel(),
                () => this.resetToConfirmedFilters(), () => this.closePanel(),
                this.stateManager, () => this.updateButtonStates(),
                () => this.getSceneModel(), this.currentFilterType,
                this.heroes, this.factions,
                (items, type, folder) => this.createFilterButtons(items, type, folder)
            );
        } else {
            // Fallback - basic button setup
            if (this.filtersButton) {
                this.filtersButton.addEventListener('click', () => this.togglePanel());
            }
            if (this.filtersPanelClose) {
                this.filtersPanelClose.addEventListener('click', () => {
                    this.resetToConfirmedFilters();
                    this.closePanel();
                });
            }
            if (this.clearFiltersBtn) {
                this.clearFiltersBtn.addEventListener('click', () => {
                    this.stateManager.clear();
                    this.updateButtonStates();
                    const sceneModel = this.getSceneModel();
                    const globeController = typeof window !== 'undefined' ? window.globeController : null;
                    if (sceneModel && globeController?.globeView) {
                        sceneModel.activeFilters.clear();
                        globeController.globeView.unlockAllEvents();
                    }
                });
            }
            if (this.confirmFiltersBtn) {
                this.confirmFiltersBtn.addEventListener('click', () => {
                    const sceneModel = this.getSceneModel();
                    const globeController = typeof window !== 'undefined' ? window.globeController : null;
                    if (sceneModel && globeController?.globeView) {
                        this.stateManager.applyToScene(sceneModel);
                        globeController.globeView.applyFilters();
                    }
                    this.closePanel();
                });
            }
        }
    }
    
    // Setup click outside handler - delegates to helper
    async setupClickOutside() {
        const helper = window.FilterPanelHelpers?.setupClickOutside;
        if (helper) {
            helper(
                this.filtersPanel, this.filtersButton,
                () => this.resetToConfirmedFilters()
            );
        } else {
            // Fallback implementation
            document.addEventListener('click', (e) => {
                if (this.filtersPanel && this.filtersPanel.classList.contains('open')) {
                    if (!this.filtersPanel.contains(e.target) && 
                        !this.filtersButton.contains(e.target) && 
                        e.target !== this.filtersButton) {
                        this.resetToConfirmedFilters();
                        this.filtersPanel.classList.remove('open');
                        if (this.filtersButton) this.filtersButton.classList.remove('active');
                    }
                }
            });
        }
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
