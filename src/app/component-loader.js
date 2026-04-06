/**
 * Test Loader - Modular component loading for testing
 * Allows loading individual components (Globe, Music, Events) on demand
 * Note: Loading overlay, status, and button state management are now handled by managers
 */

import { showLoadingOverlay, hideLoadingOverlay, setRunOperation, getRunOperation } from '../managers/LoadingOverlayManager.js';
import { updateStatus, updateGlobeComponentsProgress, resetGlobeComponentsProgress } from '../managers/StatusManager.js';
import { setButtonState } from '../managers/ButtonStateManager.js';
import { setupPaletteToggle, resetPaletteToggleSetup } from '../managers/PaletteManager.js';
import { ComponentOrchestrator } from '../managers/ComponentOrchestrator.js';
import { withLoadWrapper, withUnloadWrapper, checkAlreadyLoaded, loadSoundEffect, loadSoundEffects, createGlobeControlButton } from './helpers/ComponentLoadHelpers.js';
import { getOrCreateElement, createMusicPanel, createFiltersPanel, createEventPagination } from './helpers/ComponentDOMHelpers.js';
import { initializeEventManager, setupEventManagerListeners, syncEventsWithGlobe, verifyEventPanels } from './helpers/EventManagerHelpers.js';
import { createMenuButtons, getOrCreateTestContainer } from './helpers/MenuHelpers.js';
import { setupAllEventListeners, createRunOperationHandler } from './helpers/EventListenerHelpers.js';
import { setupGlobeContainer, makeGlobeContainerVisible, hideGlobeContainer, stopGlobeAnimations, disposeThreeJSResources, importGlobeController, initializeGlobeController, removeEventMarkersIfNeeded } from './helpers/GlobeBaseHelpers.js';
import { requireGlobeBase } from './helpers/ComponentDependencyHelpers.js';
import { createExitButton } from './helpers/ControlsHelpers.js';
import { initializeMusicManager, createBackgroundMusicElement } from './helpers/MusicHelpers.js';
import { clearEventManager, removeAllEventMarkers } from './helpers/EventCleanupHelpers.js';
import { removeElementById, removeElementBySelector, removeElementsByIds } from './helpers/ComponentUnloadHelpers.js';
import { setupEventUIComponents, loadEventSoundEffects, initializeFilterPanel, setupEventListenersDelayed } from './helpers/EventsLoadHelpers.js';
import { createOrchestratorDelegations } from './helpers/ComponentOrchestratorDelegationHelpers.js';

// Track which components are loaded
const loadedComponents = {
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

// Local variable for isRunOperation (delegates to LoadingOverlayManager)
// We keep a local variable for direct access but sync with the manager
let isRunOperation = false;

// Helper function to sync isRunOperation with manager
function setIsRunOperation(value) {
    isRunOperation = value;
    setRunOperation(value);
}

/** Unload Palette (button, bg/texture switching, sound). */
async function unloadPalette() {
    if (!loadedComponents.palette) {
        updateStatus('Palette not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove palette button
        removeElementById('colorPaletteToggle', 'Palette button removed');
        
        // Reset palette toggle setup flag
        resetPaletteToggleSetup();
        
        loadedComponents.palette = false;
    }, 'Palette', 'loadPaletteBtn');
}

async function loadPalette() {
    if (checkAlreadyLoaded(loadedComponents.palette, 'Palette')) {
        return;
    }
    
    await withLoadWrapper(async () => {
        // Add palette button (if not already present)
        createGlobeControlButton({
            id: 'colorPaletteToggle',
            className: '',
            title: 'Toggle Color Palette',
            label: 'Palette',
            iconPath: 'assets/images/icons/Palette Icon.png',
            iconAlt: 'Color Palette',
            parentId: 'headerHubRight',
            baseClass: 'header-hub-btn header-hub-btn--icon',
            iconSpanId: 'colorPaletteIcon',
            headerOrder: 50
        });
        
        // Load palette sound effect
        loadSoundEffect('colorChange', 'assets/audio/sfx/Color Change.mp3', 'Loading palette sound effect...');
        
        // Setup palette toggle functionality
        setupPaletteToggle();
        
        loadedComponents.palette = true;
    }, 'Palette', 'loadPaletteBtn', isRunOperation);
}

/** Unload Globe Base (earth, starfield, scene, markers). */
async function unloadGlobeBase() {
    if (!loadedComponents.globeBase) {
        updateStatus('Globe base not loaded', 'info');
        return;
    }
    
    updateStatus('Unloading Globe Base...', 'info');
    
    try {
        // Stop animations and dispose resources using helpers
        stopGlobeAnimations();
        
        const container = document.getElementById('globe-container');
        if (container) {
            hideGlobeContainer(container);
        }
        
        disposeThreeJSResources();
        
        // Also unload dependent components
        if (loadedComponents.transport) {
            await unloadTransport();
        }
        if (loadedComponents.controls) {
            await unloadControls();
        }
        if (loadedComponents.events) {
            await unloadEvents();
        }
        
        loadedComponents.globeBase = false;
        setButtonState('loadGlobeBaseBtn', 'default');
        updateStatus('✓ Globe base components unloaded!', 'success');
    } catch (error) {
        console.error('Error unloading Globe Base:', error);
        updateStatus(`✗ Error unloading Globe Base: ${error.message}`, 'error');
    }
}

async function loadGlobeBase() {
    // If already loaded, unload it instead
    if (loadedComponents.globeBase) {
        await unloadGlobeBase();
        return;
    }
    
    // Only show overlay if not in a run operation (run operations handle their own overlay)
    if (!isRunOperation) {
        showLoadingOverlay();
    }
    setButtonState('loadGlobeBaseBtn', 'loading');
    updateStatus('Starting Globe Base load...', 'info');
    
    try {
        // Setup container for initialization using helper
        const container = document.getElementById('globe-container');
        if (container) {
            setupGlobeContainer(container);
        }
        
        // Import and initialize GlobeController using helpers
        const GlobeController = await importGlobeController();
        const controller = await initializeGlobeController(GlobeController);
        
        // Remove event markers if needed using helper
        removeEventMarkersIfNeeded(controller, loadedComponents.events);
        
        // Make globe container visible now that it's loaded (unless in a run operation)
        if (!isRunOperation && container) {
            makeGlobeContainerVisible(container);
        }
        
        loadedComponents.globeBase = true;
        setButtonState('loadGlobeBaseBtn', 'loaded');
        updateStatus('✓ Globe base components fully loaded!', 'success');
        
    } catch (error) {
        console.error('Error loading Globe Base:', error);
        updateStatus(`✗ Error loading Globe Base: ${error.message}`, 'error');
        setButtonState('loadGlobeBaseBtn', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

/** Unload Transport (vehicles, connections, toggle, sound). */
async function unloadTransport() {
    if (!loadedComponents.transport) {
        updateStatus('Transport not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove transport toggle button
        ['hyperloopToggle', 'weatherEffectsToggle'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        updateStatus('✓ Transport / weather toggles removed', 'success');

        loadedComponents.transport = false;
    }, 'Transport', 'loadTransportBtn');
}

async function loadTransport() {
    if (checkAlreadyLoaded(loadedComponents.transport, 'Transport')) {
        return;
    }
    
    // Globe base must be loaded first
    if (!requireGlobeBase('loadTransportBtn', loadedComponents)) {
        return;
    }
    
    await withLoadWrapper(async () => {
        const controller = window.globeController;
        
        // Add transport toggle (if not already present)
        createGlobeControlButton({
            id: 'hyperloopToggle',
            className: 'active',
            title: 'Toggle Transport Systems',
            label: 'Vehicles',
            iconPath: 'assets/images/icons/Train Icon.png',
            iconAlt: 'Transport',
            parentId: 'headerHubRight',
            baseClass: 'header-hub-btn header-hub-btn--icon',
            iconSpanId: 'hyperloopIcon',
            headerOrder: 40,
            mobileParentId: 'content',
            mobileBaseClass: 'globe-control-btn',
            mobileClassName: 'hyperloop-btn'
        });

        createGlobeControlButton({
            id: 'weatherEffectsToggle',
            className: 'active',
            title: 'Toggle weather (aurora, clouds, shooting stars)',
            label: 'Weather',
            iconPath: 'assets/images/icons/Weather Icon.png',
            iconAlt: 'Weather',
            parentId: 'headerHubRight',
            baseClass: 'header-hub-btn header-hub-btn--icon',
            iconSpanId: 'weatherEffectsIcon',
            headerOrder: 45,
            mobileParentId: 'content',
            mobileBaseClass: 'globe-control-btn',
            mobileClassName: 'weather-effects-btn'
        });
        
        // Setup transport toggle
        if (controller.uiView) {
            controller.uiView.setupHyperloopToggle(() => {
                controller.transportView.updateHyperloopVisibility();
            });
            controller.uiView.setupWeatherEffectsToggle(() => {
                if (controller.globeView) {
                    controller.globeView.setWeatherEffectsVisible(controller.sceneModel.getGlobeWeatherEffectsVisible());
                }
            });
            updateStatus('✓ Transport & weather toggles initialized', 'success');
        }
        
        // Load transport sound effect
        loadSoundEffect('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3', 'Loading transport sound effect...');
        loadSoundEffect('weather', 'assets/audio/sfx/Weather.mp3', 'Loading weather sound effect...');
        
        // Ensure transport systems are visible
        if (controller.transportView) {
            controller.transportView.updateHyperloopVisibility();
        }
        
        loadedComponents.transport = true;
    }, 'Transport', 'loadTransportBtn', isRunOperation);
}

/** Unload Controls (rotation toggle, interaction, sound). */
async function unloadControls() {
    if (!loadedComponents.controls) {
        updateStatus('Controls not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove control buttons
        removeElementsByIds([
            { id: 'autoRotateToggle', message: 'Rotation toggle removed' },
            { id: 'mapViewToggle', message: 'Map view toggle removed' },
            { id: 'exitButton', message: 'Exit button removed' }
        ]);
        
        loadedComponents.controls = false;
    }, 'Controls', 'loadControlsBtn');
}

async function loadControls() {
    if (checkAlreadyLoaded(loadedComponents.controls, 'Controls')) {
        return;
    }
    
    // Globe base must be loaded first
    if (!requireGlobeBase('loadControlsBtn', loadedComponents)) {
        return;
    }
    
    await withLoadWrapper(async () => {
        const controller = window.globeController;

        // Add map view toggle (globe <-> flat map)
        createGlobeControlButton({
            id: 'mapViewToggle',
            className: '',
            title: 'Toggle Map View',
            label: 'Map',
            iconPath: 'assets/images/icons/Switch to Globe Icon.png',
            iconAlt: 'Globe',
            parentId: 'headerHubMapStack',
            baseClass: 'header-hub-btn header-hub-btn--icon',
            iconSpanId: 'mapViewToggleIcon',
            headerOrder: 30,
            mobileParentId: 'content',
            mobileBaseClass: 'globe-control-btn',
            mobileClassName: ''
        });

        // Add rotation toggle as a small secondary button under Map/Globe (desktop header).
        // On mobile, it mounts as the existing globe-control button.
        createGlobeControlButton({
            id: 'autoRotateToggle',
            className: 'header-subbar-btn',
            title: 'Toggle Auto-Rotation',
            label: 'Rotation',
            iconPath: 'assets/images/icons/Rotation Icon.png',
            iconAlt: 'Rotate',
            parentId: 'headerRotateSubBarInner',
            baseClass: 'header-hub-btn header-hub-btn--icon',
            iconSpanId: 'rotateIcon',
            headerOrder: 40,
            mobileParentId: 'content',
            mobileBaseClass: 'globe-control-btn',
            mobileClassName: ''
        });
        
        // Add exit button (if not already present)
        // Use componentOrchestrator directly to avoid hoisting issues
        createExitButton(setIsRunOperation, () => componentOrchestrator.killGlobeComponents());
        
        // Setup rotation toggle
        if (controller.uiView) {
            controller.uiView.setupAutoRotateToggle();
            if (typeof controller.uiView.setupMapViewToggle === 'function') {
                controller.uiView.setupMapViewToggle();
            }
            updateStatus('✓ Rotation toggle initialized', 'success');
        }
        
        // Load rotation sound effect
        loadSoundEffect('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3', 'Loading rotation sound effect...');
        
        loadedComponents.controls = true;
    }, 'Controls', 'loadControlsBtn', isRunOperation);
}

/** Unload Music (toggle, panel, audio). */
async function unloadMusic() {
    if (!loadedComponents.music) {
        updateStatus('Music not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove music components
        removeElementsByIds([
            { id: 'musicToggle', message: 'Music button removed' },
            { id: 'musicPanel', message: 'Music panel removed' }
        ]);
        
        // Stop any playing music
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio = null;
        }
        
        loadedComponents.music = false;
    }, 'Music', 'loadMusicBtn');
}

/**
 * Load Music Components
 * - Music options button
 * - Music lists and images
 * - Related sound effects
 */
async function loadMusic() {
    if (checkAlreadyLoaded(loadedComponents.music, 'Music')) {
        return;
    }
    
    await withLoadWrapper(async () => {
        // Add music toggle button (if not already present)
        createGlobeControlButton({
            id: 'musicToggle',
            className: '',
            title: 'Music Options',
            label: 'Music',
            iconPath: 'assets/images/icons/Music Icon.png',
            iconAlt: 'Music',
            parentId: 'headerHubRight',
            baseClass: 'header-hub-btn header-hub-btn--icon',
            headerOrder: 60,
            // Mobile: move Music to the left side (so universal buttons split across hubs)
            mobileParentId: 'headerHub',
            mobileBaseClass: 'header-hub-btn header-hub-btn--icon',
            mobileClassName: ''
        });
        
        // Add music panel HTML (if not already present)
        getOrCreateElement('musicPanel', () => {
            updateStatus('Adding music panel...', 'info');
            return createMusicPanel();
        }, 'Music panel');
        
        // Add audio element (if not already present)
        getOrCreateElement('backgroundMusic', () => {
            updateStatus('Adding audio element...', 'info');
            return createBackgroundMusicElement();
        }, 'Audio element');
        
        // Initialize MusicManager AFTER elements are created (immediate attempt)
        initializeMusicManager(true);
        
        // Load music sound effect
        loadSoundEffect('music', 'assets/audio/sfx/Music.mp3', 'Loading music sound effect...');
        
        // Initialize music panel again after delay (ensures all services are ready)
        initializeMusicManager(false, 50);
        
        loadedComponents.music = true;
    }, 'Music', 'loadMusicBtn', isRunOperation);
}

/**
 * Load Events Components
 * - EventManager initialization
 * - Event markers on the globe
 * - Filter button and panel
 * - Event manager button and panel
 * - Event pagination (arrows, page input, numbered buttons)
 * - Event slide panel, event image overlay, event edit modal
 * - Related sound effects
 */
async function unloadEvents() {
    if (!loadedComponents.events) {
        updateStatus('Events not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove event UI components
        removeElementsByIds([
            { id: 'filtersToggle', message: 'Filter button removed' },
            { id: 'eventsManageToggle', message: 'Event manager button removed' },
            { id: 'eventPagination', message: 'Event pagination removed' },
            { id: 'filtersPanel', message: null, checkParent: true }
        ]);
        
        // Clear event manager and remove markers using helpers
        clearEventManager();
        removeAllEventMarkers();
        
        loadedComponents.events = false;
    }, 'Events', 'loadEventsBtn');
}

async function loadEvents() {
    if (checkAlreadyLoaded(loadedComponents.events, 'Events')) {
        return;
    }
    
    // Globe base must be loaded first
    if (!requireGlobeBase('loadEventsBtn', loadedComponents)) {
        return;
    }
    
    await withLoadWrapper(async () => {
                        // Initialize EventManager
        window.eventManager = await initializeEventManager();

        // Pagination + header controls must exist before UIView binds number buttons / hover preview.
        setupEventUIComponents({ updateStatus });

        // Sync events with globe and add markers (pagination DOM is present for this sync)
        syncEventsWithGlobe(window.globeController, window.eventManager);
        
        // Load all event-related sound effects using helper
        loadEventSoundEffects();
        
        // Initialize filter panel functionality using helper
        initializeFilterPanel(updateStatus);
        
        // Setup event listeners AFTER all buttons and panels are created using helper
        setupEventListenersDelayed(window.eventManager, setupEventManagerListeners);
        
        // Final sync with globe (after all UI is set up)
        syncEventsWithGlobe(window.globeController, window.eventManager);
        
        loadedComponents.events = true;
    }, 'Events', 'loadEventsBtn', isRunOperation);
}

/**
 * Unload Menu Components
 */
async function unloadMenu() {
    if (!loadedComponents.menu) {
        updateStatus('Menu not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove menu container if it exists
        const testContainer = document.querySelector('.test-container');
        if (testContainer) {
            removeElementBySelector('.main-menu-buttons', 'Menu buttons removed', testContainer);
        }
        
        loadedComponents.menu = false;
    }, 'Menu', 'loadMenuBtn');
}

/** Load Menu (Global Timeline, Glossary, Bios buttons). */
async function loadMenu() {
    if (checkAlreadyLoaded(loadedComponents.menu, 'Menu')) {
        return;
    }
    
    await withLoadWrapper(async () => {
        const testContainer = getOrCreateTestContainer();
        
        // Check if menu buttons already exist
        if (testContainer.querySelector('.main-menu-buttons')) {
            updateStatus('Menu buttons already exist', 'info');
            loadedComponents.menu = true;
            return;
        }
        
        // Create main menu buttons structure
        updateStatus('Creating main menu buttons...', 'info');
        
        const setupGlobeHandler = createRunOperationHandler(runGlobeComponents, setIsRunOperation);
        const setupGlossaryHandler = typeof runGlossaryComponents === 'function' 
            ? createRunOperationHandler(runGlossaryComponents, setIsRunOperation) 
            : null;
        const setupBiographyHandler = typeof runBiographyComponents === 'function' 
            ? createRunOperationHandler(runBiographyComponents, setIsRunOperation) 
            : null;
        
        const menuButtons = createMenuButtons(setupGlobeHandler, setupGlossaryHandler, setupBiographyHandler);
        testContainer.appendChild(menuButtons);
        updateStatus('✓ Menu buttons created', 'success');
        
        updateStatus('✓ Menu button listeners set up', 'success');
        
        loadedComponents.menu = true;
    }, 'Menu', 'loadMenuBtn', isRunOperation);
}

// Initialize ComponentOrchestrator with loaders and unloaders
const componentOrchestrator = new ComponentOrchestrator(
    loadedComponents,
    {
        palette: loadPalette,
        music: loadMusic,
        menu: loadMenu,
        globeBase: loadGlobeBase,
        transport: loadTransport,
        controls: loadControls,
        events: loadEvents
    },
    {
        palette: unloadPalette,
        music: unloadMusic,
        menu: unloadMenu,
        globeBase: unloadGlobeBase,
        transport: unloadTransport,
        controls: unloadControls,
        events: unloadEvents
    }
);

const {
    runMenuComponents,
    runUniversalFeatures,
    runGlobeComponents,
    killMenuComponents,
    killUniversalFeatures,
    restoreMainMenu,
    killGlobeComponents,
    runGlossaryComponents,
    killGlossaryComponents,
    runBiographyComponents,
    killBiographyComponents
} = createOrchestratorDelegations(componentOrchestrator);

window.restoreMainMenu = restoreMainMenu;

// Setup button event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('test-loader.js: DOMContentLoaded fired, setting up button listeners...');
    
    setupAllEventListeners({
        loadPalette,
        loadMusic,
        runUniversalFeatures,
        killUniversalFeatures,
        loadMenu,
        runMenuComponents,
        killMenuComponents,
        loadGlobeBase,
        loadTransport,
        loadControls,
        loadEvents,
        runGlobeComponents,
        killGlobeComponents,
        runGlossaryComponents,
        killGlossaryComponents,
        runBiographyComponents,
        killBiographyComponents
    }, setIsRunOperation);
    
    updateStatus('Test loader ready. Click buttons to load components.', 'info');
});

// Make runUniversalFeatures, runMenuComponents, and runGlobeComponents available globally
// This must be at the end after all functions are defined
window.runUniversalFeatures = runUniversalFeatures;
window.runMenuComponents = runMenuComponents;
window.runGlobeComponents = runGlobeComponents;

// Expose kill operations for header hub mode switching
window.killGlobeComponents = killGlobeComponents;
window.killMenuComponents = killMenuComponents;
window.runGlossaryComponents = runGlossaryComponents;
window.killGlossaryComponents = killGlossaryComponents;
window.runBiographyComponents = runBiographyComponents;
window.killBiographyComponents = killBiographyComponents;

// Header hub mode switch API
// - Switches between "globe" and "menu" modes
// - Glossary/Biography are not implemented yet; selecting them returns to main menu
window.appModeSwitch = async function appModeSwitch(targetMode) {
    const requested = (targetMode || '').toString().toLowerCase();
    const normalized = (requested === 'timeline') ? 'globe' : requested;
    const next = (normalized === 'globe' || normalized === 'glossary' || normalized === 'biography')
        ? normalized
        : 'menu';

    // If "coming soon" modes are requested, route to main menu.
    const effectiveNext = (next === 'glossary' || next === 'biography') ? 'menu' : next;

    // Determine current mode. Globe orchestrator stores "globe" etc; menu uses absence.
    const current = (localStorage.getItem('currentMode') || 'menu').toString().toLowerCase();

    try {
        // Unload current mode assets (universal features stay loaded)
        if (current === 'globe') {
            await window.killGlobeComponents?.();
        } else if (current === 'glossary') {
            await window.killGlossaryComponents?.();
            await window.restoreMainMenu?.();
        } else if (current === 'biography') {
            await window.killBiographyComponents?.();
            await window.restoreMainMenu?.();
        } else {
            // Already in menu; ensure menu visible
            await window.restoreMainMenu?.();
        }

        // Load target mode assets
        if (effectiveNext === 'globe') {
            await window.runGlobeComponents?.(false);
        } else {
            await window.restoreMainMenu?.();
            localStorage.setItem('currentMode', 'menu');
            if (next === 'glossary' || next === 'biography') {
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus('This mode is coming soon — returning to main menu.', 'info');
                }
            }
        }

        window.dispatchEvent(new CustomEvent('appmodechange', { detail: { mode: effectiveNext } }));
    } catch (e) {
        console.error('appModeSwitch failed:', e);
        try {
            await window.restoreMainMenu?.();
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('appmodechange', { detail: { mode: 'menu' } }));
    }
};