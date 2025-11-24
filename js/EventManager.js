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
    }

    /**
     * Initialize the event manager
     */
    async init() {
        await this.loadLocationsData();
        this.setupEventListeners();
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
        // Try to load from localStorage first (user's saved changes)
        const savedEvents = localStorage.getItem('timelineEvents');
        console.log('EventManager: Checking localStorage for events...');
        console.log('EventManager: localStorage.getItem("timelineEvents") =', savedEvents ? 'Found data (' + savedEvents.length + ' chars)' : 'null');
        
        if (savedEvents) {
            try {
                this.events = JSON.parse(savedEvents);
                console.log('EventManager: Successfully parsed', this.events.length, 'events from localStorage');
                console.log('EventManager: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
                
                // Sync with DataModel and refresh markers
                this.syncEventsToGlobe();
                return;
            } catch (error) {
                console.error('EventManager: Error parsing saved events:', error);
                console.error('EventManager: Raw data:', savedEvents.substring(0, 200));
            }
        }

        // If no localStorage, try to load from data/events.json (for GitHub Pages or initial setup)
        try {
            const response = await fetch('data/events.json');
            if (response.ok) {
                const data = await response.json();
                if (data.events && Array.isArray(data.events) && data.events.length > 0) {
                    this.events = data.events;
                    console.log('EventManager: Loaded', this.events.length, 'events from data/events.json');
                    console.log('EventManager: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
                    
                    // Save to localStorage for future use
                    this.saveEvents();
                    
                    // Sync with DataModel and refresh markers
                    this.syncEventsToGlobe();
                    return;
                }
            }
        } catch (error) {
            console.log('EventManager: Could not load from data/events.json (file may not exist):', error.message);
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
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
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
                
                // On GitHub Pages, clicking the button opens the first event (like clicking a marker)
                const isGitHubPages = this.isGitHubPages();
                if (isGitHubPages && this.events.length > 0) {
                    const firstEvent = this.events[0];
                    this.openEventFromList(firstEvent, 0);
                    return; // Don't open the management panel
                }
                
                // Toggle event management panel
                panel.classList.toggle('open');
                if (panel.classList.contains('open')) {
                    toggleBtn.classList.add('active');
                    this.renderEvents();
                } else {
                    toggleBtn.classList.remove('active');
                }
            });
        }

        if (closeBtn && panel) {
            closeBtn.addEventListener('click', () => {
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
        const addSourcePairBtn = document.getElementById('addSourcePairBtn');
        if (addSourcePairBtn) {
            if (isGitHubPages) {
                addSourcePairBtn.style.display = 'none';
                addSourcePairBtn.style.visibility = 'hidden';
                addSourcePairBtn.style.pointerEvents = 'none';
            } else {
                addSourcePairBtn.addEventListener('click', () => {
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

        // Get location name if available (synchronous, fast - will enhance with country in background)
        const locationName = this.getLocationName(event.lat, event.lon);

        // For multi-events, show the first variant; otherwise show the main event
        const displayEvent = isMultiEvent ? event.variants[0] : event;
        const imagePath = this.getEventImagePath(displayEvent.name, displayEvent.image);
        
        // Always use the same container structure to maintain consistent sizing
        // Use a wrapper div to ensure the square space is always shown
        const imageHtml = imagePath
            ? `<div class="event-item-preview-image" style="background: rgba(0,0,0,0.5);"><img src="${imagePath}" alt="${displayEvent.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;\\'>No Image</div>';" onload=""></div>`
            : `<div class="event-item-preview-image" style="display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; background: rgba(0,0,0,0.5);">No Image</div>`;

        // Multi-event indicator badge
        const multiEventBadge = isMultiEvent 
            ? `<div class="multi-event-badge" title="Multi-Event: ${event.variants.length} variants">${event.variants.length}×</div>`
            : '';

        // On GitHub Pages, hide drag handle and action buttons, make entire item clickable
        const dragHandle = isGitHubPages ? '' : '<div class="event-item-drag-handle">☰</div>';
        const actionButtons = isGitHubPages ? '' : `
            <div class="event-item-actions">
                <button class="event-item-btn edit-btn" data-index="${index}">Edit</button>
                <button class="event-item-btn delete-btn" data-index="${index}">Delete</button>
            </div>
        `;

        item.innerHTML = `
            ${dragHandle}
            ${imageHtml}
            ${multiEventBadge}
            <div class="event-item-info">
                <h3 class="event-item-title">${getDisplayEventName(displayEvent.name)}</h3>
                <p class="event-item-location">📍 ${locationName || `${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}`}</p>
            </div>
            ${actionButtons}
        `;

        // On GitHub Pages, make entire item clickable to open event info
        if (isGitHubPages) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEventFromList(event, index);
            });
        } else {
            // Add event listeners for edit/delete buttons
            const editBtn = item.querySelector('.edit-btn');
            const deleteBtn = item.querySelector('.delete-btn');

            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openEditModal(index);
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteEvent(index);
                });
            }
        }

        return item;
    }
    
    /**
     * Open event info from list (like clicking a marker) - for GitHub Pages
     */
    openEventFromList(event, index) {
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
                const displayEvent = isMultiEvent ? event.variants[0] : event;
                
                const eventName = displayEvent.name || eventMarker.userData.eventName;
                const eventDescription = displayEvent.description;
                const imagePath = this.getEventImagePath(displayEvent.name, displayEvent.image);
                
                // Zoom to marker and show event slide
                if (window.globeController.interactionController) {
                    window.globeController.interactionController.zoomToMarker(eventMarker);
                }
                
                window.globeController.uiView.showEventSlide(
                    eventName,
                    imagePath,
                    eventDescription,
                    eventMarker,
                    event
                );
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
                        locationEl.textContent = `📍 ${locationName}`;
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
                throw new Error(`HTTP error! status: ${response.status}`);
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
            console.error('Reverse geocoding error:', error);
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
            this.variantData.push({
                name: '',
                description: '',
                filters: [],
                factions: [],
                sources: []
            });
            this.loadVariantToForm(this.variantData.length - 1);
            this.updateVariantTabs();
        });
        tabsContainer.appendChild(addTabBtn);
        
        // Show/hide delete variant button
        if (deleteVariantBtn) {
            deleteVariantBtn.style.display = 'inline-block';
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
        
        // Set coordinates (same for all variants)
        document.getElementById('eventEditLat').value = event.lat || '';
        document.getElementById('eventEditLon').value = event.lon || '';
        document.getElementById('eventEditCity').value = '';
        
        if (isMultiEvent) {
            // Load all variants into variantData
            this.variantData = event.variants.map(variant => ({
                name: variant.name || '',
                description: variant.description || '',
                filters: variant.filters || [],
                factions: variant.factions || [],
                sources: variant.sources || []
            }));
            this.activeVariantIndex = 0;
        } else {
            // Single event - convert to variantData with one variant
            this.variantData = [{
                name: event.name || '',
                description: event.description || '',
                filters: event.filters || [],
                factions: event.factions || [],
                sources: event.sources || []
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

        if (useCode) {
            // Use local data lookup only
            const localCoords = this.findCityCoordinates(cityName);
            if (localCoords) {
                latInput.value = localCoords.lat;
                lonInput.value = localCoords.lon;
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
            if (path.includes('Event Images/')) {
                const parts = path.split('Event Images/');
                if (parts.length === 2) {
                    let filename = fullyDecode(parts[1]);
                    return `Event Images/${encodeURIComponent(filename)}`;
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
        const imagePath = `Event Images/${encodedFileName}.png`;
        
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

        if (!mainName || !mainDescription) {
            alert('Please fill in all required fields (Title, Description)');
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
                
                return {
                    name: variant.name || '',
                    description: variant.description || '',
                    filters: variantData.filters,
                    factions: variantData.factions,
                    sources: variant.sources && variant.sources.length > 0 ? variant.sources : undefined,
                    image: '' // Auto-detect
                };
            }).filter(v => v.name && v.description); // Only include variants with name and description

            if (variants.length < 2) {
                alert('Multi-events must have at least 2 variants');
                return;
            }

            event = {
                lat,
                lon,
                variants: variants
            };
        } else {
            // Regular single event
            event = {
                name: mainName,
                lat,
                lon,
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

