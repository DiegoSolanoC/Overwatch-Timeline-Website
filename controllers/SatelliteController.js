/**
 * SatelliteController - Handles satellite creation, updating, and initialization
 * Extracted from TransportController for better separation of concerns
 */
import { TransportConfig } from './config/TransportConfig.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import { MaterialFactory } from '../utils/MaterialFactory.js';
import { EventBus, AppEvents } from '../utils/EventBus.js';

export class SatelliteController {
    constructor(sceneModel, transportModel, transportView) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.transportView = transportView;
    }

    /**
     * Create satellite model (ISS uses Station.glb, others use Satellite.glb)
     * Uses ModelLoader utility
     */
    createSatelliteModel(satelliteGroup, type, shouldAlignWithPath) {
        if (type === 'ISS') {
            // Use Station model for ISS
            ModelLoader.getOrLoadModel({
                gltfLoader: this.sceneModel.getGLTFLoader(),
                cache: this.transportModel.getStationModelCache(),
                cacheCallback: (cached) => this.transportModel.setStationModelCache(cached),
                vehicleType: 'iss',
                fallbackGeometry: { width: 0.015, height: 0.015, depth: 0.0225 },
                modelPath: 'Models3D/Station.glb'
            }, (model) => {
                satelliteGroup.add(model);
            });
        } else {
            // Use Satellite model for non-ISS satellites
            ModelLoader.getOrLoadModel({
                gltfLoader: this.sceneModel.getGLTFLoader(),
                cache: this.transportModel.getSatelliteModelCache(),
                cacheCallback: (cached) => this.transportModel.setSatelliteModelCache(cached),
                vehicleType: type === 'MarsShip' ? 'mars_ship' : 'satellite',
                fallbackGeometry: { 
                    width: type === 'MarsShip' ? 0.010 : 0.006,
                    height: type === 'MarsShip' ? 0.010 : 0.006,
                    depth: type === 'MarsShip' ? 0.015 : 0.009
                },
                modelPath: 'Models3D/Satellite.glb'
            }, (model) => {
                // Apply random rotation for small satellites
                if (!shouldAlignWithPath) {
                    model.rotation.x = Math.random() * Math.PI * 2;
                    model.rotation.y = Math.random() * Math.PI * 2;
                    model.rotation.z = Math.random() * Math.PI * 2;
                }
                satelliteGroup.add(model);
            });
        }
    }

    /**
     * Calculate orbit plane vectors (normal, right, forward)
     */
    calculateOrbitPlane(inclination, rotationAngle) {
        // Normal vector for the orbit plane
        const normalX = Math.sin(inclination) * Math.sin(rotationAngle);
        const normalY = Math.sin(inclination) * Math.cos(rotationAngle);
        const normalZ = Math.cos(inclination);
        const normal = new THREE.Vector3(normalX, normalY, normalZ).normalize();
        
        // Create two perpendicular vectors in the orbit plane
        const up = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(normal, up).normalize();
        if (right.length() < 0.1) {
            const forward = new THREE.Vector3(1, 0, 0);
            right.crossVectors(normal, forward).normalize();
        }
        const forward = new THREE.Vector3().crossVectors(right, normal).normalize();
        
        return { normal, right, forward };
    }

    /**
     * Create orbit line visualization (using MaterialFactory)
     */
    createOrbitLine(orbitRadius, inclination, rotationAngle, type, name) {
        const globe = this.sceneModel.getGlobe();
        const config = TransportConfig.SATELLITE.ORBIT_LINE;
        
        const orbitPoints = [];
        const { right, forward } = this.calculateOrbitPlane(inclination, rotationAngle);
        
        for (let i = 0; i <= config.SEGMENTS; i++) {
            const angle = (i / config.SEGMENTS) * Math.PI * 2;
            const point = new THREE.Vector3()
                .addScaledVector(right, orbitRadius * Math.cos(angle))
                .addScaledVector(forward, orbitRadius * Math.sin(angle));
            
            orbitPoints.push(point);
        }
        
        const orbitCurve = new THREE.CatmullRomCurve3(orbitPoints);
        const orbitGeometry = new THREE.TubeGeometry(orbitCurve, config.SEGMENTS, config.TUBE_RADIUS, 8, false);
        const orbitMaterial = MaterialFactory.createOrbitLineMaterial(type);
        const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial);
        
        const orbitColor = type === 'ISS' ? config.ISS_COLOR : config.DEFAULT_COLOR;
        orbitLine.userData.isSatelliteOrbit = true;
        orbitLine.userData.orbitColor = orbitColor;
        orbitLine.userData.satelliteName = name;
        orbitLine.visible = false; // Hidden by default
        globe.add(orbitLine);
        this.transportModel.addSatelliteOrbitLine(orbitLine);
        
        return orbitLine;
    }

    /**
     * Create a satellite
     */
    createSatellite(config) {
        const globe = this.sceneModel.getGlobe();
        const satelliteConfig = TransportConfig.SATELLITE;
        
        const {
            type = 'small',
            orbitRadius = satelliteConfig.ORBIT.UNIFORM_RADIUS,
            orbitSpeed = satelliteConfig.SPEED.BASE,
            inclination = 0,
            startAngle = 0,
            rotationAngle = 0,
            name = 'Satellite'
        } = config;
        
        // Validate orbit radius to ensure it doesn't go through Earth
        const minSafeRadius = satelliteConfig.ORBIT.MIN_SAFE_RADIUS + 
            Math.abs(Math.sin(inclination)) * satelliteConfig.ORBIT.INCLINATION_BUFFER;
        const safeOrbitRadius = Math.max(orbitRadius, minSafeRadius);
        
        // Create satellite group
        const satelliteGroup = new THREE.Group();
        
        // Determine if satellite should align with path
        const shouldAlignWithPath = (type === 'ISS' || type === 'MarsShip');
        
        // Create satellite model
        this.createSatelliteModel(satelliteGroup, type, shouldAlignWithPath);
        
        // Create orbit line
        const orbitLine = this.createOrbitLine(safeOrbitRadius, inclination, rotationAngle, type, name);
        
        // Set satellite user data
        satelliteGroup.userData = {
            type: type,
            name: name,
            orbitRadius: safeOrbitRadius,
            orbitSpeed: orbitSpeed,
            inclination: inclination,
            rotationAngle: rotationAngle,
            angle: startAngle,
            isSatellite: true,
            lastTrailSpawn: 0,
            trailSpawnInterval: Math.floor(Math.random() * (satelliteConfig.TRAIL.INTERVAL_MAX - satelliteConfig.TRAIL.INTERVAL_MIN + 1)) + satelliteConfig.TRAIL.INTERVAL_MIN,
            orbitLine: orbitLine
        };
        
        // Set initial position
        const { right, forward } = this.calculateOrbitPlane(inclination, rotationAngle);
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
     * Check if any station markers are on current page
     */
    checkStationMarkersOnPage() {
        if (!window.globeController || !window.globeController.dataModel) {
            return false;
        }
        
        const dataModel = window.globeController.dataModel;
        const currentPageEvents = dataModel.getEventsForCurrentPage();
        
        return currentPageEvents.some(event => {
            const eventLocationType = event.locationType || 'earth';
            if (eventLocationType === 'station') return true;
            // Also check variants
            if (event.variants) {
                return event.variants.some(variant => 
                    (variant.locationType || eventLocationType) === 'station'
                );
            }
            return false;
        });
    }

    /**
     * Check if hovering over station marker
     */
    checkHoveringStationMarker() {
        if (!window.globeController || !window.globeController.interactionController) {
            return false;
        }
        
        const hoveredMarker = window.globeController.interactionController.hoveredEventMarker;
        return hoveredMarker && hoveredMarker.userData && hoveredMarker.userData.locationType === 'station';
    }

    /**
     * Update satellites - handle orbital motion with speed variation
     */
    updateSatellites() {
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const satellites = this.transportModel.getSatellites();
        const config = TransportConfig.SATELLITE;
        
        // Check if any station markers are on the current page or being hovered
        const hasStationMarkerOnPage = this.checkStationMarkersOnPage();
        const isHoveringStationMarker = this.checkHoveringStationMarker();
        
        // Calculate speed multiplier for ISS
        let speedMultiplier = 1.0;
        if (hasStationMarkerOnPage) {
            speedMultiplier = config.SPEED_MULTIPLIER.STATION_ON_PAGE;
        }
        if (isHoveringStationMarker) {
            speedMultiplier *= config.SPEED_MULTIPLIER.HOVERING_MARKER;
        }
        
        satellites.forEach(satellite => {
            const data = satellite.userData;
            
            // Apply speed multiplier (only to ISS for station events)
            const effectiveSpeed = data.type === 'ISS' ? 
                data.orbitSpeed * speedMultiplier : 
                data.orbitSpeed;
            
            // Update orbital angle
            data.angle += effectiveSpeed;
            
            // Wrap angle
            if (data.angle > Math.PI * 2) {
                data.angle -= Math.PI * 2;
            }
            
            // Calculate new position
            const { right, forward } = this.calculateOrbitPlane(data.inclination, data.rotationAngle);
            const position = new THREE.Vector3()
                .addScaledVector(right, data.orbitRadius * Math.cos(data.angle))
                .addScaledVector(forward, data.orbitRadius * Math.sin(data.angle));
            
            satellite.position.set(position.x, position.y, position.z);
            
            // Only align ISS and Mars Ship with their path
            if (data.type === 'ISS' || data.type === 'MarsShip') {
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
            
            // Handle trail spawning
            data.lastTrailSpawn++;
            if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                if (Math.random() < config.TRAIL.SPAWN_CHANCE) {
                    this.transportView.createSatelliteTrailDot(satellite.position);
                }
                data.lastTrailSpawn = 0;
                data.trailSpawnInterval = Math.floor(Math.random() * (config.TRAIL.INTERVAL_MAX - config.TRAIL.INTERVAL_MIN + 1)) + config.TRAIL.INTERVAL_MIN;
            }
            
            satellite.visible = hyperloopVisible;
        });
    }

    /**
     * Initialize all satellites (25 small + ISS + Mars Ship)
     */
    initializeSatellites() {
        const config = TransportConfig.SATELLITE;
        
        // Create 25 small satellites with varied inclinations
        for (let i = 1; i <= config.SMALL_COUNT; i++) {
            const orbitSpeed = config.SPEED.BASE + Math.random() * config.SPEED.RANDOM_VARIANCE;
            const startAngle = Math.random() * Math.PI * 2;
            const rotationAngle = Math.random() * Math.PI * 2;
            const inclination = (Math.random() - 0.5) * Math.PI; // -90 to +90 degrees
            
            this.createSatellite({
                type: 'small',
                orbitRadius: config.ORBIT.UNIFORM_RADIUS,
                orbitSpeed: orbitSpeed,
                inclination: inclination,
                startAngle: startAngle,
                rotationAngle: rotationAngle,
                name: `Satellite ${i}`
            });
        }
        
        // Create ISS
        this.createSatellite({
            type: 'ISS',
            orbitRadius: config.ORBIT.ISS_RADIUS,
            orbitSpeed: config.SPEED.BASE + Math.random() * config.SPEED.RANDOM_VARIANCE,
            inclination: config.INCLINATION.ISS,
            startAngle: Math.random() * Math.PI * 2,
            rotationAngle: Math.random() * Math.PI * 2,
            name: 'ISS'
        });
        
        // Create Mars Ship with specific orbit configuration
        const marsConfig = config.MARS_SHIP_LOCATIONS;
        const avgLon = (marsConfig.VERACRUZ.lon + marsConfig.GIBRALTAR.lon) / 2;
        const marsRotationAngle = (avgLon * Math.PI / 180) + config.INCLINATION.MARS_ROTATION_OFFSET;
        const marsStartAngle = marsConfig.VERACRUZ.lon * Math.PI / 180;
        
        this.createSatellite({
            type: 'MarsShip',
            orbitRadius: config.ORBIT.MARS_SHIP_RADIUS,
            orbitSpeed: config.SPEED.BASE + Math.random() * config.SPEED.RANDOM_VARIANCE,
            inclination: config.INCLINATION.MARS_SHIP,
            startAngle: marsStartAngle,
            rotationAngle: marsRotationAngle,
            name: 'Mars Ship'
        });
        
        // Emit event when transport systems are initialized
        EventBus.emit(AppEvents.TRANSPORT_READY);
    }

    /**
     * Find the ISS satellite
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
