/**
 * MusicPanelService - Handles music panel UI (open/close, button interactions)
 */

class MusicPanelService {
    constructor(musicButton, musicPanel, musicPanelClose) {
        this.musicButton = musicButton;
        this.musicPanel = musicPanel;
        this.musicPanelClose = musicPanelClose;
    }

    /**
     * Setup panel toggle button handlers
     */
    setupToggleButton(onToggle) {
        if (!this.musicButton) {
            console.error('MusicPanelService: musicButton is null in setupToggleButton!');
            return;
        }
        console.log('MusicPanelService: Setting up toggle button for:', this.musicButton);
        
        // Handle button click/touch - unified handler
        const handleMusicToggle = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            // Play music button sound
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('music');
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
            
            // Close event management panel if open
            const eventsManagePanel = document.getElementById('eventsManagePanel');
            const eventsManageToggle = document.getElementById('eventsManageToggle');
            if (eventsManagePanel && eventsManagePanel.classList.contains('open')) {
                eventsManagePanel.classList.remove('open');
                if (eventsManageToggle) {
                    eventsManageToggle.classList.remove('active');
                }
            }
            
            // Toggle music panel
            this.musicPanel.classList.toggle('open');
            if (this.musicPanel.classList.contains('open')) {
                this.musicButton.classList.add('active');
            } else {
                this.musicButton.classList.remove('active');
            }
            
            if (onToggle) {
                onToggle(this.musicPanel.classList.contains('open'));
            }
        };
        
        // Prevent button from interfering with globe controls (mouse)
        this.musicButton.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        this.musicButton.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        this.musicButton.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            touchStartTime = Date.now();
        });
        
        this.musicButton.addEventListener('touchend', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Only trigger if it was a quick tap (not a drag)
            if (Date.now() - touchStartTime < 300) {
                handleMusicToggle(event);
            }
        });
        
        // Handle click events (desktop and fallback)
        this.musicButton.addEventListener('click', handleMusicToggle);
        console.log('MusicPanelService: Click event listener attached. Button:', this.musicButton.id || this.musicButton.className);
    }

    /**
     * Setup close button handler
     */
    setupCloseButton() {
        if (!this.musicPanelClose) return;
        
        this.musicPanelClose.addEventListener('click', () => {
            // Play music button sound when closing panel
            if (window.SoundEffectsManager) {
                window.SoundEffectsManager.play('music');
            }
            this.musicPanel.classList.remove('open');
            if (this.musicButton) {
                this.musicButton.classList.remove('active');
            }
        });
    }

    /**
     * Setup click-outside-to-close handler
     */
    setupClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            if (this.musicPanel && this.musicPanel.classList.contains('open')) {
                if (!this.musicPanel.contains(e.target) && 
                    !this.musicButton.contains(e.target) && 
                    e.target !== this.musicButton) {
                    this.musicPanel.classList.remove('open');
                    if (this.musicButton) {
                        this.musicButton.classList.remove('active');
                    }
                }
            }
        });
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicPanelService;
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.MusicPanelService = MusicPanelService;
}
