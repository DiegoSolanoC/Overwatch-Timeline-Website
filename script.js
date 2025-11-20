// Modal functionality
function showDetails(feature) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    
    const featureDetails = {
        feature1: {
            title: 'Feature 1 Details',
            text: 'This is detailed information about Feature 1. You can customize this text with your own content.'
        },
        feature2: {
            title: 'Feature 2 Details',
            text: 'This is detailed information about Feature 2. Add your own descriptions here!'
        },
        feature3: {
            title: 'Feature 3 Details',
            text: 'This is detailed information about Feature 3. Make it your own!'
        }
    };
    
    if (featureDetails[feature]) {
        modalTitle.textContent = featureDetails[feature].title;
        modalText.textContent = featureDetails[feature].text;
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Navigation functions (for single-page navigation if needed)
function showHome() {
    window.location.href = 'index.html';
}

function showAbout() {
    window.location.href = 'about.html';
}

function showContact() {
    window.location.href = 'contact.html';
}

// Contact form handling
function handleSubmit(event) {
    event.preventDefault();
    
    const formMessage = document.getElementById('form-message');
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    // Since this is a static site, we'll just show a success message
    // In a real application, you'd send this to a backend server
    
    console.log('Form submitted:', { name, email, message });
    
    formMessage.className = 'form-message success';
    formMessage.textContent = 'Thank you for your message! (Note: This is a demo - no email was actually sent)';
    
    // Reset the form
    document.getElementById('contactForm').reset();
    
    // Hide message after 5 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    
    const sidebar = document.getElementById('sidebar');
    const indicator = document.getElementById('sidebarIndicator');
    const closeButton = document.getElementById('sidebarClose');
    
    // Check if sidebar should be open from localStorage
    if (localStorage.getItem('sidebarOpen') === 'true') {
        sidebar.classList.add('visible');
    }
    
    // Toggle sidebar when clicking the indicator
    if (indicator) {
        indicator.addEventListener('click', function() {
            sidebar.classList.toggle('visible');
            localStorage.setItem('sidebarOpen', sidebar.classList.contains('visible'));
        });
    }
    
    // Close sidebar when clicking the X button
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling
            sidebar.classList.remove('visible');
            localStorage.setItem('sidebarOpen', 'false');
        });
    }
    
    // Close sidebar when clicking outside of it
    document.addEventListener('click', function(e) {
        if (!sidebar.contains(e.target) && !indicator.contains(e.target)) {
            sidebar.classList.remove('visible');
            localStorage.setItem('sidebarOpen', 'false');
        }
    });
    
    // Keep sidebar open when clicking navigation buttons
    const navButtons = sidebar.querySelectorAll('button');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            localStorage.setItem('sidebarOpen', 'true');
        });
    });
    
    // Initialize Filters Panel - wait a bit to ensure all elements are loaded
    setTimeout(() => {
        initFiltersPanel();
    }, 100);
});

// Filters Panel functionality
function initFiltersPanel() {
    const filtersButton = document.getElementById('filtersToggle');
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersPanelClose = document.getElementById('filtersPanelClose');
    const filtersGrid = document.getElementById('filtersGrid');
    const unselectAllBtn = document.getElementById('unselectAllBtn');
    const confirmFiltersBtn = document.getElementById('confirmFiltersBtn');
    
    console.log('Initializing filters panel...');
    console.log('Filters button:', filtersButton);
    console.log('Filters panel:', filtersPanel);
    console.log('Filters grid:', filtersGrid);
    
    if (!filtersButton || !filtersPanel || !filtersGrid) {
        console.error('Filters panel elements not found!');
        return;
    }
    
    // List of heroes (alphabetically sorted)
    const heroes = [
        'Ana', 'Aqua', 'Ashe', 'Baptiste', 'Bastion', 'Brigitte', 'Cassidy', 'D.va',
        'Doomfist', 'Echo', 'Freja', 'Genji', 'Hanzo', 'Hazard', 'Illari', 'Junker Queen',
        'Junkrat', 'Juno', 'Kiriko', 'Lifeweaver', 'Lucio', 'Mauga', 'Mei', 'Mercy',
        'Moira', 'Orisa', 'Pharah', 'Ramattra', 'Reaper', 'Reinhardt', 'Roadhog',
        'Sigma', 'Sojourn', 'Soldier 76', 'Sombra', 'Symmetra', 'Torbjorn', 'Tracer',
        'Vendetta', 'Venture', 'Widowmaker', 'Winston', 'Wrecking Ball', 'Zarya', 'Zenyatta'
    ].sort(); // Sort alphabetically
    
    // List of factions (with number prefix for sorting)
    const factionsWithNumbers = [
        '00Overwatch', '01Overwatch 2', '02Blackwatch', '03Ecopoints', '04Talon', '05Omnica',
        '06Crisis', '07Null Sector', '08Junkers', '09Lucheng', '10Ironclad', '11Deadlock',
        '12Vishkar', '13Shambali', '14Wayfinders', '15MEKA', '16Los Muertos', '17Inti',
        '18Helix', '19Volskaya', '20Collective', '21Phreaks', '22Shimada', '23Yokai',
        '24Numbani', '25Conspiracy'
    ];
    
    // Sort factions by number prefix and extract display names
    const factions = factionsWithNumbers.map(faction => {
        // Extract number and name
        const match = faction.match(/^(\d+)(.+)$/);
        if (match) {
            return {
                filename: faction,
                number: parseInt(match[1], 10),
                displayName: match[2].trim()
            };
        }
        return {
            filename: faction,
            number: 999,
            displayName: faction
        };
    }).sort((a, b) => a.number - b.number); // Sort by number
    
    // Track selected filters (stores both heroes and factions)
    const selectedFilters = new Set();
    let currentFilterType = 'heroes'; // 'heroes' or 'factions'
    
    // Function to update filter counts
    function updateFilterCounts() {
        const heroesCount = document.getElementById('heroesCount');
        const factionsCount = document.getElementById('factionsCount');
        
        let heroCount = 0;
        let factionCount = 0;
        
        selectedFilters.forEach(filter => {
            // Check if it's a faction (has number prefix) or hero
            if (/^\d+/.test(filter)) {
                factionCount++;
            } else {
                heroCount++;
            }
        });
        
        // Only display count if greater than 0
        if (heroesCount) {
            if (heroCount > 0) {
                heroesCount.textContent = heroCount;
                heroesCount.style.display = 'inline';
            } else {
                heroesCount.style.display = 'none';
            }
        }
        if (factionsCount) {
            if (factionCount > 0) {
                factionsCount.textContent = factionCount;
                factionsCount.style.display = 'inline';
            } else {
                factionsCount.style.display = 'none';
            }
        }
    }
    
    // Function to create filter buttons
    function createFilterButtons(items, type, folder) {
        filtersGrid.innerHTML = ''; // Clear existing buttons
        
        items.forEach(item => {
            const filterBtn = document.createElement('div');
            filterBtn.className = 'filter-btn';
            
            // Get the filter key (filename for factions, name for heroes)
            const filterKey = type === 'factions' ? item.filename : item;
            const displayName = type === 'factions' ? item.displayName : item;
            
            filterBtn.dataset.filterType = type;
            filterBtn.dataset.filterKey = filterKey;
            
            // Image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'filter-image-container';
            
            const img = document.createElement('img');
            img.src = `${folder}/${filterKey}.png`;
            img.alt = displayName;
            img.onerror = function() {
                // If image fails to load, hide the button or show placeholder
                this.style.display = 'none';
            };
            
            imageContainer.appendChild(img);
            
            // Label
            const label = document.createElement('div');
            label.className = 'filter-label';
            label.textContent = displayName;
            
            filterBtn.appendChild(imageContainer);
            filterBtn.appendChild(label);
            
            // Check if this filter is already selected
            if (selectedFilters.has(filterKey)) {
                filterBtn.classList.add('selected');
            }
            
            // Toggle selection on click
            filterBtn.addEventListener('click', function() {
                if (selectedFilters.has(filterKey)) {
                    selectedFilters.delete(filterKey);
                    filterBtn.classList.remove('selected');
                } else {
                    selectedFilters.add(filterKey);
                    filterBtn.classList.add('selected');
                }
                updateFilterCounts(); // Update counts after selection change
            });
            
            filtersGrid.appendChild(filterBtn);
        });
        
        updateFilterCounts(); // Update counts when buttons are created
    }
    
    // Initialize with heroes
    createFilterButtons(heroes, 'heroes', 'Heroes');
    
    // Tab switching
    const heroesTab = document.getElementById('heroesTab');
    const factionsTab = document.getElementById('factionsTab');
    
    if (heroesTab) {
        heroesTab.addEventListener('click', function() {
            currentFilterType = 'heroes';
            heroesTab.classList.add('active');
            factionsTab.classList.remove('active');
            createFilterButtons(heroes, 'heroes', 'Heroes');
            updateFilterCounts(); // Update counts when switching tabs
        });
    }
    
    if (factionsTab) {
        factionsTab.addEventListener('click', function() {
            currentFilterType = 'factions';
            factionsTab.classList.add('active');
            heroesTab.classList.remove('active');
            createFilterButtons(factions, 'factions', 'Factions');
            updateFilterCounts(); // Update counts when switching tabs
        });
    }
    
    // Open filters panel - use mousedown to prevent globe interaction
    if (filtersButton) {
        // Prevent button from interfering with globe controls
        filtersButton.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        filtersButton.addEventListener('mouseup', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        filtersButton.addEventListener('touchstart', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        filtersButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Filters button clicked!');
            // Toggle panel (open if closed, close if open)
            filtersPanel.classList.toggle('open');
            console.log('Panel open state:', filtersPanel.classList.contains('open'));
            // Update button active state
            if (filtersPanel.classList.contains('open')) {
                filtersButton.classList.add('active');
            } else {
                filtersButton.classList.remove('active');
            }
        });
    } else {
        console.error('Filters button not found!');
    }
    
    // Close filters panel
    if (filtersPanelClose) {
        filtersPanelClose.addEventListener('click', function() {
            filtersPanel.classList.remove('open');
            // Update button active state
            if (filtersButton) {
                filtersButton.classList.remove('active');
            }
        });
    }
    
    // Clear button (unselect all and unlock all events)
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            selectedFilters.clear();
            const filterButtons = filtersGrid.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Clear filters and unlock all events
            if (window.globeController && window.globeController.globeView) {
                const sceneModel = window.globeController.sceneModel;
                if (sceneModel) {
                    sceneModel.activeFilters.clear();
                    // Unlock all events
                    window.globeController.globeView.unlockAllEvents();
                }
            }
            
            // Refresh current view to update button states
            if (currentFilterType === 'heroes') {
                createFilterButtons(heroes, 'heroes', 'Heroes');
            } else {
                createFilterButtons(factions, 'factions', 'Factions');
            }
        });
    }
    
    // Confirm button - applies filters and closes panel immediately
    if (confirmFiltersBtn) {
        confirmFiltersBtn.addEventListener('click', function() {
            // Close panel first
            filtersPanel.classList.remove('open');
            if (filtersButton) {
                filtersButton.classList.remove('active');
            }
            
            // Apply filters to events immediately
            if (window.globeController && window.globeController.globeView) {
                // Store selected filters in sceneModel
                const sceneModel = window.globeController.sceneModel;
                if (sceneModel) {
                    sceneModel.activeFilters = new Set(selectedFilters);
                    // Apply filters to event markers
                    window.globeController.globeView.applyFilters();
                }
            }
            
            console.log('Selected filters:', Array.from(selectedFilters));
        });
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (filtersPanel && filtersPanel.classList.contains('open')) {
            if (!filtersPanel.contains(e.target) && 
                !filtersButton.contains(e.target) && 
                e.target !== filtersButton) {
                filtersPanel.classList.remove('open');
                // Update button active state
                if (filtersButton) {
                    filtersButton.classList.remove('active');
                }
            }
        }
    });
}

// Optional: Add keyboard shortcut to close modal (ESC key)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

