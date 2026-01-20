/**
 * EventDataService - Handles event data loading, saving, and location data management
 * Separates data operations from UI logic
 */

class EventDataService {
    constructor() {
        this.events = [];
        this.cities = [];
        this.fictionalCities = [];
        this.airports = [];
        this.seaports = [];
        this.heroes = [];
        this.factions = [];
        this.displayNames = {};
        this.locationCache = new Map();
    }

    /**
     * Helper function to update status (if available)
     */
    updateStatus(message, type = 'info') {
        if (typeof window.updateStatus === 'function') {
            window.updateStatus(message, type);
        }
    }

    /**
     * Check if we're running on GitHub Pages
     */
    isGitHubPages() {
        const hostname = window.location.hostname;
        return hostname === 'github.io' || 
               hostname.includes('github.io') || 
               hostname === 'pages.github.com';
    }

    /**
     * Load locations data (cities, airports, seaports, heroes, factions)
     */
    async loadLocationsData() {
        // Load all data in parallel for better performance
        this.updateStatus('EventDataService: Starting data fetch (3 files in parallel)...', 'info');
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
        
        this.updateStatus('EventDataService: Fetching locations.json...', 'info');
        const [locationsResult, displayNamesResult, manifestResult] = await Promise.allSettled([
            fetchWithTimeout('data/locations.json').then(data => {
                this.updateStatus('EventDataService: locations.json response received, parsing...', 'info');
                return data;
            }),
            fetchWithTimeout('data/location-display-names.json').then(data => {
                this.updateStatus('EventDataService: location-display-names.json response received, parsing...', 'info');
                return data;
            }),
            fetchWithTimeout('manifest.json').then(data => {
                this.updateStatus('EventDataService: manifest.json response received, parsing...', 'info');
                return data;
            })
        ]);
        
        const fetchTime = performance.now() - fetchStartTime;
        this.updateStatus(`EventDataService: All 3 files fetched (${fetchTime.toFixed(0)}ms)`, 'success');
        
        // Process locations data
        this.updateStatus('EventDataService: Processing locations.json data...', 'info');
        if (locationsResult.status === 'fulfilled') {
            const data = locationsResult.value;
            this.cities = data.cities || [];
            this.fictionalCities = data.fictionalCities || [];
            this.airports = data.airports || [];
            this.seaports = data.seaports || [];
            this.updateStatus(`EventDataService: Processed ${this.cities.length} cities, ${this.fictionalCities.length} fictional cities, ${this.airports.length} airports, ${this.seaports.length} seaports`, 'success');
        } else {
            console.error('Error loading locations data:', locationsResult.reason);
            this.updateStatus('EventDataService: Error loading locations.json', 'error');
        }
        
        // Process display names
        this.updateStatus('EventDataService: Processing location-display-names.json data...', 'info');
        if (displayNamesResult.status === 'fulfilled') {
            const displayNamesData = displayNamesResult.value;
            this.displayNames = displayNamesData.displayNames || {};
            const displayNamesCount = Object.keys(this.displayNames).length;
            this.updateStatus(`EventDataService: Processed ${displayNamesCount} display name mappings`, 'success');
        } else {
            console.error('Error loading display names:', displayNamesResult.reason);
            this.displayNames = {};
            this.updateStatus('EventDataService: Error loading location-display-names.json', 'error');
        }
        
        // Process manifest
        this.updateStatus('EventDataService: Processing manifest.json data...', 'info');
        if (manifestResult.status === 'fulfilled') {
            const manifest = manifestResult.value;
            this.heroes = manifest.heroes || [];
            // Store full faction objects (with filename, displayName, number)
            this.factions = manifest.factions || [];
            this.updateStatus(`EventDataService: Processed ${this.heroes.length} heroes, ${this.factions.length} factions`, 'success');
        } else {
            console.error('Error loading manifest:', manifestResult.reason);
            this.updateStatus('EventDataService: Error loading manifest.json', 'error');
        }
    }

    /**
     * Load events from localStorage or fetch from events.json
     */
    async loadEvents() {
        // First, always try to load from events.json (source of truth)
        let fileEventCount = 0;
        let fileEvents = null;
        this.updateStatus('EventDataService: Starting events load process...', 'info');
        
        this.updateStatus('EventDataService: Fetching events.json file...', 'info');
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
            this.updateStatus(`EventDataService: events.json fetch completed (${fetchTime.toFixed(0)}ms)`, 'info');
            
            if (data && data.events && Array.isArray(data.events) && data.events.length > 0) {
                fileEvents = data.events;
                fileEventCount = data.events.length;
                console.log('EventDataService: ✓ Successfully loaded', fileEventCount, 'events from data/events.json');
                this.updateStatus(`EventDataService: Found ${fileEventCount} events in events.json`, 'success');
            } else {
                console.warn('EventDataService: events.json loaded but has no events array or is empty', data);
                this.updateStatus('EventDataService: events.json has no events array or is empty', 'warning');
            }
        } catch (error) {
            console.error('EventDataService: ✗ CRITICAL - Could not load from data/events.json:', error);
            console.error('EventDataService: Error details:', {
                message: error.message,
                stack: error.stack,
                url: 'data/events.json'
            });
            this.updateStatus(`EventDataService: events.json fetch error: ${error.message}`, 'error');
            this.updateStatus('EventDataService: Will try localStorage if available', 'info');
        }
        
        // Check localStorage for comparison
        this.updateStatus('EventDataService: Checking localStorage for saved events...', 'info');
        const localStorageStartTime = performance.now();
        const savedEvents = localStorage.getItem('timelineEvents');
        const localStorageTime = performance.now() - localStorageStartTime;
        this.updateStatus(`EventDataService: localStorage access completed (${localStorageTime.toFixed(0)}ms)`, 'info');
        console.log('EventDataService: Checking localStorage for events...');
        console.log('EventDataService: localStorage.getItem("timelineEvents") =', savedEvents ? 'Found data (' + savedEvents.length + ' chars)' : 'null');
        
        if (savedEvents) {
            try {
                this.updateStatus('EventDataService: Parsing localStorage events...', 'info');
                const parseStartTime = performance.now();
                const localStorageEvents = JSON.parse(savedEvents);
                const parseTime = performance.now() - parseStartTime;
                this.updateStatus(`EventDataService: localStorage parsed (${parseTime.toFixed(0)}ms)`, 'info');
                
                const localStorageCount = localStorageEvents.length;
                console.log('EventDataService: Found', localStorageCount, 'events in localStorage');
                this.updateStatus(`EventDataService: Found ${localStorageCount} events in localStorage`, 'success');
                
                // On GitHub Pages, always prefer events.json (source of truth) since users can't edit
                // On localhost, prefer localStorage if it has user's saved changes, but use file if file has more events
                const isGitHubPages = this.isGitHubPages();
                
                if (fileEvents && fileEventCount > 0) {
                    // CRITICAL FIX: On GitHub Pages, ALWAYS use events.json if it exists (source of truth)
                    // This ensures GitHub Pages never uses stale localStorage
                    if (isGitHubPages) {
                        console.log(`EventDataService [GitHub Pages]: ALWAYS using events.json (${fileEventCount} events) - localStorage has ${localStorageCount} events (ignored)`);
                        this.updateStatus(`EventDataService: Using events.json (${fileEventCount} events) - GitHub Pages mode`, 'info');
                        this.events = fileEvents;
                        // Clear old localStorage and save fresh data
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        return { events: this.events, source: 'file', shouldSync: true };
                    }
                    
                    // On localhost: Use file if it has more events (even just 1 more), otherwise prefer localStorage
                    if (fileEventCount > localStorageCount) {
                        console.log(`EventDataService [Localhost]: Using events.json (${fileEventCount} events, file has more than localStorage (${localStorageCount}))`);
                        this.updateStatus(`EventDataService: Using events.json (${fileEventCount} events, file has more than localStorage)`, 'info');
                        this.events = fileEvents;
                        // Clear old localStorage and save fresh data
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        return { events: this.events, source: 'file', shouldSync: true };
                    }
                    
                    // On localhost: localStorage has same or more events, prefer it (user's saved changes)
                    console.log('EventDataService [Localhost]: Using localStorage version (user\'s saved changes) -', localStorageCount, 'events');
                    this.updateStatus(`EventDataService: Using localStorage (${localStorageCount} events, user's saved changes)`, 'info');
                }
                
                // Use localStorage (user's saved changes take priority on localhost)
                this.events = localStorageEvents;
                console.log('EventDataService: Using localStorage version (', this.events.length, 'events)');
                console.log('EventDataService: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
                this.updateStatus(`EventDataService: Using ${this.events.length} events from localStorage`, 'success');
                
                // CRITICAL: On GitHub Pages, always prefer file if it has more events (even if localStorage exists)
                // On localhost, update if file has significantly more events (5+ more) or localStorage is outdated
                if (fileEvents && fileEventCount > 0) {
                    if (isGitHubPages && fileEventCount > this.events.length) {
                        // GitHub Pages: Always use file if it has more events
                        console.warn(`EventDataService [GitHub Pages]: localStorage has ${this.events.length} events, but events.json has ${fileEventCount}. Using events.json (source of truth).`);
                        this.updateStatus(`EventDataService: Updating from events.json (${fileEventCount} events, localStorage had ${this.events.length})`, 'warning');
                        this.events = fileEvents;
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        return { events: this.events, source: 'file', shouldSync: true };
                    } else if (!isGitHubPages && fileEventCount > this.events.length + 4) {
                        // Localhost: Only update if file has 5+ more events (user might have local edits)
                        console.warn(`EventDataService [Localhost]: localStorage has ${this.events.length} events, but events.json has ${fileEventCount} (${fileEventCount - this.events.length} more). Using events.json.`);
                        this.updateStatus(`EventDataService: Updating from events.json (${fileEventCount} events, localStorage had ${this.events.length})`, 'warning');
                        this.events = fileEvents;
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        return { events: this.events, source: 'file', shouldSync: true };
                    } else if (!isGitHubPages && this.events.length < 58 && fileEventCount >= 58) {
                        // Localhost: Update if localStorage is clearly outdated (< 58) and file has current data
                        console.warn(`EventDataService: localStorage has ${this.events.length} events (outdated), but events.json has ${fileEventCount}. Using events.json.`);
                        this.updateStatus(`EventDataService: Updating from events.json (${fileEventCount} events, localStorage had ${this.events.length})`, 'warning');
                        this.events = fileEvents;
                        localStorage.removeItem('timelineEvents');
                        this.saveEvents();
                        return { events: this.events, source: 'file', shouldSync: true };
                    }
                }
                
                return { events: this.events, source: 'localStorage', shouldSync: true };
            } catch (error) {
                console.error('EventDataService: Error parsing saved events:', error);
                console.error('EventDataService: Raw data:', savedEvents.substring(0, 200));
                this.updateStatus('EventDataService: Error parsing localStorage (corrupted?), trying events.json...', 'error');
                // If localStorage is corrupted, clear it and use file
                if (fileEvents && fileEventCount > 0) {
                    console.log('EventDataService: localStorage corrupted, using file version');
                    this.updateStatus(`EventDataService: Using events.json (${fileEventCount} events, localStorage was corrupted)`, 'info');
                    localStorage.removeItem('timelineEvents');
                    this.events = fileEvents;
                    this.saveEvents();
                    return { events: this.events, source: 'file', shouldSync: true };
                }
            }
        }

        // If no localStorage, use events.json if available
        if (fileEvents && fileEventCount > 0) {
            this.events = fileEvents;
            console.log('EventDataService: Loaded', this.events.length, 'events from data/events.json');
            console.log('EventDataService: Event names:', this.events.map(e => e.name || (e.variants && e.variants[0]?.name) || 'Unnamed'));
            this.updateStatus(`EventDataService: Using ${this.events.length} events from events.json`, 'success');
            
            // Check if we have a reasonable number of events (at least 50)
            // If not, clear localStorage to force fresh load
            if (this.events.length < 50) {
                console.warn(`EventDataService: Event count is less than expected (${this.events.length} < 50). Clearing localStorage to force fresh load.`);
                localStorage.removeItem('timelineEvents');
                this.updateStatus(`EventDataService: Cleared localStorage (found ${this.events.length} events, expected at least 50)`, 'warning');
            }
            
            // Save to localStorage for future use
            this.saveEvents();
            
            return { events: this.events, source: 'file', shouldSync: true };
        }

        // CRITICAL: If events.json failed to load, try localStorage as fallback (even on GitHub Pages)
        // This prevents "No events" error if events.json has a temporary loading issue
        if (savedEvents) {
            try {
                const fallbackEvents = JSON.parse(savedEvents);
                if (Array.isArray(fallbackEvents) && fallbackEvents.length > 0) {
                    console.warn('EventDataService: events.json failed to load, using localStorage as fallback');
                    this.updateStatus(`EventDataService: Using localStorage fallback (${fallbackEvents.length} events) - events.json unavailable`, 'warning');
                    this.events = fallbackEvents;
                    return { events: this.events, source: 'localStorage-fallback', shouldSync: true };
                }
            } catch (e) {
                console.error('EventDataService: localStorage fallback also failed:', e);
            }
        }

        // No events available from any source
        this.events = [];
        console.error('EventDataService: CRITICAL - No events found from events.json or localStorage!');
        this.updateStatus('EventDataService: ERROR - No events found. Check events.json file.', 'error');
        
        return { events: this.events, source: 'none', shouldSync: true };
    }

    /**
     * Save events to localStorage
     */
    saveEvents() {
        localStorage.setItem('timelineEvents', JSON.stringify(this.events));
        console.log('EventDataService: Events saved to localStorage');
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
        console.log('EventDataService: Events exported');
    }

    /**
     * Import events from JSON file
     */
    importEvents(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.events && Array.isArray(data.events)) {
                        this.events = data.events;
                        this.saveEvents();
                        console.log('EventDataService: Events imported:', this.events.length);
                        resolve({ success: true, count: this.events.length });
                    } else {
                        throw new Error('Invalid file format: expected { events: [...] }');
                    }
                } catch (error) {
                    console.error('EventDataService: Error importing events:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
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

        // Search in airports
        const airport = this.airports.find(a => 
            a.name.toLowerCase() === searchName ||
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
     * Get display name for a location
     */
    getDisplayName(locationName) {
        return this.displayNames[locationName] || locationName;
    }

    /**
     * Get all events
     */
    getEvents() {
        return this.events;
    }

    /**
     * Set events
     */
    setEvents(events) {
        this.events = events;
    }

    /**
     * Get location data
     */
    getLocationData() {
        return {
            cities: this.cities,
            fictionalCities: this.fictionalCities,
            airports: this.airports,
            seaports: this.seaports,
            heroes: this.heroes,
            factions: this.factions,
            displayNames: this.displayNames
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventDataService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventDataService = new EventDataService();
}
