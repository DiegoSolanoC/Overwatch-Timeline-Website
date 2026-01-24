/**
 * EventManager - Handles event management UI and operations
 * Note: Glitch text functionality is now handled by GlitchTextService
 */

/**
 * EventManager - Handles event management UI and operations
 */
class EventManager {
    constructor() {
        // Initialize all services using helper (use global fallback for script tag loading)
        const initializeAllServices = window.EventManagerServiceHelpers?.initializeAllServices || 
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
            });
        
        const services = initializeAllServices(this);
        
        // Set up services that need configuration
        if (services.renderService) {
            services.renderService.setEventManager(this);
        }
        if (services.locationService) {
            services.locationService.setDataService(services.dataService);
            services.locationService.setEventManager(this);
        }
        if (services.editService) {
            services.editService.setEventManager(this);
        }
        if (services.formService) {
            services.formService.setEventManager(this);
        }
        if (services.dragDropService) {
            services.dragDropService.setEventManager(this);
        }
        if (services.listenerService) {
            services.listenerService.setEventManager(this);
        }
        if (services.interactionService) {
            services.interactionService.setEventManager(this);
        }
        if (services.initService) {
            services.initService.setEventManager(this);
        }
        if (services.cityLookupService) {
            services.cityLookupService.setEventManager(this);
        }
        if (services.imagePathService) {
            services.imagePathService.setEventManager(this);
        }
        if (services.globeSyncService) {
            services.globeSyncService.setEventManager(this);
        }
        if (services.modalSaveService) {
            services.modalSaveService.setEventManager(this);
        }
        
        Object.assign(this, services);
        
        // UI state
        this.draggedElement = null;
        this.dragOverIndex = null;
        this.editingIndex = null;
        this.unsavedEventIndices = new Set(); // Track which events have unsaved changes
        this.currentPage = 1; // Current page number (1-indexed)
        this.eventsPerPage = 50; // Number of events per page
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
     * Set events in data service
     */
    set events(value) {
        if (this.dataService) {
            this.dataService.setEvents(value);
        }
    }

    /**
     * Get location data from data service
     */
    get cities() {
        return this.dataService ? this.dataService.cities : [];
    }

    get fictionalCities() {
        return this.dataService ? this.dataService.fictionalCities : [];
    }

    get airports() {
        return this.dataService ? this.dataService.airports : [];
    }

    get seaports() {
        return this.dataService ? this.dataService.seaports : [];
    }

    get heroes() {
        return this.dataService ? this.dataService.heroes : [];
    }

    get factions() {
        return this.dataService ? this.dataService.factions : [];
    }

    get displayNames() {
        return this.dataService ? this.dataService.displayNames : {};
    }

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

    /**
     * Load locations data (delegates to EventDataService)
     */
    async loadLocationsData() {
        if (this.dataService) {
            return await this.dataService.loadLocationsData();
        }
        throw new Error('EventDataService not available');
    }

    /**
     * Load events (delegates to EventDataService)
     */
    async loadEvents() {
        if (!this.dataService) {
            throw new Error('EventDataService not available');
        }
        
        const result = await this.dataService.loadEvents();
        if (result && result.shouldSync) {
            this.syncEventsToGlobe();
        }
        return result;
    }
    
    
    /**
     * Sync events to GlobeController and refresh markers (delegates to GlobeSyncService)
     */
    syncEventsToGlobe() {
        if (this.globeSyncService) {
            this.globeSyncService.syncEventsToGlobe();
        } else {
            // Fallback if service not available
            if (window.globeController && window.globeController.dataModel) {
                window.globeController.dataModel.events = [...this.events];
                console.log('EventManager: Synced', this.events.length, 'events with DataModel');
                
                // Refresh event markers if globe is already initialized
                if (window.globeController.globeView) {
                    window.globeController.globeView.refreshEventMarkers();
                    console.log('EventManager: Refreshed event markers on globe');
                }
            }
        }
    }

    /**
     * Save events to localStorage (delegates to EventDataService, then updates UI)
     */
    saveEvents() {
        if (this.dataService) {
            this.dataService.saveEvents();
        }
        
        // Clear all unsaved markers
        this.unsavedEventIndices.clear();
        
        // Re-render to update visual indicators
        this.renderEvents();
        
        // Show success message (use global fallback for script tag loading)
        const showSaveSuccessFeedback = window.EventManagerUIHelpers?.showSaveSuccessFeedback || 
            ((buttonId) => {
                const saveBtn = document.getElementById(buttonId);
                if (saveBtn) {
                    const originalText = saveBtn.textContent;
                    saveBtn.textContent = '✓ Saved!';
                    saveBtn.style.background = 'rgba(76, 175, 80, 0.8)';
                    setTimeout(() => {
                        saveBtn.textContent = originalText;
                        saveBtn.style.background = '';
                    }, 2000);
                }
            });
        showSaveSuccessFeedback('saveEventsBtn');
        
        // Refresh event markers on globe
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

    /**
     * Export events as JSON file (delegates to EventDataService)
     */
    exportEvents() {
        if (this.dataService) {
            this.dataService.exportEvents();
        }
    }

    /**
     * Import events from JSON file (delegates to EventDataService)
     */
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

    /**
     * Find city coordinates by name (delegates to EventDataService)
     */
    findCityCoordinates(cityName) {
        if (this.dataService) {
            return this.dataService.findCityCoordinates(cityName);
        }
        return null;
    }

    /**
     * Setup event listeners (delegates to EventListenerService)
     */
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
            this.renderService.renderEvents(
                this.events,
                this.currentPage,
                this.eventsPerPage,
                () => {
                    // Callback after rendering: setup drag and drop
                    this.setupDragAndDrop();
                }
            );
        } else {
            console.error('EventManager: EventRenderService not available!');
            this.updateStatus('EventManager: ERROR - EventRenderService not found', 'error');
        }
    }
    
    /**
     * Render pagination controls (delegates to EventRenderService)
     */
    renderPaginationControls() {
        if (this.renderService) {
            this.renderService.renderPaginationControls(this.events, this.currentPage, this.eventsPerPage);
        }
    }
    
    /**
     * Setup pagination event listeners (delegates to EventRenderService)
     */
    setupPaginationListeners() {
        if (this.renderService) {
            this.renderService.setupPaginationListeners();
        }
    }

    /**
     * Create event item element (delegates to EventRenderService)
     */
    createEventItem(event, index) {
        if (this.renderService) {
            return this.renderService.createEventItem(event, index, this.events);
        }
        console.error('EventManager: EventRenderService not available!');
        return document.createElement('div');
    }
    
    /**
     * Cycle through variants for a multi-event item (delegates to EventInteractionService)
     */
    cycleEventVariant(eventIndex, event, itemElement) {
        if (this.interactionService) {
            this.interactionService.cycleEventVariant(eventIndex, event, itemElement);
        }
    }
    
    /**
     * Reset all multi-variant events to the first variant (delegates to EventInteractionService)
     */
    resetAllEventVariants() {
        if (this.interactionService) {
            this.interactionService.resetAllEventVariants();
        }
    }
    
    /**
     * Update the preview for an event item with a specific variant (delegates to EventInteractionService)
     */
    updateEventItemPreview(eventIndex, event, itemElement, variantIndex) {
        if (this.interactionService) {
            this.interactionService.updateEventItemPreview(eventIndex, event, itemElement, variantIndex);
        }
    }
    
    /**
     * Open event info from list (delegates to EventInteractionService)
     */
    openEventFromList(event, index) {
        if (this.interactionService) {
            this.interactionService.openEventFromList(event, index);
        }
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

    /**
     * Open edit modal
     */
    openEditModal(index) {
        // Prevent opening edit modal on GitHub Pages
        if (this.isGitHubPages()) {
            console.log('Event editing is disabled on GitHub Pages');
            return;
        }
        
        // Use global fallback for script tag loading
        const openEditModalHelper = window.EventManagerModalHelpers?.openEditModal || 
            (({ index, events, formService, setEditingIndex, clearEditForm, populateEditForm, heroes, factions }) => {
                const modal = document.getElementById('eventEditModal');
                const modalTitle = document.getElementById('eventEditModalTitle');
                
                if (!modal) return;
                
                setEditingIndex(index);
                
                if (index === null) {
                    modalTitle.textContent = 'Add New Event';
                    clearEditForm();
                } else {
                    modalTitle.textContent = 'Edit Event';
                    populateEditForm(events[index]);
                }
                
                modal.classList.add('open');
                
                if (formService) {
                    formService.setupLocationTypeHandler();
                }
                
                setTimeout(() => {
                    const filtersInput = document.getElementById('eventEditFilters');
                    const factionsInput = document.getElementById('eventEditFactions');
                    
                    if (filtersInput && heroes.length > 0 && formService) {
                        formService.setupAutocomplete(filtersInput, heroes, 'heroes');
                    }
                    
                    if (factionsInput && factions.length > 0 && formService) {
                        const factionDisplayNames = factions.map(f => f.displayName);
                        formService.setupAutocomplete(factionsInput, factionDisplayNames, 'factions');
                    }
                }, 100);
            });
        
        openEditModalHelper({
            index,
            events: this.events,
            formService: this.formService,
            setEditingIndex: (idx) => { this.editingIndex = idx; },
            clearEditForm: () => { this.clearEditForm(); },
            populateEditForm: (event) => { this.populateEditForm(event); },
            heroes: this.heroes,
            factions: this.factions
        });
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        // Use global fallback for script tag loading
        const closeEditModalHelper = window.EventManagerModalHelpers?.closeEditModal || 
            ((setEditingIndex) => {
                const modal = document.getElementById('eventEditModal');
                if (modal) {
                    modal.classList.remove('open');
                }
                setEditingIndex(null);
                
                const filtersInput = document.getElementById('eventEditFilters');
                if (filtersInput) {
                    filtersInput.dataset.autocompleteSetup = 'false';
                }
            });
        
        closeEditModalHelper((idx) => { this.editingIndex = idx; });
    }


    /**
     * Setup location type change handler (delegates to EventFormService)
     */
    setupLocationTypeHandler() {
        if (this.formService) {
            this.formService.setupLocationTypeHandler();
        }
    }

    /**
     * Set location type and update UI (delegates to EventFormService)
     * @param {string} locationType - 'earth', 'moon', 'mars', or 'station'
     */
    setLocationType(locationType) {
        if (this.formService) {
            this.formService.setLocationType(locationType);
        }
    }

    /**
     * Update location fields based on selected location type (delegates to EventFormService)
     */
    updateLocationFields() {
        if (this.formService) {
            this.formService.updateLocationFields();
        }
    }

    /**
     * Clear edit form (delegates to EventFormService)
     */
    clearEditForm() {
        if (this.formService) {
            this.formService.clearEditForm();
        }
    }
    
    /**
     * Handle delete current variant button (delegates to EventFormService)
     */
    handleDeleteCurrentVariant() {
        if (this.formService) {
            this.formService.handleDeleteCurrentVariant();
        }
    }
    
    /**
     * Save current form data to active variant in memory (delegates to EventFormService)
     */
    saveCurrentVariantToMemory() {
        if (this.formService) {
            this.formService.saveCurrentVariantToMemory();
        }
    }
    
    /**
     * Add a new source pair (delegates to EventFormService)
     */
    addSourcePair() {
        if (this.formService) {
            this.formService.addSourcePair();
        }
    }
    
    /**
     * Remove the last source pair (delegates to EventFormService)
     */
    removeLastSourcePair() {
        if (this.formService) {
            this.formService.removeLastSourcePair();
        }
    }
    
    /**
     * Clear all source pairs (delegates to EventFormService)
     */
    clearSourcePairs() {
        if (this.formService) {
            this.formService.clearSourcePairs();
        }
    }
    
    /**
     * Update the visibility of the remove source button (delegates to EventFormService)
     */
    updateRemoveSourceButton() {
        if (this.formService) {
            this.formService.updateRemoveSourceButton();
        }
    }
    
    /**
     * Load variant data into form (delegates to EventFormService)
     */
    loadVariantToForm(variantIndex) {
        if (this.formService) {
            this.formService.loadVariantToForm(variantIndex);
        }
    }
    
    /**
     * Update variant tabs UI (delegates to EventFormService)
     */
    updateVariantTabs() {
        if (this.formService) {
            this.formService.updateVariantTabs();
        }
    }
    
    /**
     * Delete a variant (delegates to EventFormService)
     */
    deleteVariant(variantIndex) {
        if (this.formService) {
            this.formService.deleteVariant(variantIndex);
        }
    }

    /**
     * Populate edit form with event data (delegates to EventFormService)
     */
    populateEditForm(event) {
        if (this.formService) {
            this.formService.populateEditForm(event);
        }
    }

    /**
     * Lookup city coordinates (delegates to CityLookupService)
     */
    async lookupCity() {
        if (this.cityLookupService) {
            return await this.cityLookupService.lookupCity();
        }
    }

    /**
     * Geocode a city name (delegates to CityLookupService)
     */
    async geocodeCity(cityName) {
        if (this.cityLookupService) {
            return await this.cityLookupService.geocodeCity(cityName);
        }
        return null;
    }

    /**
     * Get event image path (delegates to ImagePathService)
     */
    getEventImagePath(eventName, providedPath) {
        if (this.imagePathService) {
            return this.imagePathService.getEventImagePath(eventName, providedPath);
        }
        return null;
    }

    /**
     * Setup autocomplete for filter inputs (delegates to EventFormService)
     */
    setupAutocomplete(input, options, type) {
        if (this.formService) {
            this.formService.setupAutocomplete(input, options, type);
        }
    }

    /**
     * Save event from modal (delegates to ModalSaveService)
     */
    saveEventFromModal() {
        if (this.modalSaveService) {
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
        } else {
            console.error('EventManager: ModalSaveService not available!');
            alert('Error: ModalSaveService not available');
        }
    }
}

// Initialize EventManager when DOM is ready
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
}

