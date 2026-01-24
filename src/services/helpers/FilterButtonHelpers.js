/**
 * FilterButtonHelpers - Utilities for creating and managing filter buttons
 * Extracted from FilterService to reduce file size
 */

/**
 * Get hero display name (maps filename to display name)
 */
export function getHeroDisplayName(heroName) {
    const heroDisplayNames = {
        'Soldier 76': 'Soldier: 76'
    };
    return heroDisplayNames[heroName] || heroName;
}

/**
 * Get filter key and display name based on type
 */
export function getFilterKeyAndDisplayName(item, type) {
    if (type === 'factions') {
        return { filterKey: item.filename, displayName: item.displayName };
    } else if (type === 'music') {
        return { 
            filterKey: `assets/audio/music/${item.filename}`, 
            displayName: item.name 
        };
    } else {
        // heroes
        return { 
            filterKey: item, 
            displayName: getHeroDisplayName(item) 
        };
    }
}

/**
 * Create image element for filter button
 */
export function createFilterImage(filterKey, displayName, type, folder, imageService) {
    const imagePath = imageService.buildImagePath(
        type === 'factions' ? { filename: filterKey } : filterKey,
        type,
        folder
    );
    const img = imageService.createImageElement(imagePath, type, filterKey, folder);
    img.alt = displayName;
    return img;
}

/**
 * Attach click handler to filter button
 */
export function attachFilterButtonClickHandler(filterBtn, filterKey, stateManager, soundManager, updateFilterCounts) {
    filterBtn.addEventListener('click', () => {
        if (stateManager.has(filterKey)) {
            stateManager.remove(filterKey);
            filterBtn.classList.remove('selected');
            if (soundManager) {
                soundManager.play('filterOff');
            }
        } else {
            stateManager.add(filterKey);
            filterBtn.classList.add('selected');
            if (soundManager) {
                soundManager.play('filterPick');
            }
        }
        updateFilterCounts();
    });
}

/**
 * Create a single filter button element
 */
export function createFilterButtonElement(item, type, folder, stateManager, imageService, soundManager, updateFilterCounts) {
    const { filterKey, displayName } = getFilterKeyAndDisplayName(item, type);
    
    const filterBtn = document.createElement('div');
    filterBtn.className = 'filter-btn';
    filterBtn.dataset.filterType = type;
    filterBtn.dataset.filterKey = filterKey;
    
    // Image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'filter-image-container';
    const img = createFilterImage(filterKey, displayName, type, folder, imageService);
    imageContainer.appendChild(img);
    
    // Label
    const label = document.createElement('div');
    label.className = 'filter-label';
    label.textContent = displayName;
    
    filterBtn.appendChild(imageContainer);
    filterBtn.appendChild(label);
    
    // Set initial selection state
    if (stateManager.has(filterKey)) {
        filterBtn.classList.add('selected');
    }
    
    // Attach click handler
    attachFilterButtonClickHandler(filterBtn, filterKey, stateManager, soundManager, updateFilterCounts);
    
    return filterBtn;
}

/**
 * Use cached buttons if available
 */
export function useCachedButtons(type, buttonCache, filtersGrid, stateManager, updateFilterCounts) {
    if (!buttonCache[type]) return false;
    
    filtersGrid.innerHTML = '';
    buttonCache[type].forEach(cachedBtn => {
        const filterKey = cachedBtn.dataset.filterKey;
        if (filterKey) {
            if (stateManager.has(filterKey)) {
                cachedBtn.classList.add('selected');
            } else {
                cachedBtn.classList.remove('selected');
            }
        }
        filtersGrid.appendChild(cachedBtn);
    });
    updateFilterCounts();
    return true;
}

/**
 * Create filter buttons (with caching)
 */
export function createFilterButtons(items, type, folder, filtersGrid, buttonCache, stateManager, imageService, soundManager, heroes, factions, preloadImages, updateFilterCounts) {
    if (!filtersGrid) return;
    
    // Try to use cached buttons first
    if (useCachedButtons(type, buttonCache, filtersGrid, stateManager, updateFilterCounts)) {
        return;
    }
    
    // Create new buttons and cache them
    filtersGrid.innerHTML = '';
    const cachedButtons = [];
    
    items.forEach(item => {
        const filterBtn = createFilterButtonElement(item, type, folder, stateManager, imageService, soundManager, updateFilterCounts);
        filtersGrid.appendChild(filterBtn);
        cachedButtons.push(filterBtn);
    });
    
    // Cache the buttons
    buttonCache[type] = cachedButtons;
    
    // Preload images for the other type in background
    if (type === 'heroes' && factions.length > 0) {
        setTimeout(() => preloadImages(factions, 'factions', 'assets/images/factions'), 100);
    } else if (type === 'factions' && heroes.length > 0) {
        setTimeout(() => preloadImages(heroes, 'heroes', 'assets/images/heroes'), 100);
    }
    
    updateFilterCounts();
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.FilterButtonHelpers) {
        window.FilterButtonHelpers = {};
    }
    window.FilterButtonHelpers.getHeroDisplayName = getHeroDisplayName;
    window.FilterButtonHelpers.getFilterKeyAndDisplayName = getFilterKeyAndDisplayName;
    window.FilterButtonHelpers.createFilterImage = createFilterImage;
    window.FilterButtonHelpers.attachFilterButtonClickHandler = attachFilterButtonClickHandler;
    window.FilterButtonHelpers.createFilterButtonElement = createFilterButtonElement;
    window.FilterButtonHelpers.useCachedButtons = useCachedButtons;
    window.FilterButtonHelpers.createFilterButtons = createFilterButtons;
}
