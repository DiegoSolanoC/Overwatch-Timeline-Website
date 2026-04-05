/**
 * LocationFlagHelpers — flag image next to "City, Country" and fictional / off-world locations.
 * Depends on window.FLAG_FILE_BY_COMMON from src/data/flagFileByCommonName.js.
 */
(function () {
    'use strict';

    var FLAG_DIR = 'assets/images/flags/';
    var LOC_ICON = 'assets/images/icons/Location Icon.png';

    var FICTIONAL = {
        numbani: 'Numbani.png',
        moon: 'Moon.png',
        horizonLunarColony: 'Horizon Lunar Colony.png',
        redPromiseColony: 'Red Promise Colony.png',
        mars: 'Mars.png',
        station: 'Interstellar Journey Space Station.png',
        stationFallback: 'Space Station.png',
        marsShip: 'Mars.png'
    };

    function normalizeKey(s) {
        if (!s) return '';
        return String(s)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function flagSrc(filename) {
        return FLAG_DIR + filename.split('/').map(function (seg) { return encodeURIComponent(seg); }).join('/');
    }

    var ALIASES = {
        usa: 'United States',
        'u.s.a.': 'United States',
        'united states of america': 'United States',
        uk: 'United Kingdom',
        'u.k.': 'United Kingdom',
        'great britain': 'United Kingdom',
        england: 'United Kingdom',
        uae: 'United Arab Emirates',
        'russian federation': 'Russia',
        'south korea': 'South Korea',
        'north korea': 'North Korea',
        'czech republic': 'Czechia',
        turkiye: 'Turkey',
        kurjikstan: 'Kyrgyzstan',
        'democratic republic of the congo': 'DR Congo',
        oceania: 'New Zealand',
        antartica: 'Antarctica'
    };

    /** Trim trailing punctuation from country segment (e.g. "Kurjikstan.", "Antartica?"). */
    function scrubCountrySuffix(s) {
        return String(s || '').trim().replace(/[.?]+$/g, '').trim();
    }

    function resolveCountryToFilename(countryRaw) {
        var map = typeof window !== 'undefined' ? window.FLAG_FILE_BY_COMMON : null;
        if (!map || !countryRaw) return null;
        var t = scrubCountrySuffix(String(countryRaw).trim());
        if (!t) return null;
        if (map[t]) return map[t];
        var nk = normalizeKey(t);
        if (ALIASES[nk]) {
            var canon = ALIASES[nk];
            if (map[canon]) return map[canon];
        }
        var common;
        for (common in map) {
            if (!Object.prototype.hasOwnProperty.call(map, common)) continue;
            if (normalizeKey(common) === nk) return map[common];
        }
        return null;
    }

    /** Full-display overrides (no comma, or non-country suffix handled here). */
    function trySpecialDisplayFile(locationName) {
        var n = (locationName || '').toLowerCase();
        /* Fictional Overwatch locales — run before country parsing */
        if (n.indexOf('numbani') >= 0) return FICTIONAL.numbani;
        if (n.indexOf('horizon lunar') >= 0) return FICTIONAL.horizonLunarColony;
        if (n.indexOf('red promise colony') >= 0 || n.indexOf('red promise escape ship') >= 0) {
            return FICTIONAL.redPromiseColony;
        }
        if (n.indexOf('atlantic arcology') >= 0) return 'Atlantic Arcology.png';
        if (n.indexOf('baltic sea') >= 0) return 'Sweden.png';
        if (n.indexOf('coral sea') >= 0) return 'New Zealand.png';
        if (n.indexOf('ecopoint antarctica') >= 0 || n.indexOf('ecoopint antartica') >= 0 || n.indexOf('ecopoint antartica') >= 0) {
            return 'Antarctica.png';
        }
        if (n.indexOf('secret omnium') >= 0) return 'Antarctica.png';
        if (n.indexOf('watchpoint gibraltar') >= 0) return 'Gibraltar.png';
        if (n.indexOf('gwishin omnium') >= 0) return 'China.png';
        return null;
    }

    function extractCountryFromDisplay(locationName) {
        if (!locationName || typeof locationName !== 'string') return null;
        var idx = locationName.lastIndexOf(',');
        if (idx < 0) return null;
        var c = locationName.slice(idx + 1).trim();
        return c || null;
    }

    function tryFictionalFile(locationName, locationType) {
        var n = (locationName || '').toLowerCase();
        var t = locationType || 'earth';

        if (n.indexOf('numbani') >= 0) return FICTIONAL.numbani;

        if (t === 'marsShip') return FICTIONAL.marsShip;

        if (n.indexOf('promice') >= 0
            || (n.indexOf('escape ship') >= 0 && (n.indexOf('mars') >= 0 || n.indexOf('promise') >= 0))
            || n.indexOf('martian ship') >= 0) {
            return FICTIONAL.marsShip;
        }

        if (n.indexOf('horizon lunar') >= 0) {
            return FICTIONAL.horizonLunarColony;
        }
        if (n.indexOf('lunar') >= 0 && n.indexOf('colony') >= 0) {
            return FICTIONAL.moon;
        }

        if (t === 'station' || n.indexOf('space station') >= 0 || n.indexOf('(iss)') >= 0 || n.indexOf(' iss') >= 0 || n.indexOf('interstellar journey') >= 0) {
            return FICTIONAL.station;
        }

        if (t === 'moon' || (n.indexOf('moon') >= 0 && n.indexOf('mars') < 0)) {
            return FICTIONAL.moon;
        }

        if (t === 'mars' || n.indexOf('mars:') >= 0 || n.indexOf('mars (') >= 0) {
            return FICTIONAL.mars;
        }

        return null;
    }

    function pinImg() {
        return '<img class="event-location-pin" src="' + LOC_ICON + '" alt="" width="28" height="28" decoding="async" />';
    }

    function flagImg(filename) {
        var src = flagSrc(filename);
        var esc = LOC_ICON.replace(/'/g, "\\'");
        return '<img class="event-location-flag" src="' + src + '" alt="" width="52" height="36" decoding="async" onerror="this.onerror=null;this.src=\'' + esc + '\';this.className=\'event-location-pin\';this.width=28;this.height=28;" />';
    }

    /**
     * Which flag PNG would be shown for this location (same rules as the location row). Returns null if pin only.
     */
    function getResolvedFlagFilename(locationName, locationType) {
        var special = trySpecialDisplayFile(locationName);
        if (special) return special;

        var fic = tryFictionalFile(locationName, locationType);
        if (fic) return fic;

        var country = extractCountryFromDisplay(locationName);
        if (country) {
            var fn = resolveCountryToFilename(country);
            if (fn) return fn;
        }

        return null;
    }

    function createLeadingGraphicHtml(locationName, locationType) {
        var fn = getResolvedFlagFilename(locationName, locationType);
        if (fn) return flagImg(fn);
        return pinImg();
    }

    function createLocationRowInnerHtml(locationName, locationType) {
        var text = locationName != null ? String(locationName) : '';
        return createLeadingGraphicHtml(text, locationType) + ' ' + text;
    }

    window.LocationFlagHelpers = {
        createLeadingGraphicHtml: createLeadingGraphicHtml,
        createLocationRowInnerHtml: createLocationRowInnerHtml,
        flagSrc: flagSrc,
        getResolvedFlagFilename: getResolvedFlagFilename
    };
})();
