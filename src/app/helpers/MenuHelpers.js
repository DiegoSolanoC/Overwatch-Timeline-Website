/**
 * MenuHelpers - Utilities for menu creation
 * Extracted from component-loader.js
 */

import { updateStatus } from '../../managers/StatusManager.js';

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
            <div class="main-menu-description">${description}</div>
        </div>
    `;
    return button;
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
        globeBtn.addEventListener('click', setupGlobeHandler);
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
        glossaryBtn.addEventListener('click', setupGlossaryHandler);
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
            biographyBtn.addEventListener('click', setupBiographyHandler);
        }

        menuButtons.appendChild(biographyBtn);
    }

    // TEST button (small, below main buttons)
    const testBtn = document.createElement('button');
    testBtn.id = 'testBtn';
    testBtn.className = 'test-btn';
    testBtn.textContent = 'TEST';
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
                        eventsManageToggle.style.display = 'flex';
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
                            this.allEvents = events;
                            
                            const event = events[index];
                            this.currentEventData = event;
                            const isMultiEvent = event.variants && event.variants.length > 0;
                            this.currentVariantIndex = 0;
                            const displayEvent = isMultiEvent ? event.variants[0] : event;
                            
                            // Get event data
                            let eventName = displayEvent.name || event.name || 'Unnamed Event';
                            const description = displayEvent.description || '';
                            const imagePath = window.eventManager?.getEventImagePath 
                                ? window.eventManager.getEventImagePath(displayEvent.name, displayEvent.image)
                                : displayEvent.image;
                            
                            // Apply glitch text if enabled
                            if (window.GlitchTextService?.isEnabled?.()) {
                                eventName = window.GlitchTextService.getDisplayEventName(eventName);
                            }
                            
                            // Show the slide
                            this.displaySlide(eventName, imagePath, description, event, isMultiEvent, displayEvent);
                            
                            // Update prev/next button states
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
                }

                testBtn.dataset.loaded = 'true';
                testBtn.textContent = 'UNLOAD';
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
                eventsManageToggle.style.display = 'none';
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

            testBtn.dataset.loaded = 'false';
            testBtn.textContent = 'TEST';
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
