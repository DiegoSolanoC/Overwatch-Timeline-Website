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
});

// Optional: Add keyboard shortcut to close modal (ESC key)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

