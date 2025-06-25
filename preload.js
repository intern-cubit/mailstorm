// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    restartApp: () => ipcRenderer.send('restart_app'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, version) => callback(version)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event) => callback()),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, percent) => callback(percent)),
    downloadUpdate: () => ipcRenderer.send('download_update'),
    // --- NEW: Expose functions for app control ---
    reloadApp: () => ipcRenderer.send('reload_app'), // Sends message to reload current window
    quitApp: () => ipcRenderer.send('quit_app'),   // Sends message to quit the application
    showLogoutDialog: () => ipcRenderer.send('show-logout-dialog'),
});