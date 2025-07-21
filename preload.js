const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (relativePath) => ipcRenderer.invoke('read-file', relativePath),
  getAssetPath: (relativePath) => ipcRenderer.invoke('get-asset-path', relativePath),
  makeApiRequest: (options,attempt) => ipcRenderer.invoke('make-api-request', { options },attempt),
  getSaveFiles: () => ipcRenderer.invoke('get-save-files'),
  saveGame: (slotIndex, data) => ipcRenderer.invoke('save-game', slotIndex, data),
  loadGame: (slotIndex) => ipcRenderer.invoke('load-game', slotIndex),
});