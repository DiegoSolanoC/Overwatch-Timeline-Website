/**
 * ComponentDOMHelpers - DOM element creation utilities for components
 * Extracted from component-loader.js to reduce duplication
 */

import { updateStatus } from '../../managers/StatusManager.js';
import { getEventThumbNumberButtonsHtml } from '../../managers/helpers/PaginationThumbMarkup.js';
import { initPaginationDockCollapse } from '../../utils/PaginationDockCollapse.js';

/**
 * Creates or returns existing element by ID
 * @param {string} id - Element ID
 * @param {Function} createFn - Function to create element if it doesn't exist
 * @param {string} elementName - Name for status messages
 * @returns {HTMLElement|null}
 */
export function getOrCreateElement(id, createFn, elementName = null) {
    const existing = document.getElementById(id);
    if (existing) {
        return existing;
    }
    
    const element = createFn();
    if (elementName) {
        updateStatus(`✓ ${elementName} added`, 'success');
    }
    return element;
}

/**
 * Creates the music panel HTML structure
 * @returns {HTMLElement} - The created music panel
 */
export function createMusicPanel() {
    const panel = document.createElement('div');
    panel.id = 'musicPanel';
    panel.className = 'music-panel';
    panel.innerHTML = `
        <div class="music-panel-close" id="musicPanelClose">&times;</div>
        <div class="music-panel-content">
            <div class="music-actions">
                <h2 class="music-title">Music Options</h2>
                <div class="music-actions-buttons"></div>
            </div>
            <div class="music-now-playing" id="musicNowPlaying">
                <div class="music-current-song-row">
                    <img class="music-playing-disc" src="assets/images/icons/Playing Icon.png" alt="" width="32" height="32" decoding="async" />
                    <div class="music-current-song" id="musicCurrentSong">Loading...</div>
                </div>
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
                        <button id="loopBtn" type="button" class="music-control-btn" aria-label="Loop current track">
                            <img id="loopBtnIcon" src="assets/images/icons/Loop Icon.png" alt="Loop" class="control-icon">
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
    document.body.appendChild(panel);
    return panel;
}

/**
 * Creates the filters panel HTML structure
 * @returns {HTMLElement} - The created filters panel
 */
export function createFiltersPanel() {
    const panel = document.createElement('div');
    panel.id = 'filtersPanel';
    panel.className = 'filters-panel';
    panel.innerHTML = `
        <div class="filters-panel-close" id="filtersPanelClose">&times;</div>
        <div class="filters-panel-content">
            <div class="filters-actions">
                <h2 class="filters-title">Filters</h2>
                <div class="filters-toolbar">
                    <div class="filters-tabs" role="tablist">
                        <button type="button" id="heroesTab" class="filter-tab active" role="tab" aria-selected="true">
                            <span class="filter-tab-graphic">
                                <img class="filter-tab-icon" src="assets/images/icons/Heroes Icon.png" alt="" width="40" height="40" decoding="async" />
                            </span>
                            <span class="filter-tab-footer">
                                <span class="filter-tab-label">Heroes</span>
                                <span class="filter-count" id="heroesCount">0</span>
                            </span>
                        </button>
                        <button type="button" id="factionsTab" class="filter-tab" role="tab" aria-selected="false">
                            <span class="filter-tab-graphic">
                                <img class="filter-tab-icon" src="assets/images/icons/Factions Icon.png" alt="" width="40" height="40" decoding="async" />
                            </span>
                            <span class="filter-tab-footer">
                                <span class="filter-tab-label">Factions</span>
                                <span class="filter-count" id="factionsCount">0</span>
                            </span>
                        </button>
                    </div>
                    <div class="filters-actions-buttons">
                        <button type="button" id="clearFiltersBtn" class="filters-action-btn">Clear</button>
                        <button type="button" id="confirmFiltersBtn" class="filters-action-btn filters-confirm-btn">Confirm</button>
                    </div>
                </div>
            </div>
            <div class="filters-grid" id="filtersGrid"></div>
        </div>
    `;
    document.body.appendChild(panel);
    return panel;
}

/**
 * Creates the event pagination HTML structure
 * @returns {HTMLElement} - The created pagination element
 */
export function createEventPagination() {
    const pagination = document.createElement('div');
    pagination.id = 'eventPagination';
    pagination.className = 'event-pagination';
    pagination.innerHTML = `
        <div class="event-page-slider-row event-page-slider-row--desktop-only">
            <div class="event-page-slider-wrap">
                <div class="event-page-slider-ticks" id="eventPageSliderTicks" aria-hidden="true"></div>
                <input type="range" id="eventPageSlider" class="event-page-slider" min="0" max="10000" value="0" step="1"
                    title="Scrub pages" aria-label="Pages along timeline" aria-valuemin="0" aria-valuemax="10000" aria-valuenow="0" />
            </div>
        </div>
        <div class="event-pagination-thumb-row">
            <button type="button" id="prevPageBtn" class="page-btn page-btn--thumb-rail" title="Previous Page" aria-label="Previous page">‹</button>
            <div class="event-number-buttons event-number-buttons--thumbs-desktop" id="eventNumberButtons">${getEventThumbNumberButtonsHtml()}</div>
            <button type="button" id="nextPageBtn" class="page-btn page-btn--thumb-rail" title="Next Page" aria-label="Next page">›</button>
        </div>
        <div class="page-controls-row page-controls-row--page-only page-controls-row--mobile-only">
            <div class="page-input-container">
                <span class="page-label">Page</span>
                <input type="number" id="pageInput" class="page-input" min="1" value="1" title="Enter page number">
                <span class="page-total" id="pageTotal">/ 1</span>
            </div>
        </div>
    `;
    
    // Desktop: create a dock container below the layout, move pagination into it
    // Mobile: keep pagination inside #content with fixed positioning
    const DOCK_COLLAPSE_STRIP_HTML = `
        <div class="pagination-dock-collapse-bar" id="paginationDockCollapseBar">
            <button type="button" id="paginationDockCollapseBtn" class="pagination-dock-collapse-handle"
                aria-expanded="true" aria-controls="eventNumberButtons"
                title="Collapse thumbnail strip" aria-label="Collapse thumbnail strip">
                <span class="pagination-dock-collapse-pill" aria-hidden="true">
                    <span class="pagination-dock-collapse-pill__icon" aria-hidden="true">↔</span>
                </span>
            </button>
        </div>`;

    // Note: landscape phones have width > 768 but low height, so require both dimensions
    const setupPaginationPlacement = () => {
        const isDesktop = window.innerWidth > 768 && window.innerHeight >= 500;
        let dock = document.getElementById('paginationDock');
        
        if (isDesktop) {
            // Create dock if it doesn't exist
            if (!dock) {
                dock = document.createElement('div');
                dock.id = 'paginationDock';
                dock.className = 'pagination-dock';
                
                // Insert after .layout-container, before footer
                const layoutContainer = document.querySelector('.layout-container');
                const footer = document.querySelector('footer');
                if (layoutContainer && layoutContainer.parentNode) {
                    if (footer) {
                        layoutContainer.parentNode.insertBefore(dock, footer);
                    } else {
                        layoutContainer.parentNode.insertBefore(dock, layoutContainer.nextSibling);
                    }
                }
            }

            // Horizontal collapse control: strip between main layout and dock (not inside the dock)
            const layoutContainer = document.querySelector('.layout-container');
            let strip = document.getElementById('paginationDockCollapseStrip');
            if (layoutContainer && layoutContainer.parentNode && dock.parentNode === layoutContainer.parentNode) {
                if (!strip) {
                    strip = document.createElement('div');
                    strip.id = 'paginationDockCollapseStrip';
                    strip.className = 'pagination-dock-collapse-strip';
                    strip.innerHTML = DOCK_COLLAPSE_STRIP_HTML;
                    layoutContainer.parentNode.insertBefore(strip, dock);
                } else if (strip.nextSibling !== dock) {
                    layoutContainer.parentNode.insertBefore(strip, dock);
                }
            }
            
            // Ensure pattern overlay element exists
            if (!dock.querySelector('.pagination-dock-pattern')) {
                const patternOverlay = document.createElement('div');
                patternOverlay.className = 'pagination-dock-pattern';
                dock.insertBefore(patternOverlay, dock.firstChild);
            }
            
            // Move pagination into dock
            if (pagination.parentNode !== dock) {
                dock.appendChild(pagination);
            }
            // Clear mobile inline styles
            pagination.style.removeProperty('position');
            pagination.style.removeProperty('bottom');
            pagination.style.removeProperty('left');
            pagination.style.removeProperty('right');
            pagination.style.removeProperty('transform');
            pagination.style.removeProperty('top');
        } else {
            document.body.classList.remove('pagination-dock-collapsed');
            // Mobile: move pagination back into #content
            const content = document.getElementById('content');
            if (content && pagination.parentNode !== content) {
                content.appendChild(pagination);
            }
            // Apply mobile fixed positioning
            pagination.style.setProperty('position', 'fixed', 'important');
            pagination.style.setProperty('bottom', '120px', 'important');
            pagination.style.setProperty('left', '50%', 'important');
            pagination.style.setProperty('right', 'auto', 'important');
            pagination.style.setProperty('transform', 'translateX(-50%)', 'important');
            pagination.style.setProperty('top', 'auto', 'important');
        }

        if (isDesktop) {
            initPaginationDockCollapse();
        }
    };
    
    // Initial placement
    document.getElementById('content').appendChild(pagination);
    // Defer dock setup to ensure layout-container exists
    requestAnimationFrame(() => {
        setupPaginationPlacement();
        initPaginationDockCollapse();
        // Trigger resize so globe/map adjusts to new container size
        // Use setTimeout to ensure CSS has been applied
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    });
    window.addEventListener('resize', setupPaginationPlacement);
    
    return pagination;
}
