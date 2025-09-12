// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you need here
  platform: process.platform,
  version: process.versions,
  print: () => ipcRenderer.invoke('print-page')
});

// Expose require for checking if running in Electron
contextBridge.exposeInMainWorld('electronRequire', {
  electron: () => ({ ipcRenderer })
});

// Remove any console logs in production
if (process.env.NODE_ENV === 'development') {
  console.log('Preload script loaded');
}