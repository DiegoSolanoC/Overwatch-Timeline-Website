/**
 * SidebarService - Manages sidebar toggle functionality
 * Handles opening/closing sidebar, persistence, and click-outside behavior
 */

class SidebarService {
    constructor() {
        this.initialized = false;
        
        // DOM elements (will be set in init)
        this.sidebar = null;
        this.indicator = null;
        this.closeButton = null;
    }
    
    init() {
        // Prevent double initialization
        if (this.initialized) {
            console.log('Sidebar already initialized, skipping...');
            return;
        }
        
        // Get DOM elements
        this.sidebar = document.getElementById('sidebar');
        this.indicator = document.getElementById('sidebarIndicator');
        this.closeButton = document.getElementById('sidebarClose');
        
        if (!this.sidebar) {
            // Sidebar not found - this is expected if it doesn't exist on the page
            return;
        }
        
        // Mark as initialized
        this.initialized = true;
        
        // Check if sidebar should be open from localStorage
        if (localStorage.getItem('sidebarOpen') === 'true') {
            this.sidebar.classList.add('visible');
        }
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Toggle sidebar when clicking the indicator
        if (this.indicator) {
            this.indicator.addEventListener('click', () => {
                this.sidebar.classList.toggle('visible');
                localStorage.setItem('sidebarOpen', this.sidebar.classList.contains('visible'));
            });
        }
        
        // Close sidebar when clicking the X button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling
                this.sidebar.classList.remove('visible');
                localStorage.setItem('sidebarOpen', 'false');
            });
        }
        
        // Close sidebar when clicking outside of it
        document.addEventListener('click', (e) => {
            if (this.sidebar && this.sidebar.classList.contains('visible')) {
                if (!this.sidebar.contains(e.target) && 
                    (!this.indicator || !this.indicator.contains(e.target))) {
                    this.sidebar.classList.remove('visible');
                    localStorage.setItem('sidebarOpen', 'false');
                }
            }
        });
        
        // Keep sidebar open when clicking navigation buttons
        const navButtons = this.sidebar.querySelectorAll('button');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                localStorage.setItem('sidebarOpen', 'true');
            });
        });
    }
    
    // Public method to toggle sidebar programmatically
    toggle() {
        if (this.sidebar) {
            this.sidebar.classList.toggle('visible');
            localStorage.setItem('sidebarOpen', this.sidebar.classList.contains('visible'));
        }
    }
    
    // Public method to open sidebar programmatically
    open() {
        if (this.sidebar) {
            this.sidebar.classList.add('visible');
            localStorage.setItem('sidebarOpen', 'true');
        }
    }
    
    // Public method to close sidebar programmatically
    close() {
        if (this.sidebar) {
            this.sidebar.classList.remove('visible');
            localStorage.setItem('sidebarOpen', 'false');
        }
    }
    
    // Public method to check if sidebar is open
    isOpen() {
        return this.sidebar && this.sidebar.classList.contains('visible');
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarService;
}

// Make globally accessible for non-module usage
if (typeof window !== 'undefined') {
    window.SidebarService = new SidebarService();
}
