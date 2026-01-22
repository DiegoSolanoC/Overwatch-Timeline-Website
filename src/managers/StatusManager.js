/**
 * StatusManager - Handles status updates and progress tracking
 * Extracted from component-loader.js to improve maintainability
 */

// Progress tracking for Globe Components
let globeComponentsProgress = {
    total: 4, // Globe Base, Transport, Controls, Events
    completed: 0
};

/**
 * Update status message
 * @param {string} message - Status message
 * @param {string} type - Message type ('info', 'success', 'error')
 */
export function updateStatus(message, type = 'info') {
    // Check if we're on main.html with overlay status
    const isMainPage = window.location.pathname.includes('main.html') || window.location.href.includes('main.html');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const overlayActive = loadingOverlay && loadingOverlay.classList.contains('active');
    
    let statusContent;
    if (isMainPage && overlayActive) {
        // Use overlay status on main page when overlay is active
        statusContent = document.getElementById('overlayStatusContent');
        // Replace content with single current message
        if (statusContent) {
            statusContent.innerHTML = ''; // Clear all previous messages
            const item = document.createElement('div');
            item.className = `test-status-item ${type}`;
            item.textContent = message;
            statusContent.appendChild(item);
        }
    } else {
        // Use regular test status (replace for test page)
        const statusDiv = document.getElementById('testStatus');
        statusContent = document.getElementById('statusContent');
        if (statusDiv && statusContent) {
            statusDiv.style.display = 'block';
            statusContent.innerHTML = ''; // Clear all previous messages
            const item = document.createElement('div');
            item.className = `test-status-item ${type}`;
            item.textContent = message;
            statusContent.appendChild(item);
        }
    }
}

/**
 * Update globe components progress
 * @param {number} completed - Number of completed components
 */
export function updateGlobeComponentsProgress(completed) {
    globeComponentsProgress.completed = completed;
    const progressBar = document.getElementById('loadingProgressBar');
    if (progressBar) {
        const percentage = (completed / globeComponentsProgress.total) * 100;
        progressBar.style.width = percentage + '%';
    }
}

/**
 * Reset globe components progress
 */
export function resetGlobeComponentsProgress() {
    globeComponentsProgress.completed = 0;
    const progressBar = document.getElementById('loadingProgressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

/**
 * Get current globe components progress
 * @returns {Object} - Progress object with total and completed
 */
export function getGlobeComponentsProgress() {
    return { ...globeComponentsProgress };
}
