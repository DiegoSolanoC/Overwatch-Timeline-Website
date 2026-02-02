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
        this.eventManager.listenersSetup = true;
        console.log('EventListenerService: All listeners set up successfully');
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
