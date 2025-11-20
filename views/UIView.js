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
    showEventSlide(eventName, imagePath = null, description = null, marker = null) {
        const eventSlide = document.getElementById('eventSlide');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        const imageToggleBtn = document.getElementById('eventImageToggle');
        
        // Store current event marker
        this.currentEventMarker = marker;
        
        // Store current auto-rotate state but don't disable it completely
        // We'll use a special event-centered auto-rotate instead
        this.previousAutoRotateState = this.sceneModel.getAutoRotateEnabled();
        this.sceneModel.setAutoRotateEnabled(true); // Keep enabled for event recentering
        this.sceneModel.setAutoRotate(false); // But don't start rotating yet
        this.sceneModel.eventMarker = marker; // Store marker for recentering
        
        if (eventSlide) {
            eventSlideTitle.textContent = eventName;
            eventSlideText.textContent = description || 'Placeholder text for event information. This will be replaced with actual event details.';
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
                eventImage.src = imagePath;
                eventImage.style.display = 'block';
            } else {
                eventImage.style.display = 'none';
            }
            
            // Show overlay immediately but invisible
            this.imageOverlayVisible = true;
            this.imageToggleState = true; // Toggle is on by default
            eventImageOverlay.classList.add('open');
            
            // Start fade sequence after a moment (wait for centering animation)
            setTimeout(() => {
                // Fade to black
                eventImageOverlay.classList.add('fade-in');
                
                // Then fade in image after black is fully visible
                if (imagePath) {
                    setTimeout(() => {
                        eventImage.classList.add('fade-in');
                    }, 600); // Wait for black fade to complete
                }
            }, 1200); // Wait 1.2 seconds after opening
            
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
        
        // Add close button handler
        const closeBtn = document.getElementById('eventSlideClose');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideEventSlide();
        }
        
        // Reset stillness tracking
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
        const eventSlide = document.getElementById('eventSlide');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        
        // If overlay is visible, fade out first
        if (eventImageOverlay && eventImageOverlay.classList.contains('open')) {
            // Fade out image first
            if (eventImage && eventImage.style.display !== 'none') {
                eventImage.classList.remove('fade-in');
                eventImage.classList.add('fade-out');
            }
            
            // Then fade to black
            setTimeout(() => {
                eventImageOverlay.classList.remove('fade-in');
                eventImageOverlay.classList.add('fade-out');
                
                // After fade to black, hide everything
                setTimeout(() => {
                    if (eventSlide) {
                        eventSlide.classList.remove('open');
                    }
                    
                    // Adjust image overlay position when slide closes
                    if (eventImageOverlay) {
                        eventImageOverlay.classList.remove('slide-open', 'open', 'fade-out');
                    }
                    
                    if (eventImage) {
                        eventImage.classList.remove('fade-in', 'fade-out');
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
                }, 600); // Wait for fade-out to complete
            }, 800); // Wait for image fade-out
        } else {
            // No overlay, just close slide
            if (eventSlide) {
                eventSlide.classList.remove('open');
            }
            
            // Adjust image overlay position when slide closes
            const eventImageOverlay = document.getElementById('eventImageOverlay');
            if (eventImageOverlay) {
                eventImageOverlay.classList.remove('slide-open');
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
        }
        
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
            if (this.dataModel.previousEventPage()) {
                updatePaginationUI();
                if (onPageChange) {
                    onPageChange();
                }
            }
        });
        
        // Next page button
        nextBtn.addEventListener('click', () => {
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
                this.dataModel.setCurrentEventPage(inputValue);
                updatePaginationUI();
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
}

