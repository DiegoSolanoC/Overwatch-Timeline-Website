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
import {
    handlePrevPageClick,
    handleNextPageClick,
    handlePageInputChange,
    updatePaginationButtonStates,
    EVENT_PAGE_SLIDER_RESOLUTION,
    normalizedProgressFromSliderValue,
    pageFromSliderProgress,
    sliderValueForPageCenter,
    clearEventPageSliderSuppressFromGlobe,
} from './helpers/NavigationPaginationHelpers.js';
import {
    shouldEventBeLocked,
    getPreferredVariantIndexForActiveFilters,
    countFilterMatchingEntitiesInEvent
} from './helpers/MarkerCreationHelpers.js';
import { getGlobalEventNumber1Based } from './helpers/EventSlideShowHelpers.js';
import { useOrbitPanelForStationShipMarkers } from './helpers/TransportOrbitPanelHelpers.js';
import {
    showEventsHoverPreview,
    hideEventsHoverPreview,
    getHoverPreviewLines,
    getPlainEventTitleForHover
} from '../utils/EventsHoverPreviewBadge.js';
import { dismissFiltersAndMusicPanels } from '../utils/PanelDismissHelpers.js';
import { findVariantMarker } from './helpers/VariantHelpers.js';
import { buildGlobalEraStripeBackgroundLinearGradient } from '../utils/EraHoverPreviewTheme.js';
import { createMap2dLiteNavigationStub } from '../ui/Map2DLiteLayer.js';

/** Incremented per thumb <img> so late onload/onerror from a previous URL is ignored */
const THUMB_IMG_LOAD_GEN_KEY = '__owThumbLoadGen';

/** First variant or root — aligns with default slide / marker label for multi-events */
function getDisplayEventForPaginationThumb(rootEvent) {
    if (!rootEvent) return null;
    if (Array.isArray(rootEvent.variants) && rootEvent.variants.length > 0) {
        return rootEvent.variants[0] || rootEvent;
    }
    return rootEvent;
}

/** Same rule as dock thumbs / event list: first variant (or root) must have a non-empty description */
function eventRootSlotMissingDescription(rootEvent) {
    if (!rootEvent) return true;
    const displayEv = getDisplayEventForPaginationThumb(rootEvent) || rootEvent;
    const d = displayEv && displayEv.description;
    return !(d && String(d).trim().length > 0);
}

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
        } else if (locationType === 'station' || locationType === 'marsShip') {
            const sm = typeof window !== 'undefined' ? window.globeController?.sceneModel : null;
            if (sm && useOrbitPanelForStationShipMarkers(sm)) {
                return this.matchXYCoordinates(marker, event);
            }
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
        console.log(`[CoordinateMatcher] Searching for: ${targetEvent.name}, locationType: ${targetLocationType}, among ${markers.length} markers`);

        const found = markers.find(m => {
            if (m.userData && m.userData.isEventMarker) {
                const markerEvent = m.userData.event;
                const markerLocationType = m.userData.locationType || 'earth';

                // Location types must match
                if (markerLocationType !== targetLocationType) return false;

                // Match by event object reference first
                if (markerEvent === targetEvent) {
                    console.log(`[CoordinateMatcher] Matched by object reference: ${markerEvent.name}`);
                    return true;
                }

                // Match by coordinates based on location type
                const coordMatch = this.matchCoordinates(m, targetEvent, targetLocationType);
                if (coordMatch) {
                    console.log(`[CoordinateMatcher] Matched by coordinates: marker=${markerEvent?.name}, target=${targetEvent.name}`);
                }
                return coordMatch;
            }
            return false;
        });
        
        if (!found) {
            // Log marker info for debugging
            const eventMarkers = markers.filter(m => m.userData?.isEventMarker);
            console.log(`[CoordinateMatcher] No match found. Event markers on globe:`, eventMarkers.map(m => ({
                name: m.userData?.event?.name,
                lat: m.userData?.lat,
                lon: m.userData?.lon,
                x: m.userData?.x,
                y: m.userData?.y,
                locationType: m.userData?.locationType
            })));
            console.log(`[CoordinateMatcher] Target event:`, {name: targetEvent.name, lat: targetEvent.lat, lon: targetEvent.lon, x: targetEvent.x, y: targetEvent.y, locationType: targetEvent.locationType});
        }
        
        return found || null;
    }
};

/**
 * Variant index reflected on globe pagination thumbnails.
 * Priority:
 *   - If filters active and only 1 variant matches: force that variant (no switching allowed)
 *   - If filters active and 2+ match: respect user's manual selection, else filter-preferred
 *   - No filters: respect user's manual selection, else 0
 */
function getPaginationThumbVariantIndex(targetEvent, globalEventIndex) {
    if (!targetEvent || !Array.isArray(targetEvent.variants) || targetEvent.variants.length <= 1) {
        return 0;
    }
    try {
        // NOTE: Use standaloneActiveFilters instead of sceneModel.activeFilters
        const activeFilters = window.standaloneActiveFilters;
        const filtersOn = activeFilters && activeFilters.size > 0;
        
        if (filtersOn) {
            const matchingCount = countFilterMatchingEntitiesInEvent(targetEvent, activeFilters);
            
            // Only 1 variant matches: force it, ignore manual selection
            if (matchingCount === 1) {
                let v = getPreferredVariantIndexForActiveFilters(targetEvent, activeFilters);
                return Math.max(0, Math.min(targetEvent.variants.length - 1, v));
            }
            
            // 2+ variants match: allow manual selection
            const itemKey = `event-${globalEventIndex}`;
            const manualSelection = window.eventManager?.eventItemVariantIndices?.get(itemKey);
            if (manualSelection !== undefined && manualSelection !== null) {
                return Math.max(0, Math.min(targetEvent.variants.length - 1, manualSelection));
            }
            
            // No manual selection, use filter-preferred
            let v = getPreferredVariantIndexForActiveFilters(targetEvent, activeFilters);
            return Math.max(0, Math.min(targetEvent.variants.length - 1, v));
        }
        
        // No filters: respect manual selection or default to 0
        const itemKey = `event-${globalEventIndex}`;
        const manualSelection = window.eventManager?.eventItemVariantIndices?.get(itemKey);
        if (manualSelection !== undefined && manualSelection !== null) {
            return Math.max(0, Math.min(targetEvent.variants.length - 1, manualSelection));
        }
        
        return 0;
    } catch (_) {
        return 0;
    }
}

function findMarkerForPaginationThumb(sceneModel, markers, targetEvent, globalEventIndex) {
    if (!targetEvent || !markers) {
        console.log(`[findMarkerForPaginationThumb] Missing targetEvent or markers`);
        return null;
    }
    console.log(`[findMarkerForPaginationThumb] Looking for: ${targetEvent.name}, globalIndex: ${globalEventIndex}`);
    
    if (Array.isArray(targetEvent.variants) && targetEvent.variants.length > 1 && sceneModel) {
        const vi = getPaginationThumbVariantIndex(targetEvent, globalEventIndex);
        const vm = findVariantMarker(sceneModel, targetEvent, vi);
        if (vm) {
            console.log(`[findMarkerForPaginationThumb] Found via variant marker`);
            return vm;
        }
    }
    const found = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);
    console.log(`[findMarkerForPaginationThumb] CoordinateMatcher result: ${found ? 'FOUND' : 'NOT FOUND'}`);
    if (found) return found;

    const mapOn = sceneModel.getMapViewEnabled?.() ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView;
    if (!mapOn) return null;
    if ((targetEvent.locationType || 'earth') !== 'earth') return null;

    let displayEvent;
    let variantIndex;
    if (Array.isArray(targetEvent.variants) && targetEvent.variants.length > 0) {
        if (targetEvent.variants.length > 1) {
            const vi = getPaginationThumbVariantIndex(targetEvent, globalEventIndex);
            variantIndex = vi;
            displayEvent = targetEvent.variants[vi] || targetEvent.variants[0];
        } else {
            variantIndex = 0;
            displayEvent = targetEvent.variants[0];
        }
    } else {
        displayEvent = targetEvent;
        variantIndex = null;
    }
    return createMap2dLiteNavigationStub(targetEvent, displayEvent, variantIndex, sceneModel);
}

/** WAAPI keyframes: outgoing shrink (per-slot wave, overlaps following slot) */
function thumbPageTurnShrinkKeyframes(isThumbsDesktop, locked) {
    if (isThumbsDesktop) {
        const from = locked
            ? { opacity: 0.5, transform: 'skewX(-11deg)' }
            : { opacity: 1, transform: 'skewX(-11deg) translateY(0) scale(1)' };
        const to = locked
            ? { opacity: 0, transform: 'skewX(-11deg) scale(0.68)' }
            : { opacity: 0, transform: 'skewX(-11deg) translateY(18px) scale(0.7)' };
        return [from, to];
    }
    const from = locked
        ? { opacity: 0.5, transform: 'none' }
        : { opacity: 1, transform: 'translateY(0) scale(1)' };
    const to = locked
        ? { opacity: 0, transform: 'scale(0.65)' }
        : { opacity: 0, transform: 'translateY(16px) scale(0.72)' };
    return [from, to];
}

function thumbPageTurnGrowKeyframes(isThumbsDesktop, locked) {
    if (isThumbsDesktop) {
        const from = {
            opacity: 0,
            transform: 'skewX(-11deg) translateY(16px) scale(0.8)'
        };
        const to = locked
            ? { opacity: 0.5, transform: 'skewX(-11deg)' }
            : { opacity: 1, transform: 'skewX(-11deg) translateY(0) scale(1)' };
        return [from, to];
    }
    const from = { opacity: 0, transform: 'translateY(14px) scale(0.82)' };
    const to = locked
        ? { opacity: 0.5, transform: 'none' }
        : { opacity: 1, transform: 'translateY(0) scale(1)' };
    return [from, to];
}

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

        const updateSlideNavButtons = () => {
            setTimeout(() => {
                const prevBtn = document.getElementById('eventPrevBtn');
                const nextBtn = document.getElementById('eventNextBtn');
                if (prevBtn && nextBtn) {
                    const evs = this.getAllEvents();
                    const currentIndex = this.getCurrentEventIndex();
                    prevBtn.disabled = currentIndex <= 0 || evs.length === 0;
                    nextBtn.disabled = currentIndex >= evs.length - 1 || evs.length === 0;
                }
            }, 0);
        };

        /** Timeline: zoom + marker when available; Codex: slide only (no globe). */
        const findAndShowEvent = () => {
            let eventMarker = null;
            if (window.globeController && window.globeController.globeView) {
                const markers = window.globeController.sceneModel.getMarkers();
                eventMarker = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);

                if (eventMarker && window.globeController.interactionController) {
                    const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
                    const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;
                    const locationType = getLocationType(eventMarker, displayEvent);
                    handleLocationTypeCamera(window.globeController.interactionController, eventMarker, locationType);
                }
            }

            const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
            const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;
            const eventName = displayEvent.name || targetEvent.name
                || (eventMarker && eventMarker.userData && eventMarker.userData.eventName)
                || '';
            const eventDescription = displayEvent.description;
            const imagePath = getEventImagePath(displayEvent, eventName);

            const esm = this.eventSlideManager
                || window.globeController?.uiView?.eventSlideManager
                || window.__codexEventSlideBridge?.eventSlideManager;
            if (esm) {
                esm.showEventSlide(
                    eventName,
                    imagePath,
                    eventDescription,
                    eventMarker,
                    targetEvent
                );
            }
            updateSlideNavButtons();
        };

        // Check if event is on current page, if not switch to correct page
        if (this.dataModel) {
            const eventsPerPage = this.dataModel.eventsPerPage || 10;
            const targetPage = Math.floor(targetIndex / eventsPerPage) + 1;
            const currentPage = this.dataModel.getCurrentEventPage();

            if (targetPage !== currentPage) {
                this.dataModel.setCurrentEventPage(targetPage);
                clearEventPageSliderSuppressFromGlobe();

                const ui = window.globeController?.uiView || window.__codexEventSlideBridge?.uiView;
                if (ui && typeof ui.updatePaginationUI === 'function') {
                    ui.updatePaginationUI();
                }

                if (!window.globeController) {
                    setTimeout(() => findAndShowEvent(), 0);
                    return;
                }

                if (window.globeController.globeView) {
                    window.globeController.globeView.refreshEventMarkers();
                }
                if (window.globeController.uiView) {
                    window.globeController.uiView.setupEventPagination(() => {
                        if (window.globeController.globeView) {
                            window.globeController.globeView.refreshEventMarkers(true, {
                                preservePaginationThumbEntrance: true
                            });
                        }
                    });
                }

                let retryCount = 0;
                const maxRetries = 15;
                const retryInterval = 100;

                const tryFindMarker = () => {
                    if (!window.globeController || !window.globeController.sceneModel) {
                        if (retryCount < maxRetries) {
                            retryCount++;
                            setTimeout(tryFindMarker, retryInterval);
                        }
                        return;
                    }

                    const markers = window.globeController.sceneModel.getMarkers();
                    const eventMarker = CoordinateMatcher.findMarkerForEvent(markers, targetEvent);

                    if (eventMarker) {
                        findAndShowEvent();
                    } else if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(tryFindMarker, retryInterval);
                    } else {
                        console.warn(`[EventNavigationManager] Marker not found for event "${targetEvent.name}" after ${maxRetries} retries`);
                        findAndShowEvent();
                    }
                };

                setTimeout(tryFindMarker, 150);
                return;
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

                // Open event manager on the page that contains the current event
                const currentIndex = this.getCurrentEventIndex();
                const em = window.eventManager;
                if (em && currentIndex >= 0 && em.events && em.events.length > 0) {
                    const perPage = em.eventsPerPage || 50;
                    const totalPages = Math.max(1, Math.ceil(em.events.length / perPage));
                    const targetPage = Math.min(Math.max(1, Math.floor(currentIndex / perPage) + 1), totalPages);
                    em.currentPage = targetPage;
                    em.renderService?.requestPageEntranceAnimation?.();
                    if (em.renderEvents) em.renderEvents();
                    if (em.renderPaginationControls) em.renderPaginationControls();
                }

                dismissFiltersAndMusicPanels();

                // Open event manager panel (keep globe visible)
                const panel = document.getElementById('eventsManagePanel');
                const toggleBtn = document.getElementById('eventsManageToggle');
                if (panel) {
                    panel.classList.add('open');
                }
                if (toggleBtn) {
                    toggleBtn.classList.add('active');
                }
                try {
                    window.EventsHoverPreviewBadge?.hide();
                } catch (_) {}
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

        const pageSliderEl = document.getElementById('eventPageSlider');
        if (pageSliderEl && pageSliderEl.parentNode) {
            const freshSlider = pageSliderEl.cloneNode(true);
            pageSliderEl.parentNode.replaceChild(freshSlider, pageSliderEl);
        }
        const pageSlider = document.getElementById('eventPageSlider');

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

            const ticksEl = document.getElementById('eventPageSliderTicks');
            if (ticksEl) {
                ticksEl.innerHTML = '';
                const tpTicks = Math.max(1, totalPages);
                const eventsPerPage = this.dataModel.eventsPerPage || 10;
                const totalEvents = Array.isArray(this.dataModel.events) ? this.dataModel.events.length : 0;
                
                // Add page number labels at the start of each page segment
                for (let i = 0; i < tpTicks; i++) {
                    const label = document.createElement('span');
                    label.className = 'event-page-slider-label';
                    label.style.left = `${(i / tpTicks) * 100}%`;
                    label.textContent = String(i + 1);
                    ticksEl.appendChild(label);
                }
                
                // Add major tick marks between pages
                if (tpTicks > 1) {
                    for (let i = 1; i < tpTicks; i++) {
                        const tick = document.createElement('span');
                        tick.className = 'event-page-slider-tick event-page-slider-tick--major';
                        tick.style.left = `${(i / tpTicks) * 100}%`;
                        ticksEl.appendChild(tick);
                    }
                }
                // NOTE: Use standaloneActiveFilters instead of sceneModel.activeFilters
                const activeFilters = window.standaloneActiveFilters || null;
                const filtersOn = activeFilters && activeFilters.size > 0;
                const events = Array.isArray(this.dataModel.events) ? this.dataModel.events : [];

                for (let p = 0; p < tpTicks; p++) {
                    const onPage = Math.min(
                        eventsPerPage,
                        Math.max(0, totalEvents - p * eventsPerPage)
                    );
                    if (onPage <= 1) continue;
                    for (let k = 1; k < onPage; k++) {
                        const sub = document.createElement('span');
                        sub.className = 'event-page-slider-tick event-page-slider-tick--sub';
                        sub.style.left = `${((p + k / onPage) / tpTicks) * 100}%`;
                        if (filtersOn) {
                            const gL = p * eventsPerPage + (k - 1);
                            const gR = p * eventsPerPage + k;
                            const evL = gL >= 0 && gL < totalEvents ? events[gL] : null;
                            const evR = gR >= 0 && gR < totalEvents ? events[gR] : null;
                            const passes = (ev) =>
                                !!(ev && !shouldEventBeLocked(ev, activeFilters));
                            if (passes(evL) || passes(evR)) {
                                sub.classList.add('event-page-slider-tick--filter-hit');
                            }
                        }
                        ticksEl.appendChild(sub);
                    }
                }

                /* Center of each event slot: red when that root slot lacks description (progress aid) */
                for (let p = 0; p < tpTicks; p++) {
                    const onPage = Math.min(
                        eventsPerPage,
                        Math.max(0, totalEvents - p * eventsPerPage)
                    );
                    for (let e = 0; e < onPage; e++) {
                        const g = p * eventsPerPage + e;
                        const rootEv = g >= 0 && g < totalEvents ? events[g] : null;
                        if (!eventRootSlotMissingDescription(rootEv)) continue;
                        const mark = document.createElement('span');
                        mark.className =
                            'event-page-slider-tick event-page-slider-tick--unfinished-slot';
                        mark.style.left = `${((p + (e + 0.5) / onPage) / tpTicks) * 100}%`;
                        mark.title = 'Unfinished: missing description';
                        ticksEl.appendChild(mark);
                    }
                }
            }

            if (pageSlider) {
                const tp = Math.max(1, totalPages);
                const cur = Math.min(Math.max(1, currentPage), tp);
                const prevTp = this.uiView._eventPageSliderLastTotalPages;
                if (prevTp !== totalPages) {
                    this.uiView._suppressEventPageSliderSync = false;
                    this.uiView._eventPageSliderLastTotalPages = totalPages;
                }
                pageSlider.min = '0';
                pageSlider.max = String(EVENT_PAGE_SLIDER_RESOLUTION);
                pageSlider.step = '1';
                pageSlider.disabled = totalPages <= 1;
                const pointerActive = this.uiView._eventPageSliderPointerActive === true;
                const skipProgrammaticSlider =
                    pointerActive || this.uiView._suppressEventPageSliderSync === true;
                if (totalPages > 1 && !skipProgrammaticSlider) {
                    pageSlider.value = String(sliderValueForPageCenter(cur, tp));
                }
                const label = `Pages: scrub the bar (${cur} of ${tp})`;
                pageSlider.title = label;
                pageSlider.setAttribute('aria-label', label);
                pageSlider.setAttribute('aria-valuemin', '0');
                pageSlider.setAttribute('aria-valuemax', String(EVENT_PAGE_SLIDER_RESOLUTION));
                pageSlider.setAttribute('aria-valuenow', pageSlider.value);
                pageSlider.setAttribute(
                    'aria-valuetext',
                    `Page ${cur} of ${tp}; move within the current segment until you cross into the next page`
                );
            }

            // Enable wrap buttons (icons are <img> in markup; only titles + disabled change)
            if (totalPages > 1) {
                if (currentPage === 1) {
                    newPrevBtn.disabled = false;
                    newPrevBtn.title = 'Go to Last Page';
                } else {
                    newPrevBtn.disabled = false;
                    newPrevBtn.title = 'Previous Page';
                }
                if (currentPage === totalPages) {
                    newNextBtn.disabled = false;
                    newNextBtn.title = 'Go to First Page';
                } else {
                    newNextBtn.disabled = false;
                    newNextBtn.title = 'Next Page';
                }
            } else {
                newPrevBtn.disabled = true;
                newNextBtn.disabled = true;
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

            let eraStrip = document.getElementById('eventPageSliderEraStrip');
            if (!eraStrip && pageSlider) {
                const wrap = pageSlider.closest('.event-page-slider-wrap');
                if (wrap) {
                    eraStrip = document.createElement('div');
                    eraStrip.id = 'eventPageSliderEraStrip';
                    eraStrip.className = 'event-page-slider-era-strip';
                    eraStrip.setAttribute('aria-hidden', 'true');
                    wrap.appendChild(eraStrip);
                }
            }
            if (eraStrip) {
                const allEv = Array.isArray(this.dataModel.events) ? this.dataModel.events : [];
                const eps = this.dataModel.eventsPerPage || 10;
                const tpStrip = Math.max(1, totalPages);
                eraStrip.style.background = buildGlobalEraStripeBackgroundLinearGradient(
                    allEv,
                    eps,
                    tpStrip
                );
            }
        };

        // Setup event number buttons (1-10) - get update function
        const updateNumberButtons = this.setupEventNumberButtons();
        // Store updateNumberButtons so it can be called when filters are applied
        this.uiView.updateNumberButtons = updateNumberButtons;

        // Wrap updatePaginationUI to also update number buttons and ticker
        const originalUpdatePaginationUI = updatePaginationUI;
        const wrappedUpdatePaginationUI = (animate = false, opts = {}) => {
            originalUpdatePaginationUI();
            if (updateNumberButtons) {
                updateNumberButtons(animate, opts);
            }
            // Update news ticker with headlines from current page
            if (window.NavigationPaginationHelpers && window.NavigationPaginationHelpers.updateNewsTickerFromGlobe) {
                window.NavigationPaginationHelpers.updateNewsTickerFromGlobe();
            }
        };

        // Initial update (no animation)
        wrappedUpdatePaginationUI(false);

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

        if (pageSlider) {
            const sliderGesture = {
                down: false,
                dragLike: false,
                inputEvents: 0,
                tapPendingPageSound: false
            };
            let removeMoveListener = null;
            const clearMoveListener = () => {
                if (removeMoveListener) {
                    removeMoveListener();
                    removeMoveListener = null;
                }
            };
            const endSliderPointer = () => {
                this.uiView._eventPageSliderPointerActive = false;
                this.uiView._suppressEventPageSliderSync = true;
                if (
                    sliderGesture.tapPendingPageSound
                    && window.SoundEffectsManager
                    && typeof window.SoundEffectsManager.play === 'function'
                ) {
                    window.SoundEffectsManager.play('page');
                }
                sliderGesture.tapPendingPageSound = false;
                sliderGesture.down = false;
                sliderGesture.dragLike = false;
                sliderGesture.inputEvents = 0;
                clearMoveListener();
            };
            pageSlider.addEventListener('pointerdown', (e) => {
                sliderGesture.down = true;
                sliderGesture.dragLike = false;
                sliderGesture.inputEvents = 0;
                sliderGesture.tapPendingPageSound = false;
                this.uiView._eventPageSliderPointerActive = true;
                clearMoveListener();
                const startX = e.clientX;
                const startY = e.clientY;
                const onMove = (ev) => {
                    if (!sliderGesture.down) return;
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;
                    if (dx * dx + dy * dy > 100) {
                        sliderGesture.dragLike = true;
                        sliderGesture.tapPendingPageSound = false;
                    }
                };
                window.addEventListener('pointermove', onMove);
                removeMoveListener = () => window.removeEventListener('pointermove', onMove);
                const onUp = () => {
                    window.removeEventListener('pointerup', onUp);
                    window.removeEventListener('pointercancel', onUp);
                    endSliderPointer();
                };
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
            });
            pageSlider.addEventListener('input', () => {
                const tp = Math.max(1, this.dataModel.getTotalEventPages());
                if (tp <= 1) return;
                const t = normalizedProgressFromSliderValue(pageSlider.value);
                const newPage = pageFromSliderProgress(t, tp);
                const cur = this.dataModel.getCurrentEventPage();
                if (newPage === cur) return;
                const oldPage = cur;
                sliderGesture.inputEvents += 1;
                handlePageInputChange(newPage, this.dataModel, wrappedUpdatePaginationUI, onPageChange, false);
                const scrubDrag =
                    sliderGesture.dragLike || sliderGesture.inputEvents >= 2;
                if (scrubDrag) {
                    sliderGesture.tapPendingPageSound = false;
                    if (
                        oldPage !== newPage
                        && window.PanelResizeGearTick
                        && typeof window.PanelResizeGearTick.play === 'function'
                    ) {
                        window.PanelResizeGearTick.play();
                    }
                } else {
                    sliderGesture.tapPendingPageSound = true;
                }
            });
        }

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
        this.uiView._paginationOnPageChange = onPageChange;

        if (typeof window.EventSlideGlitchHelpers?.bindGlitchTextClickDelegationGlobePagination === 'function') {
            window.EventSlideGlitchHelpers.bindGlitchTextClickDelegationGlobePagination(this.uiView);
        }
    }

    /**
     * Show hover preview for a globe pagination slot (1–10).
     * NOTE: Camera centering removed - only shows preview badge.
     */
    applyGlobePaginationThumbHover(position) {
        if (position == null) return;
        const p = Number(position);
        if (!Number.isFinite(p) || p < 1 || p > 10) return;

        const container = document.getElementById('eventNumberButtons');
        if (!container) return;
        const btn = container.querySelector(`.event-number-btn[data-position="${p}"]`);
        if (!btn || btn.disabled) return;

        // NOTE: Use Event System's data instead of Globe's dataModel
        const allEvents = window.eventManager?.events || [];
        const currentPageNum = window.standaloneEventSlide?.currentPage || 1;
        const eps = 10; // events per page
        const startIndex = (currentPageNum - 1) * eps;
        const endIndex = startIndex + eps;
        const currentPageEvents = allEvents.slice(startIndex, endIndex);
        
        const eventIndex = p - 1;
        if (eventIndex >= currentPageEvents.length) return;

        const targetEvent = currentPageEvents[eventIndex];

        // Show hover preview badge only (no camera centering)
        const lockedOnMap = false; // Simplified - Event System doesn't have locked events on map
        if (targetEvent && !lockedOnMap) {
            const n = (currentPageNum - 1) * eps + eventIndex + 1; // Global event number (1-based)
            const { primary, otherVariants, era, primaryRowFlag, otherRowFlags, yearLine } =
                getHoverPreviewLines(targetEvent);
            showEventsHoverPreview(n, primary, otherVariants, era, primaryRowFlag, otherRowFlags, yearLine);
        }
    }

    /**
     * Setup event number buttons (1-10) to open events by position on current page
     * Returns the update function so it can be called when page changes
     */
    setupEventNumberButtons(onPageChange) {
        const numberButtonsContainer = document.getElementById('eventNumberButtons');
        if (!numberButtonsContainer || !this.dataModel) return;

        this.uiView._globePaginationHover = this.uiView._globePaginationHover || { position: null };
        this.uiView.refreshGlobePaginationThumbHover = (cycledGlobalEventIndex) => {
            const pos = this.uiView._globePaginationHover?.position;
            if (pos == null) return;
            const eps = this.dataModel.eventsPerPage || 10;
            const pageNum = this.dataModel.getCurrentEventPage();
            const slotGlobalIx = (pageNum - 1) * eps + (pos - 1);
            if (
                cycledGlobalEventIndex !== undefined &&
                cycledGlobalEventIndex !== null &&
                cycledGlobalEventIndex !== slotGlobalIx
            ) {
                return;
            }
            this.applyGlobePaginationThumbHover(pos);
        };

        // Get all number buttons
        const numberButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');
        
        /** Web Animations id — dock collapse uses pure CSS; page-turn uses WAAPI to bypass transform/transition wars */
        const THUMB_PAGE_TURN_ANIM_ID = 'pagination-thumb-page-turn';
        let thumbPageTurnAnimToken = 0;
        let thumbPageTurnTimeoutIds = [];

        // Update button states based on current page - only show buttons for events that exist
        const updateNumberButtons = (animate = false, opts = {}) => {
            const preserveThumbEntrance = opts.preserveThumbEntrance === true;
            const currentButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');
            const btnArray = Array.from(currentButtons);

            const currentPageEvents = this.dataModel.getEventsForCurrentPage();
            const eventsPerPage = this.dataModel.eventsPerPage || 10;
            const numEventsOnPage = currentPageEvents.length;

            const prefersReducedMotion =
                window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const doPageTurnWave =
                animate === true &&
                !preserveThumbEntrance &&
                !prefersReducedMotion &&
                typeof Element.prototype.animate === 'function';

            const wasVisibleByIndex = doPageTurnWave
                ? btnArray.map((b) => b.style.display !== 'none')
                : null;

            const hasThumbPageTurnEffect = (btn) => {
                if (typeof btn.getAnimations !== 'function') return false;
                return btn.getAnimations().some((a) => a.id === THUMB_PAGE_TURN_ANIM_ID);
            };

            let waveToken = thumbPageTurnAnimToken;
            if (!preserveThumbEntrance) {
                thumbPageTurnTimeoutIds.forEach((tid) => window.clearTimeout(tid));
                thumbPageTurnTimeoutIds = [];
                btnArray.forEach((btn) => {
                    if (typeof btn.getAnimations === 'function') {
                        btn.getAnimations().forEach((a) => {
                            if (a.id === THUMB_PAGE_TURN_ANIM_ID) a.cancel();
                        });
                    }
                });
                thumbPageTurnAnimToken += 1;
                waveToken = thumbPageTurnAnimToken;
            }

            btnArray.forEach((btn) => {
                resetButtonStyles(btn, {
                    skipOpacityTransform: preserveThumbEntrance && hasThumbPageTurnEffect(btn)
                });
                if (!preserveThumbEntrance) {
                    btn.classList.remove('event-number-btn--enter', 'event-number-btn--enter-active');
                    btn.style.transitionDelay = '';
                }
            });

            if (doPageTurnWave && wasVisibleByIndex) {
                btnArray.forEach((btn, i) => {
                    if (!wasVisibleByIndex[i]) btn.style.display = 'none';
                });
            }

            // NOTE: Use standaloneActiveFilters instead of sceneModel.activeFilters
            const activeFilters = window.standaloneActiveFilters;
            const filtersOn = !!(activeFilters && activeFilters.size > 0);

            const applyPaginationThumbSlot = (btn, eventIndex) => {
                const position = eventIndex + 1;
                const imgEl = btn.querySelector('.event-number-btn__img');
                const nameEl = btn.querySelector('.event-number-btn__name');
                const imgWrap = btn.querySelector('.event-number-btn__img-wrap');
                let keyEl = btn.querySelector('.event-number-btn__key');
                if (!keyEl) {
                    const visual = btn.querySelector('.event-number-btn__visual');
                    if (visual) {
                        keyEl = document.createElement('span');
                        keyEl.className = 'event-number-btn__key';
                        keyEl.setAttribute('aria-hidden', 'true');
                        visual.appendChild(keyEl);
                    }
                }
                if (keyEl) keyEl.setAttribute('aria-hidden', 'true');

                let variantBadge = btn.querySelector('.event-number-btn__variant-badge');
                if (!variantBadge) {
                    const visualForBadge = btn.querySelector('.event-number-btn__visual');
                    if (visualForBadge) {
                        variantBadge = document.createElement('div');
                        variantBadge.className = 'multi-event-badge event-number-btn__variant-badge';
                        variantBadge.setAttribute('role', 'button');
                        variantBadge.setAttribute('title', 'Switch variant');
                        variantBadge.setAttribute('aria-label', 'Cycle event variant');
                        variantBadge.tabIndex = -1;
                        variantBadge.hidden = true;
                        visualForBadge.appendChild(variantBadge);
                    }
                }

                if (eventIndex >= numEventsOnPage) {
                    btn.style.display = 'none';
                    btn.classList.remove('event-number-btn--unfinished');
                    if (imgEl) {
                        imgEl.removeAttribute('src');
                        imgEl.alt = '';
                        imgEl.style.display = '';
                    }
                    if (nameEl) nameEl.textContent = '';
                    if (keyEl) keyEl.textContent = '';
                    if (variantBadge) {
                        variantBadge.hidden = true;
                        variantBadge.tabIndex = -1;
                        variantBadge.removeAttribute('data-event-index');
                        variantBadge.textContent = '';
                    }
                    if (imgWrap) {
                        imgWrap.classList.remove(
                            'event-number-btn__img-wrap--empty',
                            'event-number-btn__img-wrap--loading'
                        );
                    }
                } else {
                    btn.style.display = 'flex';
                    const targetEvent = currentPageEvents[eventIndex];
                    const currentPageNum = this.dataModel.getCurrentEventPage();
                    const eps = this.dataModel.eventsPerPage || 10;
                    const globalEventIndex = (currentPageNum - 1) * eps + eventIndex;

                    let displayEv = getDisplayEventForPaginationThumb(targetEvent);
                    let variantIndexShown = 0;
                    if (Array.isArray(targetEvent?.variants) && targetEvent.variants.length > 0) {
                        variantIndexShown = getPaginationThumbVariantIndex(targetEvent, globalEventIndex);
                        displayEv = targetEvent.variants[variantIndexShown] || displayEv;
                    }

                    const plainName =
                        getPlainEventTitleForHover(displayEv)
                        || getPlainEventTitleForHover(targetEvent)
                        || `Event ${position}`;
                    const hasDescription =
                        displayEv.description && String(displayEv.description).trim().length > 0;
                    btn.classList.toggle('event-number-btn--unfinished', !hasDescription);
                    btn.title = hasDescription ? plainName : `${plainName} — Unfinished: missing description`;
                    if (nameEl) {
                        if (window.GlitchTextService) {
                            nameEl.innerHTML = window.GlitchTextService.getDisplayEventName(plainName);
                        } else {
                            nameEl.textContent = plainName;
                        }
                    }
                    if (keyEl) keyEl.textContent = String(position);
                    if (imgEl && imgWrap) {
                        const path = getEventImagePath(displayEv, plainName);
                        imgWrap.classList.toggle('event-number-btn__img-wrap--empty', !path);
                        if (path) {
                            const gen = (imgEl[THUMB_IMG_LOAD_GEN_KEY] || 0) + 1;
                            imgEl[THUMB_IMG_LOAD_GEN_KEY] = gen;
                            imgWrap.classList.add('event-number-btn__img-wrap--loading');
                            imgEl.style.display = '';
                            imgEl.onerror = () => {
                                if (imgEl[THUMB_IMG_LOAD_GEN_KEY] !== gen) return;
                                imgEl.style.display = 'none';
                                imgWrap.classList.remove('event-number-btn__img-wrap--loading');
                                imgWrap.classList.add('event-number-btn__img-wrap--empty');
                            };
                            imgEl.onload = () => {
                                if (imgEl[THUMB_IMG_LOAD_GEN_KEY] !== gen) return;
                                imgWrap.classList.remove('event-number-btn__img-wrap--loading');
                            };
                            imgEl.removeAttribute('src');
                            imgEl.alt = plainName;
                            imgEl.src = path;
                            if (
                                imgEl.complete &&
                                imgEl.naturalWidth > 0 &&
                                imgEl[THUMB_IMG_LOAD_GEN_KEY] === gen
                            ) {
                                imgWrap.classList.remove('event-number-btn__img-wrap--loading');
                            }
                        } else {
                            imgEl.removeAttribute('src');
                            imgEl.alt = plainName;
                            imgEl.style.display = 'none';
                            imgWrap.classList.remove('event-number-btn__img-wrap--loading');
                        }
                    }

                    let isLocked = false;
                    if (filtersOn && activeFilters) {
                        isLocked = shouldEventBeLocked(targetEvent, activeFilters);
                    } else if (window.globeController && window.globeController.globeView && sceneModel) {
                        const markers = sceneModel.getMarkers();
                        isLocked = isEventMarkerLocked(targetEvent, markers, CoordinateMatcher);
                    }

                    if (variantBadge) {
                        const multi = Array.isArray(targetEvent.variants) && targetEvent.variants.length > 1;
                        const matchingCount = (filtersOn && activeFilters)
                            ? countFilterMatchingEntitiesInEvent(targetEvent, activeFilters)
                            : targetEvent.variants?.length || 1;
                        const showBadge = multi && matchingCount >= 2;
                        if (showBadge) {
                            variantBadge.hidden = false;
                            variantBadge.tabIndex = 0;
                            variantBadge.dataset.eventIndex = String(globalEventIndex);
                            variantBadge.textContent = `${variantIndexShown + 1}/${targetEvent.variants.length}`;
                        } else {
                            variantBadge.hidden = true;
                            variantBadge.tabIndex = -1;
                            variantBadge.removeAttribute('data-event-index');
                            variantBadge.textContent = '';
                        }
                    }

                    if (isLocked) {
                        btn.disabled = true;
                        btn.classList.add('locked');
                    } else {
                        btn.disabled = false;
                        btn.classList.remove('locked');
                    }
                }
            };

            if (!doPageTurnWave) {
                btnArray.forEach((btn, index) => applyPaginationThumbSlot(btn, index));
            }

            if (window.GlitchTextService?.isEnabled()) {
                window.GlitchTextService.startAnimation();
            }

            if (doPageTurnWave && wasVisibleByIndex) {
                const isThumbsDesktop = numberButtonsContainer.classList.contains(
                    'event-number-buttons--thumbs-desktop'
                );
                const staggerMs = 58;
                const shrinkMs = 290;
                const growMs = 515;
                const easing = 'cubic-bezier(0.22, 0.88, 0.18, 1)';
                const nSlots = btnArray.length;
                const willShow = (i) => i < numEventsOnPage;

                const pushT = (fn, ms) => {
                    const tid = window.setTimeout(fn, ms);
                    thumbPageTurnTimeoutIds.push(tid);
                };

                for (let i = 0; i < nSlots; i += 1) {
                    const slotIndex = i;
                    const wasVis = wasVisibleByIndex[i];
                    const willVis = willShow(slotIndex);
                    const startAt = slotIndex * staggerMs;

                    pushT(() => {
                        if (waveToken !== thumbPageTurnAnimToken) return;
                        const btn = btnArray[slotIndex];
                        if (!btn) return;

                        const runGrow = () => {
                            if (waveToken !== thumbPageTurnAnimToken) return;
                            if (!willVis) return;
                            const lockedAfter = btn.disabled || btn.classList.contains('locked');
                            const [g0, g1] = thumbPageTurnGrowKeyframes(isThumbsDesktop, lockedAfter);
                            btn.animate([g0, g1], {
                                id: THUMB_PAGE_TURN_ANIM_ID,
                                duration: growMs,
                                easing,
                                fill: 'forwards'
                            });
                        };

                        if (wasVis && willVis) {
                            const lockedBefore = btn.disabled || btn.classList.contains('locked');
                            const [s0, s1] = thumbPageTurnShrinkKeyframes(isThumbsDesktop, lockedBefore);
                            const shrink = btn.animate([s0, s1], {
                                id: THUMB_PAGE_TURN_ANIM_ID,
                                duration: shrinkMs,
                                easing,
                                fill: 'forwards'
                            });
                            shrink.finished
                                .then(() => {
                                    if (waveToken !== thumbPageTurnAnimToken) return;
                                    try {
                                        shrink.cancel();
                                    } catch (_) {}
                                    applyPaginationThumbSlot(btn, slotIndex);
                                    runGrow();
                                })
                                .catch(() => {});
                            return;
                        }

                        if (wasVis && !willVis) {
                            const lockedBefore = btn.disabled || btn.classList.contains('locked');
                            const [s0, s1] = thumbPageTurnShrinkKeyframes(isThumbsDesktop, lockedBefore);
                            const shrink = btn.animate([s0, s1], {
                                id: THUMB_PAGE_TURN_ANIM_ID,
                                duration: shrinkMs,
                                easing,
                                fill: 'forwards'
                            });
                            shrink.finished
                                .then(() => {
                                    if (waveToken !== thumbPageTurnAnimToken) return;
                                    try {
                                        shrink.cancel();
                                    } catch (_) {}
                                    applyPaginationThumbSlot(btn, slotIndex);
                                })
                                .catch(() => {});
                            return;
                        }

                        if (!wasVis && willVis) {
                            applyPaginationThumbSlot(btn, slotIndex);
                            runGrow();
                            return;
                        }

                        applyPaginationThumbSlot(btn, slotIndex);
                    }, startAt);
                }

                const maxMs = (nSlots - 1) * staggerMs + shrinkMs + growMs + 80;
                pushT(() => {
                    if (waveToken !== thumbPageTurnAnimToken) return;
                    btnArray.forEach((btn) => {
                        if (typeof btn.getAnimations !== 'function') return;
                        btn.getAnimations().forEach((a) => {
                            if (a.id === THUMB_PAGE_TURN_ANIM_ID) {
                                try {
                                    a.cancel();
                                } catch (_) {}
                            }
                        });
                    });
                }, maxMs);
            }
        };

        // Clone each slot to attach listeners on the nodes that stay in the DOM, then load thumbnails.
        // If we called updateNumberButtons() before this loop, img onload/onerror would be bound to nodes
        // that cloneButton replaces; clones copy --loading but not those handlers (first page stuck loading).
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
                    const currentPageNum = this.dataModel.getCurrentEventPage();
                    const eps = this.dataModel.eventsPerPage || 10;
                    const globalIx = (currentPageNum - 1) * eps + eventIndex;
                    return findMarkerForPaginationThumb(
                        window.globeController.sceneModel,
                        markers,
                        targetEvent,
                        globalIx
                    );
                }
                return null;
            };

            const onNumberBtnHoverStart = () => {
                if (newBtn.disabled) return;
                this.uiView._globePaginationHover.position = position;
                this.applyGlobePaginationThumbHover(position);
            };

            // Pointer events only: also subscribing to mouseenter would run this twice per hover
            // (mouse + pointer), doubling pulse rings and camera moves — glitchy first moments).
            newBtn.addEventListener('pointerenter', onNumberBtnHoverStart);

            // Mouse leave: stop pulse, restore camera, resume auto rotation if enabled
            const onNumberBtnHoverEnd = () => {
                this.uiView._globePaginationHover.position = null;

                hideEventsHoverPreview();

                const currentPageEventsLeave = this.dataModel.getEventsForCurrentPage();
                const eventIndexLeave = position - 1;
                const targetEventLeave =
                    eventIndexLeave < currentPageEventsLeave.length
                        ? currentPageEventsLeave[eventIndexLeave]
                        : null;

                const marker = getMarkerForPosition();

                if (
                    targetEventLeave &&
                    Array.isArray(targetEventLeave.variants) &&
                    targetEventLeave.variants.length > 1
                ) {
                    const slideEl = document.getElementById('eventSlide');
                    const panelOpen = slideEl?.classList.contains('open');
                    const keepVariantPinsVisible =
                        panelOpen && this.uiView.currentEventData === targetEventLeave;
                    if (!keepVariantPinsVisible) {
                        this.uiView.hideVariantMarkers(targetEventLeave);
                    }
                }

                // Use helper for mouse leave behavior
                if (window.globeController && window.globeController.sceneModel) {
                    handleNumberButtonMouseLeave(
                        marker,
                        window.globeController.sceneModel,
                        this.uiView
                    );
                }
            };

            newBtn.addEventListener('pointerleave', onNumberBtnHoverEnd);

            const variantBadgeEl = newBtn.querySelector('.event-number-btn__variant-badge');
            if (variantBadgeEl) {
                variantBadgeEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (variantBadgeEl.hidden) return;
                    const idx = Number.parseInt(variantBadgeEl.getAttribute('data-event-index') || '', 10);
                    if (!Number.isFinite(idx)) return;
                    const evs = this.dataModel.getEventsForCurrentPage();
                    const slot = position - 1;
                    if (slot < 0 || slot >= evs.length) return;
                    const rootEvent = evs[slot];
                    if (!rootEvent?.variants || rootEvent.variants.length <= 1) return;
                    const em = window.eventManager;
                    if (!em?.interactionService?.cycleEventVariant) return;
                    const listBadge = document.querySelector(
                        `.event-item .multi-event-badge[data-event-index="${idx}"]`
                    );
                    const listItem = listBadge?.closest?.('.event-item') ?? null;
                    em.interactionService.cycleEventVariant(idx, rootEvent, listItem);
                });
                variantBadgeEl.addEventListener('mousedown', (e) => e.stopPropagation());
                variantBadgeEl.addEventListener('keydown', (e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (variantBadgeEl.hidden) return;
                    variantBadgeEl.click();
                });
            }

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

                    const currentPageNum = this.dataModel.getCurrentEventPage();
                    const eps = this.dataModel.eventsPerPage || 10;
                    const globalIx = (currentPageNum - 1) * eps + eventIndex;
                    const variantIndexForSlide = getPaginationThumbVariantIndex(targetEvent, globalIx);

                    const esm = this.eventSlideManager
                        || window.globeController?.uiView?.eventSlideManager
                        || window.__codexEventSlideBridge?.eventSlideManager;

                    if (window.globeController && window.globeController.globeView) {
                        const markers = window.globeController.sceneModel.getMarkers();
                        const eventMarker = findMarkerForPaginationThumb(
                            window.globeController.sceneModel,
                            markers,
                            targetEvent,
                            globalIx
                        );

                        if (eventMarker && eventMarker.userData && eventMarker.userData.isLocked) {
                            return;
                        }

                        if (eventMarker && window.globeController.interactionController && esm) {
                            handleNumberButtonClick({
                                targetEvent,
                                eventMarker,
                                eventSlideManager: esm,
                                interactionController: window.globeController.interactionController,
                                variantIndex: variantIndexForSlide
                            });
                        } else if (!eventMarker && esm) {
                            handleNumberButtonClick({
                                targetEvent,
                                eventMarker: null,
                                eventSlideManager: esm,
                                interactionController: null,
                                variantIndex: variantIndexForSlide
                            });
                        }
                    } else if (esm) {
                        handleNumberButtonClick({
                            targetEvent,
                            eventMarker: null,
                            eventSlideManager: esm,
                            interactionController: null,
                            variantIndex: variantIndexForSlide
                        });
                    }
                }
            });
        });

        updateNumberButtons();

        // Return update function so it can be called when page changes
        return updateNumberButtons;
    }
}
