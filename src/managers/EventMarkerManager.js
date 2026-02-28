/**
 * EventMarkerManager - Handles event marker creation, removal, filtering, and locking
 * Extracted from GlobeView.js to improve maintainability
 */

import { latLonToVector3, xyToPlanePosition } from '../utils/GeometryUtils.js';
import { calculateMarkerPosition } from './helpers/MarkerPositionHelpers.js';
import { createMarkerMesh, createMarkerUserData, shouldEventBeLocked, getMarkerRadius, getMarkerColor } from './helpers/MarkerCreationHelpers.js';
import { createPinLinePoints, createPinLine } from './helpers/PinLineHelpers.js';
import { traverseEventMarkers, collectEventMarkers, collectEventMarkerPins } from './helpers/MarkerTraversalHelpers.js';
import { animateMarkersGrow, animateMarkersShrink } from './helpers/MarkerAnimationHelpers.js';
import { animateMarkerLock, animateMarkerUnlock } from './helpers/MarkerLockAnimationHelpers.js';
import { createSingleEventMarker, createMultiEventMarkers } from './helpers/MarkerCreationLogicHelpers.js';

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
            
            if (isMultiEvent) {
                // Multi-event: create markers for each variant
                const results = createMultiEventMarkers({
                    event,
                    sceneModel: this.sceneModel,
                    globe,
                    moonPlane,
                    marsPlane,
                    issSatellite,
                    animate
                });
                
                // Collect markers and pin lines for animation
                results.forEach(({ marker, pinLine, isMainVariant }) => {
                    if (isMainVariant && marker.visible) {
                        newMarkers.push(marker);
                        if (pinLine) {
                            newPinLines.push(pinLine);
                        }
                    }
                });
            } else {
                // Single event: create one orange marker
                const result = createSingleEventMarker({
                    event,
                    sceneModel: this.sceneModel,
                    globe,
                    moonPlane,
                    marsPlane,
                    issSatellite,
                    animate
                });
                
                if (result) {
                    newMarkers.push(result.marker);
                    if (result.pinLine) {
                        newPinLines.push(result.pinLine);
                    }
                }
            }
        });
        
        // Animate markers and pin lines growing if requested
        if (animate && (newMarkers.length > 0 || newPinLines.length > 0)) {
            return animateMarkersGrow(newMarkers, newPinLines);
        } else {
            // If not animating, ensure markers are at full scale
            newMarkers.forEach(marker => {
                const base = (marker.userData && marker.userData.isLocked) ? 0.75 : 1.0;
                const s = (marker.userData && marker.userData.originalScale) ? (base * marker.userData.originalScale) : base;
                marker.scale.set(s, s, s);
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
        
        // Check if globe exists before trying to traverse
        if (!globe) {
            console.warn('EventMarkerManager: Cannot remove event markers - globe not initialized yet');
            return Promise.resolve();
        }
        
        // Collect event markers and their pin lines using helpers
        const eventMarkers = collectEventMarkers(this.sceneModel);
        const pinLines = collectEventMarkerPins(this.sceneModel);
        
        const markers = this.sceneModel.getMarkers();
        
        // Helper to remove a marker and its pin line
        const removeMarker = (marker) => {
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
        };
        
        // Remove any orphaned event-marker pin lines (e.g. from city/seaport-style pins at same location, or missed teardown). Only lines with isEventMarkerPin are from events; isMarkerPin are city/seaport and are not removed here.
        const removeOrphanedEventPins = (parent) => {
            if (!parent || !parent.children) return;
            const toRemove = [];
            for (let i = 0; i < parent.children.length; i++) {
                const c = parent.children[i];
                if (c.userData && c.userData.isEventMarkerPin) toRemove.push(c);
            }
            toRemove.forEach(c => { if (c.parent) c.parent.remove(c); });
        };
        
        const doRemove = () => {
            eventMarkers.forEach(removeMarker);
            pinLines.forEach(line => {
                if (line.parent) line.parent.remove(line);
            });
            removeOrphanedEventPins(globe);
            const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
            if (earthMapPlane) removeOrphanedEventPins(earthMapPlane);
            const moon = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
            const mars = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
            if (moon) removeOrphanedEventPins(moon);
            if (mars) removeOrphanedEventPins(mars);
        };
        
        // If no markers to remove, still run orphan cleanup then return
        if (eventMarkers.length === 0 && pinLines.length === 0) {
            doRemove();
            return Promise.resolve();
        }
        
        // If animating, shrink markers before removing
        if (animate && eventMarkers.length > 0) {
            return animateMarkersShrink(eventMarkers, pinLines).then(doRemove);
        }
        doRemove();
        return Promise.resolve();
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

        // IMPORTANT: clear any pulse-ring meshes from the previous page immediately.
        // Otherwise they can linger (parented to ISS/Moon/Mars) and appear to "snap/tilt" right after page switches.
        const scene = this.sceneModel.getScene ? this.sceneModel.getScene() : null;
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const issSatellite = window.globeController?.transportController?.findISS
            ? window.globeController.transportController.findISS()
            : null;
        const containers = [scene, globe, earthMapPlane, moonPlane, marsPlane, issSatellite].filter(Boolean);
        containers.forEach(parent => {
            const toRemove = [];
            parent.traverse(obj => {
                if (obj?.userData?.isPulseRing) toRemove.push(obj);
            });
            toRemove.forEach(o => { if (o.parent) o.parent.remove(o); });
        });
        // Also reset hovered marker reference so no pulses keep scheduling across page boundaries.
        if (window.globeController?.interactionController?.pulseService) {
            window.globeController.interactionController.pulseService.setHoveredMarker(null);
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
        
        if (!globe) return;
        
        // If no filters active, unlock all and refresh number button states
        if (activeFilters.size === 0) {
            this.unlockAllEvents();
            setTimeout(() => {
                if (window.globeController?.uiView?.updateNumberButtons &&
                    typeof window.globeController.uiView.updateNumberButtons === 'function') {
                    window.globeController.uiView.updateNumberButtons();
                }
            }, 50);
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
        
        // Check event markers using traversal helper
        traverseEventMarkers(this.sceneModel, processMarker);
        
        // Update number buttons after filters are applied
        // Use a small delay to ensure markers are locked before checking
        setTimeout(() => {
            if (window.globeController && window.globeController.uiView) {
                // Call updateNumberButtons if it exists (stored from setupEventNumberButtons)
                if (window.globeController.uiView.updateNumberButtons && 
                    typeof window.globeController.uiView.updateNumberButtons === 'function') {
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
        
        // Store original values if not already stored
        if (!marker.userData.originalScale) {
            marker.userData.originalScale = marker.scale.x;
        }
        if (!marker.userData.originalColor) {
            marker.userData.originalColor = marker.userData.isInteractive === false ? 0xff69b4 : 0xff6600;
        }
        
        animateMarkerLock(marker);
    }

    /**
     * Unlock an event marker (restore to normal)
     * Animates the transition smoothly
     */
    unlockEvent(marker) {
        if (!marker || !marker.userData) return;
        animateMarkerUnlock(marker);
    }

    /**
     * Unlock all event markers
     */
    unlockAllEvents() {
        const globe = this.sceneModel.getGlobe();
        if (!globe) return;
        
        // Helper function to unlock a marker
        const unlockMarker = (child) => {
            if (child.userData && child.userData.isEventMarker) {
                this.unlockEvent(child);
            }
        };
        
        // Unlock event markers using traversal helper
        traverseEventMarkers(this.sceneModel, unlockMarker);
    }
}
