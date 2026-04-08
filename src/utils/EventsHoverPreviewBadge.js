/**
 * Passive hover preview under the Event Manager header button (mirrors music "now playing" badge).
 */

let badgeEl = null;
let textNumberEl = null;
let textTitleEl = null;
let textEraEl = null;
let textVariantsEl = null;
let hoverPreviewFollowCleanup = null;

function stopHoverPreviewFollow() {
    if (hoverPreviewFollowCleanup) {
        try {
            hoverPreviewFollowCleanup();
        } catch (_) {}
        hoverPreviewFollowCleanup = null;
    }
}

function getBodyScale() {
    try {
        const t = window.getComputedStyle(document.body).transform;
        if (!t || t === 'none') return 1;
        const m = t.match(/^matrix\(([^)]+)\)$/);
        if (!m) return 1;
        const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
        const a = parts[0];
        return Number.isFinite(a) && a > 0 ? a : 1;
    } catch (_) {
        return 1;
    }
}

let textFlagEl = null;

function ensureBadge() {
    if (badgeEl) return;
    badgeEl = document.createElement('div');
    badgeEl.id = 'eventsHoverPreviewBadge';
    badgeEl.className = 'music-now-playing-badge events-hover-preview-badge';
    badgeEl.style.zIndex = '165';
    badgeEl.setAttribute('aria-hidden', 'true');
    badgeEl.innerHTML = `
        <div class="events-hover-preview-stack">
            <div class="events-hover-preview-era" aria-hidden="true"></div>
            <div class="events-hover-preview-mainline">
                <img class="events-hover-preview-flag" aria-hidden="true" alt="" />
                <span class="events-hover-preview-number" aria-hidden="true"></span>
                <div class="events-hover-preview-title-column">
                    <span class="events-hover-preview-title"></span>
                    <div class="events-hover-preview-variants" aria-hidden="true"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(badgeEl);
    textFlagEl = badgeEl.querySelector('.events-hover-preview-flag');
    textNumberEl = badgeEl.querySelector('.events-hover-preview-number');
    textTitleEl = badgeEl.querySelector('.events-hover-preview-title');
    textEraEl = badgeEl.querySelector('.events-hover-preview-era');
    textVariantsEl = badgeEl.querySelector('.events-hover-preview-variants');
}

function positionBadge() {
    const btn = document.getElementById('eventsManageToggle');
    if (!btn || !badgeEl) return;

    const scale = getBodyScale();
    const rect = btn.getBoundingClientRect();
    const gap = 2;
    const cx = (rect.left + rect.width / 2) / scale;
    const top = (rect.bottom + gap) / scale;

    const vw = Math.max(1, (window.innerWidth || 1) / scale);
    const margin = 8;
    const w = badgeEl.offsetWidth || 320;
    const half = w / 2;
    let left = cx;
    if (left - half < margin) left = half + margin;
    if (left + half > vw - margin) left = vw - half - margin;

    badgeEl.style.left = `${left}px`;
    badgeEl.style.top = `${top}px`;
}

/** Plain-text event title for hover preview (strips HTML from name). */
export function getPlainEventTitleForHover(eventObj) {
    if (!eventObj) return '';
    const raw = (eventObj.name != null ? String(eventObj.name) : '').trim();
    if (!raw) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = raw;
    const t = (tmp.textContent || tmp.innerText || '').trim();
    return t || raw.replace(/<[^>]+>/g, '');
}

/**
 * Extract country name from cityDisplayName (e.g., "London, United Kingdom" -> "United Kingdom")
 * @param {string} cityDisplayName
 * @returns {string}
 */
function extractCountryFromCityDisplayName(cityDisplayName) {
    if (!cityDisplayName || typeof cityDisplayName !== 'string') return '';
    const parts = cityDisplayName.split(',');
    if (parts.length >= 2) {
        return parts[parts.length - 1].trim();
    }
    return '';
}

/**
 * Multi-variant roots often have no `name`; use first variant as primary title and list the rest.
 * @param {Object|null} eventObj - Root timeline event (may include `variants[]`)
 * @returns {{ primary: string, otherVariants: string[], era: string, primaryCountry: string }}
 */
export function getHoverPreviewLines(eventObj) {
    if (!eventObj) return { primary: '', otherVariants: [], era: '', primaryCountry: '' };
    const era =
        typeof window !== 'undefined'
        && window.EventTimelineHelpers
        && typeof window.EventTimelineHelpers.getEraNameTrimmed === 'function'
            ? window.EventTimelineHelpers.getEraNameTrimmed(eventObj)
            : '';
    
    // Get primary country from first variant's cityDisplayName or root event's cityDisplayName
    let primaryCountry = '';
    const variants = Array.isArray(eventObj.variants) ? eventObj.variants : [];
    if (variants.length > 0 && variants[0] && variants[0].cityDisplayName) {
        primaryCountry = extractCountryFromCityDisplayName(variants[0].cityDisplayName);
    }
    if (!primaryCountry && eventObj.cityDisplayName) {
        primaryCountry = extractCountryFromCityDisplayName(eventObj.cityDisplayName);
    }
    
    if (variants.length === 0) {
        const single = getPlainEventTitleForHover(eventObj);
        return { primary: single || '', otherVariants: [], era, primaryCountry };
    }
    const variantTitles = variants.map((v, i) => {
        const t = v ? getPlainEventTitleForHover(v) : '';
        return t && t.trim() ? t.trim() : `Variant ${i + 1}`;
    });
    const parentName = getPlainEventTitleForHover(eventObj);
    const primary = variantTitles[0] || parentName || 'Event';
    const otherVariants = variantTitles.slice(1);
    return { primary, otherVariants, era, primaryCountry };
}

/**
 * @param {number|null|undefined} globalNumber1Based
 * @param {string} titlePlain - Primary line (e.g. first variant or single event name)
 * @param {string[]} [otherVariantTitles] - Additional variant names (smaller text)
 * @param {string} [eraPlain] - Optional era name (root event field); shown under title on hover only
 * @param {string} [primaryCountry] - Optional primary country for flag display
 */
export function showEventsHoverPreview(globalNumber1Based, titlePlain, otherVariantTitles, eraPlain, primaryCountry) {
    try {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
            return;
        }
    } catch (_) {}
    try {
        const panel = document.getElementById('eventsManagePanel');
        if (panel && panel.classList.contains('open')) return;
    } catch (_) {}

    // Cancel any pending hide cleanup when showing new content
    cancelPendingHideCleanup();

    ensureBadge();
    
    // Remove hiding state if present
    badgeEl.classList.remove('events-hover-preview-badge--hiding');
    
    // Set flag if primary country provided
    if (textFlagEl) {
        const countryTrim = primaryCountry != null ? String(primaryCountry).trim() : '';
        if (countryTrim) {
            textFlagEl.src = `assets/images/flags/${countryTrim}.png`;
            textFlagEl.alt = countryTrim;
            textFlagEl.style.display = 'inline-block';
        } else {
            textFlagEl.src = '';
            textFlagEl.alt = '';
            textFlagEl.style.display = 'none';
        }
    }
    
    if (textNumberEl) {
        textNumberEl.textContent =
            globalNumber1Based != null && Number.isFinite(globalNumber1Based)
                ? String(globalNumber1Based)
                : '';
    }
    if (textTitleEl) textTitleEl.textContent = titlePlain || '';

    const eraTrim = eraPlain != null ? String(eraPlain).trim() : '';
    if (textEraEl) {
        textEraEl.textContent = eraTrim;
        textEraEl.style.display = eraTrim ? 'block' : 'none';
    }
    if (badgeEl) {
        badgeEl.classList.toggle('events-hover-preview-badge--no-era', !eraTrim);
    }

    const extras = Array.isArray(otherVariantTitles) ? otherVariantTitles.filter((t) => t && String(t).trim()) : [];
    if (textVariantsEl) {
        textVariantsEl.innerHTML = '';
        extras.forEach((t) => {
            const row = document.createElement('div');
            row.className = 'events-hover-preview-variant-line';
            row.textContent = String(t).trim();
            textVariantsEl.appendChild(row);
        });
        textVariantsEl.style.display = extras.length ? 'block' : 'none';
    }
    if (badgeEl) {
        badgeEl.classList.toggle('events-hover-preview-badge--multiline', extras.length > 0);
    }

    badgeEl.classList.add('music-now-playing-badge--visible');
    positionBadge();

    stopHoverPreviewFollow();
    let pending = null;
    const schedule = () => {
        if (pending != null) return;
        pending = requestAnimationFrame(() => {
            pending = null;
            if (!badgeEl || !badgeEl.classList.contains('music-now-playing-badge--visible')) return;
            try {
                const p = document.getElementById('eventsManagePanel');
                if (p && p.classList.contains('open')) {
                    hideEventsHoverPreview();
                    return;
                }
            } catch (_) {}
            positionBadge();
        });
    };
    const onScroll = () => schedule();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    const anchorBtn = document.getElementById('eventsManageToggle');
    const hub = anchorBtn && anchorBtn.closest ? anchorBtn.closest('.header-hub') : null;
    if (hub) hub.addEventListener('scroll', onScroll);
    hoverPreviewFollowCleanup = () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
        if (hub) hub.removeEventListener('scroll', onScroll);
        if (pending != null) {
            cancelAnimationFrame(pending);
            pending = null;
        }
    };
}

let hideTimeoutId = null;

function cancelPendingHideCleanup() {
    if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
    }
}

export function hideEventsHoverPreview() {
    stopHoverPreviewFollow();
    if (!badgeEl) return;
    
    // Clear any pending hide cleanup
    cancelPendingHideCleanup();
    
    // Add hiding class to trigger slide-out animation
    badgeEl.classList.add('events-hover-preview-badge--hiding');
    badgeEl.classList.remove('music-now-playing-badge--visible');
    
    // Delay the cleanup until after the slide-out animation completes (200ms + buffer)
    hideTimeoutId = setTimeout(() => {
        hideTimeoutId = null;
        if (!badgeEl) return;
        // Only clean up if still in hiding state (not re-shown)
        if (!badgeEl.classList.contains('music-now-playing-badge--visible')) {
            if (textFlagEl) {
                textFlagEl.src = '';
                textFlagEl.alt = '';
                textFlagEl.style.display = 'none';
            }
            if (textEraEl) {
                textEraEl.textContent = '';
                textEraEl.style.display = 'none';
            }
            if (textVariantsEl) {
                textVariantsEl.innerHTML = '';
                textVariantsEl.style.display = 'none';
            }
            badgeEl.classList.remove('events-hover-preview-badge--multiline');
            badgeEl.classList.remove('events-hover-preview-badge--no-era');
            badgeEl.classList.remove('events-hover-preview-badge--hiding');
        }
    }, 250);
}

if (typeof window !== 'undefined') {
    window.EventsHoverPreviewBadge = {
        show: showEventsHoverPreview,
        hide: hideEventsHoverPreview,
        getPlainTitle: getPlainEventTitleForHover,
        getHoverPreviewLines: getHoverPreviewLines
    };
}
