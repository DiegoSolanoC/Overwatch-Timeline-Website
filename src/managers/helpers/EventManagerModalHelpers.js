/**
 * EventManagerModalHelpers - Utilities for modal management in EventManager
 * Extracted from EventManager to reduce duplication
 */

/**
 * Opens the edit modal for an event
 * @param {Object} params - Parameters
 * @param {number|null} params.index - Event index (null for new event)
 * @param {Object} params.events - Events array
 * @param {Object} params.formService - EventFormService instance
 * @param {Function} params.setEditingIndex - Function to set editing index
 * @param {Function} params.clearEditForm - Function to clear edit form
 * @param {Function} params.populateEditForm - Function to populate edit form
 * @param {Array} params.heroes - Heroes array
 * @param {Array} params.factions - Factions array
 */
export function openEditModal({ index, events, formService, setEditingIndex, clearEditForm, populateEditForm, heroes, factions }) {
    const modal = document.getElementById('eventEditModal');
    const modalTitle = document.getElementById('eventEditModalTitle');
    
    if (!modal) return;
    
    setEditingIndex(index);
    
    if (index === null) {
        // New event
        modalTitle.textContent = 'Add New Event';
        clearEditForm();
    } else {
        // Edit existing event
        modalTitle.textContent = 'Edit Event';
        populateEditForm(events[index]);
    }
    
    modal.classList.add('open');
    
    // Setup location type change handler
    if (formService) {
        formService.setupLocationTypeHandler();
    }
    
    // Setup autocomplete after modal is open (for both heroes and factions)
    setTimeout(() => {
        const filtersInput = document.getElementById('eventEditFilters');
        const factionsInput = document.getElementById('eventEditFactions');
        
        if (filtersInput && heroes.length > 0 && formService) {
            formService.setupAutocomplete(filtersInput, heroes, 'heroes');
        }
        
        if (factionsInput && factions.length > 0 && formService) {
            // Create array of display names for autocomplete
            const factionDisplayNames = factions.map(f => f.displayName);
            formService.setupAutocomplete(factionsInput, factionDisplayNames, 'factions');
        }
    }, 100);
}

/**
 * Closes the edit modal
 * @param {Function} setEditingIndex - Function to clear editing index
 */
export function closeEditModal(setEditingIndex) {
    const modal = document.getElementById('eventEditModal');
    if (modal) {
        modal.classList.remove('open');
    }
    setEditingIndex(null);
    
    // Reset autocomplete setup flags
    const filtersInput = document.getElementById('eventEditFilters');
    if (filtersInput) {
        filtersInput.dataset.autocompleteSetup = 'false';
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.EventManagerModalHelpers) {
        window.EventManagerModalHelpers = {};
    }
    window.EventManagerModalHelpers.openEditModal = openEditModal;
    window.EventManagerModalHelpers.closeEditModal = closeEditModal;
}
