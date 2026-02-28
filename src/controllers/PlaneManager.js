/**
 * PlaneManager - Manages Moon/Mars plane positioning, visibility, and animation
 * Extracted from GlobeController to follow Single Responsibility Principle
 */

export class PlaneManager {
    constructor(sceneModel, dataModel) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
    }
    
    /**
     * Get Moon and Mars planes from sceneModel
     */
    getPlanes() {
        // Try getter methods first, then fallback to direct property access
        const moonPlane = this.sceneModel.getMoonPlane ? 
            this.sceneModel.getMoonPlane() : 
            (this.sceneModel.moonPlane || null);
        const marsPlane = this.sceneModel.getMarsPlane ? 
            this.sceneModel.getMarsPlane() : 
            (this.sceneModel.marsPlane || null);
        return { moonPlane, marsPlane };
    }
    
    /**
     * Update Moon/Mars plane positions to stay on camera's right side
     * @param {THREE.Camera} camera - The camera object
     */
    updatePlanePositions(camera) {
        const { moonPlane, marsPlane } = this.getPlanes();
        
        if (!moonPlane || !marsPlane || !camera) {
            return;
        }
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
        const renderer = this.sceneModel.getRenderer ? this.sceneModel.getRenderer() : this.sceneModel.renderer;
        
        // Get camera position
        const cameraPosition = camera.position.clone();
        
        // Update camera matrix to ensure it's current
        camera.updateMatrixWorld();
        
        // Get camera's right, up, and forward vectors from its matrix
        // Column 0 = right, Column 1 = up, Column 2 = forward (negative)
        const right = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        const forward = new THREE.Vector3();
        
        right.setFromMatrixColumn(camera.matrixWorld, 0);
        cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
        forward.setFromMatrixColumn(camera.matrixWorld, 2);
        
        // Normalize vectors
        right.normalize();
        cameraUp.normalize();
        forward.normalize();
        
        // Position planes to the right of the camera.
        // In globe mode, anchor around origin (original behavior).
        // In unwrapped map mode, keep them anchored relative to camera pan (so they stay visible while dragging).
        let horizontalOffset = isMapView ? 2.4 : 1.5;
        let moonVerticalOffset = 0.3; // Moon above center
        let marsVerticalOffset = -0.3; // Mars below center

        // Map view: offsets must scale with zoom so panels stay inside the viewport when zooming in/out.
        if (isMapView && renderer && renderer.domElement) {
            const rect = renderer.domElement.getBoundingClientRect();
            const viewportW = Math.max(1, rect.width);
            const viewportH = Math.max(1, rect.height);
            const aspect = viewportW / viewportH;

            const fovRad = (camera.fov * Math.PI) / 180;
            const zOffset = 0.18; // keep consistent with map-view panel z offset below
            const distance = Math.max(0.01, cameraPosition.z - zOffset);
            const halfViewH = Math.tan(fovRad / 2) * distance;
            const halfViewW = halfViewH * aspect;

            // Panel size is 0.4 x 0.4 (see setupCelestialPlanes/createCelestialPlane).
            const panelHalfW = 0.4 / 2;
            const panelHalfH = 0.4 / 2;
            const padX = 0.12;
            const padY = 0.10;

            horizontalOffset = Math.max(0, halfViewW - (panelHalfW + padX));
            const v = Math.max(0, Math.min(halfViewH - (panelHalfH + padY), halfViewH * 0.25));
            moonVerticalOffset = v;
            marsVerticalOffset = -v;
        }

        const base = isMapView
            ? new THREE.Vector3(cameraPosition.x, cameraPosition.y, 0)
            : new THREE.Vector3(0, 0, 0);
        
        // Calculate plane positions: origin + (right * horizontalOffset) + (cameraUp * verticalOffset)
        const moonPosition = new THREE.Vector3()
            .copy(base)
            .addScaledVector(right, horizontalOffset)
            .addScaledVector(cameraUp, moonVerticalOffset);
        
        const marsPosition = new THREE.Vector3()
            .copy(base)
            .addScaledVector(right, horizontalOffset)
            .addScaledVector(cameraUp, marsVerticalOffset);

        // Map view: keep the Moon/Mars panels slightly in front of the unwrapped map plane
        // so they don't visually sit "behind" it and feel too small.
        if (isMapView) {
            const zOffset = 0.18;
            moonPosition.z += zOffset;
            marsPosition.z += zOffset;
        }
        
        // Update plane positions
        moonPlane.position.copy(moonPosition);
        marsPlane.position.copy(marsPosition);
        
        // Update plane rotations
        // - Globe view: face the camera (original behavior)
        // - Map view: keep planes flat like the unwrapped map plane (no tilt)
        if (isMapView) {
            moonPlane.rotation.set(0, 0, 0);
            marsPlane.rotation.set(0, 0, 0);
        } else {
            moonPlane.lookAt(cameraPosition);
            marsPlane.lookAt(cameraPosition);
        }
    }
    
    /**
     * Update Moon/Mars plane visibility based on current page events
     * Planes are shown only if the current page has at least one event on that plane
     * Animates panels with vertical scaling (squash/stretch effect)
     */
    updatePlaneVisibility() {
        // Try multiple ways to get planes
        let moonPlane = null;
        let marsPlane = null;
        
        if (this.sceneModel) {
            moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
            marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        }
        
        if (!moonPlane || !marsPlane) {
            return;
        }
        
        if (!this.dataModel) {
            // Animate out if no data model
            this.animatePlaneScale(moonPlane, false);
            this.animatePlaneScale(marsPlane, false);
            return;
        }
        
        // Check if current page has Moon/Mars events
        const currentPageEvents = this.dataModel.getEventsForCurrentPage();
        
        let hasMoonEvent = false;
        let hasMarsEvent = false;
        
        currentPageEvents.forEach(event => {
            const locationType = event.locationType || 'earth';
            
            if (locationType === 'moon') {
                hasMoonEvent = true;
            } else if (locationType === 'mars') {
                hasMarsEvent = true;
            }
            
            // Also check variants for multi-events
            if (event.variants && event.variants.length > 0) {
                event.variants.forEach(variant => {
                    const variantLocationType = variant.locationType || locationType;
                    if (variantLocationType === 'moon') {
                        hasMoonEvent = true;
                    } else if (variantLocationType === 'mars') {
                        hasMarsEvent = true;
                    }
                });
            }
        });
        
        // Animate planes based on whether they have events on current page
        this.animatePlaneScale(moonPlane, hasMoonEvent);
        this.animatePlaneScale(marsPlane, hasMarsEvent);
    }
    
    /**
     * Animate plane scale vertically (squash/stretch effect)
     * @param {THREE.Mesh} plane - The plane to animate
     * @param {boolean} show - Whether to show (stretch) or hide (squash) the plane
     */
    animatePlaneScale(plane, show) {
        if (!plane || !plane.material) return;
        
        // Initialize scale if not set
        if (!plane.userData) {
            plane.userData = {};
        }
        if (plane.scale.y === undefined || isNaN(plane.scale.y)) {
            plane.scale.y = show ? 0 : 1;
        }
        
        const startScaleY = plane.scale.y;
        const targetScaleY = show ? 1 : 0;
        
        // Check if already at target state - if so, skip animation
        const scaleThreshold = 0.01;
        if (Math.abs(startScaleY - targetScaleY) < scaleThreshold) {
            // Already at target state, just ensure visibility and emissive intensity are correct
            plane.visible = show;
            if (plane.material) {
                plane.material.emissiveIntensity = 0.3; // Settled state
                plane.material.needsUpdate = true;
            }
            plane.scale.set(1, targetScaleY, 1);
            plane.updateMatrix();
            return;
        }
        
        // Check if already animating - if so, cancel and start new animation
        if (plane.userData && plane.userData.isAnimating) {
            // Cancel previous animation by clearing the flag
            plane.userData.isAnimating = false;
        }
        
        const duration = 150; // 150ms animation (faster than markers)
        const startTime = performance.now();
        
        // Store original emissive intensity (settled state)
        const settledIntensity = 0.3;
        const peakIntensity = 2.0; // Bright flash during animation
        
        // Ensure plane is visible during animation (even when scaling to 0)
        plane.visible = true;
        plane.userData.isAnimating = true;
        
        const animate = () => {
            // Check if animation was cancelled
            if (!plane.userData || !plane.userData.isAnimating) {
                return;
            }
            
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease out for show, ease in for hide)
            let easeProgress;
            if (show) {
                // Ease out when stretching up
                easeProgress = 1 - Math.pow(1 - progress, 3);
            } else {
                // Ease in when squashing down
                easeProgress = progress * progress;
            }
            
            // Interpolate scale Y
            const currentScaleY = startScaleY + (targetScaleY - startScaleY) * easeProgress;
            plane.scale.set(1, currentScaleY, 1); // Keep X and Z at 1, animate Y
            
            // Animate emissive intensity - flash brighter during animation
            // Create a curve that peaks in the middle: 0 -> peak -> 0
            // Use a bell curve: sin(π * progress) gives us 0 at start/end, 1 in middle
            const glowProgress = Math.sin(progress * Math.PI);
            const currentIntensity = settledIntensity + (peakIntensity - settledIntensity) * glowProgress;
            
            if (plane.material) {
                plane.material.emissiveIntensity = currentIntensity;
                plane.material.needsUpdate = true;
            }
            
            // Force update
            plane.updateMatrix();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                plane.scale.set(1, targetScaleY, 1); // Ensure final scale is exact
                plane.visible = show; // Hide if target scale is 0
                
                // Reset emissive intensity to settled state
                if (plane.material) {
                    plane.material.emissiveIntensity = settledIntensity;
                    plane.material.needsUpdate = true;
                }
                
                if (plane.userData) {
                    plane.userData.isAnimating = false;
                }
                plane.updateMatrix();
            }
        };
        
        requestAnimationFrame(animate);
    }
}
