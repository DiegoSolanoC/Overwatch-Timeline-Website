/**
 * ComponentLoaderService - Handles loading and unloading of individual components
 */
// Use global helpers if available (for script tag loading), otherwise use imports
const createGlobeControlButton = (typeof window !== 'undefined' && window.ServiceLoadHelpers?.createGlobeControlButton) 
    ? window.ServiceLoadHelpers.createGlobeControlButton 
    : (config, statusService) => {
        // Fallback implementation if helpers not loaded
        if (document.getElementById(config.id)) {
            return document.getElementById(config.id);
        }
        const button = document.createElement('button');
        button.id = config.id;
        button.className = `globe-control-btn ${config.className || ''}`;
        button.title = config.title;
        button.innerHTML = `<span id="${config.id}Icon"><img src="${config.iconPath}" alt="${config.iconAlt}" style="width: 100%; height: 100%; object-fit: contain;"></span>`;
        const parent = document.getElementById(config.parentId || 'content');
        if (parent) {
            parent.appendChild(button);
            if (statusService) statusService.update(`✓ ${config.title} button added`, 'success');
        }
        return button;
    };

const loadSoundEffect = (typeof window !== 'undefined' && window.ServiceLoadHelpers?.loadSoundEffect)
    ? window.ServiceLoadHelpers.loadSoundEffect
    : (soundName, soundPath, statusService) => {
        if (window.SoundEffectsManager) {
            if (statusService) statusService.update(`Loading ${soundName} sound effect...`, 'info');
            window.SoundEffectsManager.loadSound(soundName, soundPath);
            if (statusService) statusService.update(`✓ ${soundName} sound effect loaded`, 'success');
            return true;
        }
        return false;
    };

const requireGlobeBase = (typeof window !== 'undefined' && window.ServiceLoadHelpers?.requireGlobeBase)
    ? window.ServiceLoadHelpers.requireGlobeBase
    : (loadedComponents, buttonId, statusService, buttonStateService) => {
        if (!loadedComponents?.globeBase || !window.globeController) {
            if (statusService) statusService.update('⚠ Globe base must be loaded first!', 'error');
            if (buttonId && buttonStateService) buttonStateService.setState(buttonId, 'error');
            return false;
        }
        return true;
    };

const removeElementById = (typeof window !== 'undefined' && window.ServiceUnloadHelpers?.removeElementById)
    ? window.ServiceUnloadHelpers.removeElementById
    : (elementId, statusMessage, statusService, checkParent = false) => {
        const element = document.getElementById(elementId);
        if (!element || (checkParent && !element.parentElement)) return false;
        element.remove();
        if (statusMessage && statusService) statusService.update(`✓ ${statusMessage}`, 'success');
        return true;
    };

const removeElementsByIds = (typeof window !== 'undefined' && window.ServiceUnloadHelpers?.removeElementsByIds)
    ? window.ServiceUnloadHelpers.removeElementsByIds
    : (elements, statusService) => {
        let count = 0;
        elements.forEach(({ id, message, checkParent = false }) => {
            if (removeElementById(id, message, statusService, checkParent)) count++;
        });
        return count;
    };

// Panel creation helpers
const createMusicPanel = (typeof window !== 'undefined' && window.ServicePanelHelpers?.createMusicPanel)
    ? window.ServicePanelHelpers.createMusicPanel
    : (statusService) => {
        if (document.getElementById('musicPanel')) return document.getElementById('musicPanel');
        // Fallback implementation would go here - keeping it minimal
        return null;
    };

const createFiltersPanel = (typeof window !== 'undefined' && window.ServicePanelHelpers?.createFiltersPanel)
    ? window.ServicePanelHelpers.createFiltersPanel
    : (statusService) => {
        if (document.getElementById('filtersPanel')) return document.getElementById('filtersPanel');
        return null;
    };

const createEventPagination = (typeof window !== 'undefined' && window.ServicePanelHelpers?.createEventPagination)
    ? window.ServicePanelHelpers.createEventPagination
    : (statusService) => {
        if (document.getElementById('eventPagination')) return document.getElementById('eventPagination');
        return null;
    };

const createBackgroundMusicElement = (typeof window !== 'undefined' && window.ServicePanelHelpers?.createBackgroundMusicElement)
    ? window.ServicePanelHelpers.createBackgroundMusicElement
    : (statusService) => {
        if (document.getElementById('backgroundMusic')) return document.getElementById('backgroundMusic');
        const audio = document.createElement('audio');
        audio.id = 'backgroundMusic';
        audio.loop = true;
        document.body.appendChild(audio);
        if (statusService) statusService.update('✓ Audio element added', 'success');
        return audio;
    };

// EventManager initialization helper
const initializeEventManager = (typeof window !== 'undefined' && window.ServiceEventManagerHelpers?.initializeEventManager)
    ? window.ServiceEventManagerHelpers.initializeEventManager
    : async (statusService) => {
        // Fallback - basic implementation
        if (typeof EventManager === 'undefined') {
            throw new Error('EventManager class not available');
        }
        const eventManager = new EventManager();
        await eventManager.init();
        window.eventManager = eventManager;
        return eventManager;
    };

// Wrapper helpers
const withLoadWrapper = (typeof window !== 'undefined' && window.ServiceWrapperHelpers?.withLoadWrapper)
    ? window.ServiceWrapperHelpers.withLoadWrapper
    : async (loadFn, params) => {
        // Fallback - execute function directly
        await loadFn();
    };

const withUnloadWrapper = (typeof window !== 'undefined' && window.ServiceWrapperHelpers?.withUnloadWrapper)
    ? window.ServiceWrapperHelpers.withUnloadWrapper
    : async (unloadFn, params) => {
        // Fallback - execute function directly
        await unloadFn();
    };

const checkAlreadyLoaded = (typeof window !== 'undefined' && window.ServiceWrapperHelpers?.checkAlreadyLoaded)
    ? window.ServiceWrapperHelpers.checkAlreadyLoaded
    : (isLoaded, componentName, statusService) => {
        if (isLoaded) {
            if (statusService) statusService.update(`→ ${componentName} already loaded!`, 'info');
            return true;
        }
        return false;
    };

// Exit button helper
const createExitButton = (typeof window !== 'undefined' && window.ServiceExitButtonHelpers?.createExitButton)
    ? window.ServiceExitButtonHelpers.createExitButton
    : ({ overlayService, statusService }) => {
        // Fallback - minimal implementation
        if (document.getElementById('exitButton')) return document.getElementById('exitButton');
        return null;
    };

// Globe base helpers
const setupGlobeContainer = (typeof window !== 'undefined' && window.ServiceGlobeBaseHelpers?.setupGlobeContainer)
    ? window.ServiceGlobeBaseHelpers.setupGlobeContainer
    : (statusService) => document.getElementById('globe-container');

const makeGlobeContainerVisible = (typeof window !== 'undefined' && window.ServiceGlobeBaseHelpers?.makeGlobeContainerVisible)
    ? window.ServiceGlobeBaseHelpers.makeGlobeContainerVisible
    : (container, statusService) => {
        if (container) {
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
            container.style.display = 'block';
            container.classList.add('loaded');
        }
    };

const removeEventMarkersIfNeeded = (typeof window !== 'undefined' && window.ServiceGlobeBaseHelpers?.removeEventMarkersIfNeeded)
    ? window.ServiceGlobeBaseHelpers.removeEventMarkersIfNeeded
    : (controller, eventsLoaded, statusService) => {
        // Fallback - do nothing
    };

const disposeGlobeResources = (typeof window !== 'undefined' && window.ServiceGlobeBaseHelpers?.disposeGlobeResources)
    ? window.ServiceGlobeBaseHelpers.disposeGlobeResources
    : (statusService) => {
        // Fallback - basic cleanup
        if (window.globeController) {
            if (window.globeController.animationId) {
                cancelAnimationFrame(window.globeController.animationId);
            }
            window.globeController = null;
        }
    };

// Event panel helpers
const verifyEventPanels = (typeof window !== 'undefined' && window.ServiceEventPanelHelpers?.verifyEventPanels)
    ? window.ServiceEventPanelHelpers.verifyEventPanels
    : (statusService) => {
        // Fallback - do nothing
    };

const setupEventManagerListeners = (typeof window !== 'undefined' && window.ServiceEventPanelHelpers?.setupEventManagerListeners)
    ? window.ServiceEventPanelHelpers.setupEventManagerListeners
    : (eventManager, statusService) => {
        // Fallback - do nothing
    };

const syncEventsWithGlobe = (typeof window !== 'undefined' && window.ServiceEventPanelHelpers?.syncEventsWithGlobe)
    ? window.ServiceEventPanelHelpers.syncEventsWithGlobe
    : (globeController, eventManager, statusService) => {
        // Fallback - basic sync
        if (globeController && eventManager) {
            globeController.dataModel.events = [...eventManager.events];
        }
    };

// Menu helpers
const isGitHubPages = (typeof window !== 'undefined' && window.ServiceMenuHelpers?.isGitHubPages)
    ? window.ServiceMenuHelpers.isGitHubPages
    : () => {
        const hostname = window.location.hostname;
        return hostname.includes('github.io') || hostname.includes('github.com') || (hostname === 'localhost' && window.location.port === '');
    };

const removeOldTestButtons = (typeof window !== 'undefined' && window.ServiceMenuHelpers?.removeOldTestButtons)
    ? window.ServiceMenuHelpers.removeOldTestButtons
    : (statusService) => {
        // Fallback - do nothing
    };

const createMenuButtonsContainer = (typeof window !== 'undefined' && window.ServiceMenuHelpers?.createMenuButtonsContainer)
    ? window.ServiceMenuHelpers.createMenuButtonsContainer
    : (statusService) => {
        // Fallback - minimal implementation
        const menuButtons = document.createElement('div');
        menuButtons.className = 'main-menu-buttons';
        return menuButtons;
    };

const appendMenuButtons = (typeof window !== 'undefined' && window.ServiceMenuHelpers?.appendMenuButtons)
    ? window.ServiceMenuHelpers.appendMenuButtons
    : (menuButtons, isTestPage, statusService) => {
        // Fallback - append to body
        document.body.appendChild(menuButtons);
    };

const isTestPage = (typeof window !== 'undefined' && window.ServiceMenuHelpers?.isTestPage)
    ? window.ServiceMenuHelpers.isTestPage
    : () => {
        const existingGlobeBtn = document.getElementById('runGlobeBtn');
        return existingGlobeBtn && existingGlobeBtn.classList.contains('test-run-button');
    };

// Event sound helpers
const loadEventSoundEffects = (typeof window !== 'undefined' && window.ServiceEventSoundHelpers?.loadEventSoundEffects)
    ? window.ServiceEventSoundHelpers.loadEventSoundEffects
    : (loadSoundEffect, statusService) => {
        // Fallback - do nothing
    };

const initializeFilterPanel = (typeof window !== 'undefined' && window.ServiceEventSoundHelpers?.initializeFilterPanel)
    ? window.ServiceEventSoundHelpers.initializeFilterPanel
    : (statusService) => {
        // Fallback - do nothing
    };

// Music manager helpers
const initializeMusicManager = (typeof window !== 'undefined' && window.ServiceMusicManagerHelpers?.initializeMusicManager)
    ? window.ServiceMusicManagerHelpers.initializeMusicManager
    : (statusService) => {
        // Fallback - do nothing
    };

// Menu load helpers
const checkMenuAlreadyLoaded = (typeof window !== 'undefined' && window.ServiceMenuLoadHelpers?.checkMenuAlreadyLoaded)
    ? window.ServiceMenuLoadHelpers.checkMenuAlreadyLoaded
    : (isLoaded, isRunOperation, overlayService, statusService) => {
        if (isLoaded) {
            if (statusService) statusService.update('✓ Menu components already loaded!', 'success');
            return true;
        }
        return false;
    };

const handleExistingMenuButtons = (typeof window !== 'undefined' && window.ServiceMenuLoadHelpers?.handleExistingMenuButtons)
    ? window.ServiceMenuLoadHelpers.handleExistingMenuButtons
    : (statusService, buttonStateService, setLoaded) => {
        return false;
    };

const finalizeMenuLoad = (typeof window !== 'undefined' && window.ServiceMenuLoadHelpers?.finalizeMenuLoad)
    ? window.ServiceMenuLoadHelpers.finalizeMenuLoad
    : (setLoaded, buttonStateService, statusService) => {
        setLoaded(true);
    };

// Helper factory
const createLoadParams = (typeof window !== 'undefined' && window.ServiceHelperFactory?.createLoadParams)
    ? window.ServiceHelperFactory.createLoadParams
    : (service, componentName, buttonId, setLoaded) => ({
        componentName,
        buttonId,
        isRunOperation: service.isRunOperation(),
        overlayService: service.overlayService,
        buttonStateService: service.buttonStateService,
        statusService: service.statusService,
        setLoaded
    });

const createUnloadParams = (typeof window !== 'undefined' && window.ServiceHelperFactory?.createUnloadParams)
    ? window.ServiceHelperFactory.createUnloadParams
    : (service, componentName, buttonId, setLoaded) => ({
        componentName,
        buttonId,
        buttonStateService: service.buttonStateService,
        statusService: service.statusService,
        setLoaded
    });

class ComponentLoaderService {
    constructor(overlayService, statusService, buttonStateService, paletteService) {
        this.overlayService = overlayService;
        this.statusService = statusService;
        this.buttonStateService = buttonStateService;
        this.paletteService = paletteService;
        this.loadedComponents = {
            palette: false,
            music: false,
            menu: false,
            globeBase: false,
            transport: false,
            controls: false,
            events: false,
            glossary: false,
            biography: false
        };
        
        // Expose loadedComponents globally for backward compatibility
        if (typeof window !== 'undefined') {
            window.loadedComponents = this.loadedComponents;
        }
    }

    isRunOperation() {
        return this.overlayService.isRunOperation;
    }

    isLoaded(component) {
        return this.loadedComponents[component] || false;
    }

    setLoaded(component, value) {
        this.loadedComponents[component] = value;
    }

    async loadPalette() {
        if (checkAlreadyLoaded(this.loadedComponents.palette, 'Palette', this.statusService)) {
            return;
        }
        
        await withLoadWrapper(async () => {
            // Add palette button using helper
            createGlobeControlButton({
                id: 'colorPaletteToggle',
                className: 'color-palette-btn bottom-right-btn',
                title: 'Toggle Color Palette',
                iconPath: 'assets/images/icons/Palette Icon.png',
                iconAlt: 'Color Palette'
            }, this.statusService);
            
            // Load palette sound effect using helper
            loadSoundEffect('colorChange', 'assets/audio/sfx/Color Change.mp3', this.statusService);
            
            this.paletteService.setupToggle();
        }, createLoadParams(this, 'Palette', 'loadPaletteBtn', (value) => { this.loadedComponents.palette = value; }));
    }

    async unloadPalette() {
        if (!this.loadedComponents.palette) {
            this.statusService.update('Palette not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Remove palette button using helper
            removeElementById('colorPaletteToggle', 'Palette button removed', this.statusService);
            
            this.paletteService.paletteToggleSetup = false;
        }, createUnloadParams(this, 'Palette', 'loadPaletteBtn', (value) => { this.loadedComponents.palette = value; }));
    }

    async loadGlobeBase() {
        if (this.loadedComponents.globeBase) {
            await this.unloadGlobeBase();
            return;
        }
        
        await withLoadWrapper(async () => {
            // Setup container using helper
            const container = setupGlobeContainer(this.statusService);
            
            this.statusService.update('Loading GlobeController module...', 'info');
            const { GlobeController } = await import('../controllers/GlobeController.js');
            
            this.statusService.update('Initializing GlobeController...', 'info');
            const controller = new GlobeController();
            window.globeController = controller;
            
            this.statusService.update('Initializing globe scene...', 'info');
            await controller.init();
            
            // Remove event markers if needed using helper
            removeEventMarkersIfNeeded(controller, this.loadedComponents.events, this.statusService);
            
            // Make container visible if not in run operation
            if (!this.isRunOperation() && container) {
                makeGlobeContainerVisible(container, this.statusService);
            }
        }, {
            componentName: 'Globe Base',
            buttonId: 'loadGlobeBaseBtn',
            isRunOperation: this.isRunOperation(),
            overlayService: this.overlayService,
            buttonStateService: this.buttonStateService,
            statusService: this.statusService,
            setLoaded: (value) => { this.loadedComponents.globeBase = value; }
        });
    }

    async unloadGlobeBase() {
        if (!this.loadedComponents.globeBase) {
            this.statusService.update('Globe base not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Dispose Three.js resources using helper
            disposeGlobeResources(this.statusService);
            
            // Unload dependent components
            if (this.loadedComponents.transport) {
                await this.unloadTransport();
            }
            if (this.loadedComponents.controls) {
                await this.unloadControls();
            }
            if (this.loadedComponents.events) {
                await this.unloadEvents();
            }
        }, createUnloadParams(this, 'Globe Base', 'loadGlobeBaseBtn', (value) => { this.loadedComponents.globeBase = value; }));
    }

    async loadTransport() {
        if (checkAlreadyLoaded(this.loadedComponents.transport, 'Transport', this.statusService)) {
            return;
        }
        
        // Check globe base dependency using helper
        if (!requireGlobeBase(this.loadedComponents, 'loadTransportBtn', this.statusService, this.buttonStateService)) {
            return;
        }
        
        await withLoadWrapper(async () => {
            const controller = window.globeController;
            
            // Add transport toggle using helper
            createGlobeControlButton({
                id: 'hyperloopToggle',
                className: 'hyperloop-btn active',
                title: 'Toggle Transport Systems',
                iconPath: 'assets/images/icons/Train Icon.png',
                iconAlt: 'Transport'
            }, this.statusService);
            
            if (controller.uiView) {
                controller.uiView.setupHyperloopToggle(() => {
                    controller.transportView.updateHyperloopVisibility();
                });
                this.statusService.update('✓ Transport toggle initialized', 'success');
            }
            
            // Load transport sound effect using helper
            loadSoundEffect('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3', this.statusService);
            
            if (controller.transportView) {
                controller.transportView.updateHyperloopVisibility();
            }
        }, {
            componentName: 'Transport',
            buttonId: 'loadTransportBtn',
            isRunOperation: this.isRunOperation(),
            overlayService: this.overlayService,
            buttonStateService: this.buttonStateService,
            statusService: this.statusService,
            setLoaded: (value) => { this.loadedComponents.transport = value; }
        });
    }

    async unloadTransport() {
        if (!this.loadedComponents.transport) {
            this.statusService.update('Transport not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Remove transport toggle using helper
            removeElementById('hyperloopToggle', 'Transport toggle removed', this.statusService);
        }, createUnloadParams(this, 'Transport', 'loadTransportBtn', (value) => { this.loadedComponents.transport = value; }));
    }

    async loadControls() {
        if (checkAlreadyLoaded(this.loadedComponents.controls, 'Controls', this.statusService)) {
            return;
        }
        
        // Check globe base dependency using helper
        if (!requireGlobeBase(this.loadedComponents, 'loadControlsBtn', this.statusService, this.buttonStateService)) {
            return;
        }
        
        await withLoadWrapper(async () => {
            const controller = window.globeController;
            
            // Add rotation toggle using helper
            createGlobeControlButton({
                id: 'autoRotateToggle',
                className: '',
                title: 'Toggle Auto-Rotation',
                iconPath: 'assets/images/icons/Rotation Icon.png',
                iconAlt: 'Rotate'
            }, this.statusService);
            
            // Add exit button using helper
            createExitButton({
                overlayService: this.overlayService,
                statusService: this.statusService
            });
            
            if (controller.uiView) {
                controller.uiView.setupAutoRotateToggle();
                this.statusService.update('✓ Rotation toggle initialized', 'success');
            }
            
            // Load rotation sound effect using helper
            loadSoundEffect('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3', this.statusService);
        }, createLoadParams(this, 'Controls', 'loadControlsBtn', (value) => { this.loadedComponents.controls = value; }));
    }

    async unloadControls() {
        if (!this.loadedComponents.controls) {
            this.statusService.update('Controls not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Remove control buttons using helper
            removeElementsByIds([
                { id: 'autoRotateToggle', message: 'Rotation toggle removed' },
                { id: 'exitButton', message: 'Exit button removed' }
            ], this.statusService);
        }, createUnloadParams(this, 'Controls', 'loadControlsBtn', (value) => { this.loadedComponents.controls = value; }));
    }

    async loadMusic() {
        if (checkAlreadyLoaded(this.loadedComponents.music, 'Music', this.statusService)) {
            return;
        }
        
        await withLoadWrapper(async () => {
            // Add music toggle button using helper
            createGlobeControlButton({
                id: 'musicToggle',
                className: 'music-btn bottom-right-btn',
                title: 'Music Options',
                iconPath: 'assets/images/icons/Music Icon.png',
                iconAlt: 'Music'
            }, this.statusService);
            
            // Create music panel using helper
            createMusicPanel(this.statusService);
            
            // Create audio element using helper
            createBackgroundMusicElement(this.statusService);
            
            // Load music sound effect using helper
            loadSoundEffect('music', 'assets/audio/sfx/Music.mp3', this.statusService);
            
            // Initialize MusicManager using helper
            initializeMusicManager(this.statusService);
        }, createLoadParams(this, 'Music', 'loadMusicBtn', (value) => { this.loadedComponents.music = value; }));
    }

    async unloadMusic() {
        if (!this.loadedComponents.music) {
            this.statusService.update('Music not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Remove music components using helper
            removeElementsByIds([
                { id: 'musicToggle', message: 'Music button removed' },
                { id: 'musicPanel', message: 'Music panel removed' }
            ], this.statusService);
            
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio = null;
            }
        }, createUnloadParams(this, 'Music', 'loadMusicBtn', (value) => { this.loadedComponents.music = value; }));
    }

    async loadEvents() {
        if (checkAlreadyLoaded(this.loadedComponents.events, 'Events', this.statusService)) {
            return;
        }
        
        // Check globe base dependency using helper
        if (!requireGlobeBase(this.loadedComponents, 'loadEventsBtn', this.statusService, this.buttonStateService)) {
            return;
        }
        
        await withLoadWrapper(async () => {
            // Initialize EventManager using helper
            await initializeEventManager(this.statusService);
            
            // Add filter and event manager buttons using helper
            createGlobeControlButton({
                id: 'filtersToggle',
                className: 'filters-btn top-left-btn',
                title: 'Open Filters',
                iconPath: 'assets/images/icons/Filter Icon.png',
                iconAlt: 'Filters'
            }, this.statusService);
            
            createGlobeControlButton({
                id: 'eventsManageToggle',
                className: 'events-manage-btn top-left-btn',
                title: 'Manage Events',
                iconPath: 'assets/images/icons/Event Manager Icon.png',
                iconAlt: 'Event Manager'
            }, this.statusService);
            
            // Create event pagination using helper
            createEventPagination(this.statusService);
            
            // Create filters panel using helper
            createFiltersPanel(this.statusService);
            
            // Verify event panels exist using helper
            verifyEventPanels(this.statusService);
            
            // Load event sound effects using helper
            loadEventSoundEffects(loadSoundEffect, this.statusService);
            
            // Initialize filter panel using helper
            initializeFilterPanel(this.statusService);
            
            // Setup event manager listeners using helper
            if (window.eventManager) {
                setupEventManagerListeners(window.eventManager, this.statusService);
            }
            
            // Final sync with globe (after all UI is set up) using helper
            if (window.globeController && window.eventManager) {
                syncEventsWithGlobe(window.globeController, window.eventManager, this.statusService);
            }
        }, createLoadParams(this, 'Events', 'loadEventsBtn', (value) => { this.loadedComponents.events = value; }));
    }

    async unloadEvents() {
        if (!this.loadedComponents.events) {
            this.statusService.update('Events not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Remove event UI components using helper
            removeElementsByIds([
                { id: 'filtersToggle', message: 'Filter button removed' },
                { id: 'eventsManageToggle', message: 'Event manager button removed' },
                { id: 'eventPagination', message: 'Event pagination removed' },
                { id: 'filtersPanel', message: null, checkParent: true }
            ], this.statusService);
            
            if (window.eventManager) {
                window.eventManager.listenersSetup = false;
            }
        }, createUnloadParams(this, 'Events', 'loadEventsBtn', (value) => { this.loadedComponents.events = value; }));
    }

    async loadMenu() {
        if (checkMenuAlreadyLoaded(this.loadedComponents.menu, this.isRunOperation(), this.overlayService, this.statusService)) {
            return;
        }
        
        // Check if menu buttons container already exists
        if (handleExistingMenuButtons(this.statusService, this.buttonStateService, (value) => { this.loadedComponents.menu = value; })) {
            return;
        }
        
        // Check if we're on test page and remove old test buttons
        const testPage = isTestPage();
        if (testPage) {
            removeOldTestButtons(this.statusService);
        }
        
        // Create menu buttons using helper
        const menuButtons = createMenuButtonsContainer(this.statusService);
        
        // Append menu buttons using helper
        appendMenuButtons(menuButtons, testPage, this.statusService);
        
        // Finalize menu load
        finalizeMenuLoad((value) => { this.loadedComponents.menu = value; }, this.buttonStateService, this.statusService);
    }

    async unloadMenu() {
        if (!this.loadedComponents.menu) {
            this.statusService.update('Menu not loaded', 'info');
            return;
        }
        
        await withUnloadWrapper(async () => {
            // Try to find menu buttons in test-container, content, or body
            const testContainer = document.querySelector('.test-container');
            const contentContainer = document.getElementById('content');
            const searchContainer = testContainer || contentContainer || document.body;
            
            if (searchContainer) {
                const menuButtons = searchContainer.querySelector('.main-menu-buttons');
                if (menuButtons) {
                    menuButtons.remove();
                    this.statusService.update('✓ Menu buttons removed', 'success');
                }
            }
        }, createUnloadParams(this, 'Menu', 'loadMenuBtn', (value) => { this.loadedComponents.menu = value; }));
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ComponentLoaderService = ComponentLoaderService;
}
