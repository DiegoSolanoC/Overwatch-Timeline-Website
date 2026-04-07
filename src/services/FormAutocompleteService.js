/**
 * FormAutocompleteService - Comma-token autocomplete for edit modal & inline slide editor
 * Matches event-manager search: prefix (startsWith) filtering, hero/faction/country icons in suggestions.
 */

class FormAutocompleteService {
    constructor() {
        this.autocompleteLists = new Map();
    }

    /**
     * @param {HTMLElement} input
     * @param {Array} options - heroes: string[]; factions: { filename, displayName }[]; countries: string[] (common names)
     * @param {string} type - 'heroes' | 'factions' | 'countries'
     */
    setupAutocomplete(input, options, type) {
        if (input.dataset.autocompleteSetup === 'true') {
            return;
        }
        input.dataset.autocompleteSetup = 'true';

        let autocompleteList = null;

        const removeList = () => {
            if (autocompleteList) {
                autocompleteList.remove();
                autocompleteList = null;
            }
            this.autocompleteLists.delete(input);
        };

        const getCurrentSegment = (value) => {
            const lastComma = value.lastIndexOf(',');
            return lastComma >= 0 ? value.slice(lastComma + 1).trim() : value.trim();
        };

        const existingTokensLower = (value) => {
            const set = new Set();
            value.split(',').forEach((s) => {
                const t = s.trim().toLowerCase();
                if (t) set.add(t);
            });
            return set;
        };

        const buildMatches = (value) => {
            const segment = getCurrentSegment(value);
            if (!segment) return [];
            const prefix = segment.toLowerCase();
            const existing = existingTokensLower(value);
            const max = 8;

            if (type === 'heroes') {
                const heroes = Array.isArray(options) ? options : [];
                return heroes.filter((h) => {
                    const name = String(h || '');
                    return name.toLowerCase().startsWith(prefix) && !existing.has(name.toLowerCase());
                }).slice(0, max);
            }

            if (type === 'factions') {
                let facs = Array.isArray(options) ? options : [];
                if (facs.length > 0 && typeof facs[0] === 'string') {
                    facs = facs.map((dn) => ({ displayName: dn, filename: dn }));
                }
                return facs.filter((f) => {
                    if (!f || f.displayName == null) return false;
                    const dn = String(f.displayName).trim();
                    return dn.toLowerCase().startsWith(prefix) && !existing.has(dn.toLowerCase());
                }).slice(0, max);
            }

            if (type === 'countries') {
                const names = Array.isArray(options) ? options : [];
                return names.filter((opt) => {
                    const o = String(opt || '');
                    return o.toLowerCase().startsWith(prefix) && !existing.has(o.toLowerCase());
                }).slice(0, max);
            }

            return [];
        };

        const appendPickRow = (listEl, matchHeroName, matchFaction, matchCountry, onPick) => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'filter-autocomplete-item';

            const img = document.createElement('img');
            img.className = 'filter-autocomplete-item-icon';
            img.alt = '';
            img.decoding = 'async';
            img.onerror = () => { img.style.visibility = 'hidden'; };

            let labelText = '';
            let detailText = '';

            if (matchHeroName != null) {
                labelText = matchHeroName;
                detailText = 'Hero';
                img.src = `assets/images/heroes/${encodeURIComponent(matchHeroName)}.png`;
                img.className += ' filter-autocomplete-item-icon--hero';
            } else if (matchFaction != null) {
                labelText = matchFaction.displayName;
                detailText = 'Faction';
                img.src = `assets/images/factions/${encodeURIComponent(matchFaction.filename)}.png`;
                img.className += ' filter-autocomplete-item-icon--faction';
            } else if (matchCountry != null) {
                labelText = matchCountry;
                detailText = 'Country';
                const map = typeof window !== 'undefined' ? window.FLAG_FILE_BY_COMMON : null;
                const file = map ? map[matchCountry] : null;
                const flagSrc = window.LocationFlagHelpers && typeof window.LocationFlagHelpers.flagSrc === 'function'
                    ? window.LocationFlagHelpers.flagSrc
                    : null;
                if (file && flagSrc) {
                    img.src = flagSrc(file);
                    img.className += ' filter-autocomplete-item-icon--flag';
                } else {
                    img.style.display = 'none';
                }
            }

            const labelSpan = document.createElement('span');
            labelSpan.className = 'filter-autocomplete-item-label';
            labelSpan.textContent = labelText;

            const detailSpan = document.createElement('span');
            detailSpan.className = 'filter-autocomplete-item-detail';
            detailSpan.textContent = detailText;

            row.appendChild(img);
            row.appendChild(labelSpan);
            row.appendChild(detailSpan);
            row.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick();
            });
            listEl.appendChild(row);
        };

        input.addEventListener('input', () => {
            const value = input.value;
            const lastComma = value.lastIndexOf(',');
            removeList();

            const matches = buildMatches(value);
            if (matches.length === 0) {
                return;
            }

            autocompleteList = document.createElement('div');
            autocompleteList.className = 'filter-autocomplete-list';

            const rect = input.getBoundingClientRect();
            autocompleteList.style.left = `${rect.left}px`;
            autocompleteList.style.top = `${rect.bottom + 4}px`;
            autocompleteList.style.width = `${Math.max(rect.width, 220)}px`;

            const applyPick = (insertText) => {
                const before = lastComma >= 0 ? value.slice(0, lastComma + 1) + ' ' : '';
                input.value = `${before}${insertText}, `;
                input.focus();
                removeList();
            };

            if (type === 'heroes') {
                matches.forEach((h) => {
                    appendPickRow(autocompleteList, h, null, null, () => applyPick(h));
                });
            } else if (type === 'factions') {
                matches.forEach((f) => {
                    appendPickRow(autocompleteList, null, f, null, () => applyPick(f.displayName));
                });
            } else if (type === 'countries') {
                matches.forEach((name) => {
                    appendPickRow(autocompleteList, null, null, name, () => applyPick(name));
                });
            }

            document.body.appendChild(autocompleteList);
            this.autocompleteLists.set(input, autocompleteList);
        });

        input.addEventListener('blur', () => {
            setTimeout(removeList, 200);
        });
    }

    clearAll() {
        this.autocompleteLists.forEach((list) => {
            if (list && list.parentNode) {
                list.remove();
            }
        });
        this.autocompleteLists.clear();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormAutocompleteService;
}

if (typeof window !== 'undefined') {
    window.FormAutocompleteService = FormAutocompleteService;
}
