/**
 * Codex canvas: hero/faction/country portrait nodes, junction (waypoint) circle nodes, directed links; persistence.
 * Cords use free positioning while dragging; on release, segments to fixed neighbors snap to 45° if within a small angular window.
 */

let root = null;
let hitLayerEl = null;
let onCodexContextMenuCapture = null;
let pickerEl = null;
let listEl = null;
let onDocPointerDown = null;
let onDocKeydown = null;
let nodeZ = 20;
/** @type {{ x: number, y: number }|null} */
let pendingNodePos = null;

const DOUBLE_RIGHT_MS = 450;
const capOpts = { capture: true };
const CODEX_JUNCTION_PREVIEW_DATA_URI =
    'data:image/svg+xml,'
    + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">'
        + '<circle cx="24" cy="24" r="14" fill="rgba(196,181,253,0.4)" stroke="rgba(233,213,255,0.95)" stroke-width="3"/>'
        + '</svg>'
    );
const MAX_SUGGEST = 8;
const CODEX_STORAGE_KEY = 'timelineCodexLabels';
const CODEX_DEBUG_UI_PREF_KEY = 'timelineCodexShowDebugging';
/** @deprecated read for migration only */
const CODEX_DEBUG_UI_PREF_KEY_LEGACY = 'timelineCodexShowJunctionControls';
const CODEX_VISUAL_PREFS_KEY = 'timelineCodexVisualPrefs';

/** Default cord/packet SVG look (matches original hard-coded constants). */
const CODEX_VISUAL_DEFAULTS = {
    cordColor: '#e9d5ff',
    cordThickness: 3.35,
    cordBlur: 4,
    cordMorph: 1.25,
    cordGlowLayers: 2,
    packetColorIdle: '#9333ea',
    packetColorActive: '#c026d3',
    packetThicknessMult: 1.35,
    packetBlurMult: 1.35,
    packetMorphMult: 1.35,
    packetGlowLayers: 2,
    packetOpacity: 1
};

/** @type {typeof CODEX_VISUAL_DEFAULTS} */
let codexVisualPrefs = { ...CODEX_VISUAL_DEFAULTS };

const CODEX_IMG_BASE_PX = 144;
const CODEX_FRAME_PATH = 'assets/images/Codex/Node';
/** Luminance mask (white = show cords, black = hide under hex); aligned with frame + rotation. */
const CODEX_NODE_ALPHA_IMAGE_URL = 'assets/images/Codex/Node%20Alpha.png';

/** Stable 32-bit hash for per-node Codex visuals (frame + rotation). */
function codexStyleHash32(id) {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return h;
}

/** Stable 1–3 — same frame PNG (Node1…3) after save/reload. */
function codexFrameVariantForId(id) {
    return (Math.abs(codexStyleHash32(id)) % 3) + 1;
}

/** Stable 0, 60, …, 300 — hex symmetry; independent of frame variant. */
function codexHexRotationDegreesForId(id) {
    const h = codexStyleHash32(id);
    const mixed = Math.imul(h ^ (h >>> 11), 0x85ebca6b) | 0;
    return (Math.abs(mixed) % 6) * 60;
}
const DRAG_THRESHOLD_PX = 6;
/** Junction waypoint: layout box (circle fits inside). */
const CODEX_JUNCTION_BASE_PX = 32;
/** @deprecated use {@link codexVisualPrefs}.cordThickness */
const CODEX_EDGE_STROKE_PX = 3.35;
/** Arm length (world px) along each cord direction for junction elbow parallelogram (axis + 45° turns). */
const CODEX_ELBOW_PARALLELOGRAM_ARM_PX = 24;
/** Degrees slop for classifying a segment as axis-aligned vs 45° diagonal. */
const CODEX_ELBOW_BEARING_TOL_DEG = 8;
/** World px — cord angle labels (0° / 45°). */
const CODEX_EDGE_DEGREE_FONT_PX = 38;
const CODEX_CORD_STROKE_OPACITY = 1;
/** Invisible cord pick targets (world px, user space); thick so “near the cord” left-clicks register reliably. */
const CODEX_EDGE_HIT_PICK_STROKE_PX = 56;
/** Widen filter bbox for H/V lines (backup; main fix is userSpaceOnUse + feMorphology). */
const CODEX_EDGE_FILTER_PAD_PX = 52;
/** Packet spawn pulse: meteor-style snap to peak, then exponential tail (decay = e-folding time τ). */
const CODEX_PACKET_PULSE_RISE_MIN_SEC = 0.012;
const CODEX_PACKET_PULSE_RISE_MAX_SEC = 0.052;
const CODEX_PACKET_PULSE_DECAY_MIN_SEC = 0.09;
const CODEX_PACKET_PULSE_DECAY_MAX_SEC = 0.42;
/** Opacity factor lerp at pulseStr 0 vs 1 (vs saved packet opacity); big gap so pulse reads even when opacity is 1. */
const CODEX_PACKET_PULSE_OPACITY_LOW_MULT = 0.22;
const CODEX_PACKET_PULSE_OPACITY_PEAK_MULT = 1.28;
/** Stroke width factor lerp (thin/dim → fat/bright). */
const CODEX_PACKET_PULSE_WIDTH_LOW_MULT = 0.48;
const CODEX_PACKET_PULSE_WIDTH_PEAK_MULT = 3.85;
/** Glow pad lerp (filter bbox — larger at peak). */
const CODEX_PACKET_PULSE_PAD_LOW_MULT = 0.88;
const CODEX_PACKET_PULSE_PAD_PEAK_MULT = 3.05;
/** Sharp white-hot core on top of filtered glow; only drawn above this pulse strength. */
const CODEX_PACKET_METEOR_CORE_MIN_PULSE = 0.06;
/** Packets per directed edge (inclusive range). */
const CODEX_PACKET_COUNT_MIN = 3;
const CODEX_PACKET_COUNT_MAX = 6;
/** Arc-length speed per second (higher = more traffic). */
const CODEX_PACKET_SPEED_MIN = 0.14;
const CODEX_PACKET_SPEED_MAX = 0.38;
/** Large scrollable Codex board (world pixel space for nodes and edges). */
const CODEX_WORLD_W = 16384;
const CODEX_WORLD_H = 12288;
/** Previous board size — saves older than {@link CODEX_SAVE_VERSION} are shifted into the larger world. */
const CODEX_LEGACY_WORLD_W = 8192;
const CODEX_LEGACY_WORLD_H = 6144;
const CODEX_WORLD_EXPAND_SHIFT_X = (CODEX_WORLD_W - CODEX_LEGACY_WORLD_W) / 2;
const CODEX_WORLD_EXPAND_SHIFT_Y = (CODEX_WORLD_H - CODEX_LEGACY_WORLD_H) / 2;
/** Persisted layout format (4 = junction nodes, straight cords only; older saves are cleared on load). */
const CODEX_SAVE_VERSION = 4;
/** First save format with junction nodes only; anything below loads empty (legacy edge-break layouts dropped). */
const CODEX_JUNCTION_LAYOUT_MIN_VERSION = 4;
/** Min = zoomed out (smaller world on screen). */
const CODEX_ZOOM_MIN = 0.18;
const CODEX_ZOOM_MAX = 2.25;
const CODEX_ZOOM_FACTOR = 1.12;
/** Starting / reset board zoom — slightly zoomed out vs 1. */
const CODEX_ZOOM_INITIAL = 0.88;
/** Node portrait/junction scale clamp + defaults for newly placed nodes. */
const CODEX_SCALE_MIN = 0.25;
const CODEX_SCALE_MAX = 5;
const CODEX_DEFAULT_SCALE_HERO = 1.5;
const CODEX_DEFAULT_SCALE_FACTION = 2;
const CODEX_DEFAULT_SCALE_COUNTRY = 1.5;
const CODEX_DEFAULT_SCALE_JUNCTION = 3;

/** Extend when adding countries; image path per key (misc art vs flags). */
const CODEX_ALLOWED_COUNTRY_KEYS = Object.freeze(['Numbani']);

const CODEX_COUNTRY_IMAGE_SRC_BY_KEY = Object.freeze({
    Numbani: 'assets/images/misc/Numbani.png'
});

function normalizeCodexCountryKey(raw) {
    const t = String(raw || '').trim().toLowerCase();
    for (let i = 0; i < CODEX_ALLOWED_COUNTRY_KEYS.length; i += 1) {
        const k = CODEX_ALLOWED_COUNTRY_KEYS[i];
        if (t === k.toLowerCase()) return k;
    }
    return null;
}

function codexCountryFlagSrc(canonicalKey) {
    const mapped = CODEX_COUNTRY_IMAGE_SRC_BY_KEY[canonicalKey];
    if (mapped) return mapped;
    return `assets/images/flags/${encodeURIComponent(canonicalKey)}.png`;
}

/**
 * @param {'hero'|'faction'|'country'|'junction'|'npc'} kind
 * @param {unknown} optsScale
 */
function resolveCodexNodeScale(kind, optsScale) {
    if (typeof optsScale === 'number' && Number.isFinite(optsScale)) {
        return Math.max(CODEX_SCALE_MIN, Math.min(CODEX_SCALE_MAX, optsScale));
    }
    const p = parseFloat(String(optsScale));
    if (Number.isFinite(p)) {
        return Math.max(CODEX_SCALE_MIN, Math.min(CODEX_SCALE_MAX, p));
    }
    if (kind === 'junction') return CODEX_DEFAULT_SCALE_JUNCTION;
    if (kind === 'faction') return CODEX_DEFAULT_SCALE_FACTION;
    if (kind === 'country') return CODEX_DEFAULT_SCALE_COUNTRY;
    return CODEX_DEFAULT_SCALE_HERO;
}

/** @type {'drag'|'network'} */
let codexInteractionMode = 'drag';
/** First node id picked in network mode (waiting for second tap to draw a link). */
let networkLinkSourceId = null;
/** @type {{ fromId: string, toId: string }[]} */
let codexEdges = [];
/** @type {SVGSVGElement|null} */
let codexEdgesSvgEl = null;
/** Unordered node-pair keys for double–right-click delete on links. */
const cordDoubleRightLastTs = new Map();
/** Cord armed for delete — second right-click removes the link. */
let cordPendingDeletePairKey = null;
/** Multi-select node delete: first right-click arms; second within window removes all selected nodes. */
let codexBulkNodeDeleteArmedAt = 0;
/** @type {Set<HTMLElement>} */
let codexSelectedNodeEls = new Set();
/** Last node picked (non–shift-click multi-select); used for toolbar when one node is primary. */
let codexPrimarySelectedNodeEl = null;
/** Pending pointer for drag-threshold (drag mode). */
let pointerPending = null;

let codexLayoutDirty = false;
/** Node ids mid-drag (single or group) — incident cords render yellow. */
let codexActiveDragNodeIds = new Set();
/** Directed edges (`fromId\x1etoId`) that stay yellow until Save Codex. */
const codexUnsavedEdgeKeys = new Set();
/** Pannable/zoomable layer containing hit target, SVG, nodes (not the toolbar). */
let codexWorldEl = null;

/** @type {number} */
let codexCordAnimRafId = 0;
let codexCordAnimLastTs = 0;
/**
 * Per directed edge: polyline metrics + light-packet sim state.
 * @type {Map<string, { pts: { x: number, y: number }[], segLens: number[], totalLen: number, active: boolean, packets: { headT: number, speed: number, lengthT: number, width: number }[] }>}
 */
const codexCordPacketState = new Map();
let codexViewPanX = 0;
let codexViewPanY = 0;
let codexViewZoom = CODEX_ZOOM_INITIAL;

/** @type {{ d0: number, z0: number }|null} */
let codexPinchState = null;
/** @type {((e: WheelEvent) => void)|null} */
let onCodexWheelHandler = null;
/** @type {((e: TouchEvent) => void)|null} */
let onCodexTouchStartHandler = null;
let onCodexTouchMoveHandler = null;
let onCodexTouchEndHandler = null;
/** @type {object|null} */
let backgroundPanPointerPending = null;
/** @type {HTMLElement|null} */
let codexToolbarEl = null;
/** Right-side cord/packet look panel (child of {@link root}). */
let codexVisualPanelEl = null;
/** When false, waypoint dots, Break picker, cord angle labels, and node coordinate labels are hidden. */
let codexDebugUiVisible = true;

/** @type {(() => void)|null} */
let onWindowResizeRedraw = null;
/** @type {((e: KeyboardEvent) => void)|null} */
let onCodexGlobalKeydown = null;

function isCodexFileApiAvailable() {
    try {
        const ds = window.EventDataService;
        if (ds && typeof ds.isGitHubPages === 'function' && ds.isGitHubPages()) return false;
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        const isDevServerPort = String(window.location.port || '') === '8000';
        const isLoopbackHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        return isHttp && (isDevServerPort || isLoopbackHost);
    } catch (_) {
        return false;
    }
}

function generateNodeId() {
    return `cn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeForAttrSelector(id) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(id);
    }
    return String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {{ fromId: string, toId: string }} e
 */
function normalizeEdgeRecord(e) {
    if (!e || !e.fromId || !e.toId) return null;
    return {
        fromId: e.fromId,
        toId: e.toId
    };
}

function findEdge(fromId, toId) {
    return codexEdges.find((ed) => ed.fromId === fromId && ed.toId === toId) || null;
}

function edgeDirectedKey(fromId, toId) {
    return `${fromId}\x1e${toId}`;
}

function markCodexEdgeUnsaved(fromId, toId) {
    codexUnsavedEdgeKeys.add(edgeDirectedKey(fromId, toId));
}

function markIncidentCodexEdgesUnsaved(nodeId) {
    if (!nodeId) return;
    codexEdges.forEach((e) => {
        if (e.fromId === nodeId || e.toId === nodeId) {
            markCodexEdgeUnsaved(e.fromId, e.toId);
        }
    });
}

/** Stable key for an unordered pair of node ids (at most one link between two nodes). */
function codexUnorderedPairKey(idA, idB) {
    return idA <= idB ? `${idA}\x1e${idB}` : `${idB}\x1e${idA}`;
}

function hasCodexConnectionBetween(fromId, toId) {
    return codexEdges.some(
        (ed) =>
            (ed.fromId === fromId && ed.toId === toId)
            || (ed.fromId === toId && ed.toId === fromId)
    );
}

/**
 * Keeps the first edge for each unordered node pair (handles legacy saves with both A→B and B→A).
 * @param {typeof codexEdges} list
 */
function dedupeCodexEdgesByNodePair(list) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const k = codexUnorderedPairKey(e.fromId, e.toId);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(e);
    }
    return out;
}

function removeCodexEdgeDirected(fromId, toId) {
    const next = codexEdges.filter((e) => !(e.fromId === fromId && e.toId === toId));
    if (next.length === codexEdges.length) return;
    codexEdges = next;
    codexUnsavedEdgeKeys.delete(edgeDirectedKey(fromId, toId));
    const pk = codexUnorderedPairKey(fromId, toId);
    cordDoubleRightLastTs.delete(pk);
    if (cordPendingDeletePairKey === pk) cordPendingDeletePairKey = null;
    markCodexLayoutDirty();
    redrawCodexEdges();
}

/**
 * Swap directed endpoints so packet flow (A → B) flips.
 * @param {{ fromId: string, toId: string }} edge
 */
function reverseCodexDirectedEdge(edge) {
    if (!edge || !edge.fromId || !edge.toId) return;
    const oldFrom = edge.fromId;
    const oldTo = edge.toId;
    const oldKey = edgeDirectedKey(oldFrom, oldTo);
    codexUnsavedEdgeKeys.delete(oldKey);
    codexCordPacketState.delete(oldKey);
    edge.fromId = oldTo;
    edge.toId = oldFrom;
    markCodexEdgeUnsaved(edge.fromId, edge.toId);

    markCodexLayoutDirty();
    redrawCodexEdges();
}

function reverseCodexEdgeForSelectedPair() {
    const selected = getSelectedCodexNodesInRoot();
    if (selected.length !== 2) return;
    const ida = selected[0].dataset.codexNodeId;
    const idb = selected[1].dataset.codexNodeId;
    const e = findEdge(ida, idb) || findEdge(idb, ida);
    if (!e) return;
    reverseCodexDirectedEdge(e);
}

/**
 * Toolbar preview: single node, two nodes + link (reverse), two nodes no link, or network link-in-progress.
 * @returns {{ kind: 'none' } | { kind: 'single', fromEl: HTMLElement } | { kind: 'edge', fromEl: HTMLElement|null, toEl: HTMLElement|null, edge: object } | { kind: 'pair-no-edge', fromEl: HTMLElement, toEl: HTMLElement } | { kind: 'pending', fromEl: HTMLElement, toEl: null } | { kind: 'cord-pending', fromEl: HTMLElement, toEl: HTMLElement }}
 */
function getCodexToolbarEndpointPreviewState() {
    if (!root) return { kind: 'none' };
    const selected = getSelectedCodexNodesInRoot();

    if (codexInteractionMode === 'network' && networkLinkSourceId) {
        const srcEl =
            selected.find((n) => n.dataset.codexNodeId === networkLinkSourceId)
            || root.querySelector(
                `[data-codex-node-id="${escapeForAttrSelector(networkLinkSourceId)}"]`
            );
        if (srcEl && root.contains(srcEl)) {
            const srcInSel = selected.some((n) => n.dataset.codexNodeId === networkLinkSourceId);
            if (selected.length === 2 && srcInSel) {
                const other = selected.find((n) => n.dataset.codexNodeId !== networkLinkSourceId);
                if (other) {
                    const ida = networkLinkSourceId;
                    const idb = other.dataset.codexNodeId;
                    const e = findEdge(ida, idb) || findEdge(idb, ida);
                    if (e) {
                        const fromEl = root.querySelector(
                            `[data-codex-node-id="${escapeForAttrSelector(e.fromId)}"]`
                        );
                        const toEl = root.querySelector(
                            `[data-codex-node-id="${escapeForAttrSelector(e.toId)}"]`
                        );
                        return { kind: 'edge', fromEl, toEl, edge: e };
                    }
                    return { kind: 'cord-pending', fromEl: srcEl, toEl: other };
                }
            }
            return { kind: 'pending', fromEl: srcEl, toEl: null };
        }
    }

    if (selected.length === 2) {
        const ida = selected[0].dataset.codexNodeId;
        const idb = selected[1].dataset.codexNodeId;
        const e = findEdge(ida, idb) || findEdge(idb, ida);
        if (e) {
            const fromEl = root.querySelector(
                `[data-codex-node-id="${escapeForAttrSelector(e.fromId)}"]`
            );
            const toEl = root.querySelector(
                `[data-codex-node-id="${escapeForAttrSelector(e.toId)}"]`
            );
            return { kind: 'edge', fromEl, toEl, edge: e };
        }
        return { kind: 'pair-no-edge', fromEl: selected[0], toEl: selected[1] };
    }
    if (selected.length === 1) {
        return { kind: 'single', fromEl: selected[0] };
    }
    return { kind: 'none' };
}

/**
 * `body` uses `transform: scale(var(--desktop-scale))` (base.css). Layout `left`/`top` on Codex children are in
 * pre-scale space; `clientX`/`getBoundingClientRect` are viewport pixels — convert viewport delta → layout px.
 */
function getCodexBodyLayoutPerViewportPx() {
    const raw = getComputedStyle(document.body).getPropertyValue('--desktop-scale').trim();
    const fromVar = parseFloat(raw);
    if (Number.isFinite(fromVar) && fromVar > 0.05 && fromVar < 20) return fromVar;
    const tr = getComputedStyle(document.body).transform;
    if (!tr || tr === 'none') return 1;
    const m = tr.match(/matrix\(([-\d.e]+),\s*([-\d.e]+),\s*([-\d.e]+),\s*([-\d.e]+),/);
    if (m) {
        const a = Math.abs(parseFloat(m[1]));
        if (Number.isFinite(a) && a > 0.01) return a;
    }
    const sc = tr.match(/scale\(([-\d.e]+)\)/);
    if (sc) {
        const s = Math.abs(parseFloat(sc[1]));
        if (Number.isFinite(s) && s > 0.01) return s;
    }
    return 1;
}

/** Screen → world px (same model as `translate(pan) scale(z)` on `.codex-world`, origin top-left of root). */
function clientToWorldCodex(clientX, clientY) {
    if (!root) return { x: 0, y: 0 };
    const rr = root.getBoundingClientRect();
    if (!codexWorldEl) {
        return { x: clientX - rr.left, y: clientY - rr.top };
    }
    const z = Math.max(0.05, codexViewZoom);
    return {
        x: (clientX - rr.left - codexViewPanX) / z,
        y: (clientY - rr.top - codexViewPanY) / z
    };
}

/** Keep node top-left inside the board (world or root) for the given scale. */
function clampCodexNodeTopLeftToWorld(x, y, scale, kind = 'hero') {
    const s = Math.max(CODEX_SCALE_MIN, Math.min(CODEX_SCALE_MAX, Number(scale) || 1));
    const dim = (kind === 'junction' ? CODEX_JUNCTION_BASE_PX : CODEX_IMG_BASE_PX) * s;
    const W = codexWorldEl ? CODEX_WORLD_W : Math.max(1, root?.clientWidth || 1);
    const H = codexWorldEl ? CODEX_WORLD_H : Math.max(1, root?.clientHeight || 1);
    const maxX = Math.max(0, W - dim);
    const maxY = Math.max(0, H - dim);
    return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
    };
}

function parseTranslatePxFromTransform(transformStr) {
    if (!transformStr || transformStr === 'none') return { tx: 0, ty: 0 };
    const m3d = transformStr.match(/translate3d\(([-\d.e]+)px,\s*([-\d.e]+)px/i);
    if (m3d) return { tx: parseFloat(m3d[1]), ty: parseFloat(m3d[2]) };
    const m2d = transformStr.match(/translate\(([-\d.e]+)px,\s*([-\d.e]+)px/i);
    if (m2d) return { tx: parseFloat(m2d[1]), ty: parseFloat(m2d[2]) };
    return { tx: 0, ty: 0 };
}

/** Node center in world / SVG user space (same as style.left/top + drag translate). */
function getNodeCenterWorldPx(el) {
    if (!el) return { x: 0, y: 0 };
    const baseLeft = parseFloat(el.style.left) || 0;
    const baseTop = parseFloat(el.style.top) || 0;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const { tx, ty } = parseTranslatePxFromTransform(el.style.transform);
    return {
        x: baseLeft + w / 2 + tx,
        y: baseTop + h / 2 + ty
    };
}

/** One line per node: world-space center px (same as cord geometry). JSON stores top-left. */
function ensureCodexNodeCoordLabel(el) {
    if (!el) return null;
    let lab = el.querySelector(':scope > .codex-node__coord-label');
    if (!lab) {
        lab = document.createElement('div');
        lab.className = 'codex-node__coord-label';
        lab.setAttribute('aria-hidden', 'true');
        lab.title =
            'Node center in world px (cord math). Saved layout uses top-left — center ≈ top-left + half size.';
        el.appendChild(lab);
    }
    return lab;
}

function syncCodexNodeCoordLabels() {
    if (!root) return;
    root.querySelectorAll('.codex-node').forEach((nodeEl) => {
        if (!root.contains(nodeEl)) return;
        const lab = ensureCodexNodeCoordLabel(nodeEl);
        const { x, y } = getNodeCenterWorldPx(nodeEl);
        lab.textContent = `${Math.round(x)}, ${Math.round(y)}`;
    });
}

const CODEX_OCT_RAD = Math.PI / 4;
/** Degrees from a 45° lane: within this, cord snaps on pointer-up; degree labels turn green while near a lane. */
const CODEX_OCT_SOFT_SNAP_TOL_DEG = 10;
/** Min center movement (px) when applying release snap (avoid jitter). */
const CODEX_OCT_RELEASE_SNAP_EPS = 0.35;

/**
 * True geometric bearing of segment p0→p1 in degrees (0–359, 0° = east → 90° = south, world y down).
 * @param {{ x: number, y: number }} p0
 * @param {{ x: number, y: number }} p1
 * @returns {number|null}
 */
function cordSegmentDegreesLabel(p0, p1) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return null;
    const ang = Math.atan2(dy, dx);
    let deg = Math.round((ang * 180) / Math.PI);
    deg = ((deg % 360) + 360) % 360;
    return deg;
}

/** Degrees from `angRad` to the nearest octilinear direction (multiple of 45°). */
function cordAngleDistToNearestOctilinearDegFromRad(angRad) {
    const snapped = Math.round(angRad / CODEX_OCT_RAD) * CODEX_OCT_RAD;
    return (Math.abs(angRad - snapped) * 180) / Math.PI;
}

function cordSegmentWithinOctilinearToleranceDegrees(p0, p1, tolDeg = CODEX_OCT_SOFT_SNAP_TOL_DEG) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return false;
    return cordAngleDistToNearestOctilinearDegFromRad(Math.atan2(dy, dx)) <= tolDeg + 1e-9;
}

/**
 * After a drag, snap each moved node’s center so incident segments to **fixed** neighbors are octilinear,
 * but only when the current bearing is already within {@link CODEX_OCT_SOFT_SNAP_TOL_DEG} of a 45° lane.
 * Multiple fixed neighbors: average candidate centers (then clamp). Runs in passes for small chains.
 */
function applyOctilinearSnapOnDragRelease(draggedIds, maxPasses = 14) {
    if (!root || !draggedIds || draggedIds.size === 0 || !codexEdges.length) return;

    const snapOneNodeFromFixedNeighbors = (nodeEl) => {
        const id = nodeEl.dataset.codexNodeId;
        if (!id) return false;
        const candidates = [];
        for (let j = 0; j < codexEdges.length; j++) {
            const e = codexEdges[j];
            let fixedId = null;
            let asToEndpoint = false;
            if (e.toId === id && !draggedIds.has(e.fromId)) {
                fixedId = e.fromId;
                asToEndpoint = true;
            } else if (e.fromId === id && !draggedIds.has(e.toId)) {
                fixedId = e.toId;
                asToEndpoint = false;
            }
            if (!fixedId) continue;
            const fixEl = codexNodeElById(fixedId);
            if (!fixEl || !root.contains(fixEl)) continue;
            const cFix = getNodeCenterWorldPx(fixEl);
            const cMe = getNodeCenterWorldPx(nodeEl);
            if (asToEndpoint) {
                const dx = cMe.x - cFix.x;
                const dy = cMe.y - cFix.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.5) continue;
                const ang = Math.atan2(dy, dx);
                if (cordAngleDistToNearestOctilinearDegFromRad(ang) > CODEX_OCT_SOFT_SNAP_TOL_DEG + 1e-9) {
                    continue;
                }
                const snappedAng = Math.round(ang / CODEX_OCT_RAD) * CODEX_OCT_RAD;
                candidates.push({
                    x: cFix.x + len * Math.cos(snappedAng),
                    y: cFix.y + len * Math.sin(snappedAng)
                });
            } else {
                const dx = cFix.x - cMe.x;
                const dy = cFix.y - cMe.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.5) continue;
                const ang = Math.atan2(dy, dx);
                if (cordAngleDistToNearestOctilinearDegFromRad(ang) > CODEX_OCT_SOFT_SNAP_TOL_DEG + 1e-9) {
                    continue;
                }
                const snappedAng = Math.round(ang / CODEX_OCT_RAD) * CODEX_OCT_RAD;
                candidates.push({
                    x: cFix.x - len * Math.cos(snappedAng),
                    y: cFix.y - len * Math.sin(snappedAng)
                });
            }
        }
        if (!candidates.length) return false;
        let sx = 0;
        let sy = 0;
        for (let i = 0; i < candidates.length; i++) {
            sx += candidates[i].x;
            sy += candidates[i].y;
        }
        const nx = sx / candidates.length;
        const ny = sy / candidates.length;
        const cur = getNodeCenterWorldPx(nodeEl);
        if ((nx - cur.x) ** 2 + (ny - cur.y) ** 2 < CODEX_OCT_RELEASE_SNAP_EPS * CODEX_OCT_RELEASE_SNAP_EPS) {
            return false;
        }
        applyWorldCenterToNodeTopLeft(nodeEl, nx, ny);
        return true;
    };

    const ids = [...draggedIds];
    for (let p = 0; p < maxPasses; p++) {
        let any = false;
        for (let i = 0; i < ids.length; i++) {
            const el = codexNodeElById(ids[i]);
            if (el && root.contains(el) && snapOneNodeFromFixedNeighbors(el)) any = true;
        }
        if (!any) break;
    }
}

/** Move node so its center is `(cx, cy)` after clamping to the board. */
function applyWorldCenterToNodeTopLeft(el, cx, cy) {
    if (!el || !root) return;
    const w = el.offsetWidth || 1;
    const h = el.offsetHeight || 1;
    const kind = el.dataset.codexKind || 'hero';
    const scale = parseFloat(el.dataset.codexScale) || 1;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const { x, y } = clampCodexNodeTopLeftToWorld(left, top, scale, kind);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
}

function codexNodeElById(nodeId) {
    if (!root || !nodeId) return null;
    return root.querySelector(`[data-codex-node-id="${escapeForAttrSelector(nodeId)}"]`);
}

/** Junction waypoint (“break”): cord packets may continue along outgoing directed edges. */
function codexNodeIsJunctionWaypoint(nodeId) {
    const el = codexNodeElById(nodeId);
    return !!(el && el.classList.contains('codex-node--junction'));
}

/** Node frame bounds in SVG / world px (includes in-drag transform), same as centers use. */
function getNodeFrameWorldRect(el) {
    if (!el) return null;
    const baseLeft = parseFloat(el.style.left) || 0;
    const baseTop = parseFloat(el.style.top) || 0;
    const { tx, ty } = parseTranslatePxFromTransform(el.style.transform);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return {
        left: baseLeft + tx,
        top: baseTop + ty,
        width: w,
        height: h,
        rotationDeg: parseFloat(el.dataset.codexHexRotation) || 0
    };
}

function buildPolylineForEdge(edge) {
    if (!root) return null;
    const a = root.querySelector(`[data-codex-node-id="${escapeForAttrSelector(edge.fromId)}"]`);
    const b = root.querySelector(`[data-codex-node-id="${escapeForAttrSelector(edge.toId)}"]`);
    if (!a || !b) return null;
    const ca = getNodeCenterWorldPx(a);
    const cb = getNodeCenterWorldPx(b);
    return [{ x: ca.x, y: ca.y }, { x: cb.x, y: cb.y }];
}

/**
 * @param {number} dx
 * @param {number} dy
 * @returns {'axis'|'diag'|'other'|null}
 */
function classifyCodexSegmentAxisOrDiagonal(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < 1.5) return null;
    const ang = Math.atan2(dy, dx);
    let deg = (ang * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    const mod90 = deg % 90;
    const distToAxis = Math.min(mod90, 90 - mod90);
    const distToDiag = Math.abs(mod90 - 45);
    const T = CODEX_ELBOW_BEARING_TOL_DEG;
    const axis = distToAxis <= T;
    const diag = distToDiag <= T;
    if (axis && diag) return distToAxis <= distToDiag ? 'axis' : 'diag';
    if (axis) return 'axis';
    if (diag) return 'diag';
    return 'other';
}

/**
 * Parallelogram at junction J filling the bend between incoming A→J and outgoing J→B (one arm axis, one 45°).
 * Vertices: J, J−ûL, J−ûL+v̂L, J+v̂L with û = A→J, v̂ = J→B.
 */
function codexElbowParallelogramPoints(jx, jy, dxIn, dyIn, dxOut, dyOut, armLen) {
    const l1 = Math.hypot(dxIn, dyIn);
    const l2 = Math.hypot(dxOut, dyOut);
    if (l1 < 1e-6 || l2 < 1e-6) return null;
    const ux = dxIn / l1;
    const uy = dyIn / l1;
    const vx = dxOut / l2;
    const vy = dyOut / l2;
    const L = armLen;
    const x0 = jx;
    const y0 = jy;
    const x1 = jx - ux * L;
    const y1 = jy - uy * L;
    const x2 = jx - ux * L + vx * L;
    const y2 = jy - uy * L + vy * L;
    const x3 = jx + vx * L;
    const y3 = jy + vy * L;
    return [
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: x3, y: y3 }
    ];
}

/** True when `nodeId` is a single bend on a path: exactly one link in and one out (not a split/merge). */
function codexWaypointIsSimpleCorner(nodeId) {
    if (!nodeId) return false;
    let outN = 0;
    let inN = 0;
    for (let k = 0; k < codexEdges.length; k += 1) {
        const e = codexEdges[k];
        if (e.fromId === nodeId) outN += 1;
        if (e.toId === nodeId) inN += 1;
    }
    return outN === 1 && inN === 1;
}

/**
 * Filled elbow facets at waypoints where a straight (axis) cord meets a 45° diagonal on the next segment.
 * Skipped at multi-way junctions (splits/merges); only simple in-degree-1 / out-degree-1 corners.
 * @param {SVGGElement} parentG
 * @param {string} ns
 */
function appendCodexJunctionElbowParallelograms(parentG, ns) {
    if (!root || !codexEdges.length) return;
    const seen = new Set();
    const arm = CODEX_ELBOW_PARALLELOGRAM_ARM_PX;

    for (let i = 0; i < codexEdges.length; i++) {
        const eIn = codexEdges[i];
        const jId = eIn.toId;
        const elJ = codexNodeElById(jId);
        if (!elJ || !elJ.classList.contains('codex-node--junction')) continue;
        if (!codexWaypointIsSimpleCorner(jId)) continue;
        const elA = codexNodeElById(eIn.fromId);
        if (!elA) continue;
        const cJ = getNodeCenterWorldPx(elJ);
        const cA = getNodeCenterWorldPx(elA);
        const dxIn = cJ.x - cA.x;
        const dyIn = cJ.y - cA.y;
        const clsIn = classifyCodexSegmentAxisOrDiagonal(dxIn, dyIn);
        if (clsIn !== 'axis' && clsIn !== 'diag') continue;

        for (let j = 0; j < codexEdges.length; j++) {
            const eOut = codexEdges[j];
            if (eOut.fromId !== jId) continue;
            const elB = codexNodeElById(eOut.toId);
            if (!elB) continue;
            const cB = getNodeCenterWorldPx(elB);
            const dxOut = cB.x - cJ.x;
            const dyOut = cB.y - cJ.y;
            const clsOut = classifyCodexSegmentAxisOrDiagonal(dxOut, dyOut);
            if (clsOut !== 'axis' && clsOut !== 'diag') continue;
            if (clsIn === clsOut) continue;
            if (clsIn === 'other' || clsOut === 'other') continue;

            const key = `${eIn.fromId}\x1e${jId}\x1e${eOut.toId}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const pts = codexElbowParallelogramPoints(cJ.x, cJ.y, dxIn, dyIn, dxOut, dyOut, arm);
            if (!pts) continue;

            const appearance = edgeCordAppearance(eOut);
            const fill =
                appearance === 'red' ? '#f87171' : appearance === 'yellow' ? '#fbbf24' : codexVisualPrefs.cordColor;
            const filterUrl =
                appearance === 'red'
                    ? 'url(#codex-edge-red-glow)'
                    : appearance === 'yellow'
                        ? 'url(#codex-edge-yellow-glow)'
                        : 'url(#codex-edge-violet-glow)';
            const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
            const elbowG = appendCordFilteredPolygonGroup(parentG, ns, {
                pointsStr,
                fill,
                filterUrl,
                polyClass: 'codex-edge-elbow-parallelogram'
            });
            const t = document.createElementNS(ns, 'title');
            t.textContent = 'Axis ↔ diagonal elbow at waypoint (octilinear bend)';
            elbowG.appendChild(t);
        }
    }
}

function clearPendingCodexDeleteState() {
    cordPendingDeletePairKey = null;
    codexBulkNodeDeleteArmedAt = 0;
    cordDoubleRightLastTs.clear();
    if (root) {
        root.querySelectorAll('.codex-node--pending-delete').forEach((el) => {
            el.classList.remove('codex-node--pending-delete');
        });
    }
}

function pruneStaleCodexSelection() {
    for (const el of [...codexSelectedNodeEls]) {
        if (!root || !root.contains(el)) codexSelectedNodeEls.delete(el);
    }
    if (codexPrimarySelectedNodeEl && (!root || !root.contains(codexPrimarySelectedNodeEl))) {
        codexPrimarySelectedNodeEl = null;
    }
    if (codexPrimarySelectedNodeEl && !codexSelectedNodeEls.has(codexPrimarySelectedNodeEl)) {
        const rest = [...codexSelectedNodeEls];
        codexPrimarySelectedNodeEl = rest.length ? rest[rest.length - 1] : null;
    }
}

function getSelectedCodexNodesInRoot() {
    pruneStaleCodexSelection();
    if (!root) return [];
    return [...codexSelectedNodeEls].filter((el) => root.contains(el));
}

function stripCodexSelectionFromDom() {
    if (!root) return;
    root.querySelectorAll('.codex-node--selected').forEach((el) => {
        el.classList.remove('codex-node--selected');
    });
}

function stripCodexBDescendantGlowFromDom() {
    if (!root) return;
    root.querySelectorAll('.codex-node--b-of-selected-a').forEach((el) => {
        el.classList.remove('codex-node--b-of-selected-a');
    });
}

/** All node ids reachable from `fromId` following directed edges (from → to), excluding `fromId`. */
function getCodexStrictOutgoingDescendantIds(fromId) {
    const result = new Set();
    const visited = new Set();
    const queue = [fromId];
    visited.add(fromId);
    while (queue.length) {
        const id = queue.shift();
        for (let i = 0; i < codexEdges.length; i++) {
            const e = codexEdges[i];
            if (e.fromId !== id) continue;
            const t = e.toId;
            if (!t || visited.has(t)) continue;
            visited.add(t);
            result.add(t);
            queue.push(t);
        }
    }
    return result;
}

function refreshCodexBDescendantGlowForSelection() {
    stripCodexBDescendantGlowFromDom();
    if (!root || codexInteractionMode !== 'drag' || codexSelectedNodeEls.size !== 1) return;
    const aEl = codexPrimarySelectedNodeEl;
    if (!aEl || !root.contains(aEl) || !codexSelectedNodeEls.has(aEl)) return;
    const aId = aEl.dataset.codexNodeId;
    if (!aId) return;
    getCodexStrictOutgoingDescendantIds(aId).forEach((bid) => {
        const bel = codexNodeElById(bid);
        if (bel && root.contains(bel)) bel.classList.add('codex-node--b-of-selected-a');
    });
}

function applyCodexSelectionToDom() {
    stripCodexSelectionFromDom();
    codexSelectedNodeEls.forEach((el) => {
        if (root && root.contains(el)) el.classList.add('codex-node--selected');
    });
    refreshCodexBDescendantGlowForSelection();
}

function edgeIsCordPendingDelete(edge) {
    return cordPendingDeletePairKey === codexUnorderedPairKey(edge.fromId, edge.toId);
}

/**
 * @returns {'red'|'yellow'|'violet'}
 */
function edgeCordAppearance(edge) {
    if (edgeIsCordPendingDelete(edge)) return 'red';
    if (edgeCordShowsYellow(edge)) return 'yellow';
    return 'violet';
}

/**
 * Clamp a shared translate so every node stays inside the board.
 * @param {number} tx
 * @param {number} ty
 * @param {HTMLElement[]} nodeEls
 */
function clampCodexGroupDragDelta(tx, ty, nodeEls) {
    let minTx = -Infinity;
    let maxTx = Infinity;
    let minTy = -Infinity;
    let maxTy = Infinity;
    for (let i = 0; i < nodeEls.length; i++) {
        const nodeEl = nodeEls[i];
        const bl = parseFloat(nodeEl.style.left) || 0;
        const bt = parseFloat(nodeEl.style.top) || 0;
        const w = nodeEl.offsetWidth;
        const h = nodeEl.offsetHeight;
        let maxX;
        let maxY;
        if (codexWorldEl) {
            maxX = Math.max(0, CODEX_WORLD_W - w);
            maxY = Math.max(0, CODEX_WORLD_H - h);
        } else {
            maxX = Math.max(0, root.clientWidth - w);
            maxY = Math.max(0, root.clientHeight - h);
        }
        minTx = Math.max(minTx, -bl);
        maxTx = Math.min(maxTx, maxX - bl);
        minTy = Math.max(minTy, -bt);
        maxTy = Math.min(maxTy, maxY - bt);
    }
    return {
        tx: Math.max(minTx, Math.min(maxTx, tx)),
        ty: Math.max(minTy, Math.min(maxTy, ty))
    };
}

function selectDragGroupForNode(el) {
    if (codexInteractionMode !== 'drag') return [el];
    pruneStaleCodexSelection();
    if (codexSelectedNodeEls.size > 1 && codexSelectedNodeEls.has(el)) {
        return [...codexSelectedNodeEls].filter((n) => root && root.contains(n));
    }
    return [el];
}

function markCodexLayoutDirty() {
    codexLayoutDirty = true;
    updateCodexToolbar();
}

function updateCodexToolbar() {
    if (!codexToolbarEl) return;
    const saveBtn = codexToolbarEl.querySelector('.codex-toolbar__save');
    const hint = codexToolbarEl.querySelector('.codex-toolbar__hint');
    const shrinkBtn = codexToolbarEl.querySelector('.codex-toolbar__shrink');
    const growBtn = codexToolbarEl.querySelector('.codex-toolbar__grow');
    const btnDrag = codexToolbarEl.querySelector('.codex-toolbar__mode-drag');
    const btnNet = codexToolbarEl.querySelector('.codex-toolbar__mode-network');
    const netHint = codexToolbarEl.querySelector('.codex-toolbar__network-hint');

    if (saveBtn) {
        saveBtn.disabled = !codexLayoutDirty;
        saveBtn.title = codexLayoutDirty
            ? 'Save Codex nodes and links (browser + data/codex-labels.json on dev server)'
            : 'No unsaved Codex changes';
    }
    if (hint) hint.style.display = codexLayoutDirty ? 'inline' : 'none';

    const selectedNodes = getSelectedCodexNodesInRoot();
    const hasSel = selectedNodes.length > 0;
    if (shrinkBtn) {
        shrinkBtn.disabled = !hasSel;
        shrinkBtn.title = hasSel
            ? (selectedNodes.length > 1 ? 'Shrink selected Codex nodes' : 'Shrink selected Codex node')
            : 'Select a Codex node first';
    }
    if (growBtn) {
        growBtn.disabled = !hasSel;
        growBtn.title = hasSel
            ? (selectedNodes.length > 1 ? 'Grow selected Codex nodes' : 'Grow selected Codex node')
            : 'Select a Codex node first';
    }

    const scaleInput = codexToolbarEl.querySelector('.codex-toolbar__scale-input');
    if (scaleInput) {
        const inputActive = document.activeElement === scaleInput;
        scaleInput.disabled = !hasSel;
        if (!inputActive) {
            if (!hasSel) {
                scaleInput.value = '';
                scaleInput.placeholder = '';
            } else {
                const uniform = getUniformCodexScaleForNodes(selectedNodes);
                if (uniform != null) {
                    scaleInput.value = formatCodexScaleForInput(uniform);
                    scaleInput.placeholder = '';
                } else {
                    scaleInput.value = '';
                    scaleInput.placeholder = '—';
                }
            }
        } else if (!hasSel) {
            scaleInput.disabled = true;
        }
    }

    ensureCodexToolbarSelectionPreviewRow(codexToolbarEl);
    const previewRow = codexToolbarEl.querySelector('.codex-toolbar__row--selection-preview');
    const singleWrap = previewRow?.querySelector('.codex-toolbar__endpoint-preview-single');
    const dualWrap = previewRow?.querySelector('.codex-toolbar__endpoint-preview-dual');
    const previewImgSingle = singleWrap?.querySelector('.codex-toolbar__selection-preview-img');
    const wrapA = dualWrap?.querySelector('.codex-toolbar__selection-preview--from');
    const wrapB = dualWrap?.querySelector('.codex-toolbar__selection-preview--to');
    const previewImgA = wrapA?.querySelector('.codex-toolbar__selection-preview-img');
    const previewImgB = wrapB?.querySelector('.codex-toolbar__selection-preview-img');
    const btnEdgeReverse = dualWrap?.querySelector('.codex-toolbar__edge-reverse');

    function fillCodexToolbarPreviewImg(img, nodeEl) {
        if (!img) return;
        if (!nodeEl) {
            img.removeAttribute('src');
            img.alt = '';
            return;
        }
        if (nodeEl.classList.contains('codex-node--junction')) {
            img.src = CODEX_JUNCTION_PREVIEW_DATA_URI;
            img.alt = 'Junction';
            return;
        }
        const portrait = nodeEl.querySelector('.codex-node__img');
        const src = portrait?.getAttribute('src') || portrait?.src || '';
        if (src) {
            img.src = src;
            img.alt = portrait?.getAttribute('alt') || '';
        } else {
            img.removeAttribute('src');
            img.alt = '';
        }
    }

    if (previewRow && previewImgSingle && dualWrap && wrapA && wrapB && previewImgA && previewImgB) {
        const st = getCodexToolbarEndpointPreviewState();
        if (st.kind === 'none') {
            previewImgSingle.removeAttribute('src');
            previewRow.style.display = 'none';
        } else if (st.kind === 'single') {
            singleWrap.style.display = '';
            dualWrap.style.display = 'none';
            const isJunction = st.fromEl.classList.contains('codex-node--junction');
            const portrait = st.fromEl.querySelector('.codex-node__img');
            const src = portrait?.getAttribute('src') || portrait?.src || '';
            if (isJunction || src) {
                fillCodexToolbarPreviewImg(previewImgSingle, st.fromEl);
                previewRow.style.display = '';
            } else {
                previewImgSingle.removeAttribute('src');
                previewRow.style.display = 'none';
            }
        } else {
            singleWrap.style.display = 'none';
            dualWrap.style.display = 'flex';
            wrapB.classList.remove('codex-toolbar__selection-preview--empty');
            if (st.kind === 'edge') {
                fillCodexToolbarPreviewImg(previewImgA, st.fromEl);
                fillCodexToolbarPreviewImg(previewImgB, st.toEl);
                if (btnEdgeReverse) {
                    btnEdgeReverse.disabled = false;
                    btnEdgeReverse.title =
                        'Reverse link direction (swap A and B; packets flow A → B)';
                }
            } else if (st.kind === 'pair-no-edge' || st.kind === 'cord-pending') {
                fillCodexToolbarPreviewImg(previewImgA, st.fromEl);
                fillCodexToolbarPreviewImg(previewImgB, st.toEl);
                if (btnEdgeReverse) {
                    btnEdgeReverse.disabled = true;
                    btnEdgeReverse.title =
                        st.kind === 'cord-pending'
                            ? 'Finish or cancel the link first — direction is set when the cord exists'
                            : 'No link between these nodes — reverse applies to an existing link';
                }
            } else if (st.kind === 'pending') {
                fillCodexToolbarPreviewImg(previewImgA, st.fromEl);
                fillCodexToolbarPreviewImg(previewImgB, null);
                wrapB.classList.add('codex-toolbar__selection-preview--empty');
                if (btnEdgeReverse) {
                    btnEdgeReverse.disabled = true;
                    btnEdgeReverse.title =
                        'Pick the second node — then you can reverse direction on the new link';
                }
            }
            previewRow.style.display = '';
        }
    }

    if (btnDrag) {
        btnDrag.classList.toggle('codex-toolbar__mode-btn--active', codexInteractionMode === 'drag');
    }
    if (btnNet) {
        btnNet.classList.toggle('codex-toolbar__mode-btn--active', codexInteractionMode === 'network');
    }
    if (netHint) {
        netHint.style.display = codexInteractionMode === 'network' ? 'block' : 'none';
        if (codexInteractionMode === 'network') {
            const line = networkLinkSourceId
                ? 'Tap another node to connect. Tap the same node again to cancel.'
                : 'Tap a node to start a link.';
            netHint.textContent = `${line} Caps Lock toggles drag / network.`;
        }
    }

    ensureCodexToolbarDebugToggle(codexToolbarEl);
    ensureCodexVisualPrefsPanel();
    syncCodexVisualToolbarFromPrefs();
    syncCodexDebugUiClass();
    refreshCodexBDescendantGlowForSelection();
}

function markNodeVisualUnsaved(el) {
    if (el && el.classList) el.classList.add('codex-node--unsaved');
}

/**
 * @param {HTMLElement|null} el
 * @param {{ network?: boolean, mode?: 'replace'|'toggle' }} [opts]
 */
function selectCodexNode(el, opts = {}) {
    if (!root) return;
    if (el == null) {
        codexSelectedNodeEls.clear();
        codexPrimarySelectedNodeEl = null;
        stripCodexSelectionFromDom();
        stripCodexBDescendantGlowFromDom();
        clearPendingCodexDeleteState();
        redrawCodexEdges();
        updateCodexToolbar();
        return;
    }
    if (!root.contains(el)) return;

    if (opts.network) {
        codexSelectedNodeEls.clear();
        codexSelectedNodeEls.add(el);
        codexPrimarySelectedNodeEl = el;
        applyCodexSelectionToDom();
        clearPendingCodexDeleteState();
        redrawCodexEdges();
        updateCodexToolbar();
        return;
    }

    const mode = opts.mode || 'replace';
    if (mode === 'toggle') {
        if (codexSelectedNodeEls.has(el)) {
            codexSelectedNodeEls.delete(el);
            if (codexPrimarySelectedNodeEl === el) {
                const rest = [...codexSelectedNodeEls];
                codexPrimarySelectedNodeEl = rest.length ? rest[rest.length - 1] : null;
            }
        } else {
            codexSelectedNodeEls.add(el);
            codexPrimarySelectedNodeEl = el;
        }
    } else {
        codexSelectedNodeEls.clear();
        codexSelectedNodeEls.add(el);
        codexPrimarySelectedNodeEl = el;
    }
    applyCodexSelectionToDom();
    clearPendingCodexDeleteState();
    redrawCodexEdges();
    updateCodexToolbar();
}

/** Select exactly two nodes (e.g. after linking). `primaryEl` drives toolbar preview when both exist. */
function selectCodexNodesPair(elA, elB, primaryEl) {
    if (!root) return;
    codexSelectedNodeEls.clear();
    if (elA && root.contains(elA)) codexSelectedNodeEls.add(elA);
    if (elB && root.contains(elB)) codexSelectedNodeEls.add(elB);
    if (primaryEl && root.contains(primaryEl)) {
        codexPrimarySelectedNodeEl = primaryEl;
    } else if (elB && root.contains(elB)) {
        codexPrimarySelectedNodeEl = elB;
    } else if (elA && root.contains(elA)) {
        codexPrimarySelectedNodeEl = elA;
    } else {
        codexPrimarySelectedNodeEl = null;
    }
    applyCodexSelectionToDom();
    clearPendingCodexDeleteState();
    redrawCodexEdges();
    updateCodexToolbar();
}

/** Toolbar mode buttons + clearing network pick state when entering network. */
function applyCodexToolbarInteractionMode(mode) {
    if (mode === 'network') {
        codexInteractionMode = 'network';
        networkLinkSourceId = null;
        selectCodexNode(null); /* updates toolbar */
    } else {
        codexInteractionMode = 'drag';
        networkLinkSourceId = null;
        updateCodexToolbar();
    }
}

function applyNodeScale(el, scale, skipRedraw) {
    const s = Math.max(CODEX_SCALE_MIN, Math.min(CODEX_SCALE_MAX, Number(scale) || 1));
    el.dataset.codexScale = String(s);
    const junction = el.classList.contains('codex-node--junction');
    const basePx = junction ? CODEX_JUNCTION_BASE_PX : CODEX_IMG_BASE_PX;
    const px = basePx * s;
    if (junction) {
        el.style.width = `${px}px`;
        el.style.height = `${px}px`;
    } else {
        const inner = el.querySelector('.codex-node__inner');
        const frame = el.querySelector('.codex-node__frame');
        if (inner) {
            inner.style.width = `${px}px`;
            inner.style.height = `${px}px`;
        }
        if (frame) {
            frame.style.width = `${px}px`;
            frame.style.height = `${px}px`;
        }
    }
    if (!skipRedraw) redrawCodexEdges();
}

function codexHasNodesSelectedForZoomRedirect() {
    return getSelectedCodexNodesInRoot().length > 0;
}

function nudgeSelectedNodeScale(factor) {
    const nodes = getSelectedCodexNodesInRoot();
    if (!nodes.length) return;
    nodes.forEach((nodeEl) => {
        const cur = parseFloat(nodeEl.dataset.codexScale) || 1;
        applyNodeScale(nodeEl, cur * factor, true);
        markNodeVisualUnsaved(nodeEl);
        markIncidentCodexEdgesUnsaved(nodeEl.dataset.codexNodeId);
    });
    markCodexLayoutDirty();
    redrawCodexEdges();
}

/** @param {HTMLElement[]} nodes */
function getUniformCodexScaleForNodes(nodes) {
    if (!nodes.length) return null;
    const s0 = parseFloat(nodes[0].dataset.codexScale) || 1;
    for (let i = 1; i < nodes.length; i++) {
        const si = parseFloat(nodes[i].dataset.codexScale) || 1;
        if (Math.abs(si - s0) > 1e-4) return null;
    }
    return s0;
}

function formatCodexScaleForInput(s) {
    const n = Number(s);
    if (!Number.isFinite(n)) return '';
    const r = Math.round(n * 1000) / 1000;
    return String(r);
}

function setSelectedNodesAbsoluteScale(raw) {
    const s = Math.max(CODEX_SCALE_MIN, Math.min(CODEX_SCALE_MAX, Number(raw) || 1));
    const nodes = getSelectedCodexNodesInRoot();
    if (!nodes.length) return;
    nodes.forEach((nodeEl) => {
        applyNodeScale(nodeEl, s, true);
        markNodeVisualUnsaved(nodeEl);
        markIncidentCodexEdgesUnsaved(nodeEl.dataset.codexNodeId);
    });
    markCodexLayoutDirty();
    redrawCodexEdges();
}

function bindCodexToolbarScaleInput(input) {
    input.type = 'number';
    input.className = 'codex-toolbar__scale-input';
    input.step = '0.05';
    input.min = String(CODEX_SCALE_MIN);
    input.max = String(CODEX_SCALE_MAX);
    input.setAttribute('aria-label', 'Selected node scale');
    input.title = `Node scale ${CODEX_SCALE_MIN}–${CODEX_SCALE_MAX}. Same value for all selected nodes; empty if sizes differ.`;
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            input.blur();
        }
    });
    input.addEventListener('change', () => {
        if (!codexToolbarEl || input.disabled) return;
        const v = String(input.value || '').trim();
        if (v === '') {
            updateCodexToolbar();
            return;
        }
        setSelectedNodesAbsoluteScale(v);
        updateCodexToolbar();
    });
}

function ensureCodexToolbarScaleInput(bar) {
    const row = bar?.querySelector('.codex-toolbar__shrink')?.parentElement;
    if (!row || row.querySelector('.codex-toolbar__scale-input')) return;
    const input = document.createElement('input');
    bindCodexToolbarScaleInput(input);
    const grow = row.querySelector('.codex-toolbar__grow');
    if (grow) {
        row.insertBefore(input, grow);
    } else {
        row.appendChild(input);
    }
}

function removeEdgesTouchingNodeId(nodeId) {
    codexEdges.forEach((e) => {
        if (e.fromId === nodeId || e.toId === nodeId) {
            codexUnsavedEdgeKeys.delete(edgeDirectedKey(e.fromId, e.toId));
        }
    });
    const next = codexEdges.filter((e) => e.fromId !== nodeId && e.toId !== nodeId);
    if (next.length !== codexEdges.length) {
        codexEdges = next;
        redrawCodexEdges();
    }
}

function removeEdgesTouchingNodeIds(nodeIds) {
    const idSet = new Set((nodeIds || []).filter(Boolean));
    if (!idSet.size) return;
    codexEdges.forEach((e) => {
        if (idSet.has(e.fromId) || idSet.has(e.toId)) {
            codexUnsavedEdgeKeys.delete(edgeDirectedKey(e.fromId, e.toId));
        }
    });
    const next = codexEdges.filter((e) => !idSet.has(e.fromId) && !idSet.has(e.toId));
    if (next.length !== codexEdges.length) {
        codexEdges = next;
        redrawCodexEdges();
    }
}

function edgeCordIsActivelyUpdating(edge) {
    if (codexActiveDragNodeIds.size > 0) {
        if (codexActiveDragNodeIds.has(edge.fromId) || codexActiveDragNodeIds.has(edge.toId)) {
            return true;
        }
    }
    return false;
}

function edgeCordShowsYellow(edge) {
    return (
        codexUnsavedEdgeKeys.has(edgeDirectedKey(edge.fromId, edge.toId))
        || edgeCordIsActivelyUpdating(edge)
    );
}

const CODEX_EDGES_NODE_ALPHA_MASK_ID = 'codex-edges-node-alpha-mask';

/**
 * Mask cords by node alpha art: PNG white keeps strokes visible, black hides them under the hex.
 */
function appendCodexEdgeNodeMask(defs, ns, vw, vh) {
    const mask = document.createElementNS(ns, 'mask');
    mask.setAttribute('id', CODEX_EDGES_NODE_ALPHA_MASK_ID);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', String(vw));
    mask.setAttribute('height', String(vh));
    const base = document.createElementNS(ns, 'rect');
    base.setAttribute('width', String(vw));
    base.setAttribute('height', String(vh));
    base.setAttribute('fill', 'white');
    mask.appendChild(base);
    if (root) {
        root.querySelectorAll('.codex-node').forEach((el) => {
            const r = getNodeFrameWorldRect(el);
            if (!r || r.width < 1 || r.height < 1) return;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            if (el.dataset.codexKind === 'junction') {
                if (!codexDebugUiVisible) return;
                const rad = Math.min(r.width, r.height) / 2;
                const circ = document.createElementNS(ns, 'circle');
                circ.setAttribute('cx', String(cx));
                circ.setAttribute('cy', String(cy));
                circ.setAttribute('r', String(Math.max(1, rad)));
                circ.setAttribute('fill', 'white');
                mask.appendChild(circ);
                return;
            }
            const img = document.createElementNS(ns, 'image');
            img.setAttribute('href', CODEX_NODE_ALPHA_IMAGE_URL);
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', CODEX_NODE_ALPHA_IMAGE_URL);
            img.setAttribute('x', String(r.left));
            img.setAttribute('y', String(r.top));
            img.setAttribute('width', String(r.width));
            img.setAttribute('height', String(r.height));
            img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            if (r.rotationDeg) {
                img.setAttribute('transform', `rotate(${r.rotationDeg} ${cx} ${cy})`);
            }
            mask.appendChild(img);
        });
    }
    defs.appendChild(mask);
}

function codexClamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

function codexEffectivePacketStrokeRange() {
    const base = codexVisualPrefs.cordThickness * codexVisualPrefs.packetThicknessMult;
    return { min: base * 0.97, max: base * 1.03 };
}

function normalizeCodexVisualPrefs(raw) {
    const o = { ...CODEX_VISUAL_DEFAULTS };
    if (!raw || typeof raw !== 'object') return o;
    const hex6 = (v, key) => {
        if (typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)) o[key] = v;
    };
    hex6(raw.cordColor, 'cordColor');
    hex6(raw.packetColorIdle, 'packetColorIdle');
    hex6(raw.packetColorActive, 'packetColorActive');
    const nn = (v, def) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
    o.cordThickness = codexClamp(nn(raw.cordThickness, o.cordThickness), 0.5, 14);
    o.cordBlur = codexClamp(nn(raw.cordBlur, o.cordBlur), 0, 18);
    o.cordMorph = codexClamp(nn(raw.cordMorph, o.cordMorph), 0, 5);
    o.cordGlowLayers = Math.round(codexClamp(nn(raw.cordGlowLayers, o.cordGlowLayers), 1, 6));
    o.packetThicknessMult = codexClamp(nn(raw.packetThicknessMult, o.packetThicknessMult), 0.3, 3.5);
    o.packetBlurMult = codexClamp(nn(raw.packetBlurMult, o.packetBlurMult), 0.2, 3.5);
    o.packetMorphMult = codexClamp(nn(raw.packetMorphMult, o.packetMorphMult), 0.3, 3.5);
    o.packetGlowLayers = Math.round(codexClamp(nn(raw.packetGlowLayers, o.packetGlowLayers), 1, 6));
    o.packetOpacity = codexClamp(nn(raw.packetOpacity, o.packetOpacity), 0.1, 1);
    return o;
}

function loadCodexVisualPrefs() {
    try {
        const raw = JSON.parse(localStorage.getItem(CODEX_VISUAL_PREFS_KEY) || 'null');
        codexVisualPrefs = normalizeCodexVisualPrefs(raw);
    } catch (_) {
        codexVisualPrefs = { ...CODEX_VISUAL_DEFAULTS };
    }
}

function persistCodexVisualPrefs() {
    try {
        localStorage.setItem(CODEX_VISUAL_PREFS_KEY, JSON.stringify(codexVisualPrefs));
    } catch (_) {
        /* ignore */
    }
}

/**
 * Cord: dilate + blur with stacked halo; `blurLayers` controls glow strength (merge count before core).
 */
function appendEdgeGlowFilter(defs, id, blurResultId, {
    stdDeviation,
    morphRadius,
    blurLayers,
    viewW = null,
    viewH = null
}) {
    const ns = 'http://www.w3.org/2000/svg';
    const morphResultId = `${blurResultId}Morph`;
    const filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', id);
    if (viewW != null && viewH != null) {
        filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', String(viewW));
        filter.setAttribute('height', String(viewH));
    } else {
        filter.setAttribute('x', '-80%');
        filter.setAttribute('y', '-80%');
        filter.setAttribute('width', '260%');
        filter.setAttribute('height', '260%');
    }
    const morph = document.createElementNS(ns, 'feMorphology');
    morph.setAttribute('operator', 'dilate');
    morph.setAttribute('radius', String(morphRadius));
    morph.setAttribute('in', 'SourceGraphic');
    morph.setAttribute('result', morphResultId);
    const blur = document.createElementNS(ns, 'feGaussianBlur');
    blur.setAttribute('in', morphResultId);
    blur.setAttribute('stdDeviation', String(stdDeviation));
    blur.setAttribute('result', blurResultId);
    const merge = document.createElementNS(ns, 'feMerge');
    const nBlur = Math.max(1, Math.min(8, Math.round(blurLayers)));
    for (let b = 0; b < nBlur; b += 1) {
        const mn = document.createElementNS(ns, 'feMergeNode');
        mn.setAttribute('in', blurResultId);
        merge.appendChild(mn);
    }
    const mnCore = document.createElementNS(ns, 'feMergeNode');
    mnCore.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mnCore);
    filter.appendChild(morph);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);
}

/** Packet halo: same stack pattern; σ and morph from {@link codexVisualPrefs}. */
function appendSoftPacketGlowFilter(defs, id, blurResultId, {
    stdDeviation,
    morphRadius,
    blurLayers,
    viewW = null,
    viewH = null
}) {
    const ns = 'http://www.w3.org/2000/svg';
    const morphResultId = `${blurResultId}Morph`;
    const filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', id);
    if (viewW != null && viewH != null) {
        filter.setAttribute('filterUnits', 'userSpaceOnUse');
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', String(viewW));
        filter.setAttribute('height', String(viewH));
    } else {
        filter.setAttribute('x', '-80%');
        filter.setAttribute('y', '-80%');
        filter.setAttribute('width', '260%');
        filter.setAttribute('height', '260%');
    }
    const morph = document.createElementNS(ns, 'feMorphology');
    morph.setAttribute('operator', 'dilate');
    morph.setAttribute('radius', String(morphRadius));
    morph.setAttribute('in', 'SourceGraphic');
    morph.setAttribute('result', morphResultId);
    const blur = document.createElementNS(ns, 'feGaussianBlur');
    blur.setAttribute('in', morphResultId);
    blur.setAttribute('stdDeviation', String(stdDeviation));
    blur.setAttribute('result', blurResultId);
    const merge = document.createElementNS(ns, 'feMerge');
    const nBlur = Math.max(1, Math.min(8, Math.round(blurLayers)));
    for (let b = 0; b < nBlur; b += 1) {
        const mn = document.createElementNS(ns, 'feMergeNode');
        mn.setAttribute('in', blurResultId);
        merge.appendChild(mn);
    }
    const mnCore = document.createElementNS(ns, 'feMergeNode');
    mnCore.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mnCore);
    filter.appendChild(morph);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);
}

/**
 * SVG filter region uses the painted bounds of filtered content. Pure H/V strokes have a
 * degenerate bbox, so glow clips differently than on diagonals. A zero-alpha fat stroke expands
 * the group bbox without visible contribution (opacity 0 on the line).
 */
function appendCordFilteredLineGroup(parent, ns, {
    x1,
    y1,
    x2,
    y2,
    stroke,
    strokeWidth,
    strokeOpacity = '1',
    filterUrl,
    lineClass,
    padStrokeWidth = CODEX_EDGE_FILTER_PAD_PX
}) {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('filter', filterUrl);
    const pad = document.createElementNS(ns, 'line');
    pad.classList.add('codex-edge-filter-pad');
    pad.setAttribute('x1', String(x1));
    pad.setAttribute('y1', String(y1));
    pad.setAttribute('x2', String(x2));
    pad.setAttribute('y2', String(y2));
    pad.setAttribute('stroke', '#ffffff');
    pad.setAttribute('stroke-opacity', '0');
    pad.setAttribute('stroke-width', String(padStrokeWidth));
    pad.setAttribute('stroke-linecap', 'round');
    pad.setAttribute('aria-hidden', 'true');
    const vis = document.createElementNS(ns, 'line');
    if (lineClass) vis.classList.add(lineClass);
    vis.setAttribute('x1', String(x1));
    vis.setAttribute('y1', String(y1));
    vis.setAttribute('x2', String(x2));
    vis.setAttribute('y2', String(y2));
    vis.setAttribute('stroke', stroke);
    vis.setAttribute('stroke-width', String(strokeWidth));
    vis.setAttribute('stroke-linecap', 'round');
    vis.setAttribute('stroke-opacity', strokeOpacity);
    g.appendChild(pad);
    g.appendChild(vis);
    parent.appendChild(g);
}

/** Unfiltered stroke (sharp core); no glow pad — used for meteor “white-hot” flash on top of filtered packets. */
function appendCordPlainLineGroup(parent, ns, {
    x1,
    y1,
    x2,
    y2,
    stroke,
    strokeWidth,
    strokeOpacity = '1',
    lineClass
}) {
    const g = document.createElementNS(ns, 'g');
    const vis = document.createElementNS(ns, 'line');
    if (lineClass) vis.classList.add(lineClass);
    vis.setAttribute('x1', String(x1));
    vis.setAttribute('y1', String(y1));
    vis.setAttribute('x2', String(x2));
    vis.setAttribute('y2', String(y2));
    vis.setAttribute('stroke', stroke);
    vis.setAttribute('stroke-width', String(strokeWidth));
    vis.setAttribute('stroke-linecap', 'round');
    vis.setAttribute('stroke-opacity', strokeOpacity);
    g.appendChild(vis);
    parent.appendChild(g);
}

/**
 * Same filter stack as {@link appendCordFilteredLineGroup} for a filled polygon (junction elbow).
 * Invisible stroked duplicate expands filter bbox like the cord pad line.
 */
function appendCordFilteredPolygonGroup(parent, ns, {
    pointsStr,
    fill,
    fillOpacity = String(CODEX_CORD_STROKE_OPACITY),
    filterUrl,
    polyClass,
    padStrokeWidth = CODEX_EDGE_FILTER_PAD_PX
}) {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('filter', filterUrl);
    const pad = document.createElementNS(ns, 'polygon');
    pad.classList.add('codex-edge-filter-pad');
    pad.setAttribute('points', pointsStr);
    pad.setAttribute('fill', 'none');
    pad.setAttribute('stroke', '#ffffff');
    pad.setAttribute('stroke-opacity', '0');
    pad.setAttribute('stroke-width', String(padStrokeWidth));
    pad.setAttribute('stroke-linejoin', 'round');
    pad.setAttribute('aria-hidden', 'true');
    const vis = document.createElementNS(ns, 'polygon');
    if (polyClass) vis.classList.add(polyClass);
    vis.setAttribute('points', pointsStr);
    vis.setAttribute('fill', fill);
    vis.setAttribute('fill-opacity', fillOpacity);
    vis.setAttribute('stroke', 'none');
    g.appendChild(pad);
    g.appendChild(vis);
    parent.appendChild(g);
    return g;
}

/**
 * Random forward continuation after the first hop `fromId → toId`: walk through junction waypoints,
 * picking a random outgoing edge at each split (never immediately back to `prev`).
 * Stops at the first hero/faction (non-junction) node.
 * @returns {string[]}
 */
function samplePacketTailNodeIds(fromId, toId) {
    if (!codexNodeIsJunctionWaypoint(toId)) return [];
    const tail = [];
    let cur = toId;
    let prev = fromId;
    while (codexNodeIsJunctionWaypoint(cur)) {
        const outs = codexEdges.filter((e) => e.fromId === cur && e.toId !== prev);
        if (outs.length === 0) break;
        const pick = outs[Math.floor(Math.random() * outs.length)];
        tail.push(pick.toId);
        prev = cur;
        cur = pick.toId;
    }
    return tail;
}

/**
 * @param {string} fromId
 * @param {string} toId
 * @param {string[]} tailNodeIds
 * @returns {{ x: number, y: number }[]|null}
 */
function tryBuildPacketWorldPoints(fromId, toId, tailNodeIds) {
    const ids = [fromId, toId, ...tailNodeIds];
    const pts = [];
    for (let i = 0; i < ids.length; i++) {
        const el = codexNodeElById(ids[i]);
        if (!el) return null;
        pts.push(getNodeCenterWorldPx(el));
    }
    for (let i = 0; i < ids.length - 1; i++) {
        if (!findEdge(ids[i], ids[i + 1])) return null;
    }
    return pts;
}

/**
 * @param {{ pts: { x: number, y: number }[], segLens: number[], totalLen: number }} p
 */
function recomputePacketPolylineMetrics(p) {
    const pts = p.pts;
    const segs = [];
    let total = 0;
    if (!pts || pts.length < 2) {
        p.segLens = [];
        p.totalLen = 0;
        return;
    }
    for (let i = 0; i < pts.length - 1; i += 1) {
        const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        segs.push(d);
        total += d;
    }
    p.segLens = segs;
    p.totalLen = total;
}

/**
 * Refreshes `p.pts` from node centers; keeps or re-samples `p.tailNodeIds` if the chain is invalid.
 * @param {{ tailNodeIds?: string[], pts: { x: number, y: number }[], segLens: number[], totalLen: number }} p
 */
function syncPacketPathToEdge(p, fromId, toId) {
    let tail = Array.isArray(p.tailNodeIds) ? p.tailNodeIds : null;
    if (tail == null) {
        tail = samplePacketTailNodeIds(fromId, toId);
        p.tailNodeIds = tail;
    }
    let pts = tryBuildPacketWorldPoints(fromId, toId, tail);
    if (!pts) {
        tail = samplePacketTailNodeIds(fromId, toId);
        p.tailNodeIds = tail;
        pts = tryBuildPacketWorldPoints(fromId, toId, tail);
    }
    if (!pts) {
        const a = codexNodeElById(fromId);
        const b = codexNodeElById(toId);
        p.tailNodeIds = [];
        if (!a || !b) {
            p.pts = [];
        } else {
            p.pts = [getNodeCenterWorldPx(a), getNodeCenterWorldPx(b)];
        }
    } else {
        p.pts = pts;
    }
    recomputePacketPolylineMetrics(p);
}

function sampleCodexPacketPulseProfile() {
    return {
        pulseRiseSec: CODEX_PACKET_PULSE_RISE_MIN_SEC
            + Math.random() * (CODEX_PACKET_PULSE_RISE_MAX_SEC - CODEX_PACKET_PULSE_RISE_MIN_SEC),
        /** Exponential decay time constant τ (seconds); amplitude ≈ e^(-Δt/τ) after rise. */
        pulseDecaySec: CODEX_PACKET_PULSE_DECAY_MIN_SEC
            + Math.random() * (CODEX_PACKET_PULSE_DECAY_MAX_SEC - CODEX_PACKET_PULSE_DECAY_MIN_SEC)
    };
}

/**
 * Meteor flash: steep ease-out to peak during rise, then exponential decay (short glare, not a long ramp).
 */
function codexPacketPulseStrength(ageSec, riseSec, decayTauSec) {
    if (ageSec <= 0) return 0;
    if (riseSec < 1e-6) return 0;
    if (ageSec < riseSec) {
        const t = ageSec / riseSec;
        return 1 - (1 - t) ** 4;
    }
    const tau = Math.max(decayTauSec, 1e-6);
    return Math.exp(-(ageSec - riseSec) / tau);
}

function ensureCodexPacketPulseFields(p) {
    if (p.pulseRiseSec == null || p.pulseDecaySec == null) {
        const s = sampleCodexPacketPulseProfile();
        p.pulseRiseSec = s.pulseRiseSec;
        p.pulseDecaySec = s.pulseDecaySec;
    }
    if (p.pulseAgeSec == null) p.pulseAgeSec = 0;
}

function createCodexCordPacketsForEdge(fromId, toId) {
    const n = CODEX_PACKET_COUNT_MIN
        + Math.floor(Math.random() * (CODEX_PACKET_COUNT_MAX - CODEX_PACKET_COUNT_MIN + 1));
    const packets = [];
    const { min: pwMin, max: pwMax } = codexEffectivePacketStrokeRange();
    for (let i = 0; i < n; i += 1) {
        const pulse = sampleCodexPacketPulseProfile();
        const p = {
            headT: Math.random(),
            speed: CODEX_PACKET_SPEED_MIN + Math.random() * (CODEX_PACKET_SPEED_MAX - CODEX_PACKET_SPEED_MIN),
            /** Biased short: most packets are small bright bursts along the cord */
            lengthT: 0.014 + Math.pow(Math.random(), 1.75) * 0.072,
            width:
                pwMin
                + Math.random() * (pwMax - pwMin),
            pts: [],
            segLens: [],
            totalLen: 0,
            pulseRiseSec: pulse.pulseRiseSec,
            pulseDecaySec: pulse.pulseDecaySec,
            pulseAgeSec: 0
        };
        syncPacketPathToEdge(p, fromId, toId);
        packets.push(p);
    }
    return packets;
}

/**
 * @param {typeof codexEdges[0]} edge
 */
function syncCodexCordPacketState(edgePolys) {
    const seen = new Set();
    edgePolys.forEach(({ edge }) => {
        const { fromId, toId } = edge;
        /** Packets only originate on hero/faction links; motion through waypoints rides tails from those starts. */
        if (codexNodeIsJunctionWaypoint(fromId)) return;
        const key = edgeDirectedKey(fromId, toId);
        seen.add(key);
        let st = codexCordPacketState.get(key);
        if (!st) {
            st = {
                fromId,
                toId,
                active: false,
                packets: createCodexCordPacketsForEdge(fromId, toId)
            };
            codexCordPacketState.set(key, st);
        } else {
            st.fromId = fromId;
            st.toId = toId;
            st.packets.forEach((p) => {
                syncPacketPathToEdge(p, fromId, toId);
            });
        }
        st.active = edgeCordShowsYellow(edge);
    });
    codexCordPacketState.forEach((_, k) => {
        if (!seen.has(k)) codexCordPacketState.delete(k);
    });
}

/**
 * @param {{ pts: { x: number, y: number }[], segLens: number[], totalLen: number }} poly
 * @param {number} t — 0..1 along total arc length
 */
function pointOnPolyline(poly, t) {
    const { pts, segLens, totalLen } = poly;
    if (!pts.length) return { x: 0, y: 0 };
    if (t <= 0) return { x: pts[0].x, y: pts[0].y };
    if (t >= 1) return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    if (totalLen < 1e-6) return { x: pts[0].x, y: pts[0].y };
    let d = t * totalLen;
    for (let i = 0; i < segLens.length; i += 1) {
        const sl = segLens[i];
        if (d <= sl || i === segLens.length - 1) {
            const u = sl < 1e-6 ? 1 : d / sl;
            return {
                x: pts[i].x + u * (pts[i + 1].x - pts[i].x),
                y: pts[i].y + u * (pts[i + 1].y - pts[i].y)
            };
        }
        d -= sl;
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
}

/** World point at arc length `s` (0 … totalLen) along cord polyline. */
function codexPointAtArcLength(poly, s) {
    const { pts, segLens, totalLen } = poly;
    if (!pts?.length) return { x: 0, y: 0 };
    const cl = Math.max(0, Math.min(totalLen, s));
    if (totalLen < 1e-6) return { x: pts[0].x, y: pts[0].y };
    let cum = 0;
    for (let i = 0; i < segLens.length; i += 1) {
        const sl = segLens[i];
        const segEnd = cum + sl;
        if (cl <= segEnd + 1e-9 || i === segLens.length - 1) {
            const u = sl < 1e-6 ? 1 : (cl - cum) / sl;
            const uu = Math.max(0, Math.min(1, u));
            return {
                x: pts[i].x + uu * (pts[i + 1].x - pts[i].x),
                y: pts[i].y + uu * (pts[i + 1].y - pts[i].y)
            };
        }
        cum = segEnd;
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
}

/**
 * Ordered points along the cord from arc `tTail` to `tHead`, inserting waypoint vertices so the
 * packet can be drawn as separate strokes per leg (no diagonal across corners; reads as transfer).
 * @returns {{ x: number, y: number }[]}
 */
function buildCodexPacketCordPolylinePoints(poly, tTail, tHead) {
    const { pts, segLens, totalLen } = poly;
    if (!pts?.length || totalLen < 1e-6) return [];
    const s0 = Math.max(0, Math.min(totalLen, tTail * totalLen));
    const s1 = Math.max(0, Math.min(totalLen, tHead * totalLen));
    if (s1 <= s0 + 1e-4) return [];
    const list = [];
    const eps = 0.45;
    const pushPt = (p) => {
        const prev = list[list.length - 1];
        if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > eps) list.push(p);
    };
    pushPt(codexPointAtArcLength(poly, s0));
    let cum = 0;
    for (let i = 0; i < segLens.length; i += 1) {
        const segEnd = cum + segLens[i];
        if (s0 < segEnd - 1e-6 && segEnd < s1 - 1e-6) {
            pushPt({ x: pts[i + 1].x, y: pts[i + 1].y });
        }
        cum = segEnd;
    }
    pushPt(codexPointAtArcLength(poly, s1));
    return list;
}

/**
 * One filtered stroke per cord leg so energy meets at waypoints instead of cutting the corner.
 */
function appendCodexCordPacketAlongCord(pktG, ns, poly, tTail, tHead, {
    stroke,
    strokeWidth,
    strokeOpacity,
    filterUrl,
    padStrokeWidth
}) {
    const pathPts = buildCodexPacketCordPolylinePoints(poly, tTail, tHead);
    if (pathPts.length < 2) return;
    for (let i = 0; i < pathPts.length - 1; i += 1) {
        const ax = pathPts[i].x;
        const ay = pathPts[i].y;
        const bx = pathPts[i + 1].x;
        const by = pathPts[i + 1].y;
        if (Math.hypot(bx - ax, by - ay) < 0.4) continue;
        appendCordFilteredLineGroup(pktG, ns, {
            x1: ax,
            y1: ay,
            x2: bx,
            y2: by,
            stroke,
            strokeWidth,
            strokeOpacity: String(strokeOpacity),
            filterUrl,
            lineClass: 'codex-edge-packet',
            padStrokeWidth
        });
    }
}

/** Bright unfiltered core along the same legs as {@link appendCodexCordPacketAlongCord} (draw after glow). */
function appendCodexCordMeteorCoreAlongCord(pktG, ns, poly, tTail, tHead, {
    stroke,
    strokeWidth,
    strokeOpacity
}) {
    const pathPts = buildCodexPacketCordPolylinePoints(poly, tTail, tHead);
    if (pathPts.length < 2) return;
    for (let i = 0; i < pathPts.length - 1; i += 1) {
        const ax = pathPts[i].x;
        const ay = pathPts[i].y;
        const bx = pathPts[i + 1].x;
        const by = pathPts[i + 1].y;
        if (Math.hypot(bx - ax, by - ay) < 0.4) continue;
        appendCordPlainLineGroup(pktG, ns, {
            x1: ax,
            y1: ay,
            x2: bx,
            y2: by,
            stroke,
            strokeWidth,
            strokeOpacity: String(strokeOpacity),
            lineClass: 'codex-edge-packet-meteor-core'
        });
    }
}

function codexStopCordAnimRafOnly() {
    if (codexCordAnimRafId) {
        cancelAnimationFrame(codexCordAnimRafId);
        codexCordAnimRafId = 0;
    }
    codexCordAnimLastTs = 0;
}

function codexCordAnimationTick(ts) {
    codexCordAnimRafId = requestAnimationFrame(codexCordAnimationTick);
    if (!root || !document.body.contains(root)) {
        codexStopCordAnimRafOnly();
        codexCordPacketState.clear();
        return;
    }
    const svg = root.querySelector('.codex-edges-layer');
    const pktG = svg?.querySelector('.codex-edge-packets');
    if (!pktG || codexCordPacketState.size === 0) return;

    const dt = codexCordAnimLastTs ? Math.min(0.055, (ts - codexCordAnimLastTs) / 1000) : 1 / 60;
    codexCordAnimLastTs = ts;

    const ns = 'http://www.w3.org/2000/svg';
    while (pktG.firstChild) pktG.removeChild(pktG.firstChild);

    codexCordPacketState.forEach((st) => {
        st.packets.forEach((p) => {
            if (!p.pts || p.pts.length < 2 || p.totalLen < 1e-3) return;
            ensureCodexPacketPulseFields(p);
            p.headT += p.speed * dt;
            if (p.headT > 1) {
                p.headT %= 1;
                p.tailNodeIds = samplePacketTailNodeIds(st.fromId, st.toId);
                syncPacketPathToEdge(p, st.fromId, st.toId);
                p.speed = CODEX_PACKET_SPEED_MIN
                    + Math.random() * (CODEX_PACKET_SPEED_MAX - CODEX_PACKET_SPEED_MIN);
                p.lengthT = 0.014 + Math.pow(Math.random(), 1.75) * 0.072;
                const { min: pwMin, max: pwMax } = codexEffectivePacketStrokeRange();
                p.width = pwMin + Math.random() * (pwMax - pwMin);
                const pulse = sampleCodexPacketPulseProfile();
                p.pulseRiseSec = pulse.pulseRiseSec;
                p.pulseDecaySec = pulse.pulseDecaySec;
                p.pulseAgeSec = 0;
            }
            p.pulseAgeSec += dt;
            const pulseStr = codexPacketPulseStrength(
                p.pulseAgeSec,
                p.pulseRiseSec,
                p.pulseDecaySec
            );
            const baseOpac = codexVisualPrefs.packetOpacity;
            const opLow = CODEX_PACKET_PULSE_OPACITY_LOW_MULT;
            const opHigh = CODEX_PACKET_PULSE_OPACITY_PEAK_MULT;
            const effOpac = Math.min(
                1,
                baseOpac * (opLow + pulseStr * (opHigh - opLow))
            );
            const wLow = CODEX_PACKET_PULSE_WIDTH_LOW_MULT;
            const wHigh = CODEX_PACKET_PULSE_WIDTH_PEAK_MULT;
            const effWidth = p.width * (wLow + pulseStr * (wHigh - wLow));
            const padBase = CODEX_EDGE_FILTER_PAD_PX * codexVisualPrefs.packetThicknessMult;
            const pLow = CODEX_PACKET_PULSE_PAD_LOW_MULT;
            const pHigh = CODEX_PACKET_PULSE_PAD_PEAK_MULT;
            const padW = Math.round(padBase * (pLow + pulseStr * (pHigh - pLow)));
            const tailT = Math.max(0, p.headT - p.lengthT);
            const packetStroke = st.active
                ? codexVisualPrefs.packetColorActive
                : codexVisualPrefs.packetColorIdle;
            appendCodexCordPacketAlongCord(pktG, ns, p, tailT, p.headT, {
                stroke: packetStroke,
                strokeWidth: effWidth,
                strokeOpacity: effOpac,
                filterUrl: 'url(#codex-edge-packet-pink-soft)',
                padStrokeWidth: padW
            });
            if (pulseStr > CODEX_PACKET_METEOR_CORE_MIN_PULSE) {
                const coreBoost = pulseStr * pulseStr;
                const coreW = p.width * (0.38 + 1.05 * pulseStr);
                const coreOpac = Math.min(1, 0.15 + 0.92 * coreBoost);
                appendCodexCordMeteorCoreAlongCord(pktG, ns, p, tailT, p.headT, {
                    stroke: '#fff6e8',
                    strokeWidth: coreW,
                    strokeOpacity: coreOpac
                });
            }
        });
    });
}

function ensureCodexCordAnimationLoop() {
    if (codexCordAnimRafId) return;
    codexCordAnimLastTs = 0;
    codexCordAnimRafId = requestAnimationFrame(codexCordAnimationTick);
}

function redrawCodexEdges() {
    const svg = root?.querySelector('.codex-edges-layer');
    if (!svg || !root) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const ns = 'http://www.w3.org/2000/svg';
    const vw = codexWorldEl ? CODEX_WORLD_W : Math.max(1, root.clientWidth);
    const vh = codexWorldEl ? CODEX_WORLD_H : Math.max(1, root.clientHeight);

    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.setAttribute('width', String(vw));
    svg.setAttribute('height', String(vh));

    const defs = document.createElementNS(ns, 'defs');
    const cordFilt = {
        stdDeviation: codexVisualPrefs.cordBlur,
        morphRadius: codexVisualPrefs.cordMorph,
        blurLayers: codexVisualPrefs.cordGlowLayers,
        viewW: vw,
        viewH: vh
    };
    appendEdgeGlowFilter(defs, 'codex-edge-violet-glow', 'violetBlur', cordFilt);
    appendEdgeGlowFilter(defs, 'codex-edge-yellow-glow', 'yellowBlur', cordFilt);
    appendEdgeGlowFilter(defs, 'codex-edge-red-glow', 'redBlur', cordFilt);
    appendSoftPacketGlowFilter(defs, 'codex-edge-packet-pink-soft', 'pktPinkBlur', {
        stdDeviation: codexVisualPrefs.cordBlur * codexVisualPrefs.packetBlurMult,
        morphRadius: codexVisualPrefs.cordMorph * codexVisualPrefs.packetMorphMult,
        blurLayers: codexVisualPrefs.packetGlowLayers,
        viewW: vw,
        viewH: vh
    });
    appendCodexEdgeNodeMask(defs, ns, vw, vh);
    svg.appendChild(defs);

    /** Thick cord picks live here (unmasked) so panning still works on top of cords. */
    const hitPickRoot = document.createElementNS(ns, 'g');
    hitPickRoot.classList.add('codex-edges-hit-pick');
    svg.appendChild(hitPickRoot);

    const contentRoot = document.createElementNS(ns, 'g');
    contentRoot.classList.add('codex-edges-masked');
    contentRoot.setAttribute('mask', `url(#${CODEX_EDGES_NODE_ALPHA_MASK_ID})`);
    svg.appendChild(contentRoot);

    /** @type {{ edge: typeof codexEdges[0], pts: { x: number, y: number }[] }[]} */
    const edgePolys = [];
    codexEdges.forEach((edge) => {
        const pts = buildPolylineForEdge(edge);
        if (pts && pts.length >= 2) edgePolys.push({ edge, pts });
    });

    appendCodexJunctionElbowParallelograms(contentRoot, ns);

    edgePolys.forEach(({ edge, pts }) => {
        const { fromId, toId } = edge;
        const appearance = edgeCordAppearance(edge);
        const strokeColor = appearance === 'red'
            ? '#f87171'
            : appearance === 'yellow'
                ? '#fbbf24'
                : codexVisualPrefs.cordColor;
        const filterUrl = appearance === 'red'
            ? 'url(#codex-edge-red-glow)'
            : appearance === 'yellow'
                ? 'url(#codex-edge-yellow-glow)'
                : 'url(#codex-edge-violet-glow)';
        for (let seg = 0; seg < pts.length - 1; seg++) {
            const p0 = pts[seg];
            const p1 = pts[seg + 1];
            appendCordFilteredLineGroup(contentRoot, ns, {
                x1: p0.x,
                y1: p0.y,
                x2: p1.x,
                y2: p1.y,
                stroke: strokeColor,
                strokeWidth: codexVisualPrefs.cordThickness,
                filterUrl,
                lineClass: 'codex-edge-segment'
            });
        }
    });

    edgePolys.forEach(({ edge, pts }) => {
        const { fromId, toId } = edge;
        for (let seg = 0; seg < pts.length - 1; seg++) {
            const p0 = pts[seg];
            const p1 = pts[seg + 1];
            const hit = document.createElementNS(ns, 'line');
            hit.classList.add('codex-edge-hit');
            hit.setAttribute('x1', String(p0.x));
            hit.setAttribute('y1', String(p0.y));
            hit.setAttribute('x2', String(p1.x));
            hit.setAttribute('y2', String(p1.y));
            hit.setAttribute('stroke', 'transparent');
            hit.setAttribute('stroke-width', String(CODEX_EDGE_HIT_PICK_STROKE_PX));
            hit.setAttribute('stroke-linecap', 'round');
            hit.dataset.codexEdgeFrom = fromId;
            hit.dataset.codexEdgeTo = toId;
            hit.dataset.codexSeg = String(seg);
            hit.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                const ed = findEdge(fromId, toId);
                if (!ed) return;
                const k = codexUnorderedPairKey(fromId, toId);
                const now = Date.now();
                const prev = cordDoubleRightLastTs.get(k) || 0;
                if (now - prev < DOUBLE_RIGHT_MS) {
                    cordDoubleRightLastTs.delete(k);
                    cordPendingDeletePairKey = null;
                    removeCodexEdgeDirected(fromId, toId);
                } else {
                    clearPendingCodexDeleteState();
                    cordPendingDeletePairKey = k;
                    cordDoubleRightLastTs.set(k, now);
                    redrawCodexEdges();
                }
            });
            hitPickRoot.appendChild(hit);
        }
    });

    const degLabelsG = document.createElementNS(ns, 'g');
    degLabelsG.classList.add('codex-edge-degree-labels');
    degLabelsG.setAttribute('pointer-events', 'none');
    edgePolys.forEach(({ edge, pts }) => {
        for (let seg = 0; seg < pts.length - 1; seg++) {
            const p0 = pts[seg];
            const p1 = pts[seg + 1];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const len = Math.hypot(dx, dy);
            if (len < 48) continue;
            const actualDeg = cordSegmentDegreesLabel(p0, p1);
            if (actualDeg == null) continue;
            const whileDrag = codexActiveDragNodeIds.size > 0;
            const onOctilinearLane = cordSegmentWithinOctilinearToleranceDegrees(p0, p1);
            const mx = (p0.x + p1.x) / 2;
            const my = (p0.y + p1.y) / 2;
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;
            const off = 36;
            const ax = mx + nx * off;
            const ay = my + ny * off;
            const fsD = CODEX_EDGE_DEGREE_FONT_PX;

            const stackG = document.createElementNS(ns, 'g');
            stackG.classList.add('codex-edge-degree-stack');
            const stackTitle = document.createElementNS(ns, 'title');
            stackTitle.textContent = whileDrag
                ? `Bearing ${actualDeg}°. On release, cords snap to the nearest 45° direction when within `
                    + `±${CODEX_OCT_SOFT_SNAP_TOL_DEG}° of that lane. Coordinates under nodes are world centers.`
                : `Bearing ${actualDeg}° (0° = east → 90° = south, world y down), node-center to node-center. `
                    + `Green when within ±${CODEX_OCT_SOFT_SNAP_TOL_DEG}° of a 45° direction. `
                    + 'Coordinates under nodes are world centers.';
            stackG.appendChild(stackTitle);

            const t = document.createElementNS(ns, 'text');
            t.classList.add('codex-edge-degree');
            if (onOctilinearLane) t.classList.add('codex-edge-degree--octilinear');
            t.setAttribute('font-size', String(fsD));
            t.setAttribute('x', String(ax));
            t.setAttribute('y', String(ay));
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('dominant-baseline', 'middle');
            t.textContent = `${actualDeg}°`;
            stackG.appendChild(t);

            degLabelsG.appendChild(stackG);
        }
    });
    svg.appendChild(degLabelsG);

    /* Coord labels touch layout (offset sizes); skip while nodes move every frame — sync on pointerup. */
    if (codexActiveDragNodeIds.size === 0) {
        syncCodexNodeCoordLabels();
    }

    syncCodexCordPacketState(edgePolys);
    if (edgePolys.length === 0) {
        codexStopCordAnimRafOnly();
    } else {
        const pktG = document.createElementNS(ns, 'g');
        pktG.classList.add('codex-edge-packets');
        contentRoot.appendChild(pktG);
        ensureCodexCordAnimationLoop();
    }
}

function handleNetworkNodeActivate(el) {
    const id = el.dataset.codexNodeId;
    if (!id) return;

    if (!networkLinkSourceId) {
        networkLinkSourceId = id;
        selectCodexNode(el, { network: true });
        updateCodexToolbar();
        return;
    }
    if (networkLinkSourceId === id) {
        networkLinkSourceId = null;
        selectCodexNode(el, { network: true });
        updateCodexToolbar();
        return;
    }
    const fromId = networkLinkSourceId;
    const toId = id;
    networkLinkSourceId = null;

    let created = false;
    if (!hasCodexConnectionBetween(fromId, toId)) {
        codexEdges.push({ fromId, toId });
        markCodexEdgeUnsaved(fromId, toId);
        markCodexLayoutDirty();
        redrawCodexEdges();
        created = true;
    } else if (typeof window.updateStatus === 'function') {
        window.updateStatus('Those Codex nodes are already linked.', 'warning');
    }

    const elFrom = codexNodeElById(fromId);
    const elTo = codexNodeElById(toId);
    if (created) {
        codexInteractionMode = 'drag';
        if (elFrom && elTo) {
            markNodeVisualUnsaved(elTo);
        }
    }
    selectCodexNodesPair(elFrom, elTo, elTo);
}

/**
 * Codex save payload (see {@link saveCodexLayout}, {@link CODEX_SAVE_VERSION}).
 * - `nodes[]`: `x`,`y` = top-left world px; `scale`; `id`; `kind` junction | hero | faction | country | npc.
 * - `edges[]`: directed `fromId`→`toId` (A→B). Cord centers use top-left + half width/height (+ drag transform if any).
 */
function serializeCodexState() {
    if (!root) return { nodes: [], edges: [] };
    const nodes = Array.from(root.querySelectorAll('.codex-node')).map((el) => {
        const kind = el.dataset.codexKind;
        const x = parseFloat(el.style.left) || 0;
        const y = parseFloat(el.style.top) || 0;
        const id = el.dataset.codexNodeId || generateNodeId();
        if (!el.dataset.codexNodeId) el.dataset.codexNodeId = id;
        const scale = parseFloat(el.dataset.codexScale) || 1;
        if (kind === 'junction') {
            return { id, kind: 'junction', x, y, scale };
        }
        if (kind === 'hero') {
            return { id, kind: 'hero', heroName: el.dataset.codexHero || '', x, y, scale };
        }
        if (kind === 'country') {
            return {
                id,
                kind: 'country',
                countryKey: el.dataset.codexCountryKey || '',
                x,
                y,
                scale
            };
        }
        if (kind === 'npc') {
            return { id, kind: 'npc', npcName: el.dataset.codexNpc || '', x, y, scale };
        }
        return {
            id,
            kind: 'faction',
            factionFilename: el.dataset.codexFactionFile || '',
            factionDisplay: el.dataset.codexFactionDisplay || '',
            x,
            y,
            scale
        };
    });
    return {
        nodes,
        edges: codexEdges.map((e) => ({ fromId: e.fromId, toId: e.toId }))
    };
}

export function saveCodexLayout() {
    if (!root) return;
    const { nodes, edges } = serializeCodexState();
    const payload = { v: CODEX_SAVE_VERSION, nodes, edges };
    try {
        localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn('CodexCanvasService: localStorage save failed', e);
        return;
    }

    root.querySelectorAll('.codex-node--unsaved').forEach((el) => {
        el.classList.remove('codex-node--unsaved');
    });
    codexUnsavedEdgeKeys.clear();
    codexLayoutDirty = false;
    clearPendingCodexDeleteState();
    updateCodexToolbar();
    redrawCodexEdges();

    if (isCodexFileApiAvailable()) {
        fetch('/api/codex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data?.error || `HTTP ${res.status}`);
                }
                return res.json().catch(() => ({}));
            })
            .then((data) => {
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus(
                        `✓ Codex saved (${data?.nodesCount ?? nodes.length} nodes, ${data?.edgesCount ?? edges.length} links)`,
                        'success'
                    );
                }
            })
            .catch((e) => {
                console.warn('CodexCanvasService: /api/codex write failed', e);
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus(
                        `Codex saved in browser; could not write data/codex-labels.json (${e?.message || 'API error'})`,
                        'warning'
                    );
                }
            });
    } else if (typeof window.updateStatus === 'function') {
        window.updateStatus('Codex saved (this browser).', 'success');
    }
}

function parseLoadedCodexPayload(parsed) {
    let nodes = null;
    let edges = [];
    let v = 2;
    if (Array.isArray(parsed)) {
        nodes = parsed;
        v = 1;
    } else if (parsed && typeof parsed === 'object') {
        if (typeof parsed.v === 'number') v = parsed.v;
        if (Array.isArray(parsed.nodes)) nodes = parsed.nodes;
        else if (Array.isArray(parsed.labels)) nodes = parsed.labels;
        if (Array.isArray(parsed.edges)) edges = parsed.edges;
    }
    return { nodes: nodes || [], edges, v };
}

function migrateCodexLayoutCoordsForExpandedWorld(nodes, edges) {
    const sx = CODEX_WORLD_EXPAND_SHIFT_X;
    const sy = CODEX_WORLD_EXPAND_SHIFT_Y;
    const nextNodes = nodes.map((L) => ({
        ...L,
        x: (typeof L.x === 'number' ? L.x : parseFloat(L.x) || 0) + sx,
        y: (typeof L.y === 'number' ? L.y : parseFloat(L.y) || 0) + sy
    }));
    const nextEdges = edges.map((e) => ({
        fromId: e.fromId,
        toId: e.toId
    }));
    return { nodes: nextNodes, edges: nextEdges };
}

/** Frame world center in the Codex viewport (zoom must be set first). */
function centerCodexViewOnWorldCenter() {
    if (!root || !codexWorldEl) return;
    const rr = root.getBoundingClientRect();
    const z = Math.max(0.05, codexViewZoom);
    const cx = CODEX_WORLD_W / 2;
    const cy = CODEX_WORLD_H / 2;
    codexViewPanX = rr.width / 2 - cx * z;
    codexViewPanY = rr.height / 2 - cy * z;
}

/** Frame the bounding box of all placed nodes (after load / reset view feel). */
function centerCodexViewOnNodes() {
    if (!root || !codexWorldEl) return;
    const els = root.querySelectorAll('.codex-node');
    if (!els.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    els.forEach((el) => {
        const x = parseFloat(el.style.left) || 0;
        const y = parseFloat(el.style.top) || 0;
        const w = el.offsetWidth || CODEX_IMG_BASE_PX;
        const h = el.offsetHeight || CODEX_IMG_BASE_PX;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
    });
    if (!Number.isFinite(minX)) return;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rr = root.getBoundingClientRect();
    const z = Math.max(0.05, codexViewZoom);
    codexViewPanX = rr.width / 2 - cx * z;
    codexViewPanY = rr.height / 2 - cy * z;
}

async function loadCodexState() {
    if (!root) return;
    let storedObj = null;
    try {
        const raw = localStorage.getItem(CODEX_STORAGE_KEY);
        if (raw) storedObj = JSON.parse(raw);
    } catch (_) {
        storedObj = null;
    }

    const storedParsed = storedObj ? parseLoadedCodexPayload(storedObj) : { nodes: [], edges: [], v: CODEX_SAVE_VERSION };
    const hadMeaningfulLocal = storedParsed.nodes.length > 0;

    let sourceObj = storedObj;
    let sourceWasApiOnly = false;
    if (!hadMeaningfulLocal && isCodexFileApiAvailable()) {
        try {
            const r = await fetch(`/api/codex?v=${Date.now()}`);
            if (r.ok) {
                const d = await r.json();
                if (parseLoadedCodexPayload(d).nodes.length > 0) {
                    sourceObj = d;
                    sourceWasApiOnly = true;
                }
            }
        } catch (_) {
            /* ignore */
        }
    }

    if (!sourceObj) {
        sourceObj = { v: CODEX_SAVE_VERSION, nodes: [], edges: [] };
    }

    let { nodes, edges, v } = parseLoadedCodexPayload(sourceObj);
    let migratedNow = false;
    if (v < CODEX_JUNCTION_LAYOUT_MIN_VERSION) {
        nodes = [];
        edges = [];
        migratedNow = true;
    } else if (v < CODEX_SAVE_VERSION) {
        migratedNow = true;
        const m = migrateCodexLayoutCoordsForExpandedWorld(nodes, edges);
        nodes = m.nodes;
        edges = m.edges;
    }

    codexEdges = dedupeCodexEdgesByNodePair(
        Array.isArray(edges) ? edges.map(normalizeEdgeRecord).filter(Boolean) : []
    );
    codexUnsavedEdgeKeys.clear();
    codexViewZoom = CODEX_ZOOM_INITIAL;
    if (!nodes.length) {
        centerCodexViewOnWorldCenter();
    } else {
        codexViewPanX = 0;
        codexViewPanY = 0;
    }
    applyCodexWorldTransformStyle();
    if (!nodes.length) {
        redrawCodexEdges();
        codexLayoutDirty = false;
        updateCodexToolbar();
        return;
    }

    for (let i = 0; i < nodes.length; i++) {
        const L = nodes[i];
        const placeKind =
            L.kind === 'junction'
                ? 'junction'
                : L.kind === 'faction'
                    ? 'faction'
                    : L.kind === 'country'
                        ? 'country'
                        : L.kind === 'npc'
                            ? 'npc'
                            : 'hero';
        const opts = {
            fromSaved: true,
            id: L.id,
            scale: resolveCodexNodeScale(placeKind, L.scale)
        };
        if (L.kind === 'hero' && L.heroName) {
            placeCodexNode(L.x, L.y, 'hero', L.heroName, null, opts);
        } else if (L.kind === 'npc' && L.npcName) {
            placeCodexNode(L.x, L.y, 'npc', L.npcName, null, opts);
        } else if (L.kind === 'faction' && L.factionFilename) {
            placeCodexNode(L.x, L.y, 'faction', null, {
                filename: L.factionFilename,
                displayName: L.factionDisplay || L.factionFilename
            }, opts);
        } else if (L.kind === 'country' && normalizeCodexCountryKey(L.countryKey)) {
            placeCodexNode(L.x, L.y, 'country', null, null, {
                ...opts,
                countryKey: normalizeCodexCountryKey(L.countryKey)
            });
        } else if (L.kind === 'junction') {
            placeCodexNode(L.x, L.y, 'junction', null, null, opts);
        }
    }

    centerCodexViewOnNodes();
    applyCodexWorldTransformStyle();

    if (migratedNow) {
        try {
            const { nodes: nPersist, edges: ePersist } = serializeCodexState();
            localStorage.setItem(
                CODEX_STORAGE_KEY,
                JSON.stringify({ v: CODEX_SAVE_VERSION, nodes: nPersist, edges: ePersist })
            );
        } catch (_) {
            /* ignore */
        }
        if (sourceWasApiOnly) {
            markCodexLayoutDirty();
        }
    }

    requestAnimationFrame(() => redrawCodexEdges());
    if (!migratedNow) {
        codexLayoutDirty = false;
    }
    updateCodexToolbar();
}

function applyCodexWorldTransformStyle() {
    if (!codexWorldEl) return;
    codexViewZoom = Math.max(CODEX_ZOOM_MIN, Math.min(CODEX_ZOOM_MAX, codexViewZoom));
    codexWorldEl.style.transform = `translate(${codexViewPanX}px, ${codexViewPanY}px) scale(${codexViewZoom})`;
}

function applyCodexViewTransform() {
    applyCodexWorldTransformStyle();
    redrawCodexEdges();
}

/** Keep world point under (clientX, clientY) fixed while changing zoom (wheel / pinch / buttons). */
function applyCodexZoomWithAnchor(clientX, clientY, newZoom) {
    if (!root) return;
    const w = clientToWorldCodex(clientX, clientY);
    codexViewZoom = Math.max(CODEX_ZOOM_MIN, Math.min(CODEX_ZOOM_MAX, newZoom));
    const rr = root.getBoundingClientRect();
    codexViewPanX = clientX - rr.left - w.x * codexViewZoom;
    codexViewPanY = clientY - rr.top - w.y * codexViewZoom;
    applyCodexViewTransform();
}

function codexZoomByFactorAt(factor, clientX, clientY) {
    if (!root) return;
    applyCodexZoomWithAnchor(clientX, clientY, codexViewZoom * factor);
}

function getCodexViewCenterClient() {
    if (!root) return { cx: 0, cy: 0 };
    const rr = root.getBoundingClientRect();
    return { cx: rr.left + rr.width / 2, cy: rr.top + rr.height / 2 };
}

function codexZoomInFromUi() {
    if (codexHasNodesSelectedForZoomRedirect()) {
        nudgeSelectedNodeScale(CODEX_ZOOM_FACTOR);
        return;
    }
    const { cx, cy } = getCodexViewCenterClient();
    codexZoomByFactorAt(CODEX_ZOOM_FACTOR, cx, cy);
}

function codexZoomOutFromUi() {
    if (codexHasNodesSelectedForZoomRedirect()) {
        nudgeSelectedNodeScale(1 / CODEX_ZOOM_FACTOR);
        return;
    }
    const { cx, cy } = getCodexViewCenterClient();
    codexZoomByFactorAt(1 / CODEX_ZOOM_FACTOR, cx, cy);
}

function codexWheelShouldDeferToScroll(e) {
    const t = e.target;
    if (t && typeof t.closest === 'function') {
        if (t.closest('.codex-picker') || t.closest('.filter-autocomplete-list')) return true;
    }
    return false;
}

function detachCodexViewGestures() {
    const r = root;
    if (r && onCodexWheelHandler) {
        r.removeEventListener('wheel', onCodexWheelHandler);
    }
    onCodexWheelHandler = null;
    if (r && onCodexTouchStartHandler) {
        r.removeEventListener('touchstart', onCodexTouchStartHandler, true);
    }
    if (r && onCodexTouchMoveHandler) {
        r.removeEventListener('touchmove', onCodexTouchMoveHandler, true);
    }
    if (r && onCodexTouchEndHandler) {
        r.removeEventListener('touchend', onCodexTouchEndHandler, true);
        r.removeEventListener('touchcancel', onCodexTouchEndHandler, true);
    }
    onCodexTouchStartHandler = null;
    onCodexTouchMoveHandler = null;
    onCodexTouchEndHandler = null;
    codexPinchState = null;
}

function attachCodexViewGestures() {
    if (!root) return;
    detachCodexViewGestures();

    onCodexWheelHandler = (e) => {
        if (!root) return;
        if (codexWheelShouldDeferToScroll(e)) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0012);
        applyCodexZoomWithAnchor(e.clientX, e.clientY, codexViewZoom * factor);
    };
    root.addEventListener('wheel', onCodexWheelHandler, { passive: false });

    onCodexTouchStartHandler = (e) => {
        if (e.touches.length === 2) {
            const a = e.touches[0];
            const b = e.touches[1];
            const d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            if (d0 > 10) {
                codexPinchState = { d0, z0: codexViewZoom };
            }
        }
    };
    onCodexTouchMoveHandler = (e) => {
        if (e.touches.length !== 2 || !codexPinchState) return;
        e.preventDefault();
        const a = e.touches[0];
        const b = e.touches[1];
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        const d1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = d1 / codexPinchState.d0;
        if (ratio <= 0 || !Number.isFinite(ratio)) return;
        applyCodexZoomWithAnchor(midX, midY, codexPinchState.z0 * ratio);
    };
    onCodexTouchEndHandler = (e) => {
        if (e.touches.length < 2) codexPinchState = null;
    };

    root.addEventListener('touchstart', onCodexTouchStartHandler, { passive: true, capture: true });
    root.addEventListener('touchmove', onCodexTouchMoveHandler, { passive: false, capture: true });
    root.addEventListener('touchend', onCodexTouchEndHandler, { passive: true, capture: true });
    root.addEventListener('touchcancel', onCodexTouchEndHandler, { passive: true, capture: true });
}

function codexResetView() {
    codexViewZoom = CODEX_ZOOM_INITIAL;
    if (root?.querySelector('.codex-node')) {
        centerCodexViewOnNodes();
    } else {
        centerCodexViewOnWorldCenter();
    }
    applyCodexViewTransform();
}

function ensureCodexWorld() {
    if (!root) return null;
    let w = root.querySelector('.codex-world');
    if (!w) {
        w = document.createElement('div');
        w.className = 'codex-world';
        root.insertBefore(w, root.firstChild);
    }
    codexWorldEl = w;
    w.style.width = `${CODEX_WORLD_W}px`;
    w.style.height = `${CODEX_WORLD_H}px`;
    applyCodexWorldTransformStyle();
    return w;
}

function cancelBackgroundPanPointerPending() {
    if (!backgroundPanPointerPending) return;
    document.removeEventListener('pointermove', onBackgroundPanMoveMaybe, capOpts);
    document.removeEventListener('pointerup', onBackgroundPanUpMaybe, capOpts);
    document.removeEventListener('pointercancel', onBackgroundPanUpMaybe, capOpts);
    backgroundPanPointerPending = null;
}

/** Left-button pan threshold → {@link beginActualBackgroundPan}; caller must cancel other pointer state first. */
function armCodexBackgroundPanPendingFromEvent(e) {
    if (e.button !== 0) return;
    backgroundPanPointerPending = {
        pointerId: e.pointerId,
        startCX: e.clientX,
        startCY: e.clientY,
        origPanX: codexViewPanX,
        origPanY: codexViewPanY
    };
    document.addEventListener('pointermove', onBackgroundPanMoveMaybe, capOpts);
    document.addEventListener('pointerup', onBackgroundPanUpMaybe, capOpts);
    document.addEventListener('pointercancel', onBackgroundPanUpMaybe, capOpts);
}

function onBackgroundPanMoveMaybe(ev) {
    const p = backgroundPanPointerPending;
    if (!p || ev.pointerId !== p.pointerId) return;
    const dx = ev.clientX - p.startCX;
    const dy = ev.clientY - p.startCY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
    document.removeEventListener('pointermove', onBackgroundPanMoveMaybe, capOpts);
    document.removeEventListener('pointerup', onBackgroundPanUpMaybe, capOpts);
    document.removeEventListener('pointercancel', onBackgroundPanUpMaybe, capOpts);
    const prep = backgroundPanPointerPending;
    backgroundPanPointerPending = null;
    beginActualBackgroundPan(prep, ev);
}

function onBackgroundPanUpMaybe(ev) {
    const p = backgroundPanPointerPending;
    if (!p || ev.pointerId !== p.pointerId) return;
    document.removeEventListener('pointermove', onBackgroundPanMoveMaybe, capOpts);
    document.removeEventListener('pointerup', onBackgroundPanUpMaybe, capOpts);
    document.removeEventListener('pointercancel', onBackgroundPanUpMaybe, capOpts);
    backgroundPanPointerPending = null;
    if (codexInteractionMode === 'network') {
        networkLinkSourceId = null;
        selectCodexNode(null);
        updateCodexToolbar();
    }
}

function beginActualBackgroundPan(prep, firstMoveEv) {
    if (!hitLayerEl) return;
    const { pointerId, startCX, startCY, origPanX, origPanY } = prep;
    try {
        hitLayerEl.setPointerCapture(pointerId);
    } catch (_) { /* ignore */ }

    const applyClient = (clientX, clientY) => {
        codexViewPanX = origPanX + (clientX - startCX);
        codexViewPanY = origPanY + (clientY - startCY);
        /* Cords live under .codex-world; pan is CSS translate only — no full SVG rebuild per move. */
        applyCodexWorldTransformStyle();
    };

    applyClient(firstMoveEv.clientX, firstMoveEv.clientY);

    const rawOpts = { capture: true, passive: true };
    const usePointerRawUpdate = typeof window !== 'undefined'
        && typeof PointerEvent !== 'undefined'
        && 'onpointerrawupdate' in window;
    const moveEvent = usePointerRawUpdate ? 'pointerrawupdate' : 'pointermove';

    let dragFinished = false;
    const finishDrag = () => {
        if (dragFinished) return;
        dragFinished = true;
        document.removeEventListener(moveEvent, onMove, usePointerRawUpdate ? rawOpts : capOpts);
        document.removeEventListener('pointerup', onUp, capOpts);
        document.removeEventListener('pointercancel', onUp, capOpts);
        hitLayerEl.removeEventListener('lostpointercapture', onLost);
        try {
            hitLayerEl.releasePointerCapture(pointerId);
        } catch (_) { /* ignore */ }
        if (hitLayerEl) hitLayerEl.style.cursor = '';
        redrawCodexEdges();
    };

    const onMove = (ev) => {
        if (!root || ev.pointerId !== pointerId) return;
        const coalesced = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : null;
        if (coalesced && coalesced.length > 0) {
            const last = coalesced[coalesced.length - 1];
            applyClient(last.clientX, last.clientY);
        } else {
            applyClient(ev.clientX, ev.clientY);
        }
    };

    const onLost = () => {
        finishDrag();
    };

    const onUp = () => {
        finishDrag();
    };

    hitLayerEl.style.cursor = 'grabbing';
    hitLayerEl.addEventListener('lostpointercapture', onLost);
    document.addEventListener(moveEvent, onMove, usePointerRawUpdate ? rawOpts : capOpts);
    document.addEventListener('pointerup', onUp, capOpts);
    document.addEventListener('pointercancel', onUp, capOpts);
}

function onHitLayerBackgroundPanPointerDown(e) {
    if (e.button !== 0) return;
    if (!hitLayerEl || e.target !== hitLayerEl) return;
    cancelBackgroundPanPointerPending();
    cancelPointerPending();
    clearPendingCodexDeleteState();
    redrawCodexEdges();
    armCodexBackgroundPanPendingFromEvent(e);
}

function ensureEdgesLayer() {
    if (!root || !hitLayerEl) return null;
    const scope = codexWorldEl || root;
    let svg = scope.querySelector('.codex-edges-layer');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('codex-edges-layer');
        svg.setAttribute('aria-hidden', 'true');
        hitLayerEl.insertAdjacentElement('afterend', svg);
    }
    codexEdgesSvgEl = svg;
    return svg;
}

function ensureCodexToolbarSelectionPreviewRow(bar) {
    if (!bar) return;
    let rowPreview = bar.querySelector('.codex-toolbar__row--selection-preview');
    const netHint = bar.querySelector('.codex-toolbar__network-hint');
    if (!rowPreview) {
        rowPreview = document.createElement('div');
        rowPreview.className = 'codex-toolbar__row codex-toolbar__row--selection-preview';
        rowPreview.style.display = 'none';
        if (netHint) {
            bar.insertBefore(rowPreview, netHint);
        } else {
            bar.appendChild(rowPreview);
        }
    }
    if (rowPreview.querySelector('.codex-toolbar__endpoint-preview-dual')) return;

    while (rowPreview.firstChild) rowPreview.removeChild(rowPreview.firstChild);

    const single = document.createElement('div');
    single.className = 'codex-toolbar__endpoint-preview-single';
    const singleThumb = document.createElement('div');
    singleThumb.className = 'codex-toolbar__selection-preview-thumb';
    const imgSingle = document.createElement('img');
    imgSingle.className = 'codex-toolbar__selection-preview-img';
    imgSingle.draggable = false;
    imgSingle.alt = '';
    singleThumb.appendChild(imgSingle);
    single.appendChild(singleThumb);

    const dual = document.createElement('div');
    dual.className = 'codex-toolbar__endpoint-preview-dual';
    const wrapA = document.createElement('div');
    wrapA.className = 'codex-toolbar__selection-preview codex-toolbar__selection-preview--from';
    const lblA = document.createElement('span');
    lblA.className = 'codex-toolbar__endpoint-label';
    lblA.textContent = 'A';
    const thumbA = document.createElement('div');
    thumbA.className = 'codex-toolbar__selection-preview-thumb';
    const imgA = document.createElement('img');
    imgA.className = 'codex-toolbar__selection-preview-img';
    imgA.draggable = false;
    imgA.alt = '';
    thumbA.appendChild(imgA);
    wrapA.appendChild(lblA);
    wrapA.appendChild(thumbA);

    const btnRev = document.createElement('button');
    btnRev.type = 'button';
    btnRev.className = 'codex-toolbar__edge-reverse';
    btnRev.textContent = '⇄';
    btnRev.title = 'Reverse link direction (swap A and B; packets flow A → B)';
    btnRev.setAttribute('aria-label', 'Reverse link direction');
    btnRev.disabled = true;
    btnRev.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        reverseCodexEdgeForSelectedPair();
    });

    const wrapB = document.createElement('div');
    wrapB.className = 'codex-toolbar__selection-preview codex-toolbar__selection-preview--to';
    const lblB = document.createElement('span');
    lblB.className = 'codex-toolbar__endpoint-label';
    lblB.textContent = 'B';
    const thumbB = document.createElement('div');
    thumbB.className = 'codex-toolbar__selection-preview-thumb';
    const imgB = document.createElement('img');
    imgB.className = 'codex-toolbar__selection-preview-img';
    imgB.draggable = false;
    imgB.alt = '';
    thumbB.appendChild(imgB);
    wrapB.appendChild(lblB);
    wrapB.appendChild(thumbB);

    dual.appendChild(wrapA);
    dual.appendChild(btnRev);
    dual.appendChild(wrapB);
    rowPreview.appendChild(single);
    rowPreview.appendChild(dual);
}

function loadCodexDebugUiPref() {
    try {
        let raw = localStorage.getItem(CODEX_DEBUG_UI_PREF_KEY);
        if (raw == null) raw = localStorage.getItem(CODEX_DEBUG_UI_PREF_KEY_LEGACY);
        if (raw === '0') codexDebugUiVisible = false;
        else if (raw === '1') codexDebugUiVisible = true;
    } catch (_) {
        /* keep default */
    }
}

function persistCodexDebugUiPref() {
    try {
        localStorage.setItem(CODEX_DEBUG_UI_PREF_KEY, codexDebugUiVisible ? '1' : '0');
    } catch (_) {
        /* ignore */
    }
}

function syncCodexDebugUiClass() {
    if (!root) return;
    root.classList.toggle('codex--debug-ui-hidden', !codexDebugUiVisible);
}

function ensureCodexToolbarDebugToggle(bar) {
    if (!bar) return;
    let row = bar.querySelector('.codex-toolbar__row--junction-pref');
    if (!row) {
        row = document.createElement('div');
        row.className = 'codex-toolbar__row codex-toolbar__row--junction-pref';
        const lbl = document.createElement('label');
        lbl.className = 'codex-toolbar__junction-pref-label';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'codex-toolbar__junction-toggle';
        cb.title =
            'Uncheck to hide waypoints, Break in the picker, cord angle labels, and node coordinates (layout unchanged)';
        cb.addEventListener('change', () => {
            codexDebugUiVisible = !!cb.checked;
            persistCodexDebugUiPref();
            syncCodexDebugUiClass();
            redrawCodexEdges();
        });
        lbl.appendChild(cb);
        const span = document.createElement('span');
        span.textContent = 'Show Debugging';
        lbl.appendChild(span);
        row.appendChild(lbl);
        const scaleRow = bar.querySelector('.codex-toolbar__row--scale');
        if (scaleRow) bar.insertBefore(row, scaleRow);
        else bar.appendChild(row);
    }
    const cb = row.querySelector('.codex-toolbar__junction-toggle');
    if (cb) cb.checked = codexDebugUiVisible;
}

function codexVisualPanelQueryHost() {
    return codexVisualPanelEl && root && root.contains(codexVisualPanelEl)
        ? codexVisualPanelEl
        : root?.querySelector('.codex-visual-panel');
}

function readCodexVisualPrefsFromToolbar() {
    const host = codexVisualPanelQueryHost();
    if (!host) return;
    const next = { ...codexVisualPrefs };
    host.querySelectorAll('input[data-codex-vpref]').forEach((el) => {
        const key = el.dataset.codexVpref;
        if (!key || !(key in CODEX_VISUAL_DEFAULTS)) return;
        if (el.type === 'color') next[key] = el.value;
        else if (el.type === 'range') {
            const num = parseFloat(el.value);
            if (Number.isFinite(num)) next[key] = num;
        }
    });
    codexVisualPrefs = normalizeCodexVisualPrefs(next);
}

function syncCodexVisualToolbarFromPrefs() {
    const host = codexVisualPanelQueryHost();
    if (!host) return;
    host.querySelectorAll('input[data-codex-vpref]').forEach((el) => {
        const key = el.dataset.codexVpref;
        if (!key || !(key in codexVisualPrefs)) return;
        const v = codexVisualPrefs[key];
        if (el.type === 'color') el.value = v;
        else el.value = String(v);
        const wrap = el.parentElement;
        const valEl = wrap && wrap.querySelector('.codex-visual-panel__val');
        if (valEl) {
            valEl.textContent = typeof v === 'number'
                ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100))
                : String(v);
        }
    });
}

function ensureCodexVisualPrefsPanel() {
    if (!root) return;
    root.querySelectorAll('.codex-toolbar__visual-details').forEach((el) => el.remove());

    const onVisualInput = () => {
        readCodexVisualPrefsFromToolbar();
        persistCodexVisualPrefs();
        redrawCodexEdges();
    };

    function mkRow(labelText, controlWrap) {
        const row = document.createElement('div');
        row.className = 'codex-visual-panel__row';
        const lab = document.createElement('span');
        lab.className = 'codex-visual-panel__label';
        lab.textContent = labelText;
        row.appendChild(lab);
        row.appendChild(controlWrap);
        return row;
    }

    function mkRange(key, min, max, step) {
        const wrap = document.createElement('div');
        wrap.className = 'codex-visual-panel__inputwrap';
        const r = document.createElement('input');
        r.type = 'range';
        r.className = 'codex-visual-panel__range';
        r.min = String(min);
        r.max = String(max);
        r.step = String(step);
        r.dataset.codexVpref = key;
        r.addEventListener('input', onVisualInput);
        const val = document.createElement('span');
        val.className = 'codex-visual-panel__val';
        wrap.appendChild(r);
        wrap.appendChild(val);
        return mkRow(
            key === 'cordThickness' ? 'Thickness (px)'
                : key === 'cordBlur' ? 'Blur (σ)'
                    : key === 'cordMorph' ? 'Spread (dilate)'
                        : key === 'cordGlowLayers' ? 'Glow layers'
                            : key === 'packetThicknessMult' ? 'Thickness × cord'
                                : key === 'packetBlurMult' ? 'Blur × cord'
                                    : key === 'packetMorphMult' ? 'Spread × cord'
                                        : key === 'packetGlowLayers' ? 'Glow layers'
                                            : key === 'packetOpacity' ? 'Opacity'
                                                : key,
            wrap
        );
    }

    function mkColorRow(labelText, key) {
        const wrap = document.createElement('div');
        wrap.className = 'codex-visual-panel__inputwrap';
        const c = document.createElement('input');
        c.type = 'color';
        c.className = 'codex-visual-panel__color';
        c.dataset.codexVpref = key;
        c.addEventListener('input', onVisualInput);
        wrap.appendChild(c);
        return mkRow(labelText, wrap);
    }

    function section(title) {
        const h = document.createElement('div');
        h.className = 'codex-visual-panel__section';
        h.textContent = title;
        return h;
    }

    if (codexVisualPanelEl && root.contains(codexVisualPanelEl)) {
        syncCodexVisualToolbarFromPrefs();
        return;
    }

    const existing = root.querySelector('.codex-visual-panel');
    if (existing) {
        codexVisualPanelEl = existing;
        syncCodexVisualToolbarFromPrefs();
        return;
    }

    const panel = document.createElement('aside');
    panel.className = 'codex-visual-panel';
    panel.setAttribute('aria-label', 'Cord and packet appearance');

    const det = document.createElement('details');
    det.className = 'codex-visual-panel__details';
    det.open = true;
    const sum = document.createElement('summary');
    sum.className = 'codex-visual-panel__summary';
    sum.textContent = 'Cord & packet look (saved in this browser)';
    det.appendChild(sum);

    const body = document.createElement('div');
    body.className = 'codex-visual-panel__body';

    body.appendChild(section('Cords — normal links'));
    body.appendChild(mkColorRow('Color', 'cordColor'));
    body.appendChild(mkRange('cordThickness', 0.5, 12, 0.05));
    body.appendChild(mkRange('cordBlur', 0, 14, 0.25));
    body.appendChild(mkRange('cordMorph', 0, 4, 0.05));
    body.appendChild(mkRange('cordGlowLayers', 1, 6, 1));

    body.appendChild(section('Packets'));
    body.appendChild(mkColorRow('Idle color', 'packetColorIdle'));
    body.appendChild(mkColorRow('Active (drag) color', 'packetColorActive'));
    body.appendChild(mkRange('packetThicknessMult', 0.4, 3, 0.05));
    body.appendChild(mkRange('packetBlurMult', 0.25, 3, 0.05));
    body.appendChild(mkRange('packetMorphMult', 0.4, 3, 0.05));
    body.appendChild(mkRange('packetGlowLayers', 1, 6, 1));
    body.appendChild(mkRange('packetOpacity', 0.15, 1, 0.05));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'codex-visual-panel__reset';
    btn.textContent = 'Reset look to defaults';
    btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        codexVisualPrefs = { ...CODEX_VISUAL_DEFAULTS };
        persistCodexVisualPrefs();
        syncCodexVisualToolbarFromPrefs();
        redrawCodexEdges();
    });
    body.appendChild(btn);

    det.appendChild(body);
    panel.appendChild(det);
    root.appendChild(panel);
    codexVisualPanelEl = panel;
    syncCodexVisualToolbarFromPrefs();
}

function ensureCodexToolbar() {
    if (!root) return;
    let bar = root.querySelector('.codex-toolbar');
    if (bar) {
        const shrinkLegacy = bar.querySelector('.codex-toolbar__shrink');
        if (shrinkLegacy) {
            const sr = shrinkLegacy.closest('.codex-toolbar__row');
            if (sr && !sr.classList.contains('codex-toolbar__row--scale')) {
                sr.classList.add('codex-toolbar__row--scale');
            }
        }
    }
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'codex-toolbar';

        const rowModes = document.createElement('div');
        rowModes.className = 'codex-toolbar__row';
        const btnDrag = document.createElement('button');
        btnDrag.type = 'button';
        btnDrag.className = 'codex-toolbar__mode-btn codex-toolbar__mode-drag';
        btnDrag.textContent = 'Drag mode';
        btnDrag.title = 'Move nodes by dragging. Caps Lock toggles network mode.';
        const btnNet = document.createElement('button');
        btnNet.type = 'button';
        btnNet.className = 'codex-toolbar__mode-btn codex-toolbar__mode-network';
        btnNet.textContent = 'Network mode';
        btnNet.title = 'Connect nodes: tap one, then another. Caps Lock toggles drag mode. Shift+click adds to selection in drag mode.';
        btnDrag.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            applyCodexToolbarInteractionMode('drag');
        });
        btnNet.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            applyCodexToolbarInteractionMode('network');
        });
        rowModes.appendChild(btnDrag);
        rowModes.appendChild(btnNet);

        const netHint = document.createElement('div');
        netHint.className = 'codex-toolbar__network-hint';
        netHint.style.display = 'none';

        const rowScale = document.createElement('div');
        rowScale.className = 'codex-toolbar__row codex-toolbar__row--scale';
        const shrink = document.createElement('button');
        shrink.type = 'button';
        shrink.className = 'codex-toolbar__scale-btn codex-toolbar__shrink';
        shrink.textContent = '−';
        shrink.title = 'Shrink selected Codex node';
        const grow = document.createElement('button');
        grow.type = 'button';
        grow.className = 'codex-toolbar__scale-btn codex-toolbar__grow';
        grow.textContent = '+';
        grow.title = 'Grow selected Codex node';
        shrink.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            nudgeSelectedNodeScale(1 / 1.12);
        });
        grow.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            nudgeSelectedNodeScale(1.12);
        });
        const scaleInput = document.createElement('input');
        bindCodexToolbarScaleInput(scaleInput);
        rowScale.appendChild(shrink);
        rowScale.appendChild(scaleInput);
        rowScale.appendChild(grow);

        const rowSave = document.createElement('div');
        rowSave.className = 'codex-toolbar__row codex-toolbar__row--footer';
        const hint = document.createElement('span');
        hint.className = 'codex-toolbar__hint';
        hint.textContent = 'Unsaved changes';
        hint.style.display = 'none';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'codex-toolbar__save';
        saveBtn.textContent = 'Save Codex';
        saveBtn.disabled = true;
        saveBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            saveCodexLayout();
        });
        rowSave.appendChild(hint);
        rowSave.appendChild(saveBtn);

        bar.appendChild(rowModes);
        bar.appendChild(netHint);
        bar.appendChild(rowScale);
        bar.appendChild(rowSave);
        root.appendChild(bar);
    }
    codexToolbarEl = bar;
    ensureCodexToolbarSelectionPreviewRow(bar);
    ensureCodexToolbarScaleInput(bar);
    ensureCodexVisualPrefsPanel();
    updateCodexToolbar();
}

function ensureHitLayer() {
    if (!root) return null;
    const parent = codexWorldEl || root;
    let hit = parent.querySelector('.codex-hit-layer');
    if (!hit) {
        hit = document.createElement('div');
        hit.className = 'codex-hit-layer';
        hit.setAttribute('aria-hidden', 'true');
        parent.insertBefore(hit, parent.firstChild);
    }
    hitLayerEl = hit;
    return hitLayerEl;
}

/**
 * @param {number} worldX
 * @param {number} worldY
 * @param {number} [anchorClientX] viewport — with anchorClientY, place picker under pointer (root-relative)
 * @param {number} [anchorClientY]
 */
function openPickerAtRootPoint(worldX, worldY, anchorClientX, anchorClientY) {
    removePicker();
    if (!root) return;

    pendingNodePos = { x: worldX, y: worldY };

    pickerEl = document.createElement('div');
    pickerEl.className = 'codex-picker';

    const maxW = 340;
    const estH = 56;
    const margin = 6;
    const usePointerAnchor =
        typeof anchorClientX === 'number'
        && typeof anchorClientY === 'number'
        && !Number.isNaN(anchorClientX)
        && !Number.isNaN(anchorClientY);

    const rr = root.getBoundingClientRect();
    const rw = root.clientWidth || rr.width || 0;
    const rh = root.clientHeight || rr.height || 0;

    if (usePointerAnchor) {
        /*
         * #codex-view-root lives under `body { transform: scale(--desktop-scale) }`. Viewport deltas must be
         * divided by that scale so `position:absolute` `left`/`top` match the pointer in layout space.
         */
        const layoutPerVp = getCodexBodyLayoutPerViewportPx();
        let pl = (anchorClientX - rr.left) / layoutPerVp;
        let pt = (anchorClientY - rr.top) / layoutPerVp;
        pl = Math.max(margin, Math.min(pl, Math.max(margin, rw - maxW - margin)));
        pt = Math.max(margin, Math.min(pt, Math.max(margin, rh - estH - margin)));
        pickerEl.style.position = 'absolute';
        pickerEl.style.left = `${pl}px`;
        pickerEl.style.top = `${pt}px`;
        pickerEl.style.zIndex = '120';
        root.appendChild(pickerEl);
    } else {
        let px = worldX;
        let py = worldY;
        if (codexWorldEl) {
            const z = Math.max(0.05, codexViewZoom);
            px = worldX * z + codexViewPanX;
            py = worldY * z + codexViewPanY;
        }
        px = Math.max(0, Math.min(px, Math.max(0, rw - maxW)));
        py = Math.max(0, Math.min(py, Math.max(0, rh - estH)));
        pickerEl.style.left = `${px}px`;
        pickerEl.style.top = `${py}px`;
        root.appendChild(pickerEl);
    }

    const row = document.createElement('div');
    row.className = 'codex-picker__row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'codex-picker-input';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-label', 'Search heroes, factions, countries, and NPCs');
    input.placeholder = 'Hero, faction, country, or NPC…';

    const btnJunction = document.createElement('button');
    btnJunction.type = 'button';
    btnJunction.className = 'codex-picker__junction';
    btnJunction.textContent = 'Break';
    btnJunction.title = 'Place a junction waypoint (circle, no portrait) for corners and splits';
    btnJunction.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (pendingNodePos && root) {
            placeCodexNode(pendingNodePos.x, pendingNodePos.y, 'junction', null, null, { fromSaved: false });
        }
        removePicker();
    });

    row.appendChild(input);
    row.appendChild(btnJunction);
    pickerEl.appendChild(row);

    input.addEventListener('input', () => syncSuggestionList(input));
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement === input) return;
            const ae = document.activeElement;
            if (listEl && ae && listEl.contains(ae)) return;
            removePicker();
        }, 180);
    });

    onDocPointerDown = (ev) => {
        if (!pickerEl) return;
        const t = ev.target;
        if (pickerEl.contains(t) || (listEl && listEl.contains(t))) return;
        removePicker();
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);

    onDocKeydown = (ev) => {
        if (ev.key === 'Escape') {
            removePicker();
        }
    };
    document.addEventListener('keydown', onDocKeydown, true);

    input.focus();
}

function normalizeFactions(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    if (typeof raw[0] === 'string') {
        return raw.map((dn) => ({ displayName: dn, filename: dn }));
    }
    return raw.filter((f) => f && (f.displayName != null || f.filename != null));
}

function getHeroFactionLists() {
    const em = window.eventManager;
    const dm = window.globeController?.dataModel;
    const heroes = (em?.heroes?.length ? em.heroes : null) || dm?.heroes || [];
    let factions = (em?.factions?.length ? em.factions : null) || dm?.factions || [];
    const npcs = (em?.npcs?.length ? em.npcs : null) || dm?.npcs || [];
    return { heroes, factions: normalizeFactions(factions), npcs };
}

function clearCodexEventThumbnailFilterHover() {
    const codexRoot = root || document.getElementById('codex-view-root');
    if (!codexRoot) return;
    const els = codexRoot.querySelectorAll('.codex-node--filter-hover');
    if (!els.length) return;
    els.forEach((el) => el.classList.remove('codex-node--filter-hover'));
    redrawCodexEdges();
}

/**
 * Highlight Codex portrait nodes whose kind/id matches the event’s filters (heroes, factions, NPCs).
 * @param {object} event - Full event (root filters if variant omits them)
 * @param {object} [displayEvent] - Variant row when multi-event
 */
function applyCodexEventThumbnailFilterHover(event, displayEvent) {
    const codexRoot = root || document.getElementById('codex-view-root');
    if (!codexRoot || !event) return;
    clearCodexEventThumbnailFilterHover();
    const disp = displayEvent && typeof displayEvent === 'object' ? displayEvent : event;
    const mergeList = (a, b) => [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    const heroesRaw = mergeList(event.filters, disp.filters);
    const factionsRaw = mergeList(event.factions, disp.factions);
    const npcsRaw = mergeList(event.npcs, disp.npcs);
    const heroesLower = new Set(
        heroesRaw.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
    );
    const npcsLower = new Set(
        npcsRaw.map((n) => String(n || '').trim().toLowerCase()).filter(Boolean)
    );
    const factions = Array.isArray(factionsRaw) ? factionsRaw : [];
    const fh = typeof window !== 'undefined' && window.FactionMatchHelpers;

    codexRoot.querySelectorAll('.codex-node').forEach((el) => {
        if (!codexRoot.contains(el) || el.classList.contains('codex-node--junction')) return;
        const kind = el.dataset.codexKind;
        let match = false;
        if (kind === 'hero' && heroesLower.has(String(el.dataset.codexHero || '').trim().toLowerCase())) {
            match = true;
        }
        if (kind === 'npc' && npcsLower.has(String(el.dataset.codexNpc || '').trim().toLowerCase())) {
            match = true;
        }
        if (kind === 'faction' && factions.length) {
            const fn = el.dataset.codexFactionFile || '';
            const fd = el.dataset.codexFactionDisplay || '';
            for (let i = 0; i < factions.length; i++) {
                const ef = factions[i];
                if (fh && typeof fh.factionIdsMatch === 'function') {
                    if (fh.factionIdsMatch(fn, ef) || fh.factionIdsMatch(fd, ef)) {
                        match = true;
                        break;
                    }
                } else if (fn === ef || fd === ef) {
                    match = true;
                    break;
                }
            }
        }
        if (match) el.classList.add('codex-node--filter-hover');
    });
    redrawCodexEdges();
}

function removeListOnly() {
    if (listEl) {
        listEl.remove();
        listEl = null;
    }
}

function removePicker() {
    removeListOnly();
    if (pickerEl) {
        pickerEl.remove();
        pickerEl = null;
    }
    pendingNodePos = null;
    if (onDocPointerDown) {
        document.removeEventListener('pointerdown', onDocPointerDown, true);
        onDocPointerDown = null;
    }
    if (onDocKeydown) {
        document.removeEventListener('keydown', onDocKeydown, true);
        onDocKeydown = null;
    }
}

function substringMatchScore(haystack, needle) {
    if (!needle) return 0;
    const h = String(haystack || '').toLowerCase();
    const n = needle.toLowerCase();
    if (!h.includes(n)) return Infinity;
    if (h.startsWith(n)) return 0;
    return 1 + h.indexOf(n);
}

function buildMatches(query) {
    const prefix = query.trim().toLowerCase();
    const { heroes, factions, npcs } = getHeroFactionLists();
    const countries = [];
    if (prefix) {
        for (let i = 0; i < CODEX_ALLOWED_COUNTRY_KEYS.length; i += 1) {
            const key = CODEX_ALLOWED_COUNTRY_KEYS[i];
            const lk = key.toLowerCase();
            if (lk.includes(prefix)) {
                countries.push({ key, label: key });
            }
        }
    }
    if (!prefix) {
        return { heroes: [], factions: [], countries: [], npcs: [] };
    }
    const hMatch = heroes
        .filter((h) => String(h || '').toLowerCase().includes(prefix))
        .sort(
            (a, b) =>
                substringMatchScore(a, prefix) - substringMatchScore(b, prefix)
                || String(a).length - String(b).length
        )
        .slice(0, MAX_SUGGEST);
    const fMatch = factions
        .filter((f) => {
            const dn = String(f.displayName || '').trim().toLowerCase();
            const fn = String(f.filename || '').toLowerCase();
            return dn.includes(prefix) || fn.includes(prefix);
        })
        .sort((a, b) => {
            const sa = Math.min(
                substringMatchScore(a.displayName, prefix),
                substringMatchScore(a.filename, prefix)
            );
            const sb = Math.min(
                substringMatchScore(b.displayName, prefix),
                substringMatchScore(b.filename, prefix)
            );
            if (sa !== sb) return sa - sb;
            return String(a.displayName || '').length - String(b.displayName || '').length;
        })
        .slice(0, MAX_SUGGEST);
    const npcList = Array.isArray(npcs) ? npcs : [];
    const nMatch = npcList
        .filter((n) => String(n || '').toLowerCase().includes(prefix))
        .sort(
            (a, b) =>
                substringMatchScore(a, prefix) - substringMatchScore(b, prefix)
                || String(a).length - String(b).length
        )
        .slice(0, MAX_SUGGEST);
    return { heroes: hMatch, factions: fMatch, countries, npcs: nMatch };
}

function appendSuggestionRow(list, kind, heroName, faction, onPick, countryMeta = null) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'filter-autocomplete-item';

    const img = document.createElement('img');
    img.className = 'filter-autocomplete-item-icon';
    img.alt = '';
    img.decoding = 'async';
    img.onerror = () => {
        img.style.visibility = 'hidden';
    };

    let labelText = '';
    let detailText = '';

    if (kind === 'hero') {
        labelText = heroName;
        detailText = 'Hero';
        img.src = `assets/images/heroes/${encodeURIComponent(heroName)}.png`;
        img.className += ' filter-autocomplete-item-icon--hero';
    } else if (kind === 'npc') {
        labelText = heroName;
        detailText = 'NPC';
        img.src = `assets/images/npcs/${encodeURIComponent(heroName)}.png`;
        img.className += ' filter-autocomplete-item-icon--npc';
    } else if (kind === 'country' && countryMeta) {
        labelText = countryMeta.label || countryMeta.key;
        detailText = 'Country';
        img.src = codexCountryFlagSrc(countryMeta.key);
        img.className += ' filter-autocomplete-item-icon--flag';
    } else {
        labelText = faction.displayName;
        detailText = 'Faction';
        img.src = `assets/images/factions/${encodeURIComponent(faction.filename)}.png`;
        img.className += ' filter-autocomplete-item-icon--faction';
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'filter-autocomplete-item-label';
    labelSpan.textContent = labelText;

    const detailSpan = document.createElement('span');
    detailSpan.className = 'filter-autocomplete-item-detail';
    detailSpan.textContent = detailText;

    row.appendChild(img);
    row.appendChild(labelSpan);
    row.appendChild(detailSpan);
    row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPick();
    });
    list.appendChild(row);
}

function syncSuggestionList(input) {
    removeListOnly();
    const { heroes, factions, countries, npcs } = buildMatches(input.value);
    if (heroes.length === 0 && factions.length === 0 && countries.length === 0 && npcs.length === 0) {
        return;
    }

    listEl = document.createElement('div');
    listEl.className = 'filter-autocomplete-list filter-autocomplete-list--codex-picker';

    const runPick = (kind, heroName, faction, extra = {}) => {
        if (pendingNodePos && root) {
            placeCodexNode(pendingNodePos.x, pendingNodePos.y, kind, heroName, faction, {
                fromSaved: false,
                ...extra
            });
        }
        removePicker();
    };

    heroes.forEach((h) => {
        appendSuggestionRow(listEl, 'hero', h, null, () => runPick('hero', h, null));
    });
    factions.forEach((f) => {
        appendSuggestionRow(listEl, 'faction', null, f, () => runPick('faction', null, f));
    });
    npcs.forEach((n) => {
        appendSuggestionRow(listEl, 'npc', n, null, () => runPick('npc', n, null));
    });
    countries.forEach((c) => {
        appendSuggestionRow(
            listEl,
            'country',
            null,
            null,
            () => runPick('country', null, null, { countryKey: c.key }),
            c
        );
    });

    if (pickerEl) {
        pickerEl.appendChild(listEl);
    } else {
        const rect = input.getBoundingClientRect();
        listEl.style.left = `${rect.left}px`;
        listEl.style.top = `${rect.bottom + 4}px`;
        listEl.style.width = `${Math.max(rect.width, 220)}px`;
        document.body.appendChild(listEl);
    }
}

function codexSvgPointerDownCapture(e) {
    if (!root || !codexEdgesSvgEl) return;
    cancelBackgroundPanPointerPending();
    const t = /** @type {SVGElement} */ (e.target);
    if (!t || !t.classList) return;
    if (t.closest && (t.closest('.codex-toolbar') || t.closest('.codex-visual-panel'))) return;

    if (e.button === 0 && t.classList.contains('codex-edge-hit')) {
        e.preventDefault();
        e.stopPropagation();
        cancelPointerPending();
        clearPendingCodexDeleteState();
        redrawCodexEdges();
        armCodexBackgroundPanPendingFromEvent(e);
        return;
    }

    if (e.button === 0) {
        clearPendingCodexDeleteState();
        redrawCodexEdges();
    }
}

function cancelPointerPending() {
    cancelBackgroundPanPointerPending();
    if (!pointerPending) return;
    document.removeEventListener('pointermove', onPointerMoveMaybeDrag, capOpts);
    document.removeEventListener('pointerup', onPointerUpMaybeSelect, capOpts);
    document.removeEventListener('pointercancel', onPointerUpMaybeSelect, capOpts);
    pointerPending = null;
}

function onPointerMoveMaybeDrag(ev) {
    const p = pointerPending;
    if (!p || ev.pointerId !== p.pointerId) return;
    const dx = ev.clientX - p.startCX;
    const dy = ev.clientY - p.startCY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
    document.removeEventListener('pointermove', onPointerMoveMaybeDrag, capOpts);
    document.removeEventListener('pointerup', onPointerUpMaybeSelect, capOpts);
    document.removeEventListener('pointercancel', onPointerUpMaybeSelect, capOpts);
    const prep = pointerPending;
    pointerPending = null;
    beginActualNodeDrag(prep, ev);
}

function onPointerUpMaybeSelect(ev) {
    const p = pointerPending;
    if (!p || ev.pointerId !== p.pointerId) return;
    document.removeEventListener('pointermove', onPointerMoveMaybeDrag, capOpts);
    document.removeEventListener('pointerup', onPointerUpMaybeSelect, capOpts);
    document.removeEventListener('pointercancel', onPointerUpMaybeSelect, capOpts);
    pointerPending = null;
    selectCodexNode(p.el, { mode: p.shiftKey ? 'toggle' : 'replace' });
}

function beginActualNodeDrag(prep, firstMoveEv) {
    const el = prep.el;
    const dragNodes = prep.dragGroup && prep.dragGroup.length ? prep.dragGroup : [el];
    el.setPointerCapture(prep.pointerId);

    const { layerLeft, layerTop, grabOffX, grabOffY } = prep;

    const bases = dragNodes.map((nodeEl) => ({
        el: nodeEl,
        baseLeft: parseFloat(nodeEl.style.left) || 0,
        baseTop: parseFloat(nodeEl.style.top) || 0
    }));
    const anchor = bases.find((b) => b.el === el) || bases[0];

    codexActiveDragNodeIds = new Set(dragNodes.map((n) => n.dataset.codexNodeId).filter(Boolean));

    dragNodes.forEach((nodeEl) => {
        nodeEl.style.willChange = 'transform';
        nodeEl.style.transformOrigin = '0 0';
        nodeEl.style.transform = 'translate3d(0px, 0px, 0)';
    });

    let lastTx = 0;
    let lastTy = 0;

    const rawOpts = { capture: true, passive: true };

    const applyClient = (clientX, clientY) => {
        let nx;
        let ny;
        if (codexWorldEl) {
            const pw = clientToWorldCodex(clientX, clientY);
            nx = pw.x - grabOffX;
            ny = pw.y - grabOffY;
        } else {
            nx = (clientX - layerLeft) - grabOffX;
            ny = (clientY - layerTop) - grabOffY;
        }
        let tx = nx - anchor.baseLeft;
        let ty = ny - anchor.baseTop;
        const c = clampCodexGroupDragDelta(tx, ty, dragNodes);
        tx = c.tx;
        ty = c.ty;
        lastTx = tx;
        lastTy = ty;
        const tStr = `translate3d(${tx}px, ${ty}px, 0)`;
        dragNodes.forEach((nodeEl) => {
            nodeEl.style.transform = tStr;
        });
        redrawCodexEdges();
    };

    applyClient(firstMoveEv.clientX, firstMoveEv.clientY);

    const onMove = (ev) => {
        if (!root) return;
        const coalesced = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : null;
        /* Only the latest sample matters for transform + cords; replaying all N events redrew the full SVG N times. */
        if (coalesced && coalesced.length > 0) {
            const last = coalesced[coalesced.length - 1];
            applyClient(last.clientX, last.clientY);
        } else {
            applyClient(ev.clientX, ev.clientY);
        }
    };

    const usePointerRawUpdate = typeof window !== 'undefined'
        && typeof PointerEvent !== 'undefined'
        && 'onpointerrawupdate' in window;
    const moveEvent = usePointerRawUpdate ? 'pointerrawupdate' : 'pointermove';

    let dragFinished = false;
    const finishDrag = () => {
        if (dragFinished) return;
        dragFinished = true;
        codexActiveDragNodeIds.clear();
        const moved = lastTx !== 0 || lastTy !== 0;
        bases.forEach(({ el: nodeEl, baseLeft: bl, baseTop: bt }) => {
            nodeEl.style.left = `${bl + lastTx}px`;
            nodeEl.style.top = `${bt + lastTy}px`;
            nodeEl.style.transform = '';
            nodeEl.style.willChange = '';
        });
        document.removeEventListener(moveEvent, onMove, usePointerRawUpdate ? rawOpts : capOpts);
        document.removeEventListener('pointerup', onUp, capOpts);
        document.removeEventListener('pointercancel', onUp, capOpts);
        el.removeEventListener('lostpointercapture', onLost);
        if (moved) {
            const dragIds = new Set(dragNodes.map((n) => n.dataset.codexNodeId).filter(Boolean));
            applyOctilinearSnapOnDragRelease(dragIds);
            bases.forEach(({ el: nodeEl }) => {
                markNodeVisualUnsaved(nodeEl);
                markIncidentCodexEdgesUnsaved(nodeEl.dataset.codexNodeId);
            });
            markCodexLayoutDirty();
        }
        redrawCodexEdges();
    };

    const onLost = () => {
        finishDrag();
    };

    const onUp = () => {
        try {
            el.releasePointerCapture(prep.pointerId);
        } catch (_) { /* ignore */ }
        finishDrag();
    };

    el.addEventListener('lostpointercapture', onLost);
    document.addEventListener(moveEvent, onMove, usePointerRawUpdate ? rawOpts : capOpts);
    document.addEventListener('pointerup', onUp, capOpts);
    document.addEventListener('pointercancel', onUp, capOpts);
}

function bindCodexNodeInteraction(el) {
    let lastCtx = 0;
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        pruneStaleCodexSelection();
        const inSelection = codexSelectedNodeEls.has(el);
        const multi = codexSelectedNodeEls.size > 1 && inSelection;

        if (multi) {
            const bulkAge = now - codexBulkNodeDeleteArmedAt;
            if (bulkAge < DOUBLE_RIGHT_MS && codexBulkNodeDeleteArmedAt > 0) {
                const toRemove = [...codexSelectedNodeEls].filter((n) => root && root.contains(n));
                const ids = toRemove.map((n) => n.dataset.codexNodeId).filter(Boolean);
                clearPendingCodexDeleteState();
                removeEdgesTouchingNodeIds(ids);
                markCodexLayoutDirty();
                codexSelectedNodeEls.clear();
                codexPrimarySelectedNodeEl = null;
                toRemove.forEach((n) => n.remove());
                applyCodexSelectionToDom();
                redrawCodexEdges();
                updateCodexToolbar();
            } else {
                clearPendingCodexDeleteState();
                codexBulkNodeDeleteArmedAt = now;
                codexSelectedNodeEls.forEach((n) => {
                    if (root && root.contains(n)) n.classList.add('codex-node--pending-delete');
                });
                redrawCodexEdges();
            }
            lastCtx = now;
            return;
        }

        codexBulkNodeDeleteArmedAt = 0;
        if (now - lastCtx < DOUBLE_RIGHT_MS) {
            clearPendingCodexDeleteState();
            const nid = el.dataset.codexNodeId;
            removeEdgesTouchingNodeId(nid);
            markCodexLayoutDirty();
            codexSelectedNodeEls.delete(el);
            if (codexPrimarySelectedNodeEl === el) {
                const rest = [...codexSelectedNodeEls];
                codexPrimarySelectedNodeEl = rest.length ? rest[rest.length - 1] : null;
            }
            applyCodexSelectionToDom();
            el.remove();
            redrawCodexEdges();
            updateCodexToolbar();
        } else {
            clearPendingCodexDeleteState();
            el.classList.add('codex-node--pending-delete');
            redrawCodexEdges();
        }
        lastCtx = now;
    });

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        clearPendingCodexDeleteState();
        redrawCodexEdges();
        if (codexInteractionMode === 'network') {
            e.preventDefault();
            handleNetworkNodeActivate(el);
            return;
        }
        cancelPointerPending();

        cancelBackgroundPanPointerPending();

        const baseLeft = parseFloat(el.style.left) || 0;
        const baseTop = parseFloat(el.style.top) || 0;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (!root) return;

        let maxX;
        let maxY;
        let grabOffX;
        let grabOffY;
        let layerLeft = 0;
        let layerTop = 0;

        if (codexWorldEl) {
            maxX = Math.max(0, CODEX_WORLD_W - w);
            maxY = Math.max(0, CODEX_WORLD_H - h);
            const pw = clientToWorldCodex(e.clientX, e.clientY);
            grabOffX = pw.x - baseLeft;
            grabOffY = pw.y - baseTop;
        } else {
            const layer = hitLayerEl || root;
            const lr = layer.getBoundingClientRect();
            layerLeft = lr.left;
            layerTop = lr.top;
            maxX = Math.max(0, root.clientWidth - w);
            maxY = Math.max(0, root.clientHeight - h);
            grabOffX = (e.clientX - lr.left) - baseLeft;
            grabOffY = (e.clientY - lr.top) - baseTop;
        }

        pointerPending = {
            el,
            dragGroup: selectDragGroupForNode(el),
            pointerId: e.pointerId,
            baseLeft,
            baseTop,
            layerLeft,
            layerTop,
            maxX,
            maxY,
            grabOffX,
            grabOffY,
            startCX: e.clientX,
            startCY: e.clientY,
            shiftKey: !!e.shiftKey
        };
        document.addEventListener('pointermove', onPointerMoveMaybeDrag, capOpts);
        document.addEventListener('pointerup', onPointerUpMaybeSelect, capOpts);
        document.addEventListener('pointercancel', onPointerUpMaybeSelect, capOpts);
    });
}

/**
 * @param {string} kind
 * @param {string|null} heroName
 * @param {{ filename: string, displayName?: string }|null} faction
 * @param {{ fromSaved?: boolean, id?: string, scale?: number }} [opts]
 */
function createCodexNodeElement(x, y, kind, heroName, faction, opts = {}) {
    const el = document.createElement('div');
    el.className = 'codex-node';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.zIndex = String(++nodeZ);
    el.dataset.codexNodeId = opts.id || generateNodeId();

    el.dataset.codexKind = kind;
    if (kind === 'junction') {
        el.classList.add('codex-node--junction');
        const dot = document.createElement('div');
        dot.className = 'codex-node__junction';
        dot.setAttribute('aria-hidden', 'true');
        el.appendChild(dot);
        applyNodeScale(el, resolveCodexNodeScale('junction', opts.scale));
        bindCodexNodeInteraction(el);
        return el;
    }
    if (kind === 'hero') {
        el.dataset.codexHero = heroName || '';
    } else if (kind === 'npc') {
        el.dataset.codexNpc = heroName || '';
    } else if (kind === 'country') {
        const ck = normalizeCodexCountryKey(opts.countryKey);
        el.dataset.codexCountryKey = ck || '';
    } else if (faction) {
        el.dataset.codexFactionFile = faction.filename || '';
        el.dataset.codexFactionDisplay = faction.displayName || faction.filename || '';
    }

    const inner = document.createElement('div');
    inner.className = 'codex-node__inner';

    const clip = document.createElement('div');
    clip.className = 'codex-node__clip';
    clip.setAttribute('aria-hidden', 'true');

    const imgSpin = document.createElement('div');
    imgSpin.className = 'codex-node__img-spin';
    imgSpin.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'codex-node__img';
    img.draggable = false;
    if (kind === 'hero') {
        img.src = `assets/images/heroes/${encodeURIComponent(heroName)}.png`;
        img.alt = heroName || 'Hero';
    } else if (kind === 'npc') {
        img.src = `assets/images/npcs/${encodeURIComponent(heroName)}.png`;
        img.alt = heroName || 'NPC';
    } else if (kind === 'country') {
        const ck = el.dataset.codexCountryKey || '';
        img.src = codexCountryFlagSrc(ck);
        img.alt = ck || 'Country';
    } else {
        img.src = `assets/images/factions/${encodeURIComponent(faction.filename)}.png`;
        img.alt = faction.displayName || '';
    }
    img.onerror = () => {
        img.style.opacity = '0.35';
    };

    const nid = el.dataset.codexNodeId;
    const frameVariant = codexFrameVariantForId(nid);
    const hexRotationDeg = codexHexRotationDegreesForId(nid);
    el.dataset.codexFrameVariant = String(frameVariant);
    el.dataset.codexHexRotation = String(hexRotationDeg);
    inner.style.setProperty('--codex-hex-rotation', `${hexRotationDeg}deg`);
    inner.style.setProperty('--codex-portrait-counter-rotation', `${-hexRotationDeg}deg`);
    const frame = document.createElement('img');
    frame.className = 'codex-node__frame';
    frame.src = `${CODEX_FRAME_PATH}${frameVariant}.png`;
    frame.alt = '';
    frame.draggable = false;
    frame.setAttribute('aria-hidden', 'true');

    const portraitFit = document.createElement('div');
    portraitFit.className = 'codex-node__portrait-fit';
    portraitFit.setAttribute('aria-hidden', 'true');
    portraitFit.appendChild(img);
    imgSpin.appendChild(portraitFit);
    clip.appendChild(imgSpin);
    inner.appendChild(clip);
    inner.appendChild(frame);
    el.appendChild(inner);
    const portraitKind = kind === 'faction'
        ? 'faction'
        : kind === 'country'
            ? 'country'
            : kind === 'npc'
                ? 'npc'
                : 'hero';
    applyNodeScale(el, resolveCodexNodeScale(portraitKind, opts.scale));
    bindCodexNodeInteraction(el);
    return el;
}

/**
 * @param {{ fromSaved?: boolean, id?: string, scale?: number, countryKey?: string }} [opts]
 */
function placeCodexNode(x, y, kind, heroName, faction, opts = {}) {
    if (!root) return;
    if (kind === 'npc' && !String(heroName || '').trim()) return;
    if (kind === 'country' && !normalizeCodexCountryKey(opts.countryKey)) return;
    const scale = resolveCodexNodeScale(kind, opts.scale);
    const { x: cx, y: cy } = clampCodexNodeTopLeftToWorld(x, y, scale, kind);
    const fromSaved = opts.fromSaved === true;
    const el = createCodexNodeElement(cx, cy, kind, heroName, faction, { ...opts, scale });
    (codexWorldEl || root).appendChild(el);
    if (!fromSaved) {
        markNodeVisualUnsaved(el);
        markCodexLayoutDirty();
        selectCodexNode(el);
    }
    redrawCodexEdges();
}

/**
 * @param {HTMLElement} rootElement - #codex-view-root
 */
export function initCodexCanvas(rootElement) {
    destroyCodexCanvas();
    root = rootElement;
    if (!root) return;

    loadCodexDebugUiPref();
    loadCodexVisualPrefs();
    syncCodexDebugUiClass();

    codexLayoutDirty = false;
    codexToolbarEl = null;
    codexVisualPanelEl = null;
    codexInteractionMode = 'drag';
    networkLinkSourceId = null;
    codexSelectedNodeEls = new Set();
    codexPrimarySelectedNodeEl = null;
    cordPendingDeletePairKey = null;
    codexBulkNodeDeleteArmedAt = 0;
    codexActiveDragNodeIds = new Set();
    codexEdges = [];
    pointerPending = null;

    ensureCodexWorld();
    ensureHitLayer();
    ensureEdgesLayer();
    if (codexEdgesSvgEl) {
        codexEdgesSvgEl.addEventListener('pointerdown', codexSvgPointerDownCapture, true);
    }

    if (hitLayerEl) {
        hitLayerEl.addEventListener('pointerdown', onHitLayerBackgroundPanPointerDown, true);
    }

    onCodexContextMenuCapture = (e) => {
        if (!hitLayerEl) return;
        if (e.target.closest('.codex-node')) return;
        if (e.target.closest('.codex-picker')) return;
        if (e.target.closest('.codex-toolbar') || e.target.closest('.codex-visual-panel')) return;
        if (e.target.closest('.filter-autocomplete-list')) return;

        const fromLayer = e.target === hitLayerEl || hitLayerEl.contains(e.target);
        const fromRootBare = e.target === root;
        if (!fromLayer && !fromRootBare) return;

        e.preventDefault();
        clearPendingCodexDeleteState();
        redrawCodexEdges();

        let px;
        let py;
        if (codexWorldEl) {
            const wpt = clientToWorldCodex(e.clientX, e.clientY);
            px = wpt.x;
            py = wpt.y;
        } else {
            const r = hitLayerEl.getBoundingClientRect();
            px = e.clientX - r.left;
            py = e.clientY - r.top;
        }

        openPickerAtRootPoint(px, py, e.clientX, e.clientY);
    };
    root.addEventListener('contextmenu', onCodexContextMenuCapture, true);

    attachCodexViewGestures();

    onCodexGlobalKeydown = (ev) => {
        if (!root) return;
        if (ev.code !== 'CapsLock' || ev.repeat) return;
        const t = ev.target;
        if (t instanceof Element) {
            if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (t.isContentEditable) return;
        }
        if (pickerEl) return;
        try {
            ev.preventDefault();
        } catch (_) { /* ignore */ }
        if (codexInteractionMode === 'drag') {
            codexInteractionMode = 'network';
            networkLinkSourceId = null;
            selectCodexNode(null);
        } else {
            codexInteractionMode = 'drag';
            networkLinkSourceId = null;
        }
        updateCodexToolbar();
    };
    document.addEventListener('keydown', onCodexGlobalKeydown, true);

    onWindowResizeRedraw = () => {
        redrawCodexEdges();
    };
    window.addEventListener('resize', onWindowResizeRedraw);

    ensureCodexToolbar();
    void loadCodexState();
}

export function destroyCodexCanvas() {
    if (onCodexGlobalKeydown) {
        document.removeEventListener('keydown', onCodexGlobalKeydown, true);
        onCodexGlobalKeydown = null;
    }
    detachCodexViewGestures();
    cancelPointerPending();
    cancelBackgroundPanPointerPending();
    codexActiveDragNodeIds.clear();
    cordDoubleRightLastTs.clear();
    cordPendingDeletePairKey = null;
    codexBulkNodeDeleteArmedAt = 0;
    if (codexEdgesSvgEl) {
        codexEdgesSvgEl.removeEventListener('pointerdown', codexSvgPointerDownCapture, true);
    }
    codexEdgesSvgEl = null;
    removePicker();
    if (hitLayerEl) {
        hitLayerEl.removeEventListener('pointerdown', onHitLayerBackgroundPanPointerDown, true);
    }
    if (root && onCodexContextMenuCapture) {
        root.removeEventListener('contextmenu', onCodexContextMenuCapture, true);
    }
    if (onWindowResizeRedraw) {
        window.removeEventListener('resize', onWindowResizeRedraw);
        onWindowResizeRedraw = null;
    }
    clearCodexEventThumbnailFilterHover();
    root = null;
    hitLayerEl = null;
    codexWorldEl = null;
    codexViewPanX = 0;
    codexViewPanY = 0;
    codexViewZoom = CODEX_ZOOM_INITIAL;
    codexUnsavedEdgeKeys.clear();
    onCodexContextMenuCapture = null;
    codexToolbarEl = null;
    codexVisualPanelEl = null;
    codexLayoutDirty = false;
    codexSelectedNodeEls.clear();
    codexPrimarySelectedNodeEl = null;
    networkLinkSourceId = null;
    codexEdges = [];
    nodeZ = 20;
    codexStopCordAnimRafOnly();
    codexCordPacketState.clear();
}

if (typeof window !== 'undefined') {
    window.CodexCanvasService = {
        initCodexCanvas,
        destroyCodexCanvas,
        saveCodexLayout,
        getCodexLayoutDirty: () => codexLayoutDirty,
        zoomIn: codexZoomInFromUi,
        zoomOut: codexZoomOutFromUi,
        resetView: codexResetView,
        applyCodexEventThumbnailFilterHover,
        clearCodexEventThumbnailFilterHover
    };
}
