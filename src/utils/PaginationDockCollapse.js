/**
 * Pagination dock: toggle compact number-only row vs full thumbnails (desktop).
 * Persists in localStorage on desktop; mobile (narrow or short edge) stays collapsed and locked.
 */

export const PAGINATION_DOCK_COLLAPSED_STORAGE_KEY = 'timeline-pagination-dock-collapsed';

/** Narrow width or short edge — matches event-manager toolbar / phone landscape */
export function isPaginationMobileCompactViewport() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w <= 768 || Math.min(w, h) < 600;
}

/** Notify listeners that only hook window.resize; globe uses ResizeObserver on #globe-container for live sync */
function scheduleResize() {
    requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
    });
}

function setCollapseButtonLabels(btn, collapsed) {
    if (!btn) return;
    if (collapsed) {
        btn.setAttribute('aria-expanded', 'false');
        btn.title = 'Expand thumbnail strip';
        btn.setAttribute('aria-label', 'Expand thumbnail strip');
    } else {
        btn.setAttribute('aria-expanded', 'true');
        btn.title = 'Collapse thumbnail strip';
        btn.setAttribute('aria-label', 'Collapse thumbnail strip');
    }
}

/**
 * After #paginationDock is in the DOM: set collapsed + lock on mobile, else restore from localStorage.
 */
export function applyPaginationDockViewportMode() {
    const btn = document.getElementById('paginationDockCollapseBtn');
    const dock = document.getElementById('paginationDock');
    if (!dock) return;

    const mobile = isPaginationMobileCompactViewport();

    if (mobile) {
        document.body.classList.add('pagination-dock-mobile-locked');
        document.body.classList.add('pagination-dock-collapsed');
        setCollapseButtonLabels(btn, true);
        return;
    }

    document.body.classList.remove('pagination-dock-mobile-locked');
    let collapsed = false;
    try {
        collapsed = localStorage.getItem(PAGINATION_DOCK_COLLAPSED_STORAGE_KEY) === '1';
    } catch (_) {}
    document.body.classList.toggle('pagination-dock-collapsed', collapsed);
    setCollapseButtonLabels(btn, collapsed);
}

/**
 * Same action as clicking the dock collapse handle.
 * @returns {boolean} true if a toggle was applied
 */
export function togglePaginationDockCollapse() {
    if (document.body.classList.contains('pagination-dock-mobile-locked')) {
        return false;
    }
    const btn = document.getElementById('paginationDockCollapseBtn');
    if (!btn) return false;
    const strip = document.getElementById('paginationDockCollapseStrip');
    if (strip) {
        const cs = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(strip) : null;
        if (cs && cs.display === 'none') return false;
    }

    if (window.SoundEffectsManager) {
        window.SoundEffectsManager.play('rotationToggle');
    }

    const nowCollapsed = document.body.classList.toggle('pagination-dock-collapsed');
    setCollapseButtonLabels(btn, nowCollapsed);
    try {
        localStorage.setItem(PAGINATION_DOCK_COLLAPSED_STORAGE_KEY, nowCollapsed ? '1' : '0');
    } catch (_) {}
    scheduleResize();
    return true;
}

export function initPaginationDockCollapse() {
    const btn = document.getElementById('paginationDockCollapseBtn');
    if (!btn || btn.dataset.paginationDockCollapseInit === '1') return;
    btn.dataset.paginationDockCollapseInit = '1';

    btn.addEventListener('click', () => {
        togglePaginationDockCollapse();
    });
}

if (typeof window !== 'undefined') {
    window.PaginationDockCollapse = {
        init: initPaginationDockCollapse,
        toggle: togglePaginationDockCollapse,
        applyViewportMode: applyPaginationDockViewportMode,
        isMobileCompactViewport: isPaginationMobileCompactViewport,
        STORAGE_KEY: PAGINATION_DOCK_COLLAPSED_STORAGE_KEY,
    };
}
