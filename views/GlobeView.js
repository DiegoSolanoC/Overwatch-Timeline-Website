/**
 * GlobeView - Handles globe rendering, markers, and connection lines
 */
import { latLonToVector3, createArcBetweenPoints } from '../utils/GeometryUtils.js';

// THREE is loaded globally via script tag in index.html

export class GlobeView {
    constructor(sceneModel, dataModel) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
    }

    /**
     * Initialize globe with texture
     * @param {Function} onTextureLoaded - Callback when texture loads
     */
    initGlobe(onTextureLoaded) {
        const scene = this.sceneModel.getScene();
        const renderer = this.sceneModel.getRenderer();

        // Create Earth sphere
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Load Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        const earthTexture = textureLoader.load(
            'MAP.png',
            (texture) => {
                console.log('Earth texture loaded successfully');
                
                // Improve texture quality and reduce pole blur
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                
                const globe = this.sceneModel.getGlobe();
                if (globe) {
                    globe.material.needsUpdate = true;
                }
                
                if (onTextureLoaded) {
                    onTextureLoaded();
                }
            },
            undefined,
            (err) => {
                console.error('Error loading Earth texture:', err);
                const globe = this.sceneModel.getGlobe();
                if (globe) {
                    globe.material.color.setHex(0x4a90e2);
                }
            }
        );
        
        const material = new THREE.MeshBasicMaterial({
            map: earthTexture
        });
        
        const globe = new THREE.Mesh(geometry, material);
        this.sceneModel.setGlobe(globe);
        scene.add(globe);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);
    }

    /**
     * Add twinkling starfield background
     */
    addStarfield() {
        const scene = this.sceneModel.getScene();
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        const colors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            const radius = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            sizes[i] = Math.random() * 2.5 + 0.5;
            
            const brightness = 0.8 + Math.random() * 0.2;
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = 0.95 + Math.random() * 0.05;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.sceneModel.setStars(stars);
        scene.add(stars);
    }

    /**
     * Add city markers
     */
    addCityMarkers() {
        const globe = this.sceneModel.getGlobe();
        const cities = this.dataModel.getAllCities();
        const markers = this.sceneModel.getMarkers();

        cities.forEach(city => {
            const position = latLonToVector3(city.lat, city.lon, 1.02);
            
            const markerGeometry = new THREE.SphereGeometry(0.004, 16, 16); // Much smaller
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700 // Golden color matching main routes
            });
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(position);
            marker.userData = { 
                city: city.name,
                lat: city.lat,
                lon: city.lon,
                isMarker: true
            };
            
            globe.add(marker);
            markers.push(marker);

            // Add pin line
            const linePoints = [
                latLonToVector3(city.lat, city.lon, 1.0),
                position
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffd700 }); // Golden color
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData.isMarkerPin = true;
            globe.add(line);
        });
    }

    /**
     * Add event markers (orange, bigger than hyperloop markers)
     */
    addEventMarkers() {
        const globe = this.sceneModel.getGlobe();
        const events = this.dataModel.getAllEvents();

        events.forEach(event => {
            const position = latLonToVector3(event.lat, event.lon, 1.02);
            
            // Event markers are orange and bigger than hyperloop markers (0.015 vs 0.010 for seaports)
            const markerGeometry = new THREE.SphereGeometry(0.015, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6600 // Orange color
            });
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(position);
            marker.userData = { 
                event: event, // Store full event object
                eventName: event.name,
                lat: event.lat,
                lon: event.lon,
                isEventMarker: true,
                pulseRings: [] // Store pulse rings for this marker
            };
            
            globe.add(marker);
            const markers = this.sceneModel.getMarkers();
            markers.push(marker);

            // Add pin line
            const linePoints = [
                latLonToVector3(event.lat, event.lon, 1.0),
                position
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff6600 }); // Orange color
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData.isEventMarkerPin = true;
            globe.add(line);
        });
    }

    /**
     * Add seaport markers
     */
    addSeaportMarkers() {
        const globe = this.sceneModel.getGlobe();
        const seaports = this.dataModel.getAllSeaports();

        seaports.forEach(seaport => {
            const position = latLonToVector3(seaport.lat, seaport.lon, 1.02);
            
            const markerGeometry = new THREE.SphereGeometry(0.010, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0x0088ff
            });
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(position);
            marker.userData = { 
                seaport: seaport.name,
                lat: seaport.lat,
                lon: seaport.lon,
                isSeaportMarker: true
            };
            
            marker.visible = false; // Hide port markers
            globe.add(marker);
            
            // Add pin line
            const linePoints = [
                latLonToVector3(seaport.lat, seaport.lon, 1.0),
                position
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0088ff });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData.isSeaportMarkerPin = true;
            line.visible = false; // Hide port marker pins
            globe.add(line);
        });
    }


    /**
     * Add connection lines (main routes)
     * @param {Function} onRouteCurveCreated - Callback when route curve is created
     */
    addConnectionLines(onRouteCurveCreated) {
        const globe = this.sceneModel.getGlobe();
        const connections = this.dataModel.getTrainConnections();
        const cities = this.dataModel.getAllCities();

        connections.forEach(connection => {
            const fromCity = cities.find(c => c.name === connection.from);
            const toCity = cities.find(c => c.name === connection.to);
            
            if (!fromCity || !toCity) {
                console.warn(`Connection not found: ${connection.from} to ${connection.to}`);
                return;
            }
            
            const curvePoints = createArcBetweenPoints(
                fromCity.lat, fromCity.lon,
                toCity.lat, toCity.lon,
                1.03, 50, true
            );
            
            const curve = new THREE.CatmullRomCurve3(curvePoints);
            
            if (onRouteCurveCreated) {
                onRouteCurveCreated({
                    curve: curve,
                    from: connection.from,
                    to: connection.to,
                    isMainRoute: true
                });
            }
            
            // Main core line - golden
            const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.002, 8, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.95
            });
            
            const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
            tube.userData.isConnectionLine = true;
            globe.add(tube);
            
            // Create gradient glow
            const glowSegments = 50;
            for (let layer = 0; layer < 2; layer++) {
                const radiusMultiplier = 1 + layer * 0.8;
                const baseRadius = 0.002 * radiusMultiplier;
                
                const points = curve.getPoints(glowSegments);
                const radialSegments = 8;
                const radiusArray = [];
                
                for (let i = 0; i <= glowSegments; i++) {
                    const t = i / glowSegments;
                    const fadeFactor = Math.sin(t * Math.PI);
                    radiusArray.push(baseRadius * fadeFactor);
                }
                
                const glowPath = new THREE.CatmullRomCurve3(points);
                const glowGeometry = new THREE.TubeGeometry(
                    glowPath, 
                    glowSegments, 
                    baseRadius, 
                    radialSegments, 
                    false
                );
                
                const positionAttr = glowGeometry.attributes.position;
                for (let i = 0; i < positionAttr.count; i++) {
                    const segmentIndex = Math.floor(i / (radialSegments + 1));
                    if (segmentIndex < radiusArray.length) {
                        const scaleFactor = radiusArray[segmentIndex] / baseRadius;
                        const x = positionAttr.getX(i);
                        const y = positionAttr.getY(i);
                        const z = positionAttr.getZ(i);
                        
                        const centerPoint = points[segmentIndex];
                        const dx = x - centerPoint.x;
                        const dy = y - centerPoint.y;
                        const dz = z - centerPoint.z;
                        
                        positionAttr.setXYZ(
                            i,
                            centerPoint.x + dx * scaleFactor,
                            centerPoint.y + dy * scaleFactor,
                            centerPoint.z + dz * scaleFactor
                        );
                    }
                }
                positionAttr.needsUpdate = true;
                
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffcc00,
                    transparent: true,
                    opacity: 0.3 / (layer + 1)
                });
                
                const glowTube = new THREE.Mesh(glowGeometry, glowMaterial);
                glowTube.userData.isConnectionLine = true;
                globe.add(glowTube);
            }
        });
    }

    /**
     * Add secondary connection lines
     */
    addSecondaryConnectionLines() {
        const globe = this.sceneModel.getGlobe();
        const secondaryConnections = this.dataModel.getSecondaryConnections();
        const cities = this.dataModel.getAllCities();

        secondaryConnections.forEach(connection => {
            const fromCity = cities.find(c => c.name === connection.from);
            const toCity = cities.find(c => c.name === connection.to);
            
            if (!fromCity || !toCity) {
                console.warn(`Secondary connection not found: ${connection.from} to ${connection.to}`);
                return;
            }
            
            const curvePoints = createArcBetweenPoints(
                fromCity.lat, fromCity.lon,
                toCity.lat, toCity.lon,
                1.02, 50, false
            );
            
            const curve = new THREE.CatmullRomCurve3(curvePoints);
            
            // White line for secondary connections
            const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.0015, 8, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            
            const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
            tube.userData.isSecondaryLine = true;
            globe.add(tube);
        });
    }

    /**
     * Add seaport connection lines
     * @param {Function} onBoatRouteCurveCreated - Callback when boat route curve is created
     */
    addSeaportConnectionLines(onBoatRouteCurveCreated) {
        const globe = this.sceneModel.getGlobe();
        const seaportConnections = this.dataModel.getSeaportConnections();
        const seaports = this.dataModel.getAllSeaports();

        seaportConnections.forEach(connection => {
            const fromPort = seaports.find(p => p.name === connection.from);
            const toPort = seaports.find(p => p.name === connection.to);
            
            if (!fromPort || !toPort) {
                console.warn(`Seaport connection not found: ${connection.from} to ${connection.to}`);
                return;
            }
            
            const curvePoints = createArcBetweenPoints(
                fromPort.lat, fromPort.lon,
                toPort.lat, toPort.lon,
                1.0, 50, false
            );
            
            const curve = new THREE.CatmullRomCurve3(curvePoints);
            
            if (onBoatRouteCurveCreated) {
                onBoatRouteCurveCreated({
                    curve: curve,
                    from: connection.from,
                    to: connection.to
                });
            }
            
            // Red line for seaport connections
            const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.002, 8, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            
            const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
            tube.userData.isSeaportConnectionLine = true;
            tube.visible = false; // Hide red lines
            globe.add(tube);
        });
    }

    /**
     * Add satellite markers (for future rocket connections)
     * @param {Array} satellites - Array of satellite objects
     */
    addSatelliteMarkers(satellites) {
        const markers = this.sceneModel.getMarkers();

        satellites.forEach(satellite => {
            const data = satellite.userData;
            if (!data || !data.isSatellite) return;
            
            // Create marker for satellite (smaller than city markers)
            const markerGeometry = new THREE.SphereGeometry(0.003, 12, 12);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0x9b59b6 // Purple to match orbit lines
            });
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.userData = {
                satellite: data.name,
                satelliteType: data.type,
                isSatelliteMarker: true,
                parentSatellite: satellite
            };
            
            // Hide satellite markers (they were showing as dots)
            marker.visible = false;
            
            // Marker will be positioned relative to satellite (follows it)
            satellite.add(marker);
            markers.push(marker);
        });
    }
}

