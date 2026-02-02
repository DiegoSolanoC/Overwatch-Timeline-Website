/**
 * EventNavigationManager - Handles event navigation (prev/next, pagination, number buttons)
 * Extracted from UIView to reduce complexity and improve maintainability
 */

// Import helpers
import { matchEventCoordinates, getEventCoordinates } from './helpers/NavigationCoordinateHelpers.js';
import { handleLocationTypeCamera, getLocationType } from './helpers/NavigationLocationHelpers.js';
import { getEventImagePath } from './helpers/NavigationImageHelpers.js';
import { cloneButton, cloneButtons, playNavigationSound } from './helpers/NavigationButtonHelpers.js';
import { handleNumberButtonMouseEnter, handleNumberButtonMouseLeave } from './helpers/NavigationCameraHelpers.js';
import { handleNumberButtonClick } from './helpers/NavigationEventHelpers.js';
import { resetButtonStyles, isEventMarkerLocked } from './helpers/NavigationButtonStateHelpers.js';
import { handlePrevPageClick, handleNextPageClick, handlePageInputChange, updatePaginationButtonStates } from './helpers/NavigationPaginationHelpers.js';

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

        // First, try to match by object reference (fastest and most reliable)
        const directMatchIndex = allEvents.findIndex(event => event === this.uiView.currentEventData);
        if (directMatchIndex !== -1) {
            return directMatchIndex;
        }

        // If direct match fails, fall back to coordinate/name matching
        // Get location type from current event (check marker or event data)
        const currentLocationType = getLocationType(this.uiView.currentEventMarker, this.uiView.currentEventData);

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

                // Get current coordinates (handles variants)
                const currentCoords = getEventCoordinates(this.uiView.currentEventData, currentLocationType);
                const variantCoords = getEventCoordinates({ ...variant, ...event }, currentLocationType);

                // Match coordinates using helper
                const coordsMatch = matchEventCoordinates(currentCoords, variantCoords, currentLocationType);

                // Match by variant name or event name
                const currentName = this.uiView.currentEventData.variants?.[0]?.name || this.uiView.currentEventData.name;
                return coordsMatch && variant.name === currentName;
            } else {
                // Single event: match by coordinates and name
                const currentCoords = getEventCoordinates(this.uiView.currentEventData, currentLocationType);
                const eventCoords = getEventCoordinates(event, currentLocationType);
                const coordsMatch = matchEventCoordinates(currentCoords, eventCoords, currentLocationType);

                // Match by event name (case-insensitive for robustness)
                const currentName = (this.uiView.currentEventData.name || '').trim();
                const eventName = (event.name || '').trim();
                return coordsMatch && currentName.toLowerCase() === eventName.toLowerCase();
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

        // Helper function to find marker and show event
        const findAndShowEvent = () => {
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

                    // Get image path using helper
                    const imagePath = getEventImagePath(displayEvent, eventName);

                    // Zoom to marker or reset to default view (for Moon/Mars/Station) and show event slide
                    if (window.globeController.interactionController) {
                        const locationType = getLocationType(eventMarker, displayEvent);
                        handleLocationTypeCamera(window.globeController.interactionController, eventMarker, locationType);
                    }

                    this.eventSlideManager.showEventSlide(
                        eventName,
                        imagePath,
                        eventDescription,
                        eventMarker,
                        targetEvent
                    );

                    // Update navigation button states after navigation
                    // Use setTimeout to ensure currentEventData is set by showEventSlide
                    setTimeout(() => {
                        const prevBtn = document.getElementById('eventPrevBtn');
                        const nextBtn = document.getElementById('eventNextBtn');
                        if (prevBtn && nextBtn) {
                            const allEvents = this.getAllEvents();
                            const currentIndex = this.getCurrentEventIndex();
                            prevBtn.disabled = currentIndex <= 0 || allEvents.length === 0;
                            nextBtn.disabled = currentIndex >= allEvents.length - 1 || allEvents.length === 0;
                        }
                    }, 0);
                }
            }
        };

        // Check if event is on current page, if not switch to correct page
        if (this.dataModel && window.globeController) {
            const eventsPerPage = this.dataModel.eventsPerPage || 10;
            const targetPage = Math.floor(targetIndex / eventsPerPage) + 1;
            const currentPage = this.dataModel.getCurrentEventPage();

            if (targetPage !== currentPage) {
                // Page change needed - wait for markers to refresh
                this.dataModel.setCurrentEventPage(targetPage);

                // Refresh markers and pagination, then find and show event
                // Note: refreshEventMarkers() doesn't return a promise, so we need to wait
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
                
                // Wait for markers to refresh before finding the marker
                // The refresh animation takes time, so we retry finding the marker
                let retryCount = 0;
                const maxRetries = 15; // Increased retries for slower systems
                const retryInterval = 100; // 100ms between retries
                
                const tryFindMarker = () => {
                    if (!window.globeController || !window.globeController.sceneModel) {
                        // Globe not ready yet, retry
                        if (retryCount < maxRetries) {
                            retryCount++;
                            setTimeout(tryFindMarker, retryInterval);
                        }
                        return;
                    }
                    
                    const markers = window.globeController.sceneModel.getMarkers();
                    const eventMarker = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);
                    
                    if (eventMarker) {
                        // Found marker, show event
                        findAndShowEvent();
                    } else if (retryCount < maxRetries) {
                        // Marker not found yet, retry
                        retryCount++;
                        setTimeout(tryFindMarker, retryInterval);
                    } else {
                        // Marker not found after retries, try anyway (might be a different issue)
                        console.warn(`[EventNavigationManager] Marker not found for event "${targetEvent.name}" after ${maxRetries} retries`);
                        findAndShowEvent();
                    }
                };
                
                // Start trying after a short delay to allow refresh to begin
                setTimeout(tryFindMarker, 150);
                return; // Exit early, findAndShowEvent will be called after refresh
            }
        }

        // No page change needed - find and show event immediately
        findAndShowEvent();
    }

    /**
     * Setup event navigation buttons (prev/next in full events list)
     */
    setupEventNavigation() {
        const prevBtn = document.getElementById('eventPrevBtn');
        const nextBtn = document.getElementById('eventNextBtn');

        if (!prevBtn || !nextBtn) return;

        // Remove existing listeners by cloning
        const newPrevBtn = cloneButton(prevBtn);
        const newNextBtn = cloneButton(nextBtn);

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
            const newAllEventsBtn = cloneButton(allEventsBtn);

            newAllEventsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Play sound
                playNavigationSound('eventClick');

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
        const cloned = cloneButtons(['prevPageBtn', 'nextPageBtn', 'pageInput']);
        const newPrevBtn = cloned['prevPageBtn'];
        const newNextBtn = cloned['nextPageBtn'];
        const newPageInput = cloned['pageInput'];

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

        // Wrap updatePaginationUI to also update number buttons and ticker
        const originalUpdatePaginationUI = updatePaginationUI;
        const wrappedUpdatePaginationUI = () => {
            originalUpdatePaginationUI();
            if (updateNumberButtons) {
                updateNumberButtons();
            }
            // Update news ticker with headlines from current page
            if (window.NavigationPaginationHelpers && window.NavigationPaginationHelpers.updateNewsTickerFromGlobe) {
                window.NavigationPaginationHelpers.updateNewsTickerFromGlobe();
            }
        };

        // Initial update
        wrappedUpdatePaginationUI();

        // Previous page button - go to previous page or wrap to last
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!newPrevBtn.disabled) {
                handlePrevPageClick(this.dataModel, wrappedUpdatePaginationUI, onPageChange);
            }
        });

        // Next page button - go to next page or wrap to first
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!newNextBtn.disabled) {
                handleNextPageClick(this.dataModel, wrappedUpdatePaginationUI, onPageChange);
            }
        });

        // Manual page input
        newPageInput.addEventListener('change', (e) => {
            const inputValue = parseInt(e.target.value);
            handlePageInputChange(inputValue, this.dataModel, wrappedUpdatePaginationUI, onPageChange);
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
                resetButtonStyles(btn);
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
                        isLocked = isEventMarkerLocked(targetEvent, markers, CoordinateMatcher);
                    }

                    // Apply visual changes - use CSS classes only, no inline styles
                    if (isLocked) {
                        btn.disabled = true;
                        btn.classList.add('locked');
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
            const newBtn = cloneButton(btn);

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

                // Use helper for hover behavior
                if (window.globeController && window.globeController.sceneModel && window.globeController.interactionController) {
                    handleNumberButtonMouseEnter(
                        marker,
                        window.globeController.sceneModel,
                        window.globeController.interactionController
                    );
                }
            });

            // Mouse leave: stop pulse, restore camera, resume auto rotation if enabled
            newBtn.addEventListener('mouseleave', (e) => {
                const marker = getMarkerForPosition();
                
                // Use helper for mouse leave behavior
                if (window.globeController && window.globeController.sceneModel) {
                    handleNumberButtonMouseLeave(
                        marker,
                        window.globeController.sceneModel,
                        this.uiView
                    );
                }
            });

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Don't allow clicking disabled buttons
                if (newBtn.disabled) return;

                // Play sound
                playNavigationSound('eventClick');

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

                        if (eventMarker && window.globeController.interactionController) {
                            // Use helper for click handling
                            handleNumberButtonClick({
                                targetEvent,
                                eventMarker,
                                eventSlideManager: this.eventSlideManager,
                                interactionController: window.globeController.interactionController
                            });
                        }
                    }
                }
            });
        });

        // Return update function so it can be called when page changes
        return updateNumberButtons;
    }
}
