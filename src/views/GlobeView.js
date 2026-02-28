/**
 * GlobeView - Handles globe rendering, markers, and connection lines
 */
import { latLonToVector3, createArcBetweenPoints, xyToPlanePosition, latLonToMapPlanePosition } from '../utils/GeometryUtils.js?v=3';
import { EventMarkerManager } from '../managers/EventMarkerManager.js';
import { configureTexture, loadTexture, changePlaneTexture } from './helpers/GlobeTextureHelpers.js';
import { createCelestialPlane, getMoonTexturePath, getMarsTexturePath } from './helpers/GlobePlaneHelpers.js';
import { createMarkerWithPin } from './helpers/GlobeMarkerHelpers.js';
import { createConnectionLine, createConnectionGlow } from './helpers/GlobeConnectionHelpers.js';
import { createGlobeMesh, createEarthMapPlane, setupCelestialPlanes } from './helpers/GlobeInitHelpers.js';

// THREE is loaded globally via script tag in index.html

export class GlobeView {
    constructor(sceneModel, dataModel) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
        // Cache textures to avoid reloading delays
        this.textureCache = new Map();
        // Initialize EventMarkerManager
        this.eventMarkerManager = new EventMarkerManager(sceneModel, dataModel);
    }

    /**
     * Initialize globe with texture
     * @param {Function} onTextureLoaded - Callback when texture loads
     */
    initGlobe(onTextureLoaded) {
        const scene = this.sceneModel.getScene();
        const renderer = this.sceneModel.getRenderer();
        
        // Check saved palette preference to load correct texture
        const savedPalette = localStorage.getItem('colorPalette');
        const isGray = savedPalette === 'gray';
        const initialTexturePath = isGray ? 'assets/images/maps/MAP Black.png' : 'assets/images/maps/MAP.png';
        console.log('Initializing globe with palette:', savedPalette || 'blue (default)', 'Texture:', initialTexturePath);
        
        const textureLoader = new THREE.TextureLoader();
        
        // Load normal map
        const normalMapPath = 'assets/images/maps/MAP Normal.png';
        const normalMap = loadTexture(
            textureLoader,
            normalMapPath,
            renderer,
            (texture) => console.log('Normal map loaded successfully'),
            (err) => console.warn('Normal map not found, continuing without it:', err)
        );
        
        // Create globe mesh
        const globe = createGlobeMesh(
            textureLoader,
            renderer,
            initialTexturePath,
            normalMap,
            (texture) => {
                const globe = this.sceneModel.getGlobe();
                if (globe) {
                    globe.material.map = texture;
                    globe.material.normalMap = normalMap;
                    globe.material.needsUpdate = true;
                }
                this.textureCache.set(initialTexturePath, texture);
                if (onTextureLoaded) {
                    onTextureLoaded();
                }
            },
            (err) => {
                console.error('Error loading Earth texture:', err);
                const globe = this.sceneModel.getGlobe();
                if (globe) {
                    globe.material.color.setHex(0x4a90e2);
                }
            }
        );
        this.sceneModel.setGlobe(globe);
        scene.add(globe);

        // Create flat Earth map plane (hidden by default; used for map view toggle)
        const earthMapPlane = createEarthMapPlane(
            textureLoader,
            renderer,
            initialTexturePath,
            (texture) => {
                const p = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
                if (p && p.material) {
                    p.material.map = texture;
                    p.material.needsUpdate = true;
                }
                this.textureCache.set(initialTexturePath, texture);
            },
            (err) => console.warn('Error loading Earth map plane texture:', err)
        );
        if (this.sceneModel.setEarthMapPlane) {
            this.sceneModel.setEarthMapPlane(earthMapPlane);
        } else {
            this.sceneModel.earthMapPlane = earthMapPlane;
        }
        scene.add(earthMapPlane);
        
        // Preload the other texture to avoid delay when switching palettes
        const otherTexturePath = isGray ? 'assets/images/maps/MAP.png' : 'assets/images/maps/MAP Black.png';
        loadTexture(textureLoader, otherTexturePath, renderer, (texture) => {
            this.textureCache.set(otherTexturePath, texture);
            console.log('Preloaded and cached alternate texture:', otherTexturePath);
        });
        
        // Create Moon and Mars planes
        setupCelestialPlanes({
            scene,
            textureLoader,
            renderer,
            isGray,
            sceneModel: this.sceneModel
        });
    }

    /**
     * Change globe texture
     * @param {string} texturePath - Path to the texture file
     * @param {Function} onTextureLoaded - Optional callback when texture loads
     */
    changeGlobeTexture(texturePath, onTextureLoaded) {
        const globe = this.sceneModel.getGlobe();
        if (!globe) {
            console.error('Globe not found');
            return;
        }

        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;

        // Check if texture is already cached
        if (this.textureCache.has(texturePath)) {
            const cachedTexture = this.textureCache.get(texturePath);
            console.log('Using cached texture:', texturePath);
            globe.material.map = cachedTexture;
            globe.material.needsUpdate = true;
            if (earthMapPlane && earthMapPlane.material) {
                earthMapPlane.material.map = cachedTexture;
                earthMapPlane.material.needsUpdate = true;
            }
            if (onTextureLoaded) {
                onTextureLoaded();
            }
            return;
        }

        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        
        loadTexture(textureLoader, texturePath, renderer, (texture) => {
                console.log('Globe texture changed to:', texturePath);
                this.textureCache.set(texturePath, texture);
                globe.material.map = texture;
                globe.material.needsUpdate = true;
                if (earthMapPlane && earthMapPlane.material) {
                    earthMapPlane.material.map = texture;
                    earthMapPlane.material.needsUpdate = true;
                }
                if (onTextureLoaded) {
                    onTextureLoaded();
                }
        });
    }

    /**
     * Change Moon plane texture based on color palette
     * @param {string} texturePath - Path to the texture file
     */
    changeMoonTexture(texturePath) {
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        changePlaneTexture(moonPlane, texturePath, textureLoader, renderer, true);
    }

    /**
     * Change Mars plane texture based on color palette
     * @param {string} texturePath - Path to the texture file
     */
    changeMarsTexture(texturePath) {
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        changePlaneTexture(marsPlane, texturePath, textureLoader, renderer, true);
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
     * Initialize Moon and Mars 2D planes (positioned at center, Moon above, Mars below)
     */
    initCelestialPlanes() {
        const scene = this.sceneModel.getScene();
        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        
        // Create Moon plane
        const moonPlane = createCelestialPlane({
            texturePath: 'assets/images/misc/Moon.png',
            textureLoader,
            renderer,
            size: 1.5,
            position: new THREE.Vector3(0, 0.6, 0),
            visible: true
        });
        this.sceneModel.setMoonPlane(moonPlane);
        scene.add(moonPlane);
        
        // Create Mars plane
        const marsPlane = createCelestialPlane({
            texturePath: 'assets/images/misc/Mars.png',
            textureLoader,
            renderer,
            size: 1.5,
            position: new THREE.Vector3(0, -0.6, 0),
            visible: true
        });
        this.sceneModel.setMarsPlane(marsPlane);
        scene.add(marsPlane);
        
        console.log('Moon and Mars planes created and added to scene');
    }


    /**
     * Add city markers
     * Only creates markers for cities that have transport connections
     */
    addCityMarkers() {
        const globe = this.sceneModel.getGlobe();
        const cities = this.dataModel.getAllCities();
        const markers = this.sceneModel.getMarkers();
        
        // Get all transport connections to check which cities have connections
        const trainConnections = this.dataModel.getTrainConnections();
        const secondaryConnections = this.dataModel.getSecondaryConnections();
        const allConnections = [...trainConnections, ...secondaryConnections];
        
        // Create a set of city names that have connections (either as "from" or "to")
        const citiesWithConnections = new Set();
        allConnections.forEach(conn => {
            citiesWithConnections.add(conn.from);
            citiesWithConnections.add(conn.to);
        });

        cities.forEach(city => {
            // Only create markers for cities that have transport connections
            if (!citiesWithConnections.has(city.name)) {
                return; // Skip cities without connections
            }

            createMarkerWithPin({
                location: city,
                radius: 0.004,
                color: 0xffd700,
                pinColor: 0xffd700,
                elevation: 1.02,
                userData: {
                city: city.name,
                lat: city.lat,
                lon: city.lon,
                isMarker: true
                },
                parent: globe,
                markersArray: markers,
                pinVisible: false  // Only event pins show; avoids loose pins at cities that also have events (e.g. Honolulu, The Hague)
            });
        });
    }

    /**
     * Add event markers (orange, bigger than hyperloop markers)
     * @param {boolean} animate - Whether to animate the appearance (grow from 0)
     * @returns {Promise} - Resolves when markers are added (and animation completes if animating)
     */
    /**
     * Add event markers to the globe, moon, mars, and station
     * Delegates to EventMarkerManager
     */
    addEventMarkers(animate = false) {
        return this.eventMarkerManager.addEventMarkers(animate);
    }
    
    /**
     * Remove all event markers and their pin lines
     * Delegates to EventMarkerManager
     */
    removeEventMarkers(animate = false) {
        return this.eventMarkerManager.removeEventMarkers(animate);
    }
    
    /**
     * Refresh event markers (remove old, add new for current page)
     * Delegates to EventMarkerManager
     */
    refreshEventMarkers() {
        return this.eventMarkerManager.refreshEventMarkers();
    }
    
    /**
     * Apply active filters to event markers
     * Delegates to EventMarkerManager
     */
    applyFilters() {
        return this.eventMarkerManager.applyFilters();
    }
    
    /**
     * Lock an event marker (dark orange/near black, smaller, no interactions)
     * Delegates to EventMarkerManager
     */
    lockEvent(marker) {
        return this.eventMarkerManager.lockEvent(marker);
    }
    
    /**
     * Unlock an event marker (restore to normal)
     * Delegates to EventMarkerManager
     */
    unlockEvent(marker) {
        return this.eventMarkerManager.unlockEvent(marker);
    }
    
    /**
     * Unlock all event markers
     * Delegates to EventMarkerManager
     */
    unlockAllEvents() {
        return this.eventMarkerManager.unlockAllEvents();
    }

    /**
     * Add seaport markers
     * Red markers for ports with routes, green markers for ports without routes
     */
    addSeaportMarkers() {
        const globe = this.sceneModel.getGlobe();
        // Use allSeaports (before filtering) to show ports without connections too
        const seaports = this.dataModel.allSeaports || this.dataModel.getAllSeaports();
        const seaportConnections = this.dataModel.getSeaportConnections();
        
        // Create a set of port names that have connections (either as "from" or "to")
        const portsWithConnections = new Set();
        seaportConnections.forEach(conn => {
            portsWithConnections.add(conn.from);
            portsWithConnections.add(conn.to);
        });

        seaports.forEach(seaport => {
            const hasConnections = portsWithConnections.has(seaport.name);
            const markerColor = hasConnections ? 0xff0000 : 0x00ff00; // Red or green
            
            createMarkerWithPin({
                location: seaport,
                radius: 0.010,
                color: markerColor,
                pinColor: markerColor,
                elevation: 1.02,
                userData: {
                isSeaportMarker: true,
                    seaportName: seaport.name
                },
                parent: globe,
                markersArray: this.sceneModel.getMarkers(),
                visible: false,  // Hide port markers (debug only)
                pinVisible: false  // No loose seaport pins
            });
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
            
            const curvePoints = createArcBetweenPoints(fromCity.lat, fromCity.lon, toCity.lat, toCity.lon, 1.02, 50, true);
            const curve = new THREE.CatmullRomCurve3(curvePoints);
            
            if (onRouteCurveCreated) {
                onRouteCurveCreated({
                    curve: curve,
                    from: connection.from,
                    to: connection.to,
                    fromLat: fromCity.lat,
                    fromLon: fromCity.lon,
                    toLat: toCity.lat,
                    toLon: toCity.lon,
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
            createConnectionGlow(curve, globe, 0.002, 50, 2);
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
            
            createConnectionLine({
                fromLocation: { lat: fromCity.lat, lon: fromCity.lon, from: connection.from },
                toLocation: { lat: toCity.lat, lon: toCity.lon, to: connection.to },
                radius: 1.02,
                segments: 50,
                useArc: false,
                parent: globe,
                lineConfig: {
                    radius: 0.0015,
                color: 0xffffff,
                    opacity: 0.7,
                    userDataKey: 'isSecondaryLine'
                }
            });
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
            
            // Special case: Mumbai to Anchorage - force long way (through Africa/Pacific)
            const forceLongWay = (connection.from === 'Mumbai' && connection.to === 'Anchorage') ||
                                 (connection.from === 'Anchorage' && connection.to === 'Mumbai');
            
            createConnectionLine({
                fromLocation: { lat: fromPort.lat, lon: fromPort.lon, from: connection.from },
                toLocation: { lat: toPort.lat, lon: toPort.lon, to: connection.to },
                radius: 1.0,
                segments: 50,
                useArc: false,
                forceLongWay,
                parent: globe,
                onCurveCreated: onBoatRouteCurveCreated,
                lineConfig: {
                    radius: 0.002,
                color: 0xff0000,
                    opacity: 0.8,
                    userDataKey: 'isSeaportConnectionLine',
                    visible: false // Hide seaport connection lines
                }
            });
        });
    }

    /**
     * Render flat (straight) transport lines on the Earth map plane.
     * - Main + secondary train connections are visible.
     * - Seaport connections are created but hidden (match globe behavior).
     * Uses horizontal wrapping (Pac-Man) when a connection crosses the map seam.
     */
    renderMapTransportLines() {
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        if (!earthMapPlane) return;

        const planeWidth = 2.0;
        const halfW = planeWidth / 2;
        const z = 0.008;

        // Remove existing map transport lines to avoid duplicates
        const toRemove = [];
        earthMapPlane.traverse(obj => {
            if (!obj?.userData) return;
            if (obj.userData.isConnectionLine || obj.userData.isSecondaryLine || obj.userData.isSeaportConnectionLine) {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(o => { if (o.parent) o.parent.remove(o); });

        const addWrappedLine = ({ fromLat, fromLon, toLat, toLon, color, opacity, userDataKey, visible = true }) => {
            const a = latLonToMapPlanePosition(fromLat, fromLon, planeWidth, 1.0, z);
            const b = latLonToMapPlanePosition(toLat, toLon, planeWidth, 1.0, z);

            // Choose shortest horizontal path by allowing b.x to shift by ±width
            let bx = b.x;
            const dx = bx - a.x;
            if (dx > halfW) bx -= planeWidth;
            else if (dx < -halfW) bx += planeWidth;

            const bxWrapped = ((bx + halfW) % planeWidth + planeWidth) % planeWidth - halfW;
            const crossesRight = bx > halfW;
            const crossesLeft = bx < -halfW;

            const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });

            const makeLine = (p1, p2) => {
                const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(geom, material);
                if (userDataKey) line.userData[userDataKey] = true;
                line.visible = visible;
                earthMapPlane.add(line);
            };

            if (crossesRight || crossesLeft) {
                const boundaryX = crossesRight ? halfW : -halfW;
                const t = (boundaryX - a.x) / (bx - a.x);
                const yAt = a.y + (b.y - a.y) * t;

                makeLine(new THREE.Vector3(a.x, a.y, z), new THREE.Vector3(boundaryX, yAt, z));
                makeLine(new THREE.Vector3(-boundaryX, yAt, z), new THREE.Vector3(bxWrapped, b.y, z));
            } else {
                makeLine(new THREE.Vector3(a.x, a.y, z), new THREE.Vector3(bxWrapped, b.y, z));
            }
        };

        // Train connections (main + secondary)
        const cities = this.dataModel.getAllCities();

        this.dataModel.getTrainConnections().forEach(conn => {
            const from = cities.find(c => c.name === conn.from);
            const to = cities.find(c => c.name === conn.to);
            if (!from || !to) return;
            addWrappedLine({
                fromLat: from.lat, fromLon: from.lon,
                toLat: to.lat, toLon: to.lon,
                color: 0xffd700,
                opacity: 0.95,
                userDataKey: 'isConnectionLine',
                visible: true
            });
        });

        this.dataModel.getSecondaryConnections().forEach(conn => {
            const from = cities.find(c => c.name === conn.from);
            const to = cities.find(c => c.name === conn.to);
            if (!from || !to) return;
            addWrappedLine({
                fromLat: from.lat, fromLon: from.lon,
                toLat: to.lat, toLon: to.lon,
                color: 0xffffff,
                opacity: 0.7,
                userDataKey: 'isSecondaryLine',
                visible: true
            });
        });

        // Seaport connections (hidden, but present)
        const ports = this.dataModel.getAllSeaports();
        this.dataModel.getSeaportConnections().forEach(conn => {
            const from = ports.find(p => p.name === conn.from);
            const to = ports.find(p => p.name === conn.to);
            if (!from || !to) return;
            addWrappedLine({
                fromLat: from.lat, fromLon: from.lon,
                toLat: to.lat, toLon: to.lon,
                color: 0xff0000,
                opacity: 0.8,
                userDataKey: 'isSeaportConnectionLine',
                visible: false
            });
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

