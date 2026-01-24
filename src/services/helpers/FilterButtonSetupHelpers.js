/**
 * FilterButtonSetupHelpers - Utilities for setting up filter button handlers
 * Extracted from FilterService to reduce file size
 */

/**
 * Setup filters toggle button handlers
 */
export function setupFiltersButton(filtersButton, soundManager, togglePanel) {
    if (!filtersButton) {
        console.error('Filters button not found!');
        return;
    }
    
    const handleFiltersToggle = (event) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        
        if (soundManager) {
            soundManager.play('filterButton');
        }
        
        togglePanel();
    };
    
    // Prevent button from interfering with globe controls
    filtersButton.addEventListener('mousedown', (e) => e.stopPropagation());
    filtersButton.addEventListener('mouseup', (e) => e.stopPropagation());
    
    // Handle touch events for mobile
    let touchStartTime = 0;
    filtersButton.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        touchStartTime = Date.now();
    });
    
    filtersButton.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (Date.now() - touchStartTime < 300) {
            handleFiltersToggle(e);
        }
    });
    
    filtersButton.addEventListener('click', handleFiltersToggle);
}

/**
 * Setup close button handler
 */
export function setupCloseButton(filtersPanelClose, soundManager, resetToConfirmedFilters, closePanel) {
    if (!filtersPanelClose) return;
    
    filtersPanelClose.addEventListener('click', () => {
        if (soundManager) {
            soundManager.play('filterButton');
        }
        resetToConfirmedFilters();
        closePanel();
    });
}

/**
 * Setup clear button handler
 */
export function setupClearButton(clearFiltersBtn, soundManager, stateManager, updateButtonStates, getSceneModel, currentFilterType, heroes, factions, createFilterButtons) {
    if (!clearFiltersBtn) return;
    
    clearFiltersBtn.addEventListener('click', () => {
        if (soundManager) {
            soundManager.play('filterClear');
        }
        stateManager.clear();
        updateButtonStates();
        
        // Clear filters, unlock all events, and refresh number buttons immediately
        const sceneModel = getSceneModel();
        const globeController = typeof window !== 'undefined' ? window.globeController : null;
        if (sceneModel && globeController?.globeView) {
            sceneModel.activeFilters.clear();
            globeController.globeView.applyFilters(); /* runs unlockAllEvents + updateNumberButtons */
        }
        
        // Refresh current view
        if (currentFilterType === 'heroes' && heroes.length > 0) {
            createFilterButtons(heroes, 'heroes', 'assets/images/heroes');
        } else if (currentFilterType === 'factions' && factions.length > 0) {
            createFilterButtons(factions, 'factions', 'assets/images/factions');
        }
    });
}

/**
 * Setup confirm button handler
 */
export function setupConfirmButton(confirmFiltersBtn, soundManager, stateManager, getSceneModel, closePanel) {
    if (!confirmFiltersBtn) return;
    
    confirmFiltersBtn.addEventListener('click', () => {
        if (soundManager) {
            soundManager.play('filterConfirm');
        }
        
        // Apply filters to events immediately BEFORE closing
        const sceneModel = getSceneModel();
        const globeController = typeof window !== 'undefined' ? window.globeController : null;
        
        if (sceneModel && globeController?.globeView) {
            stateManager.applyToScene(sceneModel);
            globeController.globeView.applyFilters();
        }
        
        closePanel();
    });
}

/**
 * Setup all button handlers
 */
export function setupButtons(filtersButton, filtersPanelClose, clearFiltersBtn, confirmFiltersBtn, soundManager, togglePanel, resetToConfirmedFilters, closePanel, stateManager, updateButtonStates, getSceneModel, currentFilterType, heroes, factions, createFilterButtons) {
    setupFiltersButton(filtersButton, soundManager, togglePanel);
    setupCloseButton(filtersPanelClose, soundManager, resetToConfirmedFilters, closePanel);
    setupClearButton(clearFiltersBtn, soundManager, stateManager, updateButtonStates, getSceneModel, currentFilterType, heroes, factions, createFilterButtons);
    setupConfirmButton(confirmFiltersBtn, soundManager, stateManager, getSceneModel, closePanel);
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.FilterButtonSetupHelpers) {
        window.FilterButtonSetupHelpers = {};
    }
    window.FilterButtonSetupHelpers.setupFiltersButton = setupFiltersButton;
    window.FilterButtonSetupHelpers.setupCloseButton = setupCloseButton;
    window.FilterButtonSetupHelpers.setupClearButton = setupClearButton;
    window.FilterButtonSetupHelpers.setupConfirmButton = setupConfirmButton;
    window.FilterButtonSetupHelpers.setupButtons = setupButtons;
}
