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
const nestjs_server_1 = require("./nestjs-server");
(function () {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();
// Prepare nextjs in dev mode
const prepareNext = async () => {
    const nextApp = (0, next_1.default)({ dev: true, dir: (0, path_1.join)(electron_1.app.getAppPath(), 'renderer') });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    return handle;
};
// Initialize serve for production mode
const loadURL = (0, electron_serve_1.default)({ directory: 'renderer/out' });
// Initialize server runner instance.
const nestJSServer = new nestjs_server_1.NestJSServerManager(electron_1.app);
// Prepare the renderer once the app is ready
electron_1.app.on('ready', async () => {
    // Start the NestJS server
    try {
        console.log('Starting NestJS server...');
        await nestJSServer.start();
        console.log('NestJS server started at:', nestJSServer.getServerUrl());
    }
    catch (error) {
        console.error('Failed to start NestJS server:', error);
    }
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
            // Set content encoding to ensure proper text rendering
            mainWindow.webContents.on('dom-ready', () => {
                mainWindow.webContents.executeJavaScript(`
          document.querySelector('meta[charset]').setAttribute('charset', 'UTF-8');
          console.log('Charset set to UTF-8');
        `).catch(err => console.error('Failed to set charset:', err));
            });
            // Production: Use electron-serve to serve static files
            console.log('Loading app using electron-serve...');
            await loadURL(mainWindow);
            // If electron-serve fails, try alternative methods
            if (!mainWindow.webContents.getURL()) {
                console.log('electron-serve failed, trying direct file loading');
                const indexPath = (0, path_1.join)(electron_1.app.getAppPath(), 'renderer/out/index.html');
                await mainWindow.loadFile(indexPath);
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
// Stop the NestJS server when the app is closing
electron_1.app.on('will-quit', async (event) => {
    // Prevent the app from quitting immediately
    event.preventDefault();
    // Stop the NestJS server
    console.log('Stopping NestJS server before quitting...');
    try {
        await nestJSServer.stop();
        console.log('NestJS server stopped');
    }
    catch (error) {
        console.error('Error stopping NestJS server:', error);
    }
    finally {
        // Continue with app quitting
        electron_1.app.exit();
    }
});
// Quit the app when all windows are closed
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// On macOS, re-create a window when clicking the dock icon
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        electron_1.app.emit('ready');
    }
});
// End of Electron app lifecycle events
