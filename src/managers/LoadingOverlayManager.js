/**
 * LoadingOverlayManager - Handles loading overlay show/hide functionality
 * Extracted from component-loader.js to improve maintainability
 */

let isRunOperation = false; // Flag to track if we're in a run operation

/**
 * Set the run operation flag
 * @param {boolean} value - True if in a run operation
 */
export function setRunOperation(value) {
    isRunOperation = value;
}

/**
 * Get the run operation flag
 * @returns {boolean} - True if in a run operation
 */
export function getRunOperation() {
    return isRunOperation;
}

/**
 * Show loading overlay
 * Works for both test.html and main.html
 */
export function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        // Force immediate visibility (no transition delay)
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.visibility = 'visible';
        loadingOverlay.classList.add('active');
        console.log('[Loading Overlay] Showing overlay');
    } else {
        console.warn('[Loading Overlay] Overlay element not found!');
    }
}

/**
 * Hide loading overlay
 * Don't hide overlay if we're in a run operation (let the run function handle it)
 */
export function hideLoadingOverlay() {
    // Don't hide overlay if we're in a run operation (let the run function handle it)
    if (isRunOperation) {
        console.log('[Loading Overlay] Skipping hide - run operation in progress');
        return;
    }
    
    // Works for both test.html and main.html
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        // Reset inline styles to allow CSS transition
        loadingOverlay.style.opacity = '';
        loadingOverlay.style.visibility = '';
        console.log('[Loading Overlay] Hiding overlay');
    }
}
