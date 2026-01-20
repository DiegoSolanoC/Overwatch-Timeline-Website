/**
 * ModelLoader - Centralized model loading and caching
 * Eliminates duplication across all vehicle controllers
 */
import { getModelScale } from '../controllers/config/TransportConfig.js';
import { MaterialFactory } from './MaterialFactory.js';

export class ModelLoader {
    // Constants for fallback geometries
    static FALLBACK_GEOMETRIES = {
        DEFAULT: { width: 0.03, height: 0.01, depth: 0.08 },
        MARS_SHIP: { width: 0.010, height: 0.010, depth: 0.015 },
        SATELLITE: { width: 0.006, height: 0.006, depth: 0.009 },
        STATION: { width: 0.015, height: 0.015, depth: 0.0225 }
    };
    /**
     * Clone model from cache
     * @param {THREE.Object3D} cache - Cached model
     * @param {string} vehicleType - Type for material application
     * @param {Object|null} scale - Scale override
     * @param {boolean} applyMaterial - Whether to apply material
     * @returns {THREE.Object3D} - Cloned model
     */
    static cloneCachedModel(cache, vehicleType, scale, applyMaterial) {
        const clonedModel = cache.clone();
        this.prepareModel(clonedModel, vehicleType, scale, applyMaterial);
        return clonedModel;
    }

    /**
     * Load model from file
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Object3D>} - Promise resolving to the model
     */
    static loadModelFromFile(options) {
        const {
            gltfLoader,
            modelPath,
            cacheCallback,
            vehicleType,
            scale,
            applyMaterial,
            onProgress
        } = options;

        return new Promise((resolve, reject) => {
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
                    reject(error);
                }
            );
        });
    }

    /**
     * Handle model load error and create fallback if available
     * @param {Error} error - Load error
     * @param {string} modelPath - Path to model
     * @param {Object|null} fallbackGeometry - Fallback geometry
     * @param {string} vehicleType - Vehicle type
     * @returns {THREE.Object3D|null} - Fallback mesh or null
     */
    static handleModelLoadError(error, modelPath, fallbackGeometry, vehicleType) {
        console.error(`Error loading ${modelPath}:`, error);
        
        if (fallbackGeometry) {
            return MaterialFactory.createFallbackMesh(fallbackGeometry, vehicleType);
        }
        
        return null;
    }

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

        // Use cached model if available
        if (cache) {
            return this.cloneCachedModel(cache, vehicleType, scale, applyMaterial);
        }

        // Load model from file
        try {
            return await this.loadModelFromFile({
                gltfLoader,
                modelPath,
                cacheCallback,
                vehicleType,
                scale,
                applyMaterial,
                onProgress
            });
        } catch (error) {
            const fallback = this.handleModelLoadError(error, modelPath, fallbackGeometry, vehicleType);
            if (fallback) {
                return fallback;
            }
            throw error;
        }
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
            fallbackGeometry: ModelLoader.FALLBACK_GEOMETRIES.DEFAULT
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
            fallbackGeometry: ModelLoader.FALLBACK_GEOMETRIES.DEFAULT
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
            fallbackGeometry: ModelLoader.FALLBACK_GEOMETRIES.DEFAULT
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
            fallbackGeometry: ModelLoader.FALLBACK_GEOMETRIES.DEFAULT
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
        
        const fallbackGeometry = vehicleType === 'mars_ship' 
            ? ModelLoader.FALLBACK_GEOMETRIES.MARS_SHIP 
            : ModelLoader.FALLBACK_GEOMETRIES.SATELLITE;
        
        const model = await this.loadModel({
            ...rest,
            modelPath: 'Models3D/Satellite.glb',
            vehicleType: vehicleType,
            fallbackGeometry: fallbackGeometry
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
            fallbackGeometry: ModelLoader.FALLBACK_GEOMETRIES.STATION
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
