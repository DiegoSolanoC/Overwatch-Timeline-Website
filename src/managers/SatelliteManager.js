/**
 * SatelliteManager - Manages satellite creation, updates, and initialization
 */

export class SatelliteManager {
    constructor(sceneModel, transportModel, transportView) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.transportView = transportView;
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
                gltfLoader.load('assets/models/Station.glb', (gltf) => {
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
            gltfLoader.load('assets/models/Satellite.glb', (gltf) => {
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
