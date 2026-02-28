/**
 * MarkerCreationLogicHelpers - Utilities for creating single and multi-event markers
 * Extracted from EventMarkerManager to reduce duplication
 */

import { calculateMarkerPosition } from './MarkerPositionHelpers.js';
import { createMarkerMesh, createMarkerUserData, shouldEventBeLocked, getMarkerRadius, getMarkerColor } from './MarkerCreationHelpers.js';
import { createPinLinePoints, createPinLine } from './PinLineHelpers.js';

/**
 * Creates a marker for a single event
 * @param {Object} params - Parameters
 * @param {Object} params.event - Event object
 * @param {Object} params.sceneModel - SceneModel instance
 * @param {Object} params.globe - Globe object
 * @param {Object} params.moonPlane - Moon plane object
 * @param {Object} params.marsPlane - Mars plane object
 * @param {Object} params.issSatellite - ISS satellite object
 * @param {boolean} params.animate - Whether to animate
 * @returns {Object|null} - Object with marker and pinLine, or null if creation failed
 */
export function createSingleEventMarker({ event, sceneModel, globe, moonPlane, marsPlane, issSatellite, animate }) {
    const eventLocationType = event.locationType || 'earth';
    const isMapView = sceneModel.getMapViewEnabled ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView;
    const earthMapPlane = sceneModel.getEarthMapPlane ? sceneModel.getEarthMapPlane() : sceneModel.earthMapPlane;
    const mapScaleFactor = (isMapView && earthMapPlane && earthMapPlane.scale) ? (earthMapPlane.scale.x || 1) : 1;
    const wantsMapScaleBoost = isMapView && (eventLocationType === 'moon' || eventLocationType === 'mars' || eventLocationType === 'station');
    
    // Calculate position using helper
    const positionData = calculateMarkerPosition({
        locationType: eventLocationType,
        lat: event.lat,
        lon: event.lon,
        x: event.x,
        y: event.y,
        globe, moonPlane, marsPlane, issSatellite
    });
    
    if (!positionData) {
        return null; // Helper already logged warning
    }
    
    const { position, targetParent } = positionData;
    
    // Get marker properties using helpers
    const markerRadius = getMarkerRadius(true); // Single events are always main variant
    const markerColor = getMarkerColor(true); // Orange
    
    // Create marker using helper
    const marker = createMarkerMesh({ radius: markerRadius, color: markerColor, position });
    
    const displayName = event.name || 'Event';
    
    // Check if this event should be locked using helper
    const activeFilters = sceneModel.activeFilters;
    const shouldBeLocked = shouldEventBeLocked(event, activeFilters);
    
    // Set initial scale based on animation and locked state
    if (animate) {
        marker.scale.set(0, 0, 0);
    } else if (shouldBeLocked) {
        // If locked and not animating, start at locked scale
        const s = (wantsMapScaleBoost ? mapScaleFactor : 1.0) * 0.75;
        marker.scale.set(s, s, s);
        // Set locked color immediately
        marker.material.color.setHex(0x331100);
    }
    
    marker.userData = { 
        event: event, // Store full event object
        eventName: displayName,
        locationType: eventLocationType,
        lat: eventLocationType === 'earth' ? event.lat : undefined,
        lon: eventLocationType === 'earth' ? event.lon : undefined,
        x: eventLocationType !== 'earth' ? (event.x !== undefined ? event.x : undefined) : undefined,
        y: eventLocationType !== 'earth' ? (event.y !== undefined ? event.y : undefined) : undefined,
        isEventMarker: true,
        isInteractive: true, // Single events are always interactive
        isMainVariant: true,
        pulseRings: [], // Store pulse rings for this marker
        isLocked: shouldBeLocked, // Set initial locked state based on filters
        originalScale: wantsMapScaleBoost ? mapScaleFactor : 1.0, // Store original scale for unlocking
        originalColor: 0xff6600 // Store original color (orange) for restoration
    };

    // If not animating and not locked, apply the intended base scale now.
    if (!animate && !shouldBeLocked && marker.userData.originalScale !== 1.0) {
        const s = marker.userData.originalScale;
        marker.scale.set(s, s, s);
    }
    
    targetParent.add(marker);
    const markers = sceneModel.getMarkers();
    markers.push(marker);
    
    // Add pin line using helper
    const pinLineData = createPinLinePoints({
        locationType: eventLocationType,
        markerPosition: position,
        lat: eventLocationType === 'earth' ? event.lat : undefined,
        lon: eventLocationType === 'earth' ? event.lon : undefined,
        globe, moonPlane, marsPlane, issSatellite
    });
    
    let pinLine = null;
    if (pinLineData) {
        const lineColor = shouldBeLocked ? 0x331100 : 0xff6600;
        pinLine = createPinLine({
            linePoints: pinLineData.linePoints,
            color: lineColor,
            animate,
            marker
        });
        
        pinLineData.lineParent.add(pinLine);
    }
    
    return { marker, pinLine };
}

/**
 * Creates markers for a multi-event (all variants)
 * @param {Object} params - Parameters
 * @param {Object} params.event - Event object
 * @param {Object} params.sceneModel - SceneModel instance
 * @param {Object} params.globe - Globe object
 * @param {Object} params.moonPlane - Moon plane object
 * @param {Object} params.marsPlane - Mars plane object
 * @param {Object} params.issSatellite - ISS satellite object
 * @param {boolean} params.animate - Whether to animate
 * @returns {Array} - Array of objects with marker and pinLine (only main variants have pinLines)
 */
export function createMultiEventMarkers({ event, sceneModel, globe, moonPlane, marsPlane, issSatellite, animate }) {
    const results = [];
    const eventLocationType = event.locationType || 'earth';
    const isMapView = sceneModel.getMapViewEnabled ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView;
    const earthMapPlane = sceneModel.getEarthMapPlane ? sceneModel.getEarthMapPlane() : sceneModel.earthMapPlane;
    const mapScaleFactor = (isMapView && earthMapPlane && earthMapPlane.scale) ? (earthMapPlane.scale.x || 1) : 1;
    const activeFilters = sceneModel.activeFilters;
    const shouldBeLocked = shouldEventBeLocked(event, activeFilters);
    
    event.variants.forEach((variant, variantIndex) => {
        // Get location type from variant if available, otherwise use event location type
        const variantLocationType = variant.locationType || eventLocationType;
        
        // Calculate position using helper
        const lat = variant.lat !== undefined ? variant.lat : event.lat;
        const lon = variant.lon !== undefined ? variant.lon : event.lon;
        const x = variant.x !== undefined ? variant.x : (event.x !== undefined ? event.x : undefined);
        const y = variant.y !== undefined ? variant.y : (event.y !== undefined ? event.y : undefined);
        
        const positionData = calculateMarkerPosition({
            locationType: variantLocationType,
            lat, lon, x, y,
            globe, moonPlane, marsPlane, issSatellite
        });
        
        if (!positionData) {
            return; // Helper already logged warning
        }
        
        const { position, targetParent } = positionData;
        
        const isMainVariant = variantIndex === 0;
        
        // Get marker properties using helpers
        const markerRadius = getMarkerRadius(isMainVariant);
        const markerColor = getMarkerColor(isMainVariant);
        const isInteractive = isMainVariant;
        
        // Create marker using helper
        const marker = createMarkerMesh({ radius: markerRadius, color: markerColor, position });
        
        const displayName = variant.name || `Variant ${variantIndex + 1}`;
        
        // Set initial scale based on animation and locked state
        if (animate) {
            marker.scale.set(0, 0, 0);
        } else if (shouldBeLocked) {
            // If locked and not animating, start at locked scale
            const wantsMapScaleBoost = isMapView && (variantLocationType === 'moon' || variantLocationType === 'mars' || variantLocationType === 'station');
            const s = (wantsMapScaleBoost ? mapScaleFactor : 1.0) * 0.75;
            marker.scale.set(s, s, s);
            // Set locked color immediately
            marker.material.color.setHex(0x331100);
        }
        
        // Create userData using helper
        marker.userData = createMarkerUserData({
            event,
            variant,
            variantIndex,
            displayName,
            locationType: variantLocationType,
            lat: variantLocationType === 'earth' ? lat : undefined,
            lon: variantLocationType === 'earth' ? lon : undefined,
            x: variantLocationType !== 'earth' ? x : undefined,
            y: variantLocationType !== 'earth' ? y : undefined,
            isInteractive,
            isMainVariant,
            shouldBeLocked,
            originalColor: markerColor
        });

        // Map view: make Moon/Mars/Station markers match Earth map marker sizing
        const wantsMapScaleBoost = isMapView && (variantLocationType === 'moon' || variantLocationType === 'mars' || variantLocationType === 'station');
        if (wantsMapScaleBoost) {
            marker.userData.originalScale = mapScaleFactor;
            if (!animate && !shouldBeLocked) {
                marker.scale.set(mapScaleFactor, mapScaleFactor, mapScaleFactor);
            }
        }
        
        // Hide variant markers by default (only show when event is open)
        if (!isMainVariant) {
            marker.visible = false;
        }
        
        targetParent.add(marker);
        const markers = sceneModel.getMarkers();
        markers.push(marker);
        
        let pinLine = null;
        // Add pin line for main variants using helper
        if (isMainVariant) {
            const pinLineData = createPinLinePoints({
                locationType: variantLocationType,
                markerPosition: position,
                lat: variantLocationType === 'earth' ? lat : undefined,
                lon: variantLocationType === 'earth' ? lon : undefined,
                globe, moonPlane, marsPlane, issSatellite
            });
            
            if (pinLineData) {
                const lineColor = shouldBeLocked ? 0x331100 : markerColor;
                pinLine = createPinLine({
                    linePoints: pinLineData.linePoints,
                    color: lineColor,
                    animate,
                    marker
                });
                
                pinLineData.lineParent.add(pinLine);
            }
        }
        
        results.push({ marker, pinLine, isMainVariant });
    });
    
    return results;
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.MarkerCreationLogicHelpers) {
        window.MarkerCreationLogicHelpers = {};
    }
    window.MarkerCreationLogicHelpers.createSingleEventMarker = createSingleEventMarker;
    window.MarkerCreationLogicHelpers.createMultiEventMarkers = createMultiEventMarkers;
}
