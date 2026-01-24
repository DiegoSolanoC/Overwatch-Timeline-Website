/**
 * MarkerLockAnimationHelpers - Utilities for lock/unlock animations
 * Extracted from EventMarkerManager to reduce duplication
 */

/**
 * Animates a marker locking (scale down, color to dark)
 * @param {THREE.Mesh} marker - Marker to lock
 */
export function animateMarkerLock(marker) {
    if (!marker || !marker.userData) return;
    
    marker.userData.isLocked = true;
    
    // Store original scale if not already stored
    if (!marker.userData.originalScale) {
        marker.userData.originalScale = marker.scale.x;
    }
    
    // Store original color if not already stored
    if (!marker.userData.originalColor) {
        marker.userData.originalColor = marker.userData.isInteractive === false ? 0xff69b4 : 0xff6600;
    }
    
    // Get current values
    const startScale = marker.scale.x;
    const targetScale = 0.75;
    const startColor = new THREE.Color();
    if (marker.material) {
        startColor.copy(marker.material.color);
    }
    const targetColor = new THREE.Color(0x331100); // Dark orange/near black
    
    // Mark as animating to prevent pulse interference
    marker.userData.isAnimating = true;
    
    const duration = 300; // 300ms animation
    const startTime = performance.now();
    
    const animate = () => {
        // Check if animation was cancelled
        if (!marker.userData || !marker.userData.isAnimating || marker.userData.isLocked === false) {
            return;
        }
        
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease in)
        const easeProgress = progress * progress;
        
        // Interpolate scale
        const currentScale = startScale + (targetScale - startScale) * easeProgress;
        marker.scale.set(currentScale, currentScale, currentScale);
        
        // Interpolate color
        if (marker.material) {
            marker.material.color.lerpColors(startColor, targetColor, easeProgress);
            marker.material.needsUpdate = true;
        }
        
        // Interpolate pin line color
        if (marker.userData.pinLine && marker.userData.pinLine.material) {
            marker.userData.pinLine.material.color.lerpColors(
                new THREE.Color(0xff6600), 
                targetColor, 
                easeProgress
            );
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete - ensure final values
            marker.scale.set(targetScale, targetScale, targetScale);
            if (marker.material) {
                marker.material.color.copy(targetColor);
            }
            if (marker.userData.pinLine && marker.userData.pinLine.material) {
                marker.userData.pinLine.material.color.copy(targetColor);
            }
            marker.userData.isAnimating = false;
        }
    };
    
    requestAnimationFrame(animate);
}

/**
 * Animates a marker unlocking (scale up, color to original)
 * @param {THREE.Mesh} marker - Marker to unlock
 */
export function animateMarkerUnlock(marker) {
    if (!marker || !marker.userData) return;
    
    marker.userData.isLocked = false;
    
    // Get current values
    const startScale = marker.scale.x;
    const originalScale = marker.userData.originalScale || 1.0;
    const startColor = new THREE.Color();
    if (marker.material) {
        startColor.copy(marker.material.color);
    }
    const restoreColor = marker.userData.originalColor || 
                         (marker.userData.isInteractive === false ? 0xff69b4 : 0xff6600);
    const targetColor = new THREE.Color(restoreColor);
    
    // Mark as animating to prevent pulse interference
    marker.userData.isAnimating = true;
    
    const duration = 300; // 300ms animation
    const startTime = performance.now();
    
    const animate = () => {
        // Check if animation was cancelled
        if (!marker.userData || !marker.userData.isAnimating || marker.userData.isLocked === true) {
            return;
        }
        
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate scale
        const currentScale = startScale + (originalScale - startScale) * easeProgress;
        marker.scale.set(currentScale, currentScale, currentScale);
        
        // Interpolate color
        if (marker.material) {
            marker.material.color.lerpColors(startColor, targetColor, easeProgress);
            marker.material.needsUpdate = true;
        }
        
        // Interpolate pin line color
        if (marker.userData.pinLine && marker.userData.pinLine.material) {
            marker.userData.pinLine.material.color.lerpColors(
                startColor,
                new THREE.Color(0xff6600), // Orange for pin lines
                easeProgress
            );
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete - ensure final values
            marker.scale.set(originalScale, originalScale, originalScale);
            if (marker.material) {
                marker.material.color.copy(targetColor);
            }
            if (marker.userData.pinLine && marker.userData.pinLine.material) {
                marker.userData.pinLine.material.color.setHex(0xff6600); // Orange
            }
            marker.userData.isAnimating = false;
        }
    };
    
    requestAnimationFrame(animate);
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.MarkerLockAnimationHelpers) {
        window.MarkerLockAnimationHelpers = {};
    }
    window.MarkerLockAnimationHelpers.animateMarkerLock = animateMarkerLock;
    window.MarkerLockAnimationHelpers.animateMarkerUnlock = animateMarkerUnlock;
}
