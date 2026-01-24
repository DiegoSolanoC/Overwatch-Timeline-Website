/**
 * FilterTabHelpers - Utilities for managing filter tab switching
 * Extracted from FilterService to reduce file size
 */

/**
 * Setup tab switching
 */
export function setupTabs(heroesTab, factionsTab, heroes, factions, createFilterButtons, updateFilterCounts) {
    if (heroesTab) {
        heroesTab.addEventListener('click', () => {
            heroesTab.classList.add('active');
            if (factionsTab) {
                factionsTab.classList.remove('active');
            }
            createFilterButtons(heroes, 'heroes', 'assets/images/heroes');
            updateFilterCounts();
        });
    }
    
    if (factionsTab) {
        factionsTab.addEventListener('click', () => {
            factionsTab.classList.add('active');
            if (heroesTab) {
                heroesTab.classList.remove('active');
            }
            createFilterButtons(factions, 'factions', 'assets/images/factions');
            updateFilterCounts();
        });
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.FilterTabHelpers) {
        window.FilterTabHelpers = {};
    }
    window.FilterTabHelpers.setupTabs = setupTabs;
}
