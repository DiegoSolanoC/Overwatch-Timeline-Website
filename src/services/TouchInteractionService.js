/**
 * TouchInteractionService - Handles touch event interactions
 */

class TouchInteractionService {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
    }

    /**
     * Handle touch start
     * @param {TouchEvent} event - Touch event
     */
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.sceneModel.setDragging(true);
            this.sceneModel.setAutoRotate(false);
            
            const touch = event.touches[0];
            this.sceneModel.setPreviousMousePosition({
                x: touch.clientX,
                y: touch.clientY
            });
            
            // Track initial touch position to detect if it's a drag vs tap
            this.sceneModel.initialTouchPosition = {
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
            if (!this.sceneModel.isDraggingState()) return;
            
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.sceneModel.getPreviousMousePosition().x;
            const deltaY = touch.clientY - this.sceneModel.getPreviousMousePosition().y;
            
            // Check if this is a significant movement (not just a tap)
            const initialPos = this.sceneModel.initialTouchPosition;
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
            
            const globe = this.sceneModel.getGlobe();
            const isMapView = this.sceneModel.getMapViewEnabled && this.sceneModel.getMapViewEnabled();
            if (isMapView) {
                const camera = this.sceneModel.getCamera();
                const renderer = this.sceneModel.getRenderer();
                const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
                if (camera && renderer && earthMapPlane) {
                    const rect = renderer.domElement.getBoundingClientRect();
                    const viewportW = Math.max(1, rect.width);
                    const viewportH = Math.max(1, rect.height);
                    
                    const fovRad = (camera.fov * Math.PI) / 180;
                    const distance = Math.max(0.01, camera.position.z - earthMapPlane.position.z);
                    const halfViewH = Math.tan(fovRad / 2) * distance;
                    const worldPerPixel = (halfViewH * 2) / viewportH;
                    
                    let nextX = camera.position.x - (deltaX * worldPerPixel);
                    let nextY = camera.position.y + (deltaY * worldPerPixel);
                    
                    const halfMapW = 1.0 * (earthMapPlane.scale?.x ?? 1);
                    const halfMapH = 0.5 * (earthMapPlane.scale?.y ?? 1);
                    const aspect = viewportW / viewportH;
                    const halfViewW = halfViewH * aspect;
                    
                    const maxPanX = Math.max(0, halfMapW - halfViewW);
                    const maxPanY = Math.max(0, halfMapH - halfViewH);
                    
                    nextX = Math.max(-maxPanX, Math.min(maxPanX, nextX));
                    nextY = Math.max(-maxPanY, Math.min(maxPanY, nextY));
                    
                    camera.position.x = nextX;
                    camera.position.y = nextY;
                    camera.lookAt(nextX, nextY, 0);
                }
            } else if (globe) {
                const rotationSpeed = 0.005;
                globe.rotation.y += deltaX * rotationSpeed;
                globe.rotation.x += deltaY * rotationSpeed;
                globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            }
            
            this.sceneModel.setPreviousMousePosition({
                x: touch.clientX,
                y: touch.clientY
            });
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchInteractionService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.TouchInteractionService = TouchInteractionService;
}
