/**
 * EventMarkerManager - Handles event marker creation, removal, filtering, and locking
 * Extracted from GlobeView.js to improve maintainability
 */

import { latLonToVector3, xyToPlanePosition } from '../utils/GeometryUtils.js';
import { calculateMarkerPosition } from './helpers/MarkerPositionHelpers.js';
import { createMarkerMesh, createMarkerUserData, shouldEventBeLocked, getMarkerRadius, getMarkerColor } from './helpers/MarkerCreationHelpers.js';
import { createPinLinePoints, createPinLine } from './helpers/PinLineHelpers.js';

/**
 * EventMarkerManager class
 * Manages all event markers on the globe, moon, mars, and station
 */
export class EventMarkerManager {
    constructor(sceneModel, dataModel) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
    }

    /**
     * Add event markers to the globe, moon, mars, and station
     * @param {boolean} animate - Whether to animate the markers growing in
     * @returns {Promise} - Resolves when markers are added (and animation completes if animate=true)
     */
    addEventMarkers(animate = false) {
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const events = this.dataModel.getEventsForCurrentPage(); // Use paginated events

        // Collect all markers and pin lines for animation
        const newMarkers = [];
        const newPinLines = [];

        // Get ISS satellite for station events
        const issSatellite = window.globeController && window.globeController.transportController 
            ? window.globeController.transportController.findISS() 
            : null;
        
        events.forEach(event => {
            const isMultiEvent = event.variants && event.variants.length > 0;
            const eventLocationType = event.locationType || 'earth';
            
            if (isMultiEvent) {
                // Multi-event: create markers for each variant
                event.variants.forEach((variant, variantIndex) => {
                    // Get location type from variant if available, otherwise use event location type
                    const variantLocationType = variant.locationType || eventLocationType;
                    
                    // Calculate position using helper
                    const lat = variant.lat !== undefined ? variant.lat : event.lat;
                    const lon = variant.lon !== undefined ? variant.lon : event.lon;
                    const x = variant.x !== undefined ? variant.x : (event.x !== undefined ? event.x : undefined);
                    const y = variant.y !== undefined ? variant.y : (event.y !== undefined ? event.y : undefined);
                    
                    const positionData = calculateMarkerPosition({
                        locationType: variantLocationType,
                        lat, lon, x, y,
                        globe, moonPlane, marsPlane, issSatellite
                    });
                    
                    if (!positionData) {
                        return; // Helper already logged warning
                    }
                    
                    const { position, targetParent } = positionData;
                    
                    const isMainVariant = variantIndex === 0;
                    
                    // Get marker properties using helpers
                    const markerRadius = getMarkerRadius(isMainVariant);
                    const markerColor = getMarkerColor(isMainVariant);
                    const isInteractive = isMainVariant;
                    
                    // Create marker using helper
                    const marker = createMarkerMesh({ radius: markerRadius, color: markerColor, position });
                    
                    const displayName = variant.name || `Variant ${variantIndex + 1}`;
                    
                    // Check if this event should be locked using helper
                    const activeFilters = this.sceneModel.activeFilters;
                    const shouldBeLocked = shouldEventBeLocked(event, activeFilters);
                    
                    // Set initial scale based on animation and locked state
                    if (animate) {
                        marker.scale.set(0, 0, 0);
                    } else if (shouldBeLocked) {
                        // If locked and not animating, start at locked scale
                        marker.scale.set(0.75, 0.75, 0.75);
                        // Set locked color immediately
                        marker.material.color.setHex(0x331100);
                    }
                    
                    // Create userData using helper
                    marker.userData = createMarkerUserData({
                        event,
                        variant,
                        variantIndex,
                        displayName,
                        locationType: variantLocationType,
                        lat: variantLocationType === 'earth' ? lat : undefined,
                        lon: variantLocationType === 'earth' ? lon : undefined,
                        x: variantLocationType !== 'earth' ? x : undefined,
                        y: variantLocationType !== 'earth' ? y : undefined,
                        isInteractive,
                        isMainVariant,
                        shouldBeLocked,
                        originalColor: markerColor
                    });
                    
                    // Hide variant markers by default (only show when event is open)
                    if (!isMainVariant) {
                        marker.visible = false;
                    }
                    
                    targetParent.add(marker);
                    const markers = this.sceneModel.getMarkers();
                    markers.push(marker);

                    // Collect marker for animation (only main variants that are visible)
                    if (isMainVariant && marker.visible) {
                        newMarkers.push(marker);
                    }

                    // Add pin line for main variants using helper
                    if (isMainVariant) {
                        const pinLineData = createPinLinePoints({
                            locationType: variantLocationType,
                            markerPosition: position,
                            lat: variantLocationType === 'earth' ? lat : undefined,
                            lon: variantLocationType === 'earth' ? lon : undefined,
                            globe, moonPlane, marsPlane, issSatellite
                        });
                        
                        if (pinLineData) {
                            const lineColor = shouldBeLocked ? 0x331100 : markerColor;
                            const line = createPinLine({
                                linePoints: pinLineData.linePoints,
                                color: lineColor,
                                animate,
                                marker
                            });
                            
                            pinLineData.lineParent.add(line);
                            newPinLines.push(line);
                        }
                    }
                });
            } else {
                // Single event: create one orange marker
                // Calculate position using helper
                const positionData = calculateMarkerPosition({
                    locationType: eventLocationType,
                    lat: event.lat,
                    lon: event.lon,
                    x: event.x,
                    y: event.y,
                    globe, moonPlane, marsPlane, issSatellite
                });
                
                if (!positionData) {
                    return; // Helper already logged warning
                }
                
                const { position, targetParent } = positionData;
                
                // Get marker properties using helpers
                const markerRadius = getMarkerRadius(true); // Single events are always main variant
                const markerColor = getMarkerColor(true); // Orange
                
                // Create marker using helper
                const marker = createMarkerMesh({ radius: markerRadius, color: markerColor, position });
                
                const displayName = event.name || 'Event';
                
                // Check if this event should be locked using helper
                const activeFilters = this.sceneModel.activeFilters;
                const shouldBeLocked = shouldEventBeLocked(event, activeFilters);
                
                // Set initial scale based on animation and locked state
                if (animate) {
                    marker.scale.set(0, 0, 0);
                } else if (shouldBeLocked) {
                    // If locked and not animating, start at locked scale
                    marker.scale.set(0.75, 0.75, 0.75);
                    // Set locked color immediately
                    marker.material.color.setHex(0x331100);
                }
                
                marker.userData = { 
                    event: event, // Store full event object
                    eventName: displayName,
                    locationType: eventLocationType,
                    lat: eventLocationType === 'earth' ? event.lat : undefined,
                    lon: eventLocationType === 'earth' ? event.lon : undefined,
                    x: eventLocationType !== 'earth' ? (event.x !== undefined ? event.x : undefined) : undefined,
                    y: eventLocationType !== 'earth' ? (event.y !== undefined ? event.y : undefined) : undefined,
                    isEventMarker: true,
                    isInteractive: true, // Single events are always interactive
                    isMainVariant: true,
                    pulseRings: [], // Store pulse rings for this marker
                    isLocked: shouldBeLocked, // Set initial locked state based on filters
                    originalScale: 1.0, // Store original scale for unlocking
                    originalColor: 0xff6600 // Store original color (orange) for restoration
                };
                
                targetParent.add(marker);
                const markers = this.sceneModel.getMarkers();
                markers.push(marker);

                // Collect marker for animation
                newMarkers.push(marker);

                // Add pin line using helper
                const pinLineData = createPinLinePoints({
                    locationType: eventLocationType,
                    markerPosition: position,
                    lat: eventLocationType === 'earth' ? event.lat : undefined,
                    lon: eventLocationType === 'earth' ? event.lon : undefined,
                    globe, moonPlane, marsPlane, issSatellite
                });
                
                if (pinLineData) {
                    const lineColor = shouldBeLocked ? 0x331100 : 0xff6600;
                    const line = createPinLine({
                        linePoints: pinLineData.linePoints,
                        color: lineColor,
                        animate,
                        marker
                    });
                    
                    pinLineData.lineParent.add(line);
                    newPinLines.push(line);
                }
            }
        });
        
        // Animate markers and pin lines growing if requested
        if (animate && (newMarkers.length > 0 || newPinLines.length > 0)) {
            return new Promise((resolve) => {
                const duration = 300; // 300ms animation
                const startTime = performance.now();
                
                // Mark markers as animating to prevent pulse animation interference
                newMarkers.forEach(marker => {
                    if (marker.userData) {
                        marker.userData.isAnimating = true;
                    }
                    marker.scale.set(0, 0, 0);
                });
                
                // Ensure all pin lines start at opacity 0
                newPinLines.forEach(line => {
                    if (line.material) {
                        line.material.transparent = true;
                        line.material.opacity = 0;
                    }
                });
                
                const animateGrow = () => {
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Easing function (ease out)
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    
                    // Brightness flash - bell curve that peaks in the middle
                    const glowProgress = Math.sin(progress * Math.PI);
                    
                    // Animate markers growing from 0 to target scale (1.0 if unlocked, 0.75 if locked)
                    newMarkers.forEach(marker => {
                        const targetScale = (marker.userData && marker.userData.isLocked) ? 0.75 : 1.0;
                        const currentScale = easeProgress * targetScale;
                        marker.scale.set(currentScale, currentScale, currentScale);
                        
                        // Animate color: if locked, animate to dark color; otherwise flash yellow
                        if (marker.material && marker.userData) {
                            if (marker.userData.isLocked) {
                                // Locked: animate to dark color
                                const startColor = new THREE.Color(0xff6600); // Orange
                                const targetColor = new THREE.Color(0x331100); // Dark
                                marker.material.color.lerpColors(startColor, targetColor, easeProgress);
                                marker.material.needsUpdate = true;
                                
                                // Also animate pin line color if it exists
                                if (marker.userData.pinLine && marker.userData.pinLine.material) {
                                    marker.userData.pinLine.material.color.lerpColors(startColor, targetColor, easeProgress);
                                }
                            } else {
                                // Unlocked: flash yellow during animation
                                const baseColor = new THREE.Color(0xff6600); // Orange
                                const flashColor = new THREE.Color(0xffff00); // Yellow
                                marker.material.color.lerpColors(baseColor, flashColor, glowProgress);
                                marker.material.needsUpdate = true;
                            }
                        }
                    });
                    
                    // Animate pin lines fading in
                    newPinLines.forEach(line => {
                        if (line.material) {
                            line.material.opacity = easeProgress;
                        }
                    });
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateGrow);
                    } else {
                        // Ensure final scale is correct (1.0 if unlocked, 0.75 if locked)
                        newMarkers.forEach(marker => {
                            const targetScale = (marker.userData && marker.userData.isLocked) ? 0.75 : 1.0;
                            marker.scale.set(targetScale, targetScale, targetScale);
                            
                            // Set final color
                            if (marker.material && marker.userData) {
                                if (marker.userData.isLocked) {
                                    // Locked: dark color
                                    marker.material.color.setHex(0x331100);
                                } else {
                                    // Unlocked: back to orange
                                    marker.material.color.setHex(0xff6600);
                                }
                                marker.material.needsUpdate = true;
                            }
                            
                            // Clear animation flag to allow pulse animation to resume
                            if (marker.userData) {
                                marker.userData.isAnimating = false;
                            }
                        });
                        
                        // Set pin line colors for locked markers
                        newPinLines.forEach(line => {
                            if (line.material) {
                                line.material.opacity = 1;
                                // If linked marker is locked, set line to dark color
                                if (line.userData && line.userData.marker && line.userData.marker.userData && line.userData.marker.userData.isLocked) {
                                    line.material.color.setHex(0x331100);
                                }
                            }
                        });
                        resolve();
                    }
                };
                
                // Start animation immediately (markers are already added to scene)
                requestAnimationFrame(animateGrow);
            });
        } else {
            // If not animating, ensure markers are at full scale
            newMarkers.forEach(marker => {
                marker.scale.set(1, 1, 1);
            });
            newPinLines.forEach(line => {
                if (line.material) {
                    line.material.opacity = 1;
                    line.material.transparent = false;
                }
            });
            return Promise.resolve();
        }
    }

    /**
     * Remove all event markers and their pin lines
     * @param {boolean} animate - Whether to animate the removal (shrink to 0)
     * @returns {Promise} - Resolves when removal (and animation) is complete
     */
    removeEventMarkers(animate = false) {
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const markers = this.sceneModel.getMarkers();
        
        // Check if globe exists before trying to traverse
        if (!globe) {
            console.warn('EventMarkerManager: Cannot remove event markers - globe not initialized yet');
            return Promise.resolve();
        }
        
        // Collect event markers and their pin lines
        const eventMarkers = [];
        const pinLines = [];
        
        globe.traverse((child) => {
            if (child.userData && child.userData.isEventMarker) {
                eventMarkers.push(child);
            }
            if (child.userData && child.userData.isEventMarkerPin) {
                pinLines.push(child);
            }
        });
        
        // Remove event markers from Moon plane
        if (moonPlane) {
            moonPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // Remove event markers from Mars plane
        if (marsPlane) {
            marsPlane.traverse((child) => {
                if (child.userData && child.userData.isEventMarker) {
                    eventMarkers.push(child);
                }
            });
        }
        
        // If no markers to remove, return immediately
        if (eventMarkers.length === 0 && pinLines.length === 0) {
            return Promise.resolve();
        }
        
        // If animating, shrink markers before removing
        if (animate && eventMarkers.length > 0) {
            return new Promise((resolve) => {
                const duration = 300; // 300ms animation
                const startTime = performance.now();
                
                // Mark markers as animating to prevent pulse animation interference
                eventMarkers.forEach(marker => {
                    if (marker.userData) {
                        marker.userData.isAnimating = true;
                    }
                });
                
                // Store initial scales
                const initialScales = eventMarkers.map(marker => marker.scale.x);
                
                const animateShrink = () => {
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Easing function (ease in)
                    const easeProgress = progress * progress;
                    
                    // Brightness flash - bell curve that peaks in the middle
                    const peakIntensity = 2.0; // Yellow glow peak
                    const glowProgress = Math.sin(progress * Math.PI);
                    const currentIntensity = peakIntensity * glowProgress;
                    
                    // Animate scale from current to 0
                    eventMarkers.forEach((marker, index) => {
                        const scale = initialScales[index] * (1 - easeProgress);
                        marker.scale.set(scale, scale, scale);
                        
                        // Animate emissive intensity (yellow flash)
                        if (marker.material && marker.material.emissiveIntensity !== undefined) {
                            marker.material.emissiveIntensity = currentIntensity;
                            marker.material.needsUpdate = true;
                        }
                    });
                    
                    // Also shrink pin lines (opacity fade)
                    pinLines.forEach(line => {
                        if (line.material) {
                            line.material.opacity = 1 - easeProgress;
                            line.material.transparent = true;
                        }
                    });
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateShrink);
                    } else {
                        // Animation complete, now remove everything
                        eventMarkers.forEach(marker => {
                            // Remove from markers array
                            const index = markers.indexOf(marker);
                            if (index > -1) {
                                markers.splice(index, 1);
                            }
                            
                            // Remove pin line if it exists
                            if (marker.userData && marker.userData.pinLine) {
                                const pinLine = marker.userData.pinLine;
                                if (pinLine.parent) {
                                    pinLine.parent.remove(pinLine);
                                }
                            }
                            
                            // Remove marker from scene
                            if (marker.parent) {
                                marker.parent.remove(marker);
                            }
                        });
                        
                        // Remove any remaining pin lines
                        pinLines.forEach(line => {
                            if (line.parent) {
                                line.parent.remove(line);
                            }
                        });
                        
                        resolve();
                    }
                };
                
                requestAnimationFrame(animateShrink);
            });
        } else {
            // Remove immediately without animation
            eventMarkers.forEach(marker => {
                // Remove from markers array
                const index = markers.indexOf(marker);
                if (index > -1) {
                    markers.splice(index, 1);
                }
                
                // Remove pin line if it exists
                if (marker.userData && marker.userData.pinLine) {
                    const pinLine = marker.userData.pinLine;
                    if (pinLine.parent) {
                        pinLine.parent.remove(pinLine);
                    }
                }
                
                // Remove marker from scene
                if (marker.parent) {
                    marker.parent.remove(marker);
                }
            });
            
            // Remove any remaining pin lines
            pinLines.forEach(line => {
                if (line.parent) {
                    line.parent.remove(line);
                }
            });
            
            return Promise.resolve();
        }
    }

    /**
     * Refresh event markers (remove and re-add with animation)
     */
    refreshEventMarkers() {
        // Check if globe is initialized before proceeding
        const globe = this.sceneModel.getGlobe();
        if (!globe) {
            console.warn('EventMarkerManager: Cannot refresh event markers - globe not initialized yet');
            return;
        }
        
        // Animate removal, then add new markers with animation
        // Note: addEventMarkers now checks filters and sets initial locked state,
        // so markers appear in the correct state from the start
        this.removeEventMarkers(true).then(() => {
            return this.addEventMarkers(true);
        }).then(() => {
            // Filters are already applied during addEventMarkers, but call applyFilters
            // to ensure consistency and update number buttons
            this.applyFilters();
            
            // Update plane visibility based on current page events
            if (window.globeController && typeof window.globeController.updatePlaneVisibility === 'function') {
                window.globeController.updatePlaneVisibility();
            }
        });
    }

    /**
     * Apply active filters to event markers
     * Locks events that don't match any selected filter
     */
    applyFilters() {
        const activeFilters = this.sceneModel.activeFilters;
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        if (!globe) return;
        
        // If no filters active, unlock all
        if (activeFilters.size === 0) {
            this.unlockAllEvents();
            return;
        }
        
        // Helper function to check and lock/unlock a marker
        const processMarker = (child) => {
            if (child.userData && child.userData.isEventMarker) {
                const event = child.userData.event;
                const eventHeroFilters = event.filters || [];
                const eventFactionFilters = event.factions || [];
                
                // Check if event has at least one matching hero or faction filter
                const hasMatchingHero = eventHeroFilters.some(filter => activeFilters.has(filter));
                const hasMatchingFaction = eventFactionFilters.some(faction => activeFilters.has(faction));
                const hasMatchingFilter = hasMatchingHero || hasMatchingFaction;
                
                if (hasMatchingFilter) {
                    // Unlock if it matches
                    this.unlockEvent(child);
                } else {
                    // Lock if it doesn't match
                    this.lockEvent(child);
                }
            }
        };
        
        // Check event markers on the globe (Earth events)
        globe.traverse(processMarker);
        
        // Check event markers on the Moon plane
        if (moonPlane) {
            moonPlane.traverse(processMarker);
        }
        
        // Check event markers on the Mars plane
        if (marsPlane) {
            marsPlane.traverse(processMarker);
        }
        
        // Update number buttons after filters are applied
        // Use a small delay to ensure markers are locked before checking
        setTimeout(() => {
            if (window.globeController && window.globeController.uiView) {
                // Call updateNumberButtons if it exists (stored from setupEventNumberButtons)
                if (window.globeController.uiView.updateNumberButtons && 
                    typeof window.globeController.uiView.updateNumberButtons === 'function') {
                    console.log('[EventMarkerManager] Calling updateNumberButtons after applyFilters');
                    window.globeController.uiView.updateNumberButtons();
                } else {
                    console.warn('[EventMarkerManager] updateNumberButtons function not found!');
                }
            }
        }, 50); // Small delay to ensure markers are processed
    }

    /**
     * Lock an event marker (dark orange/near black, smaller, no interactions)
     * Animates the transition smoothly
     */
    lockEvent(marker) {
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
     * Unlock an event marker (restore to normal)
     * Animates the transition smoothly
     */
    unlockEvent(marker) {
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

    /**
     * Unlock all event markers
     */
    unlockAllEvents() {
        const globe = this.sceneModel.getGlobe();
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        
        if (!globe) return;
        
        // Helper function to unlock a marker
        const unlockMarker = (child) => {
            if (child.userData && child.userData.isEventMarker) {
                this.unlockEvent(child);
            }
        };
        
        // Unlock event markers on the globe (Earth events)
        globe.traverse(unlockMarker);
        
        // Unlock event markers on the Moon plane
        if (moonPlane) {
            moonPlane.traverse(unlockMarker);
        }
        
        // Unlock event markers on the Mars plane
        if (marsPlane) {
            marsPlane.traverse(unlockMarker);
        }
    }
}
