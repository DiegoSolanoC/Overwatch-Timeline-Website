/**
 * UIView - Handles UI elements (labels, buttons, toggles)
 */
export class UIView {
    constructor(sceneModel) {
        this.sceneModel = sceneModel;
        this.previousAutoRotateState = null; // Store previous auto-rotate state
        this.imageOverlayVisible = false; // Track image overlay visibility
        this.currentEventMarker = null; // Track currently active event marker
        this.originalCameraPosition = null; // Store original camera position before zoom
        this.originalGlobeRotation = null; // Store original globe rotation before zoom
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
            eventSlide.style.display = 'block'; // Ensure it's visible when opened
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
        } else {
            this.imageOverlayVisible = false;
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
        
        // Close overlay when clicking on it
        if (eventImageOverlay) {
            eventImageOverlay.onclick = (e) => {
                if (e.target === eventImageOverlay) {
                    this.toggleEventImage();
                }
            };
        }
    }
    
    /**
     * Toggle event image overlay visibility
     */
    toggleEventImage() {
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        const imageToggleBtn = document.getElementById('eventImageToggle');
        const eventSlide = document.getElementById('eventSlide');
        const isMobile = window.innerWidth <= 768;
        
        if (!eventImageOverlay) return;
        
        if (this.imageOverlayVisible) {
            // Hide: fade out image, then fade to black, then hide overlay
            if (eventImage && eventImage.style.display !== 'none') {
                eventImage.classList.remove('fade-in');
                eventImage.classList.add('fade-out');
            }
            
            // After image fades out, fade overlay to black
            setTimeout(() => {
                eventImageOverlay.classList.remove('fade-in');
                eventImageOverlay.classList.add('fade-out');
                
                // After black fade, hide overlay
                setTimeout(() => {
                    eventImageOverlay.classList.remove('open', 'fade-out');
                    eventImage.classList.remove('fade-out');
                    this.imageOverlayVisible = false;
                    
                    // On mobile, show text panel when hiding image
                    if (isMobile && eventSlide) {
                        eventSlide.style.display = 'block';
                    }
                    
                    if (imageToggleBtn) {
                        imageToggleBtn.textContent = 'Show Image';
                    }
                }, 600); // Wait for fade-out to complete
            }, 800); // Wait for image fade-out
        } else {
            // On mobile, hide text panel when showing image
            if (isMobile && eventSlide) {
                eventSlide.style.display = 'none';
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
                if (imageToggleBtn) {
                    imageToggleBtn.textContent = 'Show Text';
                }
            }, 50);
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
                        eventSlide.style.display = 'none'; // Hide when closed
                    }
                    
                    if (eventImageOverlay) {
                        eventImageOverlay.classList.remove('open', 'fade-out');
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
                }, 600); // Wait for fade-out to complete
            }, 800); // Wait for image fade-out
        } else {
            // No overlay, just close slide
            if (eventSlide) {
                eventSlide.classList.remove('open');
                eventSlide.style.display = 'none'; // Hide when closed
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
        }
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
        
        // Replace text with rotation icon image (original implementation)
        rotateIcon.innerHTML = '<img src="https://i.imgur.com/EIiYust.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">';
        
        // Toggle function
        const toggleAutoRotate = () => {
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
        let touchStartPos = { x: 0, y: 0 };
        
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
            if (event.touches && event.touches[0]) {
                touchStartPos.x = event.touches[0].clientX;
                touchStartPos.y = event.touches[0].clientY;
            }
        }, { passive: true });
        
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
            // Check if it was a tap (not a drag)
            let wasTap = true;
            if (event.changedTouches && event.changedTouches[0]) {
                const touchEndPos = {
                    x: event.changedTouches[0].clientX,
                    y: event.changedTouches[0].clientY
                };
                const distance = Math.sqrt(
                    Math.pow(touchEndPos.x - touchStartPos.x, 2) + 
                    Math.pow(touchEndPos.y - touchStartPos.y, 2)
                );
                wasTap = distance < 10; // Less than 10px movement
            }
            
            const touchDuration = Date.now() - touchStartTime;
            if (wasTap && touchDuration < 500) {
                toggleAutoRotate();
            }
        });
        
        // Handle click events (desktop)
        toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            toggleAutoRotate();
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
        
        // Replace with train icon image (original implementation)
        hyperloopIcon.innerHTML = '<img src="https://i.imgur.com/l1TDZwh.png" alt="Hyperloop" style="width: 100%; height: 100%; object-fit: contain;">';
        
        // Toggle function
        const toggleHyperloop = () => {
            const visible = !sceneModel.getHyperloopVisible();
            sceneModel.setHyperloopVisible(visible);
            
            // ALWAYS keep the image icon, never change to emoji or text
            // Force the image to stay, even if something tries to change it
            const currentContent = hyperloopIcon.innerHTML;
            if (!currentContent.includes('<img')) {
                hyperloopIcon.innerHTML = '<img src="https://i.imgur.com/l1TDZwh.png" alt="Hyperloop" style="width: 100%; height: 100%; object-fit: contain;">';
            }
            
            // Double-check after a brief moment to ensure it stays
            setTimeout(() => {
                if (!hyperloopIcon.querySelector('img')) {
                    hyperloopIcon.innerHTML = '<img src="https://i.imgur.com/l1TDZwh.png" alt="Hyperloop" style="width: 100%; height: 100%; object-fit: contain;">';
                }
            }, 10);
            
            if (visible) {
                toggleBtn.classList.add('active');
                console.log('🚄 Transport systems ENABLED (Trains, Planes)');
            } else {
                toggleBtn.classList.remove('active');
                console.log('⏸️ Transport systems DISABLED - all vehicles will finish invisibly, no new spawns');
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
        let touchStartPos = { x: 0, y: 0 };
        
        toggleBtn.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
            if (event.touches && event.touches[0]) {
                touchStartPos.x = event.touches[0].clientX;
                touchStartPos.y = event.touches[0].clientY;
            }
        }, { passive: true });
        
        toggleBtn.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
            // Check if it was a tap (not a drag)
            let wasTap = true;
            if (event.changedTouches && event.changedTouches[0]) {
                const touchEndPos = {
                    x: event.changedTouches[0].clientX,
                    y: event.changedTouches[0].clientY
                };
                const distance = Math.sqrt(
                    Math.pow(touchEndPos.x - touchStartPos.x, 2) + 
                    Math.pow(touchEndPos.y - touchStartPos.y, 2)
                );
                wasTap = distance < 10; // Less than 10px movement
            }
            
            const touchDuration = Date.now() - touchStartTime;
            if (wasTap && touchDuration < 500) {
                toggleHyperloop();
            }
        });
        
        // Handle click events (desktop)
        toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            toggleHyperloop();
        });
    }
}

