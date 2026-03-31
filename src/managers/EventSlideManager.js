/**
 * EventSlideManager - Handles event slide display, hiding, and variant switching
 * Extracted from UIView to reduce complexity and improve maintainability
 */

import { formatEventSlideTitleHtml } from './helpers/EventSlideShowHelpers.js';
import {
    setupMobileEventSlide,
    cleanupMobileEventSlide,
    getDefaultZoom,
    setupMobileFullTextToggleButton,
    resetMobileFullTextUi
} from './helpers/MobileEventSlideHelpers.js';
import { setupEarthLocation, setupMoonMarsLocation, setupStationLocation, setupMarsShipLocation, hideLocationWithFade, setupLocationClickHandler } from './helpers/LocationDisplayHelpers.js';
import { loadEventImage, setupImageFadeIn } from './helpers/ImageLoadingHelpers.js';
import { findVariantMarker, zoomToVariantLocation, createTempMarkerForCoords } from './helpers/VariantHelpers.js';

// getHeroDisplayName removed - not used in this file

// Export mobile helpers for backward compatibility
export const MobileHelpers = {
    isMobile: () => window.innerWidth <= 768,
    isMobilePortrait: () => window.innerWidth <= 768 && window.innerHeight > window.innerWidth,
    getDefaultZoom,
    setupMobileEventSlide,
    cleanupMobileEventSlide,
    setupMobileFullTextToggleButton,
    resetMobileFullTextUi
};

export class EventSlideManager {
    constructor(sceneModel, dataModel, uiView) {
        this.sceneModel = sceneModel;
        this.dataModel = dataModel;
        this.uiView = uiView; // Reference back to UIView for methods that still need to be there
        this.currentEventMarker = null;
        this.currentEventData = null;
        this.currentVariantIndex = 0;
        this.previousAutoRotateState = null;
        this.originalCameraPosition = null;
        this.originalGlobeRotation = null;

        this._inlineDescEdit = {
            active: false,
            dirty: false,
            originalText: '',
            // snapshot of what we were editing (so cancel works even if state changes)
            eventData: null,
            variantIndex: -1,

            // extended fields
            originalName: '',
            originalCityDisplayName: '',
            originalFilters: [],
            originalFactions: [],
            originalSources: [],
            originalHeadlines: []
        };
    }

    _isInlineEditAllowed() {
        // Keep behavior consistent with EventManager: disable editing on GitHub Pages.
        try {
            return !(window.eventManager && typeof window.eventManager.isGitHubPages === 'function' && window.eventManager.isGitHubPages());
        } catch (e) {
            return true;
        }
    }

    _getCurrentDescriptionTarget() {
        const eventData = this.uiView?.currentEventData || this.currentEventData;
        if (!eventData) return { target: null, eventData: null, variantIndex: -1 };

        const isMultiEvent = Array.isArray(eventData.variants) && eventData.variants.length > 0;
        const variantIndex = isMultiEvent ? (this.uiView?.currentVariantIndex ?? this.currentVariantIndex ?? 0) : -1;
        const target = isMultiEvent ? (eventData.variants[variantIndex] || eventData.variants[0]) : eventData;
        return { target, eventData, variantIndex };
    }

    _ensureInlineEditControls() {
        const editBtn = document.getElementById('eventSlideEditBtn');
        const saveBtn = document.getElementById('eventSlideSaveBtn');
        const eventSlide = document.getElementById('eventSlide');
        if (!editBtn || !saveBtn || !eventSlide) return;

        const allowed = this._isInlineEditAllowed();
        editBtn.disabled = !allowed;
        saveBtn.disabled = !allowed;
        editBtn.style.opacity = allowed ? '' : '0.45';
        saveBtn.style.opacity = allowed ? '' : '0.45';
        editBtn.title = allowed ? 'Edit description' : 'Disabled on GitHub Pages';
        saveBtn.title = allowed ? 'Save description' : 'Disabled on GitHub Pages';

        if (editBtn.dataset.inlineEditSetup === 'true') return;
        editBtn.dataset.inlineEditSetup = 'true';

        const eventSlideText = document.getElementById('eventSlideText');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideScrollable = document.getElementById('eventSlideScrollable');
        if (!eventSlideText) return;
        if (!eventSlideTitle) return;
        if (!eventSlideScrollable) return;

        // Create the inline editor block once (structured inputs for non-text fields).
        let editor = document.getElementById('eventSlideInlineEditor');
        if (!editor) {
            editor = document.createElement('div');
            editor.id = 'eventSlideInlineEditor';
            editor.className = 'event-slide-inline-editor';
            editor.style.display = 'none';
            editor.innerHTML = `
                <div class="event-slide-inline-editor__row">
                    <label class="event-slide-inline-editor__label" for="eventSlideEditCityDisplayName">Location label</label>
                    <input class="event-slide-inline-editor__input" id="eventSlideEditCityDisplayName" type="text" spellcheck="true" autocomplete="on" autocorrect="on" autocapitalize="sentences" />
                </div>
                <div class="event-slide-inline-editor__row">
                    <label class="event-slide-inline-editor__label" for="eventSlideEditFilters">Heroes (comma-separated)</label>
                    <input class="event-slide-inline-editor__input" id="eventSlideEditFilters" type="text" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="none" />
                </div>
                <div class="event-slide-inline-editor__row">
                    <label class="event-slide-inline-editor__label" for="eventSlideEditFactions">Factions (comma-separated)</label>
                    <input class="event-slide-inline-editor__input" id="eventSlideEditFactions" type="text" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="none" />
                </div>
                <div class="event-slide-inline-editor__row">
                    <label class="event-slide-inline-editor__label" for="eventSlideEditHeadlines">Headlines (one per line)</label>
                    <textarea class="event-slide-inline-editor__textarea" id="eventSlideEditHeadlines" rows="4" spellcheck="true" autocomplete="on" autocorrect="on" autocapitalize="sentences"></textarea>
                </div>
                <div class="event-slide-inline-editor__row">
                    <div class="event-slide-inline-editor__label">Sources</div>
                    <div class="event-slide-inline-editor__sources" id="eventSlideEditSources"></div>
                    <div class="event-slide-inline-editor__actions">
                        <button type="button" class="event-slide-inline-editor__small-btn" id="eventSlideAddSourceBtn">+ Source</button>
                    </div>
                </div>
            `;

            // Insert near the top of the scrollable content (right above sources/filters).
            const sourcesSection = document.getElementById('eventSourcesSection');
            if (sourcesSection && sourcesSection.parentNode === eventSlideScrollable) {
                eventSlideScrollable.insertBefore(editor, sourcesSection);
            } else {
                eventSlideScrollable.appendChild(editor);
            }
        }

        const cityInput = document.getElementById('eventSlideEditCityDisplayName');
        const filtersInput = document.getElementById('eventSlideEditFilters');
        const factionsInput = document.getElementById('eventSlideEditFactions');
        const headlinesInput = document.getElementById('eventSlideEditHeadlines');
        const sourcesList = document.getElementById('eventSlideEditSources');
        const addSourceBtn = document.getElementById('eventSlideAddSourceBtn');

        const markDirty = () => {
            if (!this._inlineDescEdit.active) return;
            this._inlineDescEdit.dirty = true;
        };

        const renderSourcesEditor = (sources) => {
            if (!sourcesList) return;
            sourcesList.innerHTML = '';
            const srcs = Array.isArray(sources) ? sources : [];
            const normalized = srcs.length > 0 ? srcs : [{ text: '', url: '' }];
            normalized.forEach((s, idx) => {
                const row = document.createElement('div');
                row.className = 'event-slide-inline-editor__source-row';
                row.innerHTML = `
                    <input class="event-slide-inline-editor__input" data-role="source-text" type="text" placeholder="Source text" spellcheck="true" autocomplete="on" autocorrect="on" autocapitalize="sentences" />
                    <input class="event-slide-inline-editor__input" data-role="source-url" type="text" placeholder="URL (optional)" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="none" inputmode="url" />
                    <button type="button" class="event-slide-inline-editor__small-btn" data-role="source-remove" title="Remove">−</button>
                `;
                row.querySelector('[data-role="source-text"]').value = s?.text || '';
                row.querySelector('[data-role="source-url"]').value = s?.url || '';
                row.querySelector('[data-role="source-remove"]').addEventListener('click', () => {
                    row.remove();
                    markDirty();
                });
                row.querySelector('[data-role="source-text"]').addEventListener('input', markDirty, { passive: true });
                row.querySelector('[data-role="source-url"]').addEventListener('input', markDirty, { passive: true });
                sourcesList.appendChild(row);
            });
        };

        const readSourcesEditor = () => {
            if (!sourcesList) return [];
            const rows = [...sourcesList.querySelectorAll('.event-slide-inline-editor__source-row')];
            const out = [];
            for (const row of rows) {
                const text = row.querySelector('[data-role="source-text"]')?.value?.trim() || '';
                const url = row.querySelector('[data-role="source-url"]')?.value?.trim() || '';
                if (!text) continue;
                out.push({ text, url: url || undefined });
            }
            return out;
        };

        if (addSourceBtn) {
            addSourceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this._inlineDescEdit.active) return;
                renderSourcesEditor([...readSourcesEditor(), { text: '', url: '' }]);
                markDirty();
            });
        }

        // Dirty tracking for structured inputs
        cityInput?.addEventListener('input', markDirty, { passive: true });
        filtersInput?.addEventListener('input', markDirty, { passive: true });
        factionsInput?.addEventListener('input', markDirty, { passive: true });
        headlinesInput?.addEventListener('input', markDirty, { passive: true });

        // Make the description field behave like a plain-text editor.
        // This prevents browsers from inserting extra <div>/<br> nodes that can inflate blank lines.
        const insertPlainTextAtCursor = (text) => {
            const sel = window.getSelection?.();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        };

        if (eventSlideText.dataset.inlinePlainTextSetup !== 'true') {
            eventSlideText.dataset.inlinePlainTextSetup = 'true';

            eventSlideText.addEventListener('keydown', (e) => {
                if (!this._inlineDescEdit.active) return;
                if (!eventSlideText.isContentEditable) return;
                if (e.key !== 'Enter') return;
                e.preventDefault();
                insertPlainTextAtCursor('\n');
                markDirty();
            });

            eventSlideText.addEventListener('paste', (e) => {
                if (!this._inlineDescEdit.active) return;
                if (!eventSlideText.isContentEditable) return;
                e.preventDefault();
                const text = e.clipboardData?.getData('text/plain') ?? '';
                if (!text) return;
                insertPlainTextAtCursor(text.replace(/\r\n/g, '\n'));
                markDirty();
            });
        }

        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this._isInlineEditAllowed()) return;

            // Toggle: if already editing, cancel (discard).
            if (this._inlineDescEdit.active) {
                this._cancelInlineDescriptionEdit();
                return;
            }

            const { target, eventData, variantIndex } = this._getCurrentDescriptionTarget();
            if (!target) return;

            // Start editing
            this._inlineDescEdit.active = true;
            this._inlineDescEdit.dirty = false;
            this._inlineDescEdit.originalText = target.description || '';
            this._inlineDescEdit.originalName = target.name || '';
            this._inlineDescEdit.originalCityDisplayName = target.cityDisplayName || '';
            this._inlineDescEdit.originalFilters = Array.isArray(target.filters) ? [...target.filters] : [];
            this._inlineDescEdit.originalFactions = Array.isArray(target.factions) ? [...target.factions] : [];
            this._inlineDescEdit.originalSources = Array.isArray(target.sources) ? JSON.parse(JSON.stringify(target.sources)) : [];
            this._inlineDescEdit.originalHeadlines = Array.isArray(target.headlines) ? [...target.headlines] : [];
            this._inlineDescEdit.eventData = eventData;
            this._inlineDescEdit.variantIndex = variantIndex;

            eventSlide.classList.add('event-slide--inline-editing');
            saveBtn.style.display = 'inline-flex';
            editBtn.textContent = 'Cancel';

            // Make title editable too (raw text, not glitched)
            eventSlideTitle.textContent = this._inlineDescEdit.originalName;
            eventSlideTitle.setAttribute('contenteditable', 'true');
            eventSlideTitle.setAttribute('spellcheck', 'true');

            // Edit description "in place" (same element/layout as display).
            // Use plain textContent so whitespace is controlled by CSS, not HTML nodes.
            eventSlideText.textContent = this._inlineDescEdit.originalText;
            eventSlideText.setAttribute('contenteditable', 'true');
            eventSlideText.setAttribute('spellcheck', 'true');

            // Show the structured editor block for the other fields
            if (editor) editor.style.display = 'block';
            if (cityInput) cityInput.value = this._inlineDescEdit.originalCityDisplayName;
            if (filtersInput) filtersInput.value = this._inlineDescEdit.originalFilters.join(', ');
            if (factionsInput) {
                // Display factions without numeric prefix for readability
                factionsInput.value = this._inlineDescEdit.originalFactions.map(f => String(f).replace(/^\d+/, '').trim()).join(', ');
            }
            if (headlinesInput) headlinesInput.value = (this._inlineDescEdit.originalHeadlines || []).join('\n');
            renderSourcesEditor(this._inlineDescEdit.originalSources);

            // Enable predictive/autocomplete behavior (same service used in EventManager edit modal).
            // Reset setup flag each time we enter edit mode so options stay in sync.
            if (filtersInput) filtersInput.dataset.autocompleteSetup = 'false';
            if (factionsInput) factionsInput.dataset.autocompleteSetup = 'false';
            const auto = window.eventManager?.formService?.autocompleteService || window.EventFormService?.autocompleteService;
            if (auto && typeof auto.setupAutocomplete === 'function') {
                const heroes = window.eventManager?.heroes || window.globeController?.dataModel?.heroes || [];
                const factionDisplayNames = (window.eventManager?.factions || []).map(f => f.displayName).filter(Boolean);
                if (filtersInput) auto.setupAutocomplete(filtersInput, heroes, 'heroes');
                if (factionsInput) auto.setupAutocomplete(factionsInput, factionDisplayNames, 'factions');
            }

            // Track edits
            eventSlideTitle.addEventListener('input', markDirty, { passive: true });
            eventSlideText.addEventListener('input', markDirty, { passive: true });

            // Focus description textarea by default
            eventSlideText.focus();
        });

        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this._isInlineEditAllowed()) return;
            if (!this._inlineDescEdit.active) return;

            const { target } = this._getCurrentDescriptionTarget();
            if (!target) return;

            const newName = (eventSlideTitle.innerText ?? eventSlideTitle.textContent ?? '').trim();
            const newText = (eventSlideText.textContent ?? '').replace(/\r\n/g, '\n');
            const newCity = (cityInput?.value || '').trim();
            const newFilters = (filtersInput?.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            const factionTokens = (factionsInput?.value || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            // Map faction display names back to filenames when possible
            const availableFactions = window.eventManager?.factions || [];
            const newFactions = factionTokens.map(token => {
                const found = availableFactions.find(f => (f?.displayName || '').toLowerCase() === token.toLowerCase());
                return found?.filename || token;
            });

            const headlinesLines = (headlinesInput?.value || '')
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);

            const newSources = readSourcesEditor();

            if (newName) target.name = newName;
            target.description = newText;
            target.cityDisplayName = newCity || undefined;
            target.filters = newFilters;
            target.factions = newFactions;
            target.sources = newSources.length > 0 ? newSources : undefined;
            target.headlines = headlinesLines.length > 0 ? headlinesLines : undefined;

            // Persist the same way EventManager does: save to localStorage via EventDataService.
            if (window.eventManager?.dataService?.saveEvents) {
                window.eventManager.dataService.saveEvents();
            }

            // Exit edit mode and render display text
            this._exitInlineDescriptionEdit(true);

            // Quick feedback
            const originalLabel = saveBtn.textContent;
            saveBtn.textContent = 'Saved';
            setTimeout(() => { saveBtn.textContent = originalLabel; }, 900);
        });
    }

    _exitInlineDescriptionEdit(keepEdits) {
        const eventSlide = document.getElementById('eventSlide');
        const eventSlideText = document.getElementById('eventSlideText');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const saveBtn = document.getElementById('eventSlideSaveBtn');
        const editBtn = document.getElementById('eventSlideEditBtn');
        const editor = document.getElementById('eventSlideInlineEditor');
        if (!eventSlideText) return;
        if (!eventSlideTitle) return;

        const { target } = this._getCurrentDescriptionTarget();
        const textToShow = keepEdits ? (target?.description || '') : (this._inlineDescEdit.originalText || '');
        const nameToShow = keepEdits ? (target?.name || '') : (this._inlineDescEdit.originalName || '');
        const getDisplayText = window.GlitchTextService
            ? (t) => window.GlitchTextService.getDisplayText(t)
            : (t) => t;
        const getDisplayEventName = window.GlitchTextService
            ? (t) => window.GlitchTextService.getDisplayEventName(t)
            : (t) => t;

        const parentEvent = this.uiView?.currentEventData || this.currentEventData;
        const nameHtml = getDisplayEventName(nameToShow);
        const titleHtml = formatEventSlideTitleHtml(nameHtml, parentEvent, this.dataModel);
        this.updateContentWithFade(eventSlideTitle, titleHtml, true);
        this.updateContentWithFade(eventSlideText, getDisplayText(textToShow), true);

        // Restore rendered paragraph visibility
        eventSlideText.removeAttribute('contenteditable');
        eventSlideText.removeAttribute('spellcheck');
        eventSlideTitle.removeAttribute('contenteditable');
        eventSlideTitle.removeAttribute('spellcheck');
        if (eventSlide) eventSlide.classList.remove('event-slide--inline-editing');
        if (saveBtn) saveBtn.style.display = 'none';
        if (editBtn) editBtn.textContent = 'Edit';
        if (editor) editor.style.display = 'none';

        // After exiting edit mode (either save or cancel), ensure sources/filters reflect current target
        if (keepEdits && target) {
            this.uiView.updateEventSources(target);
            this.uiView.updateEventFilters(target);

            // Update location label based on edited cityDisplayName
            const marker = this.uiView?.currentEventMarker || this.currentEventMarker;
            const eventData = this.uiView?.currentEventData || this.currentEventData;
            const isMulti = !!(eventData?.variants && eventData.variants.length > 0);
            const eventSlideLocation = document.getElementById('eventSlideLocation');
            if (eventSlideLocation && eventData) {
                this.setupLocationDisplay(eventSlideLocation, eventData, marker, isMulti, this.uiView?.currentVariantIndex ?? this.currentVariantIndex, true);
            }
        }

        this._inlineDescEdit.active = false;
        this._inlineDescEdit.dirty = false;
        this._inlineDescEdit.originalText = '';
        this._inlineDescEdit.eventData = null;
        this._inlineDescEdit.variantIndex = -1;
        this._inlineDescEdit.originalName = '';
        this._inlineDescEdit.originalCityDisplayName = '';
        this._inlineDescEdit.originalFilters = [];
        this._inlineDescEdit.originalFactions = [];
        this._inlineDescEdit.originalSources = [];
        this._inlineDescEdit.originalHeadlines = [];
    }

    _cancelInlineDescriptionEdit() {
        if (!this._inlineDescEdit.active) return;
        this._exitInlineDescriptionEdit(false);
    }

    // Process image path using helper
    processImagePath(imagePath) {
        const processImagePathHelper = window.EventSlideUtilityHelpers?.processImagePath;
        if (processImagePathHelper) {
            return processImagePathHelper(imagePath);
        }
        // Minimal fallback
        if (!imagePath?.trim()) return null;
        imagePath = imagePath.trim();
        if (imagePath.includes('Event Images/') && !imagePath.includes('Event%20Images/')) {
            const parts = imagePath.split(/Event Images\//);
            if (parts.length === 2) {
                let filename = parts[1];
                let previousFilename = '';
                while (filename !== previousFilename) {
                    previousFilename = filename;
                    try {
                        const decoded = decodeURIComponent(filename);
                        if (decoded !== filename) filename = decoded;
                        else break;
                    } catch (e) { break; }
                }
                imagePath = `assets/images/events/${encodeURIComponent(filename)}`;
            }
        }
        return imagePath;
    }

    // Update content with fade using helper
    updateContentWithFade(element, newContent, isAlreadyOpen) {
        const updateContentWithFadeHelper = window.EventSlideUtilityHelpers?.updateContentWithFade;
        if (updateContentWithFadeHelper) {
            updateContentWithFadeHelper(element, newContent, isAlreadyOpen);
        } else {
            // Minimal fallback
            if (!element) return;
            if (isAlreadyOpen) {
                element.style.transition = 'opacity 0.2s ease';
                element.style.opacity = '0';
                setTimeout(() => {
                    element.innerHTML = newContent;
                    setTimeout(() => { element.style.opacity = '1'; }, 10);
                }, 200);
            } else {
                element.innerHTML = newContent;
                element.style.opacity = '1';
            }
        }
    }

    /**
     * Setup location display in event slide
     * @param {HTMLElement} eventSlideLocation - Location element
     * @param {Object} eventData - Event data
     * @param {Object} marker - Event marker
     * @param {boolean} isMultiEvent - Whether this is a multi-event
     * @param {number} variantIndex - Current variant index
     * @param {boolean} isAlreadyOpen - Whether slide is already open
     */
    setupLocationDisplay(eventSlideLocation, eventData, marker, isMultiEvent, variantIndex, isAlreadyOpen) {
        if (!eventSlideLocation || !eventData) return;

        let lat, lon, x, y, locationName, locationType;

        if (isMultiEvent) {
            // Use the variant index from marker if available, otherwise default to 0
            const currentVariantIndex = (marker && marker.userData && marker.userData.variantIndex !== undefined)
                ? marker.userData.variantIndex
                : variantIndex || 0;
            const currentVariant = eventData.variants[currentVariantIndex] || eventData.variants[0];
            lat = currentVariant.lat !== undefined ? currentVariant.lat : eventData.lat;
            lon = currentVariant.lon !== undefined ? currentVariant.lon : eventData.lon;
            x = currentVariant.x !== undefined ? currentVariant.x : eventData.x;
            y = currentVariant.y !== undefined ? currentVariant.y : eventData.y;
            locationName = currentVariant.cityDisplayName || eventData.cityDisplayName || null;
            locationType = currentVariant.locationType || eventData.locationType || 'earth';
        } else {
            lat = eventData.lat;
            lon = eventData.lon;
            x = eventData.x;
            y = eventData.y;
            locationName = eventData.cityDisplayName || null;
            locationType = eventData.locationType || 'earth';
        }

        // Handle different location types using helpers
        if (locationType === 'earth' && lat !== undefined && lon !== undefined && window.eventManager) {
            setupEarthLocation(eventSlideLocation, lat, lon, marker, isAlreadyOpen, locationName, true);
        } else if (locationType === 'moon' || locationType === 'mars') {
            setupMoonMarsLocation(eventSlideLocation, locationType, x, y, locationName, marker, isAlreadyOpen);
        } else if (locationType === 'station') {
            setupStationLocation(eventSlideLocation, locationName, marker, isAlreadyOpen);
        } else if (locationType === 'marsShip') {
            setupMarsShipLocation(eventSlideLocation, locationName, marker, isAlreadyOpen);
        } else {
            // No location data for other types
            hideLocationWithFade(eventSlideLocation, isAlreadyOpen);
        }
    }

    /**
     * Show event slide panel
     * @param {string} eventName - Event name
     * @param {string} imagePath - Optional image path
     * @param {string} description - Event description
     * @param {THREE.Object3D} marker - Event marker object
     * @param {Object} eventData - Event data object
     */
    showEventSlide(eventName, imagePath = null, description = null, marker = null, eventData = null) {
        // If user was inline-editing and didn't save, discard edits when switching/opening.
        this._cancelInlineDescriptionEdit();

        // Play event click sound when opening event
        if (window.SoundEffectsManager) {
            window.SoundEffectsManager.play('eventClick');
        }

        // Process image path using helper
        const processImagePathHelper = window.EventSlideUtilityHelpers?.processImagePath;
        imagePath = processImagePathHelper ? processImagePathHelper(imagePath) : this.processImagePath(imagePath);

        const eventSlide = document.getElementById('eventSlide');
        const eventSlideTitle = document.getElementById('eventSlideTitle');
        const eventSlideText = document.getElementById('eventSlideText');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');
        const imageToggleBtn = document.getElementById('eventImageToggle');
        const variantToggles = document.getElementById('eventVariantToggles');

        // Initialize event slide state using helper
        const initializeEventSlideState = window.EventSlideShowHelpers?.initializeEventSlideState;
        if (initializeEventSlideState) {
            initializeEventSlideState(this, marker, eventData, 0, this.uiView);
        } else {
            // Minimal fallback
            this.currentEventMarker = marker;
            this.currentEventData = eventData;
            this.currentVariantIndex = 0;
            this.uiView.currentEventMarker = marker;
            this.uiView.currentEventData = eventData;
            this.uiView.currentVariantIndex = 0;
            this.previousAutoRotateState = this.sceneModel.getAutoRotateEnabled();
            this.sceneModel.setAutoRotateEnabled(true);
            this.sceneModel.setAutoRotate(false);
            this.sceneModel.eventMarker = marker;
        }

        if (eventSlide) {
            // Check if this is a multi-event
            const isMultiEvent = eventData && eventData.variants && eventData.variants.length > 0;

            // Get the variant index from the marker if available (for multi-events)
            let initialVariantIndex = 0;
            if (isMultiEvent && marker && marker.userData && marker.userData.variantIndex !== undefined) {
                initialVariantIndex = marker.userData.variantIndex;
            }

            // Store the current variant index
            this.currentVariantIndex = initialVariantIndex;
            const syncState = window.EventSlideStateHelpers?.syncStateWithUIView;
            if (syncState) {
                syncState(this.uiView, { currentVariantIndex: initialVariantIndex });
            } else {
                this.uiView.currentVariantIndex = initialVariantIndex;
            }

            // Setup variant toggle buttons using helper
            const setupVariantToggles = window.EventSlideContentHelpers?.setupVariantToggles;
            if (setupVariantToggles) {
                setupVariantToggles(variantToggles, isMultiEvent ? eventData.variants : null, initialVariantIndex, (index) => {
                    this.switchEventVariant(index, eventData);
                });
            } else if (variantToggles) {
                // Minimal fallback
                variantToggles.style.display = isMultiEvent ? 'flex' : 'none';
                variantToggles.innerHTML = '';
                if (isMultiEvent) {
                    eventData.variants.forEach((variant, index) => {
                        const btn = document.createElement('button');
                        btn.className = 'variant-toggle-btn';
                        btn.innerHTML = (window.GlitchTextService?.getDisplayEventName(variant.name) || variant.name) || `Variant ${index + 1}`;
                        btn.dataset.variantIndex = index;
                        if (index === initialVariantIndex) btn.classList.add('active');
                        btn.addEventListener('click', () => this.switchEventVariant(index, eventData));
                        variantToggles.appendChild(btn);
                    });
                }
            }

            // Check if event slide is already open (for fade transition)
            const isAlreadyOpen = eventSlide.classList.contains('open');

            // Update event slide content using helper
            const updateEventSlideContent = window.EventSlideShowHelpers?.updateEventSlideContent;
            if (updateEventSlideContent) {
                updateEventSlideContent(this, eventName, description, eventData, marker, isMultiEvent, initialVariantIndex, isAlreadyOpen);
            } else {
                // Minimal fallback (wrap so GlitchTextService methods are called with correct this)
                const getDisplayEventName = window.GlitchTextService
                    ? (name) => window.GlitchTextService.getDisplayEventName(name)
                    : (name) => name;
                const getDisplayText = window.GlitchTextService
                    ? (text) => window.GlitchTextService.getDisplayText(text)
                    : (text) => text;
                const nameHtmlFb = getDisplayEventName(eventName);
                const titleHtmlFb = formatEventSlideTitleHtml(nameHtmlFb, eventData, this.dataModel);
                this.updateContentWithFade(eventSlideTitle, titleHtmlFb, isAlreadyOpen);
                const eventSlideLocation = document.getElementById('eventSlideLocation');
                if (eventSlideLocation && eventData) {
                    this.setupLocationDisplay(eventSlideLocation, eventData, marker, isMultiEvent, initialVariantIndex, isAlreadyOpen);
                }
                this.updateContentWithFade(eventSlideText, getDisplayText(description || 'Placeholder text for event information. This will be replaced with actual event details.'), isAlreadyOpen);
            }

            // Manage glitch animation using helper
            const manageGlitchAnimation = window.EventSlideGlitchHelpers?.manageGlitchAnimation;
            if (manageGlitchAnimation) {
                manageGlitchAnimation(window.GlitchTextService?.isEnabled() || false, this.uiView);
            } else {
                // Fallback
                if (window.GlitchTextService?.isEnabled()) {
                    window.GlitchTextService.startAnimation();
                    setTimeout(() => this.uiView.showHackedOverlay(), 400);
                } else {
                    window.GlitchTextService?.stopAnimation();
                }
            }

            // Get current variant or main event
            const currentEvent = isMultiEvent ? eventData.variants[this.currentVariantIndex] : eventData;

            // Handle variant markers using helper
            const handleVariantMarkers = window.EventSlideShowHelpers?.handleVariantMarkers;
            if (handleVariantMarkers) {
                handleVariantMarkers(this.uiView, this.currentEventData, eventData);
            } else {
                // Minimal fallback
                if (this.currentEventData && this.currentEventData !== eventData && this.currentEventData.variants?.length > 0) {
                    this.uiView.hideVariantMarkers(this.currentEventData);
                }
                if (eventData?.variants?.length > 0) {
                    this.uiView.showVariantMarkers(eventData);
                }
            }

            // Store event data for variant switching
            if (isMultiEvent) {
                this.currentEventData = eventData;
            }

            eventSlide.classList.add('open');
            if (eventImageOverlay) eventImageOverlay.classList.add('slide-open');
            MobileHelpers.setupMobileEventSlide();
            MobileHelpers.setupMobileFullTextToggleButton();

            // Update sources and filters using helper
            const updateEventSourcesAndFilters = window.EventSlideShowHelpers?.updateEventSourcesAndFilters;
            if (updateEventSourcesAndFilters) {
                updateEventSourcesAndFilters(this.uiView, currentEvent);
            } else {
                this.uiView.updateEventSources(currentEvent);
                this.uiView.updateEventFilters(currentEvent);
                setTimeout(() => {
                    this.uiView.updateEventSources(currentEvent);
                    this.uiView.updateEventFilters(currentEvent);
                }, 100);
            }
        }

        // Initialize image overlay using helper
        const initializeImageOverlay = window.EventSlideImageHelpers?.initializeImageOverlay;
        if (initializeImageOverlay) {
            initializeImageOverlay(eventImageOverlay, eventImage, imagePath, this.uiView);
        } else if (eventImageOverlay && eventImage) {
            // Minimal fallback
            loadEventImage(eventImage, eventImageOverlay, imagePath);
            if (this.uiView?.imageOverlayManager) {
                this.uiView.imageOverlayManager.imageOverlayVisible = true;
                this.uiView.imageOverlayManager.imageToggleState = true;
            }
            eventImageOverlay.classList.add('open');
            setupImageFadeIn(eventImage, eventImageOverlay, imagePath, () => {
                this.uiView.disablePageNavigationButtons(true);
            }, 600);
            if (this.uiView) {
                this.uiView.pendingImagePath = imagePath || null;
                this.uiView.setupImageOverlayHandlers(eventImageOverlay);
            }
        } else if (this.uiView?.imageOverlayManager) {
            this.uiView.imageOverlayManager.imageOverlayVisible = false;
            this.uiView.imageOverlayManager.imageToggleState = false;
        }

        // Setup image toggle button
        if (imageToggleBtn && this.uiView) {
            imageToggleBtn.textContent = 'Hide Image';
            imageToggleBtn.onclick = () => this.uiView.toggleEventImage();
        }

        // Setup glitch toggle button using helper
        const glitchToggleBtn = document.getElementById('eventGlitchToggle');
        const hasOliviaColomar = window.EventSlideGlitchHelpers?.hasOliviaColomar || 
            ((eventName, description, eventData) => {
                if (eventName && /Olivia Colomar/gi.test(eventName)) return true;
                if (description && /Olivia Colomar/gi.test(description)) return true;
                return eventData?.variants?.some(v =>
                    (v.name && /Olivia Colomar/gi.test(v.name)) ||
                    (v.description && /Olivia Colomar/gi.test(v.description))
                ) || false;
            });
        const setupGlitchToggleButton = window.EventSlideGlitchHelpers?.setupGlitchToggleButton;
        if (setupGlitchToggleButton) {
            setupGlitchToggleButton(glitchToggleBtn, hasOliviaColomar(eventName, description, eventData), this.uiView);
        } else if (glitchToggleBtn) {
            // Minimal fallback
            const hasOlivia = hasOliviaColomar(eventName, description, eventData);
            if (hasOlivia) {
                glitchToggleBtn.style.display = 'block';
                glitchToggleBtn.style.visibility = 'visible';
                window.GlitchTextService?.setEnabled(true);
                glitchToggleBtn.textContent = 'Disable Glitch';
                glitchToggleBtn.onclick = () => this.uiView.toggleGlitchEffect();
                setTimeout(() => {
                    if (window.GlitchTextService?.isEnabled() && window.SoundEffectsManager?.play) {
                        try {
                            window.SoundEffectsManager.play('hackOn', { playbackRate: 1.2, fadeOut: true, fadeOutDuration: 500 });
                        } catch (e) { console.error('Error playing hackOn sound:', e); }
                    }
                }, 50);
            } else {
                glitchToggleBtn.style.display = 'none';
            }
        }

        // Setup close button using helper
        const closeBtn = document.getElementById('eventSlideClose');
        const setupCloseButton = window.EventSlideContentHelpers?.setupCloseButton;
        if (setupCloseButton) {
            setupCloseButton(closeBtn, () => this.hideEventSlide());
        } else if (closeBtn) {
            // Minimal fallback
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideEventSlide();
            });
        }

        // Setup inline edit controls (Edit + Save next to X)
        this._ensureInlineEditControls();

        // Setup navigation buttons and reset stillness tracking
        this.uiView.setupEventNavigation();
        const resetStillnessTracking = window.EventSlideStateHelpers?.resetStillnessTracking;
        if (resetStillnessTracking) {
            resetStillnessTracking(this.uiView);
        } else {
            // Minimal fallback
            this.uiView.lastCameraPosition = null;
            this.uiView.lastGlobeRotation = null;
            this.uiView.stillnessStartTime = null;
            this.uiView.wasDragging = false;
        }
    }

    /**
     * Hide event slide panel
     */
    hideEventSlide() {
        // Discard unsaved inline edits on close
        this._cancelInlineDescriptionEdit();

        // Stop glitch animation when hiding slide
        if (window.GlitchTextService) {
            window.GlitchTextService.stopAnimation();
        }
        // Only play event click sound if an event was actually open
        if (this.currentEventMarker && window.SoundEffectsManager) {
            window.SoundEffectsManager.play('eventClick');
        }

        // Restore plane visibility when closing event slide
        if (window.globeController && window.globeController.interactionController) {
            window.globeController.interactionController.restorePlanesVisibility();
        }

        const eventSlide = document.getElementById('eventSlide');
        const eventImageOverlay = document.getElementById('eventImageOverlay');
        const eventImage = document.getElementById('eventImage');

        // Close instantly - no fade delays
        if (eventSlide) {
            eventSlide.classList.remove('open');
        }

        // On mobile: move bottom section content back and reset title position when closing
        MobileHelpers.cleanupMobileEventSlide();

        // Hide image overlay immediately
        if (eventImageOverlay) {
            eventImageOverlay.classList.remove('slide-open', 'open', 'fade-in', 'fade-out');
        }

        if (eventImage) {
            eventImage.classList.remove('fade-in', 'fade-out');
            eventImage.style.display = 'none';
        }

        // Re-enable page navigation buttons when event slide is closed
        this.uiView.disablePageNavigationButtons(false);

        // Hide variant markers for the current event (if it was a multi-event)
        if (this.currentEventData && this.currentEventData.variants && this.currentEventData.variants.length > 0) {
            this.uiView.hideVariantMarkers(this.currentEventData);
        }

        // Clear current event data (sync with UIView using helper)
        const hadEventMarker = this.currentEventMarker !== null;
        this.currentEventData = null;
        this.currentEventMarker = null;
        const syncState = window.EventSlideStateHelpers?.syncStateWithUIView;
        if (syncState) {
            syncState(this.uiView, { currentEventData: null, currentEventMarker: null });
        } else {
            // Fallback
            this.uiView.currentEventData = null;
            this.uiView.currentEventMarker = null;
        }

        // Only zoom out and restore camera position if we actually zoomed to an event
        // (i.e., if originalCameraPosition was set from zoomToMarker)
        // Read from uiView since zoomToMarker sets it there
        if (hadEventMarker && this.uiView.originalCameraPosition) {
            this.uiView.zoomOutFromEvent();
        } else {
            // Clear any stored original position if no event was open
            this.originalCameraPosition = null;
            this.originalGlobeRotation = null;
            this.uiView.originalCameraPosition = null;
            this.uiView.originalGlobeRotation = null;
        }

        // Restore auto-rotate state using helper
        const restoreAutoRotateState = window.EventSlideStateHelpers?.restoreAutoRotateState;
        if (restoreAutoRotateState) {
            restoreAutoRotateState(this.sceneModel, this.previousAutoRotateState);
            this.previousAutoRotateState = null;
        } else {
            // Fallback
            this.sceneModel.eventMarker = null;
            if (this.previousAutoRotateState !== null) {
                this.sceneModel.setAutoRotateEnabled(this.previousAutoRotateState);
                if (this.previousAutoRotateState) {
                    this.sceneModel.setAutoRotate(true);
                }
                this.previousAutoRotateState = null;
            }
        }

        // Update ImageOverlayManager state (not UIView directly)
        this.uiView.imageOverlayManager.imageOverlayVisible = false;
        this.uiView.imageOverlayManager.imageToggleState = false;

        // Clear any pending timeouts
        if (this.uiView.imageOverlayManager.imageAutoHideTimeout) {
            clearTimeout(this.uiView.imageOverlayManager.imageAutoHideTimeout);
            this.uiView.imageOverlayManager.imageAutoHideTimeout = null;
        }

        // Reset stillness tracking using helper
        const resetStillnessTracking = window.EventSlideStateHelpers?.resetStillnessTracking;
        if (resetStillnessTracking) {
            resetStillnessTracking(this.uiView);
        } else {
            // Fallback
            this.uiView.lastCameraPosition = null;
            this.uiView.lastGlobeRotation = null;
            this.uiView.stillnessStartTime = null;
            this.uiView.wasDragging = false;
        }
    }

    /**
     * Switch to a different variant of a multi-event
     * @param {number} variantIndex - Index of variant to switch to
     * @param {Object} eventData - Event data object
     */
    switchEventVariant(variantIndex, eventData) {
        // Discard unsaved inline edits when switching variants
        this._cancelInlineDescriptionEdit();

        if (!eventData || !eventData.variants || variantIndex >= eventData.variants.length) {
            return;
        }

        const variant = eventData.variants[variantIndex];
        this.currentVariantIndex = variantIndex;
        const syncVariantIndex = window.EventSlideStateHelpers?.syncStateWithUIView;
        if (syncVariantIndex) {
            syncVariantIndex(this.uiView, { currentVariantIndex: variantIndex });
        } else {
            this.uiView.currentVariantIndex = variantIndex;
        }

        // Setup variant location using helper
        const eventSlideLocation = document.getElementById('eventSlideLocation');
        const setupVariantLocation = window.EventSlideVariantHelpers?.setupVariantLocation;
        if (setupVariantLocation) {
            setupVariantLocation(eventSlideLocation, variant, eventData, this.sceneModel, this.currentEventMarker);
        } else {
            // Minimal fallback
            const variantLat = variant.lat ?? eventData.lat;
            const variantLon = variant.lon ?? eventData.lon;
            const variantX = variant.x ?? eventData.x;
            const variantY = variant.y ?? eventData.y;
            const variantLocationType = variant.locationType || eventData.locationType || 'earth';
            const locationName = variant.cityDisplayName || eventData.cityDisplayName || null;
            const variantMarker = findVariantMarker(this.sceneModel, eventData, variantIndex);
            
            if (eventSlideLocation) {
                if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined && window.eventManager) {
                    setupEarthLocation(eventSlideLocation, variantLat, variantLon, variantMarker || this.currentEventMarker, false, locationName, false);
                } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                    setupMoonMarsLocation(eventSlideLocation, variantLocationType, variantX, variantY, locationName, variantMarker || this.currentEventMarker, false);
                } else if (variantLocationType === 'station') {
                    setupStationLocation(eventSlideLocation, locationName, variantMarker || this.currentEventMarker, false);
                } else if (variantLocationType === 'marsShip') {
                    setupMarsShipLocation(eventSlideLocation, locationName, variantMarker || this.currentEventMarker, false);
                } else {
                    hideLocationWithFade(eventSlideLocation, false);
                }
                
                if (variantMarker) {
                    setupLocationClickHandler(eventSlideLocation, variantMarker, variantLocationType);
                } else if (variantLocationType === 'earth' && variantLat !== undefined && variantLon !== undefined) {
                    const tempMarker = createTempMarkerForCoords(variantLat, variantLon);
                    if (tempMarker) setupLocationClickHandler(eventSlideLocation, tempMarker, variantLocationType);
                } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                    setupLocationClickHandler(eventSlideLocation, { userData: { locationType: variantLocationType } }, variantLocationType);
                }
            }
            zoomToVariantLocation(variantMarker, variantLocationType, variantLat, variantLon);
        }

        // Update variant content using helper
        const updateVariantContent = window.EventSlideVariantHelpers?.updateVariantContent;
        if (updateVariantContent) {
            updateVariantContent(variant, variantIndex, this);
        } else {
            // Minimal fallback (wrap so GlitchTextService methods are called with correct this)
            const eventSlideTitle = document.getElementById('eventSlideTitle');
            const eventSlideText = document.getElementById('eventSlideText');
            const getDisplayEventName = window.GlitchTextService
                ? (name) => window.GlitchTextService.getDisplayEventName(name)
                : (name) => name;
            const getDisplayText = window.GlitchTextService
                ? (text) => window.GlitchTextService.getDisplayText(text)
                : (text) => text;
            if (eventSlideTitle) {
                const variantHtml = getDisplayEventName(variant.name) || `Variant ${variantIndex + 1}`;
                const parentEvent = this.currentEventData;
                eventSlideTitle.innerHTML = formatEventSlideTitleHtml(variantHtml, parentEvent, this.dataModel);
            }
            if (eventSlideText) eventSlideText.innerHTML = getDisplayText(variant.description || 'No description');
            
            const eventImage = document.getElementById('eventImage');
            const eventImageOverlay = document.getElementById('eventImageOverlay');
            if (eventImage && eventImageOverlay) {
                let imagePath = window.eventManager?.getEventImagePath(variant.name, variant.image) || variant.image;
                if (!imagePath?.trim()) {
                    imagePath = `assets/images/events/${encodeURIComponent(variant.name.replace(/\s+/g, ' ').trim())}.png`;
                }
                const processed = this.processImagePath(imagePath);
                // Keep slide + overlay in sync: switching variants must update the pending path
                // so "Show Image" and auto-show use the correct image.
                if (this.uiView) {
                    this.uiView.pendingImagePath = processed || null;
                }
                loadEventImage(eventImage, eventImageOverlay, processed);
                // The overlay CSS keeps images at opacity:0 unless `.fade-in` is applied.
                // When switching variants we must re-trigger the fade-in so the newly loaded image becomes visible.
                setupImageFadeIn(eventImage, eventImageOverlay, processed, null, 0);

                // If the overlay is currently open, ensure we keep showing the new image.
                const mgr = this.uiView?.imageOverlayManager;
                if (mgr && mgr.imageToggleState && mgr.imageOverlayVisible) {
                    // No need to re-run full fade sequence; just keep it open.
                    eventImageOverlay.classList.add('open');
                }
            }
        }

        // Play switch event sound
        window.SoundEffectsManager?.play('switchEvent');

        // Manage glitch animation
        const manageGlitchAnimation = window.EventSlideGlitchHelpers?.manageGlitchAnimation;
        if (manageGlitchAnimation) {
            manageGlitchAnimation(window.GlitchTextService?.isEnabled() || false, this.uiView);
        } else {
            if (window.GlitchTextService?.isEnabled()) {
                window.GlitchTextService.startAnimation();
            } else {
                window.GlitchTextService?.stopAnimation();
            }
        }

        // Update sources and filters
        this.uiView.updateEventSources(variant);
        this.uiView.updateEventFilters(variant);

        // Update variant toggle buttons using helper
        const variantToggles = document.getElementById('eventVariantToggles');
        const updateVariantToggleButtons = window.EventSlideContentHelpers?.updateVariantToggleButtons;
        if (updateVariantToggleButtons) {
            updateVariantToggleButtons(variantToggles, variantIndex);
        } else if (variantToggles) {
            // Fallback
            const buttons = variantToggles.querySelectorAll('.variant-toggle-btn');
            buttons.forEach((btn, index) => {
                if (index === variantIndex) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    // Simple getters
    getCurrentEventMarker() { return this.currentEventMarker; }
    getCurrentEventData() { return this.currentEventData; }
    getCurrentVariantIndex() { return this.currentVariantIndex; }

    setOriginalCameraPosition(position, rotation) {
        this.originalCameraPosition = position;
        this.originalGlobeRotation = rotation;
        this.uiView.originalCameraPosition = position;
        this.uiView.originalGlobeRotation = rotation;
    }
    
    getOriginalCameraPosition() {
        return this.uiView.originalCameraPosition || this.originalCameraPosition;
    }
    
    getOriginalGlobeRotation() {
        return this.uiView.originalGlobeRotation || this.originalGlobeRotation;
    }
}
