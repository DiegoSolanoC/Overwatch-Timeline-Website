/**
 * Codex mode: alternate to the timeline globe/map. Unloads WebGL + map layer while keeping events UI.
 */

import { initCodexCanvas, destroyCodexCanvas } from './CodexCanvasService.js';

const CODEX_ROOT_ID = 'codex-view-root';

/**
 * Clears codex placeholder before (re)initializing the globe.
 * @param {HTMLElement|null} [container]
 */
export function clearCodexShellForGlobeInit(container) {
    if (typeof document === 'undefined') return;
    destroyCodexCanvas();
    document.body.classList.remove('codex-mode-active');
    const el = container || document.getElementById('globe-container');
    if (!el) return;
    el.classList.remove('codex-mode');
    if (el.querySelector(`#${CODEX_ROOT_ID}`)) {
        el.innerHTML = '';
    }
}

export function applyCodexShell() {
    const container = document.getElementById('globe-container');
    if (!container) return;

    container.innerHTML = '';
    const root = document.createElement('div');
    root.id = CODEX_ROOT_ID;
    root.className = 'codex-view-root';
    root.setAttribute('aria-label', 'Codex');
    container.appendChild(root);

    container.style.display = 'block';
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
    container.style.width = '100%';
    container.style.height = '100%';
    container.classList.remove('loaded');
    container.classList.add('codex-mode');
    document.body.classList.add('codex-mode-active');

    initCodexCanvas(root);

    try {
        if (window.NavigationPaginationHelpers?.clearEventPageSliderSuppressFromGlobe) {
            window.NavigationPaginationHelpers.clearEventPageSliderSuppressFromGlobe();
        }
    } catch (_) { /* ignore */ }
}

export async function enterCodexMode() {
    if (document.body.classList.contains('codex-mode-active') && !window.loadedComponents?.globeBase) {
        return;
    }

    if (typeof window.unloadGlobeBase !== 'function') {
        return;
    }

    const gc = window.globeController;
    if (gc?.uiView) {
        window.__codexEventSlideBridge = {
            eventSlideManager: gc.uiView.eventSlideManager,
            uiView: gc.uiView,
            dataModel: gc.dataModel
        };
    }

    if (window.loadedComponents?.globeBase) {
        await window.unloadGlobeBase({ preserveEventsUi: true });
    }

    applyCodexShell();

    try {
        localStorage.setItem('currentMode', 'codex');
    } catch (_) { /* ignore */ }

    try {
        window.dispatchEvent(new CustomEvent('appmodechange', { detail: { mode: 'codex' } }));
    } catch (_) { /* ignore */ }
}

if (typeof window !== 'undefined') {
    window.CodexModeService = {
        enterCodexMode,
        applyCodexShell,
        clearCodexShellForGlobeInit
    };
}
