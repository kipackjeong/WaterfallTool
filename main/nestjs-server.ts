import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/**
 * NestJS Server Manager
 * Handles starting and stopping the NestJS server as part of the Electron app
 */
export class NestJSServerManager {
  private electronApp: Electron.App | null = null;
  private serverProcess: ChildProcess | null = null;
  private serverPort: number = 3002;
  private serverUrl: string;
  private isProduction: boolean;
  private serverPath: string | null = '';

  constructor(app: Electron.App, port: number = 3002) { // Set default port to match apiClient.ts
    this.electronApp = app;
    this.serverPort = port;
    this.serverUrl = `http://localhost:${port}`;
    this.isProduction = !require('electron-is-dev');

    // In development, the server files are in the workspace root
    // In production, the server files are bundled in the Electron app but unpacked from ASAR
    if (this.isProduction) {
      // Get the app path and convert it from asar to real path if needed
      const appPath = this.electronApp!.getAppPath();
      console.log('App path:', appPath);
      
      // Based on electron-builder.yml, server is unpacked from asar
      // The correct path should be in app.asar.unpacked/server
      const basePath = appPath.replace(/app\.asar$/, 'app.asar.unpacked');
      console.log('Base path for unpacked content:', basePath);
      
      // Try multiple possible locations for production build, prioritizing the paths
      // that match our electron-builder.yml configuration
      const possiblePaths = [
        path.join(basePath, 'server'),                   // Unpacked from ASAR (primary location)
        path.join(process.resourcesPath || '', 'app.asar.unpacked/server'), // Alternative unpacked location
        path.join(process.resourcesPath || '', 'server'), // Directly in resources
        path.join(appPath, 'server'),                    // Within ASAR (not ideal for cwd)
        path.join(process.resourcesPath || '', 'app/server') // Another common location
      ];

      // Find the first path that exists and is a directory
      let foundValidPath = false;
      for (const possiblePath of possiblePaths) {
        console.log(`Checking server path: ${possiblePath}`);
        try {
          // Check if it's actually a directory
          const stats = fs.statSync(possiblePath);
          if (stats.isDirectory()) {
            console.log(`Found valid server directory: ${possiblePath}`);
            
            // List the contents of the directory for debugging
            try {
              const files = fs.readdirSync(possiblePath);
              console.log(`Contents of ${possiblePath}:`, files);
              
              // Check if dist directory exists
              const distPath = path.join(possiblePath, 'dist');
              if (fs.existsSync(distPath)) {
                console.log(`Found dist directory at ${distPath}`);
                const distFiles = fs.readdirSync(distPath);
                console.log(`Contents of ${distPath}:`, distFiles);
                
                // Check for main.js
                const mainJsPath = path.join(distPath, 'main.js');
                if (fs.existsSync(mainJsPath)) {
                  console.log(`Found main.js at ${mainJsPath}`);
                  foundValidPath = true;
                }
              }
            } catch (err) {
              console.error(`Error listing directory ${possiblePath}:`, err);
            }
            
            if (foundValidPath) {
              this.serverPath = possiblePath;
              break;
            } else {
              console.log(`Directory exists but doesn't contain required files: ${possiblePath}`);
            }
          }
        } catch (err) {
          // Path doesn't exist or can't be accessed
          console.log(`Path not valid: ${possiblePath}`);
        }
      }

      // If none found, use default and log warning
      if (!this.serverPath) {
        this.serverPath = path.join(basePath, 'server');
        console.warn(`Server directory not found in any expected location, using default: ${this.serverPath}`);
        console.warn('This may cause issues starting the server in production.');
      }
    } else {
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
  async start(): Promise<void> {
    console.log(`Node.js version: ${process.versions.node}`);
    if (this.serverProcess) {
      console.log('NestJS server is already running');
      return;
    }

    console.log('Starting NestJS server...');
    console.log(`Server path: ${this.serverPath}`);

    return new Promise<void>((resolve, reject) => {
      try {
        // Verify server directory exists
        if (!fs.existsSync(this.serverPath!)) {
          console.error(`Server directory not found at: ${this.serverPath}`);

          // List parent directory contents for debugging
          try {
            const parentDir = path.dirname(this.serverPath!);
            if (fs.existsSync(parentDir)) {
              console.log(`Contents of parent directory (${parentDir}):`);
              fs.readdirSync(parentDir).forEach(file => {
                console.log(`- ${file}`);
              });
            }
          } catch (err) {
            console.error('Error listing parent directory:', err);
          }

          return reject(new Error(`Server directory not found at: ${this.serverPath}`));
        }

        // List server directory contents for debugging
        try {
          console.log(`Contents of server directory (${this.serverPath}):`);
          fs.readdirSync(this.serverPath!).forEach(file => {
            console.log(`- ${file}`);
          });
        } catch (err) {
          console.error('Error listing server directory:', err);
        }

        // Command to run based on environment
        let command = '';
        let args: string[] = [];
        let mainJsPath = '';

        if (this.isProduction) {
          // In production, we need to use the node executable
          // First, try to find node in standard locations
          const possibleNodePaths = [
            // Standard node executable
            'node',
            // Try to find a bundled node executable
            path.join(process.resourcesPath || '', 'node'),
            // Try system paths
            '/usr/bin/node',
            '/usr/local/bin/node',
            // Windows paths
            'C:\\Program Files\\nodejs\\node.exe',
            'C:\\Program Files (x86)\\nodejs\\node.exe'
          ];
          
          // Find a working node executable
          let nodeFound = false;
          for (const nodePath of possibleNodePaths) {
            try {
              // Try to execute node --version to check if it works
              const testResult = require('child_process').spawnSync(nodePath, ['--version']);
              if (testResult.status === 0) {
                command = nodePath;
                nodeFound = true;
                console.log(`Found working node executable at: ${nodePath}`);
                break;
              }
            } catch (err) {
              // This node path doesn't work, try the next one
              console.log(`Node path not valid: ${nodePath}`);
            }
          }
          
          if (!nodeFound) {
            command = 'node'; // Fallback to default node command
            console.warn('Could not verify a working node executable, using default "node" command');
          }
          
          // Now find the main.js file
          mainJsPath = path.join(this.serverPath!, 'dist/main.js');

          // Verify that the main.js file exists
          if (!fs.existsSync(mainJsPath)) {
            console.error(`Server main.js not found at expected path: ${mainJsPath}`);
            // Try to find it in alternative locations
            const possiblePaths = [
              path.join(this.serverPath!, 'main.js'),
              path.join(this.serverPath!, 'dist/src/main.js'),
              path.join(this.serverPath!, 'dist/server/main.js'),
              path.join(app.getAppPath(), 'server/dist/main.js'),
              path.join(process.resourcesPath || '', 'app.asar.unpacked/server/dist/main.js')
            ];

            let mainJsFound = false;
            for (const possiblePath of possiblePaths) {
              console.log(`Checking for server main.js at: ${possiblePath}`);
              if (fs.existsSync(possiblePath)) {
                console.log(`Found server main.js at: ${possiblePath}`);
                mainJsPath = possiblePath;
                mainJsFound = true;
                break;
              }
            }

            if (!mainJsFound) {
              return reject(new Error(`Server main.js not found at any expected location`));
            }
          }
          
          args = [mainJsPath];
          console.log(`Using node command: ${command} ${args.join(' ')}`);
        } else {
          // Development mode
          command = path.join(this.serverPath!, 'node_modules/.bin/nest');
          args = ['start', '--watch'];
        }

        // Environment variables for the process
        // Using type assertion to work around read-only properties
        const env = {
          ...process.env,
          PORT: this.serverPort.toString()
        } as NodeJS.ProcessEnv;
        
        // Set NODE_ENV using type assertion to bypass readonly restriction
        if (this.isProduction) {
          (env as any).NODE_ENV = 'production';
        } else {
          (env as any).NODE_ENV = 'development';
        }

        console.log('[DEBUG] this.serverPath:', this.serverPath);
        console.log('[DEBUG] Command:', command);
        console.log('[DEBUG] Args:', args);
        console.log('[DEBUG] Environment:', { PORT: env.PORT, NODE_ENV: env.NODE_ENV });

        // Verify the server path exists and is a directory
        try {
          if (!this.serverPath) {
            return reject(new Error('Server path is not defined'));
          }
          
          const stats = fs.statSync(this.serverPath);
          if (!stats.isDirectory()) {
            return reject(new Error(`Server path is not a directory: ${this.serverPath}`));
          }
        } catch (err: any) {
          return reject(new Error(`Server path not accessible: ${this.serverPath || 'undefined'} (${err.message})`));
        }

        // Spawn the process
        try {
          if (!this.serverPath) {
            return reject(new Error('Server path is not defined for process spawn'));
          }
          
          this.serverProcess = spawn(command, args, {
            cwd: this.serverPath,
            env,
            stdio: 'pipe', // Capture output
            shell: this.isProduction // Use shell in production to handle path issues
          });
          
          console.log(`Server process spawned with PID: ${this.serverProcess?.pid || 'unknown'}`);
        } catch (err: any) {
          console.error(`Failed to spawn NestJS server:`, err);
          return reject(new Error(`Failed to spawn NestJS server: ${err.message}`));
        }

        // Handle output
        if (!this.serverProcess) {
          return reject(new Error('Server process is null after spawn'));
        }
        
        let serverOutput = '';
        let errorOutput = '';
        
        this.serverProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          serverOutput += output;
          console.log(`NestJS server: ${output}`);

          // Detect when server is ready
          if (output.includes('Application is running on') || 
              output.includes('Nest application successfully started') ||
              output.includes('Listening on port')) {
            console.log(`NestJS server is ready at ${this.serverUrl}`);
            resolve();
          }
        });

        this.serverProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          errorOutput += error;
          console.error(`NestJS server error: ${error}`);
          
          // Check for common errors that indicate the server won't start
          if (error.includes('EADDRINUSE') || 
              error.includes('port is already in use')) {
            reject(new Error(`Port ${this.serverPort} is already in use. Please close other applications using this port or change the port number.`));
          }
        });

        // Handle process exit
        this.serverProcess.on('close', (code) => {
          console.log(`NestJS server exited with code ${code}`);
          
          // If server exited with error and we didn't get a specific error message
          if (code !== 0 && !errorOutput) {
            console.error('Server exited with error but no error output was captured');
          }
          
          // If server exited before we detected it was ready
          if (code !== null && code !== 0) {
            console.error(`Server failed to start properly. Exit code: ${code}`);
            console.error('Last server output:', serverOutput.slice(-500)); // Show last 500 chars of output
            console.error('Error output:', errorOutput);
            reject(new Error(`Server failed to start properly. Exit code: ${code}`));
          }
          
          this.serverProcess = null;
        });
        
        // Handle unexpected errors
        this.serverProcess.on('error', (err) => {
          console.error('Server process error:', err);
          reject(new Error(`Server process error: ${err.message}`));
        });

        // Set a timeout in case the server doesn't start properly
        setTimeout(() => {
          if (this.serverProcess) {
            resolve(); // Assume server is running even if we didn't see the ready message
          } else {
            reject(new Error('NestJS server failed to start within timeout'));
          }
        }, 30000); // 30 seconds timeout

      } catch (error) {
        console.error('Failed to start NestJS server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the NestJS server
   */
  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
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
        } catch (error) {
          console.error('Error killing NestJS server process:', error);
        }
      } else {
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
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.serverProcess !== null;
  }
}