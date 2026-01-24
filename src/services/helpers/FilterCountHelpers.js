/**
 * FilterCountHelpers - Utilities for updating filter count displays
 * Extracted from FilterService to reduce file size
 */

/**
 * Update filter counts display
 */
export function updateFilterCounts(stateManager) {
    const heroesCount = document.getElementById('heroesCount');
    const factionsCount = document.getElementById('factionsCount');
    const { heroCount, factionCount } = stateManager.getCounts();
    
    updateCountDisplay(heroesCount, heroCount);
    updateCountDisplay(factionsCount, factionCount);
}

/**
 * Update individual count display element
 */
export function updateCountDisplay(element, count) {
    if (!element) return;
    
    if (count > 0) {
        element.textContent = count;
        element.style.display = 'inline';
    } else {
        element.style.display = 'none';
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.FilterCountHelpers) {
        window.FilterCountHelpers = {};
    }
    window.FilterCountHelpers.updateFilterCounts = updateFilterCounts;
    window.FilterCountHelpers.updateCountDisplay = updateCountDisplay;
}
