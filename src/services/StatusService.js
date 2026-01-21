/**
 * StatusService - Manages status updates for test page
 */
class StatusService {
    update(message, type = 'info') {
        const isMainPage = window.location.pathname.includes('main.html') || window.location.href.includes('main.html');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const overlayActive = loadingOverlay && loadingOverlay.classList.contains('active');
        
        let statusContent;
        if (isMainPage && overlayActive) {
            statusContent = document.getElementById('overlayStatusContent');
            if (statusContent) {
                statusContent.innerHTML = '';
                const item = document.createElement('div');
                item.className = `test-status-item ${type}`;
                item.textContent = message;
                statusContent.appendChild(item);
            }
        } else {
            const statusDiv = document.getElementById('testStatus');
            statusContent = document.getElementById('statusContent');
            if (statusDiv && statusContent) {
                statusDiv.style.display = 'block';
                statusContent.innerHTML = '';
                const item = document.createElement('div');
                item.className = `test-status-item ${type}`;
                item.textContent = message;
                statusContent.appendChild(item);
            }
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.StatusService = StatusService;
}
