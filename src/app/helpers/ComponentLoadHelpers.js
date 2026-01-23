/**
 * ComponentLoadHelpers - Common utilities for component loading
 * Extracted from component-loader.js to reduce duplication
 */

import { showLoadingOverlay, hideLoadingOverlay } from '../../managers/LoadingOverlayManager.js';
import { updateStatus } from '../../managers/StatusManager.js';
import { setButtonState } from '../../managers/ButtonStateManager.js';

/**
 * Wraps a component load function with standard error handling and overlay management
 * @param {Function} loadFn - The async load function to wrap
 * @param {string} componentName - Name of the component (for status messages)
 * @param {string} buttonId - ID of the button to update state
 * @param {boolean} isRunOperation - Whether this is part of a run operation
 * @returns {Promise<void>}
 */
export async function withLoadWrapper(loadFn, componentName, buttonId, isRunOperation = false) {
    // Only show overlay if not in a run operation
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState(buttonId, 'loading');
    updateStatus(`Starting ${componentName} load...`, 'info');
    
    try {
        await loadFn();
        setButtonState(buttonId, 'loaded');
        updateStatus(`✓ ${componentName} components fully loaded!`, 'success');
    } catch (error) {
        console.error(`Error loading ${componentName}:`, error);
        updateStatus(`✗ Error loading ${componentName}: ${error.message}`, 'error');
        setButtonState(buttonId, 'error');
        throw error;
    } finally {
        if (!isRunOperation) {
            hideLoadingOverlay();
        }
    }
}

/**
 * Wraps a component unload function with standard error handling
 * @param {Function} unloadFn - The async unload function to wrap
 * @param {string} componentName - Name of the component (for status messages)
 * @param {string} buttonId - ID of the button to update state
 * @returns {Promise<void>}
 */
export async function withUnloadWrapper(unloadFn, componentName, buttonId) {
    updateStatus(`Unloading ${componentName}...`, 'info');
    
    try {
        await unloadFn();
        setButtonState(buttonId, 'default');
        updateStatus(`✓ ${componentName} components unloaded!`, 'success');
    } catch (error) {
        console.error(`Error unloading ${componentName}:`, error);
        updateStatus(`✗ Error unloading ${componentName}: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Checks if a component is already loaded
 * @param {boolean} isLoaded - Whether the component is currently loaded
 * @param {string} componentName - Name of the component
 * @returns {boolean} - True if already loaded
 */
export function checkAlreadyLoaded(isLoaded, componentName) {
    if (isLoaded) {
        updateStatus(`→ ${componentName} already loaded!`, 'info');
        return true;
    }
    return false;
}

/**
 * Loads a sound effect if SoundEffectsManager is available
 * @param {string} soundName - Name of the sound
 * @param {string} soundPath - Path to the sound file
 * @param {string} statusMessage - Optional status message
 */
export function loadSoundEffect(soundName, soundPath, statusMessage = null) {
    if (window.SoundEffectsManager) {
        if (statusMessage) {
            updateStatus(statusMessage, 'info');
        }
        window.SoundEffectsManager.loadSound(soundName, soundPath);
        if (statusMessage) {
            updateStatus(`✓ ${soundName} sound effect loaded`, 'success');
        }
    }
}

/**
 * Loads multiple sound effects in batch
 * @param {Array<{name: string, path: string}>} sounds - Array of sound definitions
 * @param {string} statusMessage - Status message to show
 */
export function loadSoundEffects(sounds, statusMessage = 'Loading sound effects...') {
    if (!window.SoundEffectsManager) {
        return;
    }
    
    updateStatus(statusMessage, 'info');
    sounds.forEach(({ name, path }) => {
        window.SoundEffectsManager.loadSound(name, path);
    });
    updateStatus(`✓ ${sounds.length} sound effects loaded`, 'success');
}

/**
 * Creates a standard globe control button
 * @param {Object} config - Button configuration
 * @param {string} config.id - Button ID
 * @param {string} config.className - Additional CSS classes
 * @param {string} config.title - Button title/tooltip
 * @param {string} config.iconPath - Path to icon image
 * @param {string} config.iconAlt - Alt text for icon
 * @param {string} config.parentId - ID of parent element to append to
 * @returns {HTMLElement} - The created button element
 */
export function createGlobeControlButton({ id, className, title, iconPath, iconAlt, parentId = 'content' }) {
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
        updateStatus(`✓ ${title} button added`, 'success');
    } else {
        console.warn(`Parent element '${parentId}' not found for button ${id}`);
    }
    
    return button;
}
