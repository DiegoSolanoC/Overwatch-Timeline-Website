/**
 * TransportController - Handles transport creation, updates, and spawning
 * Complete implementation migrated from globe.js
 */
import { latLonToVector3, createArcBetweenPoints } from '../utils/GeometryUtils.js';
import { DEBUG_PHANTOM_WAGONS } from '../utils/Constants.js';

export class TransportController {
    constructor(sceneModel, transportModel, routeController, transportView, globeView, dataModel) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.routeController = routeController;
        this.transportView = transportView;
        this.globeView = globeView;
        this.dataModel = dataModel;
        
        // Spawn intervals
        this.trainSpawnInterval = null;
        this.planeSpawnInterval = null;
        this.boatSpawnInterval = null;
    }

    /**
     * Calculate route distance
     * @param {THREE.Curve} curve - Route curve
     * @returns {number}
     */
    calculateRouteDistance(curve) {
        return this.routeController.calculateRouteDistance(curve);
    }

    /**
     * Create a train with wagons
     * @param {Object} routeData - Route data
     * @param {boolean} isMultiStop - Is multi-stop route
     * @param {number} journeyProgress - Journey progress
     * @returns {Object} Train object
     */
    createTrain(routeData, isMultiStop = false, journeyProgress = 0) {
        const globe = this.sceneModel.getGlobe();
        const routeDistance = this.calculateRouteDistance(routeData.curve);
        
        // Determine number of wagons based on distance
        let maxWagons;
        if (routeDistance < 0.5) {
            maxWagons = 2;
        } else if (routeDistance < 1.0) {
            maxWagons = 4;
        } else {
            maxWagons = 6;
        }
        
        const rand = Math.random();
        let numWagons;
        if (rand < 0.7) {
            numWagons = Math.floor(Math.random() * (maxWagons - 2)) + 3;
        } else {
            numWagons = 2;
        }
        numWagons = Math.min(numWagons, maxWagons);
        
        const trainGroup = new THREE.Group();
        const wagons = [];
        const gltfLoader = this.sceneModel.getGLTFLoader();
        const trainEndModelCache = this.transportModel.getTrainEndModelCache();
        const trainMiddleModelCache = this.transportModel.getTrainMiddleModelCache();
        
        // Train material (same as planes and boats)
        const trainColor = 0x0088cc;
        const trainEmissive = 0x004488;
        
        const applyTrainMaterial = (model) => {
            model.traverse((child) => {
                if (child.isMesh) {
                    // Only apply material if it's not already a trail (which uses MeshBasicMaterial)
                    // Check if material exists and is not MeshBasicMaterial, or create new one
                    if (!child.material || child.material.type !== 'MeshBasicMaterial') {
                        child.material = new THREE.MeshPhongMaterial({
                            color: trainColor,
                            emissive: trainEmissive,
                            emissiveIntensity: 0.3,
                            transparent: true,
                            opacity: 0.85,
                            shininess: 30
                        });
                    }
                    child.visible = true;
                    if (child.geometry) {
                        child.geometry.computeBoundingBox();
                        child.geometry.computeBoundingSphere();
                    }
                }
            });
        };
        
        // Function to load or clone train end model
        const getTrainEndModel = (callback) => {
            if (trainEndModelCache) {
                const model = trainEndModelCache.clone(); // Clone model (materials are cloned automatically)
                model.scale.set(0.02, 0.02, 0.02);
                model.visible = true;
                applyTrainMaterial(model);
                callback(model);
            } else {
                gltfLoader.load('Models3D/TrainEnd.glb', (gltf) => {
                    const model = gltf.scene;
                    const cached = model.clone(); // Clone model (materials are cloned automatically)
                    this.transportModel.setTrainEndModelCache(cached);
                    
                    model.scale.set(0.02, 0.02, 0.02);
                    model.visible = true;
                    applyTrainMaterial(model);
                    callback(model);
                }, undefined, (error) => {
                    console.error('Error loading TrainEnd.glb:', error);
                    // Fallback to simple box
                    const fallback = new THREE.Mesh(
                        new THREE.BoxGeometry(0.03, 0.01, 0.08),
                        new THREE.MeshPhongMaterial({ color: trainColor, transparent: true, opacity: 0.85 })
                    );
                    callback(fallback);
                });
            }
        };
        
        // Function to load or clone train middle model
        const getTrainMiddleModel = (callback) => {
            if (trainMiddleModelCache) {
                const model = trainMiddleModelCache.clone(true); // Deep clone to clone materials too
                model.scale.set(0.02, 0.02, 0.02);
                model.visible = true;
                applyTrainMaterial(model);
                callback(model);
            } else {
                gltfLoader.load('Models3D/TrainMiddle.glb', (gltf) => {
                    const model = gltf.scene;
                    const cached = model.clone(); // Clone model (materials are cloned automatically)
                    this.transportModel.setTrainMiddleModelCache(cached);
                    
                    model.scale.set(0.02, 0.02, 0.02);
                    model.visible = true;
                    applyTrainMaterial(model);
                    callback(model);
                }, undefined, (error) => {
                    console.error('Error loading TrainMiddle.glb:', error);
                    // Fallback to simple box
                    const fallback = new THREE.Mesh(
                        new THREE.BoxGeometry(0.03, 0.01, 0.08),
                        new THREE.MeshPhongMaterial({ color: trainColor, transparent: true, opacity: 0.85 })
                    );
                    callback(fallback);
                });
            }
        };
        
        // Create wagons with appropriate models
        for (let i = 0; i < numWagons; i++) {
            const wagonGroup = new THREE.Group();
            
            if (i === 0) {
                // First wagon: use TrainEnd.glb
                getTrainEndModel((model) => {
                    wagonGroup.add(model);
                });
            } else if (i === numWagons - 1) {
                // Last wagon: use TrainEnd.glb rotated 180 degrees on Y axis to face backwards
                getTrainEndModel((model) => {
                    model.rotation.y = Math.PI; // 180 degrees rotation on Y axis
                    wagonGroup.add(model);
                });
            } else {
                // Middle wagons: use TrainMiddle.glb
                getTrainMiddleModel((model) => {
                    wagonGroup.add(model);
                });
            }
            
            wagonGroup.renderOrder = 999;
            wagonGroup.visible = false;
            wagonGroup.position.set(0, 0, 0);
            
            trainGroup.add(wagonGroup);
            wagons.push(wagonGroup);
        }
        
        let baseSpeed;
        if (routeDistance < 0.5) {
            baseSpeed = 0.006;
        } else if (routeDistance < 1.0) {
            baseSpeed = 0.005;
        } else {
            baseSpeed = 0.004;
        }
        const speed = baseSpeed + Math.random() * 0.002;
        
        trainGroup.userData = {
            curve: routeData.curve,
            progress: 0,
            speed: speed,
            from: routeData.from,
            to: routeData.to,
            wagons: wagons,
            wagonSpacing: 0.045,
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
     * @param {Array} routes - Array of route data
     * @returns {Object} Train object
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
        console.log(`🚄 NEW MULTI-STOP TRAIN [${train.userData.trainId}]: ${journey}`);
        
        return train;
    }

    /**
     * Create a plane
     * @param {Object} fromCity - From city object
     * @param {Object} toCity - To city object
     * @returns {Object} Plane object
     */
    createPlane(fromCity, toCity) {
        const globe = this.sceneModel.getGlobe();
        const gltfLoader = this.sceneModel.getGLTFLoader();
        const planeModelCache = this.transportModel.getPlaneModelCache();
        
        const groundStart = latLonToVector3(fromCity.lat, fromCity.lon, 1.005);
        const groundEnd = latLonToVector3(toCity.lat, toCity.lon, 1.005);
        const distance = groundStart.distanceTo(groundEnd);
        
        const minAltitude = 1.04;
        const maxAltitude = 1.08;
        const normalizedDistance = Math.min(distance / 1.5, 1.0);
        const cruiseAltitude = minAltitude + (maxAltitude - minAltitude) * normalizedDistance;
        
        const takeoffPhase = 0.25 - (normalizedDistance * 0.05);
        const landingPhase = 0.50 - (normalizedDistance * 0.10);
        const cruiseStart = takeoffPhase;
        const cruiseEnd = 1.0 - landingPhase;
        
        const flightPoints = [];
        const totalSegments = 60;
        
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const basePoint = createArcBetweenPoints(
                fromCity.lat, fromCity.lon,
                toCity.lat, toCity.lon,
                1.005, totalSegments, true
            )[i];
            
            let altitude;
            if (t < cruiseStart) {
                const takeoffProgress = t / cruiseStart;
                const easeOut = Math.sin(takeoffProgress * Math.PI / 2);
                altitude = 1.005 + (cruiseAltitude - 1.005) * easeOut;
            } else if (t > cruiseEnd) {
                const landingProgress = (t - cruiseEnd) / (1.0 - cruiseEnd);
                const easeIn = landingProgress * landingProgress;
                altitude = cruiseAltitude - (cruiseAltitude - 1.005) * easeIn;
            } else {
                altitude = cruiseAltitude;
            }
            
            const normalizedPos = basePoint.clone().normalize();
            flightPoints.push(normalizedPos.multiplyScalar(altitude));
        }
        
        const curve = new THREE.CatmullRomCurve3(flightPoints);
        const speed = distance > 1.5 ? 0.0015 : 0.0020;
        
        const planeGroup = new THREE.Group();
        
        if (planeModelCache) {
            const planeModel = planeModelCache.clone(); // Clone model (materials are cloned automatically)
            planeModel.scale.set(0.02, 0.02, 0.02);
            planeModel.visible = true;
            
            planeModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0x0088cc, // Blue for planes (same as trains)
                        emissive: 0x004488,
                        emissiveIntensity: 0.3,
                        transparent: true,
                        opacity: 0.85,
                        shininess: 30
                    });
                    child.visible = true;
                }
            });
            
            planeGroup.add(planeModel);
        } else {
            gltfLoader.load('Models3D/Plane.glb', (gltf) => {
                const model = gltf.scene;
                    const cached = model.clone(); // Clone model (materials are cloned automatically)
                    this.transportModel.setPlaneModelCache(cached);
                
                model.scale.set(0.02, 0.02, 0.02);
                model.visible = true;
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshPhongMaterial({
                            color: 0x0088cc, // Blue for planes (same as trains)
                            emissive: 0x004400,
                            emissiveIntensity: 0.3,
                            transparent: true,
                            opacity: 0.85,
                            shininess: 30
                        });
                        child.visible = true;
                        if (child.geometry) {
                            child.geometry.computeBoundingBox();
                            child.geometry.computeBoundingSphere();
                        }
                    }
                });
                
                planeGroup.add(model);
            }, undefined, (error) => {
                console.error('Error loading plane model:', error);
            });
        }
        
        planeGroup.userData = {
            curve: curve,
            progress: 0,
            speed: speed,
            from: fromCity.name,
            to: toCity.name,
            isPlane: true,
            lastTrailSpawn: 0,
            trailSpawnInterval: 2,
            landingTimer: 0,
            hasLanded: false,
            bankAngle: 0,
            targetBankAngle: 0,
            bankChangeTimer: 0
        };
        
        planeGroup.visible = false;
        globe.add(planeGroup);
        this.transportModel.addPlane(planeGroup);
        
        return planeGroup;
    }

    /**
     * Create a multi-stop plane
     * @param {Array} airports - Array of airport objects in order
     * @returns {Object} Plane object
     */
    createMultiStopPlane(airports) {
        if (airports.length < 2) return null;
        
        // Create route segments for each airport pair
        const routes = [];
        for (let i = 0; i < airports.length - 1; i++) {
            const fromCity = airports[i];
            const toCity = airports[i + 1];
            
            const groundStart = latLonToVector3(fromCity.lat, fromCity.lon, 1.005);
            const groundEnd = latLonToVector3(toCity.lat, toCity.lon, 1.005);
            const distance = groundStart.distanceTo(groundEnd);
            
            const minAltitude = 1.04;
            const maxAltitude = 1.08;
            const normalizedDistance = Math.min(distance / 1.5, 1.0);
            const cruiseAltitude = minAltitude + (maxAltitude - minAltitude) * normalizedDistance;
            
            const takeoffPhase = 0.25 - (normalizedDistance * 0.05);
            const landingPhase = 0.50 - (normalizedDistance * 0.10);
            const cruiseStart = takeoffPhase;
            const cruiseEnd = 1.0 - landingPhase;
            
            const flightPoints = [];
            const totalSegments = 60;
            
            for (let j = 0; j <= totalSegments; j++) {
                const t = j / totalSegments;
                const basePoint = createArcBetweenPoints(
                    fromCity.lat, fromCity.lon,
                    toCity.lat, toCity.lon,
                    1.005, totalSegments, true
                )[j];
                
                let altitude;
                if (t < cruiseStart) {
                    const takeoffProgress = t / cruiseStart;
                    const easeOut = Math.sin(takeoffProgress * Math.PI / 2);
                    altitude = 1.005 + (cruiseAltitude - 1.005) * easeOut;
                } else if (t > cruiseEnd) {
                    const landingProgress = (t - cruiseEnd) / (1.0 - cruiseEnd);
                    const easeIn = landingProgress * landingProgress;
                    altitude = cruiseAltitude - (cruiseAltitude - 1.005) * easeIn;
                } else {
                    altitude = cruiseAltitude;
                }
                
                const normalizedPos = basePoint.clone().normalize();
                flightPoints.push(normalizedPos.multiplyScalar(altitude));
            }
            
            const curve = new THREE.CatmullRomCurve3(flightPoints);
            const speed = distance > 1.5 ? 0.0015 : 0.0020;
            
            routes.push({
                from: fromCity.name,
                to: toCity.name,
                fromCity: fromCity,
                toCity: toCity,
                curve: curve,
                speed: speed
            });
        }
        
        // Create plane with first route
        const firstRoute = routes[0];
        const plane = this.createPlane(firstRoute.fromCity, firstRoute.toCity);
        
        plane.userData.isMultiStop = true;
        plane.userData.routes = routes;
        plane.userData.currentRouteIndex = 0;
        plane.userData.totalRoutes = routes.length;
        plane.userData.planeId = Math.random().toString(36).substr(2, 9);
        plane.userData.finalDestination = routes[routes.length - 1].to;
        plane.userData.hasLanded = false;
        plane.userData.landingTimer = 0;
        plane.userData.isTransitioning = false;
        
        const journey = routes.map(r => `${r.from}->${r.to}`).join(' | ');
        console.log(`✈️ NEW MULTI-STOP PLANE [${plane.userData.planeId}]: ${journey}`);
        
        return plane;
    }

    /**
     * Create a boat
     * @param {Object} routeData - Route data
     * @param {boolean} isMultiStop - Is multi-stop route
     * @returns {Object} Boat object
     */
    createBoat(routeData, isMultiStop = false) {
        const globe = this.sceneModel.getGlobe();
        const gltfLoader = this.sceneModel.getGLTFLoader();
        const curve = routeData.curve;
        const distance = this.calculateRouteDistance(curve);
        const speed = distance > 1.0 ? 0.004 : 0.005;
        
        const boatGroup = new THREE.Group();
        
        if (gltfLoader) {
            gltfLoader.load('Models3D/Boat.glb', 
                (gltf) => {
                    const model = gltf.scene;
                    model.scale.set(0.02, 0.02, 0.02);
                    model.visible = true;
                    
                    const boatColor = 0x0088cc; // Blue for boats (same as trains)
                    const boatEmissive = 0x004488;
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshPhongMaterial({
                                color: boatColor,
                                emissive: boatEmissive,
                                emissiveIntensity: 0.3,
                                transparent: true,
                                opacity: 0.85,
                                shininess: 30
                            });
                            child.visible = true;
                            if (child.geometry) {
                                child.geometry.computeBoundingBox();
                                child.geometry.computeBoundingSphere();
                            }
                        }
                    });
                    
                    boatGroup.add(model);
                }, 
                undefined,
                (error) => {
                    console.warn('⚠️ Boat model not found, using fallback geometry');
                    const boatGeometry = new THREE.BoxGeometry(0.03, 0.01, 0.08);
                    const boatMaterial = new THREE.MeshPhongMaterial({
                        color: 0x0088cc, // Blue for boats (same as trains)
                        emissive: 0x440000,
                        emissiveIntensity: 0.3,
                        transparent: true,
                        opacity: 0.85
                    });
                    const boatMesh = new THREE.Mesh(boatGeometry, boatMaterial);
                    boatMesh.rotation.x = Math.PI / 2;
                    boatGroup.add(boatMesh);
                }
            );
        } else {
            const boatGeometry = new THREE.BoxGeometry(0.03, 0.01, 0.08);
            const boatMaterial = new THREE.MeshPhongMaterial({
                color: 0xff0000, // Red for boats
                emissive: 0x440000,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.85
            });
            const boatMesh = new THREE.Mesh(boatGeometry, boatMaterial);
            boatMesh.rotation.x = Math.PI / 2;
            boatGroup.add(boatMesh);
        }
        
        // Adjust trail spawn interval based on route distance for shorter trips
        const routeDistance = this.calculateRouteDistance(curve);
        let trailSpawnInterval = 1;
        if (routeDistance < 0.3) {
            trailSpawnInterval = 0.5; // More frequent for very short trips
        } else if (routeDistance < 0.6) {
            trailSpawnInterval = 0.75; // Slightly more frequent for short trips
        }
        
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
            routeDistance: routeDistance
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
     * @param {Array} routes - Array of route data
     * @returns {Object} Boat object
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
        console.log(`🚢 NEW MULTI-STOP BOAT [${boat.userData.boatId}]: ${journey}`);
        
        return boat;
    }

    /**
     * Update trains - handles movement, multi-stop transitions, and wagon positioning
     */
    updateTrains() {
        const globe = this.sceneModel.getGlobe();
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const trains = this.transportModel.getTrains();
        
        for (let i = trains.length - 1; i >= 0; i--) {
            const train = trains[i];
            const data = train.userData;
            
            if (data.isNewlySpawned) {
                data.isNewlySpawned = false;
                continue;
            }
            
            if (!data.isWaiting) {
                data.progress += data.speed;
            }
            
            // Handle multi-stop trains
            if (data.isMultiStop && data.progress >= 1.0 && !data.isTransitioning) {
                if (data.currentRouteIndex < data.routes.length - 1) {
                    const currentFrom = data.from;
                    const currentTo = data.to;
                    
                    this.routeController.releaseRoute(currentFrom, currentTo, data.trainId);
                    
                    let nextRoute = data.routes[data.currentRouteIndex + 1];
                    let canDepart = false;
                    
                    if (!this.routeController.isRouteAvailable(nextRoute.from, nextRoute.to)) {
                        const alternateRoutes = this.routeController.findAlternateRoute(currentTo, data.finalDestination, currentFrom, 5);
                        
                        if (alternateRoutes && alternateRoutes.length > 0) {
                            console.log(`🔀 TRAIN [${data.trainId}] taking alternate route (${alternateRoutes.length} hops)`);
                            data.routes = [data.routes[data.currentRouteIndex], ...alternateRoutes];
                            data.currentRouteIndex = 0;
                            nextRoute = alternateRoutes[0];
                            canDepart = true;
                        } else {
                            if (!data.isWaiting) {
                                console.log(`⏸️ TRAIN [${data.trainId}] waiting at station ${currentTo}...`);
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
                        console.log(`🚄 TRAIN [${data.trainId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length}, ${progressPercent}% journey)`);
                        
                        data.curve = nextRoute.curve;
                        data.from = nextRoute.from;
                        data.to = nextRoute.to;
                        data.previousCity = currentFrom;
                        data.needsReverse = nextRoute.needsReverse;
                        data.progress = 0;
                        
                        const routeDistance = this.calculateRouteDistance(nextRoute.curve);
                        let baseSpeed;
                        if (routeDistance < 0.5) {
                            baseSpeed = 0.006;
                        } else if (routeDistance < 1.0) {
                            baseSpeed = 0.005;
                        } else {
                            baseSpeed = 0.004;
                        }
                        data.speed = baseSpeed + Math.random() * 0.002;
                    }
                }
            }
            
            if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
                data.isTransitioning = false;
            }
            
            // Position train like planes/boats - simpler and more reliable
            // Allow progress > 1 so wagons can disappear one by one
            if (data.progress > 0) {
                if (!data.curve || typeof data.curve.getPointAt !== 'function') {
                    train.visible = false;
                    continue;
                }
                
                try {
                    // Clamp train position to end of curve when progress > 1
                    const trainProgress = Math.min(data.progress, 1.0);
                    const position = data.curve.getPointAt(trainProgress);
                    
                    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                        train.visible = false;
                        continue;
                    }
                    
                    // Validate position like planes/boats do
                    const distanceFromCenter = position.length();
                    if (distanceFromCenter < 0.5 || distanceFromCenter > 2.0) {
                        // Invalid position - hide train
                        train.visible = false;
                        continue;
                    }
                    
                    train.position.copy(position);
                    
                    // Position wagons relative to train (simpler approach)
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
                        // Mirror the appearance behavior: only show if wagonProgress is between 0 and 1
                        if (wagonProgress <= 0) {
                            return; // Wagon hasn't appeared yet
                        }
                        
                        if (wagonProgress > 1) {
                            return; // Wagon has disappeared (passed the end)
                        }
                        
                        let actualProgress = wagonProgress;
                        if (data.needsReverse) {
                            actualProgress = 1 - wagonProgress;
                        }
                        
                        actualProgress = Math.max(0, Math.min(1, actualProgress));
                        
                        try {
                            const wagonPosition = data.curve.getPointAt(actualProgress);
                            
                            if (!wagonPosition || isNaN(wagonPosition.x) || isNaN(wagonPosition.y) || isNaN(wagonPosition.z)) {
                                return;
                            }
                            
                            // Validate wagon position
                            const wagonDistance = wagonPosition.length();
                            if (wagonDistance < 0.5 || wagonDistance > 2.0) {
                                return;
                            }
                            
                            let tangent = data.curve.getTangentAt(actualProgress).normalize();
                            
                            if (data.needsReverse) {
                                tangent.negate();
                            }
                            
                            const up = wagonPosition.clone().normalize();
                            const offsetDistance = 0.006;
                            const elevatedPosition = wagonPosition.clone().add(up.multiplyScalar(offsetDistance));
                            
                            const right = new THREE.Vector3().crossVectors(tangent, up.clone().normalize()).normalize();
                            const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
                            
                            const rotationMatrix = new THREE.Matrix4();
                            rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
                            
                            wagon.quaternion.setFromRotationMatrix(rotationMatrix);
                            wagon.position.copy(elevatedPosition).sub(train.position);
                            
                            wagon.visible = hyperloopVisible;
                            anyWagonVisible = hyperloopVisible;
                        } catch (error) {
                            wagon.visible = false;
                        }
                    });
                    
                    train.visible = anyWagonVisible ? hyperloopVisible : false;
                } catch (error) {
                    train.visible = false;
                    continue;
                }
            } else {
                train.visible = false;
            }
            
            // Clean up completed trains - wagons disappear one by one like they appear
            if (data.progress > 1) {
                // Check if all wagons have finished (disappeared)
                // Use same calculation as wagon positioning to ensure consistency
                if (!data.curve || typeof data.curve.getLength !== 'function') {
                    // Can't calculate, remove train
                    this.routeController.releaseRoute(data.from, data.to, data.trainId);
                    globe.remove(train);
                    this.transportModel.removeTrain(train);
                    continue;
                }
                
                const curveLength = data.curve.getLength();
                const spacingProgress = data.wagonSpacing / curveLength;
                let allWagonsFinished = true;
                
                data.wagons.forEach((wagon, index) => {
                    const wagonProgress = data.progress - (spacingProgress * index);
                    // Wagon is finished if it has passed the end (wagonProgress > 1)
                    // Wagon is still visible if wagonProgress <= 1
                    if (wagonProgress <= 1) {
                        allWagonsFinished = false;
                    }
                });
                
                // Only remove train when ALL wagons have finished disappearing
                if (allWagonsFinished) {
                    this.routeController.releaseRoute(data.from, data.to, data.trainId);
                    globe.remove(train);
                    this.transportModel.removeTrain(train);
                    continue;
                }
            }
        }
    }

    /**
     * Update planes - handles movement, landing, and trail spawning
     */
    updatePlanes() {
        const globe = this.sceneModel.getGlobe();
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const planes = this.transportModel.getPlanes();
        
        for (let i = planes.length - 1; i >= 0; i--) {
            const plane = planes[i];
            const data = plane.userData;
            
            // Handle multi-stop planes
            if (data.isMultiStop && data.progress >= 1.0 && !data.isTransitioning) {
                if (data.currentRouteIndex < data.routes.length - 1) {
                    // Move to next route immediately
                    data.isTransitioning = true;
                    data.currentRouteIndex++;
                    const nextRoute = data.routes[data.currentRouteIndex];
                    
                    data.curve = nextRoute.curve;
                    data.speed = nextRoute.speed;
                    data.from = nextRoute.from;
                    data.to = nextRoute.to;
                    data.progress = 0;
                    data.hasLanded = false;
                    data.landingTimer = 0;
                    
                    console.log(`✈️ PLANE [${data.planeId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length})`);
                } else {
                    // Last stop - remove immediately
                    globe.remove(plane);
                    this.transportModel.removePlane(plane);
                    continue;
                }
            }
            
            if (data.hasLanded) {
                data.landingTimer += 1;
                if (data.landingTimer > 60) {
                    globe.remove(plane);
                    this.transportModel.removePlane(plane);
                    continue;
                }
                continue;
            }
            
            data.progress += data.speed;
            
            if (data.progress >= 1.0 && !data.isMultiStop) {
                data.progress = 1.0;
                data.hasLanded = true;
                data.landingTimer = 0;
                continue;
            }
            
            if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
                data.isTransitioning = false;
            }
            
            if (data.progress > 0 && data.progress <= 1) {
                const position = data.curve.getPointAt(data.progress);
                plane.position.copy(position);
                
                data.lastTrailSpawn += 1;
                if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                    const tangent = data.curve.getTangentAt(data.progress).normalize();
                    const forwardDirection = tangent.clone().negate();
                    this.transportView.createTrailSegment(position, forwardDirection);
                    data.lastTrailSpawn = 0;
                    if (Math.random() < 0.1) {
                        data.trailSpawnInterval = Math.random() * 10 + 5;
                    } else {
                        data.trailSpawnInterval = 2;
                    }
                }
                
                data.bankChangeTimer += 1;
                if (data.bankChangeTimer > 60) {
                    data.targetBankAngle = (Math.random() - 0.5) * 0.3;
                    data.bankChangeTimer = 0;
                }
                
                data.bankAngle += (data.targetBankAngle - data.bankAngle) * 0.05;
                
                const tangent = data.curve.getTangentAt(data.progress).normalize();
                const up = position.clone().normalize();
                const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
                const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
                
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
                plane.quaternion.setFromRotationMatrix(rotationMatrix);
                
                const bankQuaternion = new THREE.Quaternion();
                bankQuaternion.setFromAxisAngle(tangent, data.bankAngle);
                plane.quaternion.multiply(bankQuaternion);
                
                plane.visible = hyperloopVisible;
            }
        }
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
            
            if (data.isNewlySpawned) {
                data.isNewlySpawned = false;
                continue;
            }
            
            if (!data.isWaiting) {
                data.progress += data.speed;
            }
            
            if (data.isMultiStop && data.progress >= 1.0 && !data.isTransitioning) {
                if (data.currentRouteIndex < data.routes.length - 1) {
                    const currentFrom = data.from;
                    const currentTo = data.to;
                    
                    this.routeController.releaseBoatRoute(currentFrom, currentTo, data.boatId);
                    
                    let nextRoute = data.routes[data.currentRouteIndex + 1];
                    let canDepart = false;
                    
                    if (!this.routeController.isBoatRouteAvailable(nextRoute.from, nextRoute.to)) {
                        if (!data.isWaiting) {
                            console.log(`⏸️ BOAT [${data.boatId}] waiting at port ${currentTo}...`);
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
                        console.log(`🚢 BOAT [${data.boatId}] departing ${nextRoute.from} -> ${nextRoute.to} (segment ${data.currentRouteIndex + 1}/${data.routes.length})`);
                        
                        data.curve = nextRoute.curve;
                        data.from = nextRoute.from;
                        data.to = nextRoute.to;
                        data.previousPort = currentFrom;
                        data.needsReverse = nextRoute.needsReverse;
                        data.progress = 0;
                        
                        const routeDistance = this.calculateRouteDistance(nextRoute.curve);
                        data.speed = routeDistance > 1.0 ? 0.004 : 0.005;
                    }
                } else {
                    this.routeController.releaseBoatRoute(data.from, data.to, data.boatId);
                    globe.remove(boat);
                    this.transportModel.removeBoat(boat);
                    continue;
                }
            } else if (!data.isMultiStop && data.progress >= 1.0) {
                if (data.boatId) {
                    this.routeController.releaseBoatRoute(data.from, data.to, data.boatId);
                }
                globe.remove(boat);
                this.transportModel.removeBoat(boat);
                continue;
            }
            
            if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
                data.isTransitioning = false;
            }
            
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
                
                if (!data.lastTrailSpawn) data.lastTrailSpawn = 0;
                if (!data.trailSpawnInterval) data.trailSpawnInterval = 1;
                
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
     * Spawn trains randomly
     */
    spawnTrainsRandomly() {
        this.routeController.buildRouteGraph();
        
        const routeCurves = this.transportModel.getRouteCurves();
        const routeGraph = this.transportModel.getRouteGraph();
        
        console.log(`📊 Total routes: ${routeCurves.length}`);
        console.log(`📊 Cities in graph: ${Object.keys(routeGraph).length}`);
        
        if (routeCurves.length > 0) {
            const randomRoute = routeCurves[Math.floor(Math.random() * routeCurves.length)];
            this.createTrain(randomRoute);
        }
        
        this.trainSpawnInterval = setInterval(() => {
            const isPageVisible = this.sceneModel.getPageVisible();
            const hyperloopVisible = this.sceneModel.getHyperloopVisible();
            
            if (!isPageVisible || !hyperloopVisible) return;
            
            // Limit number of trains (half the normal amount for mobile performance)
            const MAX_TRAINS = 15;
            const trains = this.transportModel.getTrains();
            if (trains.length >= MAX_TRAINS) return;
            
            if (routeCurves.length > 0) {
                const isMultiStop = Math.random() < 0.33;
                
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
                    let selectedRoute;
                    const rand = Math.random();
                    
                    if (rand < 0.30) {
                        const aatlisRoutes = routeCurves.filter(r => r.from === 'Aatlis' || r.to === 'Aatlis');
                        if (aatlisRoutes.length > 0) {
                            selectedRoute = aatlisRoutes[Math.floor(Math.random() * aatlisRoutes.length)];
                        }
                    } else if (rand < 0.45) {
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
        }, 1000);
    }

    /**
     * Spawn planes randomly
     */
    spawnPlanesRandomly() {
        const airports = this.dataModel ? this.dataModel.getAllAirports() : [];
        console.log(`📊 Total airports: ${airports.length}`);
        
        const minDistance = 0.4;
        
        this.planeSpawnInterval = setInterval(() => {
            const isPageVisible = this.sceneModel.getPageVisible();
            const hyperloopVisible = this.sceneModel.getHyperloopVisible();
            
            if (!isPageVisible || !hyperloopVisible) return;
            
            // Limit number of planes (half the normal amount for mobile performance)
            const MAX_PLANES = 10;
            const planes = this.transportModel.getPlanes();
            if (planes.length >= MAX_PLANES) return;
            
            if (airports.length < 2) return;
            
            const from = airports[Math.floor(Math.random() * airports.length)];
            let to = airports[Math.floor(Math.random() * airports.length)];
            
            while (to === from) {
                to = airports[Math.floor(Math.random() * airports.length)];
            }
            
            const fromPos = latLonToVector3(from.lat, from.lon, 1.0);
            const toPos = latLonToVector3(to.lat, to.lon, 1.0);
            const distance = fromPos.distanceTo(toPos);
            
            const isMultiStop = Math.random() < 0.4; // 40% chance for multi-stop
            
            if (isMultiStop && airports.length >= 3) {
                // Create multi-stop plane
                const numStops = Math.floor(Math.random() * 3) + 2; // 2-4 stops
                const selectedAirports = [];
                
                // Pick random starting airport
                let current = airports[Math.floor(Math.random() * airports.length)];
                selectedAirports.push(current);
                
                // Pick subsequent airports
                for (let i = 1; i < numStops && i < airports.length; i++) {
                    let next = airports[Math.floor(Math.random() * airports.length)];
                    // Avoid duplicates
                    while (selectedAirports.includes(next) && airports.length > selectedAirports.length) {
                        next = airports[Math.floor(Math.random() * airports.length)];
                    }
                    if (!selectedAirports.includes(next)) {
                        selectedAirports.push(next);
                    }
                }
                
                if (selectedAirports.length >= 2) {
                    this.createMultiStopPlane(selectedAirports);
                }
            } else if (distance >= minDistance) {
                this.createPlane(from, to);
            }
        }, 3000);
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
        
        this.boatSpawnInterval = setInterval(() => {
            const isPageVisible = this.sceneModel.getPageVisible();
            const hyperloopVisible = this.sceneModel.getHyperloopVisible();
            
            if (!isPageVisible || !hyperloopVisible) return;
            
            // Limit number of boats (half the normal amount for mobile performance)
            const MAX_BOATS = 15;
            const boats = this.transportModel.getBoats();
            if (boats.length >= MAX_BOATS) return;
            
            if (boatRouteCurves.length === 0) return;
            
            const randomRoute = boatRouteCurves[Math.floor(Math.random() * boatRouteCurves.length)];
            const isMultiStop = Math.random() < 0.75;
            
            if (isMultiStop && Object.keys(boatRouteGraph).length > 0) {
                const numStops = Math.floor(Math.random() * 5) + 2;
                const multiRoute = this.routeController.findMultiStopBoatRoute(numStops);
                
                if (multiRoute && multiRoute.routes.length >= 2) {
                    this.createMultiStopBoat(multiRoute.routes);
                } else {
                    this.createBoat(randomRoute);
                }
            } else {
                this.createBoat(randomRoute);
            }
        }, 800);
    }

    /**
     * Create a satellite
     * @param {Object} config - Satellite configuration {type, orbitRadius, orbitSpeed, inclination, startAngle, rotationAngle, name}
     * @returns {Object} Satellite object
     */
    createSatellite(config) {
        const globe = this.sceneModel.getGlobe();
        const { type = 'small', orbitRadius = 1.15, orbitSpeed = 0.001, inclination = 0, startAngle = 0, rotationAngle = 0, name = 'Satellite' } = config;
        
        // Create satellite model using GLTF
        const satelliteGroup = new THREE.Group();
        const gltfLoader = this.sceneModel.getGLTFLoader();
        
        let color;
        let shouldAlignWithPath = false; // Only ISS and Mars Ship align with path
        
        if (type === 'ISS') {
            color = 0x0088cc; // Blue for ISS (same as other satellites)
            shouldAlignWithPath = true;
        } else if (type === 'MarsShip') {
            color = 0xff0000; // Red for Mars Ship
            shouldAlignWithPath = true;
        } else {
            color = 0x0088cc; // Blue for normal satellites (same as trains)
            shouldAlignWithPath = false; // Random rotation for small satellites
        }
        
        const applySatelliteMaterial = (model) => {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: color,
                        emissive: type === 'ISS' ? 0x004488 : type === 'MarsShip' ? 0x440000 : 0x004488,
                        emissiveIntensity: 0.3,
                        transparent: true,
                        opacity: 0.9,
                        shininess: 30
                    });
                    child.visible = true;
                    if (child.geometry) {
                        child.geometry.computeBoundingBox();
                        child.geometry.computeBoundingSphere();
                    }
                }
            });
        };
        
        // For ISS, use Station.glb; for others, use Satellite.glb
        if (type === 'ISS') {
            // Use Station model for ISS
            const stationModelCache = this.transportModel.getStationModelCache();
            
            if (stationModelCache && gltfLoader) {
                // Use cached Station model
                const stationModel = stationModelCache.clone();
                stationModel.scale.set(0.02, 0.02, 0.02);
                stationModel.visible = true;
                applySatelliteMaterial(stationModel);
                satelliteGroup.add(stationModel);
            } else if (gltfLoader) {
                // Load Station model for first time
                gltfLoader.load('Models3D/Station.glb', (gltf) => {
                    const model = gltf.scene;
                    const cached = model.clone();
                    this.transportModel.setStationModelCache(cached);
                    
                    model.scale.set(0.02, 0.02, 0.02);
                    model.visible = true;
                    applySatelliteMaterial(model);
                    satelliteGroup.add(model);
                }, undefined, (error) => {
                    console.error('Error loading Station.glb:', error);
                    // Fallback to simple box
                    const size = 0.015;
                    const geometry = new THREE.BoxGeometry(size, size, size * 1.5);
                    const material = new THREE.MeshPhongMaterial({
                        color: color,
                        emissive: 0x004488,
                        emissiveIntensity: 0.3,
                        transparent: true,
                        opacity: 0.9
                    });
                    const satelliteMesh = new THREE.Mesh(geometry, material);
                    satelliteGroup.add(satelliteMesh);
                });
            } else {
                // Fallback to simple box if no loader
                const size = 0.015;
                const geometry = new THREE.BoxGeometry(size, size, size * 1.5);
                const material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: 0x004488,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.9
                });
                const satelliteMesh = new THREE.Mesh(geometry, material);
                satelliteGroup.add(satelliteMesh);
            }
        } else {
            // Use Satellite model for non-ISS satellites
            const satelliteModelCache = this.transportModel.getSatelliteModelCache();
            
            if (satelliteModelCache && gltfLoader) {
                // Use cached model
                const satelliteModel = satelliteModelCache.clone();
                satelliteModel.scale.set(0.02, 0.02, 0.02);
                satelliteModel.visible = true;
                applySatelliteMaterial(satelliteModel);
                
                // Random rotation for small satellites (not ISS or Mars Ship)
                if (!shouldAlignWithPath) {
                    satelliteModel.rotation.x = Math.random() * Math.PI * 2;
                    satelliteModel.rotation.y = Math.random() * Math.PI * 2;
                    satelliteModel.rotation.z = Math.random() * Math.PI * 2;
                }
                
                satelliteGroup.add(satelliteModel);
            } else if (gltfLoader) {
                // Load model for first time
                gltfLoader.load('Models3D/Satellite.glb', (gltf) => {
                    const model = gltf.scene;
                    const cached = model.clone();
                    this.transportModel.setSatelliteModelCache(cached);
                    
                    model.scale.set(0.02, 0.02, 0.02);
                    model.visible = true;
                    applySatelliteMaterial(model);
                    
                    // Random rotation for small satellites (not ISS or Mars Ship)
                    if (!shouldAlignWithPath) {
                        model.rotation.x = Math.random() * Math.PI * 2;
                        model.rotation.y = Math.random() * Math.PI * 2;
                        model.rotation.z = Math.random() * Math.PI * 2;
                    }
                    
                    satelliteGroup.add(model);
                }, undefined, (error) => {
                    console.error('Error loading Satellite.glb:', error);
                    // Fallback to simple box
                    const size = type === 'MarsShip' ? 0.010 : 0.006;
                    const geometry = new THREE.BoxGeometry(size, size, size * 1.5);
                    const material = new THREE.MeshPhongMaterial({
                        color: color,
                        emissive: type === 'MarsShip' ? 0x440000 : 0x004488,
                        emissiveIntensity: 0.3,
                        transparent: true,
                        opacity: 0.9
                    });
                    const satelliteMesh = new THREE.Mesh(geometry, material);
                    satelliteGroup.add(satelliteMesh);
                });
            } else {
                // Fallback to simple box if no loader
                const size = type === 'MarsShip' ? 0.010 : 0.006;
                const geometry = new THREE.BoxGeometry(size, size, size * 1.5);
                const material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: type === 'MarsShip' ? 0x440000 : 0x004488,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.9
                });
                const satelliteMesh = new THREE.Mesh(geometry, material);
                satelliteGroup.add(satelliteMesh);
            }
        }
        
        // Validate orbit to ensure it doesn't go through Earth
        // Minimum safe radius considering inclination
        const minSafeRadius = 1.01 + Math.abs(Math.sin(inclination)) * 0.02;
        const safeOrbitRadius = Math.max(orbitRadius, minSafeRadius);
        
        // Create orbit line (purple or green) with rotation angle and inclination
        // Perfect circle in 3D space, tilted by inclination - maintain constant radius
        const orbitPoints = [];
        const segments = 100;
        
        // Normal vector for the orbit plane (tilted by inclination, rotated by rotationAngle)
        const normalX = Math.sin(inclination) * Math.sin(rotationAngle);
        const normalY = Math.sin(inclination) * Math.cos(rotationAngle);
        const normalZ = Math.cos(inclination);
        const normal = new THREE.Vector3(normalX, normalY, normalZ).normalize();
        
        // Create two perpendicular vectors in the orbit plane
        const up = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(normal, up).normalize();
        if (right.length() < 0.1) {
            // If normal is parallel to up, use different reference
            const forward = new THREE.Vector3(1, 0, 0);
            right.crossVectors(normal, forward).normalize();
        }
        const forward = new THREE.Vector3().crossVectors(right, normal).normalize();
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Create perfect circle in the orbit plane
            const point = new THREE.Vector3()
                .addScaledVector(right, safeOrbitRadius * Math.cos(angle))
                .addScaledVector(forward, safeOrbitRadius * Math.sin(angle));
            
            orbitPoints.push(point);
        }
        
        const orbitCurve = new THREE.CatmullRomCurve3(orbitPoints);
        const orbitGeometry = new THREE.TubeGeometry(orbitCurve, segments, 0.001, 8, false);
        const orbitColor = type === 'ISS' ? 0x0088cc : 0x9b59b6; // Blue for ISS, purple for others
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: orbitColor,
            transparent: true,
            opacity: 0.6
        });
        const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitLine.userData.isSatelliteOrbit = true;
        orbitLine.userData.orbitColor = orbitColor; // Track current color
        orbitLine.userData.satelliteName = name; // Store satellite name for filtering
        // Hide orbit line (was visible for alignment, now hidden)
        orbitLine.visible = false;
        globe.add(orbitLine);
        this.transportModel.addSatelliteOrbitLine(orbitLine);
        
        satelliteGroup.userData = {
            type: type,
            name: name,
            orbitRadius: safeOrbitRadius, // Use safe radius
            orbitSpeed: orbitSpeed, // Constant speed per satellite instance
            inclination: inclination,
            rotationAngle: rotationAngle, // Rotation of orbit plane
            angle: startAngle,
            isSatellite: true,
            lastTrailSpawn: 0,
            trailSpawnInterval: Math.floor(Math.random() * 7) + 3, // Random initial interval (3-10 frames)
            orbitLine: orbitLine // Reference to orbit line for color changes
        };
        
        // Set initial position with rotation angle and inclination (perfect circle in 3D)
        // Reuse the same orbit plane vectors (normal, right, forward) calculated above
        const initialPosition = new THREE.Vector3()
            .addScaledVector(right, safeOrbitRadius * Math.cos(startAngle))
            .addScaledVector(forward, safeOrbitRadius * Math.sin(startAngle));
        
        satelliteGroup.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
        
        satelliteGroup.visible = this.sceneModel.getHyperloopVisible();
        globe.add(satelliteGroup);
        this.transportModel.addSatellite(satelliteGroup);
        
        return satelliteGroup;
    }

    /**
     * Update satellites - handle orbital motion with speed variation and rotation angle changes
     */
    updateSatellites() {
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const satellites = this.transportModel.getSatellites();
        
        // Check if any station markers are on the current page
        let hasStationMarkerOnPage = false;
        let isHoveringStationMarker = false;
        
        if (window.globeController && window.globeController.dataModel) {
            const dataModel = window.globeController.dataModel;
            const currentPageEvents = dataModel.getEventsForCurrentPage();
            
            // Check if any current page events are station type
            hasStationMarkerOnPage = currentPageEvents.some(event => {
                const eventLocationType = event.locationType || 'earth';
                if (eventLocationType === 'station') return true;
                // Also check variants
                if (event.variants) {
                    return event.variants.some(variant => (variant.locationType || eventLocationType) === 'station');
                }
                return false;
            });
        }
        
        // Check if hovering over a station marker
        if (window.globeController && window.globeController.interactionController) {
            const hoveredMarker = window.globeController.interactionController.hoveredEventMarker;
            if (hoveredMarker && hoveredMarker.userData && hoveredMarker.userData.locationType === 'station') {
                isHoveringStationMarker = true;
            }
        }
        
        // Calculate speed multiplier: halve if on page, halve again if hovering (total 1/4)
        let speedMultiplier = 1.0;
        if (hasStationMarkerOnPage) {
            speedMultiplier = 0.5; // Halve when station marker is on current page
        }
        if (isHoveringStationMarker) {
            speedMultiplier *= 0.5; // Halve again when hovering (total 1/4)
        }
        
        satellites.forEach(satellite => {
            const data = satellite.userData;
            
            // Apply speed multiplier (only to ISS for station events)
            const effectiveSpeed = data.type === 'ISS' ? data.orbitSpeed * speedMultiplier : data.orbitSpeed;
            
            // Update orbital angle (constant speed per satellite instance)
            data.angle += effectiveSpeed;
            
            // Wrap angle
            if (data.angle > Math.PI * 2) {
                data.angle -= Math.PI * 2;
            }
            
            // Calculate new position with rotation angle and inclination (perfect circle in 3D)
            // Use same orbit plane calculation as orbit line
            const normalX = Math.sin(data.inclination) * Math.sin(data.rotationAngle);
            const normalY = Math.sin(data.inclination) * Math.cos(data.rotationAngle);
            const normalZ = Math.cos(data.inclination);
            const normal = new THREE.Vector3(normalX, normalY, normalZ).normalize();
            
            const up = new THREE.Vector3(0, 0, 1);
            const right = new THREE.Vector3().crossVectors(normal, up).normalize();
            if (right.length() < 0.1) {
                const forward = new THREE.Vector3(1, 0, 0);
                right.crossVectors(normal, forward).normalize();
            }
            const forward = new THREE.Vector3().crossVectors(right, normal).normalize();
            
            const position = new THREE.Vector3()
                .addScaledVector(right, data.orbitRadius * Math.cos(data.angle))
                .addScaledVector(forward, data.orbitRadius * Math.sin(data.angle));
            
            satellite.position.set(position.x, position.y, position.z);
            
            // Only align ISS and Mars Ship with their path (like planes/trains/boats)
            // Small satellites keep their random rotation
            if (data.type === 'ISS' || data.type === 'MarsShip') {
                // Rotate satellite to face direction of travel
                const nextAngle = data.angle + effectiveSpeed;
                
                const nextPosition = new THREE.Vector3()
                    .addScaledVector(right, data.orbitRadius * Math.cos(nextAngle))
                    .addScaledVector(forward, data.orbitRadius * Math.sin(nextAngle));
                
                const direction = new THREE.Vector3().subVectors(nextPosition, position).normalize();
                const up = satellite.position.clone().normalize();
                const rightDir = new THREE.Vector3().crossVectors(direction, up).normalize();
                const correctedUp = new THREE.Vector3().crossVectors(rightDir, direction).normalize();
                
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(rightDir, correctedUp, direction.negate());
                satellite.quaternion.setFromRotationMatrix(rotationMatrix);
            }
            // Small satellites keep their random rotation (no alignment with path)
            
            // Handle trail spawning (small dots offset to sides randomly) - slightly more prominent
            data.lastTrailSpawn++;
            if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                // Random chance to spawn (slightly more common)
                if (Math.random() < 0.25) { // 25% chance when interval is reached (increased from 15%)
                    this.transportView.createSatelliteTrailDot(satellite.position);
                }
                data.lastTrailSpawn = 0;
                // Intervals with random variation (3-10 frames between checks, reduced from 5-15)
                data.trailSpawnInterval = Math.floor(Math.random() * 7) + 3;
            }
            
            satellite.visible = hyperloopVisible;
        });
    }

    /**
     * Initialize satellites
     */
    initializeSatellites() {
        // All satellites use simple circular orbits at the same height (1.22, matching ISS)
        const uniformOrbitRadius = 1.22;
        
        // Create 25 small satellites with varied inclinations (atom-like orbits)
        for (let i = 1; i <= 25; i++) {
            const orbitSpeed = 0.0008 + Math.random() * 0.0015; // Random constant speed
            const startAngle = Math.random() * Math.PI * 2; // Random start position
            const rotationAngle = Math.random() * Math.PI * 2; // Random orbit plane rotation
            const inclination = (Math.random() - 0.5) * Math.PI; // Random inclination (-90 to +90 degrees) for atom-like effect
            
            this.createSatellite({
                type: 'small',
                orbitRadius: uniformOrbitRadius,
                orbitSpeed: orbitSpeed,
                inclination: inclination, // Varied inclinations for atom-like orbits
                startAngle: startAngle,
                rotationAngle: rotationAngle,
                name: `Satellite ${i}`
            });
        }
        
        // ISS (large) - purple color, further out
        const issOrbitRadius = 1.25; // ISS slightly further out
        this.createSatellite({
            type: 'ISS',
            orbitRadius: issOrbitRadius,
            orbitSpeed: 0.0008 + Math.random() * 0.0015, // Random constant speed
            inclination: Math.PI / 6, // 30 degree inclination
            startAngle: Math.random() * Math.PI * 2, // Random start position
            rotationAngle: Math.random() * Math.PI * 2, // Random orbit angle
            name: 'ISS'
        });
        
        // Mars Ship (medium) - red color, furthest out
        // Orbit configured to pass over Veracruz and Gibraltar
        const marsShipOrbitRadius = 1.28; // Mars Ship furthest out
        
        // Mars Ship orbit configured to pass over Veracruz and Gibraltar
        // Current working values set by user
        const marsInclination = Math.PI / 1.5; // User-adjusted value for correct orbit tilt
        
        // Calculate orbit to pass over Veracruz (19.1738°N, -96.1342°W) and Gibraltar (36.1408°N, -5.3536°W)
        const veracruzLat = 19.1738;
        const veracruzLon = -96.1342;
        const gibraltarLat = 36.1408;
        const gibraltarLon = -5.3536;
        
        // Rotation angle to align with the path between Veracruz and Gibraltar
        // Average longitude direction, with tilt on red axis (perpendicular to longitude)
        const avgLon = (veracruzLon + gibraltarLon) / 2;
        // Tilt on red axis - current working value
        const marsRotationAngle = (avgLon * Math.PI / 180) + 0.2; // Tilt on red axis
        
        // Start angle - begin at Veracruz's position along the orbit
        const marsStartAngle = veracruzLon * Math.PI / 180;
        
        this.createSatellite({
            type: 'MarsShip',
            orbitRadius: marsShipOrbitRadius,
            orbitSpeed: 0.0008 + Math.random() * 0.0015, // Random constant speed
            inclination: marsInclination, // 45 degree inclination to cross over Mexico and Gibraltar
            startAngle: marsStartAngle, // Start position
            rotationAngle: marsRotationAngle, // Rotation to align with path
            name: 'Mars Ship'
        });
    }

    /**
     * Find the ISS satellite
     * @returns {Object|null} ISS satellite object or null
     */
    findISS() {
        const satellites = this.transportModel.getSatellites();
        for (let satellite of satellites) {
            if (satellite.userData && satellite.userData.type === 'ISS') {
                return satellite;
            }
        }
        return null;
    }
}
