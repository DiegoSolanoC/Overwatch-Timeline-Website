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
function getDisplayText(text) {
    if (!text) return text;
    
    // Replace "Olivia Colomar" with glitchy overlay effect
    return text.replace(/Olivia Colomar/gi, (match) => {
        // Create overlay with random characters that will constantly change
        const glitchOverlay = match.split('').map(() => getRandomGlitchChar()).join('');
        return `<span class="glitchy-text-container"><span class="glitchy-text-base">${match}</span><span class="glitchy-text-overlay">${glitchOverlay}</span></span>`;
    });
}

/**
 * Helper function for backward compatibility (event names)
 */
function getDisplayEventName(eventName) {
    return getDisplayText(eventName);
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
        
        // Encode image path if provided to handle special characters (but don't double-encode)
        if (imagePath && imagePath.trim()) {
            imagePath = imagePath.trim();
            if (imagePath.includes('Event Images/')) {
                const parts = imagePath.split('Event Images/');
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
                    imagePath = `Event Images/${encodeURIComponent(filename)}`;
                }
            }
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
                    if (index === 0) {
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
            
            eventSlideTitle.innerHTML = getDisplayEventName(eventName);
            eventSlideText.innerHTML = getDisplayText(description || 'Placeholder text for event information. This will be replaced with actual event details.');
            
            // Start glitch character animation for any glitchy text overlays
            this.startGlitchAnimation();
            
            // Get current variant or main event
            const currentEvent = isMultiEvent ? eventData.variants[this.currentVariantIndex] : eventData;
            
            // Display sources if available (before filters)
            const eventSourcesSection = document.getElementById('eventSourcesSection');
            const eventSourcesList = document.getElementById('eventSourcesList');
            
            if (currentEvent && currentEvent.sources && currentEvent.sources.length > 0) {
                if (eventSourcesSection && eventSourcesList) {
                    eventSourcesList.innerHTML = '';
                    
                    currentEvent.sources.forEach((source) => {
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
            
            // Display filters and factions if available
            const eventFiltersSection = document.getElementById('eventFiltersSection');
            const eventFiltersList = document.getElementById('eventFiltersList');
            
            if (currentEvent) {
                const heroFilters = currentEvent.filters || [];
                const factionFilters = currentEvent.factions || [];
                const activeFilters = this.sceneModel.activeFilters || new Set();
                
                if (eventFiltersSection && eventFiltersList) {
                    eventFiltersList.innerHTML = '';
                    
                    // Display heroes section
                    if (heroFilters.length > 0) {
                        const heroesHeader = document.createElement('h4');
                        heroesHeader.textContent = 'Relevant Heroes:';
                        heroesHeader.className = 'event-filter-header';
                        eventFiltersList.appendChild(heroesHeader);
                        
                        heroFilters.forEach(filter => {
                            const filterTag = document.createElement('span');
                            filterTag.className = 'event-filter-tag';
                            // Check if this filter is currently selected
                            if (activeFilters.has(filter)) {
                                filterTag.classList.add('selected');
                            }
                            filterTag.textContent = filter;
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
                            // Check if this faction is currently selected
                            if (activeFilters.has(faction)) {
                                filterTag.classList.add('selected');
                            }
                            // Remove number prefix for display
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
                }
            } else {
                if (eventFiltersSection) {
                    eventFiltersSection.style.display = 'none';
                }
            }
            
            // Store event data for variant switching
            if (isMultiEvent) {
                this.currentEventData = eventData;
            }
            
            eventSlide.classList.add('open');
            
            // Adjust image overlay position when slide opens
            if (eventImageOverlay) {
                eventImageOverlay.classList.add('slide-open');
            }
        }
        
        // Initialize image overlay state - show by default with fade sequence
        if (eventImageOverlay && eventImage) {
            // Reset states
            eventImageOverlay.classList.remove('fade-in', 'fade-out');
            eventImage.classList.remove('fade-in', 'fade-out');
            
            if (imagePath) {
                // Clear any previous error handlers
                eventImage.onerror = null;
                eventImage.onload = null;
                
                // Set up error and load handlers
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
                
                eventImage.src = imagePath;
                eventImage.style.display = 'block';
                // Start with transparent background for image
                eventImageOverlay.style.background = 'rgba(0, 0, 0, 0)';
            } else {
                console.log('No image path provided for event');
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
                } else {
                    // If no image, fade in black overlay
                    eventImageOverlay.classList.add('fade-in');
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
        
        // Reset stillness tracking
        this.lastCameraPosition = null;
        this.lastGlobeRotation = null;
        this.stillnessStartTime = null;
        this.wasDragging = false;
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

        // Update title and description
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        if (eventSlideTitle) {
            eventSlideTitle.innerHTML = getDisplayEventName(variant.name) || `Variant ${variantIndex + 1}`;
        }
        if (eventSlideText) {
            eventSlideText.innerHTML = getDisplayText(variant.description || 'No description');
        }
        
        // Start glitch character animation for any glitchy text overlays
        this.startGlitchAnimation();

        // Update sources (before filters)
        const eventSourcesSection = document.getElementById('eventSourcesSection');
        const eventSourcesList = document.getElementById('eventSourcesList');
        
        if (variant.sources && variant.sources.length > 0) {
            if (eventSourcesSection && eventSourcesList) {
                eventSourcesList.innerHTML = '';
                
                variant.sources.forEach((source) => {
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

        // Update filters display
        const eventFiltersSection = document.getElementById('eventFiltersSection');
        const eventFiltersList = document.getElementById('eventFiltersList');
        const activeFilters = this.sceneModel.activeFilters || new Set();

        if (eventFiltersSection && eventFiltersList) {
            eventFiltersList.innerHTML = '';
            
            const heroFilters = variant.filters || [];
            const factionFilters = variant.factions || [];

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
                    filterTag.textContent = filter;
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
        }
        

        // Update image
        const eventImage = document.getElementById('eventImage');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        if (eventImage && eventImageOverlay) {
            let imagePath = variant.image || null;
            if (!imagePath || !imagePath.trim()) {
                const normalizedName = variant.name.replace(/\s+/g, ' ').trim();
                const encodedFileName = encodeURIComponent(normalizedName);
                imagePath = `Event Images/${encodedFileName}.png`;
            } else {
                // Encode provided path to handle special characters (but don't double-encode)
                imagePath = imagePath.trim();
                if (imagePath.includes('Event Images/')) {
                    const parts = imagePath.split('Event Images/');
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
                        imagePath = `Event Images/${encodeURIComponent(filename)}`;
                    }
                }
            }

            if (imagePath) {
                eventImage.src = imagePath;
                eventImage.style.display = 'block';
            } else {
                eventImage.style.display = 'none';
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
        
        const eventSlide = document.getElementById('eventSlide');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        
        // Close instantly - no fade delays
        if (eventSlide) {
            eventSlide.classList.remove('open');
        }
        
        // Hide image overlay immediately
        if (eventImageOverlay) {
            eventImageOverlay.classList.remove('slide-open', 'open', 'fade-in', 'fade-out');
        }
        
        if (eventImage) {
            eventImage.classList.remove('fade-in', 'fade-out');
            eventImage.style.display = 'none';
        }
        
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
            rotateIcon.innerHTML = '<img src="Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // Prevent button from interfering with globe controls
        toggleBtn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        toggleBtn.addEventListener('mouseup', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
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
                rotateIcon.innerHTML = '<img src="Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
            }
        });
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
            hyperloopIcon.innerHTML = '<img src="Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
        }
        
        // Prevent button from interfering with globe controls
        toggleBtn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        toggleBtn.addEventListener('mouseup', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
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
                hyperloopIcon.innerHTML = '<img src="Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">';
            }
            
            if (onToggle) {
                onToggle();
            }
        });
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
        
        // Update pagination UI
        const updatePaginationUI = () => {
            const currentPage = this.dataModel.getCurrentEventPage();
            const totalPages = this.dataModel.getTotalEventPages();
            
            // Update input value (without triggering change event)
            pageInput.value = currentPage;
            pageInput.max = totalPages;
            pageTotal.textContent = `/ ${totalPages}`;
            
            // Disable buttons at boundaries
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages || totalPages === 0;
            
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
        
        // Initial update
        updatePaginationUI();
        
        // Previous page button
        prevBtn.addEventListener('click', () => {
            // Play sound on click attempt, even if disabled
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }
            if (this.dataModel.previousEventPage()) {
                updatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });
        
        // Next page button
        nextBtn.addEventListener('click', () => {
            // Play sound on click attempt, even if disabled
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('page');
            }
            if (this.dataModel.nextEventPage()) {
                updatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });
        
        // Manual page input
        pageInput.addEventListener('change', (e) => {
            const inputValue = parseInt(e.target.value);
            const totalPages = this.dataModel.getTotalEventPages();
            
            // Validate and set page
            if (!isNaN(inputValue) && inputValue >= 1 && inputValue <= totalPages) {
                const oldPage = this.dataModel.getCurrentEventPage();
                this.dataModel.setCurrentEventPage(inputValue);
                updatePaginationUI();
                // Only play sound if page actually changed
                if (oldPage !== inputValue && window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('page');
                }
                if (onPageChange) {
                    onPageChange();
                }
            } else {
                // Reset to current page if invalid
                updatePaginationUI();
            }
        });
        
        // Also handle Enter key
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.target.blur(); // Triggers change event
            }
        });
        
        // Store update function for external calls
        this.updatePaginationUI = updatePaginationUI;
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
}

