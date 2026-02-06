/**
 * EventManager - Handles event management UI and operations
 * Note: Glitch text functionality is now handled by GlitchTextService
 */
class EventManager {
    constructor() {
        // Initialize all services using helper (use global fallback for script tag loading)
        const initializeAllServices = window.EventManagerServiceHelpers?.initializeAllServices || 
            (window.EventManagerConfigHelpers?.initializeServicesFallback || 
            (() => {
                // Fallback if helper not available
                const dataService = window.EventDataService || null;
                return {
                    dataService,
                    renderService: window.EventRenderService || null,
                    locationService: window.LocationService || null,
                    editService: window.EventEditService || null,
                    formService: window.EventFormService || null,
                    dragDropService: window.EventDragDropService || null,
                    listenerService: window.EventListenerService || null,
                    interactionService: window.EventInteractionService || null,
                    initService: window.EventInitService || null,
                    cityLookupService: window.CityLookupService || null,
                    imagePathService: window.ImagePathService || null,
                    globeSyncService: window.GlobeSyncService || null,
                    modalSaveService: window.ModalSaveService ? new window.ModalSaveService() : null
                };
            }));
        
        const services = initializeAllServices(this);
        
        // Configure services using helper
        const configureServices = window.EventManagerConfigHelpers?.configureServices || 
            ((services, eventManager) => {
                // Fallback configuration
                if (services.renderService) services.renderService.setEventManager(eventManager);
                if (services.locationService) {
                    services.locationService.setDataService(services.dataService);
                    services.locationService.setEventManager(eventManager);
                }
                if (services.editService) services.editService.setEventManager(eventManager);
                if (services.formService) services.formService.setEventManager(eventManager);
                if (services.dragDropService) services.dragDropService.setEventManager(eventManager);
                if (services.listenerService) services.listenerService.setEventManager(eventManager);
                if (services.interactionService) services.interactionService.setEventManager(eventManager);
                if (services.initService) services.initService.setEventManager(eventManager);
                if (services.cityLookupService) services.cityLookupService.setEventManager(eventManager);
                if (services.imagePathService) services.imagePathService.setEventManager(eventManager);
                if (services.globeSyncService) services.globeSyncService.setEventManager(eventManager);
                if (services.modalSaveService) services.modalSaveService.setEventManager(eventManager);
            });
        
        configureServices(services, this);
        Object.assign(this, services);
        
        // UI state
        this.draggedElement = null;
        this.dragOverIndex = null;
        this.editingIndex = null;
        this.unsavedEventIndices = new Set(); // Track which events have unsaved changes
        this.currentPage = 1; // Current page number (1-indexed)
        this.eventsPerPage = 50; // Number of events per page
        this.eventsPerPageSetting = 50; // User-selected events per page (when not showing all)
        this.showAllEventsInManager = false; // If true, show all events in one long page
        this.searchQuery = ''; // Event manager search: filter by title
        this.searchHeroFilters = []; // Hero names (event.filters)
        this.searchFactionFilters = []; // Faction filenames (event.factions, e.g. "04Talon")
        this.variantData = []; // Store variant data in memory for tab system
        this.activeVariantIndex = 0; // Currently active variant tab
        this.eventItemVariantIndices = new Map(); // Track current variant index for each event item
        this.listenersSetup = false; // Track if listeners have been set up
        this.isOpeningEvent = false; // Flag to prevent panel from closing during event opening
    }

    /**
     * Get events from data service
     */
    get events() {
        return this.dataService ? this.dataService.getEvents() : [];
    }

    /**
     * Get events filtered by search query and hero/faction filters (for event manager list)
     * Title: case-insensitive contains. Heroes: event has any selected (event.filters).
     * Factions: event has any selected (event.factions, by filename).
     */
    getFilteredEvents() {
        const all = this.events;
        const q = (this.searchQuery || '').trim().toLowerCase();
        const heroFilters = this.searchHeroFilters || [];
        const factionFilters = this.searchFactionFilters || [];
        if (!q && heroFilters.length === 0 && factionFilters.length === 0) {
            return all;
        }
        const matchesItem = (item) => {
            const name = (item?.name || '').toLowerCase();
            const matchTitle = !q || name.includes(q);
            const itemHeroes = item?.filters || [];
            const matchHeroes = heroFilters.length === 0 || heroFilters.some(h => itemHeroes.includes(h));
            const itemFactions = item?.factions || [];
            const matchFactions = factionFilters.length === 0 || factionFilters.some(f => itemFactions.includes(f));
            return matchTitle && matchHeroes && matchFactions;
        };

        return all.filter(event => {
            // Main event matches (single event or multi-event header)
            if (matchesItem(event)) {
                return true;
            }

            // Variant match: if any variant matches, include event and set preview to that variant
            if (event?.variants && Array.isArray(event.variants) && event.variants.length > 0) {
                const matchedIndex = event.variants.findIndex(v => matchesItem(v));
                if (matchedIndex !== -1) {
                    // Ensure preview shows the matching variant
                    const fullIndex = all.indexOf(event);
                    if (fullIndex !== -1 && this.eventItemVariantIndices) {
                        this.eventItemVariantIndices.set(`event-${fullIndex}`, matchedIndex);
                    }
                    return true;
                }
            }
            return false;
        });
    }

    /**
     * Set events in data service
     */
    set events(value) {
        if (this.dataService) {
            this.dataService.setEvents(value);
        }
    }

    // Data getters (consolidated using helper)
    get cities() { return this.dataService?.cities || []; }
    get fictionalCities() { return this.dataService?.fictionalCities || []; }
    get airports() { return this.dataService?.airports || []; }
    get seaports() { return this.dataService?.seaports || []; }
    get heroes() { return this.dataService?.heroes || []; }
    get factions() { return this.dataService?.factions || []; }
    get displayNames() { return this.dataService?.displayNames || {}; }

    /**
     * Helper function to update status (if available)
     */
    updateStatus(message, type = 'info') {
        // Check if updateStatus function exists (from test-loader.js or script.js)
        if (typeof window.updateStatus === 'function') {
            window.updateStatus(message, type);
        }
    }

    /**
     * Initialize the event manager (delegates to EventInitService)
     */
    async init() {
        if (this.initService) {
            return await this.initService.init();
        } else {
            console.error('EventManager: EventInitService not available!');
            return Promise.reject(new Error('EventInitService not available'));
        }
    }

    /**
     * Check if we're running on GitHub Pages (delegates to EventDataService)
     */
    isGitHubPages() {
        if (this.dataService) {
            return this.dataService.isGitHubPages();
        }
        const hostname = window.location.hostname;
        // Check for GitHub Pages domains
        return hostname.includes('github.io') || 
               hostname.includes('github.com') ||
               (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.') && !hostname.startsWith('10.') && window.location.protocol !== 'file:');
    }

    async loadLocationsData() {
        if (!this.dataService) throw new Error('EventDataService not available');
        return await this.dataService.loadLocationsData();
    }

    async loadEvents() {
        if (!this.dataService) throw new Error('EventDataService not available');
        const result = await this.dataService.loadEvents();
        if (result?.shouldSync) this.syncEventsToGlobe();
        return result;
    }
    
    
    syncEventsToGlobe() {
        if (this.globeSyncService) {
            this.globeSyncService.syncEventsToGlobe();
        } else if (window.globeController?.dataModel) {
            // Fallback if service not available
            window.globeController.dataModel.events = [...this.events];
            window.globeController.globeView?.refreshEventMarkers();
        }
    }

    saveEvents() {
        this.dataService?.saveEvents();
        this.unsavedEventIndices.clear();
        this.renderEvents();
        const showSaveSuccessFeedback = window.EventManagerUIHelpers?.showSaveSuccessFeedback;
        if (showSaveSuccessFeedback) {
            showSaveSuccessFeedback('saveEventsBtn');
        } else {
            const saveBtn = document.getElementById('saveEventsBtn');
            if (saveBtn) {
                const originalText = saveBtn.textContent;
                saveBtn.textContent = '✓ Saved!';
                saveBtn.style.background = 'rgba(76, 175, 80, 0.8)';
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.style.background = '';
                }, 2000);
            }
        }
        this.refreshGlobeEvents();
    }
    
    /**
     * Refresh event markers on the globe
     */
    /**
     * Refresh globe events (delegates to GlobeSyncService)
     */
    refreshGlobeEvents() {
        if (this.globeSyncService) {
            this.globeSyncService.refreshGlobeEvents();
        }
    }

    exportEvents() {
        this.dataService?.exportEvents();
    }

    async importEvents(file) {
        if (!this.dataService) {
            alert('Error: EventDataService not available');
            return;
        }
        try {
            const result = await this.dataService.importEvents(file);
            if (result.success) {
                this.saveEvents();
                this.renderEvents();
                this.syncEventsToGlobe();
                alert(`Successfully imported ${result.count} events!`);
            }
        } catch (error) {
            console.error('Error importing events:', error);
            alert('Error importing events: ' + error.message);
        }
    }

    findCityCoordinates(cityName) {
        return this.dataService?.findCityCoordinates(cityName) || null;
    }

    setupEventListeners() {
        if (this.listenerService) {
            this.listenerService.setupEventListeners();
        } else {
            console.error('EventManager: EventListenerService not available!');
        }
    }

    /**
     * Render events to the DOM (delegates to EventRenderService)
     */
    renderEvents() {
        if (this.renderService) {
            const displayed = this.getFilteredEvents();
            const perPage = this.showAllEventsInManager ? Math.max(1, displayed.length) : Math.max(1, parseInt(this.eventsPerPageSetting || 50, 10) || 50);
            this.eventsPerPage = perPage; // keep services in sync (pagination listener logic reads this)
            if (this.showAllEventsInManager) {
                this.currentPage = 1;
            }
            const totalPages = Math.max(1, Math.ceil(displayed.length / this.eventsPerPage));
            if (this.currentPage > totalPages) {
                this.currentPage = totalPages;
            }
            this.renderService.renderEvents(
                displayed,
                this.currentPage,
                this.eventsPerPage,
                () => {
                    this.setupDragAndDrop();
                }
            );
        } else {
            console.error('EventManager: EventRenderService not available!');
            this.updateStatus('EventManager: ERROR - EventRenderService not found', 'error');
        }
    }

    applySearchAndRender() {
        this.currentPage = 1;
        this.renderEvents();
    }

    renderPaginationControls() {
        this.renderService?.renderPaginationControls(this.getFilteredEvents(), this.currentPage, this.eventsPerPage);
    }
    
    setupPaginationListeners() {
        this.renderService?.setupPaginationListeners();
    }

    createEventItem(event, index) {
        if (this.renderService) {
            return this.renderService.createEventItem(event, index, this.events);
        }
        console.error('EventManager: EventRenderService not available!');
        return document.createElement('div');
    }
    
    cycleEventVariant(eventIndex, event, itemElement) {
        this.interactionService?.cycleEventVariant(eventIndex, event, itemElement);
    }
    
    resetAllEventVariants() {
        this.interactionService?.resetAllEventVariants();
    }
    
    updateEventItemPreview(eventIndex, event, itemElement, variantIndex) {
        this.interactionService?.updateEventItemPreview(eventIndex, event, itemElement, variantIndex);
    }
    
    openEventFromList(event, index) {
        this.interactionService?.openEventFromList(event, index);
    }

    /**
     * Get location name from coordinates (delegates to LocationService)
     */
    getLocationName(lat, lon) {
        if (this.locationService) {
            return this.locationService.getLocationName(
                lat, 
                lon, 
                this.cities, 
                this.fictionalCities, 
                this.airports, 
                this.seaports
            );
        }
        return null;
    }

    /**
     * Enhance location name with country (delegates to LocationService)
     */
    async enhanceLocationWithCountry(lat, lon, cityName) {
        if (this.locationService) {
            return await this.locationService.enhanceLocationWithCountry(lat, lon, cityName);
        }
    }

    /**
     * Update location display in the UI (delegates to LocationService)
     */
    updateLocationDisplay(lat, lon, locationName) {
        if (this.locationService) {
            this.locationService.updateLocationDisplay(lat, lon, locationName);
        }
    }

    /**
     * Reverse geocode coordinates (delegates to LocationService)
     */
    async reverseGeocode(lat, lon) {
        if (this.locationService) {
            return await this.locationService.reverseGeocode(lat, lon);
        }
        return null;
    }

    /**
     * Setup drag and drop functionality (delegates to EventDragDropService)
     */
    setupDragAndDrop() {
        if (this.dragDropService) {
            this.dragDropService.setupDragAndDrop();
        }
    }

    /**
     * Get element after which to insert dragged element (delegates to EventDragDropService)
     */
    getDragAfterElement(container, y) {
        if (this.dragDropService) {
            return this.dragDropService.getDragAfterElement(container, y);
        }
        return null;
    }

    /**
     * Reorder events (delegates to EventDragDropService)
     */
    reorderEvents(fromIndex, toIndex) {
        if (this.dragDropService) {
            this.dragDropService.reorderEvents(fromIndex, toIndex);
        }
    }

    /**
     * Delete event
     */
    deleteEvent(index) {
        // Prevent deletion on GitHub Pages
        if (this.isGitHubPages()) {
            console.log('Event deletion is disabled on GitHub Pages');
            return;
        }
        
        const eventName = this.events[index]?.name || (this.events[index]?.variants?.[0]?.name) || 'this event';
        if (confirm(`Are you sure you want to delete "${eventName}"?`)) {
            if (this.editService) {
                const result = this.editService.deleteEvent(index);
                if (result.success) {
                    this.currentPage = result.newCurrentPage;
                    this.renderEvents();
                    this.refreshGlobeEvents();
                }
            } else {
                console.error('EventManager: EventEditService not available!');
            }
        }
    }

    openEditModal(index) {
        if (this.isGitHubPages()) {
            console.log('Event editing is disabled on GitHub Pages');
            return;
        }
        const helper = window.EventManagerModalHelpers?.openEditModal;
        if (helper) {
            helper({
                index, events: this.events, formService: this.formService,
                setEditingIndex: (idx) => { this.editingIndex = idx; },
                clearEditForm: () => { this.clearEditForm(); },
                populateEditForm: (event) => { this.populateEditForm(event); },
                heroes: this.heroes, factions: this.factions
            });
        } else {
            // Fallback
            const modal = document.getElementById('eventEditModal');
            const modalTitle = document.getElementById('eventEditModalTitle');
            if (!modal) return;
            this.editingIndex = index;
            modalTitle.textContent = index === null ? 'Add New Event' : 'Edit Event';
            if (index === null) this.clearEditForm();
            else this.populateEditForm(this.events[index]);
            modal.classList.add('open');
            if (this.formService) {
                this.formService.setupLocationTypeHandler();
                setTimeout(() => {
                    const filtersInput = document.getElementById('eventEditFilters');
                    const factionsInput = document.getElementById('eventEditFactions');
                    if (filtersInput && this.heroes.length > 0) {
                        this.formService.setupAutocomplete(filtersInput, this.heroes, 'heroes');
                    }
                    if (factionsInput && this.factions.length > 0) {
                        this.formService.setupAutocomplete(factionsInput, this.factions.map(f => f.displayName), 'factions');
                    }
                }, 100);
            }
        }
    }

    closeEditModal() {
        const helper = window.EventManagerModalHelpers?.closeEditModal;
        if (helper) {
            helper((idx) => { this.editingIndex = idx; });
        } else {
            const modal = document.getElementById('eventEditModal');
            if (modal) modal.classList.remove('open');
            this.editingIndex = null;
            const filtersInput = document.getElementById('eventEditFilters');
            if (filtersInput) filtersInput.dataset.autocompleteSetup = 'false';
        }
    }


    // EventFormService delegations (consolidated)
    setupLocationTypeHandler() { this.formService?.setupLocationTypeHandler(); }
    setLocationType(locationType) { this.formService?.setLocationType(locationType); }
    updateLocationFields() { this.formService?.updateLocationFields(); }
    clearEditForm() { this.formService?.clearEditForm(); }
    handleDeleteCurrentVariant() { this.formService?.handleDeleteCurrentVariant(); }
    saveCurrentVariantToMemory() { this.formService?.saveCurrentVariantToMemory(); }
    addSourcePair() { this.formService?.addSourcePair(); }
    removeLastSourcePair() { this.formService?.removeLastSourcePair(); }
    clearSourcePairs() { this.formService?.clearSourcePairs(); }
    updateRemoveSourceButton() { this.formService?.updateRemoveSourceButton(); }
    loadVariantToForm(variantIndex) { this.formService?.loadVariantToForm(variantIndex); }
    updateVariantTabs() { this.formService?.updateVariantTabs(); }
    deleteVariant(variantIndex) { this.formService?.deleteVariant(variantIndex); }
    populateEditForm(event) { this.formService?.populateEditForm(event); }
    setupAutocomplete(input, options, type) { this.formService?.setupAutocomplete(input, options, type); }

    // CityLookupService delegations
    async lookupCity() { return await this.cityLookupService?.lookupCity(); }
    async geocodeCity(cityName) { return await this.cityLookupService?.geocodeCity(cityName) || null; }

    // ImagePathService delegation
    getEventImagePath(eventName, providedPath) {
        return this.imagePathService?.getEventImagePath(eventName, providedPath) || null;
    }

    saveEventFromModal() {
        if (!this.modalSaveService) {
            console.error('EventManager: ModalSaveService not available!');
            alert('Error: ModalSaveService not available');
            return;
        }
        const result = this.modalSaveService.saveEventFromModal();
        if (result.success) {
            this.currentPage = result.newCurrentPage;
            this.renderEvents();
            this.closeEditModal();
            this.refreshGlobeEvents();
        } else {
            console.error('EventManager: Failed to save event:', result.error);
            alert('Error saving event: ' + (result.error || 'Unknown error'));
        }
    }
}

// Initialize EventManager when DOM is ready
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
}

