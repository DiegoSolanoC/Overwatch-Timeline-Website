/**
 * Faction id matching: PNG filenames use a numeric prefix only for sort order (e.g. 26Shambali.png).
 * Event data may store the prefixed filename, bare name, or manifest displayName — all should match
 * the same globe filter chip (filterKey = manifest filename).
 */
(function attachFactionMatchHelpers(global) {
    function normalizeFactionMatchKey(raw) {
        const s = String(raw ?? '').trim();
        if (!s) return '';
        if (/^\d+$/.test(s)) return s.toLowerCase();
        const rest = s.replace(/^\d+/, '').trim();
        const body = (rest || s).replace(/\s+/g, ' ').trim();
        return body.toLowerCase();
    }

    function factionIdsMatch(a, b) {
        const na = normalizeFactionMatchKey(a);
        const nb = normalizeFactionMatchKey(b);
        return na !== '' && na === nb;
    }

    function activeFilterSetMatchesFactionId(activeFilters, factionId) {
        if (factionId == null || !activeFilters || activeFilters.size === 0) return false;
        const id = String(factionId).trim();
        if (!id) return false;
        if (activeFilters.has(id)) return true;
        const idNorm = normalizeFactionMatchKey(id);
        if (!idNorm) return false;
        for (const a of activeFilters) {
            if (normalizeFactionMatchKey(String(a).trim()) === idNorm) return true;
        }
        return false;
    }

    global.FactionMatchHelpers = {
        normalizeFactionMatchKey,
        factionIdsMatch,
        activeFilterSetMatchesFactionId
    };
})(typeof window !== 'undefined' ? window : globalThis);
