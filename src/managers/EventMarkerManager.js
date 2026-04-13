/**
 * EventMarkerManager - Handles event marker creation, removal, filtering, and locking
 * Extracted from GlobeView.js to improve maintainability
 */

import { latLonToVector3, xyToPlanePosition } from '../utils/GeometryUtils.js';
import { createMarkerMesh, createMarkerUserData, shouldEventBeLocked, getMarkerRadius, getDefaultMarkerOriginalHex } from './helpers/MarkerCreationHelpers.js';
import { createPinLinePoints, createPinLine } from './helpers/PinLineHelpers.js';
import { traverseEventMarkers, collectEventMarkers, collectEventMarkerPins } from './helpers/MarkerTraversalHelpers.js';
import { animateMarkersGrow, animateMarkersShrink } from './helpers/MarkerAnimationHelpers.js';
import { animateMarkerLock, animateMarkerUnlock } from './helpers/MarkerLockAnimationHelpers.js';
import { createSingleEventMarker, createMultiEventMarkers } from './helpers/MarkerCreationLogicHelpers.js';

function delayThenSyncPagination(manager, options) {
    return new Promise((resolve) => {
        setTimeout(resolve, 50);
    }).then(() => manager._syncPaginationUiAfterFilters(options));
}

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

        // Get Mars Ship for marsShip events
        const marsShipSatellite = window.globeController && window.globeController.transportController
            ? window.globeController.transportController.findMarsShip?.()
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
                    marsShipSatellite,
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
                    marsShipSatellite,
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
            const moonRig = this.sceneModel.getMoonRig ? this.sceneModel.getMoonRig() : this.sceneModel.moonRig;
            const marsRig = this.sceneModel.getMarsRig ? this.sceneModel.getMarsRig() : this.sceneModel.marsRig;
            if (moonRig) removeOrphanedEventPins(moonRig);
            if (marsRig) removeOrphanedEventPins(marsRig);
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
     * Refresh event markers (remove and re-add)
     * @param {boolean} [animate=true] - Grow/shrink animation; use false when opening from event manager for snappier UX
     * @param {{ preservePaginationThumbEntrance?: boolean }} [options] - If true (page-turn callback), delayed filter sync will not cancel thumb entrance animation
     * @returns {Promise<void>|undefined}
     */
    refreshEventMarkers(animate = true, options = {}) {
        const globe = this.sceneModel.getGlobe();
        if (!globe) {
            if (this.sceneModel.getMapViewEnabled?.()) {
                return delayThenSyncPagination(this, {
                    ...options,
                    domLiteFromRefresh: true,
                    domLiteAnimate: animate
                });
            }
            console.warn('EventMarkerManager: Cannot refresh event markers - globe not initialized yet');
            return Promise.resolve();
        }

        // IMPORTANT: clear any pulse-ring meshes from the previous page immediately.
        // Otherwise they can linger (parented to ISS/Moon/Mars) and appear to "snap/tilt" right after page switches.
        const scene = this.sceneModel.getScene ? this.sceneModel.getScene() : null;
        const earthMapPlane = this.sceneModel.getEarthMapPlane ? this.sceneModel.getEarthMapPlane() : this.sceneModel.earthMapPlane;
        const moonPlane = this.sceneModel.getMoonPlane ? this.sceneModel.getMoonPlane() : this.sceneModel.moonPlane;
        const marsPlane = this.sceneModel.getMarsPlane ? this.sceneModel.getMarsPlane() : this.sceneModel.marsPlane;
        const moonRig = this.sceneModel.getMoonRig ? this.sceneModel.getMoonRig() : this.sceneModel.moonRig;
        const marsRig = this.sceneModel.getMarsRig ? this.sceneModel.getMarsRig() : this.sceneModel.marsRig;
        const issSatellite = window.globeController?.transportController?.findISS
            ? window.globeController.transportController.findISS()
            : null;
        const marsShipSatellite = window.globeController?.transportController?.findMarsShip
            ? window.globeController.transportController.findMarsShip()
            : null;
        const orbitPlane = this.sceneModel.getOrbitPlane ? this.sceneModel.getOrbitPlane() : this.sceneModel.orbitPlane;
        const orbitRig = this.sceneModel.getOrbitRig ? this.sceneModel.getOrbitRig() : this.sceneModel.orbitRig;
        const containers = [
            scene, globe, earthMapPlane, moonRig, marsRig, orbitRig, moonPlane, marsPlane, orbitPlane, issSatellite, marsShipSatellite
        ].filter(Boolean);
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
        
        return this.removeEventMarkers(animate).then(() => {
            return this.addEventMarkers(animate);
        }).then(() => {
            return this.applyFilters({ ...options, domLiteFromRefresh: true, domLiteAnimate: animate });
        }).then(() => {
            if (window.globeController && typeof window.globeController.updatePlaneVisibility === 'function') {
                window.globeController.updatePlaneVisibility();
            }
            if (window.globeController && typeof window.globeController.rebindOpenEventMarkerAfterRefresh === 'function') {
                window.globeController.rebindOpenEventMarkerAfterRefresh();
            }
        });
    }

    /**
     * Apply active filters to event markers
     * Locks events that don't match any selected filter
     * @param {{ preservePaginationThumbEntrance?: boolean, domLiteAnimate?: boolean, domLiteFromRefresh?: boolean }} [options] - `domLiteFromRefresh` true when called from {@link refreshEventMarkers} (page turn vs filter-only DOM sync)
     * @returns {Promise<void>}
     */
    applyFilters(options = {}) {
        const activeFilters = this.sceneModel.activeFilters;
        const globe = this.sceneModel.getGlobe();

        if (!globe) {
            if (this.sceneModel.getMapViewEnabled?.()) {
                if (activeFilters.size === 0) {
                    this.unlockAllEvents();
                }
                return delayThenSyncPagination(this, options);
            }
            return Promise.resolve();
        }

        // If no filters active, unlock all and refresh number button states
        if (activeFilters.size === 0) {
            this.unlockAllEvents();
            return delayThenSyncPagination(this, options);
        }

        // Helper function to check and lock/unlock a marker (multi-variant: unlock if any variant matches)
        const processMarker = (child) => {
            if (child.userData && child.userData.isEventMarker) {
                const event = child.userData.event;
                if (!shouldEventBeLocked(event, activeFilters)) {
                    this.unlockEvent(child);
                } else {
                    this.lockEvent(child);
                }
            }
        };

        // Check event markers using traversal helper
        traverseEventMarkers(this.sceneModel, processMarker);

        // Small delay so WebGL lock/unlock animations can start before we sync DOM map + pagination
        return delayThenSyncPagination(this, options);
    }

    /**
     * After marker lock state changes, refresh pagination thumbs. When {@link refreshEventMarkers}
     * was triggered by a page turn, preserve the staggered thumb entrance (do not strip --enter).
     * @returns {Promise<void>}
     */
    async _syncPaginationUiAfterFilters(options = {}) {
        const gc = window.globeController;
        if (gc?.map2dLite?.syncMarkers && this.sceneModel.getMapViewEnabled?.()) {
            const fromRefresh = options.domLiteFromRefresh === true;
            const wantAnim = options.domLiteAnimate !== false;
            if (fromRefresh && wantAnim) {
                await gc.map2dLite.syncMarkers({ mode: 'pageTurn' });
            } else if (fromRefresh && !wantAnim) {
                await gc.map2dLite.syncMarkers({ mode: 'instant' });
            } else {
                await gc.map2dLite.syncMarkers({ mode: 'filter' });
            }
        }
        const ui = gc?.uiView;
        if (!ui) return;
        if (options.preservePaginationThumbEntrance) {
            if (typeof ui.updateNumberButtons === 'function') {
                ui.updateNumberButtons(false, { preserveThumbEntrance: true });
            }
            return;
        }
        if (typeof ui.updateNumberButtons === 'function') {
            ui.updateNumberButtons();
        } else {
            console.warn('[EventMarkerManager] updateNumberButtons function not found!');
        }
        if (typeof ui.updatePaginationUI === 'function') {
            ui.updatePaginationUI();
        }
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
            marker.userData.originalColor = getDefaultMarkerOriginalHex(marker.userData);
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
