/**
 * ServiceLoadHelpers - Utilities for ComponentLoaderService
 * Service-compatible versions of component loading helpers
 */

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    window.ServiceLoadHelpers = {};
}

/**
 * Creates a standard globe control button (service-compatible)
 * @param {Object} config - Button configuration
 * @param {string} config.id - Button ID
 * @param {string} config.className - Additional CSS classes
 * @param {string} config.title - Button title/tooltip
 * @param {string} config.iconPath - Path to icon image
 * @param {string} config.iconAlt - Alt text for icon
 * @param {string} config.parentId - ID of parent element to append to
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLElement|null} - The created button element or existing one
 */
export function createGlobeControlButton({ id, className, title, iconPath, iconAlt, parentId = 'content' }, statusService) {
    if (document.getElementById(id)) {
        return document.getElementById(id);
    }
    
    const button = document.createElement('button');
    button.id = id;
    button.className = `globe-control-btn ${className || ''}`;
    button.title = title;
    button.innerHTML = `
        <span id="${id}Icon">
            <img src="${iconPath}" alt="${iconAlt}" style="width: 100%; height: 100%; object-fit: contain;">
        </span>
    `;
    
    const parent = document.getElementById(parentId);
    if (parent) {
        parent.appendChild(button);
        if (statusService) {
            statusService.update(`✓ ${title} button added`, 'success');
        }
    } else {
        console.warn(`Parent element '${parentId}' not found for button ${id}`);
    }
    
    return button;
}

// Export for module systems and make available globally
if (typeof window !== 'undefined') {
    window.ServiceLoadHelpers.createGlobeControlButton = createGlobeControlButton;
}

/**
 * Loads a sound effect (service-compatible)
 * @param {string} soundName - Name of the sound effect
 * @param {string} soundPath - Path to the sound file
 * @param {Object} statusService - Status service for updates
 * @returns {boolean} - True if sound was loaded successfully
 */
export function loadSoundEffect(soundName, soundPath, statusService) {
    if (!window.SoundEffectsManager) {
        return false;
    }
    
    if (statusService) {
        statusService.update(`Loading ${soundName} sound effect...`, 'info');
    }
    
    window.SoundEffectsManager.loadSound(soundName, soundPath);
    
    if (statusService) {
        statusService.update(`✓ ${soundName} sound effect loaded`, 'success');
    }
    
    return true;
}

/**
 * Checks if globe base is loaded (service-compatible)
 * @param {Object} loadedComponents - The loadedComponents object
 * @param {string} buttonId - Button ID for error state
 * @param {Object} statusService - Status service for updates
 * @param {Object} buttonStateService - Button state service
 * @returns {boolean} - True if globe base is loaded
 */
export function requireGlobeBase(loadedComponents, buttonId, statusService, buttonStateService) {
    if (!loadedComponents?.globeBase || !window.globeController) {
        if (statusService) {
            statusService.update('⚠ Globe base must be loaded first!', 'error');
        }
        if (buttonId && buttonStateService) {
            buttonStateService.setState(buttonId, 'error');
        }
        return false;
    }
    return true;
}
