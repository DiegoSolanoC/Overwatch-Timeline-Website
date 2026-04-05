/**
 * EventRenderService - Handles rendering of events to the DOM
 * Separates rendering logic from event management logic
 */

class EventRenderService {
    constructor() {
        // Will be set by EventManager
        this.eventManager = null;
        this._animateNextPageRender = false;
        this._entranceAnimToken = 0;
        this._eventManagerImgObserver = null;
    }

    _normalizeLocationNameForOverlap(name) {
        if (!name || typeof name !== 'string') return null;
        const normalized = name.replace(/\s+/g, ' ').trim().toLowerCase();
        return normalized.length ? normalized : null;
    }

    _getPrimaryLocationForOverlap(event) {
        // Overlap detection should be based on the event's primary location (main marker),
        // not on whichever variant is currently being previewed on the card.
        const isMultiEvent = !!(event && event.variants && event.variants.length > 0);
        const base = isMultiEvent ? event.variants[0] : event;
        const locationType = (base.locationType || event.locationType || 'earth');

        const lat = (locationType === 'earth')
            ? (base.lat !== undefined ? base.lat : event.lat)
            : undefined;
        const lon = (locationType === 'earth')
            ? (base.lon !== undefined ? base.lon : event.lon)
            : undefined;
        const x = (locationType !== 'earth' && locationType !== 'station' && locationType !== 'marsShip')
            ? (base.x !== undefined ? base.x : event.x)
            : undefined;
        const y = (locationType !== 'earth' && locationType !== 'station' && locationType !== 'marsShip')
            ? (base.y !== undefined ? base.y : event.y)
            : undefined;

        // Prefer explicit display names stored on the event/variant.
        let locationName = base.cityDisplayName || event.cityDisplayName || null;

        // Earth: if there's no explicit name, fall back to the location cache lookup.
        if (!locationName && locationType === 'earth' && lat !== undefined && lon !== undefined) {
            if (this.eventManager && typeof this.eventManager.getLocationName === 'function') {
                locationName = this.eventManager.getLocationName(lat, lon);
            }
        }

        // Station/MarsShip: avoid flagging all such events as overlapping due to default label.
        // Only use a name key if the event explicitly provides one.
        if ((locationType === 'station' || locationType === 'marsShip') && !base.cityDisplayName && !event.cityDisplayName) {
            locationName = null;
        }

        return { locationType, lat, lon, x, y, locationName };
    }

    _getOverlapKeysForEvent(event) {
        const { locationType, lat, lon, x, y, locationName } = this._getPrimaryLocationForOverlap(event);
        const nameKey = this._normalizeLocationNameForOverlap(locationName);

        let coordKey = null;
        if (locationType === 'earth' && Number.isFinite(lat) && Number.isFinite(lon)) {
            coordKey = `earth:${lat.toFixed(4)},${lon.toFixed(4)}`;
        } else if ((locationType === 'moon' || locationType === 'mars') && Number.isFinite(x) && Number.isFinite(y)) {
            coordKey = `${locationType}:${x.toFixed(1)},${y.toFixed(1)}`;
        }
        // Station has no stable coordinates → no coordKey.

        return { nameKey, coordKey };
    }

    _computeOverlapIndexSet(eventsToRender, fullList) {
        // Overlap is defined within groups of 10 by chronological index:
        // events #1-10, #11-20, etc.
        const groups = new Map(); // groupId -> { nameMap: Map<string, number[]>, coordMap: Map<string, number[]> }

        const add = (map, key, idx) => {
            if (!key) return;
            const arr = map.get(key);
            if (arr) arr.push(idx);
            else map.set(key, [idx]);
        };

        eventsToRender.forEach((event) => {
            const actualIndex = fullList.indexOf(event);
            if (actualIndex === -1) return;

            const groupId = Math.floor(actualIndex / 10);
            if (!groups.has(groupId)) {
                groups.set(groupId, { nameMap: new Map(), coordMap: new Map() });
            }

            const { nameKey, coordKey } = this._getOverlapKeysForEvent(event);
            const group = groups.get(groupId);
            add(group.nameMap, nameKey, actualIndex);
            add(group.coordMap, coordKey, actualIndex);
        });

        const overlaps = new Set();
        const markDuplicates = (m) => {
            for (const arr of m.values()) {
                if (arr.length > 1) {
                    arr.forEach((idx) => overlaps.add(idx));
                }
            }
        };

        for (const group of groups.values()) {
            markDuplicates(group.nameMap);
            markDuplicates(group.coordMap);
        }

        return overlaps;
    }

    /**
     * Set the EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }

    /**
     * Request a staggered entrance animation for the next render only.
     * Used for page navigation (prev/next/page input).
     */
    requestPageEntranceAnimation() {
        this._animateNextPageRender = true;
    }

    _runStaggeredEntranceAnimation(eventsList) {
        if (!eventsList) return;
        const items = Array.from(eventsList.querySelectorAll('.event-item'));
        if (items.length === 0) return;

        const token = ++this._entranceAnimToken;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            // Ensure visible even if classes linger.
            items.forEach((el) => {
                el.classList.remove('event-item--enter', 'event-item--enter-active');
                el.style.transitionDelay = '';
            });
            return;
        }

        const staggerMs = 22;
        const maxDelayMs = 480;

        items.forEach((el, i) => {
            el.classList.remove('event-item--enter-active');
            el.classList.add('event-item--enter');
            const delay = Math.min(i * staggerMs, maxDelayMs);
            el.style.transitionDelay = `${delay}ms`;
        });

        requestAnimationFrame(() => {
            if (token !== this._entranceAnimToken) return;
            // One more frame improves reliability after DOM insert.
            requestAnimationFrame(() => {
                if (token !== this._entranceAnimToken) return;
                items.forEach((el) => el.classList.add('event-item--enter-active'));
            });
        });

        // Cleanup: remove special classes after the animation finishes.
        const totalMs = 520 + Math.min((items.length - 1) * staggerMs, maxDelayMs);
        window.setTimeout(() => {
            if (token !== this._entranceAnimToken) return;
            items.forEach((el) => {
                el.classList.remove('event-item--enter', 'event-item--enter-active');
                el.style.transitionDelay = '';
            });
        }, totalMs);
    }

    _setupEventManagerImageLazyLoading(eventsList) {
        if (!eventsList) return;

        const imgs = Array.from(eventsList.querySelectorAll('img[data-src]'));
        if (imgs.length === 0) return;

        // Fallback: older browsers
        if (!('IntersectionObserver' in window)) {
            imgs.forEach((img) => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }
            });
            return;
        }

        // Root should be the scroll container.
        if (this._eventManagerImgObserver) {
            this._eventManagerImgObserver.disconnect();
        }

        this._eventManagerImgObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const src = img.dataset ? img.dataset.src : null;
                if (src) {
                    img.src = src;
                    delete img.dataset.src;
                }
                obs.unobserve(img);
            });
        }, {
            root: eventsList,
            rootMargin: '200px 0px',
            threshold: 0.01
        });

        imgs.forEach((img) => this._eventManagerImgObserver.observe(img));
    }

    /**
     * Helper function to update status (if available)
     */
    updateStatus(message, type = 'info') {
        if (typeof window.updateStatus === 'function') {
            window.updateStatus(message, type);
        }
    }

    /**
     * Render events to the DOM
     * @param {Array} events - Events to render
     * @param {number} currentPage - Current page number
     * @param {number} eventsPerPage - Events per page
     * @param {Function} onRenderComplete - Callback after rendering (for drag/drop setup, etc.)
     */
    renderEvents(events, currentPage, eventsPerPage, onRenderComplete) {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) {
            console.error('EventRenderService: eventsList element not found!');
            this.updateStatus('EventRenderService: Error - eventsList element not found!', 'error');
            return;
        }

        // Only scroll to top on explicit page navigation (prev/next/page input),
        // which already calls requestPageEntranceAnimation().
        const shouldScrollToTop = this._animateNextPageRender === true;

        // Calculate pagination
        const totalEvents = events.length;
        const totalPages = Math.max(1, Math.ceil(totalEvents / eventsPerPage));
        
        // Ensure current page is valid
        let validPage = currentPage;
        if (validPage > totalPages) {
            validPage = totalPages;
        }
        if (validPage < 1) {
            validPage = 1;
        }

        const startIndex = (validPage - 1) * eventsPerPage;
        const endIndex = Math.min(startIndex + eventsPerPage, totalEvents);
        const eventsToRender = events.slice(startIndex, endIndex);

        console.log(`EventRenderService: Rendering page ${validPage} of ${totalPages} (events ${startIndex + 1}-${endIndex} of ${totalEvents})`);
        if (eventsToRender.length > 0) {
            this.updateStatus(`EventRenderService: Rendering page ${validPage} of ${totalPages}...`, 'info');
        } else {
            this.updateStatus('EventRenderService: No events to render', 'info');
        }

        // Update event count display
        const eventsCountElement = document.getElementById('eventsCount');
        if (eventsCountElement) {
            eventsCountElement.textContent = `${totalEvents} ${totalEvents === 1 ? 'Event' : 'Events'} (Page ${validPage}/${totalPages})`;
        }

        eventsList.innerHTML = '';

        // Return the Events Manage sidebar list to the top when switching pages.
        // The scrollable container is the events grid itself (`.events-list`).
        if (shouldScrollToTop) {
            try {
                eventsList.scrollTop = 0;
                const panel = document.getElementById('eventsManagePanel') || document.querySelector('.events-manage-panel');
                if (panel) panel.scrollTop = 0;
            } catch (e) {
                // no-op
            }
        }

        if (events.length === 0) {
            const hasSearch = this.eventManager && (
                (this.eventManager.searchQuery && this.eventManager.searchQuery.trim()) ||
                (this.eventManager.searchHeroFilters && this.eventManager.searchHeroFilters.length > 0) ||
                (this.eventManager.searchFactionFilters && this.eventManager.searchFactionFilters.length > 0) ||
                (this.eventManager.searchCountryFilters && this.eventManager.searchCountryFilters.length > 0)
            );
            const msg = hasSearch
                ? 'No matching events. Try changing search or filters.'
                : 'No events yet. Click "Add Event" to create one.';
            eventsList.innerHTML = `<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">${msg}</div>`;
            console.log('EventRenderService: No events to render');
            this.renderPaginationControls(events, validPage, eventsPerPage);
            return;
        }

        // Create event items for current page; use index in full list for edit/delete/open (events may be filtered)
        const fullList = this.eventManager && this.eventManager.events ? this.eventManager.events : events;
        const overlapIndexSet = this._computeOverlapIndexSet(eventsToRender, fullList);
        const renderStartTime = performance.now();
        const fragment = document.createDocumentFragment();
        eventsToRender.forEach((event, pageIndex) => {
            const actualIndex = fullList.indexOf(event);
            if (actualIndex === -1) return;
            const eventItem = this.createEventItem(event, actualIndex, fullList, { hasOverlap: overlapIndexSet.has(actualIndex) });
            fragment.appendChild(eventItem);
        });
        eventsList.appendChild(fragment);
        this._setupEventManagerImageLazyLoading(eventsList);

        const renderTime = performance.now() - renderStartTime;
        console.log(`EventRenderService: Rendered ${eventsToRender.length} event items (${renderTime.toFixed(0)}ms)`);
        this.updateStatus(`EventRenderService: Rendered page ${validPage} (${eventsToRender.length} events, ${renderTime.toFixed(0)}ms)`, 'success');

        const shouldAnimateEntrance = this._animateNextPageRender;
        this._animateNextPageRender = false;
        if (shouldAnimateEntrance) {
            this._runStaggeredEntranceAnimation(eventsList);
        }

        // Call completion callback (for drag/drop setup, etc.)
        if (onRenderComplete && typeof onRenderComplete === 'function') {
            onRenderComplete();
        }
        
        // Update news ticker with headlines from displayed events
        this.updateNewsTicker(eventsToRender);
        
        // Render pagination controls
        this.renderPaginationControls(events, validPage, eventsPerPage);
    }

    /**
     * Update news ticker with headlines from displayed events
     * @param {Array} displayedEvents - Events currently displayed on the page (from EventManager - not used for ticker)
     */
    updateNewsTicker(displayedEvents) {
        // Use globe's pagination system instead (10 events per page)
        // Get events from DataModel's current page
        if (window.globeController && window.globeController.dataModel) {
            const currentPageEvents = window.globeController.dataModel.getEventsForCurrentPage();
            this.updateNewsTickerFromGlobePage(currentPageEvents);
        } else {
            // Fallback: use provided events if globe not available
            this.updateNewsTickerFromGlobePage(displayedEvents);
        }
    }

    /**
     * Update news ticker with headlines from globe's current page events
     * @param {Array} currentPageEvents - Events from globe's current page
     */
    updateNewsTickerFromGlobePage(currentPageEvents) {
        // Initialize or get NewsTickerService
        if (!window.newsTickerService) {
            if (window.NewsTickerService) {
                window.newsTickerService = new window.NewsTickerService();
                window.newsTickerService.init();
            } else {
                // Service not loaded yet, try again later
                setTimeout(() => this.updateNewsTickerFromGlobePage(currentPageEvents), 100);
                return;
            }
        }

        // Check if timeline is loaded (footer has timeline-loaded class)
        const footer = document.querySelector('footer');
        if (!footer || !footer.classList.contains('timeline-loaded')) {
            // Timeline not loaded yet, but we can still prepare the ticker
            // It will show when timeline loads
            return;
        }

        // Update ticker with headlines from current page events
        if (window.newsTickerService && window.newsTickerService.updateTicker) {
            window.newsTickerService.updateTicker(currentPageEvents);
        }
    }
    
    /**
     * Render pagination controls
     * @param {Array} events - All events
     * @param {number} currentPage - Current page number
     * @param {number} eventsPerPage - Events per page
     */
    renderPaginationControls(events, currentPage, eventsPerPage) {
        const totalEvents = events.length;
        const totalPages = Math.max(1, Math.ceil(totalEvents / eventsPerPage));
        
        // Find or create pagination container
        let paginationContainer = document.getElementById('eventsPagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'eventsPagination';
            paginationContainer.className = 'events-pagination';
            const eventsList = document.getElementById('eventsList');
            if (eventsList && eventsList.parentNode) {
                eventsList.parentNode.insertBefore(paginationContainer, eventsList.nextSibling);
            }
        }
        
        // Don't show pagination if only one page
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // Build pagination HTML (prev/next wrap: no disabled state, wrap at ends)
        let paginationHTML = '<div class="events-pagination-controls">';
        
        // Previous button (wraps to last page when on first page)
        paginationHTML += `<button class="events-pagination-btn" id="eventsPrevPage" title="Previous (wrap to last)">‹ Prev</button>`;
        
        // Page selector with text input (no spinner - use type="text" with pattern or keep number and hide spinner via CSS)
        paginationHTML += `<span class="events-pagination-page-selector">`;
        paginationHTML += `<label for="eventsPageInput">Page:</label>`;
        paginationHTML += `<input type="number" inputmode="numeric" id="eventsPageInput" class="events-pagination-input" min="1" max="${totalPages}" value="${currentPage}" />`;
        paginationHTML += `<span class="events-pagination-total">of ${totalPages}</span>`;
        paginationHTML += `</span>`;
        
        // Next button (wraps to first page when on last page)
        paginationHTML += `<button class="events-pagination-btn" id="eventsNextPage" title="Next (wrap to first)">Next ›</button>`;
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Attach event listeners (delegate to EventManager)
        // Setup pagination listeners after rendering controls
        this.setupPaginationListeners();
    }
    
    /**
     * Setup pagination event listeners
     */
    setupPaginationListeners() {
        if (!this.eventManager) return;
        
        const getDisplayedEvents = () => this.eventManager.getFilteredEvents ? this.eventManager.getFilteredEvents() : this.eventManager.events;
        const getTotalPages = () => Math.max(1, Math.ceil(getDisplayedEvents().length / this.eventManager.eventsPerPage));
        
        // Previous button: wrap to last page when on first page
        const prevBtn = document.getElementById('eventsPrevPage');
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('page');
                }
                this.requestPageEntranceAnimation();
                const totalPages = getTotalPages();
                if (this.eventManager.currentPage > 1) {
                    this.eventManager.currentPage--;
                } else {
                    this.eventManager.currentPage = totalPages;
                }
                if (this.eventManager.renderEvents) {
                    this.eventManager.renderEvents();
                }
            };
        }
        
        // Next button: wrap to first page when on last page
        const nextBtn = document.getElementById('eventsNextPage');
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.SoundEffectsManager) {
                    window.SoundEffectsManager.play('page');
                }
                this.requestPageEntranceAnimation();
                const totalPages = getTotalPages();
                if (this.eventManager.currentPage < totalPages) {
                    this.eventManager.currentPage++;
                } else {
                    this.eventManager.currentPage = 1;
                }
                if (this.eventManager.renderEvents) {
                    this.eventManager.renderEvents();
                }
            };
        }
        
        // Page input field
        const pageInput = document.getElementById('eventsPageInput');
        if (pageInput) {
            pageInput.onchange = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const totalPages = getTotalPages();
                const page = parseInt(pageInput.value, 10);
                if (page && page >= 1 && page <= totalPages && page !== this.eventManager.currentPage) {
                    this.requestPageEntranceAnimation();
                    this.eventManager.currentPage = page;
                    if (this.eventManager.renderEvents) {
                        this.eventManager.renderEvents();
                    }
                } else {
                    pageInput.value = this.eventManager.currentPage;
                }
            };
            
            pageInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    pageInput.onchange(e);
                }
                e.stopPropagation();
            };
            
            pageInput.onclick = (e) => {
                e.stopPropagation();
            };
        }
    }

    /**
     * Create event item element
     * @param {Object} event - Event object
     * @param {number} index - Event index in array
     * @param {Array} allEvents - All events (for context)
     * @returns {HTMLElement} Event item element
     */
    createEventItem(event, index, allEvents, options = {}) {
        if (!this.eventManager) {
            console.error('EventRenderService: EventManager not set!');
            return document.createElement('div');
        }

        const item = document.createElement('div');
        item.className = 'event-item';
        const isGitHubPages = this.eventManager.isGitHubPages ? this.eventManager.isGitHubPages() : false;
        if (isGitHubPages) {
            item.classList.add('event-item--view-only');
        }
        
        // Disable drag and drop on GitHub Pages
        if (!isGitHubPages) {
            item.draggable = true;
        }
        item.dataset.index = index;

        // Check if this event has unsaved changes
        if (this.eventManager.unsavedEventIndices && this.eventManager.unsavedEventIndices.has(index)) {
            item.classList.add('unsaved');
        }

        // Check if this is a multi-event
        const isMultiEvent = event.variants && event.variants.length > 0;
        if (isMultiEvent) {
            item.classList.add('multi-event');
        }

        // Get location name - for multi-events, use first variant's cityDisplayName
        // Otherwise use event's cityDisplayName or get from location lookup
        let locationName = null;
        const locationType = event.locationType || 'earth';
        let locationLat = event.lat;
        let locationLon = event.lon;
        let locationX = event.x;
        let locationY = event.y;
        
        if (isMultiEvent && event.variants && event.variants.length > 0) {
            // Use first variant's cityDisplayName and location
            const firstVariant = event.variants[0];
            locationName = firstVariant.cityDisplayName || null;
            const variantLocationType = firstVariant.locationType || locationType;
            if (variantLocationType === 'earth') {
                if (firstVariant.lat !== undefined) {
                    locationLat = firstVariant.lat;
                }
                if (firstVariant.lon !== undefined) {
                    locationLon = firstVariant.lon;
                }
            } else if (variantLocationType === 'moon' || variantLocationType === 'mars') {
                if (firstVariant.x !== undefined) {
                    locationX = firstVariant.x;
                }
                if (firstVariant.y !== undefined) {
                    locationY = firstVariant.y;
                }
            } else {
                // station/marsShip: no coordinates
            }
        } else {
            locationName = event.cityDisplayName || null;
        }
        
        // Only call getLocationName for Earth events with valid lat/lon
        if (!locationName && locationType === 'earth' && locationLat !== undefined && locationLon !== undefined) {
            if (this.eventManager.getLocationName) {
                locationName = this.eventManager.getLocationName(locationLat, locationLon);
            }
        }
        
        // For Moon/Mars/Station events, display coordinates if no custom name
        if (!locationName && locationType !== 'earth') {
            if (locationType === 'station') {
                locationName = 'Space Station (ISS)';
            } else if (locationType === 'marsShip') {
                locationName = 'Red Promise Escape Ship';
            } else if (locationX !== undefined && locationY !== undefined) {
                locationName = `${locationType === 'moon' ? 'Moon' : 'Mars'}: (${locationX.toFixed(1)}, ${locationY.toFixed(1)})`;
            } else {
                locationName = locationType === 'moon' ? 'Moon' : 'Mars';
            }
        }

        // For multi-events, track and use current variant index (default to 0)
        let currentVariantIndex = 0;
        if (isMultiEvent) {
            const itemKey = `event-${index}`;
            if (this.eventManager.eventItemVariantIndices && !this.eventManager.eventItemVariantIndices.has(itemKey)) {
                this.eventManager.eventItemVariantIndices.set(itemKey, 0);
            }
            if (this.eventManager.eventItemVariantIndices) {
                currentVariantIndex = this.eventManager.eventItemVariantIndices.get(itemKey);
            }
        }
        
        // For multi-events, show the current variant; otherwise show the main event
        const displayEvent = isMultiEvent ? event.variants[currentVariantIndex] : event;
        const imagePath = this.eventManager.getEventImagePath ? 
            this.eventManager.getEventImagePath(displayEvent.name, displayEvent.image) : null;
        
        // Update location for current variant
        if (isMultiEvent && event.variants[currentVariantIndex]) {
            const currentVariant = event.variants[currentVariantIndex];
            locationName = currentVariant.cityDisplayName || null;
            if (currentVariant.lat !== undefined) {
                locationLat = currentVariant.lat;
            }
            if (currentVariant.lon !== undefined) {
                locationLon = currentVariant.lon;
            }
            // Only call getLocationName for Earth events with valid lat/lon
            const currentVariantLocationType = currentVariant.locationType || locationType;
            if (!locationName && currentVariantLocationType === 'earth' && locationLat !== undefined && locationLon !== undefined) {
                if (this.eventManager.getLocationName) {
                    locationName = this.eventManager.getLocationName(locationLat, locationLon);
                }
            }
            // For Moon/Mars/Station/MarsShip events, display coordinates/label if no custom name
            if (!locationName && currentVariantLocationType !== 'earth') {
                const variantX = currentVariant.x !== undefined ? currentVariant.x : (event.x !== undefined ? event.x : undefined);
                const variantY = currentVariant.y !== undefined ? currentVariant.y : (event.y !== undefined ? event.y : undefined);
                if (currentVariantLocationType === 'station') {
                    locationName = 'Space Station (ISS)';
                } else if (currentVariantLocationType === 'marsShip') {
                    locationName = 'Red Promise Escape Ship';
                } else if (variantX !== undefined && variantY !== undefined) {
                    locationName = `${currentVariantLocationType === 'moon' ? 'Moon' : 'Mars'}: (${variantX.toFixed(1)}, ${variantY.toFixed(1)})`;
                } else {
                    locationName = currentVariantLocationType === 'moon' ? 'Moon' : 'Mars';
                }
            }
        }
        
        // Don't use cache busting for initial loads - let browser cache work for performance
        const imagePathWithCache = imagePath || null;
        
        // Warning icon for unfinished event - check if event is missing important information
        const hasDescription = displayEvent.description && displayEvent.description.trim().length > 0;
        const isUnfinished = !hasDescription;
        const unfinishedWarning = isUnfinished 
            ? `<div class="description-warning-badge" title="Unfinished event: Missing description">!</div>`
            : '';
        
        // Always use the same container structure to maintain consistent sizing
        const imageHtml = imagePathWithCache
            ? `<div class="event-item-preview-image" style="position: relative; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1; overflow: hidden;"><img data-src="${imagePathWithCache}" alt="${displayEvent.name}" decoding="async" fetchpriority="low" style="width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0; transition: opacity 0.18s ease;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;\\'>No Image</div>';" onload="this.style.opacity='1';"></div>`
            : `<div class="event-item-preview-image" style="position: relative; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1;">No Image</div>`;

        // Multi-event indicator badge - show current variant / total (e.g., "1/2")
        const multiEventBadge = isMultiEvent 
            ? `<div class="multi-event-badge" data-event-index="${index}" title="Click to cycle through variants">${currentVariantIndex + 1}/${event.variants.length}</div>`
            : '';

        // Event number badge - show event number in chronological order (bottom-right)
        const overlapClass = options.hasOverlap ? ' event-number-badge--overlap' : '';
        const overlapTitle = options.hasOverlap
            ? `Overlap detected on globe page ${Math.floor(index / 10) + 1}`
            : `Event #${index + 1}`;
        const eventNumberBadge = `<div class="event-number-badge${overlapClass}" title="${overlapTitle}">${index + 1}</div>`;

        // On GitHub Pages, no action row — the whole card opens the event (read-only host).
        const actionButtons = isGitHubPages ? '' : `
            <div class="event-item-actions">
                <div class="event-item-actions-row">
                    <button class="event-item-btn view-btn" data-index="${index}">View</button>
                </div>
                <div class="event-item-actions-row">
                    <button class="event-item-btn edit-btn" data-index="${index}">Edit</button>
                    <button class="event-item-btn delete-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `;

        const displayLocationType = (displayEvent && displayEvent.locationType) || event.locationType || 'earth';
        const locationDisplayText = locationName || `${event.lat ? event.lat.toFixed(4) : '0'}, ${event.lon ? event.lon.toFixed(4) : '0'}`;
        const locationRowInner = (window.LocationFlagHelpers && typeof window.LocationFlagHelpers.createLocationRowInnerHtml === 'function')
            ? window.LocationFlagHelpers.createLocationRowInnerHtml(locationDisplayText, displayLocationType)
            : `<img class="event-location-pin" src="assets/images/icons/Location Icon.png" alt="" width="28" height="28" decoding="async" /> ${locationDisplayText}`;

        item.innerHTML = `
            <div style="position: relative;">
            ${imageHtml}
            ${multiEventBadge}
            ${unfinishedWarning}
            ${eventNumberBadge}
            </div>
            <div class="event-item-info">
                <h3 class="event-item-title">${window.GlitchTextService ? window.GlitchTextService.getDisplayEventName(displayEvent.name) : displayEvent.name}</h3>
                <p class="event-item-location">${locationRowInner}</p>
            </div>
            ${actionButtons}
        `;

        // Add event listeners for buttons (View + Edit/Delete on local/dev; GitHub uses whole-card click)
        const viewBtn = item.querySelector('.view-btn');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');

        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (this.eventManager.openEventFromList) {
                    this.eventManager.openEventFromList(event, index);
                }
            });
            // Prevent dragging when clicking on button
            viewBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        if (editBtn && !isGitHubPages) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.eventManager.openEditModal) {
                    this.eventManager.openEditModal(index);
                }
            });
            // Prevent dragging when clicking on button
            editBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        if (deleteBtn && !isGitHubPages) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.eventManager.deleteEvent) {
                    this.eventManager.deleteEvent(index);
                }
            });
            // Prevent dragging when clicking on button
            deleteBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        if (isGitHubPages) {
            const label = (displayEvent && displayEvent.name) ? String(displayEvent.name) : (`Event ${index + 1}`);
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-label', `Open event: ${label}`);
            item.addEventListener('click', (e) => {
                if (e.target.closest('.multi-event-badge')) {
                    return;
                }
                if (this.eventManager.openEventFromList) {
                    this.eventManager.openEventFromList(event, index);
                }
            });
            item.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') {
                    return;
                }
                e.preventDefault();
                if (this.eventManager.openEventFromList) {
                    this.eventManager.openEventFromList(event, index);
                }
            });
        }

        // Add click handler for multi-event badge to cycle through variants
        if (isMultiEvent) {
            const badge = item.querySelector('.multi-event-badge');
            if (badge) {
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.eventManager.cycleEventVariant) {
                        this.eventManager.cycleEventVariant(index, event, item);
                    }
                });
                // Prevent dragging when clicking on badge
                badge.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
            }
        }

        return item;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventRenderService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventRenderService = new EventRenderService();
}
