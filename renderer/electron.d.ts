// Type definitions for Electron APIs
// This tells TypeScript about the "window.electronAPI" property

// Empty interface as we've removed IPC functionality
interface ElectronAPI {
  // You can add non-IPC related API types here if needed
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
