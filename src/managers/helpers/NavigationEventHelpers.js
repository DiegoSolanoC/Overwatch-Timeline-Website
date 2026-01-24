/**
 * NavigationEventHelpers - Utilities for event navigation click handling
 * Extracted from EventNavigationManager to reduce complexity
 */

import { getEventImagePath } from './NavigationImageHelpers.js';
import { handleLocationTypeCamera, getLocationType } from './NavigationLocationHelpers.js';

/**
 * Handles clicking a number button to navigate to an event
 * @param {Object} params - Parameters
 * @param {Object} params.targetEvent - Target event to navigate to
 * @param {Object} params.eventMarker - Marker for the event
 * @param {Object} params.eventSlideManager - EventSlideManager instance
 * @param {Object} params.interactionController - InteractionController instance
 */
export function handleNumberButtonClick({ targetEvent, eventMarker, eventSlideManager, interactionController }) {
    // Check if this is a multi-event
    const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
    const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;

    const eventName = displayEvent.name || eventMarker.userData.eventName;
    const eventDescription = displayEvent.description;

    // Get image path using helper
    const imagePath = getEventImagePath(displayEvent, eventName);

    // Zoom to marker or reset to default view (for Moon/Mars/Station) and show event slide
    if (interactionController) {
        const locationType = getLocationType(eventMarker, displayEvent);
        handleLocationTypeCamera(interactionController, eventMarker, locationType);
    }

    eventSlideManager.showEventSlide(
        eventName,
        imagePath,
        eventDescription,
        eventMarker,
        targetEvent
    );
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.NavigationEventHelpers) {
        window.NavigationEventHelpers = {};
    }
    window.NavigationEventHelpers.handleNumberButtonClick = handleNumberButtonClick;
}
