/**
 * EventEditService - Handles event CRUD operations
 * Separates event creation, update, and deletion logic from UI management
 */

class EventEditService {
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
     * Delete an event at the specified index
     * @param {number} index - Index of event to delete
     * @returns {Object} Result object with success status and updated state
     */
    deleteEvent(index) {
        if (!this.eventManager) {
            console.error('EventEditService: EventManager not set!');
            return { success: false };
        }

        // Prevent deletion on GitHub Pages
        if (this.eventManager.isGitHubPages && this.eventManager.isGitHubPages()) {
            console.log('Event deletion is disabled on GitHub Pages');
            return { success: false, reason: 'github-pages' };
        }

        const events = this.eventManager.events;
        if (index < 0 || index >= events.length) {
            return { success: false, reason: 'invalid-index' };
        }

        // Check if we need to adjust pagination
        const totalPages = Math.ceil(events.length / this.eventManager.eventsPerPage);
        const currentPageStartIndex = (this.eventManager.currentPage - 1) * this.eventManager.eventsPerPage;
        const currentPageEndIndex = currentPageStartIndex + this.eventManager.eventsPerPage;
        
        // Remove the event
        const deletedEvent = events.splice(index, 1)[0];
        
        // Update indices for events after the deleted one
        const newUnsaved = new Set();
        this.eventManager.unsavedEventIndices.forEach(oldIndex => {
            if (oldIndex < index) {
                newUnsaved.add(oldIndex);
            } else if (oldIndex > index) {
                newUnsaved.add(oldIndex - 1);
            }
        });
        this.eventManager.unsavedEventIndices = newUnsaved;
        
        // Mark all remaining events as unsaved after deletion
        events.forEach((_, idx) => this.eventManager.unsavedEventIndices.add(idx));
        
        // Calculate new page
        const newTotalPages = Math.max(1, Math.ceil(events.length / this.eventManager.eventsPerPage));
        let newCurrentPage = this.eventManager.currentPage;
        if (newCurrentPage > newTotalPages) {
            newCurrentPage = newTotalPages;
        }
        
        // If we deleted the last item on the current page and it's not the first page, go to previous page
        if (events.length > 0 && index >= currentPageStartIndex && index < currentPageEndIndex) {
            const remainingOnPage = events.slice(currentPageStartIndex, currentPageEndIndex - 1).length;
            if (remainingOnPage === 0 && newCurrentPage > 1) {
                newCurrentPage--;
            }
        }

        return {
            success: true,
            deletedEvent: deletedEvent,
            newCurrentPage: newCurrentPage,
            newTotalPages: newTotalPages
        };
    }

    /**
     * Create a new event object from form data
     * @param {Object} formData - Form data object
     * @param {Array} variantData - Variant data array (for multi-events)
     * @param {Array} factions - Factions array for lookup
     * @returns {Object|null} Event object or null if validation fails
     */
    createEventFromForm(formData, variantData = [], factions = []) {
        const {
            locationType,
            lat,
            lon,
            x,
            y,
            mainName,
            mainDescription,
            mainFiltersStr,
            mainFactionsStr,
            mainSources,
            mainHeadlines,
            cityDisplayName
        } = formData;

        const isMultiEvent = variantData.length > 1;

        // Validate coordinates based on location type
        if (locationType === 'earth') {
            if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
                return { error: 'Please fill in Latitude and Longitude' };
            }
        } else if (locationType !== 'station') {
            // Moon or Mars - require X and Y coordinates
            if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
                return { error: 'Please fill in X and Y coordinates (0-100)' };
            }
            if (x < 0 || x > 100 || y < 0 || y > 100) {
                return { error: 'X and Y coordinates must be between 0 and 100' };
            }
        }

        if (!mainName) {
            return { error: 'Please fill in the required field (Title)' };
        }

        const processFiltersAndFactions = (filtersStr, factionsStr, availableFactions) => {
            const filters = filtersStr ? filtersStr.split(',').map(f => f.trim()).filter(f => f) : [];
            const factionDisplayNames = factionsStr ? factionsStr.split(',').map(f => f.trim()).filter(f => f) : [];
            const factionFilenames = factionDisplayNames.map(displayName => {
                const found = availableFactions.find(f => 
                    f.displayName.toLowerCase() === displayName.toLowerCase()
                );
                return found ? found.filename : displayName;
            });
            return { filters, factions: factionFilenames };
        };

        const mainData = processFiltersAndFactions(mainFiltersStr, mainFactionsStr, factions);
        
        let event;
        
        if (isMultiEvent) {
            // Collect variants from variantData
            const variants = variantData.map((variant, variantIndex) => {
                const variantData = processFiltersAndFactions(
                    (variant.filters || []).join(', '),
                    (variant.factions || []).map(f => {
                        const faction = factions.find(fac => fac.filename === f);
                        return faction ? faction.displayName : f.replace(/^\d+/, '').trim();
                    }).join(', '),
                    factions
                );
                
                // Preserve headlines - check if variant has headlines and they're valid
                let headlines = undefined;
                if (variant.headlines) {
                    if (Array.isArray(variant.headlines) && variant.headlines.length > 0) {
                        headlines = variant.headlines;
                    } else if (typeof variant.headlines === 'string' && variant.headlines.trim()) {
                        // Handle case where headlines might be a string
                        headlines = [variant.headlines.trim()];
                    }
                }
                
                const variantObj = {
                    name: variant.name || '',
                    description: variant.description || '',
                    filters: variantData.filters,
                    factions: variantData.factions,
                    sources: variant.sources && variant.sources.length > 0 ? variant.sources : undefined,
                    headlines: headlines,
                    image: '', // Auto-detect
                    locationType: variant.locationType || 'earth'
                };
                
                // Debug logging
                console.log(`EventEditService: Creating variant ${variantIndex} with headlines:`, variantObj.headlines, 'from variant data:', variant.headlines, 'type:', typeof variant.headlines, 'isArray:', Array.isArray(variant.headlines));
                
                // Include coordinates based on location type
                if (variant.locationType === 'earth') {
                    if (variant.lat !== undefined) {
                        variantObj.lat = variant.lat;
                    }
                    if (variant.lon !== undefined) {
                        variantObj.lon = variant.lon;
                    }
                } else if (variant.locationType === 'station') {
                    // Station events don't need coordinates
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
            }).filter(v => v.name); // Only include variants with name

            if (variants.length < 2) {
                return { error: 'Multi-events must have at least 2 variants' };
            }

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
            } else if (firstVariantLocationType !== 'station') {
                event.x = firstVariant && firstVariant.x !== undefined ? firstVariant.x : x;
                event.y = firstVariant && firstVariant.y !== undefined ? firstVariant.y : y;
            }
        } else {
            // Regular single event
            event = {
                name: mainName,
                locationType: locationType,
                cityDisplayName: cityDisplayName || undefined,
                description: mainDescription,
                image: '', // Auto-detect
                filters: mainData.filters,
                factions: mainData.factions,
                sources: mainSources.length > 0 ? mainSources : undefined,
                headlines: mainHeadlines && mainHeadlines.length > 0 ? mainHeadlines : undefined
            };
            // Add coordinates based on location type
            if (locationType === 'earth') {
                event.lat = lat;
                event.lon = lon;
            } else if (locationType !== 'station') {
                event.x = x;
                event.y = y;
            }
        }

        return { event: event };
    }

    /**
     * Add a new event to the events array
     * @param {Object} event - Event object to add
     * @param {number|null} targetPosition - Target position (0-indexed) or null to add at end
     * @returns {Object} Result object with new index and page info
     */
    addEvent(event, targetPosition = null) {
        if (!this.eventManager) {
            return { success: false, error: 'EventManager not set' };
        }

        const events = this.eventManager.events;
        let newIndex;
        let newCurrentPage = this.eventManager.currentPage;

        if (targetPosition !== null && targetPosition <= events.length) {
            // Insert at specified position
            events.splice(targetPosition, 0, event);
            newIndex = targetPosition;
            
            // Update unsaved indices - shift all indices >= targetPosition
            const newUnsaved = new Set();
            this.eventManager.unsavedEventIndices.forEach(oldIndex => {
                if (oldIndex >= targetPosition) {
                    newUnsaved.add(oldIndex + 1);
                } else {
                    newUnsaved.add(oldIndex);
                }
            });
            newUnsaved.add(targetPosition);
            this.eventManager.unsavedEventIndices = newUnsaved;
            
            // Navigate to page containing the new event
            newCurrentPage = Math.ceil((targetPosition + 1) / this.eventManager.eventsPerPage);
        } else {
            // Add at end (default behavior)
            newIndex = events.length;
            events.push(event);
            this.eventManager.unsavedEventIndices.add(newIndex);
            
            // Go to the last page to show the newly added event
            const totalPages = Math.ceil(events.length / this.eventManager.eventsPerPage);
            newCurrentPage = totalPages;
        }

        return {
            success: true,
            newIndex: newIndex,
            newCurrentPage: newCurrentPage
        };
    }

    /**
     * Update an existing event
     * @param {number} oldIndex - Current index of the event
     * @param {Object} event - Updated event object
     * @param {number|null} targetPosition - Target position (0-indexed) or null to update in place
     * @returns {Object} Result object with new index and page info
     */
    updateEvent(oldIndex, event, targetPosition = null) {
        if (!this.eventManager) {
            return { success: false, error: 'EventManager not set' };
        }

        const events = this.eventManager.events;
        if (oldIndex < 0 || oldIndex >= events.length) {
            return { success: false, error: 'Invalid index' };
        }

        let newIndex = oldIndex;
        let newCurrentPage = this.eventManager.currentPage;

        if (targetPosition !== null && targetPosition !== oldIndex) {
            // Move event to new position
            const maxPosition = events.length - 1;
            const clampedTargetPosition = Math.min(targetPosition, maxPosition);
            
            if (clampedTargetPosition === oldIndex) {
                // Position didn't actually change after clamping, just update in place
                events[oldIndex] = event;
                this.eventManager.unsavedEventIndices.add(oldIndex);
                newCurrentPage = Math.ceil((oldIndex + 1) / this.eventManager.eventsPerPage);
            } else {
                // Remove from old position
                events.splice(oldIndex, 1);
                
                // Adjust target position if removing before it
                const adjustedTargetPosition = clampedTargetPosition > oldIndex ? clampedTargetPosition - 1 : clampedTargetPosition;
                
                // Insert at new position
                events.splice(adjustedTargetPosition, 0, event);
                newIndex = adjustedTargetPosition;
                
                // Update unsaved indices
                const newUnsaved = new Set();
                this.eventManager.unsavedEventIndices.forEach(oldIdx => {
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
                this.eventManager.unsavedEventIndices = newUnsaved;
                
                // Navigate to page containing the moved event
                newCurrentPage = Math.ceil((adjustedTargetPosition + 1) / this.eventManager.eventsPerPage);
            }
        } else {
            // Update in place (no position change)
            events[oldIndex] = event;
            this.eventManager.unsavedEventIndices.add(oldIndex);
            
            // Stay on the current page where the edited event is
            newCurrentPage = Math.ceil((oldIndex + 1) / this.eventManager.eventsPerPage);
        }

        return {
            success: true,
            newIndex: newIndex,
            newCurrentPage: newCurrentPage
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventEditService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventEditService = new EventEditService();
}
