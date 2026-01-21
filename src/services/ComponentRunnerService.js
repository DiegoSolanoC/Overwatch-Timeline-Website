/**
 * ComponentRunnerService - Handles running groups of components
 */
class ComponentRunnerService {
    constructor(loaderService, overlayService, statusService, progressService) {
        this.loaderService = loaderService;
        this.overlayService = overlayService;
        this.statusService = statusService;
        this.progressService = progressService;
    }

    async runUniversalFeatures() {
        const runBtn = document.getElementById('runUniversalBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }
        
        if (!this.overlayService.isRunOperation) {
            this.overlayService.setRunOperation(true);
            this.overlayService.show();
        }
        this.statusService.update('🚀 Starting Universal Features auto-load...', 'info');
        
        try {
            if (!this.loaderService.isLoaded('palette')) {
                this.statusService.update('→ Loading Palette...', 'info');
                await this.loaderService.loadPalette();
                await new Promise(r => setTimeout(r, 300));
            } else {
                this.statusService.update('→ Palette already loaded, skipping...', 'info');
            }
            
            if (!this.loaderService.isLoaded('music')) {
                this.statusService.update('→ Loading Music...', 'info');
                await this.loaderService.loadMusic();
            } else {
                this.statusService.update('→ Music already loaded, skipping...', 'info');
            }
            
            this.statusService.update('✓ Universal Features auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Universal Features auto-load:', error);
            this.statusService.update(`✗ Error in Universal Features auto-load: ${error.message}`, 'error');
        } finally {
            this.overlayService.setRunOperation(false);
            this.overlayService.hide();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    async runGlobeComponents(isAutoLoad = false) {
        if (!this.overlayService.isRunOperation) {
            this.overlayService.setRunOperation(true);
            this.overlayService.show();
            await new Promise(r => setTimeout(r, 50));
        }
        
        if (!isAutoLoad && window.SoundEffectsManager) {
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                window.SoundEffectsManager.play('modeSwitch');
            } else {
                window.SoundEffectsManager.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
                setTimeout(() => {
                    window.SoundEffectsManager.play('modeSwitch');
                }, 100);
            }
        }
        
        localStorage.setItem('currentMode', 'globe');
        
        const runBtn = document.getElementById('runGlobeBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }
        
        this.progressService.resetGlobeComponentsProgress();
        
        const testContainer = document.querySelector('.test-container');
        if (testContainer) {
            testContainer.style.display = 'none';
            this.statusService.update('→ Hiding menu container...', 'info');
        }
        
        // Hide main menu buttons (for main.html)
        const mainMenuButtons = document.querySelector('.main-menu-buttons');
        if (mainMenuButtons) {
            mainMenuButtons.style.display = 'none';
            this.statusService.update('→ Hiding main menu buttons...', 'info');
        }
        
        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            globeContainer.style.display = 'none';
            globeContainer.style.width = '100%';
            globeContainer.style.height = '100%';
            this.statusService.update('→ Preparing globe container...', 'info');
        }
        
        this.statusService.update('🚀 Starting Globe Components auto-load...', 'info');
        
        try {
            if (!this.loaderService.isLoaded('globeBase')) {
                this.statusService.update('→ Loading Globe Base...', 'info');
                await this.loaderService.loadGlobeBase();
                if (globeContainer) {
                    globeContainer.style.opacity = '1';
                    globeContainer.style.pointerEvents = 'auto';
                    globeContainer.style.display = 'block';
                    globeContainer.classList.add('loaded');
                }
                this.progressService.updateGlobeComponentsProgress(1);
                await new Promise(r => setTimeout(r, 300));
            } else {
                this.statusService.update('→ Globe Base already loaded, skipping...', 'info');
                if (globeContainer) {
                    globeContainer.style.opacity = '1';
                    globeContainer.style.pointerEvents = 'auto';
                    globeContainer.style.display = 'block';
                    globeContainer.classList.add('loaded');
                }
                this.progressService.updateGlobeComponentsProgress(1);
            }
            
            if (!this.loaderService.isLoaded('transport')) {
                this.statusService.update('→ Loading Transport...', 'info');
                await this.loaderService.loadTransport();
                this.progressService.updateGlobeComponentsProgress(2);
                await new Promise(r => setTimeout(r, 300));
            } else {
                this.statusService.update('→ Transport already loaded, skipping...', 'info');
                this.progressService.updateGlobeComponentsProgress(2);
            }
            
            if (!this.loaderService.isLoaded('controls')) {
                this.statusService.update('→ Loading Controls...', 'info');
                await this.loaderService.loadControls();
                this.progressService.updateGlobeComponentsProgress(3);
                await new Promise(r => setTimeout(r, 300));
            } else {
                this.statusService.update('→ Controls already loaded, skipping...', 'info');
                this.progressService.updateGlobeComponentsProgress(3);
            }
            
            if (!this.loaderService.isLoaded('events')) {
                this.statusService.update('→ Loading Events...', 'info');
                await this.loaderService.loadEvents();
                this.progressService.updateGlobeComponentsProgress(4);
            } else {
                this.statusService.update('→ Events already loaded, skipping...', 'info');
                this.progressService.updateGlobeComponentsProgress(4);
            }
            
            this.statusService.update('✓ Globe Components auto-load complete!', 'success');
            
            if (globeContainer) {
                globeContainer.style.opacity = '1';
                globeContainer.style.pointerEvents = 'auto';
                globeContainer.style.display = 'block';
                globeContainer.classList.add('loaded');
            }
        } catch (error) {
            console.error('Error in Globe Components auto-load:', error);
            this.statusService.update(`✗ Error in Globe Components auto-load: ${error.message}`, 'error');
        } finally {
            this.overlayService.setRunOperation(false);
            this.overlayService.hide();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    async runMenuComponents() {
        if (!this.overlayService.isRunOperation) {
            this.overlayService.setRunOperation(true);
            this.overlayService.show();
        }
        this.statusService.update('🚀 Starting Menu Components auto-load...', 'info');
        
        try {
            if (!this.loaderService.isLoaded('menu')) {
                this.statusService.update('→ Loading Menu...', 'info');
                await this.loaderService.loadMenu();
            } else {
                this.statusService.update('→ Menu already loaded, skipping...', 'info');
            }
            
            this.statusService.update('✓ Menu Components auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Menu Components auto-load:', error);
            this.statusService.update(`✗ Error in Menu Components auto-load: ${error.message}`, 'error');
        } finally {
            this.overlayService.setRunOperation(false);
            this.overlayService.hide();
        }
    }

    async runGlossaryComponents(isAutoLoad = false) {
        if (!isAutoLoad && window.SoundEffectsManager) {
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                window.SoundEffectsManager.play('modeSwitch');
            } else {
                window.SoundEffectsManager.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
                setTimeout(() => {
                    window.SoundEffectsManager.play('modeSwitch');
                }, 100);
            }
        }
        
        localStorage.setItem('currentMode', 'glossary');
        
        const runBtn = document.getElementById('runGlossaryBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }
        
        if (!this.overlayService.isRunOperation) {
            this.overlayService.setRunOperation(true);
            this.overlayService.show();
        }
        this.statusService.update('🚀 Starting Glossary Components auto-load...', 'info');
        
        try {
            this.statusService.update('→ Glossary Components loading not yet implemented', 'info');
            this.loaderService.setLoaded('glossary', true);
            this.statusService.update('✓ Glossary Components auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Glossary Components auto-load:', error);
            this.statusService.update(`✗ Error in Glossary Components auto-load: ${error.message}`, 'error');
        } finally {
            this.overlayService.setRunOperation(false);
            this.overlayService.hide();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }

    async runBiographyComponents(isAutoLoad = false) {
        if (!isAutoLoad && window.SoundEffectsManager) {
            if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                window.SoundEffectsManager.play('modeSwitch');
            } else {
                window.SoundEffectsManager.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
                setTimeout(() => {
                    window.SoundEffectsManager.play('modeSwitch');
                }, 100);
            }
        }
        
        localStorage.setItem('currentMode', 'biography');
        
        const runBtn = document.getElementById('runBiographyBtn');
        if (runBtn) {
            runBtn.disabled = true;
        }
        
        if (!this.overlayService.isRunOperation) {
            this.overlayService.setRunOperation(true);
            this.overlayService.show();
        }
        this.statusService.update('🚀 Starting Biography Components auto-load...', 'info');
        
        try {
            this.statusService.update('→ Biography Components loading not yet implemented', 'info');
            this.loaderService.setLoaded('biography', true);
            this.statusService.update('✓ Biography Components auto-load complete!', 'success');
        } catch (error) {
            console.error('Error in Biography Components auto-load:', error);
            this.statusService.update(`✗ Error in Biography Components auto-load: ${error.message}`, 'error');
        } finally {
            this.overlayService.setRunOperation(false);
            this.overlayService.hide();
            if (runBtn) {
                runBtn.disabled = false;
            }
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ComponentRunnerService = ComponentRunnerService;
}
