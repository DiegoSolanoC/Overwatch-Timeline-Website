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
    
    // Use the same logic as getDisplayText - handle "Olivia Colomar" as whole first, then individual words
    // First, replace "Olivia Colomar" as a whole (full name together)
    let processedText = eventName;
    const placeholders = [];
    let placeholderIndex = 0;
    
    // Replace full "Olivia Colomar" first (case-insensitive, with word boundaries)
    processedText = processedText.replace(/\bOlivia\s+Colomar\b/gi, (match) => {
        const placeholder = `__GLITCH_FULL_${placeholderIndex}__`;
        const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
        placeholders[placeholderIndex] = `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
        placeholderIndex++;
        return placeholder;
    });
    
    // Then replace "Olivia" individually
    processedText = processedText.replace(/\bOlivia\b/gi, (match) => {
            const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
            return `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
        });
    
    // Then replace "Colomar" individually
    processedText = processedText.replace(/\bColomar\b/gi, (match) => {
        const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
        return `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
    });
    
    // Restore placeholders (full "Olivia Colomar" replacements)
    placeholders.forEach((replacement, index) => {
        processedText = processedText.replace(`__GLITCH_FULL_${index}__`, replacement);
    });
    
    return processedText;
}

/**
 * EventManager - Handles event management UI and operations
 */
class EventManager {
    constructor() {
        this.events = [];
        this.cities = [];
        this.fictionalCities = [];
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
        this.currentPage = 1; // Current page number (1-indexed)
        this.eventsPerPage = 50; // Number of events per page
        this.variantData = []; // Store variant data in memory for tab system
        this.activeVariantIndex = 0; // Currently active variant tab
        this.eventItemVariantIndices = new Map(); // Track current variant index for each event item
        this.listenersSetup = false; // Track if listeners have been set up
        this.isOpeningEvent = false; // Flag to prevent panel from closing during event opening
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
     * Initialize the event manager
     */
    async init() {
        const initStartTime = performance.now();
        console.log('EventManager: Starting initialization...');
        this.updateStatus('EventManager: Starting initialization...', 'info');
        
        // Reset state to ensure clean initialization
        this.listenersSetup = false;
        this.events = [];
        this.cities = [];
        this.fictionalCities = [];
        this.airports = [];
        this.seaports = [];
        this.heroes = [];
        this.factions = [];
        this.displayNames = {};
        this.locationCache.clear();
        this.variantData = [];
        this.activeVariantIndex = 0;
        this.eventItemVariantIndices.clear();
        this.unsavedEventIndices.clear();
        
        // Note: localStorage clearing is now handled in loadEvents() after we verify events.json loads successfully
        
        const loadDataStartTime = performance.now();
        this.updateStatus('EventManager: Loading locations data (cities, airports, seaports)...', 'info');
        await this.loadLocationsData();
        console.log(`EventManager: loadLocationsData took ${(performance.now() - loadDataStartTime).toFixed(2)}ms`);
        this.updateStatus(`EventManager: Locations data loaded (${(performance.now() - loadDataStartTime).toFixed(0)}ms)`, 'success');
        
        // Don't call setupEventListeners here - it will be called after buttons are created
        // this.setupEventListeners();
        
        const loadEventsStartTime = performance.now();
        this.updateStatus('EventManager: Loading events from storage...', 'info');
        await this.loadEvents();
        console.log(`EventManager: loadEvents took ${(performance.now() - loadEventsStartTime).toFixed(2)}ms`);
        this.updateStatus(`EventManager: Loaded ${this.events.length} events (${(performance.now() - loadEventsStartTime).toFixed(0)}ms)`, 'success');
        
        // Ensure DOM is ready before rendering
        this.updateStatus('EventManager: Checking DOM readiness...', 'info');
        this.updateStatus(`EventManager: document.readyState = ${document.readyState}`, 'info');
        
        this.updateStatus('EventManager: Preparing to render events to DOM...', 'info');
        if (document.readyState === 'loading') {
            this.updateStatus('EventManager: DOM still loading, waiting for DOMContentLoaded...', 'info');
            document.addEventListener('DOMContentLoaded', () => {
                this.updateStatus('EventManager: DOMContentLoaded fired, rendering events...', 'info');
                this.renderEvents();
            });
        } else {
            this.updateStatus('EventManager: DOM already ready, rendering immediately...', 'info');
            this.renderEvents();
        }
        
        // Also try rendering after a short delay to ensure DOM is fully ready
        setTimeout(() => {
            const eventsList = document.getElementById('eventsList');
            if (eventsList && this.events.length > 0 && eventsList.children.length === 0) {
                console.log('EventManager: Retrying render after delay (DOM might not have been ready)');
                this.updateStatus('EventManager: Retrying render (DOM might not have been ready)', 'info');
                this.renderEvents();
            } else {
                this.updateStatus('EventManager: Render check passed (events already rendered or no events)', 'info');
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
        
        const initTime = performance.now() - initStartTime;
        console.log(`EventManager: Initialized with ${this.events.length} events in ${initTime.toFixed(2)}ms`);
        this.updateStatus(`EventManager: Initialization complete! (${this.events.length} events, ${initTime.toFixed(0)}ms total)`, 'success');
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
     * Optimized to load all data in parallel instead of sequentially
     */
    async loadLocationsData() {
        // Load all data in parallel for better performance
        this.updateStatus('EventManager: Starting data fetch (3 files in parallel)...', 'info');
        const fetchStartTime = performance.now();
        
        // Add timeout protection to prevent hanging
        const fetchWithTimeout = (url, timeout = 10000) => {
            return Promise.race([
                fetch(url + '?' + Date.now()).then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout: ${url} took longer than ${timeout}ms`)), timeout)
                )
            ]);
        };
        
        this.updateStatus('EventManager: Fetching locations.json...', 'info');
        const [locationsResult, displayNamesResult, manifestResult] = await Promise.allSettled([
            fetchWithTimeout('data/locations.json').then(data => {
                this.updateStatus('EventManager: locations.json response received, parsing...', 'info');
                return data;
            }),
            fetchWithTimeout('data/location-display-names.json').then(data => {
                this.updateStatus('EventManager: location-display-names.json response received, parsing...', 'info');
                return data;
            }),
            fetchWithTimeout('manifest.json').then(data => {
                this.updateStatus('EventManager: manifest.json response received, parsing...', 'info');
                return data;
            })
        ]);
        
        const fetchTime = performance.now() - fetchStartTime;
        this.updateStatus(`EventManager: All 3 files fetched (${fetchTime.toFixed(0)}ms)`, 'success');
        
        // Process locations data
        this.updateStatus('EventManager: Processing locations.json data...', 'info');
        if (locationsResult.status === 'fulfilled') {
            const data = locationsResult.value;
            this.cities = data.cities || [];
            this.fictionalCities = data.fictionalCities || [];
            this.airports = data.airports || [];
            this.seaports = data.seaports || [];
            this.updateStatus(`EventManager: Processed ${this.cities.length} cities, ${this.fictionalCities.length} fictional cities, ${this.airports.length} airports, ${this.seaports.length} seaports`, 'success');
        } else {
            console.error('Error loading locations data:', locationsResult.reason);
            this.updateStatus('EventManager: Error loading locations.json', 'error');
        }
        
        // Process display names
        this.updateStatus('EventManager: Processing location-display-names.json data...', 'info');
        if (displayNamesResult.status === 'fulfilled') {
            const displayNamesData = displayNamesResult.value;
            this.displayNames = displayNamesData.displayNames || {};
            const displayNamesCount = Object.keys(this.displayNames).length;
            this.updateStatus(`EventManager: Processed ${displayNamesCount} display name mappings`, 'success');
        } else {
            console.error('Error loading display names:', displayNamesResult.reason);
            this.displayNames = {};
            this.updateStatus('EventManager: Error loading location-display-names.json', 'error');
        }
        
        // Process manifest
        this.updateStatus('EventManager: Processing manifest.json data...', 'info');
        if (manifestResult.status === 'fulfilled') {
            const manifest = manifestResult.value;
            this.heroes = manifest.heroes || [];
            // Store full faction objects (with filename, displayName, number)
            this.factions = manifest.factions || [];
            this.updateStatus(`EventManager: Processed ${this.heroes.length} heroes, ${this.factions.length} factions`, 'success');
        } else {
            console.error('Error loading manifest:', manifestResult.reason);
            this.updateStatus('EventManager: Error loading manifest.json', 'error');
        }
    }

    /**
     * Load events from localStorage or fetch from locations.json
     */
    async loadEvents() {
        // First, always try to load from events.json (source of truth)
        let fileEventCount = 0;
        let fileEvents = null;
        this.updateStatus('EventManager: Starting events load process...', 'info');
        
        this.updateStatus('EventManager: Fetching events.json file...', 'info');
        const fetchStartTime = performance.now();
        try {
            // Add timeout protection with proper cache-busting
            const fetchWithTimeout = (url, timeout = 10000) => {
                // Add cache-busting parameters properly
                const separator = url.includes('?') ? '&' : '?';
                const cacheBuster = `${separator}v=${Date.now()}&_=${Math.random().toString(36).substr(2, 9)}&nocache=true`;
                const fullUrl = url + cacheBuster;
                
                return Promise.race([
                    fetch(fullUrl).then(res => {
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                        }
                        return res.json();
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Timeout: ${url} took longer than ${timeout}ms`)), timeout)
                    )
                ]);
            };
            
            // Fetch events.json with cache-busting
            const data = await fetchWithTimeout('data/events.json');
            const fetchTime = performance.now() - fetchStartTime;
            this.updateStatus(`EventManager: events.json fetch completed (${fetchTime.toFixed(0)}ms)`, 'info');
            
            if (data && data.events && Array.isArray(data.events) && data.events.length > 0) {
                    fileEvents = data.events;
                    fileEventCount = data.events.length;
                console.log('EventManager: ✓ Successfully loaded', fileEventCount, 'events from data/events.json');
                this.updateStatus(`EventManager: Found ${fileEventCount} events in events.json`, 'success');
            } else {
                console.warn('EventManager: events.json loaded but has no events array or is empty', data);
                this.updateStatus('EventManager: events.json has no events array or is empty', 'warning');
            }
        } catch (error) {
            console.error('EventManager: ✗ CRITICAL - Could not load from data/events.json:', error);
            console.error('EventManager: Error details:', {
                message: error.message,
                stack: error.stack,
                url: 'data/events.json'
            });
            this.updateStatus(`EventManager: events.json fetch error: ${error.message}`, 'error');
            this.updateStatus('EventManager: Will try localStorage if available', 'info');
        }
        
        // Check localStorage for comparison
        this.updateStatus('EventManager: Checking localStorage for saved events...', 'info');
        const localStorageStartTime = performance.now();
        const savedEvents = localStorage.getItem('timelineEvents');
        const localStorageTime = performance.now() - localStorageStartTime;
        this.updateStatus(`EventManager: localStorage access completed (${localStorageTime.toFixed(0)}ms)`, 'info');
        console.log('EventManager: Checking localStorage for events...');
        console.log('EventManager: localStorage.getItem("timelineEvents") =', savedEvents ? 'Found data (' + savedEvents.length + ' chars)' : 'null');
        
        if (savedEvents) {
            try {
                this.updateStatus('EventManager: Parsing localStorage events...', 'info');
                const parseStartTime = performance.now();
                const localStorageEvents = JSON.parse(savedEvents);
                const parseTime = performance.now() - parseStartTime;
                this.updateStatus(`EventManager: localStorage parsed (${parseTime.toFixed(0)}ms)`, 'info');
                
                const localStorageCount = localStorageEvents.length;
                console.log('EventManager: Found', localStorageCount, 'events in localStorage');
                this.updateStatus(`EventManager: Found ${localStorageCount} events in localStorage`, 'success');
                
                // On GitHub Pages, always prefer events.json (source of truth) since users can't edit
                // On localhost, prefer localStorage if it has user's saved changes, but use file if file has more events
                const isGitHubPages = this.isGitHubPages();
                
                if (fileEvents && fileEventCount > 0) {
                    // CRITICAL FIX: On GitHub Pages, ALWAYS use events.json if it exists (source of truth)
                    // This ensures GitHub Pages never uses stale localStorage
                    if (isGitHubPages) {
                        console.log(`EventManager [GitHub Pages]: ALWAYS using events.json (${fileEventCount} events) - localStorage has ${localStorageCount} events (ignored)`);
                        this.updateStatus(`EventManager: Using events.json (${fileEventCount} events) - GitHub Pages mode`, 'info');
                        this.events = fileEvents;
                        // Clear old localStorage and save fresh data
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        this.syncEventsToGlobe();
                        return;
                    }
                    
                    // On localhost: Use file if it has more events (even just 1 more), otherwise prefer localStorage
                    if (fileEventCount > localStorageCount) {
                        console.log(`EventManager [Localhost]: Using events.json (${fileEventCount} events, file has more than localStorage (${localStorageCount}))`);
                        this.updateStatus(`EventManager: Using events.json (${fileEventCount} events, file has more than localStorage)`, 'info');
                        this.events = fileEvents;
                        // Clear old localStorage and save fresh data
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        this.syncEventsToGlobe();
                        return;
                    }
                    
                    // On localhost: localStorage has same or more events, prefer it (user's saved changes)
                    console.log('EventManager [Localhost]: Using localStorage version (user\'s saved changes) -', localStorageCount, 'events');
                    this.updateStatus(`EventManager: Using localStorage (${localStorageCount} events, user's saved changes)`, 'info');
                }
                
                // Use localStorage (user's saved changes take priority on localhost)
                this.events = localStorageEvents;
                console.log('EventManager: Using localStorage version (', this.events.length, 'events)');
                console.log('EventManager: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
                this.updateStatus(`EventManager: Using ${this.events.length} events from localStorage`, 'success');
                
                // CRITICAL: On GitHub Pages, always prefer file if it has more events (even if localStorage exists)
                // On localhost, update if file has significantly more events (5+ more) or localStorage is outdated
                if (fileEvents && fileEventCount > 0) {
                    if (isGitHubPages && fileEventCount > this.events.length) {
                        // GitHub Pages: Always use file if it has more events
                        console.warn(`EventManager [GitHub Pages]: localStorage has ${this.events.length} events, but events.json has ${fileEventCount}. Using events.json (source of truth).`);
                        this.updateStatus(`EventManager: Updating from events.json (${fileEventCount} events, localStorage had ${this.events.length})`, 'warning');
                        this.events = fileEvents;
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                    } else if (!isGitHubPages && fileEventCount > this.events.length + 4) {
                        // Localhost: Only update if file has 5+ more events (user might have local edits)
                        console.warn(`EventManager [Localhost]: localStorage has ${this.events.length} events, but events.json has ${fileEventCount} (${fileEventCount - this.events.length} more). Using events.json.`);
                        this.updateStatus(`EventManager: Updating from events.json (${fileEventCount} events, localStorage had ${this.events.length})`, 'warning');
                        this.events = fileEvents;
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                    } else if (!isGitHubPages && this.events.length < 58 && fileEventCount >= 58) {
                        // Localhost: Update if localStorage is clearly outdated (< 58) and file has current data
                        console.warn(`EventManager: localStorage has ${this.events.length} events (outdated), but events.json has ${fileEventCount}. Using events.json.`);
                        this.updateStatus(`EventManager: Updating from events.json (${fileEventCount} events, localStorage had ${this.events.length})`, 'warning');
                        this.events = fileEvents;
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                    }
                }
                
                // Sync with DataModel and refresh markers
                this.syncEventsToGlobe();
                return;
            } catch (error) {
                console.error('EventManager: Error parsing saved events:', error);
                console.error('EventManager: Raw data:', savedEvents.substring(0, 200));
                this.updateStatus('EventManager: Error parsing localStorage (corrupted?), trying events.json...', 'error');
                // If localStorage is corrupted, clear it and use file
                if (fileEvents && fileEventCount > 0) {
                    console.log('EventManager: localStorage corrupted, using file version');
                    this.updateStatus(`EventManager: Using events.json (${fileEventCount} events, localStorage was corrupted)`, 'info');
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
                    this.updateStatus(`EventManager: Using ${this.events.length} events from events.json`, 'success');
                    
            // Check if we have a reasonable number of events (at least 50)
                    // If not, clear localStorage to force fresh load
            if (this.events.length < 50) {
                console.warn(`EventManager: Event count is less than expected (${this.events.length} < 50). Clearing localStorage to force fresh load.`);
                        localStorage.removeItem('timelineEvents');
                this.updateStatus(`EventManager: Cleared localStorage (found ${this.events.length} events, expected at least 50)`, 'warning');
                    }
                    
                    // Save to localStorage for future use
                    this.saveEvents();
                    
                    // Sync with DataModel and refresh markers
                    this.syncEventsToGlobe();
                    return;
        }

        // CRITICAL: If events.json failed to load, try localStorage as fallback (even on GitHub Pages)
        // This prevents "No events" error if events.json has a temporary loading issue
        if (savedEvents) {
            try {
                const fallbackEvents = JSON.parse(savedEvents);
                if (Array.isArray(fallbackEvents) && fallbackEvents.length > 0) {
                    console.warn('EventManager: events.json failed to load, using localStorage as fallback');
                    this.updateStatus(`EventManager: Using localStorage fallback (${fallbackEvents.length} events) - events.json unavailable`, 'warning');
                    this.events = fallbackEvents;
                    this.syncEventsToGlobe();
                    return;
                }
            } catch (e) {
                console.error('EventManager: localStorage fallback also failed:', e);
            }
        }

        // No events available from any source
        this.events = [];
        console.error('EventManager: CRITICAL - No events found from events.json or localStorage!');
        this.updateStatus('EventManager: ERROR - No events found. Check events.json file.', 'error');
        
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

        // Search in fictional cities (exact match first, then partial)
        let fictionalCity = this.fictionalCities.find(c => 
            c.name.toLowerCase() === searchName
        );
        if (!fictionalCity) {
            // Try partial match
            fictionalCity = this.fictionalCities.find(c => 
                c.name.toLowerCase().includes(searchName) ||
                searchName.includes(c.name.toLowerCase())
            );
        }
        if (fictionalCity) {
            return { lat: fictionalCity.lat, lon: fictionalCity.lon, name: fictionalCity.name };
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
        console.log('EventManager: setupEventListeners called');
        
        // Toggle panel
        const toggleBtn = document.getElementById('eventsManageToggle');
        const panel = document.getElementById('eventsManagePanel');
        const closeBtn = document.getElementById('eventsManageClose');
        
        if (!panel) {
            console.error('EventManager: eventsManagePanel not found! Make sure the HTML panel exists in the page.');
            console.error('EventManager: Current page:', window.location.pathname);
            // Try again after a short delay in case DOM isn't ready
            setTimeout(() => {
                console.log('EventManager: Retrying setupEventListeners after delay...');
                this.setupEventListeners();
            }, 200);
            return;
        }
        
        // If listeners already set up, skip (but allow re-setup if needed)
        if (this.listenersSetup && toggleBtn && panel) {
            console.log('EventManager: Listeners already set up, skipping...');
            return;
        }
        
        console.log('EventManager: Panel found, setting up listeners...');
        console.log('EventManager: Toggle button found:', !!toggleBtn);
        console.log('EventManager: Close button found:', !!closeBtn);

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
                // Don't close panel if we're in the process of opening an event
                if (this.isOpeningEvent) {
                    return;
                }
                
                const toggleBtn = document.getElementById('eventsManageToggle');
                const editModal = document.getElementById('eventEditModal');
                // Check if clicking on a View button (don't close panel)
                const isViewButton = e.target.classList && e.target.classList.contains('view-btn');
                const isViewButtonParent = e.target.closest && e.target.closest('.view-btn');
                // Don't close panel if clicking on edit modal, toggle button, or View buttons
                if (!panel.contains(e.target) && 
                    !toggleBtn.contains(e.target) && 
                    e.target !== toggleBtn &&
                    !editModal.contains(e.target) &&
                    !editModal.classList.contains('open') &&
                    !isViewButton &&
                    !isViewButtonParent) {
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
                console.log('EventManager: Add Event button hidden (GitHub Pages)');
            } else {
                // Remove any existing listeners by cloning
                const addBtnClone = addBtn.cloneNode(true);
                addBtn.parentNode.replaceChild(addBtnClone, addBtn);
                const newAddBtn = document.getElementById('addEventBtn');
                
                newAddBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('EventManager: Add Event button clicked');
                    this.openEditModal(null);
                });
                console.log('EventManager: Add Event button listener attached');
            }
        } else {
            console.warn('EventManager: addEventBtn not found! Make sure events-manage-panel HTML exists.');
            console.warn('EventManager: Panel exists:', !!panel, 'Panel ID:', panel?.id);
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
        
        // Mark listeners as set up
        this.listenersSetup = true;
        console.log('EventManager: setupEventListeners completed successfully');
    }

    /**
     * Render events list with pagination
     */
    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) {
            console.error('EventManager: eventsList element not found!');
            this.updateStatus('EventManager: Error - eventsList element not found!', 'error');
            return;
        }

        // Calculate pagination
        const totalEvents = this.events.length;
        const totalPages = Math.max(1, Math.ceil(totalEvents / this.eventsPerPage));
        
        // Ensure current page is valid
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }

        const startIndex = (this.currentPage - 1) * this.eventsPerPage;
        const endIndex = Math.min(startIndex + this.eventsPerPage, totalEvents);
        const eventsToRender = this.events.slice(startIndex, endIndex);

        console.log(`EventManager: Rendering page ${this.currentPage} of ${totalPages} (events ${startIndex + 1}-${endIndex} of ${totalEvents})`);
        if (eventsToRender.length > 0) {
            this.updateStatus(`EventManager: Rendering page ${this.currentPage} of ${totalPages}...`, 'info');
        } else {
            this.updateStatus('EventManager: No events to render', 'info');
        }

        // Update event count display
        const eventsCountElement = document.getElementById('eventsCount');
        if (eventsCountElement) {
            eventsCountElement.textContent = `${totalEvents} ${totalEvents === 1 ? 'Event' : 'Events'} (Page ${this.currentPage}/${totalPages})`;
        }

        eventsList.innerHTML = '';

        if (this.events.length === 0) {
            eventsList.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">No events yet. Click "Add Event" to create one.</div>';
            console.log('EventManager: No events to render');
            this.renderPaginationControls();
            return;
        }

        // Create event items for current page using document fragment for better performance
        const renderStartTime = performance.now();
        const fragment = document.createDocumentFragment();
        eventsToRender.forEach((event, pageIndex) => {
            const actualIndex = startIndex + pageIndex; // Actual index in full events array
            const eventItem = this.createEventItem(event, actualIndex);
            fragment.appendChild(eventItem);
        });
        eventsList.appendChild(fragment);

        const renderTime = performance.now() - renderStartTime;
        console.log(`EventManager: Rendered ${eventsToRender.length} event items (${renderTime.toFixed(0)}ms)`);
        this.updateStatus(`EventManager: Rendered page ${this.currentPage} (${eventsToRender.length} events, ${renderTime.toFixed(0)}ms)`, 'success');

        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Render pagination controls
        this.renderPaginationControls();
    }
    
    /**
     * Render pagination controls
     */
    renderPaginationControls() {
        const totalEvents = this.events.length;
        const totalPages = Math.max(1, Math.ceil(totalEvents / this.eventsPerPage));
        
        // Find or create pagination container
        let paginationContainer = document.getElementById('eventsPagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'eventsPagination';
            paginationContainer.className = 'events-pagination';
            const eventsList = document.getElementById('eventsList');
            if (eventsList && eventsList.parentNode) {
                eventsList.parentNode.insertBefore(paginationContainer, eventsList.nextSibling);
            }
        }
        
        // Don't show pagination if only one page
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // Build pagination HTML
        let paginationHTML = '<div class="events-pagination-controls">';
        
        // Previous button
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHTML += `<button class="events-pagination-btn" id="eventsPrevPage" ${prevDisabled}>‹ Prev</button>`;
        
        // Page selector with text input
        paginationHTML += `<span class="events-pagination-page-selector">`;
        paginationHTML += `<label for="eventsPageInput">Page:</label>`;
        paginationHTML += `<input type="number" id="eventsPageInput" class="events-pagination-input" min="1" max="${totalPages}" value="${this.currentPage}" />`;
        paginationHTML += `<span class="events-pagination-total">of ${totalPages}</span>`;
        paginationHTML += `</span>`;
        
        // Next button
        const nextDisabled = this.currentPage === totalPages ? 'disabled' : '';
        paginationHTML += `<button class="events-pagination-btn" id="eventsNextPage" ${nextDisabled}>Next ›</button>`;
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Attach event listeners
        this.setupPaginationListeners();
    }
    
    /**
     * Setup pagination event listeners
     */
    setupPaginationListeners() {
        // Previous button
        const prevBtn = document.getElementById('eventsPrevPage');
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderEvents();
                }
            };
        }
        
        // Next button
        const nextBtn = document.getElementById('eventsNextPage');
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const totalPages = Math.max(1, Math.ceil(this.events.length / this.eventsPerPage));
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderEvents();
                }
            };
        }
        
        // Page input field
        const pageInput = document.getElementById('eventsPageInput');
        if (pageInput) {
            pageInput.onchange = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const totalPages = Math.max(1, Math.ceil(this.events.length / this.eventsPerPage));
                const page = parseInt(pageInput.value);
                if (page && page >= 1 && page <= totalPages && page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderEvents();
                } else {
                    // Reset to current page if invalid
                    pageInput.value = this.currentPage;
                }
            };
            
            pageInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    pageInput.onchange(e);
                }
                // Stop propagation for all keys to prevent panel closing
                e.stopPropagation();
            };
            
            pageInput.onclick = (e) => {
                e.stopPropagation();
            };
        }
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
        const locationType = event.locationType || 'earth';
        let locationLat = event.lat;
        let locationLon = event.lon;
        let locationX = event.x;
        let locationY = event.y;
        
        if (isMultiEvent && event.variants && event.variants.length > 0) {
            // Use first variant's cityDisplayName and location
            const firstVariant = event.variants[0];
            locationName = firstVariant.cityDisplayName || null;
            const variantLocationType = firstVariant.locationType || locationType;
            if (variantLocationType === 'earth') {
                if (firstVariant.lat !== undefined) {
                    locationLat = firstVariant.lat;
                }
                if (firstVariant.lon !== undefined) {
                    locationLon = firstVariant.lon;
                }
            } else {
                // Moon or Mars
                if (firstVariant.x !== undefined) {
                    locationX = firstVariant.x;
                }
                if (firstVariant.y !== undefined) {
                    locationY = firstVariant.y;
                }
            }
        } else {
            locationName = event.cityDisplayName || null;
        }
        
        // Only call getLocationName for Earth events with valid lat/lon
        if (!locationName && locationType === 'earth' && locationLat !== undefined && locationLon !== undefined) {
            locationName = this.getLocationName(locationLat, locationLon);
        }
        
        // For Moon/Mars/Station events, display coordinates if no custom name
        if (!locationName && locationType !== 'earth') {
            if (locationType === 'station') {
                locationName = 'Space Station (ISS)';
            } else if (locationX !== undefined && locationY !== undefined) {
                locationName = `${locationType === 'moon' ? 'Moon' : 'Mars'}: (${locationX.toFixed(1)}, ${locationY.toFixed(1)})`;
            } else {
                locationName = locationType === 'moon' ? 'Moon' : 'Mars';
            }
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
            // Only call getLocationName for Earth events with valid lat/lon
            const currentVariantLocationType = currentVariant.locationType || locationType;
            if (!locationName && currentVariantLocationType === 'earth' && locationLat !== undefined && locationLon !== undefined) {
                locationName = this.getLocationName(locationLat, locationLon);
            }
            // For Moon/Mars events, display coordinates if no custom name
            if (!locationName && currentVariantLocationType !== 'earth') {
                const variantX = currentVariant.x !== undefined ? currentVariant.x : (event.x !== undefined ? event.x : undefined);
                const variantY = currentVariant.y !== undefined ? currentVariant.y : (event.y !== undefined ? event.y : undefined);
                if (variantX !== undefined && variantY !== undefined) {
                    locationName = `${currentVariantLocationType === 'moon' ? 'Moon' : 'Mars'}: (${variantX.toFixed(1)}, ${variantY.toFixed(1)})`;
                } else {
                    locationName = currentVariantLocationType === 'moon' ? 'Moon' : 'Mars';
                }
            }
        }
        
        // Don't use cache busting for initial loads - let browser cache work for performance
        // Cache busting is only needed when we know an image has been updated
        const imagePathWithCache = imagePath || null;
        
        // Warning icon for unfinished event - check if event is missing important information
        // Positioned on the RIGHT side (top-right corner) to avoid overlap with multi-event badge on left
        const hasDescription = displayEvent.description && displayEvent.description.trim().length > 0;
        const isUnfinished = !hasDescription;
        const unfinishedWarning = isUnfinished 
            ? `<div class="description-warning-badge" title="Unfinished event: Missing description">!</div>`
            : '';
        
        // Always use the same container structure to maintain consistent sizing
        // Use a wrapper div to ensure the square space is always shown
        // Add loading="lazy" for better performance - images load as they come into view
        // Include warning icon inside the image container for proper positioning
        const imageHtml = imagePathWithCache
            ? `<div class="event-item-preview-image" style="position: relative; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1; overflow: hidden;"><img src="${imagePathWithCache}" alt="${displayEvent.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;\\'>No Image</div>';" onload=""></div>`
            : `<div class="event-item-preview-image" style="position: relative; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1;">No Image</div>`;

        // Multi-event indicator badge - show current variant / total (e.g., "1/2")
        const multiEventBadge = isMultiEvent 
            ? `<div class="multi-event-badge" data-event-index="${index}" title="Click to cycle through variants">${currentVariantIndex + 1}/${event.variants.length}</div>`
            : '';

        // Event number badge - show event number in chronological order (bottom-right)
        const eventNumberBadge = `<div class="event-number-badge" title="Event #${index + 1}">${index + 1}</div>`;

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
            ${unfinishedWarning}
            ${eventNumberBadge}
            </div>
            <div class="event-item-info">
                <h3 class="event-item-title">${getDisplayEventName(displayEvent.name)}</h3>
                <p class="event-item-location"><img src="Icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName || `${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}`}</p>
            </div>
            ${actionButtons}
        `;

        // Add event listeners for buttons (View works on both, Edit/Delete only on localhost)
        const viewBtn = item.querySelector('.view-btn');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.openEventFromList(event, index);
            });
            // Prevent dragging when clicking on button
            viewBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
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
            const variantLocationType = variant.locationType || (event.locationType || 'earth');
            
            // Only call getLocationName for Earth events with valid lat/lon
            if (!locationName && variantLocationType === 'earth' && variant.lat !== undefined && variant.lon !== undefined) {
                locationName = this.getLocationName(variant.lat, variant.lon);
            }
            // Fallback to coordinates for Earth events
            if (!locationName && variantLocationType === 'earth' && variant.lat !== undefined && variant.lon !== undefined) {
                locationName = `${variant.lat.toFixed(4)}, ${variant.lon.toFixed(4)}`;
            }
            // For Moon/Mars events, display coordinates
            if (!locationName && variantLocationType !== 'earth') {
                if (variant.x !== undefined && variant.y !== undefined) {
                    locationName = `${variantLocationType === 'moon' ? 'Moon' : 'Mars'}: (${variant.x.toFixed(1)}, ${variant.y.toFixed(1)})`;
                } else {
                    locationName = variantLocationType === 'moon' ? 'Moon' : 'Mars';
                }
            }
            locationElement.innerHTML = `<img src="Icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName || 'Unknown'}`;
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
        // Set flag to prevent panel from closing during event opening
        this.isOpeningEvent = true;
        
        // Helper function to actually open the event (called after page change completes if needed)
        const openEventAfterPageChange = () => {
            // Close the event manager panel
            const panel = document.getElementById('eventsManagePanel');
            if (panel) {
                panel.classList.remove('open');
            }
            const toggleBtn = document.getElementById('eventsManageToggle');
            if (toggleBtn) {
                toggleBtn.classList.remove('active');
            }
            
            // Clear the flag after a short delay to allow event slide to open
            setTimeout(() => {
                this.isOpeningEvent = false;
            }, 500);
            
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
                    
                    // Zoom to marker or reset to default view (for Moon/Mars) and show event slide
                    if (window.globeController.interactionController) {
                        const locationType = targetMarker.userData ? targetMarker.userData.locationType : 'earth';
                        if (locationType === 'moon' || locationType === 'mars') {
                            // Reset camera to default view for Moon/Mars events
                            window.globeController.interactionController.resetCameraToDefault();
                        } else {
                            // Zoom in and center on the marker (Earth events)
                            window.globeController.interactionController.zoomToMarker(targetMarker);
                        }
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
        };
        
        // Check if event is on current page, if not switch to the correct page
        if (window.globeController && window.globeController.dataModel) {
            const dataModel = window.globeController.dataModel;
            const currentPage = dataModel.getCurrentEventPage();
            const eventsPerPage = dataModel.eventsPerPage || 10;
            const eventPage = Math.floor(index / eventsPerPage) + 1;
            
            if (eventPage !== currentPage) {
                // Switch to the correct page
                dataModel.setCurrentEventPage(eventPage);
                
                // Re-render events list first
                this.renderEvents();
                
                // Refresh markers and pagination, then open event after markers are ready
                if (window.globeController.globeView) {
                    const refreshPromise = window.globeController.globeView.refreshEventMarkers();
                    if (refreshPromise && typeof refreshPromise.then === 'function') {
                        // refreshEventMarkers returns a promise
                        refreshPromise.then(() => {
                            // Wait a bit more for markers to be fully ready
                            setTimeout(() => {
                                openEventAfterPageChange();
                            }, 100);
                        }).catch(() => {
                            // If promise rejects, just wait and try
                            setTimeout(() => {
                                openEventAfterPageChange();
                            }, 300);
                        });
                    } else {
                        // refreshEventMarkers doesn't return a promise, just wait
                        setTimeout(() => {
                            openEventAfterPageChange();
                        }, 400);
                    }
                } else {
                    // No globeView, just wait and open
                    setTimeout(() => {
                        openEventAfterPageChange();
                    }, 300);
                }
                
                if (window.globeController.uiView) {
                    window.globeController.uiView.setupEventPagination(() => {
                        if (window.globeController.globeView) {
                            window.globeController.globeView.refreshEventMarkers();
                        }
                    });
                }
            } else {
                // Event is on current page, open immediately
                openEventAfterPageChange();
            }
        } else {
            // No globeController, just try to open
            openEventAfterPageChange();
        }
        
        // Clear flag if something goes wrong (safety net)
        setTimeout(() => {
            this.isOpeningEvent = false;
        }, 2000);
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
            ...this.fictionalCities.map(c => ({ ...c, type: 'fictionalCity' })),
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
                        locationEl.innerHTML = `<img src="Icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
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
            // Check if we need to adjust pagination
            const totalPages = Math.ceil(this.events.length / this.eventsPerPage);
            const currentPageStartIndex = (this.currentPage - 1) * this.eventsPerPage;
            const currentPageEndIndex = currentPageStartIndex + this.eventsPerPage;
            
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
            
            // Adjust current page if needed
            const newTotalPages = Math.max(1, Math.ceil(this.events.length / this.eventsPerPage));
            if (this.currentPage > newTotalPages) {
                this.currentPage = newTotalPages;
            }
            
            // If we deleted the last item on the current page and it's not the first page, go to previous page
            if (this.events.length > 0 && index >= currentPageStartIndex && index < currentPageEndIndex) {
                const remainingOnPage = this.events.slice(currentPageStartIndex, currentPageEndIndex - 1).length;
                if (remainingOnPage === 0 && this.currentPage > 1) {
                    this.currentPage--;
                }
            }
            
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
        
        // Setup location type change handler
        this.setupLocationTypeHandler();
        
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
     * Setup location type change handler
     */
    setupLocationTypeHandler() {
        const locationTypeButtons = document.querySelectorAll('.location-type-btn');
        const locationTypeInput = document.getElementById('eventEditLocationType');
        
        if (locationTypeButtons.length > 0 && !locationTypeButtons[0].dataset.handlerSetup) {
            locationTypeButtons[0].dataset.handlerSetup = 'true';
            
            locationTypeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from all buttons
                    locationTypeButtons.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    btn.classList.add('active');
                    // Update hidden input value
                    if (locationTypeInput) {
                        locationTypeInput.value = btn.dataset.locationType;
                    }
                    // Update location fields
                    this.updateLocationFields();
                });
            });
        }
    }

    /**
     * Set location type and update UI (buttons and hidden input)
     * @param {string} locationType - 'earth', 'moon', or 'mars'
     */
    setLocationType(locationType) {
        const locationTypeInput = document.getElementById('eventEditLocationType');
        const locationTypeButtons = document.querySelectorAll('.location-type-btn');
        
        // Update hidden input
        if (locationTypeInput) {
            locationTypeInput.value = locationType;
        }
        
        // Update button active states
        locationTypeButtons.forEach(btn => {
            if (btn.dataset.locationType === locationType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update location fields
        this.updateLocationFields();
    }

    /**
     * Update location fields based on selected location type
     */
    updateLocationFields() {
        const locationTypeInput = document.getElementById('eventEditLocationType');
        const locationType = locationTypeInput ? locationTypeInput.value : 'earth';
        const latLonFields = document.getElementById('latLonFields');
        const lonFields = document.getElementById('lonFields');
        const xyFields = document.getElementById('xyFields');
        const yFields = document.getElementById('yFields');
        const cityLookupField = document.getElementById('eventEditCity').closest('.event-edit-field');
        const cityDisplayNameField = document.getElementById('eventEditCityDisplayName').closest('.event-edit-field');
        
        if (locationType === 'earth') {
            if (latLonFields) latLonFields.style.display = '';
            if (lonFields) lonFields.style.display = '';
            if (xyFields) xyFields.style.display = 'none';
            if (yFields) yFields.style.display = 'none';
            if (cityLookupField) cityLookupField.style.display = '';
            if (cityDisplayNameField) cityDisplayNameField.style.display = '';
            const latInput = document.getElementById('eventEditLat');
            const lonInput = document.getElementById('eventEditLon');
            const xInput = document.getElementById('eventEditX');
            const yInput = document.getElementById('eventEditY');
            if (latInput) latInput.required = true;
            if (lonInput) lonInput.required = true;
            if (xInput) xInput.required = false;
            if (yInput) yInput.required = false;
        } else if (locationType === 'station') {
            // Station: hide coordinate fields (no coordinates needed - placed on ISS automatically)
            if (latLonFields) latLonFields.style.display = 'none';
            if (lonFields) lonFields.style.display = 'none';
            if (xyFields) xyFields.style.display = 'none';
            if (yFields) yFields.style.display = 'none';
            if (cityLookupField) cityLookupField.style.display = 'none';
            // Show city display name field for Station (like Moon/Mars)
            if (cityDisplayNameField) cityDisplayNameField.style.display = '';
            const latInput = document.getElementById('eventEditLat');
            const lonInput = document.getElementById('eventEditLon');
            const xInput = document.getElementById('eventEditX');
            const yInput = document.getElementById('eventEditY');
            const cityDisplayNameInput = document.getElementById('eventEditCityDisplayName');
            if (latInput) latInput.required = false;
            if (lonInput) lonInput.required = false;
            if (xInput) xInput.required = false;
            if (yInput) yInput.required = false;
            
            // Set default city display name if field is empty
            if (cityDisplayNameInput && !cityDisplayNameInput.value.trim()) {
                cityDisplayNameInput.value = 'Interstellar Journey Space Station';
            }
        } else {
            // Moon or Mars
            if (latLonFields) latLonFields.style.display = 'none';
            if (lonFields) lonFields.style.display = 'none';
            if (xyFields) xyFields.style.display = '';
            if (yFields) yFields.style.display = '';
            if (cityLookupField) cityLookupField.style.display = 'none';
            // Show city display name field for Moon/Mars (same as Earth)
            if (cityDisplayNameField) cityDisplayNameField.style.display = '';
            const latInput = document.getElementById('eventEditLat');
            const lonInput = document.getElementById('eventEditLon');
            const xInput = document.getElementById('eventEditX');
            const yInput = document.getElementById('eventEditY');
            const cityDisplayNameInput = document.getElementById('eventEditCityDisplayName');
            if (latInput) latInput.required = false;
            if (lonInput) lonInput.required = false;
            if (xInput) xInput.required = true;
            if (yInput) yInput.required = true;
            
            // Set default X/Y coordinates if fields are empty (only when switching, not when editing existing)
            if (xInput && !xInput.value.trim()) {
                if (locationType === 'moon') {
                    xInput.value = '60';
                } else if (locationType === 'mars') {
                    xInput.value = '45';
                }
            }
            if (yInput && !yInput.value.trim()) {
                if (locationType === 'moon') {
                    yInput.value = '70';
                } else if (locationType === 'mars') {
                    yInput.value = '35';
                }
            }
            
            // Set default city display name if field is empty
            if (cityDisplayNameInput && !cityDisplayNameInput.value.trim()) {
                if (locationType === 'moon') {
                    cityDisplayNameInput.value = 'Horizon Lunar Colony';
                } else if (locationType === 'mars') {
                    cityDisplayNameInput.value = 'Red Promise Colony';
                }
            }
        }
    }

    /**
     * Clear edit form
     */
    clearEditForm() {
        document.getElementById('eventEditName').value = '';
        // Set default event number to position after last event (1-indexed)
        const defaultEventNumber = this.events.length + 1;
        document.getElementById('eventEditNumber').value = defaultEventNumber;
        document.getElementById('eventEditCity').value = '';
        document.getElementById('eventEditCityDisplayName').value = '';
        document.getElementById('eventEditLat').value = '';
        document.getElementById('eventEditLon').value = '';
        document.getElementById('eventEditX').value = '';
        document.getElementById('eventEditY').value = '';
        document.getElementById('eventEditDescription').value = '';
        document.getElementById('eventEditFilters').value = '';
        document.getElementById('eventEditFactions').value = '';
        // Set default location type (will trigger updateLocationFields which sets defaults)
        this.setLocationType('earth');
        // Clear all source pairs and reset to one
        this.clearSourcePairs();
        // Initialize with one variant (always show tabs)
        this.variantData = [{
            name: '',
            description: '',
            filters: [],
            factions: [],
            sources: [],
            locationType: 'earth'
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
        
        // Save location type and coordinates for this variant
        const locationTypeInput = document.getElementById('eventEditLocationType');
        if (locationTypeInput) {
            variant.locationType = locationTypeInput.value;
        }

        const latInput = document.getElementById('eventEditLat');
        const lonInput = document.getElementById('eventEditLon');
        const xInput = document.getElementById('eventEditX');
        const yInput = document.getElementById('eventEditY');

        if (variant.locationType === 'earth') {
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
            variant.x = undefined;
            variant.y = undefined;
        } else {
            if (xInput && xInput.value.trim()) {
                const x = parseFloat(xInput.value.trim());
                variant.x = isNaN(x) ? undefined : x;
            } else {
                variant.x = undefined;
            }
            if (yInput && yInput.value.trim()) {
                const y = parseFloat(yInput.value.trim());
                variant.y = isNaN(y) ? undefined : y;
            } else {
                variant.y = undefined;
            }
            variant.lat = undefined;
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
        
            // Load variant-specific location type and coordinates
            this.setLocationType(variant.locationType || 'earth');
        
        if (variant.locationType === 'earth') {
            if (variant.lat !== undefined) {
                document.getElementById('eventEditLat').value = variant.lat;
            }
            if (variant.lon !== undefined) {
                document.getElementById('eventEditLon').value = variant.lon;
            }
        } else {
            if (variant.x !== undefined) {
                document.getElementById('eventEditX').value = variant.x;
            }
            if (variant.y !== undefined) {
                document.getElementById('eventEditY').value = variant.y;
            }
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
            // Get current location type and coordinates to use as default for new variant
            const locationTypeInput = document.getElementById('eventEditLocationType');
            const currentLocationType = locationTypeInput ? locationTypeInput.value : 'earth';
            const currentLat = document.getElementById('eventEditLat').value.trim();
            const currentLon = document.getElementById('eventEditLon').value.trim();
            const currentX = document.getElementById('eventEditX').value.trim();
            const currentY = document.getElementById('eventEditY').value.trim();
            
            const newVariant = {
                name: '',
                description: '',
                filters: [],
                factions: [],
                sources: [],
                locationType: currentLocationType
            };
            
            if (currentLocationType === 'earth') {
                newVariant.lat = currentLat ? parseFloat(currentLat) : undefined;
                newVariant.lon = currentLon ? parseFloat(currentLon) : undefined;
            } else {
                newVariant.x = currentX ? parseFloat(currentX) : undefined;
                newVariant.y = currentY ? parseFloat(currentY) : undefined;
            }
            
            this.variantData.push(newVariant);
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
        
        // Set event number to current position (1-indexed)
        const eventNumberInput = document.getElementById('eventEditNumber');
        if (eventNumberInput && this.editingIndex !== null) {
            eventNumberInput.value = this.editingIndex + 1;
        }
        
        const isMultiEvent = event.variants && event.variants.length > 0;
        
        // Determine the main location type for the event (or first variant)
        const mainLocationType = isMultiEvent && event.variants[0] ? 
                                 (event.variants[0].locationType || event.locationType || 'earth') :
                                 (event.locationType || 'earth');
        
        // Set the location type buttons
        this.setLocationType(mainLocationType);
        
        // Set coordinates - for multi-events, use first variant's location or event location
        // For single events, use event location
        if (isMultiEvent && event.variants[0]) {
            const variant = event.variants[0];
            const variantLocationType = variant.locationType || mainLocationType;
            if (variantLocationType === 'earth') {
                document.getElementById('eventEditLat').value = variant.lat !== undefined ? variant.lat : (event.lat || '');
                document.getElementById('eventEditLon').value = variant.lon !== undefined ? variant.lon : (event.lon || '');
            } else {
                document.getElementById('eventEditX').value = variant.x !== undefined ? variant.x : (event.x || '');
                document.getElementById('eventEditY').value = variant.y !== undefined ? variant.y : (event.y || '');
            }
            // For multi-events, use first variant's cityDisplayName or main event's cityDisplayName
            document.getElementById('eventEditCityDisplayName').value = variant.cityDisplayName || event.cityDisplayName || '';
        } else {
            if (mainLocationType === 'earth') {
                document.getElementById('eventEditLat').value = event.lat || '';
                document.getElementById('eventEditLon').value = event.lon || '';
            } else {
                document.getElementById('eventEditX').value = event.x || '';
                document.getElementById('eventEditY').value = event.y || '';
            }
            document.getElementById('eventEditCityDisplayName').value = event.cityDisplayName || '';
        }
        document.getElementById('eventEditCity').value = '';
        
        if (isMultiEvent) {
            // Load all variants into variantData, including locationType, lat/lon, x/y, and cityDisplayName
            this.variantData = event.variants.map(variant => ({
                name: variant.name || '',
                description: variant.description || '',
                filters: variant.filters || [],
                factions: variant.factions || [],
                sources: variant.sources || [],
                locationType: variant.locationType || mainLocationType,
                lat: variant.lat !== undefined ? variant.lat : undefined,
                lon: variant.lon !== undefined ? variant.lon : undefined,
                x: variant.x !== undefined ? variant.x : undefined,
                y: variant.y !== undefined ? variant.y : undefined,
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
                locationType: event.locationType || 'earth',
                lat: event.lat !== undefined ? event.lat : undefined,
                lon: event.lon !== undefined ? event.lon : undefined,
                x: event.x !== undefined ? event.x : undefined,
                y: event.y !== undefined ? event.y : undefined,
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
            
            // Load variant-specific location type and coordinates
            this.setLocationType(variant.locationType || 'earth');
            
            if (variant.locationType === 'earth') {
                if (variant.lat !== undefined) {
                    document.getElementById('eventEditLat').value = variant.lat;
                }
                if (variant.lon !== undefined) {
                    document.getElementById('eventEditLon').value = variant.lon;
                }
            } else {
                if (variant.x !== undefined) {
                    document.getElementById('eventEditX').value = variant.x;
                }
                if (variant.y !== undefined) {
                    document.getElementById('eventEditY').value = variant.y;
                }
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
        let normalizedName = eventName.replace(/\s+/g, ' ').trim();
        
        // Handle case variations for common patterns (e.g., "CallSign" vs "Callsign")
        // Try to match common filename patterns by normalizing case
        // This handles cases where event name has different capitalization than filename
        const caseVariations = [
            normalizedName, // Original
            normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1).toLowerCase(), // Title Case
            // Try common variations: if name contains "CallSign", try "Callsign"
            normalizedName.replace(/CallSign/g, 'Callsign'),
            normalizedName.replace(/Callsign/g, 'CallSign'),
        ];
        
        // Remove duplicates
        const uniqueVariations = [...new Set(caseVariations)];
        
        // Try each variation (browser will handle 404 if none exist)
        // For now, return the most likely match (original, then common variations)
        // The browser's image onerror handler will catch 404s
        normalizedName = uniqueVariations[0]; // Use first variation (original)
        
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
        
        // Save current variant before processing
        this.saveCurrentVariantToMemory();
        const isMultiEvent = this.variantData.length > 1;
        
        // Get location type
        const locationTypeInput = document.getElementById('eventEditLocationType');
        const locationType = locationTypeInput ? locationTypeInput.value : 'earth';
        
        // Validate coordinates based on location type
        let lat, lon, x, y;
        if (locationType === 'earth') {
            lat = parseFloat(document.getElementById('eventEditLat').value);
            lon = parseFloat(document.getElementById('eventEditLon').value);
            if (isNaN(lat) || isNaN(lon)) {
                alert('Please fill in Latitude and Longitude');
                return;
            }
        } else if (locationType === 'station') {
            // Station events don't need coordinates - marker is placed on ISS automatically
            lat = undefined;
            lon = undefined;
            x = undefined;
            y = undefined;
        } else {
            // Moon or Mars - require X and Y coordinates
            x = parseFloat(document.getElementById('eventEditX').value);
            y = parseFloat(document.getElementById('eventEditY').value);
            if (isNaN(x) || isNaN(y)) {
                alert('Please fill in X and Y coordinates (0-100)');
                return;
            }
            if (x < 0 || x > 100 || y < 0 || y > 100) {
                alert('X and Y coordinates must be between 0 and 100');
                return;
            }
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
                    image: '', // Auto-detect
                    locationType: variant.locationType || 'earth'
                };
                
                // Include coordinates based on location type
                if (variant.locationType === 'earth') {
                    if (variant.lat !== undefined) {
                        variantObj.lat = variant.lat;
                    }
                    if (variant.lon !== undefined) {
                        variantObj.lon = variant.lon;
                    }
                } else if (variant.locationType === 'station') {
                    // Station events don't need coordinates - marker is placed on ISS automatically
                    // Don't add any coordinates
                } else {
                    if (variant.x !== undefined) {
                        variantObj.x = variant.x;
                    }
                    if (variant.y !== undefined) {
                        variantObj.y = variant.y;
                    }
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
            // For multi-events, use first variant's location type and coordinates
            const firstVariant = variants[0];
            const firstVariantLocationType = firstVariant && firstVariant.locationType ? firstVariant.locationType : locationType;
            event = {
                locationType: firstVariantLocationType,
                cityDisplayName: cityDisplayName || undefined,
                variants: variants
            };
            // Add coordinates for backward compatibility
            if (firstVariantLocationType === 'earth') {
                event.lat = firstVariant && firstVariant.lat !== undefined ? firstVariant.lat : lat;
                event.lon = firstVariant && firstVariant.lon !== undefined ? firstVariant.lon : lon;
            } else if (firstVariantLocationType === 'station') {
                // Station events don't need coordinates - marker is placed on ISS automatically
                // Don't add any coordinates
            } else {
                event.x = firstVariant && firstVariant.x !== undefined ? firstVariant.x : x;
                event.y = firstVariant && firstVariant.y !== undefined ? firstVariant.y : y;
            }
        } else {
            // Regular single event
            const cityDisplayName = document.getElementById('eventEditCityDisplayName').value.trim();
            event = {
                name: mainName,
                locationType: locationType,
                cityDisplayName: cityDisplayName || undefined,
                description: mainDescription,
                image: '', // Auto-detect
                filters: mainData.filters,
                factions: mainData.factions,
                sources: mainSources.length > 0 ? mainSources : undefined
            };
            // Add coordinates based on location type
            if (locationType === 'earth') {
                event.lat = lat;
                event.lon = lon;
            } else if (locationType === 'station') {
                // Station events don't need coordinates - marker is placed on ISS automatically
                // Don't add any coordinates
            } else {
                event.x = x;
                event.y = y;
            }
        }

        // Get event number (position) from input
        const eventNumberInput = document.getElementById('eventEditNumber');
        let targetPosition = null;
        if (eventNumberInput && eventNumberInput.value) {
            const eventNumber = parseInt(eventNumberInput.value);
            if (!isNaN(eventNumber) && eventNumber >= 1) {
                targetPosition = eventNumber - 1; // Convert to 0-indexed
                // Clamp to valid range
                const maxPosition = this.editingIndex === null ? this.events.length : this.events.length - 1;
                targetPosition = Math.min(targetPosition, maxPosition);
            }
        }
        
        if (this.editingIndex === null) {
            // Add new event
            if (targetPosition !== null && targetPosition <= this.events.length) {
                // Insert at specified position
                this.events.splice(targetPosition, 0, event);
                // Update unsaved indices - shift all indices >= targetPosition
                const newUnsaved = new Set();
                this.unsavedEventIndices.forEach(oldIndex => {
                    if (oldIndex >= targetPosition) {
                        newUnsaved.add(oldIndex + 1);
                    } else {
                        newUnsaved.add(oldIndex);
                    }
                });
                newUnsaved.add(targetPosition);
                this.unsavedEventIndices = newUnsaved;
                
                // Navigate to page containing the new event
                const eventPage = Math.ceil((targetPosition + 1) / this.eventsPerPage);
                this.currentPage = eventPage;
            } else {
                // Add at end (default behavior)
                const newIndex = this.events.length;
                this.events.push(event);
                this.unsavedEventIndices.add(newIndex);
                
                // Go to the last page to show the newly added event
                const totalPages = Math.ceil(this.events.length / this.eventsPerPage);
                this.currentPage = totalPages;
            }
        } else {
            // Update existing event
            const oldIndex = this.editingIndex;
            
            if (targetPosition !== null && targetPosition !== oldIndex) {
                // Move event to new position
                // Clamp target position to valid range
                const maxPosition = this.events.length - 1;
                const clampedTargetPosition = Math.min(targetPosition, maxPosition);
                
                if (clampedTargetPosition === oldIndex) {
                    // Position didn't actually change after clamping, just update in place
                    this.events[oldIndex] = event;
                    this.unsavedEventIndices.add(oldIndex);
                    const eventPage = Math.ceil((oldIndex + 1) / this.eventsPerPage);
                    this.currentPage = eventPage;
                } else {
                    // Remove from old position
                    const [movedEvent] = this.events.splice(oldIndex, 1);
                    
                    // Adjust target position if removing before it
                    const adjustedTargetPosition = clampedTargetPosition > oldIndex ? clampedTargetPosition - 1 : clampedTargetPosition;
                    
                    // Insert at new position
                    this.events.splice(adjustedTargetPosition, 0, event);
                    
                    // Update unsaved indices
                    const newUnsaved = new Set();
                    this.unsavedEventIndices.forEach(oldIdx => {
                        if (oldIdx === oldIndex) {
                            // This event moved to adjustedTargetPosition
                            newUnsaved.add(adjustedTargetPosition);
                        } else if (oldIndex < adjustedTargetPosition) {
                            // Moving forward: indices between old and new shift back by 1
                            if (oldIdx > oldIndex && oldIdx <= adjustedTargetPosition) {
                                newUnsaved.add(oldIdx - 1);
                            } else {
                                newUnsaved.add(oldIdx);
                            }
                        } else {
                            // Moving backward: indices between new and old shift forward by 1
                            if (oldIdx >= adjustedTargetPosition && oldIdx < oldIndex) {
                                newUnsaved.add(oldIdx + 1);
                            } else {
                                newUnsaved.add(oldIdx);
                            }
                        }
                    });
                    // Ensure the moved event is marked as unsaved
                    newUnsaved.add(adjustedTargetPosition);
                    this.unsavedEventIndices = newUnsaved;
                    
                    // Navigate to page containing the moved event
                    const eventPage = Math.ceil((adjustedTargetPosition + 1) / this.eventsPerPage);
                    this.currentPage = eventPage;
                }
            } else {
                // Update in place (no position change)
                this.events[oldIndex] = event;
                this.unsavedEventIndices.add(oldIndex);
                
                // Stay on the current page where the edited event is
                const eventPage = Math.ceil((oldIndex + 1) / this.eventsPerPage);
                this.currentPage = eventPage;
            }
        }

        this.renderEvents();
        this.closeEditModal();
        
        // Refresh globe markers to reflect changes (remove old markers, add new ones)
        this.refreshGlobeEvents();
    }
}

// Initialize EventManager when DOM is ready
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
}

