/**
 * EventFormService - Handles form management for event editing
 * Separates form UI logic from event management logic
 */

class EventFormService {
    constructor() {
        this.eventManager = null; // Reference to EventManager (for state access)
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
        if (!this.eventManager) return;
        
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
     * @param {string} locationType - 'earth', 'moon', 'mars', or 'station'
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
        // Initialize with one variant (always show tabs)
        this.eventManager.variantData = [{
            name: '',
            description: '',
            filters: [],
            factions: [],
            sources: [],
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
                sources: []
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
            // Load all variants into variantData, including locationType, lat/lon, x/y, and cityDisplayName
            this.eventManager.variantData = event.variants.map(variant => ({
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
            this.eventManager.activeVariantIndex = 0;
        } else {
            // Single event - convert to variantData with one variant
            this.eventManager.variantData = [{
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
     * Setup autocomplete for filters/factions input
     * @param {HTMLElement} input - Input element
     * @param {Array} options - Array of option strings
     * @param {string} type - Type of autocomplete ('heroes' or 'factions')
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
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventFormService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventFormService = new EventFormService();
}
