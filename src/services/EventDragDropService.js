/**
 * EventDragDropService - Handles drag and drop functionality for event reordering
 * Separates drag and drop logic from event management
 */

class EventDragDropService {
    constructor() {
        this.eventManager = null; // Reference to EventManager (for state access)
    }

    /**
     * Set the EventManager instance (dependency injection)
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        if (!this.eventManager) return;
        
        // Disable drag and drop on GitHub Pages
        if (this.eventManager.isGitHubPages && this.eventManager.isGitHubPages()) {
            return;
        }
        
        const items = document.querySelectorAll('.event-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.eventManager.draggedElement = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.event-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
                this.eventManager.draggedElement = null;
                this.eventManager.dragOverIndex = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = this.getDragAfterElement(e.currentTarget, e.clientY);
                const index = parseInt(item.dataset.index);
                
                if (afterElement == null) {
                    item.classList.add('drag-over');
                } else {
                    item.classList.remove('drag-over');
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.eventManager.draggedElement && this.eventManager.draggedElement !== item) {
                    const fromIndex = parseInt(this.eventManager.draggedElement.dataset.index);
                    const toIndex = parseInt(item.dataset.index);
                    this.reorderEvents(fromIndex, toIndex);
                }
            });
        });
    }

    /**
     * Get element after which to insert dragged element
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.parentElement.querySelectorAll('.event-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Reorder events
     */
    reorderEvents(fromIndex, toIndex) {
        if (!this.eventManager) return;
        
        const events = this.eventManager.events;
        if (fromIndex < 0 || fromIndex >= events.length || toIndex < 0 || toIndex >= events.length) {
            return;
        }
        
        const [moved] = events.splice(fromIndex, 1);
        events.splice(toIndex, 0, moved);
        
        // Update unsaved indices after reordering
        const wasUnsaved = this.eventManager.unsavedEventIndices.has(fromIndex);
        this.eventManager.unsavedEventIndices.delete(fromIndex);
        
        // Rebuild unsaved indices with new positions
        const newUnsaved = new Set();
        this.eventManager.unsavedEventIndices.forEach(oldIndex => {
            if (oldIndex === fromIndex) {
                // The moved item - goes to toIndex
                newUnsaved.add(toIndex);
            } else if (oldIndex < fromIndex && oldIndex < toIndex) {
                // Before both - no change
                newUnsaved.add(oldIndex);
            } else if (oldIndex > fromIndex && oldIndex > toIndex) {
                // After both - shift left
                newUnsaved.add(oldIndex - 1);
            } else if (oldIndex < fromIndex && oldIndex >= toIndex) {
                // Between toIndex and fromIndex - shift right
                newUnsaved.add(oldIndex + 1);
            } else if (oldIndex > fromIndex && oldIndex <= toIndex) {
                // Between fromIndex and toIndex - shift left
                newUnsaved.add(oldIndex - 1);
            }
        });
        if (wasUnsaved) {
            newUnsaved.add(toIndex);
        }
        this.eventManager.unsavedEventIndices = newUnsaved;
        
        if (this.eventManager.renderEvents) {
            this.eventManager.renderEvents();
        }
        // Mark all events as unsaved after reordering (user needs to save)
        events.forEach((_, idx) => this.eventManager.unsavedEventIndices.add(idx));
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventDragDropService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.EventDragDropService = new EventDragDropService();
}
