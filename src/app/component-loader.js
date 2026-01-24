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

/**
 * Setup palette toggle functionality
 * Delegates to PaletteManager
 * Note: setupPaletteToggle is imported from PaletteManager
 */

/**
 * Load Palette Components (Universal Feature)
 * - Palette button
 * - Background color switching
 * - Globe texture switching
 * - Related sound effects
 */
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
            className: 'color-palette-btn bottom-right-btn',
            title: 'Toggle Color Palette',
            iconPath: 'assets/images/icons/Palette Icon.png',
            iconAlt: 'Color Palette'
        });
        
        // Load palette sound effect
        loadSoundEffect('colorChange', 'assets/audio/sfx/Color Change.mp3', 'Loading palette sound effect...');
        
        // Setup palette toggle functionality
        setupPaletteToggle();
        
        loadedComponents.palette = true;
    }, 'Palette', 'loadPaletteBtn', isRunOperation);
}

/**
 * Load Globe Base Components
 * - Earth sphere and textures
 * - Starfield background
 * - Scene, camera, renderer, lights
 * - City markers, seaport markers
 */
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

/**
 * Load Transport Components
 * - Vehicles (trains, planes, boats)
 * - Connection lines (city connections, seaport connections, secondary lines)
 * - Ports and airports
 * - Transport toggle button
 * - Related sound effects
 */
async function unloadTransport() {
    if (!loadedComponents.transport) {
        updateStatus('Transport not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove transport toggle button
        const transportBtn = document.getElementById('hyperloopToggle');
        if (transportBtn) {
            transportBtn.remove();
            updateStatus('✓ Transport toggle removed', 'success');
        }
        
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
            className: 'hyperloop-btn active',
            title: 'Toggle Transport Systems',
            iconPath: 'assets/images/icons/Train Icon.png',
            iconAlt: 'Transport'
        });
        
        // Setup transport toggle
        if (controller.uiView) {
            controller.uiView.setupHyperloopToggle(() => {
                controller.transportView.updateHyperloopVisibility();
            });
            updateStatus('✓ Transport toggle initialized', 'success');
        }
        
        // Load transport sound effect
        loadSoundEffect('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3', 'Loading transport sound effect...');
        
        // Ensure transport systems are visible
        if (controller.transportView) {
            controller.transportView.updateHyperloopVisibility();
        }
        
        loadedComponents.transport = true;
    }, 'Transport', 'loadTransportBtn', isRunOperation);
}

/**
 * Load Controls Components
 * - Rotation toggle button
 * - Interaction controls (mouse/touch)
 * - Related sound effects
 */
async function unloadControls() {
    if (!loadedComponents.controls) {
        updateStatus('Controls not loaded', 'info');
        return;
    }
    
    await withUnloadWrapper(async () => {
        // Remove control buttons
        removeElementsByIds([
            { id: 'autoRotateToggle', message: 'Rotation toggle removed' },
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
        
        // Add rotation toggle (if not already present)
        createGlobeControlButton({
            id: 'autoRotateToggle',
            className: '',
            title: 'Toggle Auto-Rotation',
            iconPath: 'assets/images/icons/Rotation Icon.png',
            iconAlt: 'Rotate'
        });
        
        // Add exit button (if not already present)
        // Use componentOrchestrator directly to avoid hoisting issues
        createExitButton(setIsRunOperation, () => componentOrchestrator.killGlobeComponents());
        
        // Setup rotation toggle
        if (controller.uiView) {
            controller.uiView.setupAutoRotateToggle();
            updateStatus('✓ Rotation toggle initialized', 'success');
        }
        
        // Load rotation sound effect
        loadSoundEffect('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3', 'Loading rotation sound effect...');
        
        loadedComponents.controls = true;
    }, 'Controls', 'loadControlsBtn', isRunOperation);
}

/**
 * Unload Music Components
 */
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
            className: 'music-btn bottom-right-btn',
            title: 'Music Options',
            iconPath: 'assets/images/icons/Music Icon.png',
            iconAlt: 'Music'
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
        
        // Sync events with globe and add markers (first sync)
        syncEventsWithGlobe(window.globeController, window.eventManager);
        
        // Setup all event UI components using helper
        setupEventUIComponents({ updateStatus });
        
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

/**
 * Load Menu Components
 * - Main menu with 3 buttons (Global Timeline, Concept Glossary, Character Bios)
 */
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

/**
 * Run all Menu Components
 * Simply ensures menu is loaded and visible
 * Delegates to ComponentOrchestrator
 */
async function runMenuComponents() {
    return componentOrchestrator.runMenuComponents();
}

/**
 * Run all Universal Features sequentially
 * Loads: Palette, then Music
 * Delegates to ComponentOrchestrator
 */
async function runUniversalFeatures() {
    return componentOrchestrator.runUniversalFeatures();
}

/**
 * Run all Globe Components sequentially
 * Loads: Globe Base, then Transport, then Controls, then Events
 * Delegates to ComponentOrchestrator
 */
async function runGlobeComponents(isAutoLoad = false) {
    return componentOrchestrator.runGlobeComponents(isAutoLoad);
}

/**
 * Kill all Menu Components
 * Delegates to ComponentOrchestrator
 */
async function killMenuComponents() {
    return componentOrchestrator.killMenuComponents();
}

/**
 * Kill all Universal Features
 * Delegates to ComponentOrchestrator
 */
async function killUniversalFeatures() {
    return componentOrchestrator.killUniversalFeatures();
}

/**
 * Restore main menu (show test-container, hide globe)
 * Make it globally accessible
 * Delegates to ComponentOrchestrator
 */
window.restoreMainMenu = async function restoreMainMenu() {
    return componentOrchestrator.restoreMainMenu();
}

/**
 * Kill all Globe Components
 * Delegates to ComponentOrchestrator
 */
async function killGlobeComponents() {
    return componentOrchestrator.killGlobeComponents();
}

/**
 * Run all Glossary Components sequentially
 * (Placeholder - no actual loads yet)
 * Delegates to ComponentOrchestrator
 */
async function runGlossaryComponents(isAutoLoad = false) {
    return componentOrchestrator.runGlossaryComponents(isAutoLoad);
}

/**
 * Kill all Glossary Components
 * Delegates to ComponentOrchestrator
 */
async function killGlossaryComponents() {
    return componentOrchestrator.killGlossaryComponents();
}

/**
 * Run all Biography Components sequentially
 * (Placeholder - no actual loads yet)
 * Delegates to ComponentOrchestrator
 */
async function runBiographyComponents(isAutoLoad = false) {
    return componentOrchestrator.runBiographyComponents(isAutoLoad);
}

/**
 * Kill all Biography Components
 * Delegates to ComponentOrchestrator
 */
async function killBiographyComponents() {
    return componentOrchestrator.killBiographyComponents();
}

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