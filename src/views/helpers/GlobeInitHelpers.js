/**
 * GlobeInitHelpers - Utilities for globe initialization
 * Extracted from GlobeView to reduce complexity
 */

import { createCelestialPlane, getMoonTexturePath, getMarsTexturePath } from './GlobePlaneHelpers.js';
import { loadTexture } from './GlobeTextureHelpers.js';

function _createRadialGlowTexture({ size = 256 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0.0, 'rgba(255, 250, 230, 1.0)');
    g.addColorStop(0.25, 'rgba(255, 230, 160, 0.85)');
    g.addColorStop(0.55, 'rgba(255, 200, 120, 0.35)');
    g.addColorStop(1.0, 'rgba(255, 200, 120, 0.0)');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

function _createRingGlowTexture({ size = 256 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    // Donut-like glow: transparent center → bright rim → soft falloff.
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0.0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.70, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.82, 'rgba(255,255,255,0.28)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

/**
 * Creates the Earth globe mesh with material
 * @param {THREE.TextureLoader} textureLoader - Texture loader instance
 * @param {THREE.WebGLRenderer} renderer - Renderer instance
 * @param {string} initialTexturePath - Initial texture path
 * @param {THREE.Texture} normalMap - Normal map texture
 * @param {Function} onTextureLoaded - Callback when texture loads
 * @param {Function} onError - Error callback
 * @returns {THREE.Mesh} - Globe mesh
 */
export function createGlobeMesh(textureLoader, renderer, initialTexturePath, normalMap, onTextureLoaded, onError) {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    const earthTexture = loadTexture(
        textureLoader,
        initialTexturePath,
        renderer,
        (texture) => {
            console.log('Earth texture loaded successfully:', initialTexturePath);
            if (onTextureLoaded) {
                onTextureLoaded(texture);
            }
        },
        onError
    );
    
    const material = new THREE.MeshStandardMaterial({
        map: earthTexture,
        normalMap: normalMap,
        transparent: false,
        opacity: 1.0,
        metalness: 0.1,
        roughness: 0.9
    });
    
    return new THREE.Mesh(geometry, material);
}

/**
 * Adds a simple "sun" background element for immersion.
 * Visual: additive sprite with radial gradient.
 * Lighting: subtle warm directional light.
 * @param {Object} params
 * @param {THREE.Scene} params.scene
 * @returns {{sprite: THREE.Sprite, light: THREE.DirectionalLight}|null}
 */
export function addSunBackground({ scene }) {
    if (!scene) return null;

    const tex = _createRadialGlowTexture({ size: 256 });
    if (!tex) return null;

    const mat = new THREE.SpriteMaterial({
        map: tex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
    });

    const sprite = new THREE.Sprite(mat);
    sprite.position.set(-35, 20, -90);
    sprite.scale.set(10, 10, 1);
    sprite.renderOrder = -10;
    sprite.frustumCulled = false;
    scene.add(sprite);

    const light = new THREE.DirectionalLight(0xfff0d6, 0.45);
    light.position.copy(sprite.position);
    scene.add(light);
    scene.add(light.target);
    light.target.position.set(0, 0, 0);

    return { sprite, light };
}

/**
 * Creates a blurry rim/atmosphere glow around the globe using the same technique as the sun:
 * a single additive sprite with a donut-shaped radial gradient texture.
 * @param {Object} params
 * @param {number} params.color
 * @param {number} params.scale
 * @param {number} params.opacity
 * @returns {THREE.Sprite|null}
 */
export function createGlobeRimGlowSprite({ color = 0x6fd3ff, scale = 2.7, opacity = 0.75, intensity = 1.0 } = {}) {
    const tex = _createRingGlowTexture({ size: 256 });
    if (!tex) return null;

    const mat = new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
    });
    if (Number.isFinite(intensity) && intensity !== 1.0) {
        // Additive sprites can safely use >1.0 for a brighter "emissive" look.
        mat.color.multiplyScalar(intensity);
    }

    const sprite = new THREE.Sprite(mat);
    sprite.name = 'globeRimGlowSprite';
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 1;
    sprite.frustumCulled = false;
    sprite.userData.rimIntensity = (Number.isFinite(intensity) && intensity > 0) ? intensity : 1.0;
    return sprite;
}

/**
 * Creates the Earth flat map plane mesh with the same texture as the globe.
 * Uses a 2:1 aspect ratio so equirectangular lat/lon projection aligns.
 * @param {THREE.TextureLoader} textureLoader
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} texturePath
 * @param {Function} onTextureLoaded - Optional callback when texture loads
 * @param {Function} onError - Optional error callback
 * @returns {THREE.Mesh}
 */
export function createEarthMapPlane(textureLoader, renderer, texturePath, onTextureLoaded = null, onError = null) {
    // 2:1 aspect ratio for equirectangular world maps
    const planeWidth = 2.0;
    const planeHeight = 1.0;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

    const earthTexture = loadTexture(
        textureLoader,
        texturePath,
        renderer,
        (texture) => {
            if (onTextureLoaded) onTextureLoaded(texture);
        },
        onError
    );

    const material = new THREE.MeshStandardMaterial({
        map: earthTexture,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1.0,
        depthWrite: true,
        metalness: 0.1,
        roughness: 0.9
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(0, 0, 0);
    plane.visible = false;
    // PlaneGeometry faces +Z by default, which matches camera at +Z looking at origin.
    return plane;
}

/**
 * Sets up Moon and Mars planes for the globe
 * @param {Object} params - Parameters
 * @param {THREE.Scene} params.scene - Scene to add planes to
 * @param {THREE.TextureLoader} params.textureLoader - Texture loader instance
 * @param {THREE.WebGLRenderer} params.renderer - Renderer instance
 * @param {boolean} params.isGray - Whether gray palette is active
 * @param {Object} params.sceneModel - SceneModel instance
 * @returns {Object} - Object with moonPlane and marsPlane
 */
export function setupCelestialPlanes({ scene, textureLoader, renderer, isGray, sceneModel }) {
    const moonTexturePath = getMoonTexturePath(isGray);
    const moonPlane = createCelestialPlane({
        texturePath: moonTexturePath,
        textureLoader,
        renderer,
        size: 0.4,
        position: new THREE.Vector3(1.5, 0.3, 0),
        visible: false
    });
    
    if (sceneModel.setMoonPlane) {
        sceneModel.setMoonPlane(moonPlane);
    } else {
        sceneModel.moonPlane = moonPlane;
    }
    scene.add(moonPlane);
    console.log('Moon plane created at:', moonPlane.position, 'rotation:', moonPlane.quaternion);

    const marsTexturePath = getMarsTexturePath(isGray);
    const marsPlane = createCelestialPlane({
        texturePath: marsTexturePath,
        textureLoader,
        renderer,
        size: 0.4,
        position: new THREE.Vector3(1.5, -0.3, 0),
        visible: false
    });
    
    if (sceneModel.setMarsPlane) {
        sceneModel.setMarsPlane(marsPlane);
    } else {
        sceneModel.marsPlane = marsPlane;
    }
    scene.add(marsPlane);
    console.log('Mars plane created at:', marsPlane.position, 'rotation:', marsPlane.quaternion);
    
    return { moonPlane, marsPlane };
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.GlobeInitHelpers) {
        window.GlobeInitHelpers = {};
    }
    window.GlobeInitHelpers.createGlobeMesh = createGlobeMesh;
    window.GlobeInitHelpers.createEarthMapPlane = createEarthMapPlane;
    window.GlobeInitHelpers.setupCelestialPlanes = setupCelestialPlanes;
    window.GlobeInitHelpers.addSunBackground = addSunBackground;
    window.GlobeInitHelpers.createGlobeRimGlowSprite = createGlobeRimGlowSprite;
}
