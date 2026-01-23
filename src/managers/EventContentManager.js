/**
 * EventContentManager - Manages event sources and filters display
 */

/**
 * Helper function to get hero display name (maps filename to display name)
 * e.g., "Soldier 76" -> "Soldier: 76"
 */
function getHeroDisplayName(heroName) {
    const heroDisplayNames = {
        'Soldier 76': 'Soldier: 76'
    };
    return heroDisplayNames[heroName] || heroName;
}

export class EventContentManager {
    constructor(sceneModel) {
        this.sceneModel = sceneModel;
    }
    
    /**
     * Update event sources section
     * @param {Object} event - Event or variant object
     */
    updateEventSources(event) {
        const eventSourcesSection = document.getElementById('eventSourcesSection');
        const eventSourcesList = document.getElementById('eventSourcesList');
        
        if (event && event.sources && event.sources.length > 0) {
            if (eventSourcesSection && eventSourcesList) {
                eventSourcesList.innerHTML = '';
                
                event.sources.forEach((source) => {
                    const sourceItem = document.createElement('div');
                    sourceItem.className = 'event-source-display-item';
                    
                    if (source.url) {
                        const link = document.createElement('a');
                        link.href = source.url;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.textContent = source.text;
                        link.className = 'event-source-link';
                        sourceItem.appendChild(link);
                    } else {
                        sourceItem.textContent = source.text;
                        sourceItem.className = 'event-source-text';
                    }
                    
                    eventSourcesList.appendChild(sourceItem);
                });
                
                eventSourcesSection.style.display = 'block';
            }
        } else {
            if (eventSourcesSection) {
                eventSourcesSection.style.display = 'none';
            }
        }
    }

    /**
     * Update event filters section
     * @param {Object} event - Event or variant object
     */
    updateEventFilters(event) {
        const eventFiltersSection = document.getElementById('eventFiltersSection');
        const eventFiltersList = document.getElementById('eventFiltersList');
        const activeFilters = this.sceneModel.activeFilters || new Set();
        
        if (event && eventFiltersSection && eventFiltersList) {
            eventFiltersList.innerHTML = '';
            
            const heroFilters = event.filters || [];
            const factionFilters = event.factions || [];
            
            // Display heroes section
            if (heroFilters.length > 0) {
                const heroesHeader = document.createElement('h4');
                heroesHeader.textContent = 'Relevant Heroes:';
                heroesHeader.className = 'event-filter-header';
                eventFiltersList.appendChild(heroesHeader);
                
                heroFilters.forEach(filter => {
                    const filterTag = document.createElement('span');
                    filterTag.className = 'event-filter-tag';
                    if (activeFilters.has(filter)) {
                        filterTag.classList.add('selected');
                    }
                    const displayName = getHeroDisplayName(filter);
                    filterTag.textContent = displayName;
                    eventFiltersList.appendChild(filterTag);
                });
            }
            
            // Display factions section
            if (factionFilters.length > 0) {
                const factionsHeader = document.createElement('h4');
                factionsHeader.textContent = 'Relevant Factions:';
                factionsHeader.className = 'event-filter-header';
                eventFiltersList.appendChild(factionsHeader);
                
                factionFilters.forEach(faction => {
                    const filterTag = document.createElement('span');
                    filterTag.className = 'event-filter-tag';
                    if (activeFilters.has(faction)) {
                        filterTag.classList.add('selected');
                    }
                    const displayName = faction.replace(/^\d+/, '').trim();
                    filterTag.textContent = displayName;
                    eventFiltersList.appendChild(filterTag);
                });
            }
            
            if (heroFilters.length > 0 || factionFilters.length > 0) {
                eventFiltersSection.style.display = 'block';
            } else {
                eventFiltersSection.style.display = 'none';
            }
        } else {
            if (eventFiltersSection) {
                eventFiltersSection.style.display = 'none';
            }
        }
    }
}
