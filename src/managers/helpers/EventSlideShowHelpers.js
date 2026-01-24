/**
 * EventSlideShowHelpers - Utilities for showing event slides
 * Extracted from EventSlideManager to reduce file size and follow Small Functions principle
 */

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
    
    // Update title
    if (eventSlideTitle) {
        eventSlideManager.updateContentWithFade(eventSlideTitle, getDisplayEventName(eventName), isAlreadyOpen);
    }
    
    // Update location
    if (eventSlideLocation && eventData) {
        eventSlideManager.setupLocationDisplay(eventSlideLocation, eventData, marker, isMultiEvent, initialVariantIndex, isAlreadyOpen);
    }
    
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
    window.EventSlideShowHelpers.handleVariantMarkers = handleVariantMarkers;
    window.EventSlideShowHelpers.updateEventSourcesAndFilters = updateEventSourcesAndFilters;
}
