/**
 * When returning from Codex, timeline reload uses a loader inside #globe-container
 * so header, docks, and footer stay visible (no full-screen #loadingOverlay).
 */

let inlineLoadActive = false;

/**
 * Call at the very start of runGlobeComponents. Captures Codex mode before the shell clears.
 * @returns {boolean}
 */
export function beginTimelineInlineLoadIfCodex() {
    inlineLoadActive =
        typeof document !== 'undefined' &&
        document.body.classList.contains('codex-mode-active');
    return inlineLoadActive;
}

export function isTimelineInlineLoadActive() {
    return inlineLoadActive;
}

/**
 * @param {HTMLElement|null} container - #globe-container
 */
export function showGlobeInlineLoader(container) {
    if (!container || typeof document === 'undefined') return;
    hideGlobeInlineLoader();
    container.classList.add('globe-inline-loading');
    const el = document.createElement('div');
    el.id = 'globe-inline-loader';
    el.className = 'globe-inline-loader';
    el.setAttribute('aria-busy', 'true');
    el.setAttribute('aria-label', 'Loading timeline');

    const panel = document.createElement('div');
    panel.className = 'loading-status-overlay';

    const img = document.createElement('img');
    img.className = 'loading-gif';
    img.src = 'assets/images/misc/loading.gif';
    img.alt = 'Loading';

    const title = document.createElement('h3');
    title.textContent = 'Loading Status';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'loading-progress-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'loading-progress-bar';
    progressBar.id = 'globeInlineLoadingProgressBar';
    progressWrap.appendChild(progressBar);

    const statusHost = document.createElement('div');
    statusHost.id = 'globeInlineOverlayStatusContent';

    panel.appendChild(img);
    panel.appendChild(title);
    panel.appendChild(progressWrap);
    panel.appendChild(statusHost);
    el.appendChild(panel);
    container.appendChild(el);
}

export function hideGlobeInlineLoader() {
    if (typeof document === 'undefined') return;
    const globe = document.getElementById('globe-container');
    if (globe) globe.classList.remove('globe-inline-loading');
    const el = document.getElementById('globe-inline-loader');
    if (el) el.remove();
}

export function endTimelineInlineLoad() {
    inlineLoadActive = false;
    hideGlobeInlineLoader();
}

if (typeof window !== 'undefined') {
    window.TimelineInlineLoad = {
        beginTimelineInlineLoadIfCodex,
        isTimelineInlineLoadActive,
        showGlobeInlineLoader,
        hideGlobeInlineLoader,
        endTimelineInlineLoad
    };
}
