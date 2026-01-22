/**
 * EventNavigationManager - Handles event navigation (prev/next, pagination, number buttons)
 * Extracted from UIView to reduce complexity and improve maintainability
 */

/**
 * Coordinate matching utilities
 */
const CoordinateMatcher = {
    /**
     * Match coordinates based on location type
     * @param {Object} marker - Marker object
     * @param {Object} event - Event object
     * @param {string} locationType - Location type ('earth', 'moon', 'mars', 'station')
     * @returns {boolean} - True if coordinates match
     */
    matchCoordinates(marker, event, locationType) {
        if (locationType === 'moon' || locationType === 'mars') {
            return this.matchXYCoordinates(marker, event);
        } else if (locationType === 'station') {
            // Station: match by event reference (already checked) or name
            return true;
        } else {
            return this.matchLatLonCoordinates(marker, event);
        }
    },

    /**
     * Match Moon/Mars coordinates (x/y)
     * @param {Object} marker - Marker with userData.x and userData.y
     * @param {Object} event - Event with x and y
     * @returns {boolean} - True if coordinates match
     */
    matchXYCoordinates(marker, event) {
        const markerX = marker.userData?.x;
        const markerY = marker.userData?.y;
        const targetX = event.x;
        const targetY = event.y;

        if (markerX !== undefined && markerY !== undefined && targetX !== undefined && targetY !== undefined) {
            return Math.abs(markerX - targetX) < 0.1 && Math.abs(markerY - targetY) < 0.1;
        }
        return false;
    },

    /**
     * Match Earth coordinates (lat/lon)
     * @param {Object} marker - Marker with userData.lat and userData.lon
     * @param {Object} event - Event with lat and lon
     * @returns {boolean} - True if coordinates match
     */
    matchLatLonCoordinates(marker, event) {
        const markerLat = marker.userData?.lat;
        const markerLon = marker.userData?.lon;
        const targetLat = event.lat;
        const targetLon = event.lon;

        if (markerLat !== undefined && markerLon !== undefined && targetLat !== undefined && targetLon !== undefined) {
            return Math.abs(markerLat - targetLat) < 0.0001 && Math.abs(markerLon - targetLon) < 0.0001;
        }
        return false;
    },

    /**
     * Find marker for an event
     * @param {Array} markers - Array of markers
     * @param {Object} targetEvent - Target event
     * @returns {Object|null} - Found marker or null
     */
    findMarkerForEvent(markers, targetEvent) {
        const targetLocationType = targetEvent.locationType || 'earth';

        return markers.find(m => {
            if (m.userData && m.userData.isEventMarker) {
                const markerEvent = m.userData.event;
                const markerLocationType = m.userData.locationType || 'earth';

                // Location types must match
                if (markerLocationType !== targetLocationType) return false;

                // Match by event object reference first
                if (markerEvent === targetEvent) return true;

                // Match by coordinates based on location type
                return this.matchCoordinates(m, targetEvent, targetLocationType);
            }
            return false;
        }) || null;
    }
};

/**
 * Mobile helper constants
 */
const MOBILE_BREAKPOINT = 768;
const MOBILE_PORTRAIT_ZOOM = 5.5;
const DEFAULT_ZOOM = 3.5;

export class EventNavigationManager {
    constructor(sceneModel, dataModel, uiView, eventSlideManager) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
        this.uiView = uiView; // Reference back to UIView for methods that still need to be there
        this.eventSlideManager = eventSlideManager; // Reference to EventSlideManager for showing events
    }

    /**
     * Get all events from EventManager or DataModel
     * @returns {Array} - Array of all events
     */
    getAllEvents() {
        if (window.eventManager && window.eventManager.events) {
            return window.eventManager.events;
        }
        if (this.dataModel) {
            return this.dataModel.getAllEvents();
        }
        return [];
    }

    /**
     * Find current event index in full events list
     * @returns {number} - Index of current event, or -1 if not found
     */
    getCurrentEventIndex() {
        const allEvents = this.getAllEvents();
        if (!this.uiView.currentEventData || allEvents.length === 0) return -1;

        // Get location type from current event (check marker or event data)
        const currentLocationType = (this.uiView.currentEventMarker && this.uiView.currentEventMarker.userData && this.uiView.currentEventMarker.userData.locationType) ||
            this.uiView.currentEventData.locationType || 'earth';

        // Match by location type, coordinates, and name
        return allEvents.findIndex(event => {
            const eventLocationType = event.locationType || 'earth';

            // Location types must match
            if (eventLocationType !== currentLocationType) return false;

            if (event.variants && event.variants.length > 0) {
                // Multi-event: match first variant
                const variant = event.variants[0];
                const variantLocationType = variant.locationType || eventLocationType;

                // Check if variant location type matches
                if (variantLocationType !== currentLocationType) return false;

                // Match by coordinates based on location type
                let coordsMatch = false;
                if (currentLocationType === 'moon' || currentLocationType === 'mars') {
                    // Moon/Mars: match by x/y coordinates
                    const currentX = this.uiView.currentEventData.x !== undefined ? this.uiView.currentEventData.x :
                        (this.uiView.currentEventData.variants?.[0]?.x !== undefined ? this.uiView.currentEventData.variants[0].x : undefined);
                    const currentY = this.uiView.currentEventData.y !== undefined ? this.uiView.currentEventData.y :
                        (this.uiView.currentEventData.variants?.[0]?.y !== undefined ? this.uiView.currentEventData.variants[0].y : undefined);
                    const variantX = variant.x !== undefined ? variant.x : event.x;
                    const variantY = variant.y !== undefined ? variant.y : event.y;

                    if (currentX !== undefined && currentY !== undefined && variantX !== undefined && variantY !== undefined) {
                        coordsMatch = Math.abs(variantX - currentX) < 0.1 && Math.abs(variantY - currentY) < 0.1;
                    }
                } else if (currentLocationType === 'station') {
                    // Station: match by name only (station events don't have fixed coordinates)
                    coordsMatch = true; // Location type already matched, so coordinates match
                } else {
                    // Earth: match by lat/lon
                    const currentLat = this.uiView.currentEventData.lat !== undefined ? this.uiView.currentEventData.lat :
                        (this.uiView.currentEventData.variants?.[0]?.lat !== undefined ? this.uiView.currentEventData.variants[0].lat : undefined);
                    const currentLon = this.uiView.currentEventData.lon !== undefined ? this.uiView.currentEventData.lon :
                        (this.uiView.currentEventData.variants?.[0]?.lon !== undefined ? this.uiView.currentEventData.variants[0].lon : undefined);
                    const variantLat = variant.lat !== undefined ? variant.lat : event.lat;
                    const variantLon = variant.lon !== undefined ? variant.lon : event.lon;

                    if (currentLat !== undefined && currentLon !== undefined && variantLat !== undefined && variantLon !== undefined) {
                        coordsMatch = Math.abs(variantLat - currentLat) < 0.0001 && Math.abs(variantLon - currentLon) < 0.0001;
                    }
                }

                return coordsMatch && variant.name === (this.uiView.currentEventData.variants?.[0]?.name || this.uiView.currentEventData.name);
            } else {
                // Single event: match by coordinates and name
                let coordsMatch = false;
                if (currentLocationType === 'moon' || currentLocationType === 'mars') {
                    // Moon/Mars: match by x/y coordinates
                    const currentX = this.uiView.currentEventData.x;
                    const currentY = this.uiView.currentEventData.y;
                    const eventX = event.x;
                    const eventY = event.y;

                    if (currentX !== undefined && currentY !== undefined && eventX !== undefined && eventY !== undefined) {
                        coordsMatch = Math.abs(eventX - currentX) < 0.1 && Math.abs(eventY - currentY) < 0.1;
                    }
                } else if (currentLocationType === 'station') {
                    // Station: match by name only (station events don't have fixed coordinates)
                    coordsMatch = true; // Location type already matched, so coordinates match
                } else {
                    // Earth: match by lat/lon
                    const currentLat = this.uiView.currentEventData.lat;
                    const currentLon = this.uiView.currentEventData.lon;
                    const eventLat = event.lat;
                    const eventLon = event.lon;

                    if (currentLat !== undefined && currentLon !== undefined && eventLat !== undefined && eventLon !== undefined) {
                        coordsMatch = Math.abs(eventLat - currentLat) < 0.0001 && Math.abs(eventLon - currentLon) < 0.0001;
                    }
                }

                return coordsMatch && event.name === this.uiView.currentEventData.name;
            }
        });
    }

    /**
     * Navigate to event at specified index
     * @param {number} targetIndex - Index of event to navigate to
     */
    navigateToEvent(targetIndex) {
        const allEvents = this.getAllEvents();
        if (targetIndex < 0 || targetIndex >= allEvents.length) return;

        const targetEvent = allEvents[targetIndex];

        // Check if event is on current page, if not switch to correct page
        if (this.dataModel && window.globeController) {
            const eventsPerPage = this.dataModel.eventsPerPage || 10;
            const targetPage = Math.floor(targetIndex / eventsPerPage) + 1;
            const currentPage = this.dataModel.getCurrentEventPage();

            if (targetPage !== currentPage) {
                this.dataModel.setCurrentEventPage(targetPage);

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
            }
        }

        // Find the marker for this event
        if (window.globeController && window.globeController.globeView) {
            const markers = window.globeController.sceneModel.getMarkers();
            const eventMarker = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);

            if (eventMarker) {
                // Check if this is a multi-event
                const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
                const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;

                const eventName = displayEvent.name || eventMarker.userData.eventName;
                const eventDescription = displayEvent.description;

                // Get image path - use EventManager's function if available for consistency
                let imagePath = null;
                if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
                    imagePath = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
                    console.log(`[EventNavigationManager] Image path for "${eventName}": ${imagePath}`);
                } else {
                    // Fallback: construct path manually
                    imagePath = displayEvent.image || null;
                    if (!imagePath || !imagePath.trim()) {
                        const normalizedName = eventName.replace(/\s+/g, ' ').trim();
                        const encodedFileName = encodeURIComponent(normalizedName);
                        imagePath = `assets/images/events/${encodedFileName}.png`;
                    }
                    console.log(`[EventNavigationManager] Image path (fallback) for "${eventName}": ${imagePath}`);
                }

                // Zoom to marker or reset to default view (for Moon/Mars/Station) and show event slide
                if (window.globeController.interactionController) {
                    const locationType = eventMarker.userData ? eventMarker.userData.locationType : 'earth';
                    if (locationType === 'moon' || locationType === 'mars') {
                        // Reset camera to default view for Moon/Mars events
                        window.globeController.interactionController.resetCameraToDefault();
                    } else if (locationType === 'station') {
                        // For station events, hide Moon/Mars panels and follow the station
                        window.globeController.interactionController.setPlanesVisibility(false);
                        window.globeController.interactionController.startFollowingStation(eventMarker);
                    } else {
                        // Zoom in and center on the marker (Earth events)
                        window.globeController.interactionController.zoomToMarker(eventMarker);
                    }
                }

                this.eventSlideManager.showEventSlide(
                    eventName,
                    imagePath,
                    eventDescription,
                    eventMarker,
                    targetEvent
                );
            }
        }
    }

    /**
     * Setup event navigation buttons (prev/next in full events list)
     */
    setupEventNavigation() {
        const prevBtn = document.getElementById('eventPrevBtn');
        const nextBtn = document.getElementById('eventNextBtn');

        if (!prevBtn || !nextBtn) return;

        // Remove existing listeners by cloning
        const prevBtnClone = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(prevBtnClone, prevBtn);
        const nextBtnClone = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(nextBtnClone, nextBtn);

        const newPrevBtn = document.getElementById('eventPrevBtn');
        const newNextBtn = document.getElementById('eventNextBtn');

        // Update button states
        const updateNavButtons = () => {
            const allEvents = this.getAllEvents();
            const currentIndex = this.getCurrentEventIndex();

            newPrevBtn.disabled = currentIndex <= 0 || allEvents.length === 0;
            newNextBtn.disabled = currentIndex >= allEvents.length - 1 || allEvents.length === 0;
        };

        // Initial update
        updateNavButtons();

        // Previous button
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }

            const currentIndex = this.getCurrentEventIndex();
            if (currentIndex > 0) {
                this.navigateToEvent(currentIndex - 1);
            }
        });

        // Next button
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }

            const currentIndex = this.getCurrentEventIndex();
            const allEvents = this.getAllEvents();
            if (currentIndex < allEvents.length - 1) {
                this.navigateToEvent(currentIndex + 1);
            }
        });

        // All Events button
        const allEventsBtn = document.getElementById('eventAllEventsBtn');
        if (allEventsBtn) {
            // Remove existing listeners by cloning
            const allEventsBtnClone = allEventsBtn.cloneNode(true);
            allEventsBtn.parentNode.replaceChild(allEventsBtnClone, allEventsBtn);
            const newAllEventsBtn = document.getElementById('eventAllEventsBtn');

            newAllEventsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Play sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventClick');
                }

                // Close current event
                this.eventSlideManager.hideEventSlide();

                // Open event manager (keep globe visible)
                const panel = document.getElementById('eventsManagePanel');
                const toggleBtn = document.getElementById('eventsManageToggle');
                if (panel) {
                    panel.classList.add('open');
                }
                if (toggleBtn) {
                    toggleBtn.classList.add('active');
                }
            });
        }
    }

    /**
     * Setup event pagination controls
     * @param {Function} onPageChange - Callback when page changes
     */
    setupEventPagination(onPageChange) {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInput = document.getElementById('pageInput');
        const pageTotal = document.getElementById('pageTotal');

        if (!prevBtn || !nextBtn || !pageInput || !pageTotal || !this.dataModel) return;

        // Remove existing event listeners by cloning the buttons (removes all listeners)
        const prevBtnClone = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(prevBtnClone, prevBtn);
        const nextBtnClone = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(nextBtnClone, nextBtn);
        const pageInputClone = pageInput.cloneNode(true);
        pageInput.parentNode.replaceChild(pageInputClone, pageInput);

        // Get references to the new cloned elements
        const newPrevBtn = document.getElementById('prevPageBtn');
        const newNextBtn = document.getElementById('nextPageBtn');
        const newPageInput = document.getElementById('pageInput');

        // Update pagination UI
        const updatePaginationUI = () => {
            const currentPage = this.dataModel.getCurrentEventPage();
            const totalPages = this.dataModel.getTotalEventPages();

            // Update input value (without triggering change event)
            newPageInput.value = currentPage;
            newPageInput.max = totalPages;
            pageTotal.textContent = `/ ${totalPages}`;

            // Enable wrap buttons - change icon and behavior at boundaries
            if (totalPages > 1) {
                // Previous button: wrap to last page if on first page
                if (currentPage === 1) {
                    newPrevBtn.disabled = false;
                    newPrevBtn.textContent = '↻'; // Wrap icon
                    newPrevBtn.title = 'Go to Last Page';
                } else {
                    newPrevBtn.disabled = false;
                    newPrevBtn.textContent = '‹'; // Normal left arrow
                    newPrevBtn.title = 'Previous Page';
                }

                // Next button: wrap to first page if on last page
                if (currentPage === totalPages) {
                    newNextBtn.disabled = false;
                    newNextBtn.textContent = '↻'; // Wrap icon
                    newNextBtn.title = 'Go to First Page';
                } else {
                    newNextBtn.disabled = false;
                    newNextBtn.textContent = '›'; // Normal right arrow
                    newNextBtn.title = 'Next Page';
                }
            } else {
                // Only one page or no events - disable both
                newPrevBtn.disabled = true;
                newNextBtn.disabled = true;
                newPrevBtn.textContent = '‹';
                newNextBtn.textContent = '›';
            }

            // Hide pagination if only one page or no events
            const pagination = document.getElementById('eventPagination');
            if (pagination) {
                if (totalPages <= 1) {
                    pagination.style.display = 'none';
                } else {
                    pagination.style.display = 'flex';
                }
            }
        };

        // Setup event number buttons (1-10) - get update function
        const updateNumberButtons = this.setupEventNumberButtons();
        // Store updateNumberButtons so it can be called when filters are applied
        this.uiView.updateNumberButtons = updateNumberButtons;

        // Wrap updatePaginationUI to also update number buttons
        const originalUpdatePaginationUI = updatePaginationUI;
        const wrappedUpdatePaginationUI = () => {
            originalUpdatePaginationUI();
            if (updateNumberButtons) {
                updateNumberButtons();
            }
        };

        // Initial update
        wrappedUpdatePaginationUI();

        // Previous page button - go to previous page or wrap to last
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Play sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }

            if (!newPrevBtn.disabled) {
                const currentPage = this.dataModel.getCurrentEventPage();
                const totalPages = this.dataModel.getTotalEventPages();

                let newPage;
                if (currentPage === 1) {
                    // Wrap to last page
                    newPage = totalPages;
                } else {
                    // Normal previous page
                    newPage = currentPage - 1;
                }

                this.dataModel.setCurrentEventPage(newPage);
                wrappedUpdatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });

        // Next page button - go to next page or wrap to first
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Play sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }

            if (!newNextBtn.disabled) {
                const currentPage = this.dataModel.getCurrentEventPage();
                const totalPages = this.dataModel.getTotalEventPages();

                let newPage;
                if (currentPage === totalPages) {
                    // Wrap to first page
                    newPage = 1;
                } else {
                    // Normal next page
                    newPage = currentPage + 1;
                }

                this.dataModel.setCurrentEventPage(newPage);
                wrappedUpdatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });

        // Manual page input
        newPageInput.addEventListener('change', (e) => {
            const inputValue = parseInt(e.target.value);
            const totalPages = this.dataModel.getTotalEventPages();

            // Validate and set page
            if (!isNaN(inputValue) && inputValue >= 1 && inputValue <= totalPages) {
                const oldPage = this.dataModel.getCurrentEventPage();
                this.dataModel.setCurrentEventPage(inputValue);
                wrappedUpdatePaginationUI();
                // Only play sound if page actually changed
                if (oldPage !== inputValue && window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('page');
                }
                if (onPageChange) {
                    onPageChange();
                }
            } else {
                // Reset to current page if invalid
                wrappedUpdatePaginationUI();
            }
        });

        // Also handle Enter key
        newPageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.target.blur(); // Triggers change event
            }
        });

        // Store update function for external calls (wrapped version that also updates number buttons)
        this.uiView.updatePaginationUI = wrappedUpdatePaginationUI;
    }

    /**
     * Setup event number buttons (1-10) to open events by position on current page
     * Returns the update function so it can be called when page changes
     */
    setupEventNumberButtons(onPageChange) {
        const numberButtonsContainer = document.getElementById('eventNumberButtons');
        if (!numberButtonsContainer || !this.dataModel) return;

        // Get all number buttons
        const numberButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');

        // Update button states based on current page - only show buttons for events that exist
        const updateNumberButtons = () => {
            // Re-query buttons from DOM to get the actual current buttons (they may have been cloned)
            const currentButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');

            const currentPageEvents = this.dataModel.getEventsForCurrentPage();
            const eventsPerPage = this.dataModel.eventsPerPage || 10;
            const numEventsOnPage = currentPageEvents.length;

            // First, reset all buttons to be visible (in case they were hidden from previous page)
            currentButtons.forEach((btn) => {
                btn.style.display = 'flex';
                btn.disabled = false;
                btn.classList.remove('locked');
                // Only remove specific style properties we might have set, keep display
                btn.style.opacity = '';
                btn.style.filter = '';
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
                btn.style.cursor = '';
                btn.style.transform = '';
                btn.style.boxShadow = '';
            });

            // Then hide buttons that don't have events, and disable buttons for locked events
            currentButtons.forEach((btn, index) => {
                const position = index + 1; // 1-10
                const eventIndex = position - 1; // 0-9

                // Hide button if no event at this position
                if (eventIndex >= numEventsOnPage) {
                    btn.style.display = 'none'; // Hide instead of disable
                } else {
                    // Check if the event marker is locked (filtered out)
                    const targetEvent = currentPageEvents[eventIndex];
                    let isLocked = false;

                    if (window.globeController && window.globeController.globeView) {
                        const markers = window.globeController.sceneModel.getMarkers();
                        const eventLocationType = targetEvent.locationType || 'earth';

                        // Try to find marker - check all possible locations (globe, moon, mars, station)
                        let marker = null;

                        // First try direct event reference match
                        marker = markers.find(m => {
                            if (m.userData && m.userData.isEventMarker) {
                                return m.userData.event === targetEvent;
                            }
                            return false;
                        });

                        // If not found, try coordinate matching
                        if (!marker) {
                            marker = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);
                        }

                        // Check if marker is locked
                        if (marker && marker.userData && marker.userData.isLocked) {
                            isLocked = true;
                        }
                    }

                    // Apply visual changes - use CSS classes only, no inline styles
                    if (isLocked) {
                        btn.disabled = true;
                        btn.classList.add('locked');
                        console.log(`[EventNavigationManager] Disabled button ${position} for locked event: ${targetEvent.name}`);
                    } else {
                        btn.disabled = false;
                        btn.classList.remove('locked');
                    }
                }
            });
        };

        // Initial update
        updateNumberButtons();

        // Add click and hover handlers to each button
        numberButtons.forEach((btn, index) => {
            const position = index + 1; // 1-10

            // Remove existing listeners by cloning
            const btnClone = btn.cloneNode(true);
            btn.parentNode.replaceChild(btnClone, btn);
            const newBtn = document.getElementById('eventNumberButtons').querySelectorAll('.event-number-btn')[index];

            // Get the marker for this event position
            const getMarkerForPosition = () => {
                const currentPageEvents = this.dataModel.getEventsForCurrentPage();
                const eventIndex = position - 1; // 0-9

                if (eventIndex >= currentPageEvents.length) return null;

                const targetEvent = currentPageEvents[eventIndex];

                if (window.globeController && window.globeController.globeView) {
                    const markers = window.globeController.sceneModel.getMarkers();
                    return CoordinateMatcher.findMarkerForEvent(markers, targetEvent);
                }
                return null;
            };

            // Hover behavior: stop auto rotation, center marker, trigger pulse
            newBtn.addEventListener('mouseenter', (e) => {
                // Don't trigger hover behavior if button is disabled (locked event)
                if (newBtn.disabled) return;

                const marker = getMarkerForPosition();
                if (!marker) return;

                // Don't trigger hover behavior if marker is locked
                if (marker.userData && marker.userData.isLocked) return;

                // Stop auto rotation
                if (window.globeController && window.globeController.sceneModel) {
                    const sceneModel = window.globeController.sceneModel;
                    sceneModel.setAutoRotate(false);
                    if (sceneModel.autoRotateTimeout) {
                        clearTimeout(sceneModel.autoRotateTimeout);
                        sceneModel.autoRotateTimeout = null;
                    }
                }

                // Center the marker (zoom to it) or reset to default view for Moon/Mars/Station
                // Note: zoomToMarker will store originalCameraPosition if it doesn't exist
                if (window.globeController && window.globeController.interactionController) {
                    const locationType = marker.userData ? marker.userData.locationType : 'earth';
                    if (locationType === 'moon' || locationType === 'mars') {
                        // Reset camera to default view for Moon/Mars events
                        window.globeController.interactionController.resetCameraToDefault();
                    } else if (locationType === 'station') {
                        // For station events, hide Moon/Mars panels (like Earth events)
                        window.globeController.interactionController.setPlanesVisibility(false);
                        // Continuously follow the moving satellite
                        window.globeController.interactionController.startFollowingStation(marker);
                    } else {
                        // Zoom in and center on the marker (Earth events)
                        // zoomToMarker already hides the panels
                        window.globeController.interactionController.zoomToMarker(marker);
                    }
                }

                // Start pulse effect (marker hover behavior)
                if (window.globeController && window.globeController.interactionController) {
                    const interactionController = window.globeController.interactionController;
                    // Stop any existing hover marker pulse
                    if (interactionController.hoveredEventMarker &&
                        interactionController.hoveredEventMarker !== marker) {
                        interactionController.stopEventMarkerPulse(interactionController.hoveredEventMarker);
                    }
                    // Start pulse on this marker
                    interactionController.startEventMarkerPulse(marker);
                    interactionController.hoveredEventMarker = marker;
                }
            });

            // Mouse leave: stop pulse, restore camera, resume auto rotation if enabled
            newBtn.addEventListener('mouseleave', (e) => {
                const marker = getMarkerForPosition();

                // Stop following station if it was a station marker
                if (window.globeController && window.globeController.interactionController) {
                    const interactionController = window.globeController.interactionController;
                    const locationType = marker && marker.userData ? marker.userData.locationType : 'earth';
                    if (locationType === 'station') {
                        interactionController.stopFollowingStation();
                        // Restore plane visibility when leaving station marker (same as Earth events)
                        interactionController.restorePlanesVisibility();
                    }
                }

                // Stop pulse effect
                if (window.globeController && window.globeController.interactionController) {
                    const interactionController = window.globeController.interactionController;
                    if (interactionController.hoveredEventMarker === marker) {
                        interactionController.stopEventMarkerPulse(marker);
                        interactionController.hoveredEventMarker = null;
                    }
                }

                // Restore original camera position (only if no event is open)
                // zoomToMarker stored the original position in this.originalCameraPosition
                if (!this.uiView.currentEventMarker) {
                    if (window.globeController && window.globeController.sceneModel) {
                        const sceneModel = window.globeController.sceneModel;
                        const camera = sceneModel.getCamera();
                        const globe = sceneModel.getGlobe();

                        if (camera && globe) {
                            // Use stored position from zoomToMarker, or default view
                            let targetPosition, targetRotation;

                            if (this.uiView.originalCameraPosition && this.uiView.originalGlobeRotation) {
                                // Use the position stored by zoomToMarker
                                targetPosition = this.uiView.originalCameraPosition.clone();
                                targetRotation = this.uiView.originalGlobeRotation;
                            } else {
                                // Default zoomed-out view
                                // On mobile portrait, use more zoomed out position to show Moon/Mars panels
                                const isMobilePortrait = window.innerWidth <= MOBILE_BREAKPOINT && window.innerHeight > window.innerWidth;
                                const defaultZoom = isMobilePortrait ? MOBILE_PORTRAIT_ZOOM : DEFAULT_ZOOM;
                                targetPosition = new THREE.Vector3(0, 0, defaultZoom);
                                targetRotation = { x: 0, y: 0, z: 0 };
                            }

                            // Animate camera back to original/default position
                            const startPosition = camera.position.clone();
                            const startRotation = {
                                x: globe.rotation.x,
                                y: globe.rotation.y,
                                z: globe.rotation.z
                            };

                            const duration = 500; // 0.5 second animation
                            const startTime = Date.now();

                            const animate = () => {
                                const elapsed = Date.now() - startTime;
                                const progress = Math.min(elapsed / duration, 1);

                                // Easing function (ease in-out)
                                const easeProgress = progress < 0.5
                                    ? 2 * progress * progress
                                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                                // Interpolate camera position
                                camera.position.lerpVectors(startPosition, targetPosition, easeProgress);

                                // Interpolate globe rotation
                                globe.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
                                globe.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
                                globe.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;

                                // Look at origin
                                camera.lookAt(0, 0, 0);

                                if (progress < 1) {
                                    requestAnimationFrame(animate);
                                } else {
                                    // Animation complete
                                    camera.position.copy(targetPosition);
                                    globe.rotation.x = targetRotation.x;
                                    globe.rotation.y = targetRotation.y;
                                    globe.rotation.z = targetRotation.z;
                                    camera.lookAt(0, 0, 0);

                                    // Restore plane visibility based on current page
                                    // Only restore if we're not transitioning to another hover (check if there's a hovered marker)
                                    const interactionController = window.globeController?.interactionController;
                                    if (interactionController && !interactionController.hoveredEventMarker) {
                                        // No marker is currently hovered, safe to restore planes
                                        interactionController.restorePlanesVisibility();
                                    }

                                    // Clear stored position since we've restored it (only if no event is open)
                                    if (!this.uiView.currentEventMarker) {
                                        this.uiView.originalCameraPosition = null;
                                        this.uiView.originalGlobeRotation = null;
                                    }
                                }
                            };

                            animate();
                        }
                    }
                }

                // Resume auto rotation if enabled
                if (window.globeController && window.globeController.sceneModel) {
                    const sceneModel = window.globeController.sceneModel;
                    if (sceneModel.getAutoRotateEnabled() && !sceneModel.eventMarker) {
                        sceneModel.autoRotateTimeout = setTimeout(() => {
                            sceneModel.setAutoRotate(true);
                        }, 500); // 0.5 second delay
                    }
                }
            });

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Don't allow clicking disabled buttons
                if (newBtn.disabled) return;

                // Play sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventClick');
                }

                const currentPageEvents = this.dataModel.getEventsForCurrentPage();
                const eventIndex = position - 1; // 0-9

                if (eventIndex < currentPageEvents.length) {
                    const targetEvent = currentPageEvents[eventIndex];

                    // Find the marker for this event
                    if (window.globeController && window.globeController.globeView) {
                        const markers = window.globeController.sceneModel.getMarkers();
                        const eventMarker = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);

                        // Don't allow clicking locked events
                        if (eventMarker && eventMarker.userData && eventMarker.userData.isLocked) {
                            return;
                        }

                        if (eventMarker) {
                            // Check if this is a multi-event
                            const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
                            const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;

                            const eventName = displayEvent.name || eventMarker.userData.eventName;
                            const eventDescription = displayEvent.description;

                            // Get image path
                            let imagePath = displayEvent.image || null;
                            if (!imagePath || !imagePath.trim()) {
                                const normalizedName = eventName.replace(/\s+/g, ' ').trim();
                                const encodedFileName = encodeURIComponent(normalizedName);
                                imagePath = `assets/images/events/${encodedFileName}.png`;
                            }

                            // Zoom to marker or reset to default view (for Moon/Mars/Station) and show event slide
                            if (window.globeController.interactionController) {
                                const locationType = eventMarker.userData ? eventMarker.userData.locationType : 'earth';
                                if (locationType === 'moon' || locationType === 'mars') {
                                    // Reset camera to default view for Moon/Mars events
                                    window.globeController.interactionController.resetCameraToDefault();
                                } else if (locationType === 'station') {
                                    // For station events, hide Moon/Mars panels and follow the station
                                    window.globeController.interactionController.setPlanesVisibility(false);
                                    window.globeController.interactionController.startFollowingStation(eventMarker);
                                } else {
                                    // Zoom in and center on the marker (Earth events)
                                    window.globeController.interactionController.zoomToMarker(eventMarker);
                                }
                            }

                            this.eventSlideManager.showEventSlide(
                                eventName,
                                imagePath,
                                eventDescription,
                                eventMarker,
                                targetEvent
                            );
                        }
                    }
                }
            });
        });

        // Return update function so it can be called when page changes
        return updateNumberButtons;
    }
}
