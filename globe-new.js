/**
 * Main entry point for the Globe application
 * Uses MVC architecture with ES6 modules
 */
import { GlobeController } from './controllers/GlobeController.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('globe-container')) {
        const controller = new GlobeController();
        controller.init();
        
        // Store globally for debugging
        window.globeController = controller;
    }
});


