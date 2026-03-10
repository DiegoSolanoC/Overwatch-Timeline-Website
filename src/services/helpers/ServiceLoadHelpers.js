/**
 * ServiceLoadHelpers - Utilities for ComponentLoaderService
 * Service-compatible versions of component loading helpers
 */

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    window.ServiceLoadHelpers = {};
}

/**
 * Creates a standard globe control button (service-compatible)
 * @param {Object} config - Button configuration
 * @param {string} config.id - Button ID
 * @param {string} config.className - Additional CSS classes
 * @param {string} config.title - Button title/tooltip
 * @param {string} config.iconPath - Path to icon image
 * @param {string} config.iconAlt - Alt text for icon
 * @param {string} config.parentId - ID of parent element to append to
 * @param {string} config.baseClass - Base CSS class(es) for the button (default: globe-control-btn)
 * @param {string} config.iconSpanId - Optional explicit ID for the icon span
 * @param {string} config.label - Optional visible label text (used in header hub)
 * @param {number} config.headerOrder - Optional ordering for header hub placement
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLElement|null} - The created button element or existing one
 */
export function createGlobeControlButton({
    id,
    className,
    title,
    iconPath,
    iconAlt,
    parentId = 'content',
    baseClass = 'globe-control-btn',
    iconSpanId = null,
    label = null,
    headerOrder = null
}, statusService) {
    if (document.getElementById(id)) {
        return document.getElementById(id);
    }

    const finalIconSpanId = iconSpanId || `${id}Icon`;
    
    const button = document.createElement('button');
    button.id = id;
    button.className = `${baseClass} ${className || ''}`.trim();
    button.title = title;
    if (title) {
        button.setAttribute('aria-label', title);
    }
    const isHeaderHubBtn = (baseClass || '').includes('header-hub-btn');
    const isHeaderRightHub = parentId === 'headerHubRight';

    const iconWrap = document.createElement('span');
    iconWrap.id = finalIconSpanId;
    if (isHeaderHubBtn) iconWrap.className = 'header-hub-icon-wrap';

    const img = document.createElement('img');
    if (isHeaderHubBtn) {
        img.className = 'header-hub-icon';
        img.style.objectFit = 'contain';
    } else {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
    }
    img.src = iconPath;
    img.alt = iconAlt || '';
    iconWrap.appendChild(img);
    button.appendChild(iconWrap);

    if (isHeaderHubBtn && isHeaderRightHub && label) {
        const labelEl = document.createElement('span');
        labelEl.className = 'header-hub-btn-label';
        labelEl.textContent = String(label);
        button.appendChild(labelEl);
    }
    
    const parent = document.getElementById(parentId);
    if (parent) {
        parent.appendChild(button);

        if (headerOrder !== null && headerOrder !== undefined) {
            button.dataset.headerOrder = String(headerOrder);
        }

        if (parentId === 'headerHubRight') {
            const exitBtn =
                parent.querySelector('.header-hub-btn--exit') ||
                parent.querySelector('[data-action="menu"]');
            const buttons = Array.from(parent.querySelectorAll('button'))
                .filter(b => b !== exitBtn);

            buttons.sort((a, b) => {
                const ao = a.dataset.headerOrder ? parseFloat(a.dataset.headerOrder) : 9999;
                const bo = b.dataset.headerOrder ? parseFloat(b.dataset.headerOrder) : 9999;
                if (ao !== bo) return ao - bo;
                return (a.id || '').localeCompare(b.id || '');
            });

            buttons.forEach(b => {
                if (exitBtn) {
                    parent.insertBefore(b, exitBtn);
                } else {
                    parent.appendChild(b);
                }
            });
        }

        if (statusService) {
            statusService.update(`✓ ${title} button added`, 'success');
        }
    } else {
        console.warn(`Parent element '${parentId}' not found for button ${id}`);
    }
    
    return button;
}

// Export for module systems and make available globally
if (typeof window !== 'undefined') {
    window.ServiceLoadHelpers.createGlobeControlButton = createGlobeControlButton;
}

/**
 * Loads a sound effect (service-compatible)
 * @param {string} soundName - Name of the sound effect
 * @param {string} soundPath - Path to the sound file
 * @param {Object} statusService - Status service for updates
 * @returns {boolean} - True if sound was loaded successfully
 */
export function loadSoundEffect(soundName, soundPath, statusService) {
    if (!window.SoundEffectsManager) {
        return false;
    }
    
    if (statusService) {
        statusService.update(`Loading ${soundName} sound effect...`, 'info');
    }
    
    window.SoundEffectsManager.loadSound(soundName, soundPath);
    
    if (statusService) {
        statusService.update(`✓ ${soundName} sound effect loaded`, 'success');
    }
    
    return true;
}

/**
 * Checks if globe base is loaded (service-compatible)
 * @param {Object} loadedComponents - The loadedComponents object
 * @param {string} buttonId - Button ID for error state
 * @param {Object} statusService - Status service for updates
 * @param {Object} buttonStateService - Button state service
 * @returns {boolean} - True if globe base is loaded
 */
export function requireGlobeBase(loadedComponents, buttonId, statusService, buttonStateService) {
    if (!loadedComponents?.globeBase || !window.globeController) {
        if (statusService) {
            statusService.update('⚠ Globe base must be loaded first!', 'error');
        }
        if (buttonId && buttonStateService) {
            buttonStateService.setState(buttonId, 'error');
        }
        return false;
    }
    return true;
}
