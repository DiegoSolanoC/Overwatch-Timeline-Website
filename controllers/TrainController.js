/**
 * TrainController - Handles train creation, updating, and spawning
 * Extracted from TransportController for better separation of concerns
 */
import { TransportConfig } from './config/TransportConfig.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import { ErrorLogger } from '../utils/ErrorLogger.js';

export class TrainController {
    constructor(sceneModel, transportModel, routeController, transportView) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.routeController = routeController;
        this.transportView = transportView;
        this.trainSpawnInterval = null;
    }

    /**
     * Calculate route distance
     */
    calculateRouteDistance(curve) {
        return this.routeController.calculateRouteDistance(curve);
    }

    /**
     * Determine number of wagons based on route distance
     */
    determineWagonCount(routeDistance) {
        const config = TransportConfig.TRAIN.WAGON_COUNT;
        
        let maxWagons;
        if (routeDistance < config.SHORT_ROUTE_DISTANCE) {
            maxWagons = config.SHORT_MAX;
        } else if (routeDistance < config.MEDIUM_ROUTE_DISTANCE) {
            maxWagons = config.MEDIUM_MAX;
        } else {
            maxWagons = config.LONG_MAX;
        }
        
        const rand = Math.random();
        let numWagons;
        if (rand < config.SMALL_TRAIN_CHANCE) {
            numWagons = Math.floor(Math.random() * (maxWagons - 2)) + config.MIN_NORMAL;
        } else {
            numWagons = 2;
        }
        
        return Math.min(numWagons, maxWagons);
    }

    /**
     * Calculate train speed based on route distance
     */
    calculateTrainSpeed(routeDistance) {
        const config = TransportConfig.TRAIN.SPEED;
        
        let baseSpeed;
        if (routeDistance < TransportConfig.TRAIN.WAGON_COUNT.SHORT_ROUTE_DISTANCE) {
            baseSpeed = config.SHORT_BASE;
        } else if (routeDistance < TransportConfig.TRAIN.WAGON_COUNT.MEDIUM_ROUTE_DISTANCE) {
            baseSpeed = config.MEDIUM_BASE;
        } else {
            baseSpeed = config.LONG_BASE;
        }
        
        return baseSpeed + Math.random() * config.RANDOM_VARIANCE;
    }

    /**
     * Load or clone train end model (using ModelLoader utility)
     */
    getTrainEndModel(callback) {
        ModelLoader.getOrLoadModel({
            gltfLoader: this.sceneModel.getGLTFLoader(),
            cache: this.transportModel.getTrainEndModelCache(),
            cacheCallback: (cached) => this.transportModel.setTrainEndModelCache(cached),
            vehicleType: 'train',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 },
            modelPath: 'Models3D/TrainEnd.glb'
        }, callback);
    }

    /**
     * Load or clone train middle model (using ModelLoader utility)
     */
    getTrainMiddleModel(callback) {
        ModelLoader.getOrLoadModel({
            gltfLoader: this.sceneModel.getGLTFLoader(),
            cache: this.transportModel.getTrainMiddleModelCache(),
            cacheCallback: (cached) => this.transportModel.setTrainMiddleModelCache(cached),
            vehicleType: 'train',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 },
            modelPath: 'Models3D/TrainMiddle.glb'
        }, callback);
    }

    /**
     * Create wagon models for train
     */
    createWagons(numWagons, trainGroup) {
        const wagons = [];
        
        for (let i = 0; i < numWagons; i++) {
            const wagonGroup = new THREE.Group();
            
            if (i === 0) {
                // First wagon: use TrainEnd.glb
                this.getTrainEndModel((model) => {
                    wagonGroup.add(model);
                });
            } else if (i === numWagons - 1) {
                // Last wagon: use TrainEnd.glb rotated 180 degrees
                this.getTrainEndModel((model) => {
                    model.rotation.y = Math.PI;
                    wagonGroup.add(model);
                });
            } else {
                // Middle wagons: use TrainMiddle.glb
                this.getTrainMiddleModel((model) => {
                    wagonGroup.add(model);
                });
            }
            
            wagonGroup.renderOrder = 999;
            wagonGroup.visible = false;
            wagonGroup.position.set(0, 0, 0);
            
            trainGroup.add(wagonGroup);
            wagons.push(wagonGroup);
        }
        
        return wagons;
    }

    /**
     * Create a train with wagons
     */
    createTrain(routeData, isMultiStop = false, journeyProgress = 0) {
        const globe = this.sceneModel.getGlobe();
        const routeDistance = this.calculateRouteDistance(routeData.curve);
        const numWagons = this.determineWagonCount(routeDistance);
        const speed = this.calculateTrainSpeed(routeDistance);
        
        const trainGroup = new THREE.Group();
        const wagons = this.createWagons(numWagons, trainGroup);
        
        trainGroup.userData = {
            curve: routeData.curve,
            progress: 0,
            speed: speed,
            from: routeData.from,
            to: routeData.to,
            wagons: wagons,
            wagonSpacing: TransportConfig.TRAIN.WAGON_SPACING,
            isMultiStop: false,
            routes: null,
            currentRouteIndex: 0,
            needsReverse: false,
            isTransitioning: false,
            trainId: Math.random().toString(36).substr(2, 9),
            isWaiting: false,
            journeyProgress: journeyProgress
        };
        
        if (!isMultiStop) {
            this.routeController.reserveRoute(routeData.from, routeData.to, trainGroup.userData.trainId);
        }
        
        const startPos = routeData.curve.getPointAt(0);
        trainGroup.position.copy(startPos);
        trainGroup.visible = false;
        trainGroup.userData.isNewlySpawned = true;
        
        globe.add(trainGroup);
        this.transportModel.addTrain(trainGroup);
        
        return trainGroup;
    }

    /**
     * Create a multi-stop train
     */
    createMultiStopTrain(routes) {
        const firstRoute = routes[0];
        const train = this.createTrain(firstRoute, true, 0);
        
        train.userData.isMultiStop = true;
        train.userData.routes = routes;
        train.userData.currentRouteIndex = 0;
        train.userData.totalRoutes = routes.length;
        train.userData.trainId = Math.random().toString(36).substr(2, 9);
        train.userData.finalDestination = routes[routes.length - 1].to;
        train.userData.previousCity = null;
        train.userData.isWaiting = false;
        train.userData.journeyProgress = 0;
        
        this.routeController.reserveRoute(firstRoute.from, firstRoute.to, train.userData.trainId);
        
        const journey = routes.map(r => `${r.from}->${r.to}${r.needsReverse?'(rev)':''}`).join(' | ');
        // console.log(`🚄 NEW MULTI-STOP TRAIN [${train.userData.trainId}]: ${journey}`);
        
        return train;
    }

    /**
     * Handle multi-stop train transition
     */
    handleMultiStopTransition(train) {
        const data = train.userData;
        
        if (!data.isMultiStop || data.progress < 1.0 || data.isTransitioning) {
            return false;
        }
        
        if (data.currentRouteIndex >= data.routes.length - 1) {
            return false; // Journey complete
        }
        
        const currentFrom = data.from;
        const currentTo = data.to;
        
        this.routeController.releaseRoute(currentFrom, currentTo, data.trainId);
        
        let nextRoute = data.routes[data.currentRouteIndex + 1];
        let canDepart = false;
        
        if (!this.routeController.isRouteAvailable(nextRoute.from, nextRoute.to)) {
            const alternateRoutes = this.routeController.findAlternateRoute(
                currentTo, 
                data.finalDestination, 
                currentFrom, 
                TransportConfig.TRAIN.MAX_STOPS
            );
            
            if (alternateRoutes && alternateRoutes.length > 0) {
                console.log(`🔀 TRAIN [${data.trainId}] taking alternate route (${alternateRoutes.length} hops)`);
                data.routes = [data.routes[data.currentRouteIndex], ...alternateRoutes];
                data.currentRouteIndex = 0;
                nextRoute = alternateRoutes[0];
                canDepart = true;
            } else {
                if (!data.isWaiting) {
                    // console.log(`⏸️ TRAIN [${data.trainId}] waiting at station ${currentTo}...`);
                    data.isWaiting = true;
                    data.progress = 1.0;
                }
                canDepart = false;
            }
        } else {
            canDepart = true;
        }
        
        if (canDepart) {
            data.isTransitioning = true;
            if (data.isWaiting) {
                data.isWaiting = false;
            }
            
            this.routeController.reserveRoute(nextRoute.from, nextRoute.to, data.trainId);
            data.currentRouteIndex++;
            data.journeyProgress = data.currentRouteIndex / data.totalRoutes;
            
            const progressPercent = Math.round(data.journeyProgress * 100);
            // console.log(`🚄 TRAIN [${data.trainId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length}, ${progressPercent}% journey)`);
            
            data.curve = nextRoute.curve;
            data.from = nextRoute.from;
            data.to = nextRoute.to;
            data.previousCity = currentFrom;
            data.needsReverse = nextRoute.needsReverse;
            data.progress = 0;
            
            const routeDistance = this.calculateRouteDistance(nextRoute.curve);
            data.speed = this.calculateTrainSpeed(routeDistance);
        }
        
        return true;
    }

    /**
     * Position wagon along curve
     */
    positionWagon(wagon, data, wagonProgress) {
        let actualProgress = wagonProgress;
        if (data.needsReverse) {
            actualProgress = 1 - wagonProgress;
        }
        
        actualProgress = Math.max(0, Math.min(1, actualProgress));
        
        try {
            const wagonPosition = data.curve.getPointAt(actualProgress);
            
            if (!wagonPosition || isNaN(wagonPosition.x) || isNaN(wagonPosition.y) || isNaN(wagonPosition.z)) {
                return false;
            }
            
            // Validate wagon position
            const wagonDistance = wagonPosition.length();
            const validation = TransportConfig.VALIDATION;
            if (wagonDistance < validation.MIN_DISTANCE_FROM_CENTER || 
                wagonDistance > validation.MAX_DISTANCE_FROM_CENTER) {
                return false;
            }
            
            let tangent = data.curve.getTangentAt(actualProgress).normalize();
            
            if (data.needsReverse) {
                tangent.negate();
            }
            
            const up = wagonPosition.clone().normalize();
            const offsetDistance = TransportConfig.TRAIN.ELEVATION_OFFSET;
            const elevatedPosition = wagonPosition.clone().add(up.multiplyScalar(offsetDistance));
            
            const right = new THREE.Vector3().crossVectors(tangent, up.clone().normalize()).normalize();
            const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
            
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
            
            wagon.quaternion.setFromRotationMatrix(rotationMatrix);
            wagon.position.copy(elevatedPosition).sub(data.train.position);
            
            return true;
        } catch (error) {
            console.error('Error positioning wagon:', error);
            return false;
        }
    }

    /**
     * Update train positions and wagons
     */
    /**
     * Update train progress
     */
    updateTrainProgress(train, data) {
        // Skip newly spawned trains for one frame
        if (data.isNewlySpawned) {
            data.isNewlySpawned = false;
            return false; // Skip this train
        }
        
        // Update progress
        if (!data.isWaiting) {
            data.progress += data.speed;
        }
        
        // Clear transitioning flag
        if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
            data.isTransitioning = false;
        }
        
        return true; // Continue processing
    }

    /**
     * Position train and wagons on the route
     */
    positionTrainAndWagons(train, data, hyperloopVisible) {
        if (data.progress <= 0) {
            train.visible = false;
            return;
        }

        if (!data.curve || typeof data.curve.getPointAt !== 'function') {
            train.visible = false;
            return;
        }
        
        try {
            const trainProgress = Math.min(data.progress, 1.0);
            const position = data.curve.getPointAt(trainProgress);
            
            if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                train.visible = false;
                return;
            }
            
            // Validate position
            const distanceFromCenter = position.length();
            const validation = TransportConfig.VALIDATION;
            if (distanceFromCenter < validation.MIN_DISTANCE_FROM_CENTER || 
                distanceFromCenter > validation.MAX_DISTANCE_FROM_CENTER) {
                train.visible = false;
                return;
            }
            
            train.position.copy(position);
            
            // Position wagons
            const curveLength = data.curve.getLength();
            const spacingProgress = data.wagonSpacing / curveLength;
            let anyWagonVisible = false;
            
            data.wagons.forEach((wagon, index) => {
                wagon.visible = false;
                
                if (data.isWaiting) {
                    return;
                }
                
                const wagonProgress = Math.max(0, data.progress - (spacingProgress * index));
                
                // Wagons appear when wagonProgress > 0, disappear when wagonProgress > 1
                if (wagonProgress <= 0 || wagonProgress > 1) {
                    return;
                }
                
                wagon.userData = { train: train };
                if (this.positionWagon(wagon, { ...data, train }, wagonProgress)) {
                    wagon.visible = hyperloopVisible;
                    anyWagonVisible = hyperloopVisible;
                }
            });
            
            train.visible = anyWagonVisible ? hyperloopVisible : false;
        } catch (error) {
            console.error('Error updating train:', error);
            train.visible = false;
        }
    }

    /**
     * Clean up completed trains
     */
    cleanupCompletedTrain(train, data, globe) {
        if (data.progress <= 1) {
            return false; // Train not completed
        }

        if (!data.curve || typeof data.curve.getLength !== 'function') {
            this.routeController.releaseRoute(data.from, data.to, data.trainId);
            globe.remove(train);
            this.transportModel.removeTrain(train);
            return true; // Train removed
        }
        
        const curveLength = data.curve.getLength();
        const spacingProgress = data.wagonSpacing / curveLength;
        let allWagonsFinished = true;
        
        data.wagons.forEach((wagon, index) => {
            const wagonProgress = data.progress - (spacingProgress * index);
            if (wagonProgress <= 1) {
                allWagonsFinished = false;
            }
        });
        
        if (allWagonsFinished) {
            this.routeController.releaseRoute(data.from, data.to, data.trainId);
            globe.remove(train);
            this.transportModel.removeTrain(train);
            return true; // Train removed
        }
        
        return false; // Train not removed
    }

    updateTrains() {
        const globe = this.sceneModel.getGlobe();
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const trains = this.transportModel.getTrains();
        
        for (let i = trains.length - 1; i >= 0; i--) {
            const train = trains[i];
            const data = train.userData;
            
            // Update progress
            if (!this.updateTrainProgress(train, data)) {
                continue; // Skip newly spawned trains
            }
            
            // Handle multi-stop transitions
            if (this.handleMultiStopTransition(train)) {
                continue; // Transition handled, continue to next train
            }
            
            // Position train and wagons
            this.positionTrainAndWagons(train, data, hyperloopVisible);
            
            // Clean up completed trains
            if (this.cleanupCompletedTrain(train, data, globe)) {
                continue; // Train was removed
            }
        }
    }

    /**
     * Spawn trains randomly
     */
    spawnTrainsRandomly() {
        this.routeController.buildRouteGraph();
        
        const routeCurves = this.transportModel.getRouteCurves();
        const routeGraph = this.transportModel.getRouteGraph();
        
        console.log(`📊 Total routes: ${routeCurves.length}`);
        console.log(`📊 Cities in graph: ${Object.keys(routeGraph).length}`);
        
        // Spawn initial train
        if (routeCurves.length > 0) {
            const randomRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
            this.createTrain(randomRoute);
        }
        
        // Set up spawn interval
        this.trainSpawnInterval = setInterval(() => {
            const isPageVisible = this.sceneModel.getPageVisible();
            const hyperloopVisible = this.sceneModel.getHyperloopVisible();
            
            if (!isPageVisible || !hyperloopVisible) return;
            
            const trains = this.transportModel.getTrains();
            if (trains.length >= TransportConfig.TRAIN.MAX_COUNT) return;
            
            if (routeCurves.length > 0) {
                const isMultiStop = Math.random() < TransportConfig.TRAIN.MULTI_STOP_CHANCE;
                
                if (isMultiStop && Object.keys(routeGraph).length > 0) {
                    const numStops = Math.floor(Math.random() * 3) + 2;
                    const multiRoute = this.routeController.findMultiStopRoute(numStops);
                    
                    if (multiRoute && multiRoute.routes.length >= 2) {
                        this.createMultiStopTrain(multiRoute.routes);
                    } else {
                        const randomRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
                        this.createTrain(randomRoute);
                    }
                } else {
                    // Select route with city weights
                    const config = TransportConfig.ROUTES.CITY_WEIGHTS;
                    let selectedRoute;
                    const rand = Math.random();
                    
                    if (rand < config.AATLIS_DIRECT) {
                        const aatlisRoutes = routeCurves.filter(r => r.from === 'Aatlis' || r.to === 'Aatlis');
                        if (aatlisRoutes.length > 0) {
                            selectedRoute = aatlisRoutes[Math.floor(Math.random() * aatlisRoutes.length)];
                        }
                    } else if (rand < config.MIDTOWN_DIRECT) {
                        const midtownRoutes = routeCurves.filter(r => r.from === 'Midtown' || r.to === 'Midtown');
                        if (midtownRoutes.length > 0) {
                            selectedRoute = midtownRoutes[Math.floor(Math.random() * midtownRoutes.length)];
                        }
                    }
                    
                    if (!selectedRoute) {
                        selectedRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
                    }
                    
                    this.createTrain(selectedRoute);
                }
            }
        }, TransportConfig.TRAIN.SPAWN_INTERVAL);
    }

    /**
     * Stop spawning trains
     */
    stopSpawning() {
        if (this.trainSpawnInterval) {
            clearInterval(this.trainSpawnInterval);
            this.trainSpawnInterval = null;
        }
    }
}
