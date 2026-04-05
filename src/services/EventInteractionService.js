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
     * Open event info from list (View button or whole-card click on GitHub Pages).
     * Matches navigation: same camera helper, slide opens before closing the manager panel, marker refresh returns a real Promise.
     */
    openEventFromList(event, index) {
        if (!this.eventManager) return;

        this.eventManager.isOpeningEvent = true;

        const closeManagerPanel = () => {
            const panel = document.getElementById('eventsManagePanel');
            if (panel) panel.classList.remove('open');
            const toggleBtn = document.getElementById('eventsManageToggle');
            if (toggleBtn) toggleBtn.classList.remove('active');
            setTimeout(() => {
                this.eventManager.isOpeningEvent = false;
            }, 320);
        };

        const openFromMarkers = () => {
            if (!(window.globeController && window.globeController.globeView && window.globeController.uiView)) {
                closeManagerPanel();
                return;
            }

            const markers = window.globeController.sceneModel.getMarkers();
            const eventMarker = markers.find(m => {
                if (m.userData && m.userData.isEventMarker) {
                    const markerEvent = m.userData.event;
                    return (markerEvent === event) ||
                        (markerEvent.lat !== undefined && event.lat !== undefined &&
                            Math.abs(markerEvent.lat - event.lat) < 0.0001 &&
                            Math.abs(markerEvent.lon - event.lon) < 0.0001);
                }
                return false;
            });

            if (!eventMarker) {
                closeManagerPanel();
                return;
            }

            const isMultiEvent = event.variants && event.variants.length > 0;
            let variantIndex = 0;
            if (isMultiEvent) {
                const itemKey = `event-${index}`;
                variantIndex = this.eventManager.eventItemVariantIndices.get(itemKey) || 0;
            }
            const displayEvent = isMultiEvent ? event.variants[variantIndex] : event;

            let targetMarker = eventMarker;
            if (isMultiEvent && variantIndex > 0) {
                const variantMarker = markers.find(m => (
                    m.userData && m.userData.isEventMarker &&
                    m.userData.event === event &&
                    m.userData.variantIndex === variantIndex
                ));
                if (variantMarker) targetMarker = variantMarker;
            }

            const eventName = displayEvent.name || eventMarker.userData.eventName;
            const eventDescription = displayEvent.description;
            const imagePath = this.eventManager.getEventImagePath
                ? this.eventManager.getEventImagePath(displayEvent.name, displayEvent.image)
                : null;

            const ic = window.globeController.interactionController;
            const navLoc = window.NavigationLocationHelpers;
            if (ic && navLoc && typeof navLoc.handleLocationTypeCamera === 'function' && typeof navLoc.getLocationType === 'function') {
                navLoc.handleLocationTypeCamera(ic, targetMarker, navLoc.getLocationType(targetMarker, displayEvent));
            } else if (ic) {
                const locationType = targetMarker.userData ? targetMarker.userData.locationType : 'earth';
                if (locationType === 'moon' || locationType === 'mars') {
                    ic.resetCameraToDefault();
                } else {
                    ic.zoomToMarker(targetMarker);
                }
            }

            window.globeController.uiView.showEventSlide(
                eventName,
                imagePath,
                eventDescription,
                targetMarker,
                event
            );

            this.resetAllEventVariants();
            closeManagerPanel();
        };

        const runOpenFlow = () => {
            if (window.globeController && window.globeController.dataModel) {
                const dataModel = window.globeController.dataModel;
                const currentPage = dataModel.getCurrentEventPage();
                const eventsPerPage = dataModel.eventsPerPage || 10;
                const eventPage = Math.floor(index / eventsPerPage) + 1;

                if (eventPage !== currentPage) {
                    dataModel.setCurrentEventPage(eventPage);
                    if (window.globeController.uiView && typeof window.globeController.uiView.updatePaginationUI === 'function') {
                        window.globeController.uiView.updatePaginationUI();
                    }
                    const gv = window.globeController.globeView;
                    const refreshPromise = gv && typeof gv.refreshEventMarkers === 'function'
                        ? gv.refreshEventMarkers(false)
                        : null;
                    if (refreshPromise && typeof refreshPromise.then === 'function') {
                        refreshPromise.then(() => {
                            requestAnimationFrame(openFromMarkers);
                        }).catch(() => {
                            setTimeout(openFromMarkers, 50);
                        });
                    } else {
                        requestAnimationFrame(openFromMarkers);
                    }
                    return;
                }
            }
            openFromMarkers();
        };

        runOpenFlow();

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

        // Refresh Filters / Country match pills + card tint for the active variant
        itemElement.classList.remove('event-item--search-hit-filter', 'event-item--search-hit-country');
        const oldPills = itemElement.querySelector('.event-search-hit-pills-row');
        if (oldPills) oldPills.remove();
        if (this.eventManager.getSearchMatchAxesForItem) {
            const axes = this.eventManager.getSearchMatchAxesForItem(variant);
            if (axes.filterActive || axes.countryActive) {
                if (axes.filterHit) itemElement.classList.add('event-item--search-hit-filter');
                if (axes.countryHit) itemElement.classList.add('event-item--search-hit-country');
                const pills = [];
                if (axes.filterActive && axes.filterHit) {
                    pills.push('<span class="event-search-hit-pill event-search-hit-pill--filter" title="Matches Filters (hero/faction)">Filters</span>');
                }
                if (axes.countryActive && axes.countryHit) {
                    pills.push('<span class="event-search-hit-pill event-search-hit-pill--country" title="Matches country search">Country</span>');
                }
                if (pills.length && titleElement) {
                    const row = document.createElement('div');
                    row.className = 'event-search-hit-pills-row';
                    row.setAttribute('aria-label', 'Search match type');
                    row.innerHTML = pills.join('');
                    titleElement.insertAdjacentElement('afterend', row);
                }
            }
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
            // For Moon/Mars/Station/MarsShip events, display coordinates / defaults
            if (!locationName && variantLocationType !== 'earth') {
                if (variantLocationType === 'station') {
                    locationName = 'Space Station (ISS)';
                } else if (variantLocationType === 'marsShip') {
                    locationName = 'Red Promise Escape Ship';
                } else if (variant.x !== undefined && variant.y !== undefined) {
                    locationName = `${variantLocationType === 'moon' ? 'Moon' : 'Mars'}: (${variant.x.toFixed(1)}, ${variant.y.toFixed(1)})`;
                } else {
                    locationName = variantLocationType === 'moon' ? 'Moon' : 'Mars';
                }
            }
            const locText = locationName || 'Unknown';
            const rowInner = (typeof window !== 'undefined' && window.LocationFlagHelpers && typeof window.LocationFlagHelpers.createLocationRowInnerHtml === 'function')
                ? window.LocationFlagHelpers.createLocationRowInnerHtml(locText, variantLocationType)
                : `<img class="event-location-pin" src="assets/images/icons/Location Icon.png" alt="" width="28" height="28" decoding="async" /> ${locText}`;
            locationElement.innerHTML = rowInner;
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
