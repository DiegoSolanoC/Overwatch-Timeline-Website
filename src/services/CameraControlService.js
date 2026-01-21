/**
 * CameraControlService - Handles camera zoom, movement, and reset
 */

class CameraControlService {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
    }

    /**
     * Zoom in and center camera on a marker
     * @param {THREE.Object3D} marker - Marker to zoom to
     * @param {Function} onPlanesVisibilityChange - Callback to change plane visibility
     */
    zoomToMarker(marker, onPlanesVisibilityChange) {
        const camera = this.sceneModel.getCamera();
        const globe = this.sceneModel.getGlobe();
        
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
        if (onPlanesVisibilityChange) {
            onPlanesVisibilityChange(false);
        }
        
        // Disable auto-rotate
        this.sceneModel.setAutoRotate(false);
        if (this.sceneModel.autoRotateTimeout) {
            clearTimeout(this.sceneModel.autoRotateTimeout);
            this.sceneModel.autoRotateTimeout = null;
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
                const offsetDistance = Math.abs(offsetY) * 1.5; // Increased to position marker higher in top area
                const offsetVector = cameraUp.multiplyScalar(-offsetDistance); // Negative to move down
                currentMarkerWorldPos.add(offsetVector);
            }
            
            camera.lookAt(currentMarkerWorldPos);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // After zoom completes, set up recentering timeout if viewing event
                if (this.sceneModel.eventMarker && this.sceneModel.getAutoRotateEnabled()) {
                    if (this.sceneModel.autoRotateTimeout) {
                        clearTimeout(this.sceneModel.autoRotateTimeout);
                    }
                    this.sceneModel.autoRotateTimeout = setTimeout(() => {
                        this.sceneModel.setAutoRotate(true);
                        this.sceneModel.setRotationVelocity({ x: 0, y: 0 });
                    }, 2000); // 2 seconds delay after dragging stops
                }
            }
        };
        
        animate();
    }

    /**
     * Reset camera to default view (for Moon/Mars events)
     * @param {Function} onPlanesVisibilityRestore - Callback to restore plane visibility
     */
    resetCameraToDefault(onPlanesVisibilityRestore) {
        const camera = this.sceneModel.getCamera();
        const globe = this.sceneModel.getGlobe();
        
        if (!camera || !globe) return;
        
        // Restore plane visibility for Moon/Mars events (they might have been hidden by Earth event zoom)
        if (onPlanesVisibilityRestore) {
            onPlanesVisibilityRestore();
        }
        
        // Disable auto-rotate
        this.sceneModel.setAutoRotate(false);
        if (this.sceneModel.autoRotateTimeout) {
            clearTimeout(this.sceneModel.autoRotateTimeout);
            this.sceneModel.autoRotateTimeout = null;
        }
        
        // Default camera position and globe rotation
        // On mobile portrait, use more zoomed out position to show Moon/Mars panels
        const isMobilePortrait = this.sceneModel.isMobilePortrait || (window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
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
        };
        
        animate();
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
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraControlService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.CameraControlService = CameraControlService;
}
