/**
 * GlobeView - Handles globe rendering, markers, and connection lines
 */
import { latLonToVector3, createArcBetweenPoints, xyToPlanePosition } from '../utils/GeometryUtils.js?v=3';
import { EventMarkerManager } from '../managers/EventMarkerManager.js';

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

        // Create Earth sphere
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Check saved palette preference to load correct texture
        const savedPalette = localStorage.getItem('colorPalette');
        const isGray = savedPalette === 'gray';
        const initialTexturePath = isGray ? 'assets/images/maps/MAP Black.png' : 'assets/images/maps/MAP.png';
        console.log('Initializing globe with palette:', savedPalette || 'blue (default)', 'Texture:', initialTexturePath);
        
        // Load Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        // Load normal map
        const normalMapPath = 'assets/images/maps/MAP Normal.png';
        const normalMap = textureLoader.load(
            normalMapPath,
            (texture) => {
                console.log('Normal map loaded successfully');
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
            },
            undefined,
            (err) => {
                console.warn('Normal map not found, continuing without it:', err);
            }
        );
        
        const earthTexture = textureLoader.load(
            initialTexturePath,
            (texture) => {
                console.log('Earth texture loaded successfully:', initialTexturePath);
                
                // Improve texture quality and reduce pole blur
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                
                const globe = this.sceneModel.getGlobe();
                if (globe) {
                    // Ensure the texture is applied to the material
                    globe.material.map = texture;
                    globe.material.normalMap = normalMap;
                    globe.material.needsUpdate = true;
                }
                
                // Cache the loaded texture
                this.textureCache.set(initialTexturePath, texture);
                
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
        
        // Preload the other texture to avoid delay when switching palettes
        const otherTexturePath = isGray ? 'assets/images/maps/MAP.png' : 'assets/images/maps/MAP Black.png';
        textureLoader.load(otherTexturePath, (texture) => {
            // Improve texture quality
            const renderer = this.sceneModel.getRenderer();
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            // Cache the preloaded texture
            this.textureCache.set(otherTexturePath, texture);
            console.log('Preloaded and cached alternate texture:', otherTexturePath);
        });
        
        // Use MeshStandardMaterial for normal map (needs lighting)
        const material = new THREE.MeshStandardMaterial({
            map: earthTexture,
            normalMap: normalMap,
            transparent: false,
            opacity: 1.0,
            metalness: 0.1,
            roughness: 0.9
        });
        
        const globe = new THREE.Mesh(geometry, material);
        this.sceneModel.setGlobe(globe);
        scene.add(globe);

        // Create Moon and Mars planes at the same time as globe
        // Moon plane - smaller, to the right of globe
        const moonGeometry = new THREE.PlaneGeometry(0.4, 0.4);
        const moonTexturePath = isGray ? 'assets/images/misc/Moon_Dark.png' : 'assets/images/misc/Moon.png';
        const moonTexture = textureLoader.load(moonTexturePath, (texture) => {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
        });
        
        const moonMaterial = new THREE.MeshStandardMaterial({
            map: moonTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75, // Semi-transparent
            alphaTest: 0.1, // Respect transparent background
            emissive: 0x88aaff, // Blue glow for Moon
            emissiveIntensity: 0.3, // Subtle glow intensity
            emissiveMap: moonTexture, // Use texture for emission pattern
            metalness: 0.0,
            roughness: 0.5
        });
        const moonPlane = new THREE.Mesh(moonGeometry, moonMaterial);
        
        // Position will be set by InteractionController.updatePlanesPosition after init
        // Default to desktop position for now
        moonPlane.position.set(1.5, 0.3, 0);
        moonPlane.visible = false; // Hidden by default, shown only if current page has Moon events
        moonPlane.scale.set(1, 0, 1); // Start with Y scale at 0 (squashed)
        // Rotate plane to face the camera (will be updated by updatePlanesPosition)
        moonPlane.lookAt(0, 0, 3.5);
        if (this.sceneModel.setMoonPlane) {
            this.sceneModel.setMoonPlane(moonPlane);
        } else {
            this.sceneModel.moonPlane = moonPlane;
        }
        scene.add(moonPlane);
        console.log('Moon plane created at:', moonPlane.position, 'rotation:', moonPlane.quaternion);

        // Mars plane - smaller, to the right of globe
        const marsGeometry = new THREE.PlaneGeometry(0.4, 0.4);
        const marsTexturePath = isGray ? 'assets/images/misc/Mars_Dark.png' : 'assets/images/misc/Mars.png';
        const marsTexture = textureLoader.load(marsTexturePath, (texture) => {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
        });
        const marsMaterial = new THREE.MeshStandardMaterial({
            map: marsTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75, // Semi-transparent
            alphaTest: 0.1, // Respect transparent background
            emissive: 0x88aaff, // Blue glow for Mars
            emissiveIntensity: 0.3, // Subtle glow intensity
            emissiveMap: marsTexture, // Use texture for emission pattern
            metalness: 0.0,
            roughness: 0.5
        });
        const marsPlane = new THREE.Mesh(marsGeometry, marsMaterial);
        
        // Position will be set by InteractionController.updatePlanesPosition after init
        // Default to desktop position for now
        marsPlane.position.set(1.5, -0.3, 0);
        marsPlane.visible = false; // Hidden by default, shown only if current page has Mars events
        marsPlane.scale.set(1, 0, 1); // Start with Y scale at 0 (squashed)
        // Rotate plane to face the camera (will be updated by updatePlanesPosition)
        marsPlane.lookAt(0, 0, 3.5);
        if (this.sceneModel.setMarsPlane) {
            this.sceneModel.setMarsPlane(marsPlane);
        } else {
            this.sceneModel.marsPlane = marsPlane;
        }
        scene.add(marsPlane);
        console.log('Mars plane created at:', marsPlane.position, 'rotation:', marsPlane.quaternion);
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

        // Check if texture is already cached
        if (this.textureCache.has(texturePath)) {
            const cachedTexture = this.textureCache.get(texturePath);
            console.log('Using cached texture:', texturePath);
            globe.material.map = cachedTexture;
            globe.material.needsUpdate = true;
            if (onTextureLoaded) {
                onTextureLoaded();
            }
            return;
        }

        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            texturePath,
            (texture) => {
                console.log('Globe texture changed to:', texturePath);
                
                // Improve texture quality
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                
                // Cache the texture for instant switching
                this.textureCache.set(texturePath, texture);
                
                // Update globe material
                globe.material.map = texture;
                globe.material.needsUpdate = true;
                
                if (onTextureLoaded) {
                    onTextureLoaded();
                }
            },
            undefined,
            (err) => {
                console.error('Error loading globe texture:', err);
            }
        );
    }

    /**
     * Change Moon plane texture based on color palette
     * @param {string} texturePath - Path to the texture file
     */
    changeMoonTexture(texturePath) {
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        if (!moonPlane) {
            console.error('Moon plane not found');
            return;
        }

        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            texturePath,
            (texture) => {
                console.log('Moon texture changed to:', texturePath);
                
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                
                moonPlane.material.map = texture;
                moonPlane.material.emissiveMap = texture; // Update emissive map too
                moonPlane.material.needsUpdate = true;
            },
            undefined,
            (err) => {
                console.error('Error loading Moon texture:', err);
            }
        );
    }

    /**
     * Change Mars plane texture based on color palette
     * @param {string} texturePath - Path to the texture file
     */
    changeMarsTexture(texturePath) {
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        if (!marsPlane) {
            console.error('Mars plane not found');
            return;
        }

        const renderer = this.sceneModel.getRenderer();
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            texturePath,
            (texture) => {
                console.log('Mars texture changed to:', texturePath);
                
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                
                marsPlane.material.map = texture;
                marsPlane.material.emissiveMap = texture; // Update emissive map too
                marsPlane.material.needsUpdate = true;
            },
            undefined,
            (err) => {
                console.error('Error loading Mars texture:', err);
            }
        );
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
        
        // Create Moon plane - following same pattern as globe
        const moonGeometry = new THREE.PlaneGeometry(1.5, 1.5);
        const moonTexture = textureLoader.load(
            'assets/images/misc/Moon.png',
            (texture) => {
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
            }
        );
        const moonMaterial = new THREE.MeshStandardMaterial({
            map: moonTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
            alphaTest: 0.1,
            emissive: 0x88aaff, // Blue glow for Moon
            emissiveIntensity: 0.3, // Subtle glow intensity
            emissiveMap: moonTexture, // Use texture for emission pattern
            metalness: 0.0,
            roughness: 0.5
        });
        const moonPlane = new THREE.Mesh(moonGeometry, moonMaterial);
        moonPlane.position.set(0, 0.6, 0); // Above center
        this.sceneModel.setMoonPlane(moonPlane);
        scene.add(moonPlane);
        
        // Create Mars plane - following same pattern as globe
        const marsGeometry = new THREE.PlaneGeometry(1.5, 1.5);
        const marsTexture = textureLoader.load(
            'assets/images/misc/Mars.png',
            (texture) => {
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
            }
        );
        const marsMaterial = new THREE.MeshStandardMaterial({
            map: marsTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
            alphaTest: 0.1,
            emissive: 0x88aaff, // Blue glow for Mars
            emissiveIntensity: 0.3, // Subtle glow intensity
            emissiveMap: marsTexture, // Use texture for emission pattern
            metalness: 0.0,
            roughness: 0.5
        });
        const marsPlane = new THREE.Mesh(marsGeometry, marsMaterial);
        marsPlane.position.set(0, -0.6, 0); // Below center
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
            const position = latLonToVector3(seaport.lat, seaport.lon, 1.02);
            
            // Determine color: red if has connections, green if no connections
            const hasConnections = portsWithConnections.has(seaport.name);
            const markerColor = hasConnections ? 0xff0000 : 0x00ff00; // Red or green
            const pinColor = hasConnections ? 0xff0000 : 0x00ff00; // Red or green
            
            const markerGeometry = new THREE.SphereGeometry(0.010, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: markerColor
            });
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(position);
            
            // Add pin line for seaport markers
            const pinLineStart = latLonToVector3(seaport.lat, seaport.lon, 1.0);
            const pinLineEnd = position;
            const pinLineGeometry = new THREE.BufferGeometry().setFromPoints([pinLineStart, pinLineEnd]);
            const pinLineMaterial = new THREE.LineBasicMaterial({ 
                color: pinColor,
                transparent: true,
                opacity: 0.7
            });
            const pinLine = new THREE.Line(pinLineGeometry, pinLineMaterial);
            
            marker.userData = {
                isSeaportMarker: true,
                seaportName: seaport.name
            };
            
            marker.visible = false; // Hide port markers (debug only)
            pinLine.visible = false; // Hide port marker pins (debug only)
            
            globe.add(marker);
            globe.add(pinLine);
            
            const markers = this.sceneModel.getMarkers();
            markers.push(marker);
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
                1.02, 50, true  // Changed from 1.03 to 1.02 to start from marker position
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
            
            // Special case: Mumbai to Anchorage - force long way (through Africa/Pacific)
            const forceLongWay = (connection.from === 'Mumbai' && connection.to === 'Anchorage') ||
                                 (connection.from === 'Anchorage' && connection.to === 'Mumbai');
            
            const curvePoints = createArcBetweenPoints(
                fromPort.lat, fromPort.lon,
                toPort.lat, toPort.lon,
                1.0, 50, false, forceLongWay
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
            tube.visible = false; // Hide seaport connection lines
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

