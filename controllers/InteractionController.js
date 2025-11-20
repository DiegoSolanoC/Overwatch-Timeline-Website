/**
 * InteractionController - Handles mouse/touch controls and marker interactions
 */
export class InteractionController {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
        this.hoveredEventMarker = null; // Track currently hovered event marker
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
        container.addEventListener('touchstart', (e) => this.onTouchStart(e));
        container.addEventListener('touchmove', (e) => this.onTouchMove(e));
        container.addEventListener('touchend', () => this.onMouseUp());
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
        
        // Get all event markers
        const eventMarkers = [];
        const globe = sceneModel.getGlobe();
        if (globe) {
            globe.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        if (eventMarkers.length === 0) return;
        
        const intersects = raycaster.intersectObjects(eventMarkers);
        
        if (intersects.length > 0) {
            const hoveredMarker = intersects[0].object;
            
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
        
        // Remove all pulse rings
        const globe = this.sceneModel.getGlobe();
        if (globe && marker.userData.pulseRings) {
            marker.userData.pulseRings.forEach(ring => {
                if (ring && ring.parent) {
                    globe.remove(ring);
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
        
        globe.add(ring);
        marker.userData.pulseRings.push(ring);
    }
    
    /**
     * Update ring position and orientation to be flat on globe surface
     */
    updateRingPositionAndOrientation(ring, marker) {
        // Since both marker and ring are children of the globe, use local position
        ring.position.copy(marker.position);
        
        // Calculate normal (direction from globe center to marker)
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
                        if (globe && ring.parent) {
                            globe.remove(ring);
                        }
                        pulseRings.splice(i, 1);
                    } else {
                        // Animate ring
                        const scale = ring.userData.startScale + (ring.userData.maxScale - ring.userData.startScale) * progress;
                        ring.scale.set(scale, scale, scale);
                        
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
     * Update marker pulse animation (dilation effect)
     */
    updateMarkerPulse() {
        if (!this.sceneModel) return;
        
        const markers = this.sceneModel.getMarkers();
        const currentTime = Date.now();
        
        markers.forEach(marker => {
            if (marker && marker.userData && marker.userData.isEventMarker) {
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
                
                marker.scale.set(scale, scale, scale);
            }
        });
    }

    /**
     * Handle mouse up
     */
    onMouseUp() {
        const sceneModel = this.sceneModel;
        sceneModel.setDragging(false);
        
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
                }, 3000); // 3 second delay for event recentering
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
        const duration = 1000; // 1 second animation
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
                    }, 3000); // 3 second delay before recentering
                }
            }
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
                // Check if this is the same event that's currently open
                const currentEventMarker = this.uiView.currentEventMarker;
                if (currentEventMarker === clickedMarker) {
                    // Same event - close it instead of reopening
                    this.uiView.hideEventSlide();
                    return;
                }
                
                // Zoom in and center on the marker
                this.zoomToMarker(clickedMarker);
                // Open slide panel with event info
                const eventData = clickedMarker.userData.event;
                const eventName = eventData.name || clickedMarker.userData.eventName;
                const eventDescription = eventData.description || 'Placeholder text for event information.';
                const eventImage = eventData.image || null;
                this.uiView.showEventSlide(eventName, eventImage, eventDescription, clickedMarker);
            }
            // Marker clicking disabled - labels no longer shown for cities/seaports
        } else {
            // Clicked elsewhere - hide label and close slide
            this.uiView.hideCityLabel();
            this.uiView.hideEventSlide();
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
        camera.position.z += delta;
        camera.position.z = Math.max(1.5, Math.min(5, camera.position.z)); // Original limits
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const sceneModel = this.sceneModel;
        const camera = sceneModel.getCamera();
        const renderer = sceneModel.getRenderer();
        const container = document.getElementById('globe-container');
        
        if (container && camera && renderer) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
}

