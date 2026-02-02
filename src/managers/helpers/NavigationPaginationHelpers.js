/**
 * NavigationPaginationHelpers - Utilities for pagination button handling
 * Extracted from EventNavigationManager to reduce complexity
 */

import { playNavigationSound } from './NavigationButtonHelpers.js';

/**
 * Update news ticker with headlines from globe's current page
 */
function updateNewsTickerFromGlobe() {
    if (window.globeController && window.globeController.dataModel && window.newsTickerService) {
        const currentPageEvents = window.globeController.dataModel.getEventsForCurrentPage();
        if (window.newsTickerService.updateTicker) {
            window.newsTickerService.updateTicker(currentPageEvents);
        }
    }
}

/**
 * Handles previous page button click with wrap logic
 * @param {Object} dataModel - DataModel instance
 * @param {Function} wrappedUpdatePaginationUI - Wrapped update function
 * @param {Function} onPageChange - Page change callback
 */
export function handlePrevPageClick(dataModel, wrappedUpdatePaginationUI, onPageChange) {
    playNavigationSound('page');
    
    const currentPage = dataModel.getCurrentEventPage();
    const totalPages = dataModel.getTotalEventPages();
    
    let newPage;
    if (currentPage === 1) {
        // Wrap to last page
        newPage = totalPages;
    } else {
        // Normal previous page
        newPage = currentPage - 1;
    }
    
    dataModel.setCurrentEventPage(newPage);
    wrappedUpdatePaginationUI();
    
    // Update news ticker with headlines from new page
    updateNewsTickerFromGlobe();
    
    if (onPageChange) {
        onPageChange();
    }
}

/**
 * Handles next page button click with wrap logic
 * @param {Object} dataModel - DataModel instance
 * @param {Function} wrappedUpdatePaginationUI - Wrapped update function
 * @param {Function} onPageChange - Page change callback
 */
export function handleNextPageClick(dataModel, wrappedUpdatePaginationUI, onPageChange) {
    playNavigationSound('page');
    
    const currentPage = dataModel.getCurrentEventPage();
    const totalPages = dataModel.getTotalEventPages();
    
    let newPage;
    if (currentPage === totalPages) {
        // Wrap to first page
        newPage = 1;
    } else {
        // Normal next page
        newPage = currentPage + 1;
    }
    
    dataModel.setCurrentEventPage(newPage);
    wrappedUpdatePaginationUI();
    
    // Update news ticker with headlines from new page
    updateNewsTickerFromGlobe();
    
    if (onPageChange) {
        onPageChange();
    }
}

/**
 * Handles manual page input change
 * @param {number} inputValue - Input value
 * @param {Object} dataModel - DataModel instance
 * @param {Function} wrappedUpdatePaginationUI - Wrapped update function
 * @param {Function} onPageChange - Page change callback
 */
export function handlePageInputChange(inputValue, dataModel, wrappedUpdatePaginationUI, onPageChange) {
    const totalPages = dataModel.getTotalEventPages();
    
    // Validate and set page
    if (!isNaN(inputValue) && inputValue >= 1 && inputValue <= totalPages) {
        const oldPage = dataModel.getCurrentEventPage();
        dataModel.setCurrentEventPage(inputValue);
        wrappedUpdatePaginationUI();
        
        // Update news ticker with headlines from new page
        updateNewsTickerFromGlobe();
        
        // Only play sound if page actually changed
        if (oldPage !== inputValue) {
            playNavigationSound('page');
        }
        if (onPageChange) {
            onPageChange();
        }
    } else {
        // Reset to current page if invalid
        wrappedUpdatePaginationUI();
    }
}

/**
 * Updates pagination button states (wrap icons, disabled states)
 * @param {HTMLElement} prevBtn - Previous button element
 * @param {HTMLElement} nextBtn - Next button element
 * @param {HTMLElement} pageInput - Page input element
 * @param {HTMLElement} pageTotal - Page total element
 * @param {Object} dataModel - DataModel instance
 */
export function updatePaginationButtonStates(prevBtn, nextBtn, pageInput, pageTotal, dataModel) {
    const currentPage = dataModel.getCurrentEventPage();
    const totalPages = dataModel.getTotalEventPages();
    
    // Update input value (without triggering change event)
    pageInput.value = currentPage;
    pageInput.max = totalPages;
    pageTotal.textContent = `/ ${totalPages}`;
    
    // Enable wrap buttons - change icon and behavior at boundaries
    if (totalPages > 1) {
        // Previous button: wrap to last page if on first page
        if (currentPage === 1) {
            prevBtn.disabled = false;
            prevBtn.textContent = '↻'; // Wrap icon
            prevBtn.title = 'Go to Last Page';
        } else {
            prevBtn.disabled = false;
            prevBtn.textContent = '‹'; // Normal left arrow
            prevBtn.title = 'Previous Page';
        }
        
        // Next button: wrap to first page if on last page
        if (currentPage === totalPages) {
            nextBtn.disabled = false;
            nextBtn.textContent = '↻'; // Wrap icon
            nextBtn.title = 'Go to First Page';
        } else {
            nextBtn.disabled = false;
            nextBtn.textContent = '›'; // Normal right arrow
            nextBtn.title = 'Next Page';
        }
    } else {
        // Only one page or no events - disable both
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        prevBtn.textContent = '‹';
        nextBtn.textContent = '›';
    }
    
    // Hide pagination if only one page or no events
    const pagination = document.getElementById('eventPagination');
    if (pagination) {
        if (totalPages <= 1) {
            pagination.style.display = 'none';
        } else {
            pagination.style.display = 'flex';
        }
    }
}

// Make available globally for script tag loading
if (typeof window !== 'undefined') {
    if (!window.NavigationPaginationHelpers) {
        window.NavigationPaginationHelpers = {};
    }
    window.NavigationPaginationHelpers.handlePrevPageClick = handlePrevPageClick;
    window.NavigationPaginationHelpers.handleNextPageClick = handleNextPageClick;
    window.NavigationPaginationHelpers.handlePageInputChange = handlePageInputChange;
    window.NavigationPaginationHelpers.updatePaginationButtonStates = updatePaginationButtonStates;
    window.NavigationPaginationHelpers.updateNewsTickerFromGlobe = updateNewsTickerFromGlobe;
}
