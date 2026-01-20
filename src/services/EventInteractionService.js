/**
 * EventInteractionService - Handles event interaction logic (opening events, variant cycling)
 * Separates event interaction logic from event management
 */

class EventInteractionService {
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
     * Open event info from list (like clicking a marker) - for GitHub Pages
     */
    openEventFromList(event, index) {
        if (!this.eventManager) return;
        
        // Set flag to prevent panel from closing during event opening
        this.eventManager.isOpeningEvent = true;
        
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
                this.eventManager.isOpeningEvent = false;
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
                        variantIndex = this.eventManager.eventItemVariantIndices.get(itemKey) || 0;
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
                    const imagePath = this.eventManager.getEventImagePath ? 
                        this.eventManager.getEventImagePath(displayEvent.name, displayEvent.image) : null;
                    
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
                if (this.eventManager.renderEvents) {
                    this.eventManager.renderEvents();
                }
                
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
            this.eventManager.isOpeningEvent = false;
        }, 2000);
    }

    /**
     * Cycle through variants for a multi-event item
     */
    cycleEventVariant(eventIndex, event, itemElement) {
        if (!this.eventManager || !event.variants || event.variants.length <= 1) return;
        
        const itemKey = `event-${eventIndex}`;
        let currentIndex = this.eventManager.eventItemVariantIndices.get(itemKey) || 0;
        
        // Cycle to next variant (wrap around)
        currentIndex = (currentIndex + 1) % event.variants.length;
        this.eventManager.eventItemVariantIndices.set(itemKey, currentIndex);
        
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
        if (!this.eventManager) return;
        
        // Clear all variant indices (they will default to 0 when accessed)
        this.eventManager.eventItemVariantIndices.clear();
        
        // Re-render events to show first variant in all previews
        if (this.eventManager.renderEvents) {
            this.eventManager.renderEvents();
        }
    }
    
    /**
     * Update the preview for an event item with a specific variant
     */
    updateEventItemPreview(eventIndex, event, itemElement, variantIndex) {
        if (!this.eventManager) return;
        
        const variant = event.variants[variantIndex];
        
        // Update image
        const imageContainer = itemElement.querySelector('.event-item-preview-image');
        const imagePath = this.eventManager.getEventImagePath ? 
            this.eventManager.getEventImagePath(variant.name, variant.image) : null;
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
            titleElement.innerHTML = window.GlitchTextService ? 
                window.GlitchTextService.getDisplayEventName(variant.name) : variant.name;
        }
        
        // Update location
        const locationElement = itemElement.querySelector('.event-item-location');
        if (locationElement) {
            let locationName = variant.cityDisplayName || null;
            const variantLocationType = variant.locationType || (event.locationType || 'earth');
            
            // Only call getLocationName for Earth events with valid lat/lon
            if (!locationName && variantLocationType === 'earth' && variant.lat !== undefined && variant.lon !== undefined) {
                if (this.eventManager.getLocationName) {
                    locationName = this.eventManager.getLocationName(variant.lat, variant.lon);
                }
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
            locationElement.innerHTML = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName || 'Unknown'}`;
        }
        
        // Update badge text
        const badge = itemElement.querySelector('.multi-event-badge');
        if (badge) {
            badge.textContent = `${variantIndex + 1}/${event.variants.length}`;
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventInteractionService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventInteractionService = new EventInteractionService();
}
