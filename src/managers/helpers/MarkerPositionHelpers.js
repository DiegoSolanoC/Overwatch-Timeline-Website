/**
 * MarkerPositionHelpers - Utilities for calculating marker positions
 * Extracted from EventMarkerManager to reduce duplication
 */

import { latLonToVector3, xyToPlanePosition } from '../../utils/GeometryUtils.js';

/**
 * Calculates position and target parent for a marker based on location type
 */
export function calculateMarkerPosition({ locationType, lat, lon, x, y, globe, moonPlane, marsPlane, issSatellite }) {
    const THREE = window.THREE;
    
    if (locationType === 'station') {
        if (!issSatellite) {
            console.warn('ISS satellite not found, skipping station marker');
            return null;
        }
        return {
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
        return {
            position: xyToPlanePosition(finalX, finalY, 0.4, 0.4, moonPlane.position),
            targetParent: moonPlane
        };
    } else if (locationType === 'mars') {
        if (!marsPlane) {
            console.warn('Mars plane not found, skipping marker');
            return null;
        }
        const finalX = x !== undefined ? x : 50;
        const finalY = y !== undefined ? y : 50;
        return {
            position: xyToPlanePosition(finalX, finalY, 0.4, 0.4, marsPlane.position),
            targetParent: marsPlane
        };
    } else {
        // Earth: use lat/lon coordinates
        return {
            position: latLonToVector3(lat, lon, 1.02),
            targetParent: globe
        };
    }
}
