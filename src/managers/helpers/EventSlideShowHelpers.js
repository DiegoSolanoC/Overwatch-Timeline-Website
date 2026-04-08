/**
 * EventSlideShowHelpers - Utilities for showing event slides
 * Extracted from EventSlideManager to reduce file size and follow Small Functions principle
 */

/**
 * 1-based index of an event in the global timeline list (for title prefix).
 * @param {Object|null} eventData - Root event object (or variant object for fallback match)
 * @param {Object|null} dataModel
 * @returns {number|null}
 */
/** Resolve timeline arrays (injected dataModel may be stale vs window sync). */
function getCandidateEventLists(dataModel) {
    const lists = [];
    const push = (arr) => {
        if (Array.isArray(arr) && arr.length > 0) lists.push(arr);
    };
    if (dataModel) {
        push(typeof dataModel.getAllEvents === 'function' ? dataModel.getAllEvents() : dataModel.events);
    }
    try {
        push(window.globeController?.dataModel?.getAllEvents?.());
        push(window.globeController?.dataModel?.events);
        push(window.eventManager?.events);
    } catch (_) {}
    return lists;
}

export function getGlobalEventNumber1Based(eventData, dataModel) {
    if (!eventData) return null;
    const lists = getCandidateEventLists(dataModel);
    for (const list of lists) {
        let idx = list.indexOf(eventData);
        if (idx >= 0) return idx + 1;
        for (let i = 0; i < list.length; i++) {
            const variants = list[i]?.variants;
            if (Array.isArray(variants) && variants.includes(eventData)) return i + 1;
        }
    }
    return null;
}

/**
 * Prefix display title with global event number (HTML-safe wrapper around glitch/HTML name).
 */
export function formatEventSlideTitleHtml(displayNameHtml, eventData, dataModel) {
    if (!displayNameHtml) return displayNameHtml;
    const n = getGlobalEventNumber1Based(eventData, dataModel);
    if (n == null) return displayNameHtml;
    return `<span class="event-slide-title-number">${n}.</span> ${displayNameHtml}`;
}

/**
 * Initialize event slide state and auto-rotate
 */
export function initializeEventSlideState(eventSlideManager, marker, eventData, initialVariantIndex, uiView) {
    // Store current event marker and data
    eventSlideManager.currentEventMarker = marker;
    eventSlideManager.currentEventData = eventData;
    eventSlideManager.currentVariantIndex = initialVariantIndex;
    
    // Sync with UIView using helper
    const syncState = window.EventSlideStateHelpers?.syncStateWithUIView;
    if (syncState) {
        syncState(uiView, { 
            currentEventMarker: marker, 
            currentEventData: eventData, 
            currentVariantIndex: initialVariantIndex 
        });
    } else {
        uiView.currentEventMarker = marker;
        uiView.currentEventData = eventData;
        uiView.currentVariantIndex = initialVariantIndex;
    }
    
    // Setup auto-rotate for event
    const setupEventAutoRotate = window.EventSlideStateHelpers?.setupEventAutoRotate;
    if (setupEventAutoRotate) {
        eventSlideManager.previousAutoRotateState = setupEventAutoRotate(eventSlideManager.sceneModel, marker);
    } else {
        eventSlideManager.previousAutoRotateState = eventSlideManager.sceneModel.getAutoRotateEnabled();
        eventSlideManager.sceneModel.setAutoRotateEnabled(true);
        eventSlideManager.sceneModel.setAutoRotate(false);
        eventSlideManager.sceneModel.eventMarker = marker;
    }
}

/**
 * Update event slide content (title, location, description)
 */
export function updateEventSlideContent(eventSlideManager, eventName, description, eventData, marker, isMultiEvent, initialVariantIndex, isAlreadyOpen) {
    const eventSlideTitle = document.getElementById('eventSlideTitle');
    const eventSlideText = document.getElementById('eventSlideText');
    const eventSlideLocation = document.getElementById('eventSlideLocation');
    
    const getDisplayEventName = window.EventSlideContentHelpers?.getDisplayEventName || 
        ((name) => window.GlitchTextService?.getDisplayEventName(name) || name);
    const getDisplayText = window.EventSlideContentHelpers?.getDisplayText || 
        ((text) => window.GlitchTextService?.getDisplayText(text) || text);
    
    // Update title (global event # before name)
    if (eventSlideTitle) {
        const nameHtml = getDisplayEventName(eventName);
        const titleHtml = formatEventSlideTitleHtml(nameHtml, eventData, eventSlideManager.dataModel);
        eventSlideManager.updateContentWithFade(eventSlideTitle, titleHtml, isAlreadyOpen);
    }
    
    // Update location
    if (eventSlideLocation && eventData) {
        eventSlideManager.setupLocationDisplay(eventSlideLocation, eventData, marker, isMultiEvent, initialVariantIndex, isAlreadyOpen);
    }

    updateEventSlideTimelineMeta(eventData);
    
    // Update description
    if (eventSlideText) {
        const descriptionText = description || 'Placeholder text for event information. This will be replaced with actual event details.';
        eventSlideManager.updateContentWithFade(eventSlideText, getDisplayText(descriptionText), isAlreadyOpen);
    }
}

/**
 * Handle variant markers visibility
 */
export function handleVariantMarkers(uiView, currentEventData, eventData) {
    // Hide variant markers for previous event (if switching between events)
    if (currentEventData && currentEventData !== eventData && currentEventData.variants?.length > 0) {
        uiView.hideVariantMarkers(currentEventData);
    }
    
    // Show variant markers for this event (if it's a multi-event)
    if (eventData?.variants?.length > 0) {
        uiView.showVariantMarkers(eventData);
    }
}

/**
 * Update event sources and filters
 */
/**
 * Year line under location: "FirstYear - SecondYear", single year, or "Year Unknown".
 * @param {Object|null} eventData
 */
export function updateEventSlideTimelineMeta(eventData) {
    const helpers = typeof window !== 'undefined' ? window.EventTimelineHelpers : null;
    const line =
        helpers && typeof helpers.formatPanelYearRangeLine === 'function'
            ? helpers.formatPanelYearRangeLine(eventData)
            : 'Year Unknown';

    const eraEl = document.getElementById('eventSlideEra');
    if (eraEl) {
        eraEl.textContent = '';
        eraEl.classList.add('event-slide-era-heading--empty');
        eraEl.setAttribute('aria-hidden', 'true');
    }

    const timelineMeta = document.getElementById('eventSlideTimelineMeta');
    if (!timelineMeta) return;

    timelineMeta.textContent = line;
    timelineMeta.style.display = '';
}

export function updateEventSourcesAndFilters(uiView, currentEvent) {
    uiView.updateEventSources(currentEvent);
    uiView.updateEventFilters(currentEvent);
    // Also update after a delay to ensure DOM is ready
    setTimeout(() => {
        uiView.updateEventSources(currentEvent);
        uiView.updateEventFilters(currentEvent);
    }, 100);
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.EventSlideShowHelpers) {
        window.EventSlideShowHelpers = {};
    }
    window.EventSlideShowHelpers.initializeEventSlideState = initializeEventSlideState;
    window.EventSlideShowHelpers.updateEventSlideContent = updateEventSlideContent;
    window.EventSlideShowHelpers.updateEventSlideTimelineMeta = updateEventSlideTimelineMeta;
    window.EventSlideShowHelpers.handleVariantMarkers = handleVariantMarkers;
    window.EventSlideShowHelpers.updateEventSourcesAndFilters = updateEventSourcesAndFilters;
    window.EventSlideShowHelpers.getGlobalEventNumber1Based = getGlobalEventNumber1Based;
    window.EventSlideShowHelpers.formatEventSlideTitleHtml = formatEventSlideTitleHtml;
}
