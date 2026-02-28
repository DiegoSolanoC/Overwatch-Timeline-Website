/**
 * GlobeInitHelpers - Utilities for globe initialization
 * Extracted from GlobeView to reduce complexity
 */

import { createCelestialPlane, getMoonTexturePath, getMarsTexturePath } from './GlobePlaneHelpers.js';
import { loadTexture } from './GlobeTextureHelpers.js';

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
}
