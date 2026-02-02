/**
 * ModalSaveService - Handles form data collection and event saving from modal
 * Extracts the save logic from EventManager
 */

class ModalSaveService {
    constructor() {
        this.eventManager = null;
        this.editService = null;
        this.formService = null;
        this.sourceFieldManager = null;
        this.headlinesFieldManager = null;
    }

    /**
     * Set EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
        this.editService = eventManager?.editService || (typeof window !== 'undefined' && window.EventEditService) || null;
        this.formService = eventManager?.formService || null;
        // Get SourceFieldManager from formService
        if (this.formService && this.formService.sourceFieldManager) {
            this.sourceFieldManager = this.formService.sourceFieldManager;
        }
        // Get HeadlinesFieldManager from formService
        if (this.formService && this.formService.headlinesFieldManager) {
            this.headlinesFieldManager = this.formService.headlinesFieldManager;
        }
        // Ensure EventEditService has EventManager when using the global instance
        if (this.editService && this.eventManager && typeof this.editService.setEventManager === 'function') {
            this.editService.setEventManager(this.eventManager);
        }
    }

    /**
     * Check if saving is allowed (not on GitHub Pages)
     */
    isSavingAllowed() {
        if (!this.eventManager) return false;
        return !this.eventManager.isGitHubPages();
    }

    /**
     * Collect form data from the modal
     * @returns {Object|null} Form data object or null if collection fails
     */
    collectFormData() {
        if (!this.eventManager) return null;

        // IMPORTANT: Do NOT save variant here - it's already saved by saveEventFromModal
        // Saving here can cause issues if the form fields don't match the variant we want to save
        // The variant data should already be up-to-date from saveAllVariantsToMemory()

        // Get location type
        const locationTypeInput = document.getElementById('eventEditLocationType');
        const locationType = locationTypeInput ? locationTypeInput.value : 'earth';
        
        // Read coordinate values
        let lat, lon, x, y;
        if (locationType === 'earth') {
            lat = parseFloat(document.getElementById('eventEditLat')?.value);
            lon = parseFloat(document.getElementById('eventEditLon')?.value);
        } else if (locationType === 'station') {
            lat = undefined;
            lon = undefined;
            x = undefined;
            y = undefined;
        } else {
            x = parseFloat(document.getElementById('eventEditX')?.value);
            y = parseFloat(document.getElementById('eventEditY')?.value);
        }

        // Process main event fields
        const mainName = document.getElementById('eventEditName')?.value.trim() || '';
        const mainDescription = document.getElementById('eventEditDescription')?.value.trim() || '';
        const mainFiltersStr = document.getElementById('eventEditFilters')?.value.trim() || '';
        const mainFactionsStr = document.getElementById('eventEditFactions')?.value.trim() || '';

        // Process sources from all source pairs
        let mainSources = [];
        if (this.sourceFieldManager) {
            mainSources = this.sourceFieldManager.getSourcePairsData();
        } else {
            // Fallback: read directly from DOM
            const sourcePairs = document.querySelectorAll('.source-pair');
            sourcePairs.forEach((pair) => {
                const nameInput = pair.querySelector('.source-name-input');
                const linkInput = pair.querySelector('.source-link-input');
                const name = nameInput ? nameInput.value.trim() : '';
                const link = linkInput ? linkInput.value.trim() : '';
                if (name) {
                    mainSources.push({
                        text: name,
                        url: link || undefined
                    });
                }
            });
        }

        // Process headlines from all headline fields
        let mainHeadlines = [];
        if (this.headlinesFieldManager) {
            mainHeadlines = this.headlinesFieldManager.getHeadlinesData();
        } else {
            // Fallback: read directly from DOM
            const headlineFields = document.querySelectorAll('.headline-field');
            headlineFields.forEach((field) => {
                const input = field.querySelector('.headline-input');
                const value = input ? input.value.trim() : '';
                if (value) {
                    mainHeadlines.push(value);
                }
            });
        }

        const cityDisplayName = document.getElementById('eventEditCityDisplayName')?.value.trim() || '';

        return {
            locationType,
            lat,
            lon,
            x,
            y,
            mainName,
            mainDescription,
            mainFiltersStr,
            mainFactionsStr,
            mainSources,
            mainHeadlines,
            cityDisplayName
        };
    }

    /**
     * Get target position from event number input
     * @param {boolean} isNewEvent - Whether this is a new event or an update
     * @param {number} currentEventsLength - Current number of events
     * @returns {number|null} Target position (0-indexed) or null
     */
    getTargetPosition(isNewEvent, currentEventsLength) {
        const eventNumberInput = document.getElementById('eventEditNumber');
        if (!eventNumberInput || !eventNumberInput.value) {
            return null;
        }

        const eventNumber = parseInt(eventNumberInput.value);
        if (isNaN(eventNumber) || eventNumber < 1) {
            return null;
        }

        let targetPosition = eventNumber - 1; // Convert to 0-indexed
        // Clamp to valid range
        const maxPosition = isNewEvent ? currentEventsLength : currentEventsLength - 1;
        targetPosition = Math.min(targetPosition, maxPosition);
        
        return targetPosition;
    }

    /**
     * Save event from modal
     * @returns {Object} Result object with success flag and optional error/message
     */
    saveEventFromModal() {
        // Check if saving is allowed
        if (!this.isSavingAllowed()) {
            console.log('Event saving is disabled on GitHub Pages');
            return { success: false, error: 'Saving is disabled on GitHub Pages' };
        }

        // Fallback: use global EventEditService if not injected via EventManager
        if (!this.editService && this.eventManager && typeof window !== 'undefined' && window.EventEditService) {
            window.EventEditService.setEventManager(this.eventManager);
            this.editService = window.EventEditService;
        }

        if (!this.editService) {
            console.error('ModalSaveService: EventEditService not available!');
            return { success: false, error: 'EventEditService not available' };
        }

        if (!this.eventManager) {
            console.error('ModalSaveService: EventManager not available!');
            return { success: false, error: 'EventManager not available' };
        }

        // Save all variants to memory before collecting form data
        // This ensures all variants have their latest data (including headlines) saved
        if (this.formService && typeof this.formService.saveAllVariantsToMemory === 'function') {
            this.formService.saveAllVariantsToMemory();
        } else if (this.formService && typeof this.formService.saveCurrentVariantToMemory === 'function') {
            // Fallback: at least save current variant
            this.formService.saveCurrentVariantToMemory();
        }

        // Collect form data
        const formData = this.collectFormData();
        if (!formData) {
            return { success: false, error: 'Failed to collect form data' };
        }

        // Get variant data - make a deep copy to prevent mutations
        // IMPORTANT: Do this AFTER saveAllVariantsToMemory to ensure we have the latest data
        const variantData = JSON.parse(JSON.stringify(this.eventManager.variantData || []));
        const factions = this.eventManager.factions || [];
        
        // Debug logging - check if variants have headlines
        console.log('ModalSaveService: Variant data before creating event (deep copy):', variantData.map((v, i) => ({
            index: i,
            name: v.name,
            hasHeadlines: !!v.headlines,
            headlines: v.headlines,
            headlinesType: Array.isArray(v.headlines) ? 'array' : typeof v.headlines,
            headlinesLength: Array.isArray(v.headlines) ? v.headlines.length : 'N/A',
            fullVariant: JSON.stringify(v).substring(0, 200) // First 200 chars for debugging
        })));
        console.log('ModalSaveService: Original variantData reference (before copy):', this.eventManager.variantData.map((v, i) => ({
            index: i,
            headlines: v.headlines,
            headlinesType: Array.isArray(v.headlines) ? 'array' : typeof v.headlines
        })));

        // Use EventEditService to create event object
        const createResult = this.editService.createEventFromForm(formData, variantData, factions);
        if (createResult.error) {
            return { success: false, error: createResult.error };
        }

        const event = createResult.event;
        if (!event) {
            return { success: false, error: 'Failed to create event object' };
        }

        // Get target position
        const isNewEvent = this.eventManager.editingIndex === null;
        const targetPosition = this.getTargetPosition(isNewEvent, this.eventManager.events.length);

        // Use EventEditService to add or update event
        let result;
        if (isNewEvent) {
            // Add new event
            result = this.editService.addEvent(event, targetPosition);
        } else {
            // Update existing event
            result = this.editService.updateEvent(this.eventManager.editingIndex, event, targetPosition);
        }

        return result;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalSaveService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.ModalSaveService = ModalSaveService;
}
