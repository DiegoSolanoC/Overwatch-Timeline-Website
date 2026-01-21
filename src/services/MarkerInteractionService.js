/**
 * MarkerInteractionService - Handles marker hover detection and click handling
 */

class MarkerInteractionService {
    constructor(sceneModel, uiView, pulseService) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
        this.pulseService = pulseService;
    }

    /**
     * Check if mouse is hovering over an event marker and create pulse effect
     */
    checkEventMarkerHover(event) {
        // Disable hover effects on mobile/touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            return;
        }
        
        if (!this.sceneModel) return;
        
        const camera = this.sceneModel.getCamera();
        if (!camera) return;
        
        const container = document.getElementById('globe-container');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Get all event markers from globe, Moon plane, Mars plane, and ISS satellite
        const eventMarkers = [];
        const globe = this.sceneModel.getGlobe();
        if (globe) {
            globe.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // Also check Moon and Mars planes for event markers
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        if (moonPlane) {
            moonPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        if (marsPlane) {
            marsPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // Also check ISS satellite for station markers
        if (window.globeController && window.globeController.transportController) {
            const issSatellite = window.globeController.transportController.findISS();
            if (issSatellite) {
                issSatellite.traverse((child) => {
                    if (child.userData && child.userData.isEventMarker) {
                        eventMarkers.push(child);
                    }
                });
            }
        }
        
        if (eventMarkers.length === 0) return;
        
        const intersects = raycaster.intersectObjects(eventMarkers);
        
        // Don't allow hover interactions when event image overlay is visible
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        if (eventImageOverlay && eventImageOverlay.classList.contains('open')) {
            const opacity = parseFloat(window.getComputedStyle(eventImageOverlay).opacity);
            if (opacity > 0.1) { // Image is visible (faded in)
                // Stop any existing pulse when image becomes visible
                const hoveredMarker = this.pulseService.getHoveredMarker();
                if (hoveredMarker) {
                    this.pulseService.stopEventMarkerPulse(hoveredMarker);
                    this.pulseService.setHoveredMarker(null);
                }
                return; // Block hover effects but allow globe movement
            }
        }
        
        if (intersects.length > 0) {
            const hoveredMarker = intersects[0].object;
            
            // Don't allow hover effects on non-interactive markers (variant markers)
            if (hoveredMarker.userData && hoveredMarker.userData.isInteractive === false) {
                // If we were hovering an interactive marker, stop it
                const currentHovered = this.pulseService.getHoveredMarker();
                if (currentHovered && currentHovered.userData.isInteractive !== false) {
                    this.pulseService.stopEventMarkerPulse(currentHovered);
                    this.pulseService.setHoveredMarker(null);
                }
                return;
            }
            
            // Don't allow hover effects on locked events
            if (hoveredMarker.userData && hoveredMarker.userData.isLocked) {
                // If we were hovering an unlocked marker, stop it
                const currentHovered = this.pulseService.getHoveredMarker();
                if (currentHovered && !currentHovered.userData.isLocked) {
                    this.pulseService.stopEventMarkerPulse(currentHovered);
                    this.pulseService.setHoveredMarker(null);
                }
                return;
            }
            
            // Stop auto-rotation while hovering
            this.sceneModel.setAutoRotate(false);
            if (this.sceneModel.autoRotateTimeout) {
                clearTimeout(this.sceneModel.autoRotateTimeout);
                this.sceneModel.autoRotateTimeout = null;
            }
            
            // If hovering a different marker, stop previous pulse
            const currentHovered = this.pulseService.getHoveredMarker();
            if (currentHovered && currentHovered !== hoveredMarker) {
                this.pulseService.stopEventMarkerPulse(currentHovered);
            }
            
            // Start pulse on new marker if not already pulsing
            if (currentHovered !== hoveredMarker) {
                this.pulseService.startEventMarkerPulse(hoveredMarker);
                this.pulseService.setHoveredMarker(hoveredMarker);
            }
        } else {
            // Not hovering any event marker - resume auto-rotate if enabled
            const currentHovered = this.pulseService.getHoveredMarker();
            if (currentHovered) {
                this.pulseService.stopEventMarkerPulse(currentHovered);
                this.pulseService.setHoveredMarker(null);
                
                // Resume auto-rotate after a shorter delay
                if (this.sceneModel.getAutoRotateEnabled() && !this.sceneModel.eventMarker) {
                    this.sceneModel.autoRotateTimeout = setTimeout(() => {
                        this.sceneModel.setAutoRotate(true);
                    }, 500); // 0.5 second delay - faster resume
                }
            }
        }
    }

    /**
     * Handle marker click
     * @param {MouseEvent} event - Mouse event
     * @param {Function} onZoomToMarker - Callback to zoom to marker
     * @param {Function} onResetCamera - Callback to reset camera
     */
    onMarkerClick(event, onZoomToMarker, onResetCamera) {
        // Don't register click if mouse was dragged
        if (window.mouseMoved) return;
        
        const camera = this.sceneModel.getCamera();
        const markers = this.sceneModel.getMarkers();
        const container = document.getElementById('globe-container');
        const rect = container.getBoundingClientRect();
        
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const clickableObjects = [...markers];
        const globe = this.sceneModel.getGlobe();
        if (globe) {
            globe.traverse((child) => {
                if (child.userData && (child.userData.isSeaportMarker || child.userData.isEventMarker)) {
                    clickableObjects.push(child);
                }
            });
        }
        
        const intersects = raycaster.intersectObjects(clickableObjects);
        
        if (intersects.length > 0) {
            const clickedMarker = intersects[0].object;
            const activeMarker = this.sceneModel.getActiveMarker();
            
            // Handle event marker click
            if (clickedMarker.userData.isEventMarker) {
                // Only allow clicks on interactive markers (main variant or single events)
                if (clickedMarker.userData.isInteractive === false) {
                    return; // Non-interactive variant markers cannot be clicked
                }
                
                // Don't allow event marker clicks when image overlay is visible
                const eventImageOverlay = document.getElementById('eventImageOverlay');
                if (eventImageOverlay && eventImageOverlay.classList.contains('open')) {
                    const opacity = parseFloat(window.getComputedStyle(eventImageOverlay).opacity);
                    if (opacity > 0.1) { // Image is visible (faded in)
                        return; // Block event marker clicks but allow globe dragging
                    }
                }
                
                // Don't allow clicks on locked events
                if (clickedMarker.userData.isLocked) {
                    return;
                }
                
                // Check if this is the same event that's currently open
                const currentEventMarker = this.uiView.currentEventMarker;
                if (currentEventMarker === clickedMarker) {
                    // Same event - close it instead of reopening
                    this.uiView.hideEventSlide();
                    return;
                }
                
                // Check if this is a Moon/Mars/Station marker - use default camera view instead of zooming
                const locationType = clickedMarker.userData ? clickedMarker.userData.locationType : 'earth';
                if (locationType === 'moon' || locationType === 'mars' || locationType === 'station') {
                    // Reset camera to default view for Moon/Mars/Station events
                    if (onResetCamera) {
                        onResetCamera();
                    }
                } else {
                    // Zoom in and center on the marker (Earth events)
                    if (onZoomToMarker) {
                        onZoomToMarker(clickedMarker);
                    }
                }
                
                // Open slide panel with event info
                const eventData = clickedMarker.userData.event;
                
                // Check if this is a multi-event
                const isMultiEvent = eventData.variants && eventData.variants.length > 0;
                const displayEvent = isMultiEvent ? eventData.variants[0] : eventData;
                
                const eventName = displayEvent.name || clickedMarker.userData.eventName;
                const eventDescription = displayEvent.description || 'Placeholder text for event information.';
                
                // Get image path using EventManager's function (same as previews use)
                let eventImage = null;
                if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
                    eventImage = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
                } else {
                    // Fallback: construct path manually
                    eventImage = displayEvent.image || null;
                    if (!eventImage || !eventImage.trim()) {
                        // Auto-detect from events images folder
                        const normalizedName = eventName.replace(/\s+/g, ' ').trim();
                        const encodedFileName = encodeURIComponent(normalizedName);
                        eventImage = `assets/images/events/${encodedFileName}.png`;
                    } else {
                        // Encode provided path to handle special characters
                        eventImage = eventImage.trim();
                        const encodeImagePath = (path) => {
                            if (!path) return path;
                            
                            // Helper to decode multiple times until fully decoded
                            const fullyDecode = (str) => {
                                let previous = '';
                                let current = str;
                                while (current !== previous) {
                                    previous = current;
                                    try {
                                        const decoded = decodeURIComponent(current);
                                        if (decoded !== current) {
                                            current = decoded;
                                        } else {
                                            break;
                                        }
                                    } catch (e) {
                                        break; // Can't decode further
                                    }
                                }
                                return current;
                            };
                            
                            // If path already contains Event Images/, normalize to assets/images/events and encode just the filename
                            const folderPattern = /Event(?:%20| )Images\//;
                            if (folderPattern.test(path)) {
                                const parts = path.split(/Event(?:%20| )Images\//);
                                if (parts.length === 2) {
                                    let filename = fullyDecode(parts[1]);
                                    return `assets/images/events/${encodeURIComponent(filename)}`;
                                }
                            }
                            // If it's a full path, try to encode just the filename part
                            const lastSlash = path.lastIndexOf('/');
                            if (lastSlash !== -1) {
                                const folder = path.substring(0, lastSlash + 1);
                                let filename = fullyDecode(path.substring(lastSlash + 1));
                                return folder + encodeURIComponent(filename);
                            }
                            // If no slash, decode first then encode
                            const decoded = fullyDecode(path);
                            return encodeURIComponent(decoded);
                        };
                        eventImage = encodeImagePath(eventImage);
                    }
                }
                
                this.uiView.showEventSlide(eventName, eventImage, eventDescription, clickedMarker, eventData);
            }
        } else {
            // Clicked elsewhere - hide label
            this.uiView.hideCityLabel();
            // Only close event slide if one is actually open (don't reset camera if user manually zoomed)
            if (this.uiView.currentEventMarker) {
                this.uiView.hideEventSlide();
            }
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkerInteractionService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MarkerInteractionService = MarkerInteractionService;
}
