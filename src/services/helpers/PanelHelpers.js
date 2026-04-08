/**
 * PanelHelpers - Utilities for creating DOM panels in ComponentLoaderService
 * Service-compatible versions of panel creation helpers
 */

import { getEventThumbNumberButtonsHtml } from '../../managers/helpers/PaginationThumbMarkup.js';
import { initPaginationDockCollapse } from '../../utils/PaginationDockCollapse.js';

/**
 * Creates the music panel HTML structure (service-compatible)
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLElement} - The created music panel
 */
export function createMusicPanel(statusService) {
    if (document.getElementById('musicPanel')) {
        return document.getElementById('musicPanel');
    }
    
    if (statusService) {
        statusService.update('Adding music panel...', 'info');
    }
    
    const musicPanel = document.createElement('div');
    musicPanel.id = 'musicPanel';
    musicPanel.className = 'music-panel';
    musicPanel.innerHTML = `
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
    document.body.appendChild(musicPanel);
    
    if (statusService) {
        statusService.update('✓ Music panel added', 'success');
    }
    
    return musicPanel;
}

/**
 * Creates the filters panel HTML structure (service-compatible)
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLElement} - The created filters panel
 */
export function createFiltersPanel(statusService) {
    if (document.getElementById('filtersPanel')) {
        return document.getElementById('filtersPanel');
    }
    
    if (statusService) {
        statusService.update('Adding filters panel...', 'info');
    }
    
    const filtersPanel = document.createElement('div');
    filtersPanel.id = 'filtersPanel';
    filtersPanel.className = 'filters-panel';
    filtersPanel.innerHTML = `
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
    document.body.appendChild(filtersPanel);
    
    if (statusService) {
        statusService.update('✓ Filters panel added', 'success');
    }
    
    return filtersPanel;
}

/**
 * Creates the event pagination HTML structure (service-compatible)
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLElement} - The created pagination element
 */
export function createEventPagination(statusService) {
    if (document.getElementById('eventPagination')) {
        return document.getElementById('eventPagination');
    }
    
    if (statusService) {
        statusService.update('Adding event pagination...', 'info');
    }
    
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

    // Desktop: create dock and move pagination into it
    // Mobile: keep pagination in #content with fixed positioning
    const setupPaginationPlacement = () => {
        const paginationEl = document.getElementById('eventPagination');
        if (!paginationEl) return;
        
        const isDesktop = window.innerWidth > 768 && window.innerHeight >= 500;
        let dock = document.getElementById('paginationDock');
        
        if (isDesktop) {
            // Create dock if it doesn't exist
            if (!dock) {
                dock = document.createElement('div');
                dock.id = 'paginationDock';
                dock.className = 'pagination-dock';
                
                // Create pattern overlay element
                const patternOverlay = document.createElement('div');
                patternOverlay.className = 'pagination-dock-pattern';
                dock.appendChild(patternOverlay);
                
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

            // Move pagination into dock
            if (paginationEl.parentNode !== dock) {
                dock.appendChild(paginationEl);
            }
            // Clear mobile inline styles
            paginationEl.style.removeProperty('position');
            paginationEl.style.removeProperty('bottom');
            paginationEl.style.removeProperty('left');
            paginationEl.style.removeProperty('right');
            paginationEl.style.removeProperty('transform');
            paginationEl.style.removeProperty('top');
        } else {
            document.body.classList.remove('pagination-dock-collapsed');
            // Mobile: move pagination back into #content
            const content = document.getElementById('content');
            if (content && paginationEl.parentNode !== content) {
                content.appendChild(paginationEl);
            }
            // Apply mobile fixed positioning
            paginationEl.style.setProperty('position', 'fixed', 'important');
            paginationEl.style.setProperty('bottom', '120px', 'important');
            paginationEl.style.setProperty('left', '50%', 'important');
            paginationEl.style.setProperty('right', 'auto', 'important');
            paginationEl.style.setProperty('transform', 'translateX(-50%)', 'important');
            paginationEl.style.setProperty('top', 'auto', 'important');
        }

        if (isDesktop) {
            initPaginationDockCollapse();
        }
    };
    
    document.getElementById('content').appendChild(pagination);
    
    // Setup placement after appending
    setTimeout(() => {
        setupPaginationPlacement();
        initPaginationDockCollapse();
        window.dispatchEvent(new Event('resize'));
    }, 50);
    
    window.addEventListener('resize', setupPaginationPlacement);
    
    if (statusService) {
        statusService.update('✓ Event pagination added', 'success');
    }
    
    return pagination;
}

/**
 * Creates audio element for background music (service-compatible)
 * @param {Object} statusService - Status service for updates
 * @returns {HTMLAudioElement} - The created audio element
 */
export function createBackgroundMusicElement(statusService) {
    if (document.getElementById('backgroundMusic')) {
        return document.getElementById('backgroundMusic');
    }
    
    if (statusService) {
        statusService.update('Adding audio element...', 'info');
    }
    
    const audio = document.createElement('audio');
    audio.id = 'backgroundMusic';
    audio.preload = 'auto';
    audio.loop = true;
    document.body.appendChild(audio);
    
    if (statusService) {
        statusService.update('✓ Audio element added', 'success');
    }
    
    return audio;
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.ServicePanelHelpers) {
        window.ServicePanelHelpers = {};
    }
    window.ServicePanelHelpers.createMusicPanel = createMusicPanel;
    window.ServicePanelHelpers.createFiltersPanel = createFiltersPanel;
    window.ServicePanelHelpers.createEventPagination = createEventPagination;
    window.ServicePanelHelpers.createBackgroundMusicElement = createBackgroundMusicElement;
}
