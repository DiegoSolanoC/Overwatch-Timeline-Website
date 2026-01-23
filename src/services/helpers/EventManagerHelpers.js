/**
 * EventManagerHelpers - Utilities for EventManager initialization
 * Extracted from ComponentLoaderService to reduce complexity
 */

/**
 * Initializes EventManager with proper error handling and script loading
 * @param {Object} statusService - Status service for updates
 * @returns {Promise<EventManager>} - The initialized EventManager instance
 */
export async function initializeEventManager(statusService) {
    // Clean up existing instance if present
    if (window.eventManager) {
        if (statusService) {
            statusService.update('Cleaning up existing EventManager instance...', 'info');
        }
        if (window.eventManager.listenersSetup) {
            window.eventManager.listenersSetup = false;
        }
        window.eventManager = null;
    }
    
    // Check if EventManager script needs to be loaded
    const existingScript = document.querySelector('script[src*="EventManager.js"]');
    if (typeof EventManager === 'undefined' && !existingScript) {
        return await loadEventManagerScript(statusService);
    } else {
        return await createEventManagerInstance(statusService);
    }
}

/**
 * Loads EventManager script dynamically
 * @param {Object} statusService - Status service for updates
 * @returns {Promise<EventManager>} - The initialized EventManager instance
 */
async function loadEventManagerScript(statusService) {
    return new Promise((resolve, reject) => {
        if (statusService) {
            statusService.update('Loading EventManager...', 'info');
        }
        
        const script = document.createElement('script');
        script.src = 'src/managers/EventManager.js?' + Date.now();
        
        script.onload = async () => {
            try {
                // Wait a bit for the script to execute
                await new Promise(r => setTimeout(r, 50));
                
                if (typeof EventManager === 'undefined') {
                    throw new Error('EventManager class not found after loading script');
                }
                
                const eventManager = await createEventManagerInstance(statusService);
                resolve(eventManager);
            } catch (error) {
                console.error('EventManager initialization error:', error);
                if (statusService) {
                    statusService.update(`✗ EventManager initialization failed: ${error.message}`, 'error');
                }
                reject(error);
            }
        };
        
        script.onerror = () => {
            const error = new Error('Failed to load EventManager.js');
            if (statusService) {
                statusService.update(`✗ ${error.message}`, 'error');
            }
            reject(error);
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Creates and initializes EventManager instance
 * @param {Object} statusService - Status service for updates
 * @returns {Promise<EventManager>} - The initialized EventManager instance
 */
async function createEventManagerInstance(statusService) {
    // Wait for EventManager to be available if needed
    if (typeof EventManager === 'undefined') {
        if (statusService) {
            statusService.update('Waiting for EventManager class to be available...', 'info');
        }
        
        let attempts = 0;
        while (typeof EventManager === 'undefined' && attempts < 10) {
            await new Promise(r => setTimeout(r, 50));
            attempts++;
        }
        
        if (typeof EventManager === 'undefined') {
            throw new Error('EventManager class not available after waiting');
        }
    }
    
    if (statusService) {
        statusService.update('Creating new EventManager instance...', 'info');
    }
    
    const eventManager = new EventManager();
    
    if (statusService) {
        statusService.update('Initializing EventManager...', 'info');
    }
    
    try {
        await eventManager.init();
        window.eventManager = eventManager;
        
        if (statusService) {
            statusService.update('✓ EventManager initialized', 'success');
        }
        
        return eventManager;
    } catch (error) {
        console.error('EventManager initialization error:', error);
        if (statusService) {
            statusService.update(`✗ EventManager initialization failed: ${error.message}`, 'error');
        }
        throw error;
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.ServiceEventManagerHelpers) {
        window.ServiceEventManagerHelpers = {};
    }
    window.ServiceEventManagerHelpers.initializeEventManager = initializeEventManager;
}
