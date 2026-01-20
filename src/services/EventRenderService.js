/**
 * EventRenderService - Handles rendering of events to the DOM
 * Separates rendering logic from event management logic
 */

class EventRenderService {
    constructor() {
        // Will be set by EventManager
        this.eventManager = null;
    }

    /**
     * Set the EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
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

        if (events.length === 0) {
            eventsList.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">No events yet. Click "Add Event" to create one.</div>';
            console.log('EventRenderService: No events to render');
            this.renderPaginationControls(events, validPage, eventsPerPage);
            return;
        }

        // Create event items for current page using document fragment for better performance
        const renderStartTime = performance.now();
        const fragment = document.createDocumentFragment();
        eventsToRender.forEach((event, pageIndex) => {
            const actualIndex = startIndex + pageIndex; // Actual index in full events array
            const eventItem = this.createEventItem(event, actualIndex, events);
            fragment.appendChild(eventItem);
        });
        eventsList.appendChild(fragment);

        const renderTime = performance.now() - renderStartTime;
        console.log(`EventRenderService: Rendered ${eventsToRender.length} event items (${renderTime.toFixed(0)}ms)`);
        this.updateStatus(`EventRenderService: Rendered page ${validPage} (${eventsToRender.length} events, ${renderTime.toFixed(0)}ms)`, 'success');

        // Call completion callback (for drag/drop setup, etc.)
        if (onRenderComplete && typeof onRenderComplete === 'function') {
            onRenderComplete();
        }
        
        // Render pagination controls
        this.renderPaginationControls(events, validPage, eventsPerPage);
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
        
        // Build pagination HTML
        let paginationHTML = '<div class="events-pagination-controls">';
        
        // Previous button
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        paginationHTML += `<button class="events-pagination-btn" id="eventsPrevPage" ${prevDisabled}>‹ Prev</button>`;
        
        // Page selector with text input
        paginationHTML += `<span class="events-pagination-page-selector">`;
        paginationHTML += `<label for="eventsPageInput">Page:</label>`;
        paginationHTML += `<input type="number" id="eventsPageInput" class="events-pagination-input" min="1" max="${totalPages}" value="${currentPage}" />`;
        paginationHTML += `<span class="events-pagination-total">of ${totalPages}</span>`;
        paginationHTML += `</span>`;
        
        // Next button
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        paginationHTML += `<button class="events-pagination-btn" id="eventsNextPage" ${nextDisabled}>Next ›</button>`;
        
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
        
        // Previous button
        const prevBtn = document.getElementById('eventsPrevPage');
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.eventManager.currentPage > 1) {
                    this.eventManager.currentPage--;
                    if (this.eventManager.renderEvents) {
                        this.eventManager.renderEvents();
                    }
                }
            };
        }
        
        // Next button
        const nextBtn = document.getElementById('eventsNextPage');
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const totalPages = Math.max(1, Math.ceil(this.eventManager.events.length / this.eventManager.eventsPerPage));
                if (this.eventManager.currentPage < totalPages) {
                    this.eventManager.currentPage++;
                    if (this.eventManager.renderEvents) {
                        this.eventManager.renderEvents();
                    }
                }
            };
        }
        
        // Page input field
        const pageInput = document.getElementById('eventsPageInput');
        if (pageInput) {
            pageInput.onchange = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const totalPages = Math.max(1, Math.ceil(this.eventManager.events.length / this.eventManager.eventsPerPage));
                const page = parseInt(pageInput.value);
                if (page && page >= 1 && page <= totalPages && page !== this.eventManager.currentPage) {
                    this.eventManager.currentPage = page;
                    if (this.eventManager.renderEvents) {
                        this.eventManager.renderEvents();
                    }
                } else {
                    // Reset to current page if invalid
                    pageInput.value = this.eventManager.currentPage;
                }
            };
            
            pageInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    pageInput.onchange(e);
                }
                // Stop propagation for all keys to prevent panel closing
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
    createEventItem(event, index, allEvents) {
        if (!this.eventManager) {
            console.error('EventRenderService: EventManager not set!');
            return document.createElement('div');
        }

        const item = document.createElement('div');
        item.className = 'event-item';
        const isGitHubPages = this.eventManager.isGitHubPages ? this.eventManager.isGitHubPages() : false;
        
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
            } else {
                // Moon or Mars
                if (firstVariant.x !== undefined) {
                    locationX = firstVariant.x;
                }
                if (firstVariant.y !== undefined) {
                    locationY = firstVariant.y;
                }
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
            // For Moon/Mars events, display coordinates if no custom name
            if (!locationName && currentVariantLocationType !== 'earth') {
                const variantX = currentVariant.x !== undefined ? currentVariant.x : (event.x !== undefined ? event.x : undefined);
                const variantY = currentVariant.y !== undefined ? currentVariant.y : (event.y !== undefined ? event.y : undefined);
                if (variantX !== undefined && variantY !== undefined) {
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
            ? `<div class="event-item-preview-image" style="position: relative; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1; overflow: hidden;"><img src="${imagePathWithCache}" alt="${displayEvent.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; width: 100%; height: 100%;\\'>No Image</div>';" onload=""></div>`
            : `<div class="event-item-preview-image" style="position: relative; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 12px; background: rgba(0,0,0,0.5); width: 100%; aspect-ratio: 1;">No Image</div>`;

        // Multi-event indicator badge - show current variant / total (e.g., "1/2")
        const multiEventBadge = isMultiEvent 
            ? `<div class="multi-event-badge" data-event-index="${index}" title="Click to cycle through variants">${currentVariantIndex + 1}/${event.variants.length}</div>`
            : '';

        // Event number badge - show event number in chronological order (bottom-right)
        const eventNumberBadge = `<div class="event-number-badge" title="Event #${index + 1}">${index + 1}</div>`;

        // On GitHub Pages, hide edit/delete buttons, but show View button
        const actionButtons = isGitHubPages ? `
            <div class="event-item-actions">
                <div class="event-item-actions-row">
                    <button class="event-item-btn view-btn" data-index="${index}">View</button>
                </div>
            </div>
        ` : `
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

        item.innerHTML = `
            <div style="position: relative;">
            ${imageHtml}
            ${multiEventBadge}
            ${unfinishedWarning}
            ${eventNumberBadge}
            </div>
            <div class="event-item-info">
                <h3 class="event-item-title">${window.GlitchTextService ? window.GlitchTextService.getDisplayEventName(displayEvent.name) : displayEvent.name}</h3>
                <p class="event-item-location"><img src="assets/images/icons/Location Icon.png" alt="Location" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"> ${locationName || `${event.lat ? event.lat.toFixed(4) : '0'}, ${event.lon ? event.lon.toFixed(4) : '0'}`}</p>
            </div>
            ${actionButtons}
        `;

        // Add event listeners for buttons (View works on both, Edit/Delete only on localhost)
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
