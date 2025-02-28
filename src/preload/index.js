import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    once: (channel, listener) =>
      ipcRenderer.once(channel, (event, ...args) => listener(event, ...args))
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api.ipcRenderer) // Exponer solo lo necesario
    contextBridge.exposeInMainWorld('api', electronAPI) // Mantener compatibilidad con toolkit si lo necesitas
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = api.ipcRenderer
  window.api = electronAPI
}
