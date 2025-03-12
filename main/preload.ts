// Preload script for Electron
import { contextBridge, ipcRenderer } from 'electron';

// API Definition with IPC renderer
const electron = {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_, ...args) => listener(...args));
      return () => ipcRenderer.removeListener(channel, listener);
    },
    once: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (_, ...args) => listener(...args));
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener);
    }
  }
};

// Expose the API to the renderer process
try {
  // We use contextBridge for security - isolates Electron APIs from client code
  contextBridge.exposeInMainWorld('electron', electron);
  console.log('Electron API with IPC exposed via context bridge');
} catch (error) {
  console.error('Failed to expose Electron API:', error);
}
