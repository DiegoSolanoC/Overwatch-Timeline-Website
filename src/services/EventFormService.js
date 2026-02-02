/**
 * EventFormService - Handles form management for event editing
 * Separates form UI logic from event management logic
 */

class EventFormService {
    constructor() {
        this.eventManager = null; // Reference to EventManager (for state access)
        this.locationFieldManager = new (window.LocationFieldManager || LocationFieldManager)();
        this.sourceFieldManager = new (window.SourceFieldManager || SourceFieldManager)();
        this.headlinesFieldManager = new (window.HeadlinesFieldManager || HeadlinesFieldManager)();
        this.autocompleteService = new (window.FormAutocompleteService || FormAutocompleteService)();
    }

    /**
     * Set the EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }

    /**
     * Setup location type change handler
     */
    setupLocationTypeHandler() {
        this.locationFieldManager.setupLocationTypeHandler();
    }

    /**
     * Set location type and update UI (buttons and hidden input)
     * @param {string} locationType - 'earth', 'moon', 'mars', or 'station'
     */
    setLocationType(locationType) {
        this.locationFieldManager.setLocationType(locationType);
    }

    /**
     * Update location fields based on selected location type
     */
    updateLocationFields() {
        this.locationFieldManager.updateLocationFields();
    }

    /**
     * Add a new source pair
     */
    addSourcePair() {
        this.sourceFieldManager.addSourcePair();
    }
    
    /**
     * Remove the last source pair (but keep at least one)
     */
    removeLastSourcePair() {
        this.sourceFieldManager.removeLastSourcePair();
    }
    
    /**
     * Clear all source pairs and reset to one empty pair
     */
    clearSourcePairs() {
        this.sourceFieldManager.clearSourcePairs();
    }
    
    /**
     * Update the visibility of the remove source button
     */
    updateRemoveSourceButton() {
        this.sourceFieldManager.updateRemoveSourceButton();
    }

    /**
     * Add a new headline field
     */
    addHeadlineField() {
        this.headlinesFieldManager.addHeadlineField();
    }
    
    /**
     * Remove the last headline field (but keep at least one)
     */
    removeLastHeadlineField() {
        this.headlinesFieldManager.removeLastHeadlineField();
    }
    
    /**
     * Clear all headline fields and reset to one empty field
     */
    clearHeadlineFields() {
        this.headlinesFieldManager.clearHeadlineFields();
    }
    
    /**
     * Update the visibility of the remove headline button
     */
    updateRemoveHeadlineButton() {
        this.headlinesFieldManager.updateRemoveHeadlineButton();
    }

    /**
     * Clear edit form
     */
    clearEditForm() {
        if (!this.eventManager) return;
        
        document.getElementById('eventEditName').value = '';
        // Set default event number to position after last event (1-indexed)
        const defaultEventNumber = this.eventManager.events.length + 1;
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
        // Clear all headline fields and reset to one
        this.clearHeadlineFields();
        // Initialize with one variant (always show tabs)
        this.eventManager.variantData = [{
            name: '',
            description: '',
            filters: [],
            factions: [],
            sources: [],
            headlines: [],
            locationType: 'earth'
        }];
        this.eventManager.activeVariantIndex = 0;
        this.updateVariantTabs();
    }

    /**
     * Save current form data to active variant in memory
     */
    saveCurrentVariantToMemory() {
        if (!this.eventManager || this.eventManager.variantData.length === 0) return;
        
        const variant = this.eventManager.variantData[this.eventManager.activeVariantIndex];
        if (!variant) return;
        
        variant.name = document.getElementById('eventEditName').value.trim();
        variant.description = document.getElementById('eventEditDescription').value.trim();
        const filtersStr = document.getElementById('eventEditFilters').value.trim();
        variant.filters = filtersStr ? filtersStr.split(',').map(f => f.trim()).filter(f => f) : [];
        const factionsStr = document.getElementById('eventEditFactions').value.trim();
        const factionDisplayNames = factionsStr ? factionsStr.split(',').map(f => f.trim()).filter(f => f) : [];
        variant.factions = factionDisplayNames.map(displayName => {
            const found = this.eventManager.factions.find(f => f.displayName.toLowerCase() === displayName.toLowerCase());
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
        variant.sources = this.sourceFieldManager.getSourcePairsData();
        
        // Save headlines from all headline fields
        const headlines = this.headlinesFieldManager.getHeadlinesData();
        
        // IMPORTANT: Always preserve existing headlines if form is empty but variant had headlines
        // This prevents losing headlines when switching variants or when form fields are cleared
        if (headlines.length > 0) {
            variant.headlines = headlines;
        } else if (variant.headlines && Array.isArray(variant.headlines) && variant.headlines.length > 0) {
            // Form is empty but variant has headlines - keep existing headlines
            console.log(`EventFormService: Preserving existing headlines for variant ${this.eventManager.activeVariantIndex}:`, variant.headlines);
        } else {
            // No headlines in form and no existing headlines - set to undefined
            variant.headlines = undefined;
        }
        
        // Debug logging
        console.log(`EventFormService: Saved variant ${this.eventManager.activeVariantIndex} headlines:`, variant.headlines, 'from form:', headlines);
        console.log(`EventFormService: Full variant after save:`, JSON.stringify(variant).substring(0, 300));
    }

    /**
     * Save all variants to memory (ensures all variants have their current form data saved)
     */
    saveAllVariantsToMemory() {
        if (!this.eventManager || this.eventManager.variantData.length === 0) return;
        
        // Save current variant first (this is the only one we can save from the form)
        this.saveCurrentVariantToMemory();
        
        // Debug: Log all variants after saving
        console.log('EventFormService: All variants after saveAllVariantsToMemory:', 
            this.eventManager.variantData.map((v, i) => ({
                index: i,
                name: v.name,
                headlines: v.headlines,
                headlinesLength: Array.isArray(v.headlines) ? v.headlines.length : 'undefined'
            }))
        );
        
        // Note: Other variants should already be saved when switching between them
        // This method ensures the current variant is saved before operations like saving the event
    }

    /**
     * Load variant data into form
     */
    loadVariantToForm(variantIndex) {
        if (!this.eventManager) return;
        
        if (variantIndex < 0 || variantIndex >= this.eventManager.variantData.length) return;
        
        // Only save current variant if we're switching (not initial load)
        if (this.eventManager.variantData.length > 0 && this.eventManager.activeVariantIndex >= 0 && this.eventManager.activeVariantIndex < this.eventManager.variantData.length) {
            this.saveCurrentVariantToMemory(); // Save current before switching
        }
        
        this.eventManager.activeVariantIndex = variantIndex;
        const variant = this.eventManager.variantData[variantIndex];
        
        document.getElementById('eventEditName').value = variant.name || '';
        document.getElementById('eventEditDescription').value = variant.description || '';
        document.getElementById('eventEditFilters').value = (variant.filters || []).join(', ');
        const displayFactions = (variant.factions || []).map(f => {
            const faction = this.eventManager.factions.find(fac => fac.filename === f);
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
            if (this.eventManager.editingIndex !== null && this.eventManager.editingIndex !== undefined) {
                const mainEvent = this.eventManager.events[this.eventManager.editingIndex];
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
        this.sourceFieldManager.loadSources(variant.sources || []);
        
        // Load headlines into headline fields
        this.headlinesFieldManager.loadHeadlines(variant.headlines || []);
    }

    /**
     * Update variant tabs UI
     */
    updateVariantTabs() {
        if (!this.eventManager) return;
        
        const tabsContainer = document.getElementById('eventVariantTabs');
        const deleteVariantBtn = document.getElementById('eventEditDeleteVariant');
        
        if (!tabsContainer) return;
        
        // Always show tabs (no checkbox needed)
        if (this.eventManager.variantData.length === 0) {
            tabsContainer.style.display = 'none';
            if (deleteVariantBtn) deleteVariantBtn.style.display = 'none';
            return;
        }
        
        tabsContainer.style.display = 'flex';
        tabsContainer.innerHTML = '';
        
        // Create tab for each variant
        this.eventManager.variantData.forEach((variant, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.type = 'button';
            tabBtn.className = 'variant-tab-btn';
            tabBtn.textContent = (index + 1).toString();
            tabBtn.dataset.variantIndex = index;
            if (index === this.eventManager.activeVariantIndex) {
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
                headlines: [],
                locationType: currentLocationType
            };
            
            if (currentLocationType === 'earth') {
                newVariant.lat = currentLat ? parseFloat(currentLat) : undefined;
                newVariant.lon = currentLon ? parseFloat(currentLon) : undefined;
            } else {
                newVariant.x = currentX ? parseFloat(currentX) : undefined;
                newVariant.y = currentY ? parseFloat(currentY) : undefined;
            }
            
            this.eventManager.variantData.push(newVariant);
            this.loadVariantToForm(this.eventManager.variantData.length - 1);
            this.updateVariantTabs();
        });
        tabsContainer.appendChild(addTabBtn);
        
        // Add delete button (red with "-") next to the add button
        if (this.eventManager.variantData.length > 1) {
            const deleteTabBtn = document.createElement('button');
            deleteTabBtn.type = 'button';
            deleteTabBtn.className = 'variant-tab-btn delete-variant-tab-btn';
            deleteTabBtn.textContent = '-';
            deleteTabBtn.addEventListener('click', () => {
                this.deleteVariant(this.eventManager.activeVariantIndex);
            });
            tabsContainer.appendChild(deleteTabBtn);
        }
    }
    
    /**
     * Delete a variant
     */
    deleteVariant(variantIndex) {
        if (!this.eventManager) return;
        
        if (this.eventManager.variantData.length <= 1) {
            // Can't delete the last variant - just clear it
            this.handleDeleteCurrentVariant();
            return;
        }
        
        if (variantIndex < 0 || variantIndex >= this.eventManager.variantData.length) return;
        
        // Remove the variant
        this.eventManager.variantData.splice(variantIndex, 1);
        
        // Adjust active index if needed
        if (this.eventManager.activeVariantIndex >= this.eventManager.variantData.length) {
            this.eventManager.activeVariantIndex = this.eventManager.variantData.length - 1;
        } else if (this.eventManager.activeVariantIndex > variantIndex) {
            this.eventManager.activeVariantIndex--;
        }
        
        // Reload the form with the new active variant
        this.loadVariantToForm(this.eventManager.activeVariantIndex);
        this.updateVariantTabs();
    }

    /**
     * Handle delete current variant button
     */
    handleDeleteCurrentVariant() {
        if (!this.eventManager) return;
        
        if (this.eventManager.variantData.length === 1) {
            // Only one variant - wipe out all info instead
            document.getElementById('eventEditName').value = '';
            document.getElementById('eventEditDescription').value = '';
            document.getElementById('eventEditFilters').value = '';
            document.getElementById('eventEditFactions').value = '';
            this.clearSourcePairs();
            this.eventManager.variantData[0] = {
                name: '',
                description: '',
                filters: [],
                factions: [],
                sources: [],
                headlines: []
            };
        } else {
            // Multiple variants - delete current one
            this.deleteVariant(this.eventManager.activeVariantIndex);
        }
    }

    /**
     * Populate edit form with event data
     */
    populateEditForm(event) {
        if (!this.eventManager) return;
        
        // Clear any existing variant data first
        this.eventManager.variantData = [];
        this.eventManager.activeVariantIndex = 0;
        
        // Set event number to current position (1-indexed)
        const eventNumberInput = document.getElementById('eventEditNumber');
        if (eventNumberInput && this.eventManager.editingIndex !== null) {
            eventNumberInput.value = this.eventManager.editingIndex + 1;
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
            // Load all variants into variantData, including locationType, lat/lon, x/y, cityDisplayName, and headlines
            this.eventManager.variantData = event.variants.map(variant => ({
                name: variant.name || '',
                description: variant.description || '',
                filters: variant.filters || [],
                factions: variant.factions || [],
                sources: variant.sources || [],
                headlines: variant.headlines || [],
                locationType: variant.locationType || mainLocationType,
                lat: variant.lat !== undefined ? variant.lat : undefined,
                lon: variant.lon !== undefined ? variant.lon : undefined,
                x: variant.x !== undefined ? variant.x : undefined,
                y: variant.y !== undefined ? variant.y : undefined,
                cityDisplayName: variant.cityDisplayName || undefined
            }));
            this.eventManager.activeVariantIndex = 0;
        } else {
            // Single event - convert to variantData with one variant
            this.eventManager.variantData = [{
                name: event.name || '',
                description: event.description || '',
                filters: event.filters || [],
                factions: event.factions || [],
                sources: event.sources || [],
                headlines: event.headlines || [],
                locationType: event.locationType || 'earth',
                lat: event.lat !== undefined ? event.lat : undefined,
                lon: event.lon !== undefined ? event.lon : undefined,
                x: event.x !== undefined ? event.x : undefined,
                y: event.y !== undefined ? event.y : undefined,
                cityDisplayName: event.cityDisplayName || undefined
            }];
            this.eventManager.activeVariantIndex = 0;
        }
        
        // Now load the first variant into the form (no need to save since variantData was just cleared)
        if (this.eventManager.variantData.length > 0) {
            const variant = this.eventManager.variantData[0];
            document.getElementById('eventEditName').value = variant.name || '';
            document.getElementById('eventEditDescription').value = variant.description || '';
            document.getElementById('eventEditFilters').value = (variant.filters || []).join(', ');
            const displayFactions = (variant.factions || []).map(f => {
                const faction = this.eventManager.factions.find(fac => fac.filename === f);
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
            // Note: cityDisplayName was already set above, so only override if variant has its own
            if (variant.cityDisplayName !== undefined && variant.cityDisplayName !== null && variant.cityDisplayName !== '') {
                document.getElementById('eventEditCityDisplayName').value = variant.cityDisplayName;
            }
            // Otherwise, keep the value we already set above (from event or first variant)
            
            // Load sources into source pairs
            this.sourceFieldManager.loadSources(variant.sources || []);
            
            // Load headlines into headline fields
            this.headlinesFieldManager.loadHeadlines(variant.headlines || []);
        }
        
        this.updateVariantTabs();
    }

    /**
     * Setup autocomplete for filters/factions input
     * @param {HTMLElement} input - Input element
     * @param {Array} options - Array of option strings
     * @param {string} type - Type of autocomplete ('heroes' or 'factions')
     */
    setupAutocomplete(input, options, type) {
        this.autocompleteService.setupAutocomplete(input, options, type);
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventFormService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventFormService = new EventFormService();
}
