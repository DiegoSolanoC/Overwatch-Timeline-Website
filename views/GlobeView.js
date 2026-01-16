/**
 * GlobeView - Handles globe rendering, markers, and connection lines
 */
import { latLonToVector3, createArcBetweenPoints, xyToPlanePosition } from '../utils/GeometryUtils.js?v=3';

// THREE is loaded globally via script tag in index.html

export class GlobeView {
    constructor(sceneModel, dataModel) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
        // Cache textures to avoid reloading delays
        this.textureCache = new Map();
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
        const initialTexturePath = isGray ? 'Maps/MAP Black.png' : 'Maps/MAP.png';
        console.log('Initializing globe with palette:', savedPalette || 'blue (default)', 'Texture:', initialTexturePath);
        
        // Load Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        // Load normal map
        const normalMapPath = 'Maps/MAP Normal.png';
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
        const otherTexturePath = isGray ? 'Maps/MAP.png' : 'Maps/MAP Black.png';
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
        const moonTexture = textureLoader.load('Misc/Moon.png', (texture) => {
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
        moonPlane.position.set(1.5, 0.3, 0); // To the right, slightly above center
        moonPlane.visible = false; // Hidden by default, shown only if current page has Moon events
        moonPlane.scale.set(1, 0, 1); // Start with Y scale at 0 (squashed)
        // Rotate plane to face the camera (which is at 0, 0, 3.5)
        // Use lookAt to make plane face camera position
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
        const marsTexture = textureLoader.load('Misc/Mars.png', (texture) => {
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
        marsPlane.position.set(1.5, -0.3, 0); // To the right, slightly below center
        marsPlane.visible = false; // Hidden by default, shown only if current page has Mars events
        marsPlane.scale.set(1, 0, 1); // Start with Y scale at 0 (squashed)
        // Rotate plane to face the camera (which is at 0, 0, 3.5)
        // Use lookAt to make plane face camera position
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
            'Misc/Moon.png',
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
            'Misc/Mars.png',
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
    addEventMarkers(animate = false) {
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const events = this.dataModel.getEventsForCurrentPage(); // Use paginated events

        // Collect all markers and pin lines for animation
        const newMarkers = [];
        const newPinLines = [];

        events.forEach(event => {
            const isMultiEvent = event.variants && event.variants.length > 0;
            const eventLocationType = event.locationType || 'earth';
            
            if (isMultiEvent) {
                // Multi-event: create markers for each variant
                event.variants.forEach((variant, variantIndex) => {
                    // Get location type from variant if available, otherwise use event location type
                    const variantLocationType = variant.locationType || eventLocationType;
                    
                    let position;
                    let targetParent;
                    
                    if (variantLocationType === 'moon') {
                        // Moon: use x/y coordinates (0-100, 0-100)
                        const x = variant.x !== undefined ? variant.x : (event.x !== undefined ? event.x : 50);
                        const y = variant.y !== undefined ? variant.y : (event.y !== undefined ? event.y : 50);
                        if (moonPlane) {
                            position = xyToPlanePosition(
                                x, y,
                                0.4, // planeWidth
                                0.4, // planeHeight
                                moonPlane.position
                            );
                            targetParent = moonPlane;
                        } else {
                            console.warn('Moon plane not found, skipping marker');
                            return;
                        }
                    } else if (variantLocationType === 'mars') {
                        // Mars: use x/y coordinates (0-100, 0-100)
                        const x = variant.x !== undefined ? variant.x : (event.x !== undefined ? event.x : 50);
                        const y = variant.y !== undefined ? variant.y : (event.y !== undefined ? event.y : 50);
                        if (marsPlane) {
                            position = xyToPlanePosition(
                                x, y,
                                0.4, // planeWidth
                                0.4, // planeHeight
                                marsPlane.position
                            );
                            targetParent = marsPlane;
                        } else {
                            console.warn('Mars plane not found, skipping marker');
                            return;
                        }
                    } else {
                        // Earth: use lat/lon coordinates
                    const lat = variant.lat !== undefined ? variant.lat : event.lat;
                    const lon = variant.lon !== undefined ? variant.lon : event.lon;
                        position = latLonToVector3(lat, lon, 1.02);
                        targetParent = globe;
                    }
                    
                    const isMainVariant = variantIndex === 0;
                    
                    // Main variant: orange, interactive marker
                    // Other variants: red, smaller, non-interactive marker
                    const isSmallMobile = window.innerWidth <= 480;
                    let markerRadius, markerColor, isInteractive;
                    
                    if (isMainVariant) {
                        markerRadius = isSmallMobile ? 0.030 : 0.015; // Regular size
                        markerColor = 0xff6600; // Orange
                        isInteractive = true;
                    } else {
                        markerRadius = isSmallMobile ? 0.020 : 0.010; // Smaller
                        markerColor = 0xff69b4; // Hot pink
                        isInteractive = false;
                    }
                    
                    const markerGeometry = new THREE.SphereGeometry(markerRadius, 16, 16);
                    // Create a completely new material instance for each marker to avoid color sharing
                    // Use MeshBasicMaterial for flat, non-shaded appearance
                    const markerMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(markerColor)
                    });
                    
                    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                    // Force update the material to ensure color is applied
                    marker.material.needsUpdate = true;
                    marker.position.copy(position);
                    
                    const displayName = variant.name || `Variant ${variantIndex + 1}`;
                    
                    // Check if this event should be locked based on active filters
                    const activeFilters = this.sceneModel.activeFilters;
                    let shouldBeLocked = false;
                    if (activeFilters && activeFilters.size > 0) {
                        const eventHeroFilters = event.filters || [];
                        const eventFactionFilters = event.factions || [];
                        const hasMatchingHero = eventHeroFilters.some(filter => activeFilters.has(filter));
                        const hasMatchingFaction = eventFactionFilters.some(faction => activeFilters.has(faction));
                        const hasMatchingFilter = hasMatchingHero || hasMatchingFaction;
                        shouldBeLocked = !hasMatchingFilter;
                    }
                    
                    // Set initial scale based on animation and locked state
                    if (animate) {
                        marker.scale.set(0, 0, 0);
                    } else if (shouldBeLocked) {
                        // If locked and not animating, start at locked scale
                        marker.scale.set(0.75, 0.75, 0.75);
                        // Set locked color immediately
                        marker.material.color.setHex(0x331100);
                    }
                    
                    marker.userData = { 
                        event: event, // Store full event object
                        variant: variant, // Store variant object
                        variantIndex: variantIndex, // Store variant index
                        eventName: displayName,
                        locationType: variantLocationType,
                        lat: variantLocationType === 'earth' ? (variant.lat !== undefined ? variant.lat : event.lat) : undefined,
                        lon: variantLocationType === 'earth' ? (variant.lon !== undefined ? variant.lon : event.lon) : undefined,
                        x: variantLocationType !== 'earth' ? (variant.x !== undefined ? variant.x : (event.x !== undefined ? event.x : undefined)) : undefined,
                        y: variantLocationType !== 'earth' ? (variant.y !== undefined ? variant.y : (event.y !== undefined ? event.y : undefined)) : undefined,
                        isEventMarker: true,
                        isInteractive: isInteractive, // Only main variant is interactive
                        isMainVariant: isMainVariant,
                        pulseRings: [], // Store pulse rings for this marker
                        isLocked: shouldBeLocked, // Set initial locked state based on filters
                        originalScale: 1.0, // Store original scale for unlocking
                        originalColor: markerColor // Store original color for restoration
                    };
                    
                    // Hide variant markers by default (only show when event is open)
                    if (!isMainVariant) {
                        marker.visible = false;
                    }
                    
                    targetParent.add(marker);
                    const markers = this.sceneModel.getMarkers();
                    markers.push(marker);

                    // Collect marker for animation (only main variants that are visible)
                    if (isMainVariant && marker.visible) {
                        newMarkers.push(marker);
                    }

                    // Add pin line for all location types
                    if (isMainVariant) {
                        let linePoints;
                        let lineParent;
                        
                        if (variantLocationType === 'earth') {
                            // Earth: line from globe surface to marker
                            const lat = variant.lat !== undefined ? variant.lat : event.lat;
                            const lon = variant.lon !== undefined ? variant.lon : event.lon;
                            linePoints = [
                            latLonToVector3(lat, lon, 1.0),
                            position
                        ];
                            lineParent = globe;
                        } else if (variantLocationType === 'moon' && moonPlane) {
                            // Moon: line from plane surface (Z=0 in local space) to marker (Z=0.03)
                            // Marker is at local position (localX, localY, 0.03)
                            // Line should go from (localX, localY, 0) to (localX, localY, 0.03)
                            const markerLocalPos = marker.position.clone();
                            const lineStart = new THREE.Vector3(markerLocalPos.x, markerLocalPos.y, 0);
                            linePoints = [
                                lineStart,
                                markerLocalPos
                            ];
                            lineParent = moonPlane;
                        } else if (variantLocationType === 'mars' && marsPlane) {
                            // Mars: line from plane surface (Z=0 in local space) to marker (Z=0.03)
                            // Marker is at local position (localX, localY, 0.03)
                            // Line should go from (localX, localY, 0) to (localX, localY, 0.03)
                            const markerLocalPos = marker.position.clone();
                            const lineStart = new THREE.Vector3(markerLocalPos.x, markerLocalPos.y, 0);
                            linePoints = [
                                lineStart,
                                markerLocalPos
                            ];
                            lineParent = marsPlane;
                        }
                        
                        if (linePoints && lineParent) {
                            // Set pin line color based on locked state
                            const lineColor = shouldBeLocked ? 0x331100 : markerColor;
                        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                            const lineMaterial = new THREE.LineBasicMaterial({ 
                                color: lineColor, // Orange or dark based on locked state
                                transparent: animate, // Enable transparency for animation
                                opacity: animate ? 0 : 1 // Start at 0 opacity if animating
                            });
                        const line = new THREE.Line(lineGeometry, lineMaterial);
                        line.userData.isEventMarkerPin = true;
                        line.userData.marker = marker; // Link line to marker
                        marker.userData.pinLine = line; // Store pin line reference
                            lineParent.add(line);
                            
                            // Collect pin line for animation (only for main variants)
                            if (isMainVariant) {
                                newPinLines.push(line);
                            }
                        }
                    }
                });
            } else {
                // Single event: create one orange marker
                let position;
                let targetParent;
                
                if (eventLocationType === 'moon') {
                    // Moon: use x/y coordinates (0-100, 0-100)
                    const x = event.x !== undefined ? event.x : 50;
                    const y = event.y !== undefined ? event.y : 50;
                    if (moonPlane) {
                        position = xyToPlanePosition(
                            x, y,
                            0.4, // planeWidth
                            0.4, // planeHeight
                            moonPlane.position
                        );
                        targetParent = moonPlane;
                    } else {
                        console.warn('Moon plane not found, skipping marker');
                        return;
                    }
                } else if (eventLocationType === 'mars') {
                    // Mars: use x/y coordinates (0-100, 0-100)
                    const x = event.x !== undefined ? event.x : 50;
                    const y = event.y !== undefined ? event.y : 50;
                    if (marsPlane) {
                        position = xyToPlanePosition(
                            x, y,
                            0.4, // planeWidth
                            0.4, // planeHeight
                            marsPlane.position
                        );
                        targetParent = marsPlane;
                    } else {
                        console.warn('Mars plane not found, skipping marker');
                        return;
                    }
                } else {
                    // Earth: use lat/lon coordinates
                    position = latLonToVector3(event.lat, event.lon, 1.02);
                    targetParent = globe;
                }
                
                // Event markers are orange and bigger than hyperloop markers (0.015 vs 0.010 for seaports)
                // Make markers bigger on small mobile screens only (not tablets or desktop)
                const isSmallMobile = window.innerWidth <= 480;
                const markerRadius = isSmallMobile ? 0.030 : 0.015; // 2x larger on small mobile only
                const markerGeometry = new THREE.SphereGeometry(markerRadius, 16, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff6600 // Orange color - flat, non-shaded
                });
                
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.copy(position);
                
                const displayName = event.name || 'Event';
                
                // Check if this event should be locked based on active filters
                const activeFilters = this.sceneModel.activeFilters;
                let shouldBeLocked = false;
                if (activeFilters && activeFilters.size > 0) {
                    const eventHeroFilters = event.filters || [];
                    const eventFactionFilters = event.factions || [];
                    const hasMatchingHero = eventHeroFilters.some(filter => activeFilters.has(filter));
                    const hasMatchingFaction = eventFactionFilters.some(faction => activeFilters.has(faction));
                    const hasMatchingFilter = hasMatchingHero || hasMatchingFaction;
                    shouldBeLocked = !hasMatchingFilter;
                }
                
                // Set initial scale based on animation and locked state
                if (animate) {
                    marker.scale.set(0, 0, 0);
                } else if (shouldBeLocked) {
                    // If locked and not animating, start at locked scale
                    marker.scale.set(0.75, 0.75, 0.75);
                    // Set locked color immediately
                    marker.material.color.setHex(0x331100);
                }
                
                marker.userData = { 
                    event: event, // Store full event object
                    eventName: displayName,
                    locationType: eventLocationType,
                    lat: eventLocationType === 'earth' ? event.lat : undefined,
                    lon: eventLocationType === 'earth' ? event.lon : undefined,
                    x: eventLocationType !== 'earth' ? (event.x !== undefined ? event.x : undefined) : undefined,
                    y: eventLocationType !== 'earth' ? (event.y !== undefined ? event.y : undefined) : undefined,
                    isEventMarker: true,
                    isInteractive: true, // Single events are always interactive
                    isMainVariant: true,
                    pulseRings: [], // Store pulse rings for this marker
                    isLocked: shouldBeLocked, // Set initial locked state based on filters
                    originalScale: 1.0, // Store original scale for unlocking
                    originalColor: 0xff6600 // Store original color (orange) for restoration
                };
                
                targetParent.add(marker);
                const markers = this.sceneModel.getMarkers();
                markers.push(marker);

                // Collect marker for animation
                newMarkers.push(marker);

                // Add pin line for all location types
                let linePoints;
                let lineParent;
                
                if (eventLocationType === 'earth') {
                    // Earth: line from globe surface to marker
                    linePoints = [
                    latLonToVector3(event.lat, event.lon, 1.0),
                    position
                ];
                    lineParent = globe;
                } else if (eventLocationType === 'moon' && moonPlane) {
                    // Moon: line from plane surface (Z=0 in local space) to marker (Z=0.03)
                    // Marker is at local position (localX, localY, 0.03)
                    // Line should go from (localX, localY, 0) to (localX, localY, 0.03)
                    const markerLocalPos = marker.position.clone();
                    const lineStart = new THREE.Vector3(markerLocalPos.x, markerLocalPos.y, 0);
                    linePoints = [
                        lineStart,
                        markerLocalPos
                    ];
                    lineParent = moonPlane;
                } else if (eventLocationType === 'mars' && marsPlane) {
                    // Mars: line from plane surface (Z=0 in local space) to marker (Z=0.03)
                    // Marker is at local position (localX, localY, 0.03)
                    // Line should go from (localX, localY, 0) to (localX, localY, 0.03)
                    const markerLocalPos = marker.position.clone();
                    const lineStart = new THREE.Vector3(markerLocalPos.x, markerLocalPos.y, 0);
                    linePoints = [
                        lineStart,
                        markerLocalPos
                    ];
                    lineParent = marsPlane;
                }
                
                if (linePoints && lineParent) {
                    // Set pin line color based on locked state
                    const lineColor = shouldBeLocked ? 0x331100 : 0xff6600;
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                    const lineMaterial = new THREE.LineBasicMaterial({ 
                        color: lineColor, // Orange or dark based on locked state
                        transparent: animate, // Enable transparency for animation
                        opacity: animate ? 0 : 1 // Start at 0 opacity if animating
                    });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                line.userData.isEventMarkerPin = true;
                line.userData.marker = marker; // Link line to marker
                marker.userData.pinLine = line; // Store pin line reference
                    lineParent.add(line);
                    
                    // Collect pin line for animation
                    newPinLines.push(line);
                }
            }
        });
        
        // Animate markers and pin lines growing if requested
        if (animate && (newMarkers.length > 0 || newPinLines.length > 0)) {
            return new Promise((resolve) => {
                const duration = 300; // 300ms animation
                const startTime = performance.now();
                
                // Mark markers as animating to prevent pulse animation interference
                newMarkers.forEach(marker => {
                    if (marker.userData) {
                        marker.userData.isAnimating = true;
                    }
                    marker.scale.set(0, 0, 0);
                });
                
                // Ensure all pin lines start at opacity 0
                newPinLines.forEach(line => {
                    if (line.material) {
                        line.material.transparent = true;
                        line.material.opacity = 0;
                    }
                });
                
                const animateGrow = () => {
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Easing function (ease out)
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    
                    // Brightness flash - bell curve that peaks in the middle
                    const glowProgress = Math.sin(progress * Math.PI);
                    
                    // Animate markers growing from 0 to target scale (1.0 if unlocked, 0.75 if locked)
                    newMarkers.forEach(marker => {
                        const targetScale = (marker.userData && marker.userData.isLocked) ? 0.75 : 1.0;
                        const currentScale = easeProgress * targetScale;
                        marker.scale.set(currentScale, currentScale, currentScale);
                        
                        // Animate color: if locked, animate to dark color; otherwise flash yellow
                        if (marker.material && marker.userData) {
                            if (marker.userData.isLocked) {
                                // Locked: animate to dark color
                                const startColor = new THREE.Color(0xff6600); // Orange
                                const targetColor = new THREE.Color(0x331100); // Dark
                                marker.material.color.lerpColors(startColor, targetColor, easeProgress);
                                marker.material.needsUpdate = true;
                                
                                // Also animate pin line color if it exists
                                if (marker.userData.pinLine && marker.userData.pinLine.material) {
                                    marker.userData.pinLine.material.color.lerpColors(startColor, targetColor, easeProgress);
                                }
                            } else {
                                // Unlocked: flash yellow during animation
                                const baseColor = new THREE.Color(0xff6600); // Orange
                                const flashColor = new THREE.Color(0xffff00); // Yellow
                                marker.material.color.lerpColors(baseColor, flashColor, glowProgress);
                                marker.material.needsUpdate = true;
                            }
                        }
                    });
                    
                    // Animate pin lines fading in
                    newPinLines.forEach(line => {
                        if (line.material) {
                            line.material.opacity = easeProgress;
                        }
                    });
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateGrow);
                    } else {
                        // Ensure final scale is correct (1.0 if unlocked, 0.75 if locked)
                        newMarkers.forEach(marker => {
                            const targetScale = (marker.userData && marker.userData.isLocked) ? 0.75 : 1.0;
                            marker.scale.set(targetScale, targetScale, targetScale);
                            
                            // Set final color
                            if (marker.material && marker.userData) {
                                if (marker.userData.isLocked) {
                                    // Locked: dark color
                                    marker.material.color.setHex(0x331100);
                                } else {
                                    // Unlocked: back to orange
                                    marker.material.color.setHex(0xff6600);
                                }
                                marker.material.needsUpdate = true;
                            }
                            
                            // Clear animation flag to allow pulse animation to resume
                            if (marker.userData) {
                                marker.userData.isAnimating = false;
                            }
                        });
                        
                        // Set pin line colors for locked markers
                        newPinLines.forEach(line => {
                            if (line.material) {
                                line.material.opacity = 1;
                                // If linked marker is locked, set line to dark color
                                if (line.userData && line.userData.marker && line.userData.marker.userData && line.userData.marker.userData.isLocked) {
                                    line.material.color.setHex(0x331100);
                                }
                            }
                        });
                        resolve();
                    }
                };
                
                // Start animation immediately (markers are already added to scene)
                requestAnimationFrame(animateGrow);
            });
        } else {
            // If not animating, ensure markers are at full scale
            newMarkers.forEach(marker => {
                marker.scale.set(1, 1, 1);
            });
            newPinLines.forEach(line => {
                if (line.material) {
                    line.material.opacity = 1;
                    line.material.transparent = false;
                }
            });
            return Promise.resolve();
        }
    }
    
    /**
     * Remove all event markers and their pin lines
     * @param {boolean} animate - Whether to animate the removal (shrink to 0)
     * @returns {Promise} - Resolves when removal (and animation) is complete
     */
    removeEventMarkers(animate = false) {
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const markers = this.sceneModel.getMarkers();
        
        // Check if globe exists before trying to traverse
        if (!globe) {
            console.warn('GlobeView: Cannot remove event markers - globe not initialized yet');
            return Promise.resolve();
        }
        
        // Collect event markers and their pin lines
        const eventMarkers = [];
        const pinLines = [];
        
        globe.traverse((child) => {
            if (child.userData && child.userData.isEventMarker) {
                eventMarkers.push(child);
            }
            if (child.userData && child.userData.isEventMarkerPin) {
                pinLines.push(child);
            }
        });
        
        // Remove event markers from Moon plane
        if (moonPlane) {
            moonPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // Remove event markers from Mars plane
        if (marsPlane) {
            marsPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // If no markers to remove, return immediately
        if (eventMarkers.length === 0 && pinLines.length === 0) {
            return Promise.resolve();
        }
        
        // If animating, shrink markers before removing
        if (animate && eventMarkers.length > 0) {
            return new Promise((resolve) => {
                const duration = 300; // 300ms animation
                const startTime = performance.now();
                
                // Mark markers as animating to prevent pulse animation interference
                eventMarkers.forEach(marker => {
                    if (marker.userData) {
                        marker.userData.isAnimating = true;
                    }
                });
                
                // Store initial scales
                const initialScales = eventMarkers.map(marker => marker.scale.x);
                
                const animateShrink = () => {
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Easing function (ease in)
                    const easeProgress = progress * progress;
                    
                    // Brightness flash - bell curve that peaks in the middle
                    const peakIntensity = 2.0; // Yellow glow peak
                    const glowProgress = Math.sin(progress * Math.PI);
                    const currentIntensity = peakIntensity * glowProgress;
                    
                    // Animate scale from current to 0
                    eventMarkers.forEach((marker, index) => {
                        const scale = initialScales[index] * (1 - easeProgress);
                        marker.scale.set(scale, scale, scale);
                        
                        // Animate emissive intensity (yellow flash)
                        if (marker.material && marker.material.emissiveIntensity !== undefined) {
                            marker.material.emissiveIntensity = currentIntensity;
                            marker.material.needsUpdate = true;
                        }
                    });
                    
                    // Also shrink pin lines (opacity fade)
                    pinLines.forEach(line => {
                        if (line.material) {
                            line.material.opacity = 1 - easeProgress;
                            line.material.transparent = true;
                        }
                    });
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateShrink);
                    } else {
                        // Animation complete, now remove everything
                        eventMarkers.forEach(obj => {
                            if (obj.userData) {
                                obj.userData.isAnimating = false;
                            }
                            // Reset emissive intensity before disposal
                            if (obj.material && obj.material.emissiveIntensity !== undefined) {
                                obj.material.emissiveIntensity = 0.0;
                            }
                            if (obj.parent) {
                                obj.parent.remove(obj);
                            }
                            if (obj.geometry) obj.geometry.dispose();
                            if (obj.material) obj.material.dispose();
                        });
                        
                        pinLines.forEach(obj => {
                            if (obj.parent) {
                                obj.parent.remove(obj);
                            }
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        
        // Remove from markers array
        const eventMarkerIndices = [];
        markers.forEach((marker, index) => {
            if (marker.userData && marker.userData.isEventMarker) {
                eventMarkerIndices.push(index);
            }
        });
        
        // Remove in reverse order to maintain indices
        eventMarkerIndices.reverse().forEach(index => {
            markers.splice(index, 1);
        });
                        
                        resolve();
                    }
                };
                
                animateShrink();
            });
        } else {
            // Remove immediately without animation
            eventMarkers.forEach(obj => {
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            
            pinLines.forEach(obj => {
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            
            // Remove from markers array
            const eventMarkerIndices = [];
            markers.forEach((marker, index) => {
                if (marker.userData && marker.userData.isEventMarker) {
                    eventMarkerIndices.push(index);
                }
            });
            
            // Remove in reverse order to maintain indices
            eventMarkerIndices.reverse().forEach(index => {
                markers.splice(index, 1);
            });
            
            return Promise.resolve();
        }
    }
    
    /**
     * Refresh event markers (remove old, add new for current page)
     */
    refreshEventMarkers() {
        // Check if globe is initialized before proceeding
        const globe = this.sceneModel.getGlobe();
        if (!globe) {
            console.warn('GlobeView: Cannot refresh event markers - globe not initialized yet');
            return;
        }
        
        // Animate removal, then add new markers with animation
        // Note: addEventMarkers now checks filters and sets initial locked state,
        // so markers appear in the correct state from the start
        this.removeEventMarkers(true).then(() => {
            return this.addEventMarkers(true);
        }).then(() => {
            // Filters are already applied during addEventMarkers, but call applyFilters
            // to ensure consistency and update number buttons
        this.applyFilters();
            
            // Update plane visibility based on current page events
            if (window.globeController && typeof window.globeController.updatePlaneVisibility === 'function') {
                window.globeController.updatePlaneVisibility();
            }
        });
    }
    
    /**
     * Apply active filters to event markers
     * Locks events that don't match any selected filter
     */
    applyFilters() {
        const activeFilters = this.sceneModel.activeFilters;
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        if (!globe) return;
        
        // If no filters active, unlock all
        if (activeFilters.size === 0) {
            this.unlockAllEvents();
            return;
        }
        
        // Helper function to check and lock/unlock a marker
        const processMarker = (child) => {
            if (child.userData && child.userData.isEventMarker) {
                const event = child.userData.event;
                const eventHeroFilters = event.filters || [];
                const eventFactionFilters = event.factions || [];
                
                // Check if event has at least one matching hero or faction filter
                const hasMatchingHero = eventHeroFilters.some(filter => activeFilters.has(filter));
                const hasMatchingFaction = eventFactionFilters.some(faction => activeFilters.has(faction));
                const hasMatchingFilter = hasMatchingHero || hasMatchingFaction;
                
                if (hasMatchingFilter) {
                    // Unlock if it matches
                    this.unlockEvent(child);
                } else {
                    // Lock if it doesn't match
                    this.lockEvent(child);
                }
            }
        };
        
        // Check event markers on the globe (Earth events)
        globe.traverse(processMarker);
        
        // Check event markers on the Moon plane
        if (moonPlane) {
            moonPlane.traverse(processMarker);
        }
        
        // Check event markers on the Mars plane
        if (marsPlane) {
            marsPlane.traverse(processMarker);
        }
        
        // Update number buttons after filters are applied
        // Use a small delay to ensure markers are locked before checking
        setTimeout(() => {
            if (window.globeController && window.globeController.uiView) {
                // Call updateNumberButtons if it exists (stored from setupEventNumberButtons)
                if (window.globeController.uiView.updateNumberButtons && 
                    typeof window.globeController.uiView.updateNumberButtons === 'function') {
                    console.log('[GlobeView] Calling updateNumberButtons after applyFilters');
                    window.globeController.uiView.updateNumberButtons();
                } else {
                    console.warn('[GlobeView] updateNumberButtons function not found!');
                }
            }
        }, 50); // Small delay to ensure markers are processed
    }
    
    /**
     * Lock an event marker (dark orange/near black, smaller, no interactions)
     * Animates the transition smoothly
     */
    lockEvent(marker) {
        if (!marker || !marker.userData) return;
        
        marker.userData.isLocked = true;
        
        // Store original scale if not already stored
        if (!marker.userData.originalScale) {
            marker.userData.originalScale = marker.scale.x;
        }
        
        // Store original color if not already stored
        if (!marker.userData.originalColor) {
            marker.userData.originalColor = marker.userData.isInteractive === false ? 0xff69b4 : 0xff6600;
        }
        
        // Get current values
        const startScale = marker.scale.x;
        const targetScale = 0.75;
        const startColor = new THREE.Color();
        if (marker.material) {
            startColor.copy(marker.material.color);
        }
        const targetColor = new THREE.Color(0x331100); // Dark orange/near black
        
        // Mark as animating to prevent pulse interference
        marker.userData.isAnimating = true;
        
        const duration = 300; // 300ms animation
        const startTime = performance.now();
        
        const animate = () => {
            // Check if animation was cancelled
            if (!marker.userData || !marker.userData.isAnimating || marker.userData.isLocked === false) {
                return;
            }
            
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease in)
            const easeProgress = progress * progress;
            
            // Interpolate scale
            const currentScale = startScale + (targetScale - startScale) * easeProgress;
            marker.scale.set(currentScale, currentScale, currentScale);
            
            // Interpolate color
            if (marker.material) {
                marker.material.color.lerpColors(startColor, targetColor, easeProgress);
                marker.material.needsUpdate = true;
            }
            
            // Interpolate pin line color
        if (marker.userData.pinLine && marker.userData.pinLine.material) {
                marker.userData.pinLine.material.color.lerpColors(
                    new THREE.Color(0xff6600), 
                    targetColor, 
                    easeProgress
                );
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - ensure final values
                marker.scale.set(targetScale, targetScale, targetScale);
                if (marker.material) {
                    marker.material.color.copy(targetColor);
                }
                if (marker.userData.pinLine && marker.userData.pinLine.material) {
                    marker.userData.pinLine.material.color.copy(targetColor);
                }
                marker.userData.isAnimating = false;
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Unlock an event marker (restore to normal)
     * Animates the transition smoothly
     */
    unlockEvent(marker) {
        if (!marker || !marker.userData) return;
        
        marker.userData.isLocked = false;
        
        // Get current values
        const startScale = marker.scale.x;
        const originalScale = marker.userData.originalScale || 1.0;
        const startColor = new THREE.Color();
        if (marker.material) {
            startColor.copy(marker.material.color);
        }
            const restoreColor = marker.userData.originalColor || 
                                 (marker.userData.isInteractive === false ? 0xff69b4 : 0xff6600);
        const targetColor = new THREE.Color(restoreColor);
        
        // Mark as animating to prevent pulse interference
        marker.userData.isAnimating = true;
        
        const duration = 300; // 300ms animation
        const startTime = performance.now();
        
        const animate = () => {
            // Check if animation was cancelled
            if (!marker.userData || !marker.userData.isAnimating || marker.userData.isLocked === true) {
                return;
            }
            
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate scale
            const currentScale = startScale + (originalScale - startScale) * easeProgress;
            marker.scale.set(currentScale, currentScale, currentScale);
            
            // Interpolate color
            if (marker.material) {
                marker.material.color.lerpColors(startColor, targetColor, easeProgress);
                marker.material.needsUpdate = true;
            }
            
            // Interpolate pin line color
        if (marker.userData.pinLine && marker.userData.pinLine.material) {
                marker.userData.pinLine.material.color.lerpColors(
                    startColor,
                    new THREE.Color(0xff6600), // Orange for pin lines
                    easeProgress
                );
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - ensure final values
                marker.scale.set(originalScale, originalScale, originalScale);
                if (marker.material) {
                    marker.material.color.copy(targetColor);
                }
                if (marker.userData.pinLine && marker.userData.pinLine.material) {
                    marker.userData.pinLine.material.color.setHex(0xff6600); // Orange
                }
                marker.userData.isAnimating = false;
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Unlock all event markers
     */
    unlockAllEvents() {
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        if (!globe) return;
        
        // Helper function to unlock a marker
        const unlockMarker = (child) => {
            if (child.userData && child.userData.isEventMarker) {
                this.unlockEvent(child);
            }
        };
        
        // Unlock event markers on the globe (Earth events)
        globe.traverse(unlockMarker);
        
        // Unlock event markers on the Moon plane
        if (moonPlane) {
            moonPlane.traverse(unlockMarker);
        }
        
        // Unlock event markers on the Mars plane
        if (marsPlane) {
            marsPlane.traverse(unlockMarker);
        }
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
            marker.userData = { 
                seaport: seaport.name,
                lat: seaport.lat,
                lon: seaport.lon,
                isSeaportMarker: true,
                hasConnections: hasConnections
            };
            
            marker.visible = false; // Hide port markers (debug only)
            globe.add(marker);
            
            // Add pin line
            const linePoints = [
                latLonToVector3(seaport.lat, seaport.lon, 1.0),
                position
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMaterial = new THREE.LineBasicMaterial({ color: pinColor });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData.isSeaportMarkerPin = true;
            line.visible = false; // Hide port marker pins (debug only)
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

