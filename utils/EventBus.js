/**
 * EventBus - Simple event-driven communication system
 * Replaces temporal coupling from setTimeout with proper event handlers
 * 
 * Usage:
 *   EventBus.on('eventName', callback);
 *   EventBus.emit('eventName', data);
 *   EventBus.off('eventName', callback);
 */
export class EventBus {
    static events = {};

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    static on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        
        this.events[event].push(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event that only fires once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    static once(event, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        
        return this.on(event, onceCallback);
    }

    /**
     * Emit an event with optional data
     * @param {string} event - Event name
     * @param {any} data - Data to pass to callbacks
     */
    static emit(event, data) {
        if (!this.events[event]) {
            return;
        }
        
        // Call all registered callbacks
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in callback for event "${event}":`, error);
            }
        });
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     */
    static off(event, callback) {
        if (!this.events[event]) {
            return;
        }
        
        this.events[event] = this.events[event].filter(cb => cb !== callback);
        
        // Clean up empty event arrays
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }

    /**
     * Remove all subscribers for an event
     * @param {string} event - Event name
     */
    static clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }

    /**
     * Get list of active events
     * @returns {string[]} Array of event names
     */
    static getEvents() {
        return Object.keys(this.events);
    }

    /**
     * Get subscriber count for an event
     * @param {string} event - Event name
     * @returns {number} Number of subscribers
     */
    static getSubscriberCount(event) {
        return this.events[event]?.length || 0;
    }
}

/**
 * Application-specific events
 */
export const AppEvents = {
    // Initialization events
    SCENE_READY: 'scene:ready',
    GLOBE_READY: 'globe:ready',
    PLANES_READY: 'planes:ready',
    TRANSPORT_READY: 'transport:ready',
    UI_READY: 'ui:ready',
    
    // Event management
    EVENTS_LOADED: 'events:loaded',
    EVENT_SELECTED: 'event:selected',
    EVENT_CLOSED: 'event:closed',
    
    // Camera events
    CAMERA_MOVED: 'camera:moved',
    CAMERA_ZOOMED: 'camera:zoomed',
    
    // Transport events
    TRANSPORT_SPAWNED: 'transport:spawned',
    TRANSPORT_ARRIVED: 'transport:arrived',
    
    // UI events
    FILTER_CHANGED: 'filter:changed',
    PAGE_CHANGED: 'page:changed',
    
    // Window events
    WINDOW_RESIZED: 'window:resized',
    ORIENTATION_CHANGED: 'orientation:changed'
};

// Expose EventBus and AppEvents globally for non-module scripts
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.AppEvents = AppEvents;
}
