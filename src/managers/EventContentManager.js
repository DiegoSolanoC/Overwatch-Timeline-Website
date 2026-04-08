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
                        link.href = source.url;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.className = 'event-source-link';
                        link.textContent = source.text;
                        link.addEventListener('click', () => {
                            const sfx = window.SoundEffectsManager;
                            if (sfx && typeof sfx.play === 'function') {
                                sfx.play('filterConfirm');
                            }
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

        /** Prior labels / ids after faction renames — keys must match normalizeKey(). Values: manifest filename. */
        /** Keys: normalizeKey(). Values: manifest filename (same as MarkerCreationHelpers legacy targets). */
        const LEGACY_FACTION_STRING_TO_FILENAME = {
            shambali: '25Shambali Order',
            '25shambali': '25Shambali Order',
            '26shambali': '25Shambali Order',
            '13shambali': '25Shambali Order',
            omnica: '04Omnica Corporation',
            '04omnica': '04Omnica Corporation',
            '05omnica': '04Omnica Corporation',
            vishkar: '05Vishkar Corporation',
            '05vishkar': '05Vishkar Corporation',
            lucheng: '07Lucheng Interstellar',
            '07lucheng': '07Lucheng Interstellar',
            '09lucheng': '07Lucheng Interstellar',
            ironclad: '08Ironclad Guild',
            '08ironclad': '08Ironclad Guild',
            '10ironclad': '08Ironclad Guild',
            crusaders: '09Crusader Initiative',
            '09crusaders': '09Crusader Initiative',
            volskaya: '11Volskaya Industries',
            '11volskaya': '11Volskaya Industries',
            crisis: '12The Anubis Omnic Crisis',
            '06crisis': '12The Anubis Omnic Crisis',
            '12crisis': '12The Anubis Omnic Crisis',
            lumerico: '13Lumérico Incorporated',
            '13lumerico': '13Lumérico Incorporated',
            deadlock: '14Deadlock Rebels',
            '14deadlock': '14Deadlock Rebels',
            junkers: '16Junker Monarchy',
            '08junkers': '16Junker Monarchy',
            '16junkers': '16Junker Monarchy',
            wayfinders: '19Wayfinder Society',
            '19wayfinders': '19Wayfinder Society',
            '20wayfinders': '19Wayfinder Society',
            shimada: '21Shimada Clan',
            '21shimada': '21Shimada Clan',
            '22shimada': '21Shimada Clan',
            hashimoto: '22Hashimoto Clan',
            '22hashimoto': '22Hashimoto Clan',
            '23hashimoto': '22Hashimoto Clan',
            conspiracy: '23The Chernobog Conspiracy',
            '23conspiracy': '23The Chernobog Conspiracy',
            '24conspiracy': '23The Chernobog Conspiracy',
            oasis: '24Oasis Ministries',
            '24oasis': '24Oasis Ministries',
            '25oasis': '24Oasis Ministries',
            collective: '27The Martins Collective',
            '27collective': '27The Martins Collective',
            '28collective': '27The Martins Collective',
            phreaks: '29The Phreaks',
            '29phreaks': '29The Phreaks',
            '30phreaks': '29The Phreaks',
            meka: '30M.E.K.A Squad',
            '30meka': '30M.E.K.A Squad',
            '31meka': '30M.E.K.A Squad',
            yokai: '32Yokai Gang',
            '32yokai': '32Yokai Gang',
            '33yokai': '32Yokai Gang',
            '27null sector': '26Null Sector'
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

            const alias =
                LEGACY_FACTION_STRING_TO_FILENAME[nk]
                || (bare ? LEGACY_FACTION_STRING_TO_FILENAME[nb] : null);
            if (alias && lookups.byFilename.has(normalizeKey(alias))) {
                return lookups.byFilename.get(normalizeKey(alias));
            }

            // Unknown / removed faction (e.g. stale local data) — omit chip instead of a broken image.
            return null;
        };
        
        const CATEGORY_ICON_HEROES = 'assets/images/icons/Heroes Icon.png';
        const CATEGORY_ICON_FACTIONS = 'assets/images/icons/Factions Icon.png';
        const CATEGORY_ICON_COUNTRIES = 'assets/images/icons/Location Icon.png';

        const collectCountryFlagFilesForEvent = (ev) => {
            const ordered = [];
            const seen = new Set();
            const lh = typeof window !== 'undefined' ? window.LocationFlagHelpers : null;
            const loc = (ev && ev.cityDisplayName != null) ? String(ev.cityDisplayName) : '';
            const locType = (ev && ev.locationType) ? String(ev.locationType) : 'earth';
            const primary = lh && typeof lh.getResolvedFlagFilename === 'function'
                ? lh.getResolvedFlagFilename(loc, locType)
                : null;
            if (primary) {
                seen.add(primary);
                ordered.push(primary);
            }
            const sec = Array.isArray(ev?.secondaryCountryFlags) ? ev.secondaryCountryFlags : [];
            sec.forEach((f) => {
                const fn = f != null ? String(f).trim() : '';
                if (fn && !seen.has(fn)) {
                    seen.add(fn);
                    ordered.push(fn);
                }
            });
            return ordered;
        };

        const commonLabelForFlagFile = (flagFile) => {
            const map = typeof window !== 'undefined' ? window.FLAG_FILE_BY_COMMON : null;
            const file = String(flagFile || '').trim();
            if (!file) return '';
            if (map) {
                for (const common of Object.keys(map).sort()) {
                    if (map[common] === file) return common;
                }
            }
            return file.replace(/\.png$/i, '').trim() || file;
        };

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

        const createIconTag = ({ filterKey, displayName, type, factionRawKey }) => {
            const tag = document.createElement('span');
            tag.className = 'event-filter-tag event-filter-tag--icon event-filter-tag--clickable'
                + (type === 'countries' ? ' event-filter-tag--country' : '');
            tag.title = displayName;
            tag.setAttribute('aria-label', displayName);
            tag.setAttribute('role', 'button');
            tag.tabIndex = 0;

            const em = typeof window !== 'undefined' ? window.eventManager : null;
            const countryFilters = em?.searchCountryFilters;
            const heroSearch = em?.searchHeroFilters;
            const factionSearch = em?.searchFactionFilters;
            const fkLower = String(filterKey || '').toLowerCase();

            if (type === 'countries') {
                if (Array.isArray(countryFilters) && countryFilters.includes(filterKey)) {
                    tag.classList.add('selected');
                }
            } else if (type === 'heroes') {
                if (activeFilters.has(filterKey) || (Array.isArray(heroSearch) && heroSearch.includes(filterKey))) {
                    tag.classList.add('selected');
                }
            } else if (type === 'factions') {
                const fh = typeof window !== 'undefined' ? window.FactionMatchHelpers : null;
                const inSearch = Array.isArray(factionSearch) && factionSearch.some((f) =>
                    (fh && typeof fh.factionIdsMatch === 'function')
                        ? (fh.factionIdsMatch(f, filterKey) || (factionRawKey != null && fh.factionIdsMatch(f, factionRawKey)))
                        : String(f || '').toLowerCase() === fkLower);
                let tagMatches = activeFilters.has(filterKey) || inSearch;
                if (!tagMatches && factionRawKey != null && activeFilters.has(factionRawKey)) {
                    tagMatches = true;
                }
                if (!tagMatches && fh && typeof fh.activeFilterSetMatchesFactionId === 'function') {
                    tagMatches = fh.activeFilterSetMatchesFactionId(activeFilters, filterKey)
                        || (factionRawKey != null && fh.activeFilterSetMatchesFactionId(activeFilters, factionRawKey));
                }
                if (tagMatches) {
                    tag.classList.add('selected');
                }
            }

            const box = document.createElement('span');
            box.className = 'event-filter-image-container';

            const img = document.createElement('img');
            img.className = 'event-filter-icon';
            img.alt = displayName;
            img.loading = 'lazy';

            if (type === 'factions') {
                img.src = `assets/images/factions/${encodeURIComponent(filterKey)}.png`;
            } else if (type === 'countries') {
                const lh = window.LocationFlagHelpers;
                img.classList.add('event-filter-icon--country');
                img.src = lh && typeof lh.flagSrc === 'function'
                    ? lh.flagSrc(filterKey)
                    : `assets/images/flags/${encodeURIComponent(filterKey)}`;
            } else {
                img.src = `assets/images/heroes/${encodeURIComponent(filterKey)}.png`;
            }

            box.appendChild(img);
            tag.appendChild(box);

            const onActivate = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const mgr = window.eventManager;
                if (!mgr?.prependEventManagerSearchTokens || !mgr.openEventsManagePanel) return;
                if (type === 'heroes') {
                    mgr.prependEventManagerSearchTokens({ heroName: filterKey });
                } else if (type === 'factions') {
                    mgr.prependEventManagerSearchTokens({ factionFilename: filterKey });
                } else if (type === 'countries') {
                    mgr.prependEventManagerSearchTokens({ countryFlagFilename: filterKey });
                }
                mgr.openEventsManagePanel();
                window.SoundEffectsManager?.play?.('filterConfirm');
            };

            tag.addEventListener('click', onActivate);
            tag.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') onActivate(e);
            });

            return tag;
        };
        
        if (event && eventFiltersSection && eventFiltersList) {
            eventFiltersList.innerHTML = '';
            
            const heroFilters = event.filters || [];
            const factionFilters = event.factions || [];
            const countryFlagFiles = collectCountryFlagFilesForEvent(event);

            const resolvedFactionRows = [];
            factionFilters.forEach((faction) => {
                const resolvedFilename = resolveFactionFilename(faction);
                if (!resolvedFilename) return;
                resolvedFactionRows.push({ faction, resolvedFilename });
            });
            
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
            
            // Display factions section (only entries that resolve to manifest — skips removed/unknown factions)
            const getManifestFactions = () => (
                (window.eventManager && Array.isArray(window.eventManager.factions) && window.eventManager.factions.length > 0)
                    ? window.eventManager.factions
                    : (window.globeController?.dataModel?.factions || [])
            );

            /** Same rules as {@link EventFormService.populateEditForm} so slide chips match the edit modal. */
            const resolveFactionDisplayLabel = (rawFaction, manifestFilename) => {
                const raw = String(rawFaction ?? '').trim();
                const mf = getManifestFactions();
                const manifest = Array.isArray(mf) ? mf : [];
                const fh = typeof window !== 'undefined' ? window.FactionMatchHelpers : null;
                const hit = manifest.find((fac) => {
                    const fn = fac?.filename;
                    const dn = fac?.displayName;
                    return fn === raw
                        || dn === raw
                        || (manifestFilename && fn === manifestFilename)
                        || (fh && typeof fh.factionIdsMatch === 'function' && (
                            fh.factionIdsMatch(fn, raw) || fh.factionIdsMatch(dn, raw)
                        ));
                });
                let label = (hit?.displayName || '').trim();
                if (label) return label;
                const em = typeof window !== 'undefined' ? window.eventManager : null;
                if (em && manifestFilename && typeof em.getFactionDisplayTokenForSearch === 'function') {
                    label = String(em.getFactionDisplayTokenForSearch(manifestFilename) || '').trim();
                    if (label) return label;
                }
                const nk = normalizeKey(manifestFilename || '');
                const byFn = manifest.find(x => normalizeKey(x?.filename || '') === nk);
                label = (byFn?.displayName || '').trim();
                if (label) return label;
                return raw.replace(/^\d+/, '').trim();
            };

            if (resolvedFactionRows.length > 0) {
                eventFiltersList.appendChild(
                    createCategoryFilterHeader('Relevant Factions:', CATEGORY_ICON_FACTIONS)
                );

                resolvedFactionRows.forEach(({ faction, resolvedFilename }) => {
                    const displayName = resolveFactionDisplayLabel(faction, resolvedFilename);
                    const tag = createIconTag({
                        filterKey: resolvedFilename,
                        displayName,
                        type: 'factions',
                        factionRawKey: faction
                    });
                    eventFiltersList.appendChild(tag);
                });
            }

            if (countryFlagFiles.length > 0) {
                eventFiltersList.appendChild(
                    createCategoryFilterHeader('Relevant Countries:', CATEGORY_ICON_COUNTRIES)
                );
                countryFlagFiles.forEach((flagFile) => {
                    const label = commonLabelForFlagFile(flagFile);
                    eventFiltersList.appendChild(createIconTag({
                        filterKey: flagFile,
                        displayName: label,
                        type: 'countries'
                    }));
                });
            }
            
            if (heroFilters.length > 0 || resolvedFactionRows.length > 0 || countryFlagFiles.length > 0) {
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
