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
import { AutoRotateController } from './AutoRotateController.js';
import { PlaneManager } from './PlaneManager.js';

export class GlobeController {
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
        
        // Specialized controllers
        this.autoRotateController = new AutoRotateController(this.sceneModel);
        this.planeManager = new PlaneManager(this.sceneModel, this.dataModel);
        
        // Animation state
        this.animationId = null;
        this.trainSpawnInterval = null;
        this.lastFrameTime = performance.now();
        this.isTabVisible = true;
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
            
            // ALWAYS check for EventManager events (source of truth for user-created events)
            // Check immediately and also wait a bit in case EventManager is still loading
            if (window.eventManager && window.eventManager.events) {
                this.dataModel.events = [...window.eventManager.events];
                console.log('GlobeController: Using', window.eventManager.events.length, 'events from EventManager');
            } else {
                // If EventManager not ready yet, wait a bit and check again
                setTimeout(() => {
                    if (window.eventManager && window.eventManager.events) {
                        this.dataModel.events = [...window.eventManager.events];
                        console.log('GlobeController: Synced', window.eventManager.events.length, 'events from EventManager (delayed)');
                        // Refresh markers if already added
                        if (this.globeView) {
                            this.globeView.refreshEventMarkers();
                        }
                    }
                }, 200);
            }
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
        
        // Position Moon/Mars panels immediately after globe initialization
        // (planes are created synchronously in initGlobe, before texture load callback)
        // Use setTimeout to ensure planes are fully added to scene
        setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            const isPortrait = container.clientHeight > container.clientWidth;
            const isMobilePortrait = isMobile && isPortrait;
            console.log('🌍 Initial panel positioning - Window:', window.innerWidth, 'x', window.innerHeight);
            console.log('🌍 Container:', container.clientWidth, 'x', container.clientHeight);
            console.log('🌍 Mobile:', isMobile, 'Portrait:', isPortrait, 'Mobile Portrait:', isMobilePortrait);
            this.interactionController.updatePlanesPosition(isMobilePortrait);
        }, 50);

        // Add starfield
        this.globeView.addStarfield();

        // Add markers
        this.globeView.addCityMarkers();
        this.globeView.addSeaportMarkers();
        this.globeView.addEventMarkers();
        
        // Update plane visibility based on initial page
        // Use setTimeout to ensure planes are fully created and added to scene
        // Call multiple times to catch planes when they're ready
        const updateVisibility = () => {
            this.planeManager.updatePlaneVisibility();
        };
        setTimeout(updateVisibility, 100);
        setTimeout(updateVisibility, 300);
        setTimeout(updateVisibility, 500);
        
        // ALWAYS sync with EventManager after markers are added (final check)
        // This ensures events from EventManager are always used, even if EventManager loaded after
        const finalSync = () => {
            if (window.eventManager && window.eventManager.events) {
                this.dataModel.events = [...window.eventManager.events];
                this.globeView.refreshEventMarkers();
                console.log('GlobeController: Final sync -', window.eventManager.events.length, 'events from EventManager');
            }
        };
        finalSync(); // Try immediately
        setTimeout(finalSync, 300); // Try again after a short delay
        setTimeout(finalSync, 1000); // One more time after 1 second

        // Add connection lines (with callbacks to store route curves)
        this.globeView.addConnectionLines((routeData) => {
            this.transportModel.addRouteCurve(routeData);
        });

        this.globeView.addSecondaryConnectionLines();

        this.globeView.addSeaportConnectionLines((routeData) => {
            this.transportModel.addBoatRouteCurve(routeData);
        });

        // Build the flat-map transport lines once (straight segments + wrap)
        if (this.globeView && typeof this.globeView.renderMapTransportLines === 'function') {
            this.globeView.renderMapTransportLines();
        }

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
        });
        
        // Resume spawning when window regains focus
        window.addEventListener('focus', () => {
            // Set page visible to true to resume spawning
            this.sceneModel.setPageVisible(true);
        });
    }

    /**
     * Main animation loop
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
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;

        if (!scene || !camera || !renderer || !globe || this.isCleanedUp) return;
        
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

        // Update Moon/Mars plane positions to stay on camera's right side
        this.planeManager.updatePlanePositions(camera);

        if (!isMapView) {
            // Auto-rotate - if viewing event, recenter to it; otherwise normal rotation
            this.autoRotateController.updateAutoRotate(globe, camera);

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
        } else {
            // Map view: stop any leftover rotation momentum
            const velocity = this.sceneModel.getRotationVelocity();
            if (Math.abs(velocity.x) > 0.001 || Math.abs(velocity.y) > 0.001) {
                this.sceneModel.setRotationVelocity({ x: 0, y: 0 });
            }
            // Keep the map plane fixed (no billboard/lookAt), camera pans instead.
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
            this.interactionController.updateStationPinLines();
        }
        
        // Check and auto-show image if conditions are met
        this.uiView.checkAndAutoShowImage();

        // Render
        renderer.render(scene, camera);
    }

    /**
     * Toggle Earth view mode between globe and flat map.
     * Keeps event coordinates the same; markers are recreated onto the correct surface.
     * @param {boolean} enabled
     */
    setMapViewEnabled(enabled) {
        const globe = this.sceneModel.getGlobe();
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        if (!globe || !earthMapPlane) return;

        const isEnabled = !!enabled;
        this.sceneModel.setMapViewEnabled(isEnabled);

        // Expose mode to CSS so we can hide/show mode-specific controls (e.g. auto-rotate).
        document.body.classList.toggle('map-view-enabled', isEnabled);

        // Swap visibility (globe includes its child routes/markers)
        globe.visible = !isEnabled;
        earthMapPlane.visible = isEnabled;

        // Map plane visual style: semi-transparent overlay map
        if (earthMapPlane.material) {
            earthMapPlane.material.transparent = false;
            earthMapPlane.material.opacity = 1.0;
            earthMapPlane.material.depthWrite = true;
            earthMapPlane.material.needsUpdate = true;
        }

        // Map plane should fill the center when enabled.
        // Scaling the parent scales markers/transports consistently (they're parented to the plane).
        if (isEnabled) {
            earthMapPlane.scale.set(3.1, 3.1, 3.1);
            earthMapPlane.rotation.set(0, 0, 0);
        } else {
            earthMapPlane.scale.set(1, 1, 1);
            earthMapPlane.rotation.set(0, 0, 0);
        }

        // Flat map: rebuild flat transport lines (straight segments + wrapping)
        if (isEnabled && this.globeView && typeof this.globeView.renderMapTransportLines === 'function') {
            this.globeView.renderMapTransportLines();
        }

        // Satellites/station/mars ship: project orbits onto the flat map and seam-wrap
        if (this.transportController && typeof this.transportController.setSatellitesMapViewEnabled === 'function') {
            this.transportController.setSatellitesMapViewEnabled(isEnabled);
        }

        // Clear active transports & reservations so spawners repopulate cleanly on the current surface.
        const clearReservations = (obj) => {
            if (!obj) return;
            Object.keys(obj).forEach(k => delete obj[k]);
        };
        clearReservations(this.transportModel.getRouteReservations());
        clearReservations(this.transportModel.getBoatRouteReservations());

        const removeAll = (arr) => {
            if (!arr) return;
            for (let i = arr.length - 1; i >= 0; i--) {
                const o = arr[i];
                if (o && o.parent) o.parent.remove(o);
                arr.splice(i, 1);
            }
        };
        removeAll(this.transportModel.getTrains());
        removeAll(this.transportModel.getBoats());
        removeAll(this.transportModel.getPlanes());
        removeAll(this.transportModel.getPlaneTrails());
        removeAll(this.transportModel.getBoatTrails());

        // Reset camera to default framing for current mode
        if (this.interactionController && typeof this.interactionController.resetCameraToDefault === 'function') {
            this.interactionController.resetCameraToDefault();
        }

        // Close any open event slide to avoid "zoom to globe" assumptions lingering
        if (this.uiView && this.uiView.currentEventMarker) {
            this.uiView.hideEventSlide();
        }

        // Recreate event markers onto globe vs map plane
        if (this.globeView && typeof this.globeView.refreshEventMarkers === 'function') {
            this.globeView.refreshEventMarkers();
        }
    }



    /**
     * Update plane visibility - delegates to PlaneManager
     * This method is kept for backward compatibility with GlobeView and InteractionController
     */
    updatePlaneVisibility() {
        this.planeManager.updatePlaneVisibility();
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

