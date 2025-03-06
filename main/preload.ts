// Preload script for Electron
import { contextBridge } from 'electron';

// API Definition - empty as we're removing IPC
const electronAPI = {
  // You can add non-IPC related APIs here if needed
};

// Expose the API to the renderer process
try {
  // We use contextBridge for security - isolates Electron APIs from client code
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('Electron API exposed via context bridge - IPC removed');
} catch (error) {
  console.error('Failed to expose Electron API:', error);
}
