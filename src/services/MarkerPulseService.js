/**
 * MarkerPulseService - Handles marker pulse animation effects
 */

class MarkerPulseService {
    constructor(sceneModel) {
        this.sceneModel = sceneModel;
        this.hoveredEventMarker = null;
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
        const scene = this.sceneModel.getScene();
        if (scene && marker.userData.pulseRings) {
            marker.userData.pulseRings.forEach(ring => {
                if (ring && ring.parent) {
                    ring.parent.remove(ring);
                }
            });
            marker.userData.pulseRings = [];
        }
    }

    /**
     * Create a pulse ring for event marker
     */
    createPulseRing(marker) {
        const globe = this.sceneModel.getGlobe();
        if (!globe) return;
        
        // Determine parent (globe, moonPlane, or marsPlane)
        const locationType = marker.userData ? marker.userData.locationType : 'earth';
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        // Get ISS satellite for station events
        const issSatellite = window.globeController && window.globeController.transportController 
            ? window.globeController.transportController.findISS() 
            : null;
        
        let ringParent = globe; // Default to globe
        if (locationType === 'moon' && moonPlane && marker.parent === moonPlane) {
            ringParent = moonPlane;
        } else if (locationType === 'mars' && marsPlane && marker.parent === marsPlane) {
            ringParent = marsPlane;
        } else if (locationType === 'station' && issSatellite && marker.parent === issSatellite) {
            ringParent = issSatellite;
        }
        
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
        
        ringParent.add(ring);
        marker.userData.pulseRings.push(ring);
        
        // Play radiate sound effect when pulse ring is created
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('radiate');
        }
    }

    /**
     * Update ring position and orientation to be flat on globe surface or plane
     */
    updateRingPositionAndOrientation(ring, marker) {
        // Copy marker position (local to parent)
        ring.position.copy(marker.position);
        
        // Check if marker is on Moon/Mars plane or Earth globe
        const locationType = marker.userData ? marker.userData.locationType : 'earth';
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        // Get ISS satellite for station events
        const issSatellite = window.globeController && window.globeController.transportController 
            ? window.globeController.transportController.findISS() 
            : null;
        
        if (locationType === 'moon' && moonPlane && marker.parent === moonPlane) {
            // Moon plane: ring should be flat on the plane (same orientation as plane)
            ring.quaternion.copy(moonPlane.quaternion);
            // Rotate 90 degrees around Z to make ring horizontal (CircleGeometry faces +Z by default)
            ring.rotateZ(Math.PI / 2);
        } else if (locationType === 'mars' && marsPlane && marker.parent === marsPlane) {
            // Mars plane: ring should be flat on the plane (same orientation as plane)
            ring.quaternion.copy(marsPlane.quaternion);
            // Rotate 90 degrees around Z to make ring horizontal
            ring.rotateZ(Math.PI / 2);
        } else if (locationType === 'station' && issSatellite && marker.parent === issSatellite) {
            // Station: ring should match Earth's curvature (like earth events)
            // Calculate normal from globe center to marker's world position
            const globe = this.sceneModel.getGlobe();
            if (globe) {
                // Get marker's world position
                const markerWorldPos = new THREE.Vector3();
                marker.getWorldPosition(markerWorldPos);
                
                // Globe is at origin (0, 0, 0) in world space
                // Calculate normal (direction from globe center to marker)
                const normal = markerWorldPos.clone().normalize();
                
                // Convert normal to satellite's local space (where the ring is)
                const localNormal = normal.clone();
                const satelliteQuaternionInverse = issSatellite.quaternion.clone().invert();
                localNormal.applyQuaternion(satelliteQuaternionInverse);
                localNormal.normalize();
                
                // Create coordinate system with normal as Z-axis (pointing outward from globe)
                const up = new THREE.Vector3(0, 1, 0);
                let tangent = new THREE.Vector3();
                
                // If normal is parallel to up, use a different reference
                if (Math.abs(localNormal.dot(up)) > 0.9) {
                    const right = new THREE.Vector3(1, 0, 0);
                    tangent.crossVectors(localNormal, right).normalize();
                } else {
                    tangent.crossVectors(localNormal, up).normalize();
                }
                
                const bitangent = new THREE.Vector3().crossVectors(localNormal, tangent).normalize();
                
                // Create rotation matrix
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeBasis(tangent, bitangent, localNormal);
                ring.quaternion.setFromRotationMatrix(rotationMatrix);
                
                // Rotate 90 degrees around Z to make ring horizontal
                ring.rotateZ(Math.PI / 2);
            } else {
                // Fallback: use satellite orientation
                ring.quaternion.copy(issSatellite.quaternion);
                ring.rotateZ(Math.PI / 2);
            }
        } else {
            // Earth globe: calculate normal (direction from globe center to marker)
            const normal = marker.position.clone().normalize();
            
            // Create a coordinate system with normal as Z-axis (pointing outward from globe)
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
            const matrix = new THREE.Matrix4();
            matrix.makeBasis(tangent, bitangent, normal);
            ring.setRotationFromMatrix(matrix);
            
            // Rotate 90 degrees around Z to make ring horizontal
            ring.rotateZ(Math.PI / 2);
        }
    }

    /**
     * Update all pulse rings (animation and cleanup)
     * Iterates through all markers with pulse rings, not just hovered one
     */
    updatePulseRings() {
        if (!this.sceneModel) return;
        
        const globe = this.sceneModel.getGlobe();
        if (!globe) return;
        
        const markers = this.sceneModel.getMarkers();
        if (!markers || markers.length === 0) return;
        
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
                        if (ring.parent) {
                            ring.parent.remove(ring);
                        }
                        pulseRings.splice(i, 1);
                    } else {
                        // Animate ring - for Moon/Mars/Station, scale only in X and Y (flat), keep Z at 1
                        const locationType = marker.userData ? marker.userData.locationType : 'earth';
                        const scale = ring.userData.startScale + (ring.userData.maxScale - ring.userData.startScale) * progress;
                        if (locationType === 'moon' || locationType === 'mars' || locationType === 'station') {
                            // Flat scaling for planes and station (only X and Y, Z stays at 1)
                            ring.scale.set(scale, scale, 1);
                        } else {
                            // 3D scaling for globe
                            ring.scale.set(scale, scale, scale);
                        }
                        
                        // Fade from inside out - more transparent at edges (higher progress)
                        if (ring.material) {
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
     * Update marker pulse animation (dilation effect) - happens all the time for all event markers
     */
    updateMarkerPulse() {
        if (!this.sceneModel) return;
        
        const markers = this.sceneModel.getMarkers();
        const currentTime = Date.now();
        
        markers.forEach(marker => {
            if (marker && marker.userData && marker.userData.isEventMarker) {
                // Don't pulse non-interactive markers (variant markers) or locked events
                if (marker.userData.isInteractive === false || marker.userData.isLocked) {
                    return;
                }
                
                // Skip pulse animation if marker is currently being animated (page transition)
                if (marker.userData.isAnimating) {
                    return;
                }
                
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
                
                // For Moon/Mars/Station markers on flat planes or moving objects, scale only in X and Y (flat), keep Z at 1
                const locationType = marker.userData ? marker.userData.locationType : 'earth';
                if (locationType === 'moon' || locationType === 'mars' || locationType === 'station') {
                    marker.scale.set(scale, scale, 1);
                } else {
                    marker.scale.set(scale, scale, scale);
                }
            }
        });
        
        // Also update pulse rings
        this.updatePulseRings();
    }

    /**
     * Set currently hovered marker
     */
    setHoveredMarker(marker) {
        this.hoveredEventMarker = marker;
    }

    /**
     * Get currently hovered marker
     */
    getHoveredMarker() {
        return this.hoveredEventMarker;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkerPulseService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MarkerPulseService = MarkerPulseService;
}
