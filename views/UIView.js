/**
 * Generate random glitch character (includes numbers)
 */
function getRandomGlitchChar() {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
}

/**
 * Helper function to apply display transformations to text
 * Maps normal text to glitchy text for display purposes
 * Works for both event names and descriptions
 * Returns HTML with glitchy text overlay effect
 */
// Global glitch enabled state (can be accessed by UIView instance)
let globalGlitchEnabled = true;

function getDisplayText(text) {
    if (!text) return text;
    
    // Convert newlines to <br> tags to preserve paragraph spacing
    // First preserve line breaks by normalizing multiple newlines
    let processedText = text;
    
    // Normalize multiple newlines to double newlines (paragraph breaks)
    processedText = processedText.replace(/\n\n+/g, '\n\n');
    
    // Only apply glitch if enabled
    if (!globalGlitchEnabled) {
        // Convert newlines to <br> tags
        processedText = processedText.replace(/\n/g, '<br>');
        return processedText;
    }
    
    // First, replace "Olivia Colomar" as a whole (full name together)
    // Use a unique placeholder to mark already processed text
    const placeholders = [];
    let placeholderIndex = 0;
    
    // Replace full "Olivia Colomar" first (case-insensitive, with word boundaries to avoid partial matches)
    processedText = processedText.replace(/\bOlivia\s+Colomar\b/gi, (match) => {
        const placeholder = `__GLITCH_FULL_${placeholderIndex}__`;
        const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
        placeholders[placeholderIndex] = `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
        placeholderIndex++;
        return placeholder;
    });
    
    // Then replace "Olivia" individually (word boundary ensures it's not part of "Olivia Colomar" which is already replaced)
    processedText = processedText.replace(/\bOlivia\b/gi, (match) => {
        const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
        return `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
    });
    
    // Then replace "Colomar" individually (word boundary ensures it's not part of "Olivia Colomar" which is already replaced)
    processedText = processedText.replace(/\bColomar\b/gi, (match) => {
        const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
        return `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
    });
    
    // Restore placeholders (full "Olivia Colomar" replacements)
    placeholders.forEach((replacement, index) => {
        processedText = processedText.replace(`__GLITCH_FULL_${index}__`, replacement);
    });
    
    // Convert newlines to <br> tags after glitch processing
    processedText = processedText.replace(/\n/g, '<br>');
    
    return processedText;
}

/**
 * Helper function for backward compatibility (event names)
 */
function getDisplayEventName(eventName) {
    return getDisplayText(eventName);
}

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
        this.originalCameraPosition = null; // Store original camera position before zoom
        this.originalGlobeRotation = null; // Store original globe rotation before zoom
        this.imageAutoHideTimeout = null; // Timeout for auto-showing image after recentering
        this.lastCameraPosition = null; // Track last camera position for stillness detection
        this.lastGlobeRotation = null; // Track last globe rotation for stillness detection
        this.stillnessStartTime = null; // When camera/globe became still
        this.wasDragging = false; // Track previous dragging state to detect drag start
        this.glitchInterval = null; // Interval for glitch animation
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
        // Play event click sound when opening event
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('eventClick');
        }
        
        // Process image path if provided - but only if it needs processing
        // If path comes from getEventImagePath, it's already properly formatted, so skip processing
        if (imagePath && imagePath.trim()) {
            imagePath = imagePath.trim();
            // Only process if path doesn't look properly formatted already
            // If path already contains Event%20Images/ with encoded filename, use it as-is
            // Only process if it has Event Images/ (with space) or needs normalization
            if (imagePath.includes('Event Images/') && !imagePath.includes('Event%20Images/')) {
                // Handle "Event Images/" format (with space) - convert to URL-encoded
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
                        imagePath = `Event%20Images/${encodeURIComponent(filename)}`;
                    }
                }
            }
            // If path already has Event%20Images/, use it as-is (already properly formatted)
        }
        
        const eventSlide = document.getElementById('eventSlide');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        const imageToggleBtn = document.getElementById('eventImageToggle');
        const variantToggles = document.getElementById('eventVariantToggles');
        
        // Store current event marker and data
        this.currentEventMarker = marker;
        this.currentEventData = eventData;
        this.currentVariantIndex = 0; // Track which variant is currently displayed
        
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
            
            // Setup variant toggle buttons for multi-events
            if (isMultiEvent && variantToggles) {
                variantToggles.style.display = 'flex';
                variantToggles.innerHTML = '';
                
                // Create button for each variant
                eventData.variants.forEach((variant, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'variant-toggle-btn';
                    btn.innerHTML = getDisplayEventName(variant.name) || `Variant ${index + 1}`;
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
            
            // Helper function to update content with fade transition
            const updateContentWithFade = (element, newContent) => {
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
            };
            
            // Update title with fade
            updateContentWithFade(eventSlideTitle, getDisplayEventName(eventName));
            
            // Display location between title and description
            const eventSlideLocation = document.getElementById('eventSlideLocation');
            if (eventSlideLocation && eventData) {
                // For multi-events, get location from the current variant or event
                const isMultiEvent = eventData.variants && eventData.variants.length > 0;
                let lat, lon, locationName, locationType;
                
                if (isMultiEvent) {
                    // Use the variant index from marker if available, otherwise default to 0
                    const variantIndex = (marker && marker.userData && marker.userData.variantIndex !== undefined) 
                        ? marker.userData.variantIndex 
                        : 0;
                    const currentVariant = eventData.variants[variantIndex] || eventData.variants[0];
                    lat = currentVariant.lat !== undefined ? currentVariant.lat : eventData.lat;
                    lon = currentVariant.lon !== undefined ? currentVariant.lon : eventData.lon;
                    // Use variant's cityDisplayName if available, otherwise event's
                    locationName = currentVariant.cityDisplayName || eventData.cityDisplayName || null;
                    locationType = currentVariant.locationType || eventData.locationType || 'earth';
                } else {
                    lat = eventData.lat;
                    lon = eventData.lon;
                    locationName = eventData.cityDisplayName || null;
                    locationType = eventData.locationType || 'earth';
                }
                
                if (lat !== undefined && lon !== undefined && window.eventManager) {
                    
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
                        const locationContent = `<img src="Icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
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
                                eventSlideLocation.innerHTML = `<img src="Icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${updatedLocationName}`;
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
                        const locationContent = `<img src="Icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
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
                } else {
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
            
            // Update description with fade
            updateContentWithFade(eventSlideText, getDisplayText(description || 'Placeholder text for event information. This will be replaced with actual event details.'));
            
            // Start glitch character animation for any glitchy text overlays (only if enabled)
            if (globalGlitchEnabled) {
                this.startGlitchAnimation();
                // Show hacked image overlay when opening event with glitch enabled
                // Wait for slide animation to complete (300ms) + buffer for text rendering
                setTimeout(() => {
                    this.showHackedOverlay();
                }, 400); // Wait for slide transition (300ms) + 100ms buffer for text rendering
            } else {
                this.stopGlitchAnimation();
            }
            
            // Get current variant or main event
            const currentEvent = isMultiEvent ? eventData.variants[this.currentVariantIndex] : eventData;
            
            // Update sources and filters sections (using shared helper functions)
            this.updateEventSources(currentEvent);
            this.updateEventFilters(currentEvent);
            
            // Hide variant markers for previous event (if switching between events)
            if (this.currentEventData && 
                this.currentEventData !== eventData && 
                this.currentEventData.variants && 
                this.currentEventData.variants.length > 0) {
                this.hideVariantMarkers(this.currentEventData);
            }
            
            // Store event data for variant switching
            if (isMultiEvent) {
                this.currentEventData = eventData;
            }
            
            // Show variant markers for this event (if it's a multi-event)
            if (eventData && eventData.variants && eventData.variants.length > 0) {
                this.showVariantMarkers(eventData);
            }
            
            eventSlide.classList.add('open');
            
            // Adjust image overlay position when slide opens
            if (eventImageOverlay) {
                eventImageOverlay.classList.add('slide-open');
            }
            
            // On mobile: move bottom section content into scrollable area and fix title position
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
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
            }
            
            // Call helper functions to update sources and filters
            setTimeout(() => {
                this.updateEventSources(currentEvent);
                this.updateEventFilters(currentEvent);
            }, 100);
        }
        
        // Initialize image overlay state - show by default with fade sequence
        if (eventImageOverlay && eventImage) {
            // Reset states
            eventImageOverlay.classList.remove('fade-in', 'fade-out');
            eventImage.classList.remove('fade-in', 'fade-out');
            
            if (imagePath) {
                // Clear any previous error handlers first
                eventImage.onerror = null;
                eventImage.onload = null;
                
                // Set up error and load handlers BEFORE setting src
                eventImage.onerror = () => {
                    console.error(`Failed to load event image: ${imagePath}`);
                    console.error(`Tried to load from: ${window.location.origin}/${imagePath}`);
                    eventImage.style.display = 'none';
                    // If image fails, show black overlay instead
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
                };
                eventImage.onload = () => {
                    console.log(`Successfully loaded event image: ${imagePath}`);
                    // Image loaded successfully - use transparent background so image shows
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
                };
                
                // Ensure path is relative (no leading slash) for proper resolution
                const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
                
                // Force reload by clearing src first, then setting new src with cache busting
                // This matches how preview images work but with cache busting for overlay
                eventImage.src = '';
                eventImage.style.display = 'none';
                
                // Use setTimeout to ensure browser processes the clear before setting new src
                setTimeout(() => {
                    // Add cache busting to ensure latest images load (different from previews which don't use it)
                    const cacheBuster = `?v=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    // Set the new image source (browser will load it fresh)
                    eventImage.src = `${normalizedPath}${cacheBuster}`;
                    eventImage.style.display = 'block';
                    // Start with transparent background for image
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
                }, 10); // Small delay to ensure src clear is processed
            } else {
                console.log('No image path provided for event');
                // Clear image src when no path
                eventImage.src = '';
                eventImage.style.display = 'none';
                // No image - use black background
                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            }
            
            // Show overlay immediately but invisible
            this.imageOverlayVisible = true;
            this.imageToggleState = true; // Toggle is on by default
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
                        this.disablePageNavigationButtons(true);
                    }, 600);
                } else {
                    // If no image, fade in black overlay
                    eventImageOverlay.classList.add('fade-in');
                    // Disable page navigation buttons when overlay is fully visible
                    setTimeout(() => {
                        this.disablePageNavigationButtons(true);
                    }, 600);
                }
            }, 600); // Wait for zoom to complete (500ms) + small buffer
            
            // Store image path for later use
            if (imagePath) {
                this.pendingImagePath = imagePath;
            } else {
                this.pendingImagePath = null;
            }
            
            // Setup image overlay interaction handlers
            this.setupImageOverlayHandlers(eventImageOverlay);
        } else {
            this.imageOverlayVisible = false;
            this.imageToggleState = false;
        }
        
        // Update toggle button text
        if (imageToggleBtn) {
            imageToggleBtn.textContent = 'Hide Image';
            imageToggleBtn.onclick = () => this.toggleEventImage();
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
            globalGlitchEnabled,
            soundManager: !!window.SoundEffectsManager
        });
        
        if (glitchToggleBtn) {
            if (hasOliviaColomar) {
                glitchToggleBtn.style.display = 'block';
                glitchToggleBtn.style.visibility = 'visible';
                globalGlitchEnabled = true; // Reset to enabled when opening event
                glitchToggleBtn.textContent = 'Disable Glitch';
                glitchToggleBtn.onclick = () => this.toggleGlitchEffect();
                
                // Play hack on sound when opening event with glitch effect active (only if glitch is enabled)
                // Use a small delay to ensure SoundEffectsManager is fully initialized
                setTimeout(() => {
                    if (globalGlitchEnabled && window.SoundEffectsManager && window.SoundEffectsManager.play) {
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
                        console.log('Not playing sound - globalGlitchEnabled:', globalGlitchEnabled, 'SoundManager:', !!window.SoundEffectsManager, 'play method:', !!(window.SoundEffectsManager && window.SoundEffectsManager.play));
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
        this.setupEventNavigation();
        
        // Reset stillness tracking
        this.lastCameraPosition = null;
        this.lastGlobeRotation = null;
        this.stillnessStartTime = null;
        this.wasDragging = false;
    }
    
    /**
     * Setup event navigation buttons (prev/next in full events list)
     */
    setupEventNavigation() {
        const prevBtn = document.getElementById('eventPrevBtn');
        const nextBtn = document.getElementById('eventNextBtn');
        
        if (!prevBtn || !nextBtn) return;
        
        // Remove existing listeners by cloning
        const prevBtnClone = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(prevBtnClone, prevBtn);
        const nextBtnClone = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(nextBtnClone, nextBtn);
        
        const newPrevBtn = document.getElementById('eventPrevBtn');
        const newNextBtn = document.getElementById('eventNextBtn');
        
        // Get all events from EventManager (full list, not paginated)
        const getAllEvents = () => {
            if (window.eventManager && window.eventManager.events) {
                return window.eventManager.events;
            }
            if (this.dataModel) {
                return this.dataModel.getAllEvents();
            }
            return [];
        };
        
        // Find current event index in full list
        const getCurrentEventIndex = () => {
            const allEvents = getAllEvents();
            if (!this.currentEventData || allEvents.length === 0) return -1;
            
            // Get location type from current event (check marker or event data)
            const currentLocationType = (this.currentEventMarker && this.currentEventMarker.userData && this.currentEventMarker.userData.locationType) ||
                                       this.currentEventData.locationType || 'earth';
            
            // Match by location type, coordinates, and name
            return allEvents.findIndex(event => {
                const eventLocationType = event.locationType || 'earth';
                
                // Location types must match
                if (eventLocationType !== currentLocationType) return false;
                
                if (event.variants && event.variants.length > 0) {
                    // Multi-event: match first variant
                    const variant = event.variants[0];
                    const variantLocationType = variant.locationType || eventLocationType;
                    
                    // Check if variant location type matches
                    if (variantLocationType !== currentLocationType) return false;
                    
                    // Match by coordinates based on location type
                    let coordsMatch = false;
                    if (currentLocationType === 'moon' || currentLocationType === 'mars') {
                        // Moon/Mars: match by x/y coordinates
                        const currentX = this.currentEventData.x !== undefined ? this.currentEventData.x : 
                                        (this.currentEventData.variants?.[0]?.x !== undefined ? this.currentEventData.variants[0].x : undefined);
                        const currentY = this.currentEventData.y !== undefined ? this.currentEventData.y : 
                                        (this.currentEventData.variants?.[0]?.y !== undefined ? this.currentEventData.variants[0].y : undefined);
                        const variantX = variant.x !== undefined ? variant.x : event.x;
                        const variantY = variant.y !== undefined ? variant.y : event.y;
                        
                        if (currentX !== undefined && currentY !== undefined && variantX !== undefined && variantY !== undefined) {
                            coordsMatch = Math.abs(variantX - currentX) < 0.1 && Math.abs(variantY - currentY) < 0.1;
                        }
                    } else {
                        // Earth: match by lat/lon
                        const currentLat = this.currentEventData.lat !== undefined ? this.currentEventData.lat : 
                                          (this.currentEventData.variants?.[0]?.lat !== undefined ? this.currentEventData.variants[0].lat : undefined);
                        const currentLon = this.currentEventData.lon !== undefined ? this.currentEventData.lon : 
                                          (this.currentEventData.variants?.[0]?.lon !== undefined ? this.currentEventData.variants[0].lon : undefined);
                        const variantLat = variant.lat !== undefined ? variant.lat : event.lat;
                        const variantLon = variant.lon !== undefined ? variant.lon : event.lon;
                        
                        if (currentLat !== undefined && currentLon !== undefined && variantLat !== undefined && variantLon !== undefined) {
                            coordsMatch = Math.abs(variantLat - currentLat) < 0.0001 && Math.abs(variantLon - currentLon) < 0.0001;
                        }
                    }
                    
                    return coordsMatch && variant.name === (this.currentEventData.variants?.[0]?.name || this.currentEventData.name);
                } else {
                    // Single event: match by coordinates and name
                    let coordsMatch = false;
                    if (currentLocationType === 'moon' || currentLocationType === 'mars') {
                        // Moon/Mars: match by x/y coordinates
                        const currentX = this.currentEventData.x;
                        const currentY = this.currentEventData.y;
                        const eventX = event.x;
                        const eventY = event.y;
                        
                        if (currentX !== undefined && currentY !== undefined && eventX !== undefined && eventY !== undefined) {
                            coordsMatch = Math.abs(eventX - currentX) < 0.1 && Math.abs(eventY - currentY) < 0.1;
                        }
                    } else {
                        // Earth: match by lat/lon
                        const currentLat = this.currentEventData.lat;
                        const currentLon = this.currentEventData.lon;
                        const eventLat = event.lat;
                        const eventLon = event.lon;
                        
                        if (currentLat !== undefined && currentLon !== undefined && eventLat !== undefined && eventLon !== undefined) {
                            coordsMatch = Math.abs(eventLat - currentLat) < 0.0001 && Math.abs(eventLon - currentLon) < 0.0001;
                        }
                    }
                    
                    return coordsMatch && event.name === this.currentEventData.name;
                }
            });
        };
        
        // Navigate to event at index
        const navigateToEvent = (targetIndex) => {
            const allEvents = getAllEvents();
            if (targetIndex < 0 || targetIndex >= allEvents.length) return;
            
            const targetEvent = allEvents[targetIndex];
            
            // Check if event is on current page, if not switch to correct page
            if (this.dataModel && window.globeController) {
                const eventsPerPage = this.dataModel.eventsPerPage || 10;
                const targetPage = Math.floor(targetIndex / eventsPerPage) + 1;
                const currentPage = this.dataModel.getCurrentEventPage();
                
                if (targetPage !== currentPage) {
                    this.dataModel.setCurrentEventPage(targetPage);
                    
                    // Refresh markers and pagination
                    if (window.globeController.globeView) {
                        window.globeController.globeView.refreshEventMarkers();
                    }
                    if (window.globeController.uiView) {
                        window.globeController.uiView.setupEventPagination(() => {
                            if (window.globeController.globeView) {
                                window.globeController.globeView.refreshEventMarkers();
                            }
                        });
                    }
                }
            }
            
            // Find the marker for this event
            if (window.globeController && window.globeController.globeView) {
                const markers = window.globeController.sceneModel.getMarkers();
                const targetLocationType = targetEvent.locationType || 'earth';
                
                const eventMarker = markers.find(m => {
                    if (m.userData && m.userData.isEventMarker) {
                        const markerEvent = m.userData.event;
                        const markerLocationType = m.userData.locationType || 'earth';
                        
                        // Location types must match
                        if (markerLocationType !== targetLocationType) return false;
                        
                        // Match by event object reference first
                        if (markerEvent === targetEvent) return true;
                        
                        // Match by coordinates based on location type
                        if (targetLocationType === 'moon' || targetLocationType === 'mars') {
                            // Moon/Mars: match by x/y coordinates
                            const markerX = m.userData.x;
                            const markerY = m.userData.y;
                            const targetX = targetEvent.x;
                            const targetY = targetEvent.y;
                            
                            if (markerX !== undefined && markerY !== undefined && targetX !== undefined && targetY !== undefined) {
                                return Math.abs(markerX - targetX) < 0.1 && Math.abs(markerY - targetY) < 0.1;
                            }
                        } else {
                            // Earth: match by lat/lon
                            const markerLat = m.userData.lat;
                            const markerLon = m.userData.lon;
                            const targetLat = targetEvent.lat;
                            const targetLon = targetEvent.lon;
                            
                            if (markerLat !== undefined && markerLon !== undefined && targetLat !== undefined && targetLon !== undefined) {
                                return Math.abs(markerLat - targetLat) < 0.0001 && Math.abs(markerLon - targetLon) < 0.0001;
                            }
                        }
                    }
                    return false;
                });
                
                if (eventMarker) {
                    // Check if this is a multi-event
                    const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
                    const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;
                    
                    const eventName = displayEvent.name || eventMarker.userData.eventName;
                    const eventDescription = displayEvent.description;
                    
                    // Get image path - use EventManager's function if available for consistency
                    let imagePath = null;
                    if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
                        imagePath = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
                        console.log(`[UIView] Image path for "${eventName}": ${imagePath}`);
                    } else {
                        // Fallback: construct path manually
                        imagePath = displayEvent.image || null;
                        if (!imagePath || !imagePath.trim()) {
                            const normalizedName = eventName.replace(/\s+/g, ' ').trim();
                            const encodedFileName = encodeURIComponent(normalizedName);
                            imagePath = `Event%20Images/${encodedFileName}.png`;
                        }
                        console.log(`[UIView] Image path (fallback) for "${eventName}": ${imagePath}`);
                    }
                    
                    // Zoom to marker or reset to default view (for Moon/Mars) and show event slide
                    if (window.globeController.interactionController) {
                        const locationType = eventMarker.userData ? eventMarker.userData.locationType : 'earth';
                        if (locationType === 'moon' || locationType === 'mars') {
                            // Reset camera to default view for Moon/Mars events
                            window.globeController.interactionController.resetCameraToDefault();
                        } else {
                            // Zoom in and center on the marker (Earth events)
                            window.globeController.interactionController.zoomToMarker(eventMarker);
                        }
                    }
                    
                    this.showEventSlide(
                        eventName,
                        imagePath,
                        eventDescription,
                        eventMarker,
                        targetEvent
                    );
                }
            }
        };
        
        // Update button states
        const updateNavButtons = () => {
            const allEvents = getAllEvents();
            const currentIndex = getCurrentEventIndex();
            
            newPrevBtn.disabled = currentIndex <= 0 || allEvents.length === 0;
            newNextBtn.disabled = currentIndex >= allEvents.length - 1 || allEvents.length === 0;
        };
        
        // Initial update
        updateNavButtons();
        
        // Previous button
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }
            
            const currentIndex = getCurrentEventIndex();
            if (currentIndex > 0) {
                navigateToEvent(currentIndex - 1);
            }
        });
        
        // Next button
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }
            
            const currentIndex = getCurrentEventIndex();
            const allEvents = getAllEvents();
            if (currentIndex < allEvents.length - 1) {
                navigateToEvent(currentIndex + 1);
            }
        });
        
        // All Events button
        const allEventsBtn = document.getElementById('eventAllEventsBtn');
        if (allEventsBtn) {
            // Remove existing listeners by cloning
            const allEventsBtnClone = allEventsBtn.cloneNode(true);
            allEventsBtn.parentNode.replaceChild(allEventsBtnClone, allEventsBtn);
            const newAllEventsBtn = document.getElementById('eventAllEventsBtn');
            
            newAllEventsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Play sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventClick');
                }
                
                // Close current event
                this.hideEventSlide();
                
                // Open event manager (keep globe visible)
                const panel = document.getElementById('eventsManagePanel');
                const toggleBtn = document.getElementById('eventsManageToggle');
                if (panel) {
                    panel.classList.add('open');
                }
                if (toggleBtn) {
                    toggleBtn.classList.add('active');
                }
            });
        }
    }
    
    /**
     * Switch to a different variant of a multi-event
     */
    switchEventVariant(variantIndex, eventData) {
        if (!eventData || !eventData.variants || variantIndex >= eventData.variants.length) {
            return;
        }

        const variant = eventData.variants[variantIndex];
        this.currentVariantIndex = variantIndex;
        
        // Update location display for this variant
        const eventSlideLocation = document.getElementById('eventSlideLocation');
        if (eventSlideLocation) {
            const variantLat = variant.lat !== undefined ? variant.lat : eventData.lat;
            const variantLon = variant.lon !== undefined ? variant.lon : eventData.lon;
            const variantLocationType = variant.locationType || eventData.locationType || 'earth';
            
            if (variantLat !== undefined && variantLon !== undefined && window.eventManager) {
                // Use variant's cityDisplayName if available, otherwise get from location lookup
                let locationName = variant.cityDisplayName || null;
                
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
                    const locationContent = `<img src="Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName}`;
                    eventSlideLocation.innerHTML = locationContent;
                    eventSlideLocation.style.display = 'block';
                    eventSlideLocation.style.opacity = '1';
                    
                    // Make location clickable to zoom to marker
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
                            } else {
                                window.globeController.interactionController.zoomToMarker(variantMarker);
                            }
                        }
                    };
                } else {
                    // If no marker found, still make it clickable if we have coordinates
                    if (variantLat !== undefined && variantLon !== undefined) {
                        eventSlideLocation.onclick = (e) => {
                            e.stopPropagation();
                            if (window.globeController && window.globeController.interactionController) {
                                if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                                    window.globeController.interactionController.resetCameraToDefault();
                                } else {
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
                            }
                        };
                    }
                }
            }
            
            // If we found a marker, zoom to it
            if (variantMarker) {
                window.globeController.interactionController.zoomToMarker(variantMarker);
            } else {
                // Fallback: create a temporary marker to zoom to
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
            }
        }

        // Update title and description
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        if (eventSlideTitle) {
            eventSlideTitle.innerHTML = getDisplayEventName(variant.name) || `Variant ${variantIndex + 1}`;
        }
        if (eventSlideText) {
            eventSlideText.innerHTML = getDisplayText(variant.description || 'No description');
        }
        
        // Play switch event sound when switching variants
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('switchEvent');
        }
        
        // Start glitch character animation for any glitchy text overlays (only if enabled)
        if (globalGlitchEnabled) {
            this.startGlitchAnimation();
        } else {
            this.stopGlitchAnimation();
        }

        // Update sources and filters sections (using shared helper functions)
        this.updateEventSources(variant);
        this.updateEventFilters(variant);
        

        // Update image
        const eventImage = document.getElementById('eventImage');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        if (eventImage && eventImageOverlay) {
            // Get image path using EventManager's function (same as previews and marker clicks use)
            let imagePath = null;
            if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
                imagePath = window.eventManager.getEventImagePath(variant.name, variant.image);
                console.log(`[UIView] Image path for variant "${variant.name}": ${imagePath}`);
            } else {
                // Fallback: construct path manually
                imagePath = variant.image || null;
                if (!imagePath || !imagePath.trim()) {
                    const normalizedName = variant.name.replace(/\s+/g, ' ').trim();
                    const encodedFileName = encodeURIComponent(normalizedName);
                    imagePath = `Event%20Images/${encodedFileName}.png`;
                } else {
                    // Encode provided path to handle special characters (but don't double-encode)
                    imagePath = imagePath.trim();
                    const folderPattern = /Event(?:%20| )Images\//;
                    if (folderPattern.test(imagePath)) {
                        const parts = imagePath.split(/Event(?:%20| )Images\//);
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
                            imagePath = `Event%20Images/${encodeURIComponent(filename)}`;
                        }
                    }
                }
                console.log(`[UIView] Image path (fallback) for variant "${variant.name}": ${imagePath}`);
            }

            if (imagePath) {
                // Clear any previous error handlers first
                eventImage.onerror = null;
                eventImage.onload = null;
                
                // Set up error and load handlers
                eventImage.onerror = () => {
                    console.error(`Failed to load event image: ${imagePath}`);
                    eventImage.style.display = 'none';
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
                };
                eventImage.onload = () => {
                    console.log(`Successfully loaded event image: ${imagePath}`);
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
                };
                
                // Ensure path is relative (no leading slash) for proper resolution
                const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
                
                // Force reload by clearing src first, then setting new src with cache busting
                eventImage.src = '';
                eventImage.style.display = 'none';
                
                // Use setTimeout to ensure browser processes the clear before setting new src
                setTimeout(() => {
                    // Add cache busting to ensure latest images load
                    const cacheBuster = `?v=${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    eventImage.src = `${normalizedPath}${cacheBuster}`;
                    eventImage.style.display = 'block';
                    eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
                }, 10); // Small delay to ensure src clear is processed
            } else {
                eventImage.src = '';
                eventImage.style.display = 'none';
                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            }
        }

        // Update active button
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
     * Toggle glitch effect for Olivia Colomar text
     */
    toggleGlitchEffect() {
        const wasEnabled = globalGlitchEnabled;
        globalGlitchEnabled = !globalGlitchEnabled;
        const glitchToggleBtn = document.getElementById('eventGlitchToggle');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        
        // Play appropriate hack sound when toggling glitch effect
        if (window.SoundEffectsManager && window.SoundEffectsManager.play) {
            try {
                if (globalGlitchEnabled) {
                    // Toggling ON
                    console.log('Playing hackOn sound (toggle)');
                    window.SoundEffectsManager.play('hackOn', {
                        playbackRate: 1.2, // Speed up by 20%
                        fadeOut: true,
                        fadeOutDuration: 500 // 500ms fade out
                    });
                } else {
                    // Toggling OFF
                    console.log('Playing hackOff sound (toggle)');
                    window.SoundEffectsManager.play('hackOff', {
                        playbackRate: 1.2 // Speed up by 20%
                    });
                }
            } catch (e) {
                console.error('Error playing hack sound:', e);
            }
        } else {
            console.warn('SoundEffectsManager not available for toggle');
        }
        
        if (glitchToggleBtn) {
            glitchToggleBtn.textContent = globalGlitchEnabled ? 'Disable Glitch' : 'Enable Glitch';
        }
        
        // Re-render title and description with updated glitch state
        if (eventSlideTitle && this.currentEventData) {
            const isMultiEvent = this.currentEventData.variants && this.currentEventData.variants.length > 0;
            const currentEvent = isMultiEvent ? this.currentEventData.variants[this.currentVariantIndex] : this.currentEventData;
            const eventName = currentEvent.name || (this.currentEventMarker ? this.currentEventMarker.userData.eventName : 'Event');
            eventSlideTitle.innerHTML = getDisplayEventName(eventName);
        }
        
        if (eventSlideText && this.currentEventData) {
            const isMultiEvent = this.currentEventData.variants && this.currentEventData.variants.length > 0;
            const currentEvent = isMultiEvent ? this.currentEventData.variants[this.currentVariantIndex] : this.currentEventData;
            const description = currentEvent.description || 'Placeholder text for event information.';
            eventSlideText.innerHTML = getDisplayText(description);
        }
        
        // Update glitch animation based on state
        if (globalGlitchEnabled) {
            this.startGlitchAnimation();
            // Show hacked image overlay after a brief delay to ensure glitchy text is rendered
            setTimeout(() => {
                this.showHackedOverlay();
            }, 50);
        } else {
            this.stopGlitchAnimation();
        }
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
        // Stop glitch animation when hiding slide
        this.stopGlitchAnimation();
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
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
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
        
        // Hide image overlay immediately
        if (eventImageOverlay) {
            eventImageOverlay.classList.remove('slide-open', 'open', 'fade-in', 'fade-out');
        }
        
        if (eventImage) {
            eventImage.classList.remove('fade-in', 'fade-out');
            eventImage.style.display = 'none';
        }
        
        // Re-enable page navigation buttons when event slide is closed
        this.disablePageNavigationButtons(false);
        
        // Hide variant markers for the current event (if it was a multi-event)
        if (this.currentEventData && this.currentEventData.variants && this.currentEventData.variants.length > 0) {
            this.hideVariantMarkers(this.currentEventData);
        }
        
        // Clear current event data
        this.currentEventData = null;
        this.currentEventMarker = null;
        
        // Zoom out and restore camera position
        this.zoomOutFromEvent();
        
        // Clear event marker and restore previous auto-rotate state
        this.sceneModel.eventMarker = null;
        this.currentEventMarker = null;
        
        if (this.previousAutoRotateState !== null) {
            this.sceneModel.setAutoRotateEnabled(this.previousAutoRotateState);
            if (this.previousAutoRotateState) {
                this.sceneModel.setAutoRotate(true);
            }
            this.previousAutoRotateState = null;
        }
        
        this.imageOverlayVisible = false;
        this.imageToggleState = false;
        
        // Clear any pending timeouts
        if (this.imageAutoHideTimeout) {
            clearTimeout(this.imageAutoHideTimeout);
            this.imageAutoHideTimeout = null;
        }
        
        // Reset stillness tracking
        this.lastCameraPosition = null;
        this.lastGlobeRotation = null;
        this.stillnessStartTime = null;
        this.wasDragging = false;
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
                const defaultPosition = new THREE.Vector3(0, 0, 3.5);
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
            rotateIcon.innerHTML = '<img src="Icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
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
                rotateIcon.innerHTML = '<img src="Icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
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
            hyperloopIcon.innerHTML = '<img src="Icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
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
                hyperloopIcon.innerHTML = '<img src="Icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
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
     * Setup event pagination controls
     * @param {Function} onPageChange - Callback when page changes
     */
    setupEventPagination(onPageChange) {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInput = document.getElementById('pageInput');
        const pageTotal = document.getElementById('pageTotal');
        
        if (!prevBtn || !nextBtn || !pageInput || !pageTotal || !this.dataModel) return;
        
        // Remove existing event listeners by cloning the buttons (removes all listeners)
        const prevBtnClone = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(prevBtnClone, prevBtn);
        const nextBtnClone = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(nextBtnClone, nextBtn);
        const pageInputClone = pageInput.cloneNode(true);
        pageInput.parentNode.replaceChild(pageInputClone, pageInput);
        
        // Get references to the new cloned elements
        const newPrevBtn = document.getElementById('prevPageBtn');
        const newNextBtn = document.getElementById('nextPageBtn');
        const newPageInput = document.getElementById('pageInput');
        
        // Update pagination UI
        const updatePaginationUI = () => {
            const currentPage = this.dataModel.getCurrentEventPage();
            const totalPages = this.dataModel.getTotalEventPages();
            
            // Update input value (without triggering change event)
            newPageInput.value = currentPage;
            newPageInput.max = totalPages;
            pageTotal.textContent = `/ ${totalPages}`;
            
            // Enable wrap buttons - change icon and behavior at boundaries
            if (totalPages > 1) {
                // Previous button: wrap to last page if on first page
                if (currentPage === 1) {
                    newPrevBtn.disabled = false;
                    newPrevBtn.textContent = '↻'; // Wrap icon
                    newPrevBtn.title = 'Go to Last Page';
                } else {
                    newPrevBtn.disabled = false;
                    newPrevBtn.textContent = '‹'; // Normal left arrow
                    newPrevBtn.title = 'Previous Page';
                }
                
                // Next button: wrap to first page if on last page
                if (currentPage === totalPages) {
                    newNextBtn.disabled = false;
                    newNextBtn.textContent = '↻'; // Wrap icon
                    newNextBtn.title = 'Go to First Page';
                } else {
                    newNextBtn.disabled = false;
                    newNextBtn.textContent = '›'; // Normal right arrow
                    newNextBtn.title = 'Next Page';
                }
            } else {
                // Only one page or no events - disable both
                newPrevBtn.disabled = true;
                newNextBtn.disabled = true;
                newPrevBtn.textContent = '‹';
                newNextBtn.textContent = '›';
            }
            
            // Hide pagination if only one page or no events
            const pagination = document.getElementById('eventPagination');
            if (pagination) {
                if (totalPages <= 1) {
                    pagination.style.display = 'none';
                } else {
                    pagination.style.display = 'flex';
                }
            }
        };
        
        // Setup event number buttons (1-10) - get update function
        const updateNumberButtons = this.setupEventNumberButtons();
        // Store updateNumberButtons so it can be called when filters are applied
        this.updateNumberButtons = updateNumberButtons;
        
        // Wrap updatePaginationUI to also update number buttons
        const originalUpdatePaginationUI = updatePaginationUI;
        const wrappedUpdatePaginationUI = () => {
            originalUpdatePaginationUI();
            if (updateNumberButtons) {
                updateNumberButtons();
            }
        };
        
        // Initial update
        wrappedUpdatePaginationUI();
        
        // Previous page button - go to previous page or wrap to last
        newPrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Play sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }
            
            if (!newPrevBtn.disabled) {
                const currentPage = this.dataModel.getCurrentEventPage();
                const totalPages = this.dataModel.getTotalEventPages();
                
                let newPage;
                if (currentPage === 1) {
                    // Wrap to last page
                    newPage = totalPages;
                } else {
                    // Normal previous page
                    newPage = currentPage - 1;
                }
                
                this.dataModel.setCurrentEventPage(newPage);
                wrappedUpdatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });
        
        // Next page button - go to next page or wrap to first
        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Play sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }
            
            if (!newNextBtn.disabled) {
                const currentPage = this.dataModel.getCurrentEventPage();
                const totalPages = this.dataModel.getTotalEventPages();
                
                let newPage;
                if (currentPage === totalPages) {
                    // Wrap to first page
                    newPage = 1;
                } else {
                    // Normal next page
                    newPage = currentPage + 1;
                }
                
                this.dataModel.setCurrentEventPage(newPage);
                wrappedUpdatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });
        
        // Manual page input
        newPageInput.addEventListener('change', (e) => {
            const inputValue = parseInt(e.target.value);
            const totalPages = this.dataModel.getTotalEventPages();
            
            // Validate and set page
            if (!isNaN(inputValue) && inputValue >= 1 && inputValue <= totalPages) {
                const oldPage = this.dataModel.getCurrentEventPage();
                this.dataModel.setCurrentEventPage(inputValue);
                wrappedUpdatePaginationUI();
                // Only play sound if page actually changed
                if (oldPage !== inputValue && window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('page');
                }
                if (onPageChange) {
                    onPageChange();
                }
            } else {
                // Reset to current page if invalid
                wrappedUpdatePaginationUI();
            }
        });
        
        // Also handle Enter key
        newPageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.target.blur(); // Triggers change event
            }
        });
        
        // Store update function for external calls (wrapped version that also updates number buttons)
        this.updatePaginationUI = wrappedUpdatePaginationUI;
    }
    
    /**
     * Setup event number buttons (1-10) to open events by position on current page
     * Returns the update function so it can be called when page changes
     */
    setupEventNumberButtons(onPageChange) {
        const numberButtonsContainer = document.getElementById('eventNumberButtons');
        if (!numberButtonsContainer || !this.dataModel) return;
        
        // Get all number buttons
        const numberButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');
        
        // Update button states based on current page - only show buttons for events that exist
        const updateNumberButtons = () => {
            // Re-query buttons from DOM to get the actual current buttons (they may have been cloned)
            const currentButtons = numberButtonsContainer.querySelectorAll('.event-number-btn');
            
            const currentPageEvents = this.dataModel.getEventsForCurrentPage();
            const eventsPerPage = this.dataModel.eventsPerPage || 10;
            const numEventsOnPage = currentPageEvents.length;
            
            // First, reset all buttons to be visible (in case they were hidden from previous page)
            currentButtons.forEach((btn) => {
                btn.style.display = 'flex';
                btn.disabled = false;
                btn.classList.remove('locked');
                // Only remove specific style properties we might have set, keep display
                btn.style.opacity = '';
                btn.style.filter = '';
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
                btn.style.cursor = '';
                btn.style.transform = '';
                btn.style.boxShadow = '';
            });
            
            // Then hide buttons that don't have events, and disable buttons for locked events
            currentButtons.forEach((btn, index) => {
                const position = index + 1; // 1-10
                const eventIndex = position - 1; // 0-9
                
                // Hide button if no event at this position
                if (eventIndex >= numEventsOnPage) {
                    btn.style.display = 'none'; // Hide instead of disable
                } else {
                    // Check if the event marker is locked (filtered out)
                    const targetEvent = currentPageEvents[eventIndex];
                    let isLocked = false;
                    
                    if (window.globeController && window.globeController.globeView) {
                        const markers = window.globeController.sceneModel.getMarkers();
                        const eventLocationType = targetEvent.locationType || 'earth';
                        
                        // Try to find marker - check all possible locations (globe, moon, mars)
                        let marker = null;
                        
                        // First try direct event reference match
                        marker = markers.find(m => {
                            if (m.userData && m.userData.isEventMarker) {
                                return m.userData.event === targetEvent;
                            }
                            return false;
                        });
                        
                        // If not found, try coordinate matching
                        if (!marker) {
                            marker = markers.find(m => {
                                if (m.userData && m.userData.isEventMarker) {
                                    const markerEvent = m.userData.event;
                                    const markerLocationType = m.userData.locationType || 'earth';
                                    
                                    // Location types must match
                                    if (markerLocationType !== eventLocationType) return false;
                                    
                                    // Match by coordinates based on location type
                                    if (eventLocationType === 'moon' || eventLocationType === 'mars') {
                                        const markerX = m.userData.x;
                                        const markerY = m.userData.y;
                                        const targetX = targetEvent.x;
                                        const targetY = targetEvent.y;
                                        
                                        if (markerX !== undefined && markerY !== undefined && targetX !== undefined && targetY !== undefined) {
                                            return Math.abs(markerX - targetX) < 0.1 && Math.abs(markerY - targetY) < 0.1;
                                        }
                                    } else {
                                        const markerLat = m.userData.lat;
                                        const markerLon = m.userData.lon;
                                        const targetLat = targetEvent.lat;
                                        const targetLon = targetEvent.lon;
                                        
                                        if (markerLat !== undefined && markerLon !== undefined && targetLat !== undefined && targetLon !== undefined) {
                                            return Math.abs(markerLat - targetLat) < 0.0001 && Math.abs(markerLon - targetLon) < 0.0001;
                                        }
                                    }
                                }
                                return false;
                            });
                        }
                        
                        // Check if marker is locked
                        if (marker && marker.userData && marker.userData.isLocked) {
                            isLocked = true;
                        }
                    }
                    
                    // Apply visual changes - use CSS classes only, no inline styles
                    if (isLocked) {
                        btn.disabled = true;
                        btn.classList.add('locked');
                        console.log(`[UIView] Disabled button ${position} for locked event: ${targetEvent.name}`);
                    } else {
                        btn.disabled = false;
                        btn.classList.remove('locked');
                    }
                }
            });
        };
        
        // Initial update
        updateNumberButtons();
        
        // Add click and hover handlers to each button
        numberButtons.forEach((btn, index) => {
            const position = index + 1; // 1-10
            
            // Remove existing listeners by cloning
            const btnClone = btn.cloneNode(true);
            btn.parentNode.replaceChild(btnClone, btn);
            const newBtn = document.getElementById('eventNumberButtons').querySelectorAll('.event-number-btn')[index];
            
            // Get the marker for this event position
            const getMarkerForPosition = () => {
                const currentPageEvents = this.dataModel.getEventsForCurrentPage();
                const eventIndex = position - 1; // 0-9
                
                if (eventIndex >= currentPageEvents.length) return null;
                
                const targetEvent = currentPageEvents[eventIndex];
                
                if (window.globeController && window.globeController.globeView) {
                    const markers = window.globeController.sceneModel.getMarkers();
                    return markers.find(m => {
                        if (m.userData && m.userData.isEventMarker) {
                            const markerEvent = m.userData.event;
                            return (markerEvent === targetEvent) ||
                                   (Math.abs(markerEvent.lat - targetEvent.lat) < 0.0001 &&
                                    Math.abs(markerEvent.lon - targetEvent.lon) < 0.0001);
                        }
                        return false;
                    });
                }
                return null;
            };
            
            // Hover behavior: stop auto rotation, center marker, trigger pulse
            newBtn.addEventListener('mouseenter', (e) => {
                // Don't trigger hover behavior if button is disabled (locked event)
                if (newBtn.disabled) return;
                
                const marker = getMarkerForPosition();
                if (!marker) return;
                
                // Don't trigger hover behavior if marker is locked
                if (marker.userData && marker.userData.isLocked) return;
                
                // Stop auto rotation
                if (window.globeController && window.globeController.sceneModel) {
                    const sceneModel = window.globeController.sceneModel;
                    sceneModel.setAutoRotate(false);
                    if (sceneModel.autoRotateTimeout) {
                        clearTimeout(sceneModel.autoRotateTimeout);
                        sceneModel.autoRotateTimeout = null;
                    }
                }
                
                // Center the marker (zoom to it) or reset to default view for Moon/Mars
                // Note: zoomToMarker will store originalCameraPosition if it doesn't exist
                if (window.globeController && window.globeController.interactionController) {
                    const locationType = marker.userData ? marker.userData.locationType : 'earth';
                    if (locationType === 'moon' || locationType === 'mars') {
                        // Reset camera to default view for Moon/Mars events
                        window.globeController.interactionController.resetCameraToDefault();
                    } else {
                        // Zoom in and center on the marker (Earth events)
                        window.globeController.interactionController.zoomToMarker(marker);
                    }
                }
                
                // Start pulse effect (marker hover behavior)
                if (window.globeController && window.globeController.interactionController) {
                    const interactionController = window.globeController.interactionController;
                    // Stop any existing hover marker pulse
                    if (interactionController.hoveredEventMarker && 
                        interactionController.hoveredEventMarker !== marker) {
                        interactionController.stopEventMarkerPulse(interactionController.hoveredEventMarker);
                    }
                    // Start pulse on this marker
                    interactionController.startEventMarkerPulse(marker);
                    interactionController.hoveredEventMarker = marker;
                }
            });
            
            // Mouse leave: stop pulse, restore camera, resume auto rotation if enabled
            newBtn.addEventListener('mouseleave', (e) => {
                const marker = getMarkerForPosition();
                
                // Stop pulse effect
                if (window.globeController && window.globeController.interactionController) {
                    const interactionController = window.globeController.interactionController;
                    if (interactionController.hoveredEventMarker === marker) {
                        interactionController.stopEventMarkerPulse(marker);
                        interactionController.hoveredEventMarker = null;
                    }
                }
                
                // Restore original camera position (only if no event is open)
                // zoomToMarker stored the original position in this.originalCameraPosition
                if (!this.currentEventMarker) {
                    if (window.globeController && window.globeController.sceneModel) {
                        const sceneModel = window.globeController.sceneModel;
                        const camera = sceneModel.getCamera();
                        const globe = sceneModel.getGlobe();
                        
                        if (camera && globe) {
                            // Use stored position from zoomToMarker, or default view
                            let targetPosition, targetRotation;
                            
                            if (this.originalCameraPosition && this.originalGlobeRotation) {
                                // Use the position stored by zoomToMarker
                                targetPosition = this.originalCameraPosition.clone();
                                targetRotation = this.originalGlobeRotation;
                            } else {
                                // Default zoomed-out view
                                targetPosition = new THREE.Vector3(0, 0, 3.5);
                                targetRotation = { x: 0, y: 0, z: 0 };
                            }
                            
                            // Animate camera back to original/default position
                            const startPosition = camera.position.clone();
                            const startRotation = {
                                x: globe.rotation.x,
                                y: globe.rotation.y,
                                z: globe.rotation.z
                            };
                            
                            const duration = 500; // 0.5 second animation
                            const startTime = Date.now();
                            
                            const animate = () => {
                                const elapsed = Date.now() - startTime;
                                const progress = Math.min(elapsed / duration, 1);
                                
                                // Easing function (ease in-out)
                                const easeProgress = progress < 0.5
                                    ? 2 * progress * progress
                                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                                
                                // Interpolate camera position
                                camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
                                
                                // Interpolate globe rotation
                                globe.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
                                globe.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
                                globe.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;
                                
                                // Look at origin
                                camera.lookAt(0, 0, 0);
                                
                                if (progress < 1) {
                                    requestAnimationFrame(animate);
                                } else {
                                    // Animation complete
                                    camera.position.copy(targetPosition);
                                    globe.rotation.x = targetRotation.x;
                                    globe.rotation.y = targetRotation.y;
                                    globe.rotation.z = targetRotation.z;
                                    camera.lookAt(0, 0, 0);
                                    
                                    // Restore plane visibility based on current page
                                    // Only restore if we're not transitioning to another hover (check if there's a hovered marker)
                                    const interactionController = window.globeController?.interactionController;
                                    if (interactionController && !interactionController.hoveredEventMarker) {
                                        // No marker is currently hovered, safe to restore planes
                                        interactionController.restorePlanesVisibility();
                                    }
                                    
                                    // Clear stored position since we've restored it (only if no event is open)
                                    if (!this.currentEventMarker) {
                                        this.originalCameraPosition = null;
                                        this.originalGlobeRotation = null;
                                    }
                                }
                            };
                            
                            animate();
                        }
                    }
                }
                
                // Resume auto rotation if enabled
                if (window.globeController && window.globeController.sceneModel) {
                    const sceneModel = window.globeController.sceneModel;
                    if (sceneModel.getAutoRotateEnabled() && !sceneModel.eventMarker) {
                        sceneModel.autoRotateTimeout = setTimeout(() => {
                            sceneModel.setAutoRotate(true);
                        }, 500); // 0.5 second delay
                    }
                }
            });
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Don't allow clicking disabled buttons
                if (newBtn.disabled) return;
                
                // Play sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventClick');
                }
                
                const currentPageEvents = this.dataModel.getEventsForCurrentPage();
                const eventIndex = position - 1; // 0-9
                
                if (eventIndex < currentPageEvents.length) {
                    const targetEvent = currentPageEvents[eventIndex];
                    
                    // Find the marker for this event
                    if (window.globeController && window.globeController.globeView) {
                        const markers = window.globeController.sceneModel.getMarkers();
                        const eventMarker = markers.find(m => {
                            if (m.userData && m.userData.isEventMarker) {
                                const markerEvent = m.userData.event;
                                const markerLocationType = m.userData.locationType || 'earth';
                                const eventLocationType = targetEvent.locationType || 'earth';
                                
                                if (markerLocationType !== eventLocationType) return false;
                                
                                if (markerEvent === targetEvent) return true;
                                
                                if (eventLocationType === 'moon' || eventLocationType === 'mars') {
                                    const markerX = m.userData.x;
                                    const markerY = m.userData.y;
                                    const targetX = targetEvent.x;
                                    const targetY = targetEvent.y;
                                    
                                    if (markerX !== undefined && markerY !== undefined && targetX !== undefined && targetY !== undefined) {
                                        return Math.abs(markerX - targetX) < 0.1 && Math.abs(markerY - targetY) < 0.1;
                                    }
                                } else {
                                    const markerLat = m.userData.lat;
                                    const markerLon = m.userData.lon;
                                    const targetLat = targetEvent.lat;
                                    const targetLon = targetEvent.lon;
                                    
                                    if (markerLat !== undefined && markerLon !== undefined && targetLat !== undefined && targetLon !== undefined) {
                                        return Math.abs(markerLat - targetLat) < 0.0001 && Math.abs(markerLon - targetLon) < 0.0001;
                                    }
                                }
                            }
                            return false;
                        });
                        
                        // Don't allow clicking locked events
                        if (eventMarker && eventMarker.userData && eventMarker.userData.isLocked) {
                            return;
                        }
                        
                        if (eventMarker) {
                            // Check if this is a multi-event
                            const isMultiEvent = targetEvent.variants && targetEvent.variants.length > 0;
                            const displayEvent = isMultiEvent ? targetEvent.variants[0] : targetEvent;
                            
                            const eventName = displayEvent.name || eventMarker.userData.eventName;
                            const eventDescription = displayEvent.description;
                            
                            // Get image path
                            let imagePath = displayEvent.image || null;
                            if (!imagePath || !imagePath.trim()) {
                                const normalizedName = eventName.replace(/\s+/g, ' ').trim();
                                const encodedFileName = encodeURIComponent(normalizedName);
                                imagePath = `Event%20Images/${encodedFileName}.png`;
                            }
                            
                            // Zoom to marker or reset to default view (for Moon/Mars) and show event slide
                            if (window.globeController.interactionController) {
                                const locationType = eventMarker.userData ? eventMarker.userData.locationType : 'earth';
                                if (locationType === 'moon' || locationType === 'mars') {
                                    // Reset camera to default view for Moon/Mars events
                                    window.globeController.interactionController.resetCameraToDefault();
                                } else {
                                    // Zoom in and center on the marker (Earth events)
                                    window.globeController.interactionController.zoomToMarker(eventMarker);
                                }
                            }
                            
                            this.showEventSlide(
                                eventName,
                                imagePath,
                                eventDescription,
                                eventMarker,
                                targetEvent
                            );
                        }
                    }
                }
            });
        });
        
        // Return update function so it can be called externally
        return updateNumberButtons;
    }
    
    /**
     * Start glitch animation for glitchy text overlays
     * Constantly changes the random characters in the overlay
     */
    startGlitchAnimation() {
        // Clear any existing interval
        if (this.glitchInterval) {
            clearInterval(this.glitchInterval);
        }
        
        // Update glitch characters every 100ms
        this.glitchInterval = setInterval(() => {
            const overlays = document.querySelectorAll('.glitchy-text-overlay');
            overlays.forEach(overlay => {
                const container = overlay.parentElement;
                if (container && container.querySelector('.glitchy-text-base')) {
                    const baseText = container.querySelector('.glitchy-text-base').textContent;
                    // Generate new random characters - exactly matching the character count of base text
                    const newGlitch = baseText.split('').map(() => getRandomGlitchChar()).join('');
                    overlay.textContent = newGlitch;
                    // Ensure overlay doesn't exceed base text width
                    overlay.style.maxWidth = '100%';
                }
            });
        }, 100);
    }
    
    /**
     * Stop glitch animation
     */
    stopGlitchAnimation() {
        if (this.glitchInterval) {
            clearInterval(this.glitchInterval);
            this.glitchInterval = null;
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
            hackedImg.src = 'Misc/Hacked.png';
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

