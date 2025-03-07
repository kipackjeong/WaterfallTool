// Packages
import { BrowserWindow, app } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'path';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { NestJSServerManager } from './nestjs-server';

// Override spawn for debugging (unchanged)
(function () {
  var childProcess = require('child_process');
  var oldSpawn = childProcess.spawn;
  function mySpawn(this: any): any {
    console.log('spawn called');
    console.log(arguments);
    var result = oldSpawn.apply(this, arguments);
    return result;
  }
  childProcess.spawn = mySpawn;
})();

// Prepare Next.js app (shared for dev and prod)
const prepareNext = async (isDevMode: boolean) => {
  const nextApp = next({
    dev: isDevMode,
    dir: join(app.getAppPath(), 'renderer'),
    port: 3000, // Default port for Next.js, adjust if needed
  });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  return { nextApp, handle };
};

// Initialize server runner instance
const nestJSServer = new NestJSServerManager(app);

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  // Start the NestJS server
  try {
    console.log('Starting NestJS server...');
    await nestJSServer.start();
    console.log('NestJS server started at:', nestJSServer.getServerUrl());
  } catch (error) {
    console.error('Failed to start NestJS server:', error);
  }

  // Setup main window
  const mainWindow = new BrowserWindow({
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
  const { handle } = await prepareNext(isDev);

  const nextServer = createServer((req: any, res: any) => {
    const parsedUrl = parse(req.url, true);
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
app.on('will-quit', async (event) => {
  event.preventDefault();
  console.log('Stopping NestJS server before quitting...');
  try {
    await nestJSServer.stop();
    console.log('NestJS server stopped');
  } catch (error) {
    console.error('Error stopping NestJS server:', error);
  } finally {
    app.exit();
  }
});

// Quit the app when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create a window when clicking the dock icon
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    app.emit('ready');
  }
});