/**
 * NavigationImageHelpers - Utilities for getting event image paths
 * Extracted from EventNavigationManager to reduce duplication
 */

/**
 * Gets the image path for an event
 * @param {Object} displayEvent - Event object to get image for
 * @param {string} eventName - Event name (fallback)
 * @returns {string|null} - Image path or null
 */
export function getEventImagePath(displayEvent, eventName) {
    // Use EventManager's function if available for consistency
    if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
        const imagePath = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
        console.log(`[EventNavigationManager] Image path for "${eventName}": ${imagePath}`);
        return imagePath;
    }
    
    // Fallback: construct path manually
    let imagePath = displayEvent.image || null;
    if (!imagePath || !imagePath.trim()) {
        const normalizedName = eventName.replace(/\s+/g, ' ').trim();
        const encodedFileName = encodeURIComponent(normalizedName);
        imagePath = `assets/images/events/${encodedFileName}.png`;
    }
    console.log(`[EventNavigationManager] Image path (fallback) for "${eventName}": ${imagePath}`);
    return imagePath;
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.NavigationImageHelpers) {
        window.NavigationImageHelpers = {};
    }
    window.NavigationImageHelpers.getEventImagePath = getEventImagePath;
}
