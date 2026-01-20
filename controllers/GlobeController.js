/**
 * GlobeController - Main controller that orchestrates the globe application
 */
import { DataModel } from '../models/DataModel.js';
import { TransportModel } from '../models/TransportModel.js';
import { SceneModel } from '../models/SceneModel.js';
import { GlobeView } from '../views/GlobeView.js';
import { TransportView } from '../views/TransportView.js';
import { UIView } from '../views/UIView.js';
import { RouteController } from './RouteController.js';
import { TransportController } from './TransportController.js';
import { InteractionController } from './InteractionController.js';
import { TransportConfig } from './config/TransportConfig.js';
import { EventBus, AppEvents } from '../utils/EventBus.js';
import { ErrorLogger } from '../utils/ErrorLogger.js';

export class GlobeController {
    // Constants for plane positioning
    static PLANE_HORIZONTAL_OFFSET = 1.5; // Distance from globe center
    static MOON_VERTICAL_OFFSET = 0.3; // Moon above center
    static MARS_VERTICAL_OFFSET = -0.3; // Mars below center

    constructor() {
        // Initialize models
        this.dataModel = new DataModel();
        this.isCleanedUp = false; // Flag to prevent animation loop from continuing after cleanup
        this.transportModel = new TransportModel();
        this.sceneModel = new SceneModel();
        
        // Initialize views
        this.globeView = new GlobeView(this.sceneModel, this.dataModel);
        this.transportView = new TransportView(this.sceneModel, this.transportModel);
        this.uiView = new UIView(this.sceneModel, this.dataModel, this.globeView);
        
        // Initialize controllers
        this.routeController = new RouteController(this.transportModel);
        this.transportController = new TransportController(
            this.sceneModel,
            this.transportModel,
            this.routeController,
            this.transportView,
            this.globeView,
            this.dataModel
        );
        this.interactionController = new InteractionController(this.sceneModel, this.uiView);
        
        // Animation state
        this.animationId = null;
        this.trainSpawnInterval = null;
        this.lastFrameTime = performance.now();
        this.isTabVisible = true;
        this.initialAngleDiff = null; // Track initial angle when recentering starts
        this.fadeInTriggered = false; // Track if fade-in has been triggered for current recentering
    }

    /**
     * Initialize the globe application
     */
    /**
     * Load data and sync with EventManager
     */
    async loadDataAndSyncEvents() {
        try {
            await this.dataModel.loadData();
            
            // ALWAYS check for EventManager events (source of truth for user-created events)
            // Check immediately and also listen for events loaded event
            if (window.eventManager && window.eventManager.events) {
                this.dataModel.events = [...window.eventManager.events];
                console.log('GlobeController: Using', window.eventManager.events.length, 'events from EventManager');
            } else {
                // If EventManager not ready yet, listen for events loaded event
                EventBus.once(AppEvents.EVENTS_LOADED, () => {
                    if (window.eventManager && window.eventManager.events) {
                        this.dataModel.events = [...window.eventManager.events];
                        console.log('GlobeController: Synced', window.eventManager.events.length, 'events from EventManager (via EventBus)');
                        // Refresh markers if already added
                        if (this.globeView) {
                            this.globeView.refreshEventMarkers();
                        }
                    }
                });
            }
        } catch (error) {
            ErrorLogger.fatal('GlobeController', 'Failed to load data', error);
            throw error;
        }
    }

    /**
     * Initialize scene and globe
     */
    initializeSceneAndGlobe(container) {
        // Initialize scene
        this.sceneModel.initScene(container);

        // Initialize globe with texture
        this.globeView.initGlobe(() => {
            // Start animation once texture is loaded
            this.animate();
            
            // Emit event when planes are ready (after they're added to scene)
            EventBus.emit(AppEvents.PLANES_READY);
        });
        
        // Position Moon/Mars panels when they're ready
        // (planes are created synchronously in initGlobe)
        EventBus.once(AppEvents.PLANES_READY, () => {
            const isMobile = window.innerWidth <= TransportConfig.MOBILE.WIDTH_THRESHOLD;
            const isPortrait = container.clientHeight > container.clientWidth;
            const isMobilePortrait = isMobile && isPortrait;
            console.log('🌍 Initial panel positioning - Window:', window.innerWidth, 'x', window.innerHeight);
            console.log('🌍 Container:', container.clientWidth, 'x', container.clientHeight);
            console.log('🌍 Mobile:', isMobile, 'Portrait:', isPortrait, 'Mobile Portrait:', isMobilePortrait);
            this.interactionController.updatePlanesPosition(isMobilePortrait);
        });
    }

    /**
     * Add visual elements (starfield, markers)
     */
    addVisualElements() {
        // Add starfield
        this.globeView.addStarfield();

        // Add markers
        this.globeView.addCityMarkers();
        this.globeView.addSeaportMarkers();
        this.globeView.addEventMarkers();
        
        // Update plane visibility based on initial page
        this.updatePlaneVisibility();
        
        // ALWAYS sync with EventManager after markers are added (final check)
        // Listen for events loaded event for reliable synchronization
        const finalSync = () => {
            if (window.eventManager && window.eventManager.events) {
                this.dataModel.events = [...window.eventManager.events];
                this.globeView.refreshEventMarkers();
                console.log('GlobeController: Final sync -', window.eventManager.events.length, 'events from EventManager');
            }
        };
        finalSync(); // Try immediately
        
        // Subscribe to events loaded event for future updates
        EventBus.on(AppEvents.EVENTS_LOADED, finalSync);
    }

    /**
     * Setup connection lines and route graphs
     */
    setupRoutesAndConnections() {
        // Add connection lines (with callbacks to store route curves)
        this.globeView.addConnectionLines((routeData) => {
            this.transportModel.addRouteCurve(routeData);
        });

        this.globeView.addSecondaryConnectionLines();

        this.globeView.addSeaportConnectionLines((routeData) => {
            this.transportModel.addBoatRouteCurve(routeData);
        });

        // Build route graphs
        this.routeController.buildRouteGraph();
        this.routeController.buildBoatRouteGraph();
    }

    /**
     * Setup controls and UI
     */
    setupControlsAndUI(container) {
        // Setup controls
        this.interactionController.setupControls(container);

        // Setup UI toggles
        this.uiView.setupAutoRotateToggle();
        this.uiView.setupHyperloopToggle(() => {
            this.transportView.updateHyperloopVisibility();
        });
        
        // Setup event pagination
        this.uiView.setupEventPagination(() => {
            // Refresh event markers when page changes
            this.globeView.refreshEventMarkers();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.interactionController.onWindowResize();
        });

        // Setup page visibility tracking
        this.setupPageVisibilityTracking();
    }

    /**
     * Start transport systems
     */
    startTransportSystems() {
        // Start spawning transport systems
        this.transportController.spawnTrainsRandomly();
        this.trainSpawnInterval = this.transportController.trainSpawnInterval;
        this.transportController.spawnPlanesRandomly();
        this.transportController.spawnBoatsRandomly();
        
        // Initialize satellites
        this.transportController.initializeSatellites();
        
        // Add satellite markers when transport is ready
        EventBus.once(AppEvents.TRANSPORT_READY, () => {
            const satellites = this.transportModel.getSatellites();
            this.globeView.addSatelliteMarkers(satellites);
        });
    }

    async init() {
        const container = document.getElementById('globe-container');
        if (!container) {
            console.error('Globe container not found');
            return;
        }

        // Load data and sync with EventManager
        await this.loadDataAndSyncEvents();

        // Initialize scene and globe
        this.initializeSceneAndGlobe(container);

        // Add visual elements
        this.addVisualElements();

        // Setup routes and connections
        this.setupRoutesAndConnections();

        // Setup controls and UI
        this.setupControlsAndUI(container);

        // Start transport systems
        this.startTransportSystems();
    }

    /**
     * Setup page visibility tracking
     */
    setupPageVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            const isVisible = !document.hidden;
            this.sceneModel.setPageVisible(isVisible);
            this.isTabVisible = isVisible;
            
            if (!isVisible) {
                // Pause ALL spawning when tab is hidden to prevent accumulation
                if (this.trainSpawnInterval) {
                    clearInterval(this.trainSpawnInterval);
                    this.trainSpawnInterval = null;
                }
                // Clear plane and boat intervals from TransportController
                if (this.transportController.planeSpawnInterval) {
                    clearInterval(this.transportController.planeSpawnInterval);
                    this.transportController.planeSpawnInterval = null;
                }
                if (this.transportController.boatSpawnInterval) {
                    clearInterval(this.transportController.boatSpawnInterval);
                    this.transportController.boatSpawnInterval = null;
                }
            } else {
                // Tab became visible - restart spawning with fresh intervals
                // Reset last frame time to prevent catch-up animation
                this.lastFrameTime = performance.now();
                
                // Restart spawning (they check isPageVisible internally, so safe to restart)
                if (!this.trainSpawnInterval) {
                    this.transportController.spawnTrainsRandomly();
                    this.trainSpawnInterval = this.transportController.trainSpawnInterval;
                }
                if (!this.transportController.planeSpawnInterval) {
                    this.transportController.spawnPlanesRandomly();
                }
                if (!this.transportController.boatSpawnInterval) {
                    this.transportController.spawnBoatsRandomly();
                }
            }
        });
        
        // Prevent spawning when window loses focus (but keep transport visible)
        window.addEventListener('blur', () => {
            // Set page visible to false to prevent spawning (spawn functions check isPageVisible)
            this.sceneModel.setPageVisible(false);
            // console.log('⏸️ Vehicle spawning paused - window lost focus (transport remains visible)');
        });
        
        // Resume spawning when window regains focus
        window.addEventListener('focus', () => {
            // Set page visible to true to resume spawning
            this.sceneModel.setPageVisible(true);
            // console.log('🚄 Vehicle spawning resumed - window regained focus');
        });
    }

    /**
     * Main animation loop - delegates to smaller, focused methods
     */
    animate() {
        // Stop animation if cleanup has been called
        if (this.isCleanedUp) {
            return;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());

        const scene = this.sceneModel.getScene();
        const camera = this.sceneModel.getCamera();
        const renderer = this.sceneModel.getRenderer();
        const globe = this.sceneModel.getGlobe();

        if (!scene || !camera || !renderer || !globe || this.isCleanedUp) return;
        
        // Check delta time and prevent catch-up
        if (!this.handleDeltaTime()) {
            return; // Skip frame if tab was hidden too long
        }

        // Update plane positions
        this.updatePlanePositions(camera);

        // Handle rotation (auto-rotate or momentum)
        this.handleRotation(globe, camera);

        // Update all transport systems
        this.updateAllTransport();

        // Update trails
        this.updateTrails();

        // Update UI elements
        this.updateUIElements();

        // Render scene
        renderer.render(scene, camera);
    }

    /**
     * Handle delta time tracking to prevent catch-up
     * @returns {boolean} - false if frame should be skipped
     */
    handleDeltaTime() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // If tab was hidden for more than 1 second, reset to prevent catch-up
        if (deltaTime > 1000) {
            this.lastFrameTime = currentTime;
            return false; // Skip this frame
        }
        
        this.lastFrameTime = currentTime;
        return true;
    }

    /**
     * Handle rotation (auto-rotate or momentum)
     */
    handleRotation(globe, camera) {
        if (this.sceneModel.getAutoRotate() && this.sceneModel.getAutoRotateEnabled()) {
            this.handleAutoRotate(globe, camera);
        }
        
        this.applyRotationMomentum(globe);
    }

    /**
     * Handle auto-rotation logic
     */
    handleAutoRotate(globe, camera) {
        const eventMarker = this.sceneModel.eventMarker;
        const config = TransportConfig.AUTO_ROTATE;
        
        if (eventMarker) {
            // Recenter to event marker
            this.recenterToMarker(globe, camera, eventMarker, config);
        } else {
            // Normal auto-rotate
            globe.rotation.y += config.SPEED;
        }
    }

    /**
     * Recenter globe to focus on event marker
     */
    recenterToMarker(globe, camera, eventMarker, config) {
        const markerWorldPos = new THREE.Vector3();
        eventMarker.getWorldPosition(markerWorldPos);
        const targetDirection = markerWorldPos.clone().normalize();
        
        const cameraDirection = camera.position.clone().normalize();
        
        // Calculate rotation needed
        const currentLat = Math.asin(cameraDirection.y);
        const currentLon = Math.atan2(cameraDirection.z, cameraDirection.x);
        const targetLat = Math.asin(targetDirection.y);
        const targetLon = Math.atan2(targetDirection.z, targetDirection.x);
        
        const latDiff = targetLat - currentLat;
        let lonDiff = targetLon - currentLon;
        
        // Normalize longitude difference to shortest path
        if (lonDiff > Math.PI) lonDiff -= 2 * Math.PI;
        if (lonDiff < -Math.PI) lonDiff += 2 * Math.PI;
        
        const angleDiff = Math.abs(latDiff) + Math.abs(lonDiff);
        
        // Track initial angle difference
        if (this.initialAngleDiff === null || angleDiff > this.initialAngleDiff * 1.1) {
            this.initialAngleDiff = angleDiff;
            this.fadeInTriggered = false;
        }
        
        // Check if we should fade in image (90% complete)
        const fadeInThreshold = this.initialAngleDiff * config.FADE_IN_THRESHOLD;
        if (!this.fadeInTriggered && angleDiff <= fadeInThreshold && angleDiff > config.COMPLETE_THRESHOLD) {
            this.fadeInEventImage();
            this.fadeInTriggered = true;
        }
        
        // Continue recentering or stop when complete
        if (angleDiff > config.COMPLETE_THRESHOLD) {
            this.continueRecentering(globe, latDiff, lonDiff, config.RECENTER_SPEED);
        } else {
            this.stopRecentering();
        }
        
        // Limit vertical rotation
        globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
    }

    /**
     * Continue recentering movement
     */
    continueRecentering(globe, latDiff, lonDiff, speed) {
        const totalDiff = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
        if (totalDiff > 0) {
            const dirX = latDiff / totalDiff;
            const dirY = lonDiff / totalDiff;
            const moveAmount = Math.min(speed, totalDiff);
            globe.rotation.x += dirX * moveAmount;
            globe.rotation.y += dirY * moveAmount;
        }
    }

    /**
     * Stop recentering and reset tracking
     */
    stopRecentering() {
        this.sceneModel.setAutoRotate(false);
        this.initialAngleDiff = null;
        this.fadeInTriggered = false;
    }

    /**
     * Fade in event image after recentering is 90% complete
     */
    fadeInEventImage() {
        const eventImage = document.getElementById('eventImage');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        
        if (!eventImage || !eventImageOverlay || !eventImageOverlay.classList.contains('open')) {
            return;
        }
        
        const hasFadeOut = eventImage.classList.contains('fade-out') || 
                          eventImageOverlay.classList.contains('fade-out');
        
        if (!hasFadeOut) return;
        
        // Remove fade-out classes
        eventImage.classList.remove('fade-out');
        eventImageOverlay.classList.remove('fade-out');
        
        if (eventImage.src && eventImage.src !== window.location.href && eventImage.style.display !== 'none') {
            // Fade in image
            eventImage.style.opacity = '0';
            eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
            void eventImage.offsetHeight; // Force reflow
            eventImage.classList.add('fade-in');
        } else {
            // Fade in black overlay (no image)
            eventImageOverlay.style.opacity = '0';
            eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            void eventImageOverlay.offsetHeight; // Force reflow
            eventImageOverlay.classList.add('fade-in');
        }
    }

    /**
     * Apply rotation momentum (damping)
     */
    applyRotationMomentum(globe) {
        const velocity = this.sceneModel.getRotationVelocity();
        
        if (Math.abs(velocity.x) > 0.001 || Math.abs(velocity.y) > 0.001) {
            globe.rotation.x += velocity.x;
            globe.rotation.y += velocity.y;
            globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            
            // Damping (95% per frame)
            this.sceneModel.setRotationVelocity({
                x: velocity.x * 0.95,
                y: velocity.y * 0.95
            });
        }
    }

    /**
     * Update all transport systems
     */
    updateAllTransport() {
        this.transportController.updateTrains();
        this.transportController.updatePlanes();
        this.transportController.updateBoats();
        this.transportController.updateSatellites();
    }

    /**
     * Update trail segments
     */
    updateTrails() {
        this.transportView.updateTrailSegments();
        this.transportView.updateBoatTrailSegments();
    }

    /**
     * Update UI elements
     */
    updateUIElements() {
        this.uiView.updateLabelPosition();
        
        if (this.interactionController) {
            this.interactionController.updatePulseRings();
            this.interactionController.updateMarkerPulse();
            this.interactionController.updateStationPinLines();
        }
        
        this.uiView.checkAndAutoShowImage();
    }


    /**
     * Update Moon/Mars plane positions to stay on camera's right side
     * @param {THREE.Camera} camera - The camera object
     */
    updatePlanePositions(camera) {
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        if (!moonPlane || !marsPlane || !camera) {
            if (!moonPlane) console.warn('Moon plane not found');
            if (!marsPlane) console.warn('Mars plane not found');
            if (!camera) console.warn('Camera not found');
            return;
        }
        
        // Get camera position
        const cameraPosition = camera.position.clone();
        
        // Update camera matrix to ensure it's current
        camera.updateMatrixWorld();
        
        // Get camera's right, up, and forward vectors from its matrix
        // Column 0 = right, Column 1 = up, Column 2 = forward (negative)
        const right = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        const forward = new THREE.Vector3();
        
        right.setFromMatrixColumn(camera.matrixWorld, 0);
        cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
        forward.setFromMatrixColumn(camera.matrixWorld, 2);
        
        // Normalize vectors
        right.normalize();
        cameraUp.normalize();
        forward.normalize();
        
        // Position planes to the right of the camera, offset from globe center
        // Calculate plane positions: origin + (right * horizontalOffset) + (cameraUp * verticalOffset)
        const moonPosition = new THREE.Vector3()
            .addScaledVector(right, GlobeController.PLANE_HORIZONTAL_OFFSET)
            .addScaledVector(cameraUp, GlobeController.MOON_VERTICAL_OFFSET);
        
        const marsPosition = new THREE.Vector3()
            .addScaledVector(right, GlobeController.PLANE_HORIZONTAL_OFFSET)
            .addScaledVector(cameraUp, GlobeController.MARS_VERTICAL_OFFSET);
        
        // Update plane positions
        moonPlane.position.copy(moonPosition);
        marsPlane.position.copy(marsPosition);
        
        // Update plane rotations to face camera
        moonPlane.lookAt(cameraPosition);
        marsPlane.lookAt(cameraPosition);
        
    }


    /**
     * Update Moon/Mars plane visibility based on current page events
     * Planes are shown only if the current page has at least one event on that plane
     * Animates panels with vertical scaling (squash/stretch effect)
     */
    updatePlaneVisibility() {
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        if (!moonPlane || !marsPlane) {
            return;
        }
        
        if (!this.dataModel) {
            // Animate out if no data model
            this.animatePlaneScale(moonPlane, false);
            this.animatePlaneScale(marsPlane, false);
            return;
        }
        
        // Check if current page has Moon/Mars events
        const currentPageEvents = this.dataModel.getEventsForCurrentPage();
        
        let hasMoonEvent = false;
        let hasMarsEvent = false;
        
        currentPageEvents.forEach(event => {
            const locationType = event.locationType || 'earth';
            
            if (locationType === 'moon') {
                hasMoonEvent = true;
            } else if (locationType === 'mars') {
                hasMarsEvent = true;
            }
            
            // Also check variants for multi-events
            if (event.variants && event.variants.length > 0) {
                event.variants.forEach(variant => {
                    const variantLocationType = variant.locationType || locationType;
                    if (variantLocationType === 'moon') {
                        hasMoonEvent = true;
                    } else if (variantLocationType === 'mars') {
                        hasMarsEvent = true;
                    }
                });
            }
        });
        
        // Animate planes based on whether they have events on current page
        this.animatePlaneScale(moonPlane, hasMoonEvent);
        this.animatePlaneScale(marsPlane, hasMarsEvent);
    }
    
    /**
     * Animate plane scale vertically (squash/stretch effect)
     * @param {THREE.Mesh} plane - The plane to animate
     * @param {boolean} show - Whether to show (stretch) or hide (squash) the plane
     */
    animatePlaneScale(plane, show) {
        if (!plane || !plane.material) return;
        
        // Initialize scale if not set
        if (!plane.userData) {
            plane.userData = {};
        }
        if (plane.scale.y === undefined || isNaN(plane.scale.y)) {
            plane.scale.y = show ? 0 : 1;
        }
        
        const startScaleY = plane.scale.y;
        const targetScaleY = show ? 1 : 0;
        
        // Check if already at target state - if so, skip animation
        const scaleThreshold = 0.01;
        if (Math.abs(startScaleY - targetScaleY) < scaleThreshold) {
            // Already at target state, just ensure visibility and emissive intensity are correct
            plane.visible = show;
            if (plane.material) {
                plane.material.emissiveIntensity = 0.3; // Settled state
                plane.material.needsUpdate = true;
            }
            plane.scale.set(1, targetScaleY, 1);
            plane.updateMatrix();
            return;
        }
        
        // Check if already animating - if so, cancel and start new animation
        if (plane.userData && plane.userData.isAnimating) {
            // Cancel previous animation by clearing the flag
            plane.userData.isAnimating = false;
        }
        
        const duration = 150; // 150ms animation (faster than markers)
        const startTime = performance.now();
        
        // Store original emissive intensity (settled state)
        const settledIntensity = 0.3;
        const peakIntensity = 2.0; // Bright flash during animation
        
        // Ensure plane is visible during animation (even when scaling to 0)
        plane.visible = true;
        plane.userData.isAnimating = true;
        
        const animate = () => {
            // Check if animation was cancelled
            if (!plane.userData || !plane.userData.isAnimating) {
                return;
            }
            
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out for show, ease in for hide)
            let easeProgress;
            if (show) {
                // Ease out when stretching up
                easeProgress = 1 - Math.pow(1 - progress, 3);
            } else {
                // Ease in when squashing down
                easeProgress = progress * progress;
            }
            
            // Interpolate scale Y
            const currentScaleY = startScaleY + (targetScaleY - startScaleY) * easeProgress;
            plane.scale.set(1, currentScaleY, 1); // Keep X and Z at 1, animate Y
            
            // Animate emissive intensity - flash brighter during animation
            // Create a curve that peaks in the middle: 0 -> peak -> 0
            // Use a bell curve: sin(π * progress) gives us 0 at start/end, 1 in middle
            const glowProgress = Math.sin(progress * Math.PI);
            const currentIntensity = settledIntensity + (peakIntensity - settledIntensity) * glowProgress;
            
            if (plane.material) {
                plane.material.emissiveIntensity = currentIntensity;
                plane.material.needsUpdate = true;
            }
            
            // Force update
            plane.updateMatrix();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                plane.scale.set(1, targetScaleY, 1); // Ensure final scale is exact
                plane.visible = show; // Hide if target scale is 0
                
                // Reset emissive intensity to settled state
                if (plane.material) {
                    plane.material.emissiveIntensity = settledIntensity;
                    plane.material.needsUpdate = true;
                }
                
                if (plane.userData) {
                    plane.userData.isAnimating = false;
                }
                plane.updateMatrix();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Cleanup and stop animation
     */
    destroy() {
        // Mark as cleaned up to stop animation loop
        this.isCleanedUp = true;
        
        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clear intervals
        if (this.trainSpawnInterval) {
            clearInterval(this.trainSpawnInterval);
            this.trainSpawnInterval = null;
        }
        
        // Stop transport controller spawns
        if (this.transportController) {
            if (this.transportController.trainSpawnInterval) {
                clearInterval(this.transportController.trainSpawnInterval);
            }
            if (this.transportController.planeSpawnInterval) {
                clearInterval(this.transportController.planeSpawnInterval);
            }
            if (this.transportController.boatSpawnInterval) {
                clearInterval(this.transportController.boatSpawnInterval);
            }
        }
        
        // Dispose of Three.js resources
        const renderer = this.sceneModel?.getRenderer();
        if (renderer) {
            // Force WebGL context loss to free GPU memory
            const gl = renderer.getContext();
            if (gl && typeof gl.getExtension === 'function') {
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) {
                    loseContext.loseContext();
                }
            }
            renderer.dispose();
        }
        
        // Clear scene
        const scene = this.sceneModel?.getScene();
        if (scene) {
            scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (object.material.map) object.material.map.dispose();
                        object.material.dispose();
                    }
                }
            });
            while (scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }
        }
    }
}

