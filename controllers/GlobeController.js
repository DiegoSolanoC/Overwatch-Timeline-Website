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

export class GlobeController {
    constructor() {
        // Initialize models
        this.dataModel = new DataModel();
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
    async init() {
        const container = document.getElementById('globe-container');
        if (!container) {
            console.error('Globe container not found');
            return;
        }

        // Load data
        try {
            await this.dataModel.loadData();
        } catch (error) {
            console.error('Failed to load data:', error);
            return;
        }

        // Initialize scene
        this.sceneModel.initScene(container);

        // Initialize globe with texture
        this.globeView.initGlobe(() => {
            // Start animation once texture is loaded
            this.animate();
        });

        // Add starfield
        this.globeView.addStarfield();

        // Add markers
        this.globeView.addCityMarkers();
        this.globeView.addSeaportMarkers();
        this.globeView.addEventMarkers();

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

        // Start spawning transport systems
        this.transportController.spawnTrainsRandomly();
        this.trainSpawnInterval = this.transportController.trainSpawnInterval;
        this.transportController.spawnPlanesRandomly();
        this.transportController.spawnBoatsRandomly();
        
        // Initialize satellites
        this.transportController.initializeSatellites();
        
        // Add satellite markers after satellites are created
        setTimeout(() => {
            const satellites = this.transportModel.getSatellites();
            this.globeView.addSatelliteMarkers(satellites);
        }, 100);

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
            console.log('⏸️ Vehicle spawning paused - window lost focus (transport remains visible)');
        });
        
        // Resume spawning when window regains focus
        window.addEventListener('focus', () => {
            // Set page visible to true to resume spawning
            this.sceneModel.setPageVisible(true);
            console.log('🚄 Vehicle spawning resumed - window regained focus');
        });
    }

    /**
     * Main animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        const scene = this.sceneModel.getScene();
        const camera = this.sceneModel.getCamera();
        const renderer = this.sceneModel.getRenderer();
        const globe = this.sceneModel.getGlobe();

        if (!scene || !camera || !renderer || !globe) return;
        
        // Delta time tracking to prevent catch-up when tab regains focus
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // If tab was hidden for more than 1 second, reset to prevent catch-up
        // This prevents vehicles from spawning all at once when tab regains focus
        if (deltaTime > 1000) {
            this.lastFrameTime = currentTime;
            // Skip this frame to prevent massive catch-up
            return;
        }
        
        this.lastFrameTime = currentTime;

        // Auto-rotate - if viewing event, recenter to it; otherwise normal rotation
        if (this.sceneModel.getAutoRotate() && this.sceneModel.getAutoRotateEnabled()) {
            const eventMarker = this.sceneModel.eventMarker;
            if (eventMarker) {
                // Recenter to event marker
                const markerWorldPos = new THREE.Vector3();
                eventMarker.getWorldPosition(markerWorldPos);
                const targetDirection = markerWorldPos.clone().normalize();
                
                // Calculate current direction the camera is looking at (from globe center)
                const cameraDirection = camera.position.clone().normalize();
                
                // Calculate rotation needed to face the marker
                const currentLat = Math.asin(cameraDirection.y);
                const currentLon = Math.atan2(cameraDirection.z, cameraDirection.x);
                const targetLat = Math.asin(targetDirection.y);
                const targetLon = Math.atan2(targetDirection.z, targetDirection.x);
                
                // Smoothly rotate globe to face marker
                const latDiff = targetLat - currentLat;
                const lonDiff = targetLon - currentLon;
                
                // Normalize lon difference to shortest path
                let normalizedLonDiff = lonDiff;
                if (normalizedLonDiff > Math.PI) normalizedLonDiff -= 2 * Math.PI;
                if (normalizedLonDiff < -Math.PI) normalizedLonDiff += 2 * Math.PI;
                
                // Calculate total angle difference
                const angleDiff = Math.abs(latDiff) + Math.abs(normalizedLonDiff);
                
                // Track initial angle difference when recentering starts
                if (this.initialAngleDiff === null || angleDiff > this.initialAngleDiff * 1.1) {
                    // Reset if we're starting a new recentering (angle increased, meaning we moved away)
                    this.initialAngleDiff = angleDiff;
                    this.fadeInTriggered = false;
                }
                
                // Constant speed rotation (not proportional - moves fixed amount per frame)
                const constantSpeed = 0.004; // Fixed rotation speed per frame (more gradual, slower)
                
                // Calculate 90% completion threshold (10% of initial angle remaining)
                const fadeInThreshold = this.initialAngleDiff * 0.1; // 90% done = 10% remaining
                const completeThreshold = 0.01; // Stop recentering when fully done
                
                // Check if we should start fading in (90% done) - only trigger once
                if (!this.fadeInTriggered && angleDiff <= fadeInThreshold && angleDiff > completeThreshold) {
                    // 90% done - start fading in image if it was hidden
                    this.fadeInTriggered = true; // Mark as triggered to prevent multiple calls
                    
                    const eventImage = document.getElementById('eventImage');
                    const eventImageOverlay = document.getElementById('eventImageOverlay');
                    if (eventImage && eventImageOverlay && eventImageOverlay.classList.contains('open')) {
                        // Check if image/overlay has fade-out class (was hidden during drag)
                        const hasFadeOut = eventImage.classList.contains('fade-out') || 
                                          eventImageOverlay.classList.contains('fade-out');
                        
                        if (hasFadeOut) {
                            // Image was hidden, fade it back in with proper animation
                            if (eventImage.src && eventImage.src !== window.location.href && eventImage.style.display !== 'none') {
                                // Remove fade-out class
                                eventImage.classList.remove('fade-out');
                                eventImageOverlay.classList.remove('fade-out');
                                
                                // Set opacity to 0 to start fade-in from beginning
                                eventImage.style.opacity = '0';
                                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)'; // Transparent for image
                                
                                // Force reflow to ensure opacity 0 is applied
                                void eventImage.offsetHeight;
                                
                                // Add fade-in class to trigger CSS transition
                                eventImage.classList.add('fade-in');
                            } else {
                                // No image - fade in black overlay
                                eventImageOverlay.classList.remove('fade-out');
                                eventImageOverlay.style.opacity = '0';
                                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)'; // Black background
                                
                                // Force reflow to ensure opacity 0 is applied
                                void eventImageOverlay.offsetHeight;
                                
                                // Add fade-in class to trigger CSS transition
                                eventImageOverlay.classList.add('fade-in');
                            }
                        }
                    }
                }
                
                if (angleDiff > completeThreshold) {
                    // Still recentering - continue movement
                    // Calculate direction vector
                    const totalDiff = Math.sqrt(latDiff * latDiff + normalizedLonDiff * normalizedLonDiff);
                    if (totalDiff > 0) {
                        // Normalize direction and apply constant speed
                        const dirX = latDiff / totalDiff;
                        const dirY = normalizedLonDiff / totalDiff;
                        
                        // Move fixed amount in direction of target
                        const moveAmount = Math.min(constantSpeed, totalDiff); // Don't overshoot
                        globe.rotation.x += dirX * moveAmount;
                        globe.rotation.y += dirY * moveAmount;
                    }
                } else {
                    // Close enough - stop recentering
                    this.sceneModel.setAutoRotate(false);
                    // Reset tracking for next recentering
                    this.initialAngleDiff = null;
                    this.fadeInTriggered = false;
                }
                
                // Limit vertical rotation
                globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            } else {
                // Normal auto-rotate
                globe.rotation.y += 0.002;
            }
        }

        // Apply rotation momentum
        const velocity = this.sceneModel.getRotationVelocity();
        if (Math.abs(velocity.x) > 0.001 || Math.abs(velocity.y) > 0.001) {
            globe.rotation.x += velocity.x;
            globe.rotation.y += velocity.y;
            globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            
            // Damping
            this.sceneModel.setRotationVelocity({
                x: velocity.x * 0.95,
                y: velocity.y * 0.95
            });
        }

        // Update transport systems
        this.transportController.updateTrains();
        this.transportController.updatePlanes();
        this.transportController.updateBoats();
        this.transportController.updateSatellites();
        // Satellite trails now use plane trail system, updated in updateTrailSegments

        // Update trails
        this.transportView.updateTrailSegments();
        this.transportView.updateBoatTrailSegments();

        // Update label position
        this.uiView.updateLabelPosition();
        
        // Update pulse rings for event markers
        if (this.interactionController) {
            this.interactionController.updatePulseRings();
            this.interactionController.updateMarkerPulse();
        }
        
        // Check and auto-show image if conditions are met
        this.uiView.checkAndAutoShowImage();

        // Render
        renderer.render(scene, camera);
    }

    /**
     * Cleanup and stop animation
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.trainSpawnInterval) {
            clearInterval(this.trainSpawnInterval);
        }
    }
}

