/**
 * EventsLoadHelpers - Utilities for loading events components
 * Extracted from component-loader.js to reduce duplication
 */

import { createGlobeControlButton } from './ComponentLoadHelpers.js';
import { getOrCreateElement, createEventPagination, createFiltersPanel } from './ComponentDOMHelpers.js';
import { initializeEventManager, setupEventManagerListeners, syncEventsWithGlobe, verifyEventPanels } from './EventManagerHelpers.js';
import { loadSoundEffect, loadSoundEffects } from './ComponentLoadHelpers.js';
import { updateStatus } from '../../managers/StatusManager.js';

/**
 * Sets up all event-related UI components
 * @param {Object} params - Parameters
 * @param {Function} params.updateStatus - Status update function
 */
export function setupEventUIComponents({ updateStatus }) {
    // Add filter button
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
    });
    
    // Add event manager button
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
    });

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
    });
    
    // Add event pagination
    getOrCreateElement('eventPagination', () => {
        updateStatus('Adding event pagination...', 'info');
        return createEventPagination();
    }, 'Event pagination');
    
    // Add filters panel
    getOrCreateElement('filtersPanel', () => {
        updateStatus('Adding filters panel...', 'info');
        return createFiltersPanel();
    }, 'Filters panel');
    
    // Verify other panels exist
    verifyEventPanels();
}

/**
 * Loads all event-related sound effects
 */
export function loadEventSoundEffects() {
    loadSoundEffects([
        { name: 'filterPick', path: 'assets/audio/sfx/Filter Pick.mp3' },
        { name: 'filterOff', path: 'assets/audio/sfx/Filter Off.mp3' },
        { name: 'filterConfirm', path: 'assets/audio/sfx/Filter Confirm.mp3' },
        { name: 'filterClear', path: 'assets/audio/sfx/Filter Clear.mp3' },
        { name: 'filterButton', path: 'assets/audio/sfx/Filter Button.mp3' },
        { name: 'eventClick', path: 'assets/audio/sfx/Event Click.mp3' },
        { name: 'eventManager', path: 'assets/audio/sfx/Event Manager.mp3' },
        { name: 'switchEvent', path: 'assets/audio/sfx/Switch Event.mp3' },
        { name: 'page', path: 'assets/audio/sfx/Page.mp3' }
    ], 'Loading event sound effects...');
}

/**
 * Initializes filter panel functionality
 * @param {Function} updateStatus - Status update function
 */
export function initializeFilterPanel(updateStatus) {
    updateStatus('Initializing filter panel...', 'info');
    if (window.FilterService && typeof window.FilterService.init === 'function') {
        window.FilterService.init();
        updateStatus('✓ Filter panel initialized', 'success');
    } else {
        updateStatus('⚠ FilterService not found - filter panel may not work', 'error');
    }
}

/**
 * Sets up event manager listeners after a delay
 * @param {Object} eventManager - EventManager instance
 * @param {Function} setupEventManagerListeners - Function to setup listeners
 */
export function setupEventListenersDelayed(eventManager, setupEventManagerListeners) {
    if (eventManager) {
        setTimeout(() => {
            setupEventManagerListeners(eventManager);
        }, 50);
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.EventsLoadHelpers) {
        window.EventsLoadHelpers = {};
    }
    window.EventsLoadHelpers.setupEventUIComponents = setupEventUIComponents;
    window.EventsLoadHelpers.loadEventSoundEffects = loadEventSoundEffects;
    window.EventsLoadHelpers.initializeFilterPanel = initializeFilterPanel;
    window.EventsLoadHelpers.setupEventListenersDelayed = setupEventListenersDelayed;
}
