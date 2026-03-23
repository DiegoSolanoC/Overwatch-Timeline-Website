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
    // Simplified default UX: start directly in Global Timeline mode.
    document.body.classList.add('app-timeline-default');

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

    // Wait a bit for component-loader to initialize and publish globals.
    setTimeout(async function () {
        console.log(`${logPrefix} Auto-loading Universal Features and Global Timeline...`);
        updateLoadingStatus('Loading Universal Features...');

        // Auto-load Universal Features (Palette + Music)
        if (typeof window.runUniversalFeatures === 'function') {
            try {
                // Keep the overlay visible across the full boot chain so we don't
                // flash a "header + universal buttons only" state between loads.
                await window.runUniversalFeatures({ keepOverlay: true });
                console.log(`${logPrefix} ✓ Universal Features auto-loaded`);
                updateLoadingStatus('Loading Global Timeline...');
            } catch (error) {
                console.error(`${logPrefix} Error auto-loading Universal Features:`, error);
                updateLoadingStatus('Error loading Universal Features');
            }
        } else {
            console.warn(`${logPrefix} runUniversalFeatures not available yet, retrying...`);
            setTimeout(async function () {
                if (typeof window.runUniversalFeatures === 'function') {
                    updateLoadingStatus('Loading Universal Features...');
                    await window.runUniversalFeatures({ keepOverlay: true });
                    updateLoadingStatus('Loading Global Timeline...');
                }
            }, 1000);
        }

        // Auto-load Global Timeline Components immediately after Universal Features.
        // Overlay stays visible throughout due to keepOverlay above.
        setTimeout(async function () {
            if (typeof window.runGlobeComponents === 'function') {
                try {
                    await window.runGlobeComponents(true);
                    console.log(`${logPrefix} ✓ Global Timeline auto-loaded`);
                    updateLoadingStatus('Complete!');

                    // Fade out loading overlay after a brief delay
                    setTimeout(function () {
                        if (loadingOverlay) {
                            loadingOverlay.classList.remove('active');
                        }
                    }, 300);
                } catch (error) {
                    console.error(`${logPrefix} Error auto-loading Global Timeline:`, error);
                    updateLoadingStatus('Error loading Global Timeline');
                    // Still fade out after error
                    setTimeout(function () {
                        if (loadingOverlay) {
                            loadingOverlay.classList.remove('active');
                        }
                    }, 1000);
                }
            } else {
                console.warn(`${logPrefix} runGlobeComponents not available yet, retrying...`);
                setTimeout(async function () {
                    if (typeof window.runGlobeComponents === 'function') {
                        updateLoadingStatus('Loading Global Timeline...');
                        await window.runGlobeComponents(true);
                        updateLoadingStatus('Complete!');
                        setTimeout(function () {
                            if (loadingOverlay) {
                                loadingOverlay.classList.remove('active');
                            }
                        }, 300);
                    }
                }, 1000);
            }
        }, 0);
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

// Header hub: mode switching buttons (Timeline / Glossary / Bios)
function setupHeaderHub() {
    const hubs = [
        document.getElementById('headerHub'),
        document.getElementById('headerHubRight')
    ].filter(Boolean);
    if (hubs.length === 0) return;

    const isTimelineActuallyLoaded = () => {
        const globeContainer = document.getElementById('globe-container');
        return !!(globeContainer && globeContainer.classList.contains('loaded') && window.globeController);
    };

    const setActive = (mode) => {
        const requested = (mode === 'globe') ? 'globe' : (mode === 'menu' ? 'menu' : mode);
        // If someone refreshes while localStorage says "globe", we should still start in menu mode
        // until timeline assets are actually loaded.
        const effective = (requested === 'globe' && !isTimelineActuallyLoaded()) ? 'menu' : requested;
        hubs.forEach((hub) => {
            const btns = Array.from(hub.querySelectorAll('.header-hub-btn'));
            btns.forEach((b) => b.classList.remove('header-hub-btn--active'));
        });
        // Only highlight Timeline when actually in globe mode (left hub).
        if (effective === 'globe') {
            const leftHub = document.getElementById('headerHub');
            const timelineBtn = leftHub ? leftHub.querySelector('.header-hub-btn[data-mode="globe"]') : null;
            if (timelineBtn) timelineBtn.classList.add('header-hub-btn--active');
        }

        // Home/Exit should only appear while a mode's assets are actually loaded.
        // Right now only Timeline (globe) has assets, so it should only show there.
        const rightHub = document.getElementById('headerHubRight');
        const exitBtn = rightHub
            ? (rightHub.querySelector('.header-hub-btn--exit') || rightHub.querySelector('.header-hub-btn[data-action="menu"]'))
            : null;
        if (exitBtn) {
            const simplified = document.body.classList.contains('app-timeline-default');
            if (simplified) {
                exitBtn.style.display = 'none';
            } else {
                const show = (effective === 'globe') && isTimelineActuallyLoaded();
                exitBtn.style.display = show ? '' : 'none';
            }
        }

        // Keep storage sane: if we aren't actually in globe (assets not loaded), store "menu".
        if (effective === 'menu') {
            localStorage.setItem('currentMode', 'menu');
        }
    };

    const onHubClick = (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('.header-hub-btn') : null;
        if (!btn) return;
        // Only intercept clicks for the actual mode buttons (Timeline/Glossary/Bios) or Exit.
        // Other header-hub buttons (Filters/Events/Map/etc.) must keep their own handlers.
        const mode = btn.dataset ? btn.dataset.mode : null;
        const action = btn.dataset ? btn.dataset.action : null;
        if (!mode && !action) return;
        e.preventDefault();
        e.stopPropagation();

        const target = mode || (action === 'menu' ? 'menu' : null);

        if (typeof window.appModeSwitch === 'function') {
            window.appModeSwitch(target);
        } else if (typeof window.restoreMainMenu === 'function') {
            window.restoreMainMenu();
        }
    };

    hubs.forEach((hub) => hub.addEventListener('click', onHubClick));

    // Initial state
    const currentMode = (localStorage.getItem('currentMode') || 'menu').toString().toLowerCase();
    setActive(currentMode);

    // Update on mode change
    window.addEventListener('appmodechange', (ev) => {
        setActive(ev?.detail?.mode || 'menu');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHeaderHub);
} else {
    setupHeaderHub();
}

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

