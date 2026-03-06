/**
 * ExitButtonHelpers - Utilities for creating exit button
 * Extracted from ComponentLoaderService to reduce inline logic
 */

/**
 * Creates and sets up the exit button with click handler
 * @param {Object} params - Parameters
 * @param {Object} params.overlayService - Overlay service
 * @param {Object} params.statusService - Status service
 * @returns {HTMLElement|null} - The created exit button or null if already exists
 */
export function createExitButton({ overlayService, statusService }) {
    if (document.getElementById('exitButton')) {
        return document.getElementById('exitButton');
    }
    
    statusService.update('Adding exit button...', 'info');
    const exitBtn = document.createElement('button');
    exitBtn.id = 'exitButton';
    exitBtn.className = 'header-hub-btn header-hub-btn--exit';
    exitBtn.type = 'button';
    exitBtn.title = 'Exit to Main Menu';
    exitBtn.setAttribute('aria-label', 'Exit to Main Menu');
    exitBtn.innerHTML = `<span class="header-hub-icon"><img src="assets/images/icons/Home Button.png" alt="" /></span>`;
    const headerRight = document.getElementById('headerHubRight');
    const target = headerRight || document.querySelector('header');
    if (target) target.appendChild(exitBtn);
    statusService.update('✓ Exit button added', 'success');
    
    // Setup exit button click handler
    exitBtn.addEventListener('click', async () => {
        overlayService.setRunOperation(true);
        overlayService.show();
        
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
        statusService.update('Exiting to main menu...', 'info');
        
        try {
            if (typeof window.appModeSwitch === 'function') {
                await window.appModeSwitch('menu');
            } else if (window.killGlobeComponents) {
                await window.killGlobeComponents();
            } else if (window.restoreMainMenu) {
                await window.restoreMainMenu();
            }
        } catch (error) {
            console.error('[Exit Button] Error in killGlobeComponents:', error);
        } finally {
            overlayService.setRunOperation(false);
            overlayService.hide();
        }
    });
    
    return exitBtn;
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.ServiceExitButtonHelpers) {
        window.ServiceExitButtonHelpers = {};
    }
    window.ServiceExitButtonHelpers.createExitButton = createExitButton;
}
