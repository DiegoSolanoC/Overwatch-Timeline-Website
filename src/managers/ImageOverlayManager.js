/**
 * ImageOverlayManager - Manages event image overlay visibility, auto-show/hide, and stillness detection
 */

export class ImageOverlayManager {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView; // Reference to UIView for accessing currentEventMarker
        
        // State
        this.imageOverlayVisible = false;
        this.imageToggleState = false;
        this.imageAutoHideTimeout = null;
        this.lastCameraPosition = null;
        this.lastGlobeRotation = null;
        this.stillnessStartTime = null;
        this.wasDragging = false;
    }
    
    /**
     * Toggle event image overlay visibility
     * This sets the toggle state, which controls whether auto-show/hide behavior is active
     */
    toggleEventImage() {
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        const imageToggleBtn = document.getElementById('eventImageToggle');
        
        if (!eventImageOverlay) return;
        
        // Toggle the state
        this.imageToggleState = !this.imageToggleState;
        
        if (this.imageToggleState) {
            // Toggle ON: show image
            this.showImageOverlay();
            if (imageToggleBtn) {
                imageToggleBtn.textContent = 'Hide Image';
            }
        } else {
            // Toggle OFF: hide image
            this.hideImageOverlay();
            if (imageToggleBtn) {
                imageToggleBtn.textContent = 'Show Image';
            }
        }
    }
    
    /**
     * Show image overlay (with fade sequence)
     */
    showImageOverlay() {
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        
        if (!eventImageOverlay) return;
        
        // Clear any pending auto-show timeout
        if (this.imageAutoHideTimeout) {
            clearTimeout(this.imageAutoHideTimeout);
            this.imageAutoHideTimeout = null;
        }
        
        // Show: show overlay, fade to black, then fade in image
        eventImageOverlay.classList.remove('fade-out');
        eventImageOverlay.classList.add('open');
        
        setTimeout(() => {
            eventImageOverlay.classList.add('fade-in');
            
            if (eventImage && eventImage.style.display !== 'none') {
                setTimeout(() => {
                    eventImage.classList.remove('fade-out');
                    eventImage.classList.add('fade-in');
                    
                    // Disable page navigation buttons when image is fully visible
                    // Wait for image fade-in to complete (600ms transition)
                    setTimeout(() => {
                        this.disablePageNavigationButtons(true);
                    }, 600);
                }, 600);
            } else {
                // No image - disable buttons after overlay fade-in completes
                setTimeout(() => {
                    this.disablePageNavigationButtons(true);
                }, 600);
            }
            
            this.imageOverlayVisible = true;
        }, 50);
    }
    
    /**
     * Hide image overlay (with fade sequence)
     * @param {boolean} temporary - If true, doesn't change toggle state (for auto-hide)
     */
    hideImageOverlay(temporary = false) {
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        
        if (!eventImageOverlay) return;
        
        // Re-enable page navigation buttons immediately when hiding starts
        this.disablePageNavigationButtons(false);
        
        // Hide: fade out image, then fade to black, then hide overlay
        // Start fade immediately for faster response
        if (eventImage && eventImage.style.display !== 'none') {
            eventImage.classList.remove('fade-in');
            eventImage.classList.add('fade-out');
        }
        
        // Start overlay fade immediately (don't wait for image fade)
        eventImageOverlay.classList.remove('fade-in');
        eventImageOverlay.classList.add('fade-out');
        
        // After fade completes, hide overlay
        setTimeout(() => {
            eventImageOverlay.classList.remove('open', 'fade-out');
            if (eventImage) {
                eventImage.classList.remove('fade-out');
            }
            this.imageOverlayVisible = false;
            
            // If temporary hide, don't change toggle state
            if (!temporary) {
                this.imageToggleState = false;
            }
        }, 350); // Faster fade-out (matches CSS transition of 0.3s + small buffer)
    }
    
    /**
     * Disable or enable UI buttons when image overlay is visible
     * @param {boolean} disable - True to disable buttons, false to enable
     */
    disablePageNavigationButtons(disable) {
        // Helper function to disable/enable a button with visual feedback
        const setButtonState = (button, isDisabled) => {
            if (!button) return;
            
            if (isDisabled && !button.hasAttribute('data-original-disabled')) {
                // Store original disabled state
                const wasDisabled = button.disabled;
                button.setAttribute('data-original-disabled', wasDisabled ? 'true' : 'false');
                button.disabled = true;
                // Add visual indication
                button.style.opacity = '0.4';
                button.style.cursor = 'not-allowed';
                button.style.pointerEvents = 'none';
            } else if (!isDisabled && button.hasAttribute('data-original-disabled')) {
                // Restore original disabled state
                const wasOriginallyDisabled = button.getAttribute('data-original-disabled') === 'true';
                button.disabled = wasOriginallyDisabled;
                button.removeAttribute('data-original-disabled');
                // Remove visual indication
                button.style.opacity = '';
                button.style.cursor = '';
                button.style.pointerEvents = '';
            }
        };
        
        // Page navigation buttons
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const pageInput = document.getElementById('pageInput');
        
        setButtonState(prevPageBtn, disable);
        setButtonState(nextPageBtn, disable);
        
        // Page input (go to page)
        if (pageInput) {
            if (disable && !pageInput.hasAttribute('data-original-disabled')) {
                pageInput.setAttribute('data-original-disabled', pageInput.disabled ? 'true' : 'false');
                pageInput.disabled = true;
                pageInput.style.opacity = '0.4';
                pageInput.style.cursor = 'not-allowed';
            } else if (!disable && pageInput.hasAttribute('data-original-disabled')) {
                const wasOriginallyDisabled = pageInput.getAttribute('data-original-disabled') === 'true';
                pageInput.disabled = wasOriginallyDisabled;
                pageInput.removeAttribute('data-original-disabled');
                pageInput.style.opacity = '';
                pageInput.style.cursor = '';
            }
        }
        
        // Event number buttons (1-10)
        const numberButtonsContainer = document.getElementById('eventNumberButtons');
        if (numberButtonsContainer) {
            const numberButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');
            numberButtons.forEach(btn => {
                if (disable && !btn.hasAttribute('data-original-disabled')) {
                    const wasDisabled = btn.disabled;
                    btn.setAttribute('data-original-disabled', wasDisabled ? 'true' : 'false');
                    btn.disabled = true;
                    btn.style.opacity = '0.4';
                    btn.style.cursor = 'not-allowed';
                    btn.style.pointerEvents = 'none';
                } else if (!disable && btn.hasAttribute('data-original-disabled')) {
                    const wasOriginallyDisabled = btn.getAttribute('data-original-disabled') === 'true';
                    btn.disabled = wasOriginallyDisabled;
                    btn.removeAttribute('data-original-disabled');
                    if (!btn.classList.contains('locked')) {
                        btn.style.opacity = '';
                        btn.style.cursor = '';
                        btn.style.pointerEvents = '';
                    }
                }
            });
        }
        
        // Globe control buttons
        const musicToggle = document.getElementById('musicToggle');
        const colorPaletteToggle = document.getElementById('colorPaletteToggle');
        const exitButton = document.getElementById('exitButton');
        const eventsManageToggle = document.getElementById('eventsManageToggle');
        const filtersToggle = document.getElementById('filtersToggle');
        const hyperloopToggle = document.getElementById('hyperloopToggle');
        const autoRotateToggle = document.getElementById('autoRotateToggle');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomResetBtn = document.getElementById('zoomResetBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        setButtonState(musicToggle, disable);
        setButtonState(colorPaletteToggle, disable);
        setButtonState(exitButton, disable);
        setButtonState(eventsManageToggle, disable);
        setButtonState(filtersToggle, disable);
        setButtonState(hyperloopToggle, disable);
        setButtonState(autoRotateToggle, disable);
        setButtonState(zoomInBtn, disable);
        setButtonState(zoomResetBtn, disable);
        setButtonState(zoomOutBtn, disable);
    }
    
    /**
     * Setup image overlay interaction handlers
     * The image will hide when globe is dragged (checked in animation loop)
     */
    setupImageOverlayHandlers(eventImageOverlay) {
        // No direct handlers needed - dragging is detected via sceneModel.isDraggingState()
        // in the checkAndAutoShowImage method
    }
    
    /**
     * Called when globe dragging starts - hide image if visible
     * Always allows hiding by dragging, regardless of toggle state
     */
    onGlobeDragStart() {
        // Hide image whenever it's visible (allows drag-to-hide at any time)
        if (this.imageOverlayVisible) {
            this.hideImageOverlay(true); // Temporary hide (preserves toggle state)
            
            // Clear any pending auto-show timeout
            if (this.imageAutoHideTimeout) {
                clearTimeout(this.imageAutoHideTimeout);
                this.imageAutoHideTimeout = null;
            }
        }
    }
    
    /**
     * Check if camera/globe is still and recentered, then auto-show image if toggle is on
     * This should be called from the animation loop
     */
    checkAndAutoShowImage() {
        // Only check if toggle is on and image is currently hidden
        if (!this.imageToggleState || this.imageOverlayVisible) {
            this.stillnessStartTime = null;
            return;
        }
        
        // Only check if we're viewing an event
        if (!this.sceneModel.eventMarker || !this.uiView.currentEventMarker) {
            this.stillnessStartTime = null;
            return;
        }
        
        const camera = this.sceneModel.getCamera();
        const globe = this.sceneModel.getGlobe();
        
        if (!camera || !globe) return;
        
        // Check if auto-rotate has stopped (meaning we're recentered)
        // When auto-rotate stops, it means we've reached the target
        const isAutoRotating = this.sceneModel.getAutoRotate();
        
        // Check if user is dragging (manual interaction)
        const isDragging = this.sceneModel.isDraggingState();
        
        // If dragging just started (wasn't dragging before, now is), hide image
        // This is a backup check - onGlobeDragStart should handle it, but this ensures consistency
        if (isDragging && !this.wasDragging && this.imageOverlayVisible) {
            this.hideImageOverlay(true); // Temporary hide
            
            // Clear any pending auto-show timeout
            if (this.imageAutoHideTimeout) {
                clearTimeout(this.imageAutoHideTimeout);
                this.imageAutoHideTimeout = null;
            }
            
            // Reset stillness tracking
            this.stillnessStartTime = null;
        }
        
        // Update dragging state
        this.wasDragging = isDragging;
        
        // If currently dragging, don't check for auto-show
        if (isDragging) {
            return;
        }
        
        // Get current positions
        const currentCameraPos = camera.position.clone();
        const currentGlobeRot = {
            x: globe.rotation.x,
            y: globe.rotation.y,
            z: globe.rotation.z
        };
        
        // Check if camera/globe has moved significantly
        // Use a threshold that allows for very small movements (momentum damping)
        const movementThreshold = 0.005; // Small threshold for detecting significant movement
        let hasMovedSignificantly = false;
        
        if (this.lastCameraPosition && this.lastGlobeRotation) {
            const cameraMovement = currentCameraPos.distanceTo(this.lastCameraPosition);
            const globeRotDiff = Math.abs(currentGlobeRot.x - this.lastGlobeRotation.x) +
                                Math.abs(currentGlobeRot.y - this.lastGlobeRotation.y) +
                                Math.abs(currentGlobeRot.z - this.lastGlobeRotation.z);
            
            if (cameraMovement > movementThreshold || globeRotDiff > movementThreshold) {
                hasMovedSignificantly = true;
            }
        }
        
        // Update last positions
        this.lastCameraPosition = currentCameraPos.clone();
        this.lastGlobeRotation = { ...currentGlobeRot };
        
        // Check if recentered on event marker
        const markerWorldPos = new THREE.Vector3();
        this.uiView.currentEventMarker.getWorldPosition(markerWorldPos);
        const targetDirection = markerWorldPos.clone().normalize();
        const cameraDirection = camera.position.clone().normalize();
        
        const currentLat = Math.asin(cameraDirection.y);
        const currentLon = Math.atan2(cameraDirection.z, cameraDirection.x);
        const targetLat = Math.asin(targetDirection.y);
        const targetLon = Math.atan2(targetDirection.z, targetDirection.x);
        
        const latDiff = targetLat - currentLat;
        let lonDiff = targetLon - currentLon;
        if (lonDiff > Math.PI) lonDiff -= 2 * Math.PI;
        if (lonDiff < -Math.PI) lonDiff += 2 * Math.PI;
        
        const angleDiff = Math.abs(latDiff) + Math.abs(lonDiff);
        // Use a threshold that matches when auto-rotate stops (0.01 from GlobeController)
        const isRecentered = angleDiff < 0.02; // Slightly more lenient than auto-rotate threshold
        
        // Conditions for showing image:
        // 1. Not dragging (user stopped interacting)
        // 2. Auto-rotate has stopped (meaning we reached target and stopped moving)
        // 3. Recentered on marker (double-check)
        // 4. Not moving significantly (momentum has settled)
        const shouldCheckStillness = !isDragging && !isAutoRotating && isRecentered && !hasMovedSignificantly;
        
        // If conditions not met, reset stillness timer
        if (!shouldCheckStillness) {
            this.stillnessStartTime = null;
            return;
        }
        
        // If conditions met, start/update stillness timer
        if (!this.stillnessStartTime) {
            this.stillnessStartTime = Date.now();
        }
        
        // If still for 0.5 seconds, show image
        const stillnessDuration = 500; // 0.5 seconds (reduced from 1 second)
        const elapsedStill = Date.now() - this.stillnessStartTime;
        
        if (elapsedStill >= stillnessDuration) {
            // Only trigger once - check if we already set a timeout
            if (!this.imageAutoHideTimeout) {
                // Show image immediately (no delay)
                if (this.imageToggleState && !this.imageOverlayVisible) {
                    this.showImageOverlay();
                }
                this.imageAutoHideTimeout = null;
                // Reset stillness timer so it can trigger again if needed
                this.stillnessStartTime = null;
            }
        }
    }
}
