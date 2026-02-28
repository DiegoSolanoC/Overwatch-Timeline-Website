/**
 * TransportView - Handles transport rendering (trains, planes, boats) and trails
 */
export class TransportView {
    constructor(sceneModel, transportModel) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
    }

    /**
     * Get train color based on journey progress
     * @param {number} progress - Journey progress (0-1)
     * @returns {number} - Color hex value
     */
    getTrainColor(progress) {
        // Red (0xcc0000) -> Green (0x00cc00) gradient
        const r = Math.floor(0xcc * (1 - progress));
        const g = Math.floor(0xcc * progress);
        const b = 0x00;
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Update train color based on journey progress
     * @param {Object} train - Train object
     */
    updateTrainColor(train) {
        const data = train.userData;
        if (!data || !data.curve) return;
        
        const progress = data.progress || 0;
        const color = this.getTrainColor(progress);
        
        // Update all wagons
        train.children.forEach(wagon => {
            if (wagon.material) {
                wagon.material.color.setHex(color);
            }
        });
    }

    /**
     * Create a trail segment for planes
     * @param {THREE.Vector3} position - Position
     * @param {THREE.Vector3} direction - Direction vector
     */
    createTrailSegment(position, direction) {
        const globe = this.sceneModel.getGlobe();
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
        const parent = (isMapView && earthMapPlane) ? earthMapPlane : globe;
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        
        // Calculate position behind the plane
        const trailOffset = 0.015;
        const backPosition = position.clone().add(direction.clone().multiplyScalar(trailOffset));
        
        const segmentGeometry = new THREE.SphereGeometry(0.004, 6, 6);
        const segmentMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
        segment.position.copy(backPosition);
        
        segment.userData = {
            age: 0,
            maxAge: 180 // 3 seconds at 60fps
        };
        
        segment.visible = hyperloopVisible;
        if (parent) parent.add(segment);
        this.transportModel.addPlaneTrail(segment);
    }

    /**
     * Update all plane trail segments
     */
    updateTrailSegments() {
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const planeTrails = this.transportModel.getPlaneTrails();

        for (let i = planeTrails.length - 1; i >= 0; i--) {
            const trail = planeTrails[i];
            trail.userData.age += 1;
            
            const fadeProgress = trail.userData.age / trail.userData.maxAge;
            trail.material.opacity = 0.8 * (1 - fadeProgress);
            
            if (trail.userData.age >= trail.userData.maxAge) {
                if (trail.parent) {
                    trail.parent.remove(trail);
                }
                this.transportModel.removePlaneTrail(trail);
            }
            
            trail.visible = hyperloopVisible;
        }
    }

    /**
     * Create a delta/triangle trail segment for boats
     * @param {THREE.Vector3} position - Position
     * @param {THREE.Vector3} forward - Forward direction
     * @param {THREE.Vector3} right - Right direction
     * @param {THREE.Vector3} up - Up direction
     */
    createBoatTrailSegment(position, forward, right, up) {
        const globe = this.sceneModel.getGlobe();
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
        const parent = (isMapView && earthMapPlane) ? earthMapPlane : globe;
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        
        const triangleSize = 0.006; // Triangle size (reverted to original)
        const triangleGeometry = new THREE.BufferGeometry();
        
        // Triangle vertices: point forward, two points behind forming a V
        const vertices = new Float32Array([
            // Front point (tip of delta)
            position.x + forward.x * triangleSize * 1.5,
            position.y + forward.y * triangleSize * 1.5,
            position.z + forward.z * triangleSize * 1.5,
            // Left back point
            position.x - forward.x * triangleSize * 0.5 + right.x * triangleSize,
            position.y - forward.y * triangleSize * 0.5 + right.y * triangleSize,
            position.z - forward.z * triangleSize * 0.5 + right.z * triangleSize,
            // Right back point
            position.x - forward.x * triangleSize * 0.5 - right.x * triangleSize,
            position.y - forward.y * triangleSize * 0.5 - right.y * triangleSize,
            position.z - forward.z * triangleSize * 0.5 - right.z * triangleSize
        ]);
        
        triangleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        triangleGeometry.setIndex([0, 1, 2]);
        
        const triangleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, // White color for boat trails
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
        
        triangle.userData = {
            age: 0,
            maxAge: 45 // Frames before fully faded (0.75 seconds at 60fps)
        };
        
        triangle.visible = hyperloopVisible;
        if (parent) parent.add(triangle);
        this.transportModel.addBoatTrail(triangle);
    }

    /**
     * Update all boat trail segments
     */
    updateBoatTrailSegments() {
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const boatTrails = this.transportModel.getBoatTrails();

        for (let i = boatTrails.length - 1; i >= 0; i--) {
            const trail = boatTrails[i];
            trail.userData.age += 1;
            
            // Fade out over time (faster fade, especially for longer trails)
            const fadeProgress = trail.userData.age / trail.userData.maxAge;
            // Use exponential fade for faster disappearance
            const fadeFactor = Math.pow(fadeProgress, 1.5);
            trail.material.opacity = 0.6 * (1 - fadeFactor);
            
            // Remove when fully faded
            if (trail.userData.age >= trail.userData.maxAge) {
                if (trail.parent) {
                    trail.parent.remove(trail);
                }
                this.transportModel.removeBoatTrail(trail);
            }
            
            // Hide if transport toggle is off
            trail.visible = hyperloopVisible;
        }
    }

    /**
     * Update visibility of all transport elements
     */
    updateHyperloopVisibility() {
        const scene = this.sceneModel.getScene();
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const markers = this.sceneModel.getMarkers();
        const trains = this.transportModel.getTrains();
        const planes = this.transportModel.getPlanes();
        const boats = this.transportModel.getBoats();
        const boatTrails = this.transportModel.getBoatTrails();

        // Toggle markers visibility (but keep main event markers always visible)
        // Variant markers (pink) should maintain their current visibility state
        markers.forEach(marker => {
            if (marker.userData && marker.userData.isEventMarker) {
                // Only main variant markers should always be visible
                // Variant markers (isMainVariant === false) should keep their current state
                // (they're only visible when their event is open)
                if (marker.userData.isMainVariant !== false) {
                    marker.visible = true;
                }
                // If it's a variant marker (isMainVariant === false), don't change its visibility
                // Let VariantMarkerManager control it
            } else {
                marker.visible = hyperloopVisible;
            }
        });
        
        // Toggle connection lines and marker pins visibility
        scene.traverse((object) => {
            if (object.userData) {
                // Seaport connection lines, markers, and pins always hidden
                if (object.userData.isSeaportConnectionLine || object.userData.isSeaportMarker || object.userData.isSeaportMarkerPin) {
                    object.visible = false;
                } else if (object.userData.isEventMarkerPin) {
                    // Event marker pins should always be visible
                    object.visible = true;
                } else if (object.userData.isConnectionLine || object.userData.isSecondaryLine || object.userData.isMarkerPin) {
                    object.visible = hyperloopVisible;
                }
            }
        });
        
        // Toggle train visibility
        trains.forEach(train => {
            if (hyperloopVisible) {
                const data = train.userData;
                if (data && data.progress > 0 && data.progress <= 1 && !data.isWaiting) {
                    train.visible = true;
                }
            } else {
                train.visible = false;
            }
        });
        
        // Toggle plane visibility
        planes.forEach(plane => {
            if (hyperloopVisible) {
                const data = plane.userData;
                if (data && data.progress > 0 && data.progress <= 1) {
                    plane.visible = true;
                }
            } else {
                plane.visible = false;
            }
        });
        
        // Toggle boat visibility
        boats.forEach(boat => {
            if (hyperloopVisible) {
                const data = boat.userData;
                if (data && data.progress > 0 && data.progress <= 1 && !data.isWaiting) {
                    boat.visible = true;
                }
            } else {
                boat.visible = false;
            }
        });
        
        // Toggle boat trail visibility
        boatTrails.forEach(trail => {
            trail.visible = hyperloopVisible;
        });
    }

    /**
     * Create a small dot trail for satellites, offset to the sides randomly
     * @param {THREE.Vector3} position - Position
     */
    createSatelliteTrailDot(position) {
        const globe = this.sceneModel.getGlobe();
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
        const hyperloopVisible = this.sceneModel.getHyperloopVisible();
        const planeWidth = 2.0;
        const halfW = planeWidth / 2;
        const wrapX = (x) => ((x + halfW) % planeWidth + planeWidth) % planeWidth - halfW;
        
        // Calculate random offset to the sides
        // Get a random perpendicular direction
        const randomAngle = Math.random() * Math.PI * 2;
        const offsetDistance = 0.01 + Math.random() * 0.015; // 0.01 to 0.025 offset
        
        // Create a random perpendicular vector
        const offsetX = Math.cos(randomAngle) * offsetDistance;
        const offsetY = Math.sin(randomAngle) * offsetDistance;
        const offsetZ = (Math.random() - 0.5) * offsetDistance * 0.5; // Slight Z offset too
        
        const dotGeometry = new THREE.SphereGeometry(0.002, 6, 6); // Small dot
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        
        // Position with random side offset
        const px = isMapView ? wrapX(position.x + offsetX) : (position.x + offsetX);
        dot.position.set(px, position.y + offsetY, position.z + offsetZ);
        
        dot.userData = {
            age: 0,
            maxAge: 180 // 3 seconds at 60fps
        };
        
        dot.visible = hyperloopVisible;
        const parent = (isMapView && earthMapPlane) ? earthMapPlane : globe;
        if (parent) parent.add(dot);
        this.transportModel.addPlaneTrail(dot); // Use plane trail system
    }
}


