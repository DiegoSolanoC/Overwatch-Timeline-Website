/**
 * MaterialFactory - Centralized material creation and application
 * Eliminates duplication across all vehicle controllers
 */
import { TransportConfig, getVehicleColor } from '../controllers/config/TransportConfig.js';

export class MaterialFactory {
    /**
     * Create a standard vehicle material (MeshPhongMaterial)
     * @param {string} vehicleType - Type of vehicle (train, plane, boat, iss, satellite, mars_ship)
     * @param {Object} overrides - Optional property overrides
     * @returns {THREE.MeshPhongMaterial}
     */
    static createVehicleMaterial(vehicleType, overrides = {}) {
        const colors = getVehicleColor(vehicleType);
        const config = TransportConfig.MATERIAL;
        
        return new THREE.MeshPhongMaterial({
            color: overrides.color || colors.color,
            emissive: overrides.emissive || colors.emissive,
            emissiveIntensity: overrides.emissiveIntensity || config.EMISSIVE_INTENSITY,
            transparent: overrides.transparent !== undefined ? overrides.transparent : true,
            opacity: overrides.opacity || config.OPACITY,
            shininess: overrides.shininess || config.SHININESS
        });
    }

    /**
     * Apply vehicle material to entire model hierarchy
     * @param {THREE.Object3D} model - The 3D model
     * @param {string} vehicleType - Type of vehicle
     * @param {Object} options - Additional options
     */
    static applyVehicleMaterial(model, vehicleType, options = {}) {
        const {
            skipBasicMaterials = true,  // Skip MeshBasicMaterial (trails)
            updateGeometry = true        // Compute bounding boxes
        } = options;
        
        model.traverse((child) => {
            if (!child.isMesh) return;
            
            // Skip if it's already a trail (MeshBasicMaterial)
            if (skipBasicMaterials && child.material && child.material.type === 'MeshBasicMaterial') {
                return;
            }
            
            // Apply new material
            child.material = this.createVehicleMaterial(vehicleType);
            child.visible = true;
            
            // Update geometry if requested
            if (updateGeometry && child.geometry) {
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
            }
        });
    }

    /**
     * Create a fallback box geometry with material
     * @param {Object} size - Size object {width, height, depth}
     * @param {string} vehicleType - Type of vehicle
     * @returns {THREE.Mesh}
     */
    static createFallbackMesh(size, vehicleType) {
        const { width = 0.03, height = 0.01, depth = 0.08 } = size;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = this.createVehicleMaterial(vehicleType);
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Create pulse ring material
     * @returns {THREE.MeshBasicMaterial}
     */
    static createPulseRingMaterial() {
        return new THREE.MeshBasicMaterial({
            color: TransportConfig.COLORS.PULSE_RING,
            transparent: true,
            opacity: TransportConfig.MATERIAL.PULSE_RING_OPACITY,
            side: THREE.DoubleSide
        });
    }

    /**
     * Create orbit line material
     * @param {string} satelliteType - Type of satellite (ISS, small, etc.)
     * @returns {THREE.MeshBasicMaterial}
     */
    static createOrbitLineMaterial(satelliteType) {
        const config = TransportConfig.SATELLITE.ORBIT_LINE;
        const orbitColor = satelliteType === 'ISS' ? config.ISS_COLOR : config.DEFAULT_COLOR;
        
        return new THREE.MeshBasicMaterial({
            color: orbitColor,
            transparent: true,
            opacity: config.OPACITY
        });
    }

    /**
     * Create trail segment material
     * @param {Object} options - Material options
     * @returns {THREE.MeshBasicMaterial}
     */
    static createTrailMaterial(options = {}) {
        const {
            color = 0xffffff,
            opacity = 0.8,
            emissive = 0x00ff00,
            emissiveIntensity = 0.5
        } = options;
        
        return new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            emissive: emissive,
            emissiveIntensity: emissiveIntensity
        });
    }
}
