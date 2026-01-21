/**
 * Node.js HTTP Server for Timeline Overwatch
 * Handles custom routes and serves static files
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.glb': 'model/gltf-binary',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
    // Parse URL and decode it to handle spaces and special characters
    const parsedUrl = url.parse(req.url, true);
    let decodedPath = decodeURIComponent(parsedUrl.pathname);
    
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${decodedPath}`);
    
    // Handle custom routes
    if (decodedPath === '/test' || decodedPath === '/test/') {
        serveFile(res, './test.html', 'text/html');
        return;
    }
    
    if (decodedPath === '/main' || decodedPath === '/main/' || decodedPath === '/main.html') {
        serveFile(res, './main.html', 'text/html');
        return;
    }
    
    // Default route serves main.html
    if (decodedPath === '/' || decodedPath === '/index' || decodedPath === '/index.html') {
        serveFile(res, './main.html', 'text/html');
        return;
    }

    // Legacy path compatibility: map old Event Images URLs to new assets location
    // Requests like /Event%20Images/Foo.png → /assets/images/events/Foo.png
    if (decodedPath.startsWith('/Event Images/')) {
        const rest = decodedPath.substring('/Event Images/'.length);
        decodedPath = '/assets/images/events/' + rest;
    }
    
    // Serve static files
    let filePath = '.' + decodedPath;
    
    // Security: prevent directory traversal
    if (filePath.includes('..')) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - Forbidden</h1>', 'utf-8');
        return;
    }
    
    // Get file extension for MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    serveFile(res, filePath, contentType);
});

function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>', 'utf-8');
            }
        } else {
            // Add cache-busting headers for JS files to prevent stale module cache
            const headers = { 'Content-Type': contentType };
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.js') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                headers['Pragma'] = 'no-cache';
                headers['Expires'] = '0';
            }
            res.writeHead(200, headers);
            res.end(data, 'utf-8');
        }
    });
}

server.listen(PORT, () => {
    console.log(`\n=== Timeline Overwatch Server ===`);
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`\nAvailable routes:`);
    console.log(`  - http://localhost:${PORT}/          → main.html (default)`);
    console.log(`  - http://localhost:${PORT}/main      → main.html`);
    console.log(`  - http://localhost:${PORT}/main.html → main.html`);
    console.log(`  - http://localhost:${PORT}/test      → test.html`);
    console.log(`  - http://localhost:${PORT}/test.html → test.html`);
    console.log(`\nPress Ctrl+C to stop the server\n`);
});

