"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Packages
const electron_1 = require("electron");
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const path_1 = require("path");
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const nestjs_server_1 = require("./nestjs-server");
// Override spawn for debugging (unchanged)
(function () {
    var childProcess = require('child_process');
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();
// Prepare Next.js app (shared for dev and prod)
const prepareNext = async (isDevMode) => {
    const nextApp = (0, next_1.default)({
        dev: isDevMode,
        dir: (0, path_1.join)(electron_1.app.getAppPath(), 'renderer'),
        port: 3000, // Default port for Next.js, adjust if needed
    });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    return { nextApp, handle };
};
// Initialize server runner instance
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
    // Setup main window
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 1050,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Temporarily disable for debugging
            // need below for static export
            // preload: join(app.getAppPath(), 'main/preload.js'),
        },
    });
    // Add event handlers for debugging
    mainWindow.webContents.on('did-fail-load', (errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
    // mainWindow.webContents.on('did-finish-load', () => {
    //   console.log('Window finished loading');
    // });
    // mainWindow.webContents.on('console-message', (message: any) => {
    //   console.log('Renderer console:', message);
    // });
    // Start Next.js server and load it into the window
    const port = 3000; // Ensure this doesn’t conflict with NestJS (3002)
    const { handle } = await prepareNext(electron_is_dev_1.default);
    const nextServer = (0, http_1.createServer)((req, res) => {
        const parsedUrl = (0, url_1.parse)(req.url, true);
        handle(req, res, parsedUrl);
    });
    nextServer.listen(port, () => {
        console.log(`> Next.js ready on http://localhost:${port}`);
        mainWindow.loadURL(`http://localhost:${port}/`).catch((err) => {
            console.error('Failed to load Next.js URL:', err);
        });
    });
    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();
    // Show window when content is ready
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });
});
// Stop the NestJS server when the app is closing
electron_1.app.on('will-quit', async (event) => {
    event.preventDefault();
    console.log('Stopping NestJS server before quitting...');
    try {
        await nestJSServer.stop();
        console.log('NestJS server stopped');
    }
    catch (error) {
        console.error('Error stopping NestJS server:', error);
    }
    finally {
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
