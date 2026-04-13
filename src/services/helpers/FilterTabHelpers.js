/**
 * FilterTabHelpers - Utilities for managing filter tab switching
 * Extracted from FilterService to reduce file size
 */

function deactivateTabs(heroesTab, factionsTab, npcsTab) {
    if (heroesTab) {
        heroesTab.classList.remove('active');
        heroesTab.setAttribute('aria-selected', 'false');
    }
    if (factionsTab) {
        factionsTab.classList.remove('active');
        factionsTab.setAttribute('aria-selected', 'false');
    }
    if (npcsTab) {
        npcsTab.classList.remove('active');
        npcsTab.setAttribute('aria-selected', 'false');
    }
}

/**
 * Setup tab switching
 */
export function setupTabs(heroesTab, factionsTab, npcsTab, heroes, factions, npcs, createFilterButtons, updateFilterCounts) {
    if (heroesTab) {
        heroesTab.addEventListener('click', () => {
            if (!heroesTab.classList.contains('active') && window.SoundEffectsManager) {
                window.SoundEffectsManager.play('switchMap');
            }
            deactivateTabs(heroesTab, factionsTab, npcsTab);
            heroesTab.classList.add('active');
            heroesTab.setAttribute('aria-selected', 'true');
            createFilterButtons(heroes, 'heroes', 'assets/images/heroes');
            updateFilterCounts();
        });
    }

    if (factionsTab) {
        factionsTab.addEventListener('click', () => {
            if (!factionsTab.classList.contains('active') && window.SoundEffectsManager) {
                window.SoundEffectsManager.play('switchMap');
            }
            deactivateTabs(heroesTab, factionsTab, npcsTab);
            factionsTab.classList.add('active');
            factionsTab.setAttribute('aria-selected', 'true');
            createFilterButtons(factions, 'factions', 'assets/images/factions');
            updateFilterCounts();
        });
    }

    if (npcsTab) {
        npcsTab.addEventListener('click', () => {
            if (!npcsTab.classList.contains('active') && window.SoundEffectsManager) {
                window.SoundEffectsManager.play('switchMap');
            }
            deactivateTabs(heroesTab, factionsTab, npcsTab);
            npcsTab.classList.add('active');
            npcsTab.setAttribute('aria-selected', 'true');
            createFilterButtons(npcs, 'npcs', 'assets/images/npcs');
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
