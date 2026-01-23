/**
 * MenuHelpers - Utilities for menu creation
 * Extracted from component-loader.js
 */

import { updateStatus } from '../../managers/StatusManager.js';

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
 * Creates a main menu button
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
 * Creates the main menu buttons container
 * @param {Function} setupGlobeHandler - Handler for Global Timeline button
 * @param {Function} setupGlossaryHandler - Handler for Concept Glossary button (optional)
 * @param {Function} setupBiographyHandler - Handler for Character Bios button (optional)
 * @returns {HTMLElement} - The menu buttons container
 */
export function createMenuButtons(setupGlobeHandler, setupGlossaryHandler = null, setupBiographyHandler = null) {
    const menuButtons = document.createElement('div');
    menuButtons.className = 'main-menu-buttons';
    
    // Global Timeline button
    const globeBtn = createMenuButton({
        id: 'runGlobeBtn',
        title: 'Global Timeline',
        imagePath: 'assets/images/menu/Global%20Timeline.png',
        label: 'Global Timeline',
        description: 'Revisit the Story of Overwatch in Chronological Order, view through a 3D Globe'
    });
    
    if (setupGlobeHandler) {
        globeBtn.addEventListener('click', setupGlobeHandler);
    }
    
    menuButtons.appendChild(globeBtn);
    
    // Only show Concept Glossary and Character Bios if NOT on GitHub Pages
    if (!isGitHubPages()) {
        // Concept Glossary button
        const glossaryBtn = createMenuButton({
            id: 'runGlossaryBtn',
            title: 'Concept Glossary',
            imagePath: 'assets/images/menu/Concept%20Glossary.png',
            label: 'Concept Glossary',
            description: 'Coming Soon...'
        });
        
        if (setupGlossaryHandler) {
            glossaryBtn.addEventListener('click', setupGlossaryHandler);
        }
        
        // Character Bios button
        const biographyBtn = createMenuButton({
            id: 'runBiographyBtn',
            title: 'Character Bios',
            imagePath: 'assets/images/menu/Character%20Bios.png',
            label: 'Character Bios',
            description: 'Coming Soon...'
        });
        
        if (setupBiographyHandler) {
            biographyBtn.addEventListener('click', setupBiographyHandler);
        }
        
        menuButtons.appendChild(glossaryBtn);
        menuButtons.appendChild(biographyBtn);
    }
    
    return menuButtons;
}

/**
 * Gets or creates the test container
 * @returns {HTMLElement} - The test container
 */
export function getOrCreateTestContainer() {
    let testContainer = document.querySelector('.test-container');
    if (!testContainer) {
        updateStatus('Creating test container...', 'info');
        testContainer = document.createElement('div');
        testContainer.className = 'test-container';
        testContainer.id = 'testContainer';
        document.getElementById('content').appendChild(testContainer);
        updateStatus('✓ Test container created', 'success');
    }
    return testContainer;
}
