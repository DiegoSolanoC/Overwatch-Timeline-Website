/**
 * Desktop pagination dock: toggle compact number-only row vs full thumbnails.
 * Persists in localStorage; dispatches resize for globe / panels using --pagination-dock-height.
 */

const STORAGE_KEY = 'timeline-pagination-dock-collapsed';

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
 * Same action as clicking the dock collapse handle. No-op if the button is not in the DOM
 * (e.g. mobile / no dock layout).
 * @returns {boolean} true if a toggle was applied
 */
export function togglePaginationDockCollapse() {
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
        localStorage.setItem(STORAGE_KEY, nowCollapsed ? '1' : '0');
    } catch (_) {}
    scheduleResize();
    return true;
}

export function initPaginationDockCollapse() {
    const btn = document.getElementById('paginationDockCollapseBtn');
    if (!btn || btn.dataset.paginationDockCollapseInit === '1') return;
    btn.dataset.paginationDockCollapseInit = '1';

    try {
        if (localStorage.getItem(STORAGE_KEY) === '1') {
            document.body.classList.add('pagination-dock-collapsed');
            setCollapseButtonLabels(btn, true);
        } else {
            setCollapseButtonLabels(btn, false);
        }
    } catch (_) {
        setCollapseButtonLabels(btn, false);
    }

    if (document.body.classList.contains('pagination-dock-collapsed')) {
        scheduleResize();
    }

    btn.addEventListener('click', () => {
        togglePaginationDockCollapse();
    });
}

if (typeof window !== 'undefined') {
    window.PaginationDockCollapse = {
        init: initPaginationDockCollapse,
        toggle: togglePaginationDockCollapse,
        STORAGE_KEY,
    };
}
