/**
 * ComponentLoadLogicHelpers - Component-specific loading/unloading logic
 * Extracted from ComponentLoaderService to reduce file size
 */

/**
 * Load palette component
 */
export async function loadPaletteLogic({ paletteService, createGlobeControlButton, loadSoundEffect, statusService }) {
    // Add palette button using helper
    createGlobeControlButton({
        id: 'colorPaletteToggle',
        className: '',
        title: 'Toggle Color Palette',
        label: 'Palette',
        iconPath: 'assets/images/icons/Palette Icon.png',
        iconAlt: 'Color Palette',
        parentId: 'headerHubRight',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 50,
        iconSpanId: 'colorPaletteIcon'
    }, statusService);
    
    // Load palette sound effect using helper
    loadSoundEffect('colorChange', 'assets/audio/sfx/Color Change.mp3', statusService);
    
    paletteService.setupToggle();
}

/**
 * Unload palette component
 */
export async function unloadPaletteLogic({ removeElementById, paletteService, statusService }) {
    // Remove palette button using helper
    removeElementById('colorPaletteToggle', 'Palette button removed', statusService);
    
    paletteService.paletteToggleSetup = false;
}

/**
 * Load globe base component
 */
export async function loadGlobeBaseLogic({ setupGlobeContainer, removeEventMarkersIfNeeded, makeGlobeContainerVisible, statusService, isRunOperation, loadedComponents }) {
    // Setup container using helper
    const container = setupGlobeContainer(statusService);

    if (typeof window !== 'undefined' && window.TimelineInlineLoad?.isTimelineInlineLoadActive?.() && container) {
        window.TimelineInlineLoad.showGlobeInlineLoader(container);
    }
    
    statusService.update('Loading GlobeController module...', 'info');
    const { GlobeController } = await import('../../controllers/GlobeController.js');
    
    statusService.update('Initializing GlobeController...', 'info');
    const controller = new GlobeController();
    window.globeController = controller;
    
    statusService.update('Initializing globe scene...', 'info');
    await controller.init();
    
    // Remove event markers if needed using helper
    removeEventMarkersIfNeeded(controller, loadedComponents.events, statusService);
    
    // Make container visible if not in run operation
    if (!isRunOperation() && container) {
        makeGlobeContainerVisible(container, statusService);
    }
}

/**
 * Unload globe base component
 */
export async function unloadGlobeBaseLogic({ disposeGlobeResources, unloadTransport, unloadControls, unloadEvents, statusService, loadedComponents, preserveEventsUi = false }) {
    // Dispose Three.js resources using helper
    disposeGlobeResources(statusService);
    
    // Unload dependent components
    if (loadedComponents.transport) {
        await unloadTransport();
    }
    if (loadedComponents.controls) {
        if (!preserveEventsUi) {
            await unloadControls();
        } else {
            // Keep Map/Globe, rotation, and exit in the DOM (Codex) but force controls to reload
            // when the timeline is restored so listeners bind to the new GlobeController.
            loadedComponents.controls = false;
        }
    }
    if (!preserveEventsUi && loadedComponents.events) {
        await unloadEvents();
    }
}

/**
 * Load transport component
 */
export async function loadTransportLogic({ createGlobeControlButton, loadSoundEffect, statusService }) {
    const controller = window.globeController;
    
    // Add transport toggle using helper
    createGlobeControlButton({
        id: 'hyperloopToggle',
        className: 'active',
        title: 'Toggle Transport Systems',
        label: 'Vehicles',
        iconPath: 'assets/images/icons/Train Icon.png',
        iconAlt: 'Transport',
        iconSpanId: 'hyperloopIcon',
        parentId: 'headerHubRight',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 40,
        mobileParentId: 'dockGlobeRailLeft',
        mobileBaseClass: 'globe-control-btn',
        mobileClassName: 'hyperloop-btn dock-globe-rail__btn'
    }, statusService);

    createGlobeControlButton({
        id: 'weatherEffectsToggle',
        className: 'active',
        title: 'Toggle weather',
        label: 'Weather',
        iconPath: 'assets/images/icons/Weather Icon.png',
        iconAlt: 'Weather',
        iconSpanId: 'weatherEffectsIcon',
        parentId: 'headerHubRight',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 45,
        mobileParentId: 'dockGlobeRailLeft',
        mobileBaseClass: 'globe-control-btn',
        mobileClassName: 'weather-effects-btn dock-globe-rail__btn'
    }, statusService);
    
    if (controller.uiView) {
        controller.uiView.setupHyperloopToggle(() => {
            if (typeof controller.onHyperloopToggled === 'function') {
                controller.onHyperloopToggled();
            } else {
                controller.transportView.updateHyperloopVisibility();
            }
        });
        controller.uiView.setupWeatherEffectsToggle(() => {
            if (controller.globeView) {
                controller.globeView.setWeatherEffectsVisible(controller.sceneModel.getGlobeWeatherEffectsVisible());
            }
        });
        statusService.update('✓ Transport & weather toggles initialized', 'success');
    }
    
    // Load transport sound effect using helper
    loadSoundEffect('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3', statusService);
    loadSoundEffect('weather', 'assets/audio/sfx/Weather.mp3', statusService);
    
    if (controller.transportView) {
        controller.transportView.updateHyperloopVisibility();
    }
}

/**
 * Unload transport component
 */
export async function unloadTransportLogic({ removeElementById, statusService }) {
    removeElementById('hyperloopToggle', 'Transport toggle removed', statusService);
    removeElementById('weatherEffectsToggle', 'Weather toggle removed', statusService);
}

/**
 * Load controls component
 */
export async function loadControlsLogic({ createGlobeControlButton, createExitButton, loadSoundEffect, overlayService, statusService }) {
    const controller = window.globeController;
    
    // Add rotation toggle using helper
    createGlobeControlButton({
        id: 'autoRotateToggle',
        className: 'header-subbar-btn',
        title: 'Toggle Auto-Rotation',
        label: 'Rotation',
        iconPath: 'assets/images/icons/Rotation Icon.png',
        iconAlt: 'Rotate',
        iconSpanId: 'rotateIcon',
        parentId: 'headerRotateSubBarInner',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 40,
        mobileParentId: 'dockGlobeRailRight',
        mobileBaseClass: 'globe-control-btn',
        mobileClassName: 'dock-globe-rail__btn'
    }, statusService);

    createGlobeControlButton({
        id: 'mapViewToggle',
        className: '',
        title: 'Toggle Map View',
        label: 'Map',
        iconPath: 'assets/images/icons/Switch to Globe Icon.png',
        iconAlt: 'Globe',
        iconSpanId: 'mapViewToggleIcon',
        parentId: 'headerHubMapStack',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 30,
        mobileParentId: 'dockGlobeRailRight',
        mobileBaseClass: 'globe-control-btn',
        mobileClassName: 'dock-globe-rail__btn'
    }, statusService);
    
    // Add exit button using helper
    createExitButton({
        overlayService: overlayService,
        statusService: statusService
    });
    
    if (controller.uiView) {
        controller.uiView.setupAutoRotateToggle();
        if (typeof controller.uiView.setupMapViewToggle === 'function') {
            controller.uiView.setupMapViewToggle();
        }
        statusService.update('✓ Rotation toggle initialized', 'success');
    }
    
    // Load rotation sound effect using helper
    loadSoundEffect('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3', statusService);
    // Load map switch sound effect using helper
    loadSoundEffect('switchMap', 'assets/audio/sfx/Switch Map.mp3', statusService);
}

/**
 * Unload controls component
 */
export async function unloadControlsLogic({ removeElementsByIds, statusService }) {
    // Remove control buttons using helper
    removeElementsByIds([
        { id: 'autoRotateToggle', message: 'Rotation toggle removed' },
        { id: 'mapViewToggle', message: 'Map view toggle removed' },
        { id: 'exitButton', message: 'Exit button removed' }
    ], statusService);
}

/**
 * Load music component
 */
export async function loadMusicLogic({ createGlobeControlButton, createMusicPanel, createBackgroundMusicElement, loadSoundEffect, initializeMusicManager, statusService }) {
    // Add music toggle button using helper
    createGlobeControlButton({
        id: 'musicToggle',
        className: '',
        title: 'Music Options',
        label: 'Music',
        iconPath: 'assets/images/icons/Music Icon.png',
        iconAlt: 'Music',
        parentId: 'headerHubRight',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 60
    }, statusService);
    
    // Create music panel using helper
    createMusicPanel(statusService);
    
    // Create audio element using helper
    createBackgroundMusicElement(statusService);
    
    // Load music sound effect using helper
    loadSoundEffect('music', 'assets/audio/sfx/Music.mp3', statusService);
    
    // Initialize MusicManager using helper
    initializeMusicManager(statusService);
}

/**
 * Unload music component
 */
export async function unloadMusicLogic({ removeElementsByIds, statusService }) {
    // Remove music components using helper
    removeElementsByIds([
        { id: 'musicToggle', message: 'Music button removed' },
        { id: 'musicPanel', message: 'Music panel removed' }
    ], statusService);
    
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
    }
}

/**
 * Load events component
 */
export async function loadEventsLogic({ initializeEventManager, createGlobeControlButton, createEventPagination, createFiltersPanel, verifyEventPanels, loadEventSoundEffects, initializeFilterPanel, setupEventManagerListeners, syncEventsWithGlobe, loadSoundEffect, statusService }) {
    // Initialize EventManager using helper
    await initializeEventManager(statusService);
    
    // Add filter and event manager buttons using helper
    createGlobeControlButton({
        id: 'filtersToggle',
        className: '',
        title: 'Open Filters',
        label: 'Filters',
        iconPath: 'assets/images/icons/Filter Icon.png',
        iconAlt: 'Filters',
        parentId: 'headerHub',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 20
    }, statusService);
    
    createGlobeControlButton({
        id: 'eventsManageToggle',
        className: '',
        title: 'Manage Events',
        label: 'Events',
        iconPath: 'assets/images/icons/Event Manager Icon.png',
        iconAlt: 'Event Manager',
        parentId: 'headerHub',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 10
    }, statusService);

    createGlobeControlButton({
        id: 'codexToggle',
        className: '',
        title: 'Open Codex',
        label: 'Codex',
        iconPath: 'assets/images/icons/Codex%20Icon.png',
        iconAlt: 'Codex',
        parentId: 'headerHub',
        baseClass: 'header-hub-btn header-hub-btn--icon',
        headerOrder: 15
    }, statusService);
    
    // Create event pagination using helper
    createEventPagination(statusService);
    
    // Create filters panel using helper
    createFiltersPanel(statusService);
    
    // Verify event panels exist using helper
    verifyEventPanels(statusService);
    
    // Load event sound effects using helper
    loadEventSoundEffects(loadSoundEffect, statusService);
    
    // Initialize filter panel using helper
    initializeFilterPanel(statusService);
    
    // Setup event manager listeners using helper
    if (window.eventManager) {
        setupEventManagerListeners(window.eventManager, statusService);
    }
    
    // Final sync with globe (after all UI is set up) using helper
    if (window.globeController && window.eventManager) {
        syncEventsWithGlobe(window.globeController, window.eventManager, statusService);
    }
}

/**
 * Unload events component
 */
export async function unloadEventsLogic({ removeElementsByIds, statusService }) {
    // Remove event UI components using helper
    removeElementsByIds([
        { id: 'filtersToggle', message: 'Filter button removed' },
        { id: 'eventsManageToggle', message: 'Event manager button removed' },
        { id: 'codexToggle', message: 'Codex button removed' },
        { id: 'eventPagination', message: 'Event pagination removed' },
        { id: 'filtersPanel', message: null, checkParent: true }
    ], statusService);
    
    if (window.eventManager) {
        window.eventManager.listenersSetup = false;
    }
}

/**
 * Load menu component
 */
export async function loadMenuLogic({ isTestPage, removeOldTestButtons, createMenuButtonsContainer, appendMenuButtons, finalizeMenuLoad, statusService, buttonStateService, setLoaded }) {
    // Check if we're on test page and remove old test buttons
    const testPage = isTestPage();
    if (testPage) {
        removeOldTestButtons(statusService);
    }
    
    // Create menu buttons using helper
    const menuButtons = createMenuButtonsContainer(statusService);
    
    // Append menu buttons using helper
    appendMenuButtons(menuButtons, testPage, statusService);
    
    // Finalize menu load
    finalizeMenuLoad(setLoaded, buttonStateService, statusService);
}

/**
 * Unload menu component
 */
export async function unloadMenuLogic({ statusService }) {
    // Try to find menu buttons in test-container, content, or body
    const testContainer = document.querySelector('.test-container');
    const contentContainer = document.getElementById('content');
    const searchContainer = testContainer || contentContainer || document.body;
    
    if (searchContainer) {
        const menuButtons = searchContainer.querySelector('.main-menu-buttons');
        if (menuButtons) {
            menuButtons.remove();
            statusService.update('✓ Menu buttons removed', 'success');
        }
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.ComponentLoadLogicHelpers) {
        window.ComponentLoadLogicHelpers = {};
    }
    window.ComponentLoadLogicHelpers.loadPaletteLogic = loadPaletteLogic;
    window.ComponentLoadLogicHelpers.unloadPaletteLogic = unloadPaletteLogic;
    window.ComponentLoadLogicHelpers.loadGlobeBaseLogic = loadGlobeBaseLogic;
    window.ComponentLoadLogicHelpers.unloadGlobeBaseLogic = unloadGlobeBaseLogic;
    window.ComponentLoadLogicHelpers.loadTransportLogic = loadTransportLogic;
    window.ComponentLoadLogicHelpers.unloadTransportLogic = unloadTransportLogic;
    window.ComponentLoadLogicHelpers.loadControlsLogic = loadControlsLogic;
    window.ComponentLoadLogicHelpers.unloadControlsLogic = unloadControlsLogic;
    window.ComponentLoadLogicHelpers.loadMusicLogic = loadMusicLogic;
    window.ComponentLoadLogicHelpers.unloadMusicLogic = unloadMusicLogic;
    window.ComponentLoadLogicHelpers.loadEventsLogic = loadEventsLogic;
    window.ComponentLoadLogicHelpers.unloadEventsLogic = unloadEventsLogic;
    window.ComponentLoadLogicHelpers.loadMenuLogic = loadMenuLogic;
    window.ComponentLoadLogicHelpers.unloadMenuLogic = unloadMenuLogic;
}
