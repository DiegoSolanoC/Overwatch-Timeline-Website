/**
 * FormAutocompleteService - Handles autocomplete functionality for form inputs
 * Provides autocomplete suggestions for filters and factions
 */

class FormAutocompleteService {
    constructor() {
        this.autocompleteLists = new Map(); // Track autocomplete lists by input element
    }

    /**
     * Setup autocomplete for filters/factions input
     * @param {HTMLElement} input - Input element
     * @param {Array} options - Array of option strings
     * @param {string} type - Type of autocomplete ('heroes' or 'factions')
     */
    setupAutocomplete(input, options, type) {
        // Remove existing autocomplete if already set up
        if (input.dataset.autocompleteSetup === 'true') {
            return; // Already set up
        }
        input.dataset.autocompleteSetup = 'true';
        
        let autocompleteList = null;
        
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const lastComma = value.lastIndexOf(',');
            const currentInput = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();
            
            // Remove existing autocomplete list
            if (autocompleteList) {
                autocompleteList.remove();
                autocompleteList = null;
            }
            
            if (currentInput.length === 0) {
                return;
            }
            
            // Filter matching options
            const matches = options.filter(opt => 
                opt.toLowerCase().includes(currentInput.toLowerCase()) &&
                !value.toLowerCase().includes(opt.toLowerCase())
            ).slice(0, 5); // Limit to 5 suggestions
            
            if (matches.length === 0) {
                return;
            }
            
            // Create autocomplete list
            autocompleteList = document.createElement('div');
            autocompleteList.className = 'filter-autocomplete-list';
            autocompleteList.style.cssText = `
                position: absolute;
                background: #2a2a2a;
                border: 1px solid rgba(255, 102, 0, 0.5);
                border-radius: 4px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                margin-top: 2px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            `;
            
            matches.forEach(match => {
                const item = document.createElement('div');
                item.className = 'filter-autocomplete-item';
                item.textContent = match;
                item.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    color: white;
                    font-size: 14px;
                    transition: background 0.2s;
                `;
                
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255, 102, 0, 0.3)';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                });
                
                item.addEventListener('click', () => {
                    const beforeComma = lastComma >= 0 ? value.substring(0, lastComma + 1) + ' ' : '';
                    input.value = beforeComma + match + ', ';
                    input.focus();
                    autocompleteList.remove();
                    autocompleteList = null;
                });
                
                autocompleteList.appendChild(item);
            });
            
            // Position autocomplete list
            const rect = input.getBoundingClientRect();
            autocompleteList.style.left = rect.left + 'px';
            autocompleteList.style.top = (rect.bottom + window.scrollY) + 'px';
            autocompleteList.style.width = rect.width + 'px';
            
            document.body.appendChild(autocompleteList);
            this.autocompleteLists.set(input, autocompleteList);
        });
        
        // Remove autocomplete on blur (with small delay to allow clicks)
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (autocompleteList) {
                    autocompleteList.remove();
                    autocompleteList = null;
                    this.autocompleteLists.delete(input);
                }
            }, 200);
        });
    }

    /**
     * Remove all autocomplete lists
     */
    clearAll() {
        this.autocompleteLists.forEach((list) => {
            if (list && list.parentNode) {
                list.remove();
            }
        });
        this.autocompleteLists.clear();
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormAutocompleteService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.FormAutocompleteService = FormAutocompleteService;
}
