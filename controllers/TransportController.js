/**
 * TransportController - Orchestrator for all transport systems
 * Delegates to specialized controllers: TrainController, PlaneController, BoatController, SatelliteController
 * 
 * This refactored version follows the Single Responsibility Principle by delegating
 * vehicle-specific logic to dedicated controllers.
 */
import { TrainController } from './TrainController.js';
import { PlaneController } from './PlaneController.js';
import { BoatController } from './BoatController.js';
import { SatelliteController } from './SatelliteController.js';

export class TransportController {
    constructor(sceneModel, transportModel, routeController, transportView, globeView, dataModel) {
        this.sceneModel = sceneModel;
        this.transportModel = transportModel;
        this.routeController = routeController;
        this.transportView = transportView;
        this.globeView = globeView;
        this.dataModel = dataModel;
        
        // Initialize specialized controllers
        this.trainController = new TrainController(sceneModel, transportModel, routeController, transportView);
        this.planeController = new PlaneController(sceneModel, transportModel, transportView, dataModel);
        this.boatController = new BoatController(sceneModel, transportModel, routeController, transportView);
        this.satelliteController = new SatelliteController(sceneModel, transportModel, transportView);
        
        // Spawn intervals (kept here for compatibility)
        this.trainSpawnInterval = null;
        this.planeSpawnInterval = null;
        this.boatSpawnInterval = null;
    }

    // ========== TRAIN DELEGATION ==========

    /**
     * Create a train (delegates to TrainController)
     */
    createTrain(routeData, isMultiStop = false, journeyProgress = 0) {
        return this.trainController.createTrain(routeData, isMultiStop, journeyProgress);
    }

    /**
     * Create a multi-stop train (delegates to TrainController)
     */
    createMultiStopTrain(routes) {
        return this.trainController.createMultiStopTrain(routes);
    }

    /**
     * Update trains (delegates to TrainController)
     */
    updateTrains() {
        this.trainController.updateTrains();
    }

    /**
     * Spawn trains randomly (delegates to TrainController)
     */
    spawnTrainsRandomly() {
        this.trainController.spawnTrainsRandomly();
        this.trainSpawnInterval = this.trainController.trainSpawnInterval;
    }

    // ========== PLANE DELEGATION ==========

    /**
     * Create a plane (delegates to PlaneController)
     */
    createPlane(fromCity, toCity) {
        return this.planeController.createPlane(fromCity, toCity);
    }

    /**
     * Create a multi-stop plane (delegates to PlaneController)
     */
    createMultiStopPlane(airports) {
        return this.planeController.createMultiStopPlane(airports);
    }

    /**
     * Update planes (delegates to PlaneController)
     */
    updatePlanes() {
        this.planeController.updatePlanes();
    }

    /**
     * Spawn planes randomly (delegates to PlaneController)
     */
    spawnPlanesRandomly() {
        this.planeController.spawnPlanesRandomly();
        this.planeSpawnInterval = this.planeController.planeSpawnInterval;
    }

    // ========== BOAT DELEGATION ==========

    /**
     * Create a boat (delegates to BoatController)
     */
    createBoat(routeData, isMultiStop = false) {
        return this.boatController.createBoat(routeData, isMultiStop);
    }

    /**
     * Create a multi-stop boat (delegates to BoatController)
     */
    createMultiStopBoat(routes) {
        return this.boatController.createMultiStopBoat(routes);
    }

    /**
     * Update boats (delegates to BoatController)
     */
    updateBoats() {
        this.boatController.updateBoats();
    }

    /**
     * Spawn boats randomly (delegates to BoatController)
     */
    spawnBoatsRandomly() {
        this.boatController.spawnBoatsRandomly();
        this.boatSpawnInterval = this.boatController.boatSpawnInterval;
    }

    // ========== SATELLITE DELEGATION ==========

    /**
     * Create a satellite (delegates to SatelliteController)
     */
    createSatellite(config) {
        return this.satelliteController.createSatellite(config);
    }

    /**
     * Update satellites (delegates to SatelliteController)
     */
    updateSatellites() {
        this.satelliteController.updateSatellites();
    }

    /**
     * Initialize satellites (delegates to SatelliteController)
     */
    initializeSatellites() {
        this.satelliteController.initializeSatellites();
    }

    /**
     * Find the ISS satellite (delegates to SatelliteController)
     */
    findISS() {
        return this.satelliteController.findISS();
    }

    // ========== SHARED UTILITIES ==========

    /**
     * Calculate route distance (helper for compatibility)
     */
    calculateRouteDistance(curve) {
        return this.routeController.calculateRouteDistance(curve);
    }

    /**
     * Stop all spawning intervals (for cleanup)
     */
    stopAllSpawning() {
        this.trainController.stopSpawning();
        this.planeController.stopSpawning();
        this.boatController.stopSpawning();
    }
}
