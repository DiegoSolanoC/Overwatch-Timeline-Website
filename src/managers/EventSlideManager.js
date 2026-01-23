/**
 * EventSlideManager - Handles event slide display, hiding, and variant switching
 * Extracted from UIView to reduce complexity and improve maintainability
 */

import { setupMobileEventSlide, cleanupMobileEventSlide, getDefaultZoom } from './helpers/MobileEventSlideHelpers.js';
import { setupEarthLocation, setupMoonMarsLocation, setupStationLocation, hideLocationWithFade, setupLocationClickHandler } from './helpers/LocationDisplayHelpers.js';
import { loadEventImage, setupImageFadeIn } from './helpers/ImageLoadingHelpers.js';
import { findVariantMarker, zoomToVariantLocation, createTempMarkerForCoords } from './helpers/VariantHelpers.js';

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

// Export mobile helpers for backward compatibility
export const MobileHelpers = {
    isMobile: () => window.innerWidth <= 768,
    isMobilePortrait: () => window.innerWidth <= 768 && window.innerHeight > window.innerWidth,
    getDefaultZoom,
    setupMobileEventSlide,
    cleanupMobileEventSlide
};

export class EventSlideManager {
    constructor(sceneModel, dataModel, uiView) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
        this.uiView = uiView; // Reference back to UIView for methods that still need to be there
        this.currentEventMarker = null;
        this.currentEventData = null;
        this.currentVariantIndex = 0;
        this.previousAutoRotateState = null;
        this.originalCameraPosition = null;
        this.originalGlobeRotation = null;
    }

    /**
     * Process and normalize image path
     * @param {string} imagePath - Raw image path
     * @returns {string} - Normalized image path
     */
    processImagePath(imagePath) {
        if (!imagePath || !imagePath.trim()) {
            return null;
        }

        imagePath = imagePath.trim();

        // Only process if path doesn't look properly formatted already
        // If path already contains assets/images/events/ with encoded filename, use it as-is
        // Only process if it has legacy Event Images/ (with space) or needs normalization
        if (imagePath.includes('Event Images/') && !imagePath.includes('Event%20Images/')) {
            // Handle legacy "Event Images/" format (with space) - convert to assets/images/events with encoded filename
            const folderPattern = /Event Images\//;
            if (folderPattern.test(imagePath)) {
                const parts = imagePath.split(/Event Images\//);
                if (parts.length === 2) {
                    let filename = parts[1];
                    // Decode multiple times in case it's double/triple encoded
                    let previousFilename = '';
                    while (filename !== previousFilename) {
                        previousFilename = filename;
                        try {
                            const decoded = decodeURIComponent(filename);
                            if (decoded !== filename) {
                                filename = decoded;
                            } else {
                                break;
                            }
                        } catch (e) {
                            break; // Can't decode further
                        }
                    }
                    imagePath = `assets/images/events/${encodeURIComponent(filename)}`;
                }
            }
        }
        // If path already has assets/images/events/, use it as-is (already properly formatted)
        return imagePath;
    }

    /**
     * Update content with fade transition
     * @param {HTMLElement} element - Element to update
     * @param {string} newContent - New content HTML
     * @param {boolean} isAlreadyOpen - Whether slide is already open
     */
    updateContentWithFade(element, newContent, isAlreadyOpen) {
        if (!element) return;

        if (isAlreadyOpen) {
            // Fade out
            element.style.transition = 'opacity 0.2s ease';
            element.style.opacity = '0';

            setTimeout(() => {
                // Update content
                element.innerHTML = newContent;

                // Fade in
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 10);
            }, 200);
        } else {
            // No transition needed, just update
            element.innerHTML = newContent;
            element.style.opacity = '1';
        }
    }

    /**
     * Setup location display in event slide
     * @param {HTMLElement} eventSlideLocation - Location element
     * @param {Object} eventData - Event data
     * @param {Object} marker - Event marker
     * @param {boolean} isMultiEvent - Whether this is a multi-event
     * @param {number} variantIndex - Current variant index
     * @param {boolean} isAlreadyOpen - Whether slide is already open
     */
    setupLocationDisplay(eventSlideLocation, eventData, marker, isMultiEvent, variantIndex, isAlreadyOpen) {
        if (!eventSlideLocation || !eventData) return;

        let lat, lon, x, y, locationName, locationType;

        if (isMultiEvent) {
            // Use the variant index from marker if available, otherwise default to 0
            const currentVariantIndex = (marker && marker.userData && marker.userData.variantIndex !== undefined)
                ? marker.userData.variantIndex
                : variantIndex || 0;
            const currentVariant = eventData.variants[currentVariantIndex] || eventData.variants[0];
            lat = currentVariant.lat !== undefined ? currentVariant.lat : eventData.lat;
            lon = currentVariant.lon !== undefined ? currentVariant.lon : eventData.lon;
            x = currentVariant.x !== undefined ? currentVariant.x : eventData.x;
            y = currentVariant.y !== undefined ? currentVariant.y : eventData.y;
            locationName = currentVariant.cityDisplayName || eventData.cityDisplayName || null;
            locationType = currentVariant.locationType || eventData.locationType || 'earth';
        } else {
            lat = eventData.lat;
            lon = eventData.lon;
            x = eventData.x;
            y = eventData.y;
            locationName = eventData.cityDisplayName || null;
            locationType = eventData.locationType || 'earth';
        }

        // Handle different location types using helpers
        if (locationType === 'earth' && lat !== undefined && lon !== undefined && window.eventManager) {
            setupEarthLocation(eventSlideLocation, lat, lon, marker, isAlreadyOpen, locationName, true);
        } else if (locationType === 'moon' || locationType === 'mars') {
            setupMoonMarsLocation(eventSlideLocation, locationType, x, y, locationName, marker, isAlreadyOpen);
        } else if (locationType === 'station') {
            setupStationLocation(eventSlideLocation, locationName, marker, isAlreadyOpen);
        } else {
            // No location data for other types
            hideLocationWithFade(eventSlideLocation, isAlreadyOpen);
        }
    }

    /**
     * Show event slide panel
     * @param {string} eventName - Event name
     * @param {string} imagePath - Optional image path
     * @param {string} description - Event description
     * @param {THREE.Object3D} marker - Event marker object
     * @param {Object} eventData - Event data object
     */
    showEventSlide(eventName, imagePath = null, description = null, marker = null, eventData = null) {
        // Play event click sound when opening event
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('eventClick');
        }

        // Process image path
        imagePath = this.processImagePath(imagePath);

        const eventSlide = document.getElementById('eventSlide');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        const imageToggleBtn = document.getElementById('eventImageToggle');
        const variantToggles = document.getElementById('eventVariantToggles');

        // Store current event marker and data (sync with UIView for backward compatibility)
        this.currentEventMarker = marker;
        this.uiView.currentEventMarker = marker;
        this.currentEventData = eventData;
        this.uiView.currentEventData = eventData;
        this.currentVariantIndex = 0; // Track which variant is currently displayed
        this.uiView.currentVariantIndex = 0;

        // Store current auto-rotate state but don't disable it completely
        // We'll use a special event-centered auto-rotate instead
        this.previousAutoRotateState = this.sceneModel.getAutoRotateEnabled();
        this.sceneModel.setAutoRotateEnabled(true); // Keep enabled for event recentering
        this.sceneModel.setAutoRotate(false); // But don't start rotating yet
        this.sceneModel.eventMarker = marker; // Store marker for recentering

        if (eventSlide) {
            // Check if this is a multi-event
            const isMultiEvent = eventData && eventData.variants && eventData.variants.length > 0;

            // Get the variant index from the marker if available (for multi-events)
            let initialVariantIndex = 0;
            if (isMultiEvent && marker && marker.userData && marker.userData.variantIndex !== undefined) {
                initialVariantIndex = marker.userData.variantIndex;
            }

            // Store the current variant index
            this.currentVariantIndex = initialVariantIndex;
            this.uiView.currentVariantIndex = initialVariantIndex;

            // Setup variant toggle buttons for multi-events
            if (isMultiEvent && variantToggles) {
                variantToggles.style.display = 'flex';
                variantToggles.innerHTML = '';

                // Create button for each variant
                eventData.variants.forEach((variant, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'variant-toggle-btn';
                    btn.innerHTML = (window.GlitchTextService ? window.GlitchTextService.getDisplayEventName(variant.name) : variant.name) || `Variant ${index + 1}`;
                    btn.dataset.variantIndex = index;
                    if (index === initialVariantIndex) {
                        btn.classList.add('active');
                    }
                    btn.addEventListener('click', () => {
                        this.switchEventVariant(index, eventData);
                    });
                    variantToggles.appendChild(btn);
                });
            } else if (variantToggles) {
                variantToggles.style.display = 'none';
                variantToggles.innerHTML = '';
            }

            // Check if event slide is already open (for fade transition)
            const isAlreadyOpen = eventSlide.classList.contains('open');

            // Update title with fade
            this.updateContentWithFade(eventSlideTitle, window.GlitchTextService ? window.GlitchTextService.getDisplayEventName(eventName) : eventName, isAlreadyOpen);

            // Display location between title and description
            const eventSlideLocation = document.getElementById('eventSlideLocation');
            if (eventSlideLocation && eventData) {
                this.setupLocationDisplay(eventSlideLocation, eventData, marker, isMultiEvent, initialVariantIndex, isAlreadyOpen);
            }

            // Update description with fade
            this.updateContentWithFade(eventSlideText, window.GlitchTextService ? window.GlitchTextService.getDisplayText(description || 'Placeholder text for event information. This will be replaced with actual event details.') : (description || 'Placeholder text for event information. This will be replaced with actual event details.'), isAlreadyOpen);

            // Start glitch character animation for any glitchy text overlays (only if enabled)
            if (window.GlitchTextService && window.GlitchTextService.isEnabled()) {
                window.GlitchTextService.startAnimation();
                // Show hacked image overlay when opening event with glitch enabled
                // Wait for slide animation to complete (300ms) + buffer for text rendering
                setTimeout(() => {
                    this.uiView.showHackedOverlay();
                }, 400); // Wait for slide transition (300ms) + 100ms buffer for text rendering
            } else {
                if (window.GlitchTextService) {
                    window.GlitchTextService.stopAnimation();
                }
            }

            // Get current variant or main event
            const currentEvent = isMultiEvent ? eventData.variants[this.currentVariantIndex] : eventData;

            // Update sources and filters sections (using shared helper functions)
            this.uiView.updateEventSources(currentEvent);
            this.uiView.updateEventFilters(currentEvent);

            // Hide variant markers for previous event (if switching between events)
            if (this.currentEventData &&
                this.currentEventData !== eventData &&
                this.currentEventData.variants &&
                this.currentEventData.variants.length > 0) {
                this.uiView.hideVariantMarkers(this.currentEventData);
            }

            // Store event data for variant switching
            if (isMultiEvent) {
                this.currentEventData = eventData;
            }

            // Show variant markers for this event (if it's a multi-event)
            if (eventData && eventData.variants && eventData.variants.length > 0) {
                this.uiView.showVariantMarkers(eventData);
            }

            eventSlide.classList.add('open');

            // Adjust image overlay position when slide opens
            if (eventImageOverlay) {
                eventImageOverlay.classList.add('slide-open');
            }

            // On mobile: move bottom section content into scrollable area and fix title position
            MobileHelpers.setupMobileEventSlide();

            // Call helper functions to update sources and filters
            setTimeout(() => {
                this.uiView.updateEventSources(currentEvent);
                this.uiView.updateEventFilters(currentEvent);
            }, 100);
        }

        // Initialize image overlay state - show by default with fade sequence
        if (eventImageOverlay && eventImage) {
            // Load event image using helper
            loadEventImage(eventImage, eventImageOverlay, imagePath);

            // Show overlay immediately but invisible
            this.uiView.imageOverlayManager.imageOverlayVisible = true;
            this.uiView.imageOverlayManager.imageToggleState = true;
            eventImageOverlay.classList.add('open');

            // Initial fade-in happens after zoom completes
            setupImageFadeIn(eventImage, eventImageOverlay, imagePath, () => {
                this.uiView.disablePageNavigationButtons(true);
            }, 600);

            // Store image path for later use
            this.uiView.pendingImagePath = imagePath || null;

            // Setup image overlay interaction handlers
            this.uiView.setupImageOverlayHandlers(eventImageOverlay);
        } else {
            // Update ImageOverlayManager state (not UIView directly)
            this.uiView.imageOverlayManager.imageOverlayVisible = false;
            this.uiView.imageOverlayManager.imageToggleState = false;
        }

        // Update toggle button text
        if (imageToggleBtn) {
            imageToggleBtn.textContent = 'Hide Image';
            imageToggleBtn.onclick = () => this.uiView.toggleEventImage();
        }

        // Setup glitch toggle button (only show if event contains "Olivia Colomar")
        const glitchToggleBtn = document.getElementById('eventGlitchToggle');
        const hasOliviaColomar = (eventName && /Olivia Colomar/gi.test(eventName)) ||
            (description && /Olivia Colomar/gi.test(description)) ||
            (eventData && eventData.variants && eventData.variants.some(v =>
                (v.name && /Olivia Colomar/gi.test(v.name)) ||
                (v.description && /Olivia Colomar/gi.test(v.description))
            ));

        // Debug logging
        console.log('Glitch detection:', {
            eventName,
            description,
            hasOliviaColomar,
            glitchToggleBtn: !!glitchToggleBtn,
            glitchEnabled: window.GlitchTextService ? window.GlitchTextService.isEnabled() : false,
            soundManager: !!window.SoundEffectsManager
        });

        if (glitchToggleBtn) {
            if (hasOliviaColomar) {
                glitchToggleBtn.style.display = 'block';
                glitchToggleBtn.style.visibility = 'visible';
                if (window.GlitchTextService) {
                    window.GlitchTextService.setEnabled(true); // Reset to enabled when opening event
                }
                glitchToggleBtn.textContent = 'Disable Glitch';
                glitchToggleBtn.onclick = () => this.uiView.toggleGlitchEffect();

                // Play hack on sound when opening event with glitch effect active (only if glitch is enabled)
                // Use a small delay to ensure SoundEffectsManager is fully initialized
                setTimeout(() => {
                    if (window.GlitchTextService && window.GlitchTextService.isEnabled() && window.SoundEffectsManager && window.SoundEffectsManager.play) {
                        console.log('Playing hackOn sound');
                        try {
                            window.SoundEffectsManager.play('hackOn', {
                                playbackRate: 1.2, // Speed up by 20%
                                fadeOut: true,
                                fadeOutDuration: 500 // 500ms fade out
                            });
                        } catch (e) {
                            console.error('Error playing hackOn sound:', e);
                        }
                        // Note: showHackedOverlay() is already called in showEventSlide(), no need to call it again here
                    } else {
                        console.log('Not playing sound - glitchEnabled:', window.GlitchTextService ? window.GlitchTextService.isEnabled() : false, 'SoundManager:', !!window.SoundEffectsManager, 'play method:', !!(window.SoundEffectsManager && window.SoundEffectsManager.play));
                    }
                }, 50);
            } else {
                glitchToggleBtn.style.display = 'none';
            }
        } else {
            console.error('Glitch toggle button not found!');
        }

        // Add close button handler (use addEventListener to avoid overwriting)
        const closeBtn = document.getElementById('eventSlideClose');
        if (closeBtn) {
            // Remove any existing listeners by cloning the element
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideEventSlide();
            });
        }

        // Setup navigation buttons (prev/next event)
        this.uiView.setupEventNavigation();

        // Reset stillness tracking
        this.uiView.lastCameraPosition = null;
        this.uiView.lastGlobeRotation = null;
        this.uiView.stillnessStartTime = null;
        this.uiView.wasDragging = false;
    }

    /**
     * Hide event slide panel
     */
    hideEventSlide() {
        // Stop glitch animation when hiding slide
        if (window.GlitchTextService) {
            window.GlitchTextService.stopAnimation();
        }
        // Only play event click sound if an event was actually open
        if (this.currentEventMarker && window.SoundEffectsManager) {
            window.SoundEffectsManager.play('eventClick');
        }

        // Restore plane visibility when closing event slide
        if (window.globeController && window.globeController.interactionController) {
            window.globeController.interactionController.restorePlanesVisibility();
        }

        const eventSlide = document.getElementById('eventSlide');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');

        // Close instantly - no fade delays
        if (eventSlide) {
            eventSlide.classList.remove('open');
        }

        // On mobile: move bottom section content back and reset title position when closing
        MobileHelpers.cleanupMobileEventSlide();

        // Hide image overlay immediately
        if (eventImageOverlay) {
            eventImageOverlay.classList.remove('slide-open', 'open', 'fade-in', 'fade-out');
        }

        if (eventImage) {
            eventImage.classList.remove('fade-in', 'fade-out');
            eventImage.style.display = 'none';
        }

        // Re-enable page navigation buttons when event slide is closed
        this.uiView.disablePageNavigationButtons(false);

        // Hide variant markers for the current event (if it was a multi-event)
        if (this.currentEventData && this.currentEventData.variants && this.currentEventData.variants.length > 0) {
            this.uiView.hideVariantMarkers(this.currentEventData);
        }

        // Clear current event data (sync with UIView)
        this.currentEventData = null;
        this.uiView.currentEventData = null;
        const hadEventMarker = this.currentEventMarker !== null;
        this.currentEventMarker = null;
        this.uiView.currentEventMarker = null;

        // Only zoom out and restore camera position if we actually zoomed to an event
        // (i.e., if originalCameraPosition was set from zoomToMarker)
        // Read from uiView since zoomToMarker sets it there
        if (hadEventMarker && this.uiView.originalCameraPosition) {
            this.uiView.zoomOutFromEvent();
        } else {
            // Clear any stored original position if no event was open
            this.originalCameraPosition = null;
            this.originalGlobeRotation = null;
            this.uiView.originalCameraPosition = null;
            this.uiView.originalGlobeRotation = null;
        }

        // Clear event marker and restore previous auto-rotate state
        this.sceneModel.eventMarker = null;
        this.currentEventMarker = null;
        this.uiView.currentEventMarker = null;

        if (this.previousAutoRotateState !== null) {
            this.sceneModel.setAutoRotateEnabled(this.previousAutoRotateState);
            if (this.previousAutoRotateState) {
                this.sceneModel.setAutoRotate(true);
            }
            this.previousAutoRotateState = null;
        }

        // Update ImageOverlayManager state (not UIView directly)
        this.uiView.imageOverlayManager.imageOverlayVisible = false;
        this.uiView.imageOverlayManager.imageToggleState = false;

        // Clear any pending timeouts
        if (this.uiView.imageOverlayManager.imageAutoHideTimeout) {
            clearTimeout(this.uiView.imageOverlayManager.imageAutoHideTimeout);
            this.uiView.imageOverlayManager.imageAutoHideTimeout = null;
        }

        // Reset stillness tracking
        this.uiView.lastCameraPosition = null;
        this.uiView.lastGlobeRotation = null;
        this.uiView.stillnessStartTime = null;
        this.uiView.wasDragging = false;
    }

    /**
     * Switch to a different variant of a multi-event
     * @param {number} variantIndex - Index of variant to switch to
     * @param {Object} eventData - Event data object
     */
    switchEventVariant(variantIndex, eventData) {
        if (!eventData || !eventData.variants || variantIndex >= eventData.variants.length) {
            return;
        }

        const variant = eventData.variants[variantIndex];
        this.currentVariantIndex = variantIndex;
        this.uiView.currentVariantIndex = variantIndex;

        // Update location display for this variant using helpers
        const eventSlideLocation = document.getElementById('eventSlideLocation');
        const variantLat = variant.lat !== undefined ? variant.lat : eventData.lat;
        const variantLon = variant.lon !== undefined ? variant.lon : eventData.lon;
        const variantX = variant.x !== undefined ? variant.x : eventData.x;
        const variantY = variant.y !== undefined ? variant.y : eventData.y;
        const variantLocationType = variant.locationType || eventData.locationType || 'earth';
        const locationName = variant.cityDisplayName || eventData.cityDisplayName || null;

        // Find variant marker
        const variantMarker = findVariantMarker(this.sceneModel, eventData, variantIndex);
        
        if (eventSlideLocation) {
            // Handle different location types using helpers (no fade for variant switching)
            if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined && window.eventManager) {
                setupEarthLocation(eventSlideLocation, variantLat, variantLon, variantMarker || marker, false, locationName, false);
            } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                setupMoonMarsLocation(eventSlideLocation, variantLocationType, variantX, variantY, locationName, variantMarker || marker, false);
            } else if (variantLocationType === 'station') {
                setupStationLocation(eventSlideLocation, locationName, variantMarker || marker, false);
            } else {
                hideLocationWithFade(eventSlideLocation, false);
            }
            
            // Update click handler to use variant marker
            if (variantMarker) {
                setupLocationClickHandler(eventSlideLocation, variantMarker, variantLocationType);
            } else if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined) {
                // For Earth without marker, create temp marker for click handler
                const tempMarker = createTempMarkerForCoords(variantLat, variantLon);
                if (tempMarker) {
                    setupLocationClickHandler(eventSlideLocation, tempMarker, variantLocationType);
                }
            } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                // For Moon/Mars, create a dummy marker for click handler
                const dummyMarker = { userData: { locationType: variantLocationType } };
                setupLocationClickHandler(eventSlideLocation, dummyMarker, variantLocationType);
            }
        }

        // Zoom to variant location
        zoomToVariantLocation(variantMarker, variantLocationType, variantLat, variantLon);

        // Update title and description
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        if (eventSlideTitle) {
            eventSlideTitle.innerHTML = (window.GlitchTextService ? window.GlitchTextService.getDisplayEventName(variant.name) : variant.name) || `Variant ${variantIndex + 1}`;
        }
        if (eventSlideText) {
            eventSlideText.innerHTML = window.GlitchTextService ? window.GlitchTextService.getDisplayText(variant.description || 'No description') : (variant.description || 'No description');
        }

        // Play switch event sound when switching variants
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('switchEvent');
        }

        // Start glitch character animation for any glitchy text overlays (only if enabled)
        if (window.GlitchTextService && window.GlitchTextService.isEnabled()) {
            window.GlitchTextService.startAnimation();
        } else {
            if (window.GlitchTextService) {
                window.GlitchTextService.stopAnimation();
            }
        }

        // Update sources and filters sections (using shared helper functions)
        this.uiView.updateEventSources(variant);
        this.uiView.updateEventFilters(variant);

        // Update image using helper
        const eventImage = document.getElementById('eventImage');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        if (eventImage && eventImageOverlay) {
            // Get image path using EventManager's function
            let imagePath = null;
            if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
                imagePath = window.eventManager.getEventImagePath(variant.name, variant.image);
            } else {
                // Fallback: construct path manually
                imagePath = variant.image || null;
                if (!imagePath || !imagePath.trim()) {
                    const normalizedName = variant.name.replace(/\s+/g, ' ').trim();
                    const encodedFileName = encodeURIComponent(normalizedName);
                    imagePath = `assets/images/events/${encodedFileName}.png`;
                }
            }

            // Process and load image
            imagePath = this.processImagePath(imagePath);
            loadEventImage(eventImage, eventImageOverlay, imagePath);
        }

        // Update variant toggle buttons
        const variantToggles = document.getElementById('eventVariantToggles');
        if (variantToggles) {
            const buttons = variantToggles.querySelectorAll('.variant-toggle-btn');
            buttons.forEach((btn, index) => {
                if (index === variantIndex) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    /**
     * Get current event marker
     */
    getCurrentEventMarker() {
        return this.currentEventMarker;
    }

    /**
     * Get current event data
     */
    getCurrentEventData() {
        return this.currentEventData;
    }

    /**
     * Get current variant index
     */
    getCurrentVariantIndex() {
        return this.currentVariantIndex;
    }

    /**
     * Set original camera position (called from zoomToMarker)
     * Note: zoomToMarker in InteractionController sets this on uiView directly,
     * so we mainly sync for consistency
     */
    setOriginalCameraPosition(position, rotation) {
        this.originalCameraPosition = position;
        this.originalGlobeRotation = rotation;
        // Sync with UIView for backward compatibility
        this.uiView.originalCameraPosition = position;
        this.uiView.originalGlobeRotation = rotation;
    }
    
    /**
     * Get original camera position (reads from uiView since zoomToMarker sets it there)
     */
    getOriginalCameraPosition() {
        return this.uiView.originalCameraPosition || this.originalCameraPosition;
    }
    
    /**
     * Get original globe rotation (reads from uiView since zoomToMarker sets it there)
     */
    getOriginalGlobeRotation() {
        return this.uiView.originalGlobeRotation || this.originalGlobeRotation;
    }
}
