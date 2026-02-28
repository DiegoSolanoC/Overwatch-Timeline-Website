/**
 * StationFollowService - Handles station marker following logic
 */

class StationFollowService {
    constructor(sceneModel, uiView) {
        this.sceneModel = sceneModel;
        this.uiView = uiView;
        this.followingStationMarker = null;
        this.followStationAnimationId = null;
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
            const renderer = this.sceneModel.getRenderer();
            const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
            const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
            if (!camera || !marker) {
                this.stopFollowingStation();
                return;
            }
            
            // Get world position of marker (station moves, so this updates continuously)
            const markerWorldPosition = new THREE.Vector3();
            marker.getWorldPosition(markerWorldPosition);

            if (isMapView && renderer && earthMapPlane) {
                // Map view: pan camera to station without tilting, clamp within map borders.
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

                const targetX = Math.max(-maxPanX, Math.min(maxPanX, markerWorldPosition.x));
                const targetY = Math.max(-maxPanY, Math.min(maxPanY, markerWorldPosition.y));

                camera.position.x += (targetX - camera.position.x) * 0.1;
                camera.position.y += (targetY - camera.position.y) * 0.1;
                camera.lookAt(camera.position.x, camera.position.y, 0);
            } else {
                // Globe view: follow by moving camera along radial direction toward marker.
                const targetDistance = 2.5;
                const direction = markerWorldPosition.clone().normalize();
                const targetPosition = direction.multiplyScalar(targetDistance);
                
                camera.position.lerp(targetPosition, 0.1);
                
                const currentMarkerWorldPos = new THREE.Vector3();
                marker.getWorldPosition(currentMarkerWorldPos);
                
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
            }
            
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
        const isMapView = this.sceneModel.getMapViewEnabled ? this.sceneModel.getMapViewEnabled() : !!this.sceneModel.isMapView;
        const globe = this.sceneModel.getGlobe();
        if (!globe && !isMapView) return;
        
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
                    
                    // In globe view: extend marker outward from Earth center.
                    // In map view: extend marker upward (+Z) from satellite.
                    let localNormal;
                    if (isMapView) {
                        localNormal = new THREE.Vector3(0, 0, 1);
                    } else {
                        const normal = satelliteWorldPos.clone().normalize();
                        localNormal = normal.clone();
                        const satelliteQuaternionInverse = issSatellite.quaternion.clone().invert();
                        localNormal.applyQuaternion(satelliteQuaternionInverse);
                        localNormal.normalize();
                    }
                    
                    // Pin line length - increased to push marker further out from model
                    // Pin line length - push marker out from model.
                    // In map view, keep this subtle (match unwrapped-map pin feel).
                    const pinLength = isMapView ? 0.03 : 0.06;
                    
                    // Update marker position to be at the end of the pin line
                    const newMarkerPosition = localNormal.multiplyScalar(pinLength);
                    marker.position.copy(newMarkerPosition);
                    
                    // Update pin line if it exists
                    if (marker.userData.pinLine) {
                        const pinLine = marker.userData.pinLine;
                        const startPoint = new THREE.Vector3(0, 0, 0); // Start at satellite center
                        const endPoint = newMarkerPosition; // End at marker position
                        
                        // Update geometry
                        pinLine.geometry.setFromPoints([startPoint, endPoint]);
                    }
                }
            }
        });
    }

    /**
     * Get currently following marker
     */
    getFollowingMarker() {
        return this.followingStationMarker;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StationFollowService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.StationFollowService = StationFollowService;
}
