// electron/activation-preload.cjs
// zeeexshan: Preload script for license activation window
const { contextBridge, ipcRenderer } = require('electron');

// zeeexshan: Expose activation API to renderer
contextBridge.exposeInMainWorld('activationAPI', {
  activateLicense: (licenseKey) => ipcRenderer.invoke('activate-license', licenseKey),
  checkActivation: () => ipcRenderer.invoke('check-activation'),
  closeWindow: () => ipcRenderer.send('close-activation-window'),
  // Developer: zeeexshan - Shop Analytics Dashboard
  signature: 'zeeexshan_activation_api'
});

console.log('Activation preload loaded - zeeexshan'); 