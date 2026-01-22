/**
 * EventSlideManager - Handles event slide display, hiding, and variant switching
 * Extracted from UIView to reduce complexity and improve maintainability
 */

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
 * Mobile-specific constants
 */
const MOBILE_BREAKPOINT = 768;
const MOBILE_PORTRAIT_ZOOM = 5.5;
const DEFAULT_ZOOM = 3.5;

/**
 * Mobile helper functions
 */
const MobileHelpers = {
    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    },

    /**
     * Check if device is mobile portrait
     */
    isMobilePortrait() {
        return window.innerWidth <= MOBILE_BREAKPOINT && window.innerHeight > window.innerWidth;
    },

    /**
     * Get default camera zoom based on device type
     */
    getDefaultZoom() {
        return this.isMobilePortrait() ? MOBILE_PORTRAIT_ZOOM : DEFAULT_ZOOM;
    },

    /**
     * Setup mobile-specific DOM manipulations when opening event slide
     */
    setupMobileEventSlide() {
        if (!this.isMobile()) return;

        const scrollableArea = document.getElementById('eventSlideScrollable');
        const bottomSection = document.getElementById('eventSlideBottom');
        const titleEl = document.getElementById('eventSlideTitle');
        const contentEl = document.getElementById('eventSlideContent');

        // Move all children from bottom section to scrollable area
        if (scrollableArea && bottomSection) {
            while (bottomSection.firstChild) {
                scrollableArea.appendChild(bottomSection.firstChild);
            }
            console.log('[DEBUG Mobile] Moved all bottom content into scrollable area');
        }

        // Fix title position on mobile - same row as close button
        setTimeout(() => {
            if (titleEl) {
                titleEl.style.setProperty('position', 'fixed', 'important');
                titleEl.style.setProperty('top', '10px', 'important'); // Same as close button
                titleEl.style.setProperty('left', '20px', 'important');
                titleEl.style.setProperty('right', '70px', 'important');
                titleEl.style.setProperty('z-index', '999', 'important');
                titleEl.style.setProperty('background', 'transparent', 'important'); // No background
                titleEl.style.setProperty('padding', '0', 'important');
                titleEl.style.setProperty('margin', '0', 'important');
                titleEl.style.setProperty('box-shadow', 'none', 'important');
                titleEl.style.setProperty('max-width', 'calc(100% - 90px)', 'important');
                titleEl.style.setProperty('width', 'auto', 'important');
                titleEl.style.setProperty('line-height', '50px', 'important'); // Match close button height
                titleEl.style.setProperty('height', '50px', 'important'); // Match close button height
                console.log('[DEBUG Mobile] Fixed title position on same row as close button');
            }

            // Adjust content padding for fixed title row
            if (contentEl) {
                contentEl.style.setProperty('padding-top', '70px', 'important'); // Space for title/close row
            }

            // Adjust scrollable area margin for fixed title - reduced spacing
            if (scrollableArea) {
                scrollableArea.style.setProperty('margin-top', '0', 'important'); // No extra margin
                scrollableArea.style.setProperty('padding-top', '0', 'important');
            }
        }, 50);
    },

    /**
     * Cleanup mobile-specific DOM manipulations when closing event slide
     */
    cleanupMobileEventSlide() {
        if (!this.isMobile()) return;

        const scrollableArea = document.getElementById('eventSlideScrollable');
        const bottomSection = document.getElementById('eventSlideBottom');
        const titleEl = document.getElementById('eventSlideTitle');
        const contentEl = document.getElementById('eventSlideContent');

        if (scrollableArea && bottomSection) {
            // Find elements that should be in bottom section (sources, filters, buttons)
            const sourcesEl = document.getElementById('eventSourcesSection');
            const filtersEl = document.getElementById('eventFiltersSection');
            const controlButtons = document.querySelector('.event-control-buttons');
            const navButtons = document.querySelector('.event-navigation-buttons');

            // Move them back to bottom section
            if (sourcesEl && sourcesEl.parentElement === scrollableArea) {
                bottomSection.appendChild(sourcesEl);
            }
            if (filtersEl && filtersEl.parentElement === scrollableArea) {
                bottomSection.appendChild(filtersEl);
            }
            if (controlButtons && controlButtons.parentElement === scrollableArea) {
                bottomSection.appendChild(controlButtons);
            }
            if (navButtons && navButtons.parentElement === scrollableArea) {
                bottomSection.appendChild(navButtons);
            }
            console.log('[DEBUG Mobile] Moved bottom content back to bottom section');
        }

        // Reset title position
        if (titleEl) {
            titleEl.style.position = '';
            titleEl.style.top = '';
            titleEl.style.left = '';
            titleEl.style.right = '';
            titleEl.style.zIndex = '';
            titleEl.style.background = '';
            titleEl.style.padding = '';
            titleEl.style.margin = '';
            titleEl.style.boxShadow = '';
            titleEl.style.maxWidth = '';
        }

        // Reset content padding
        if (contentEl) {
            contentEl.style.paddingTop = '';
        }

        // Reset scrollable area
        if (scrollableArea) {
            scrollableArea.style.marginTop = '';
            scrollableArea.style.paddingTop = '';
        }
    }
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
            // Use variant's cityDisplayName if available, otherwise event's
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

        // Handle different location types
        if (locationType === 'earth' && lat !== undefined && lon !== undefined && window.eventManager) {
            if (!locationName) {
                // Check cache first (same as preview does)
                const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;

                // Try to get from cache first (this will have the full "City, Country" format if enhanced)
                if (window.eventManager.locationCache && window.eventManager.locationCache.has(cacheKey)) {
                    locationName = window.eventManager.locationCache.get(cacheKey);
                }

                // If not in cache, get location name (may return city only, will be enhanced later)
                if (!locationName) {
                    locationName = window.eventManager.getLocationName(lat, lon);
                }
            }

            if (locationName) {
                // Use same format as preview: icon + location name (which should be "City, Country")
                const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                if (isAlreadyOpen) {
                    // Fade transition for location
                    eventSlideLocation.style.transition = 'opacity 0.2s ease';
                    eventSlideLocation.style.opacity = '0';
                    setTimeout(() => {
                        eventSlideLocation.innerHTML = locationContent;
                        eventSlideLocation.style.display = 'block';
                        setTimeout(() => {
                            eventSlideLocation.style.opacity = '1';
                        }, 10);
                    }, 200);
                } else {
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                }

                // Make location clickable to zoom to marker
                eventSlideLocation.style.cursor = 'pointer';
                eventSlideLocation.title = 'Click to zoom to location';
                eventSlideLocation.onclick = (e) => {
                    e.stopPropagation();
                    if (marker && window.globeController && window.globeController.interactionController) {
                        if (locationType === 'moon' || locationType === 'mars') {
                            // Reset camera to default view for Moon/Mars events
                            window.globeController.interactionController.resetCameraToDefault();
                        } else {
                            // Zoom in and center on the marker (Earth events)
                            window.globeController.interactionController.zoomToMarker(marker);
                        }
                    }
                };

                // Also set up listener to update when location is enhanced with country
                const updateLocationInSlide = (updatedLat, updatedLon, updatedLocationName) => {
                    if (Math.abs(updatedLat - lat) < 0.01 && Math.abs(updatedLon - lon) < 0.01) {
                        eventSlideLocation.innerHTML = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${updatedLocationName}`;
                        // Re-attach click handler after updating innerHTML
                        eventSlideLocation.style.cursor = 'pointer';
                        eventSlideLocation.title = 'Click to zoom to location';
                        eventSlideLocation.onclick = (e) => {
                            e.stopPropagation();
                            if (marker && window.globeController && window.globeController.interactionController) {
                                if (locationType === 'moon' || locationType === 'mars') {
                                    window.globeController.interactionController.resetCameraToDefault();
                                } else {
                                    window.globeController.interactionController.zoomToMarker(marker);
                                }
                            }
                        };
                    }
                };
                // Store update function to be called by EventManager when location is enhanced
                window.updateEventSlideLocation = updateLocationInSlide;
            } else {
                // Show coordinates as fallback
                const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                if (isAlreadyOpen) {
                    // Fade transition for location
                    eventSlideLocation.style.transition = 'opacity 0.2s ease';
                    eventSlideLocation.style.opacity = '0';
                    setTimeout(() => {
                        eventSlideLocation.innerHTML = locationContent;
                        eventSlideLocation.style.display = 'block';
                        setTimeout(() => {
                            eventSlideLocation.style.opacity = '1';
                        }, 10);
                    }, 200);
                } else {
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                }

                // Make location clickable to zoom to marker (even with coordinates)
                eventSlideLocation.style.cursor = 'pointer';
                eventSlideLocation.title = 'Click to zoom to location';
                eventSlideLocation.onclick = (e) => {
                    e.stopPropagation();
                    if (marker && window.globeController && window.globeController.interactionController) {
                        if (locationType === 'moon' || locationType === 'mars') {
                            window.globeController.interactionController.resetCameraToDefault();
                        } else {
                            window.globeController.interactionController.zoomToMarker(marker);
                        }
                    }
                };
            }
        } else if (locationType === 'moon' || locationType === 'mars') {
            // Moon/Mars: use cityDisplayName or show coordinates
            if (!locationName && x !== undefined && y !== undefined) {
                locationName = `${locationType === 'moon' ? 'Moon' : 'Mars'}: (${x.toFixed(1)}, ${y.toFixed(1)})`;
            } else if (!locationName) {
                locationName = locationType === 'moon' ? 'Moon' : 'Mars';
            }

            if (locationName) {
                const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                if (isAlreadyOpen) {
                    eventSlideLocation.style.transition = 'opacity 0.2s ease';
                    eventSlideLocation.style.opacity = '0';
                    setTimeout(() => {
                        eventSlideLocation.innerHTML = locationContent;
                        eventSlideLocation.style.display = 'block';
                        setTimeout(() => {
                            eventSlideLocation.style.opacity = '1';
                        }, 10);
                    }, 200);
                } else {
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                }

                eventSlideLocation.style.cursor = 'pointer';
                eventSlideLocation.title = 'Click to zoom to location';
                eventSlideLocation.onclick = (e) => {
                    e.stopPropagation();
                    if (marker && window.globeController && window.globeController.interactionController) {
                        window.globeController.interactionController.resetCameraToDefault();
                    }
                };
            } else {
                if (isAlreadyOpen) {
                    eventSlideLocation.style.transition = 'opacity 0.2s ease';
                    eventSlideLocation.style.opacity = '0';
                    setTimeout(() => {
                        eventSlideLocation.style.display = 'none';
                    }, 200);
                } else {
                    eventSlideLocation.style.display = 'none';
                }
                eventSlideLocation.onclick = null;
                eventSlideLocation.style.cursor = '';
                eventSlideLocation.title = '';
            }
        } else if (locationType === 'station') {
            // Station: use cityDisplayName or default name
            if (!locationName) {
                locationName = 'Space Station (ISS)';
            }

            if (locationName) {
                const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                if (isAlreadyOpen) {
                    eventSlideLocation.style.transition = 'opacity 0.2s ease';
                    eventSlideLocation.style.opacity = '0';
                    setTimeout(() => {
                        eventSlideLocation.innerHTML = locationContent;
                        eventSlideLocation.style.display = 'block';
                        setTimeout(() => {
                            eventSlideLocation.style.opacity = '1';
                        }, 10);
                    }, 200);
                } else {
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                }

                eventSlideLocation.style.cursor = 'pointer';
                eventSlideLocation.title = 'Click to zoom to location';
                eventSlideLocation.onclick = (e) => {
                    e.stopPropagation();
                    if (marker && window.globeController && window.globeController.interactionController) {
                        // For station events, follow the station
                        window.globeController.interactionController.setPlanesVisibility(false);
                        window.globeController.interactionController.startFollowingStation(marker);
                    }
                };
            } else {
                if (isAlreadyOpen) {
                    eventSlideLocation.style.transition = 'opacity 0.2s ease';
                    eventSlideLocation.style.opacity = '0';
                    setTimeout(() => {
                        eventSlideLocation.style.display = 'none';
                    }, 200);
                } else {
                    eventSlideLocation.style.display = 'none';
                }
                eventSlideLocation.onclick = null;
                eventSlideLocation.style.cursor = '';
                eventSlideLocation.title = '';
            }
        } else {
            // No location data for other types
            if (isAlreadyOpen) {
                // Fade out location if hiding
                eventSlideLocation.style.transition = 'opacity 0.2s ease';
                eventSlideLocation.style.opacity = '0';
                setTimeout(() => {
                    eventSlideLocation.style.display = 'none';
                }, 200);
            } else {
                eventSlideLocation.style.display = 'none';
            }
            // Remove click handler if no location data
            eventSlideLocation.onclick = null;
            eventSlideLocation.style.cursor = '';
            eventSlideLocation.title = '';
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
            // Reset states
            eventImageOverlay.classList.remove('fade-in', 'fade-out');
            eventImage.classList.remove('fade-in', 'fade-out');

            if (imagePath) {
                // Clear any previous error handlers first to prevent false errors
                eventImage.onerror = null;
                eventImage.onload = null;

                // Ensure path is relative (no leading slash) for proper resolution
                const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

                // Add cache busting to ensure latest images load
                const cacheBuster = `?v=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const fullImagePath = `${normalizedPath}${cacheBuster}`;

                // Set up error and load handlers AFTER clearing handlers but BEFORE setting src
                // This prevents false errors from src clearing
                eventImage.onerror = () => {
                    console.error(`Failed to load event image: ${fullImagePath}`);
                    eventImage.style.display = 'none';
                    // If image fails, show black overlay instead
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
                };
                eventImage.onload = () => {
                    // Image loaded successfully - use transparent background so image shows
                    eventImage.style.display = 'block';
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
                };

                // Set image source directly (no need to clear first - browser handles cache busting)
                eventImage.style.display = 'none'; // Hide while loading
                eventImage.src = fullImagePath;
            } else {
                console.log('No image path provided for event');
                // Clear image src when no path
                eventImage.src = '';
                eventImage.style.display = 'none';
                // No image - use black background
                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            }

            // Show overlay immediately but invisible
            this.uiView.imageOverlayVisible = true;
            this.uiView.imageToggleState = true; // Toggle is on by default
            eventImageOverlay.classList.add('open');

            // Initial fade-in happens after zoom completes
            // (Recentering delay only applies when dragging after event is already open)
            setTimeout(() => {
                if (imagePath) {
                    // If there's an image, fade in the image directly (no black first)
                    eventImage.classList.add('fade-in');
                    // Disable page navigation buttons when image is fully visible
                    // Wait for image fade-in to complete (600ms transition)
                    setTimeout(() => {
                        this.uiView.disablePageNavigationButtons(true);
                    }, 600);
                } else {
                    // If no image, fade in black overlay
                    eventImageOverlay.classList.add('fade-in');
                    // Disable page navigation buttons when overlay is fully visible
                    setTimeout(() => {
                        this.uiView.disablePageNavigationButtons(true);
                    }, 600);
                }
            }, 600); // Wait for zoom to complete (500ms) + small buffer

            // Store image path for later use
            if (imagePath) {
                this.uiView.pendingImagePath = imagePath;
            } else {
                this.uiView.pendingImagePath = null;
            }

            // Setup image overlay interaction handlers
            this.uiView.setupImageOverlayHandlers(eventImageOverlay);
        } else {
            this.uiView.imageOverlayVisible = false;
            this.uiView.imageToggleState = false;
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

        this.uiView.imageOverlayVisible = false;
        this.uiView.imageToggleState = false;

        // Clear any pending timeouts
        if (this.uiView.imageAutoHideTimeout) {
            clearTimeout(this.uiView.imageAutoHideTimeout);
            this.uiView.imageAutoHideTimeout = null;
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

        // Update location display for this variant
        const eventSlideLocation = document.getElementById('eventSlideLocation');
        if (eventSlideLocation) {
            const variantLat = variant.lat !== undefined ? variant.lat : eventData.lat;
            const variantLon = variant.lon !== undefined ? variant.lon : eventData.lon;
            const variantX = variant.x !== undefined ? variant.x : eventData.x;
            const variantY = variant.y !== undefined ? variant.y : eventData.y;
            const variantLocationType = variant.locationType || eventData.locationType || 'earth';
            let locationName = variant.cityDisplayName || eventData.cityDisplayName || null;

            // Handle different location types
            if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined && window.eventManager) {
                // Earth: use location lookup
                if (!locationName) {
                    // Check cache first
                    const cacheKey = `${variantLat.toFixed(4)}_${variantLon.toFixed(4)}`;
                    if (window.eventManager.locationCache && window.eventManager.locationCache.has(cacheKey)) {
                        locationName = window.eventManager.locationCache.get(cacheKey);
                    }

                    // If not in cache, get location name
                    if (!locationName) {
                        locationName = window.eventManager.getLocationName(variantLat, variantLon);
                    }
                }

                if (locationName) {
                    const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                    eventSlideLocation.style.cursor = 'pointer';
                    eventSlideLocation.title = 'Click to zoom to location';
                } else {
                    eventSlideLocation.style.display = 'none';
                    eventSlideLocation.onclick = null;
                    eventSlideLocation.style.cursor = '';
                    eventSlideLocation.title = '';
                }
            } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                // Moon/Mars: use cityDisplayName or show coordinates
                if (!locationName && variantX !== undefined && variantY !== undefined) {
                    locationName = `${variantLocationType === 'moon' ? 'Moon' : 'Mars'}: (${variantX.toFixed(1)}, ${variantY.toFixed(1)})`;
                } else if (!locationName) {
                    locationName = variantLocationType === 'moon' ? 'Moon' : 'Mars';
                }

                if (locationName) {
                    const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                    eventSlideLocation.style.cursor = 'pointer';
                    eventSlideLocation.title = 'Click to zoom to location';
                } else {
                    eventSlideLocation.style.display = 'none';
                    eventSlideLocation.onclick = null;
                    eventSlideLocation.style.cursor = '';
                    eventSlideLocation.title = '';
                }
            } else if (variantLocationType === 'station') {
                // Station: use cityDisplayName or default name
                if (!locationName) {
                    locationName = 'Space Station (ISS)';
                }

                if (locationName) {
                    const locationContent = `<img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                    eventSlideLocation.style.cursor = 'pointer';
                    eventSlideLocation.title = 'Click to zoom to location';
                } else {
                    eventSlideLocation.style.display = 'none';
                    eventSlideLocation.onclick = null;
                    eventSlideLocation.style.cursor = '';
                    eventSlideLocation.title = '';
                }
            } else {
                eventSlideLocation.style.display = 'none';
                eventSlideLocation.onclick = null;
                eventSlideLocation.style.cursor = '';
                eventSlideLocation.title = '';
            }
        }

        // Recenter globe to variant's location if it has one
        const variantLat = variant.lat !== undefined ? variant.lat : eventData.lat;
        const variantLon = variant.lon !== undefined ? variant.lon : eventData.lon;
        const variantLocationType = variant.locationType || eventData.locationType || 'earth';

        // Find the marker for this variant and zoom to it
        if (window.globeController && window.globeController.interactionController) {
            const markers = this.sceneModel.getMarkers();
            let variantMarker = null;

            // Try to find the marker for this specific variant
            for (const marker of markers) {
                if (marker.userData.isEventMarker &&
                    marker.userData.event === eventData &&
                    marker.userData.variantIndex === variantIndex) {
                    variantMarker = marker;
                    break;
                }
            }

            // If no variant-specific marker found, use the main marker
            // (for backward compatibility with events that don't have variant-specific markers yet)
            if (!variantMarker) {
                for (const marker of markers) {
                    if (marker.userData.isEventMarker &&
                        marker.userData.event === eventData &&
                        (marker.userData.isMainVariant || marker.userData.variantIndex === 0)) {
                        variantMarker = marker;
                        break;
                    }
                }
            }

            // Set up click handler for location to zoom to this variant's marker
            if (eventSlideLocation) {
                if (variantMarker) {
                    eventSlideLocation.onclick = (e) => {
                        e.stopPropagation();
                        if (window.globeController && window.globeController.interactionController) {
                            if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                                window.globeController.interactionController.resetCameraToDefault();
                            } else if (variantLocationType === 'station') {
                                window.globeController.interactionController.setPlanesVisibility(false);
                                window.globeController.interactionController.startFollowingStation(variantMarker);
                            } else {
                                window.globeController.interactionController.zoomToMarker(variantMarker);
                            }
                        }
                    };
                } else {
                    // If no marker found, still make it clickable if we have coordinates
                    if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined) {
                        eventSlideLocation.onclick = (e) => {
                            e.stopPropagation();
                            if (window.globeController && window.globeController.interactionController) {
                                // Create temporary marker for zooming
                                const THREE = window.THREE;
                                if (THREE) {
                                    const tempMarker = new THREE.Object3D();
                                    tempMarker.userData = {
                                        lat: variantLat,
                                        lon: variantLon,
                                        isEventMarker: true
                                    };
                                    const phi = (90 - variantLat) * (Math.PI / 180);
                                    const theta = (variantLon + 180) * (Math.PI / 180);
                                    const radius = 1.02;
                                    tempMarker.position.set(
                                        -radius * Math.sin(phi) * Math.cos(theta),
                                        radius * Math.cos(phi),
                                        radius * Math.sin(phi) * Math.sin(theta)
                                    );
                                    window.globeController.interactionController.zoomToMarker(tempMarker);
                                }
                            }
                        };
                    } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                        eventSlideLocation.onclick = (e) => {
                            e.stopPropagation();
                            if (window.globeController && window.globeController.interactionController) {
                                window.globeController.interactionController.resetCameraToDefault();
                            }
                        };
                    }
                }
            }

            // If we found a marker, zoom to it or handle based on location type
            if (variantMarker) {
                if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                    window.globeController.interactionController.resetCameraToDefault();
                } else if (variantLocationType === 'station') {
                    window.globeController.interactionController.setPlanesVisibility(false);
                    window.globeController.interactionController.startFollowingStation(variantMarker);
                } else {
                    window.globeController.interactionController.zoomToMarker(variantMarker);
                }
            } else if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined) {
                // Fallback: create a temporary marker to zoom to (Earth only)
                const THREE = window.THREE;
                if (THREE && window.globeController.globeView) {
                    // Use the globeView's latLonToVector3 function via a helper
                    const tempMarker = new THREE.Object3D();
                    tempMarker.userData = {
                        lat: variantLat,
                        lon: variantLon,
                        isEventMarker: true
                    };
                    // Calculate position using lat/lon (same formula as latLonToVector3)
                    const phi = (90 - variantLat) * (Math.PI / 180);
                    const theta = (variantLon + 180) * (Math.PI / 180);
                    const radius = 1.02;
                    const x = -(radius * Math.sin(phi) * Math.cos(theta));
                    const z = radius * Math.sin(phi) * Math.sin(theta);
                    const y = radius * Math.cos(phi);
                    tempMarker.position.set(x, y, z);
                    window.globeController.interactionController.zoomToMarker(tempMarker);
                }
            } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                // For Moon/Mars without marker, just reset camera
                window.globeController.interactionController.resetCameraToDefault();
            }
        }

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

        // Update image
        const eventImage = document.getElementById('eventImage');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        if (eventImage && eventImageOverlay) {
            // Get image path using EventManager's function (same as previews and marker clicks use)
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

            // Process image path if needed
            imagePath = this.processImagePath(imagePath);

            if (imagePath) {
                // Clear any previous error handlers first to prevent false errors
                eventImage.onerror = null;
                eventImage.onload = null;

                // Ensure path is relative (no leading slash) for proper resolution
                const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

                // Add cache busting to ensure latest images load
                const cacheBuster = `?v=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const fullImagePath = `${normalizedPath}${cacheBuster}`;

                // Set up error and load handlers AFTER clearing handlers but BEFORE setting src
                eventImage.onerror = () => {
                    console.error(`Failed to load event image: ${fullImagePath}`);
                    eventImage.style.display = 'none';
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
                };
                eventImage.onload = () => {
                    eventImage.style.display = 'block';
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
                };

                // Set image source directly
                eventImage.style.display = 'none'; // Hide while loading
                eventImage.src = fullImagePath;
            } else {
                console.log('No image path provided for variant');
                eventImage.src = '';
                eventImage.style.display = 'none';
                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            }
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
