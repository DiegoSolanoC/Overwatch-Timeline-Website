/**
 * Passive hover preview under the Event Manager header button (mirrors music "now playing" badge).
 */

let badgeEl = null;
let textNumberEl = null;
let textTitleEl = null;
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

function ensureBadge() {
    if (badgeEl) return;
    badgeEl = document.createElement('div');
    badgeEl.id = 'eventsHoverPreviewBadge';
    badgeEl.className = 'music-now-playing-badge events-hover-preview-badge';
    badgeEl.style.zIndex = '165';
    badgeEl.setAttribute('aria-hidden', 'true');
    badgeEl.innerHTML = `
        <div class="music-now-playing-label">Event</div>
        <div class="music-now-playing-badge-title-row events-hover-preview-title-row">
            <span class="events-hover-preview-number" aria-hidden="true"></span>
            <div class="events-hover-preview-title-stack">
                <div class="music-now-playing-song events-hover-preview-title"></div>
                <div class="events-hover-preview-variants" aria-hidden="true"></div>
            </div>
        </div>
    `;
    document.body.appendChild(badgeEl);
    textNumberEl = badgeEl.querySelector('.events-hover-preview-number');
    textTitleEl = badgeEl.querySelector('.events-hover-preview-title');
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
 * Multi-variant roots often have no `name`; use first variant as primary title and list the rest.
 * @param {Object|null} eventObj - Root timeline event (may include `variants[]`)
 * @returns {{ primary: string, otherVariants: string[] }}
 */
export function getHoverPreviewLines(eventObj) {
    if (!eventObj) return { primary: '', otherVariants: [] };
    const variants = Array.isArray(eventObj.variants) ? eventObj.variants : [];
    if (variants.length === 0) {
        const single = getPlainEventTitleForHover(eventObj);
        return { primary: single || '', otherVariants: [] };
    }
    const variantTitles = variants.map((v, i) => {
        const t = v ? getPlainEventTitleForHover(v) : '';
        return t && t.trim() ? t.trim() : `Variant ${i + 1}`;
    });
    const parentName = getPlainEventTitleForHover(eventObj);
    const primary = variantTitles[0] || parentName || 'Event';
    const otherVariants = variantTitles.slice(1);
    return { primary, otherVariants };
}

/**
 * @param {number|null|undefined} globalNumber1Based
 * @param {string} titlePlain - Primary line (e.g. first variant or single event name)
 * @param {string[]} [otherVariantTitles] - Additional variant names (smaller text)
 */
export function showEventsHoverPreview(globalNumber1Based, titlePlain, otherVariantTitles) {
    try {
        const panel = document.getElementById('eventsManagePanel');
        if (panel && panel.classList.contains('open')) return;
    } catch (_) {}

    ensureBadge();
    if (textNumberEl) {
        textNumberEl.textContent =
            globalNumber1Based != null && Number.isFinite(globalNumber1Based)
                ? `#${globalNumber1Based}`
                : '';
    }
    if (textTitleEl) textTitleEl.textContent = titlePlain || '';

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

export function hideEventsHoverPreview() {
    stopHoverPreviewFollow();
    if (!badgeEl) return;
    if (textVariantsEl) {
        textVariantsEl.innerHTML = '';
        textVariantsEl.style.display = 'none';
    }
    badgeEl.classList.remove('events-hover-preview-badge--multiline');
    badgeEl.classList.remove('music-now-playing-badge--visible');
}

if (typeof window !== 'undefined') {
    window.EventsHoverPreviewBadge = {
        show: showEventsHoverPreview,
        hide: hideEventsHoverPreview,
        getPlainTitle: getPlainEventTitleForHover,
        getHoverPreviewLines: getHoverPreviewLines
    };
}
