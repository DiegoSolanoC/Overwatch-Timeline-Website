/**
 * MarkerPositionHelpers - Utilities for calculating marker positions
 * Extracted from EventMarkerManager to reduce duplication
 */

import { latLonToVector3, latLonToMapPlanePosition, xyToPlanePosition } from '../../utils/GeometryUtils.js';

/**
 * Calculates position and target parent for a marker based on location type
 */
export function calculateMarkerPosition({ locationType, lat, lon, x, y, globe, moonPlane, marsPlane, issSatellite }) {
    const THREE = window.THREE;
    const isMapView = window.globeController?.sceneModel?.getMapViewEnabled
        ? window.globeController.sceneModel.getMapViewEnabled()
        : !!window.globeController?.sceneModel?.isMapView;
    const earthMapPlane = window.globeController?.sceneModel?.getEarthMapPlane
        ? window.globeController.sceneModel.getEarthMapPlane()
        : window.globeController?.sceneModel?.earthMapPlane;
    const mapScaleFactor = (isMapView && earthMapPlane && earthMapPlane.scale) ? (earthMapPlane.scale.x || 1) : 1;
    
    if (locationType === 'station') {
        if (!issSatellite) {
            console.warn('ISS satellite not found, skipping station marker');
            return null;
        }
        return {
            // Keep station marker close to the model (avoid huge "stick" in map view)
            position: new THREE.Vector3(0, 0, 0.03),
            targetParent: issSatellite
        };
    } else if (locationType === 'moon') {
        if (!moonPlane) {
            console.warn('Moon plane not found, skipping marker');
            return null;
        }
        const finalX = x !== undefined ? x : 50;
        const finalY = y !== undefined ? y : 50;
        const pos = xyToPlanePosition(finalX, finalY, 0.4, 0.4, moonPlane.position);
        return {
            position: pos,
            targetParent: moonPlane
        };
    } else if (locationType === 'mars') {
        if (!marsPlane) {
            console.warn('Mars plane not found, skipping marker');
            return null;
        }
        const finalX = x !== undefined ? x : 50;
        const finalY = y !== undefined ? y : 50;
        const pos = xyToPlanePosition(finalX, finalY, 0.4, 0.4, marsPlane.position);
        return {
            position: pos,
            targetParent: marsPlane
        };
    } else {
        // Earth: use lat/lon on globe, or lat/lon projection on flat map (if enabled)
        if (isMapView && earthMapPlane) {
            return {
                position: latLonToMapPlanePosition(lat, lon, 2.0, 1.0, 0.03),
                targetParent: earthMapPlane
            };
        }

        // Default Earth: use lat/lon coordinates on the sphere
        return {
            position: latLonToVector3(lat, lon, 1.02),
            targetParent: globe
        };
    }
}
