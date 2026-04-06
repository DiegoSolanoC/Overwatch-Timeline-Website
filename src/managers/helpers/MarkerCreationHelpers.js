/**
 * MarkerCreationHelpers - Utilities for creating event markers
 * Extracted from EventMarkerManager to reduce duplication
 */

/** Draw after clouds (0) / aurora (1) / rim (1–2) so pins and hover don’t fight atmosphere. */
export const EVENT_PIN_RENDER_ORDER = 14;
export const EVENT_MARKER_RENDER_ORDER = 15;
/** Must match {@link EVENT_MARKER_RENDER_ORDER} usage in MarkerPulseService (script tag; no shared import). */
export const EVENT_PULSE_RING_RENDER_ORDER = 17;

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
    marker.renderOrder = EVENT_MARKER_RENDER_ORDER;
    
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
 * True if this entity's hero/faction ids intersect active globe filters.
 * @param {Object|null|undefined} entity - Event root or variant object
 * @param {Set} activeFilters - Set of active filter IDs
 */
export function entityMatchesActiveFilters(entity, activeFilters) {
    if (!entity || !activeFilters || activeFilters.size === 0) {
        return false;
    }
    const heroFilters = entity.filters || [];
    const factionFilters = entity.factions || [];
    return heroFilters.some((id) => activeFilters.has(id))
        || factionFilters.some((id) => activeFilters.has(id));
}

/**
 * First variant index that matches filters, or 0 if only the root matches, or 0 when no filters.
 * @param {Object|null|undefined} event - Root timeline event (may include `variants[]`)
 * @param {Set} activeFilters
 * @returns {number}
 */
export function getPreferredVariantIndexForActiveFilters(event, activeFilters) {
    if (!event || !activeFilters || activeFilters.size === 0) {
        return 0;
    }
    const variants = event.variants;
    if (!variants || variants.length === 0) {
        return 0;
    }
    for (let i = 0; i < variants.length; i++) {
        if (entityMatchesActiveFilters(variants[i], activeFilters)) {
            return i;
        }
    }
    if (entityMatchesActiveFilters(event, activeFilters)) {
        return 0;
    }
    return 0;
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
    if (!event) {
        return true;
    }
    const variants = event.variants;
    if (variants && variants.length > 0) {
        if (entityMatchesActiveFilters(event, activeFilters)) {
            return false;
        }
        return !variants.some((v) => entityMatchesActiveFilters(v, activeFilters));
    }
    return !entityMatchesActiveFilters(event, activeFilters);
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

    const base = isMainVariant
        ? (isSmallMobile ? 0.030 : 0.015)
        : (isSmallMobile ? 0.020 : 0.010);

    // Map view: event pins should be smaller (desktop + mobile).
    return isMapView ? (base * 0.7) : base;
}

/**
 * Gets marker color based on variant type (same on all UI palettes)
 * @param {boolean} isMainVariant - Whether this is the main variant
 * @returns {number} - Color hex value
 */
export function getMarkerColor(isMainVariant) {
    return isMainVariant ? 0xff6600 : 0xff69b4;
}

/**
 * Default restore color when userData.originalColor was never set.
 * @param {{ isInteractive?: boolean, isMainVariant?: boolean }} userData
 * @returns {number}
 */
export function getDefaultMarkerOriginalHex(userData) {
    if (!userData || userData.isInteractive === false) {
        return getMarkerColor(false);
    }
    return getMarkerColor(userData.isMainVariant !== false);
}

/**
 * When the color palette changes, update unlocked event markers + pin lines to match.
 * @param {*} sceneModel
 */
export function applyPaletteToExistingEventMarkers(sceneModel) {
    if (!sceneModel || typeof sceneModel.getMarkers !== 'function') return;
    const markers = sceneModel.getMarkers();
    if (!markers || !markers.length) return;

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const ud = marker.userData;
        if (!ud || !ud.isEventMarker || ud.isLocked) continue;

        const isInteractive = ud.isInteractive !== false;
        const isMainVariant = ud.isMainVariant !== false;
        const hex = isInteractive && isMainVariant ? getMarkerColor(true) : getMarkerColor(false);

        ud.originalColor = hex;
        if (marker.material && marker.material.color && typeof marker.material.color.setHex === 'function') {
            marker.material.color.setHex(hex);
        }

        const pin = ud.pinLine;
        if (isMainVariant && pin && pin.material && pin.material.color && typeof pin.material.color.setHex === 'function') {
            pin.material.color.setHex(hex);
        }

        delete ud._hoverGlowBase;
    }
}
