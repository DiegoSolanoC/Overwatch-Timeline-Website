/**
 * SatelliteManager - Manages satellite creation, updates, and initialization
 */

import { vector3ToLatLon, latLonToMapPlanePosition } from '../utils/GeometryUtils.js';

export class SatelliteManager {
    constructor(sceneModel, transportModel, transportView) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.transportView = transportView;
        this._mapOrbitsEnabled = false; // user-requested default: hidden
    }

    setMapViewEnabled(enabled) {
        const globe = this.sceneModel.getGlobe();
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const satellites = this.transportModel.getSatellites();
        const isMapView = !!enabled;

        satellites.forEach(satellite => {
            if (!satellite?.userData?.isSatellite) return;
            const data = satellite.userData;

            // Toggle globe orbit tube visibility; map uses polylines instead.
            const orbitTube = satellite.userData.orbitLine;
            if (orbitTube) orbitTube.visible = !isMapView ? false : false; // keep hidden always (we render markers instead)

            // Remove any existing map orbit lines so they rebuild cleanly
            if (satellite.userData.mapOrbitLines) {
                satellite.userData.mapOrbitLines.forEach(line => {
                    if (line?.parent) line.parent.remove(line);
                });
                satellite.userData.mapOrbitLines = [];
            }

            // Reparent satellite to correct surface (keep world transform)
            const targetParent = isMapView ? earthMapPlane : globe;
            if (targetParent && typeof targetParent.attach === 'function' && satellite.parent !== targetParent) {
                targetParent.attach(satellite);
            }

            // Map view sizing: satellites/station/mars ship should be 3x smaller
            // We do this at the group level so it applies to GLTF + fallback meshes uniformly.
            satellite.scale.setScalar(isMapView ? (1 / 3) : 1);

            // Map view: show only ~half of small satellites to reduce clutter
            if (data.type === 'small') {
                // Deterministic: hide odd-numbered "Satellite N"
                const match = (data.name || '').match(/Satellite\s+(\d+)/i);
                const n = match ? parseInt(match[1], 10) : null;
                data.hideInMap = isMapView ? (n != null ? (n % 2 === 1) : (Math.random() < 0.5)) : false;
            } else {
                data.hideInMap = false; // Keep ISS and Mars Ship visible
            }
            satellite.visible = this.sceneModel.getHyperloopVisible() && !(isMapView && data.hideInMap);
        });

        // Build polylines for orbit paths on the map plane (currently disabled by user request: hide orbit lines)
        if (isMapView && this._mapOrbitsEnabled) {
            this.buildMapOrbitLines();
        } else {
            // Ensure any existing map orbit lines are hidden/removed
            if (earthMapPlane) {
                const toRemove = [];
                earthMapPlane.traverse(obj => {
                    if (obj?.userData?.isSatelliteOrbitMapLine) toRemove.push(obj);
                });
                toRemove.forEach(o => { if (o.parent) o.parent.remove(o); });
            }
        }
    }

    buildMapOrbitLines() {
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        if (!earthMapPlane) return;

        const planeWidth = 2.0;
        const halfW = planeWidth / 2;
        const wrapX = (x) => ((x + halfW) % planeWidth + planeWidth) % planeWidth - halfW;
        const mapZ = 0.06;

        const satellites = this.transportModel.getSatellites();
        satellites.forEach(satellite => {
            const data = satellite?.userData;
            if (!data?.isSatellite) return;

            // Sample the *3D* orbit circle, project to lat/lon, then to map X/Y.
            const segments = 240;

            const normalX = Math.sin(data.inclination) * Math.sin(data.rotationAngle);
            const normalY = Math.sin(data.inclination) * Math.cos(data.rotationAngle);
            const normalZ = Math.cos(data.inclination);
            const normal = new THREE.Vector3(normalX, normalY, normalZ).normalize();

            const up = new THREE.Vector3(0, 0, 1);
            const right = new THREE.Vector3().crossVectors(normal, up).normalize();
            if (right.length() < 0.1) {
                const forwardRef = new THREE.Vector3(1, 0, 0);
                right.crossVectors(normal, forwardRef).normalize();
            }
            const forward = new THREE.Vector3().crossVectors(right, normal).normalize();

            const pts = [];
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const p3 = new THREE.Vector3()
                    .addScaledVector(right, data.orbitRadius * Math.cos(angle))
                    .addScaledVector(forward, data.orbitRadius * Math.sin(angle));
                const { lat, lon } = vector3ToLatLon(p3);
                const p2 = latLonToMapPlanePosition(lat, lon, planeWidth, 1.0, mapZ);
                pts.push(p2);
            }

            // Convert into seam-wrapped polyline segments
            const segments2d = [];
            let current = [];
            let prevUnwrappedX = null;
            let prev = null;

            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                const x = p.x;
                const y = p.y;

                let unwrappedX = x;
                if (prevUnwrappedX != null) {
                    const candidates = [x - planeWidth, x, x + planeWidth];
                    unwrappedX = candidates.reduce((best, c) => {
                        return Math.abs(c - prevUnwrappedX) < Math.abs(best - prevUnwrappedX) ? c : best;
                    }, candidates[1]);
                }

                if (prevUnwrappedX != null) {
                    const crossesRight = prevUnwrappedX <= halfW && unwrappedX > halfW;
                    const crossesLeft = prevUnwrappedX >= -halfW && unwrappedX < -halfW;
                    if (crossesRight || crossesLeft) {
                        const boundaryX = crossesRight ? halfW : -halfW;
                        const t = (boundaryX - prevUnwrappedX) / (unwrappedX - prevUnwrappedX);
                        const yAt = prev.y + (y - prev.y) * t;

                        // close current segment at boundary
                        current.push(new THREE.Vector3(boundaryX, yAt, mapZ));
                        if (current.length >= 2) segments2d.push(current);

                        // start new segment on opposite side
                        current = [new THREE.Vector3(-boundaryX, yAt, mapZ)];

                        // shift unwrappedX to new side for continuity
                        unwrappedX = crossesRight ? (unwrappedX - planeWidth) : (unwrappedX + planeWidth);
                    }
                }

                current.push(new THREE.Vector3(wrapX(unwrappedX), y, mapZ));
                prevUnwrappedX = unwrappedX;
                prev = { x: unwrappedX, y };
            }

            if (current.length >= 2) segments2d.push(current);

            // Render lines
            const color = data.type === 'MarsShip' ? 0xff0000 : (data.type === 'ISS' ? 0x0088cc : 0x9b59b6);
            const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });

            const mapLines = [];
            segments2d.forEach(segPts => {
                const geom = new THREE.BufferGeometry().setFromPoints(segPts);
                const line = new THREE.Line(geom, material);
                line.userData.isSatelliteOrbitMapLine = true;
                line.userData.satelliteName = data.name;
                line.visible = false; // user requested orbit lines hidden
                earthMapPlane.add(line);
                mapLines.push(line);
            });

            satellite.userData.mapOrbitLines = mapLines;
        });
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
        if (globe) globe.add(orbitLine);
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
        if (globe) globe.add(satelliteGroup);
        this.transportModel.addSatellite(satelliteGroup);
        
        return satelliteGroup;
    }

    /**
     * Update satellites - handle orbital motion with speed variation and rotation angle changes
     */
    updateSatellites() {
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const satellites = this.transportModel.getSatellites();
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
        const globe = this.sceneModel.getGlobe();
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const planeWidth = 2.0;
        const halfW = planeWidth / 2;
        const wrapX = (x) => ((x + halfW) % planeWidth + planeWidth) % planeWidth - halfW;
        const mapZBase = 0.06;

        // In case map view was enabled before satellites were created/loaded, enforce sizing here too.
        if (isMapView) {
            satellites.forEach(s => {
                if (s?.userData?.isSatellite) s.scale.setScalar(1 / 3);
            });
        }
        
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
            if (isMapView && data?.hideInMap) {
                satellite.visible = false;
                return;
            }
            
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
            
            const position3d = new THREE.Vector3()
                .addScaledVector(right, data.orbitRadius * Math.cos(data.angle))
                .addScaledVector(forward, data.orbitRadius * Math.sin(data.angle));

            // In map view, project orbit position onto the flat map and seam-wrap.
            // In globe view, keep true 3D orbit.
            if (isMapView && earthMapPlane) {
                if (satellite.parent !== earthMapPlane && earthMapPlane.attach) earthMapPlane.attach(satellite);

                const { lat, lon } = vector3ToLatLon(position3d);
                const mapZ = mapZBase + (data.orbitRadius - 1.0) * 0.25; // subtle separation by orbit radius
                const mapPos = latLonToMapPlanePosition(lat, lon, planeWidth, 1.0, mapZ);
                mapPos.x = wrapX(mapPos.x);
                satellite.position.set(mapPos.x, mapPos.y, mapPos.z);
            } else {
                if (globe && satellite.parent !== globe && globe.attach) globe.attach(satellite);
                satellite.position.set(position3d.x, position3d.y, position3d.z);
            }
            
            // Only align ISS and Mars Ship with their path (like planes/trains/boats)
            // Small satellites keep their random rotation
            if (data.type === 'ISS' || data.type === 'MarsShip') {
                // Rotate satellite to face direction of travel
                const nextAngle = data.angle + effectiveSpeed;
                
                const nextPosition3d = new THREE.Vector3()
                    .addScaledVector(right, data.orbitRadius * Math.cos(nextAngle))
                    .addScaledVector(forward, data.orbitRadius * Math.sin(nextAngle));

                if (isMapView) {
                    const { lat: lat2, lon: lon2 } = vector3ToLatLon(nextPosition3d);
                    const mapZ = satellite.position.z;
                    const mapNext = latLonToMapPlanePosition(lat2, lon2, planeWidth, 1.0, mapZ);
                    mapNext.x = wrapX(mapNext.x);
                    const dir = new THREE.Vector3().subVectors(mapNext, satellite.position).normalize();

                    const up2 = new THREE.Vector3(0, 0, 1);
                    const rightDir = new THREE.Vector3().crossVectors(dir, up2).normalize();
                    const correctedUp = new THREE.Vector3().crossVectors(rightDir, dir).normalize();
                    const rotationMatrix = new THREE.Matrix4();
                    rotationMatrix.makeBasis(rightDir, correctedUp, dir.negate());
                    satellite.quaternion.setFromRotationMatrix(rotationMatrix);
                } else {
                    const direction = new THREE.Vector3().subVectors(nextPosition3d, position3d).normalize();
                    const up3 = satellite.position.clone().normalize();
                    const rightDir = new THREE.Vector3().crossVectors(direction, up3).normalize();
                    const correctedUp = new THREE.Vector3().crossVectors(rightDir, direction).normalize();
                    
                    const rotationMatrix = new THREE.Matrix4();
                    rotationMatrix.makeBasis(rightDir, correctedUp, direction.negate());
                    satellite.quaternion.setFromRotationMatrix(rotationMatrix);
                }
            }
            // Small satellites keep their random rotation (no alignment with path)
            
            // Handle trail spawning (small dots offset to sides randomly)
            data.lastTrailSpawn++;
            if (data.lastTrailSpawn >= data.trailSpawnInterval) {
                // Random chance to spawn (slightly more common)
                const chance = isMapView ? 0.125 : 0.25; // Map view: half as many dots
                if (Math.random() < chance) {
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
