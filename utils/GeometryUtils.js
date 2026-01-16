/**
 * GeometryUtils - Utility functions for coordinate conversion and geometry
 * Version: 1.1.0 (Added xyToPlanePosition for Moon/Mars support)
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
 * @param {boolean} forceLongWay - Force the long way around (opposite direction)
 * @returns {Array<THREE.Vector3>}
 */
export function createArcBetweenPoints(lat1, lon1, lat2, lon2, altitude, segments, isMainConnection = true, forceLongWay = false) {
    const points = [];
    
    const lat1Rad = lat1 * Math.PI / 180;
    let lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    let lon2Rad = lon2 * Math.PI / 180;
    
    // If forcing long way, adjust longitude to go the opposite direction
    if (forceLongWay) {
        // Normalize longitudes to 0-360 range
        const lon1Norm = ((lon1 % 360) + 360) % 360;
        const lon2Norm = ((lon2 % 360) + 360) % 360;
        
        // Calculate both directions
        const dLonShort = ((lon2Norm - lon1Norm + 540) % 360) - 180;
        const dLonLong = dLonShort > 0 ? dLonShort - 360 : dLonShort + 360;
        
        // Use the long way
        lon2Rad = lon1Rad + dLonLong * Math.PI / 180;
    }
    
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

/**
 * Convert 2D plane coordinates (0-100, 0-100) to 3D position on a plane
 * @param {number} x - X coordinate (0-100, where 0 is left, 100 is right)
 * @param {number} y - Y coordinate (0-100, where 0 is top, 100 is bottom)
 * @param {number} planeWidth - Width of the plane in 3D units
 * @param {number} planeHeight - Height of the plane in 3D units
 * @param {THREE.Vector3} planeCenter - Center position of the plane in 3D space
 * @param {THREE.Vector3} planeNormal - Normal vector of the plane (default: 0, 0, 1 for XY plane)
 * @returns {THREE.Vector3}
 */
export function xyToPlanePosition(x, y, planeWidth, planeHeight, planeCenter, planeNormal = null) {
    // Convert from 0-100 coordinate system to -1 to 1 (centered)
    // (0,0) = top-left in image = (-width/2, height/2) in 3D
    // (100,100) = bottom-right in image = (width/2, -height/2) in 3D
    const normalizedX = (x / 100) * 2 - 1; // Convert 0-100 to -1 to 1
    const normalizedY = 1 - (y / 100) * 2; // Convert 0-100 to 1 to -1 (flip Y)
    
    // Calculate position on plane (plane default orientation: faces +Z axis)
    // Plane is positioned at planeCenter and faces camera (at z=3.5)
    // Since markers are added as children of the plane, we need LOCAL coordinates (relative to plane center)
    const localX = normalizedX * (planeWidth / 2);
    const localY = normalizedY * (planeHeight / 2);
    const localZ = 0.03; // Push marker further in front of plane surface to prevent clipping with hover waves
    
    // Plane default orientation: X is left-right, Y is up-down, Z is forward-back
    // Since markers are children of the plane, return LOCAL position (not world position)
    // The plane's position (1.5, 0.3, 0) will be added automatically by Three.js
    const localPosition = new THREE.Vector3(localX, localY, localZ);
    
    return localPosition;
<<<<<<< HEAD
}
=======
}

>>>>>>> origin/main
