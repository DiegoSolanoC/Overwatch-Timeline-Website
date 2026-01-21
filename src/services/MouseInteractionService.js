/**
 * MouseInteractionService - Handles mouse event interactions
 */

class MouseInteractionService {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
    }

    /**
     * Handle mouse down
     * @param {MouseEvent} event - Mouse event
     */
    onMouseDown(event) {
        this.sceneModel.setDragging(true);
        this.sceneModel.setAutoRotate(false);
        
        // Clear any pending auto-rotate timeout
        if (this.sceneModel.autoRotateTimeout) {
            clearTimeout(this.sceneModel.autoRotateTimeout);
            this.sceneModel.autoRotateTimeout = null;
        }
        
        this.sceneModel.setPreviousMousePosition({
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
     * @param {Function} onMarkerHover - Callback for marker hover detection
     */
    onMouseMove(event, onMarkerHover) {
        // Check for hover on event markers (even when not dragging)
        if (onMarkerHover) {
            onMarkerHover(event);
        }
        
        if (!this.sceneModel.isDraggingState()) return;
        
        window.mouseMoved = true;
        
        // If viewing an event and user manually rotates, reset auto-rotate
        if (this.sceneModel.eventMarker) {
            this.sceneModel.setAutoRotate(false);
            // Clear existing timeout
            if (this.sceneModel.autoRotateTimeout) {
                clearTimeout(this.sceneModel.autoRotateTimeout);
                this.sceneModel.autoRotateTimeout = null;
            }
        }
        
        const deltaX = event.clientX - this.sceneModel.getPreviousMousePosition().x;
        const deltaY = event.clientY - this.sceneModel.getPreviousMousePosition().y;
        
        const globe = this.sceneModel.getGlobe();
        
        if (globe) {
            const rotationSpeed = 0.005;
            const velocityX = deltaY * rotationSpeed;
            const velocityY = deltaX * rotationSpeed;
            
            globe.rotation.y += velocityY;
            globe.rotation.x += velocityX;
            
            // Limit vertical rotation
            globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            
            // Update rotation velocity for momentum
            this.sceneModel.setRotationVelocity({
                x: velocityX,
                y: velocityY
            });
        }
        
        this.sceneModel.setPreviousMousePosition({
            x: event.clientX,
            y: event.clientY
        });
    }

    /**
     * Handle mouse up
     */
    onMouseUp() {
        this.sceneModel.setDragging(false);
        
        // Clear initial touch position
        this.sceneModel.initialTouchPosition = null;
        
        // Set timeout to resume auto-rotation after inactivity
        if (this.sceneModel.getAutoRotateEnabled() && this.sceneModel.autoRotateTimeout) {
            clearTimeout(this.sceneModel.autoRotateTimeout);
        }
        
        if (this.sceneModel.getAutoRotateEnabled()) {
            // If viewing an event, recenter to it after delay
            if (this.sceneModel.eventMarker) {
                this.sceneModel.autoRotateTimeout = setTimeout(() => {
                    this.sceneModel.setAutoRotate(true);
                    this.sceneModel.setRotationVelocity({ x: 0, y: 0 });
                }, 2000); // 2 seconds delay after dragging stops
            } else {
                // Normal auto-rotate
                this.sceneModel.autoRotateTimeout = setTimeout(() => {
                    this.sceneModel.setAutoRotate(true);
                    this.sceneModel.setRotationVelocity({ x: 0, y: 0 });
                }, 5000); // 5 second delay
            }
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MouseInteractionService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MouseInteractionService = MouseInteractionService;
}
