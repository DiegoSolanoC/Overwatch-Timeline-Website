/**
 * UIView - Handles UI elements (labels, buttons, toggles)
 * Note: Glitch text functionality is now handled by GlitchTextService
 * Note: Event slide functionality is now handled by EventSlideManager
 * Note: Event navigation functionality is now handled by EventNavigationManager
 */

import { EventSlideManager } from '../managers/EventSlideManager.js';
import { EventNavigationManager } from '../managers/EventNavigationManager.js';
import { ImageOverlayManager } from '../managers/ImageOverlayManager.js';
import { HackedOverlayManager } from '../managers/HackedOverlayManager.js';
import { ToggleManager } from '../managers/ToggleManager.js';
import { CameraViewManager } from '../managers/CameraViewManager.js';
import { EventContentManager } from '../managers/EventContentManager.js';
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
        this.currentEventMarker = null; // Track currently active event marker
        this.currentEventData = null; // Track currently active event data
        this.currentVariantIndex = 0; // Track currently displayed variant index
        this.originalCameraPosition = null; // Store original camera position before zoom
        this.originalGlobeRotation = null; // Store original globe rotation before zoom
        
        // Initialize managers
        this.eventSlideManager = new EventSlideManager(sceneModel, dataModel, this);
        this.eventNavigationManager = new EventNavigationManager(sceneModel, dataModel, this, this.eventSlideManager);
        this.imageOverlayManager = new ImageOverlayManager(sceneModel, this);
        this.hackedOverlayManager = new HackedOverlayManager();
        this.toggleManager = new ToggleManager(sceneModel);
        this.cameraViewManager = new CameraViewManager(sceneModel, this);
        this.eventContentManager = new EventContentManager(sceneModel);
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

    /**
     * Update event sources section
     * Delegates to EventContentManager
     * @param {Object} event - Event or variant object
     */
    updateEventSources(event) {
        this.eventContentManager.updateEventSources(event);
    }

    /**
     * Update event filters section
     * Delegates to EventContentManager
     * @param {Object} event - Event or variant object
     */
    updateEventFilters(event) {
        this.eventContentManager.updateEventFilters(event);
    }

    /**
     * Show event slide panel
     * @param {string} eventName - Event name
     * @param {string} imagePath - Optional image path
     * @param {string} description - Event description
     * @param {THREE.Object3D} marker - Event marker object
     */
    showEventSlide(eventName, imagePath = null, description = null, marker = null, eventData = null) {
        // Delegate to EventSlideManager
        this.eventSlideManager.showEventSlide(eventName, imagePath, description, marker, eventData);
    }
    
    /**
     * Setup event navigation buttons (prev/next in full events list)
     * Delegates to EventNavigationManager
     */
    setupEventNavigation() {
        this.eventNavigationManager.setupEventNavigation();
    }
    
    /**
     * Setup event pagination controls
     * Delegates to EventNavigationManager
     * @param {Function} onPageChange - Callback when page changes
     */
    setupEventPagination(onPageChange) {
        this.eventNavigationManager.setupEventPagination(onPageChange);
    }
    
    /**
     * Setup event number buttons (1-10) to open events by position on current page
     * Delegates to EventNavigationManager
     * Returns the update function so it can be called when page changes
     */
    setupEventNumberButtons(onPageChange) {
        return this.eventNavigationManager.setupEventNumberButtons(onPageChange);
    }
    
    /**
     * Switch to a different variant of a multi-event
     * Delegates to EventSlideManager
     */
    switchEventVariant(variantIndex, eventData) {
        this.eventSlideManager.switchEventVariant(variantIndex, eventData);
    }

    /**
     * Toggle glitch effect for Olivia Colomar text
     */
    toggleGlitchEffect() {
        if (!window.GlitchTextService) {
            console.warn('GlitchTextService not available');
            return;
        }
        
        const glitchToggleBtn = document.getElementById('eventGlitchToggle');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        
        // Get current event data for title and text
        let titleText = null;
        let textText = null;
        
        if (this.currentEventData) {
            const isMultiEvent = this.currentEventData.variants && this.currentEventData.variants.length > 0;
            const currentEvent = isMultiEvent ? this.currentEventData.variants[this.currentVariantIndex] : this.currentEventData;
            if (currentEvent) {
                titleText = currentEvent.name || (this.currentEventMarker ? this.currentEventMarker.userData.eventName : 'Event');
                textText = currentEvent.description || 'Placeholder text for event information.';
            }
        }
        
        // Use the service's toggle method
        const newState = window.GlitchTextService.toggleEffect({
            titleElement: eventSlideTitle,
            textElement: eventSlideText,
            titleText: titleText,
            textText: textText,
            toggleButton: glitchToggleBtn,
            onToggle: (enabled, wasEnabled) => {
                // Show hacked image overlay if enabled
                if (enabled) {
                    setTimeout(() => {
                        this.showHackedOverlay();
                    }, 50);
                }
            }
        });
    }
    
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

    /**
     * Hide event slide panel
     */
    hideEventSlide() {
        // Delegate to EventSlideManager
        this.eventSlideManager.hideEventSlide();
    }
    
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

