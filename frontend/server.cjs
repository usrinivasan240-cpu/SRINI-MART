// ============================================================================
// File:    server.cjs
// Purpose: Tiny local web server for developing/testing the app on your PC.
// ⭐ WHAT THIS FILE IS (plain English):
//     The real site runs on Firebase Hosting (no server of our own). This file
//     is only a convenience: it lets you open the site at http://localhost:8000
//     while you develop. It serves the files inside the "frontend" folder and,
//     for routes that don't exist, it falls back to index.html (same behaviour
//     as Firebase Hosting's rewrites). Nothing here talks to Firebase — the
//     browser talks to Firebase directly.
// Run:    npm start  (from frontend/)
// Language: JavaScript (CommonJS)
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DIR = path.join(__dirname);

// The label used for each file type in the browser's Content-Type header.
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Work out which file the browser asked for (default: index.html).
    let filePath = path.join(DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/html';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            // File not found: serve the app's index.html (single-page app).
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(DIR, 'index.html'), (e, c) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(c, 'utf-8');
                });
            } else {
                // Some other read error -> tell the browser "server error".
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            // File found: send it back with the right content type.
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start listening; the site is then live at http://localhost:8000.
server.listen(PORT, () => {
    console.log(`SriniMart running at http://localhost:${PORT}`);
});
