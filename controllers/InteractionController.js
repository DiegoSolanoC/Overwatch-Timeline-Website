/**
 * InteractionController - Handles mouse/touch controls and marker interactions
 */
export class InteractionController {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
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
        if (!sceneModel.isDraggingState()) return;
        
        window.mouseMoved = true;
        
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
     * Handle mouse up
     */
    onMouseUp() {
        const sceneModel = this.sceneModel;
        sceneModel.setDragging(false);
        
        // Set timeout to resume auto-rotation after 5 seconds of inactivity
        if (sceneModel.getAutoRotateEnabled() && sceneModel.autoRotateTimeout) {
            clearTimeout(sceneModel.autoRotateTimeout);
        }
        
        if (sceneModel.getAutoRotateEnabled()) {
            sceneModel.autoRotateTimeout = setTimeout(() => {
                sceneModel.setAutoRotate(true);
                sceneModel.setRotationVelocity({ x: 0, y: 0 });
            }, 5000); // 5 second delay
        }
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
                if (child.userData && child.userData.isSeaportMarker) {
                    clickableObjects.push(child);
                }
            });
        }
        
        const intersects = raycaster.intersectObjects(clickableObjects);
        
        if (intersects.length > 0) {
            const clickedMarker = intersects[0].object;
            const activeMarker = sceneModel.getActiveMarker();
            
            // Marker clicking disabled - labels no longer shown
            // if (clickedMarker.userData.isMarker) {
            //     if (activeMarker === clickedMarker && sceneModel.getLabelElement()) {
            //         this.uiView.hideCityLabel();
            //     } else {
            //         sceneModel.setActiveMarker(clickedMarker);
            //         this.uiView.showCityLabel(clickedMarker.userData.city, event.clientX, event.clientY);
            //     }
            // } else if (clickedMarker.userData.isSeaportMarker) {
            //     const portName = clickedMarker.userData.seaport;
            //     if (activeMarker === clickedMarker && sceneModel.getLabelElement()) {
            //         this.uiView.hideCityLabel();
            //     } else {
            //         sceneModel.setActiveMarker(clickedMarker);
            //         this.uiView.showCityLabel(portName, event.clientX, event.clientY);
            //     }
            // }
        } else {
            // Clicked elsewhere - hide label
            this.uiView.hideCityLabel();
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

