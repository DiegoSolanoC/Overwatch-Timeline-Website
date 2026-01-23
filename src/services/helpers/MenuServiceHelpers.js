/**
 * MenuServiceHelpers - Utilities for menu creation in ComponentLoaderService
 * Service-compatible versions of menu helpers
 */

/**
 * Detects if running on GitHub Pages
 * @returns {boolean}
 */
export function isGitHubPages() {
    const hostname = window.location.hostname;
    return hostname.includes('github.io') || 
           hostname.includes('github.com') ||
           (hostname === 'localhost' && window.location.port === '');
}

/**
 * Creates a main menu button (service-compatible)
 * @param {Object} config - Button configuration
 * @param {string} config.id - Button ID
 * @param {string} config.title - Button title
 * @param {string} config.imagePath - Path to button image
 * @param {string} config.label - Button label text
 * @param {string} config.description - Button description text
 * @returns {HTMLElement} - The created button
 */
export function createMenuButton({ id, title, imagePath, label, description }) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'main-menu-btn';
    button.title = title;
    button.innerHTML = `
        <div class="main-menu-image-container">
            <img src="${imagePath}" alt="${title}">
        </div>
        <div class="main-menu-label-container">
            <div class="main-menu-label">${label}</div>
            <div class="main-menu-description">${description}</div>
        </div>
    `;
    return button;
}

/**
 * Removes old test buttons if they exist
 * @param {Object} statusService - Status service for updates (optional)
 */
export function removeOldTestButtons(statusService) {
    const oldGlobeBtn = document.getElementById('runGlobeBtn');
    const oldGlossaryBtn = document.getElementById('runGlossaryBtn');
    const oldBiographyBtn = document.getElementById('runBiographyBtn');
    
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

/**
 * Creates menu buttons container with all buttons
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLElement} - The menu buttons container
 */
export function createMenuButtonsContainer(statusService) {
    if (statusService) {
        statusService.update('Creating main menu buttons...', 'info');
    }
    
    const menuButtons = document.createElement('div');
    menuButtons.className = 'main-menu-buttons';
    
    // Global Timeline button (always shown)
    const globeBtn = createMenuButton({
        id: 'runGlobeBtn',
        title: 'Global Timeline',
        imagePath: 'assets/images/menu/Global%20Timeline.png',
        label: 'Global Timeline',
        description: 'Revisit the Story of Overwatch in Chronological Order, view through a 3D Globe'
    });
    menuButtons.appendChild(globeBtn);
    
    // Only show Concept Glossary and Character Bios if NOT on GitHub Pages
    if (!isGitHubPages()) {
        const glossaryBtn = createMenuButton({
            id: 'runGlossaryBtn',
            title: 'Concept Glossary',
            imagePath: 'assets/images/menu/Concept%20Glossary.png',
            label: 'Concept Glossary',
            description: 'Coming Soon...'
        });
        menuButtons.appendChild(glossaryBtn);
        
        const biographyBtn = createMenuButton({
            id: 'runBiographyBtn',
            title: 'Character Bios',
            imagePath: 'assets/images/menu/Character%20Bios.png',
            label: 'Character Bios',
            description: 'Coming Soon...'
        });
        menuButtons.appendChild(biographyBtn);
    }
    
    return menuButtons;
}

/**
 * Appends menu buttons to the appropriate container
 * @param {HTMLElement} menuButtons - The menu buttons container
 * @param {boolean} isTestPage - Whether this is a test page
 * @param {Object} statusService - Status service for updates
 */
export function appendMenuButtons(menuButtons, isTestPage, statusService) {
    const contentContainer = document.getElementById('content');
    const targetContainer = contentContainer || document.body;
    
    if (!targetContainer) {
        console.error('No container found for menu buttons!');
        return;
    }
    
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
    
    if (statusService) {
        statusService.update('✓ Menu buttons added', 'success');
    }
    
    // Set up event listeners for the newly created menu buttons
    if (window.setupMenuButtonListeners) {
        window.setupMenuButtonListeners();
    }
}

/**
 * Checks if we're on a test page
 * @returns {boolean} - True if on test page
 */
export function isTestPage() {
    const existingGlobeBtn = document.getElementById('runGlobeBtn');
    return existingGlobeBtn && existingGlobeBtn.classList.contains('test-run-button');
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.ServiceMenuHelpers) {
        window.ServiceMenuHelpers = {};
    }
    window.ServiceMenuHelpers.isGitHubPages = isGitHubPages;
    window.ServiceMenuHelpers.createMenuButton = createMenuButton;
    window.ServiceMenuHelpers.removeOldTestButtons = removeOldTestButtons;
    window.ServiceMenuHelpers.createMenuButtonsContainer = createMenuButtonsContainer;
    window.ServiceMenuHelpers.appendMenuButtons = appendMenuButtons;
    window.ServiceMenuHelpers.isTestPage = isTestPage;
}
