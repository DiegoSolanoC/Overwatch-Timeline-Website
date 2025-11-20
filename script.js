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
    
    // Check if sidebar should be open from localStorage (only on desktop)
    if (window.innerWidth > 768 && localStorage.getItem('sidebarOpen') === 'true') {
        sidebar.classList.add('visible');
    } else if (window.innerWidth <= 768) {
        // Always start closed on mobile
        sidebar.classList.remove('visible');
        localStorage.setItem('sidebarOpen', 'false');
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
    
    // Close sidebar when clicking outside of it (mobile-friendly)
    const sidebarBackdrop = document.createElement('div');
    sidebarBackdrop.className = 'sidebar-backdrop';
    document.body.appendChild(sidebarBackdrop);
    
    // Close sidebar when clicking backdrop (mobile)
    sidebarBackdrop.addEventListener('click', function() {
        sidebar.classList.remove('visible');
        localStorage.setItem('sidebarOpen', 'false');
    });
    
    // Close sidebar when clicking outside of it (desktop)
    document.addEventListener('click', function(e) {
        // Only auto-close on mobile, desktop keeps it open
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !indicator.contains(e.target) && !sidebarBackdrop.contains(e.target)) {
                sidebar.classList.remove('visible');
                localStorage.setItem('sidebarOpen', 'false');
            }
        }
    });
    
    // Auto-close sidebar on mobile when navigating
    if (window.innerWidth <= 768) {
        const navButtons = sidebar.querySelectorAll('button');
        navButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Small delay to allow navigation, then close
                setTimeout(() => {
                    sidebar.classList.remove('visible');
                    localStorage.setItem('sidebarOpen', 'false');
                }, 100);
            });
        });
    }
    
    // Keep sidebar open when clicking navigation buttons (desktop only)
    const navButtons = sidebar.querySelectorAll('button');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (window.innerWidth > 768) {
                localStorage.setItem('sidebarOpen', 'true');
            } else {
                // Auto-close on mobile after navigation
                setTimeout(() => {
                    sidebar.classList.remove('visible');
                    localStorage.setItem('sidebarOpen', 'false');
                }, 100);
            }
        });
    });
    
    // Handle window resize - close sidebar on mobile when resizing
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768 && sidebar.classList.contains('visible')) {
            sidebar.classList.remove('visible');
            localStorage.setItem('sidebarOpen', 'false');
        }
    });
});

// Optional: Add keyboard shortcut to close modal (ESC key)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

