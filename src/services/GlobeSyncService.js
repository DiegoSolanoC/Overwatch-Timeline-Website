/**
 * GlobeSyncService - Handles synchronization between EventManager and Globe
 * Separates globe synchronization logic from event management
 */

class GlobeSyncService {
    constructor() {
        this.eventManager = null; // Reference to EventManager (for state access)
    }

    /**
     * Set the EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }

    /**
     * Sync events to globe data model
     */
    syncEventsToGlobe() {
        if (!this.eventManager) return;
        
        if (window.globeController && window.globeController.dataModel) {
            window.globeController.dataModel.events = [...this.eventManager.events];
            console.log('GlobeSyncService: Synced', this.eventManager.events.length, 'events with DataModel');
            
            // Refresh event markers if globe is already initialized
            if (window.globeController.globeView) {
                window.globeController.globeView.refreshEventMarkers();
                console.log('GlobeSyncService: Refreshed event markers on globe');
            }
        }
    }

    /**
     * Refresh globe events (update markers and pagination)
     */
    refreshGlobeEvents() {
        if (!this.eventManager) return;
        
        // Update DataModel if available
        if (window.globeController && window.globeController.dataModel) {
            // Update events in DataModel
            window.globeController.dataModel.events = [...this.eventManager.events];
            
            // Refresh event markers
            if (window.globeController.globeView) {
                window.globeController.globeView.refreshEventMarkers();
            }
            
            // Refresh pagination UI
            if (window.globeController.uiView && window.globeController.uiView.dataModel) {
                // Trigger pagination update
                const currentPage = window.globeController.dataModel.getCurrentEventPage();
                window.globeController.dataModel.setCurrentEventPage(currentPage);
                
                // Re-setup pagination to update UI
                window.globeController.uiView.setupEventPagination(() => {
                    if (window.globeController.globeView) {
                        window.globeController.globeView.refreshEventMarkers();
                    }
                });
            }
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobeSyncService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.GlobeSyncService = new GlobeSyncService();
}
