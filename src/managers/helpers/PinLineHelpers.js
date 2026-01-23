/**
 * PinLineHelpers - Utilities for creating pin lines for event markers
 * Extracted from EventMarkerManager to reduce duplication
 */

import { latLonToVector3 } from '../../utils/GeometryUtils.js';

/**
 * Creates pin line points and parent for a marker
 * @param {Object} params - Parameters
 * @param {string} params.locationType - Location type
 * @param {THREE.Vector3} params.markerPosition - Marker position
 * @param {number} params.lat - Latitude (for Earth)
 * @param {number} params.lon - Longitude (for Earth)
 * @param {Object} params.globe - Globe object
 * @param {Object} params.moonPlane - Moon plane object
 * @param {Object} params.marsPlane - Mars plane object
 * @param {Object} params.issSatellite - ISS satellite object
 * @returns {{linePoints: THREE.Vector3[], lineParent: THREE.Object3D}|null} - Line points and parent, or null
 */
export function createPinLinePoints({ locationType, markerPosition, lat, lon, globe, moonPlane, marsPlane, issSatellite }) {
    const THREE = window.THREE;
    
    if (locationType === 'earth') {
        return {
            linePoints: [
                latLonToVector3(lat, lon, 1.0),
                markerPosition
            ],
            lineParent: globe
        };
    } else if (locationType === 'moon' && moonPlane) {
        const markerLocalPos = markerPosition.clone();
        const lineStart = new THREE.Vector3(markerLocalPos.x, markerLocalPos.y, 0);
        return {
            linePoints: [lineStart, markerLocalPos],
            lineParent: moonPlane
        };
    } else if (locationType === 'mars' && marsPlane) {
        const markerLocalPos = markerPosition.clone();
        const lineStart = new THREE.Vector3(markerLocalPos.x, markerLocalPos.y, 0);
        return {
            linePoints: [lineStart, markerLocalPos],
            lineParent: marsPlane
        };
    } else if (locationType === 'station' && issSatellite) {
        const lineStart = new THREE.Vector3(0, 0, 0);
        const lineEnd = markerPosition.clone();
        return {
            linePoints: [lineStart, lineEnd],
            lineParent: issSatellite
        };
    }
    
    return null;
}

/**
 * Creates a pin line mesh
 * @param {Object} params - Parameters
 * @param {THREE.Vector3[]} params.linePoints - Line points
 * @param {number} params.color - Line color (hex)
 * @param {boolean} params.animate - Whether to animate (affects opacity)
 * @param {THREE.Object3D} params.marker - Marker to link to
 * @returns {THREE.Line} - The created pin line
 */
export function createPinLine({ linePoints, color, animate, marker }) {
    const THREE = window.THREE;
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: color,
        transparent: animate,
        opacity: animate ? 0 : 1
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.userData.isEventMarkerPin = true;
    line.userData.marker = marker;
    marker.userData.pinLine = line;
    
    return line;
}
