// Packages
import { BrowserWindow, app } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'path';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { NestJSServerManager } from './nestjs-server';
import * as fs from 'fs';
import * as path from 'path';

// Set up logging to file for production debugging
const setupLogging = () => {
  const logDir = isDev ? path.join(__dirname, '../logs') : path.join(app.getPath('userData'), 'logs');

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `app-${new Date().toISOString().replace(/:/g, '-')}.log`);
  console.log(`Logging to file: ${logFile}`);

  // Create a write stream
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  // Override console methods to write to file
  console.log = function () {
    const args = Array.from(arguments);
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [LOG] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`;
    logStream.write(message + '\n');
    originalConsole.log.apply(console, args);
  };

  console.error = function () {
    const args = Array.from(arguments);
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [ERROR] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`;
    logStream.write(message + '\n');
    originalConsole.error.apply(console, args);
  };

  console.warn = function () {
    const args = Array.from(arguments);
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [WARN] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`;
    logStream.write(message + '\n');
    originalConsole.warn.apply(console, args);
  };

  console.info = function () {
    const args = Array.from(arguments);
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [INFO] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`;
    logStream.write(message + '\n');
    originalConsole.info.apply(console, args);
  };

  // Log uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  return logFile;
};

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
  // In development, use the local renderer directory
  // In production, use the renderer directory from app.asar (not app.asar.unpacked)
  let rendererDir = join(app.getAppPath(), 'renderer');
  let foundValidPath = false;

  // For production, check if we're in an asar package
  if (!isDevMode) {
    const appPath = app.getAppPath();
    console.log('App path:', appPath);

    // Enhanced debugging for production
    const fs = require('fs');
    console.log('Process resource path:', process.resourcesPath);
    console.log('__dirname:', __dirname);

    // Check if renderer directory exists at the current path
    try {
      const rendererExists = fs.existsSync(rendererDir);
      console.log(`Renderer directory exists at ${rendererDir}:`, rendererExists);

      if (rendererExists) {
        foundValidPath = true;
      }

      // List files in app directory to debug
      const appDirFiles = fs.readdirSync(app.getAppPath());
      console.log('Files in app directory:', appDirFiles);
    } catch (err) {
      console.error('Error checking renderer directory:', err);
    }

    // If we're in an asar package, use the renderer directory directly from app.asar
    if (appPath.includes('app.asar') && !foundValidPath) {
      // No need to replace app.asar with app.asar.unpacked - use the path directly
      rendererDir = join(appPath, 'renderer');
      console.log('Using renderer directory from app.asar:', rendererDir);

      // Check if this path exists
      try {
        const rendererExists = fs.existsSync(rendererDir);
        console.log(`Renderer directory exists at ${rendererDir}:`, rendererExists);

        if (rendererExists) {
          // List files in renderer directory
          const rendererFiles = fs.readdirSync(rendererDir);
          console.log('Files in renderer directory:', rendererFiles);
          foundValidPath = true;
        }
      } catch (err) {
        console.error('Error checking renderer directory in app.asar:', err);
      }

      // Try alternative paths as fallback
      if (!foundValidPath) {
        const alternativePaths = [
          join(appPath.replace('app.asar', 'app.asar.unpacked'), 'renderer'),
          join(process.resourcesPath || '', 'app.asar.unpacked', 'renderer'),
          join(process.resourcesPath || '', 'renderer'),
          join(process.resourcesPath || '', 'app.asar', 'renderer')
        ];

        for (const path of alternativePaths) {
          try {
            const exists = fs.existsSync(path);
            console.log(`Alternative path ${path} exists:`, exists);

            if (exists) {
              console.log('Found renderer at alternative path:', path);
              rendererDir = path;
              foundValidPath = true;
              break;
            }
          } catch (err) {
            console.error(`Error checking alternative path ${path}:`, err);
          }
        }
      }
    }
  }

  console.log('Using renderer directory:', rendererDir);
  console.log('Found valid renderer path:', foundValidPath);

  const nextApp = next({
    dev: isDevMode,
    dir: rendererDir,
    port: 3000, // Default port for Next.js, adjust if needed
  });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  return { nextApp, handle };
};

// Initialize logging
const logFilePath = setupLogging();
console.log('Application starting...');
console.log('Electron app version:', app.getVersion());
console.log('Development mode:', isDev ? 'Yes' : 'No');
console.log('Log file location:', logFilePath);

// Make log file path available to the renderer process
process.env.APP_LOG_FILE = logFilePath;

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

  // Start Next.js server and load it into the window
  const port = 3000; // Ensure this doesn't conflict with NestJS (3002)
  try {
    console.log('Starting Next.js preparation...');
    const { handle } = await prepareNext(isDev);
    console.log('Next.js preparation completed successfully');

    const nextServer = createServer((req: any, res: any) => {
      try {
        const parsedUrl = parse(req.url, true);
        console.log(`Handling request: ${req.method} ${req.url}`);
        handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Handle server errors before starting
    nextServer.on('error', (err) => {
      console.error('Next.js server error:', err);
    });

    nextServer.listen(port, () => {
      console.log(`> Next.js ready on http://localhost:${port}`);

      // Add a small delay to ensure the server is fully ready
      setTimeout(() => {
        console.log(`Attempting to load URL: http://localhost:${port}/`);

        // Add event listener for page load errors
        mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
          console.error(`Failed to load URL: ${validatedURL}`);
          console.error(`Error code: ${errorCode}, Description: ${errorDescription}`);
        });

        // Add event listener for page load success
        mainWindow.webContents.on('did-finish-load', () => {
          console.log('Page loaded successfully!');
        });

        // Attempt to load the URL
        mainWindow.loadURL(`http://localhost:${port}/`).then(() => {
          console.log('LoadURL promise resolved successfully');
        }).catch((err) => {
          console.error('Failed to load Next.js URL:', err);

          // Try alternative approach if standard loading fails
          console.log('Trying alternative loading approach...');
          mainWindow.loadFile(join(app.getAppPath(), 'renderer', '.next', 'server', 'pages', 'index.html')).catch(e => {
            console.error('Alternative loading also failed:', e);
          });
        });
      }, 2000); // Increased delay for better reliability
    });
  } catch (err) {
    console.error('Failed to prepare Next.js:', err);
    console.error('Error details:', err instanceof Error ? err.stack : String(err));
  }

  // Open DevTools for debugging
  isDev && mainWindow.webContents.openDevTools();

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
