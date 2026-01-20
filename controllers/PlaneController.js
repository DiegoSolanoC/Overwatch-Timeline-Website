/**
 * PlaneController - Handles plane creation, updating, and spawning
 * Extracted from TransportController for better separation of concerns
 */
import { latLonToVector3, createArcBetweenPoints } from '../utils/GeometryUtils.js';
import { TransportConfig } from './config/TransportConfig.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import { ErrorLogger } from '../utils/ErrorLogger.js';

export class PlaneController {
    constructor(sceneModel, transportModel, transportView, dataModel) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.transportView = transportView;
        this.dataModel = dataModel;
        this.planeSpawnInterval = null;
    }

    /**
     * Calculate flight path with takeoff, cruise, and landing phases
     */
    calculateFlightPath(fromCity, toCity) {
        const config = TransportConfig.PLANE;
        const groundStart = latLonToVector3(fromCity.lat, fromCity.lon, config.ALTITUDE.GROUND_LEVEL);
        const groundEnd = latLonToVector3(toCity.lat, toCity.lon, config.ALTITUDE.GROUND_LEVEL);
        const distance = groundStart.distanceTo(groundEnd);
        
        // Calculate cruise altitude based on distance
        const normalizedDistance = Math.min(distance / config.ALTITUDE.DISTANCE_NORMALIZER, 1.0);
        const cruiseAltitude = config.ALTITUDE.MIN + 
            (config.ALTITUDE.MAX - config.ALTITUDE.MIN) * normalizedDistance;
        
        // Calculate flight phases
        const takeoffPhase = config.PHASES.TAKEOFF_BASE - 
            (normalizedDistance * config.PHASES.TAKEOFF_DISTANCE_FACTOR);
        const landingPhase = config.PHASES.LANDING_BASE - 
            (normalizedDistance * config.PHASES.LANDING_DISTANCE_FACTOR);
        const cruiseStart = takeoffPhase;
        const cruiseEnd = 1.0 - landingPhase;
        
        // Generate flight path points
        const flightPoints = [];
        const totalSegments = config.FLIGHT_SEGMENTS;
        
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const basePoint = createArcBetweenPoints(
                fromCity.lat, fromCity.lon,
                toCity.lat, toCity.lon,
                config.ALTITUDE.GROUND_LEVEL, totalSegments, true
            )[i];
            
            let altitude;
            if (t < cruiseStart) {
                // Takeoff phase
                const takeoffProgress = t / cruiseStart;
                const easeOut = Math.sin(takeoffProgress * Math.PI / 2);
                altitude = config.ALTITUDE.GROUND_LEVEL + 
                    (cruiseAltitude - config.ALTITUDE.GROUND_LEVEL) * easeOut;
            } else if (t > cruiseEnd) {
                // Landing phase
                const landingProgress = (t - cruiseEnd) / (1.0 - cruiseEnd);
                const easeIn = landingProgress * landingProgress;
                altitude = cruiseAltitude - 
                    (cruiseAltitude - config.ALTITUDE.GROUND_LEVEL) * easeIn;
            } else {
                // Cruise phase
                altitude = cruiseAltitude;
            }
            
            const normalizedPos = basePoint.clone().normalize();
            flightPoints.push(normalizedPos.multiplyScalar(altitude));
        }
        
        return {
            curve: new THREE.CatmullRomCurve3(flightPoints),
            speed: distance > config.SPEED.DISTANCE_THRESHOLD ? 
                config.SPEED.LONG_DISTANCE : config.SPEED.SHORT_DISTANCE,
            distance: distance
        };
    }

    /**
     * Create a plane (using ModelLoader utility)
     */
    createPlane(fromCity, toCity) {
        const globe = this.sceneModel.getGlobe();
        const flightData = this.calculateFlightPath(fromCity, toCity);
        const planeGroup = new THREE.Group();
        
        // Load model using ModelLoader
        ModelLoader.getOrLoadModel({
            gltfLoader: this.sceneModel.getGLTFLoader(),
            cache: this.transportModel.getPlaneModelCache(),
            cacheCallback: (cached) => this.transportModel.setPlaneModelCache(cached),
            vehicleType: 'plane',
            fallbackGeometry: { width: 0.03, height: 0.01, depth: 0.08 },
            modelPath: 'Models3D/Plane.glb'
        }, (model) => {
            planeGroup.add(model);
        });
        
        planeGroup.userData = {
            curve: flightData.curve,
            progress: 0,
            speed: flightData.speed,
            from: fromCity.name,
            to: toCity.name,
            isPlane: true,
            lastTrailSpawn: 0,
            trailSpawnInterval: TransportConfig.PLANE.TRAIL_SPAWN_INTERVAL,
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
     */
    createMultiStopPlane(airports) {
        if (airports.length < 2) return null;
        
        // Create route segments for each airport pair
        const routes = [];
        for (let i = 0; i < airports.length - 1; i++) {
            const fromCity = airports[i];
            const toCity = airports[i + 1];
            const flightData = this.calculateFlightPath(fromCity, toCity);
            
            routes.push({
                from: fromCity.name,
                to: toCity.name,
                fromCity: fromCity,
                toCity: toCity,
                curve: flightData.curve,
                speed: flightData.speed
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
     * Handle plane banking (tilting during flight)
     */
    updatePlaneBanking(plane, tangent) {
        const data = plane.userData;
        const config = TransportConfig.PLANE.BANKING;
        
        data.bankChangeTimer += 1;
        if (data.bankChangeTimer > config.CHANGE_TIMER) {
            data.targetBankAngle = (Math.random() - 0.5) * config.MAX_ANGLE;
            data.bankChangeTimer = 0;
        }
        
        data.bankAngle += (data.targetBankAngle - data.bankAngle) * config.INTERPOLATION_SPEED;
        
        // Apply bank rotation
        const bankQuaternion = new THREE.Quaternion();
        bankQuaternion.setFromAxisAngle(tangent, data.bankAngle);
        plane.quaternion.multiply(bankQuaternion);
    }

    /**
     * Update plane trail spawning
     */
    updatePlaneTrail(plane, position, tangent) {
        const data = plane.userData;
        
        data.lastTrailSpawn += 1;
        if (data.lastTrailSpawn >= data.trailSpawnInterval) {
            const forwardDirection = tangent.clone().negate();
            this.transportView.createTrailSegment(position, forwardDirection);
            data.lastTrailSpawn = 0;
            
            // Randomly vary trail spawn interval
            if (Math.random() < 0.1) {
                data.trailSpawnInterval = Math.random() * 10 + 5;
            } else {
                data.trailSpawnInterval = TransportConfig.PLANE.TRAIL_SPAWN_INTERVAL;
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
        const config = TransportConfig.PLANE;
        
        for (let i = planes.length - 1; i >= 0; i--) {
            const plane = planes[i];
            const data = plane.userData;
            
            // Handle multi-stop planes
            if (data.isMultiStop && data.progress >= 1.0 && !data.isTransitioning) {
                if (data.currentRouteIndex < data.routes.length - 1) {
                    // Move to next route
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
                    // Last stop - remove plane
                    globe.remove(plane);
                    this.transportModel.removePlane(plane);
                    continue;
                }
            }
            
            // Handle landed planes
            if (data.hasLanded) {
                data.landingTimer += 1;
                if (data.landingTimer > config.LANDING_TIMER_MAX) {
                    globe.remove(plane);
                    this.transportModel.removePlane(plane);
                    continue;
                }
                continue;
            }
            
            // Update progress
            data.progress += data.speed;
            
            // Check if landed (non-multi-stop)
            if (data.progress >= 1.0 && !data.isMultiStop) {
                data.progress = 1.0;
                data.hasLanded = true;
                data.landingTimer = 0;
                continue;
            }
            
            // Clear transitioning flag
            if (data.isMultiStop && data.progress > 0.1 && data.progress < 0.9 && data.isTransitioning) {
                data.isTransitioning = false;
            }
            
            // Update plane position and rotation
            if (data.progress > 0 && data.progress <= 1) {
                const position = data.curve.getPointAt(data.progress);
                plane.position.copy(position);
                
                // Update trail
                const tangent = data.curve.getTangentAt(data.progress).normalize();
                this.updatePlaneTrail(plane, position, tangent);
                
                // Update rotation
                const up = position.clone().normalize();
                const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
                const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
                
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(right, correctedUp, tangent.negate());
                plane.quaternion.setFromRotationMatrix(rotationMatrix);
                
                // Apply banking
                this.updatePlaneBanking(plane, tangent);
                
                plane.visible = hyperloopVisible;
            }
        }
    }

    /**
     * Spawn planes randomly
     */
    spawnPlanesRandomly() {
        const airports = this.dataModel ? this.dataModel.getAllAirports() : [];
        console.log(`📊 Total airports: ${airports.length}`);
        
        const config = TransportConfig.PLANE;
        
        this.planeSpawnInterval = setInterval(() => {
            const isPageVisible = this.sceneModel.getPageVisible();
            const hyperloopVisible = this.sceneModel.getHyperloopVisible();
            
            if (!isPageVisible || !hyperloopVisible) return;
            
            const planes = this.transportModel.getPlanes();
            if (planes.length >= config.MAX_COUNT) return;
            
            if (airports.length < 2) return;
            
            const isMultiStop = Math.random() < config.MULTI_STOP_CHANCE;
            
            if (isMultiStop && airports.length >= 3) {
                // Create multi-stop plane
                const numStops = Math.floor(Math.random() * (config.MAX_STOPS - config.MIN_STOPS + 1)) + config.MIN_STOPS;
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
            } else {
                // Create single-route plane
                const from = airports[Math.floor(Math.random() * airports.length)];
                let to = airports[Math.floor(Math.random() * airports.length)];
                
                while (to === from) {
                    to = airports[Math.floor(Math.random() * airports.length)];
                }
                
                const fromPos = latLonToVector3(from.lat, from.lon, 1.0);
                const toPos = latLonToVector3(to.lat, to.lon, 1.0);
                const distance = fromPos.distanceTo(toPos);
                
                if (distance >= config.MIN_DISTANCE) {
                    this.createPlane(from, to);
                }
            }
        }, config.SPAWN_INTERVAL);
    }

    /**
     * Stop spawning planes
     */
    stopSpawning() {
        if (this.planeSpawnInterval) {
            clearInterval(this.planeSpawnInterval);
            this.planeSpawnInterval = null;
        }
    }
}
