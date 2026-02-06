/**
 * ComponentOrchestrator - Handles orchestration of component loading/unloading (run/kill operations)
 * Extracted from component-loader.js to improve maintainability
 */

import { showLoadingOverlay, hideLoadingOverlay, setRunOperation, getRunOperation } from './LoadingOverlayManager.js';
import { updateStatus, updateGlobeComponentsProgress, resetGlobeComponentsProgress } from './StatusManager.js';

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
     * Loads: Palette, then Music
     */
    async runUniversalFeatures() {
        const runBtn = document.getElementById('runUniversalBtn');
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
        updateStatus('🚀 Starting Universal Features auto-load...', 'info');
        
        try {
            // Load Palette
            if (!this.loadedComponents.palette) {
                updateStatus('→ Loading Palette...', 'info');
                await this.loaders.palette();
                // Small delay between loads
                await new Promise(r => setTimeout(r, 300));
            } else {
                updateStatus('→ Palette already loaded, skipping...', 'info');
            }
            
            // Load Music
            if (!this.loadedComponents.music) {
                updateStatus('→ Loading Music...', 'info');
                await this.loaders.music();
            } else {
                updateStatus('→ Music already loaded, skipping...', 'info');
            }
            
            updateStatus('✓ Universal Features auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Universal Features auto-load:', error);
            updateStatus(`✗ Error in Universal Features auto-load: ${error.message}`, 'error');
        } finally {
            setRunOperation(false);
            hideLoadingOverlay();
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
        
        // Hide globe container initially - we'll show it after everything is loaded
        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            globeContainer.style.display = 'none';
            globeContainer.style.width = '100%';
            globeContainer.style.height = '100%';
            updateStatus('→ Preparing globe container...', 'info');
        }
        
        updateStatus('🚀 Starting Globe Components auto-load...', 'info');
        
        const isRunOperation = getRunOperation();
        // Note: isRunOperation and overlay should already be set by the button click handler
        // But if called directly (not from button), set them here
        if (!isRunOperation) {
            setRunOperation(true);
            showLoadingOverlay();
            // Small delay to ensure overlay is rendered before starting loads
            await new Promise(r => setTimeout(r, 50));
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
            
            // Load Events
            if (!this.loadedComponents.events) {
                updateStatus('→ Loading Events...', 'info');
                await this.loaders.events();
                updateGlobeComponentsProgress(4);
            } else {
                updateStatus('→ Events already loaded, skipping...', 'info');
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
            
            // Change footer to white with no text when timeline is loaded
            const footer = document.querySelector('footer');
            if (footer) {
                footer.classList.add('timeline-loaded');
                
                // Initialize news ticker when timeline loads
                if (window.NewsTickerService && !window.newsTickerService) {
                    window.newsTickerService = new window.NewsTickerService();
                    window.newsTickerService.init();
                }
                
                // Update ticker with headlines from current page after a short delay to ensure events are loaded
                // Try multiple times with increasing delays to catch when events are synced
                const updateTickerDelayed = (attempt = 0) => {
                    if (window.globeController && window.globeController.dataModel && window.newsTickerService) {
                        const currentPageEvents = window.globeController.dataModel.getEventsForCurrentPage();
                        if (currentPageEvents && currentPageEvents.length > 0) {
                            if (window.newsTickerService.updateTicker) {
                                window.newsTickerService.updateTicker(currentPageEvents);
                            }
                        } else if (attempt < 5) {
                            // Events not synced yet, try again
                            setTimeout(() => updateTickerDelayed(attempt + 1), 200);
                        }
                    } else if (attempt < 5) {
                        // Services not ready yet, try again
                        setTimeout(() => updateTickerDelayed(attempt + 1), 200);
                    }
                };
                updateTickerDelayed();
            }
        } catch (error) {
            console.error('Error in Globe Components auto-load:', error);
            updateStatus(`✗ Error in Globe Components auto-load: ${error.message}`, 'error');
        } finally {
            setRunOperation(false);
            hideLoadingOverlay();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    /**
     * Run all Glossary Components sequentially
     * (Placeholder - no actual loads yet)
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
            // Placeholder - no actual loading yet
            updateStatus('→ Glossary Components loading not yet implemented', 'info');
            
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
    }

    /**
     * Kill all Globe Components
     */
    async killGlobeComponents() {
        updateStatus('Killing all Globe Components...', 'info');
        
        // Unload in reverse order (dependencies first)
        if (this.loadedComponents.events) {
            await this.unloaders.events();
        }
        
        if (this.loadedComponents.controls) {
            await this.unloaders.controls();
        }
        
        if (this.loadedComponents.transport) {
            await this.unloaders.transport();
        }
        
        if (this.loadedComponents.globeBase) {
            await this.unloaders.globeBase();
        }
        
        // Restore the menu (test-container) when killing globe components
        // This will also load menu if not already loaded
        await this.restoreMainMenu();
        
        updateStatus('✓ All Globe Components killed!', 'success');
    }

    /**
     * Kill all Glossary Components
     */
    async killGlossaryComponents() {
        updateStatus('Killing all Glossary Components...', 'info');
        
        // Placeholder - no actual unloading yet
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
