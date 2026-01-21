/**
 * FilterStateManager - Manages filter selection state and confirmed filters
 * Extracted from FilterService to follow Single Responsibility Principle
 */

class FilterStateManager {
    constructor() {
        this.selectedFilters = new Set();
    }
    
    /**
     * Get confirmed filters from sceneModel
     */
    getConfirmedFilters(sceneModel) {
        if (sceneModel && sceneModel.activeFilters) {
            // Ensure we create a new Set from the existing Set/Array
            const filters = sceneModel.activeFilters instanceof Set 
                ? new Set(sceneModel.activeFilters)
                : new Set(Array.from(sceneModel.activeFilters));
            return filters;
        }
        return new Set();
    }
    
    /**
     * Reset selectedFilters to match confirmed filters
     */
    resetToConfirmed(sceneModel) {
        const confirmedFilters = this.getConfirmedFilters(sceneModel);
        this.selectedFilters.clear();
        confirmedFilters.forEach(filter => this.selectedFilters.add(filter));
    }
    
    /**
     * Clear all selected filters
     */
    clear() {
        this.selectedFilters.clear();
    }
    
    /**
     * Add a filter
     */
    add(filter) {
        this.selectedFilters.add(filter);
    }
    
    /**
     * Remove a filter
     */
    remove(filter) {
        this.selectedFilters.delete(filter);
    }
    
    /**
     * Check if filter is selected
     */
    has(filter) {
        return this.selectedFilters.has(filter);
    }
    
    /**
     * Get all selected filters as array
     */
    toArray() {
        return Array.from(this.selectedFilters);
    }
    
    /**
     * Count filters by type (heroes vs factions)
     * Heroes don't have number prefix, factions do
     */
    getCounts() {
        let heroCount = 0;
        let factionCount = 0;
        
        this.selectedFilters.forEach(filter => {
            if (/^\d+/.test(filter)) {
                factionCount++;
            } else {
                heroCount++;
            }
        });
        
        return { heroCount, factionCount };
    }
    
    /**
     * Apply selected filters to sceneModel
     */
    applyToScene(sceneModel) {
        if (sceneModel) {
            // Create a new Set to ensure proper state persistence
            sceneModel.activeFilters = new Set(this.selectedFilters);
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterStateManager;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.FilterStateManager = FilterStateManager;
}
