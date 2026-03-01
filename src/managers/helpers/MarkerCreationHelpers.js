/**
 * MarkerCreationHelpers - Utilities for creating event markers
 * Extracted from EventMarkerManager to reduce duplication
 */

/**
 * Creates a marker mesh with specified properties
 * @param {Object} params - Parameters
 * @param {number} params.radius - Marker radius
 * @param {number} params.color - Marker color (hex)
 * @param {THREE.Vector3} params.position - Marker position
 * @returns {THREE.Mesh} - The created marker mesh
 */
export function createMarkerMesh({ radius, color, position }) {
    const THREE = window.THREE;
    
    const markerGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color)
    });
    
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.material.needsUpdate = true;
    marker.position.copy(position);
    
    return marker;
}

/**
 * Creates marker userData object
 * @param {Object} params - Parameters
 * @param {Object} params.event - Event object
 * @param {Object} params.variant - Variant object (optional)
 * @param {number} params.variantIndex - Variant index (optional)
 * @param {string} params.displayName - Display name
 * @param {string} params.locationType - Location type
 * @param {number} params.lat - Latitude (optional)
 * @param {number} params.lon - Longitude (optional)
 * @param {number} params.x - X coordinate (optional)
 * @param {number} params.y - Y coordinate (optional)
 * @param {boolean} params.isInteractive - Whether marker is interactive
 * @param {boolean} params.isMainVariant - Whether this is the main variant
 * @param {boolean} params.shouldBeLocked - Whether marker should be locked
 * @param {number} params.originalColor - Original color for restoration
 * @returns {Object} - UserData object
 */
export function createMarkerUserData({ 
    event, 
    variant, 
    variantIndex, 
    displayName, 
    locationType, 
    lat, 
    lon, 
    x, 
    y, 
    isInteractive, 
    isMainVariant, 
    shouldBeLocked, 
    originalColor 
}) {
    return {
        event: event,
        variant: variant || undefined,
        variantIndex: variantIndex !== undefined ? variantIndex : undefined,
        eventName: displayName,
        locationType: locationType,
        lat: locationType === 'earth' ? lat : undefined,
        lon: locationType === 'earth' ? lon : undefined,
        x: locationType !== 'earth' ? x : undefined,
        y: locationType !== 'earth' ? y : undefined,
        isEventMarker: true,
        isInteractive: isInteractive,
        isMainVariant: isMainVariant,
        pulseRings: [],
        isLocked: shouldBeLocked,
        originalScale: 1.0,
        originalColor: originalColor
    };
}

/**
 * Checks if an event should be locked based on active filters
 * @param {Object} event - Event object
 * @param {Set} activeFilters - Set of active filter IDs
 * @returns {boolean} - True if event should be locked
 */
export function shouldEventBeLocked(event, activeFilters) {
    if (!activeFilters || activeFilters.size === 0) {
        return false;
    }
    
    const eventHeroFilters = event.filters || [];
    const eventFactionFilters = event.factions || [];
    const hasMatchingHero = eventHeroFilters.some(filter => activeFilters.has(filter));
    const hasMatchingFaction = eventFactionFilters.some(faction => activeFilters.has(faction));
    const hasMatchingFilter = hasMatchingHero || hasMatchingFaction;
    
    return !hasMatchingFilter;
}

/**
 * Gets marker radius based on screen size and variant type
 * @param {boolean} isMainVariant - Whether this is the main variant
 * @returns {number} - Marker radius
 */
export function getMarkerRadius(isMainVariant) {
    const isSmallMobile = window.innerWidth <= 480;
    const isMapView = window.globeController?.sceneModel?.getMapViewEnabled
        ? window.globeController.sceneModel.getMapViewEnabled()
        : !!window.globeController?.sceneModel?.isMapView;
    
    if (isMainVariant) {
        // Mobile unwrapped-map: markers read too large; shrink slightly only in map view.
        if (isSmallMobile && isMapView) return 0.026;
        return isSmallMobile ? 0.030 : 0.015;
    } else {
        if (isSmallMobile && isMapView) return 0.017;
        return isSmallMobile ? 0.020 : 0.010;
    }
}

/**
 * Gets marker color based on variant type
 * @param {boolean} isMainVariant - Whether this is the main variant
 * @returns {number} - Color hex value
 */
export function getMarkerColor(isMainVariant) {
    return isMainVariant ? 0xff6600 : 0xff69b4; // Orange or hot pink
}
