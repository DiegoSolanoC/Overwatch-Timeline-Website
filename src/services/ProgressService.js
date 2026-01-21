/**
 * ProgressService - Manages progress tracking for component loading
 */
class ProgressService {
    constructor() {
        this.globeComponentsProgress = {
            total: 4, // Globe Base, Transport, Controls, Events
            completed: 0
        };
    }

    updateGlobeComponentsProgress(completed) {
        this.globeComponentsProgress.completed = completed;
        const progressBar = document.getElementById('loadingProgressBar');
        if (progressBar) {
            const percentage = (completed / this.globeComponentsProgress.total) * 100;
            progressBar.style.width = percentage + '%';
        }
    }

    resetGlobeComponentsProgress() {
        this.globeComponentsProgress.completed = 0;
        const progressBar = document.getElementById('loadingProgressBar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ProgressService = ProgressService;
}
