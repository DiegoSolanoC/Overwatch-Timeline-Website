/**
 * ComponentLoaderService - Handles loading and unloading of individual components
 */
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
        if (this.loadedComponents.palette) {
            this.statusService.update('→ Palette already loaded!', 'info');
            return;
        }
        
        if (!this.isRunOperation()) {
            this.overlayService.show();
        }
        this.buttonStateService.setState('loadPaletteBtn', 'loading');
        this.statusService.update('Starting Palette load...', 'info');
        
        try {
            if (!document.getElementById('colorPaletteToggle')) {
                this.statusService.update('Adding palette button...', 'info');
                const paletteBtn = document.createElement('button');
                paletteBtn.id = 'colorPaletteToggle';
                paletteBtn.className = 'globe-control-btn color-palette-btn bottom-right-btn';
                paletteBtn.title = 'Toggle Color Palette';
                paletteBtn.innerHTML = `
                    <span id="colorPaletteIcon">
                        <img src="assets/images/icons/Palette Icon.png" alt="Color Palette" style="width: 100%; height: 100%; object-fit: contain;">
                    </span>
                `;
                document.getElementById('content').appendChild(paletteBtn);
                this.statusService.update('✓ Palette button added', 'success');
            }
            
            this.statusService.update('Loading palette sound effect...', 'info');
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.loadSound('colorChange', 'assets/audio/sfx/Color Change.mp3');
                this.statusService.update('✓ Palette sound effect loaded', 'success');
            }
            
            this.paletteService.setupToggle();
            
            this.loadedComponents.palette = true;
            this.buttonStateService.setState('loadPaletteBtn', 'loaded');
            this.statusService.update('✓ Palette components fully loaded!', 'success');
        } catch (error) {
            console.error('Error loading Palette:', error);
            this.statusService.update(`✗ Error loading Palette: ${error.message}`, 'error');
            this.buttonStateService.setState('loadPaletteBtn', 'error');
        } finally {
            this.overlayService.hide();
        }
    }

    async unloadPalette() {
        if (!this.loadedComponents.palette) {
            this.statusService.update('Palette not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Palette...', 'info');
        
        try {
            const paletteBtn = document.getElementById('colorPaletteToggle');
            if (paletteBtn) {
                paletteBtn.remove();
                this.statusService.update('✓ Palette button removed', 'success');
            }
            
            this.paletteService.paletteToggleSetup = false;
            this.loadedComponents.palette = false;
            this.buttonStateService.setState('loadPaletteBtn', 'default');
            this.statusService.update('✓ Palette components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Palette:', error);
            this.statusService.update(`✗ Error unloading Palette: ${error.message}`, 'error');
        }
    }

    async loadGlobeBase() {
        if (this.loadedComponents.globeBase) {
            await this.unloadGlobeBase();
            return;
        }
        
        if (!this.isRunOperation()) {
            this.overlayService.show();
        }
        this.buttonStateService.setState('loadGlobeBaseBtn', 'loading');
        this.statusService.update('Starting Globe Base load...', 'info');
        
        try {
            const container = document.getElementById('globe-container');
            if (container) {
                container.style.opacity = '0';
                container.style.pointerEvents = 'none';
                container.style.position = 'absolute';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.display = 'block';
            }
            
            this.statusService.update('Loading GlobeController module...', 'info');
            const { GlobeController } = await import('../controllers/GlobeController.js');
            
            this.statusService.update('Initializing GlobeController...', 'info');
            const controller = new GlobeController();
            window.globeController = controller;
            
            this.statusService.update('Initializing globe scene...', 'info');
            await controller.init();
            
            if (!this.loadedComponents.events && controller.globeView) {
                this.statusService.update('Removing event markers (will load with Event Markers)...', 'info');
                const markers = controller.sceneModel.getMarkers();
                const scene = controller.sceneModel.getScene();
                
                markers.forEach(marker => {
                    if (marker.userData && marker.userData.isEventMarker) {
                        scene.remove(marker);
                        const index = controller.sceneModel.getMarkers().indexOf(marker);
                        if (index > -1) {
                            controller.sceneModel.getMarkers().splice(index, 1);
                        }
                    }
                });
                
                const globe = controller.sceneModel.getGlobe();
                if (globe) {
                    const toRemove = [];
                    globe.traverse((child) => {
                        if (child.userData && child.userData.isEventMarker) {
                            toRemove.push(child);
                        }
                    });
                    toRemove.forEach(child => {
                        if (child.parent) {
                            child.parent.remove(child);
                        }
                    });
                }
                this.statusService.update('✓ Event markers removed', 'success');
            }
            
            if (!this.isRunOperation()) {
                if (container) {
                    container.style.opacity = '1';
                    container.style.pointerEvents = 'auto';
                    container.style.display = 'block';
                    container.classList.add('loaded');
                    this.statusService.update('✓ Globe container made visible', 'success');
                }
            }
            
            this.loadedComponents.globeBase = true;
            this.buttonStateService.setState('loadGlobeBaseBtn', 'loaded');
            this.statusService.update('✓ Globe base components fully loaded!', 'success');
        } catch (error) {
            console.error('Error loading Globe Base:', error);
            this.statusService.update(`✗ Error loading Globe Base: ${error.message}`, 'error');
            this.buttonStateService.setState('loadGlobeBaseBtn', 'error');
        } finally {
            this.overlayService.hide();
        }
    }

    async unloadGlobeBase() {
        if (!this.loadedComponents.globeBase) {
            this.statusService.update('Globe base not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Globe Base...', 'info');
        
        try {
            if (window.globeController) {
                if (window.globeController.animationId) {
                    cancelAnimationFrame(window.globeController.animationId);
                    window.globeController.animationId = null;
                }
                
                if (window.globeController.globeController) {
                    window.globeController.globeController.stopAutoRotate();
                }
            }
            
            const container = document.getElementById('globe-container');
            if (container) {
                container.style.display = 'none';
                container.classList.remove('loaded');
                
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
                    if (ctx) {
                        ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
                    }
                }
            }
            
            if (window.globeController) {
                const scene = window.globeController.sceneModel?.getScene();
                const renderer = window.globeController.sceneModel?.getRenderer();
                
                if (scene) {
                    scene.traverse((object) => {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(mat => {
                                    if (mat.map) mat.map.dispose();
                                    mat.dispose();
                                });
                            } else {
                                if (object.material.map) object.material.map.dispose();
                                object.material.dispose();
                            }
                        }
                    });
                    while(scene.children.length > 0) {
                        scene.remove(scene.children[0]);
                    }
                }
                
                if (renderer) {
                    renderer.dispose();
                    renderer.forceContextLoss();
                    if (renderer.domElement && renderer.domElement.parentNode) {
                        renderer.domElement.parentNode.removeChild(renderer.domElement);
                    }
                }
                
                window.globeController = null;
            }
            
            if (this.loadedComponents.transport) {
                await this.unloadTransport();
            }
            if (this.loadedComponents.controls) {
                await this.unloadControls();
            }
            if (this.loadedComponents.events) {
                await this.unloadEvents();
            }
            
            this.loadedComponents.globeBase = false;
            this.buttonStateService.setState('loadGlobeBaseBtn', 'default');
            this.statusService.update('✓ Globe base components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Globe Base:', error);
            this.statusService.update(`✗ Error unloading Globe Base: ${error.message}`, 'error');
        }
    }

    async loadTransport() {
        if (this.loadedComponents.transport) {
            this.statusService.update('→ Transport already loaded!', 'info');
            return;
        }
        
        if (!this.loadedComponents.globeBase || !window.globeController) {
            this.statusService.update('⚠ Globe base must be loaded first!', 'error');
            this.buttonStateService.setState('loadTransportBtn', 'error');
            return;
        }
        
        if (!this.isRunOperation()) {
            this.overlayService.show();
        }
        this.buttonStateService.setState('loadTransportBtn', 'loading');
        this.statusService.update('Starting Transport load...', 'info');
        
        try {
            const controller = window.globeController;
            
            if (!document.getElementById('hyperloopToggle')) {
                this.statusService.update('Adding transport toggle...', 'info');
                const transportBtn = document.createElement('button');
                transportBtn.id = 'hyperloopToggle';
                transportBtn.className = 'globe-control-btn hyperloop-btn active';
                transportBtn.title = 'Toggle Transport Systems';
                transportBtn.innerHTML = `
                    <span id="hyperloopIcon">
                        <img src="assets/images/icons/Train Icon.png" alt="Transport" style="width: 100%; height: 100%; object-fit: contain;">
                    </span>
                `;
                document.getElementById('content').appendChild(transportBtn);
                this.statusService.update('✓ Transport toggle added', 'success');
            }
            
            if (controller.uiView) {
                controller.uiView.setupHyperloopToggle(() => {
                    controller.transportView.updateHyperloopVisibility();
                });
                this.statusService.update('✓ Transport toggle initialized', 'success');
            }
            
            this.statusService.update('Loading transport sound effect...', 'info');
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.loadSound('transportToggle', 'assets/audio/sfx/Transport Toggle.mp3');
                this.statusService.update('✓ Transport sound effect loaded', 'success');
            }
            
            if (controller.transportView) {
                controller.transportView.updateHyperloopVisibility();
            }
            
            this.loadedComponents.transport = true;
            this.buttonStateService.setState('loadTransportBtn', 'loaded');
            this.statusService.update('✓ Transport components fully loaded!', 'success');
        } catch (error) {
            console.error('Error loading Transport:', error);
            this.statusService.update(`✗ Error loading Transport: ${error.message}`, 'error');
            this.buttonStateService.setState('loadTransportBtn', 'error');
        } finally {
            this.overlayService.hide();
        }
    }

    async unloadTransport() {
        if (!this.loadedComponents.transport) {
            this.statusService.update('Transport not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Transport...', 'info');
        
        try {
            const transportBtn = document.getElementById('hyperloopToggle');
            if (transportBtn) {
                transportBtn.remove();
                this.statusService.update('✓ Transport toggle removed', 'success');
            }
            
            this.loadedComponents.transport = false;
            this.buttonStateService.setState('loadTransportBtn', 'default');
            this.statusService.update('✓ Transport components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Transport:', error);
            this.statusService.update(`✗ Error unloading Transport: ${error.message}`, 'error');
        }
    }

    async loadControls() {
        if (this.loadedComponents.controls) {
            this.statusService.update('→ Controls already loaded!', 'info');
            return;
        }
        
        if (!this.loadedComponents.globeBase || !window.globeController) {
            this.statusService.update('⚠ Globe base must be loaded first!', 'error');
            this.buttonStateService.setState('loadControlsBtn', 'error');
            return;
        }
        
        if (!this.isRunOperation()) {
            this.overlayService.show();
        }
        this.buttonStateService.setState('loadControlsBtn', 'loading');
        this.statusService.update('Starting Controls load...', 'info');
        
        try {
            const controller = window.globeController;
            
            if (!document.getElementById('autoRotateToggle')) {
                this.statusService.update('Adding rotation toggle...', 'info');
                const rotateBtn = document.createElement('button');
                rotateBtn.id = 'autoRotateToggle';
                rotateBtn.className = 'globe-control-btn';
                rotateBtn.title = 'Toggle Auto-Rotation';
                rotateBtn.innerHTML = `
                    <span id="rotateIcon">
                        <img src="assets/images/icons/Rotation Icon.png" alt="Rotate" style="width: 100%; height: 100%; object-fit: contain;">
                    </span>
                `;
                document.getElementById('content').appendChild(rotateBtn);
                this.statusService.update('✓ Rotation toggle added', 'success');
            }
            
            if (!document.getElementById('exitButton')) {
                this.statusService.update('Adding exit button...', 'info');
                const exitBtn = document.createElement('button');
                exitBtn.id = 'exitButton';
                exitBtn.className = 'globe-control-btn exit-btn';
                exitBtn.style.position = 'absolute';
                exitBtn.style.top = '20px';
                exitBtn.style.right = '20px';
                exitBtn.style.bottom = 'auto';
                exitBtn.style.left = 'auto';
                exitBtn.title = 'Exit to Main Menu';
                exitBtn.innerHTML = `
                    <span id="exitIcon">
                        <img src="assets/images/icons/Home Button.png" alt="Exit" style="width: 100%; height: 100%; object-fit: contain;">
                    </span>
                `;
                document.getElementById('content').appendChild(exitBtn);
                this.statusService.update('✓ Exit button added', 'success');
                
                exitBtn.addEventListener('click', async () => {
                    this.overlayService.setRunOperation(true);
                    this.overlayService.show();
                    
                    if (window.SoundEffectsManager) {
                        if (window.SoundEffectsManager.sounds && window.SoundEffectsManager.sounds['modeSwitch']) {
                            window.SoundEffectsManager.play('modeSwitch');
                        } else {
                            window.SoundEffectsManager.loadSound('modeSwitch', 'assets/audio/sfx/Mode Switch.mp3');
                            setTimeout(() => {
                                window.SoundEffectsManager.play('modeSwitch');
                            }, 100);
                        }
                    }
                    
                    localStorage.removeItem('currentMode');
                    this.statusService.update('Exiting to main menu...', 'info');
                    
                    try {
                        if (window.killGlobeComponents) {
                            await window.killGlobeComponents();
                        }
                    } catch (error) {
                        console.error('[Exit Button] Error in killGlobeComponents:', error);
                    } finally {
                        this.overlayService.setRunOperation(false);
                        this.overlayService.hide();
                    }
                });
            }
            
            if (controller.uiView) {
                controller.uiView.setupAutoRotateToggle();
                this.statusService.update('✓ Rotation toggle initialized', 'success');
            }
            
            this.statusService.update('Loading rotation sound effect...', 'info');
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.loadSound('rotationToggle', 'assets/audio/sfx/Rotation Toggle.mp3');
                this.statusService.update('✓ Rotation sound effect loaded', 'success');
            }
            
            this.loadedComponents.controls = true;
            this.buttonStateService.setState('loadControlsBtn', 'loaded');
            this.statusService.update('✓ Controls components fully loaded!', 'success');
        } catch (error) {
            console.error('Error loading Controls:', error);
            this.statusService.update(`✗ Error loading Controls: ${error.message}`, 'error');
            this.buttonStateService.setState('loadControlsBtn', 'error');
        } finally {
            this.overlayService.hide();
        }
    }

    async unloadControls() {
        if (!this.loadedComponents.controls) {
            this.statusService.update('Controls not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Controls...', 'info');
        
        try {
            const rotateBtn = document.getElementById('autoRotateToggle');
            if (rotateBtn) {
                rotateBtn.remove();
                this.statusService.update('✓ Rotation toggle removed', 'success');
            }
            
            const exitBtn = document.getElementById('exitButton');
            if (exitBtn) {
                exitBtn.remove();
                this.statusService.update('✓ Exit button removed', 'success');
            }
            
            this.loadedComponents.controls = false;
            this.buttonStateService.setState('loadControlsBtn', 'default');
            this.statusService.update('✓ Controls components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Controls:', error);
            this.statusService.update(`✗ Error unloading Controls: ${error.message}`, 'error');
        }
    }

    async loadMusic() {
        if (this.loadedComponents.music) {
            this.statusService.update('→ Music already loaded!', 'info');
            return;
        }
        
        if (!this.isRunOperation()) {
            this.overlayService.show();
        }
        this.buttonStateService.setState('loadMusicBtn', 'loading');
        this.statusService.update('Starting Music load...', 'info');
        
        try {
            if (!document.getElementById('musicToggle')) {
                this.statusService.update('Adding music toggle button...', 'info');
                const musicBtn = document.createElement('button');
                musicBtn.id = 'musicToggle';
                musicBtn.className = 'globe-control-btn music-btn bottom-right-btn';
                musicBtn.title = 'Music Options';
                musicBtn.innerHTML = `
                    <span id="musicIcon">
                        <img src="assets/images/icons/Music Icon.png" alt="Music" style="width: 100%; height: 100%; object-fit: contain;">
                    </span>
                `;
                document.getElementById('content').appendChild(musicBtn);
                this.statusService.update('✓ Music button added', 'success');
            }
            
            if (!document.getElementById('musicPanel')) {
                this.statusService.update('Adding music panel...', 'info');
                const musicPanel = document.createElement('div');
                musicPanel.id = 'musicPanel';
                musicPanel.className = 'music-panel';
                musicPanel.innerHTML = `
                    <div class="music-panel-close" id="musicPanelClose">&times;</div>
                    <div class="music-panel-content">
                        <div class="music-actions">
                            <h2 class="music-title">Music Options</h2>
                            <div class="music-actions-buttons"></div>
                        </div>
                        <div class="music-now-playing" id="musicNowPlaying">
                            <div class="music-current-song" id="musicCurrentSong">Loading...</div>
                            <div class="music-progress-container">
                                <input type="range" id="musicProgressBar" class="music-progress-bar" min="0" max="100" value="0">
                                <div class="music-time-display">
                                    <span id="musicCurrentTime">0:00</span> <span id="musicTotalTime">0:00</span>
                                </div>
                                <div class="music-control-buttons">
                                    <button id="pauseBtn" class="music-control-btn">
                                        <img id="pauseBtnIcon" src="assets/images/icons/Pause Icon.png" alt="Pause" class="control-icon">
                                    </button>
                                    <button id="skipBtn" class="music-control-btn">
                                        <img id="skipBtnIcon" src="assets/images/icons/Skip Icon.png" alt="Skip" class="control-icon">
                                    </button>
                                    <button id="muteBtn" class="music-control-btn">
                                        <img id="muteBtnIcon" src="assets/images/icons/Unmuted Icon.png" alt="Mute" class="control-icon">
                                    </button>
                                    <button id="shuffleBtn" class="music-control-btn">
                                        <img id="shuffleBtnIcon" src="assets/images/icons/Shuffle Icon.png" alt="Shuffle" class="control-icon">
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="music-control-row">
                            <label for="volumeSlider">Music Volume:</label>
                            <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="10">
                            <span id="volumeValue" class="volume-value">10%</span>
                        </div>
                        <div class="music-control-row">
                            <label for="soundEffectsSlider">Sound Effects Volume:</label>
                            <input type="range" id="soundEffectsSlider" class="volume-slider" min="0" max="100" value="50">
                            <span id="soundEffectsVolumeValue" class="volume-value">50%</span>
                        </div>
                        <div class="music-grid" id="musicGrid"></div>
                    </div>
                `;
                document.body.appendChild(musicPanel);
                this.statusService.update('✓ Music panel added', 'success');
            }
            
            if (window.MusicManager && typeof window.MusicManager.init === 'function') {
                this.statusService.update('Initializing MusicManager...', 'info');
                window.MusicManager.init();
                this.statusService.update('✓ MusicManager initialized', 'success');
            } else {
                console.warn('MusicManager not available after loading music components');
            }
            
            if (!document.getElementById('backgroundMusic')) {
                this.statusService.update('Adding audio element...', 'info');
                const audio = document.createElement('audio');
                audio.id = 'backgroundMusic';
                audio.loop = true;
                document.body.appendChild(audio);
                this.statusService.update('✓ Audio element added', 'success');
            }
            
            this.statusService.update('Loading music sound effect...', 'info');
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.loadSound('music', 'assets/audio/sfx/Music.mp3');
                this.statusService.update('✓ Music sound effect loaded', 'success');
            }
            
            setTimeout(() => {
                if (window.MusicManager && typeof window.MusicManager.init === 'function') {
                    window.MusicManager.init();
                    this.statusService.update('✓ Music panel initialized', 'success');
                } else {
                    console.error('MusicManager not available:', {
                        MusicManager: !!window.MusicManager,
                        hasInit: window.MusicManager && typeof window.MusicManager.init === 'function',
                        services: {
                            MusicStateService: !!window.MusicStateService,
                            MusicPanelService: !!window.MusicPanelService,
                            MusicControlService: !!window.MusicControlService
                        }
                    });
                    this.statusService.update('⚠ MusicManager not found - music panel may not work', 'error');
                }
            }, 50);
            
            this.loadedComponents.music = true;
            this.buttonStateService.setState('loadMusicBtn', 'loaded');
            this.statusService.update('✓ Music components fully loaded!', 'success');
        } catch (error) {
            console.error('Error loading Music:', error);
            this.statusService.update(`✗ Error loading Music: ${error.message}`, 'error');
            this.buttonStateService.setState('loadMusicBtn', 'error');
        } finally {
            this.overlayService.hide();
        }
    }

    async unloadMusic() {
        if (!this.loadedComponents.music) {
            this.statusService.update('Music not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Music...', 'info');
        
        try {
            const musicBtn = document.getElementById('musicToggle');
            if (musicBtn) {
                musicBtn.remove();
                this.statusService.update('✓ Music button removed', 'success');
            }
            
            const musicPanel = document.getElementById('musicPanel');
            if (musicPanel) {
                musicPanel.remove();
                this.statusService.update('✓ Music panel removed', 'success');
            }
            
            if (window.currentAudio) {
                window.currentAudio.pause();
                window.currentAudio = null;
            }
            
            this.loadedComponents.music = false;
            this.buttonStateService.setState('loadMusicBtn', 'default');
            this.statusService.update('✓ Music components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Music:', error);
            this.statusService.update(`✗ Error unloading Music: ${error.message}`, 'error');
        }
    }

    async loadEvents() {
        if (this.loadedComponents.events) {
            this.statusService.update('→ Events already loaded!', 'info');
            return;
        }
        
        if (!this.loadedComponents.globeBase || !window.globeController) {
            this.statusService.update('⚠ Globe base must be loaded first!', 'error');
            this.buttonStateService.setState('loadEventsBtn', 'error');
            return;
        }
        
        if (!this.isRunOperation()) {
            this.overlayService.show();
        }
        this.buttonStateService.setState('loadEventsBtn', 'loading');
        this.statusService.update('Starting Events load...', 'info');
        
        try {
            if (window.eventManager) {
                this.statusService.update('Cleaning up existing EventManager instance...', 'info');
                if (window.eventManager.listenersSetup) {
                    window.eventManager.listenersSetup = false;
                }
                // Note: cities, airports, seaports are getters from dataService, not settable
                // Just clear the eventManager reference
                window.eventManager = null;
            }
            
            this.statusService.update('Loading EventManager...', 'info');
            const existingScript = document.querySelector('script[src*="EventManager.js"]');
            if (typeof EventManager === 'undefined' && !existingScript) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'src/managers/EventManager.js?' + Date.now();
                    script.onload = async () => {
                        try {
                            await new Promise(r => setTimeout(r, 50));
                            if (typeof EventManager === 'undefined') {
                                throw new Error('EventManager class not found after loading script');
                            }
                            this.statusService.update('Initializing EventManager...', 'info');
                            const eventManager = new EventManager();
                            await eventManager.init();
                            window.eventManager = eventManager;
                            this.statusService.update('✓ EventManager initialized', 'success');
                            resolve();
                        } catch (error) {
                            console.error('EventManager initialization error:', error);
                            this.statusService.update(`✗ EventManager initialization failed: ${error.message}`, 'error');
                            reject(error);
                        }
                    };
                    script.onerror = () => {
                        const error = new Error('Failed to load EventManager.js');
                        this.statusService.update(`✗ ${error.message}`, 'error');
                        reject(error);
                    };
                    document.head.appendChild(script);
                });
            } else {
                if (typeof EventManager === 'undefined') {
                    this.statusService.update('Waiting for EventManager class to be available...', 'info');
                    let attempts = 0;
                    while (typeof EventManager === 'undefined' && attempts < 10) {
                        await new Promise(r => setTimeout(r, 50));
                        attempts++;
                    }
                    if (typeof EventManager === 'undefined') {
                        throw new Error('EventManager class not available after waiting');
                    }
                }
                this.statusService.update('Creating new EventManager instance...', 'info');
                const eventManager = new EventManager();
                this.statusService.update('Initializing EventManager...', 'info');
                try {
                    await eventManager.init();
                    window.eventManager = eventManager;
                    this.statusService.update('✓ EventManager initialized', 'success');
                } catch (error) {
                    console.error('EventManager initialization error:', error);
                    this.statusService.update(`✗ EventManager initialization failed: ${error.message}`, 'error');
                    throw error;
                }
            }
            
            if (window.globeController && window.eventManager) {
                this.statusService.update('Syncing events with globe...', 'info');
                window.globeController.dataModel.events = [...window.eventManager.events];
                if (window.globeController.globeView) {
                    window.globeController.globeView.addEventMarkers();
                    window.globeController.globeView.refreshEventMarkers();
                }
                this.statusService.update('✓ Events synced with globe and markers added', 'success');
            }
            
            if (!document.getElementById('filtersToggle')) {
                this.statusService.update('Adding filter button...', 'info');
                const filterBtn = document.createElement('button');
                filterBtn.id = 'filtersToggle';
                filterBtn.className = 'globe-control-btn filters-btn top-left-btn';
                filterBtn.title = 'Open Filters';
                filterBtn.innerHTML = `
                    <span id="filtersIcon">
                        <img src="assets/images/icons/Filter Icon.png" alt="Filters" style="width: 100%; height: 100%; object-fit: contain;">
                    </span>
                `;
                document.getElementById('content').appendChild(filterBtn);
                this.statusService.update('✓ Filter button added', 'success');
            }
            
            if (!document.getElementById('eventsManageToggle')) {
                this.statusService.update('Adding event manager button...', 'info');
                const eventMgrBtn = document.createElement('button');
                eventMgrBtn.id = 'eventsManageToggle';
                eventMgrBtn.className = 'globe-control-btn events-manage-btn top-left-btn';
                eventMgrBtn.title = 'Manage Events';
                eventMgrBtn.innerHTML = `
                    <span id="eventsManageIcon">
                        <img src="assets/images/icons/Event Manager Icon.png" alt="Event Manager" style="width: 100%; height: 100%; object-fit: contain%;">
                    </span>
                `;
                document.getElementById('content').appendChild(eventMgrBtn);
                this.statusService.update('✓ Event manager button added', 'success');
            }
            
            if (!document.getElementById('eventPagination')) {
                this.statusService.update('Adding event pagination...', 'info');
                const pagination = document.createElement('div');
                pagination.id = 'eventPagination';
                pagination.className = 'event-pagination';
                pagination.innerHTML = `
                    <div class="page-controls-row">
                        <button id="prevPageBtn" class="page-btn" title="Previous Page">‹</button>
                        <div class="page-input-container">
                            <span class="page-label">Page</span>
                            <input type="number" id="pageInput" class="page-input" min="1" value="1" title="Enter page number">
                            <span class="page-total" id="pageTotal">/ 1</span>
                        </div>
                        <button id="nextPageBtn" class="page-btn" title="Next Page">›</button>
                    </div>
                    <div class="event-number-buttons" id="eventNumberButtons">
                        <button class="event-number-btn" data-position="1" title="Event 1">1</button>
                        <button class="event-number-btn" data-position="2" title="Event 2">2</button>
                        <button class="event-number-btn" data-position="3" title="Event 3">3</button>
                        <button class="event-number-btn" data-position="4" title="Event 4">4</button>
                        <button class="event-number-btn" data-position="5" title="Event 5">5</button>
                        <button class="event-number-btn" data-position="6" title="Event 6">6</button>
                        <button class="event-number-btn" data-position="7" title="Event 7">7</button>
                        <button class="event-number-btn" data-position="8" title="Event 8">8</button>
                        <button class="event-number-btn" data-position="9" title="Event 9">9</button>
                        <button class="event-number-btn" data-position="10" title="Event 10">10</button>
                    </div>
                `;
                document.getElementById('content').appendChild(pagination);
                
                const applyMobilePaginationPosition = () => {
                    const paginationEl = document.getElementById('eventPagination');
                    if (paginationEl && window.innerWidth <= 768) {
                        paginationEl.style.setProperty('position', 'fixed', 'important');
                        paginationEl.style.setProperty('bottom', '120px', 'important');
                        paginationEl.style.setProperty('left', '50%', 'important');
                        paginationEl.style.setProperty('right', 'auto', 'important');
                        paginationEl.style.setProperty('transform', 'translateX(-50%)', 'important');
                        paginationEl.style.setProperty('top', 'auto', 'important');
                    }
                };
                
                applyMobilePaginationPosition();
                window.addEventListener('resize', applyMobilePaginationPosition);
                
                this.statusService.update('✓ Event pagination added', 'success');
            }
            
            if (!document.getElementById('filtersPanel')) {
                this.statusService.update('Adding filters panel...', 'info');
                const filtersPanel = document.createElement('div');
                filtersPanel.id = 'filtersPanel';
                filtersPanel.className = 'filters-panel';
                filtersPanel.innerHTML = `
                    <div class="filters-panel-close" id="filtersPanelClose">&times;</div>
                    <div class="filters-panel-content">
                        <div class="filters-actions">
                            <h2 class="filters-title">Filters</h2>
                            <div class="filters-actions-buttons">
                                <button id="clearFiltersBtn" class="filters-action-btn">Clear</button>
                                <button id="confirmFiltersBtn" class="filters-action-btn filters-confirm-btn">Confirm</button>
                            </div>
                        </div>
                        <div class="filters-tabs">
                            <button id="heroesTab" class="filter-tab active">
                                Heroes
                                <span class="filter-count" id="heroesCount">0</span>
                            </button>
                            <button id="factionsTab" class="filter-tab">
                                Factions
                                <span class="filter-count" id="factionsCount">0</span>
                            </button>
                        </div>
                        <div class="filters-grid" id="filtersGrid"></div>
                    </div>
                `;
                document.body.appendChild(filtersPanel);
                this.statusService.update('✓ Filters panel added', 'success');
            }
            
            if (!document.getElementById('eventSlide')) {
                this.statusService.update('⚠ Event slide panel not found in HTML', 'error');
            } else {
                this.statusService.update('✓ Event slide panel found', 'success');
            }
            
            if (!document.getElementById('eventImageOverlay')) {
                this.statusService.update('⚠ Event image overlay not found in HTML', 'error');
            } else {
                this.statusService.update('✓ Event image overlay found', 'success');
            }
            
            if (!document.getElementById('eventsManagePanel')) {
                this.statusService.update('⚠ Event manager panel not found in HTML', 'error');
            } else {
                this.statusService.update('✓ Event manager panel found', 'success');
            }
            
            if (!document.getElementById('eventEditModal')) {
                this.statusService.update('⚠ Event edit modal not found in HTML', 'error');
            } else {
                this.statusService.update('✓ Event edit modal found', 'success');
            }
            
            this.statusService.update('Loading event sound effects...', 'info');
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.loadSound('filterPick', 'assets/audio/sfx/Filter Pick.mp3');
                window.SoundEffectsManager.loadSound('filterOff', 'assets/audio/sfx/Filter Off.mp3');
                window.SoundEffectsManager.loadSound('filterConfirm', 'assets/audio/sfx/Filter Confirm.mp3');
                window.SoundEffectsManager.loadSound('filterClear', 'assets/audio/sfx/Filter Clear.mp3');
                window.SoundEffectsManager.loadSound('filterButton', 'assets/audio/sfx/Filter Button.mp3');
                window.SoundEffectsManager.loadSound('eventClick', 'assets/audio/sfx/Event Click.mp3');
                window.SoundEffectsManager.loadSound('eventManager', 'assets/audio/sfx/Event Manager.mp3');
                window.SoundEffectsManager.loadSound('switchEvent', 'assets/audio/sfx/Switch Event.mp3');
                window.SoundEffectsManager.loadSound('page', 'assets/audio/sfx/Page.mp3');
                this.statusService.update('✓ Event sound effects loaded', 'success');
            }
            
            this.statusService.update('Initializing filter panel...', 'info');
            if (window.FilterService && typeof window.FilterService.init === 'function') {
                window.FilterService.init();
                this.statusService.update('✓ Filter panel initialized', 'success');
            } else {
                this.statusService.update('⚠ FilterService not found - filter panel may not work', 'error');
            }
            
            if (window.eventManager) {
                this.statusService.update('Setting up event listeners for add/edit functionality...', 'info');
                const toggleBtn = document.getElementById('eventsManageToggle');
                const panel = document.getElementById('eventsManagePanel');
                const addBtn = document.getElementById('addEventBtn');
                if (toggleBtn && panel && addBtn) {
                    setTimeout(() => {
                        window.eventManager.setupEventListeners();
                        this.statusService.update('✓ Event listeners set up - add/edit functionality ready', 'success');
                    }, 50);
                } else {
                    this.statusService.update(`⚠ Some elements not found! Toggle: ${!!toggleBtn}, Panel: ${!!panel}, AddBtn: ${!!addBtn}`, 'error');
                    setTimeout(() => {
                        if (window.eventManager) {
                            const retryToggleBtn = document.getElementById('eventsManageToggle');
                            const retryPanel = document.getElementById('eventsManagePanel');
                            const retryAddBtn = document.getElementById('addEventBtn');
                            if (retryToggleBtn && retryPanel && retryAddBtn) {
                                window.eventManager.setupEventListeners();
                                this.statusService.update('✓ Event listeners set up (retry successful)', 'success');
                            } else {
                                this.statusService.update(`✗ Failed to set up event listeners - elements still missing`, 'error');
                            }
                        }
                    }, 200);
                }
            }
            
            if (window.globeController && window.eventManager) {
                this.statusService.update('Syncing events with globe...', 'info');
                window.globeController.dataModel.events = [...window.eventManager.events];
                if (window.globeController.globeView) {
                    window.globeController.globeView.addEventMarkers();
                    window.globeController.globeView.refreshEventMarkers();
                }
                if (window.globeController.uiView) {
                    window.globeController.uiView.setupEventPagination(() => {
                        if (window.globeController.globeView) {
                            window.globeController.globeView.refreshEventMarkers();
                        }
                    });
                    window.globeController.uiView.setupEventNumberButtons(() => {
                        if (window.globeController.globeView) {
                            window.globeController.globeView.refreshEventMarkers();
                        }
                    });
                }
                this.statusService.update('✓ Events synced with globe and markers added', 'success');
            }
            
            this.loadedComponents.events = true;
            this.buttonStateService.setState('loadEventsBtn', 'loaded');
            this.statusService.update('✓ Events components fully loaded!', 'success');
        } catch (error) {
            console.error('Error loading Events:', error);
            this.statusService.update(`✗ Error loading Events: ${error.message}`, 'error');
            this.buttonStateService.setState('loadEventsBtn', 'error');
        } finally {
            this.overlayService.hide();
        }
    }

    async unloadEvents() {
        if (!this.loadedComponents.events) {
            this.statusService.update('Events not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Events...', 'info');
        
        try {
            const filterBtn = document.getElementById('filtersToggle');
            if (filterBtn) {
                filterBtn.remove();
                this.statusService.update('✓ Filter button removed', 'success');
            }
            
            const eventsManageBtn = document.getElementById('eventsManageToggle');
            if (eventsManageBtn) {
                eventsManageBtn.remove();
                this.statusService.update('✓ Event manager button removed', 'success');
            }
            
            const pagination = document.getElementById('eventPagination');
            if (pagination) {
                pagination.remove();
                this.statusService.update('✓ Event pagination removed', 'success');
            }
            
            const filtersPanel = document.getElementById('filtersPanel');
            if (filtersPanel && filtersPanel.parentElement) {
                filtersPanel.remove();
            }
            
            if (window.eventManager) {
                window.eventManager.listenersSetup = false;
            }
            
            this.loadedComponents.events = false;
            this.buttonStateService.setState('loadEventsBtn', 'default');
            this.statusService.update('✓ Events components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Events:', error);
            this.statusService.update(`✗ Error unloading Events: ${error.message}`, 'error');
        }
    }

    async loadMenu() {
        if (this.loadedComponents.menu) {
            this.statusService.update('✓ Menu components already loaded!', 'success');
            if (!this.isRunOperation()) {
                this.overlayService.hide();
            }
            return;
        }
        
        // Check if menu buttons container already exists
        const existingMenuButtons = document.querySelector('.main-menu-buttons');
        if (existingMenuButtons) {
            // Menu buttons already exist, just set up listeners
            this.statusService.update('Menu buttons already exist, setting up listeners...', 'info');
            if (window.setupMenuButtonListeners) {
                window.setupMenuButtonListeners();
            }
            this.loadedComponents.menu = true;
            this.buttonStateService.setState('loadMenuBtn', 'loaded');
            this.statusService.update('✓ Menu components fully loaded!', 'success');
            return;
        }
        
        // Check if we're on test.html (buttons with these IDs already exist as test buttons)
        const existingGlobeBtn = document.getElementById('runGlobeBtn');
        const isTestPage = existingGlobeBtn && existingGlobeBtn.classList.contains('test-run-button');
        
        // On both test.html and main.html, create the menu buttons
        this.statusService.update('Creating main menu buttons...', 'info');
        const menuButtons = document.createElement('div');
        menuButtons.className = 'main-menu-buttons';
        
        // On test page, remove the old test buttons first to avoid ID conflicts
        if (isTestPage) {
            const oldGlobeBtn = document.getElementById('runGlobeBtn');
            const oldGlossaryBtn = document.getElementById('runGlossaryBtn');
            const oldBiographyBtn = document.getElementById('runBiographyBtn');
            
            // Remove old test buttons (they'll be replaced by menu buttons)
            if (oldGlobeBtn && oldGlobeBtn.classList.contains('test-run-button')) {
                oldGlobeBtn.remove();
            }
            if (oldGlossaryBtn && oldGlossaryBtn.classList.contains('test-run-button')) {
                oldGlossaryBtn.remove();
            }
            if (oldBiographyBtn && oldBiographyBtn.classList.contains('test-run-button')) {
                oldBiographyBtn.remove();
            }
        }
        
        const isGitHubPages = (() => {
            const hostname = window.location.hostname;
            return hostname.includes('github.io') || 
                   hostname.includes('github.com') ||
                   hostname === 'localhost' && window.location.port === '';
        })();
        
        const globeBtn = document.createElement('button');
        globeBtn.id = 'runGlobeBtn';
        globeBtn.className = 'main-menu-btn';
        globeBtn.title = 'Global Timeline';
        globeBtn.innerHTML = `
            <div class="main-menu-image-container">
                <img src="assets/images/menu/Global%20Timeline.png" alt="Global Timeline">
            </div>
            <div class="main-menu-label-container">
                <div class="main-menu-label">Global Timeline</div>
                <div class="main-menu-description">Revisit the Story of Overwatch in Chronological Order, view through a 3D Globe</div>
            </div>
        `;
        menuButtons.appendChild(globeBtn);
        
        if (!isGitHubPages) {
            const glossaryBtn = document.createElement('button');
            glossaryBtn.id = 'runGlossaryBtn';
            glossaryBtn.className = 'main-menu-btn';
            glossaryBtn.title = 'Concept Glossary';
            glossaryBtn.innerHTML = `
                <div class="main-menu-image-container">
                    <img src="assets/images/menu/Concept%20Glossary.png" alt="Concept Glossary">
                </div>
                <div class="main-menu-label-container">
                    <div class="main-menu-label">Concept Glossary</div>
                    <div class="main-menu-description">Coming Soon...</div>
                </div>
            `;
            menuButtons.appendChild(glossaryBtn);
            
            const biographyBtn = document.createElement('button');
            biographyBtn.id = 'runBiographyBtn';
            biographyBtn.className = 'main-menu-btn';
            biographyBtn.title = 'Character Bios';
            biographyBtn.innerHTML = `
                <div class="main-menu-image-container">
                    <img src="assets/images/menu/Character%20Bios.png" alt="Character Bios">
                </div>
                <div class="main-menu-label-container">
                    <div class="main-menu-label">Character Bios</div>
                    <div class="main-menu-description">Coming Soon...</div>
                </div>
            `;
            menuButtons.appendChild(biographyBtn);
        }
        
        // Append menu buttons to content area (works for both test.html and main.html)
        const contentContainer = document.getElementById('content');
        const targetContainer = contentContainer || document.body;
        
        if (targetContainer) {
            // On test page, insert before test-container so menu appears first
            if (isTestPage) {
                const testContainer = document.querySelector('.test-container');
                if (testContainer && testContainer.parentNode) {
                    testContainer.parentNode.insertBefore(menuButtons, testContainer);
                } else {
                    targetContainer.appendChild(menuButtons);
                }
            } else {
                targetContainer.appendChild(menuButtons);
            }
            this.statusService.update('✓ Menu buttons added', 'success');
            
            // Set up event listeners for the newly created menu buttons
            if (window.setupMenuButtonListeners) {
                window.setupMenuButtonListeners();
            }
        } else {
            console.error('No container found for menu buttons!');
        }
        
        this.loadedComponents.menu = true;
        this.buttonStateService.setState('loadMenuBtn', 'loaded');
        this.statusService.update('✓ Menu components fully loaded!', 'success');
    }

    async unloadMenu() {
        if (!this.loadedComponents.menu) {
            this.statusService.update('Menu not loaded', 'info');
            return;
        }
        
        this.statusService.update('Unloading Menu...', 'info');
        
        try {
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
            
            this.loadedComponents.menu = false;
            this.buttonStateService.setState('loadMenuBtn', 'default');
            this.statusService.update('✓ Menu components unloaded!', 'success');
        } catch (error) {
            console.error('Error unloading Menu:', error);
            this.statusService.update(`✗ Error unloading Menu: ${error.message}`, 'error');
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ComponentLoaderService = ComponentLoaderService;
}
