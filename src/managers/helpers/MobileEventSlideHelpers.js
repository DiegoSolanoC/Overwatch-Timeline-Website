/**
 * MobileEventSlideHelpers - Mobile-specific DOM manipulations for event slide
 * Extracted from EventSlideManager
 */

/**
 * Mobile-specific constants
 */
export const MOBILE_BREAKPOINT = 768;
export const MOBILE_PORTRAIT_ZOOM = 5.5;
export const DEFAULT_ZOOM = 3.5;

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * Check if device is mobile portrait
 * @returns {boolean}
 */
export function isMobilePortrait() {
    return window.innerWidth <= MOBILE_BREAKPOINT && window.innerHeight > window.innerWidth;
}

/**
 * Get default camera zoom based on device type
 * @returns {number}
 */
export function getDefaultZoom() {
    return isMobilePortrait() ? MOBILE_PORTRAIT_ZOOM : DEFAULT_ZOOM;
}

/**
 * Setup mobile-specific DOM manipulations when opening event slide
 */
export function setupMobileEventSlide() {
    if (!isMobile()) return;

    const scrollableArea = document.getElementById('eventSlideScrollable');
    const bottomSection = document.getElementById('eventSlideBottom');
    const titleEl = document.getElementById('eventSlideTitle');
    const contentEl = document.getElementById('eventSlideContent');

    // Move all children from bottom section to scrollable area
    if (scrollableArea && bottomSection) {
        while (bottomSection.firstChild) {
            scrollableArea.appendChild(bottomSection.firstChild);
        }
        console.log('[DEBUG Mobile] Moved all bottom content into scrollable area');
    }

    // Fix title position on mobile - same row as close button
    setTimeout(() => {
        if (titleEl) {
            titleEl.style.setProperty('position', 'fixed', 'important');
            titleEl.style.setProperty('top', '10px', 'important');
            titleEl.style.setProperty('left', '20px', 'important');
            titleEl.style.setProperty('right', '70px', 'important');
            titleEl.style.setProperty('z-index', '999', 'important');
            titleEl.style.setProperty('background', 'transparent', 'important');
            titleEl.style.setProperty('padding', '0', 'important');
            titleEl.style.setProperty('margin', '0', 'important');
            titleEl.style.setProperty('box-shadow', 'none', 'important');
            titleEl.style.setProperty('max-width', 'calc(100% - 90px)', 'important');
            titleEl.style.setProperty('width', 'auto', 'important');
            titleEl.style.setProperty('line-height', '50px', 'important');
            titleEl.style.setProperty('height', '50px', 'important');
            console.log('[DEBUG Mobile] Fixed title position on same row as close button');
        }

        // Adjust content padding for fixed title row
        if (contentEl) {
            contentEl.style.setProperty('padding-top', '70px', 'important');
        }

        // Adjust scrollable area margin for fixed title
        if (scrollableArea) {
            scrollableArea.style.setProperty('margin-top', '0', 'important');
            scrollableArea.style.setProperty('padding-top', '0', 'important');
        }
    }, 50);
}

/**
 * Cleanup mobile-specific DOM manipulations when closing event slide
 */
export function cleanupMobileEventSlide() {
    if (!isMobile()) return;

    const scrollableArea = document.getElementById('eventSlideScrollable');
    const bottomSection = document.getElementById('eventSlideBottom');
    const titleEl = document.getElementById('eventSlideTitle');
    const contentEl = document.getElementById('eventSlideContent');

    if (scrollableArea && bottomSection) {
        // Find elements that should be in bottom section
        const sourcesEl = document.getElementById('eventSourcesSection');
        const filtersEl = document.getElementById('eventFiltersSection');
        const controlButtons = document.querySelector('.event-control-buttons');
        const navButtons = document.querySelector('.event-navigation-buttons');

        // Move them back to bottom section
        if (sourcesEl && sourcesEl.parentElement === scrollableArea) {
            bottomSection.appendChild(sourcesEl);
        }
        if (filtersEl && filtersEl.parentElement === scrollableArea) {
            bottomSection.appendChild(filtersEl);
        }
        if (controlButtons && controlButtons.parentElement === scrollableArea) {
            bottomSection.appendChild(controlButtons);
        }
        if (navButtons && navButtons.parentElement === scrollableArea) {
            bottomSection.appendChild(navButtons);
        }
        console.log('[DEBUG Mobile] Moved bottom content back to bottom section');
    }

    // Reset title position
    if (titleEl) {
        titleEl.style.position = '';
        titleEl.style.top = '';
        titleEl.style.left = '';
        titleEl.style.right = '';
        titleEl.style.zIndex = '';
        titleEl.style.background = '';
        titleEl.style.padding = '';
        titleEl.style.margin = '';
        titleEl.style.boxShadow = '';
        titleEl.style.maxWidth = '';
    }

    // Reset content padding
    if (contentEl) {
        contentEl.style.paddingTop = '';
    }

    // Reset scrollable area
    if (scrollableArea) {
        scrollableArea.style.marginTop = '';
        scrollableArea.style.paddingTop = '';
    }
}
