/**
 * GeometryUtils - Utility functions for coordinate conversion and geometry
 * Version: 1.1.0 (Added xyToPlanePosition for Moon/Mars support)
 */

// Constants for coordinate conversion and geometry calculations
const GEOMETRY_CONSTANTS = {
    DEGREES_TO_RADIANS: Math.PI / 180,
    RADIANS_TO_DEGREES: 180 / Math.PI,
    LATITUDE_OFFSET: 90,
    LONGITUDE_OFFSET: 180,
    LONGITUDE_NORMALIZATION: 360,
    LONGITUDE_SHORT_WAY_ADJUSTMENT: 540,
    ARC_HEIGHT_MAIN_CONNECTION: 0.03,
    ARC_HEIGHT_SECONDARY_CONNECTION: 0.02,
    ARC_HEIGHT_MIN_MAIN: 0.005,
    ARC_HEIGHT_MIN_SECONDARY: 0.003,
    COORDINATE_SYSTEM_MAX: 100,
    COORDINATE_NORMALIZATION_FACTOR: 2,
    MARKER_Z_OFFSET: 0.03
};

/**
 * Convert lat/lon to 3D coordinates on sphere
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Sphere radius
 * @returns {THREE.Vector3}
 */
export function latLonToVector3(lat, lon, radius) {
    const phi = (GEOMETRY_CONSTANTS.LATITUDE_OFFSET - lat) * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS;
    const theta = (lon + GEOMETRY_CONSTANTS.LONGITUDE_OFFSET) * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS;

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
/**
 * Normalize longitude for long way calculation
 * @param {number} lon1 - Start longitude
 * @param {number} lon2 - End longitude
 * @returns {number} - Adjusted longitude in radians
 */
function normalizeLongitudeForLongWay(lon1, lon2) {
    // Normalize longitudes to 0-360 range
    const lon1Norm = ((lon1 % GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION) + GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION) % GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION;
    const lon2Norm = ((lon2 % GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION) + GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION) % GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION;
    
    // Calculate both directions
    const dLonShort = ((lon2Norm - lon1Norm + GEOMETRY_CONSTANTS.LONGITUDE_SHORT_WAY_ADJUSTMENT) % GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION) - GEOMETRY_CONSTANTS.LONGITUDE_OFFSET;
    const dLonLong = dLonShort > 0 ? dLonShort - GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION : dLonShort + GEOMETRY_CONSTANTS.LONGITUDE_NORMALIZATION;
    
    // Use the long way
    return (lon1 * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS) + (dLonLong * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS);
}

/**
 * Calculate angular distance between two points using haversine formula
 * @param {number} lat1Rad - Start latitude in radians
 * @param {number} lon1Rad - Start longitude in radians
 * @param {number} lat2Rad - End latitude in radians
 * @param {number} lon2Rad - End longitude in radians
 * @returns {number} - Angular distance in radians
 */
function calculateAngularDistance(lat1Rad, lon1Rad, lat2Rad, lon2Rad) {
    const dLon = lon2Rad - lon1Rad;
    const dLat = lat2Rad - lat1Rad;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate arc height based on connection type and distance
 * @param {number} angularDistance - Angular distance in radians
 * @param {boolean} isMainConnection - Is main connection
 * @returns {number} - Final arc height
 */
function calculateArcHeight(angularDistance, isMainConnection) {
    const distanceFactor = angularDistance / Math.PI;
    const baseArcHeight = isMainConnection ? GEOMETRY_CONSTANTS.ARC_HEIGHT_MAIN_CONNECTION : GEOMETRY_CONSTANTS.ARC_HEIGHT_SECONDARY_CONNECTION;
    const maxArcHeight = baseArcHeight * distanceFactor;
    const minArcHeight = isMainConnection ? GEOMETRY_CONSTANTS.ARC_HEIGHT_MIN_MAIN : GEOMETRY_CONSTANTS.ARC_HEIGHT_MIN_SECONDARY;
    return Math.max(minArcHeight, maxArcHeight);
}

/**
 * Generate arc points along the great circle path
 * @param {number} lat1Rad - Start latitude in radians
 * @param {number} lon1Rad - Start longitude in radians
 * @param {number} lat2Rad - End latitude in radians
 * @param {number} lon2Rad - End longitude in radians
 * @param {number} angularDistance - Angular distance in radians
 * @param {number} segments - Number of segments
 * @param {number} altitude - Base altitude
 * @param {number} finalArcHeight - Final arc height
 * @returns {Array<THREE.Vector3>} - Array of 3D points
 */
function generateArcPoints(lat1Rad, lon1Rad, lat2Rad, lon2Rad, angularDistance, segments, altitude, finalArcHeight) {
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        const A = Math.sin((1 - t) * angularDistance) / Math.sin(angularDistance);
        const B = Math.sin(t * angularDistance) / Math.sin(angularDistance);
        
        const x = A * Math.cos(lat1Rad) * Math.cos(lon1Rad) + B * Math.cos(lat2Rad) * Math.cos(lon2Rad);
        const y = A * Math.cos(lat1Rad) * Math.sin(lon1Rad) + B * Math.cos(lat2Rad) * Math.sin(lon2Rad);
        const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);
        
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * GEOMETRY_CONSTANTS.RADIANS_TO_DEGREES;
        const lon = Math.atan2(y, x) * GEOMETRY_CONSTANTS.RADIANS_TO_DEGREES;
        
        const arcHeight = Math.sin(t * Math.PI) * finalArcHeight;
        const currentAltitude = altitude + arcHeight;
        
        const point = latLonToVector3(lat, lon, currentAltitude);
        points.push(point);
    }
    
    return points;
}

export function createArcBetweenPoints(lat1, lon1, lat2, lon2, altitude, segments, isMainConnection = true, forceLongWay = false) {
    const lat1Rad = lat1 * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS;
    let lon1Rad = lon1 * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS;
    const lat2Rad = lat2 * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS;
    let lon2Rad = lon2 * GEOMETRY_CONSTANTS.DEGREES_TO_RADIANS;
    
    // If forcing long way, adjust longitude to go the opposite direction
    if (forceLongWay) {
        lon2Rad = normalizeLongitudeForLongWay(lon1, lon2);
    }
    
    // Calculate angular distance
    const angularDistance = calculateAngularDistance(lat1Rad, lon1Rad, lat2Rad, lon2Rad);
    
    // Calculate arc height
    const finalArcHeight = calculateArcHeight(angularDistance, isMainConnection);
    
    // Generate arc points
    return generateArcPoints(lat1Rad, lon1Rad, lat2Rad, lon2Rad, angularDistance, segments, altitude, finalArcHeight);
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
    const normalizedX = (x / GEOMETRY_CONSTANTS.COORDINATE_SYSTEM_MAX) * GEOMETRY_CONSTANTS.COORDINATE_NORMALIZATION_FACTOR - 1; // Convert 0-100 to -1 to 1
    const normalizedY = 1 - (y / GEOMETRY_CONSTANTS.COORDINATE_SYSTEM_MAX) * GEOMETRY_CONSTANTS.COORDINATE_NORMALIZATION_FACTOR; // Convert 0-100 to 1 to -1 (flip Y)
    
    // Calculate position on plane (plane default orientation: faces +Z axis)
    // Plane is positioned at planeCenter and faces camera (at z=3.5)
    // Since markers are added as children of the plane, we need LOCAL coordinates (relative to plane center)
    const localX = normalizedX * (planeWidth / GEOMETRY_CONSTANTS.COORDINATE_NORMALIZATION_FACTOR);
    const localY = normalizedY * (planeHeight / GEOMETRY_CONSTANTS.COORDINATE_NORMALIZATION_FACTOR);
    const localZ = GEOMETRY_CONSTANTS.MARKER_Z_OFFSET; // Push marker further in front of plane surface to prevent clipping with hover waves
    
    // Plane default orientation: X is left-right, Y is up-down, Z is forward-back
    // Since markers are children of the plane, return LOCAL position (not world position)
    // The plane's position (1.5, 0.3, 0) will be added automatically by Three.js
    const localPosition = new THREE.Vector3(localX, localY, localZ);
    
    return localPosition;
}