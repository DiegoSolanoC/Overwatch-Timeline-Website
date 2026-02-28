/**
 * NavigationCameraHelpers - Utilities for camera animation and restoration
 * Extracted from EventNavigationManager to reduce complexity
 */

const MOBILE_BREAKPOINT = 768;
const MOBILE_PORTRAIT_ZOOM = 5.5;
const DEFAULT_ZOOM = 3.5;

/**
 * Animates camera back to original/default position
 * @param {Object} sceneModel - SceneModel instance
 * @param {Object} uiView - UIView instance
 */
export function animateCameraRestore(sceneModel, uiView) {
    const camera = sceneModel.getCamera();
    const globe = sceneModel.getGlobe();
    const renderer = sceneModel.getRenderer ? sceneModel.getRenderer() : null;
    const earthMapPlane = sceneModel.getEarthMapPlane ? sceneModel.getEarthMapPlane() : sceneModel.earthMapPlane;
    const isMapView = sceneModel.getMapViewEnabled ? sceneModel.getMapViewEnabled() : !!sceneModel.isMapView;
    
    if (!camera || !globe) return;
    
    // Use stored position from zoomToMarker/hover, or default view
    let targetPosition, targetRotation;
    
    if (uiView.originalCameraPosition && uiView.originalGlobeRotation) {
        // Use the position stored by zoomToMarker
        targetPosition = uiView.originalCameraPosition.clone();
        targetRotation = uiView.originalGlobeRotation;
    } else {
        // Default view.
        // In map view, choose a zoom that fits the whole map in the viewport (prevents seeing beyond edges).
        // In globe view, use the existing defaults (mobile portrait shows panels).
        let defaultZoom;
        if (isMapView && renderer && earthMapPlane) {
            const rect = renderer.domElement.getBoundingClientRect();
            const viewportW = Math.max(1, rect.width);
            const viewportH = Math.max(1, rect.height);
            const aspect = viewportW / viewportH;
            const fovRad = (camera.fov * Math.PI) / 180;
            const tan = Math.tan(fovRad / 2);
            const halfMapW = 1.0 * (earthMapPlane.scale?.x ?? 1);
            const halfMapH = 0.5 * (earthMapPlane.scale?.y ?? 1);
            const fitDistH = halfMapH / tan;
            const fitDistW = halfMapW / (tan * aspect);
            defaultZoom = Math.max(1.6, Math.min(fitDistH, fitDistW) * 0.98);
        } else {
            const isMobilePortrait = window.innerWidth <= MOBILE_BREAKPOINT && window.innerHeight > window.innerWidth;
            defaultZoom = isMobilePortrait ? MOBILE_PORTRAIT_ZOOM : DEFAULT_ZOOM;
        }
        const THREE = window.THREE;
        targetPosition = new THREE.Vector3(0, 0, defaultZoom);
        targetRotation = { x: 0, y: 0, z: 0 };
    }

    // Map view safety: clamp restored zoom so we never reveal outside-map space even if
    // the stored position was captured at an overly zoomed-out value.
    if (isMapView && renderer && earthMapPlane && targetPosition) {
        const rect = renderer.domElement.getBoundingClientRect();
        const viewportW = Math.max(1, rect.width);
        const viewportH = Math.max(1, rect.height);
        const aspect = viewportW / viewportH;
        const fovRad = (camera.fov * Math.PI) / 180;
        const tan = Math.tan(fovRad / 2);
        const halfMapW = 1.0 * (earthMapPlane.scale?.x ?? 1);
        const halfMapH = 0.5 * (earthMapPlane.scale?.y ?? 1);
        const fitDistH = halfMapH / tan;
        const fitDistW = halfMapW / (tan * aspect);
        const maxSafeZoom = Math.max(1.6, Math.min(fitDistH, fitDistW) * 0.98);
        targetPosition.z = Math.min(targetPosition.z, maxSafeZoom);
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

        if (!isMapView) {
            // Interpolate globe rotation
            globe.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
            globe.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
            globe.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;
            camera.lookAt(0, 0, 0);
        } else {
            // Map view: no globe rotation changes, keep camera perpendicular and clamp within borders.
            if (renderer && earthMapPlane) {
                const rect = renderer.domElement.getBoundingClientRect();
                const viewportW = Math.max(1, rect.width);
                const viewportH = Math.max(1, rect.height);
                const aspect = viewportW / viewportH;
                const fovRad = (camera.fov * Math.PI) / 180;
                const distance = Math.max(0.01, camera.position.z - earthMapPlane.position.z);
                const halfViewH = Math.tan(fovRad / 2) * distance;
                const halfViewW = halfViewH * aspect;
                const halfMapW = 1.0 * (earthMapPlane.scale?.x ?? 1);
                const halfMapH = 0.5 * (earthMapPlane.scale?.y ?? 1);
                const maxPanX = Math.max(0, halfMapW - halfViewW);
                const maxPanY = Math.max(0, halfMapH - halfViewH);
                camera.position.x = Math.max(-maxPanX, Math.min(maxPanX, camera.position.x));
                camera.position.y = Math.max(-maxPanY, Math.min(maxPanY, camera.position.y));
            }
            camera.lookAt(camera.position.x, camera.position.y, 0);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete
            camera.position.copy(targetPosition);
            if (!isMapView) {
                globe.rotation.x = targetRotation.x;
                globe.rotation.y = targetRotation.y;
                globe.rotation.z = targetRotation.z;
                camera.lookAt(0, 0, 0);
            } else {
                camera.lookAt(camera.position.x, camera.position.y, 0);
            }
            
            // Restore plane visibility based on current page
            // Only restore if we're not transitioning to another hover (check if there's a hovered marker)
            const interactionController = window.globeController?.interactionController;
            if (interactionController && !interactionController.hoveredEventMarker) {
                // No marker is currently hovered, safe to restore planes
                interactionController.restorePlanesVisibility();
            }
            
            // Clear stored position since we've restored it (only if no event is open)
            if (!uiView.currentEventMarker) {
                uiView.originalCameraPosition = null;
                uiView.originalGlobeRotation = null;
            }
        }
    };
    
    animate();
}

/**
 * Handles mouse leave behavior for number buttons
 * @param {Object} marker - Marker object
 * @param {Object} sceneModel - SceneModel instance
 * @param {Object} uiView - UIView instance
 */
export function handleNumberButtonMouseLeave(marker, sceneModel, uiView) {
    const interactionController = window.globeController?.interactionController;
    const locationType = marker && marker.userData ? marker.userData.locationType : 'earth';
    
    // Stop following station if it was a station marker
    if (interactionController && locationType === 'station') {
        interactionController.stopFollowingStation();
        // Restore plane visibility when leaving station marker (same as Earth events)
        interactionController.restorePlanesVisibility();
    }
    
    // Stop pulse effect
    if (interactionController) {
        if (interactionController.hoveredEventMarker === marker) {
            interactionController.stopEventMarkerPulse(marker);
            interactionController.hoveredEventMarker = null;
        }
    }
    
    // Restore original camera position (only if no event is open)
    if (!uiView.currentEventMarker) {
        animateCameraRestore(sceneModel, uiView);
    }
    
    // Resume auto rotation if enabled
    if (sceneModel.getAutoRotateEnabled() && !sceneModel.eventMarker) {
        sceneModel.autoRotateTimeout = setTimeout(() => {
            sceneModel.setAutoRotate(true);
        }, 500); // 0.5 second delay
    }
}

/**
 * Handles mouse enter behavior for number buttons
 * @param {Object} marker - Marker object
 * @param {Object} sceneModel - SceneModel instance
 * @param {Object} interactionController - InteractionController instance
 */
export function handleNumberButtonMouseEnter(marker, sceneModel, interactionController) {
    // Stop auto rotation
    sceneModel.setAutoRotate(false);
    if (sceneModel.autoRotateTimeout) {
        clearTimeout(sceneModel.autoRotateTimeout);
        sceneModel.autoRotateTimeout = null;
    }
    
    // Center the marker (zoom to it) or reset to default view for Moon/Mars/Station
    const locationType = marker.userData ? marker.userData.locationType : 'earth';
    if (locationType === 'moon' || locationType === 'mars') {
        // Reset camera to default view for Moon/Mars events
        interactionController.resetCameraToDefault();
    } else if (locationType === 'station') {
        // For station events, hide Moon/Mars panels (like Earth events)
        interactionController.setPlanesVisibility(false);
        // Continuously follow the moving satellite
        interactionController.startFollowingStation(marker);
    } else {
        // Zoom in and center on the marker (Earth events)
        // zoomToMarker already hides the panels
        interactionController.zoomToMarker(marker);
    }
    
    // Start pulse effect (marker hover behavior)
    // Stop any existing hover marker pulse
    if (interactionController.hoveredEventMarker && interactionController.hoveredEventMarker !== marker) {
        interactionController.stopEventMarkerPulse(interactionController.hoveredEventMarker);
    }
    // Start pulse on this marker
    interactionController.startEventMarkerPulse(marker);
    interactionController.hoveredEventMarker = marker;
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.NavigationCameraHelpers) {
        window.NavigationCameraHelpers = {};
    }
    window.NavigationCameraHelpers.animateCameraRestore = animateCameraRestore;
    window.NavigationCameraHelpers.handleNumberButtonMouseLeave = handleNumberButtonMouseLeave;
    window.NavigationCameraHelpers.handleNumberButtonMouseEnter = handleNumberButtonMouseEnter;
}
