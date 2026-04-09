/**
 * Dev-only: bare range input to spin the sun around world Y (no chrome).
 *
 * Shown when: ?devSun=1, localStorage.devSunSlider=1, or localhost.
 * Yaw: sessionStorage `devSunYawDeg`.
 */

import { applySunBackgroundForViewport } from '../views/helpers/GlobeInitHelpers.js';

const STORAGE_KEY = 'devSunYawDeg';

function isDevSunUiEnabled() {
    if (typeof window === 'undefined') return false;
    try {
        const v = new URLSearchParams(window.location.search).get('devSun');
        if (v === '1' || v === 'true') return true;
    } catch (_) { /* ignore */ }
    try {
        if (window.localStorage.getItem('devSunSlider') === '1') return true;
    } catch (_) { /* ignore */ }
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
}

function readStoredYaw() {
    try {
        const s = window.sessionStorage.getItem(STORAGE_KEY);
        if (s == null) return 0;
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    } catch (_) {
        return 0;
    }
}

function writeStoredYaw(deg) {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, String(deg));
    } catch (_) { /* ignore */ }
}

function applyYawToScene(controller, deg) {
    const sunBg = controller.sceneModel.getSunBackground?.() ?? controller.sceneModel.sunBackground;
    if (!sunBg) return;
    sunBg.sunDevYawDeg = deg;
    applySunBackgroundForViewport(sunBg);
    if (controller.globeView && typeof controller.globeView.syncSunDirectionToShaders === 'function') {
        controller.globeView.syncSunDirectionToShaders();
    }
}

let _installed = false;

/** @param {{ sceneModel: object, globeView: object }} controller */
export function maybeInstallDevSunYawControl(controller) {
    if (_installed || !controller?.sceneModel) return;
    if (!isDevSunUiEnabled()) return;

    _installed = true;

    const wrap = document.createElement('div');
    wrap.setAttribute('data-dev-sun-yaw', '');
    wrap.className = 'dev-sun-yaw-panel';

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'dev-sun-yaw-panel__range';
    range.min = '0';
    range.max = '360';
    range.step = '1';
    range.title = 'Sun yaw (dev, 0–360°)';
    range.setAttribute('aria-label', 'Sun yaw degrees (dev)');

    const initial = readStoredYaw();
    range.value = String(Math.round(((initial % 360) + 360) % 360));

    range.addEventListener('input', () => {
        writeStoredYaw(Number(range.value));
        applyYawToScene(controller, Number(range.value));
    });

    if (typeof range.setPointerCapture === 'function') {
        range.addEventListener('pointerdown', (e) => {
            if (e.pointerId != null) {
                try {
                    range.setPointerCapture(e.pointerId);
                } catch (_) { /* ignore */ }
            }
        });
        range.addEventListener('pointerup', (e) => {
            if (e.pointerId != null && typeof range.releasePointerCapture === 'function') {
                try {
                    if (range.hasPointerCapture(e.pointerId)) range.releasePointerCapture(e.pointerId);
                } catch (_) { /* ignore */ }
            }
        });
    }

    const stopGlobeSteal = (e) => {
        e.stopPropagation();
    };
    const dragEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel'];
    for (const ev of dragEvents) {
        wrap.addEventListener(ev, stopGlobeSteal, false);
    }

    wrap.appendChild(range);

    const host = document.getElementById('globe-container') || document.body;
    host.appendChild(wrap);

    applyYawToScene(controller, Number(range.value));
}
