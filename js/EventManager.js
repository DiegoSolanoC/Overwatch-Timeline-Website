/**
 * Generate random glitch character
 */
function getRandomGlitchChar() {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    return chars[Math.floor(Math.random() * chars.length)];
}

/**
 * Helper function to apply display transformations to event names
 * Maps normal text to glitchy text for display purposes
 * Returns HTML with glitchy text overlay effect
 */
function getDisplayEventName(eventName) {
    if (!eventName) return eventName;
    
    // Replace "Olivia Colomar" with glitchy overlay effect
    if (eventName === 'Olivia Colomar' || eventName.includes('Olivia Colomar')) {
        return eventName.replace(/Olivia Colomar/gi, (match) => {
            // Create overlay with random characters that will constantly change
            const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
            return `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
        });
    }
    
    return eventName;
}

/**
 * EventManager - Handles event management UI and operations
 */
class EventManager {
    constructor() {
        this.events = [];
        this.cities = [];
        this.airports = [];
        this.seaports = [];
        this.draggedElement = null;
        this.dragOverIndex = null;
        this.editingIndex = null;
        this.heroes = [];
        this.factions = [];
        this.unsavedEventIndices = new Set(); // Track which events have unsaved changes
        this.locationCache = new Map(); // Cache for location names with countries
        this.displayNames = {}; // Mapping of location names to display names
        this.variantData = []; // Store variant data in memory for tab system
        this.activeVariantIndex = 0; // Currently active variant tab
        this.eventItemVariantIndices = new Map(); // Track current variant index for each event item
    }

    /**
     * Initialize the event manager
     */
    async init() {
        await this.loadLocationsData();
        // Don't call setupEventListeners here - it will be called after buttons are created
        // this.setupEventListeners();
        await this.loadEvents();
        
        // Ensure DOM is ready before rendering
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.renderEvents();
            });
        } else {
            this.renderEvents();
        }
        
        // Also try rendering after a short delay to ensure DOM is fully ready
        setTimeout(() => {
            const eventsList = document.getElementById('eventsList');
            if (eventsList && this.events.length > 0 && eventsList.children.length === 0) {
                console.log('EventManager: Retrying render after delay (DOM might not have been ready)');
                this.renderEvents();
            }
        }, 100);
        
        // Ensure button is visible after initialization
        const toggleBtn = document.getElementById('eventsManageToggle');
        if (toggleBtn) {
            toggleBtn.style.display = '';
            toggleBtn.style.visibility = 'visible';
            toggleBtn.style.opacity = '1';
            console.log('EventManager: Button visibility ensured');
        }
        
        console.log('EventManager: Initialized with', this.events.length, 'events');
        return Promise.resolve(); // Return promise for chaining
    }

    /**
     * Check if we're running on GitHub Pages
     */
    isGitHubPages() {
        const hostname = window.location.hostname;
        // Check for GitHub Pages domains
        return hostname.includes('github.io') || 
               hostname.includes('github.com') ||
               (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.') && !hostname.startsWith('10.') && window.location.protocol !== 'file:');
    }

    /**
     * Load locations data for city lookup
     */
    async loadLocationsData() {
        try {
            const response = await fetch('data/locations.json');
            const data = await response.json();
            this.cities = data.cities || [];
            this.airports = data.airports || [];
            this.seaports = data.seaports || [];
        } catch (error) {
            console.error('Error loading locations data:', error);
        }
        
        // Load display names mapping
        try {
            const displayNamesResponse = await fetch('data/location-display-names.json');
            const displayNamesData = await displayNamesResponse.json();
            this.displayNames = displayNamesData.displayNames || {};
        } catch (error) {
            console.error('Error loading display names:', error);
            this.displayNames = {};
        }
        
        // Load manifest for filter autocomplete
        try {
            const manifestResponse = await fetch('manifest.json');
            const manifest = await manifestResponse.json();
            this.heroes = manifest.heroes || [];
            // Store full faction objects (with filename, displayName, number)
            this.factions = manifest.factions || [];
        } catch (error) {
            console.error('Error loading manifest:', error);
        }
    }

    /**
     * Load events from localStorage or fetch from locations.json
     */
    async loadEvents() {
        // First, always try to load from events.json (source of truth)
        let fileEventCount = 0;
        let fileEvents = null;
        try {
            const response = await fetch('data/events.json?' + Date.now()); // Cache busting
            if (response.ok) {
                const data = await response.json();
                if (data.events && Array.isArray(data.events) && data.events.length > 0) {
                    fileEvents = data.events;
                    fileEventCount = data.events.length;
                    console.log('EventManager: Found', fileEventCount, 'events in data/events.json');
                }
            }
        } catch (error) {
            console.log('EventManager: Could not load from data/events.json (file may not exist):', error.message);
        }
        
        // Check localStorage for comparison
        const savedEvents = localStorage.getItem('timelineEvents');
        console.log('EventManager: Checking localStorage for events...');
        console.log('EventManager: localStorage.getItem("timelineEvents") =', savedEvents ? 'Found data (' + savedEvents.length + ' chars)' : 'null');
        
        if (savedEvents) {
            try {
                const localStorageEvents = JSON.parse(savedEvents);
                const localStorageCount = localStorageEvents.length;
                console.log('EventManager: Found', localStorageCount, 'events in localStorage');
                
                // Prefer localStorage if it has user's saved changes (user edits take priority)
                // Only use file if localStorage is empty or file has significantly more events (file was updated externally)
                if (fileEvents && fileEventCount > 0) {
                    // If file has more events (likely updated externally), use file
                    if (fileEventCount > localStorageCount + 5) {
                        console.log('EventManager: events.json has significantly more events (' + fileEventCount + ' vs ' + localStorageCount + '), using file version');
                        this.events = fileEvents;
                        this.saveEvents();
                        this.syncEventsToGlobe();
                        return;
                    }
                    // Otherwise, prefer localStorage (user's saved changes)
                    console.log('EventManager: Using localStorage version (user\'s saved changes) -', localStorageCount, 'events');
                }
                
                // Use localStorage (user's saved changes take priority)
                this.events = localStorageEvents;
                console.log('EventManager: Using localStorage version (', this.events.length, 'events)');
                console.log('EventManager: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
                
                // Sync with DataModel and refresh markers
                this.syncEventsToGlobe();
                return;
            } catch (error) {
                console.error('EventManager: Error parsing saved events:', error);
                console.error('EventManager: Raw data:', savedEvents.substring(0, 200));
                // If localStorage is corrupted, clear it and use file
                if (fileEvents && fileEventCount > 0) {
                    console.log('EventManager: localStorage corrupted, using file version');
                    localStorage.removeItem('timelineEvents');
                    this.events = fileEvents;
                    this.saveEvents();
                    this.syncEventsToGlobe();
                    return;
                }
            }
        }

        // If no localStorage, use events.json if available
        if (fileEvents && fileEventCount > 0) {
            this.events = fileEvents;
                    console.log('EventManager: Loaded', this.events.length, 'events from data/events.json');
                    console.log('EventManager: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
                    
                    // Save to localStorage for future use
                    this.saveEvents();
                    
                    // Sync with DataModel and refresh markers
                    this.syncEventsToGlobe();
                    return;
        }

        // No saved events - use empty array
        this.events = [];
        console.log('EventManager: No saved events found, using empty array');
        
        // Sync empty array with DataModel
        this.syncEventsToGlobe();
    }
    
    /**
     * Sync events to GlobeController and refresh markers
     */
    syncEventsToGlobe() {
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

    /**
     * Save events to localStorage
     */
    saveEvents() {
        localStorage.setItem('timelineEvents', JSON.stringify(this.events));
        console.log('Events saved to localStorage');
        
        // Clear all unsaved markers
        this.unsavedEventIndices.clear();
        
        // Re-render to update visual indicators
        this.renderEvents();
        
        // Show success message
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
        
        // Refresh event markers on globe
        this.refreshGlobeEvents();
    }
    
    /**
     * Refresh event markers on the globe
     */
    refreshGlobeEvents() {
        // Update DataModel if available
        if (window.globeController && window.globeController.dataModel) {
            // Update events in DataModel
            window.globeController.dataModel.events = [...this.events];
            
            // Refresh event markers
            if (window.globeController.globeView) {
                window.globeController.globeView.refreshEventMarkers();
            }
            
            // Refresh pagination UI
            if (window.globeController.uiView && window.globeController.uiView.dataModel) {
                // Trigger pagination update
                const currentPage = window.globeController.dataModel.getCurrentEventPage();
                window.globeController.dataModel.setCurrentEventPage(currentPage);
                
                // Re-setup pagination to update UI
                window.globeController.uiView.setupEventPagination(() => {
                    if (window.globeController.globeView) {
                        window.globeController.globeView.refreshEventMarkers();
                    }
                });
            }
        }
    }

    /**
     * Export events as JSON file
     */
    exportEvents() {
        const dataStr = JSON.stringify({ events: this.events }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'events-export.json';
        link.click();
        URL.revokeObjectURL(url);
        console.log('Events exported');
    }

    /**
     * Import events from JSON file
     */
    importEvents(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.events && Array.isArray(data.events)) {
                    this.events = data.events;
                    this.saveEvents();
                    this.renderEvents();
                    this.syncEventsToGlobe();
                    console.log('Events imported:', this.events.length);
                    alert(`Successfully imported ${this.events.length} events!`);
                } else {
                    throw new Error('Invalid file format: expected { events: [...] }');
                }
            } catch (error) {
                console.error('Error importing events:', error);
                alert('Error importing events: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Find city coordinates by name
     */
    findCityCoordinates(cityName) {
        if (!cityName) return null;

        const searchName = cityName.toLowerCase().trim();

        // Search in cities (exact match first, then partial)
        let city = this.cities.find(c => 
            c.name.toLowerCase() === searchName
        );
        if (!city) {
            // Try partial match
            city = this.cities.find(c => 
                c.name.toLowerCase().includes(searchName) ||
                searchName.includes(c.name.toLowerCase())
            );
        }
        if (city) {
            return { lat: city.lat, lon: city.lon, name: city.name };
        }

        // Search in airports (partial match)
        const airport = this.airports.find(a => 
            a.name.toLowerCase().includes(searchName) ||
            searchName.includes(a.name.toLowerCase())
        );
        if (airport) {
            return { lat: airport.lat, lon: airport.lon, name: airport.name };
        }

        // Search in seaports
        const seaport = this.seaports.find(s => 
            s.name.toLowerCase() === searchName ||
            s.name.toLowerCase().includes(searchName) ||
            searchName.includes(s.name.toLowerCase())
        );
        if (seaport) {
            return { lat: seaport.lat, lon: seaport.lon, name: seaport.name };
        }

        return null;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle panel
        const toggleBtn = document.getElementById('eventsManageToggle');
        const panel = document.getElementById('eventsManagePanel');
        const closeBtn = document.getElementById('eventsManageClose');

        // Ensure button is always visible (never hide it)
        if (toggleBtn) {
            toggleBtn.style.display = '';
            toggleBtn.style.visibility = 'visible';
            toggleBtn.style.opacity = '1';
        }

        if (toggleBtn && panel) {
            // Remove existing listener by cloning the button to prevent duplicates
            const toggleBtnClone = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(toggleBtnClone, toggleBtn);
            const newToggleBtn = document.getElementById('eventsManageToggle');
            
            // Re-get panel reference after button clone (in case DOM changed)
            const currentPanel = document.getElementById('eventsManagePanel');
            if (!currentPanel) {
                console.error('EventManager: eventsManagePanel not found after button setup');
                return;
            }
            
            newToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('EventManager: Toggle button clicked');
                
                // Close music panel if open
                const musicPanel = document.getElementById('musicPanel');
                const musicButton = document.getElementById('musicToggle');
                if (musicPanel && musicPanel.classList.contains('open')) {
                    musicPanel.classList.remove('open');
                    if (musicButton) {
                        musicButton.classList.remove('active');
                    }
                }
                
                // Close filters panel if open
                const filtersPanel = document.getElementById('filtersPanel');
                const filtersButton = document.getElementById('filtersToggle');
                if (filtersPanel && filtersPanel.classList.contains('open')) {
                    filtersPanel.classList.remove('open');
                    if (filtersButton) {
                        filtersButton.classList.remove('active');
                    }
                }
                
                // Play event manager sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventManager');
                }
                
                // Toggle event management panel (works normally on both localhost and GitHub Pages)
                const wasOpen = currentPanel.classList.contains('open');
                console.log('EventManager: Panel was open:', wasOpen);
                currentPanel.classList.toggle('open');
                const isNowOpen = currentPanel.classList.contains('open');
                console.log('EventManager: Panel is now open:', isNowOpen);
                
                if (isNowOpen) {
                    newToggleBtn.classList.add('active');
                    this.renderEvents();
                } else {
                    // Reset all multi-variant events to first variant when closing
                    if (wasOpen) {
                        this.resetAllEventVariants();
                    }
                    newToggleBtn.classList.remove('active');
                }
            });
        } else {
            console.error('EventManager: setupEventListeners - toggleBtn or panel not found', {
                toggleBtn: !!toggleBtn,
                panel: !!panel
            });
        }

        if (closeBtn && panel) {
            closeBtn.addEventListener('click', () => {
                // Play event manager sound when closing
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventManager');
                }
                
                // Reset all multi-variant events to first variant
                this.resetAllEventVariants();
                
                panel.classList.remove('open');
                const toggleBtn = document.getElementById('eventsManageToggle');
                if (toggleBtn) {
                    toggleBtn.classList.remove('active');
                }
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (panel && panel.classList.contains('open')) {
                const toggleBtn = document.getElementById('eventsManageToggle');
                const editModal = document.getElementById('eventEditModal');
                // Don't close panel if clicking on edit modal or its children
                if (!panel.contains(e.target) && 
                    !toggleBtn.contains(e.target) && 
                    e.target !== toggleBtn &&
                    !editModal.contains(e.target) &&
                    !editModal.classList.contains('open')) {
                    // Reset all multi-variant events to first variant
                    this.resetAllEventVariants();
                    
                    panel.classList.remove('open');
                    if (toggleBtn) {
                        toggleBtn.classList.remove('active');
                    }
                }
            }
        });

        // Hide/lock management buttons on GitHub Pages
        const isGitHubPages = this.isGitHubPages();
        
        // Add event button
        const addBtn = document.getElementById('addEventBtn');
        if (addBtn) {
            if (isGitHubPages) {
                addBtn.style.display = 'none';
            } else {
                addBtn.addEventListener('click', () => {
                    this.openEditModal(null);
                });
            }
        }

        // Save events button
        const saveBtn = document.getElementById('saveEventsBtn');
        if (saveBtn) {
            if (isGitHubPages) {
                saveBtn.style.display = 'none';
            } else {
                saveBtn.addEventListener('click', () => {
                    this.saveEvents();
                });
            }
        }

        // Export events button
        const exportBtn = document.getElementById('exportEventsBtn');
        if (exportBtn) {
            if (isGitHubPages) {
                exportBtn.style.display = 'none';
            } else {
                exportBtn.addEventListener('click', () => {
                    this.exportEvents();
                });
            }
        }

        // Import events button
        const importBtn = document.getElementById('importEventsBtn');
        const importFileInput = document.getElementById('importEventsFile');
        if (importBtn && importFileInput) {
            if (isGitHubPages) {
                importBtn.style.display = 'none';
                importFileInput.style.display = 'none';
            } else {
                importBtn.addEventListener('click', () => {
                    importFileInput.click();
                });
                importFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.importEvents(file);
                        // Reset input so same file can be imported again
                        e.target.value = '';
                    }
                });
            }
        }

        // Edit modal
        const modal = document.getElementById('eventEditModal');
        const modalClose = document.getElementById('eventEditModalClose');
        const modalCancel = document.getElementById('eventEditCancel');
        const modalSave = document.getElementById('eventEditSave');
        const lookupBtn = document.getElementById('lookupCityBtn');
        const deleteVariantBtn = document.getElementById('eventEditDeleteVariant');

        // Hide/lock modal controls on GitHub Pages
        if (isGitHubPages) {
            if (modalSave) {
                modalSave.style.display = 'none';
                modalSave.style.visibility = 'hidden';
                modalSave.style.pointerEvents = 'none';
            }
            if (lookupBtn) {
                lookupBtn.style.display = 'none';
                lookupBtn.style.visibility = 'hidden';
                lookupBtn.style.pointerEvents = 'none';
            }
            if (deleteVariantBtn) {
                deleteVariantBtn.style.display = 'none';
                deleteVariantBtn.style.visibility = 'hidden';
                deleteVariantBtn.style.pointerEvents = 'none';
            }
            // Make all form inputs read-only and disabled
            const formInputs = modal?.querySelectorAll('input, textarea, select, button');
            if (formInputs) {
                formInputs.forEach(input => {
                    if (input.id !== 'eventEditModalClose' && input.id !== 'eventEditCancel') {
                        input.setAttribute('readonly', 'readonly');
                        input.setAttribute('disabled', 'disabled');
                        input.style.pointerEvents = 'none';
                    }
                });
            }
        } else {
            if (modalClose) {
                modalClose.addEventListener('click', () => {
                    this.closeEditModal();
                });
            }

            if (modalCancel) {
                modalCancel.addEventListener('click', () => {
                    this.closeEditModal();
                });
            }

            if (modalSave) {
                modalSave.addEventListener('click', () => {
                    this.saveEventFromModal();
                });
            }

            if (lookupBtn) {
                lookupBtn.addEventListener('click', () => {
                    this.lookupCity();
                });
            }
        }

        // Delete variant button (only on localhost)
        if (!isGitHubPages) {
            const deleteVariantBtn = document.getElementById('eventEditDeleteVariant');
            if (deleteVariantBtn) {
                deleteVariantBtn.addEventListener('click', () => {
                    this.handleDeleteCurrentVariant();
                });
            }
        }
        
        // Add source pair button (only on localhost)
        const addSourceBtn = document.getElementById('addSourceBtn');
        if (addSourceBtn) {
            if (isGitHubPages) {
                addSourceBtn.style.display = 'none';
                addSourceBtn.style.visibility = 'hidden';
                addSourceBtn.style.pointerEvents = 'none';
            } else {
                addSourceBtn.addEventListener('click', () => {
                    this.addSourcePair();
                });
            }
        }
        
        // Remove source pair button (only on localhost)
        const removeSourcePairBtn = document.getElementById('removeSourcePairBtn');
        if (removeSourcePairBtn) {
            if (isGitHubPages) {
                removeSourcePairBtn.style.display = 'none';
                removeSourcePairBtn.style.visibility = 'hidden';
                removeSourcePairBtn.style.pointerEvents = 'none';
            } else {
                removeSourcePairBtn.addEventListener('click', () => {
                    this.removeLastSourcePair();
                });
            }
        }
        
        // Don't close modal on outside click - only buttons can close it
        // Removed the outside click handler
    }

    /**
     * Render events list
     */
    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) {
            console.error('EventManager: eventsList element not found!');
            return;
        }

        console.log('EventManager: Rendering', this.events.length, 'events');
        console.log('EventManager: Events data:', this.events);

        // Update event count display
        const eventsCountElement = document.getElementById('eventsCount');
        if (eventsCountElement) {
            const count = this.events.length;
            eventsCountElement.textContent = `${count} ${count === 1 ? 'Event' : 'Events'}`;
        }

        eventsList.innerHTML = '';

        if (this.events.length === 0) {
            eventsList.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">No events yet. Click "Add Event" to create one.</div>';
            console.log('EventManager: No events to render');
            return;
        }

        // Create all event items synchronously (fast)
        this.events.forEach((event, index) => {
            const eventItem = this.createEventItem(event, index);
            eventsList.appendChild(eventItem);
        });

        console.log('EventManager: Rendered', this.events.length, 'event items');

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    /**
     * Create event item element
     */
    createEventItem(event, index) {
        const item = document.createElement('div');
        item.className = 'event-item';
        const isGitHubPages = this.isGitHubPages();
        
        // Disable drag and drop on GitHub Pages
        if (!isGitHubPages) {
            item.draggable = true;
        }
        item.dataset.index = index;

        // Check if this event has unsaved changes
        if (this.unsavedEventIndices.has(index)) {
            item.classList.add('unsaved');
        }

        // Check if this is a multi-event
        const isMultiEvent = event.variants && event.variants.length > 0;
        if (isMultiEvent) {
            item.classList.add('multi-event');
        }

        // Get location name - for multi-events, use first variant's cityDisplayName
        // Otherwise use event's cityDisplayName or get from location lookup
        let locationName = null;
        let locationLat = event.lat;
        let locationLon = event.lon;
        
        if (isMultiEvent && event.variants && event.variants.length > 0) {
            // Use first variant's cityDisplayName and location
            const firstVariant = event.variants[0];
            locationName = firstVariant.cityDisplayName || null;
            if (firstVariant.lat !== undefined) {
                locationLat = firstVariant.lat;
            }
            if (firstVariant.lon !== undefined) {
                locationLon = firstVariant.lon;
            }
        } else {
            locationName = event.cityDisplayName || null;
        }
        
        if (!locationName) {
            locationName = this.getLocationName(locationLat, locationLon);
        }

        // For multi-events, track and use current variant index (default to 0)
        let currentVariantIndex = 0;
        if (isMultiEvent) {
            const itemKey = `event-${index}`;
            if (!this.eventItemVariantIndices.has(itemKey)) {
                this.eventItemVariantIndices.set(itemKey, 0);
            }
            currentVariantIndex = this.eventItemVariantIndices.get(itemKey);
        }
        
        // For multi-events, show the current variant; otherwise show the main event
        const displayEvent = isMultiEvent ? event.variants[currentVariantIndex] : event;
        const imagePath = this.getEventImagePath(displayEvent.name, displayEvent.image);
        
        // Update location for current variant
        if (isMultiEvent && event.variants[currentVariantIndex]) {
            const currentVariant = event.variants[currentVariantIndex];
            locationName = currentVariant.cityDisplayName || null;
            if (currentVariant.lat !== undefined) {
                locationLat = currentVariant.lat;
            }
            if (currentVariant.lon !== undefined) {
                locationLon = currentVariant.lon;
            }
            if (!locationName) {
                locationName = this.getLocationName(locationLat, locationLon);
            }
        }
        
        // Don't use cache busting for initial loads - let browser cache work for performance
        // Cache busting is only needed when we know an image has been updated
        const imagePathWithCache = imagePath || null;
        
        // Warning icon for missing description - check if description is empty or missing
        // Positioned on the RIGHT side (top-right corner) to avoid overlap with multi-event badge on left
        const hasDescription = displayEvent.description && displayEvent.description.trim().length > 0;
        const descriptionWarning = !hasDescription 
            ? `<div class="description-warning-icon" title="Missing description" style="position: absolute; top: 8px; right: 8px; z-index: 11; font-size: 20px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); pointer-events: none; width: auto; height: auto;">⚠️</div>`
            : '';
        
        // Always use the same container structure to maintain consistent sizing
        // Use a wrapper div to ensure the square space is always shown
        // Add loading="lazy" for better performance - images load as they come into view
        // Include warning icon inside the image container for proper positioning
        const imageHtml = imagePathWithCache
            ? `<div class="event-item-preview-image" style="position: relative; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1; overflow: hidden;">${descriptionWarning}<img src="${imagePathWithCache}" alt="${displayEvent.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;\\'>No Image</div>';" onload=""></div>`
            : `<div class="event-item-preview-image" style="position: relative; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1;">${descriptionWarning}No Image</div>`;

        // Multi-event indicator badge - show current variant / total (e.g., "1/2")
        const multiEventBadge = isMultiEvent 
            ? `<div class="multi-event-badge" data-event-index="${index}" title="Click to cycle through variants">${currentVariantIndex + 1}/${event.variants.length}</div>`
            : '';

        // On GitHub Pages, hide edit/delete buttons, but show View button
        const actionButtons = isGitHubPages ? `
            <div class="event-item-actions">
                <div class="event-item-actions-row">
                    <button class="event-item-btn view-btn" data-index="${index}">View</button>
                </div>
            </div>
        ` : `
            <div class="event-item-actions">
                <div class="event-item-actions-row">
                    <button class="event-item-btn view-btn" data-index="${index}">View</button>
                </div>
                <div class="event-item-actions-row">
                    <button class="event-item-btn edit-btn" data-index="${index}">Edit</button>
                    <button class="event-item-btn delete-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `;

        item.innerHTML = `
            <div style="position: relative;">
            ${imageHtml}
            ${multiEventBadge}
            </div>
            <div class="event-item-info">
                <h3 class="event-item-title">${getDisplayEventName(displayEvent.name)}</h3>
                <p class="event-item-location"><img src="Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName || `${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}`}</p>
            </div>
            ${actionButtons}
        `;

        // Add event listeners for buttons (View works on both, Edit/Delete only on localhost)
        const viewBtn = item.querySelector('.view-btn');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEventFromList(event, index);
            });
            // Prevent dragging when clicking on button
            viewBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        if (editBtn && !isGitHubPages) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditModal(index);
            });
            // Prevent dragging when clicking on button
            editBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        if (deleteBtn && !isGitHubPages) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteEvent(index);
            });
            // Prevent dragging when clicking on button
            deleteBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        // Add click handler for multi-event badge to cycle through variants
        if (isMultiEvent) {
            const badge = item.querySelector('.multi-event-badge');
            if (badge) {
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleEventVariant(index, event, item);
                });
                // Prevent dragging when clicking on badge
                badge.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
            }
        }

        return item;
    }
    
    /**
     * Cycle through variants for a multi-event item
     */
    cycleEventVariant(eventIndex, event, itemElement) {
        if (!event.variants || event.variants.length <= 1) return;
        
        const itemKey = `event-${eventIndex}`;
        let currentIndex = this.eventItemVariantIndices.get(itemKey) || 0;
        
        // Cycle to next variant (wrap around)
        currentIndex = (currentIndex + 1) % event.variants.length;
        this.eventItemVariantIndices.set(itemKey, currentIndex);
        
        // Play switch event sound when switching variants
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('switchEvent');
        }
        
        // Update the preview
        this.updateEventItemPreview(eventIndex, event, itemElement, currentIndex);
    }
    
    /**
     * Reset all multi-variant events to the first variant
     */
    resetAllEventVariants() {
        // Clear all variant indices (they will default to 0 when accessed)
        this.eventItemVariantIndices.clear();
        
        // Re-render events to show first variant in all previews
        this.renderEvents();
    }
    
    /**
     * Update the preview for an event item with a specific variant
     */
    updateEventItemPreview(eventIndex, event, itemElement, variantIndex) {
        const variant = event.variants[variantIndex];
        
        // Update image
        const imageContainer = itemElement.querySelector('.event-item-preview-image');
        const imagePath = this.getEventImagePath(variant.name, variant.image);
        // No cache busting needed for variant switching - images are already loaded
        const imagePathWithCache = imagePath || null;
        
        if (imagePathWithCache) {
            imageContainer.innerHTML = `<img src="${imagePathWithCache}" alt="${variant.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;\\'>No Image</div>';" onload="">`;
        } else {
            imageContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;">No Image</div>';
        }
        
        // Update title
        const titleElement = itemElement.querySelector('.event-item-title');
        if (titleElement) {
            titleElement.textContent = getDisplayEventName(variant.name);
        }
        
        // Update location
        const locationElement = itemElement.querySelector('.event-item-location');
        if (locationElement) {
            let locationName = variant.cityDisplayName || null;
            if (!locationName && variant.lat !== undefined && variant.lon !== undefined) {
                locationName = this.getLocationName(variant.lat, variant.lon);
            }
            if (!locationName && variant.lat !== undefined && variant.lon !== undefined) {
                locationName = `${variant.lat.toFixed(4)}, ${variant.lon.toFixed(4)}`;
            }
            locationElement.innerHTML = `<img src="Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName || 'Unknown'}`;
        }
        
        // Update badge text
        const badge = itemElement.querySelector('.multi-event-badge');
        if (badge) {
            badge.textContent = `${variantIndex + 1}/${event.variants.length}`;
        }
    }
    
    /**
     * Open event info from list (like clicking a marker) - for GitHub Pages
     */
    openEventFromList(event, index) {
        // Check if event is on current page, if not switch to the correct page
        if (window.globeController && window.globeController.dataModel) {
            const dataModel = window.globeController.dataModel;
            const currentPage = dataModel.getCurrentEventPage();
            const eventsPerPage = dataModel.eventsPerPage || 10;
            const eventPage = Math.floor(index / eventsPerPage) + 1;
            
            if (eventPage !== currentPage) {
                // Switch to the correct page
                dataModel.setCurrentEventPage(eventPage);
                
                // Refresh markers and pagination
                if (window.globeController.globeView) {
                    window.globeController.globeView.refreshEventMarkers();
                }
                if (window.globeController.uiView) {
                    window.globeController.uiView.setupEventPagination(() => {
                        if (window.globeController.globeView) {
                            window.globeController.globeView.refreshEventMarkers();
                        }
                    });
                }
                
                // Re-render events list
                this.renderEvents();
            }
        }
        
        // Close the event manager panel
        const panel = document.getElementById('eventsManagePanel');
        if (panel) {
            panel.classList.remove('open');
        }
        const toggleBtn = document.getElementById('eventsManageToggle');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }
        
        // Find the corresponding marker on the globe
        if (window.globeController && window.globeController.globeView) {
            const markers = window.globeController.sceneModel.getMarkers();
            const eventMarker = markers.find(m => {
                if (m.userData && m.userData.isEventMarker) {
                    const markerEvent = m.userData.event;
                    // Match by index or by lat/lon
                    return (markerEvent === event) || 
                           (Math.abs(markerEvent.lat - event.lat) < 0.0001 && 
                            Math.abs(markerEvent.lon - event.lon) < 0.0001);
                }
                return false;
            });
            
            if (eventMarker && window.globeController.uiView) {
                // Check if this is a multi-event
                const isMultiEvent = event.variants && event.variants.length > 0;
                
                // Get the currently previewed variant index (default to 0)
                let variantIndex = 0;
                if (isMultiEvent) {
                    const itemKey = `event-${index}`;
                    variantIndex = this.eventItemVariantIndices.get(itemKey) || 0;
                }
                
                const displayEvent = isMultiEvent ? event.variants[variantIndex] : event;
                
                // For multi-events, find the marker for the specific variant
                let targetMarker = eventMarker;
                if (isMultiEvent && variantIndex > 0) {
                    // Look for the variant marker
                    const variantMarker = markers.find(m => {
                        if (m.userData && m.userData.isEventMarker && 
                            m.userData.event === event &&
                            m.userData.variantIndex === variantIndex) {
                            return true;
                        }
                        return false;
                    });
                    if (variantMarker) {
                        targetMarker = variantMarker;
                    }
                }
                
                const eventName = displayEvent.name || eventMarker.userData.eventName;
                const eventDescription = displayEvent.description;
                const imagePath = this.getEventImagePath(displayEvent.name, displayEvent.image);
                
                // Zoom to marker and show event slide
                if (window.globeController.interactionController) {
                    window.globeController.interactionController.zoomToMarker(targetMarker);
                }
                
                window.globeController.uiView.showEventSlide(
                    eventName,
                    imagePath,
                    eventDescription,
                    targetMarker,
                    event
                );
                
                // Reset all multi-variant events to first variant after opening (for next time manager opens)
                this.resetAllEventVariants();
            }
        }
    }

    /**
     * Get location name from coordinates - returns "City, Country" format
     * Shows city name immediately, then enhances with country in background
     */
    getLocationName(lat, lon) {
        // Check cache first
        const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
        if (this.locationCache.has(cacheKey)) {
            return this.locationCache.get(cacheKey);
        }

        const tolerance = 0.01; // Small tolerance for coordinate matching

        const allLocations = [
            ...this.cities.map(c => ({ ...c, type: 'city' })),
            ...this.airports.map(a => ({ ...a, type: 'airport' })),
            ...this.seaports.map(s => ({ ...s, type: 'seaport' }))
        ];

        const location = allLocations.find(loc => 
            Math.abs(loc.lat - lat) < tolerance && Math.abs(loc.lon - lon) < tolerance
        );

        if (location) {
            // Check if there's a custom display name
            const displayName = this.displayNames[location.name] || location.name;
            
            // If display name already contains country info (has comma), use it directly
            if (displayName.includes(',')) {
                this.locationCache.set(cacheKey, displayName);
                return displayName;
            }
            
            // Otherwise, return display name immediately and enhance with country in background
            this.enhanceLocationWithCountry(lat, lon, displayName);
            return displayName;
        }

        // If not found, try reverse geocoding in background
        this.enhanceLocationWithCountry(lat, lon, null);
        return null;
    }

    /**
     * Enhance location name with country (non-blocking, updates UI later)
     * Only adds country if the name doesn't already contain country information
     */
    async enhanceLocationWithCountry(lat, lon, cityName) {
        const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
        
        // If cityName already contains a comma, it likely has country info - don't enhance
        if (cityName && cityName.includes(',')) {
            this.locationCache.set(cacheKey, cityName);
            return;
        }
        
        try {
            const countryInfo = await this.reverseGeocode(lat, lon);
            if (countryInfo && countryInfo.country) {
                // Check if the country is already in the name (avoid duplicates like "Mexico, Mexico")
                if (cityName && cityName.toLowerCase().includes(countryInfo.country.toLowerCase())) {
                    // Country already in name, don't add it again
                    this.locationCache.set(cacheKey, cityName);
                    return;
                }
                
                const enhancedName = cityName 
                    ? `${cityName}, ${countryInfo.country}`
                    : (countryInfo.city ? `${countryInfo.city}, ${countryInfo.country}` : null);
                
                if (enhancedName) {
                    this.locationCache.set(cacheKey, enhancedName);
                    // Update the display in the UI
                    this.updateLocationDisplay(lat, lon, enhancedName);
                    
                    // Also update location in event slide if it's open
                    if (window.updateEventSlideLocation) {
                        window.updateEventSlideLocation(lat, lon, enhancedName);
                    }
                }
            }
        } catch (error) {
            // Silently fail - we already have the city name
        }
    }

    /**
     * Update location display in the UI (non-blocking)
     */
    updateLocationDisplay(lat, lon, locationName) {
        // Find and update the location element if it exists
        const eventItems = document.querySelectorAll('.event-item');
        eventItems.forEach(item => {
            const locationEl = item.querySelector('.event-item-location');
            if (locationEl) {
                // Check if coordinates match (within tolerance)
                const itemIndex = parseInt(item.dataset.index);
                if (itemIndex !== undefined && this.events[itemIndex]) {
                    const event = this.events[itemIndex];
                    const tolerance = 0.01;
                    if (Math.abs(event.lat - lat) < tolerance && Math.abs(event.lon - lon) < tolerance) {
                        locationEl.innerHTML = `<img src="Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                    }
                }
            }
        });
    }

    /**
     * Reverse geocode coordinates to get city and country
     */
    async reverseGeocode(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Timeline Overwatch Event Manager'
                }
            });

            if (!response.ok) {
                // Don't log HTTP errors - they're common with rate limiting
                return null;
            }

            const data = await response.json();
            
            if (data && data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.municipality || '';
                const country = data.address.country || '';
                return {
                    city: city,
                    country: country,
                    display_name: data.display_name || ''
                };
            }
            
            return null;
        } catch (error) {
            // Silently fail - don't spam console with network errors
            // Only log if it's not a network/fetch error
            if (error.name !== 'TypeError' && !error.message.includes('fetch')) {
                console.error('Reverse geocoding error:', error);
            }
            return null;
        }
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        // Disable drag and drop on GitHub Pages
        if (this.isGitHubPages()) {
            return;
        }
        const items = document.querySelectorAll('.event-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedElement = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.event-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
                this.draggedElement = null;
                this.dragOverIndex = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = this.getDragAfterElement(e.currentTarget, e.clientY);
                const index = parseInt(item.dataset.index);
                
                if (afterElement == null) {
                    item.classList.add('drag-over');
                } else {
                    item.classList.remove('drag-over');
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.draggedElement && this.draggedElement !== item) {
                    const fromIndex = parseInt(this.draggedElement.dataset.index);
                    const toIndex = parseInt(item.dataset.index);
                    this.reorderEvents(fromIndex, toIndex);
                }
            });
        });
    }

    /**
     * Get element after which to insert dragged element
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.parentElement.querySelectorAll('.event-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Reorder events
     */
    reorderEvents(fromIndex, toIndex) {
        const [moved] = this.events.splice(fromIndex, 1);
        this.events.splice(toIndex, 0, moved);
        
        // Update unsaved indices after reordering
        const wasUnsaved = this.unsavedEventIndices.has(fromIndex);
        this.unsavedEventIndices.delete(fromIndex);
        
        // Rebuild unsaved indices with new positions
        const newUnsaved = new Set();
        this.unsavedEventIndices.forEach(oldIndex => {
            if (oldIndex === fromIndex) {
                // The moved item - goes to toIndex
                newUnsaved.add(toIndex);
            } else if (oldIndex < fromIndex && oldIndex < toIndex) {
                // Before both - no change
                newUnsaved.add(oldIndex);
            } else if (oldIndex > fromIndex && oldIndex > toIndex) {
                // After both - shift left
                newUnsaved.add(oldIndex - 1);
            } else if (oldIndex < fromIndex && oldIndex >= toIndex) {
                // Between toIndex and fromIndex - shift right
                newUnsaved.add(oldIndex + 1);
            } else if (oldIndex > fromIndex && oldIndex <= toIndex) {
                // Between fromIndex and toIndex - shift left
                newUnsaved.add(oldIndex - 1);
            }
        });
        if (wasUnsaved) {
            newUnsaved.add(toIndex);
        }
        this.unsavedEventIndices = newUnsaved;
        
        this.renderEvents();
        // Mark all events as unsaved after reordering (user needs to save)
        this.events.forEach((_, idx) => this.unsavedEventIndices.add(idx));
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
        
        if (confirm(`Are you sure you want to delete "${this.events[index].name}"?`)) {
            this.events.splice(index, 1);
            
            // Update indices for events after the deleted one
            const newUnsaved = new Set();
            this.unsavedEventIndices.forEach(oldIndex => {
                if (oldIndex < index) {
                    newUnsaved.add(oldIndex);
                } else if (oldIndex > index) {
                    newUnsaved.add(oldIndex - 1);
                }
            });
            this.unsavedEventIndices = newUnsaved;
            
            // Mark all remaining events as unsaved after deletion
            this.events.forEach((_, idx) => this.unsavedEventIndices.add(idx));
            
            this.renderEvents();
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
        
        const modal = document.getElementById('eventEditModal');
        const modalTitle = document.getElementById('eventEditModalTitle');
        
        if (!modal) return;

        this.editingIndex = index;
        
        if (index === null) {
            // New event
            modalTitle.textContent = 'Add New Event';
            this.clearEditForm();
        } else {
            // Edit existing event
            modalTitle.textContent = 'Edit Event';
            this.populateEditForm(this.events[index]);
        }

        modal.classList.add('open');
        
        // Keep event manager panel open when opening edit modal
        // Don't close the events panel
        
        // Setup autocomplete after modal is open (for both heroes and factions)
        setTimeout(() => {
            const filtersInput = document.getElementById('eventEditFilters');
            const factionsInput = document.getElementById('eventEditFactions');
            
            if (filtersInput && this.heroes.length > 0) {
                this.setupAutocomplete(filtersInput, this.heroes, 'heroes');
            }
            
            if (factionsInput && this.factions.length > 0) {
                // Create array of display names for autocomplete
                const factionDisplayNames = this.factions.map(f => f.displayName);
                this.setupAutocomplete(factionsInput, factionDisplayNames, 'factions');
            }
        }, 100);
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('eventEditModal');
        if (modal) {
            modal.classList.remove('open');
        }
        this.editingIndex = null;
        
        // Reset autocomplete setup flags
        const filtersInput = document.getElementById('eventEditFilters');
        if (filtersInput) {
            filtersInput.dataset.autocompleteSetup = 'false';
        }
    }

    /**
     * Clear edit form
     */
    clearEditForm() {
        document.getElementById('eventEditName').value = '';
        document.getElementById('eventEditCity').value = '';
        document.getElementById('eventEditCityDisplayName').value = '';
        document.getElementById('eventEditLat').value = '';
        document.getElementById('eventEditLon').value = '';
        document.getElementById('eventEditDescription').value = '';
        document.getElementById('eventEditFilters').value = '';
        document.getElementById('eventEditFactions').value = '';
        // Clear all source pairs and reset to one
        this.clearSourcePairs();
        // Initialize with one variant (always show tabs)
        this.variantData = [{
            name: '',
            description: '',
            filters: [],
            factions: [],
            sources: []
        }];
        this.activeVariantIndex = 0;
        this.updateVariantTabs();
    }
    
    /**
     * Handle delete current variant button
     */
    handleDeleteCurrentVariant() {
        if (this.variantData.length === 1) {
            // Only one variant - wipe out all info instead
            document.getElementById('eventEditName').value = '';
            document.getElementById('eventEditDescription').value = '';
            document.getElementById('eventEditFilters').value = '';
            document.getElementById('eventEditFactions').value = '';
            this.clearSourcePairs();
            this.variantData[0] = {
                name: '',
                description: '',
                filters: [],
                factions: [],
                sources: []
            };
        } else {
            // Multiple variants - delete current one
            this.deleteVariant(this.activeVariantIndex);
        }
    }
    
    /**
     * Save current form data to active variant in memory
     */
    saveCurrentVariantToMemory() {
        if (this.variantData.length === 0) return;
        
        const variant = this.variantData[this.activeVariantIndex];
        if (!variant) return;
        
        variant.name = document.getElementById('eventEditName').value.trim();
        variant.description = document.getElementById('eventEditDescription').value.trim();
        const filtersStr = document.getElementById('eventEditFilters').value.trim();
        variant.filters = filtersStr ? filtersStr.split(',').map(f => f.trim()).filter(f => f) : [];
        const factionsStr = document.getElementById('eventEditFactions').value.trim();
        const factionDisplayNames = factionsStr ? factionsStr.split(',').map(f => f.trim()).filter(f => f) : [];
        variant.factions = factionDisplayNames.map(displayName => {
            const found = this.factions.find(f => f.displayName.toLowerCase() === displayName.toLowerCase());
            return found ? found.filename : displayName;
        });
        
        // Save location (lat/lon) for this variant
        const latInput = document.getElementById('eventEditLat');
        const lonInput = document.getElementById('eventEditLon');
        if (latInput && latInput.value.trim()) {
            const lat = parseFloat(latInput.value.trim());
            variant.lat = isNaN(lat) ? undefined : lat;
        } else {
            variant.lat = undefined;
        }
        if (lonInput && lonInput.value.trim()) {
            const lon = parseFloat(lonInput.value.trim());
            variant.lon = isNaN(lon) ? undefined : lon;
        } else {
            variant.lon = undefined;
        }
        
        // Save city display name for this variant
        const cityDisplayNameInput = document.getElementById('eventEditCityDisplayName');
        if (cityDisplayNameInput) {
            const cityDisplayName = cityDisplayNameInput.value.trim();
            variant.cityDisplayName = cityDisplayName || undefined;
        }
        
        // Save sources from all source pairs
        variant.sources = [];
        const sourcePairs = document.querySelectorAll('.source-pair');
        sourcePairs.forEach((pair) => {
            const nameInput = pair.querySelector('.source-name-input');
            const linkInput = pair.querySelector('.source-link-input');
            const name = nameInput ? nameInput.value.trim() : '';
            const link = linkInput ? linkInput.value.trim() : '';
            if (name) {
                variant.sources.push({
                    text: name,
                    url: link || undefined
                });
            }
        });
    }
    
    /**
     * Add a new source pair
     */
    addSourcePair() {
        const container = document.getElementById('eventSourcesContainer');
        if (!container) return;
        
        const currentPairs = container.querySelectorAll('.source-pair');
        const newIndex = currentPairs.length;
        
        const pairDiv = document.createElement('div');
        pairDiv.className = 'source-pair';
        pairDiv.dataset.sourceIndex = newIndex;
        
        pairDiv.innerHTML = `
            <div class="event-edit-field">
                <label for="eventEditSourceName${newIndex}">Source Name:</label>
                <input type="text" id="eventEditSourceName${newIndex}" class="event-edit-input source-name-input" autocomplete="off">
            </div>
            <div class="event-edit-field">
                <label for="eventEditSourceLink${newIndex}">Source Link (optional):</label>
                <input type="url" id="eventEditSourceLink${newIndex}" class="event-edit-input source-link-input" autocomplete="off">
            </div>
        `;
        
        container.appendChild(pairDiv);
        this.updateRemoveSourceButton();
    }
    
    /**
     * Remove the last source pair (but keep at least one)
     */
    removeLastSourcePair() {
        const container = document.getElementById('eventSourcesContainer');
        if (!container) return;
        
        const pairs = container.querySelectorAll('.source-pair');
        if (pairs.length <= 1) {
            alert('At least one source field is required');
            return;
        }
        
        pairs[pairs.length - 1].remove();
        this.updateRemoveSourceButton();
    }
    
    /**
     * Clear all source pairs and reset to one empty pair
     */
    clearSourcePairs() {
        const container = document.getElementById('eventSourcesContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="source-pair" data-source-index="0">
                <div class="event-edit-field">
                    <label for="eventEditSourceName0">Source Name:</label>
                    <input type="text" id="eventEditSourceName0" class="event-edit-input source-name-input" autocomplete="off">
                </div>
                <div class="event-edit-field">
                    <label for="eventEditSourceLink0">Source Link (optional):</label>
                    <input type="url" id="eventEditSourceLink0" class="event-edit-input source-link-input" autocomplete="off">
                </div>
            </div>
        `;
        this.updateRemoveSourceButton();
    }
    
    /**
     * Update the visibility of the remove source button
     */
    updateRemoveSourceButton() {
        const removeBtn = document.getElementById('removeSourcePairBtn');
        const container = document.getElementById('eventSourcesContainer');
        if (removeBtn && container) {
            const pairs = container.querySelectorAll('.source-pair');
            removeBtn.style.display = pairs.length > 1 ? 'inline-block' : 'none';
        }
    }
    
    /**
     * Load variant data into form
     */
    loadVariantToForm(variantIndex) {
        if (variantIndex < 0 || variantIndex >= this.variantData.length) return;
        
        // Only save current variant if we're switching (not initial load)
        if (this.variantData.length > 0 && this.activeVariantIndex >= 0 && this.activeVariantIndex < this.variantData.length) {
            this.saveCurrentVariantToMemory(); // Save current before switching
        }
        
        this.activeVariantIndex = variantIndex;
        const variant = this.variantData[variantIndex];
        
        document.getElementById('eventEditName').value = variant.name || '';
        document.getElementById('eventEditDescription').value = variant.description || '';
        document.getElementById('eventEditFilters').value = (variant.filters || []).join(', ');
        const displayFactions = (variant.factions || []).map(f => {
            const faction = this.factions.find(fac => fac.filename === f);
            return faction ? faction.displayName : f.replace(/^\d+/, '').trim();
        }).join(', ');
        document.getElementById('eventEditFactions').value = displayFactions;
        
        // Load variant-specific location if it exists
        if (variant.lat !== undefined) {
            document.getElementById('eventEditLat').value = variant.lat;
        }
        if (variant.lon !== undefined) {
            document.getElementById('eventEditLon').value = variant.lon;
        }
        
        // Load variant-specific city display name if it exists
        if (variant.cityDisplayName !== undefined && variant.cityDisplayName !== null && variant.cityDisplayName !== '') {
            document.getElementById('eventEditCityDisplayName').value = variant.cityDisplayName;
        } else {
            // If variant doesn't have cityDisplayName, try to use main event's cityDisplayName (for multi-events)
            // or keep existing value (for single events)
            if (this.editingIndex !== null && this.editingIndex !== undefined) {
                const mainEvent = this.events[this.editingIndex];
                if (mainEvent && mainEvent.cityDisplayName) {
                    document.getElementById('eventEditCityDisplayName').value = mainEvent.cityDisplayName;
                } else {
            document.getElementById('eventEditCityDisplayName').value = '';
                }
            } else {
                // New event or no event context, clear it
                document.getElementById('eventEditCityDisplayName').value = '';
            }
        }
        
        // Load sources into source pairs
        const sources = variant.sources || [];
        this.clearSourcePairs();
        if (sources.length > 0) {
            sources.forEach((source, index) => {
                if (index > 0) {
                    this.addSourcePair();
                }
                const pair = document.querySelectorAll('.source-pair')[index];
                if (pair) {
                    const nameInput = pair.querySelector('.source-name-input');
                    const linkInput = pair.querySelector('.source-link-input');
                    if (nameInput) nameInput.value = source.text || '';
                    if (linkInput) linkInput.value = source.url || '';
                }
            });
        }
        this.updateRemoveSourceButton();
    }
    
    /**
     * Update variant tabs UI
     */
    updateVariantTabs() {
        const tabsContainer = document.getElementById('eventVariantTabs');
        const deleteVariantBtn = document.getElementById('eventEditDeleteVariant');
        
        if (!tabsContainer) return;
        
        // Always show tabs (no checkbox needed)
        if (this.variantData.length === 0) {
            tabsContainer.style.display = 'none';
            if (deleteVariantBtn) deleteVariantBtn.style.display = 'none';
            return;
        }
        
        tabsContainer.style.display = 'flex';
        tabsContainer.innerHTML = '';
        
        // Create tab for each variant
        this.variantData.forEach((variant, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.type = 'button';
            tabBtn.className = 'variant-tab-btn';
            tabBtn.textContent = (index + 1).toString();
            tabBtn.dataset.variantIndex = index;
            if (index === this.activeVariantIndex) {
                tabBtn.classList.add('active');
            }
            tabBtn.addEventListener('click', () => {
                this.loadVariantToForm(index);
                this.updateVariantTabs();
            });
            
            tabsContainer.appendChild(tabBtn);
        });
        
        // Add plus button to add new variant
        const addTabBtn = document.createElement('button');
        addTabBtn.type = 'button';
        addTabBtn.className = 'variant-tab-btn add-variant-tab-btn';
        addTabBtn.textContent = '+';
        addTabBtn.addEventListener('click', () => {
            this.saveCurrentVariantToMemory();
            // Get current lat/lon to use as default for new variant
            const currentLat = document.getElementById('eventEditLat').value.trim();
            const currentLon = document.getElementById('eventEditLon').value.trim();
            this.variantData.push({
                name: '',
                description: '',
                filters: [],
                factions: [],
                sources: [],
                lat: currentLat ? parseFloat(currentLat) : undefined,
                lon: currentLon ? parseFloat(currentLon) : undefined
            });
            this.loadVariantToForm(this.variantData.length - 1);
            this.updateVariantTabs();
        });
        tabsContainer.appendChild(addTabBtn);
        
        // Add delete button (red with "-") next to the add button
        if (this.variantData.length > 1) {
            const deleteTabBtn = document.createElement('button');
            deleteTabBtn.type = 'button';
            deleteTabBtn.className = 'variant-tab-btn delete-variant-tab-btn';
            deleteTabBtn.textContent = '-';
            deleteTabBtn.addEventListener('click', () => {
                this.deleteVariant(this.activeVariantIndex);
            });
            tabsContainer.appendChild(deleteTabBtn);
        }
    }
    
    /**
     * Delete a variant
     */
    deleteVariant(variantIndex) {
        if (this.variantData.length <= 1) {
            // Can't delete the last variant - just clear it
            this.handleDeleteCurrentVariant();
            return;
        }
        
        if (variantIndex < 0 || variantIndex >= this.variantData.length) return;
        
        // Remove the variant
        this.variantData.splice(variantIndex, 1);
        
        // Adjust active index if needed
        if (this.activeVariantIndex >= this.variantData.length) {
            this.activeVariantIndex = this.variantData.length - 1;
        } else if (this.activeVariantIndex > variantIndex) {
            this.activeVariantIndex--;
        }
        
        // Reload the form with the new active variant
        this.loadVariantToForm(this.activeVariantIndex);
        this.updateVariantTabs();
    }

    /**
     * Populate edit form with event data
     */
    populateEditForm(event) {
        // Clear any existing variant data first
        this.variantData = [];
        this.activeVariantIndex = 0;
        
        const isMultiEvent = event.variants && event.variants.length > 0;
        
        // Set coordinates - for multi-events, use first variant's location or event location
        // For single events, use event location
        if (isMultiEvent && event.variants[0] && (event.variants[0].lat !== undefined || event.variants[0].lon !== undefined)) {
            document.getElementById('eventEditLat').value = event.variants[0].lat !== undefined ? event.variants[0].lat : event.lat || '';
            document.getElementById('eventEditLon').value = event.variants[0].lon !== undefined ? event.variants[0].lon : event.lon || '';
            // For multi-events, use first variant's cityDisplayName or main event's cityDisplayName
            document.getElementById('eventEditCityDisplayName').value = event.variants[0].cityDisplayName || event.cityDisplayName || '';
        } else {
            document.getElementById('eventEditLat').value = event.lat || '';
            document.getElementById('eventEditLon').value = event.lon || '';
            document.getElementById('eventEditCityDisplayName').value = event.cityDisplayName || '';
        }
        document.getElementById('eventEditCity').value = '';
        
        if (isMultiEvent) {
            // Load all variants into variantData, including lat/lon and cityDisplayName if they exist
            this.variantData = event.variants.map(variant => ({
                name: variant.name || '',
                description: variant.description || '',
                filters: variant.filters || [],
                factions: variant.factions || [],
                sources: variant.sources || [],
                lat: variant.lat !== undefined ? variant.lat : (event.lat !== undefined ? event.lat : undefined),
                lon: variant.lon !== undefined ? variant.lon : (event.lon !== undefined ? event.lon : undefined),
                cityDisplayName: variant.cityDisplayName || undefined
            }));
            this.activeVariantIndex = 0;
        } else {
            // Single event - convert to variantData with one variant
            this.variantData = [{
                name: event.name || '',
                description: event.description || '',
                filters: event.filters || [],
                factions: event.factions || [],
                sources: event.sources || [],
                lat: event.lat !== undefined ? event.lat : undefined,
                lon: event.lon !== undefined ? event.lon : undefined,
                cityDisplayName: event.cityDisplayName || undefined
            }];
            this.activeVariantIndex = 0;
        }
        
        // Now load the first variant into the form (no need to save since variantData was just cleared)
        if (this.variantData.length > 0) {
            const variant = this.variantData[0];
            document.getElementById('eventEditName').value = variant.name || '';
            document.getElementById('eventEditDescription').value = variant.description || '';
            document.getElementById('eventEditFilters').value = (variant.filters || []).join(', ');
            const displayFactions = (variant.factions || []).map(f => {
                const faction = this.factions.find(fac => fac.filename === f);
                return faction ? faction.displayName : f.replace(/^\d+/, '').trim();
            }).join(', ');
            document.getElementById('eventEditFactions').value = displayFactions;
            
            // Load variant-specific location if it exists
            if (variant.lat !== undefined) {
                document.getElementById('eventEditLat').value = variant.lat;
            }
            if (variant.lon !== undefined) {
                document.getElementById('eventEditLon').value = variant.lon;
            }
            
            // Load variant-specific city display name if it exists
            // Note: cityDisplayName was already set above (line 1805 or 1809), so only override if variant has its own
            if (variant.cityDisplayName !== undefined && variant.cityDisplayName !== null && variant.cityDisplayName !== '') {
                document.getElementById('eventEditCityDisplayName').value = variant.cityDisplayName;
            }
            // Otherwise, keep the value we already set above (from event or first variant)
            
            // Load sources into source pairs
            const sources = variant.sources || [];
            this.clearSourcePairs();
            if (sources.length > 0) {
                sources.forEach((source, index) => {
                    if (index > 0) {
                        this.addSourcePair();
                    }
                    const pair = document.querySelectorAll('.source-pair')[index];
                    if (pair) {
                        const nameInput = pair.querySelector('.source-name-input');
                        const linkInput = pair.querySelector('.source-link-input');
                        if (nameInput) nameInput.value = source.text || '';
                        if (linkInput) linkInput.value = source.url || '';
                    }
                });
            }
            this.updateRemoveSourceButton();
        }
        
        this.updateVariantTabs();
    }

    /**
     * Add a variant item to the variants list
     */
    addVariantItem(variantData = null, variantIndex = null) {
        const variantsList = document.getElementById('eventVariantsList');
        if (!variantsList) return;

        const variantId = variantIndex !== null ? variantIndex : variantsList.children.length + 1;
        const variant = variantData || {
            name: '',
            description: '',
            filters: [],
            factions: [],
            image: ''
        };

        const variantDiv = document.createElement('div');
        variantDiv.className = 'event-variant-item';
        variantDiv.dataset.variantIndex = variantId;
        
        const displayFactions = (variant.factions || []).map(f => {
            const faction = this.factions.find(fac => fac.filename === f);
            return faction ? faction.displayName : f.replace(/^\d+/, '').trim();
        }).join(', ');

        variantDiv.innerHTML = `
            <div class="event-variant-container">
                <div class="event-variant-header">
                    <strong>Variant ${variantId}</strong>
                    <button type="button" class="remove-variant-btn event-edit-btn" style="background: #f44336; padding: 6px 12px; font-size: 12px;">Remove</button>
                </div>
                <div class="event-edit-field">
                    <label>Title:</label>
                    <input type="text" class="variant-name-input event-edit-input" value="${variant.name || ''}" placeholder="Variant title" autocomplete="off">
                </div>
                <div class="event-edit-field event-edit-field-full">
                    <label>Description:</label>
                    <textarea class="variant-description-input event-edit-textarea" rows="4" placeholder="Variant description" autocomplete="off">${variant.description || ''}</textarea>
                </div>
                <div class="event-edit-field">
                    <label>Hero Filters (comma-separated):</label>
                    <input type="text" class="variant-filters-input event-edit-input" value="${(variant.filters || []).join(', ')}" placeholder="Hero filters" autocomplete="off">
                </div>
                <div class="event-edit-field">
                    <label>Faction Filters (comma-separated):</label>
                    <input type="text" class="variant-factions-input event-edit-input" value="${displayFactions}" placeholder="Faction filters" autocomplete="off">
                </div>
                <div class="event-edit-field event-edit-field-full">
                    <label>Sources:</label>
                    <div class="variant-sources-list" data-variant-index="${variantId}"></div>
                    <button type="button" class="add-variant-source-btn event-edit-btn" style="margin-top: 10px; padding: 6px 12px; font-size: 12px;" data-variant-index="${variantId}">+ Add Source</button>
                </div>
            </div>
        `;

        variantsList.appendChild(variantDiv);

        // Add remove button handler
        const removeBtn = variantDiv.querySelector('.remove-variant-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                variantDiv.remove();
            });
        }
        
        // Populate variant sources if they exist
        if (variant.sources && variant.sources.length > 0) {
            const variantSourcesList = variantDiv.querySelector('.variant-sources-list');
            variant.sources.forEach((source, index) => {
                this.addVariantSourceItem(variantId, source, index);
            });
        }
        
        // Add source button handler for this variant
        const addSourceBtn = variantDiv.querySelector('.add-variant-source-btn');
        if (addSourceBtn) {
            addSourceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const btnVariantId = parseInt(addSourceBtn.getAttribute('data-variant-index'));
                this.addVariantSourceItem(btnVariantId);
            });
        }
    }
    
    /**
     * Add a source item to a variant's sources list
     */
    addVariantSourceItem(variantIndex, sourceData = null, sourceIndex = null) {
        const variantDiv = document.querySelector(`.event-variant-item[data-variant-index="${variantIndex}"]`);
        if (!variantDiv) {
            console.error(`Variant div not found for index ${variantIndex}`);
            return;
        }
        
        const sourcesList = variantDiv.querySelector('.variant-sources-list');
        if (!sourcesList) {
            console.error(`Sources list not found in variant ${variantIndex}`);
            return;
        }

        const sourceId = sourceIndex !== null ? sourceIndex : sourcesList.children.length;
        const source = sourceData || {
            text: '',
            url: ''
        };

        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'event-source-item';
        sourceDiv.dataset.sourceIndex = sourceId;
        
        const textInputId = `variant-source-text-${variantIndex}-${sourceId}`;
        const urlInputId = `variant-source-url-${variantIndex}-${sourceId}`;
        
        sourceDiv.innerHTML = `
            <div class="event-source-container">
                <div class="event-source-header">
                    <strong>Source ${sourceId + 1}</strong>
                    <button type="button" class="remove-source-btn event-edit-btn" style="background: #f44336; padding: 6px 12px; font-size: 12px;">Remove</button>
                </div>
                <div class="event-edit-field event-edit-field-full">
                    <label for="${textInputId}">Text:</label>
                    <input type="text" id="${textInputId}" name="${textInputId}" class="source-text-input event-edit-input" value="${source.text || ''}" placeholder="Source text" autocomplete="off">
                </div>
                <div class="event-edit-field event-edit-field-full">
                    <label for="${urlInputId}">URL (optional):</label>
                    <input type="url" id="${urlInputId}" name="${urlInputId}" class="source-url-input event-edit-input" value="${source.url || ''}" autocomplete="off">
                </div>
            </div>
        `;

        sourcesList.appendChild(sourceDiv);

        // Add remove button handler
        const removeBtn = sourceDiv.querySelector('.remove-source-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                sourceDiv.remove();
            });
        }
    }
    
    /**
     * Add a source item to the main event's sources list
     */
    addSourceItem(sourceData = null, sourceIndex = null) {
        const sourcesList = document.getElementById('eventSourcesList');
        if (!sourcesList) {
            console.error('eventSourcesList not found');
            return;
        }

        const sourceId = sourceIndex !== null ? sourceIndex : sourcesList.children.length;
        const source = sourceData || {
            text: '',
            url: ''
        };

        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'event-source-item';
        sourceDiv.dataset.sourceIndex = sourceId;
        
        const textInputId = `source-text-${sourceId}`;
        const urlInputId = `source-url-${sourceId}`;
        
        sourceDiv.innerHTML = `
            <div class="event-source-container">
                <div class="event-source-header">
                    <strong>Source ${sourceId + 1}</strong>
                    <button type="button" class="remove-source-btn event-edit-btn" style="background: #f44336; padding: 6px 12px; font-size: 12px;">Remove</button>
                </div>
                <div class="event-edit-field event-edit-field-full">
                    <label for="${textInputId}">Text:</label>
                    <input type="text" id="${textInputId}" name="${textInputId}" class="source-text-input event-edit-input" value="${source.text || ''}" placeholder="Source text" autocomplete="off">
                </div>
                <div class="event-edit-field event-edit-field-full">
                    <label for="${urlInputId}">URL (optional):</label>
                    <input type="url" id="${urlInputId}" name="${urlInputId}" class="source-url-input event-edit-input" value="${source.url || ''}" autocomplete="off">
                </div>
            </div>
        `;

        sourcesList.appendChild(sourceDiv);

        // Add remove button handler - but don't allow removing if it's the only source
        const removeBtn = sourceDiv.querySelector('.remove-source-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const sourcesList = document.getElementById('eventSourcesList');
                // Don't allow removing the last source
                if (sourcesList && sourcesList.children.length <= 1) {
                    alert('At least one source field is required');
                    return;
                }
                sourceDiv.remove();
                // Renumber remaining sources
                this.renumberSources();
            });
        }
    }
    
    /**
     * Renumber source items after deletion
     */
    renumberSources() {
        const sourcesList = document.getElementById('eventSourcesList');
        if (!sourcesList) return;
        
        const sourceItems = sourcesList.querySelectorAll('.event-source-item');
        sourceItems.forEach((item, index) => {
            const header = item.querySelector('.event-source-header strong');
            if (header) {
                header.textContent = `Source ${index + 1}`;
            }
            item.dataset.sourceIndex = index;
        });
    }

    /**
     * Lookup city coordinates - checks if user wants code lookup or API search
     */
    async lookupCity() {
        const cityInput = document.getElementById('eventEditCity');
        const latInput = document.getElementById('eventEditLat');
        const lonInput = document.getElementById('eventEditLon');
        const lookupBtn = document.getElementById('lookupCityBtn');
        const useCodeLookup = document.getElementById('useCodeLookup');
        
        if (!cityInput || !latInput || !lonInput) return;

        const cityName = cityInput.value.trim();
        if (!cityName) {
            alert('Please enter a city name');
            return;
        }

        // Disable button and show loading state
        if (lookupBtn) {
            lookupBtn.disabled = true;
            lookupBtn.textContent = '🔍 Looking up...';
        }

        // Check if user wants code lookup or API search
        const useCode = useCodeLookup ? useCodeLookup.checked : true;

        const cityDisplayNameInput = document.getElementById('eventEditCityDisplayName');
        
        if (useCode) {
            // Use local data lookup only
            const localCoords = this.findCityCoordinates(cityName);
            if (localCoords) {
                latInput.value = localCoords.lat;
                lonInput.value = localCoords.lon;
                // Auto-fill city display name with the found name
                if (cityDisplayNameInput) {
                    cityDisplayNameInput.value = localCoords.name;
                }
                if (lookupBtn) {
                    lookupBtn.disabled = false;
                    lookupBtn.textContent = '🔍 Lookup';
                }
                alert(`Found ${localCoords.name} in local data: ${localCoords.lat}, ${localCoords.lon}`);
            } else {
                if (lookupBtn) {
                    lookupBtn.disabled = false;
                    lookupBtn.textContent = '🔍 Lookup';
                }
                alert(`City "${cityName}" not found in local data. Uncheck "Use Code Lookup" to search online.`);
            }
        } else {
            // Use geocoding API
            try {
                const coords = await this.geocodeCity(cityName);
                if (coords) {
                    latInput.value = coords.lat;
                    lonInput.value = coords.lon;
                    // Auto-fill city display name with the found name
                    if (cityDisplayNameInput) {
                        cityDisplayNameInput.value = coords.name;
                    }
                    alert(`Found ${coords.name}: ${coords.lat}, ${coords.lon}`);
                } else {
                    alert(`City "${cityName}" not found. Please enter coordinates manually.`);
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                alert(`Error looking up city "${cityName}". Please enter coordinates manually.`);
            } finally {
                if (lookupBtn) {
                    lookupBtn.disabled = false;
                    lookupBtn.textContent = '🔍 Lookup';
                }
            }
        }
    }

    /**
     * Geocode a city name using OpenStreetMap Nominatim API
     * @param {string} cityName - Name of the city to geocode
     * @returns {Promise<{lat: number, lon: number, name: string}|null>}
     */
    async geocodeCity(cityName) {
        try {
            // Use OpenStreetMap Nominatim API (free, no API key required)
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Timeline Overwatch Event Manager' // Required by Nominatim
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.length > 0) {
                const result = data[0];
                return {
                    lat: parseFloat(result.lat),
                    lon: parseFloat(result.lon),
                    name: result.display_name || cityName
                };
            }
            
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }

    /**
     * Get event image path (auto-detect from Event Images folder or use provided path)
     */
    getEventImagePath(eventName, providedPath) {
        // Helper function to encode image paths properly (avoid double-encoding)
        const encodeImagePath = (path) => {
            if (!path) return path;
            
            // Helper to decode multiple times until fully decoded
            const fullyDecode = (str) => {
                let previous = '';
                let current = str;
                while (current !== previous) {
                    previous = current;
                    try {
                        const decoded = decodeURIComponent(current);
                        if (decoded !== current) {
                            current = decoded;
                        } else {
                            break;
                        }
                    } catch (e) {
                        break; // Can't decode further
                    }
                }
                return current;
            };
            
            // If path already contains Event Images/, encode just the filename
            const folderPattern = /Event(?:%20| )Images\//;
            if (folderPattern.test(path)) {
                const parts = path.split(/Event(?:%20| )Images\//);
                if (parts.length === 2) {
                    let filename = fullyDecode(parts[1]);
                    return `Event%20Images/${encodeURIComponent(filename)}`;
                }
            }
            // If it's a full path, try to encode just the filename part
            const lastSlash = path.lastIndexOf('/');
            if (lastSlash !== -1) {
                const folder = path.substring(0, lastSlash + 1);
                let filename = fullyDecode(path.substring(lastSlash + 1));
                return folder + encodeURIComponent(filename);
            }
            // If no slash, decode first then encode
            const decoded = fullyDecode(path);
            return encodeURIComponent(decoded);
        };
        
        // If a path is provided, encode it properly
        if (providedPath && providedPath.trim()) {
            return encodeImagePath(providedPath.trim());
        }
        
        // Otherwise, try to find image in Event Images folder
        // Use the exact event name (preserve all characters including glitchy text)
        // Only normalize multiple spaces to single space
        const normalizedName = eventName.replace(/\s+/g, ' ').trim();
        
        // Encode the filename to handle spaces and special characters in URLs
        // Split the path so we only encode the filename, not the folder name
        const encodedFileName = encodeURIComponent(normalizedName);
        const imagePath = `Event%20Images/${encodedFileName}.png`;
        
        // Return the path (browser will handle 404 if image doesn't exist)
        // No console log to reduce noise - 404s are expected for missing images
        return imagePath;
    }

    /**
     * Setup autocomplete for filter inputs
     */
    setupAutocomplete(input, options, type) {
        // Remove existing autocomplete if already set up
        if (input.dataset.autocompleteSetup === 'true') {
            return; // Already set up
        }
        input.dataset.autocompleteSetup = 'true';
        
        let autocompleteList = null;
        
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const lastComma = value.lastIndexOf(',');
            const currentInput = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();
            
            // Remove existing autocomplete list
            if (autocompleteList) {
                autocompleteList.remove();
                autocompleteList = null;
            }
            
            if (currentInput.length === 0) {
                return;
            }
            
            // Filter matching options
            const matches = options.filter(opt => 
                opt.toLowerCase().includes(currentInput.toLowerCase()) &&
                !value.toLowerCase().includes(opt.toLowerCase())
            ).slice(0, 5); // Limit to 5 suggestions
            
            if (matches.length === 0) {
                return;
            }
            
            // Create autocomplete list
            autocompleteList = document.createElement('div');
            autocompleteList.className = 'filter-autocomplete-list';
            autocompleteList.style.cssText = `
                position: absolute;
                background: #2a2a2a;
                border: 1px solid rgba(255, 102, 0, 0.5);
                border-radius: 4px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                margin-top: 2px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            `;
            
            matches.forEach(match => {
                const item = document.createElement('div');
                item.className = 'filter-autocomplete-item';
                item.textContent = match;
                item.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    color: white;
                    font-size: 14px;
                    transition: background 0.2s;
                `;
                
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255, 102, 0, 0.3)';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                });
                
                item.addEventListener('click', () => {
                    const beforeComma = lastComma >= 0 ? value.substring(0, lastComma + 1) + ' ' : '';
                    input.value = beforeComma + match + ', ';
                    input.focus();
                    autocompleteList.remove();
                    autocompleteList = null;
                });
                
                autocompleteList.appendChild(item);
            });
            
            // Position autocomplete list
            const rect = input.getBoundingClientRect();
            autocompleteList.style.left = rect.left + 'px';
            autocompleteList.style.top = (rect.bottom + window.scrollY) + 'px';
            autocompleteList.style.width = rect.width + 'px';
            
            document.body.appendChild(autocompleteList);
        });
        
        // Remove autocomplete on blur (with small delay to allow clicks)
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (autocompleteList) {
                    autocompleteList.remove();
                    autocompleteList = null;
                }
            }, 200);
        });
    }

    /**
     * Save event from modal
     */
    saveEventFromModal() {
        // Prevent saving on GitHub Pages
        if (this.isGitHubPages()) {
            console.log('Event saving is disabled on GitHub Pages');
            return;
        }
        
        const lat = parseFloat(document.getElementById('eventEditLat').value);
        const lon = parseFloat(document.getElementById('eventEditLon').value);
        // Save current variant before processing
        this.saveCurrentVariantToMemory();
        const isMultiEvent = this.variantData.length > 1;

        if (isNaN(lat) || isNaN(lon)) {
            alert('Please fill in Latitude and Longitude');
            return;
        }

        // Process main event (or first variant if multi-event)
        const mainName = document.getElementById('eventEditName').value.trim();
        const mainDescription = document.getElementById('eventEditDescription').value.trim();
        const mainFiltersStr = document.getElementById('eventEditFilters').value.trim();
        const mainFactionsStr = document.getElementById('eventEditFactions').value.trim();

        if (!mainName) {
            alert('Please fill in the required field (Title)');
            return;
        }

        const processFiltersAndFactions = (filtersStr, factionsStr) => {
            const filters = filtersStr ? filtersStr.split(',').map(f => f.trim()).filter(f => f) : [];
            const factionDisplayNames = factionsStr ? factionsStr.split(',').map(f => f.trim()).filter(f => f) : [];
            const factions = factionDisplayNames.map(displayName => {
                const found = this.factions.find(f => 
                    f.displayName.toLowerCase() === displayName.toLowerCase()
                );
                return found ? found.filename : displayName;
            });
            return { filters, factions };
        };

        const mainData = processFiltersAndFactions(mainFiltersStr, mainFactionsStr);
        
        // Process sources from all source pairs
        const mainSources = [];
        const sourcePairs = document.querySelectorAll('.source-pair');
        sourcePairs.forEach((pair) => {
            const nameInput = pair.querySelector('.source-name-input');
            const linkInput = pair.querySelector('.source-link-input');
            const name = nameInput ? nameInput.value.trim() : '';
            const link = linkInput ? linkInput.value.trim() : '';
            if (name) {
                mainSources.push({
                    text: name,
                    url: link || undefined
                });
            }
        });

        let event;
        
        if (isMultiEvent) {
            // Save current variant before processing
            this.saveCurrentVariantToMemory();
            
            // Collect variants from variantData
            const variants = this.variantData.map(variant => {
                const variantData = processFiltersAndFactions(
                    (variant.filters || []).join(', '),
                    (variant.factions || []).map(f => {
                        const faction = this.factions.find(fac => fac.filename === f);
                        return faction ? faction.displayName : f.replace(/^\d+/, '').trim();
                    }).join(', ')
                );
                
                const variantObj = {
                    name: variant.name || '',
                    description: variant.description || '',
                    filters: variantData.filters,
                    factions: variantData.factions,
                    sources: variant.sources && variant.sources.length > 0 ? variant.sources : undefined,
                    image: '' // Auto-detect
                };
                
                // Include lat/lon if they exist for this variant
                if (variant.lat !== undefined) {
                    variantObj.lat = variant.lat;
                }
                if (variant.lon !== undefined) {
                    variantObj.lon = variant.lon;
                }
                
                // Include cityDisplayName if it exists for this variant
                if (variant.cityDisplayName !== undefined) {
                    variantObj.cityDisplayName = variant.cityDisplayName;
                }
                
                return variantObj;
            }).filter(v => v.name); // Only include variants with name (description is optional)

            if (variants.length < 2) {
                alert('Multi-events must have at least 2 variants');
                return;
            }

            const cityDisplayName = document.getElementById('eventEditCityDisplayName').value.trim();
            // For multi-events, use first variant's location or main lat/lon as fallback
            const firstVariantLat = variants[0] && variants[0].lat !== undefined ? variants[0].lat : lat;
            const firstVariantLon = variants[0] && variants[0].lon !== undefined ? variants[0].lon : lon;
            event = {
                lat: firstVariantLat, // Main event lat (used for backward compatibility)
                lon: firstVariantLon, // Main event lon (used for backward compatibility)
                cityDisplayName: cityDisplayName || undefined,
                variants: variants
            };
        } else {
            // Regular single event
            const cityDisplayName = document.getElementById('eventEditCityDisplayName').value.trim();
            event = {
                name: mainName,
                lat,
                lon,
                cityDisplayName: cityDisplayName || undefined,
                description: mainDescription,
                image: '', // Auto-detect
                filters: mainData.filters,
                factions: mainData.factions,
                sources: mainSources.length > 0 ? mainSources : undefined
            };
        }

        if (this.editingIndex === null) {
            // Add new event
            const newIndex = this.events.length;
            this.events.push(event);
            // Mark as unsaved until user clicks Save button
            this.unsavedEventIndices.add(newIndex);
        } else {
            // Update existing event
            this.events[this.editingIndex] = event;
            // Mark as unsaved until user clicks Save button
            this.unsavedEventIndices.add(this.editingIndex);
        }

        this.renderEvents();
        this.closeEditModal();
    }
}

// Initialize EventManager when DOM is ready
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
}

