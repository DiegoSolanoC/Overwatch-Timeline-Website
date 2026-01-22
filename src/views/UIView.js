/**
 * UIView - Handles UI elements (labels, buttons, toggles)
 * Note: Glitch text functionality is now handled by GlitchTextService
 * Note: Event slide functionality is now handled by EventSlideManager
 * Note: Event navigation functionality is now handled by EventNavigationManager
 */

import { EventSlideManager } from '../managers/EventSlideManager.js';
import { EventNavigationManager } from '../managers/EventNavigationManager.js';

/**
 * Helper function to get hero display name (maps filename to display name)
 * e.g., "Soldier 76" -> "Soldier: 76"
 */
function getHeroDisplayName(heroName) {
    const heroDisplayNames = {
        'Soldier 76': 'Soldier: 76'
    };
    return heroDisplayNames[heroName] || heroName;
}

/**
 * UIView - Handles UI elements (labels, buttons, toggles)
 */
export class UIView {
    constructor(sceneModel, dataModel = null, globeView = null) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel; // Store reference to dataModel for pagination
        this.globeView = globeView; // Store reference to globeView for refreshing markers
        this.previousAutoRotateState = null; // Store previous auto-rotate state
        this.imageOverlayVisible = false; // Track image overlay visibility
        this.imageToggleState = false; // Track if image toggle is on (independent of visibility)
        this.currentEventMarker = null; // Track currently active event marker
        this.currentEventData = null; // Track currently active event data
        this.currentVariantIndex = 0; // Track currently displayed variant index
        this.originalCameraPosition = null; // Store original camera position before zoom
        this.originalGlobeRotation = null; // Store original globe rotation before zoom
        this.imageAutoHideTimeout = null; // Timeout for auto-showing image after recentering
        this.lastCameraPosition = null; // Track last camera position for stillness detection
        this.lastGlobeRotation = null; // Track last globe rotation for stillness detection
        this.stillnessStartTime = null; // When camera/globe became still
        this.wasDragging = false; // Track previous dragging state to detect drag start
        
        // Initialize managers
        this.eventSlideManager = new EventSlideManager(sceneModel, dataModel, this);
        this.eventNavigationManager = new EventNavigationManager(sceneModel, dataModel, this, this.eventSlideManager);
    }

    /**
     * Show city name label
     * @param {string} cityName - City name to display
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     */
    showCityLabel(cityName, x, y) {
        this.hideCityLabel(); // Remove any existing label
        
        const labelElement = document.createElement('div');
        labelElement.className = 'city-label';
        labelElement.textContent = cityName;
        labelElement.style.position = 'absolute';
        labelElement.style.left = `${x}px`;
        labelElement.style.top = `${y}px`;
        labelElement.style.background = 'rgba(0, 0, 0, 0.8)';
        labelElement.style.color = '#fff';
        labelElement.style.padding = '8px 12px';
        labelElement.style.borderRadius = '4px';
        labelElement.style.fontSize = '14px';
        labelElement.style.fontWeight = 'bold';
        labelElement.style.pointerEvents = 'none';
        labelElement.style.zIndex = '1000';
        labelElement.style.transform = 'translate(-50%, -100%)';
        labelElement.style.marginTop = '-10px';
        labelElement.style.whiteSpace = 'nowrap';
        labelElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        
        document.body.appendChild(labelElement);
        this.sceneModel.setLabelElement(labelElement);
    }

    /**
     * Hide city label
     */
    hideCityLabel() {
        const labelElement = this.sceneModel.getLabelElement();
        if (labelElement) {
            labelElement.remove();
            this.sceneModel.setLabelElement(null);
        }
        this.sceneModel.setActiveMarker(null);
    }

    /**
     * Update event sources section
     * @param {Object} event - Event or variant object
     */
    updateEventSources(event) {
        const eventSourcesSection = document.getElementById('eventSourcesSection');
        const eventSourcesList = document.getElementById('eventSourcesList');
        
        if (event && event.sources && event.sources.length > 0) {
            if (eventSourcesSection && eventSourcesList) {
                eventSourcesList.innerHTML = '';
                
                event.sources.forEach((source) => {
                    const sourceItem = document.createElement('div');
                    sourceItem.className = 'event-source-display-item';
                    
                    if (source.url) {
                        const link = document.createElement('a');
                        link.href = source.url;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.textContent = source.text;
                        link.className = 'event-source-link';
                        sourceItem.appendChild(link);
                    } else {
                        sourceItem.textContent = source.text;
                        sourceItem.className = 'event-source-text';
                    }
                    
                    eventSourcesList.appendChild(sourceItem);
                });
                
                eventSourcesSection.style.display = 'block';
            }
        } else {
            if (eventSourcesSection) {
                eventSourcesSection.style.display = 'none';
            }
        }
    }

    /**
     * Update event filters section
     * @param {Object} event - Event or variant object
     */
    updateEventFilters(event) {
        const eventFiltersSection = document.getElementById('eventFiltersSection');
        const eventFiltersList = document.getElementById('eventFiltersList');
        const activeFilters = this.sceneModel.activeFilters || new Set();
        
        if (event && eventFiltersSection && eventFiltersList) {
            eventFiltersList.innerHTML = '';
            
            const heroFilters = event.filters || [];
            const factionFilters = event.factions || [];
            
            // Display heroes section
            if (heroFilters.length > 0) {
                const heroesHeader = document.createElement('h4');
                heroesHeader.textContent = 'Relevant Heroes:';
                heroesHeader.className = 'event-filter-header';
                eventFiltersList.appendChild(heroesHeader);
                
                heroFilters.forEach(filter => {
                    const filterTag = document.createElement('span');
                    filterTag.className = 'event-filter-tag';
                    if (activeFilters.has(filter)) {
                        filterTag.classList.add('selected');
                    }
                    const displayName = getHeroDisplayName(filter);
                    filterTag.textContent = displayName;
                    eventFiltersList.appendChild(filterTag);
                });
            }
            
            // Display factions section
            if (factionFilters.length > 0) {
                const factionsHeader = document.createElement('h4');
                factionsHeader.textContent = 'Relevant Factions:';
                factionsHeader.className = 'event-filter-header';
                eventFiltersList.appendChild(factionsHeader);
                
                factionFilters.forEach(faction => {
                    const filterTag = document.createElement('span');
                    filterTag.className = 'event-filter-tag';
                    if (activeFilters.has(faction)) {
                        filterTag.classList.add('selected');
                    }
                    const displayName = faction.replace(/^\d+/, '').trim();
                    filterTag.textContent = displayName;
                    eventFiltersList.appendChild(filterTag);
                });
            }
            
            if (heroFilters.length > 0 || factionFilters.length > 0) {
                eventFiltersSection.style.display = 'block';
            } else {
                eventFiltersSection.style.display = 'none';
            }
        } else {
            if (eventFiltersSection) {
                eventFiltersSection.style.display = 'none';
            }
        }
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
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        setButtonState(musicToggle, disable);
        setButtonState(colorPaletteToggle, disable);
        setButtonState(exitButton, disable);
        setButtonState(eventsManageToggle, disable);
        setButtonState(filtersToggle, disable);
        setButtonState(hyperloopToggle, disable);
        setButtonState(autoRotateToggle, disable);
        setButtonState(zoomInBtn, disable);
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
     * Called when globe dragging starts - hide image if toggle is on
     */
    onGlobeDragStart() {
        // Only hide if toggle is on (auto-hide behavior is active) and image is visible
        if (this.imageToggleState && this.imageOverlayVisible) {
            this.hideImageOverlay(true); // Temporary hide
            
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
        if (!this.sceneModel.eventMarker || !this.currentEventMarker) {
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
        if (isDragging && !this.wasDragging && this.imageToggleState && this.imageOverlayVisible) {
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
        this.currentEventMarker.getWorldPosition(markerWorldPos);
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

    /**
     * Hide event slide panel
     */
    hideEventSlide() {
        // Delegate to EventSlideManager
        this.eventSlideManager.hideEventSlide();
    }
    
    /**
     * Zoom out from event and restore original camera position and globe rotation
     */
    zoomOutFromEvent() {
        if (!this.originalCameraPosition || !this.originalGlobeRotation) {
            // No original state stored, use default
            const camera = this.sceneModel.getCamera();
            const globe = this.sceneModel.getGlobe();
            
            if (camera) {
                // On mobile portrait, use more zoomed out position to show Moon/Mars panels
                const isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
                const defaultZoom = isMobilePortrait ? 5.5 : 3.5;
                const defaultPosition = new THREE.Vector3(0, 0, defaultZoom);
                this.animateCameraToPosition(camera, defaultPosition, globe);
            }
            return;
        }
        
        const camera = this.sceneModel.getCamera();
        const globe = this.sceneModel.getGlobe();
        
        if (!camera || !globe) return;
        
        // Animate camera back to original position
        const startPosition = camera.position.clone();
        const targetPosition = this.originalCameraPosition.clone();
        const startRotation = {
            x: globe.rotation.x,
            y: globe.rotation.y,
            z: globe.rotation.z
        };
        const targetRotation = this.originalGlobeRotation;
        
        const duration = 1000; // 1 second animation
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate camera position
            const currentPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easeProgress);
            camera.position.copy(currentPosition);
            
            // Interpolate globe rotation
            globe.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
            globe.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
            globe.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;
            
            // Look at origin
            camera.lookAt(0, 0, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clear stored original state
                this.originalCameraPosition = null;
                this.originalGlobeRotation = null;
                
                // Restore plane visibility when zooming out from event
                if (window.globeController && window.globeController.interactionController) {
                    window.globeController.interactionController.restorePlanesVisibility();
                }
            }
        };
        
        animate();
    }
    
    /**
     * Animate camera to a specific position
     */
    animateCameraToPosition(camera, targetPosition, globe) {
        const startPosition = camera.position.clone();
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easeProgress);
            camera.position.copy(currentPosition);
            camera.lookAt(0, 0, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * Update label position to follow marker
     */
    updateLabelPosition() {
        const labelElement = this.sceneModel.getLabelElement();
        const activeMarker = this.sceneModel.getActiveMarker();
        
        if (!labelElement || !activeMarker) return;
        
        const camera = this.sceneModel.getCamera();
        const renderer = this.sceneModel.getRenderer();
        
        const vector = new THREE.Vector3();
        activeMarker.getWorldPosition(vector);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
        
        labelElement.style.left = `${x}px`;
        labelElement.style.top = `${y}px`;
    }

    /**
     * Setup auto-rotate toggle
     */
    setupAutoRotateToggle() {
        const toggleBtn = document.getElementById('autoRotateToggle');
        if (!toggleBtn) return;
        
        const rotateIcon = document.getElementById('rotateIcon');
        const sceneModel = this.sceneModel;
        
        // Set initial state
        if (sceneModel.getAutoRotateEnabled()) {
            toggleBtn.classList.add('active');
        }
        
        // Ensure rotation icon always uses local image file
        if (rotateIcon) {
            rotateIcon.innerHTML = '<img src="assets/images/icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // Handle button click/touch - unified handler
        const handleToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            // Play rotation toggle sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('rotationToggle');
            }
            
            const enabled = !sceneModel.getAutoRotateEnabled();
            sceneModel.setAutoRotateEnabled(enabled);
            
            if (enabled) {
                toggleBtn.classList.add('active');
                sceneModel.setAutoRotate(true);
                // Clear any pending timeout
                const timeout = sceneModel.autoRotateTimeout;
                if (timeout) {
                    clearTimeout(timeout);
                    sceneModel.autoRotateTimeout = null;
                }
            } else {
                toggleBtn.classList.remove('active');
                sceneModel.setAutoRotate(false);
                // Clear any pending timeout
                const timeout = sceneModel.autoRotateTimeout;
                if (timeout) {
                    clearTimeout(timeout);
                    sceneModel.autoRotateTimeout = null;
                }
            }
            
            // Always keep the icon as an image, never change to emoji
        if (rotateIcon) {
            rotateIcon.innerHTML = '<img src="assets/images/icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        toggleBtn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        toggleBtn.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        toggleBtn.addEventListener('click', handleToggle);
    }

    /**
     * Setup hyperloop toggle
     * @param {Function} onToggle - Callback when toggle changes
     */
    setupHyperloopToggle(onToggle) {
        const toggleBtn = document.getElementById('hyperloopToggle');
        if (!toggleBtn) return;
        
        const hyperloopIcon = document.getElementById('hyperloopIcon');
        const sceneModel = this.sceneModel;
        
        // Set initial state
        if (sceneModel.getHyperloopVisible()) {
            toggleBtn.classList.add('active');
        }
        
        // Ensure hyperloop icon always uses local image file
        if (hyperloopIcon) {
            hyperloopIcon.innerHTML = '<img src="assets/images/icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // Handle button click/touch - unified handler
        const handleToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            // Play transport toggle sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('transportToggle');
            }
            
            const visible = !sceneModel.getHyperloopVisible();
            sceneModel.setHyperloopVisible(visible);
            
            if (visible) {
                toggleBtn.classList.add('active');
                console.log('🚄 Transport systems ENABLED (Trains, Planes)');
            } else {
                toggleBtn.classList.remove('active');
                console.log('⏸️ Transport systems DISABLED - all vehicles will finish invisibly, no new spawns');
            }
            
            // Always keep the icon as an image, never change to emoji
            if (hyperloopIcon) {
                hyperloopIcon.innerHTML = '<img src="assets/images/icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
            }
            
            if (onToggle) {
                onToggle();
            }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        toggleBtn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        toggleBtn.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        toggleBtn.addEventListener('click', handleToggle);
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
     */
    showHackedOverlay() {
        // Clean up any existing hacked overlays first to prevent duplicates
        const existingOverlays = document.querySelectorAll('.hacked-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
        
        // Check if event slide is fully open (not animating)
        const eventSlide = document.getElementById('eventSlide');
        if (eventSlide) {
            const slideRect = eventSlide.getBoundingClientRect();
            // If slide is still off-screen (left < 0), wait for animation to complete
            if (slideRect.left < 0) {
                // Wait for transition to complete (300ms) plus buffer
                setTimeout(() => {
                    this.showHackedOverlay();
                }, 350);
                return;
            }
        }
        
        // Find all glitchy text containers ONLY within the event slide content
        const eventSlideContent = document.getElementById('eventSlideContent');
        if (!eventSlideContent) return;
        
        const glitchyContainers = eventSlideContent.querySelectorAll('.glitchy-text-container');
        
        if (glitchyContainers.length === 0) return;
        
        // Track which containers we've already processed to prevent duplicates
        const processedContainers = new Set();
        
        // Helper function to calculate and position overlay
        const positionOverlay = (container, index) => {
            // Prevent duplicate processing
            if (processedContainers.has(container)) {
                return;
            }
            
            const rect = container.getBoundingClientRect();
            
            // Skip if container is not visible or has zero dimensions
            // On first render, rects might be invalid, so retry if needed
            if (rect.width === 0 || rect.height === 0) {
                // Retry after a short delay if this is likely the first render
                setTimeout(() => {
                    const retryRect = container.getBoundingClientRect();
                    if (retryRect.width > 0 && retryRect.height > 0 && !processedContainers.has(container)) {
                        positionOverlay(container, index);
                    }
                }, 50);
                return;
            }
            
            // Mark as processed
            processedContainers.add(container);
            
            // Find the base text element to measure where the space is
            const baseText = container.querySelector('.glitchy-text-base');
            if (!baseText) return;
            
            // Get the text content
            const textContent = baseText.textContent || '';
            const spaceIndex = textContent.indexOf(' ');
            
            // Calculate target position (where we want the center of the image)
            let targetX, targetY;
            let oliviaRect = null;
            let colomarRect = null;
            
            // Scale image size based on container's font size for consistency
            // Get the computed font size of the container or its parent
            const containerStyle = window.getComputedStyle(container);
            const parentStyle = container.parentElement ? window.getComputedStyle(container.parentElement) : null;
            const fontSize = parseFloat(containerStyle.fontSize) || (parentStyle ? parseFloat(parentStyle.fontSize) : 18);
            
            // Base size for 18px font, scale proportionally
            const baseFontSize = 18;
            const baseImageSize = 50;
            const imageSize = (fontSize / baseFontSize) * baseImageSize;
            
            if (spaceIndex === -1 || spaceIndex === textContent.length - 1) {
                // No space or space at end - center on whole container
                targetX = rect.left + rect.width / 2;
                targetY = rect.top + rect.height / 2;
            } else {
                // Find the position of the space character and center between words
                const range = document.createRange();
                try {
                    // Find the actual text node - might be firstChild or nested
                    let textNode = baseText.firstChild;
                    while (textNode && textNode.nodeType !== Node.TEXT_NODE && textNode.firstChild) {
                        textNode = textNode.firstChild;
                    }
                    
                    // If we still don't have a text node, try nextSibling
                    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
                        textNode = baseText.childNodes[0];
                    }
                    
                    // If we found a text node, use it; otherwise use baseText directly
                    const nodeToUse = (textNode && textNode.nodeType === Node.TEXT_NODE) ? textNode : baseText;
                    
                    // Get range for "Olivia " (up to and including the space)
                    range.setStart(nodeToUse, 0);
                    range.setEnd(nodeToUse, Math.min(spaceIndex + 1, nodeToUse.textContent.length));
                    oliviaRect = range.getBoundingClientRect();
                    
                    // Get range for "Colomar" (after the space)
                    const colomarStart = Math.min(spaceIndex + 1, nodeToUse.textContent.length);
                    const colomarEnd = Math.min(textContent.length, nodeToUse.textContent.length);
                    range.setStart(nodeToUse, colomarStart);
                    range.setEnd(nodeToUse, colomarEnd);
                    colomarRect = range.getBoundingClientRect();
                    
                    // Verify rects are valid (not zero width/height) and positioned correctly
                    // Also check if words are on the same line (vertical overlap)
                    const verticalOverlap = !(oliviaRect.bottom < colomarRect.top || oliviaRect.top > colomarRect.bottom);
                    
                    if (oliviaRect.width > 0 && oliviaRect.height > 0 && 
                        colomarRect.width > 0 && colomarRect.height > 0 &&
                        oliviaRect.right <= colomarRect.right &&
                        verticalOverlap) {
                        // Words are on the same line - use precise positioning
                        // Center horizontally between the end of "Olivia " and start of "Colomar"
                        targetX = (oliviaRect.right + colomarRect.left) / 2;
                        // Use the vertical center of the text line (average of both rects)
                        const textCenterY = (oliviaRect.top + oliviaRect.bottom + colomarRect.top + colomarRect.bottom) / 4;
                        targetY = textCenterY;
                    } else {
                        // Words might be on different lines or rects are invalid
                        // Use container-based calculation for consistency
                        // If rects are invalid or out of order, fall back to container-based calculation
                        // Calculate approximate position based on text content and container width
                        const textWidth = rect.width;
                        const spacePosition = (spaceIndex / textContent.length) * textWidth;
                        targetX = rect.left + spacePosition;
                        targetY = rect.top + rect.height / 2;
                    }
                } catch (e) {
                    console.warn('Range API failed, using fallback positioning:', e);
                    // Fallback: calculate approximate position based on text content
                    const textWidth = rect.width;
                    const spacePosition = (spaceIndex / textContent.length) * textWidth;
                    targetX = rect.left + spacePosition;
                    targetY = rect.top + rect.height / 2;
                }
            }
            
            // Create hacked overlay positioned exactly like the glitch text overlay
            // Append directly to the container (position: absolute relative to container)
            const hackedOverlay = document.createElement('div');
            hackedOverlay.className = 'hacked-overlay';
            hackedOverlay.dataset.index = index;
            
            const hackedImg = document.createElement('img');
            hackedImg.src = 'assets/images/misc/Hacked.png';
            hackedImg.alt = 'Hacked';
            hackedOverlay.appendChild(hackedImg);
            
            // Append directly to the container itself (exactly like glitch overlay)
            // This ensures consistent positioning for all instances
            container.appendChild(hackedOverlay);
            
            // Calculate position relative to container (not viewport)
            // The container is position: relative, so we use position: absolute
            // targetX and targetY are in viewport coordinates, so convert to container-relative
            const containerRect = container.getBoundingClientRect();
            const relativeX = targetX - containerRect.left;
            const relativeY = targetY - containerRect.top;
            
            // Add a small horizontal offset to shift image slightly to the right
            const horizontalOffset = 15; // Pixels to shift right
            const adjustedRelativeX = relativeX + horizontalOffset;
            
            // Position center of image at (adjustedRelativeX, relativeY)
            const leftPos = adjustedRelativeX - imageSize / 2;
            const topPos = relativeY - imageSize / 2;
            
            hackedOverlay.style.position = 'absolute';
            hackedOverlay.style.left = `${leftPos}px`;
            hackedOverlay.style.top = `${topPos}px`;
            hackedOverlay.style.width = `${imageSize}px`;
            hackedOverlay.style.height = `${imageSize}px`;
            hackedOverlay.style.transform = 'none';
            hackedOverlay.style.zIndex = '10000'; // Very high z-index to ensure frontmost layer
            hackedOverlay.style.pointerEvents = 'none';
            hackedOverlay.style.margin = '0';
            hackedOverlay.style.padding = '0';
            hackedOverlay.style.boxSizing = 'border-box';
            
            // Check if container is inside a paragraph with overflow restrictions
            // If the image would be clipped, temporarily adjust parent overflow
            let parent = container.parentElement;
            const adjustedParents = [];
            
            while (parent && parent !== document.body) {
                const computedStyle = window.getComputedStyle(parent);
                if (computedStyle.overflow === 'hidden' || computedStyle.overflowX === 'hidden' || 
                    computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll') {
                    // Check if image would extend beyond parent bounds
                    const parentRect = parent.getBoundingClientRect();
                    const imageTop = targetY - imageSize / 2;
                    const imageBottom = targetY + imageSize / 2;
                    
                    if (imageTop < parentRect.top || imageBottom > parentRect.bottom) {
                        // Temporarily allow overflow to show the image
                        const originalOverflow = parent.style.overflow;
                        const originalOverflowX = parent.style.overflowX;
                        const originalOverflowY = parent.style.overflowY;
                        
                        parent.style.overflow = 'visible';
                        parent.style.overflowX = 'visible';
                        parent.style.overflowY = 'visible';
                        
                        // Store original values to restore after animation
                        adjustedParents.push({
                            element: parent,
                            overflow: originalOverflow,
                            overflowX: originalOverflowX,
                            overflowY: originalOverflowY
                        });
                    }
                }
                parent = parent.parentElement;
            }
            
            // Restore original overflow styles after the image fades out
            if (adjustedParents.length > 0) {
                setTimeout(() => {
                    adjustedParents.forEach(({ element, overflow, overflowX, overflowY }) => {
                        element.style.overflow = overflow || '';
                        element.style.overflowX = overflowX || '';
                        element.style.overflowY = overflowY || '';
                    });
                }, 800); // After fade out completes
            }
            
            // Start with opacity 0 for fade in
            hackedOverlay.style.opacity = '0';
            hackedOverlay.style.display = 'block';
            hackedOverlay.style.transition = 'opacity 0.25s ease'; // Fade in over 0.25s
            
            // Trigger fade in
            requestAnimationFrame(() => {
                hackedOverlay.style.opacity = '1';
            });
            
            // Apply glitch effect at midpoint (filter only, no transform)
            setTimeout(() => {
                // Add glitch effect class or animation
                hackedOverlay.classList.add('hacked-glitch');
            }, 250);
            
            // After 0.5 seconds total, fade out
            setTimeout(() => {
                hackedOverlay.style.transition = 'opacity 0.3s ease';
                hackedOverlay.style.opacity = '0';
                
                // Remove after fade completes
                setTimeout(() => {
                    hackedOverlay.remove();
                }, 300);
            }, 500);
        };
        
        // Call the helper function for each container
        glitchyContainers.forEach((container, index) => {
            // Use requestAnimationFrame to ensure layout is ready, especially on first render
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { // Double RAF to ensure layout is complete
                    positionOverlay(container, index);
                });
            });
        });
    }
    
    /**
     * Show variant markers for a multi-event
     * @param {Object} eventData - The event data object
     */
    showVariantMarkers(eventData) {
        if (!this.sceneModel) return;
        
        const markers = this.sceneModel.getMarkers();
        markers.forEach(marker => {
            if (marker.userData && 
                marker.userData.isEventMarker && 
                marker.userData.event === eventData &&
                !marker.userData.isMainVariant) {
                marker.visible = true;
            }
        });
    }
    
    /**
     * Hide variant markers for a multi-event
     * @param {Object} eventData - The event data object
     */
    hideVariantMarkers(eventData) {
        if (!this.sceneModel) return;
        
        const markers = this.sceneModel.getMarkers();
        markers.forEach(marker => {
            if (marker.userData && 
                marker.userData.isEventMarker && 
                marker.userData.event === eventData &&
                !marker.userData.isMainVariant) {
                marker.visible = false;
            }
        });
    }
}

