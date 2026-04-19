/**
 * Passive hover preview under the Event Manager header button (mirrors music "now playing" badge).
 */

import { getEraHoverPreviewSlug } from './EraHoverPreviewTheme.js';

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

let textPrimaryFlagSlot = null;
let textEraNameEl = null;
let textEraYearsEl = null;

function fillLineFlagSlot(slotEl, entry) {
    if (!slotEl) return;
    slotEl.innerHTML = '';
    const lh = typeof window !== 'undefined' ? window.LocationFlagHelpers : null;
    if (entry && entry.filename && lh && typeof lh.flagSrc === 'function') {
        const img = document.createElement('img');
        img.className = 'events-hover-preview-flag';
        img.src = lh.flagSrc(String(entry.filename).trim());
        img.alt = entry.alt != null ? String(entry.alt).trim() : '';
        img.decoding = 'async';
        img.setAttribute('aria-hidden', 'true');
        slotEl.appendChild(img);
        slotEl.style.display = '';
    } else {
        slotEl.style.display = 'none';
    }
}

function ensureBadge() {
    if (badgeEl) return badgeEl;
    badgeEl = document.createElement('div');
    badgeEl.id = 'eventsHoverPreviewBadge';
    badgeEl.className = 'music-now-playing-badge events-hover-preview-badge';
    badgeEl.style.zIndex = '165';
    badgeEl.setAttribute('aria-hidden', 'true');
    badgeEl.innerHTML = `
        <div class="events-hover-preview-stack">
            <div class="events-hover-preview-era" aria-hidden="true">
                <span class="events-hover-preview-era__name"></span>
                <span class="events-hover-preview-era__years"></span>
            </div>
            <div class="events-hover-preview-mainline">
                <span class="events-hover-preview-number" aria-hidden="true"></span>
                <div class="events-hover-preview-title-column">
                    <div class="events-hover-preview-title-row">
                        <div class="events-hover-preview-line-flag events-hover-preview-line-flag--primary" aria-hidden="true"></div>
                        <span class="events-hover-preview-title"></span>
                    </div>
                    <div class="events-hover-preview-variants" aria-hidden="true"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(badgeEl);
    textPrimaryFlagSlot = badgeEl.querySelector('.events-hover-preview-line-flag--primary');
    textNumberEl = badgeEl.querySelector('.events-hover-preview-number');
    textTitleEl = badgeEl.querySelector('.events-hover-preview-title');
    textEraEl = badgeEl.querySelector('.events-hover-preview-era');
    textEraNameEl = badgeEl.querySelector('.events-hover-preview-era__name');
    textEraYearsEl = badgeEl.querySelector('.events-hover-preview-era__years');
    textVariantsEl = badgeEl.querySelector('.events-hover-preview-variants');
    return badgeEl;
}

function positionBadge() {
    // Anchor to header hub instead of eventsManageToggle (which is now in dock rail)
    // This keeps the hover preview in the header area
    const headerHub = document.getElementById('headerHub');
    const btn = document.getElementById('eventsManageToggle');
    if (!badgeEl) return;
    
    // Use header hub as anchor, fallback to button if hub not found
    const anchorEl = headerHub || btn;
    if (!anchorEl) return;

    const scale = getBodyScale();
    const rect = anchorEl.getBoundingClientRect();
    const gap = 2;
    
    // Position closer to the left side (1/4 from left edge instead of center)
    // This aligns better with the events/world codex buttons area
    const cx = (rect.left + (rect.width / 4)) / scale;
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

function buildRowFlagEntry(eventObj, variantIndex, getLN, lh) {
    if (!eventObj || !lh || typeof lh.getFlagLocationContext !== 'function' || typeof lh.getResolvedFlagFilename !== 'function') {
        return null;
    }
    const ctx = lh.getFlagLocationContext(eventObj, variantIndex, getLN);
    const fn = lh.getResolvedFlagFilename(ctx.locationDisplayText, ctx.displayLocationType);
    if (!fn) return null;
    return { filename: fn, alt: extractCountryFromCityDisplayName(ctx.locationDisplayText) || '' };
}

/**
 * Same flag rules as event list / slide: LocationFlagHelpers.getFlagLocationContext + getResolvedFlagFilename.
 * Multi-variant: one flag per row (parallel to each variant title), not deduped.
 * @param {Object|null} eventObj
 * @param {{ variantIndex?: number }} [options] - Globe markers pass marker.userData.variantIndex (for single-event / root only).
 * @returns {{ primary: string, otherVariants: string[], era: string, primaryRowFlag: object|null, otherRowFlags: (object|null)[], yearLine: string }}
 */
export function getHoverPreviewLines(eventObj, options) {
    if (!eventObj) {
        return {
            primary: '',
            otherVariants: [],
            era: '',
            primaryRowFlag: null,
            otherRowFlags: [],
            yearLine: 'Year Unknown',
        };
    }
    const era =
        typeof window !== 'undefined'
        && window.EventTimelineHelpers
        && typeof window.EventTimelineHelpers.getEraNameTrimmed === 'function'
            ? window.EventTimelineHelpers.getEraNameTrimmed(eventObj)
            : '';
    const yearLine =
        typeof window !== 'undefined'
        && window.EventTimelineHelpers
        && typeof window.EventTimelineHelpers.formatPanelYearRangeLine === 'function'
            ? window.EventTimelineHelpers.formatPanelYearRangeLine(eventObj)
            : 'Year Unknown';

    const getLN =
        typeof window !== 'undefined'
        && window.eventManager
        && typeof window.eventManager.getLocationName === 'function'
            ? (lat, lon) => window.eventManager.getLocationName(lat, lon)
            : null;
    const lh = typeof window !== 'undefined' ? window.LocationFlagHelpers : null;

    const variants = Array.isArray(eventObj.variants) ? eventObj.variants : [];

    if (variants.length === 0) {
        const single = getPlainEventTitleForHover(eventObj);
        const vi = options && options.variantIndex !== undefined ? options.variantIndex : undefined;
        const primaryRowFlag = buildRowFlagEntry(eventObj, vi, getLN, lh);
        return {
            primary: single || '',
            otherVariants: [],
            era,
            primaryRowFlag,
            otherRowFlags: [],
            yearLine,
        };
    }
    const variantTitles = variants.map((v, i) => {
        const t = v ? getPlainEventTitleForHover(v) : '';
        return t && t.trim() ? t.trim() : `Variant ${i + 1}`;
    });
    const parentName = getPlainEventTitleForHover(eventObj);
    const primary = variantTitles[0] || parentName || 'Event';
    const otherVariants = variantTitles.slice(1);
    const primaryRowFlag = buildRowFlagEntry(eventObj, 0, getLN, lh);
    const otherRowFlags = otherVariants.map((_, j) => buildRowFlagEntry(eventObj, j + 1, getLN, lh));
    return { primary, otherVariants, era, primaryRowFlag, otherRowFlags, yearLine };
}

/**
 * @param {number|null|undefined} globalNumber1Based
 * @param {string} titlePlain - Primary line (e.g. first variant or single event name)
 * @param {string[]} [otherVariantTitles] - Additional variant names (smaller text)
 * @param {string} [eraPlain] - Optional era name (root event field); shown under title on hover only
 * @param {object|null} [primaryRowFlag] - Flag before primary title
 * @param {(object|null)[]} [otherRowFlags] - One optional flag per extra variant row (same order as otherVariantTitles)
 * @param {string} [yearLinePlain] - Years after era (smaller); default "Year Unknown"
 */
export function showEventsHoverPreview(
    eventNum,
    plainEventName,
    otherVariantNames,
    eraName,
    primaryRowFlag,
    otherRowFlags,
    yearLine
) {
    console.log('EventsHoverPreviewBadge: show called', { eventNum, plainEventName, eraName });
    const badgeEl = ensureBadge();
    console.log('EventsHoverPreviewBadge: badge element', badgeEl);
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
    
    fillLineFlagSlot(textPrimaryFlagSlot, primaryRowFlag);
    
    if (textNumberEl) {
        textNumberEl.textContent =
            eventNum != null && Number.isFinite(eventNum)
                ? String(eventNum)
                : '';
    }
    if (textTitleEl) textTitleEl.textContent = plainEventName || '';

    const eraTrim = eraName != null ? String(eraName).trim() : '';
    const yearTrim =
        yearLine != null && String(yearLine).trim() !== ''
            ? String(yearLine).trim()
            : 'Year Unknown';

    if (textEraNameEl) {
        textEraNameEl.textContent = eraTrim;
        const eraSlug = getEraHoverPreviewSlug(eraTrim);
        if (eraSlug) {
            textEraNameEl.setAttribute('data-era', eraSlug);
        } else {
            textEraNameEl.removeAttribute('data-era');
        }
    }
    if (textEraYearsEl) {
        textEraYearsEl.textContent = yearTrim;
    }
    if (textEraEl) {
        textEraEl.style.display = '';
        textEraEl.classList.toggle('events-hover-preview-era--nameless', !eraTrim);
    }
    if (badgeEl) {
        badgeEl.classList.toggle('events-hover-preview-badge--no-era', !eraTrim);
    }

    const titlesRaw = Array.isArray(otherVariantNames) ? otherVariantNames : [];
    const flagsParallel = Array.isArray(otherRowFlags) ? otherRowFlags : [];
    let variantRowCount = 0;
    if (textVariantsEl) {
        textVariantsEl.innerHTML = '';
        titlesRaw.forEach((tRaw, idx) => {
            const t = tRaw != null ? String(tRaw).trim() : '';
            if (!t) return;
            variantRowCount++;
            const row = document.createElement('div');
            row.className = 'events-hover-preview-variant-line';
            const flagSlot = document.createElement('div');
            flagSlot.className = 'events-hover-preview-line-flag events-hover-preview-line-flag--secondary';
            fillLineFlagSlot(flagSlot, flagsParallel[idx] || null);
            const span = document.createElement('span');
            span.className = 'events-hover-preview-variant-text';
            span.textContent = t;
            row.appendChild(flagSlot);
            row.appendChild(span);
            textVariantsEl.appendChild(row);
        });
        textVariantsEl.style.display = variantRowCount ? 'block' : 'none';
    }
    if (badgeEl) {
        badgeEl.classList.toggle('events-hover-preview-badge--multiline', variantRowCount > 0);
    }

    badgeEl.classList.add('music-now-playing-badge--visible');
    console.log('EventsHoverPreviewBadge: added visible class, badge in DOM:', document.body.contains(badgeEl));
    positionBadge();
    console.log('EventsHoverPreviewBadge: positionBadge called, badge style:', badgeEl.style.cssText);

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
    // Get header hub directly (button is now in dock rail, not header)
    const hub = document.getElementById('headerHub');
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
            if (textPrimaryFlagSlot) {
                textPrimaryFlagSlot.innerHTML = '';
                textPrimaryFlagSlot.style.display = 'none';
            }
            if (textEraNameEl) {
                textEraNameEl.textContent = '';
                textEraNameEl.removeAttribute('data-era');
            }
            if (textEraYearsEl) textEraYearsEl.textContent = '';
            if (textEraEl) {
                textEraEl.style.display = '';
                textEraEl.classList.remove('events-hover-preview-era--nameless');
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

/**
 * Cleanup function to reset module state when unloading
 * This allows the badge to be recreated on next load
 */
export function cleanupEventsHoverPreview() {
    stopHoverPreviewFollow();
    if (badgeEl && badgeEl.parentNode) {
        badgeEl.parentNode.removeChild(badgeEl);
    }
    badgeEl = null;
    textNumberEl = null;
    textTitleEl = null;
    textEraEl = null;
    textVariantsEl = null;
    textPrimaryFlagSlot = null;
    textEraNameEl = null;
    textEraYearsEl = null;
    cancelPendingHideCleanup();
}

if (typeof window !== 'undefined') {
    window.EventsHoverPreviewBadge = {
        show: showEventsHoverPreview,
        hide: hideEventsHoverPreview,
        getPlainTitle: getPlainEventTitleForHover,
        getHoverPreviewLines: getHoverPreviewLines,
        cleanup: cleanupEventsHoverPreview
    };
}
