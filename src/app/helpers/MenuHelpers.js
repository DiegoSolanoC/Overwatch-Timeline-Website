/**
 * MenuHelpers - Utilities for menu creation
 * Extracted from component-loader.js
 */

import { updateStatus } from '../../managers/StatusManager.js';
import { getOrCreateElement, createEventPagination, createFiltersPanel } from './ComponentDOMHelpers.js';
import { shouldEventBeLocked } from '../../managers/helpers/MarkerCreationHelpers.js';

/** WAAPI keyframes for page turn animation - matches globe implementation */
function thumbPageTurnShrinkKeyframes(isThumbsDesktop, locked) {
    if (isThumbsDesktop) {
        const from = locked
            ? { opacity: 0.5, transform: 'skewX(-11deg)' }
            : { opacity: 1, transform: 'skewX(-11deg) scale(1)' };
        const to = { opacity: 0, transform: 'skewX(-11deg) scale(0.6)' };
        return [from, to];
    }
    const from = locked ? { opacity: 0.5 } : { opacity: 1 };
    const to = { opacity: 0 };
    return [from, to];
}

function thumbPageTurnGrowKeyframes(isThumbsDesktop, locked) {
    if (isThumbsDesktop) {
        const from = {
            opacity: 0,
            transform: 'skewX(-11deg) scale(0.6)'
        };
        const to = locked
            ? { opacity: 0.5, transform: 'skewX(-11deg) scale(1)' }
            : { opacity: 1, transform: 'skewX(-11deg) scale(1)' };
        return [from, to];
    }
    const from = { opacity: 0 };
    const to = locked ? { opacity: 0.5 } : { opacity: 1 };
    return [from, to];
}

/**
 * Updates standalone pagination thumbnails based on active filters
 * Locks (disables/dims) thumbnails for events that don't match filters
 */
export function updateStandalonePaginationForFilters() {
    const activeFilters = window.standaloneActiveFilters || new Set();
    const events = window.eventManager?.events || [];
    const buttons = document.querySelectorAll('#eventNumberButtons .event-number-btn');
    
    if (!buttons.length) return;
    
    const eventsPerPage = 10; // Standard pagination
    const currentPage = window.eventManager?.getCurrentEventPage?.() || 1;
    const startIndex = (currentPage - 1) * eventsPerPage;
    
    buttons.forEach((btn, index) => {
        const eventIndex = startIndex + index;
        const event = events[eventIndex];
        
        if (!event) {
            // No event for this slot - hide button
            btn.style.display = 'none';
            return;
        }
        
        // Check if this event should be locked based on filters
        const isLocked = activeFilters.size > 0 && shouldEventBeLocked(event, activeFilters);
        
        if (isLocked) {
            btn.disabled = true;
            btn.classList.add('locked');
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.title = btn.title.replace(' — Filtered out', '') + ' — Filtered out';
        } else {
            btn.disabled = false;
            btn.classList.remove('locked');
            btn.style.opacity = '';
            btn.style.pointerEvents = 'auto';
            // Remove " — Filtered out" from title if present
            if (btn.title.includes(' — Filtered out')) {
                btn.title = btn.title.replace(' — Filtered out', '');
            }
        }
    });
    
    // Update slider ticks for filter hits
    updateStandaloneSliderTicks(activeFilters, events, eventsPerPage, currentPage);
    
    // === GLOBE INTEGRATION ===
    // Sync filters to Globe markers (if Globe is loaded)
    const gc = window.globeController;
    if (gc?.sceneModel && gc.globeView?.applyFilters) {
        // Sync filter state to sceneModel
        gc.sceneModel.activeFilters = activeFilters;
        // Apply filters to lock/unlock markers
        gc.globeView.applyFilters();
    }
}

/**
 * Same rule as dock thumbs / event list: first variant (or root) must have a non-empty description
 */
function eventRootSlotMissingDescription(rootEvent) {
    if (!rootEvent) return true;
    // Get display event (first variant if available, otherwise root)
    const displayEv = rootEvent.variants?.[0] || rootEvent;
    const d = displayEv?.description;
    return !(d && String(d).trim().length > 0);
}

/**
 * Updates slider ticks to show filter hits
 * Only sub-ticks (event-page-slider-tick--sub) get the filter-hit styling
 * Each sub-tick represents the gap between two consecutive events
 */
function updateStandaloneSliderTicks(activeFilters, events, eventsPerPage, currentPage) {
    const ticksEl = document.getElementById('eventPageSliderTicks');
    if (!ticksEl) return;
    
    // Clear existing filter-hit classes
    ticksEl.querySelectorAll('.event-page-slider-tick--filter-hit').forEach(tick => {
        tick.classList.remove('event-page-slider-tick--filter-hit');
    });
    
    if (!activeFilters || activeFilters.size === 0) return;
    
    // Get only sub-ticks (these represent event boundaries)
    const subTicks = ticksEl.querySelectorAll('.event-page-slider-tick--sub');
    if (!subTicks.length) return;
    
    const totalEvents = events.length;
    const totalPages = Math.ceil(totalEvents / eventsPerPage);
    
    // Map each sub-tick to its corresponding event index
    // Sub-ticks are created as: for each page, for k=1 to onPage-1
    let subTickIndex = 0;
    for (let p = 0; p < totalPages && subTickIndex < subTicks.length; p++) {
        const onPage = Math.min(eventsPerPage, Math.max(0, totalEvents - p * eventsPerPage));
        if (onPage <= 1) continue; // No sub-ticks for pages with 0-1 events
        
        for (let k = 1; k < onPage && subTickIndex < subTicks.length; k++) {
            // This sub-tick represents the boundary between events (p*eventsPerPage + k-1) and (p*eventsPerPage + k)
            const leftEventIndex = p * eventsPerPage + (k - 1);
            const rightEventIndex = p * eventsPerPage + k;
            
            // Check if either event matches the filters (green if match on either side)
            const leftPasses = leftEventIndex < totalEvents && !shouldEventBeLocked(events[leftEventIndex], activeFilters);
            const rightPasses = rightEventIndex < totalEvents && !shouldEventBeLocked(events[rightEventIndex], activeFilters);
            
            if (leftPasses || rightPasses) {
                subTicks[subTickIndex].classList.add('event-page-slider-tick--filter-hit');
            }
            
            subTickIndex++;
        }
    }
}

/**
 * Detects if running on GitHub Pages
 * @returns {boolean}
 */
export function isGitHubPages() {
    const hostname = window.location.hostname;
    return hostname.includes('github.io') || 
           hostname.includes('github.com') ||
           (hostname === 'localhost' && window.location.port === '');
}

/**
 * Creates a main menu button
 * @param {Object} config - Button configuration
 * @param {string} config.id - Button ID
 * @param {string} config.title - Button title
 * @param {string} config.imagePath - Path to button image
 * @param {string} config.label - Button label text
 * @param {string} config.description - Button description text
 * @returns {HTMLElement} - The created button
 */
export function createMenuButton({ id, title, imagePath, label, description }) {
    // Wrapper contains button + external label
    const wrapper = document.createElement('div');
    wrapper.className = 'main-menu-btn-wrapper';

    const button = document.createElement('button');
    button.id = id;
    button.className = 'main-menu-btn';
    button.title = title;
    button.innerHTML = `
        <div class="main-menu-image-container">
            <img src="${imagePath}" alt="${title}">
        </div>
        <div class="main-menu-label-container">
            <div class="main-menu-label">${label}</div>
        </div>
    `;

    // External dark label below button with description only
    const externalLabel = document.createElement('div');
    externalLabel.className = 'main-menu-external-label';
    externalLabel.innerHTML = `<div class="main-menu-external-label__desc">${description}</div>`;

    wrapper.appendChild(button);
    wrapper.appendChild(externalLabel);

    // Keep reference to button for event handlers
    wrapper.button = button;

    return wrapper;
}

/**
 * Creates the main menu buttons container
 * @param {Function} setupGlobeHandler - Handler for Interactive Globe button
 * @param {Function} setupGlossaryHandler - Handler for World Codex button (optional)
 * @param {Function} setupBiographyHandler - Handler for Character Bios button (optional)
 * @returns {HTMLElement} - The menu buttons container
 */
export function createMenuButtons(setupGlobeHandler, setupGlossaryHandler = null, setupBiographyHandler = null) {
    const menuButtons = document.createElement('div');
    menuButtons.className = 'main-menu-buttons';

    // Interactive Globe button
    const globeBtn = createMenuButton({
        id: 'runGlobeBtn',
        title: 'Interactive Globe',
        imagePath: 'assets/images/menu/Global%20Timeline.png',
        label: 'Interactive Globe',
        description: 'Visualize the story of Overwatch through an interactive map, or a 3D globe'
    });

    if (setupGlobeHandler) {
        globeBtn.button.addEventListener('click', setupGlobeHandler);
    }

    menuButtons.appendChild(globeBtn);

    // World Codex button (always shown now)
    const glossaryBtn = createMenuButton({
        id: 'runGlossaryBtn',
        title: 'World Codex',
        imagePath: 'assets/images/menu/Concept%20Glossary.png',
        label: 'World Codex',
        description: 'Study how characters and factions of Overwatch connect with each other across history'
    });

    if (setupGlossaryHandler) {
        glossaryBtn.button.addEventListener('click', setupGlossaryHandler);
    }

    menuButtons.appendChild(glossaryBtn);

    // Only show Character Bios if NOT on GitHub Pages (still unimplemented)
    if (!isGitHubPages()) {
        // Character Bios button
        const biographyBtn = createMenuButton({
            id: 'runBiographyBtn',
            title: 'Character Bios',
            imagePath: 'assets/images/menu/Character%20Bios.png',
            label: 'Character Bios',
            description: 'Coming Soon...'
        });

        if (setupBiographyHandler) {
            biographyBtn.button.addEventListener('click', setupBiographyHandler);
        }

        menuButtons.appendChild(biographyBtn);
    }

    // Event System Load Out button (small, below main buttons)
    const testBtn = document.createElement('button');
    testBtn.id = 'testBtn';
    testBtn.className = 'test-btn';
    testBtn.textContent = 'LOAD Event System Load Out';
    testBtn.style.cssText = `
        margin-top: 20px;
        padding: 8px 16px;
        font-size: 12px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
        align-self: center;
    `;
    testBtn.addEventListener('click', async () => {
        const isLoaded = testBtn.dataset.loaded === 'true';

        if (!isLoaded) {
            // LOAD
            updateStatus('Loading news ticker...', 'info');
            try {
                // Initialize EventManager if not already loaded
                if (!window.eventManager) {
                    const { initializeEventManager } = await import('./EventManagerHelpers.js');
                    window.eventManager = await initializeEventManager();
                }

                // Add timeline-loaded class to footer (enables background + Atlas News logo)
                const footer = document.querySelector('footer');
                if (footer) {
                    footer.classList.add('timeline-loaded');
                }

                // Initialize news ticker
                if (!window.newsTickerService) {
                    window.newsTickerService = new window.NewsTickerService();
                }
                window.newsTickerService.init();

                // Update ticker with all events
                const events = window.eventManager.events || [];
                window.newsTickerService.updateTicker(events);

                // Wire up Event Manager panel (decoupled from globe)
                if (window.eventManager && !window.eventManager.listenersSetup) {
                    window.eventManager.setupEventListeners();
                    window.eventManager.listenersSetup = true;
                    // Show the events manage panel toggle button
                    const eventsManageToggle = document.getElementById('eventsManageToggle');
                    if (eventsManageToggle) {
                        eventsManageToggle.style.setProperty('display', 'flex', 'important');
                        // Remove the old globe-bootstrap handler
                        const newBtn = eventsManageToggle.cloneNode(true);
                        eventsManageToggle.parentNode.replaceChild(newBtn, eventsManageToggle);
                        // Add new handler that just opens the panel
                        newBtn.addEventListener('click', () => {
                            const panel = document.getElementById('eventsManagePanel');
                            if (panel) {
                                panel.classList.toggle('open');
                            }
                        });
                    }
                }
                
                // Create pagination dock for standalone mode
                getOrCreateElement('eventPagination', () => {
                    updateStatus('Creating pagination dock...', 'info');
                    return createEventPagination();
                }, 'Pagination dock');

                // Create filters panel for standalone mode (decoupled from globe)
                getOrCreateElement('filtersPanel', () => {
                    updateStatus('Creating filters panel...', 'info');
                    return createFiltersPanel();
                }, 'Filters panel');

                // Initialize FilterService for standalone mode
                if (window.FilterService && typeof window.FilterService.init === 'function') {
                    window.FilterService.init();
                    updateStatus('✓ Filter panel initialized', 'success');
                }

                // Setup standalone filter state (decoupled from globe sceneModel)
                if (!window.standaloneActiveFilters) {
                    window.standaloneActiveFilters = new Set();
                }

                // Override FilterService confirm handler for standalone mode
                const confirmFiltersBtn = document.getElementById('confirmFiltersBtn');
                if (confirmFiltersBtn) {
                    // Remove old listeners by cloning
                    const newConfirmBtn = confirmFiltersBtn.cloneNode(true);
                    confirmFiltersBtn.parentNode.replaceChild(newConfirmBtn, confirmFiltersBtn);
                    // Add standalone handler
                    newConfirmBtn.addEventListener('click', () => {
                        // Apply filters to standalone state
                        if (window.FilterService?.stateManager?.selectedFilters) {
                            window.standaloneActiveFilters = new Set(window.FilterService.stateManager.selectedFilters);
                        }
                        // Play sound
                        if (window.SoundEffectsManager) {
                            window.SoundEffectsManager.play('filterConfirm');
                        }
                        // Update dock thumbnails to reflect locked state
                        updateStandalonePaginationForFilters();
                        // Close panel
                        const filtersPanel = document.getElementById('filtersPanel');
                        if (filtersPanel) filtersPanel.classList.remove('open');
                        const filtersToggle = document.getElementById('filtersToggle');
                        if (filtersToggle) filtersToggle.classList.remove('active');
                        updateStatus('✓ Filters applied', 'success');
                    });
                }

                // Override Clear button for standalone mode
                const clearFiltersBtn = document.getElementById('clearFiltersBtn');
                if (clearFiltersBtn) {
                    const newClearBtn = clearFiltersBtn.cloneNode(true);
                    clearFiltersBtn.parentNode.replaceChild(newClearBtn, clearFiltersBtn);
                    newClearBtn.addEventListener('click', () => {
                        // Clear standalone filters
                        window.standaloneActiveFilters.clear();
                        if (window.FilterService?.stateManager) {
                            window.FilterService.stateManager.clear();
                        }
                        if (window.SoundEffectsManager) {
                            window.SoundEffectsManager.play('filterClear');
                        }
                        // Update buttons and thumbnails
                        if (window.FilterService?.updateButtonStates) {
                            window.FilterService.updateButtonStates();
                        }
                        updateStandalonePaginationForFilters();
                        updateStatus('✓ Filters cleared', 'success');
                    });
                }

                // Show filters toggle button
                const filtersToggle = document.getElementById('filtersToggle');
                if (filtersToggle) {
                    filtersToggle.style.setProperty('display', 'flex', 'important');
                }

                // Initialize standalone Event Slide (decoupled from globe)
                if (!window.standaloneEventSlide) {
                    window.standaloneEventSlide = {
                        currentEventIndex: 0,
                        allEvents: [],
                        currentEventData: null,
                        currentVariantIndex: 0,
                        isEditing: false,
                        
                        // Show event at index without globe
                        showEvent(index) {
                            const events = window.eventManager?.events || [];
                            if (index < 0 || index >= events.length) return;
                            this.currentEventIndex = index;
                            
                            const eventData = events[index];
                            this.showStandaloneEventSlide(eventData, index);
                        },
                        
                        // Show event slide with event data
                        showStandaloneEventSlide(eventData, globalIndex) {
                            if (!eventData) return;
                            
                            const isMultiEvent = Array.isArray(eventData.variants) && eventData.variants.length > 0;
                            const variantIndex = eventData.variantIndex || 0;
                            const displayEvent = isMultiEvent && eventData.variants[variantIndex] 
                                ? { ...eventData, ...eventData.variants[variantIndex] }
                                : eventData;
                            
                            // Get event data for display
                            let eventName = displayEvent.name || eventData.name || 'Unnamed Event';
                            const description = displayEvent.description || '';
                            
                            // Get image path using NavigationImageHelpers
                            let imagePath = null;
                            if (window.NavigationImageHelpers?.getEventImagePath) {
                                imagePath = window.NavigationImageHelpers.getEventImagePath(displayEvent, eventName);
                            } else if (window.eventManager?.getEventImagePath) {
                                imagePath = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
                            } else {
                                imagePath = displayEvent.image || displayEvent.imagePath || null;
                            }
                            
                            // Apply glitch text if enabled
                            if (window.GlitchTextService?.isEnabled?.()) {
                                eventName = window.GlitchTextService.getDisplayEventName(eventName);
                            }
                            
                            // Call the full displaySlide method with all features
                            this.displaySlide(eventName, imagePath, description, eventData, isMultiEvent, displayEvent);
                            
                            // Update nav buttons
                            this.updateNavButtons();
                        },
                        
                        // Display the slide panel
                        displaySlide(eventName, imagePath, description, eventData, isMultiEvent, displayEvent) {
                            const eventSlide = document.getElementById('eventSlide');
                            const eventSlideTitle = document.getElementById('eventSlideTitle');
                            const eventSlideText = document.getElementById('eventSlideText');
                            const eventSlideClose = document.getElementById('eventSlideClose');
                            const eventImageToggle = document.getElementById('eventImageToggle');
                            const variantToggles = document.getElementById('eventVariantToggles');
                            const editBtn = document.getElementById('eventSlideEditBtn');
                            const saveBtn = document.getElementById('eventSlideSaveBtn');
                            
                            if (!eventSlide) return;
                            
                            // Cancel any active editing
                            this.cancelEdit();
                            
                            // Check for Olivia Colomar
                            const hasOliviaColomar = /Olivia\s+Colomar/gi.test(eventName) || 
                                                      /Olivia\s+Colomar/gi.test(description) ||
                                                      (isMultiEvent && eventData.variants?.some(v => 
                                                          /Olivia\s+Colomar/gi.test(v.name || '') || 
                                                          /Olivia\s+Colomar/gi.test(v.description || '')));
                            
                            // Apply glitch text to both title and description
                            const applyGlitch = (text) => {
                                if (!text) return text;
                                return window.GlitchTextService?.getDisplayText?.(text) || text;
                            };
                            
                            // Update content (with glitch applied)
                            if (eventSlideTitle) {
                                eventSlideTitle.innerHTML = applyGlitch(eventName);
                            }
                            if (eventSlideText) {
                                eventSlideText.innerHTML = applyGlitch(description) || 'No description available.';
                            }
                            
                            // Setup glitch toggle button
                            const glitchToggleBtn = document.getElementById('eventGlitchToggle');
                            if (glitchToggleBtn) {
                                if (hasOliviaColomar) {
                                    // Add icon if not present
                                    let iconWrap = glitchToggleBtn.querySelector('.event-glitch-toggle-btn__icon');
                                    if (!iconWrap) {
                                        iconWrap = document.createElement('span');
                                        iconWrap.className = 'event-glitch-toggle-btn__icon';
                                        glitchToggleBtn.appendChild(iconWrap);
                                    }
                                    if (!iconWrap.innerHTML.includes('Hacked.png')) {
                                        iconWrap.innerHTML = `<img class="event-glitch-toggle-img" src="assets/images/misc/Hacked.png" alt="" width="48" height="48" decoding="async" draggable="false" />`;
                                    }
                                    
                                    glitchToggleBtn.style.display = 'inline-flex';
                                    glitchToggleBtn.style.visibility = 'visible';
                                    
                                    // Set initial state
                                    const isEnabled = window.GlitchTextService?.isEnabled?.() || false;
                                    glitchToggleBtn.classList.toggle('event-glitch-toggle-btn--on', isEnabled);
                                    glitchToggleBtn.setAttribute('aria-pressed', String(isEnabled));
                                    glitchToggleBtn.title = isEnabled ? 'Glitch effect on' : 'Glitch effect off';
                                    
                                    glitchToggleBtn.onclick = () => {
                                        // Toggle glitch
                                        const newEnabled = window.GlitchTextService?.toggle?.() || false;
                                        // Update button state
                                        glitchToggleBtn.classList.toggle('event-glitch-toggle-btn--on', newEnabled);
                                        glitchToggleBtn.setAttribute('aria-pressed', String(newEnabled));
                                        glitchToggleBtn.title = newEnabled ? 'Glitch effect on' : 'Glitch effect off';
                                        // Re-apply to current view
                                        const currentEvent = isMultiEvent ? eventData.variants[this.currentVariantIndex || 0] : eventData;
                                        if (eventSlideTitle) {
                                            eventSlideTitle.innerHTML = applyGlitch(currentEvent?.name || eventName);
                                        }
                                        if (eventSlideText) {
                                            eventSlideText.innerHTML = applyGlitch(currentEvent?.description || description) || 'No description available.';
                                        }
                                        // Wire click handlers on new glitch elements
                                        setTimeout(wireGlitchClickToggle, 100);
                                        // Play sound
                                        if (window.SoundEffectsManager?.play) {
                                            window.SoundEffectsManager.play(newEnabled ? 'glitchOn' : 'glitchOff');
                                        }
                                    };
                                    // Start animation if enabled
                                    if (window.GlitchTextService?.isEnabled?.()) {
                                        window.GlitchTextService.startAnimation?.();
                                        if (window.SoundEffectsManager?.play) {
                                            setTimeout(() => window.SoundEffectsManager.play('glitchOn'), 50);
                                        }
                                    }
                                } else {
                                    glitchToggleBtn.style.display = 'none';
                                    glitchToggleBtn.classList.remove('event-glitch-toggle-btn--on');
                                }
                            }
                            
                            // Wire up click-to-toggle on glitchy text
                            const wireGlitchClickToggle = () => {
                                const containers = eventSlide.querySelectorAll('.glitchy-text-container, .glitchy-text-toggle-target');
                                containers.forEach(el => {
                                    el.style.cursor = 'pointer';
                                    el.onclick = (e) => {
                                        e.stopPropagation();
                                        if (glitchToggleBtn) glitchToggleBtn.click();
                                    };
                                });
                            };
                            // Run after glitch applied
                            setTimeout(wireGlitchClickToggle, 100);
                            
                            // Setup variant toggles
                            if (variantToggles) {
                                variantToggles.innerHTML = '';
                                if (isMultiEvent && eventData.variants) {
                                    variantToggles.style.display = 'flex';
                                    eventData.variants.forEach((variant, idx) => {
                                        const btn = document.createElement('button');
                                        btn.className = 'variant-toggle-btn' + (idx === 0 ? ' active' : '');
                                        btn.textContent = variant.name || `Variant ${idx + 1}`;
                                        btn.addEventListener('click', () => {
                                            this.currentVariantIndex = idx;
                                            variantToggles.querySelectorAll('.variant-toggle-btn').forEach(b => b.classList.remove('active'));
                                            btn.classList.add('active');
                                            const v = eventData.variants[idx];
                                            const vName = v.name || variant.name || eventName;
                                            const vDesc = v.description || description;
                                            
                                            // Update title and description
                                            if (eventSlideTitle) eventSlideTitle.innerHTML = applyGlitch(vName);
                                            if (eventSlideText) eventSlideText.innerHTML = applyGlitch(vDesc) || 'No description available.';
                                            
                                            // Update image for variant
                                            const vImagePath = window.eventManager?.getEventImagePath 
                                                ? window.eventManager.getEventImagePath(v.name, v.image)
                                                : v.image;
                                            if (vImagePath) {
                                                this.showImageOverlay(vImagePath);
                                            } else {
                                                this.hideImageOverlay();
                                            }
                                            
                                            this.updateSourcesAndFilters(v);
                                            // Re-wire glitch clicks after variant switch
                                            setTimeout(wireGlitchClickToggle, 100);
                                        });
                                        variantToggles.appendChild(btn);
                                    });
                                } else {
                                    variantToggles.style.display = 'none';
                                }
                            }
                            
                            // Update sources and filters
                            this.updateSourcesAndFilters(displayEvent);
                            
                            // Wire up prev/next buttons
                            this.wireNavButtons(eventData);
                            
                            // Wire edit/save buttons
                            this.wireEditButtons(eventData, displayEvent, editBtn, saveBtn, eventSlideTitle, eventSlideText);
                            
                            // Show the panel
                            eventSlide.classList.add('open');
                            
                            // Wire close button
                            if (eventSlideClose) {
                                eventSlideClose.onclick = () => {
                                    this.cancelEdit();
                                    eventSlide.classList.remove('open');
                                    this.hideImageOverlay();
                                };
                            }
                            
                            // Wire image toggle
                            if (eventImageToggle) {
                                eventImageToggle.onclick = () => this.toggleImageOverlay(imagePath);
                            }
                            
                            // Show image by default if available
                            setTimeout(() => {
                                if (imagePath) {
                                    this.showImageOverlay(imagePath);
                                } else {
                                    this.hideImageOverlay();
                                }
                            }, 100);
                        },
                        
                        updateSourcesAndFilters(event) {
                            // Update sources section
                            const sourcesSection = document.getElementById('eventSourcesSection');
                            const sourcesList = document.getElementById('eventSourcesList');
                            if (sourcesSection && sourcesList && event) {
                                if (event.sources && event.sources.length > 0) {
                                    sourcesList.innerHTML = '';
                                    event.sources.forEach(source => {
                                        const item = document.createElement('div');
                                        item.className = 'event-source-display-item';
                                        if (source.url) {
                                            const link = document.createElement('a');
                                            link.href = source.url;
                                            link.target = '_blank';
                                            link.rel = 'noopener noreferrer';
                                            link.className = 'event-source-link';
                                            link.textContent = source.text || source.url;
                                            link.addEventListener('click', () => {
                                                if (window.SoundEffectsManager?.play) {
                                                    window.SoundEffectsManager.play('filterConfirm');
                                                }
                                            });
                                            item.appendChild(link);
                                        } else {
                                            item.textContent = source.text;
                                            item.className = 'event-source-text';
                                        }
                                        sourcesList.appendChild(item);
                                    });
                                    sourcesSection.style.display = 'block';
                                } else {
                                    sourcesSection.style.display = 'none';
                                }
                            }
                            
                            // Update filters section with icon chips (matching globe mode)
                            this.renderEventFilters(event);
                        },
                        
                        renderEventFilters(event) {
                            const filtersSection = document.getElementById('eventFiltersSection');
                            const filtersList = document.getElementById('eventFiltersList');
                            if (!filtersSection || !filtersList) return;
                            
                            filtersList.innerHTML = '';
                            
                            const CATEGORY_ICON_HEROES = 'assets/images/icons/Heroes Icon.png';
                            const CATEGORY_ICON_FACTIONS = 'assets/images/icons/Factions Icon.png';
                            const CATEGORY_ICON_NPCS = 'assets/images/icons/NPC Icon.png';
                            const CATEGORY_ICON_COUNTRIES = 'assets/images/icons/Location Icon.png';
                            
                            const heroFilters = event?.filters || [];
                            const npcFilters = event?.npcs || [];
                            const factionFilters = event?.factions || [];
                            
                            // Collect country flags
                            const countryFlags = [];
                            if (event?.cityDisplayName) {
                                const lh = window.LocationFlagHelpers;
                                const flagFile = lh?.getResolvedFlagFilename?.(event.cityDisplayName, event.locationType || 'earth');
                                if (flagFile) countryFlags.push(flagFile);
                            }
                            if (event?.secondaryCountryFlags?.length) {
                                countryFlags.push(...event.secondaryCountryFlags);
                            }
                            
                            // Category header helper
                            const createHeader = (label, iconSrc) => {
                                const h = document.createElement('h4');
                                h.className = 'event-filter-header event-filter-header--category';
                                h.innerHTML = `<img class="event-filter-header-icon" src="${iconSrc}" alt="" width="20" height="20" decoding="async"><span class="event-filter-header-label">${label}</span>`;
                                return h;
                            };
                            
                            // Icon tag helper
                            const createIconTag = (key, displayName, type) => {
                                const tag = document.createElement('span');
                                tag.className = 'event-filter-tag event-filter-tag--icon event-filter-tag--clickable';
                                tag.title = displayName;
                                tag.setAttribute('role', 'button');
                                tag.tabIndex = 0;
                                
                                const box = document.createElement('span');
                                box.className = 'event-filter-image-container';
                                
                                const img = document.createElement('img');
                                img.className = 'event-filter-icon';
                                img.alt = displayName;
                                img.loading = 'lazy';
                                
                                if (type === 'factions') {
                                    img.src = `assets/images/factions/${encodeURIComponent(key)}.png`;
                                } else if (type === 'npcs') {
                                    img.src = `assets/images/npcs/${encodeURIComponent(key)}.png`;
                                } else if (type === 'countries') {
                                    img.classList.add('event-filter-icon--country');
                                    const lh = window.LocationFlagHelpers;
                                    img.src = lh?.flagSrc?.(key) || `assets/images/flags/${encodeURIComponent(key)}`;
                                } else {
                                    img.src = `assets/images/heroes/${encodeURIComponent(key)}.png`;
                                }
                                
                                box.appendChild(img);
                                tag.appendChild(box);
                                
                                // Click handler to open Event Manager with search
                                tag.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const mgr = window.eventManager;
                                    if (!mgr?.prependEventManagerSearchTokens || !mgr.openEventsManagePanel) return;
                                    
                                    if (type === 'heroes') {
                                        mgr.prependEventManagerSearchTokens({ heroName: key });
                                    } else if (type === 'factions') {
                                        mgr.prependEventManagerSearchTokens({ factionFilename: key });
                                    } else if (type === 'npcs') {
                                        mgr.prependEventManagerSearchTokens({ npcName: key });
                                    } else if (type === 'countries') {
                                        mgr.prependEventManagerSearchTokens({ countryFlagFilename: key });
                                    }
                                    mgr.openEventsManagePanel();
                                    window.SoundEffectsManager?.play?.('filterConfirm');
                                });
                                
                                tag.addEventListener('keydown', (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        tag.click();
                                    }
                                });
                                
                                return tag;
                            };
                            
                            // Render heroes
                            if (heroFilters.length > 0) {
                                filtersList.appendChild(createHeader('Relevant Heroes:', CATEGORY_ICON_HEROES));
                                heroFilters.forEach(hero => {
                                    if (hero) filtersList.appendChild(createIconTag(hero, hero, 'heroes'));
                                });
                            }
                            
                            // Render NPCs
                            if (npcFilters.length > 0) {
                                filtersList.appendChild(createHeader('Relevant NPCs:', CATEGORY_ICON_NPCS));
                                npcFilters.forEach(npc => {
                                    if (npc) filtersList.appendChild(createIconTag(npc, npc, 'npcs'));
                                });
                            }
                            
                            // Render factions (with filename resolution)
                            if (factionFilters.length > 0) {
                                filtersList.appendChild(createHeader('Relevant Factions:', CATEGORY_ICON_FACTIONS));
                                factionFilters.forEach(faction => {
                                    const resolved = this.resolveFactionFilename(faction);
                                    if (resolved) {
                                        filtersList.appendChild(createIconTag(resolved, faction, 'factions'));
                                    }
                                });
                            }
                            
                            // Render countries
                            if (countryFlags.length > 0) {
                                filtersList.appendChild(createHeader('Relevant Countries:', CATEGORY_ICON_COUNTRIES));
                                countryFlags.forEach(flagFile => {
                                    const label = this.getCountryLabel(flagFile);
                                    if (flagFile) filtersList.appendChild(createIconTag(flagFile, label, 'countries'));
                                });
                            }
                            
                            filtersSection.style.display = filtersList.children.length > 0 ? 'block' : 'none';
                        },
                        
                        resolveFactionFilename(rawFaction) {
                            if (!rawFaction) return null;
                            const raw = String(rawFaction).trim();
                            if (!raw) return null;
                            
                            // Get factions list
                            const em = window.eventManager;
                            const factions = em?.factions || [];
                            
                            // Try to find matching faction
                            const normalize = (s) => String(s || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
                            const rawNorm = normalize(raw);
                            
                            for (const f of factions) {
                                const filename = String(f.filename || '').trim();
                                const displayName = String(f.displayName || '').trim();
                                
                                // Direct match on filename
                                if (normalize(filename) === rawNorm) {
                                    return filename;
                                }
                                
                                // Match on display name
                                if (normalize(displayName) === rawNorm) {
                                    return filename;
                                }
                                
                                // Match bare filename (without leading digits) against raw
                                const bareFilename = filename.replace(/^\d+/, '').trim().toLowerCase();
                                if (normalize(bareFilename) === rawNorm) {
                                    return filename;
                                }
                                
                                // Match display name without leading digits
                                const bareDisplay = displayName.replace(/^\d+/, '').trim().toLowerCase();
                                if (normalize(bareDisplay) === rawNorm) {
                                    return filename;
                                }
                                
                                // Check if raw is contained in display name (for partial matches like "Vishkar" in "Vishkar Corporation")
                                if (normalize(displayName).includes(rawNorm)) {
                                    return filename;
                                }
                                
                                // Check if raw matches start of display name
                                const displayNorm = normalize(displayName);
                                if (displayNorm.startsWith(rawNorm)) {
                                    return filename;
                                }
                            }
                            
                            // Legacy mapping for common faction names
                            const legacyMap = {
                                'vishkar': '05Vishkar Corporation',
                                'volskaya': '11Volskaya Industries',
                                'omnica': '04Omnica Corporation',
                                'crisis': '12The Anubis Omnic Crisis',
                                'lucheng': '07Lucheng Interstellar',
                                'shimada': '21Shimada Clan',
                                'ironclad': '08Ironclad Guild',
                                'shambali': '25Shambali Order',
                                'lumerico': '13Lumérico Incorporated',
                                'deadlock': '14Deadlock Rebels',
                                'talon': '03Talon Empire',
                                'overwatch': '01Overwatch',
                                'nullsector': '26Null Sector',
                                'blackwatch': '02Blackwatch',
                                'junkers': '16Junker Monarchy',
                                'wayfinders': '19Wayfinder Society',
                                'conspiracy': '23The Chernobog Conspiracy',
                                'hashimoto': '22Hashimoto Clan',
                                'yokai': '32Yokai Gang',
                                'phreaks': '29The Phreaks',
                                'collective': '27The Martins Collective',
                                'meka': '30M.E.K.A Squad',
                                'oasis': '24Oasis Ministries',
                                'crusaders': '09Crusader Initiative'
                            };
                            
                            const bareName = raw.replace(/^\d+/, '').toLowerCase().replace(/[\s_-]+/g, '');
                            if (legacyMap[bareName]) {
                                return legacyMap[bareName];
                            }
                            
                            // If no match, try to find in factions list by partial match
                            for (const f of factions) {
                                const displayName = String(f.displayName || '').trim().toLowerCase();
                                if (displayName.includes(bareName)) {
                                    return f.filename;
                                }
                            }
                            
                            // Return raw as last resort
                            return raw;
                        },
                        
                        getCountryLabel(flagFile) {
                            const map = window.FLAG_FILE_BY_COMMON;
                            if (map) {
                                for (const common of Object.keys(map).sort()) {
                                    if (map[common] === flagFile) return common;
                                }
                            }
                            return flagFile?.replace(/\.png$/i, '') || flagFile;
                        },
                        
                        wireEditButtons(eventData, displayEvent, editBtn, saveBtn, titleEl, textEl) {
                            if (!editBtn || !saveBtn) return;
                            
                            // Reset state
                            this.isEditing = false;
                            editBtn.textContent = 'Edit';
                            editBtn.style.display = 'block';
                            saveBtn.style.display = 'none';
                            
                            // Remove old listeners by cloning
                            const newEditBtn = editBtn.cloneNode(true);
                            const newSaveBtn = saveBtn.cloneNode(true);
                            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
                            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
                            
                            newEditBtn.onclick = () => {
                                if (this.isEditing) {
                                    this.cancelEdit(newEditBtn, newSaveBtn);
                                } else {
                                    this.startFullEdit(eventData, displayEvent, newEditBtn, newSaveBtn);
                                }
                            };
                            
                            newSaveBtn.onclick = () => {
                                this.saveFullEdit(eventData, newEditBtn, newSaveBtn);
                            };
                        },
                        
                        startFullEdit(eventData, displayEvent, editBtn, saveBtn) {
                            this.isEditing = true;
                            this.editTarget = { eventData, displayEvent };
                            this.originalState = JSON.parse(JSON.stringify(eventData));
                            
                            const eventSlide = document.getElementById('eventSlide');
                            const eventSlideScrollable = document.getElementById('eventSlideScrollable');
                            const titleEl = document.getElementById('eventSlideTitle');
                            const textEl = document.getElementById('eventSlideText');
                            
                            // Add editing class
                            eventSlide?.classList.add('event-slide--inline-editing');
                            
                            // Make title and description editable
                            if (titleEl) {
                                titleEl.contentEditable = 'true';
                                titleEl.setAttribute('spellcheck', 'true');
                            }
                            if (textEl) {
                                textEl.contentEditable = 'true';
                                textEl.setAttribute('spellcheck', 'true');
                            }
                            
                            // Create or show inline editor
                            let editor = document.getElementById('eventSlideInlineEditor');
                            if (!editor) {
                                editor = this.createInlineEditor();
                                eventSlideScrollable?.insertBefore(editor, eventSlideScrollable.firstChild);
                            }
                            editor.style.display = 'block';
                            
                            // Populate editor fields
                            this.populateInlineEditor(eventData, displayEvent);
                            
                            // Update buttons
                            editBtn.textContent = 'Cancel';
                            saveBtn.style.display = 'inline-flex';
                            
                            // Play sound
                            if (window.SoundEffectsManager?.play) {
                                window.SoundEffectsManager.play('uiClick');
                            }
                        },
                        
                        createInlineEditor() {
                            const editor = document.createElement('div');
                            editor.id = 'eventSlideInlineEditor';
                            editor.className = 'event-slide-inline-editor';
                            editor.innerHTML = `
                                <div class="event-slide-inline-editor__row">
                                    <label class="event-slide-inline-editor__label" for="eventSlideEditCityDisplayName">Location label</label>
                                    <input class="event-slide-inline-editor__input" id="eventSlideEditCityDisplayName" type="text" spellcheck="true" autocomplete="on" />
                                </div>
                                <div class="event-slide-inline-editor__row event-slide-inline-editor__year-row">
                                    <div class="event-slide-inline-editor__year-cell">
                                        <label class="event-slide-inline-editor__label" for="eventSlideEditYearStart">First year</label>
                                        <input class="event-slide-inline-editor__input" id="eventSlideEditYearStart" type="number" step="1" />
                                    </div>
                                    <div class="event-slide-inline-editor__year-cell">
                                        <label class="event-slide-inline-editor__label" for="eventSlideEditYearEnd">Second year (optional)</label>
                                        <input class="event-slide-inline-editor__input" id="eventSlideEditYearEnd" type="number" step="1" />
                                    </div>
                                </div>
                                <div class="event-slide-inline-editor__row">
                                    <label class="event-slide-inline-editor__label" for="eventSlideEditEraName">Era name (optional)</label>
                                    <input class="event-slide-inline-editor__input" id="eventSlideEditEraName" type="text" spellcheck="true" autocomplete="on" />
                                </div>
                                <div class="event-slide-inline-editor__row">
                                    <label class="event-slide-inline-editor__label" for="eventSlideEditFilters">Heroes (comma-separated)</label>
                                    <input class="event-slide-inline-editor__input" id="eventSlideEditFilters" type="text" spellcheck="false" autocomplete="off" />
                                </div>
                                <div class="event-slide-inline-editor__row">
                                    <label class="event-slide-inline-editor__label" for="eventSlideEditFactions">Factions (comma-separated)</label>
                                    <input class="event-slide-inline-editor__input" id="eventSlideEditFactions" type="text" spellcheck="false" autocomplete="off" />
                                </div>
                                <div class="event-slide-inline-editor__row">
                                    <label class="event-slide-inline-editor__label" for="eventSlideEditNpcs">NPCs (comma-separated)</label>
                                    <input class="event-slide-inline-editor__input" id="eventSlideEditNpcs" type="text" spellcheck="false" autocomplete="off" />
                                </div>
                                <div class="event-slide-inline-editor__row">
                                    <label class="event-slide-inline-editor__label" for="eventSlideEditHeadlines">Headlines (one per line)</label>
                                    <textarea class="event-slide-inline-editor__textarea" id="eventSlideEditHeadlines" rows="3" spellcheck="true"></textarea>
                                </div>
                                <div class="event-slide-inline-editor__row">
                                    <div class="event-slide-inline-editor__label">Sources</div>
                                    <div class="event-slide-inline-editor__sources" id="eventSlideEditSources"></div>
                                    <div class="event-slide-inline-editor__actions">
                                        <button type="button" class="event-slide-inline-editor__small-btn" id="eventSlideAddSourceBtn">+ Source</button>
                                    </div>
                                </div>
                                <div class="event-slide-inline-editor__row event-slide-inline-editor__row--delete">
                                    <button type="button" class="event-slide-inline-editor__delete-btn" id="eventSlideInlineDeleteBtn">Delete event</button>
                                </div>
                            `;
                            
                            // Wire add source button
                            setTimeout(() => {
                                const addBtn = document.getElementById('eventSlideAddSourceBtn');
                                addBtn?.addEventListener('click', () => this.addSourceRow());
                                
                                const deleteBtn = document.getElementById('eventSlideInlineDeleteBtn');
                                deleteBtn?.addEventListener('click', () => this.deleteCurrentEvent());
                            }, 0);
                            
                            return editor;
                        },
                        
                        populateInlineEditor(eventData, displayEvent) {
                            const target = displayEvent || eventData;
                            
                            // Set field values
                            const cityInput = document.getElementById('eventSlideEditCityDisplayName');
                            const yearStartInput = document.getElementById('eventSlideEditYearStart');
                            const yearEndInput = document.getElementById('eventSlideEditYearEnd');
                            const eraInput = document.getElementById('eventSlideEditEraName');
                            const filtersInput = document.getElementById('eventSlideEditFilters');
                            const factionsInput = document.getElementById('eventSlideEditFactions');
                            const npcsInput = document.getElementById('eventSlideEditNpcs');
                            const headlinesInput = document.getElementById('eventSlideEditHeadlines');
                            
                            if (cityInput) cityInput.value = target.cityDisplayName || '';
                            if (yearStartInput) yearStartInput.value = target.yearStart || target.year || '';
                            if (yearEndInput) yearEndInput.value = target.yearEnd || '';
                            if (eraInput) eraInput.value = target.eraName || '';
                            if (filtersInput) filtersInput.value = (target.filters || []).join(', ');
                            if (factionsInput) factionsInput.value = (target.factions || []).join(', ');
                            if (npcsInput) npcsInput.value = (target.npcs || []).join(', ');
                            if (headlinesInput) headlinesInput.value = (target.headlines || []).join('\n');
                            
                            // Render sources
                            this.renderSourcesEditor(target.sources || []);
                        },
                        
                        renderSourcesEditor(sources) {
                            const container = document.getElementById('eventSlideEditSources');
                            if (!container) return;
                            
                            container.innerHTML = '';
                            const srcs = Array.isArray(sources) && sources.length > 0 ? sources : [{ text: '', url: '' }];
                            
                            srcs.forEach((s, idx) => {
                                const row = document.createElement('div');
                                row.className = 'event-slide-inline-editor__source-row';
                                row.innerHTML = `
                                    <input class="event-slide-inline-editor__input" data-role="source-text" type="text" placeholder="Source text" value="${s.text || ''}" />
                                    <input class="event-slide-inline-editor__input" data-role="source-url" type="text" placeholder="URL (optional)" value="${s.url || ''}" />
                                    <button type="button" class="event-slide-inline-editor__small-btn" data-role="source-remove">−</button>
                                `;
                                row.querySelector('[data-role="source-remove"]').addEventListener('click', () => {
                                    if (container.children.length > 1) row.remove();
                                });
                                container.appendChild(row);
                            });
                        },
                        
                        addSourceRow() {
                            const container = document.getElementById('eventSlideEditSources');
                            if (!container) return;
                            
                            const row = document.createElement('div');
                            row.className = 'event-slide-inline-editor__source-row';
                            row.innerHTML = `
                                <input class="event-slide-inline-editor__input" data-role="source-text" type="text" placeholder="Source text" />
                                <input class="event-slide-inline-editor__input" data-role="source-url" type="text" placeholder="URL (optional)" />
                                <button type="button" class="event-slide-inline-editor__small-btn" data-role="source-remove">−</button>
                            `;
                            row.querySelector('[data-role="source-remove"]').addEventListener('click', () => {
                                if (container.children.length > 1) row.remove();
                            });
                            container.appendChild(row);
                        },
                        
                        deleteCurrentEvent() {
                            if (!this.editTarget) return;
                            const { eventData } = this.editTarget;
                            const em = window.eventManager;
                            if (!em?.events || typeof em.deleteEvent !== 'function') return;
                            
                            const idx = em.events.indexOf(eventData);
                            if (idx < 0) return;
                            
                            if (confirm('Are you sure you want to delete this event?')) {
                                if (em.deleteEvent(idx)) {
                                    this.hideEventSlide();
                                }
                            }
                        },
                        
                        hideEventSlide() {
                            const eventSlide = document.getElementById('eventSlide');
                            if (eventSlide) {
                                eventSlide.classList.remove('open');
                                this.hideImageOverlay();
                            }
                            this.cancelEdit();
                        },
                        
                        cancelEdit(editBtn, saveBtn) {
                            if (!this.isEditing) {
                                // Just hide editor if exists
                                const editor = document.getElementById('eventSlideInlineEditor');
                                if (editor) editor.style.display = 'none';
                                return;
                            }
                            
                            const eventSlide = document.getElementById('eventSlide');
                            const titleEl = document.getElementById('eventSlideTitle');
                            const textEl = document.getElementById('eventSlideText');
                            const eb = editBtn || document.getElementById('eventSlideEditBtn');
                            const sb = saveBtn || document.getElementById('eventSlideSaveBtn');
                            const editor = document.getElementById('eventSlideInlineEditor');
                            
                            // Restore original state
                            if (this.originalState && this.editTarget) {
                                Object.assign(this.editTarget.eventData, this.originalState);
                            }
                            
                            // Disable editing
                            if (titleEl) {
                                titleEl.contentEditable = 'false';
                                titleEl.removeAttribute('spellcheck');
                            }
                            if (textEl) {
                                textEl.contentEditable = 'false';
                                textEl.removeAttribute('spellcheck');
                            }
                            
                            // Hide editor
                            if (editor) editor.style.display = 'none';
                            eventSlide?.classList.remove('event-slide--inline-editing');
                            
                            if (eb) eb.textContent = 'Edit';
                            if (sb) sb.style.display = 'none';
                            
                            this.isEditing = false;
                            this.editTarget = null;
                            this.originalState = null;
                        },
                        
                        saveFullEdit(eventData, editBtn, saveBtn) {
                            if (!this.isEditing || !this.editTarget) return;
                            
                            const isMultiEvent = eventData.variants && eventData.variants.length > 0;
                            const target = isMultiEvent ? eventData.variants[this.currentVariantIndex || 0] : eventData;
                            
                            // Gather values from inline editor
                            const cityInput = document.getElementById('eventSlideEditCityDisplayName');
                            const yearStartInput = document.getElementById('eventSlideEditYearStart');
                            const yearEndInput = document.getElementById('eventSlideEditYearEnd');
                            const eraInput = document.getElementById('eventSlideEditEraName');
                            const filtersInput = document.getElementById('eventSlideEditFilters');
                            const factionsInput = document.getElementById('eventSlideEditFactions');
                            const npcsInput = document.getElementById('eventSlideEditNpcs');
                            const headlinesInput = document.getElementById('eventSlideEditHeadlines');
                            const titleEl = document.getElementById('eventSlideTitle');
                            const textEl = document.getElementById('eventSlideText');
                            
                            // Update target
                            if (target) {
                                if (titleEl) target.name = titleEl.textContent || target.name;
                                if (textEl) target.description = textEl.innerHTML || target.description;
                                if (cityInput) target.cityDisplayName = cityInput.value;
                                if (yearStartInput) target.yearStart = parseInt(yearStartInput.value) || target.yearStart;
                                if (yearEndInput) target.yearEnd = parseInt(yearEndInput.value) || null;
                                if (eraInput) target.eraName = eraInput.value || null;
                                if (filtersInput) target.filters = filtersInput.value.split(',').map(s => s.trim()).filter(Boolean);
                                if (factionsInput) target.factions = factionsInput.value.split(',').map(s => s.trim()).filter(Boolean);
                                if (npcsInput) target.npcs = npcsInput.value.split(',').map(s => s.trim()).filter(Boolean);
                                if (headlinesInput) target.headlines = headlinesInput.value.split('\n').map(s => s.trim()).filter(Boolean);
                                
                                // Gather sources
                                const sourceRows = document.querySelectorAll('#eventSlideEditSources .event-slide-inline-editor__source-row');
                                target.sources = Array.from(sourceRows).map(row => ({
                                    text: row.querySelector('[data-role="source-text"]')?.value || '',
                                    url: row.querySelector('[data-role="source-url"]')?.value || ''
                                })).filter(s => s.text || s.url);
                            }
                            
                            // Mark as unsaved
                            if (window.eventManager) {
                                const idx = window.eventManager.events.indexOf(eventData);
                                if (idx >= 0) {
                                    window.eventManager.unsavedEventIndices.add(idx);
                                }
                            }
                            
                            // Disable editing
                            if (titleEl) {
                                titleEl.contentEditable = 'false';
                                titleEl.removeAttribute('spellcheck');
                            }
                            if (textEl) {
                                textEl.contentEditable = 'false';
                                textEl.removeAttribute('spellcheck');
                            }
                            
                            // Hide editor
                            const eventSlide = document.getElementById('eventSlide');
                            const editor = document.getElementById('eventSlideInlineEditor');
                            if (editor) editor.style.display = 'none';
                            eventSlide?.classList.remove('event-slide--inline-editing');
                            
                            if (editBtn) editBtn.textContent = 'Edit';
                            if (saveBtn) saveBtn.style.display = 'none';
                            
                            this.isEditing = false;
                            this.editTarget = null;
                            this.originalState = null;
                            
                            // Refresh display
                            this.updateSourcesAndFilters(target);
                            
                            // Play sound
                            if (window.SoundEffectsManager?.play) {
                                window.SoundEffectsManager.play('save');
                            }
                        },
                        
                        wireNavButtons(eventData) {
                            const prevBtn = document.getElementById('eventPrevBtn');
                            const nextBtn = document.getElementById('eventNextBtn');
                            const allEventsBtn = document.getElementById('eventAllEventsBtn');
                            
                            if (prevBtn) {
                                prevBtn.onclick = () => {
                                    if (this.currentEventIndex > 0) {
                                        this.showEvent(this.currentEventIndex - 1);
                                    }
                                };
                            }
                            
                            if (nextBtn) {
                                nextBtn.onclick = () => {
                                    if (this.currentEventIndex < this.allEvents.length - 1) {
                                        this.showEvent(this.currentEventIndex + 1);
                                    }
                                };
                            }
                            
                            if (allEventsBtn) {
                                allEventsBtn.onclick = () => {
                                    const panel = document.getElementById('eventsManagePanel');
                                    if (panel) panel.classList.add('open');
                                };
                            }
                        },
                        
                        updateNavButtons() {
                            const prevBtn = document.getElementById('eventPrevBtn');
                            const nextBtn = document.getElementById('eventNextBtn');
                            if (prevBtn) prevBtn.disabled = this.currentEventIndex <= 0;
                            if (nextBtn) nextBtn.disabled = this.currentEventIndex >= this.allEvents.length - 1;
                        },
                        
                        setupStandalonePagination() {
                            const prevBtn = document.getElementById('prevPageBtn');
                            const nextBtn = document.getElementById('nextPageBtn');
                            const pageInput = document.getElementById('pageInput');
                            const pageSlider = document.getElementById('eventPageSlider');
                            const ticksEl = document.getElementById('eventPageSliderTicks');
                            
                            if (!prevBtn || !nextBtn) return;
                            
                            // Get data from eventManager (same as Event Manager panel uses)
                            const events = window.eventManager?.events || [];
                            const eventsPerPage = 10; // Globe uses 10 events per page
                            
                            if (!events.length) {
                                console.warn('MenuHelpers: No events available for pagination');
                                return;
                            }
                            
                            console.log('MenuHelpers: Setting up pagination with', events.length, 'events');
                            
                            // Calculate total pages
                            const getTotalPages = () => Math.max(1, Math.ceil(events.length / eventsPerPage));
                            
                            // STANDALONE: Track our own current page (don't rely on globe dataModel)
                            let standaloneCurrentPage = 1;
                            
                            const getCurrentPage = () => standaloneCurrentPage;
                            
                            const setCurrentPage = (page) => {
                                standaloneCurrentPage = page;
                                console.log(`MenuHelpers: Standalone page set to ${page}`);
                            };
                            
                            // Get events for a specific page (mimics DataModel.getEventsForCurrentPage)
                            const getEventsForPage = (pageNum) => {
                                const start = (pageNum - 1) * eventsPerPage;
                                const end = start + eventsPerPage;
                                return events.slice(start, end);
                            };
                            
                            // Generate slider ticks matching globe implementation
                            const generateSliderTicks = (totalPages) => {
                                if (!ticksEl || totalPages <= 1) return;
                                
                                ticksEl.innerHTML = '';
                                const totalEvents = events.length;
                                
                                // Add page number labels at the start of each page segment
                                for (let i = 0; i < totalPages; i++) {
                                    const label = document.createElement('span');
                                    label.className = 'event-page-slider-label';
                                    label.style.left = `${(i / totalPages) * 100}%`;
                                    label.textContent = String(i + 1);
                                    ticksEl.appendChild(label);
                                }
                                
                                // Add major tick marks between pages
                                if (totalPages > 1) {
                                    for (let i = 1; i < totalPages; i++) {
                                        const tick = document.createElement('span');
                                        tick.className = 'event-page-slider-tick event-page-slider-tick--major';
                                        tick.style.left = `${(i / totalPages) * 100}%`;
                                        ticksEl.appendChild(tick);
                                    }
                                }
                                
                                // Add sub-ticks for events within pages
                                for (let p = 0; p < totalPages; p++) {
                                    const onPage = Math.min(eventsPerPage, Math.max(0, totalEvents - p * eventsPerPage));
                                    if (onPage <= 1) continue;
                                    for (let k = 1; k < onPage; k++) {
                                        const sub = document.createElement('span');
                                        sub.className = 'event-page-slider-tick event-page-slider-tick--sub';
                                        sub.style.left = `${((p + k / onPage) / totalPages) * 100}%`;
                                        ticksEl.appendChild(sub);
                                    }
                                }
                                
                                // Add unfinished slot markers (red bars) for events missing descriptions
                                for (let p = 0; p < totalPages; p++) {
                                    const onPage = Math.min(eventsPerPage, Math.max(0, totalEvents - p * eventsPerPage));
                                    for (let e = 0; e < onPage; e++) {
                                        const g = p * eventsPerPage + e;
                                        const rootEv = g >= 0 && g < totalEvents ? events[g] : null;
                                        if (!eventRootSlotMissingDescription(rootEv)) continue;
                                        const mark = document.createElement('span');
                                        mark.className = 'event-page-slider-tick event-page-slider-tick--unfinished-slot';
                                        mark.style.left = `${((p + (e + 0.5) / onPage) / totalPages) * 100}%`;
                                        mark.title = 'Unfinished: missing description';
                                        ticksEl.appendChild(mark);
                                    }
                                }
                            };
                            
                            // Update era strip
                            const updateEraStrip = (totalPages) => {
                                const pageSliderEl = document.getElementById('eventPageSlider');
                                if (!pageSliderEl) return;
                                
                                let eraStrip = document.getElementById('eventPageSliderEraStrip');
                                if (!eraStrip) {
                                    const wrap = pageSliderEl.closest('.event-page-slider-wrap');
                                    if (wrap) {
                                        eraStrip = document.createElement('div');
                                        eraStrip.id = 'eventPageSliderEraStrip';
                                        eraStrip.className = 'event-page-slider-era-strip';
                                        wrap.appendChild(eraStrip);
                                    }
                                }
                                
                                if (!eraStrip) return;
                                
                                // Try to use EraHoverPreviewTheme first
                                if (window.EraHoverPreviewTheme?.buildGlobalEraStripeBackgroundLinearGradient) {
                                    eraStrip.style.background = window.EraHoverPreviewTheme.buildGlobalEraStripeBackgroundLinearGradient(
                                        events,
                                        eventsPerPage,
                                        totalPages
                                    );
                                } else {
                                    // Fallback: build era stripe manually using event.eraName
                                    const eraColors = {
                                        'The Age of Progress': '#66bb6a',
                                        'Age of Progress': '#66bb6a',
                                        'The Omnic Crisis': '#ff5722',
                                        'Omnic Crisis': '#ff5722',
                                        'The Golden Age': '#ffca28',
                                        'Golden Age': '#ffca28',
                                        'The Fall of Overwatch': '#4e342e',
                                        'Fall of Overwatch': '#4e342e',
                                        'The Age of Conflict': '#42a5f5',
                                        'Age of Conflict': '#42a5f5',
                                        'The Null Sector Invasion': '#ba68c8',
                                        'Null Sector Invasion': '#ba68c8',
                                        'The Reign of Talon': '#8b1313',
                                        'Reign of Talon': '#8b1313'
                                    };
                                    
                                    const stops = [];
                                    for (let p = 0; p < totalPages; p++) {
                                        const startIdx = p * eventsPerPage;
                                        const pageEvents = events.slice(startIdx, startIdx + eventsPerPage);
                                        
                                        // Find dominant era on this page
                                        const eraCounts = {};
                                        pageEvents.forEach(ev => {
                                            const era = ev.eraName || 'Unknown';
                                            eraCounts[era] = (eraCounts[era] || 0) + 1;
                                        });
                                        
                                        let dominantEra = 'Unknown';
                                        let maxCount = 0;
                                        Object.entries(eraCounts).forEach(([era, count]) => {
                                            if (count > maxCount) {
                                                maxCount = count;
                                                dominantEra = era;
                                            }
                                        });
                                        
                                        const color = eraColors[dominantEra] || '#888888';
                                        const startPct = (p / totalPages) * 100;
                                        const endPct = ((p + 1) / totalPages) * 100;
                                        stops.push(`${color} ${startPct}%`, `${color} ${endPct}%`);
                                    }
                                    
                                    eraStrip.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
                                }
                            };
                            
                            // Update pagination UI
                            const updatePaginationUI = () => {
                                const currentPage = getCurrentPage();
                                const totalPages = getTotalPages();
                                const pageTotal = document.getElementById('pageTotal');
                                
                                if (pageTotal) pageTotal.textContent = `/ ${totalPages}`;
                                if (pageInput) {
                                    pageInput.value = currentPage;
                                    pageInput.max = totalPages;
                                }
                                
                                // Update slider using globe's EVENT_PAGE_SLIDER_RESOLUTION
                                if (pageSlider) {
                                    const SLIDER_RESOLUTION = 10000;
                                    pageSlider.min = '0';
                                    pageSlider.max = String(SLIDER_RESOLUTION);
                                    pageSlider.disabled = totalPages <= 1;
                                    
                                    // Calculate slider value for page center (same as globe)
                                    const pageCenter = (currentPage - 0.5) / totalPages;
                                    pageSlider.value = String(Math.round(pageCenter * SLIDER_RESOLUTION));
                                }
                                
                                // Generate ticks and era strip
                                generateSliderTicks(totalPages);
                                updateEraStrip(totalPages);
                                
                                // Update buttons
                                prevBtn.disabled = totalPages <= 1;
                                nextBtn.disabled = totalPages <= 1;
                                
                                // Update number button content with current page events
                                const currentPageEvents = getEventsForPage(currentPage);
                                this.updateNumberButtons(currentPageEvents, currentPage);
                                
                                // Show/hide pagination
                                const pagination = document.getElementById('eventPagination');
                                if (pagination) {
                                    pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
                                }
                            };
                            
                            // Handle page change
                            const handlePageChange = (newPage) => {
                                const totalPages = getTotalPages();
                                const validPage = Math.max(1, Math.min(totalPages, newPage));
                                const currentPage = getCurrentPage();
                                
                                console.log(`MenuHelpers: Page change requested: ${newPage} -> valid: ${validPage}, current: ${currentPage}, total: ${totalPages}`);
                                
                                if (validPage !== currentPage) {
                                    console.log(`MenuHelpers: Changing to page ${validPage}`);
                                    setCurrentPage(validPage);
                                    updatePaginationUI();
                                    
                                    if (window.SoundEffectsManager?.play) {
                                        window.SoundEffectsManager.play('pageTurn');
                                    }
                                } else {
                                    console.log(`MenuHelpers: Already on page ${validPage}, no change needed`);
                                }
                            };
                            
                            // Prev button
                            prevBtn.onclick = (e) => {
                                e?.stopPropagation?.();
                                const current = getCurrentPage();
                                if (current > 1) {
                                    handlePageChange(current - 1);
                                } else {
                                    handlePageChange(getTotalPages()); // Wrap to last
                                }
                            };
                            
                            // Next button
                            nextBtn.onclick = (e) => {
                                e?.stopPropagation?.();
                                const current = getCurrentPage();
                                const total = getTotalPages();
                                if (current < total) {
                                    handlePageChange(current + 1);
                                } else {
                                    handlePageChange(1); // Wrap to first
                                }
                            };
                            
                            // Page input
                            if (pageInput) {
                                pageInput.onchange = (e) => {
                                    e.stopPropagation();
                                    const value = parseInt(e.target.value, 10);
                                    if (!isNaN(value)) {
                                        handlePageChange(value);
                                    }
                                };
                                
                                pageInput.onkeydown = (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        pageInput.blur();
                                    }
                                };
                            }
                            
                            // Page slider
                            if (pageSlider) {
                                pageSlider.oninput = () => {
                                    // Visual feedback while dragging
                                };
                                
                                pageSlider.onchange = () => {
                                    const SLIDER_RESOLUTION = 10000;
                                    const value = parseInt(pageSlider.value, 10);
                                    const progress = value / SLIDER_RESOLUTION;
                                    const totalPages = getTotalPages();
                                    const newPage = Math.min(totalPages, Math.max(1, Math.floor(progress * totalPages) + 1));
                                    handlePageChange(newPage);
                                };
                            }
                            
                            // Store for external access
                            this.updatePaginationUI = updatePaginationUI;
                            
                            // Initial update
                            updatePaginationUI();
                        },
                        
                        wireNumberButtons(pageEvents, pageNum, allEvents) {
                            const buttons = document.querySelectorAll('#eventNumberButtons .event-number-btn');
                            if (!buttons.length) return;
                            
                            const events = allEvents || window.eventManager?.events || [];
                            const eventsPerPage = 10; // Globe uses 10 events per page
                            const baseIndex = (pageNum - 1) * eventsPerPage;
                            
                            buttons.forEach((btn, index) => {
                                // Remove old listeners by cloning
                                const newBtn = btn.cloneNode(true);
                                btn.parentNode.replaceChild(newBtn, btn);
                                
                                const event = pageEvents?.[index];
                                const globalEventIndex = baseIndex + index;
                                
                                if (!event) {
                                    newBtn.disabled = true;
                                    newBtn.style.opacity = '0.3';
                                    newBtn.style.display = 'none';
                                    return;
                                }
                                
                                newBtn.disabled = false;
                                newBtn.style.opacity = '1';
                                newBtn.style.display = '';
                                
                                // Update button number
                                const numEl = newBtn.querySelector('.event-number-btn__num');
                                if (numEl) numEl.textContent = globalEventIndex + 1;
                                
                                // Update button content
                                const nameEl = newBtn.querySelector('.event-number-btn__name');
                                const imgEl = newBtn.querySelector('.event-number-btn__img');
                                const imgWrap = newBtn.querySelector('.event-number-btn__img-wrap');
                                const variantBadge = newBtn.querySelector('.event-number-btn__variant-badge');
                                const keyEl = newBtn.querySelector('.event-number-btn__key');
                                
                                // Get display event (first variant for multi-events)
                                const isMultiEvent = Array.isArray(event.variants) && event.variants.length > 0;
                                const displayEvent = isMultiEvent && event.variants[0] 
                                    ? { ...event, ...event.variants[0] }
                                    : event;
                                
                                // Get plain name
                                const plainName = displayEvent.name || event.name || `Event ${globalEventIndex + 1}`;
                                if (nameEl) nameEl.textContent = plainName;
                                
                                // Get image path using helper
                                let imagePath = null;
                                if (window.NavigationImageHelpers?.getEventImagePath) {
                                    imagePath = window.NavigationImageHelpers.getEventImagePath(displayEvent, plainName);
                                } else if (window.eventManager?.getEventImagePath) {
                                    imagePath = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
                                } else {
                                    imagePath = displayEvent.image || displayEvent.imagePath || null;
                                }
                                
                                if (imgEl) {
                                    if (imagePath) {
                                        imgEl.src = imagePath;
                                        imgEl.style.display = '';
                                        if (imgWrap) imgWrap.classList.remove('event-number-btn__img-wrap--empty');
                                    } else {
                                        imgEl.removeAttribute('src');
                                        imgEl.style.display = 'none';
                                        if (imgWrap) imgWrap.classList.add('event-number-btn__img-wrap--empty');
                                    }
                                }
                                if (keyEl) keyEl.textContent = index + 1;
                                
                                // Show variant badge if multi-variant
                                if (variantBadge) {
                                    const hasVariants = Array.isArray(event.variants) && event.variants.length > 1;
                                    variantBadge.hidden = !hasVariants;
                                    variantBadge.dataset.eventIndex = globalEventIndex;
                                    variantBadge.dataset.currentVariant = '0';
                                    // Set badge text to show "1/3", "2/3", etc.
                                    if (hasVariants) {
                                        variantBadge.textContent = `1/${event.variants.length}`;
                                    }
                                }
                                
                                // Click handler - open event slide directly
                                newBtn.onclick = (e) => {
                                    e.stopPropagation();
                                    
                                    // Check if clicking variant badge
                                    if (e.target.closest('.event-number-btn__variant-badge')) {
                                        return;
                                    }
                                    
                                    // Show event in standalone panel
                                    if (window.standaloneEventSlide) {
                                        window.standaloneEventSlide.showEvent(globalEventIndex);
                                    }
                                    
                                    if (window.SoundEffectsManager?.play) {
                                        window.SoundEffectsManager.play('filterConfirm');
                                    }
                                };
                                
                                // Variant badge click - cycles thumbnail and opens event slide
                                if (variantBadge) {
                                    variantBadge.onclick = (e) => {
                                        e.stopPropagation();
                                        
                                        const targetEvent = events[globalEventIndex];
                                        if (!targetEvent?.variants?.length) return;
                                        
                                        const currentVariant = parseInt(variantBadge.dataset.currentVariant || '0', 10);
                                        const nextVariant = (currentVariant + 1) % targetEvent.variants.length;
                                        variantBadge.dataset.currentVariant = nextVariant;
                                        // Update badge text
                                        variantBadge.textContent = `${nextVariant + 1}/${targetEvent.variants.length}`;
                                        
                                        // Update thumbnail image to show the variant
                                        const variantDisplayEvent = targetEvent.variants[nextVariant];
                                        if (variantDisplayEvent && imgEl) {
                                            let variantImagePath = null;
                                            if (window.NavigationImageHelpers?.getEventImagePath) {
                                                variantImagePath = window.NavigationImageHelpers.getEventImagePath(variantDisplayEvent, variantDisplayEvent.name);
                                            } else if (window.eventManager?.getEventImagePath) {
                                                variantImagePath = window.eventManager.getEventImagePath(variantDisplayEvent.name, variantDisplayEvent.image);
                                            } else {
                                                variantImagePath = variantDisplayEvent.image || variantDisplayEvent.imagePath || null;
                                            }
                                            
                                            if (variantImagePath) {
                                                imgEl.src = variantImagePath;
                                                imgEl.style.display = '';
                                                if (imgWrap) imgWrap.classList.remove('event-number-btn__img-wrap--empty');
                                            }
                                            
                                            // Update name to show variant name
                                            if (nameEl && variantDisplayEvent.name) {
                                                nameEl.textContent = variantDisplayEvent.name;
                                            }
                                        }
                                        
                                        // Also open the event slide with this variant
                                        if (window.standaloneEventSlide) {
                                            window.standaloneEventSlide.showStandaloneEventSlide({
                                                ...targetEvent,
                                                ...variantDisplayEvent,
                                                variantIndex: nextVariant,
                                                hasVariants: true,
                                                variants: targetEvent.variants
                                            }, globalEventIndex);
                                        }
                                    };
                                }
                                
                                // Hover effects - use getHoverPreviewLines like the globe
                                newBtn.onmouseenter = () => {
                                    console.log('MenuHelpers: mouseenter on button', globalEventIndex, 'event:', event?.name);
                                    if (window.EventsHoverPreviewBadge?.show && event) {
                                        // Get era/year/flags using same method as globe
                                        const hoverLines = window.EventsHoverPreviewBadge.getHoverPreviewLines 
                                            ? window.EventsHoverPreviewBadge.getHoverPreviewLines(event)
                                            : { eraName: displayEvent.eraName || '', primaryRowFlag: null, otherRowFlags: [], yearLine: displayEvent.yearStart ? `${displayEvent.yearStart}${displayEvent.yearEnd ? `–${displayEvent.yearEnd}` : ''}` : '' };
                                        
                                        const variants = isMultiEvent ? event.variants : [];
                                        const otherVariants = variants.slice(1);
                                        
                                        console.log('MenuHelpers: Calling show with era:', hoverLines.eraName || displayEvent.eraName);
                                        window.EventsHoverPreviewBadge.show(
                                            globalEventIndex + 1,
                                            plainName,
                                            otherVariants.map(v => v.name || ''),
                                            hoverLines.eraName || displayEvent.eraName || '',
                                            hoverLines.primaryRowFlag || null,
                                            hoverLines.otherRowFlags || [],
                                            hoverLines.yearLine || (displayEvent.yearStart ? `${displayEvent.yearStart}${displayEvent.yearEnd ? `–${displayEvent.yearEnd}` : ''}` : '')
                                        );
                                    } else {
                                        console.log('MenuHelpers: EventsHoverPreviewBadge not available or no event', window.EventsHoverPreviewBadge, event);
                                    }
                                    
                                    // === GLOBE INTEGRATION ===
                                    // If Globe is loaded, pan camera to marker and highlight it
                                    const gc = window.globeController;
                                    if (gc && event) {
                                        const sceneModel = gc.sceneModel;
                                        const ic = gc.interactionController;
                                        if (sceneModel && ic) {
                                            // Find the marker for this event
                                            const markers = sceneModel.getMarkers?.() || [];
                                            const marker = markers.find(m => 
                                                m?.userData?.event && 
                                                (m.userData.event.id === event.id || m.userData.event.name === event.name)
                                            );
                                            
                                            if (marker && !marker.userData?.isLocked) {
                                                // Pan camera to marker
                                                const locationType = marker.userData?.locationType || 'earth';
                                                if (locationType === 'moon' || locationType === 'mars') {
                                                    ic.resetCameraToDefault();
                                                } else if (locationType === 'station' || locationType === 'marsShip') {
                                                    ic.setPlanesVisibility(false);
                                                    ic.startFollowingStation(marker);
                                                } else {
                                                    // Earth: zoom to marker
                                                    ic.zoomToMarker(marker);
                                                }
                                                
                                                // Highlight marker
                                                ic.startEventMarkerPulse?.(marker);
                                                ic.hoveredEventMarker = marker;
                                                ic.pulseService?.setHoveredMarker?.(marker);
                                                
                                                // Sync thumbnail highlight on marker
                                                ic.highlightNumberButtonForMarker?.(marker);
                                            }
                                        }
                                    }
                                };
                                
                                newBtn.onmouseleave = () => {
                                    if (window.EventsHoverPreviewBadge?.hide) {
                                        window.EventsHoverPreviewBadge.hide();
                                    }
                                    
                                    // === GLOBE INTEGRATION ===
                                    // Restore camera and stop marker pulse
                                    const gc = window.globeController;
                                    if (gc?.interactionController) {
                                        const ic = gc.interactionController;
                                        
                                        // Stop marker pulse
                                        if (ic.hoveredEventMarker) {
                                            ic.stopEventMarkerPulse?.(ic.hoveredEventMarker);
                                            ic.hoveredEventMarker = null;
                                            ic.pulseService?.setHoveredMarker?.(null);
                                        }
                                        
                                        // Clear thumbnail highlight
                                        ic.highlightNumberButtonForMarker?.(null);
                                        
                                        // Restore camera if original position was stored
                                        const uiView = gc.uiView;
                                        if (uiView?.originalCameraPosition && uiView.zoomOutFromEvent) {
                                            uiView.zoomOutFromEvent();
                                        } else {
                                            // Fallback: just reset camera
                                            ic.resetCameraToDefault?.();
                                        }
                                        
                                        // Resume auto-rotate after delay
                                        if (gc.sceneModel && !gc.sceneModel.getAutoRotateEnabled?.()) {
                                            gc.sceneModel.autoRotateTimeout = setTimeout(() => {
                                                gc.sceneModel.setAutoRotate?.(true);
                                            }, 2000);
                                        }
                                    }
                                };
                            });
                        },
                        
                        updateNumberButtons(pageEvents, pageNum) {
                            // Get all events for indexing
                            const allEvents = window.eventManager?.events || [];
                            
                            // Animate with content swap during animation (like globe)
                            this.animatePageTurn(pageEvents, pageNum, allEvents);
                        },
                        
                        animatePageTurn(pageEvents, pageNum, allEvents) {
                            const buttons = document.querySelectorAll('#eventNumberButtons .event-number-btn');
                            if (!buttons.length) return;
                            
                            const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
                            if (prefersReducedMotion || typeof Element.prototype.animate !== 'function') {
                                // Fallback: just update content without animation
                                this.wireNumberButtons(pageEvents, pageNum, allEvents);
                                return;
                            }
                            
                            // Match globe timing
                            const STAGGER_MS = 58;
                            const SHRINK_MS = 290;
                            const GROW_MS = 515;
                            
                            // Detect desktop layout (skews transform)
                            const isThumbsDesktop = window.matchMedia?.('(min-width: 1024px)')?.matches ?? false;
                            
                            // Cancel any existing animations
                            buttons.forEach(btn => {
                                if (btn.dataset.pageTurnToken) {
                                    try {
                                        const oldAnim = btn.getAnimations?.();
                                        if (oldAnim?.length) {
                                            oldAnim.forEach(a => a.cancel?.());
                                        }
                                    } catch (e) {}
                                }
                            });
                            
                            // Start fresh wave
                            const waveToken = Date.now().toString();
                            
                            buttons.forEach((btn, i) => {
                                if (btn.style.display === 'none') return;
                                
                                // Get the event data for this button position
                                const event = pageEvents[i];
                                const globalEventIndex = (pageNum - 1) * 10 + i;
                                
                                btn.dataset.pageTurnToken = waveToken;
                                const locked = btn.dataset.locked === 'true';
                                
                                // Staggered start for each button
                                const delay = i * STAGGER_MS;
                                
                                // Step 1: Shrink out (old content)
                                const shrinkAnim = btn.animate(
                                    thumbPageTurnShrinkKeyframes(isThumbsDesktop, locked),
                                    {
                                        duration: SHRINK_MS,
                                        easing: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
                                        delay: delay,
                                        fill: 'both'
                                    }
                                );
                                
                                shrinkAnim.onfinish = () => {
                                    // Check if this wave is still valid
                                    if (btn.dataset.pageTurnToken !== waveToken) return;
                                    
                                    // Update THIS button's content while it's invisible (between shrink and grow)
                                    this.updateSingleButtonContent(btn, event, globalEventIndex, allEvents);
                                    
                                    // Step 2: Grow in (new content)
                                    const growAnim = btn.animate(
                                        thumbPageTurnGrowKeyframes(isThumbsDesktop, locked),
                                        {
                                            duration: GROW_MS,
                                            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                            fill: 'both'
                                        }
                                    );
                                    
                                    growAnim.onfinish = () => {
                                        delete btn.dataset.pageTurnToken;
                                    };
                                };
                            });
                        },
                        
                        updateSingleButtonContent(btn, event, globalEventIndex, allEvents) {
                            if (!event) {
                                btn.style.display = 'none';
                                return;
                            }
                            
                            btn.style.display = '';
                            btn.dataset.position = String(globalEventIndex % 10);
                            btn.dataset.eventIndex = globalEventIndex;
                            
                            const numEl = btn.querySelector('.event-number-btn__num');
                            const nameEl = btn.querySelector('.event-number-btn__name');
                            const imgEl = btn.querySelector('.event-number-btn__img');
                            const imgWrap = btn.querySelector('.event-number-btn__img-wrap');
                            const variantBadge = btn.querySelector('.event-number-btn__variant-badge');
                            const keyEl = btn.querySelector('.event-number-btn__key');
                            
                            if (numEl) numEl.textContent = globalEventIndex + 1;
                            if (keyEl) keyEl.textContent = (globalEventIndex % 10) + 1;
                            
                            const isMultiEvent = Array.isArray(event.variants) && event.variants.length > 0;
                            const displayEvent = isMultiEvent && event.variants[0]
                                ? { ...event, ...event.variants[0] }
                                : event;
                            
                            const plainName = displayEvent.name || event.name || `Event ${globalEventIndex + 1}`;
                            if (nameEl) nameEl.textContent = plainName;
                            
                            // Get image
                            let imagePath = null;
                            if (window.NavigationImageHelpers?.getEventImagePath) {
                                imagePath = window.NavigationImageHelpers.getEventImagePath(displayEvent, plainName);
                            } else if (window.eventManager?.getEventImagePath) {
                                imagePath = window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image);
                            } else {
                                imagePath = displayEvent.image || displayEvent.imagePath || null;
                            }
                            
                            if (imgEl) {
                                if (imagePath) {
                                    imgEl.src = imagePath;
                                    imgEl.style.display = '';
                                    if (imgWrap) imgWrap.classList.remove('event-number-btn__img-wrap--empty');
                                } else {
                                    imgEl.removeAttribute('src');
                                    imgEl.style.display = 'none';
                                    if (imgWrap) imgWrap.classList.add('event-number-btn__img-wrap--empty');
                                }
                            }
                            
                            // Variant badge
                            if (variantBadge) {
                                const hasVariants = Array.isArray(event.variants) && event.variants.length > 1;
                                variantBadge.hidden = !hasVariants;
                                variantBadge.dataset.eventIndex = globalEventIndex;
                                variantBadge.dataset.currentVariant = '0';
                                if (hasVariants) {
                                    variantBadge.textContent = `1/${event.variants.length}`;
                                }
                            }
                            
                            // Click handler
                            btn.onclick = (e) => {
                                e.stopPropagation();
                                if (e.target.closest('.event-number-btn__variant-badge')) return;
                                if (window.standaloneEventSlide) {
                                    window.standaloneEventSlide.showEvent(globalEventIndex);
                                    window.SoundEffectsManager?.play?.('filterConfirm');
                                }
                            };
                            
                            // Variant badge click
                            if (variantBadge) {
                                variantBadge.onclick = (e) => {
                                    e.stopPropagation();
                                    const targetEvent = allEvents[globalEventIndex];
                                    if (!targetEvent?.variants?.length) return;
                                    
                                    const currentVariant = parseInt(variantBadge.dataset.currentVariant || '0', 10);
                                    const nextVariant = (currentVariant + 1) % targetEvent.variants.length;
                                    variantBadge.dataset.currentVariant = nextVariant;
                                    variantBadge.textContent = `${nextVariant + 1}/${targetEvent.variants.length}`;
                                    
                                    const variantDisplayEvent = targetEvent.variants[nextVariant];
                                    if (variantDisplayEvent && imgEl) {
                                        let variantImagePath = null;
                                        if (window.NavigationImageHelpers?.getEventImagePath) {
                                            variantImagePath = window.NavigationImageHelpers.getEventImagePath(variantDisplayEvent, variantDisplayEvent.name);
                                        } else if (window.eventManager?.getEventImagePath) {
                                            variantImagePath = window.eventManager.getEventImagePath(variantDisplayEvent.name, variantDisplayEvent.image);
                                        } else {
                                            variantImagePath = variantDisplayEvent.image || variantDisplayEvent.imagePath || null;
                                        }
                                        
                                        if (variantImagePath) {
                                            imgEl.src = variantImagePath;
                                            imgEl.style.display = '';
                                            if (imgWrap) imgWrap.classList.remove('event-number-btn__img-wrap--empty');
                                        }
                                        if (nameEl && variantDisplayEvent.name) {
                                            nameEl.textContent = variantDisplayEvent.name;
                                        }
                                    }
                                    
                                    if (window.standaloneEventSlide) {
                                        window.standaloneEventSlide.showStandaloneEventSlide({
                                            ...targetEvent,
                                            ...variantDisplayEvent,
                                            variantIndex: nextVariant,
                                            hasVariants: true,
                                            variants: targetEvent.variants
                                        }, globalEventIndex);
                                    }
                                };
                            }
                            
                            // Hover effects - use getHoverPreviewLines like the globe
                            btn.onmouseenter = () => {
                                if (window.EventsHoverPreviewBadge?.show && event) {
                                    // Get era/year/flags using same method as globe
                                    const hoverLines = window.EventsHoverPreviewBadge.getHoverPreviewLines 
                                        ? window.EventsHoverPreviewBadge.getHoverPreviewLines(event)
                                        : { eraName: displayEvent.eraName || '', primaryRowFlag: null, otherRowFlags: [], yearLine: displayEvent.yearStart ? `${displayEvent.yearStart}${displayEvent.yearEnd ? `–${displayEvent.yearEnd}` : ''}` : '' };
                                    
                                    const variants = isMultiEvent ? event.variants : [];
                                    const otherVariants = variants.slice(1);
                                    
                                    window.EventsHoverPreviewBadge.show(
                                        globalEventIndex + 1,
                                        plainName,
                                        otherVariants.map(v => v.name || ''),
                                        hoverLines.eraName || displayEvent.eraName || '',
                                        hoverLines.primaryRowFlag || null,
                                        hoverLines.otherRowFlags || [],
                                        hoverLines.yearLine || (displayEvent.yearStart ? `${displayEvent.yearStart}${displayEvent.yearEnd ? `–${displayEvent.yearEnd}` : ''}` : '')
                                    );
                                }
                                
                                // === GLOBE INTEGRATION ===
                                const gc = window.globeController;
                                if (gc && event) {
                                    const sceneModel = gc.sceneModel;
                                    const ic = gc.interactionController;
                                    if (sceneModel && ic) {
                                        const markers = sceneModel.getMarkers?.() || [];
                                        const marker = markers.find(m => 
                                            m?.userData?.event && 
                                            (m.userData.event.id === event.id || m.userData.event.name === event.name)
                                        );
                                        
                                        if (marker && !marker.userData?.isLocked) {
                                            const locationType = marker.userData?.locationType || 'earth';
                                            if (locationType === 'moon' || locationType === 'mars') {
                                                ic.resetCameraToDefault();
                                            } else if (locationType === 'station' || locationType === 'marsShip') {
                                                ic.setPlanesVisibility(false);
                                                ic.startFollowingStation(marker);
                                            } else {
                                                ic.zoomToMarker(marker);
                                            }
                                            
                                            ic.startEventMarkerPulse?.(marker);
                                            ic.hoveredEventMarker = marker;
                                            ic.pulseService?.setHoveredMarker?.(marker);
                                            ic.highlightNumberButtonForMarker?.(marker);
                                        }
                                    }
                                }
                            };
                            
                            btn.onmouseleave = () => {
                                if (window.EventsHoverPreviewBadge?.hide) {
                                    window.EventsHoverPreviewBadge.hide();
                                }
                                
                                // === GLOBE INTEGRATION ===
                                const gc = window.globeController;
                                if (gc?.interactionController) {
                                    const ic = gc.interactionController;
                                    if (ic.hoveredEventMarker) {
                                        ic.stopEventMarkerPulse?.(ic.hoveredEventMarker);
                                        ic.hoveredEventMarker = null;
                                        ic.pulseService?.setHoveredMarker?.(null);
                                    }
                                    ic.highlightNumberButtonForMarker?.(null);
                                    const uiView = gc.uiView;
                                    if (uiView?.originalCameraPosition && uiView.zoomOutFromEvent) {
                                        uiView.zoomOutFromEvent();
                                    } else {
                                        ic.resetCameraToDefault?.();
                                    }
                                    if (gc.sceneModel && !gc.sceneModel.getAutoRotateEnabled?.()) {
                                        gc.sceneModel.autoRotateTimeout = setTimeout(() => {
                                            gc.sceneModel.setAutoRotate?.(true);
                                        }, 2000);
                                    }
                                }
                            };
                        },
                        
                        toggleImageOverlay(imagePath) {
                            const overlay = document.getElementById('eventImageOverlay');
                            if (!overlay) return;
                            
                            if (overlay.classList.contains('open')) {
                                this.hideImageOverlay();
                            } else if (imagePath) {
                                this.showImageOverlay(imagePath);
                            }
                        },
                        
                        showImageOverlay(imagePath) {
                            const overlay = document.getElementById('eventImageOverlay');
                            const img = document.getElementById('eventImage');
                            const eventSlide = document.getElementById('eventSlide');
                            
                            if (overlay && img && imagePath) {
                                img.src = imagePath;
                                img.style.display = 'block';
                                img.style.opacity = '1';
                                overlay.style.display = 'flex';
                                overlay.style.opacity = '1';
                                overlay.classList.add('open');
                                
                                // Add slide-open class for positioning
                                if (eventSlide && eventSlide.classList.contains('open')) {
                                    overlay.classList.add('slide-open');
                                }
                            }
                        },
                        
                        hideImageOverlay() {
                            const overlay = document.getElementById('eventImageOverlay');
                            if (overlay) {
                                overlay.classList.remove('open', 'slide-open');
                                overlay.style.opacity = '0';
                                setTimeout(() => {
                                    if (!overlay.classList.contains('open')) {
                                        overlay.style.display = 'none';
                                    }
                                }, 600);
                            }
                        }
                    };
                    
                    // Wire up news ticker clicks
                    if (window.newsTickerService && window.newsTickerService.tickerContainer) {
                        window.newsTickerService.tickerContainer.addEventListener('click', (e) => {
                            const item = e.target?.closest?.('.news-ticker-item');
                            if (item) {
                                e.stopPropagation();
                                const eventIndex = parseInt(item.dataset.eventIndex, 10);
                                if (!isNaN(eventIndex)) {
                                    window.standaloneEventSlide.showEvent(eventIndex);
                                }
                            }
                        });
                    }
                    
                    // Wire up Event Manager list clicks
                    window.eventManager.openEventFromList = function(event, index) {
                        if (window.standaloneEventSlide) {
                            window.standaloneEventSlide.showEvent(index);
                        }
                    };
                    
                    // Setup standalone pagination dock (wait for dock to be created)
                    if (window.standaloneEventSlide?.setupStandalonePagination) {
                        setTimeout(() => {
                            window.standaloneEventSlide.setupStandalonePagination();
                        }, 200);
                    }
                }

                testBtn.dataset.loaded = 'true';
                testBtn.textContent = 'UNLOAD Event System Load Out';
                testBtn.style.background = '#c93439';
                updateStatus('✓ News ticker loaded - click again to unload', 'success');
            } catch (error) {
                console.error('Error loading news ticker:', error);
                updateStatus(`✗ Error: ${error.message}`, 'error');
            }
        } else {
            // UNLOAD
            updateStatus('Unloading news ticker...', 'info');

            // Clear news ticker
            if (window.newsTickerService) {
                window.newsTickerService.clear();
            }

            // Remove timeline-loaded class from footer
            const footer = document.querySelector('footer');
            if (footer) {
                footer.classList.remove('timeline-loaded');
            }

            // Hide events manage toggle button
            const eventsManageToggle = document.getElementById('eventsManageToggle');
            if (eventsManageToggle) {
                eventsManageToggle.style.setProperty('display', 'none', 'important');
            }

            // Close event slide panel if open
            const eventSlide = document.getElementById('eventSlide');
            if (eventSlide) {
                eventSlide.classList.remove('open');
            }

            // Hide image overlay if open
            const eventImageOverlay = document.getElementById('eventImageOverlay');
            if (eventImageOverlay) {
                eventImageOverlay.classList.remove('open');
            }

            // Clean up standalone event slide
            window.standaloneEventSlide = null;

            // Remove pagination dock (includes eventPagination inside it)
            const paginationDock = document.getElementById('paginationDock');
            if (paginationDock) {
                paginationDock.remove();
            }
            const paginationDockCollapseStrip = document.getElementById('paginationDockCollapseStrip');
            if (paginationDockCollapseStrip) {
                paginationDockCollapseStrip.remove();
            }
            // Also explicitly remove eventPagination if it exists outside the dock
            const eventPagination = document.getElementById('eventPagination');
            if (eventPagination) {
                eventPagination.remove();
            }
            // Clear eventNumberButtons content to prevent duplicate thumbnails
            const eventNumberButtons = document.getElementById('eventNumberButtons');
            if (eventNumberButtons) {
                eventNumberButtons.innerHTML = '';
            }

            // Close events manage panel if open
            const eventsManagePanel = document.getElementById('eventsManagePanel');
            if (eventsManagePanel) {
                eventsManagePanel.classList.remove('open');
            }

            // Clear events list
            const eventsList = document.getElementById('eventsList');
            if (eventsList) {
                eventsList.innerHTML = '';
            }

            // Remove event manager listeners flag so it can be re-initialized
            if (window.eventManager) {
                window.eventManager.listenersSetup = false;
            }

            // Cleanup EventsHoverPreviewBadge (reset module state)
            if (window.EventsHoverPreviewBadge?.cleanup) {
                window.EventsHoverPreviewBadge.cleanup();
            }

            // Clear standalone filters
            if (window.standaloneActiveFilters) {
                window.standaloneActiveFilters.clear();
            }
            if (window.FilterService?.stateManager) {
                window.FilterService.stateManager.clear();
            }

            // Hide filters toggle button
            const filtersToggle = document.getElementById('filtersToggle');
            if (filtersToggle) {
                filtersToggle.style.setProperty('display', 'none', 'important');
            }

            // Close and remove filters panel
            const filtersPanel = document.getElementById('filtersPanel');
            if (filtersPanel) {
                filtersPanel.classList.remove('open');
                filtersPanel.remove();
            }

            testBtn.dataset.loaded = 'false';
            testBtn.textContent = 'LOAD Event System Load Out';
            testBtn.style.background = '#333';
            updateStatus('✓ News ticker unloaded', 'success');
        }
    });
    menuButtons.appendChild(testBtn);

    return menuButtons;
}

/**
 * Gets or creates the test container
 * @returns {HTMLElement} - The test container
 */
export function getOrCreateTestContainer() {
    let testContainer = document.querySelector('.test-container');
    if (!testContainer) {
        updateStatus('Creating test container...', 'info');
        testContainer = document.createElement('div');
        testContainer.className = 'test-container';
        testContainer.id = 'testContainer';
        document.getElementById('content').appendChild(testContainer);
        updateStatus('✓ Test container created', 'success');
    }
    return testContainer;
}

// Make updateStandalonePaginationForFilters available globally
if (typeof window !== 'undefined') {
    window.updateStandalonePaginationForFilters = updateStandalonePaginationForFilters;
}
