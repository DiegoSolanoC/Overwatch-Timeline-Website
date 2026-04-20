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
        this.npcs = [];
        this.currentFilterType = 'heroes'; // 'heroes' | 'factions' | 'npcs'
        this.buttonCache = {
            heroes: null,
            factions: null,
            npcs: null,
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
                const SM = window.FilterStateManager;
                if (SM && SM.prototype && typeof SM.prototype.getCounts === 'function') {
                    return SM.prototype.getCounts.call(this);
                }
                let heroCount = 0, factionCount = 0, npcCount = 0;
                this.selectedFilters.forEach((f) => (/^\d+/.test(f) ? factionCount++ : heroCount++));
                return { heroCount, factionCount, npcCount };
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
        this.npcsTab = null;
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
        this.npcsTab = document.getElementById('npcsTab');
        
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
     * Detect if running in standalone mode (Event System Load Out without globe)
     * Standalone mode is active when standaloneActiveFilters exists and globe is not present
     */
    isStandaloneMode() {
        return typeof window !== 'undefined' && 
               window.standaloneActiveFilters instanceof Set &&
               !window.globeController?.globeView;
    }

    /**
     * Apply filters to standalone mode (Event System Load Out)
     * Updates standaloneActiveFilters and refreshes pagination UI
     */
    applyFiltersToStandalone() {
        // Copy selected filters to standalone state
        if (window.standaloneActiveFilters) {
            window.standaloneActiveFilters = new Set(this.stateManager.selectedFilters);
        }
        
        // Update pagination thumbnails if the function is available
        if (typeof window.updateStandalonePaginationForFilters === 'function') {
            window.updateStandalonePaginationForFilters();
        }
        
        // Also trigger full pagination UI update (wireNumberButtons with fresh clones)
        // This ensures thumbnails properly reflect filter state after cloning
        if (window.standaloneEventSlide?.updatePaginationUI) {
            window.standaloneEventSlide.updatePaginationUI();
        }
        
        // Also sync to globe if it's loaded later (hybrid mode)
        const sceneModel = this.getSceneModel();
        if (sceneModel) {
            this.stateManager.applyToScene(sceneModel);
            if (window.globeController?.globeView?.applyFilters) {
                window.globeController.globeView.applyFilters();
            }
        }
    }
    
    /**
     * Reset selectedFilters to confirmed state and update button states
     * Supports both globe mode (sceneModel.activeFilters) and standalone mode (standaloneActiveFilters)
     */
    resetToConfirmedFilters() {
        const sceneModel = this.getSceneModel();
        
        // In standalone mode, use standaloneActiveFilters as the "confirmed" state
        if (this.isStandaloneMode() && window.standaloneActiveFilters) {
            this.stateManager.selectedFilters = new Set(window.standaloneActiveFilters);
        } else {
            this.stateManager.resetToConfirmed(sceneModel);
        }
        
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
        // Rebuild filter chips from manifest; cached nodes keep stale dataset.filterKey after manifest edits
        this.buttonCache.heroes = null;
        this.buttonCache.factions = null;
        this.buttonCache.npcs = null;

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
            this.npcs = result.npcs || [];
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
                this.npcs = manifest.npcs ? [...manifest.npcs].sort() : [];
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
                if (this.npcs.length > 0) {
                    setTimeout(() => this.preloadImages(this.npcs, 'npcs', 'assets/images/npcs'), 650);
                }
            } catch (error) {
                console.error('Error loading manifest.json:', error);
                this.heroes = [];
                this.factions = [];
                this.npcs = [];
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
            const { heroCount, factionCount, npcCount = 0 } = this.stateManager.getCounts();
            const npcsCount = document.getElementById('npcsCount');
            
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
            if (npcsCount) {
                if (npcCount > 0) {
                    npcsCount.textContent = npcCount;
                    npcsCount.style.display = 'inline';
                } else {
                    npcsCount.style.display = 'none';
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
                this.heroes, this.factions, this.npcs,
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
                this.heroesTab, this.factionsTab, this.npcsTab,
                this.heroes, this.factions, this.npcs,
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
                    if (!this.heroesTab.classList.contains('active') && window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('switchMap');
                    }
                    this.currentFilterType = 'heroes';
                    this.heroesTab.classList.add('active');
                    this.heroesTab.setAttribute('aria-selected', 'true');
                    if (this.factionsTab) {
                        this.factionsTab.classList.remove('active');
                        this.factionsTab.setAttribute('aria-selected', 'false');
                    }
                    if (this.npcsTab) {
                        this.npcsTab.classList.remove('active');
                        this.npcsTab.setAttribute('aria-selected', 'false');
                    }
                    this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
                    this.updateFilterCounts();
                });
            }
            if (this.factionsTab) {
                this.factionsTab.addEventListener('click', () => {
                    if (!this.factionsTab.classList.contains('active') && window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('switchMap');
                    }
                    this.currentFilterType = 'factions';
                    this.factionsTab.classList.add('active');
                    this.factionsTab.setAttribute('aria-selected', 'true');
                    if (this.heroesTab) {
                        this.heroesTab.classList.remove('active');
                        this.heroesTab.setAttribute('aria-selected', 'false');
                    }
                    if (this.npcsTab) {
                        this.npcsTab.classList.remove('active');
                        this.npcsTab.setAttribute('aria-selected', 'false');
                    }
                    this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
                    this.updateFilterCounts();
                });
            }
            if (this.npcsTab) {
                this.npcsTab.addEventListener('click', () => {
                    if (!this.npcsTab.classList.contains('active') && window.SoundEffectsManager) {
                        window.SoundEffectsManager.play('switchMap');
                    }
                    this.currentFilterType = 'npcs';
                    this.npcsTab.classList.add('active');
                    this.npcsTab.setAttribute('aria-selected', 'true');
                    if (this.heroesTab) {
                        this.heroesTab.classList.remove('active');
                        this.heroesTab.setAttribute('aria-selected', 'false');
                    }
                    if (this.factionsTab) {
                        this.factionsTab.classList.remove('active');
                        this.factionsTab.setAttribute('aria-selected', 'false');
                    }
                    this.createFilterButtons(this.npcs, 'npcs', 'assets/images/npcs');
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
                this.currentFilterType, this.heroes, this.factions, this.npcs,
                (items, type, folder) => this.createFilterButtons(items, type, folder)
            );
        } else {
            // Fallback
            const sceneModel = this.getSceneModel();
            this.stateManager.resetToConfirmed(sceneModel);
            if (this.currentFilterType === 'heroes') {
                this.createFilterButtons(this.heroes, 'heroes', 'assets/images/heroes');
            } else if (this.currentFilterType === 'factions') {
                this.createFilterButtons(this.factions, 'factions', 'assets/images/factions');
            } else {
                this.createFilterButtons(this.npcs, 'npcs', 'assets/images/npcs');
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
                async (panel, button, stateManager, getSceneModel, currentType, heroes, factions, npcs, createFilterButtons) => {
                    const sceneModel = getSceneModel();
                    stateManager.resetToConfirmed(sceneModel);
                    if (currentType === 'heroes') {
                        await createFilterButtons(heroes, 'heroes', 'assets/images/heroes');
                    } else if (currentType === 'factions') {
                        await createFilterButtons(factions, 'factions', 'assets/images/factions');
                    } else {
                        await createFilterButtons(npcs, 'npcs', 'assets/images/npcs');
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
                this.currentFilterType, this.heroes, this.factions, this.npcs,
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
     * Setup all button handlers - delegates to helper or uses built-in fallback
     * Re-queries DOM elements to avoid race conditions with standalone mode overrides
     * In standalone mode, always uses built-in fallback for full mode support
     */
    async setupButtons() {
        // Re-query DOM elements to avoid race conditions (standalone mode may have replaced buttons)
        const filtersButton = document.getElementById('filtersToggle') || this.filtersButton;
        const filtersPanelClose = document.getElementById('filtersPanelClose') || this.filtersPanelClose;
        const clearFiltersBtn = document.getElementById('clearFiltersBtn') || this.clearFiltersBtn;
        const confirmFiltersBtn = document.getElementById('confirmFiltersBtn') || this.confirmFiltersBtn;
        
        // In standalone mode, use built-in fallback for full dual-mode support
        // The helper is globe-centric and doesn't support standalone mode
        if (this.isStandaloneMode()) {
            this._setupButtonHandlersFallback(filtersButton, filtersPanelClose, clearFiltersBtn, confirmFiltersBtn);
            return;
        }
        
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
            // Use the helper for globe mode (globe-centric handlers)
            helper(
                filtersButton, filtersPanelClose, clearFiltersBtn, confirmFiltersBtn,
                this.soundManager, () => this.togglePanel(),
                () => this.resetToConfirmedFilters(), () => this.closePanel(),
                this.stateManager, () => this.updateButtonStates(),
                () => this.getSceneModel(), () => this.currentFilterType,
                this.heroes, this.factions, this.npcs,
                (items, type, folder) => this.createFilterButtons(items, type, folder)
            );
        } else {
            // Built-in fallback with full standalone + globe support
            this._setupButtonHandlersFallback(filtersButton, filtersPanelClose, clearFiltersBtn, confirmFiltersBtn);
        }
    }

    /**
     * Built-in button handler setup with support for both standalone and globe modes
     * This ensures parity between Event System Load Out and Globe modes
     */
    _setupButtonHandlersFallback(filtersButton, filtersPanelClose, clearFiltersBtn, confirmFiltersBtn) {
        // Toggle button - open/close panel
        if (filtersButton) {
            filtersButton.addEventListener('click', () => {
                const isOpening = !this.filtersPanel?.classList.contains('open');
                this.togglePanel();
                if (isOpening && this.soundManager) {
                    this.soundManager.play('filterButton');
                }
            });
        }
        
        // Close button - reset to confirmed and close
        if (filtersPanelClose) {
            filtersPanelClose.addEventListener('click', () => {
                this.resetToConfirmedFilters();
                this.closePanel();
                if (this.soundManager) this.soundManager.play('filterButton');
            });
        }
        
        // Clear button - clear all filters and apply immediately
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.stateManager.clear();
                this.updateButtonStates();
                if (this.soundManager) this.soundManager.play('filterClear');
                
                // Apply to current mode (standalone or globe)
                if (this.isStandaloneMode()) {
                    // Clear standalone filters and refresh UI
                    if (window.standaloneActiveFilters) {
                        window.standaloneActiveFilters.clear();
                    }
                    // Refresh pagination to show all unlocked
                    if (typeof window.updateStandalonePaginationForFilters === 'function') {
                        window.updateStandalonePaginationForFilters();
                    }
                    if (window.standaloneEventSlide?.updatePaginationUI) {
                        window.standaloneEventSlide.updatePaginationUI();
                    }
                } else {
                    const sceneModel = this.getSceneModel();
                    const globeController = typeof window !== 'undefined' ? window.globeController : null;
                    if (sceneModel && globeController?.globeView) {
                        sceneModel.activeFilters.clear();
                        globeController.globeView.applyFilters();
                    }
                }
            });
        }
        
        // Confirm button - apply filters and close (THE KEY BUTTON FOR FILTER FUNCTIONALITY)
        if (confirmFiltersBtn) {
            confirmFiltersBtn.addEventListener('click', () => {
                if (this.soundManager) this.soundManager.play('filterConfirm');
                
                // Apply filters based on current mode
                if (this.isStandaloneMode()) {
                    // Standalone/Event System Load Out mode
                    this.applyFiltersToStandalone();
                } else {
                    // Globe mode
                    const sceneModel = this.getSceneModel();
                    const globeController = typeof window !== 'undefined' ? window.globeController : null;
                    if (sceneModel && globeController?.globeView) {
                        this.stateManager.applyToScene(sceneModel);
                        globeController.globeView.applyFilters();
                    }
                }
                
                this.closePanel();
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
