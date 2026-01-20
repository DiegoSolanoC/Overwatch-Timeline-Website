/**
 * InteractionController - Handles mouse/touch controls and marker interactions
 */
export class InteractionController {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
        this.hoveredEventMarker = null; // Track currently hovered event marker
        this.followingStationMarker = null; // Track station marker being followed
        this.followStationAnimationId = null; // Animation frame ID for following station
    }

    /**
     * Set Moon/Mars plane visibility with animation
     * @param {boolean} visible - Whether planes should be visible
     */
    setPlanesVisibility(visible) {
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        // Use GlobeController's animatePlaneScale for smooth squash/stretch animation
        if (window.globeController && typeof window.globeController.animatePlaneScale === 'function') {
            if (moonPlane) {
                window.globeController.animatePlaneScale(moonPlane, visible);
            }
            if (marsPlane) {
                window.globeController.animatePlaneScale(marsPlane, visible);
            }
        } else {
            // Fallback to instant show/hide if animation not available
            if (moonPlane) {
                moonPlane.visible = visible;
            }
            if (marsPlane) {
                marsPlane.visible = visible;
            }
        }
    }

    /**
     * Restore plane visibility based on current page events
     * This should be called when camera returns to normal view
     */
    restorePlanesVisibility() {
        // Use GlobeController's updatePlaneVisibility to check current page and show/hide accordingly
        if (window.globeController && typeof window.globeController.updatePlaneVisibility === 'function') {
            window.globeController.updatePlaneVisibility();
        }
    }

    /**
     * Setup mouse/touch controls
     * @param {HTMLElement} container - Container element
     */
    setupControls(container) {
        container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('mouseup', () => this.onMouseUp());
        container.addEventListener('mouseleave', () => this.onMouseUp());
        container.addEventListener('click', (e) => this.onMarkerClick(e));
        // Use { passive: false } for touch events so we can preventDefault to stop page scrolling
        container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        container.addEventListener('touchend', () => this.onMouseUp(), { passive: false });
        container.addEventListener('wheel', (e) => this.onWheel(e));
    }

    /**
     * Handle mouse down
     * @param {MouseEvent} event - Mouse event
     */
    onMouseDown(event) {
        const sceneModel = this.sceneModel;
        sceneModel.setDragging(true);
        sceneModel.setAutoRotate(false);
        
        // Clear any pending auto-rotate timeout
        if (sceneModel.autoRotateTimeout) {
            clearTimeout(sceneModel.autoRotateTimeout);
            sceneModel.autoRotateTimeout = null;
        }
        
        sceneModel.setPreviousMousePosition({
            x: event.clientX,
            y: event.clientY
        });
        
        // Track if mouse moved (to differentiate click from drag)
        window.mouseMoved = false;
        
        // Notify UI that dragging started (to hide image overlay if visible)
        if (this.uiView) {
            this.uiView.onGlobeDragStart();
        }
    }

    /**
     * Handle mouse move
     * @param {MouseEvent} event - Mouse event
     */
    onMouseMove(event) {
        const sceneModel = this.sceneModel;
        
        // Check for hover on event markers (even when not dragging)
        this.checkEventMarkerHover(event);
        
        if (!sceneModel.isDraggingState()) return;
        
        window.mouseMoved = true;
        
        // If viewing an event and user manually rotates, reset auto-rotate
        if (sceneModel.eventMarker) {
            sceneModel.setAutoRotate(false);
            // Clear existing timeout
            if (sceneModel.autoRotateTimeout) {
                clearTimeout(sceneModel.autoRotateTimeout);
                sceneModel.autoRotateTimeout = null;
            }
        }
        
        const deltaX = event.clientX - sceneModel.getPreviousMousePosition().x;
        const deltaY = event.clientY - sceneModel.getPreviousMousePosition().y;
        
        const globe = sceneModel.getGlobe();
        
        if (globe) {
            const rotationSpeed = 0.005;
            const velocityX = deltaY * rotationSpeed;
            const velocityY = deltaX * rotationSpeed;
            
            globe.rotation.y += velocityY;
            globe.rotation.x += velocityX;
            
            // Limit vertical rotation
            globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            
            // Update rotation velocity for momentum
            sceneModel.setRotationVelocity({
                x: velocityX,
                y: velocityY
            });
        }
        
        sceneModel.setPreviousMousePosition({
            x: event.clientX,
            y: event.clientY
        });
    }
    
    /**
     * Check if mouse is hovering over an event marker and create pulse effect
     */
    checkEventMarkerHover(event) {
        // Disable hover effects on mobile/touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            return;
        }
        
        const sceneModel = this.sceneModel;
        if (!sceneModel) return;
        
        const camera = sceneModel.getCamera();
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
        const globe = sceneModel.getGlobe();
        if (globe) {
            globe.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // Also check Moon and Mars planes for event markers
        const moonPlane = sceneModel.getMoonPlane ? sceneModel.getMoonPlane() : sceneModel.moonPlane;
        if (moonPlane) {
            moonPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        const marsPlane = sceneModel.getMarsPlane ? sceneModel.getMarsPlane() : sceneModel.marsPlane;
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
                if (this.hoveredEventMarker) {
                    this.stopEventMarkerPulse(this.hoveredEventMarker);
                    this.hoveredEventMarker = null;
                }
                return; // Block hover effects but allow globe movement
            }
        }
        
        if (intersects.length > 0) {
            const hoveredMarker = intersects[0].object;
            
            // Don't allow hover effects on non-interactive markers (variant markers)
            if (hoveredMarker.userData && hoveredMarker.userData.isInteractive === false) {
                // If we were hovering an interactive marker, stop it
                if (this.hoveredEventMarker && this.hoveredEventMarker.userData.isInteractive !== false) {
                    this.stopEventMarkerPulse(this.hoveredEventMarker);
                    this.hoveredEventMarker = null;
                }
                return;
            }
            
            // Don't allow hover effects on locked events
            if (hoveredMarker.userData && hoveredMarker.userData.isLocked) {
                // If we were hovering an unlocked marker, stop it
                if (this.hoveredEventMarker && !this.hoveredEventMarker.userData.isLocked) {
                    this.stopEventMarkerPulse(this.hoveredEventMarker);
                    this.hoveredEventMarker = null;
                }
                return;
            }
            
            // Stop auto-rotation while hovering
            sceneModel.setAutoRotate(false);
            if (sceneModel.autoRotateTimeout) {
                clearTimeout(sceneModel.autoRotateTimeout);
                sceneModel.autoRotateTimeout = null;
            }
            
            // If hovering a different marker, stop previous pulse
            if (this.hoveredEventMarker && this.hoveredEventMarker !== hoveredMarker) {
                this.stopEventMarkerPulse(this.hoveredEventMarker);
            }
            
            // Start pulse on new marker if not already pulsing
            if (this.hoveredEventMarker !== hoveredMarker) {
                this.startEventMarkerPulse(hoveredMarker);
                this.hoveredEventMarker = hoveredMarker;
            }
        } else {
            // Not hovering any event marker - resume auto-rotate if enabled
            if (this.hoveredEventMarker) {
                this.stopEventMarkerPulse(this.hoveredEventMarker);
                this.hoveredEventMarker = null;
                
                // Resume auto-rotate after a shorter delay
                if (sceneModel.getAutoRotateEnabled() && !sceneModel.eventMarker) {
                    sceneModel.autoRotateTimeout = setTimeout(() => {
                        sceneModel.setAutoRotate(true);
                    }, 500); // 0.5 second delay - faster resume
                }
            }
        }
    }
    
    /**
     * Start pulse effect on event marker
     */
    startEventMarkerPulse(marker) {
        if (!marker.userData.pulseRings) {
            marker.userData.pulseRings = [];
        }
        
        // Create first pulse ring immediately
        this.createPulseRing(marker);
        
        // Set up to create next ring only after current one finishes
        this.scheduleNextPulse(marker);
    }
    
    /**
     * Schedule next pulse ring after current one finishes
     */
    scheduleNextPulse(marker) {
        // Clear any existing interval
        if (marker.userData.pulseInterval) {
            clearTimeout(marker.userData.pulseInterval);
        }
        
        // Schedule next pulse after current duration
        marker.userData.pulseInterval = setTimeout(() => {
            // Only create new pulse if still hovering this marker
            if (this.hoveredEventMarker === marker) {
                // Check if there are any active rings
                const activeRings = marker.userData.pulseRings.filter(ring => {
                    if (!ring || !ring.userData) return false;
                    const elapsed = Date.now() - ring.userData.startTime;
                    return elapsed < ring.userData.duration;
                });
                
                // Only create new ring if no active rings
                if (activeRings.length === 0) {
                    this.createPulseRing(marker);
                }
                
                // Schedule next pulse
                this.scheduleNextPulse(marker);
            } else {
                marker.userData.pulseInterval = null;
            }
        }, 1500); // Wait for current wave to finish (1200ms duration + buffer)
    }
    
    /**
     * Stop pulse effect on event marker
     */
    stopEventMarkerPulse(marker) {
        if (!marker || !marker.userData || !marker.userData.pulseRings) return;
        
        // Clear interval if exists
        if (marker.userData.pulseInterval) {
            clearInterval(marker.userData.pulseInterval);
            marker.userData.pulseInterval = null;
        }
        
        // Remove all pulse rings from their parent (globe, moonPlane, or marsPlane)
        if (marker.userData.pulseRings) {
            marker.userData.pulseRings.forEach(ring => {
                if (ring && ring.parent) {
                    ring.parent.remove(ring);
                }
            });
        }
        marker.userData.pulseRings = [];
    }
    
    /**
     * Create a pulse ring for event marker
     */
    createPulseRing(marker) {
        const globe = this.sceneModel.getGlobe();
        if (!globe) return;
        
        // Determine parent (globe, moonPlane, or marsPlane)
        const locationType = marker.userData ? marker.userData.locationType : 'earth';
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        // Get ISS satellite for station events
        const issSatellite = window.globeController && window.globeController.transportController 
            ? window.globeController.transportController.findISS() 
            : null;
        
        let ringParent = globe; // Default to globe
        if (locationType === 'moon' && moonPlane && marker.parent === moonPlane) {
            ringParent = moonPlane;
        } else if (locationType === 'mars' && marsPlane && marker.parent === marsPlane) {
            ringParent = marsPlane;
        } else if (locationType === 'station' && issSatellite && marker.parent === issSatellite) {
            ringParent = issSatellite;
        }
        
        // Create filled circle geometry (not a ring)
        const circleGeometry = new THREE.CircleGeometry(0.02, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00, // More yellowish orange for wave
            transparent: true,
            opacity: 0.9, // Start more opaque in center
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(circleGeometry, ringMaterial);
        
        // Store initial properties
        ring.userData.isPulseRing = true;
        ring.userData.startTime = Date.now();
        ring.userData.startScale = 1;
        ring.userData.maxScale = 4; // Larger expansion
        ring.userData.duration = 1200; // 1.2 seconds - faster wave
        ring.userData.marker = marker;
        
        // Position and orient the ring (will be updated in updatePulseRings)
        this.updateRingPositionAndOrientation(ring, marker);
        
        ringParent.add(ring);
        marker.userData.pulseRings.push(ring);
        
        // Play radiate sound effect when pulse ring is created
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('radiate');
        }
    }
    
    /**
     * Update ring position and orientation to be flat on globe surface or plane
     */
    updateRingPositionAndOrientation(ring, marker) {
        // Copy marker position (local to parent)
        ring.position.copy(marker.position);
        
        // Check if marker is on Moon/Mars plane or Earth globe
        const locationType = marker.userData ? marker.userData.locationType : 'earth';
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        // Get ISS satellite for station events
        const issSatellite = window.globeController && window.globeController.transportController 
            ? window.globeController.transportController.findISS() 
            : null;
        
        if (locationType === 'moon' && moonPlane && marker.parent === moonPlane) {
            // Moon plane: ring should be flat on the plane (same orientation as plane)
            ring.quaternion.copy(moonPlane.quaternion);
            // Rotate 90 degrees around Z to make ring horizontal (CircleGeometry faces +Z by default)
            ring.rotateZ(Math.PI / 2);
        } else if (locationType === 'mars' && marsPlane && marker.parent === marsPlane) {
            // Mars plane: ring should be flat on the plane (same orientation as plane)
            ring.quaternion.copy(marsPlane.quaternion);
            // Rotate 90 degrees around Z to make ring horizontal
            ring.rotateZ(Math.PI / 2);
        } else if (locationType === 'station' && issSatellite && marker.parent === issSatellite) {
            // Station: ring should match Earth's curvature (like earth events)
            // Calculate normal from globe center to marker's world position
            const globe = this.sceneModel.getGlobe();
            if (globe) {
                // Get marker's world position
                const markerWorldPos = new THREE.Vector3();
                marker.getWorldPosition(markerWorldPos);
                
                // Globe is at origin (0, 0, 0) in world space
                // Calculate normal (direction from globe center to marker)
                const normal = markerWorldPos.clone().normalize();
                
                // Convert normal to satellite's local space (where the ring is)
                // The ring is a child of the satellite, so we need to transform the normal direction
                const localNormal = normal.clone();
                // For direction vectors, we use the inverse quaternion rotation
                const satelliteQuaternionInverse = issSatellite.quaternion.clone().invert();
                localNormal.applyQuaternion(satelliteQuaternionInverse);
                localNormal.normalize();
                
                // Create coordinate system with normal as Z-axis (pointing outward from globe)
                // This matches the Earth event orientation logic
                const up = new THREE.Vector3(0, 1, 0);
                let tangent = new THREE.Vector3();
                
                // If normal is parallel to up, use a different reference
                if (Math.abs(localNormal.dot(up)) > 0.9) {
                    const right = new THREE.Vector3(1, 0, 0);
                    tangent.crossVectors(localNormal, right).normalize();
                } else {
                    tangent.crossVectors(localNormal, up).normalize();
                }
                
                const bitangent = new THREE.Vector3().crossVectors(localNormal, tangent).normalize();
                
                // Create rotation matrix (same as Earth events)
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(tangent, bitangent, localNormal);
                ring.quaternion.setFromRotationMatrix(rotationMatrix);
                
                // Rotate 90 degrees around Z to make ring horizontal (CircleGeometry faces +Z by default)
                ring.rotateZ(Math.PI / 2);
            } else {
                // Fallback: use satellite orientation
                ring.quaternion.copy(issSatellite.quaternion);
                ring.rotateZ(Math.PI / 2);
            }
        } else {
            // Earth globe: calculate normal (direction from globe center to marker)
            // Use local position since we're in globe's local space
            const normal = marker.position.clone().normalize();
            
            // Create a coordinate system with normal as Z-axis (pointing outward from globe)
            // We need two perpendicular vectors in the tangent plane
            const up = new THREE.Vector3(0, 1, 0);
            let tangent = new THREE.Vector3();
            
            // If normal is parallel to up, use a different reference
            if (Math.abs(normal.dot(up)) > 0.9) {
                const right = new THREE.Vector3(1, 0, 0);
                tangent.crossVectors(normal, right).normalize();
            } else {
                tangent.crossVectors(normal, up).normalize();
            }
            
            const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
            
            // Create rotation matrix to orient ring flat on surface
            // Ring's local Z should point along normal (outward), X and Y in tangent plane
            const matrix = new THREE.Matrix4();
            matrix.makeBasis(tangent, bitangent, normal);
            ring.setRotationFromMatrix(matrix);
            
            // Rotate 90 degrees around Z to make ring horizontal
            ring.rotateZ(Math.PI / 2);
        }
    }
    
    /**
     * Update pulse rings animation
     */
    updatePulseRings() {
        if (!this.sceneModel) return;
        
        const globe = this.sceneModel.getGlobe();
        if (!globe) return;
        
        const markers = this.sceneModel.getMarkers();
        if (!markers || markers.length === 0) return;
        
        const camera = this.sceneModel.getCamera();
        if (!camera) return;
        
        markers.forEach(marker => {
            if (marker && marker.userData && marker.userData.isEventMarker && marker.userData.pulseRings) {
                const pulseRings = marker.userData.pulseRings;
                
                // Update each pulse ring
                for (let i = pulseRings.length - 1; i >= 0; i--) {
                    const ring = pulseRings[i];
                    if (!ring || !ring.userData) {
                        pulseRings.splice(i, 1);
                        continue;
                    }
                    
                    if (!ring.parent) {
                        pulseRings.splice(i, 1);
                        continue;
                    }
                    
                    const elapsed = Date.now() - ring.userData.startTime;
                    const progress = elapsed / ring.userData.duration;
                    
                    if (progress >= 1) {
                        // Remove expired ring
                        if (ring.parent) {
                            ring.parent.remove(ring);
                        }
                        pulseRings.splice(i, 1);
                    } else {
                        // Animate ring - for Moon/Mars/Station, scale only in X and Y (flat), keep Z at 1
                        const locationType = marker.userData ? marker.userData.locationType : 'earth';
                        const scale = ring.userData.startScale + (ring.userData.maxScale - ring.userData.startScale) * progress;
                        if (locationType === 'moon' || locationType === 'mars' || locationType === 'station') {
                            // Flat scaling for planes and station (only X and Y, Z stays at 1)
                            ring.scale.set(scale, scale, 1);
                        } else {
                            // 3D scaling for globe
                            ring.scale.set(scale, scale, scale);
                        }
                        
                        // Fade from inside out - more transparent at edges (higher progress)
                        // Use a smoother fade curve - more transparent as it expands outward
                        if (ring.material) {
                            // Start at 0.9 opacity in center, fade to 0 at edges
                            // Use a curve that makes it more transparent at the outer edge
                            const fadeCurve = Math.pow(1 - progress, 0.5); // Slower fade at start, faster at end
                            ring.material.opacity = 0.9 * fadeCurve;
                        }
                        
                        // Update position and orientation to follow marker
                        this.updateRingPositionAndOrientation(ring, marker);
                    }
                }
            }
        });
    }
    
    /**
     * Update marker pulse animation (dilation effect) - happens all the time for all event markers
     */
    updateMarkerPulse() {
        if (!this.sceneModel) return;
        
        const markers = this.sceneModel.getMarkers();
        const currentTime = Date.now();
        
        markers.forEach(marker => {
            if (marker && marker.userData && marker.userData.isEventMarker) {
                // Don't pulse non-interactive markers (variant markers) or locked events
                if (marker.userData.isInteractive === false || marker.userData.isLocked) {
                    return;
                }
                
                // Skip pulse animation if marker is currently being animated (page transition)
                if (marker.userData.isAnimating) {
                    return;
                }
                
                // Initialize pulse data if not exists
                if (!marker.userData.pulseData) {
                    marker.userData.pulseData = {
                        startTime: currentTime,
                        baseScale: 1.0,
                        minScale: 0.85, // More exaggerated - smaller
                        maxScale: 1.20, // More exaggerated - bigger
                        pulseSpeed: 0.008 // Much faster pulse speed
                    };
                }
                
                const pulseData = marker.userData.pulseData;
                const elapsed = (currentTime - pulseData.startTime) * pulseData.pulseSpeed;
                
                // Use sine wave for smooth pulsing (dilation)
                const pulse = Math.sin(elapsed);
                // Map from -1 to 1 range to minScale to maxScale
                const scale = pulseData.baseScale + (pulse * (pulseData.maxScale - pulseData.baseScale) * 0.5);
                
                // For Moon/Mars/Station markers on flat planes or moving objects, scale only in X and Y (flat), keep Z at 1
                const locationType = marker.userData ? marker.userData.locationType : 'earth';
                if (locationType === 'moon' || locationType === 'mars' || locationType === 'station') {
                    marker.scale.set(scale, scale, 1);
                } else {
                    marker.scale.set(scale, scale, scale);
                }
            }
        });
    }

    /**
     * Handle mouse up
     */
    onMouseUp() {
        const sceneModel = this.sceneModel;
        sceneModel.setDragging(false);
        
        // Clear initial touch position
        sceneModel.initialTouchPosition = null;
        
        // Set timeout to resume auto-rotation after inactivity
        if (sceneModel.getAutoRotateEnabled() && sceneModel.autoRotateTimeout) {
            clearTimeout(sceneModel.autoRotateTimeout);
        }
        
        if (sceneModel.getAutoRotateEnabled()) {
            // If viewing an event, recenter to it after delay
            if (sceneModel.eventMarker) {
                sceneModel.autoRotateTimeout = setTimeout(() => {
                    sceneModel.setAutoRotate(true);
                    sceneModel.setRotationVelocity({ x: 0, y: 0 });
                }, 2000); // 2 seconds delay after dragging stops
            } else {
                // Normal auto-rotate
                sceneModel.autoRotateTimeout = setTimeout(() => {
                    sceneModel.setAutoRotate(true);
                    sceneModel.setRotationVelocity({ x: 0, y: 0 });
                }, 5000); // 5 second delay
            }
        }
    }

    /**
     * Zoom in and center camera on a marker
     * @param {THREE.Object3D} marker - Marker to zoom to
     */
    zoomToMarker(marker) {
        const sceneModel = this.sceneModel;
        const camera = sceneModel.getCamera();
        const globe = sceneModel.getGlobe();
        
        // Store original camera position and globe rotation before zooming
        if (!this.uiView.originalCameraPosition) {
            this.uiView.originalCameraPosition = camera.position.clone();
            this.uiView.originalGlobeRotation = {
                x: globe.rotation.x,
                y: globe.rotation.y,
                z: globe.rotation.z
            };
        }
        
        // Hide Moon/Mars planes when zooming to a marker
        this.setPlanesVisibility(false);
        
        // Disable auto-rotate
        sceneModel.setAutoRotate(false);
        if (sceneModel.autoRotateTimeout) {
            clearTimeout(sceneModel.autoRotateTimeout);
            sceneModel.autoRotateTimeout = null;
        }
        
        // Get world position of marker (accounting for globe rotation)
        const markerWorldPosition = new THREE.Vector3();
        marker.getWorldPosition(markerWorldPosition);
        
        // Calculate target camera position (closer to marker)
        const targetDistance = 2.5; // Closer zoom distance
        const direction = markerWorldPosition.clone().normalize();
        const targetPosition = direction.multiplyScalar(targetDistance);
        
        // Animate camera to target position
        const startPosition = camera.position.clone();
        const duration = 500; // 0.5 second animation (faster)
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate position
            const currentPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easeProgress);
            camera.position.copy(currentPosition);
            
            // Look at the marker's world position (not just origin)
            const currentMarkerWorldPos = new THREE.Vector3();
            marker.getWorldPosition(currentMarkerWorldPos);
            
            // On mobile, offset the lookAt point downward to position marker in top image area
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                // Calculate offset to center marker in top half of screen (where image is)
                // Top half is from 60px (header) to ~50vh
                // We want the marker centered in that top area, which means it should appear
                // higher on screen. To achieve this, we look at a point below the marker
                const viewportHeight = window.innerHeight;
                const topAreaHeight = (viewportHeight * 0.5) - 60; // Height of top area
                const topAreaCenter = 60 + (topAreaHeight / 2); // Center Y of top area
                const screenCenter = viewportHeight / 2;
                const offsetY = (topAreaCenter - screenCenter) / viewportHeight; // Normalized offset
                
                // Calculate direction from camera to marker
                const cameraToMarker = new THREE.Vector3().subVectors(currentMarkerWorldPos, camera.position).normalize();
                
                // Calculate camera's right and up vectors in world space
                const cameraRight = new THREE.Vector3().crossVectors(cameraToMarker, new THREE.Vector3(0, 1, 0)).normalize();
                const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraToMarker).normalize();
                
                // Offset the lookAt point downward (opposite of camera up) to make marker appear higher
                // Increased offset multiplier to position marker higher in the top area
                const offsetDistance = Math.abs(offsetY) * 1.5; // Increased to position marker higher in top area
                const offsetVector = cameraUp.multiplyScalar(-offsetDistance); // Negative to move down
                currentMarkerWorldPos.add(offsetVector);
            }
            
            camera.lookAt(currentMarkerWorldPos);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // After zoom completes, set up recentering timeout if viewing event
                if (sceneModel.eventMarker && sceneModel.getAutoRotateEnabled()) {
                    if (sceneModel.autoRotateTimeout) {
                        clearTimeout(sceneModel.autoRotateTimeout);
                    }
                    sceneModel.autoRotateTimeout = setTimeout(() => {
                        sceneModel.setAutoRotate(true);
                        sceneModel.setRotationVelocity({ x: 0, y: 0 });
                    }, 2000); // 2 seconds delay after dragging stops
                }
            }
        };
        
        animate();
    }

    /**
     * Reset camera to default view (for Moon/Mars events)
     * Note: Planes should be visible for Moon/Mars events since they're on those panels
     */
    resetCameraToDefault() {
        const sceneModel = this.sceneModel;
        const camera = sceneModel.getCamera();
        const globe = sceneModel.getGlobe();
        
        if (!camera || !globe) return;
        
        // Restore plane visibility for Moon/Mars events (they might have been hidden by Earth event zoom)
        this.restorePlanesVisibility();
        
        // Disable auto-rotate
        sceneModel.setAutoRotate(false);
        if (sceneModel.autoRotateTimeout) {
            clearTimeout(sceneModel.autoRotateTimeout);
            sceneModel.autoRotateTimeout = null;
        }
        
        // Default camera position and globe rotation
        // On mobile portrait, use more zoomed out position to show Moon/Mars panels
        const isMobilePortrait = sceneModel.isMobilePortrait || (window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
        const defaultZoom = isMobilePortrait ? 5.5 : 3.5;
        const targetPosition = new THREE.Vector3(0, 0, defaultZoom);
        const targetRotation = { x: 0, y: 0, z: 0 };
        
        // Animate camera to default position
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
            
            // Easing function (ease out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate camera position
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Interpolate globe rotation
            globe.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
            globe.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
            globe.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;
            
            // Camera always looks at origin
            camera.lookAt(0, 0, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
            // Note: Planes remain visible for Moon/Mars events, no need to restore
        };
        
        animate();
    }

    /**
     * Handle marker click
     * @param {MouseEvent} event - Mouse event
     */
    onMarkerClick(event) {
        // Don't register click if mouse was dragged
        if (window.mouseMoved) return;
        
        const sceneModel = this.sceneModel;
        const camera = sceneModel.getCamera();
        const renderer = sceneModel.getRenderer();
        const markers = sceneModel.getMarkers();
        const container = document.getElementById('globe-container');
        const rect = container.getBoundingClientRect();
        
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const clickableObjects = [...markers];
        const globe = sceneModel.getGlobe();
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
            const activeMarker = sceneModel.getActiveMarker();
            
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
                    // Reset camera to default view for Moon/Mars/Station events (station is moving, can't zoom to it)
                    this.resetCameraToDefault();
                } else {
                    // Zoom in and center on the marker (Earth events)
                    this.zoomToMarker(clickedMarker);
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
                    console.log(`[InteractionController] Image path for "${eventName}": ${eventImage}`);
                } else {
                    // Fallback: construct path manually (same logic as EventManager)
                    eventImage = displayEvent.image || null;
                    if (!eventImage || !eventImage.trim()) {
                        // Auto-detect from events images folder
                        const normalizedName = eventName.replace(/\s+/g, ' ').trim();
                        const encodedFileName = encodeURIComponent(normalizedName);
                        eventImage = `assets/images/events/${encodedFileName}.png`;
                        console.log(`[InteractionController] Auto-detecting image for event "${eventName}": ${eventImage}`);
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
                    console.log(`[InteractionController] Image path (fallback) for "${eventName}": ${eventImage}`);
                }
                
                this.uiView.showEventSlide(eventName, eventImage, eventDescription, clickedMarker, eventData);
            }
            // Marker clicking disabled - labels no longer shown for cities/seaports
        } else {
            // Clicked elsewhere - hide label
            this.uiView.hideCityLabel();
            // Only close event slide if one is actually open (don't reset camera if user manually zoomed)
            if (this.uiView.currentEventMarker) {
                this.uiView.hideEventSlide();
            }
        }
    }

    /**
     * Handle touch start
     * @param {TouchEvent} event - Touch event
     */
    onTouchStart(event) {
        if (event.touches.length === 1) {
            const sceneModel = this.sceneModel;
            sceneModel.setDragging(true);
            sceneModel.setAutoRotate(false);
            
            const touch = event.touches[0];
            sceneModel.setPreviousMousePosition({
                x: touch.clientX,
                y: touch.clientY
            });
            
            // Track initial touch position to detect if it's a drag vs tap
            sceneModel.initialTouchPosition = {
                x: touch.clientX,
                y: touch.clientY
            };
            
            // Notify UI that dragging started (to hide image overlay if visible)
            if (this.uiView) {
                this.uiView.onGlobeDragStart();
            }
        }
    }

    /**
     * Handle touch move
     * @param {TouchEvent} event - Touch event
     */
    onTouchMove(event) {
        if (event.touches.length === 1) {
            const sceneModel = this.sceneModel;
            if (!sceneModel.isDraggingState()) return;
            
            const touch = event.touches[0];
            const deltaX = touch.clientX - sceneModel.getPreviousMousePosition().x;
            const deltaY = touch.clientY - sceneModel.getPreviousMousePosition().y;
            
            // Check if this is a significant movement (not just a tap)
            const initialPos = sceneModel.initialTouchPosition;
            if (initialPos) {
                const totalDeltaX = Math.abs(touch.clientX - initialPos.x);
                const totalDeltaY = Math.abs(touch.clientY - initialPos.y);
                const totalMovement = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
                
                // If movement is significant (more than 5px), prevent page scrolling
                if (totalMovement > 5) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else {
                // Fallback: always prevent if we don't have initial position
                event.preventDefault();
                event.stopPropagation();
            }
            
            const globe = sceneModel.getGlobe();
            if (globe) {
                const rotationSpeed = 0.005;
                globe.rotation.y += deltaX * rotationSpeed;
                globe.rotation.x += deltaY * rotationSpeed;
                globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            }
            
            sceneModel.setPreviousMousePosition({
                x: touch.clientX,
                y: touch.clientY
            });
        }
    }

    /**
     * Handle wheel/zoom
     * @param {WheelEvent} event - Wheel event
     */
    onWheel(event) {
        event.preventDefault();
        const camera = this.sceneModel.getCamera();
        const delta = event.deltaY * 0.001; // Original sensitivity
        const isMobilePortrait = this.sceneModel.isMobilePortrait || (window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
        
        // Different zoom limits for mobile portrait (allows more zoom out to show panels)
        const minZoom = 1.5;
        const maxZoom = isMobilePortrait ? 7.0 : 5.0;
        
        camera.position.z += delta;
        camera.position.z = Math.max(minZoom, Math.min(maxZoom, camera.position.z));
        
        // Clear stored original position when manually zooming (so clicking globe doesn't reset)
        if (this.uiView) {
            this.uiView.originalCameraPosition = null;
            this.uiView.originalGlobeRotation = null;
        }
    }

    /**
     * Zoom in (move camera closer)
     */
    zoomIn() {
        const camera = this.sceneModel.getCamera();
        if (camera) {
            const delta = 0.4; // Zoom step size (increased from 0.2 for stronger zoom)
            const isMobilePortrait = this.sceneModel.isMobilePortrait || (window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
            
            // Different zoom limits for mobile portrait (allows more zoom out to show panels)
            const minZoom = 1.5;
            const maxZoom = isMobilePortrait ? 7.0 : 5.0; // Allow more zoom out on mobile portrait
            
            camera.position.z -= delta;
            camera.position.z = Math.max(minZoom, Math.min(maxZoom, camera.position.z));
            
            // Clear stored original position when manually zooming (so clicking globe doesn't reset)
            if (this.uiView) {
                this.uiView.originalCameraPosition = null;
                this.uiView.originalGlobeRotation = null;
            }
        }
    }

    /**
     * Zoom out (move camera farther)
     */
    zoomOut() {
        const camera = this.sceneModel.getCamera();
        if (camera) {
            const delta = 0.4; // Zoom step size (increased from 0.2 for stronger zoom)
            const isMobilePortrait = this.sceneModel.isMobilePortrait || (window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
            
            // Different zoom limits for mobile portrait (allows more zoom out to show panels)
            const minZoom = 1.5;
            const maxZoom = isMobilePortrait ? 7.0 : 5.0; // Allow more zoom out on mobile portrait
            
            camera.position.z += delta;
            camera.position.z = Math.max(minZoom, Math.min(maxZoom, camera.position.z));
            
            // Clear stored original position when manually zooming (so clicking globe doesn't reset)
            if (this.uiView) {
                this.uiView.originalCameraPosition = null;
                this.uiView.originalGlobeRotation = null;
            }
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const sceneModel = this.sceneModel;
        const camera = sceneModel.getCamera();
        const renderer = sceneModel.getRenderer();
        const container = document.getElementById('globe-container');
        
        // Update mobile portrait state on resize
        if (container && sceneModel) {
            const isMobile = window.innerWidth <= 768;
            const isPortrait = container.clientHeight > container.clientWidth;
            const wasMobilePortrait = sceneModel.isMobilePortrait;
            const isMobilePortrait = isMobile && isPortrait;
            sceneModel.isMobilePortrait = isMobilePortrait;
            
            // If orientation changed, reposition Moon and Mars panels
            if (wasMobilePortrait !== isMobilePortrait) {
                this.updatePlanesPosition(isMobilePortrait);
            }
        }
        
        if (container && camera && renderer) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
    
    /**
     * Update Moon and Mars planes position based on viewport
     * @param {boolean} isMobilePortrait - Whether in mobile portrait mode
     */
    updatePlanesPosition(isMobilePortrait) {
        const moonPlane = this.sceneModel.getMoonPlane();
        const marsPlane = this.sceneModel.getMarsPlane();
        
        console.log('updatePlanesPosition called with isMobilePortrait:', isMobilePortrait);
        console.log('Moon plane exists:', !!moonPlane, 'Mars plane exists:', !!marsPlane);
        
        if (moonPlane) {
            if (isMobilePortrait) {
                // Mobile portrait: horizontal layout at the top
                console.log('Setting Moon to mobile portrait position: (-0.8, 1.2, 0)');
                moonPlane.position.set(-0.8, 1.2, 0); // Left side, at the top
            } else {
                // Desktop: vertical layout on the right
                console.log('Setting Moon to desktop position: (1.5, 0.3, 0)');
                moonPlane.position.set(1.5, 0.3, 0); // To the right, slightly above center
            }
            // Update lookAt direction
            const cameraZ = isMobilePortrait ? 5.5 : 3.5;
            moonPlane.lookAt(0, 0, cameraZ);
            console.log('Moon plane final position:', moonPlane.position);
        }
        
        if (marsPlane) {
            if (isMobilePortrait) {
                // Mobile portrait: horizontal layout at the top
                console.log('Setting Mars to mobile portrait position: (0.3, 1.2, 0)');
                marsPlane.position.set(0.3, 1.2, 0); // Right of Moon, at the top
            } else {
                // Desktop: vertical layout on the right
                console.log('Setting Mars to desktop position: (1.5, -0.3, 0)');
                marsPlane.position.set(1.5, -0.3, 0); // To the right, slightly below center
            }
            // Update lookAt direction
            const cameraZ = isMobilePortrait ? 5.5 : 3.5;
            marsPlane.lookAt(0, 0, cameraZ);
            console.log('Mars plane final position:', marsPlane.position);
        }
        
        console.log('Planes repositioned for', isMobilePortrait ? 'mobile portrait' : 'desktop');
    }
    
    /**
     * Start continuously following a station marker (ISS)
     * @param {Object} marker - The station marker to follow
     */
    startFollowingStation(marker) {
        // Stop any existing following
        this.stopFollowingStation();
        
        this.followingStationMarker = marker;
        
        // Store original camera position if not already stored
        const camera = this.sceneModel.getCamera();
        const globe = this.sceneModel.getGlobe();
        if (camera && !this.uiView.originalCameraPosition) {
            this.uiView.originalCameraPosition = camera.position.clone();
            this.uiView.originalGlobeRotation = {
                x: globe.rotation.x,
                y: globe.rotation.y,
                z: globe.rotation.z
            };
        }
        
        // Start continuous following animation
        const followStation = () => {
            if (!this.followingStationMarker) {
                return; // Stop if no longer following
            }
            
            const camera = this.sceneModel.getCamera();
            if (!camera || !marker) {
                this.stopFollowingStation();
                return;
            }
            
            // Get world position of marker (station moves, so this updates continuously)
            const markerWorldPosition = new THREE.Vector3();
            marker.getWorldPosition(markerWorldPosition);
            
            // Calculate target camera position (closer to marker, similar to zoomToMarker)
            const targetDistance = 2.5;
            const direction = markerWorldPosition.clone().normalize();
            const targetPosition = direction.multiplyScalar(targetDistance);
            
            // Smoothly interpolate camera position to follow the station
            camera.position.lerp(targetPosition, 0.1); // 10% interpolation per frame for smooth following
            
            // Look at the marker's current world position
            const currentMarkerWorldPos = new THREE.Vector3();
            marker.getWorldPosition(currentMarkerWorldPos);
            
            // On mobile, offset the lookAt point downward to position marker in top image area
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                const viewportHeight = window.innerHeight;
                const topAreaHeight = (viewportHeight * 0.5) - 60;
                const topAreaCenter = 60 + (topAreaHeight / 2);
                const screenCenter = viewportHeight / 2;
                const offsetY = (topAreaCenter - screenCenter) / viewportHeight;
                
                const cameraToMarker = new THREE.Vector3().subVectors(currentMarkerWorldPos, camera.position).normalize();
                const cameraRight = new THREE.Vector3().crossVectors(cameraToMarker, new THREE.Vector3(0, 1, 0)).normalize();
                const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraToMarker).normalize();
                const offsetDistance = Math.abs(offsetY) * 1.5;
                const offsetVector = cameraUp.multiplyScalar(-offsetDistance);
                currentMarkerWorldPos.add(offsetVector);
            }
            
            camera.lookAt(currentMarkerWorldPos);
            
            // Continue following
            this.followStationAnimationId = requestAnimationFrame(followStation);
        };
        
        // Start the following loop
        this.followStationAnimationId = requestAnimationFrame(followStation);
    }
    
    /**
     * Stop following the station marker
     */
    stopFollowingStation() {
        this.followingStationMarker = null;
        if (this.followStationAnimationId !== null) {
            cancelAnimationFrame(this.followStationAnimationId);
            this.followStationAnimationId = null;
        }
    }
    
    /**
     * Update pin lines and marker positions for station events
     * Pin lines should point along the normal (from globe center to marker)
     * Marker should be at the end of the pin line
     */
    updateStationPinLines() {
        if (!this.sceneModel) return;
        
        const globe = this.sceneModel.getGlobe();
        if (!globe) return;
        
        const markers = this.sceneModel.getMarkers();
        const issSatellite = window.globeController && window.globeController.transportController 
            ? window.globeController.transportController.findISS() 
            : null;
        
        if (!issSatellite) return;
        
        markers.forEach(marker => {
            if (marker && marker.userData && marker.userData.isEventMarker) {
                const locationType = marker.userData.locationType;
                if (locationType === 'station' && marker.parent === issSatellite) {
                    // Get satellite's world position (where the pin line starts)
                    const satelliteWorldPos = new THREE.Vector3();
                    issSatellite.getWorldPosition(satelliteWorldPos);
                    
                    // Calculate normal (direction from globe center to satellite's world position)
                    // This gives us the direction along Earth's curvature
                    const normal = satelliteWorldPos.clone().normalize();
                    
                    // Convert normal to satellite's local space
                    const localNormal = normal.clone();
                    const satelliteQuaternionInverse = issSatellite.quaternion.clone().invert();
                    localNormal.applyQuaternion(satelliteQuaternionInverse);
                    localNormal.normalize();
                    
                    // Pin line length - increased to push marker further out from model
                    const pinLength = 0.06;
                    
                    // Update marker position to be at the end of the pin line
                    const newMarkerPosition = localNormal.multiplyScalar(pinLength);
                    marker.position.copy(newMarkerPosition);
                    
                    // Update pin line if it exists
                    if (marker.userData.pinLine) {
                        const pinLine = marker.userData.pinLine;
                        const lineStart = new THREE.Vector3(0, 0, 0); // Satellite center
                        const lineEnd = newMarkerPosition.clone(); // Marker position (at end of pin)
                        
                        // Update line geometry
                        if (pinLine.geometry) {
                            pinLine.geometry.setFromPoints([lineStart, lineEnd]);
                            if (pinLine.geometry.attributes && pinLine.geometry.attributes.position) {
                                pinLine.geometry.attributes.position.needsUpdate = true;
                            }
                        }
                    }
                }
            }
        });
    }
}

