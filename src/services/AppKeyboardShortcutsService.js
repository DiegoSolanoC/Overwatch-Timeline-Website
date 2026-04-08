/**
 * Global keyboard shortcuts (timeline mode, panels, pagination).
 * Z: pagination dock collapse/expand (desktop dock). Loaded as a classic script; capture phase.
 */
(function initAppKeyboardShortcuts() {
    if (window.__appKeyboardShortcutsInstalled) return;
    window.__appKeyboardShortcutsInstalled = true;

    var SCROLL_STEP = 80;

    function consumeEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    function inputType(el) {
        if (!el || (el.tagName || '').toUpperCase() !== 'INPUT') return '';
        return String(el.type || '').toLowerCase();
    }

    function isTypingContext(target) {
        if (!target || !target.closest) return false;
        var el = target;
        if (el.isContentEditable) return true;
        var tag = (el.tagName || '').toUpperCase();
        if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (tag === 'INPUT') {
            var it = inputType(el);
            /* Range is not text entry — allow A/D and arrows to change pages + sync slider */
            if (it === 'range' || it === 'checkbox' || it === 'radio' || it === 'button' || it === 'submit' || it === 'reset' || it === 'file') return false;
            return true;
        }
        if (el.closest && el.closest('[contenteditable="true"]')) return true;
        return false;
    }

    function isEventPageRangeSlider(target) {
        return inputType(target) === 'range' && target && target.id === 'eventPageSlider';
    }

    /**
     * Escape should still dismiss our panels when focus is in a field inside them.
     * (Plain Q is not bypassed — avoids closing while typing "q" in search.)
     */
    function escapeOkWhileTypingInTarget(target) {
        if (!target || !target.closest) return false;
        return !!(
            target.closest('#filtersPanel')
            || target.closest('#musicPanel')
            || target.closest('#eventsManagePanel')
            || target.closest('#paletteMenu')
            || target.closest('#eventSlide')
            || target.closest('#eventEditModal')
            || target.closest('#externalLinkConfirmOverlay')
        );
    }

    function modifiersActive(e) {
        return e.ctrlKey || e.metaKey || e.altKey;
    }

    function isGlobeTimelineMode() {
        var mode = (typeof localStorage !== 'undefined' && localStorage.getItem('currentMode')) || '';
        return mode.toString().toLowerCase() === 'globe' && !!window.globeController;
    }

    function canNavigateGlobePages() {
        var dm = window.globeController && window.globeController.dataModel;
        return dm && typeof dm.getTotalEventPages === 'function' && dm.getTotalEventPages() > 1;
    }

    function getScrollContainer() {
        var slide = document.getElementById('eventSlide');
        if (slide && slide.classList.contains('open')) {
            return document.getElementById('eventSlideScrollable');
        }
        var manage = document.getElementById('eventsManagePanel');
        if (manage && manage.classList.contains('open')) {
            return document.getElementById('eventsList');
        }
        var filters = document.getElementById('filtersPanel');
        if (filters && filters.classList.contains('open')) {
            return filters.querySelector('.filters-panel-content');
        }
        var music = document.getElementById('musicPanel');
        if (music && music.classList.contains('open')) {
            return music.querySelector('.music-panel-content');
        }
        return null;
    }

    function getPaginationOnChange() {
        var ui = window.globeController && window.globeController.uiView;
        if (ui && typeof ui._paginationOnPageChange === 'function') return ui._paginationOnPageChange;
        var gv = window.globeController && window.globeController.globeView;
        if (gv && typeof gv.refreshEventMarkers === 'function') {
            return function () {
                gv.refreshEventMarkers();
            };
        }
        return null;
    }

    function runGlobePagePrev() {
        if (!canNavigateGlobePages()) return false;
        var gc = window.globeController;
        var dm = gc && gc.dataModel;
        var ui = gc && gc.uiView;
        var h = window.NavigationPaginationHelpers;
        if (!dm || !ui || typeof ui.updatePaginationUI !== 'function' || !h) return false;
        h.handlePrevPageClick(dm, ui.updatePaginationUI, getPaginationOnChange());
        return true;
    }

    function runGlobePageNext() {
        if (!canNavigateGlobePages()) return false;
        var gc = window.globeController;
        var dm = gc && gc.dataModel;
        var ui = gc && gc.uiView;
        var h = window.NavigationPaginationHelpers;
        if (!dm || !ui || typeof ui.updatePaginationUI !== 'function' || !h) return false;
        h.handleNextPageClick(dm, ui.updatePaginationUI, getPaginationOnChange());
        return true;
    }

    function triggerPrevPageButtonOrHelpers() {
        var btn = document.getElementById('prevPageBtn');
        if (btn && !btn.disabled) {
            btn.click();
            return true;
        }
        return runGlobePagePrev();
    }

    function triggerNextPageButtonOrHelpers() {
        var btn = document.getElementById('nextPageBtn');
        if (btn && !btn.disabled) {
            btn.click();
            return true;
        }
        return runGlobePageNext();
    }

    function isEventSlideOpen() {
        var s = document.getElementById('eventSlide');
        return !!(s && s.classList.contains('open'));
    }

    function isEventsManageOpen() {
        var p = document.getElementById('eventsManagePanel');
        return !!(p && p.classList.contains('open'));
    }

    function isPaletteMenuOpen() {
        var m = document.getElementById('paletteMenu');
        return !!(m && m.classList.contains('open'));
    }

    function clickIfEnabled(id) {
        var b = document.getElementById(id);
        if (!b || b.disabled) return false;
        b.click();
        return true;
    }

    /** Arrow Up/Down and W/S: scroll in panel, else zoom, else page scroll */
    function applyVerticalNavigation(scrollEl, e, isUp) {
        if (scrollEl) {
            scrollEl.scrollTop += isUp ? -SCROLL_STEP : SCROLL_STEP;
            consumeEvent(e);
        } else if (clickIfEnabled(isUp ? 'zoomInBtn' : 'zoomOutBtn')) {
            consumeEvent(e);
        } else {
            var root = document.scrollingElement || document.documentElement;
            if (root && root.scrollHeight > root.clientHeight) {
                root.scrollTop += isUp ? -SCROLL_STEP : SCROLL_STEP;
                consumeEvent(e);
            }
        }
    }

    function getEventVariantToggleButtons() {
        if (!isEventSlideOpen()) return null;
        var c = document.getElementById('eventVariantToggles');
        if (!c) return null;
        try {
            if (window.getComputedStyle(c).display === 'none') return null;
        } catch (_) {
            return null;
        }
        var btns = c.querySelectorAll('.variant-toggle-btn');
        if (!btns || !btns.length) return null;
        return btns;
    }

    /** @returns {'ok'|'invalid'|null} */
    function tryVariantDigitKey(digit) {
        var btns = getEventVariantToggleButtons();
        if (!btns) return null;
        var idx = digit === '10' ? 9 : parseInt(digit, 10) - 1;
        if (idx < 0 || idx >= btns.length) return 'invalid';
        var btn = btns[idx];
        if (btn.disabled) return 'invalid';
        btn.click();
        return 'ok';
    }

    var PALETTE_ORDER = ['blue', 'gray', 'crimson', 'nulled'];

    function normalizeStoredPalette() {
        try {
            var s = localStorage.getItem('colorPalette');
            if (s === 'gray') return 'gray';
            if (s === 'crimson') return 'crimson';
            if (s === 'nulled') return 'nulled';
            return 'blue';
        } catch (_) {
            return 'blue';
        }
    }

    function applyPaletteByName(name) {
        var btn = document.querySelector('#paletteMenu .palette-option-btn[data-palette="' + name + '"]');
        if (btn) btn.click();
    }

    function triggerEventSlidePrev() {
        var b = document.getElementById('eventPrevBtn');
        if (!b || b.disabled) return false;
        b.click();
        return true;
    }

    function triggerEventSlideNext() {
        var b = document.getElementById('eventNextBtn');
        if (!b || b.disabled) return false;
        b.click();
        return true;
    }

    function triggerEventsManagePrev() {
        var b = document.getElementById('eventsPrevPage');
        if (!b || b.disabled) return false;
        b.click();
        return true;
    }

    function triggerEventsManageNext() {
        var b = document.getElementById('eventsNextPage');
        if (!b || b.disabled) return false;
        b.click();
        return true;
    }

    function triggerNumberButton(positionStr) {
        var btn = document.querySelector(
            '#eventNumberButtons .event-number-btn[data-position="' + positionStr + '"]'
        );
        if (!btn || btn.style.display === 'none' || btn.classList.contains('locked')) return false;

        var slideOpen = document.getElementById('eventSlide') && document.getElementById('eventSlide').classList.contains('open');
        if (slideOpen && btn.disabled) {
            btn.disabled = false;
            btn.click();
            btn.disabled = true;
            return true;
        }
        if (!btn.disabled) {
            btn.click();
            return true;
        }
        return false;
    }

    function clearHackedOverlays() {
        document.querySelectorAll('.hacked-overlay').forEach(function (el) {
            el.remove();
        });
    }

    function hideEventSlideIfOpen() {
        try {
            if (window.globeController && window.globeController.uiView && typeof window.globeController.uiView.hideEventSlide === 'function') {
                clearHackedOverlays();
                window.globeController.uiView.hideEventSlide();
                return true;
            }
        } catch (_) {}
        var slide = document.getElementById('eventSlide');
        var overlay = document.getElementById('eventImageOverlay');
        if (slide && slide.classList.contains('open')) {
            slide.classList.remove('open');
            if (overlay) overlay.classList.remove('slide-open', 'open', 'fade-in', 'fade-out');
            return true;
        }
        if (overlay && overlay.classList.contains('open')) {
            overlay.classList.remove('slide-open', 'open', 'fade-in', 'fade-out');
            return true;
        }
        return false;
    }

    /** @returns {boolean} whether something was closed */
    function closeTopOverlay() {
        var ext = document.getElementById('externalLinkConfirmOverlay');
        if (ext && ext.classList.contains('is-open')) {
            var cancel = document.getElementById('externalLinkConfirmCancel');
            if (cancel) cancel.click();
            else ext.classList.remove('is-open');
            return true;
        }

        var editModal = document.getElementById('eventEditModal');
        if (editModal && editModal.classList.contains('open')) {
            var closeBtn = document.getElementById('eventEditModalClose');
            var cancelBtn = document.getElementById('eventEditCancel');
            if (closeBtn) closeBtn.click();
            else if (cancelBtn) cancelBtn.click();
            else editModal.classList.remove('open');
            return true;
        }

        if (hideEventSlideIfOpen()) return true;

        var palette = document.getElementById('paletteMenu');
        if (palette && palette.classList.contains('open')) {
            if (typeof window._closePaletteMenu === 'function') {
                window._closePaletteMenu();
            } else {
                palette.classList.remove('open');
                var paletteToggle = document.getElementById('colorPaletteToggle');
                if (paletteToggle) paletteToggle.classList.remove('active');
            }
            return true;
        }

        var filters = document.getElementById('filtersPanel');
        if (filters && filters.classList.contains('open')) {
            var fc = document.getElementById('filtersPanelClose');
            if (fc) fc.click();
            else filters.classList.remove('open');
            return true;
        }

        var music = document.getElementById('musicPanel');
        if (music && music.classList.contains('open')) {
            var mc = document.getElementById('musicPanelClose');
            if (mc) mc.click();
            else music.classList.remove('open');
            return true;
        }

        var manage = document.getElementById('eventsManagePanel');
        if (manage && manage.classList.contains('open')) {
            var mClose = document.getElementById('eventsManageClose');
            if (mClose) mClose.click();
            else manage.classList.remove('open');
            return true;
        }

        var sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('visible')) {
            sidebar.classList.remove('visible');
            try {
                localStorage.setItem('sidebarOpen', 'false');
            } catch (_) {}
            return true;
        }

        return false;
    }

    /** Repeatedly peel {@link closeTopOverlay} so one keypress clears event slide + image + palette + filters + music + manage, etc. */
    function closeAllOverlayLayers() {
        var any = false;
        var guard = 24;
        while (guard-- > 0 && closeTopOverlay()) {
            any = true;
        }
        return any;
    }

    function onKeyDown(e) {
        if (modifiersActive(e)) return;

        var target = e.target;
        var key = e.key;
        var lower = typeof key === 'string' ? key.toLowerCase() : '';

        if (key === 'Escape' || lower === 'q') {
            if (isTypingContext(target)) {
                if (key !== 'Escape' || !escapeOkWhileTypingInTarget(target)) return;
            }
            if (closeAllOverlayLayers()) consumeEvent(e);
            return;
        }

        if (isTypingContext(target)) return;

        if (lower === 'e') {
            if (isEventSlideOpen()) {
                if (clickIfEnabled('eventAllEventsBtn')) consumeEvent(e);
            } else if (clickIfEnabled('eventsManageToggle')) {
                consumeEvent(e);
            }
            return;
        }
        if (lower === 'h') {
            if (isEventSlideOpen() && clickIfEnabled('eventImageToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'x') {
            var glitchBtn = document.getElementById('eventGlitchToggle');
            if (
                isEventSlideOpen() &&
                glitchBtn &&
                !glitchBtn.disabled &&
                window.getComputedStyle(glitchBtn).display !== 'none'
            ) {
                glitchBtn.click();
                consumeEvent(e);
            }
            return;
        }
        if (lower === 'f') {
            if (clickIfEnabled('filtersToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'g') {
            if (clickIfEnabled('mapViewToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'v') {
            if (clickIfEnabled('hyperloopToggle')) consumeEvent(e);
            return;
        }
        if (lower === 't') {
            if (clickIfEnabled('weatherEffectsToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'c') {
            if (clickIfEnabled('colorPaletteToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'm') {
            if (clickIfEnabled('musicToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'r') {
            if (clickIfEnabled('autoRotateToggle')) consumeEvent(e);
            return;
        }
        if (lower === 'z') {
            var pdc = window.PaginationDockCollapse;
            if (pdc && typeof pdc.toggle === 'function' && pdc.toggle()) {
                consumeEvent(e);
            }
            return;
        }
        if (key === 'Enter') {
            if (isTypingContext(target)) return;
            if (target && target.closest && target.closest('button, a[href], [role="button"], [role="menuitem"]')) {
                return;
            }
            if (clickIfEnabled('zoomResetBtn')) consumeEvent(e);
            return;
        }

        var scrollEl = getScrollContainer();

        if (key === 'ArrowUp' || lower === 'w') {
            if (isEventPageRangeSlider(target)) return;
            applyVerticalNavigation(scrollEl, e, true);
            return;
        }
        if (key === 'ArrowDown' || lower === 's') {
            if (isEventPageRangeSlider(target)) return;
            applyVerticalNavigation(scrollEl, e, false);
            return;
        }

        if (key === 'ArrowLeft' || lower === 'a') {
            if (isEventSlideOpen()) {
                if (triggerEventSlidePrev()) consumeEvent(e);
            } else if (isEventsManageOpen()) {
                if (triggerEventsManagePrev()) consumeEvent(e);
            } else if (isGlobeTimelineMode()) {
                if (triggerPrevPageButtonOrHelpers()) consumeEvent(e);
            }
            return;
        }
        if (key === 'ArrowRight' || lower === 'd') {
            if (isEventSlideOpen()) {
                if (triggerEventSlideNext()) consumeEvent(e);
            } else if (isEventsManageOpen()) {
                if (triggerEventsManageNext()) consumeEvent(e);
            } else if (isGlobeTimelineMode()) {
                if (triggerNextPageButtonOrHelpers()) consumeEvent(e);
            }
            return;
        }

        var digit = null;
        if (key >= '1' && key <= '9') digit = key;
        else if (key === '0') digit = '10';
        else if (e.code && e.code.indexOf('Numpad') === 0) {
            if (e.code === 'Numpad1') digit = '1';
            else if (e.code === 'Numpad2') digit = '2';
            else if (e.code === 'Numpad3') digit = '3';
            else if (e.code === 'Numpad4') digit = '4';
            else if (e.code === 'Numpad5') digit = '5';
            else if (e.code === 'Numpad6') digit = '6';
            else if (e.code === 'Numpad7') digit = '7';
            else if (e.code === 'Numpad8') digit = '8';
            else if (e.code === 'Numpad9') digit = '9';
            else if (e.code === 'Numpad0') digit = '10';
        }

        if (digit && isPaletteMenuOpen()) {
            var idx = digit === '10' ? 0 : parseInt(digit, 10);
            if (idx >= 1 && idx <= 4) {
                applyPaletteByName(PALETTE_ORDER[idx - 1]);
                consumeEvent(e);
            } else {
                consumeEvent(e);
            }
            return;
        }

        if (digit && isEventSlideOpen()) {
            var vr = tryVariantDigitKey(digit);
            if (vr === 'ok' || vr === 'invalid') {
                consumeEvent(e);
                return;
            }
        }

        if (digit && isGlobeTimelineMode() && !isEventsManageOpen()) {
            if (triggerNumberButton(digit)) consumeEvent(e);
        }
    }

    function onWheel(e) {
        if (modifiersActive(e)) return;
        if (isTypingContext(e.target)) return;
        if (!isPaletteMenuOpen()) return;
        var t = e.target;
        if (!t || !t.closest || !t.closest('#paletteMenu')) return;

        var cur = normalizeStoredPalette();
        var i = PALETTE_ORDER.indexOf(cur);
        if (i < 0) i = 0;
        if (e.deltaY > 0) {
            i = (i + 1) % PALETTE_ORDER.length;
        } else {
            i = (i - 1 + PALETTE_ORDER.length) % PALETTE_ORDER.length;
        }
        applyPaletteByName(PALETTE_ORDER[i]);
        e.preventDefault();
        e.stopPropagation();
    }

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });

    /** Full stack dismiss (Escape/Q): modals, event slide, palette, filters, music, event manager, sidebar */
    window.closeAllDismissiblePanels = closeAllOverlayLayers;
})();
