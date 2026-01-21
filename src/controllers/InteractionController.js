/**
 * InteractionController - Handles mouse/touch controls and marker interactions
 * Coordinates interaction services for separation of concerns
 */
export class InteractionController {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
        
        // Initialize services
        this.pulseService = new (window.MarkerPulseService || MarkerPulseService)(sceneModel);
        this.cameraService = new (window.CameraControlService || CameraControlService)(sceneModel, uiView);
        this.mouseService = new (window.MouseInteractionService || MouseInteractionService)(sceneModel, uiView);
        this.touchService = new (window.TouchInteractionService || TouchInteractionService)(sceneModel, uiView);
        this.markerService = new (window.MarkerInteractionService || MarkerInteractionService)(sceneModel, uiView, this.pulseService);
        this.stationService = new (window.StationFollowService || StationFollowService)(sceneModel, uiView);
    }

    /**
     * Set Moon/Mars plane visibility with animation
     * @param {boolean} visible - Whether planes should be visible
     */
    setPlanesVisibility(visible) {
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        // Use GlobeController's animatePlaneScale for smooth squash/stretch animation
        if (window.globeController && typeof window.globeController.animatePlaneScale === 'function') {
            if (moonPlane) {
                window.globeController.animatePlaneScale(moonPlane, visible);
            }
            if (marsPlane) {
                window.globeController.animatePlaneScale(marsPlane, visible);
            }
        } else {
            // Fallback to instant show/hide if animation not available
            if (moonPlane) {
                moonPlane.visible = visible;
            }
            if (marsPlane) {
                marsPlane.visible = visible;
            }
        }
    }

    /**
     * Restore plane visibility based on current page events
     * This should be called when camera returns to normal view
     */
    restorePlanesVisibility() {
        // Use GlobeController's updatePlaneVisibility to check current page and show/hide accordingly
        if (window.globeController && typeof window.globeController.updatePlaneVisibility === 'function') {
            window.globeController.updatePlaneVisibility();
        }
    }

    /**
     * Setup mouse/touch controls
     * @param {HTMLElement} container - Container element
     */
    setupControls(container) {
        container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('mouseup', () => this.onMouseUp());
        container.addEventListener('mouseleave', () => this.onMouseUp());
        container.addEventListener('click', (e) => this.onMarkerClick(e));
        // Use { passive: false } for touch events so we can preventDefault to stop page scrolling
        container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        container.addEventListener('touchend', () => this.onMouseUp(), { passive: false });
        container.addEventListener('wheel', (e) => this.onWheel(e));
    }

    /**
     * Handle mouse down
     * @param {MouseEvent} event - Mouse event
     */
    onMouseDown(event) {
        this.mouseService.onMouseDown(event);
    }

    /**
     * Handle mouse move
     * @param {MouseEvent} event - Mouse event
     */
    onMouseMove(event) {
        this.mouseService.onMouseMove(event, (e) => this.markerService.checkEventMarkerHover(e));
    }

    /**
     * Handle mouse up
     */
    onMouseUp() {
        this.mouseService.onMouseUp();
    }

    /**
     * Check if mouse is hovering over an event marker and create pulse effect
     */
    checkEventMarkerHover(event) {
        this.markerService.checkEventMarkerHover(event);
    }

    /**
     * Start pulse effect on event marker
     */
    startEventMarkerPulse(marker) {
        this.pulseService.startEventMarkerPulse(marker);
    }

    /**
     * Schedule next pulse ring after current one finishes
     */
    scheduleNextPulse(marker) {
        this.pulseService.scheduleNextPulse(marker);
    }

    /**
     * Stop pulse effect on event marker
     */
    stopEventMarkerPulse(marker) {
        this.pulseService.stopEventMarkerPulse(marker);
    }

    /**
     * Create a pulse ring for event marker
     */
    createPulseRing(marker) {
        this.pulseService.createPulseRing(marker);
    }

    /**
     * Update ring position and orientation to be flat on globe surface or plane
     */
    updateRingPositionAndOrientation(ring, marker) {
        this.pulseService.updateRingPositionAndOrientation(ring, marker);
    }

    /**
     * Update pulse rings animation
     */
    updatePulseRings() {
        this.pulseService.updatePulseRings();
    }

    /**
     * Update marker pulse animation (dilation effect) - happens all the time for all event markers
     */
    updateMarkerPulse() {
        this.pulseService.updateMarkerPulse();
    }

    /**
     * Zoom in and center camera on a marker
     * @param {THREE.Object3D} marker - Marker to zoom to
     */
    zoomToMarker(marker) {
        this.cameraService.zoomToMarker(marker, (visible) => this.setPlanesVisibility(visible));
    }

    /**
     * Reset camera to default view (for Moon/Mars events)
     */
    resetCameraToDefault() {
        this.cameraService.resetCameraToDefault(() => this.restorePlanesVisibility());
    }

    /**
     * Handle marker click
     * @param {MouseEvent} event - Mouse event
     */
    onMarkerClick(event) {
        this.markerService.onMarkerClick(
            event,
            (marker) => this.zoomToMarker(marker),
            () => this.resetCameraToDefault()
        );
    }

    /**
     * Handle touch start
     * @param {TouchEvent} event - Touch event
     */
    onTouchStart(event) {
        this.touchService.onTouchStart(event);
    }

    /**
     * Handle touch move
     * @param {TouchEvent} event - Touch event
     */
    onTouchMove(event) {
        this.touchService.onTouchMove(event);
    }

    /**
     * Handle wheel/zoom
     * @param {WheelEvent} event - Wheel event
     */
    onWheel(event) {
        this.cameraService.onWheel(event);
    }

    /**
     * Zoom in (move camera closer)
     */
    zoomIn() {
        this.cameraService.zoomIn();
    }

    /**
     * Zoom out (move camera farther)
     */
    zoomOut() {
        this.cameraService.zoomOut();
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const camera = this.sceneModel.getCamera();
        const renderer = this.sceneModel.getRenderer();
        const container = document.getElementById('globe-container');
        
        // Update mobile portrait state on resize
        if (container && this.sceneModel) {
            const isMobile = window.innerWidth <= 768;
            const isPortrait = container.clientHeight > container.clientWidth;
            const wasMobilePortrait = this.sceneModel.isMobilePortrait;
            const isMobilePortrait = isMobile && isPortrait;
            this.sceneModel.isMobilePortrait = isMobilePortrait;
            
            // If orientation changed, reposition Moon and Mars panels
            if (wasMobilePortrait !== isMobilePortrait) {
                this.updatePlanesPosition(isMobilePortrait);
            }
        }
        
        if (container && camera && renderer) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
    
    /**
     * Update Moon and Mars planes position based on viewport
     * @param {boolean} isMobilePortrait - Whether in mobile portrait mode
     */
    updatePlanesPosition(isMobilePortrait) {
        const moonPlane = this.sceneModel.getMoonPlane();
        const marsPlane = this.sceneModel.getMarsPlane();
        
        if (moonPlane) {
            if (isMobilePortrait) {
                // Mobile portrait: horizontal layout at the top
                moonPlane.position.set(-0.8, 1.2, 0); // Left side, at the top
            } else {
                // Desktop: vertical layout on the right
                moonPlane.position.set(1.5, 0.3, 0); // To the right, slightly above center
            }
            // Update lookAt direction
            const cameraZ = isMobilePortrait ? 5.5 : 3.5;
            moonPlane.lookAt(0, 0, cameraZ);
        }
        
        if (marsPlane) {
            if (isMobilePortrait) {
                // Mobile portrait: horizontal layout at the top
                marsPlane.position.set(0.3, 1.2, 0); // Right of Moon, at the top
            } else {
                // Desktop: vertical layout on the right
                marsPlane.position.set(1.5, -0.3, 0); // To the right, slightly below center
            }
            // Update lookAt direction
            const cameraZ = isMobilePortrait ? 5.5 : 3.5;
            marsPlane.lookAt(0, 0, cameraZ);
        }
    }
    
    /**
     * Start continuously following a station marker (ISS)
     * @param {Object} marker - The station marker to follow
     */
    startFollowingStation(marker) {
        this.stationService.startFollowingStation(marker);
    }
    
    /**
     * Stop following the station marker
     */
    stopFollowingStation() {
        this.stationService.stopFollowingStation();
    }
    
    /**
     * Update pin lines and marker positions for station events
     */
    updateStationPinLines() {
        this.stationService.updateStationPinLines();
    }
}
