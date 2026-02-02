// Shared page initialization logic for main/index pages
// - Hides sidebar on GitHub Pages
// - Auto-loads Universal Features & Menu Components via test-loader
// - Manages loading overlay lifecycle
// - Sets up zoom controls visibility and click behavior

// Detect if we're running on GitHub Pages (or similar static hosting)
function isGitHubPages() {
    const hostname = window.location.hostname;
    return hostname.includes('github.io') ||
        hostname.includes('github.com') ||
        (hostname !== 'localhost' &&
            hostname !== '127.0.0.1' &&
            !hostname.startsWith('192.168.') &&
            !hostname.startsWith('10.') &&
            window.location.protocol !== 'file:');
}

// Hide sidebar on GitHub Pages (navigation is handled by GitHub UI / direct links)
if (isGitHubPages()) {
    document.addEventListener('DOMContentLoaded', function () {
        const sidebar = document.getElementById('sidebar');
        const sidebarIndicator = document.getElementById('sidebarIndicator');
        if (sidebar) {
            sidebar.style.display = 'none';
            sidebar.style.visibility = 'hidden';
        }
        if (sidebarIndicator) {
            sidebarIndicator.style.display = 'none';
            sidebarIndicator.style.visibility = 'hidden';
        }
    });
}

// Auto-load Universal Features and Menu Components on landing pages
window.addEventListener('DOMContentLoaded', function () {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    const logPrefix = `[${pageName}]`;

    // Show loading overlay immediately if present
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }

    // Update loading status using overlayStatusContent
    function updateLoadingStatus(message) {
        const overlayStatusContent = document.getElementById('overlayStatusContent');
        if (overlayStatusContent) {
            overlayStatusContent.innerHTML = '';
            const item = document.createElement('div');
            item.className = 'test-status-item info';
            item.textContent = message;
            overlayStatusContent.appendChild(item);
        }
    }

    // Wait a bit for test-loader.js to initialize
    setTimeout(async function () {
        console.log(`${logPrefix} Auto-loading Universal Features and Menu Components...`);
        updateLoadingStatus('Loading Universal Features...');

        // Auto-load Universal Features (Palette + Music)
        if (typeof window.runUniversalFeatures === 'function') {
            try {
                await window.runUniversalFeatures();
                console.log(`${logPrefix} ✓ Universal Features auto-loaded`);
                updateLoadingStatus('Loading Menu Components...');
            } catch (error) {
                console.error(`${logPrefix} Error auto-loading Universal Features:`, error);
                updateLoadingStatus('Error loading Universal Features');
            }
        } else {
            console.warn(`${logPrefix} runUniversalFeatures not available yet, retrying...`);
            setTimeout(async function () {
                if (typeof window.runUniversalFeatures === 'function') {
                    updateLoadingStatus('Loading Universal Features...');
                    await window.runUniversalFeatures();
                    updateLoadingStatus('Loading Menu Components...');
                }
            }, 1000);
        }

        // Auto-load Menu Components (after a short delay to ensure Universal Features are loaded)
        setTimeout(async function () {
            if (typeof window.runMenuComponents === 'function') {
                try {
                    await window.runMenuComponents();
                    console.log(`${logPrefix} ✓ Menu Components auto-loaded`);
                    updateLoadingStatus('Complete!');

                    // Fade out loading overlay after a brief delay
                    setTimeout(function () {
                        if (loadingOverlay) {
                            loadingOverlay.classList.remove('active');
                        }
                    }, 300);
                } catch (error) {
                    console.error(`${logPrefix} Error auto-loading Menu Components:`, error);
                    updateLoadingStatus('Error loading Menu Components');
                    // Still fade out after error
                    setTimeout(function () {
                        if (loadingOverlay) {
                            loadingOverlay.classList.remove('active');
                        }
                    }, 1000);
                }
            } else {
                console.warn(`${logPrefix} runMenuComponents not available yet, retrying...`);
                setTimeout(async function () {
                    if (typeof window.runMenuComponents === 'function') {
                        await window.runMenuComponents();
                        updateLoadingStatus('Complete!');
                        setTimeout(function () {
                            if (loadingOverlay) {
                                loadingOverlay.classList.remove('active');
                            }
                        }, 300);
                    }
                }, 1000);
            }
        }, 500); // Small delay after Universal Features start
    }, 500); // Small delay to ensure test-loader.js is loaded

    // Cleanup on page unload to prevent memory leaks and freezing
    window.addEventListener('beforeunload', () => {
        if (window.globeController) {
            window.globeController.destroy();
        }
    });

    // Also handle pagehide (more reliable for mobile)
    window.addEventListener('pagehide', () => {
        if (window.globeController) {
            window.globeController.destroy();
        }
    });
});

// Zoom controls setup (shared between main/index pages)
function setupZoomControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomControls = document.getElementById('zoomControls');

    if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.globeController && window.globeController.interactionController) {
                window.globeController.interactionController.zoomIn();
            }
        });

        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (window.globeController && window.globeController.interactionController) {
                    window.globeController.interactionController.resetToDefault();
                }
            });
        }

        zoomOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.globeController && window.globeController.interactionController) {
                window.globeController.interactionController.zoomOut();
            }
        });
    }

    // Function to update zoom controls visibility
    function updateZoomControlsVisibility() {
        if (!zoomControls) return;

        const globeContainer = document.getElementById('globe-container');
        const testContainer = document.querySelector('.test-container');

        // Show zoom controls only when globe is loaded and menu is hidden
        const globeLoaded = globeContainer && globeContainer.classList.contains('loaded');
        const menuVisible = testContainer &&
            testContainer.style.display !== 'none' &&
            testContainer.style.opacity !== '0' &&
            window.getComputedStyle(testContainer).display !== 'none' &&
            parseFloat(window.getComputedStyle(testContainer).opacity) > 0;

        if (globeLoaded && !menuVisible) {
            zoomControls.classList.add('visible');
        } else {
            zoomControls.classList.remove('visible');
        }
    }

    // Update visibility initially and on changes
    updateZoomControlsVisibility();

    // Watch for changes to globe container and test container
    const globeContainer = document.getElementById('globe-container');
    const testContainer = document.querySelector('.test-container');
    const observer = new MutationObserver(updateZoomControlsVisibility);
    if (globeContainer) {
        observer.observe(globeContainer, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    if (testContainer) {
        observer.observe(testContainer, { attributes: true, attributeFilter: ['style'] });
    }

    // Also check periodically (fallback)
    setInterval(updateZoomControlsVisibility, 500);
}

// Initialize zoom controls when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupZoomControls);
} else {
    setupZoomControls();
}

// Also setup after globe loads (in case it's not ready yet)
const checkGlobeAndSetupZoom = setInterval(() => {
    if (window.globeController && window.globeController.interactionController) {
        setupZoomControls();
        clearInterval(checkGlobeAndSetupZoom);
    }
}, 500);

// Clear interval after 10 seconds to avoid infinite checking
setTimeout(() => clearInterval(checkGlobeAndSetupZoom), 10000);

