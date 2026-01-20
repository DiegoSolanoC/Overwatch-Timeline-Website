/**
 * ModelLoader - Centralized model loading and caching
 * Eliminates duplication across all vehicle controllers
 */
import { getModelScale } from '../controllers/config/TransportConfig.js';
import { MaterialFactory } from './MaterialFactory.js';

export class ModelLoader {
    /**
     * Load or clone a model with caching
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>} - Promise resolving to the model
     */
    static async loadModel(options) {
        const {
            gltfLoader,           // Required: GLTFLoader instance
            modelPath,            // Required: Path to .glb file
            cache,                // Optional: Cached model
            cacheCallback,        // Optional: Function to cache the model
            vehicleType,          // Required: Type for material application
            scale = null,         // Optional: Scale override
            applyMaterial = true, // Whether to apply vehicle material
            onProgress = null,    // Optional: Progress callback
            fallbackGeometry = null // Optional: Fallback geometry if loading fails
        } = options;

        return new Promise((resolve, reject) => {
            // Use cached model if available
            if (cache) {
                const clonedModel = cache.clone();
                this.prepareModel(clonedModel, vehicleType, scale, applyMaterial);
                resolve(clonedModel);
                return;
            }

            // Load model
            gltfLoader.load(
                modelPath,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Cache the model if callback provided
                    if (cacheCallback) {
                        const cached = model.clone();
                        cacheCallback(cached);
                    }
                    
                    // Prepare model
                    this.prepareModel(model, vehicleType, scale, applyMaterial);
                    resolve(model);
                },
                onProgress,
                (error) => {
                    console.error(`Error loading ${modelPath}:`, error);
                    
                    // Create fallback if provided
                    if (fallbackGeometry) {
                        const fallbackMesh = MaterialFactory.createFallbackMesh(
                            fallbackGeometry,
                            vehicleType
                        );
                        resolve(fallbackMesh);
                    } else {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Prepare a model (scale, material, visibility)
     * @param {THREE.Object3D} model - The model to prepare
     * @param {string} vehicleType - Type of vehicle
     * @param {Object|null} scale - Scale override
     * @param {boolean} applyMaterial - Whether to apply material
     */
    static prepareModel(model, vehicleType, scale = null, applyMaterial = true) {
        // Apply scale
        const scaleObj = scale || getModelScale(vehicleType);
        model.scale.set(scaleObj.x, scaleObj.y, scaleObj.z);
        
        // Make visible
        model.visible = true;
        
        // Apply material if requested
        if (applyMaterial) {
            MaterialFactory.applyVehicleMaterial(model, vehicleType);
        }
    }

    /**
     * Load train end model (specialized for trains)
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>}
     */
    static async loadTrainEndModel(options) {
        return this.loadModel({
            ...options,
            modelPath: 'Models3D/TrainEnd.glb',
            vehicleType: 'train',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 }
        });
    }

    /**
     * Load train middle model (specialized for trains)
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>}
     */
    static async loadTrainMiddleModel(options) {
        return this.loadModel({
            ...options,
            modelPath: 'Models3D/TrainMiddle.glb',
            vehicleType: 'train',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 }
        });
    }

    /**
     * Load plane model
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>}
     */
    static async loadPlaneModel(options) {
        return this.loadModel({
            ...options,
            modelPath: 'Models3D/Plane.glb',
            vehicleType: 'plane',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 }
        });
    }

    /**
     * Load boat model
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>}
     */
    static async loadBoatModel(options) {
        return this.loadModel({
            ...options,
            modelPath: 'Models3D/Boat.glb',
            vehicleType: 'boat',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 }
        });
    }

    /**
     * Load satellite model
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>}
     */
    static async loadSatelliteModel(options) {
        const {
            vehicleType = 'satellite',
            shouldRandomRotate = false,
            ...rest
        } = options;
        
        const model = await this.loadModel({
            ...rest,
            modelPath: 'Models3D/Satellite.glb',
            vehicleType: vehicleType,
            fallbackGeometry: { 
                width: vehicleType === 'mars_ship' ? 0.010 : 0.006,
                height: vehicleType === 'mars_ship' ? 0.010 : 0.006,
                depth: vehicleType === 'mars_ship' ? 0.015 : 0.009
            }
        });
        
        // Apply random rotation if needed (for small satellites)
        if (shouldRandomRotate) {
            model.rotation.x = Math.random() * Math.PI * 2;
            model.rotation.y = Math.random() * Math.PI * 2;
            model.rotation.z = Math.random() * Math.PI * 2;
        }
        
        return model;
    }

    /**
     * Load ISS/Station model
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>}
     */
    static async loadStationModel(options) {
        return this.loadModel({
            ...options,
            modelPath: 'Models3D/Station.glb',
            vehicleType: 'iss',
            fallbackGeometry: { width: 0.015, height: 0.015, depth: 0.0225 }
        });
    }

    /**
     * Synchronously get model from cache or load (callback-based for legacy support)
     * @param {Object} options - Options
     * @param {Function} callback - Callback(model)
     */
    static getOrLoadModel(options, callback) {
        this.loadModel(options)
            .then(model => callback(model))
            .catch(error => {
                console.error('Error in getOrLoadModel:', error);
                // Create fallback
                if (options.fallbackGeometry) {
                    const fallback = MaterialFactory.createFallbackMesh(
                        options.fallbackGeometry,
                        options.vehicleType
                    );
                    callback(fallback);
                }
            });
    }
}
