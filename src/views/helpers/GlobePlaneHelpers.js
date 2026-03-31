/**
 * GlobePlaneHelpers - Utilities for creating Moon/Mars planes
 * Extracted from GlobeView to reduce duplication
 */

/**
 * Creates a celestial plane (Moon or Mars)
 * @param {Object} params - Parameters
 * @param {string} params.texturePath - Path to texture file
 * @param {THREE.TextureLoader} params.textureLoader - Texture loader instance
 * @param {THREE.WebGLRenderer} params.renderer - Renderer instance
 * @param {number} params.size - Plane size (default 0.4)
 * @param {THREE.Vector3} params.position - Initial position
 * @param {boolean} params.visible - Initial visibility (default false)
 * @returns {THREE.Mesh} - Created plane mesh
 */
export function createCelestialPlane({ texturePath, textureLoader, renderer, size = 0.4, position, visible = false }) {
    const geometry = new THREE.PlaneGeometry(size, size);
    
    const texture = textureLoader.load(texturePath, (texture) => {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
    });
    
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        alphaTest: 0.1,
        emissive: 0x88aaff, // Blue glow
        emissiveIntensity: 0.3,
        emissiveMap: texture,
        metalness: 0.0,
        roughness: 0.5
    });
    
    const plane = new THREE.Mesh(geometry, material);
    plane.position.copy(position);
    plane.visible = visible;
    plane.scale.set(1, 0, 1); // Start with Y scale at 0 (squashed)
    plane.lookAt(0, 0, 3.5);
    
    return plane;
}

/**
 * Gets texture path for Moon based on color palette key
 * @param {'blue'|'gray'|'crimson'|'nulled'} palette - Active palette
 * @returns {string} - Texture path
 */
export function getMoonTexturePath(palette = 'blue') {
    const p = String(palette).toLowerCase();
    if (p === 'gray') return 'assets/images/misc/Moon_Dark.png';
    if (p === 'crimson') return 'assets/images/misc/Moon_Crimson.png';
    if (p === 'nulled') return 'assets/images/misc/Moon_Nulled.png';
    return 'assets/images/misc/Moon.png';
}

/**
 * Gets texture path for Mars based on color palette key
 * @param {'blue'|'gray'|'crimson'|'nulled'} palette - Active palette
 * @returns {string} - Texture path
 */
export function getMarsTexturePath(palette = 'blue') {
    const p = String(palette).toLowerCase();
    if (p === 'gray') return 'assets/images/misc/Mars_Dark.png';
    if (p === 'crimson') return 'assets/images/misc/Mars_Crimson.png';
    if (p === 'nulled') return 'assets/images/misc/Mars_Nulled.png';
    return 'assets/images/misc/Mars.png';
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.GlobePlaneHelpers) {
        window.GlobePlaneHelpers = {};
    }
    window.GlobePlaneHelpers.createCelestialPlane = createCelestialPlane;
    window.GlobePlaneHelpers.getMoonTexturePath = getMoonTexturePath;
    window.GlobePlaneHelpers.getMarsTexturePath = getMarsTexturePath;
}
