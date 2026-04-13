/**
 * Map2DLiteLayer — DOM/CSS flat Earth map for map view (no WebGL render).
 * Earth markers on the equirectangular layer. Moon/Mars/Orbit panels are laid out in DOM from camera frustum math
 * and each rig’s local Y scale (squash animation only); map mode does not depend on WebGL rig world positions.
 */
import {
    shouldEventBeLocked,
    getMarkerColor,
    getMap2dLiteMarkerDiameterPx,
    EVENT_MARKER_LOCKED_HEX
} from '../managers/helpers/MarkerCreationHelpers.js';
import { getMoonTexturePath, getMarsTexturePath, getOrbitTexturePath } from '../views/helpers/GlobePlaneHelpers.js';

function readPaletteKey() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('colorPalette') : null;
    if (saved === 'gray') return 'gray';
    if (saved === 'crimson') return 'crimson';
    if (saved === 'nulled') return 'nulled';
    return 'blue';
}

function texturePathForPalette(key) {
    if (key === 'gray') return 'assets/images/maps/MAP Black.png';
    if (key === 'crimson') return 'assets/images/maps/MAP Crimson.png';
    if (key === 'nulled') return 'assets/images/maps/MAP Nulled.png';
    return 'assets/images/maps/MAP.png';
}

function resolveEventImagePath(displayEvent, eventName) {
    if (window.eventManager && typeof window.eventManager.getEventImagePath === 'function') {
        return window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
    }
    let eventImage = displayEvent.image || null;
    if (!eventImage || !String(eventImage).trim()) {
        const normalizedName = eventName.replace(/\s+/g, ' ').trim();
        return `assets/images/events/${encodeURIComponent(normalizedName)}.png`;
    }
    return String(eventImage).trim();
}

function hexToCss(hex) {
    const n = hex >>> 0;
    return `#${n.toString(16).padStart(6, '0')}`;
}

function hexToRgb(hex) {
    const n = (hex >>> 0) & 0xffffff;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Match {@link MarkerInteractionService#checkEventMarkerHover}: no hover pulse on touch devices. */
function isTouchHoverDisabled() {
    if (typeof window === 'undefined') return true;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** Same test as {@link MarkerPulseService#isAwakeningEventMarker} (root event name). */
export function isMap2dLiteAwakeningEvent(event) {
    const name = event?.name;
    return typeof name === 'string' && name.trim().toLowerCase() === 'the awakening';
}

/**
 * Max CSS scale for a filled disk to reach farthest map corner from (u,v), ×1.18 like WebGL overshoot.
 * @param {number} u - lon fraction 0..1
 * @param {number} v - lat fraction 0..1
 */
function awakeningWaveMaxScale(u, v, baseW, baseH, markerDiameterPx) {
    const cx = u * baseW;
    const cy = v * baseH;
    const corners = [[0, 0], [baseW, 0], [0, baseH], [baseW, baseH]];
    let maxDist = 0;
    for (let i = 0; i < corners.length; i++) {
        const d = Math.hypot(corners[i][0] - cx, corners[i][1] - cy);
        if (d > maxDist) maxDist = d;
    }
    const r = Math.max(markerDiameterPx / 2, 4);
    return Math.max(16, (maxDist * 1.18) / r);
}

/** Matches MarkerPulseService: 1200+300 and 2600+300 between radiate plays. */
const DOM_LITE_RADIATE_INTERVAL_NORMAL_MS = 1500;
const DOM_LITE_RADIATE_INTERVAL_AWAKENING_MS = 2900;

/** Match {@link MarkerAnimationHelpers} grow/shrink duration. */
const DOM_LITE_MARKER_TRANSITION_MS = 300;

/** Match {@link MarkerLockAnimationHelpers} lock/unlock duration. */
const MAP2D_LOCK_TRANSITION_MS = 300;

/** Match celestial {@link GlobePlaneHelpers#createCelestialPlane} default size (world units). */
const CELESTIAL_PLANE_WORLD = 0.4;

/**
 * Fine-tune on top of map-scale sizing (markers use {@link Map2DLiteLayer#_scale} because they sit outside the
 * scaled `.map-2d-lite__world`; panels use the same effective factor here).
 */
const CELESTIAL_DOM_PANEL_VISUAL_SCALE = 1.12;

/** Cap effective scale so panels do not dominate the view at extreme map zoom. */
const MAP2D_CELESTIAL_PANEL_MAX_ZOOM_MULT = 3;

/** Narrow viewports: shrink Moon/Mars/Orbit DOM hosts so the map stays usable. */
function map2dLiteCelestialMobileSizeFactor() {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w <= 480) return 0.52;
    if (w <= 768) return 0.66;
    return 1;
}

/** Match {@link PlaneManager#updatePlanePositions} map-view panel depth offset. */
const MAP_VIEW_CELESTIAL_Z_OFFSET = 0.18;

/** Match {@link PlaneManager} MAP_VIEW_CELESTIAL_OPACITY */
const MAP2D_CELESTIAL_IMG_OPACITY = 0.55;

/**
 * Count Earth markers the lite map would render for `events` (same rules as {@link Map2DLiteLayer#syncMarkers} loop).
 * @param {object[]} events
 */
function countRenderableEarthMarkers(events) {
    let n = 0;
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const displayEvent = event.variants && event.variants.length > 0 ? event.variants[0] : event;
        const lt = displayEvent.locationType || event.locationType || 'earth';
        if (lt !== 'earth') continue;
        const lat = displayEvent.lat !== undefined ? displayEvent.lat : event.lat;
        const lon = displayEvent.lon !== undefined ? displayEvent.lon : event.lon;
        if (lat != null && lon != null) n++;
    }
    return n;
}

/**
 * @param {import('../models/DataModel.js').DataModel} dataModel
 * @returns {{ hasMoon: boolean, hasMars: boolean, hasOrbit: boolean }}
 */
function currentPageCelestialFlags(dataModel) {
    let hasMoon = false;
    let hasMars = false;
    let hasOrbit = false;
    const currentPageEvents = dataModel?.getEventsForCurrentPage?.() || [];
    for (let i = 0; i < currentPageEvents.length; i++) {
        const event = currentPageEvents[i];
        const rootLt = event.locationType || 'earth';
        const visit = (loc) => {
            if (loc === 'moon') hasMoon = true;
            if (loc === 'mars') hasMars = true;
            if (loc === 'station' || loc === 'marsShip') hasOrbit = true;
        };
        visit(rootLt);
        if (event.variants && event.variants.length > 0) {
            for (let v = 0; v < event.variants.length; v++) {
                const variantLocationType = event.variants[v].locationType || rootLt;
                visit(variantLocationType);
            }
        }
    }
    return { hasMoon, hasMars, hasOrbit };
}

/** Inset from the map-2d-lite edge for the celestial stack on the right. */
const MAP2D_CELESTIAL_DOM_EDGE_PX = 12;

/** Vertical gap between moon and mars when both are visible (center-right stack). */
const MAP2D_CELESTIAL_STACK_GAP_PX = 10;

/**
 * Base pixel size from camera frustum (0.4 world plane), same basis as map branch of {@link PlaneManager#updatePlanePositions}.
 * {@link Map2DLiteLayer#layoutCelestialPanelsFromCamera} then applies map {@link Map2DLiteLayer#_scale} + visual trim.
 * @param {THREE.Camera} camera
 * @param {THREE.WebGLRenderer} renderer
 * @param {number} [squashY=1] - celestial scale rig Y (open/close squash); does not use rig world position
 * @returns {{ width: number, height: number } | null}
 */
function computeCelestialDomPanelSizePx(camera, renderer, squashY = 1) {
    if (!camera || !renderer?.domElement) return null;

    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const viewportW = Math.max(1, rect.width);
    const viewportH = Math.max(1, rect.height);
    const aspect = viewportW / viewportH;

    const fovRad = (camera.fov * Math.PI) / 180;
    const distance = Math.max(0.01, camera.position.z - MAP_VIEW_CELESTIAL_Z_OFFSET);
    const halfViewH = Math.tan(fovRad / 2) * distance;
    const halfViewW = halfViewH * aspect;

    const sy = squashY;
    return {
        width: Math.max(4, CELESTIAL_PLANE_WORLD * viewportW / (2 * halfViewW)),
        height: Math.max(4, CELESTIAL_PLANE_WORLD * viewportH / (2 * halfViewH) * Math.max(sy, 0.02))
    };
}

/**
 * Same rules as WebGL {@link createMarkerUserData}: main variant = index 0 or single-event;
 * only main is interactive (we only render that dot on the flat map, like hidden non-main meshes).
 */
/**
 * Stub passed to slide / camera / pagination when WebGL Earth markers are omitted (DOM map).
 * @param {object} fullEvent
 * @param {object} displayEvent
 * @param {number|null} variantIndex
 * @param {import('../models/SceneModel.js').SceneModel} sceneModel
 */
export function createMap2dLiteNavigationStub(fullEvent, displayEvent, variantIndex, sceneModel) {
    return makeStubMarker(fullEvent, displayEvent, variantIndex, sceneModel);
}

function makeStubMarker(fullEvent, displayEvent, variantIndex, sceneModel) {
    const filters = sceneModel?.activeFilters || new Set();
    const locked = shouldEventBeLocked(fullEvent, filters);
    const isMainVariant = variantIndex == null || variantIndex === 0;
    const originalColor = getMarkerColor(isMainVariant);
    return {
        userData: {
            isEventMarker: true,
            isInteractive: isMainVariant,
            isLocked: locked,
            event: fullEvent,
            eventName: displayEvent.name || fullEvent.name,
            locationType: displayEvent.locationType || fullEvent.locationType || 'earth',
            variantIndex: variantIndex ?? 0,
            isMainVariant,
            originalColor,
            isMap2dLiteProxy: true
        }
    };
}

export class Map2DLiteLayer {
    /**
     * @param {{ container: HTMLElement, sceneModel: import('../models/SceneModel.js').SceneModel, dataModel: import('../models/DataModel.js').DataModel }} opts
     */
    constructor({ container, sceneModel, dataModel }) {
        this.container = container;
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
        this.root = null;
        this.viewport = null;
        this.world = null;
        this.img = null;
        this.markersEl = null;
        /** Fixed 2:1 logical size (equirectangular); markers use % of this box. */
        this._MAP_BASE_W = 1000;
        this._MAP_BASE_H = 500;
        this._baseW = this._MAP_BASE_W;
        this._baseH = this._MAP_BASE_H;
        this._scale = 1;
        this._tx = 0;
        this._ty = 0;
        /** Minimum scale = “cover” viewport (no letterboxing); updated on resize. */
        this._minScale = 1;
        this._maxScale = 14;
        /** Max zoom relative to cover scale */
        this._maxZoomFactor = 14;
        this._lastVw = -1;
        this._lastVh = -1;
        this._dragging = false;
        this._dragPid = null;
        this._lastClientX = 0;
        this._lastClientY = 0;
        this._moved = false;
        this._moonImg = null;
        this._marsImg = null;
        this._moonHost = null;
        this._marsHost = null;
        this._moonMarkersEl = null;
        this._marsMarkersEl = null;
        this._orbitImg = null;
        this._orbitHost = null;
        this._orbitMarkersEl = null;
        /** Rebuild moon/mars marker dots after filter/page sync. */
        this._celMarkersDirty = true;
        this._lastCelMoonW = -1;
        this._lastCelMarsW = -1;
        this._lastCelOrbitW = -1;
        /** Last map pan-zoom scale; dots must rescale when it changes (they sit outside scaled world). */
        this._lastCelMapScale = -1;
        /** `'pageTurn'` while rebuilding so celestial hosts/dots use enter animation. */
        this._domLiteCelestialEnterMode = 'instant';
        this._onResize = () => {
            if (this.isVisible()) this._syncCoverScaleToViewport();
        };
        this._wheelHandler = (e) => this._onWheel(e);
        this._boundUp = (e) => this._onPointerUp(e);
        this._boundMove = (e) => this._onPointerMove(e);
        /** Stub currently driving {@link playHoverRadiateLoopForStub} */
        this._radiateStub = null;
        this._radiateIntervalId = null;
    }

    /**
     * Play `radiate` on interval while hovering a DOM map marker (WebGL plays it each {@link MarkerPulseService#createPulseRing}).
     * @param {{ userData: object }} stub
     */
    playHoverRadiateLoopForStub(stub) {
        this.stopHoverRadiateLoop();
        if (!stub?.userData || stub.userData.isLocked) return;
        this._radiateStub = stub;
        const play = () => {
            if (window.SoundEffectsManager && typeof window.SoundEffectsManager.play === 'function') {
                window.SoundEffectsManager.play('radiate');
            }
        };
        play();
        const ms = isMap2dLiteAwakeningEvent(stub.userData.event)
            ? DOM_LITE_RADIATE_INTERVAL_AWAKENING_MS
            : DOM_LITE_RADIATE_INTERVAL_NORMAL_MS;
        this._radiateIntervalId = window.setInterval(play, ms);
    }

    stopHoverRadiateLoop() {
        if (this._radiateIntervalId != null) {
            window.clearInterval(this._radiateIntervalId);
            this._radiateIntervalId = null;
        }
        this._radiateStub = null;
    }

    stopHoverRadiateLoopIfStub(stub) {
        if (this._radiateStub === stub) {
            this.stopHoverRadiateLoop();
        }
    }

    /** Remove thumbnail-driven “hover” visuals from map dots (see {@link setSyntheticHoverFromStub}). */
    clearSyntheticMarkerHover() {
        const sel = '.map-2d-lite__marker--synthetic-hover';
        [this.markersEl, this._moonMarkersEl, this._marsMarkersEl, this._orbitMarkersEl].forEach((root) => {
            root?.querySelectorAll(sel).forEach((el) => {
                el.classList.remove('map-2d-lite__marker--synthetic-hover');
            });
        });
    }

    /**
     * Apply the same CSS as pointer :hover on the matching Earth marker when pagination thumbnails are hovered.
     * @param {{ userData: { event?: object, variantIndex?: number } }} stub
     */
    setSyntheticHoverFromStub(stub) {
        if (!stub?.userData) return;
        const ev = stub.userData.event;
        const vi = stub.userData.variantIndex ?? 0;
        if (!ev) return;
        const roots = [this.markersEl, this._moonMarkersEl, this._marsMarkersEl, this._orbitMarkersEl].filter(Boolean);
        for (let r = 0; r < roots.length; r++) {
            const markers = roots[r].querySelectorAll('.map-2d-lite__marker:not(:disabled)');
            for (let i = 0; i < markers.length; i++) {
                const b = markers[i];
                const id = b.__map2dLiteIdentity;
                if (id && id.event === ev && (id.variantIndex ?? 0) === vi) {
                    b.classList.add('map-2d-lite__marker--synthetic-hover');
                    return;
                }
            }
        }
    }

    /**
     * DOM-lite navigation stub for a variant (Earth + moon/mars panels).
     * @param {object} eventData
     * @param {number} variantIndex
     * @returns {{ userData: object } | null}
     */
    getStubForVariant(eventData, variantIndex) {
        const vi = variantIndex ?? 0;
        const roots = [this.markersEl, this._moonMarkersEl, this._marsMarkersEl, this._orbitMarkersEl].filter(Boolean);
        for (let r = 0; r < roots.length; r++) {
            const btns = roots[r].querySelectorAll('.map-2d-lite__marker');
            for (let i = 0; i < btns.length; i++) {
                const id = btns[i].__map2dLiteIdentity;
                if (id && id.event === eventData && (id.variantIndex ?? 0) === vi) {
                    return btns[i].__map2dLiteStub || null;
                }
            }
        }
        return null;
    }

    ensureDom() {
        if (this.root) return;

        this.root = document.createElement('div');
        this.root.className = 'map-2d-lite';
        this.viewport = document.createElement('div');
        this.viewport.className = 'map-2d-lite__viewport';
        this.world = document.createElement('div');
        this.world.className = 'map-2d-lite__world';
        this.img = document.createElement('img');
        this.img.className = 'map-2d-lite__map-img';
        this.img.alt = '';
        this.img.draggable = false;
        this.markersEl = document.createElement('div');
        this.markersEl.className = 'map-2d-lite__markers';

        const celest = document.createElement('div');
        celest.className = 'map-2d-lite__celestials';

        this._moonHost = document.createElement('div');
        this._moonHost.className = 'map-2d-lite__celestial-host map-2d-lite__celestial-host--moon';
        this._moonImg = document.createElement('img');
        this._moonImg.className = 'map-2d-lite__celestial-img';
        this._moonImg.alt = '';
        this._moonImg.draggable = false;
        this._moonMarkersEl = document.createElement('div');
        this._moonMarkersEl.className = 'map-2d-lite__celestial-markers';
        this._moonHost.appendChild(this._moonImg);
        this._moonHost.appendChild(this._moonMarkersEl);

        this._marsHost = document.createElement('div');
        this._marsHost.className = 'map-2d-lite__celestial-host map-2d-lite__celestial-host--mars';
        this._marsImg = document.createElement('img');
        this._marsImg.className = 'map-2d-lite__celestial-img';
        this._marsImg.alt = '';
        this._marsImg.draggable = false;
        this._marsMarkersEl = document.createElement('div');
        this._marsMarkersEl.className = 'map-2d-lite__celestial-markers';
        this._marsHost.appendChild(this._marsImg);
        this._marsHost.appendChild(this._marsMarkersEl);

        this._orbitHost = document.createElement('div');
        this._orbitHost.className = 'map-2d-lite__celestial-host map-2d-lite__celestial-host--orbit';
        this._orbitImg = document.createElement('img');
        this._orbitImg.className = 'map-2d-lite__celestial-img';
        this._orbitImg.alt = '';
        this._orbitImg.draggable = false;
        this._orbitMarkersEl = document.createElement('div');
        this._orbitMarkersEl.className = 'map-2d-lite__celestial-markers';
        this._orbitHost.appendChild(this._orbitImg);
        this._orbitHost.appendChild(this._orbitMarkersEl);

        celest.appendChild(this._moonHost);
        celest.appendChild(this._marsHost);
        celest.appendChild(this._orbitHost);

        this.world.appendChild(this.img);
        this.world.appendChild(this.markersEl);
        this.viewport.appendChild(this.world);
        this.root.appendChild(this.viewport);
        this.root.appendChild(celest);
        this.container.appendChild(this.root);

        this.viewport.addEventListener('pointerdown', (e) => this._onPointerDown(e));
        this.viewport.addEventListener('wheel', this._wheelHandler, { passive: false });
        this.viewport.addEventListener('click', (e) => this._onClick(e));
    }

    _mapTexturePath() {
        const p = this.sceneModel.getEarthMapTextureUrl?.() || texturePathForPalette(readPaletteKey());
        return p;
    }

    show() {
        this.ensureDom();
        const palette = readPaletteKey();
        this.img.src = this._mapTexturePath();
        this._moonImg.src = getMoonTexturePath(palette);
        this._marsImg.src = getMarsTexturePath(palette);
        if (this._orbitImg) this._orbitImg.src = getOrbitTexturePath();
        this.root.classList.add('map-2d-lite--visible');
        requestAnimationFrame(() => {
            this._fitAndCenter();
            this.layoutCelestialPanelsFromCamera();
            this.syncMarkers({ mode: 'instant' });
        });
        window.addEventListener('resize', this._onResize);
    }

    /** Update map + celestial images when palette or {@link SceneModel} earth URL changes. */
    refreshTexturesFromScene() {
        if (!this.isVisible() || !this.img) return;
        const palette = readPaletteKey();
        this.img.src = this._mapTexturePath();
        if (this._moonImg) this._moonImg.src = getMoonTexturePath(palette);
        if (this._marsImg) this._marsImg.src = getMarsTexturePath(palette);
        if (this._orbitImg) this._orbitImg.src = getOrbitTexturePath();
    }

    hide() {
        window.removeEventListener('resize', this._onResize);
        this.stopHoverRadiateLoop();
        this.clearSyntheticMarkerHover();
        window.globeController?.interactionController?.markerService?.setDomLiteMarkerHover?.(null);
        this._lastVw = -1;
        this._lastVh = -1;
        this._lastCelMoonW = -1;
        this._lastCelMarsW = -1;
        this._lastCelOrbitW = -1;
        this._lastCelMapScale = -1;
        if (this.root) {
            this.root.classList.remove('map-2d-lite--visible');
        }
        this._dragging = false;
        if (this._dragPid != null) {
            try {
                this.viewport.releasePointerCapture(this._dragPid);
            } catch (_) { /* ignore */ }
            this._dragPid = null;
        }
    }

    isVisible() {
        return !!(this.root && this.root.classList.contains('map-2d-lite--visible'));
    }

    onContainerResize() {
        if (!this.isVisible() || !this.viewport) return;
        const w = Math.max(1, this.viewport.clientWidth);
        const h = Math.max(1, this.viewport.clientHeight);
        if (w !== this._lastVw || h !== this._lastVh) {
            this._lastVw = w;
            this._lastVh = h;
            this._syncCoverScaleToViewport();
        }
        this.layoutCelestialPanelsFromCamera();
    }

    _coverScaleForViewport(vw, vh) {
        return Math.max(vw / this._MAP_BASE_W, vh / this._MAP_BASE_H);
    }

    /**
     * Recompute min zoom (cover) after a real viewport size change; keep pan/zoom in valid range.
     */
    _syncCoverScaleToViewport() {
        if (!this.viewport) return;
        const w = Math.max(1, this.viewport.clientWidth);
        const h = Math.max(1, this.viewport.clientHeight);
        const cover = this._coverScaleForViewport(w, h);
        this._minScale = cover;
        this._maxScale = cover * this._maxZoomFactor;
        if (this._scale < this._minScale) {
            this._scale = this._minScale;
        }
        if (this._scale > this._maxScale) {
            this._scale = this._maxScale;
        }
        this._clampPan();
        this._applyTransform();
        this._lastVw = w;
        this._lastVh = h;
    }

    _fitAndCenter() {
        if (!this.viewport) return;
        const w = Math.max(1, this.viewport.clientWidth);
        const h = Math.max(1, this.viewport.clientHeight);
        this._lastVw = w;
        this._lastVh = h;

        this._baseW = this._MAP_BASE_W;
        this._baseH = this._MAP_BASE_H;
        this.world.style.width = `${this._baseW}px`;
        this.world.style.height = `${this._baseH}px`;

        const cover = this._coverScaleForViewport(w, h);
        this._minScale = cover;
        this._maxScale = cover * this._maxZoomFactor;
        this._scale = cover;

        const sw = this._baseW * this._scale;
        const sh = this._baseH * this._scale;
        this._tx = (w - sw) / 2;
        this._ty = (h - sh) / 2;
        this._clampPan();
        this._applyTransform();
    }

    /**
     * Moon / Mars / Orbit DOM panels: vertical stack center-right, inset from the right edge.
     * Uses camera + canvas frustum only for pixel size; reads each rig’s scale.y for squash/opacity (same as WebGL panels).
     * Does not use rig world matrices — map sync no longer runs {@link PlaneManager#updatePlanePositions}.
     */
    layoutCelestialPanelsFromCamera() {
        if (!this.isVisible() || !this._moonHost || !this._marsHost || !this._orbitHost || !this.container) return;

        const camera = this.sceneModel?.getCamera?.();
        const renderer = this.sceneModel?.getRenderer?.();
        if (!camera || !renderer?.domElement) return;

        const moonRig = this.sceneModel?.getMoonRig?.() || this.sceneModel?.moonRig;
        const marsRig = this.sceneModel?.getMarsRig?.() || this.sceneModel?.marsRig;
        const orbitRig = this.sceneModel?.getOrbitRig?.() || this.sceneModel?.orbitRig;
        const moonSy = moonRig?.scale?.y ?? 1;
        const marsSy = marsRig?.scale?.y ?? 1;
        const orbitSy = orbitRig?.scale?.y ?? 1;

        const { hasMoon, hasMars, hasOrbit } = currentPageCelestialFlags(this.dataModel);

        const edge = MAP2D_CELESTIAL_DOM_EDGE_PX;
        const gap = MAP2D_CELESTIAL_STACK_GAP_PX;

        const moonSizeRaw = computeCelestialDomPanelSizePx(camera, renderer, moonSy);
        const marsSizeRaw = computeCelestialDomPanelSizePx(camera, renderer, marsSy);
        const orbitSizeRaw = computeCelestialDomPanelSizePx(camera, renderer, orbitSy);
        if (!moonSizeRaw || !marsSizeRaw || !orbitSizeRaw) return;

        const minS = Math.max(1e-6, this._minScale);
        /* Match marker sizing: dots use diameter × _scale; panels are not inside scaled world, so × min(_scale, cap·min). */
        const panelMapScale = Math.min(this._scale, minS * MAP2D_CELESTIAL_PANEL_MAX_ZOOM_MULT);
        const mobileFac = map2dLiteCelestialMobileSizeFactor();
        const applyMapScaleToPanel = (raw) => ({
            width: Math.max(4, Math.round(raw.width * panelMapScale * CELESTIAL_DOM_PANEL_VISUAL_SCALE * mobileFac)),
            height: Math.max(4, Math.round(raw.height * panelMapScale * CELESTIAL_DOM_PANEL_VISUAL_SCALE * mobileFac))
        });
        const moonSize = applyMapScaleToPanel(moonSizeRaw);
        const marsSize = applyMapScaleToPanel(marsSizeRaw);
        const orbitSize = applyMapScaleToPanel(orbitSizeRaw);

        const showMoon = hasMoon && moonSy > 0.02;
        const showMars = hasMars && marsSy > 0.02;
        const showOrbit = hasOrbit && orbitSy > 0.02;

        let stackH = 0;
        const rows = [];
        if (showMoon) rows.push(moonSize.height);
        if (showMars) rows.push(marsSize.height);
        if (showOrbit) rows.push(orbitSize.height);
        for (let i = 0; i < rows.length; i++) {
            stackH += rows[i];
            if (i < rows.length - 1) stackH += gap;
        }

        const vh = Math.max(1, this.root.clientHeight);
        let stackTop = (vh - stackH) / 2;
        if (stackTop < edge) stackTop = edge;
        if (stackTop + stackH > vh - edge) {
            stackTop = Math.max(edge, vh - stackH - edge);
        }

        const place = (host, squashY, show, size, topPx) => {
            host.style.left = 'auto';
            host.style.right = `${edge}px`;
            host.style.bottom = 'auto';
            const sy = squashY ?? 1;
            if (!show) {
                host.style.display = 'none';
                host.classList.remove('map-2d-lite__celestial-host--enter');
                return;
            }
            host.style.display = 'block';
            host.style.width = `${size.width}px`;
            host.style.height = `${size.height}px`;
            host.style.top = `${Math.round(topPx)}px`;
            const opacity = MAP2D_CELESTIAL_IMG_OPACITY * Math.min(1, Math.max(sy, 0.08));
            host.style.setProperty('--map2d-celestial-img-opacity', String(opacity));
            if (this._domLiteCelestialEnterMode === 'pageTurn') {
                host.classList.remove('map-2d-lite__celestial-host--enter');
                void host.offsetWidth;
                host.classList.add('map-2d-lite__celestial-host--enter');
                window.setTimeout(() => {
                    host.classList.remove('map-2d-lite__celestial-host--enter');
                }, DOM_LITE_MARKER_TRANSITION_MS + 80);
            }
        };

        let y = stackTop;
        place(this._moonHost, moonSy, showMoon, moonSize, y);
        if (showMoon) y += moonSize.height + (showMars || showOrbit ? gap : 0);
        place(this._marsHost, marsSy, showMars, marsSize, y);
        if (showMars) y += marsSize.height + (showOrbit ? gap : 0);
        place(this._orbitHost, orbitSy, showOrbit, orbitSize, y);

        const mw = this._moonHost.style.display === 'none' ? -1 : Math.round(this._moonHost.clientWidth);
        const mrsw = this._marsHost.style.display === 'none' ? -1 : Math.round(this._marsHost.clientWidth);
        const orw = this._orbitHost.style.display === 'none' ? -1 : Math.round(this._orbitHost.clientWidth);
        const mapScale = this._scale;
        const sizeChanged =
            mw !== this._lastCelMoonW
            || mrsw !== this._lastCelMarsW
            || orw !== this._lastCelOrbitW
            || mapScale !== this._lastCelMapScale
            || this._celMarkersDirty;
        if (sizeChanged) {
            this._lastCelMoonW = mw;
            this._lastCelMarsW = mrsw;
            this._lastCelOrbitW = orw;
            this._lastCelMapScale = mapScale;
            this._celMarkersDirty = false;
            this._syncCelestialMarkers();
        }
    }

    /**
     * Moon / Mars / Orbit panel event dots (WebGL markers are hidden behind DOM map).
     */
    _syncCelestialMarkers() {
        if (!this.isVisible() || !this._moonMarkersEl || !this._marsMarkersEl || !this._orbitMarkersEl) return;

        this._moonMarkersEl.replaceChildren();
        this._marsMarkersEl.replaceChildren();
        this._orbitMarkersEl.replaceChildren();

        const ui = window.globeController?.uiView;
        if (!ui) return;

        const events = this.dataModel.getEventsForCurrentPage?.() || [];

        const addOne = (fullEvent, displayEvent, variantIndex, locationType) => {
            let host;
            let markersContainer;
            if (locationType === 'moon') {
                host = this._moonHost;
                markersContainer = this._moonMarkersEl;
            } else if (locationType === 'mars') {
                host = this._marsHost;
                markersContainer = this._marsMarkersEl;
            } else if (locationType === 'station' || locationType === 'marsShip') {
                host = this._orbitHost;
                markersContainer = this._orbitMarkersEl;
            } else {
                return;
            }
            if (!host || host.style.display === 'none' || !markersContainer) return;

            const xRaw = displayEvent.x !== undefined ? displayEvent.x : fullEvent.x;
            const yRaw = displayEvent.y !== undefined ? displayEvent.y : fullEvent.y;
            if ((locationType === 'moon' || locationType === 'mars') && (xRaw == null || yRaw == null)) {
                return;
            }
            const x = locationType === 'station' || locationType === 'marsShip' ? (xRaw != null ? xRaw : 50) : xRaw;
            const y = locationType === 'station' || locationType === 'marsShip' ? (yRaw != null ? yRaw : 50) : yRaw;

            const stub = makeStubMarker(fullEvent, displayEvent, variantIndex, this.sceneModel);
            stub.userData.locationType = locationType;
            const isMain = stub.userData.isMainVariant;
            const panelW = Math.max(1, markersContainer.clientWidth || markersContainer.parentElement?.clientWidth || 80);
            const panelH = Math.max(1, markersContainer.clientHeight || markersContainer.parentElement?.clientHeight || panelW);
            /* Earth dots live under world transform scale(_scale); celestial hosts do not — match on-screen size. */
            const d = Math.max(
                6,
                Math.round(getMap2dLiteMarkerDiameterPx(this._baseW, isMain) * this._scale)
            );

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'map-2d-lite__marker map-2d-lite__marker--celestial';
            btn.style.left = `${x}%`;
            btn.style.top = `${y}%`;
            btn.style.width = `${d}px`;
            btn.style.height = `${d}px`;
            btn.__map2dLiteStub = stub;
            btn.__map2dLiteIdentity = { event: fullEvent, displayEvent, variantIndex: variantIndex ?? 0 };

            const fillHex = stub.userData.isLocked ? EVENT_MARKER_LOCKED_HEX : getMarkerColor(isMain);
            const fr = hexToRgb(fillHex);
            btn.style.setProperty('--map2d-fill-rgb', `${fr.r},${fr.g},${fr.b}`);
            const waveHex = Number.isFinite(stub.userData.originalColor)
                ? stub.userData.originalColor
                : 0xffaa00;
            const wr = hexToRgb(waveHex);
            btn.style.setProperty('--map2d-pulse-rgb', `${wr.r},${wr.g},${wr.b}`);

            const awakening = isMap2dLiteAwakeningEvent(fullEvent);
            const body = document.createElement('span');
            body.className = 'map-2d-lite__marker-body';
            const disk = document.createElement('span');
            disk.className = 'map-2d-lite__marker-disk';

            if (stub.userData.isLocked) {
                btn.classList.add('map-2d-lite__marker--locked');
                disk.style.backgroundColor = hexToCss(EVENT_MARKER_LOCKED_HEX);
                btn.disabled = true;
                btn.setAttribute('aria-disabled', 'true');
            } else {
                if (awakening) {
                    btn.classList.add('map-2d-lite__marker--awakening');
                    const u = x / 100;
                    const v = y / 100;
                    btn.style.setProperty(
                        '--map2d-wave-max-scale',
                        String(awakeningWaveMaxScale(u, v, panelW, panelH, d))
                    );
                }
                disk.style.backgroundColor = hexToCss(getMarkerColor(isMain));
                const wave = document.createElement('span');
                wave.className = 'map-2d-lite__marker-wave';
                wave.setAttribute('aria-hidden', 'true');
                body.appendChild(wave);
            }
            body.appendChild(disk);
            btn.appendChild(body);
            btn.title = displayEvent.name || fullEvent.name || 'Event';

            if (!isTouchHoverDisabled()) {
                const ms = window.globeController?.interactionController?.markerService;
                btn.addEventListener('mouseenter', () => {
                    if (stub.userData.isLocked) return;
                    ms?.setDomLiteMarkerHover?.(stub);
                    this.playHoverRadiateLoopForStub(stub);
                });
                btn.addEventListener('mouseleave', () => {
                    this.stopHoverRadiateLoopIfStub(stub);
                    ms?.clearDomLiteMarkerHoverIf?.(stub);
                });
            }

            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (stub.userData.isLocked) return;
                const overlay = document.getElementById('eventImageOverlay');
                if (overlay && overlay.classList.contains('open')) {
                    const opacity = parseFloat(window.getComputedStyle(overlay).opacity);
                    if (opacity > 0.1) return;
                }
                const current = ui.currentEventMarker;
                const cud = current?.userData;
                if (cud?.isMap2dLiteProxy && cud.event === fullEvent
                    && (cud.variantIndex ?? 0) === (variantIndex ?? 0)) {
                    ui.hideEventSlide();
                    return;
                }
                const eventName = displayEvent.name || fullEvent.name;
                const desc = displayEvent.description || fullEvent.description || 'Placeholder text for event information.';
                const eventImage = resolveEventImagePath(displayEvent, eventName);
                ui.showEventSlide(eventName, eventImage, desc, stub, fullEvent);
            });

            markersContainer.appendChild(btn);

            if (this._domLiteCelestialEnterMode === 'pageTurn') {
                body.classList.add('map-2d-lite__marker-body--grow');
                window.setTimeout(() => {
                    body.classList.remove('map-2d-lite__marker-body--grow');
                    if (!stub.userData.isLocked) {
                        disk.classList.add('map-2d-lite__marker-disk--pulse');
                    }
                }, DOM_LITE_MARKER_TRANSITION_MS);
            } else if (!stub.userData.isLocked) {
                disk.classList.add('map-2d-lite__marker-disk--pulse');
            }
        };

        for (let ei = 0; ei < events.length; ei++) {
            const event = events[ei];
            if (event.variants && event.variants.length > 0) {
                const v = event.variants[0];
                const lt = v.locationType || event.locationType || 'earth';
                addOne(event, v, 0, lt);
            } else {
                const lt = event.locationType || 'earth';
                addOne(event, event, null, lt);
            }
        }
    }

    resetView() {
        this._fitAndCenter();
        this.layoutCelestialPanelsFromCamera();
    }

    /**
     * Center map on lat/lon (equirectangular), with a modest zoom — used from event slide "zoom to location".
     */
    flyToLatLon(lat, lon) {
        if (!this.viewport || !this.world) return;
        const u = (lon + 180) / 360;
        const v = (90 - lat) / 180;
        const wx = u * this._baseW;
        const wy = v * this._baseH;
        const vw = this.viewport.clientWidth;
        const vh = this.viewport.clientHeight;
        this._scale = Math.min(this._maxScale, Math.max(this._scale, this._minScale * 1.85));
        this._tx = vw / 2 - wx * this._scale;
        this._ty = vh / 2 - wy * this._scale;
        this._clampPan();
        this._applyTransform();
    }

    zoomIn() {
        this._zoomAtViewportCenter(1.12);
    }

    zoomOut() {
        this._zoomAtViewportCenter(1 / 1.12);
    }

    _zoomAtViewportCenter(factor) {
        if (!this.viewport) return;
        const w = this.viewport.clientWidth;
        const h = this.viewport.clientHeight;
        const mx = w / 2;
        const my = h / 2;
        this._zoomAt(mx, my, factor);
    }

    _zoomAt(mx, my, factor) {
        const next = Math.max(this._minScale, Math.min(this._maxScale, this._scale * factor));
        if (Math.abs(next - this._scale) < 1e-6) return;
        const wx = (mx - this._tx) / this._scale;
        const wy = (my - this._ty) / this._scale;
        this._scale = next;
        this._tx = mx - wx * this._scale;
        this._ty = my - wy * this._scale;
        this._clampPan();
        this._applyTransform();
    }

    _applyTransform() {
        if (!this.world) return;
        this.world.style.transform = `translate(${this._tx}px, ${this._ty}px) scale(${this._scale})`;
        if (typeof window !== 'undefined' && window.globeController?.requestMapLiteSync) {
            window.globeController.requestMapLiteSync();
        }
    }

    _clampPan() {
        if (!this.viewport) return;
        const vw = this.viewport.clientWidth;
        const vh = this.viewport.clientHeight;
        const sw = this._baseW * this._scale;
        const sh = this._baseH * this._scale;
        const minX = Math.min(0, vw - sw);
        const maxX = Math.max(0, vw - sw);
        const minY = Math.min(0, vh - sh);
        const maxY = Math.max(0, vh - sh);
        this._tx = Math.max(minX, Math.min(maxX, this._tx));
        this._ty = Math.max(minY, Math.min(maxY, this._ty));
    }

    _onWheel(e) {
        if (!this.isVisible()) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = this.viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = e.deltaY * 0.001;
        const factor = Math.exp(-delta * 0.15);
        this._zoomAt(mx, my, factor);
    }

    _onPointerDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.map-2d-lite__marker')) return;
        this._dragging = true;
        this._moved = false;
        this._lastClientX = e.clientX;
        this._lastClientY = e.clientY;
        this._dragPid = e.pointerId;
        this.viewport.setPointerCapture(e.pointerId);
        window.addEventListener('pointermove', this._boundMove);
        window.addEventListener('pointerup', this._boundUp);
        window.addEventListener('pointercancel', this._boundUp);
    }

    _onPointerMove(e) {
        if (!this._dragging) return;
        const dx = e.clientX - this._lastClientX;
        const dy = e.clientY - this._lastClientY;
        if (Math.abs(dx) + Math.abs(dy) > 3) this._moved = true;
        this._lastClientX = e.clientX;
        this._lastClientY = e.clientY;
        this._tx += dx;
        this._ty += dy;
        this._clampPan();
        this._applyTransform();
    }

    _onPointerUp(e) {
        if (!this._dragging) return;
        this._dragging = false;
        window.removeEventListener('pointermove', this._boundMove);
        window.removeEventListener('pointerup', this._boundUp);
        window.removeEventListener('pointercancel', this._boundUp);
        if (this._dragPid != null) {
            try {
                this.viewport.releasePointerCapture(this._dragPid);
            } catch (_) { /* ignore */ }
            this._dragPid = null;
        }
    }

    /**
     * Squash celestial panel hosts out (pairs with WebGL {@link PlaneManager#animatePlaneScale} hide timing feel).
     * @returns {Promise<void>}
     */
    _animateCelestialHostsExitIfVisible() {
        const hosts = [this._moonHost, this._marsHost, this._orbitHost].filter(Boolean);
        const visible = hosts.filter((h) => {
            try {
                return window.getComputedStyle(h).display !== 'none';
            } catch (_) {
                return false;
            }
        });
        if (visible.length === 0) return Promise.resolve();
        return Promise.all(
            visible.map(
                (host) =>
                    new Promise((resolve) => {
                        host.classList.remove('map-2d-lite__celestial-host--enter');
                        host.style.transition = `transform ${DOM_LITE_MARKER_TRANSITION_MS}ms cubic-bezier(0.32, 0, 0.67, 1)`;
                        host.style.transformOrigin = '50% 50%';
                        host.style.transform = 'scaleY(0)';
                        window.setTimeout(() => {
                            host.style.transition = '';
                            host.style.transform = '';
                            resolve();
                        }, DOM_LITE_MARKER_TRANSITION_MS + 50);
                    })
            )
        ).then(() => {});
    }

    /**
     * Shrink-out Earth + moon/mars marker bodies (matches {@link animateMarkersShrink} timing).
     * @returns {Promise<void>}
     */
    _animateDomMarkersExit() {
        const earth = [...this.markersEl.querySelectorAll('.map-2d-lite__marker-body')];
        const moon = this._moonMarkersEl
            ? [...this._moonMarkersEl.querySelectorAll('.map-2d-lite__marker-body')]
            : [];
        const mars = this._marsMarkersEl
            ? [...this._marsMarkersEl.querySelectorAll('.map-2d-lite__marker-body')]
            : [];
        const orbit = this._orbitMarkersEl
            ? [...this._orbitMarkersEl.querySelectorAll('.map-2d-lite__marker-body')]
            : [];
        const bodies = [...earth, ...moon, ...mars, ...orbit];
        if (bodies.length === 0) return Promise.resolve();
        bodies.forEach((body) => {
            body.querySelector('.map-2d-lite__marker-disk')?.classList.remove('map-2d-lite__marker-disk--pulse');
        });
        return Promise.all(
            bodies.map(
                (body) =>
                    new Promise((resolve) => {
                        let settled = false;
                        const finish = () => {
                            if (settled) return;
                            settled = true;
                            body.removeEventListener('animationend', onEnd);
                            resolve();
                        };
                        const onEnd = (e) => {
                            const n = e.animationName || '';
                            if (n.includes('map2d-lite-marker-exit')) finish();
                        };
                        body.addEventListener('animationend', onEnd);
                        body.classList.add('map-2d-lite__marker-body--exit');
                        window.setTimeout(finish, DOM_LITE_MARKER_TRANSITION_MS + 80);
                    })
            )
        ).then(() => {});
    }

    _onClick(e) {
        if (this._moved) return;
        if (e.target.closest('.map-2d-lite__marker')) return;
        const ui = window.globeController?.uiView;
        if (ui?.currentEventMarker) {
            ui.hideEventSlide();
        }
        if (typeof window.closeTimelineMusicFiltersPanelsIfOpen === 'function') {
            window.closeTimelineMusicFiltersPanelsIfOpen();
        }
    }

    /**
     * Animate one marker to locked state (scale → 0.75, dark color) like {@link animateMarkerLock} — no shrink-to-zero.
     * @returns {Promise<void>}
     */
    _animateDomMarkerToLocked(btn, stub) {
        return new Promise((resolve) => {
            if (!btn || !stub?.userData) {
                resolve();
                return;
            }
            stub.userData.isLocked = true;
            const disk = btn.querySelector('.map-2d-lite__marker-disk');
            const wave = btn.querySelector('.map-2d-lite__marker-wave');
            disk?.classList.remove('map-2d-lite__marker-disk--pulse');
            btn.classList.remove('map-2d-lite__marker--awakening');
            btn.style.removeProperty('--map2d-wave-max-scale');

            btn.style.transition = `transform ${MAP2D_LOCK_TRANSITION_MS}ms cubic-bezier(0.32, 0, 0.67, 1)`;
            if (disk) {
                disk.style.transition = `background-color ${MAP2D_LOCK_TRANSITION_MS}ms cubic-bezier(0.32, 0, 0.67, 1)`;
                disk.style.backgroundColor = hexToCss(EVENT_MARKER_LOCKED_HEX);
            }
            if (wave) {
                wave.style.transition = `opacity ${Math.min(200, MAP2D_LOCK_TRANSITION_MS)}ms ease-out`;
                wave.style.opacity = '0';
            }
            btn.classList.add('map-2d-lite__marker--locked');
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
            const fr = hexToRgb(EVENT_MARKER_LOCKED_HEX);
            btn.style.setProperty('--map2d-fill-rgb', `${fr.r},${fr.g},${fr.b}`);

            window.setTimeout(() => {
                btn.style.transition = '';
                if (disk) disk.style.transition = '';
                if (wave?.parentNode) wave.remove();
                resolve();
            }, MAP2D_LOCK_TRANSITION_MS + 40);
        });
    }

    /**
     * Animate one marker to unlocked state like {@link animateMarkerUnlock}.
     * @returns {Promise<void>}
     */
    _animateDomMarkerToUnlocked(btn, stub) {
        return new Promise((resolve) => {
            if (!btn || !stub?.userData) {
                resolve();
                return;
            }
            stub.userData.isLocked = false;
            const id = btn.__map2dLiteIdentity;
            const fullEvent = id?.event;
            if (!fullEvent) {
                resolve();
                return;
            }

            const body = btn.querySelector('.map-2d-lite__marker-body');
            const disk = btn.querySelector('.map-2d-lite__marker-disk');
            const isMain = true;
            const fillHex = getMarkerColor(isMain);

            btn.style.transition = `transform ${MAP2D_LOCK_TRANSITION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
            if (disk) {
                disk.style.transition = `background-color ${MAP2D_LOCK_TRANSITION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
                disk.style.backgroundColor = hexToCss(fillHex);
            }
            btn.classList.remove('map-2d-lite__marker--locked');
            btn.disabled = false;
            btn.removeAttribute('aria-disabled');

            if (body && disk && !body.querySelector('.map-2d-lite__marker-wave')) {
                const wv = document.createElement('span');
                wv.className = 'map-2d-lite__marker-wave';
                wv.setAttribute('aria-hidden', 'true');
                body.insertBefore(wv, disk);
            }

            const waveHex = Number.isFinite(stub.userData.originalColor)
                ? stub.userData.originalColor
                : 0xffaa00;
            const wr = hexToRgb(waveHex);
            btn.style.setProperty('--map2d-pulse-rgb', `${wr.r},${wr.g},${wr.b}`);
            const fr = hexToRgb(fillHex);
            btn.style.setProperty('--map2d-fill-rgb', `${fr.r},${fr.g},${fr.b}`);

            const awakening = isMap2dLiteAwakeningEvent(fullEvent);
            if (awakening) {
                btn.classList.add('map-2d-lite__marker--awakening');
                const u = parseFloat(btn.style.left) / 100;
                const v = parseFloat(btn.style.top) / 100;
                const d = parseFloat(btn.style.width) || getMap2dLiteMarkerDiameterPx(this._baseW, isMain);
                btn.style.setProperty(
                    '--map2d-wave-max-scale',
                    String(awakeningWaveMaxScale(u, v, this._baseW, this._baseH, d))
                );
            } else {
                btn.classList.remove('map-2d-lite__marker--awakening');
                btn.style.removeProperty('--map2d-wave-max-scale');
            }

            window.setTimeout(() => {
                btn.style.transition = '';
                if (disk) disk.style.transition = '';
                disk?.classList.add('map-2d-lite__marker-disk--pulse');
                resolve();
            }, MAP2D_LOCK_TRANSITION_MS + 40);
        });
    }

    /**
     * Update lock state on existing DOM markers (filter confirm) — matches WebGL lock/unlock, not page-turn shrink-to-zero.
     * @returns {Promise<void>}
     */
    _syncMarkersFilterInPlace() {
        const events = this.dataModel.getEventsForCurrentPage?.() || [];
        if (countRenderableEarthMarkers(events) !== this.markersEl.children.length) {
            return this._performMarkersRebuild('instant');
        }
        const filters = this.sceneModel?.activeFilters || new Set();
        const tasks = [];
        for (const btn of [...this.markersEl.children]) {
            const id = btn.__map2dLiteIdentity;
            const stub = btn.__map2dLiteStub;
            if (!id?.event || !stub?.userData) continue;
            const locked = shouldEventBeLocked(id.event, filters);
            const domLocked = btn.classList.contains('map-2d-lite__marker--locked');
            if (locked === domLocked) continue;
            if (locked) tasks.push(this._animateDomMarkerToLocked(btn, stub));
            else tasks.push(this._animateDomMarkerToUnlocked(btn, stub));
        }
        return Promise.all(tasks).then(() => {
            this._celMarkersDirty = true;
            this.layoutCelestialPanelsFromCamera();
        });
    }

    /**
     * Full marker rebuild (optional page-turn exit animation before replace).
     * @param {'pageTurn' | 'instant'} mode
     * @returns {Promise<void>}
     */
    async _performMarkersRebuild(mode) {
        const pageTurn = mode === 'pageTurn';
        if (!this.markersEl || !this.isVisible()) return;

        if (pageTurn) {
            await Promise.all([
                this._animateDomMarkersExit(),
                this._animateCelestialHostsExitIfVisible()
            ]);
        }

        this.stopHoverRadiateLoop();
        this.clearSyntheticMarkerHover();
        window.globeController?.interactionController?.markerService?.setDomLiteMarkerHover?.(null);
        this.markersEl.replaceChildren();
        const events = this.dataModel.getEventsForCurrentPage?.() || [];
        const ui = window.globeController?.uiView;
        if (!ui) {
            this._domLiteCelestialEnterMode = pageTurn ? 'pageTurn' : 'instant';
            this._celMarkersDirty = true;
            this.layoutCelestialPanelsFromCamera();
            this._domLiteCelestialEnterMode = 'instant';
            return;
        }

        const addMarkerEl = (fullEvent, displayEvent, variantIndex) => {
                const lt = displayEvent.locationType || fullEvent.locationType || 'earth';
                if (lt !== 'earth') return;

                const lat = displayEvent.lat !== undefined ? displayEvent.lat : fullEvent.lat;
                const lon = displayEvent.lon !== undefined ? displayEvent.lon : fullEvent.lon;
                if (lat == null || lon == null) return;

                const u = (lon + 180) / 360;
                const v = (90 - lat) / 180;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'map-2d-lite__marker';
                const stub = makeStubMarker(fullEvent, displayEvent, variantIndex, this.sceneModel);
                btn.__map2dLiteIdentity = {
                    event: fullEvent,
                    displayEvent,
                    variantIndex: variantIndex ?? 0
                };
                btn.__map2dLiteStub = stub;
                btn.style.left = `${u * 100}%`;
                btn.style.top = `${v * 100}%`;
                const isMain = stub.userData.isMainVariant;
                const d = getMap2dLiteMarkerDiameterPx(this._baseW, isMain);
                btn.style.width = `${d}px`;
                btn.style.height = `${d}px`;
                const fillHex = stub.userData.isLocked ? EVENT_MARKER_LOCKED_HEX : getMarkerColor(isMain);
                const fr = hexToRgb(fillHex);
                btn.style.setProperty('--map2d-fill-rgb', `${fr.r},${fr.g},${fr.b}`);
                const waveHex = Number.isFinite(stub.userData.originalColor)
                    ? stub.userData.originalColor
                    : 0xffaa00;
                const wr = hexToRgb(waveHex);
                btn.style.setProperty('--map2d-pulse-rgb', `${wr.r},${wr.g},${wr.b}`);

                const awakening = isMap2dLiteAwakeningEvent(fullEvent);

                const body = document.createElement('span');
                body.className = 'map-2d-lite__marker-body';

                const disk = document.createElement('span');
                disk.className = 'map-2d-lite__marker-disk';

                if (stub.userData.isLocked) {
                    btn.classList.add('map-2d-lite__marker--locked');
                    disk.style.backgroundColor = hexToCss(EVENT_MARKER_LOCKED_HEX);
                    btn.disabled = true;
                    btn.setAttribute('aria-disabled', 'true');
                } else {
                    if (awakening) {
                        btn.classList.add('map-2d-lite__marker--awakening');
                        btn.style.setProperty(
                            '--map2d-wave-max-scale',
                            String(awakeningWaveMaxScale(u, v, this._baseW, this._baseH, d))
                        );
                    }
                    disk.style.backgroundColor = hexToCss(getMarkerColor(isMain));
                    const wave = document.createElement('span');
                    wave.className = 'map-2d-lite__marker-wave';
                    wave.setAttribute('aria-hidden', 'true');
                    body.appendChild(wave);
                }
                body.appendChild(disk);
                btn.appendChild(body);
                btn.title = displayEvent.name || fullEvent.name || 'Event';

                if (!isTouchHoverDisabled()) {
                    const ms = window.globeController?.interactionController?.markerService;
                    btn.addEventListener('mouseenter', () => {
                        if (stub.userData.isLocked) return;
                        ms?.setDomLiteMarkerHover?.(stub);
                        this.playHoverRadiateLoopForStub(stub);
                    });
                    btn.addEventListener('mouseleave', () => {
                        this.stopHoverRadiateLoopIfStub(stub);
                        ms?.clearDomLiteMarkerHoverIf?.(stub);
                    });
                }

                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    if (stub.userData.isLocked) return;
                    const overlay = document.getElementById('eventImageOverlay');
                    if (overlay && overlay.classList.contains('open')) {
                        const opacity = parseFloat(window.getComputedStyle(overlay).opacity);
                        if (opacity > 0.1) return;
                    }
                    const current = ui.currentEventMarker;
                    const cud = current?.userData;
                    if (cud?.isMap2dLiteProxy && cud.event === fullEvent
                        && (cud.variantIndex ?? 0) === (variantIndex ?? 0)) {
                        ui.hideEventSlide();
                        return;
                    }

                    const eventName = displayEvent.name || fullEvent.name;
                    const desc = displayEvent.description || fullEvent.description || 'Placeholder text for event information.';
                    const eventImage = resolveEventImagePath(displayEvent, eventName);
                    ui.showEventSlide(eventName, eventImage, desc, stub, fullEvent);
                });

                this.markersEl.appendChild(btn);

                if (pageTurn) {
                    body.classList.add('map-2d-lite__marker-body--grow');
                    window.setTimeout(() => {
                        body.classList.remove('map-2d-lite__marker-body--grow');
                        if (!stub.userData.isLocked) {
                            disk.classList.add('map-2d-lite__marker-disk--pulse');
                        }
                    }, DOM_LITE_MARKER_TRANSITION_MS);
                } else if (!stub.userData.isLocked) {
                    disk.classList.add('map-2d-lite__marker-disk--pulse');
                }
            };

        // One visible dot per multi-event: variant 0 only (non-main meshes stay hidden in WebGL until slide UX).
        for (const event of events) {
            if (event.variants && event.variants.length > 0) {
                addMarkerEl(event, event.variants[0], 0);
            } else {
                addMarkerEl(event, event, null);
            }
        }

        this._domLiteCelestialEnterMode = pageTurn ? 'pageTurn' : 'instant';
        this._celMarkersDirty = true;
        this.layoutCelestialPanelsFromCamera();
        this._domLiteCelestialEnterMode = 'instant';
    }

    /**
     * Rebuild Earth markers for the current page (and lock/filter styling).
     * @param {{ mode?: 'pageTurn' | 'instant' | 'filter', animate?: boolean }} [opts] - `pageTurn` = exit+grow; `instant` = replace; `filter` = in-place lock/unlock (WebGL parity). Legacy `animate: true` → pageTurn.
     * @returns {Promise<void>}
     */
    syncMarkers(opts = {}) {
        let mode = opts.mode;
        if (mode == null) {
            mode = opts.animate === true ? 'pageTurn' : 'instant';
        }
        if (!this.markersEl || !this.isVisible()) {
            return Promise.resolve();
        }
        if (mode === 'filter') {
            return this._syncMarkersFilterInPlace();
        }
        return this._performMarkersRebuild(mode === 'pageTurn' ? 'pageTurn' : 'instant');
    }
}
