/**
 * PanelHelpers - Utilities for creating DOM panels in ComponentLoaderService
 * Service-compatible versions of panel creation helpers
 */

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
                <div class="music-current-song" id="musicCurrentSong">Loading...</div>
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
                <div class="filters-actions-buttons">
                    <button id="clearFiltersBtn" class="filters-action-btn">Clear</button>
                    <button id="confirmFiltersBtn" class="filters-action-btn filters-confirm-btn">Confirm</button>
                </div>
            </div>
            <div class="filters-tabs">
                <button id="heroesTab" class="filter-tab active">
                    Heroes
                    <span class="filter-count" id="heroesCount">0</span>
                </button>
                <button id="factionsTab" class="filter-tab">
                    Factions
                    <span class="filter-count" id="factionsCount">0</span>
                </button>
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
        <div class="page-controls-row">
            <button id="prevPageBtn" class="page-btn" title="Previous Page">‹</button>
            <div class="page-input-container">
                <span class="page-label">Page</span>
                <input type="number" id="pageInput" class="page-input" min="1" value="1" title="Enter page number">
                <span class="page-total" id="pageTotal">/ 1</span>
            </div>
            <button id="nextPageBtn" class="page-btn" title="Next Page">›</button>
        </div>
        <div class="event-number-buttons" id="eventNumberButtons">
            <button class="event-number-btn" data-position="1" title="Event 1">1</button>
            <button class="event-number-btn" data-position="2" title="Event 2">2</button>
            <button class="event-number-btn" data-position="3" title="Event 3">3</button>
            <button class="event-number-btn" data-position="4" title="Event 4">4</button>
            <button class="event-number-btn" data-position="5" title="Event 5">5</button>
            <button class="event-number-btn" data-position="6" title="Event 6">6</button>
            <button class="event-number-btn" data-position="7" title="Event 7">7</button>
            <button class="event-number-btn" data-position="8" title="Event 8">8</button>
            <button class="event-number-btn" data-position="9" title="Event 9">9</button>
            <button class="event-number-btn" data-position="10" title="Event 10">10</button>
        </div>
    `;
    
    // Apply mobile positioning
    const applyMobilePaginationPosition = () => {
        const paginationEl = document.getElementById('eventPagination');
        if (paginationEl && window.innerWidth <= 768) {
            paginationEl.style.setProperty('position', 'fixed', 'important');
            paginationEl.style.setProperty('bottom', '120px', 'important');
            paginationEl.style.setProperty('left', '50%', 'important');
            paginationEl.style.setProperty('right', 'auto', 'important');
            paginationEl.style.setProperty('transform', 'translateX(-50%)', 'important');
            paginationEl.style.setProperty('top', 'auto', 'important');
        }
    };
    
    applyMobilePaginationPosition();
    window.addEventListener('resize', applyMobilePaginationPosition);
    
    document.getElementById('content').appendChild(pagination);
    
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
