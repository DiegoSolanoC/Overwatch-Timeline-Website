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

export function initPaginationDockCollapse() {
    const btn = document.getElementById('paginationDockCollapseBtn');
    if (!btn || btn.dataset.paginationDockCollapseInit === '1') return;
    btn.dataset.paginationDockCollapseInit = '1';

    const setLabels = (collapsed) => {
        if (collapsed) {
            btn.setAttribute('aria-expanded', 'false');
            btn.title = 'Expand thumbnail strip';
            btn.setAttribute('aria-label', 'Expand thumbnail strip');
        } else {
            btn.setAttribute('aria-expanded', 'true');
            btn.title = 'Collapse thumbnail strip';
            btn.setAttribute('aria-label', 'Collapse thumbnail strip');
        }
    };

    try {
        if (localStorage.getItem(STORAGE_KEY) === '1') {
            document.body.classList.add('pagination-dock-collapsed');
            setLabels(true);
        } else {
            setLabels(false);
        }
    } catch (_) {
        setLabels(false);
    }

    if (document.body.classList.contains('pagination-dock-collapsed')) {
        scheduleResize();
    }

    btn.addEventListener('click', () => {
        const nowCollapsed = document.body.classList.toggle('pagination-dock-collapsed');
        setLabels(nowCollapsed);
        try {
            localStorage.setItem(STORAGE_KEY, nowCollapsed ? '1' : '0');
        } catch (_) {}
        scheduleResize();
    });
}

if (typeof window !== 'undefined') {
    window.PaginationDockCollapse = { init: initPaginationDockCollapse, STORAGE_KEY };
}
