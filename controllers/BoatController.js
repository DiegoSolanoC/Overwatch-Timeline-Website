/**
 * BoatController - Handles boat creation, updating, and spawning
 * Extracted from TransportController for better separation of concerns
 */
import { TransportConfig } from './config/TransportConfig.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import { MaterialFactory } from '../utils/MaterialFactory.js';
import { ErrorLogger } from '../utils/ErrorLogger.js';

export class BoatController {
    constructor(sceneModel, transportModel, routeController, transportView) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.routeController = routeController;
        this.transportView = transportView;
        this.boatSpawnInterval = null;
    }

    /**
     * Calculate route distance
     */
    calculateRouteDistance(curve) {
        return this.routeController.calculateRouteDistance(curve);
    }

    /**
     * Calculate boat speed based on route distance
     */
    calculateBoatSpeed(routeDistance) {
        const config = TransportConfig.BOAT.SPEED;
        return routeDistance > config.DISTANCE_THRESHOLD ? config.LONG_BASE : config.SHORT_BASE;
    }

    /**
     * Calculate trail spawn interval based on route distance
     */
    calculateTrailSpawnInterval(routeDistance) {
        const config = TransportConfig.BOAT.TRAIL;
        
        if (routeDistance < config.VERY_SHORT_DISTANCE) {
            return config.VERY_SHORT_INTERVAL;
        } else if (routeDistance < config.SHORT_DISTANCE) {
            return config.SHORT_INTERVAL;
        }
        return config.DEFAULT_INTERVAL;
    }

    /**
     * Create a boat (using ModelLoader utility)
     */
    createBoat(routeData, isMultiStop = false) {
        const globe = this.sceneModel.getGlobe();
        const gltfLoader = this.sceneModel.getGLTFLoader();
        const curve = routeData.curve;
        const distance = this.calculateRouteDistance(curve);
        const speed = this.calculateBoatSpeed(distance);
        
        const boatGroup = new THREE.Group();
        
        if (gltfLoader) {
            ModelLoader.getOrLoadModel({
                gltfLoader: gltfLoader,
                vehicleType: 'boat',
                fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 },
                modelPath: 'Models3D/Boat.glb'
            }, (model) => {
                boatGroup.add(model);
            });
        } else {
            // Fallback if no loader
            const fallback = MaterialFactory.createFallbackMesh(
                { width: 0.03, height: 0.01, depth: 0.08 },
                'boat'
            );
            fallback.rotation.x = Math.PI / 2;
            boatGroup.add(fallback);
        }
        
        const trailSpawnInterval = this.calculateTrailSpawnInterval(distance);
        
        boatGroup.userData = {
            curve: curve,
            progress: 0,
            speed: speed,
            from: routeData.from,
            to: routeData.to,
            isBoat: true,
            isMultiStop: isMultiStop,
            isNewlySpawned: true,
            boatId: Math.random().toString(36).substr(2, 9),
            lastTrailSpawn: 0,
            trailSpawnInterval: trailSpawnInterval,
            routeDistance: distance
        };
        
        if (!isMultiStop) {
            this.routeController.reserveBoatRoute(routeData.from, routeData.to, boatGroup.userData.boatId);
        }
        
        boatGroup.visible = false;
        boatGroup.position.set(0, 0, 0);
        globe.add(boatGroup);
        this.transportModel.addBoat(boatGroup);
        
        return boatGroup;
    }

    /**
     * Create a multi-stop boat
     */
    createMultiStopBoat(routes) {
        const firstRoute = routes[0];
        const boat = this.createBoat(firstRoute, true);
        
        boat.userData.isMultiStop = true;
        boat.userData.routes = routes;
        boat.userData.currentRouteIndex = 0;
        boat.userData.totalRoutes = routes.length;
        boat.userData.boatId = Math.random().toString(36).substr(2, 9);
        boat.userData.finalDestination = routes[routes.length - 1].to;
        boat.userData.previousPort = null;
        boat.userData.isWaiting = false;
        boat.userData.isTransitioning = false;
        
        this.routeController.reserveBoatRoute(firstRoute.from, firstRoute.to, boat.userData.boatId);
        
        const journey = routes.map(r => `${r.from}->${r.to}`).join(' | ');
        // console.log(`🚢 NEW MULTI-STOP BOAT [${boat.userData.boatId}]: ${journey}`);
        
        return boat;
    }

    /**
     * Handle multi-stop boat transition
     */
    handleMultiStopTransition(boat) {
        const data = boat.userData;
        
        if (!data.isMultiStop || data.progress < 1.0 || data.isTransitioning) {
            return false;
        }
        
        if (data.currentRouteIndex >= data.routes.length - 1) {
            // Journey complete - remove boat
            const globe = this.sceneModel.getGlobe();
            this.routeController.releaseBoatRoute(data.from, data.to, data.boatId);
            globe.remove(boat);
            this.transportModel.removeBoat(boat);
            return true;
        }
        
        const currentFrom = data.from;
        const currentTo = data.to;
        
        this.routeController.releaseBoatRoute(currentFrom, currentTo, data.boatId);
        
        let nextRoute = data.routes[data.currentRouteIndex + 1];
        let canDepart = false;
        
        if (!this.routeController.isBoatRouteAvailable(nextRoute.from, nextRoute.to)) {
            if (!data.isWaiting) {
                // console.log(`⏸️ BOAT [${data.boatId}] waiting at port ${currentTo}...`);
                data.isWaiting = true;
                data.progress = 1.0;
            }
            canDepart = false;
        } else {
            canDepart = true;
        }
        
        if (canDepart) {
            data.isTransitioning = true;
            if (data.isWaiting) {
                data.isWaiting = false;
            }
            
            this.routeController.reserveBoatRoute(nextRoute.from, nextRoute.to, data.boatId);
            data.currentRouteIndex++;
            // console.log(`🚢 BOAT [${data.boatId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length})`);
            
            data.curve = nextRoute.curve;
            data.from = nextRoute.from;
            data.to = nextRoute.to;
            data.previousPort = currentFrom;
            data.needsReverse = nextRoute.needsReverse;
            data.progress = 0;
            
            const routeDistance = this.calculateRouteDistance(nextRoute.curve);
            data.speed = this.calculateBoatSpeed(routeDistance);
        }
        
        return false;
    }

    /**
     * Update boats - handles movement, multi-stop transitions, and trail spawning
     */
    updateBoats() {
        const globe = this.sceneModel.getGlobe();
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const boats = this.transportModel.getBoats();
        
        for (let i = boats.length - 1; i >= 0; i--) {
            const boat = boats[i];
            const data = boat.userData;
            
            // Skip newly spawned boats for one frame
            if (data.isNewlySpawned) {
                data.isNewlySpawned = false;
                continue;
            }
            
            // Update progress
            if (!data.isWaiting) {
                data.progress += data.speed;
            }
            
            // Handle multi-stop transitions
            if (this.handleMultiStopTransition(boat)) {
                continue; // Boat was removed
            }
            
            // Handle single-route boat completion
            if (!data.isMultiStop && data.progress >= 1.0) {
                if (data.boatId) {
                    this.routeController.releaseBoatRoute(data.from, data.to, data.boatId);
                }
                globe.remove(boat);
                this.transportModel.removeBoat(boat);
                continue;
            }
            
            // Clear transitioning flag
            if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
                data.isTransitioning = false;
            }
            
            // Update boat position and rotation
            if (data.progress > 0 && data.progress <= 1) {
                const position = data.curve.getPointAt(data.progress);
                boat.position.copy(position);
                
                const tangent = data.curve.getTangentAt(data.progress).normalize();
                const up = position.clone().normalize();
                const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
                const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
                
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
                boat.quaternion.setFromRotationMatrix(rotationMatrix);
                
                // Update trail
                if (!data.lastTrailSpawn) data.lastTrailSpawn = 0;
                if (!data.trailSpawnInterval) data.trailSpawnInterval = TransportConfig.BOAT.TRAIL.DEFAULT_INTERVAL;
                
                data.lastTrailSpawn += 1;
                if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                    const forward = tangent.clone().negate();
                    this.transportView.createBoatTrailSegment(position, forward, right, correctedUp);
                    data.lastTrailSpawn = 0;
                }
                
                boat.visible = hyperloopVisible;
            }
        }
    }

    /**
     * Spawn boats randomly
     */
    spawnBoatsRandomly() {
        this.routeController.buildBoatRouteGraph();
        
        const boatRouteCurves = this.transportModel.getBoatRouteCurves();
        const boatRouteGraph = this.transportModel.getBoatRouteGraph();
        
        console.log(`📊 Total boat routes: ${boatRouteCurves.length}`);
        console.log(`📊 Ports in graph: ${Object.keys(boatRouteGraph).length}`);
        
        const config = TransportConfig.BOAT;
        
        this.boatSpawnInterval = setInterval(() => {
            const isPageVisible = this.sceneModel.getPageVisible();
            const hyperloopVisible = this.sceneModel.getHyperloopVisible();
            
            if (!isPageVisible || !hyperloopVisible) return;
            
            const boats = this.transportModel.getBoats();
            if (boats.length >= config.MAX_COUNT) return;
            
            if (boatRouteCurves.length === 0) return;
            
            const randomRoute = boatRouteCurves[Math.floor(Math.random() * boatRouteCurves.length)];
            const isMultiStop = Math.random() < config.MULTI_STOP_CHANCE;
            
            if (isMultiStop && Object.keys(boatRouteGraph).length > 0) {
                const numStops = Math.floor(Math.random() * (config.MAX_STOPS - config.MIN_STOPS + 1)) + config.MIN_STOPS;
                const multiRoute = this.routeController.findMultiStopBoatRoute(numStops);
                
                if (multiRoute && multiRoute.routes.length >= 2) {
                    this.createMultiStopBoat(multiRoute.routes);
                } else {
                    this.createBoat(randomRoute);
                }
            } else {
                this.createBoat(randomRoute);
            }
        }, config.SPAWN_INTERVAL);
    }

    /**
     * Stop spawning boats
     */
    stopSpawning() {
        if (this.boatSpawnInterval) {
            clearInterval(this.boatSpawnInterval);
            this.boatSpawnInterval = null;
        }
    }
}
