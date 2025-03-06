"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Packages
const electron_1 = require("electron");
const electron_serve_1 = __importDefault(require("electron-serve"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const path_1 = require("path");
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
// Prepare nextjs in dev mode
const prepareNext = async () => {
    const nextApp = (0, next_1.default)({ dev: true, dir: (0, path_1.join)(electron_1.app.getAppPath(), 'renderer') });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    return handle;
};
// Initialize serve for production mode
const loadURL = (0, electron_serve_1.default)({ directory: 'renderer/out' });
// Prepare the renderer once the app is ready
electron_1.app.on('ready', async () => {
    // Setup IPC API handlers
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 1050,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Temporarily disable for debugging
            preload: (0, path_1.join)(electron_1.app.getAppPath(), 'main/preload.js'), // Absolute path to preload script
        },
    });
    // Add event handlers for debugging
    mainWindow.webContents.on('did-fail-load', (errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window finished loading');
    });
    mainWindow.webContents.on('console-message', (message) => {
        console.log('Renderer console:', message);
    });
    if (electron_is_dev_1.default) {
        // Development - use Next.js dev server
        const handle = await prepareNext();
        const port = process.argv[2] || 3000;
        (0, http_1.createServer)((req, res) => {
            const parsedUrl = (0, url_1.parse)(req.url, true);
            handle(req, res, parsedUrl);
        }).listen(port, () => {
            console.log(`> Ready on http://localhost:${port}`);
            mainWindow.loadURL(`http://localhost:${port}/`);
        });
        // Open DevTools in dev mode
        mainWindow.webContents.openDevTools();
    }
    else {
        // Production - use static files
        console.log('Running in production mode');
        console.log('App path:', electron_1.app.getAppPath());
        console.log('Loading from static files directory:', (0, path_1.join)(electron_1.app.getAppPath(), 'renderer/out'));
        try {
            // Try loading directly from file path first
            const indexPath = (0, path_1.join)(electron_1.app.getAppPath(), 'renderer/out/index.html');
            console.log('Attempting to load index from:', indexPath);
            try {
                // Try the loadURL helper first
                console.log('Trying loadURL helper...');
                await loadURL(mainWindow);
            }
            catch (loadUrlError) {
                console.error('Error using loadURL:', loadUrlError);
                // Fallback to direct file loading
                console.log('Falling back to direct file loading...');
                try {
                    await mainWindow.loadFile(indexPath);
                }
                catch (fileLoadError) {
                    console.error('Error using loadFile:', fileLoadError);
                }
            }
            // Enable DevTools in production temporarily for debugging
            mainWindow.webContents.openDevTools();
        }
        catch (error) {
            console.error('Error loading URL:', error);
        }
    }
    // Show window when content is ready
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });
});
// Quit the app once all windows are closed
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        electron_1.app.emit('ready');
    }
});
