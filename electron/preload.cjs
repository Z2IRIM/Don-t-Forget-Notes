const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('desktopApi', {
  getState: () => ipcRenderer.invoke('app:get-state'),
  showManager: (noteId) => ipcRenderer.invoke('app:show-manager', noteId),
  hideManager: () => ipcRenderer.invoke('app:hide-manager'),
  updateSettings: (patch) => ipcRenderer.invoke('app:update-settings', patch),
  createNote: (payload) => ipcRenderer.invoke('note:create', payload),
  updateNote: (noteId, patch) => ipcRenderer.invoke('note:update', noteId, patch),
  deleteNote: (noteId) => ipcRenderer.invoke('note:delete', noteId),
  duplicateNote: (noteId) => ipcRenderer.invoke('note:duplicate', noteId),
  showWidget: (noteId) => ipcRenderer.invoke('note:show-widget', noteId),
  hideWidget: (noteId) => ipcRenderer.invoke('note:hide-widget', noteId),
  freezeWidget: (noteId, frozen) => ipcRenderer.invoke('note:freeze-widget', noteId, frozen),
  showAllWidgets: () => ipcRenderer.invoke('widgets:show-all'),
  hideAllWidgets: () => ipcRenderer.invoke('widgets:hide-all'),
  unfreezeAllWidgets: () => ipcRenderer.invoke('widgets:unfreeze-all'),
  exportMarkdown: (noteId) => ipcRenderer.invoke('note:export-markdown', noteId),
  getWidgetBounds: (noteId) => ipcRenderer.invoke('widget:get-bounds', noteId),
  setWidgetBounds: (noteId, bounds) => ipcRenderer.invoke('widget:set-bounds', noteId, bounds),
  onStateUpdated: (callback) => subscribe('state:updated', callback),
  onSelectNote: (callback) => subscribe('manager:select-note', callback)
});
