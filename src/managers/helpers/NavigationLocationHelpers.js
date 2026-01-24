/**
 * NavigationLocationHelpers - Utilities for handling different location types in navigation
 * Extracted from EventNavigationManager to reduce duplication
 */

/**
 * Handles camera/zoom behavior based on location type
 * @param {Object} interactionController - InteractionController instance
 * @param {Object} marker - Marker object
 * @param {string} locationType - Location type ('earth', 'moon', 'mars', 'station')
 */
export function handleLocationTypeCamera(interactionController, marker, locationType) {
    if (locationType === 'moon' || locationType === 'mars') {
        // Reset camera to default view for Moon/Mars events
        interactionController.resetCameraToDefault();
    } else if (locationType === 'station') {
        // For station events, hide Moon/Mars panels and follow the station
        interactionController.setPlanesVisibility(false);
        interactionController.startFollowingStation(marker);
    } else {
        // Zoom in and center on the marker (Earth events)
        interactionController.zoomToMarker(marker);
    }
}

/**
 * Gets location type from marker or event data
 * @param {Object} marker - Marker object (optional)
 * @param {Object} eventData - Event data object (optional)
 * @returns {string} - Location type, defaults to 'earth'
 */
export function getLocationType(marker, eventData) {
    if (marker && marker.userData && marker.userData.locationType) {
        return marker.userData.locationType;
    }
    if (eventData && eventData.locationType) {
        return eventData.locationType;
    }
    return 'earth';
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.NavigationLocationHelpers) {
        window.NavigationLocationHelpers = {};
    }
    window.NavigationLocationHelpers.handleLocationTypeCamera = handleLocationTypeCamera;
    window.NavigationLocationHelpers.getLocationType = getLocationType;
}
