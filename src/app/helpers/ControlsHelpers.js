/**
 * ControlsHelpers - Utilities for controls component setup
 * Extracted from component-loader.js to reduce inline logic
 */

import { updateStatus } from '../../managers/StatusManager.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../../managers/LoadingOverlayManager.js';

/**
 * Creates and sets up the exit button
 * @param {Function} setIsRunOperation - Function to set run operation flag
 * @param {Function} killGlobeComponents - Function to kill globe components
 * @returns {HTMLElement|null} - The created exit button or null if already exists
 */
export function createExitButton(setIsRunOperation, killGlobeComponents) {
    if (document.getElementById('exitButton')) {
        console.log('[Exit Button] Button already exists, skipping creation');
        return document.getElementById('exitButton'); // Return existing button
    }
    
    const headerRight = document.getElementById('headerHubRight');
    const targetContainer = headerRight || document.querySelector('header');
    if (!targetContainer) {
        console.error('[Exit Button] Header element not found!');
        updateStatus('✗ Error: Header not found for exit button', 'error');
        return null;
    }
    
    updateStatus('Adding exit button...', 'info');
    const exitBtn = document.createElement('button');
    exitBtn.id = 'exitButton';
    exitBtn.className = 'header-hub-btn header-hub-btn--exit';
    exitBtn.type = 'button';
    exitBtn.title = 'Exit to Main Menu';
    exitBtn.setAttribute('aria-label', 'Exit to Main Menu');
    exitBtn.innerHTML = `<span class="header-hub-icon"><img src="assets/images/icons/Home Button.png" alt="" /></span>`;
    targetContainer.appendChild(exitBtn);
    console.log('[Exit Button] Button created and appended to header');
    updateStatus('✓ Exit button added', 'success');
    
    // Setup exit button click handler
    exitBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Exit Button] Exit clicked, starting exit process...');
        setIsRunOperation(true);
        showLoadingOverlay();
        
        // Play mode switch sound effect
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
        updateStatus('Exiting to main menu...', 'info');
        
        try {
            if (typeof window.appModeSwitch === 'function') {
                await window.appModeSwitch('menu');
            } else {
                await killGlobeComponents();
            }
        } catch (error) {
            console.error('[Exit Button] Error in killGlobeComponents:', error);
        } finally {
            setIsRunOperation(false);
            hideLoadingOverlay();
        }
    });
    
    return exitBtn;
}
