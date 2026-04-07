/**
 * GlobePlaneHelpers - Utilities for creating Moon/Mars planes
 * Single texture per body; palette is expressed via material tint (see getCelestialMaterialTint).
 */

/** One shared albedo per celestial body (variant PNGs removed). */
export const CELESTIAL_MOON_TEXTURE = 'assets/images/misc/Moon.png';
export const CELESTIAL_MARS_TEXTURE = 'assets/images/misc/Mars.png';

/**
 * Subtle multiply + emissive accent aligned with each UI palette
 * @param {'blue'|'gray'|'crimson'|'nulled'} palette
 * @returns {{ color: number, emissive: number, emissiveIntensity: number }}
 */
export function getCelestialMaterialTint(palette = 'blue') {
    const p = String(palette).toLowerCase();
    if (p === 'gray') {
        return {
            color: 0xf2efe9,
            emissive: 0xff7733,
            emissiveIntensity: 0.12
        };
    }
    if (p === 'crimson') {
        return {
            color: 0xfaf0ef,
            emissive: 0xb71c28,
            emissiveIntensity: 0.15
        };
    }
    if (p === 'nulled') {
        return {
            color: 0xeee9fa,
            emissive: 0x7e57c2,
            emissiveIntensity: 0.14
        };
    }
    return {
        color: 0xeef3fb,
        emissive: 0x3d6fb5,
        emissiveIntensity: 0.18
    };
}

/**
 * @param {THREE.MeshStandardMaterial} material
 * @param {'blue'|'gray'|'crimson'|'nulled'} palette
 */
export function applyCelestialMaterialTint(material, palette = 'blue') {
    if (!material) return;
    const t = getCelestialMaterialTint(palette);
    material.color.setHex(t.color);
    material.emissive.setHex(t.emissive);
    material.emissiveIntensity = t.emissiveIntensity;
    material.needsUpdate = true;
}

/**
 * Creates a celestial plane (Moon or Mars)
 * @param {Object} params
 * @param {string} params.texturePath - Path to texture file
 * @param {'blue'|'gray'|'crimson'|'nulled'} [params.paletteKey='blue'] - Material tint
 * @param {THREE.TextureLoader} params.textureLoader
 * @param {THREE.WebGLRenderer} params.renderer
 * @param {number} [params.size=0.4]
 * @param {THREE.Vector3} params.position
 * @param {boolean} [params.visible=false]
 * @returns {THREE.Mesh}
 */
export function createCelestialPlane({
    texturePath,
    paletteKey = 'blue',
    textureLoader,
    renderer,
    size = 0.4,
    position,
    visible = false
}) {
    const geometry = new THREE.PlaneGeometry(size, size);

    const texture = textureLoader.load(texturePath, (tex) => {
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
    });

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        alphaTest: 0.1,
        emissiveMap: texture,
        metalness: 0.0,
        roughness: 0.5
    });
    applyCelestialMaterialTint(material, paletteKey);

    const plane = new THREE.Mesh(geometry, material);
    plane.position.copy(position);
    plane.visible = visible;
    plane.scale.set(1, 0, 1);
    plane.lookAt(0, 0, 3.5);

    return plane;
}

/**
 * Texture path for Moon (always single asset).
 */
export function getMoonTexturePath(_palette) {
    return CELESTIAL_MOON_TEXTURE;
}

/**
 * Texture path for Mars (always single asset).
 */
export function getMarsTexturePath(_palette) {
    return CELESTIAL_MARS_TEXTURE;
}

if (typeof window !== 'undefined') {
    if (!window.GlobePlaneHelpers) {
        window.GlobePlaneHelpers = {};
    }
    window.GlobePlaneHelpers.createCelestialPlane = createCelestialPlane;
    window.GlobePlaneHelpers.getMoonTexturePath = getMoonTexturePath;
    window.GlobePlaneHelpers.getMarsTexturePath = getMarsTexturePath;
    window.GlobePlaneHelpers.getCelestialMaterialTint = getCelestialMaterialTint;
    window.GlobePlaneHelpers.applyCelestialMaterialTint = applyCelestialMaterialTint;
    window.GlobePlaneHelpers.CELESTIAL_MOON_TEXTURE = CELESTIAL_MOON_TEXTURE;
    window.GlobePlaneHelpers.CELESTIAL_MARS_TEXTURE = CELESTIAL_MARS_TEXTURE;
}
