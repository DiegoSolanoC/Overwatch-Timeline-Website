/**
 * EventSlideGlitchHelpers - Utilities for glitch effect management in event slides
 * Extracted from EventSlideManager to reduce file size
 */

/**
 * Check if event contains "Olivia Colomar"
 */
export function hasOliviaColomar(eventName, description, eventData) {
    if (eventName && /Olivia Colomar/gi.test(eventName)) return true;
    if (description && /Olivia Colomar/gi.test(description)) return true;
    if (eventData?.variants?.some(v =>
        (v.name && /Olivia Colomar/gi.test(v.name)) ||
        (v.description && /Olivia Colomar/gi.test(v.description))
    )) return true;
    return false;
}

/**
 * Setup glitch toggle button
 */
export function setupGlitchToggleButton(glitchToggleBtn, hasOlivia, uiView) {
    if (!glitchToggleBtn) {
        console.error('Glitch toggle button not found!');
        return;
    }
    
    if (hasOlivia) {
        glitchToggleBtn.style.display = 'block';
        glitchToggleBtn.style.visibility = 'visible';
        if (window.GlitchTextService) {
            window.GlitchTextService.setEnabled(true);
        }
        glitchToggleBtn.textContent = 'Disable Glitch';
        glitchToggleBtn.onclick = () => uiView.toggleGlitchEffect();
        
        setTimeout(() => {
            if (window.GlitchTextService?.isEnabled() && window.SoundEffectsManager?.play) {
                try {
                    window.SoundEffectsManager.play('hackOn', {
                        playbackRate: 1.2,
                        fadeOut: true,
                        fadeOutDuration: 500
                    });
                } catch (e) {
                    console.error('Error playing hackOn sound:', e);
                }
            }
        }, 50);
    } else {
        glitchToggleBtn.style.display = 'none';
    }
}

/**
 * Start or stop glitch animation based on enabled state
 */
export function manageGlitchAnimation(shouldStart, uiView) {
    if (window.GlitchTextService) {
        if (shouldStart && window.GlitchTextService.isEnabled()) {
            window.GlitchTextService.startAnimation();
            setTimeout(() => {
                uiView.showHackedOverlay();
            }, 400);
        } else {
            window.GlitchTextService.stopAnimation();
        }
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.EventSlideGlitchHelpers) {
        window.EventSlideGlitchHelpers = {};
    }
    window.EventSlideGlitchHelpers.hasOliviaColomar = hasOliviaColomar;
    window.EventSlideGlitchHelpers.setupGlitchToggleButton = setupGlitchToggleButton;
    window.EventSlideGlitchHelpers.manageGlitchAnimation = manageGlitchAnimation;
}
