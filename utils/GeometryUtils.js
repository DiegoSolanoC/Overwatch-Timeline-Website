/**
 * GeometryUtils - Utility functions for coordinate conversion and geometry
 */

/**
 * Convert lat/lon to 3D coordinates on sphere
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Sphere radius
 * @returns {THREE.Vector3}
 */
export function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

/**
 * Create arc between two lat/lon points
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @param {number} altitude - Altitude above globe
 * @param {number} segments - Number of segments
 * @param {boolean} isMainConnection - Is main connection
 * @returns {Array<THREE.Vector3>}
 */
export function createArcBetweenPoints(lat1, lon1, lat2, lon2, altitude, segments, isMainConnection = true) {
    const points = [];
    
    const lat1Rad = lat1 * Math.PI / 180;
    const lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lon2Rad = lon2 * Math.PI / 180;
    
    const dLon = lon2Rad - lon1Rad;
    const dLat = lat2Rad - lat1Rad;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distanceFactor = angularDistance / Math.PI;
    const baseArcHeight = isMainConnection ? 0.03 : 0.02;
    const maxArcHeight = baseArcHeight * distanceFactor;
    const minArcHeight = isMainConnection ? 0.005 : 0.003;
    const finalArcHeight = Math.max(minArcHeight, maxArcHeight);
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const fraction = t * angularDistance;
        
        const A = Math.sin((1 - t) * angularDistance) / Math.sin(angularDistance);
        const B = Math.sin(t * angularDistance) / Math.sin(angularDistance);
        
        const x = A * Math.cos(lat1Rad) * Math.cos(lon1Rad) + B * Math.cos(lat2Rad) * Math.cos(lon2Rad);
        const y = A * Math.cos(lat1Rad) * Math.sin(lon1Rad) + B * Math.cos(lat2Rad) * Math.sin(lon2Rad);
        const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);
        
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
        const lon = Math.atan2(y, x) * 180 / Math.PI;
        
        const arcHeight = Math.sin(t * Math.PI) * finalArcHeight;
        const currentAltitude = altitude + arcHeight;
        
        const point = latLonToVector3(lat, lon, currentAltitude);
        points.push(point);
    }
    
    return points;
}

