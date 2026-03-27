/**
 * EventContentManager - Manages event sources and filters display
 */

import { openExternalUrlAfterConfirm } from '../utils/ExternalLinkConfirm.js';

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
        this._factionLookupCache = null; // { byFilename: Map<string,string>, byDisplayName: Map<string,string>, byBareName: Map<string,string> }
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
                        link.href = '#';
                        link.className = 'event-source-link';
                        link.textContent = source.text;
                        link.setAttribute('role', 'button');
                        const url = source.url;
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            openExternalUrlAfterConfirm(url, {
                                title: 'Open source link?',
                                body: 'You are about to open this source in a new tab.'
                            });
                        });
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
        
        const normalizeKey = (s) => String(s || '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();

        const getFactionLookup = () => {
            if (this._factionLookupCache) return this._factionLookupCache;
            const factions =
                (window.eventManager && Array.isArray(window.eventManager.factions) && window.eventManager.factions.length > 0)
                    ? window.eventManager.factions
                    : (window.globeController?.dataModel?.factions || []);

            const byFilename = new Map();
            const byDisplayName = new Map();
            const byBareName = new Map();

            (Array.isArray(factions) ? factions : []).forEach((f) => {
                const filename = (f && f.filename) ? String(f.filename).trim() : '';
                const displayName = (f && f.displayName) ? String(f.displayName).trim() : '';
                if (!filename) return;
                byFilename.set(normalizeKey(filename), filename);
                if (displayName) byDisplayName.set(normalizeKey(displayName), filename);
                // bare name: strip leading digits from filename
                const bare = filename.replace(/^\d+/, '').trim();
                if (bare) byBareName.set(normalizeKey(bare), filename);
            });

            this._factionLookupCache = { byFilename, byDisplayName, byBareName };
            return this._factionLookupCache;
        };

        const resolveFactionFilename = (rawFaction) => {
            const raw = String(rawFaction || '').trim();
            if (!raw) return null;

            // Normalize common forms: allow passing full path or ".png".
            let key = raw;
            key = key.replace(/^assets\/images\/factions\//i, '');
            key = key.replace(/\.png$/i, '');

            const lookups = getFactionLookup();
            const nk = normalizeKey(key);

            // 1) exact filename match
            if (lookups.byFilename.has(nk)) return lookups.byFilename.get(nk);
            // 2) display name match (e.g. "Talon Empire" -> "04Talon Empire")
            if (lookups.byDisplayName.has(nk)) return lookups.byDisplayName.get(nk);
            // 3) bare name match (strip digits). Also handle cases where the event stored an
            // old/incorrect numeric prefix (e.g. "04Talon Empire") by stripping digits first.
            if (lookups.byBareName.has(nk)) return lookups.byBareName.get(nk);
            const bare = key.replace(/^\d+/, '').trim();
            const nb = normalizeKey(bare);
            if (bare && lookups.byBareName.has(nb)) return lookups.byBareName.get(nb);

            // Fallback: use provided key as filename.
            return key;
        };
        
        const CATEGORY_ICON_HEROES = 'assets/images/icons/Heroes Icon.png';
        const CATEGORY_ICON_FACTIONS = 'assets/images/icons/Factions Icon.png';

        const createCategoryFilterHeader = (labelText, iconSrc) => {
            const h = document.createElement('h4');
            h.className = 'event-filter-header event-filter-header--category';
            const img = document.createElement('img');
            img.className = 'event-filter-header-icon';
            img.src = iconSrc;
            img.alt = '';
            img.decoding = 'async';
            img.width = 20;
            img.height = 20;
            const label = document.createElement('span');
            label.className = 'event-filter-header-label';
            label.textContent = labelText;
            h.appendChild(img);
            h.appendChild(label);
            return h;
        };

        const createIconTag = ({ filterKey, displayName, type }) => {
            const tag = document.createElement('span');
            tag.className = 'event-filter-tag event-filter-tag--icon';
            tag.title = displayName;
            tag.setAttribute('aria-label', displayName);
            if (activeFilters.has(filterKey)) {
                tag.classList.add('selected');
            }

            const box = document.createElement('span');
            box.className = 'event-filter-image-container';

            const img = document.createElement('img');
            img.className = 'event-filter-icon';
            img.alt = displayName;
            img.loading = 'lazy';

            img.src = (type === 'factions')
                ? `assets/images/factions/${encodeURIComponent(filterKey)}.png`
                : `assets/images/heroes/${encodeURIComponent(filterKey)}.png`;

            box.appendChild(img);
            tag.appendChild(box);
            return tag;
        };
        
        if (event && eventFiltersSection && eventFiltersList) {
            eventFiltersList.innerHTML = '';
            
            const heroFilters = event.filters || [];
            const factionFilters = event.factions || [];
            
            // Display heroes section
            if (heroFilters.length > 0) {
                eventFiltersList.appendChild(
                    createCategoryFilterHeader('Relevant Heroes:', CATEGORY_ICON_HEROES)
                );
                
                heroFilters.forEach(filter => {
                    const displayName = getHeroDisplayName(filter);
                    eventFiltersList.appendChild(createIconTag({
                        filterKey: filter,
                        displayName,
                        type: 'heroes'
                    }));
                });
            }
            
            // Display factions section
            if (factionFilters.length > 0) {
                eventFiltersList.appendChild(
                    createCategoryFilterHeader('Relevant Factions:', CATEGORY_ICON_FACTIONS)
                );
                
                factionFilters.forEach(faction => {
                    const resolvedFilename = resolveFactionFilename(faction);
                    if (!resolvedFilename) return;
                    const lookup = getFactionLookup();
                    const resolvedDisplayName =
                        // Try to use canonical displayName if we have it
                        (function () {
                            const nk = normalizeKey(resolvedFilename);
                            const factions =
                                (window.eventManager && Array.isArray(window.eventManager.factions) && window.eventManager.factions.length > 0)
                                    ? window.eventManager.factions
                                    : (window.globeController?.dataModel?.factions || []);
                            const f = (Array.isArray(factions) ? factions : []).find(x => normalizeKey(x?.filename || '') === nk);
                            return (f?.displayName || '').trim();
                        })();

                    const displayName = resolvedDisplayName || String(faction || '').replace(/^\d+/, '').trim();
                    const tag = createIconTag({
                        filterKey: resolvedFilename,
                        displayName,
                        type: 'factions'
                    });
                    // Selected state should follow active filters even if the event stored a displayName.
                    if (activeFilters.has(faction) || activeFilters.has(resolvedFilename)) {
                        tag.classList.add('selected');
                    }
                    eventFiltersList.appendChild(tag);
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
