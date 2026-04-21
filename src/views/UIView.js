/**
 * UIView - Handles UI elements (labels, buttons, toggles)
 * Note: Glitch text functionality is now handled by GlitchTextService
 * Note: Event System features removed - Globe no longer handles events
 */

import { ImageOverlayManager } from '../managers/ImageOverlayManager.js';
import { HackedOverlayManager } from '../managers/HackedOverlayManager.js';
import { ToggleManager } from '../managers/ToggleManager.js';
import { CameraViewManager } from '../managers/CameraViewManager.js';
import { VariantMarkerManager } from '../managers/VariantMarkerManager.js';

/**
 * UIView - Handles UI elements (labels, buttons, toggles)
 */
export class UIView {
    constructor(sceneModel, dataModel = null, globeView = null) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel; // Store reference to dataModel for pagination
        this.globeView = globeView; // Store reference to globeView for refreshing markers
        this.previousAutoRotateState = null; // Store previous auto-rotate state
        this.originalCameraPosition = null; // Store original camera position before zoom
        this.originalGlobeRotation = null; // Store original globe rotation before zoom
        
        // Initialize managers
        // NOTE: Event managers removed - Globe no longer handles events
        this.imageOverlayManager = new ImageOverlayManager(sceneModel, this);
        this.hackedOverlayManager = new HackedOverlayManager();
        this.toggleManager = new ToggleManager(sceneModel);
        this.cameraViewManager = new CameraViewManager(sceneModel, this);
        this.variantMarkerManager = new VariantMarkerManager(sceneModel);
    }

    /**
     * Show city name label
     * Delegates to CameraViewManager
     * @param {string} cityName - City name to display
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     */
    showCityLabel(cityName, x, y) {
        this.cameraViewManager.showCityLabel(cityName, x, y);
    }

    /**
     * Hide city label
     * Delegates to CameraViewManager
     */
    hideCityLabel() {
        this.cameraViewManager.hideCityLabel();
    }

    // NOTE: Glitch effect removed - Event System Load Out handles this
    
    /**
     * Toggle event image overlay visibility
     * Delegates to ImageOverlayManager
     */
    toggleEventImage() {
        this.imageOverlayManager.toggleEventImage();
    }
    
    /**
     * Show image overlay (with fade sequence)
     * Delegates to ImageOverlayManager
     */
    showImageOverlay() {
        this.imageOverlayManager.showImageOverlay();
    }
    
    /**
     * Hide image overlay (with fade sequence)
     * Delegates to ImageOverlayManager
     * @param {boolean} temporary - If true, doesn't change toggle state (for auto-hide)
     */
    hideImageOverlay(temporary = false) {
        this.imageOverlayManager.hideImageOverlay(temporary);
    }
    
    /**
     * Disable or enable UI buttons when image overlay is visible
     * Delegates to ImageOverlayManager
     * @param {boolean} disable - True to disable buttons, false to enable
     */
    disablePageNavigationButtons(disable) {
        this.imageOverlayManager.disablePageNavigationButtons(disable);
    }
    
    /**
     * Setup image overlay interaction handlers
     * Delegates to ImageOverlayManager
     */
    setupImageOverlayHandlers(eventImageOverlay) {
        this.imageOverlayManager.setupImageOverlayHandlers(eventImageOverlay);
    }
    
    /**
     * Called when globe dragging starts - hide image if toggle is on
     * Delegates to ImageOverlayManager
     */
    onGlobeDragStart() {
        this.imageOverlayManager.onGlobeDragStart();
    }
    
    /**
     * Check if camera/globe is still and recentered, then auto-show image if toggle is on
     * Delegates to ImageOverlayManager
     * This should be called from the animation loop
     */
    checkAndAutoShowImage() {
        this.imageOverlayManager.checkAndAutoShowImage();
    }

    // NOTE: Event slide removed - Globe no longer handles events
    
    /**
     * Zoom out from event and restore original camera position and globe rotation
     * Delegates to CameraViewManager
     */
    zoomOutFromEvent() {
        this.cameraViewManager.zoomOutFromEvent();
    }

    /**
     * Reset zoom and camera to default view
     */
    resetToDefault() {
        this.cameraViewManager.resetToDefault();
    }
    
    /**
     * Animate camera to a specific position
     * Delegates to CameraViewManager
     */
    animateCameraToPosition(camera, targetPosition, globe) {
        this.cameraViewManager.animateCameraToPosition(camera, targetPosition, globe);
    }

    /**
     * Update label position to follow marker
     * Delegates to CameraViewManager
     */
    updateLabelPosition() {
        this.cameraViewManager.updateLabelPosition();
    }

    /**
     * Setup auto-rotate toggle
     * Delegates to ToggleManager
     */
    setupAutoRotateToggle() {
        this.toggleManager.setupAutoRotateToggle();
    }

    /**
     * Setup hyperloop toggle
     * Delegates to ToggleManager
     * @param {Function} onToggle - Callback when toggle changes
     */
    setupHyperloopToggle(onToggle) {
        this.toggleManager.setupHyperloopToggle(onToggle);
    }

    /**
     * @param {Function} [onToggle]
     */
    setupWeatherEffectsToggle(onToggle) {
        this.toggleManager.setupWeatherEffectsToggle(onToggle);
    }

    /**
     * @param {Function} [onToggle]
     */
    setupLightingToggle(onToggle) {
        this.toggleManager.setupLightingToggle(onToggle);
    }

    /**
     * Setup globe <-> map view toggle
     */
    setupMapViewToggle() {
        this.toggleManager.setupMapViewToggle();
    }
    
    /**
     * Start glitch animation for glitchy text overlays
     * Constantly changes the random characters in the overlay
     */
    /**
     * Start glitch animation (delegates to GlitchTextService)
     */
    startGlitchAnimation() {
        if (window.GlitchTextService) {
            window.GlitchTextService.startAnimation();
        }
    }
    
    /**
     * Stop glitch animation (delegates to GlitchTextService)
     */
    stopGlitchAnimation() {
        if (window.GlitchTextService) {
            window.GlitchTextService.stopAnimation();
        }
    }
    
    /**
     * Show hacked image overlay over glitchy text
     * Delegates to HackedOverlayManager
     */
    showHackedOverlay() {
        this.hackedOverlayManager.showHackedOverlay();
    }
    
    /**
     * Show variant markers for a multi-event
     * Delegates to VariantMarkerManager
     * @param {Object} eventData - The event data object
     */
    showVariantMarkers(eventData) {
        this.variantMarkerManager.showVariantMarkers(eventData);
    }
    
    /**
     * Hide variant markers for a multi-event
     * Delegates to VariantMarkerManager
     * @param {Object} eventData - The event data object
     */
    hideVariantMarkers(eventData) {
        this.variantMarkerManager.hideVariantMarkers(eventData);
    }
}

