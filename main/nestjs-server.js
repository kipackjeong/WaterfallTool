"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestJSServerManager = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_1 = require("electron");
/**
 * NestJS Server Manager
 * Handles starting and stopping the NestJS server as part of the Electron app
 */
class NestJSServerManager {
    electronApp = null;
    serverProcess = null;
    serverPort = 3002;
    serverUrl;
    isProduction;
    serverPath = '';
    constructor(app, port = 3002) {
        this.electronApp = app;
        this.serverPort = port;
        this.serverUrl = `http://localhost:${port}`;
        this.isProduction = !require('electron-is-dev');
        // In development, the server files are in the workspace root
        // In production, the server files are bundled in the Electron app but unpacked from ASAR
        if (this.isProduction) {
            // Get the app path and convert it from asar to real path if needed
            const appPath = this.electronApp.getAppPath();
            const basePath = appPath.replace(/app\.asar$/, 'app.asar.unpacked');
            // Try multiple possible locations for production build
            const possiblePaths = [
                path.join(basePath, 'server'), // Unpacked from ASAR
                path.join(appPath, 'server'), // Within ASAR (not working as cwd)
                path.join(process.resourcesPath, 'server'), // Electron resources
                path.join(process.resourcesPath, 'app/server'), // Another common location
                path.join(process.resourcesPath, 'app.asar.unpacked/server') // Electron resources unpacked
            ];
            // Find the first path that exists and is a directory
            for (const possiblePath of possiblePaths) {
                console.log(`Checking server path: ${possiblePath}`);
                try {
                    // Check if it's actually a directory
                    const stats = fs.statSync(possiblePath);
                    if (stats.isDirectory()) {
                        console.log(`Found valid server directory: ${possiblePath}`);
                        this.serverPath = possiblePath;
                        break;
                    }
                }
                catch (err) {
                    // Path doesn't exist or can't be accessed
                    console.log(`Path not valid: ${possiblePath}`);
                }
            }
            // If none found, use default and log warning
            if (!this.serverPath) {
                this.serverPath = path.join(basePath, 'server');
                console.warn(`Server directory not found in any expected location, using default: ${this.serverPath}`);
            }
        }
        else {
            // Development mode - server is in project root
            this.serverPath = path.join(this.electronApp.getAppPath(), 'server');
        }
        console.log(`NestJS server manager initialized in ${this.isProduction ? 'production' : 'development'} mode`);
        console.log(`Server path: ${this.serverPath}`);
    }
    /**
     * Start the NestJS server
     * @returns Promise that resolves when server is ready
     */
    async start() {
        if (this.serverProcess) {
            console.log('NestJS server is already running');
            return;
        }
        console.log('Starting NestJS server...');
        console.log(`Server path: ${this.serverPath}`);
        return new Promise((resolve, reject) => {
            try {
                // Verify server directory exists
                if (!fs.existsSync(this.serverPath)) {
                    console.error(`Server directory not found at: ${this.serverPath}`);
                    // List parent directory contents for debugging
                    try {
                        const parentDir = path.dirname(this.serverPath);
                        if (fs.existsSync(parentDir)) {
                            console.log(`Contents of parent directory (${parentDir}):`);
                            fs.readdirSync(parentDir).forEach(file => {
                                console.log(`- ${file}`);
                            });
                        }
                    }
                    catch (err) {
                        console.error('Error listing parent directory:', err);
                    }
                    return reject(new Error(`Server directory not found at: ${this.serverPath}`));
                }
                // List server directory contents for debugging
                try {
                    console.log(`Contents of server directory (${this.serverPath}):`);
                    fs.readdirSync(this.serverPath).forEach(file => {
                        console.log(`- ${file}`);
                    });
                }
                catch (err) {
                    console.error('Error listing server directory:', err);
                }
                // Command to run based on environment
                let command = '';
                let args = [];
                if (this.isProduction) {
                    command = 'node';
                    const mainJsPath = path.join(this.serverPath, 'dist/main.js');
                    // Verify that the main.js file exists
                    if (!fs.existsSync(mainJsPath)) {
                        console.error(`Server main.js not found at: ${mainJsPath}`);
                        // Try to find it
                        const possiblePaths = [
                            path.join(this.serverPath, 'main.js'),
                            path.join(this.serverPath, 'dist/src/main.js'),
                            path.join(electron_1.app.getAppPath(), 'server/dist/main.js')
                        ];
                        for (const possiblePath of possiblePaths) {
                            console.log(`Checking for server main.js at: ${possiblePath}`);
                            if (fs.existsSync(possiblePath)) {
                                console.log(`Found server main.js at: ${possiblePath}`);
                                args = [possiblePath];
                                break;
                            }
                        }
                        if (args.length === 0) {
                            return reject(new Error(`Server main.js not found at any expected location`));
                        }
                    }
                    else {
                        args = [mainJsPath];
                    }
                }
                else {
                    // Development mode
                    command = path.join(this.serverPath, 'node_modules/.bin/nest');
                    args = ['start', '--watch'];
                }
                // Environment variables for the process
                const env = {
                    ...process.env,
                    PORT: this.serverPort.toString(),
                };
                console.log('[DEBUG] this.serverPath:', this.serverPath);
                // Verify the server path exists and is a directory
                try {
                    const stats = fs.statSync(this.serverPath);
                    if (!stats.isDirectory()) {
                        return reject(new Error(`Server path is not a directory: ${this.serverPath}`));
                    }
                }
                catch (err) {
                    return reject(new Error(`Server path not accessible: ${this.serverPath} (${err.message})`));
                }
                // Spawn the process
                try {
                    this.serverProcess = (0, child_process_1.spawn)(command, args, {
                        cwd: this.serverPath,
                        env,
                        stdio: 'pipe', // Capture output
                    });
                }
                catch (err) {
                    return reject(new Error(`Failed to spawn NestJS server: ${err.message}`));
                }
                // Handle output
                this.serverProcess.stdout?.on('data', (data) => {
                    const output = data.toString();
                    console.log(`NestJS server: ${output}`);
                    // Detect when server is ready
                    if (output.includes('Application is running on')) {
                        console.log(`NestJS server is ready at ${this.serverUrl}`);
                        resolve();
                    }
                });
                this.serverProcess.stderr?.on('data', (data) => {
                    console.error(`NestJS server error: ${data.toString()}`);
                });
                // Handle process exit
                this.serverProcess.on('close', (code) => {
                    console.log(`NestJS server exited with code ${code}`);
                    this.serverProcess = null;
                    // If process exits unexpectedly and we didn't call stop(), try to restart
                    if (code !== 0 && this.serverProcess !== null) {
                        console.log('NestJS server exited unexpectedly, restarting...');
                        this.start().catch(console.error);
                    }
                });
                // Set a timeout in case the server doesn't start properly
                setTimeout(() => {
                    if (this.serverProcess) {
                        resolve(); // Assume server is running even if we didn't see the ready message
                    }
                    else {
                        reject(new Error('NestJS server failed to start within timeout'));
                    }
                }, 30000); // 30 seconds timeout
            }
            catch (error) {
                console.error('Failed to start NestJS server:', error);
                reject(error);
            }
        });
    }
    /**
     * Stop the NestJS server
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.serverProcess) {
                console.log('NestJS server is not running');
                resolve();
                return;
            }
            console.log('Stopping NestJS server...');
            // On Windows, we need to use the kill method
            if (process.platform === 'win32' && this.serverProcess.pid) {
                try {
                    process.kill(this.serverProcess.pid);
                }
                catch (error) {
                    console.error('Error killing NestJS server process:', error);
                }
            }
            else {
                // On Unix-like systems, we can use the kill signal
                this.serverProcess.kill('SIGTERM');
            }
            // Set a timeout to force kill if graceful shutdown fails
            const forceKillTimeout = setTimeout(() => {
                if (this.serverProcess) {
                    console.log('Force killing NestJS server process...');
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000); // 5 seconds timeout
            // Listen for process exit
            this.serverProcess.on('close', () => {
                clearTimeout(forceKillTimeout);
                this.serverProcess = null;
                console.log('NestJS server stopped');
                resolve();
            });
        });
    }
    /**
     * Get the URL of the NestJS server
     */
    getServerUrl() {
        return this.serverUrl;
    }
    /**
     * Check if the server is running
     */
    isRunning() {
        return this.serverProcess !== null;
    }
}
exports.NestJSServerManager = NestJSServerManager;
