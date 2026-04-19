/**
 * ComponentOrchestrator - Handles orchestration of component loading/unloading (run/kill operations)
 * Extracted from component-loader.js to improve maintainability
 */

import { showLoadingOverlay, hideLoadingOverlay, setRunOperation, getRunOperation } from './LoadingOverlayManager.js';
import { updateStatus, updateGlobeComponentsProgress, resetGlobeComponentsProgress } from './StatusManager.js';
import {
    beginTimelineInlineLoadIfCodex,
    endTimelineInlineLoad
} from '../app/helpers/GlobeInlineLoadHelpers.js';

/**
 * ComponentOrchestrator class
 * Orchestrates loading and unloading of component groups
 */
export class ComponentOrchestrator {
    constructor(loadedComponents, loaders, unloaders) {
        this.loadedComponents = loadedComponents;
        this.loaders = loaders; // Object with load functions: { palette: loadPalette, music: loadMusic, ... }
        this.unloaders = unloaders; // Object with unload functions: { palette: unloadPalette, music: unloadMusic, ... }
    }

    dispatchAppModeChange(mode) {
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('appmodechange', { detail: { mode } }));
            }
        } catch (e) {
            // Non-fatal; mode switching should still work even if CustomEvent is unavailable.
            console.warn('dispatchAppModeChange failed:', e);
        }
    }

    /**
     * Check if Event System Load Out is already active
     * Globe now relies on Event System for event-related features
     */
    isEventSystemLoadOutActive() {
        const testBtn = document.getElementById('testBtn');
        const isLoaded = testBtn?.dataset.loaded === 'true';
        const hasEventManager = window.eventManager?.events?.length > 0;
        const hasListeners = window.eventManager?.listenersSetup === true;
        const hasUI = !!document.getElementById('filtersPanel') || 
                       !!document.getElementById('paginationDock') ||
                       !!document.getElementById('filtersToggle');
        return isLoaded && hasEventManager && hasListeners && hasUI;
    }

    /**
     * Play mode switch sound effect
     * @param {boolean} isAutoLoad - If true, don't play sound
     */
    playModeSwitchSound(isAutoLoad) {
        if (!isAutoLoad && window.SoundEffectsManager) {
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                window.SoundEffectsManager.play('modeSwitch');
            } else {
                // Load and play if not already loaded
                window.SoundEffectsManager.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
                setTimeout(() => {
                    window.SoundEffectsManager.play('modeSwitch');
                }, 100);
            }
        }
    }

    /**
     * Run Menu Components
     */
    async runMenuComponents() {
        const isRunOperation = getRunOperation();
        // Note: isRunOperation and overlay should already be set by the button click handler
        // But if called directly (not from button), set them here
        if (!isRunOperation) {
            setRunOperation(true);
            showLoadingOverlay();
        }
        updateStatus('🚀 Running Menu Components...', 'info');
        
        try {
            // If menu is not loaded, load it first
            if (!this.loadedComponents.menu) {
                updateStatus('→ Menu not loaded, loading now...', 'info');
                await this.loaders.menu();
            } else {
                updateStatus('→ Menu already loaded', 'info');
            }
            
            // Ensure menu is visible
            const testContainer = document.querySelector('.test-container');
            const menuButtons = testContainer ? testContainer.querySelector('.main-menu-buttons') : null;
            
            if (menuButtons) {
                menuButtons.style.display = 'flex';
                updateStatus('✓ Menu Components are running!', 'success');
                this.dispatchAppModeChange('menu');
            } else {
                updateStatus('⚠ Menu buttons not found', 'error');
            }
        } catch (error) {
            console.error('Error running Menu Components:', error);
            updateStatus(`✗ Error running Menu Components: ${error.message}`, 'error');
        } finally {
            setRunOperation(false);
            hideLoadingOverlay();
        }
    }

    /**
     * Run all Universal Features sequentially
     * Loads: Music first (resume / buffer smooth), then Palette
     */
    async runUniversalFeatures(options = {}) {
        const runBtn = document.getElementById('runUniversalBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }

        const keepOverlay = !!(options && options.keepOverlay);
        
        const isRunOperation = getRunOperation();
        // Note: isRunOperation and overlay should already be set by the button click handler
        // But if called directly (not from button), set them here
        if (!isRunOperation) {
            setRunOperation(true);
            showLoadingOverlay();
        }
        updateStatus('🚀 Starting Universal Features auto-load...', 'info');
        
        try {
            // Music first so saved track can buffer before heavier UI work
            if (!this.loadedComponents.music) {
                updateStatus('→ Loading Music...', 'info');
                await this.loaders.music();
                await new Promise(r => setTimeout(r, 120));
            } else {
                updateStatus('→ Music already loaded, skipping...', 'info');
            }

            if (!this.loadedComponents.palette) {
                updateStatus('⬛ Loading Palette...', 'info');
                await this.loaders.palette();
                await new Promise(r => setTimeout(r, 300));
            } else {
                updateStatus('⬛ Palette already loaded, skipping...', 'info');
            }

            // Always ensure header nav buttons exist (Events, Codex, Map, Filters)
            if (this.loaders.headerNav) {
                this.loaders.headerNav();
            }
            
            updateStatus('✓ Universal Features auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Universal Features auto-load:', error);
            updateStatus(`✗ Error in Universal Features auto-load: ${error.message}`, 'error');
        } finally {
            // If we're in a boot chain (e.g., page-init), keep the overlay up
            // so the user doesn't see a "menu flash" between Universal and Globe loads.
            if (!keepOverlay) {
                setRunOperation(false);
                hideLoadingOverlay();
            }
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    /**
     * Run all Globe Components sequentially
     * Loads: Globe Base, then Transport, then Controls, then Events
     */
    async runGlobeComponents(isAutoLoad = false) {
        this.playModeSwitchSound(isAutoLoad);

        const inlineFromCodex = beginTimelineInlineLoadIfCodex();
        
        // Save current mode to localStorage
        localStorage.setItem('currentMode', 'globe');
        
        const runBtn = document.getElementById('runGlobeBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }
        
        // Reset progress
        resetGlobeComponentsProgress();
        
        // Hide the test-container completely (which contains the main menu buttons)
        const testContainer = document.querySelector('.test-container');
        if (testContainer) {
            testContainer.style.display = 'none';
            updateStatus('→ Hiding menu container...', 'info');
        }
        
        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            globeContainer.style.width = '100%';
            globeContainer.style.height = '100%';
            if (!inlineFromCodex) {
                globeContainer.style.display = 'none';
                updateStatus('→ Preparing globe container...', 'info');
            } else {
                globeContainer.style.display = 'block';
                updateStatus('→ Preparing timeline in view…', 'info');
            }
        }
        
        updateStatus('🚀 Starting Globe Components auto-load...', 'info');
        
        const isRunOperation = getRunOperation();
        // Note: isRunOperation and overlay should already be set by the button click handler
        // But if called directly (not from button), set them here
        if (!isRunOperation) {
            setRunOperation(true);
            if (!inlineFromCodex) {
                showLoadingOverlay();
                await new Promise(r => setTimeout(r, 50));
            }
        }
        
        try {
            // Load Globe Base
            if (!this.loadedComponents.globeBase) {
                updateStatus('→ Loading Globe Base...', 'info');
                await this.loaders.globeBase();
                // Show globe container immediately after Globe Base loads
                if (globeContainer) {
                    globeContainer.style.opacity = '1';
                    globeContainer.style.pointerEvents = 'auto';
                    globeContainer.style.display = 'block';
                    globeContainer.classList.add('loaded');
                }
                updateGlobeComponentsProgress(1);
                // Small delay between loads
                await new Promise(r => setTimeout(r, 300));
            } else {
                updateStatus('→ Globe Base already loaded, skipping...', 'info');
                // If already loaded, make sure globe is visible
                if (globeContainer) {
                    globeContainer.style.opacity = '1';
                    globeContainer.style.pointerEvents = 'auto';
                    globeContainer.style.display = 'block';
                    globeContainer.classList.add('loaded');
                }
                updateGlobeComponentsProgress(1);
            }
            
            // Load Transport
            if (!this.loadedComponents.transport) {
                updateStatus('→ Loading Transport...', 'info');
                await this.loaders.transport();
                updateGlobeComponentsProgress(2);
                await new Promise(r => setTimeout(r, 300));
            } else {
                updateStatus('→ Transport already loaded, skipping...', 'info');
                updateGlobeComponentsProgress(2);
            }
            
            // Load Controls
            if (!this.loadedComponents.controls) {
                updateStatus('→ Loading Controls...', 'info');
                await this.loaders.controls();
                updateGlobeComponentsProgress(3);
                await new Promise(r => setTimeout(r, 300));
            } else {
                updateStatus('→ Controls already loaded, skipping...', 'info');
                updateGlobeComponentsProgress(3);
            }
            
            // === EVENT SYSTEM DEPENDENCY ===
            // Globe no longer loads events directly - it relies on Event System Load Out
            const eventSystemActive = this.isEventSystemLoadOutActive();
            
            if (eventSystemActive && window.globeController && window.eventManager) {
                updateStatus('→ Event System detected, syncing...', 'info');
                const { syncEventsWithGlobe } = await import('../app/helpers/EventManagerHelpers.js');
                syncEventsWithGlobe(window.globeController, window.eventManager);
                updateGlobeComponentsProgress(4);
            } else {
                updateStatus('→ Event System not loaded (Globe will have no events)', 'info');
                updateGlobeComponentsProgress(4);
            }
            
            updateStatus('✓ Globe Components auto-load complete!', 'success');
            
            // Globe container should already be visible (shown after Globe Base loaded)
            // Just ensure it's still visible
            if (globeContainer) {
                globeContainer.style.opacity = '1';
                globeContainer.style.pointerEvents = 'auto';
                globeContainer.style.display = 'block';
                globeContainer.classList.add('loaded');
            }
            
            // Footer styling for timeline mode - only if Event System is active
            if (eventSystemActive) {
                const footer = document.querySelector('footer');
                if (footer) {
                    footer.classList.add('timeline-loaded');
                }
            }

            // Ensure header hub state updates even when globe is started from the main menu button
            // (which runs loaders directly and doesn't go through appModeSwitch()).
            this.dispatchAppModeChange('globe');
        } catch (error) {
            console.error('Error in Globe Components auto-load:', error);
            updateStatus(`✗ Error in Globe Components auto-load: ${error.message}`, 'error');
        } finally {
            setRunOperation(false);
            endTimelineInlineLoad();
            hideLoadingOverlay();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    /**
     * Run all Glossary Components sequentially
     * Enters Codex mode (Concept Glossary)
     */
    async runGlossaryComponents(isAutoLoad = false) {
        this.playModeSwitchSound(isAutoLoad);

        // Save current mode to localStorage
        localStorage.setItem('currentMode', 'glossary');

        const runBtn = document.getElementById('runGlossaryBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }

        const isRunOperation = getRunOperation();
        // Note: isRunOperation and overlay should already be set by the button click handler
        // But if called directly (not from button), set them here
        if (!isRunOperation) {
            setRunOperation(true);
            showLoadingOverlay();
        }
        updateStatus('🚀 Starting Glossary Components auto-load...', 'info');

        try {
            // Hide main menu buttons
            const mainMenuButtons = document.querySelector('.main-menu-buttons');
            if (mainMenuButtons) {
                mainMenuButtons.style.display = 'none';
                updateStatus('→ Hiding main menu buttons...', 'info');
            }

            // Enter Codex mode via CodexModeService
            if (window.CodexModeService && typeof window.CodexModeService.enterCodexMode === 'function') {
                await window.CodexModeService.enterCodexMode();
            } else {
                updateStatus('→ CodexModeService not available', 'error');
            }

            this.loadedComponents.glossary = true;
            updateStatus('✓ Glossary Components auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Glossary Components auto-load:', error);
            updateStatus(`✗ Error in Glossary Components auto-load: ${error.message}`, 'error');
        } finally {
            setRunOperation(false);
            hideLoadingOverlay();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    /**
     * Run all Biography Components sequentially
     * (Placeholder - no actual loads yet)
     */
    async runBiographyComponents(isAutoLoad = false) {
        this.playModeSwitchSound(isAutoLoad);
        
        // Save current mode to localStorage
        localStorage.setItem('currentMode', 'biography');
        
        const runBtn = document.getElementById('runBiographyBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }
        
        const isRunOperation = getRunOperation();
        // Note: isRunOperation and overlay should already be set by the button click handler
        // But if called directly (not from button), set them here
        if (!isRunOperation) {
            setRunOperation(true);
            showLoadingOverlay();
        }
        updateStatus('🚀 Starting Biography Components auto-load...', 'info');
        
        try {
            // Placeholder - no actual loading yet
            updateStatus('→ Biography Components loading not yet implemented', 'info');
            
            this.loadedComponents.biography = true;
            updateStatus('✓ Biography Components auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Biography Components auto-load:', error);
            updateStatus(`✗ Error in Biography Components auto-load: ${error.message}`, 'error');
        } finally {
            setRunOperation(false);
            hideLoadingOverlay();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    /**
     * Kill all Menu Components
     */
    async killMenuComponents() {
        updateStatus('Killing all Menu Components...', 'info');
        
        if (this.loadedComponents.menu) {
            await this.unloaders.menu();
        }
        
        updateStatus('✓ All Menu Components killed!', 'success');
    }

    /**
     * Kill all Universal Features
     */
    async killUniversalFeatures() {
        updateStatus('Killing all Universal Features...', 'info');
        
        if (this.loadedComponents.palette) {
            await this.unloaders.palette();
        }
        
        if (this.loadedComponents.music) {
            await this.unloaders.music();
        }
        
        updateStatus('✓ All Universal Features killed!', 'success');
    }

    /**
     * Restore main menu (show test-container, hide globe)
     * Make it globally accessible
     */
    async restoreMainMenu() {
        const testContainer = document.querySelector('.test-container');
        const globeContainer = document.getElementById('globe-container');
        
        // Ensure menu is loaded (reload if it was killed)
        if (!this.loadedComponents.menu) {
            updateStatus('Loading menu components...', 'info');
            await this.loaders.menu();
        }
        
        // Restore menu visibility - ensure it's fully visible
        const menuButtons = testContainer ? testContainer.querySelector('.main-menu-buttons') : null;
        if (testContainer) {
            testContainer.style.display = 'flex';
            testContainer.classList.remove('fading');
            testContainer.style.opacity = '1';
            testContainer.style.visibility = 'visible';
        }
        
        // Restore menu buttons visibility
        if (menuButtons) {
            menuButtons.style.display = 'flex';
            menuButtons.style.visibility = 'visible';
            menuButtons.style.opacity = '1';
        }
        
        // Hide globe and reset its positioning
        if (globeContainer) {
            globeContainer.style.display = 'none';
            globeContainer.classList.remove('loaded');
            globeContainer.style.position = '';
            globeContainer.style.top = '';
            globeContainer.style.left = '';
        }
        
        // Restore footer to dark blue with text when returning to main menu
        const footer = document.querySelector('footer');
        if (footer) {
            footer.classList.remove('timeline-loaded');
        }

        // Clear/hide headlines ticker when returning to main menu
        if (window.newsTickerService && typeof window.newsTickerService.clear === 'function') {
            window.newsTickerService.clear();
        }
        
        // Close any open panels
        const eventSlide = document.getElementById('eventSlide');
        const eventsManagePanel = document.getElementById('eventsManagePanel');
        const filtersPanel = document.getElementById('filtersPanel');
        
        if (eventSlide) eventSlide.classList.remove('open');
        if (eventsManagePanel) eventsManagePanel.classList.remove('open');
        if (filtersPanel) filtersPanel.classList.remove('open');
        
        // Remove active states from buttons
        const eventsManageToggle = document.getElementById('eventsManageToggle');
        const filtersToggle = document.getElementById('filtersToggle');
        if (eventsManageToggle) eventsManageToggle.classList.remove('active');
        if (filtersToggle) filtersToggle.classList.remove('active');

        // Keep header hub (and Home button visibility) in sync with the actual loaded state.
        this.dispatchAppModeChange('menu');
    }

    /**
     * Kill all Globe Components
     */
    async killGlobeComponents() {
        updateStatus('Killing all Globe Components...', 'info');
        
        // Check if Event System Load Out is active
        const eventSystemActive = this.isEventSystemLoadOutActive();
        
        // Unload in reverse order (dependencies first)
        // Only unload events if Event System is NOT active
        if (this.loadedComponents.events && !eventSystemActive) {
            await this.unloaders.events();
        } else if (eventSystemActive) {
            updateStatus('→ Event System active, preserving events UI', 'info');
        }
        
        if (this.loadedComponents.controls) {
            await this.unloaders.controls();
        }
        
        if (this.loadedComponents.transport) {
            await this.unloaders.transport();
        }
        
        if (this.loadedComponents.globeBase) {
            // Preserve events UI if Event System is still active
            if (this.unloaders.globeBase && typeof this.unloaders.globeBase === 'function') {
                await this.unloaders.globeBase({ preserveEventsUi: eventSystemActive });
            }
        }
        
        // Restore the menu (test-container) when killing globe components
        // This will also load menu if not already loaded
        await this.restoreMainMenu();
        
        updateStatus('✓ All Globe Components killed!', 'success');
    }

    /**
     * Kill all Glossary Components
     * Exits Codex mode and restores main menu
     */
    async killGlossaryComponents() {
        updateStatus('Killing all Glossary Components...', 'info');

        // Exit Codex mode via globe container unload (preserves events UI if needed)
        if (window.unloadGlobeBase && typeof window.unloadGlobeBase === 'function') {
            try {
                await window.unloadGlobeBase({ preserveEventsUi: false });
            } catch (err) {
                console.warn('Error unloading globe base during glossary kill:', err);
            }
        }

        // Clear codex shell if present
        if (window.CodexModeService && typeof window.CodexModeService.clearCodexShellForGlobeInit === 'function') {
            window.CodexModeService.clearCodexShellForGlobeInit();
        }

        // Show main menu buttons again
        const mainMenuButtons = document.querySelector('.main-menu-buttons');
        if (mainMenuButtons) {
            mainMenuButtons.style.display = '';
            updateStatus('→ Showing main menu buttons...', 'info');
        }

        localStorage.removeItem('currentMode');
        this.loadedComponents.glossary = false;

        updateStatus('✓ All Glossary Components killed!', 'success');
    }

    /**
     * Kill all Biography Components
     */
    async killBiographyComponents() {
        updateStatus('Killing all Biography Components...', 'info');
        
        // Placeholder - no actual unloading yet
        this.loadedComponents.biography = false;
        
        updateStatus('✓ All Biography Components killed!', 'success');
    }
}
