/**
 * EventListenerService - Handles event listener setup for EventManager
 * Separates listener setup logic from event management
 */

class EventListenerService {
    constructor() {
        this.eventManager = null; // Reference to EventManager (for state access)
    }

    /**
     * Set the EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        if (!this.eventManager) return;
        
        console.log('EventListenerService: setupEventListeners called');
        
        // Toggle panel
        const toggleBtn = document.getElementById('eventsManageToggle');
        const panel = document.getElementById('eventsManagePanel');
        const closeBtn = document.getElementById('eventsManageClose');
        
        if (!panel) {
            console.error('EventListenerService: eventsManagePanel not found! Make sure the HTML panel exists in the page.');
            console.error('EventListenerService: Current page:', window.location.pathname);
            // Try again after a short delay in case DOM isn't ready
            setTimeout(() => {
                console.log('EventListenerService: Retrying setupEventListeners after delay...');
                this.setupEventListeners();
            }, 200);
            return;
        }
        
        // If listeners already set up, skip (but allow re-setup if needed)
        if (this.eventManager.listenersSetup && toggleBtn && panel) {
            console.log('EventListenerService: Listeners already set up, skipping...');
            return;
        }
        
        console.log('EventListenerService: Panel found, setting up listeners...');
        console.log('EventListenerService: Toggle button found:', !!toggleBtn);
        console.log('EventListenerService: Close button found:', !!closeBtn);

        // Ensure button is always visible (never hide it)
        if (toggleBtn) {
            toggleBtn.style.display = '';
            toggleBtn.style.visibility = 'visible';
            toggleBtn.style.opacity = '1';
        }

        if (toggleBtn && panel) {
            // Remove existing listener by cloning the button to prevent duplicates
            const toggleBtnClone = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(toggleBtnClone, toggleBtn);
            const newToggleBtn = document.getElementById('eventsManageToggle');
            
            // Re-get panel reference after button clone (in case DOM changed)
            const currentPanel = document.getElementById('eventsManagePanel');
            if (!currentPanel) {
                console.error('EventListenerService: eventsManagePanel not found after button setup');
                return;
            }
            
            newToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('EventListenerService: Toggle button clicked');
                
                // Close music panel if open
                const musicPanel = document.getElementById('musicPanel');
                const musicButton = document.getElementById('musicToggle');
                if (musicPanel && musicPanel.classList.contains('open')) {
                    musicPanel.classList.remove('open');
                    if (musicButton) {
                        musicButton.classList.remove('active');
                    }
                }
                
                // Close filters panel if open
                const filtersPanel = document.getElementById('filtersPanel');
                const filtersButton = document.getElementById('filtersToggle');
                if (filtersPanel && filtersPanel.classList.contains('open')) {
                    filtersPanel.classList.remove('open');
                    if (filtersButton) {
                        filtersButton.classList.remove('active');
                    }
                }
                
                // Play event manager sound
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventManager');
                }
                
                // Toggle event management panel (works normally on both localhost and GitHub Pages)
                const wasOpen = currentPanel.classList.contains('open');
                console.log('EventListenerService: Panel was open:', wasOpen);
                currentPanel.classList.toggle('open');
                const isNowOpen = currentPanel.classList.contains('open');
                console.log('EventListenerService: Panel is now open:', isNowOpen);
                
                if (isNowOpen) {
                    newToggleBtn.classList.add('active');
                    if (this.eventManager.renderEvents) {
                        this.eventManager.renderEvents();
                    }
                } else {
                    // Reset all multi-variant events to first variant when closing
                    if (wasOpen && this.eventManager.resetAllEventVariants) {
                        this.eventManager.resetAllEventVariants();
                    }
                    newToggleBtn.classList.remove('active');
                }
            });
        } else {
            console.error('EventListenerService: setupEventListeners - toggleBtn or panel not found', {
                toggleBtn: !!toggleBtn,
                panel: !!panel
            });
        }

        if (closeBtn && panel) {
            closeBtn.addEventListener('click', () => {
                // Play event manager sound when closing
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('eventManager');
                }
                
                // Reset all multi-variant events to first variant
                if (this.eventManager.resetAllEventVariants) {
                    this.eventManager.resetAllEventVariants();
                }
                
                panel.classList.remove('open');
                const toggleBtn = document.getElementById('eventsManageToggle');
                if (toggleBtn) {
                    toggleBtn.classList.remove('active');
                }
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (panel && panel.classList.contains('open')) {
                // Don't close panel if we're in the process of opening an event
                if (this.eventManager.isOpeningEvent) {
                    return;
                }
                
                const toggleBtn = document.getElementById('eventsManageToggle');
                const editModal = document.getElementById('eventEditModal');
                // Check if clicking on a View button (don't close panel)
                const isViewButton = e.target.classList && e.target.classList.contains('view-btn');
                const isViewButtonParent = e.target.closest && e.target.closest('.view-btn');
                // Don't close panel if clicking on edit modal, toggle button, or View buttons
                if (!panel.contains(e.target) && 
                    !toggleBtn.contains(e.target) && 
                    e.target !== toggleBtn &&
                    !editModal.contains(e.target) &&
                    !editModal.classList.contains('open') &&
                    !isViewButton &&
                    !isViewButtonParent) {
                    // Reset all multi-variant events to first variant
                    if (this.eventManager.resetAllEventVariants) {
                        this.eventManager.resetAllEventVariants();
                    }
                    
                    panel.classList.remove('open');
                    if (toggleBtn) {
                        toggleBtn.classList.remove('active');
                    }
                }
            }
        });

        // Hide/lock management buttons on GitHub Pages
        const isGitHubPages = this.eventManager.isGitHubPages ? this.eventManager.isGitHubPages() : false;
        
        // Add event button
        const addBtn = document.getElementById('addEventBtn');
        if (addBtn) {
            if (isGitHubPages) {
                addBtn.style.display = 'none';
                console.log('EventListenerService: Add Event button hidden (GitHub Pages)');
            } else {
                // Remove any existing listeners by cloning
                const addBtnClone = addBtn.cloneNode(true);
                addBtn.parentNode.replaceChild(addBtnClone, addBtn);
                const newAddBtn = document.getElementById('addEventBtn');
                
                newAddBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('EventListenerService: Add Event button clicked');
                    if (this.eventManager.openEditModal) {
                        this.eventManager.openEditModal(null);
                    }
                });
                console.log('EventListenerService: Add Event button listener attached');
            }
        } else {
            console.warn('EventListenerService: addEventBtn not found! Make sure events-manage-panel HTML exists.');
            console.warn('EventListenerService: Panel exists:', !!panel, 'Panel ID:', panel?.id);
        }

        // Save events button
        const saveBtn = document.getElementById('saveEventsBtn');
        if (saveBtn) {
            if (isGitHubPages) {
                saveBtn.style.display = 'none';
            } else {
                saveBtn.addEventListener('click', () => {
                    if (this.eventManager.saveEvents) {
                        this.eventManager.saveEvents();
                    }
                });
            }
        }

        // Export events button
        const exportBtn = document.getElementById('exportEventsBtn');
        if (exportBtn) {
            if (isGitHubPages) {
                exportBtn.style.display = 'none';
            } else {
                exportBtn.addEventListener('click', () => {
                    if (this.eventManager.exportEvents) {
                        this.eventManager.exportEvents();
                    }
                });
            }
        }

        // Import events button
        const importBtn = document.getElementById('importEventsBtn');
        const importFileInput = document.getElementById('importEventsFile');
        if (importBtn && importFileInput) {
            if (isGitHubPages) {
                importBtn.style.display = 'none';
                importFileInput.style.display = 'none';
            } else {
                importBtn.addEventListener('click', () => {
                    importFileInput.click();
                });
                importFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file && this.eventManager.importEvents) {
                        this.eventManager.importEvents(file);
                        // Reset input so same file can be imported again
                        e.target.value = '';
                    }
                });
            }
        }

        // Edit modal
        const modal = document.getElementById('eventEditModal');
        const modalClose = document.getElementById('eventEditModalClose');
        const modalCancel = document.getElementById('eventEditCancel');
        const modalSave = document.getElementById('eventEditSave');
        const lookupBtn = document.getElementById('lookupCityBtn');
        const deleteVariantBtn = document.getElementById('eventEditDeleteVariant');

        // Hide/lock modal controls on GitHub Pages
        if (isGitHubPages) {
            if (modalSave) {
                modalSave.style.display = 'none';
                modalSave.style.visibility = 'hidden';
                modalSave.style.pointerEvents = 'none';
            }
            if (lookupBtn) {
                lookupBtn.style.display = 'none';
                lookupBtn.style.visibility = 'hidden';
                lookupBtn.style.pointerEvents = 'none';
            }
            if (deleteVariantBtn) {
                deleteVariantBtn.style.display = 'none';
                deleteVariantBtn.style.visibility = 'hidden';
                deleteVariantBtn.style.pointerEvents = 'none';
            }
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                if (this.eventManager.closeEditModal) {
                    this.eventManager.closeEditModal();
                }
            });
        }

        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                if (this.eventManager.closeEditModal) {
                    this.eventManager.closeEditModal();
                }
            });
        }

        if (modalSave) {
            modalSave.addEventListener('click', () => {
                if (this.eventManager.saveEventFromModal) {
                    this.eventManager.saveEventFromModal();
                }
            });
        }

        if (lookupBtn && !isGitHubPages) {
            lookupBtn.addEventListener('click', () => {
                if (this.eventManager.lookupCity) {
                    this.eventManager.lookupCity();
                }
            });
        }

        if (deleteVariantBtn && !isGitHubPages) {
            deleteVariantBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.handleDeleteCurrentVariant) {
                    this.eventManager.formService.handleDeleteCurrentVariant();
                }
            });
        }

        // Source pair buttons
        const addSourceBtn = document.getElementById('addSourcePairBtn');
        const removeSourceBtn = document.getElementById('removeSourcePairBtn');
        
        if (addSourceBtn && !isGitHubPages) {
            addSourceBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.addSourcePair) {
                    this.eventManager.formService.addSourcePair();
                }
            });
        }

        if (removeSourceBtn && !isGitHubPages) {
            removeSourceBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.removeLastSourcePair) {
                    this.eventManager.formService.removeLastSourcePair();
                } else if (this.eventManager.removeLastSourcePair) {
                    // Fallback to EventManager method if formService not available
                    this.eventManager.removeLastSourcePair();
                }
            });
        }
        
        // Handle addSourceBtn (alternative ID)
        const addSourceBtnAlt = document.getElementById('addSourceBtn');
        if (addSourceBtnAlt && !isGitHubPages) {
            // Remove any existing listeners by cloning
            const addSourceBtnClone = addSourceBtnAlt.cloneNode(true);
            addSourceBtnAlt.parentNode.replaceChild(addSourceBtnClone, addSourceBtnAlt);
            const newAddSourceBtn = document.getElementById('addSourceBtn');
            
            newAddSourceBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.addSourcePair) {
                    this.eventManager.formService.addSourcePair();
                }
            });
        }
        
        // Handle removeSourcePairBtn (alternative ID)
        const removeSourcePairBtn = document.getElementById('removeSourcePairBtn');
        if (removeSourcePairBtn && !isGitHubPages) {
            // Remove any existing listeners by cloning
            const removeSourcePairBtnClone = removeSourcePairBtn.cloneNode(true);
            removeSourcePairBtn.parentNode.replaceChild(removeSourcePairBtnClone, removeSourcePairBtn);
            const newRemoveSourcePairBtn = document.getElementById('removeSourcePairBtn');
            
            newRemoveSourcePairBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.removeLastSourcePair) {
                    this.eventManager.formService.removeLastSourcePair();
                } else if (this.eventManager.removeLastSourcePair) {
                    // Fallback to EventManager method if formService not available
                    this.eventManager.removeLastSourcePair();
                }
            });
        }

        // Headline buttons
        const addHeadlineBtn = document.getElementById('addHeadlineBtn');
        const removeHeadlineBtn = document.getElementById('removeHeadlineBtn');
        
        if (addHeadlineBtn && !isGitHubPages) {
            // Remove any existing listeners by cloning
            const addHeadlineBtnClone = addHeadlineBtn.cloneNode(true);
            addHeadlineBtn.parentNode.replaceChild(addHeadlineBtnClone, addHeadlineBtn);
            const newAddHeadlineBtn = document.getElementById('addHeadlineBtn');
            
            newAddHeadlineBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.addHeadlineField) {
                    this.eventManager.formService.addHeadlineField();
                }
            });
        }

        if (removeHeadlineBtn && !isGitHubPages) {
            // Remove any existing listeners by cloning
            const removeHeadlineBtnClone = removeHeadlineBtn.cloneNode(true);
            removeHeadlineBtn.parentNode.replaceChild(removeHeadlineBtnClone, removeHeadlineBtn);
            const newRemoveHeadlineBtn = document.getElementById('removeHeadlineBtn');
            
            newRemoveHeadlineBtn.addEventListener('click', () => {
                if (this.eventManager.formService && this.eventManager.formService.removeLastHeadlineField) {
                    this.eventManager.formService.removeLastHeadlineField();
                }
            });
        }

        // Mark listeners as set up
        this.setupEventManagerSearch();
        this.eventManager.listenersSetup = true;
        console.log('EventListenerService: All listeners set up successfully');
    }

    /**
     * Setup event manager search bar: title input + single filter text box (comma-separated hero/faction names).
     * Tokens that don't match any hero or faction are ignored.
     */
    setupEventManagerSearch() {
        if (!this.eventManager) return;
        const searchInput = document.getElementById('eventsSearchInput');
        const filtersInput = document.getElementById('eventsSearchFilters');
        const suggestionsEl = document.getElementById('eventsSearchFiltersSuggestions');
        const perPageInput = document.getElementById('eventsPerPageInput');
        const showAllCheckbox = document.getElementById('eventsShowAllCheckbox');
        const clearBtn = document.getElementById('eventsSearchClear');
        if (!searchInput || !filtersInput) return;

        const buildFilterIndex = () => {
            const heroes = this.eventManager.heroes || [];
            const factions = this.eventManager.factions || [];
            const heroByLower = new Map();
            heroes.forEach(h => {
                const key = (h || '').toString().toLowerCase();
                if (key) heroByLower.set(key, h);
            });
            const factionEntries = (factions || []).map(f => {
                const filename = typeof f === 'object' && f !== null && f.filename != null ? f.filename : f;
                const displayName = typeof f === 'object' && f !== null && f.displayName != null ? f.displayName : filename;
                return {
                    filename: (filename || '').toString(),
                    displayName: (displayName || '').toString(),
                    filenameLower: (filename || '').toString().toLowerCase(),
                    displayLower: (displayName || '').toString().toLowerCase(),
                };
            });
            return { heroes, heroByLower, factionEntries };
        };

        let filterIndex = buildFilterIndex();

        const parseFilterTokens = (text) => {
            // Rebuild index lazily if data arrived after listeners were set up
            if (!filterIndex || (filterIndex.heroes?.length === 0 && (this.eventManager.heroes || []).length > 0)) {
                filterIndex = buildFilterIndex();
            }
            const heroes = filterIndex.heroes || [];
            const heroByLower = filterIndex.heroByLower || new Map();
            const factionEntries = filterIndex.factionEntries || [];

            const tokens = (text || '').split(',').map(t => t.trim()).filter(t => t.length > 0);
            const matchedHeroes = [];
            const matchedFactions = [];
            const seenHero = new Set();
            const seenFaction = new Set();

            tokens.forEach(token => {
                const lower = token.toLowerCase();
                if (heroByLower.has(lower)) {
                    const heroName = heroByLower.get(lower);
                    if (heroName && !seenHero.has(heroName)) {
                        seenHero.add(heroName);
                        matchedHeroes.push(heroName);
                    }
                } else {
                    const match = factionEntries.find(fe => fe.displayLower === lower || fe.filenameLower === lower);
                    if (match && match.filename && !seenFaction.has(match.filename)) {
                        seenFaction.add(match.filename);
                        matchedFactions.push(match.filename);
                    }
                }
            });

            return { matchedHeroes, matchedFactions };
        };

        const getCurrentTokenInfo = () => {
            const value = (filtersInput.value || '');
            const lastComma = value.lastIndexOf(',');
            const before = lastComma >= 0 ? value.slice(0, lastComma) : '';
            const currentRaw = lastComma >= 0 ? value.slice(lastComma + 1) : value;
            const current = currentRaw.trimStart();
            return { before, current, lastComma };
        };

        const getTokenCandidates = (prefixLower) => {
            if (!filterIndex) filterIndex = buildFilterIndex();
            const results = [];
            // Heroes: label is hero name
            (filterIndex.heroes || []).forEach(h => {
                const label = (h || '').toString();
                if (!label) return;
                if (label.toLowerCase().startsWith(prefixLower)) {
                    results.push({ label, detail: 'Hero', insert: label });
                }
            });
            // Factions: show displayName (and filename as muted detail), match displayName OR filename
            (filterIndex.factionEntries || []).forEach(f => {
                if (!f.displayName && !f.filename) return;
                const match = f.displayLower.startsWith(prefixLower) || f.filenameLower.startsWith(prefixLower);
                if (match) {
                    const label = f.displayName || f.filename;
                    const detail = f.displayName && f.filename ? f.filename : 'Faction';
                    results.push({ label, detail, insert: label });
                }
            });
            // Sort by label length then alpha
            results.sort((a, b) => (a.label.length - b.label.length) || a.label.localeCompare(b.label));
            return results;
        };

        const hideSuggestions = () => {
            if (!suggestionsEl) return;
            suggestionsEl.style.display = 'none';
            suggestionsEl.innerHTML = '';
        };

        const showSuggestions = (items, beforePart) => {
            if (!suggestionsEl) return;
            suggestionsEl.innerHTML = '';
            const max = Math.min(items.length, 8);
            for (let i = 0; i < max; i++) {
                const item = items[i];
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'events-search-suggestion';
                btn.innerHTML = `<span>${item.label}</span><span class="muted">${item.detail || ''}</span>`;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const before = (beforePart || '').trim();
                    const nextValue = before ? `${before}, ${item.insert}, ` : `${item.insert}, `;
                    filtersInput.value = nextValue;
                    filtersInput.classList.remove('no-filter-match');
                    hideSuggestions();
                    filtersInput.focus();
                    applySearch();
                });
                suggestionsEl.appendChild(btn);
            }
            suggestionsEl.style.display = max > 0 ? 'block' : 'none';
        };

        const updateFilterPredictions = () => {
            if (!filtersInput) return;
            // Rebuild index if data arrived after init
            if (!filterIndex || (filterIndex.heroes?.length === 0 && (this.eventManager.heroes || []).length > 0)) {
                filterIndex = buildFilterIndex();
            }
            const { before, current } = getCurrentTokenInfo();
            const prefix = (current || '').trim();
            if (!prefix) {
                filtersInput.classList.remove('no-filter-match');
                hideSuggestions();
                return;
            }
            const candidates = getTokenCandidates(prefix.toLowerCase());
            if (candidates.length === 0) {
                filtersInput.classList.add('no-filter-match');
                hideSuggestions();
            } else {
                filtersInput.classList.remove('no-filter-match');
                showSuggestions(candidates, before);
            }
        };

        const applySearch = () => {
            this.eventManager.searchQuery = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
            const filterText = (filtersInput && filtersInput.value) ? filtersInput.value.trim() : '';
            const { matchedHeroes, matchedFactions } = parseFilterTokens(filterText);
            this.eventManager.searchHeroFilters = matchedHeroes;
            this.eventManager.searchFactionFilters = matchedFactions;
            if (this.eventManager.applySearchAndRender) {
                this.eventManager.applySearchAndRender();
            }
        };

        const applyPerPageSettings = () => {
            if (!this.eventManager) return;
            const showAll = !!(showAllCheckbox && showAllCheckbox.checked);
            this.eventManager.showAllEventsInManager = showAll;
            if (perPageInput) {
                perPageInput.disabled = showAll;
                perPageInput.style.opacity = showAll ? '0.5' : '';
                perPageInput.style.cursor = showAll ? 'not-allowed' : '';
            }
            if (!showAll && perPageInput) {
                const value = parseInt(perPageInput.value, 10);
                if (value && value > 0) {
                    this.eventManager.eventsPerPageSetting = value;
                }
            }
            this.eventManager.currentPage = 1;
            if (this.eventManager.renderEvents) {
                this.eventManager.renderEvents();
            }
        };

        searchInput.addEventListener('input', applySearch);
        searchInput.addEventListener('change', applySearch);
        filtersInput.addEventListener('input', () => {
            updateFilterPredictions();
            applySearch();
        });
        filtersInput.addEventListener('change', () => {
            updateFilterPredictions();
            applySearch();
        });
        filtersInput.addEventListener('keydown', (e) => {
            // ESC hides suggestions quickly
            if (e.key === 'Escape') {
                hideSuggestions();
            }
        });
        document.addEventListener('click', (e) => {
            if (!suggestionsEl) return;
            if (e.target === filtersInput || suggestionsEl.contains(e.target)) return;
            hideSuggestions();
        });
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('filterClear');
                }
                searchInput.value = '';
                filtersInput.value = '';
                filtersInput.classList.remove('no-filter-match');
                hideSuggestions();
                this.eventManager.searchQuery = '';
                this.eventManager.searchHeroFilters = [];
                this.eventManager.searchFactionFilters = [];
                if (this.eventManager.applySearchAndRender) {
                    this.eventManager.applySearchAndRender();
                }
            });
        }

        // Per-page controls
        if (perPageInput) {
            // Initialize from EventManager state
            perPageInput.value = (this.eventManager.eventsPerPageSetting || this.eventManager.eventsPerPage || 50).toString();
            perPageInput.addEventListener('input', applyPerPageSettings);
            perPageInput.addEventListener('change', applyPerPageSettings);
        }
        if (showAllCheckbox) {
            showAllCheckbox.checked = !!this.eventManager.showAllEventsInManager;
            showAllCheckbox.addEventListener('change', (e) => {
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('filterConfirm');
                }
                applyPerPageSettings(e);
            });
        }
        applyPerPageSettings();

        // Initial prediction state
        updateFilterPredictions();
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventListenerService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventListenerService = new EventListenerService();
}
