/**
 * MarkerPositionHelpers - Utilities for calculating marker positions
 * Extracted from EventMarkerManager to reduce duplication
 */

import { latLonToVector3, xyToPlanePosition } from '../../utils/GeometryUtils.js';
import { useOrbitPanelForStationShipMarkers } from './TransportOrbitPanelHelpers.js';

/**
 * Calculates position and target parent for a marker based on location type
 */
export function calculateMarkerPosition({ locationType, lat, lon, x, y, globe, moonPlane, marsPlane, issSatellite, marsShipSatellite }) {
    const THREE = window.THREE;
    const sceneModel = window.globeController?.sceneModel;
    const isMapView = sceneModel?.getMapViewEnabled
        ? sceneModel.getMapViewEnabled()
        : !!sceneModel?.isMapView;
    const surfaceLiftZ = isMapView ? 0.002 : 0.03;

    if (locationType === 'station' || locationType === 'marsShip') {
        const useOrbitPanel = sceneModel && useOrbitPanelForStationShipMarkers(sceneModel);
        console.log(`[calculateMarkerPosition] ${locationType}: useOrbitPanel=${useOrbitPanel}`);
        if (useOrbitPanel) {
            const orbitPlane = sceneModel.getOrbitPlane?.() ?? sceneModel.orbitPlane;
            if (!orbitPlane) {
                console.warn('[calculateMarkerPosition] Orbit plane not found, skipping station/marsShip marker');
                return null;
            }
            const orbitParent = sceneModel.getOrbitMarkerParent?.() ?? orbitPlane;
            const finalX = x !== undefined ? x : 50;
            const finalY = y !== undefined ? y : 50;
            const pos = xyToPlanePosition(finalX, finalY, 0.4, 0.4, orbitParent.position, null, surfaceLiftZ);
            console.log(`[calculateMarkerPosition] ${locationType} on orbit panel at (${finalX}, ${finalY})`);
            return {
                position: pos,
                targetParent: orbitParent
            };
        }
        if (locationType === 'station') {
            if (!issSatellite) {
                console.warn('[calculateMarkerPosition] ISS satellite not found, skipping station marker');
                return null;
            }
            console.log('[calculateMarkerPosition] Station marker on ISS satellite');
            return {
                position: new THREE.Vector3(0, 0, surfaceLiftZ),
                targetParent: issSatellite
            };
        }
        if (!marsShipSatellite) {
            console.warn('[calculateMarkerPosition] Mars Ship satellite not found, skipping marsShip marker');
            return null;
        }
        console.log('[calculateMarkerPosition] MarsShip marker on Mars Ship satellite');
        return {
            position: new THREE.Vector3(0, 0, surfaceLiftZ),
            targetParent: marsShipSatellite
        };
    } else if (locationType === 'moon') {
        if (!moonPlane) {
            console.warn('Moon plane not found, skipping marker');
            return null;
        }
        const moonParent = window.globeController?.sceneModel?.getMoonMarkerParent
            ? window.globeController.sceneModel.getMoonMarkerParent()
            : moonPlane;
        const finalX = x !== undefined ? x : 50;
        const finalY = y !== undefined ? y : 50;
        const pos = xyToPlanePosition(finalX, finalY, 0.4, 0.4, moonParent.position, null, surfaceLiftZ);
        return {
            position: pos,
            targetParent: moonParent
        };
    } else if (locationType === 'mars') {
        if (!marsPlane) {
            console.warn('Mars plane not found, skipping marker');
            return null;
        }
        const marsParent = window.globeController?.sceneModel?.getMarsMarkerParent
            ? window.globeController.sceneModel.getMarsMarkerParent()
            : marsPlane;
        const finalX = x !== undefined ? x : 50;
        const finalY = y !== undefined ? y : 50;
        const pos = xyToPlanePosition(finalX, finalY, 0.4, 0.4, marsParent.position, null, surfaceLiftZ);
        return {
            position: pos,
            targetParent: marsParent
        };
    } else {
        if (isMapView) {
            return null;
        }
        return {
            position: latLonToVector3(lat, lon, 1.03),
            targetParent: globe
        };
    }
}
