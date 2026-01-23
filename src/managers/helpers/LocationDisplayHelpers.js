/**
 * LocationDisplayHelpers - Utilities for displaying location information
 * Extracted from EventSlideManager to reduce duplication
 */

/**
 * Creates location content HTML with icon
 * @param {string} locationName - Location name to display
 * @returns {string} - HTML string with icon and location name
 */
export function createLocationContent(locationName) {
    return `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
}

/**
 * Sets up location element with fade transition
 * @param {HTMLElement} element - Location element
 * @param {string} content - HTML content
 * @param {boolean} isAlreadyOpen - Whether slide is already open
 */
export function setLocationContentWithFade(element, content, isAlreadyOpen) {
    if (!element) return;
    
    if (isAlreadyOpen) {
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0';
        setTimeout(() => {
            element.innerHTML = content;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.opacity = '1';
            }, 10);
        }, 200);
    } else {
        element.innerHTML = content;
        element.style.display = 'block';
        element.style.opacity = '1';
    }
}

/**
 * Hides location element with fade transition
 * @param {HTMLElement} element - Location element
 * @param {boolean} isAlreadyOpen - Whether slide is already open
 */
export function hideLocationWithFade(element, isAlreadyOpen) {
    if (!element) return;
    
    if (isAlreadyOpen) {
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.display = 'none';
        }, 200);
    } else {
        element.style.display = 'none';
    }
    element.onclick = null;
    element.style.cursor = '';
    element.title = '';
}

/**
 * Sets up click handler for location element
 * @param {HTMLElement} element - Location element
 * @param {Object} marker - Event marker
 * @param {string} locationType - Location type (earth, moon, mars, station)
 */
export function setupLocationClickHandler(element, marker, locationType) {
    if (!element || !marker) return;
    
    element.style.cursor = 'pointer';
    element.title = 'Click to zoom to location';
    element.onclick = (e) => {
        e.stopPropagation();
        if (!window.globeController || !window.globeController.interactionController) return;
        
        if (locationType === 'moon' || locationType === 'mars') {
            window.globeController.interactionController.resetCameraToDefault();
        } else if (locationType === 'station') {
            window.globeController.interactionController.setPlanesVisibility(false);
            window.globeController.interactionController.startFollowingStation(marker);
        } else {
            window.globeController.interactionController.zoomToMarker(marker);
        }
    };
}

/**
 * Gets location name for Earth location type
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} locationName - Existing location name (optional)
 * @returns {string|null} - Location name or null
 */
export function getEarthLocationName(lat, lon, locationName = null) {
    if (locationName) return locationName;
    
    if (!window.eventManager) return null;
    
    // Check cache first
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    if (window.eventManager.locationCache && window.eventManager.locationCache.has(cacheKey)) {
        return window.eventManager.locationCache.get(cacheKey);
    }
    
    // Get location name (may return city only, will be enhanced later)
    return window.eventManager.getLocationName(lat, lon);
}

/**
 * Gets location name for Moon/Mars location type
 * @param {string} locationType - 'moon' or 'mars'
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} locationName - Existing location name (optional)
 * @returns {string} - Location name
 */
export function getMoonMarsLocationName(locationType, x, y, locationName = null) {
    if (locationName) return locationName;
    
    if (x !== undefined && y !== undefined) {
        return `${locationType === 'moon' ? 'Moon' : 'Mars'}: (${x.toFixed(1)}, ${y.toFixed(1)})`;
    }
    
    return locationType === 'moon' ? 'Moon' : 'Mars';
}

/**
 * Gets location name for Station location type
 * @param {string} locationName - Existing location name (optional)
 * @returns {string} - Location name
 */
export function getStationLocationName(locationName = null) {
    return locationName || 'Space Station (ISS)';
}

/**
 * Sets up location display for Earth type
 * @param {HTMLElement} element - Location element
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object} marker - Event marker
 * @param {boolean} isAlreadyOpen - Whether slide is already open
 * @param {string|null} existingLocationName - Existing location name (optional)
 * @param {boolean} enableUpdateCallback - Whether to enable location update callback
 * @returns {boolean} - True if location was set up successfully
 */
export function setupEarthLocation(element, lat, lon, marker, isAlreadyOpen, existingLocationName = null, enableUpdateCallback = false) {
    if (!element || lat === undefined || lon === undefined) return false;
    
    const locationName = getEarthLocationName(lat, lon, existingLocationName);
    
    if (locationName) {
        const content = createLocationContent(locationName);
        setLocationContentWithFade(element, content, isAlreadyOpen);
        setupLocationClickHandler(element, marker, 'earth');
        
        // Set up location update callback if enabled
        if (enableUpdateCallback) {
            const updateLocationInSlide = (updatedLat, updatedLon, updatedLocationName) => {
                if (Math.abs(updatedLat - lat) < 0.01 && Math.abs(updatedLon - lon) < 0.01) {
                    const updatedContent = createLocationContent(updatedLocationName);
                    element.innerHTML = updatedContent;
                    setupLocationClickHandler(element, marker, 'earth');
                }
            };
            window.updateEventSlideLocation = updateLocationInSlide;
        }
        
        return true;
    } else {
        // Show coordinates as fallback
        const content = createLocationContent(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        setLocationContentWithFade(element, content, isAlreadyOpen);
        setupLocationClickHandler(element, marker, 'earth');
        return true;
    }
}

/**
 * Sets up location display for Moon/Mars type
 * @param {HTMLElement} element - Location element
 * @param {string} locationType - 'moon' or 'mars'
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} locationName - Existing location name (optional)
 * @param {Object} marker - Event marker
 * @param {boolean} isAlreadyOpen - Whether slide is already open
 * @returns {boolean} - True if location was set up successfully
 */
export function setupMoonMarsLocation(element, locationType, x, y, locationName, marker, isAlreadyOpen) {
    if (!element) return false;
    
    const name = getMoonMarsLocationName(locationType, x, y, locationName);
    
    if (name) {
        const content = createLocationContent(name);
        setLocationContentWithFade(element, content, isAlreadyOpen);
        setupLocationClickHandler(element, marker, locationType);
        return true;
    } else {
        hideLocationWithFade(element, isAlreadyOpen);
        return false;
    }
}

/**
 * Sets up location display for Station type
 * @param {HTMLElement} element - Location element
 * @param {string} locationName - Existing location name (optional)
 * @param {Object} marker - Event marker
 * @param {boolean} isAlreadyOpen - Whether slide is already open
 * @returns {boolean} - True if location was set up successfully
 */
export function setupStationLocation(element, locationName, marker, isAlreadyOpen) {
    if (!element) return false;
    
    const name = getStationLocationName(locationName);
    
    if (name) {
        const content = createLocationContent(name);
        setLocationContentWithFade(element, content, isAlreadyOpen);
        setupLocationClickHandler(element, marker, 'station');
        return true;
    } else {
        hideLocationWithFade(element, isAlreadyOpen);
        return false;
    }
}
